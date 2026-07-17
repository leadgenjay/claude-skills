"""Build the Consulti Free-Trial Nurture sequence workflow in GHL.

Creates an 8-email nurture sequence over 14 days, triggered by the
`consulti_trial` tag added on a contact. Goal exit: `consulti_paid` OR
`consulti_demo_booked` tag (configured manually in GHL UI after draft
creation -- the CampaignBuilder does not yet support workflow_goal
auto-creation; see builder.format_summary() output for the draft URL).

Body content is parsed from
~/Downloads/consulti-nurture-ghl-handoff-2026-05-12/REVISED/0?-*.md
so any copy edits there flow into the next deploy automatically.

Usage:
    python3 builders/consulti-nurture-builder.py --dry-run
    python3 builders/consulti-nurture-builder.py
    python3 builders/consulti-nurture-builder.py --update <workflow_id>
"""
import argparse
import json
import os
import re
import sys
import uuid
from pathlib import Path

from cli_anything.gohighlevel.utils.workflow_builder import (
    CampaignBuilder,
    link_steps,
    tag_step,
    validate_campaign,
    wait_step,
)
from cli_anything.gohighlevel.utils.ghl_internal_client import (
    InternalGHLClient,
    TokenManager,
)


# === Config ==================================================================

REVISED_DIR = Path.home() / "Downloads" / "consulti-nurture-ghl-handoff-2026-05-12" / "REVISED"

# Ordered list of (revised-file basename, friendly name, inter-step wait days)
EMAILS = [
    ("01-day1-founder-story.md",   "Day 1 - Founder Story",          1),  # wait 1 day after trigger
    ("02-day2-email-verifier.md",  "Day 2 - Email Verifier",         1),  # wait 1 day after E1
    ("03-day4-pull-leads.md",      "Day 4 - Pull First Leads",       2),
    ("04-day6-hypercleaner.md",    "Day 6 - HyperCleaner",           2),
    ("05-day8-free-tools.md",      "Day 8 - Free Tools",             2),
    ("06-day10-stack-math.md",     "Day 10 - Stack Math",            2),
    ("07-day12-incentive.md",      "Day 12 - 50% Off Incentive",     2),
    ("08-day14-last-call.md",      "Day 14 - Last Call",             2),
]

FROM_NAME = "Jay"
WORKFLOW_NAME = "Consulti Free-Trial Nurture (v1)"
TRIGGER_TAG = "consulti_trial"
COMPLETION_TAG = "nurture_completed"
GOAL_TAGS = ["consulti_paid", "consulti_demo_booked"]  # configure as goal-event in UI


# === Markdown parser =========================================================

def _extract_block(md: str, heading: str) -> str:
    """Pull the fenced block immediately after a `## heading`."""
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}.*?\n```\n(.*?)\n```",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(md)
    if not m:
        raise ValueError(f"Could not find ```fenced block``` after '## {heading}'")
    return m.group(1).strip()


def parse_email_file(path: Path) -> dict:
    md = path.read_text()
    return {
        "subject": _extract_block(md, "Subject Line A"),
        "preview": _extract_block(md, "Preview Text"),
        "body": _extract_block(md, "Email Body (paste into GHL)"),
    }


# === Email HTML formatter ====================================================

_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_MD_LINK_REPL = (
    r'<a target="_blank" rel="noopener noreferrer nofollow" href="\2">'
    r'<span style="font-size:16px;font-family:arial;color:rgb(0,87,255)">\1</span></a>'
)


def ghl_plaintext_html(text: str) -> str:
    """Wrap plain text in minimal inline-styled <p> tags.

    Preserves blank lines as paragraph spacers (<br/>). Converts
    markdown links `[text](url)` to styled <a> tags (blue underline,
    target=_blank). Bare URLs (not in markdown link syntax) are left
    untouched and rely on email-client autolinking.
    """
    lines = text.strip().split("\n")
    parts = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            parts.append("<br/>")
            continue
        # Convert markdown links to anchor tags BEFORE wrapping in <p><span>
        stripped = _MD_LINK_RE.sub(_MD_LINK_REPL, stripped)
        parts.append(
            '<p style="margin:0px;line-height:1.5;padding-left:0px!important;">'
            '<span style="font-size:16px;font-family:arial;color:rgb(13,13,13)">'
            f"{stripped}"
            "</span></p>"
        )
    return re.sub(r">\s+<", "><", "".join(parts))


def email_step_consulti(name: str, subject: str, body: str) -> dict:
    html = ghl_plaintext_html(body)
    return {
        "id": str(uuid.uuid4()),
        "type": "email",
        "name": f"Email: {name}",
        "attributes": {
            "subject": subject,
            "body": html,
            "html": html,
            "fromName": FROM_NAME,
            "attachments": [],
            "conditions": [],
            "trackingOptions": {
                "hasTrackingLinks": False,
                "hasUtmTracking": False,
                "hasTags": False,
            },
        },
    }


