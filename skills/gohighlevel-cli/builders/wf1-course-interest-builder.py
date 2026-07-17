"""Build the v2 WF1 - Course Interest sequence workflow in GHL.

10-email Lead Gen Insiders nurture over 14 days (D0/D1/D2/D4/D6/D8/D9/D11/
D13/D14). Source copy: social-media-tool repo
`docs/email-sequences/course-interest-rewrite.md`.

Replaces legacy WF1 `9de2fd79-ab3e-4ab3-af3d-929fed3a2d9f` (pause, don't
delete, for 2 weeks). Created as DRAFT.

The entry trigger is Form Submitted = "Course Interest" -- CampaignBuilder
only auto-creates tag triggers, so the workflow is built trigger-less and
Jay wires the form trigger in the GHL UI.

Usage:
    set -a && source .env && set +a
    python3 builders/wf1-course-interest-builder.py --dry-run
    python3 builders/wf1-course-interest-builder.py
    python3 builders/wf1-course-interest-builder.py --update <workflow_id>
"""
import argparse
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _email_sequences_parser import parse_sequence_file, to_ghl_html, goal_step

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

SRC = (
    Path.home()
    / "Documents/Tech & Dev/Studio Apps/social-media-tool"
    / "docs/email-sequences/course-interest-rewrite.md"
)

WORKFLOW_NAME = "WF1 - Course Interest (2026 rewrite)"
FOLDER_NAME = "LGJ Email Sequences v2"
FROM_NAME = "Jay"
START_TAG = "course-interest-sequence"
# Goal exit tag. Legacy WF1 used "course purchase" (with a space) -- matched
# here so the goal fires off the same purchase automation. Confirm in the UI.
GOAL_TAGS = ["course purchase"]
INITIAL_WAIT_MINUTES = 5


# === Email step ==============================================================

def email_step_seq(rec, cta_color: str) -> dict:
    html = to_ghl_html(rec.body_md, cta_color=cta_color)
    return {
        "id": str(uuid.uuid4()),
        "type": "email",
        "name": f"Email {rec.code}: {rec.title[:48]}",
        "attributes": {
            "subject": rec.subject_a,
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
    records = parse_sequence_file(SRC)
    if len(records) != 10:
        raise ValueError(f"Expected 10 emails in WF1 source, parsed {len(records)}")

    raw_steps = [tag_step(f"Add {START_TAG}", [START_TAG])]
    prev_day = 0
    for idx, rec in enumerate(records):
        if idx == 0:
            raw_steps.append(
                wait_step("Wait 5 minutes before E1", INITIAL_WAIT_MINUTES, "minutes")
            )
        else:
            wd = rec.day - prev_day
            raw_steps.append(wait_step(f"Wait {wd} day(s) before {rec.code}", wd, "days"))
        prev_day = rec.day
        cta_color = "red" if idx == len(records) - 1 else "blue"
        raw_steps.append(email_step_seq(rec, cta_color))

    raw_steps.append(tag_step(f"Remove {START_TAG}", [START_TAG], remove=True))
    raw_steps.append(goal_step("Course Purchase", GOAL_TAGS))

    steps = link_steps(raw_steps)
    return {
        "wf1_course_interest": {
            "name": WORKFLOW_NAME,
            "goal_tags": GOAL_TAGS,
            "templates": steps,
        }
    }


# === Main ====================================================================

def main():
    parser = argparse.ArgumentParser(description="Deploy WF1 Course Interest to GHL")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate and print campaign summary only")
    parser.add_argument("--update", type=str, metavar="WORKFLOW_ID",
                        help="Update an existing workflow instead of creating one")
    parser.add_argument("--folder-id", type=str, default=None,
                        help="Deploy into an existing folder instead of creating one")
    args = parser.parse_args()

    campaign = build_workflow()
    errors = validate_campaign(campaign)
    if errors:
        print("Validation errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    config = campaign["wf1_course_interest"]
    step_counts = {}
    for s in config["templates"]:
        step_counts[s["type"]] = step_counts.get(s["type"], 0) + 1

    records = parse_sequence_file(SRC)
    print(f"Campaign: {config['name']}")
    print(f"Total steps: {len(config['templates'])}  ({step_counts})")
    print(f"Trigger: Form Submitted = 'Course Interest'  (wire manually in GHL UI)")
    print(f"Goal tags: {', '.join(config['goal_tags'])}")
    print(f"From-name: {FROM_NAME}")
    print()
    print("Email send schedule (cumulative days from trigger):")
    for r in records:
        print(f"  Day +{r.day:>2}: {r.code:4} {r.subject_a[:60]}")
    print()

    if args.dry_run:
        print("--- DRY RUN: first email HTML preview (E1) ---")
        print(config["templates"][2]["attributes"]["html"][:700])
        print("...")
        print()
        print("--- full campaign JSON written to /tmp/wf1-campaign.json ---")
        Path("/tmp/wf1-campaign.json").write_text(
            json.dumps(campaign, indent=2, default=str)
        )
        return

    location_id = os.environ.get("GHL_LOCATION_ID", "YB8rMdFShcHGcZGW87mA")
    token_mgr = TokenManager()
    client = InternalGHLClient(token_mgr, location_id)

    if args.update:
        wf_id = args.update
        loc = client.location_id
        print(f"Updating workflow {wf_id} on location {loc}...")
        current = client.request("GET", f"/workflow/{loc}/{wf_id}")
        if not current or current.get("_error"):
            print(f"Error: could not fetch workflow {wf_id}: {current}")
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
        print(f"Workflow updated: {wf_id}  (v{version}, {len(steps_with_meta)} steps)")
        return

    print(f"Creating new workflow in GHL location {location_id} (DRAFT)...")
    builder = CampaignBuilder(client)
    if args.folder_id:
        builder.build(campaign, folder_id=args.folder_id)
    else:
        builder.build(campaign, folder_name=FOLDER_NAME)
    print()
    print(builder.format_summary())
    print()
    print(f"Folder ID (reuse for WF5/WF6): {builder.stats.get('folder_id')}")
    print()
    print("NEXT STEPS (manual in GHL UI):")
    print("  1. Open the workflow link above.")
    print("  2. Add the entry trigger: Form Submitted = 'Course Interest'.")
    print("  3. Verify the 'Course Purchase' goal event (tag-based exit).")
    print("  4. Set each Email step send window to 9:00 AM contact-local.")
    print("  5. Test-send every email to jayfeldman11@gmail.com.")
    print("  6. Flip Draft -> Live, then pause legacy WF1 9de2fd79.")


if __name__ == "__main__":
    main()
