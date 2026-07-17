"""Build the v2 WF5 - High Ticket Interest sequence workflow in GHL.

5-email + 1-SMS Machine (high-ticket) nurture over 8 days. Source copy:
social-media-tool repo `docs/email-sequences/ht-interest-rewrite.md`.

Flow: add tag -> wait 5m -> E1 -> wait 5m -> SMS -> wait 1d -> E2
-> wait 2d -> E3 -> wait 2d -> E4 -> wait 3d -> E5 -> remove tag -> goal.

Replaces legacy WF5 `41f0c105-78a6-4310-9fb9-6397f78c9f73` (pause, don't
delete). Created as DRAFT. Entry trigger Form Submitted = "HT Interest" is
wired manually in the GHL UI (CampaignBuilder only auto-creates tag triggers).

Usage:
    set -a && source .env && set +a
    .venv/bin/python3 builders/wf5-ht-interest-builder.py --dry-run
    .venv/bin/python3 builders/wf5-ht-interest-builder.py
    .venv/bin/python3 builders/wf5-ht-interest-builder.py --update <workflow_id>
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
    sms_step,
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
    / "docs/email-sequences/ht-interest-rewrite.md"
)

WORKFLOW_NAME = "WF5 - High Ticket Interest (2026 rewrite)"
# Reuse the "LGJ Email Sequences v2" folder created by the WF1 builder.
EXISTING_FOLDER_ID = "542e0d93-2425-439d-aeab-0b83a87cba00"
FROM_NAME = "Jay"
START_TAG = "ht-interest-sequence"
GOAL_TAGS = [
    "ht-interest-clicked-reserve",
    "ht-interest-clicked-deposit",
    "ht-interest-clicked-consult",
    "purchase:complete",
]

# Wait BEFORE each record, keyed by record code (cadence is irregular:
# two 5-minute opens, then day-based gaps -- per the file's build notes).
WAITS = {
    "E1": (5, "minutes"),
    "SMS": (5, "minutes"),
    "E2": (1, "days"),
    "E3": (2, "days"),
    "E4": (2, "days"),
    "E5": (3, "days"),
}


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
    codes = [r.code for r in records]
    if codes != ["E1", "SMS", "E2", "E3", "E4", "E5"]:
        raise ValueError(f"Unexpected WF5 record order: {codes}")

    raw_steps = [tag_step(f"Add {START_TAG}", [START_TAG])]
    last_email = records[-1]
    for rec in records:
        val, unit = WAITS[rec.code]
        raw_steps.append(wait_step(f"Wait {val} {unit} before {rec.code}", val, unit))
        if rec.kind == "sms":
            raw_steps.append(sms_step(f"SMS {rec.code}: {rec.title[:40]}", rec.body_md))
        else:
            cta_color = "red" if rec is last_email else "blue"
            raw_steps.append(email_step_seq(rec, cta_color))

    raw_steps.append(tag_step(f"Remove {START_TAG}", [START_TAG], remove=True))
    raw_steps.append(goal_step("HT Interest - Exit on click or purchase", GOAL_TAGS))

    steps = link_steps(raw_steps)
    return {
        "wf5_ht_interest": {
            "name": WORKFLOW_NAME,
            "goal_tags": GOAL_TAGS,
            "templates": steps,
        }
    }


# === Main ====================================================================

def main():
    parser = argparse.ArgumentParser(description="Deploy WF5 HT Interest to GHL")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate and print campaign summary only")
    parser.add_argument("--update", type=str, metavar="WORKFLOW_ID",
                        help="Update an existing workflow instead of creating one")
    parser.add_argument("--folder-id", type=str, default=EXISTING_FOLDER_ID,
                        help="Folder to deploy into (defaults to the v2 folder)")
    args = parser.parse_args()

    campaign = build_workflow()
    errors = validate_campaign(campaign)
    if errors:
        print("Validation errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    config = campaign["wf5_ht_interest"]
    step_counts = {}
    for s in config["templates"]:
        step_counts[s["type"]] = step_counts.get(s["type"], 0) + 1

    records = parse_sequence_file(SRC)
    print(f"Campaign: {config['name']}")
    print(f"Total steps: {len(config['templates'])}  ({step_counts})")
    print(f"Trigger: Form Submitted = 'HT Interest'  (wire manually in GHL UI)")
    print(f"Goal tags: {', '.join(config['goal_tags'])}")
    print()
    print("Send schedule:")
    for r in records:
        val, unit = WAITS[r.code]
        label = r.subject_a or f"[SMS] {r.title}"
        print(f"  wait {val} {unit:8} -> {r.code:4} {label[:54]}")
    print()

    if args.dry_run:
        print("--- DRY RUN: E5 HTML (red primary + blue secondary CTA) ---")
        e5 = [s for s in config["templates"]
              if s["type"] == "email" and "E5" in s["name"]][0]
        print(e5["attributes"]["html"][:900])
        Path("/tmp/wf5-campaign.json").write_text(
            json.dumps(campaign, indent=2, default=str)
        )
        print("\n--- full campaign JSON -> /tmp/wf5-campaign.json ---")
        return

    location_id = os.environ.get("GHL_LOCATION_ID", "YB8rMdFShcHGcZGW87mA")
    client = InternalGHLClient(TokenManager(), location_id)

    if args.update:
        wf_id = args.update
        loc = client.location_id
        print(f"Updating workflow {wf_id}...")
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
    builder.build(campaign, folder_id=args.folder_id)
    print()
    print(builder.format_summary())
    print()
    print("NEXT STEPS (manual in GHL UI):")
    print("  1. Open the workflow link above.")
    print("  2. Add the entry trigger: Form Submitted = 'HT Interest'.")
    print("  3. Verify the goal event exits on any of the 4 tags.")
    print("  4. Confirm the SMS step content + sender number.")
    print("  5. Set each Email step send window to 9:00 AM contact-local.")
    print("  6. Test-send every email + the SMS to Jay.")
    print("  7. Flip Draft -> Live, then pause legacy WF5 41f0c105.")


if __name__ == "__main__":
    main()
