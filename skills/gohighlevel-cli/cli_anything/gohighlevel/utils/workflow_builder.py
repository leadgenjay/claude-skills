"""GHL workflow builder — step builders, linker, and campaign builder.

Adapted from ghl-superspeed-v3-main/lib/engine.py (2026-03-25).
Creates workflows as DRAFT (never auto-published).

EXPERIMENTAL: Gated behind --experimental flag in CLI.
"""
from __future__ import annotations

import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Optional

from cli_anything.gohighlevel.utils.ghl_internal_client import InternalGHLClient

# ── Verified Action Types (56 confirmed via save API 2026-03-22) ──────────

VERIFIED_ACTIONS = frozenset([
    "add_contact_tag", "remove_contact_tag", "update_contact_field",
    "create_update_contact", "assign_user", "remove_assigned_user",
    "edit_conversation", "dnd_contact", "add_notes", "task-notification",
    "find_contact", "sms", "email", "call", "voicemail", "messenger", "gmb",
    "internal_notification", "instagram-dm", "ig_interactive_messenger",
    "fb_interactive_messenger", "respond_on_comment", "review_request",
    "wait", "if_else", "goto", "transition", "workflow_split", "workflow_goal",
    "add_to_workflow", "remove_from_workflow", "remove_from_all_workflows",
    "update_custom_value", "drip", "chatgpt", "conversation_ai",
    "create_opportunity", "find_opportunity", "remove_opportunity",
    "webhook", "custom_webhook", "google_sheets", "slack_message",
    "custom_code", "math_operation", "text_formatter", "number_formatter",
    "datetime_formatter", "array_functions", "ivr_gather", "ivr_connect_call",
    "facebook_conversion_api", "stripe_one_time_charge",
    "update_appointment_status", "membership_grant_offer",
    "membership_revoke_offer",
])


# ── Email Formatter ───────────────────────────────────────────────────────

def dm_email(text: str) -> str:
    """Convert plain text to Dan Martell style HTML email."""
    lines = text.strip().split("\n")
    html_parts = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
        line = re.sub(r"\*(.+?)\*", r"<em>\1</em>", line)
        html_parts.append(
            f'<p style="margin:0 0 12px 0;line-height:1.75;'
            f'font-size:16px;font-family:arial,helvetica,sans-serif;'
            f'color:#000;">{line}</p>'
        )
    return "".join(html_parts)


# ── Step Builders ─────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def sms_step(name: str, body: str, **kw: Any) -> dict:
    return {
        "id": _uid(), "type": "sms", "name": f"SMS: {name}",
        "attributes": {"body": body, "attachments": []}, **kw,
    }


def email_step(name: str, subject: str, text: str, from_name: str = "", **kw: Any) -> dict:
    html = dm_email(text)
    return {
        "id": _uid(), "type": "email", "name": f"Email: {name}",
        "attributes": {
            "subject": subject, "body": html, "html": html,
            "fromName": from_name, "attachments": [], "conditions": [],
            "trackingOptions": {
                "hasTrackingLinks": False, "hasUtmTracking": False, "hasTags": False,
            },
        }, **kw,
    }


def wait_step(name: str, value: int, unit: str = "days", **kw: Any) -> dict:
    # GHL uses inconsistent unit strings: "minutes" (plural), "hour" (SINGULAR), "days" (plural)
    api_unit = {"minutes": "minutes", "hours": "hour", "hour": "hour", "days": "days"}.get(unit, unit)
    unit_label = {"minutes": "Minutes", "hour": "Hour", "hours": "Hours", "days": "Days"}.get(unit, unit.title())
    display = f"Wait {value} {unit_label}"
    return {
        "id": _uid(), "type": "wait", "name": display,
        "attributes": {
            "type": "time",
            "startAfter": {"type": api_unit, "value": value, "when": "after"},
            "name": display, "cat": "",
            "isHybridAction": True, "hybridActionType": "wait",
            "convertToMultipath": False, "transitions": [],
        }, "cat": "", **kw,
    }


def tag_step(name: str, tags: list[str], remove: bool = False, **kw: Any) -> dict:
    t = "remove_contact_tag" if remove else "add_contact_tag"
    return {"id": _uid(), "type": t, "name": name, "attributes": {"tags": tags}, **kw}


def webhook_step(name: str, url: str, method: str = "POST", data: list | None = None, **kw: Any) -> dict:
    return {
        "id": _uid(), "type": "webhook", "name": name,
        "attributes": {"method": method, "url": url, "customData": data or [], "headers": []},
        **kw,
    }