# === Build pipeline ==========================================================

def build_workflow() -> dict:
    # Load all 8 emails from disk first so failures surface before we touch GHL
    parsed = []
    for fname, friendly, wait_days in EMAILS:
        path = REVISED_DIR / fname
        if not path.exists():
            raise FileNotFoundError(f"Missing revised email file: {path}")
        e = parse_email_file(path)
        parsed.append((friendly, wait_days, e))

    raw_steps = []
    for friendly, wait_days, e in parsed:
        raw_steps.append(wait_step(f"Wait before {friendly}", wait_days, "days"))
        raw_steps.append(email_step_consulti(friendly, e["subject"], e["body"]))

    raw_steps.append(tag_step(f"Apply {COMPLETION_TAG}", [COMPLETION_TAG]))

    steps = link_steps(raw_steps)

    return {
        "consulti_free_trial_nurture": {
            "name": WORKFLOW_NAME,
            "tag": TRIGGER_TAG,
            "goal_tags": GOAL_TAGS,  # informational only; configure in UI
            "templates": steps,
        }
    }


# === Main ====================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Deploy Consulti Free-Trial Nurture sequence to GHL"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate and print campaign JSON only")
    parser.add_argument("--update", type=str, metavar="WORKFLOW_ID",
                        help="Update existing workflow instead of creating new one")
    args = parser.parse_args()

    campaign = build_workflow()

    errors = validate_campaign(campaign)
    if errors:
        print("Validation errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    config = campaign["consulti_free_trial_nurture"]
    step_counts = {}
    for s in config["templates"]:
        step_counts[s["type"]] = step_counts.get(s["type"], 0) + 1

    print(f"Campaign: {config['name']}")
    print(f"Total steps: {len(config['templates'])}  ({step_counts})")
    print(f"Trigger tag: {config['tag']}")
    print(f"Goal tags (set in UI): {', '.join(config['goal_tags'])}")
    print(f"From-name: {FROM_NAME}")
    print()
    print("Email send schedule (cumulative days from trigger):")
    cum = 0
    for friendly, wait, _ in [(f, w, _) for (_, f, w), _ in zip(EMAILS, range(len(EMAILS)))]:
        # not used - keep printing simple
        pass
    cum = 0
    for fname, friendly, wait in EMAILS:
        cum += wait
        print(f"  Day +{cum:>2}: {friendly}")
    print()

    if args.dry_run:
        print("--- DRY RUN: campaign JSON ---")
        print(json.dumps(campaign, indent=2, default=str))
        return

    location_id = os.environ.get("GHL_LOCATION_ID", "YB8rMdFShcHGcZGW87mA")
    token_mgr = TokenManager()
    client = InternalGHLClient(token_mgr, location_id)

    if args.update:
        wf_id = args.update
        print(f"Updating existing workflow {wf_id} on location {location_id}...")
        loc = client.location_id
        current = client.request("GET", f"/workflow/{loc}/{wf_id}")
        if not current or current.get("_error"):
            print(f"Error: could not fetch workflow {wf_id}")
            print(f"  {current}")
            sys.exit(1)
        version = current.get("version", 1)

        # Add canvas positions so the GHL UI can render each step.
        # Without advanceCanvasMeta the canvas appears empty even though
        # the workflowData has all the steps.
        steps_with_meta = []
        for idx, step in enumerate(config["templates"]):
            s = {**step}
            s["advanceCanvasMeta"] = {"position": {"x": 400 + idx * 300, "y": 0}}
            s.setdefault("cat", "")
            s.setdefault("order", idx)
            steps_with_meta.append(s)

        current["workflowData"]["templates"] = steps_with_meta
        current["version"] = version
        result = client.request("PUT", f"/workflow/{loc}/{wf_id}", current)
        if not result or result.get("_error"):
            print(f"Error: PUT failed: {result}")
            sys.exit(1)
        print(f"Workflow updated: {wf_id}  (v{version})")
        print(f"Steps written: {len(steps_with_meta)}  (each with canvas position)")
        return

    print(f"Creating new workflow in GHL location {location_id} (DRAFT)...")
    builder = CampaignBuilder(client)
    builder.build(campaign, folder_name="Consulti Nurture")
    print()
    print(builder.format_summary())
    print()
    print("NEXT STEPS (manual in GHL UI):")
    print("  1. Open the workflow link above.")
    print(f"  2. Add a Goal Event step:")
    print(f"     - Type: 'Added a contact Tag'")
    print(f"     - Tags: {', '.join(GOAL_TAGS)}  (either tag exits)")
    print(f"     - Action: 'End this workflow'")
    print("  3. Set each Email step's send time to '9:00 AM contact-local'.")
    print("  4. Test send each email to jay@leadgenjay.com.")
    print("  5. Flip workflow Draft -> Live when ready.")


if __name__ == "__main__":
    main()
