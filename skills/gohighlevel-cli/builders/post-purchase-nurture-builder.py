"""Build the Post-Purchase Nurture sequence workflow in GHL.

Creates a 6-email nurture sequence over 35 days, triggered by the
`paid-subscriber-new` tag added on a contact. The workflow is deployed
as DRAFT into the existing folder `44b21b77-...` on location
YB8rMdFShcHGcZGW87mA.

Body content is parsed from
<repo>/docs/handoff/post-purchase-nurture-emails/0?-*.md so any copy
edits there flow into the next deploy automatically.

Usage:
    python3 builders/post-purchase-nurture-builder.py --dry-run
    python3 builders/post-purchase-nurture-builder.py
    python3 builders/post-purchase-nurture-builder.py --update <workflow_id>
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

# Repo-versioned source markdown lives in social-media-tool. Locate it via
# the canonical absolute path so the builder works regardless of cwd.
REVISED_DIR = (
    Path.home()
    / "Documents" / "Tech & Dev" / "Studio Apps" / "social-media-tool"
    / "docs" / "handoff" / "post-purchase-nurture-emails"
)

# Ordered list of (markdown basename, friendly name, inter-step wait days)
EMAILS = [
    ("01-d3-affiliate-recruitment.md", "Day 3 - Affiliate Recruitment", 3),
    ("02-d7-advanced-features.md",     "Day 7 - Advanced Features",     4),
    ("03-d14-roadmap-vote.md",         "Day 14 - Roadmap + Vote",       7),
    ("04-d21-book-a-call.md",          "Day 21 - Book a Call",          7),
    ("05-d28-g2-review.md",            "Day 28 - G2 Review",            7),
    ("06-d35-checkin-feedback.md",     "Day 35 - Check-in",             7),
]

FROM_NAME = "Jay Feldman"
WORKFLOW_NAME = "Post-Purchase Nurture (v1)"
TRIGGER_TAG = "paid-subscriber-new"
COMPLETION_TAG = "post-purchase-nurture-completed"
EXISTING_FOLDER_ID = "44b21b77-533a-4782-9684-074712654328"


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
    markdown links `[text](url)` to styled <a> tags (blue, target=_blank).
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


def email_step(name: str, subject: str, body: str) -> dict:
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
    # Load all 6 emails from disk first so failures surface before we touch GHL
    parsed = []
    for fname, friendly, wait_days in EMAILS:
        path = REVISED_DIR / fname
        if not path.exists():
            raise FileNotFoundError(f"Missing email source file: {path}")
        e = parse_email_file(path)
        parsed.append((friendly, wait_days, e))

    raw_steps = []
    for friendly, wait_days, e in parsed:
        raw_steps.append(wait_step(f"Wait before {friendly}", wait_days, "days"))
        raw_steps.append(email_step(friendly, e["subject"], e["body"]))

    raw_steps.append(tag_step(f"Apply {COMPLETION_TAG}", [COMPLETION_TAG]))

    steps = link_steps(raw_steps)

    return {
        "post_purchase_nurture": {
            "name": WORKFLOW_NAME,
            "tag": TRIGGER_TAG,
            "templates": steps,
        }
    }


# === Main ====================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Deploy Post-Purchase Nurture sequence to GHL"
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

    config = campaign["post_purchase_nurture"]
    step_counts = {}
    for s in config["templates"]:
        step_counts[s["type"]] = step_counts.get(s["type"], 0) + 1

    print(f"Campaign: {config['name']}")
    print(f"Total steps: {len(config['templates'])}  ({step_counts})")
    print(f"Trigger tag: {config['tag']}")
    print(f"Completion tag: {COMPLETION_TAG}")
    print(f"Target folder: {EXISTING_FOLDER_ID}")
    print(f"From-name: {FROM_NAME}")
    print()
    print("Email send schedule (cumulative days from trigger):")
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

    print(
        f"Creating new workflow in GHL location {location_id} "
        f"inside folder {EXISTING_FOLDER_ID} (DRAFT)..."
    )
    builder = CampaignBuilder(client)
    builder.build(campaign, folder_id=EXISTING_FOLDER_ID)
    print()
    print(builder.format_summary())
    print()
    print("NEXT STEPS (manual in GHL UI):")
    print("  1. Open the workflow link above.")
    print("  2. Configure the inbound-webhook trigger from the Consulti")
    print("     Stripe webhook -> tag `paid-subscriber-new` on contact.")
    print("  3. Suppress the 65 prior-blast contacts: tag them")
    print(f"     `{COMPLETION_TAG}` so they exit immediately via Goal Event.")
    print("  4. Confirm From email = jay@consulti.ai on each email step.")
    print("  5. Test send each email to jay@leadgenjay.com.")
    print("  6. Flip workflow Draft -> Live when ready.")


if __name__ == "__main__":
    main()