def ai_step(name: str, prompt: str, model: str = "gpt-4o", **kw: Any) -> dict:
    return {
        "id": _uid(), "type": "chatgpt", "name": name,
        "attributes": {
            "type": "chatgpt", "event": "simple-prompt", "model": model,
            "promptText": prompt, "actionType": "custom",
            "temperature": "0.2", "memoryKey": "action",
        }, **kw,
    }


# ── Step Linker ───────────────────────────────────────────────────────────

def link_steps(steps: list[dict]) -> list[dict]:
    """Auto-link steps with next/parentKey and set order."""
    linked = []
    for i, step in enumerate(steps):
        step = {**step}
        step["order"] = i
        step["parentKey"] = linked[i - 1]["id"] if i > 0 else None
        if i < len(steps) - 1:
            step["next"] = steps[i + 1]["id"]
        linked.append(step)
    return linked


# ── Validation ────────────────────────────────────────────────────────────

def validate_campaign(campaign: dict) -> list[str]:
    """Pre-flight validation. Returns list of errors (empty = valid)."""
    errors = []
    for key, wf in campaign.items():
        if "name" not in wf:
            errors.append(f"Workflow {key}: missing 'name'")
        if "templates" not in wf:
            errors.append(f"Workflow {key}: missing 'templates'")
            continue
        for i, step in enumerate(wf["templates"]):
            if "type" not in step:
                errors.append(f"Workflow {key}, step {i}: missing 'type'")
            elif step["type"] not in VERIFIED_ACTIONS:
                errors.append(f"Workflow {key}, step {i}: unverified type '{step['type']}'")
            if "id" not in step:
                errors.append(f"Workflow {key}, step {i}: missing 'id'")
            if "name" not in step:
                errors.append(f"Workflow {key}, step {i}: missing 'name'")
    return errors


# ── Campaign Builder ──────────────────────────────────────────────────────

