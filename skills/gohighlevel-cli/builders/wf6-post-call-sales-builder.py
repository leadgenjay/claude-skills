"""Build the v2 WF6 - Post-Call Sales sequence in GHL.

Replaces legacy WF3 `d67c7e92-8639-4d0a-a361-219ac702f2dc`. Source copy:
social-media-tool repo `docs/email-sequences/post-call-sales-sequence.md`.

The source designs ONE workflow that branches on the `offer_interest`
custom field. Branch wiring (if_else multipath) via the internal API is
fragile and cannot be verified outside the GHL UI, so per the approved
plan this ships as the de-risked fallback: THREE separate tag-triggered
workflows, one per branch, each a proven linear spine.

  Branch A - HTBO : 5 emails / 7d  <- trigger tag `postcall-sequence-htbo`
  Branch B - LGI  : 6 emails / 9d  <- trigger tag `postcall-sequence-lgi`
  Branch C - AIA  : 6 emails / 9d  <- trigger tag `postcall-sequence-aia`

Trigger glue (manual, GHL UI): the post-call disposition form must apply
the branch tag matching the rep's `offer_interest` selection. The 3 tag
triggers themselves ARE auto-created by this builder.

All workflows created as DRAFT.

Usage:
    set -a && source .env && set +a
    .venv/bin/python3 builders/wf6-post-call-sales-builder.py --dry-run
    .venv/bin/python3 builders/wf6-post-call-sales-builder.py
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
    / "docs/email-sequences/post-call-sales-sequence.md"
)

# Reuse the "LGJ Email Sequences v2" folder created by the WF1 builder.
EXISTING_FOLDER_ID = "542e0d93-2425-439d-aeab-0b83a87cba00"
FROM_NAME = "Jay"
GOAL_TAG = "purchase:complete"
INITIAL_WAIT_MINUTES = 4  # mirrors legacy WF3: lets reps log notes first

# (code prefix, campaign key, workflow name, trigger tag)
BRANCHES = [
    ("A", "postcall_htbo", "Post-Call Sales - HTBO (Branch A)", "postcall-sequence-htbo"),
    ("B", "postcall_lgi", "Post-Call Sales - LGI (Branch B)", "postcall-sequence-lgi"),
    ("C", "postcall_aia", "Post-Call Sales - AIA (Branch C)", "postcall-sequence-aia"),
]


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


def _branch_templates(records: list, trigger_tag: str) -> list:
    raw_steps = []
    prev_day = 0
    for idx, rec in enumerate(records):
        if idx == 0:
            raw_steps.append(
                wait_step("Wait 4 minutes before " + rec.code, INITIAL_WAIT_MINUTES, "minutes")
            )
        else:
            wd = rec.day - prev_day
            raw_steps.append(wait_step(f"Wait {wd} day(s) before {rec.code}", wd, "days"))
        prev_day = rec.day
        cta_color = "red" if idx == len(records) - 1 else "blue"
        raw_steps.append(email_step_seq(rec, cta_color))

    raw_steps.append(tag_step(f"Remove {trigger_tag}", [trigger_tag], remove=True))
    raw_steps.append(goal_step("Purchase Complete", [GOAL_TAG]))
    return link_steps(raw_steps)


# === Build pipeline ==========================================================

def build_campaign() -> dict:
    records = parse_sequence_file(SRC)
    if len(records) != 17:
        raise ValueError(f"Expected 17 emails in WF6 source, parsed {len(records)}")

    campaign = {}
    for prefix, key, name, trigger_tag in BRANCHES:
        branch = sorted(
            (r for r in records if r.code.startswith(prefix)),
            key=lambda r: r.index,
        )
        campaign[key] = {
            "name": name,
            "tag": trigger_tag,
            "goal_tags": [GOAL_TAG],
            "templates": _branch_templates(branch, trigger_tag),
        }
    return campaign


# === Main ====================================================================

def main():
    parser = argparse.ArgumentParser(description="Deploy WF6 Post-Call Sales to GHL")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate and print campaign summary only")
    parser.add_argument("--folder-id", type=str, default=EXISTING_FOLDER_ID,
                        help="Folder to deploy into (defaults to the v2 folder)")
    args = parser.parse_args()

    campaign = build_campaign()
    errors = validate_campaign(campaign)
    if errors:
        print("Validation errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    records = parse_sequence_file(SRC)
    print("Campaign: Post-Call Sales (3 branch workflows, replaces WF3)")
    for prefix, key, name, trigger_tag in BRANCHES:
        cfg = campaign[key]
        counts = {}
        for s in cfg["templates"]:
            counts[s["type"]] = counts.get(s["type"], 0) + 1
        branch_recs = sorted((r for r in records if r.code.startswith(prefix)),
                             key=lambda r: r.index)
        print(f"\n  {name}")
        print(f"    trigger tag: {trigger_tag}   goal: {GOAL_TAG}")
        print(f"    steps: {len(cfg['templates'])}  ({counts})")
        for r in branch_recs:
            print(f"      Day +{r.day:>2}: {r.code:3} {r.subject_a[:54]}")

    if args.dry_run:
        Path("/tmp/wf6-campaign.json").write_text(
            json.dumps(campaign, indent=2, default=str)
        )
        print("\n--- full campaign JSON -> /tmp/wf6-campaign.json ---")
        return

    location_id = os.environ.get("GHL_LOCATION_ID", "YB8rMdFShcHGcZGW87mA")
    client = InternalGHLClient(TokenManager(), location_id)

    print(f"\nCreating 3 branch workflows in GHL location {location_id} (DRAFT)...")
    builder = CampaignBuilder(client)
    builder.build(campaign, folder_id=args.folder_id)
    print()
    print(builder.format_summary())
    print()
    print("NEXT STEPS (manual in GHL UI):")
    print("  1. Open each workflow link above.")
    print("  2. Each is tag-triggered (postcall-sequence-htbo/-lgi/-aia).")
    print("     Wire the post-call disposition form to apply the branch tag")
    print("     matching the rep's offer_interest selection.")
    print("  3. Verify each 'Purchase Complete' goal event.")
    print("  4. Set Email step send windows to 9:00 AM contact-local.")
    print("  5. Test-send every email to jayfeldman11@gmail.com.")
    print("  6. Flip Draft -> Live, then pause legacy WF3 d67c7e92.")


if __name__ == "__main__":
    main()