class CampaignBuilder:
    """Builds complete GHL campaigns via internal API.

    All workflows are created as DRAFT (never auto-published).
    Uses ThreadPoolExecutor for parallel workflow creation.
    """

    def __init__(self, client: InternalGHLClient):
        self.client = client
        self.loc = client.location_id
        self.stats: dict[str, Any] = {
            "workflows_created": 0,
            "steps_saved": 0,
            "triggers_created": 0,
            "errors": [],
            "start_time": 0.0,
            "end_time": 0.0,
        }

    def build(
        self,
        campaign: dict,
        folder_name: Optional[str] = None,
        folder_id: Optional[str] = None,
    ) -> dict:
        """Build an entire campaign. Returns stats dict.

        Pass `folder_id` to drop the campaign into an existing folder; pass
        `folder_name` to create a new folder. Exactly one is required.
        """
        self.stats["start_time"] = time.time()

        # Pre-flight validation
        errors = validate_campaign(campaign)
        if errors:
            self.stats["errors"].extend(errors)

        # Resolve folder: reuse existing if folder_id given, else create.
        if not folder_id:
            if not folder_name:
                self.stats["errors"].append(
                    "CampaignBuilder.build requires folder_id or folder_name"
                )
                self.stats["end_time"] = time.time()
                return self.stats
            folder = self.client.request(
                "POST", f"/workflow/{self.loc}",
                {"name": folder_name, "type": "directory"},
            )
            folder_id = folder.get("id") if folder else None
            if not folder_id:
                self.stats["errors"].append("Failed to create campaign folder")
                self.stats["end_time"] = time.time()
                return self.stats

        wf_ids: dict[str, str] = {}

        def _create_workflow(key: str, wf_def: dict) -> tuple:
            """Full pipeline: create → tag → trigger → save steps → sync."""
            # Step 1: Create workflow
            result = self.client.request(
                "POST", f"/workflow/{self.loc}",
                {"name": wf_def["name"], "parentId": folder_id},
            )
            if not result or not result.get("id"):
                return key, None, False, False

            wf_id = result["id"]

            # Step 2: Create tag + trigger if specified
            tag = wf_def.get("tag")
            trigger_ok = False
            trigger_data = None
            if tag:
                self.client.create_location_tag(tag)

                trigger_body = {
                    "status": "draft",
                    "workflowId": wf_id,
                    "schedule_config": {},
                    "conditions": [{
                        "operator": "index-of-true",
                        "field": "tagsAdded",
                        "value": tag,
                        "title": "Tag Added",
                        "type": "select",
                        "id": "tag-added",
                    }],
                    "type": "contact_tag",
                    "masterType": "highlevel",
                    "name": tag.replace("-", " ").title(),
                    "actions": [{"workflow_id": wf_id, "type": "add_to_workflow"}],
                    "active": True,
                    "triggersChanged": True,
                    "location_id": self.loc,
                }
                tr = self.client.request("POST", f"/workflow/{self.loc}/trigger", trigger_body)
                if tr and tr.get("id"):
                    trigger_ok = True
                    trigger_id = tr["id"]
                    trigger_data = {**trigger_body, "id": trigger_id}

                    # Link trigger to first step
                    first_step_id = wf_def["templates"][0]["id"] if wf_def.get("templates") else None
                    if first_step_id:
                        self.client.request(
                            "PUT", f"/workflow/{self.loc}/trigger/{trigger_id}",
                            {**trigger_body, "targetActionId": first_step_id,
                             "advanceCanvasMeta": {"position": {"x": 57.5, "y": -73}}},
                        )

            # Step 3: Save steps via PUT
            put_body = {
                "name": wf_def["name"],
                "version": 1,
                "workflowData": {"templates": wf_def["templates"]},
            }
            put_result = self.client.request("PUT", f"/workflow/{self.loc}/{wf_id}", put_body)
            steps_ok = bool(put_result and not put_result.get("_error"))

            # Step 4: Sync triggers + canvas meta
            if steps_ok:
                current = self.client.request("GET", f"/workflow/{self.loc}/{wf_id}")
                if current and not current.get("_error"):
                    trigger_list = []
                    if trigger_data:
                        now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                        trigger_data.update({
                            "workflow_id": wf_id, "location_id": self.loc,
                            "belongs_to": "workflow", "deleted": False,
                            "date_added": now, "date_updated": now,
                            "advanceCanvasMeta": {"position": {"x": 57.5, "y": -73}},
                        })
                        for k in ("company_id", "company_age", "triggersChanged"):
                            trigger_data.pop(k, None)
                        trigger_list = [trigger_data]

                    steps_with_meta = []
                    for idx, step in enumerate(wf_def["templates"]):
                        s = {**step}
                        s["advanceCanvasMeta"] = {"position": {"x": 400 + idx * 300, "y": 0}}
                        s.setdefault("cat", "")
                        s.setdefault("order", idx)
                        steps_with_meta.append(s)

                    meta = current.get("meta") or {}
                    meta["advanceCanvasMeta"] = {
                        "enabled": True,
                        "enabledAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                    }

                    self.client.request(
                        "PUT", f"/workflow/{self.loc}/{wf_id}",
                        {
                            "name": wf_def["name"],
                            "version": current.get("version", 2),
                            "meta": meta,
                            "workflowData": {"templates": steps_with_meta},
                            "triggersChanged": bool(trigger_list),
                            "oldTriggers": trigger_list,
                            "newTriggers": trigger_list,
                        },
                    )

            return key, wf_id, steps_ok, trigger_ok

        # Run all workflows in parallel
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = [
                pool.submit(_create_workflow, key, wf_def)
                for key, wf_def in campaign.items()
            ]

            for future in as_completed(futures):
                key, wf_id, steps_ok, trigger_ok = future.result()
                if wf_id:
                    wf_ids[key] = wf_id
                    self.stats["workflows_created"] += 1
                    if steps_ok:
                        self.stats["steps_saved"] += len(campaign[key]["templates"])
                    if trigger_ok:
                        self.stats["triggers_created"] += 1
                else:
                    self.stats["errors"].append(f"Failed: {campaign[key]['name']}")

        self.stats["end_time"] = time.time()
        self.stats["api_calls"] = self.client.call_count
        self.stats["workflow_ids"] = wf_ids
        self.stats["folder_id"] = folder_id

        return self.stats

    def format_summary(self) -> str:
        """Format build stats as a human-readable summary."""
        elapsed = self.stats["end_time"] - self.stats["start_time"]
        lines = [
            f"Done in {elapsed:.1f}s",
            f"  Workflows: {self.stats['workflows_created']}",
            f"  Steps:     {self.stats['steps_saved']}",
            f"  Triggers:  {self.stats['triggers_created']}",
            f"  API calls: {self.stats.get('api_calls', 0)}",
            f"  Errors:    {len(self.stats['errors'])}",
        ]
        for e in self.stats["errors"]:
            lines.append(f"    - {e}")

        wf_ids = self.stats.get("workflow_ids", {})
        if wf_ids:
            lines.append(f"\nGHL Links:")
            for key, wf_id in sorted(wf_ids.items()):
                lines.append(
                    f"  https://app.leadgenjay.com/location/{self.loc}/workflow/{wf_id}"
                )

        return "\n".join(lines)
