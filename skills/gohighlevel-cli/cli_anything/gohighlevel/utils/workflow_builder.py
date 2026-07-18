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
    # Custom marketplace action: iMessage. Jay's preferred SMS-channel node
    # for LGJ workflows -- use imessage_step() instead of sms_step() (2026-06-30).
    "send_i_message",
])


# ── Email Formatter ───────────────────────────────────────────────────────

def dm_email(text: str) -> str:
    """Convert plain text (**bold** / *italic*) to GHL-safe HTML.

    UNIFORM Arial 16 on EVERY fragment. GHL's email editor overrides a
    <p>-level font-family to its Verdana default, AND resets <strong>/<em> to
    Verdana even inside an arial span -- so bold/italic rendered in a different
    font from the body (Jay 2026-07-03). Fix: the font lives on <span>s, and
    bold/italic are spans carrying the SAME font-family plus font-weight /
    font-style (no <strong>/<em> element at all). Blank source lines become
    <br/> spacers (the old formatter dropped them, giving cramped copy).
    """
    font = "font-size: 16px; font-family: Arial, sans-serif; color: rgb(13, 13, 13)"

    def span(t: str, extra: str = "") -> str:
        return f'<span style="{font}{extra}">{t}</span>'

    def inline(line: str) -> str:
        out, pos = [], 0
        for m in re.finditer(r"\*\*(.+?)\*\*|\*(.+?)\*", line):
            if m.start() > pos:
                out.append(span(line[pos:m.start()]))
            if m.group(1) is not None:
                out.append(span(m.group(1), "; font-weight: bold"))
            else:
                out.append(span(m.group(2), "; font-style: italic"))
            pos = m.end()
        if pos < len(line):
            out.append(span(line[pos:]))
        return "".join(out) if out else span(line)

    parts = []
    for raw in text.strip().split("\n"):
        line = raw.strip()
        if not line:
            parts.append("<br/>")
            continue
        parts.append(f'<p style="margin:0px; line-height: 1.5;">{inline(line)}</p>')
    return re.sub(r">\s+<", "><", "".join(parts))


# ── Step Builders ─────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def sms_step(name: str, body: str, **kw: Any) -> dict:
    return {
        "id": _uid(), "type": "sms", "name": f"SMS: {name}",
        "attributes": {"body": body, "attachments": []}, **kw,
    }


def imessage_step(name: str, message: str,
                  addresses: str = "{{contact.phone_raw}}", **kw: Any) -> dict:
    """Send iMessage (custom marketplace action `send_i_message`).

    Jay's preferred text channel for LGJ workflows -- use this instead of
    sms_step(). `addresses` MUST be the contact phone WITH country code (+1):
    use {{contact.phone_raw}} (raw E.164), NOT {{contact.phone}}.
    """
    return {
        "id": _uid(), "type": "send_i_message", "name": f"iMessage: {name}",
        "attributes": {
            "__dynamicAttachments__": {},
            "addresses": addresses,
            "message": message,
            "lead_owner_email": "",
            "voiceMemoUrl": "",
            "mediaUrl": "",
            "audioAttachmentUrl": "",
            "enableAiVoiceMemo": False,
            "type": "send_i_message",
            "__customInputs__": {},
        },
        # Top-level fields present on live send_i_message nodes (captured from
        # the Booking-Pending reminder 2026-07-03). Required for the marketplace
        # action to render/execute correctly.
        "isMarketplaceAction": True, "version": "3.2", **kw,
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


# ── Branch / Condition / Goal Builders ───────────────────────────────────
# GHL If/Else + Goal nodes. Schemas reverse-engineered from live LGJ
# workflows (2026-07-03): the branch structure mirrors
# builders/reply-notify-gate-builder.py; the workflow_goal shape was captured
# from the wf6 HTBO post-call workflow. Branch graphs are NOT linear — wire
# them yourself (parentKey/next) and build via CampaignBuilder with the
# workflow-def flag `"graph": True` (or a direct PUT) so the linear linker /
# canvas positioner does not clobber the wiring.


def _pos(x: int, y: int) -> dict:
    return {"position": {"x": x, "y": y}}


def tag_condition(values: list[str], has: bool = True) -> list[dict]:
    """If/Else condition: contact HAS (has=True) / does NOT have any of `values`."""
    return [{
        "conditionType": "contact_detail", "conditionSubType": "tags",
        "conditionOperator": "index-of-true" if has else "index-of-false",
        "conditionValue": values,
        "__conditionId": _uid(), "ifElseNodeId": "", "isWait": False,
    }]


def field_condition(field_id: str, value: str, operator: str = "contain") -> list[dict]:
    """If/Else condition on a contact custom field (by field id)."""
    return [{
        "conditionType": "contact_detail", "conditionSubType": field_id,
        "conditionOperator": operator, "conditionValue": value,
        "__conditionId": _uid(), "ifElseNodeId": "", "isWait": False,
    }]


def if_else_nodes(name: str, branch_name: str, conditions: list[dict],
                  x: int = 400, y: int = 0, yes_id: Optional[str] = None,
                  no_id: Optional[str] = None,
                  segment_operator: str = "and") -> tuple:
    """Build one GHL If/Else split as THREE templates.

    Returns (cond_id, [cond_node, branch_yes, branch_no], yes_id, no_id).

    A GHL branch is a `condition-node` holding the YES branch definition plus
    two anchor nodes (`branch-yes` / `branch-no`). To attach children: set each
    child's `parentKey` to the anchor id (yes_id for the match path, no_id for
    the else path) and the anchor's `next` to that first child's id; chain
    further children linearly via next/parentKey. All three nodes plus every
    child go flat into `templates`.
    """
    cid = _uid()
    yes_id = yes_id or _uid()
    no_id = no_id or _uid()
    cond = {
        "id": cid, "order": 0,
        "attributes": {
            "currentRecipeType": "CUSTOM",
            "branches": [{
                "id": yes_id, "name": branch_name,
                "segments": [{"__segmentId": _uid(), "operator": segment_operator,
                              "conditions": conditions}],
                "operator": "and", "showErrors": False,
                "branchNameError": "Branch name cannot be empty!",
            }],
            "operator": "and", "if": True, "conditionName": name,
            "version": 2, "noneBranchName": "None",
        },
        "name": name, "type": "if_else", "cat": "conditions",
        "next": [yes_id, no_id], "comments": [], "nodeType": "condition-node",
        "advanceCanvasMeta": _pos(x, y),
    }
    yes = {
        "id": yes_id, "parent": cid, "order": 1,
        "attributes": {"if": False, "conditionName": name,
                       "operator": "and", "branches": []},
        "name": branch_name, "type": "if_else", "cat": "conditions",
        "sibling": [no_id], "comments": [], "nodeType": "branch-yes",
        "parentKey": cid, "advanceCanvasMeta": _pos(x - 150, y + 150),
    }
    no = {
        "id": no_id, "parent": cid, "order": 1,
        "attributes": {"else": True},
        "name": "None", "type": "if_else", "cat": "conditions",
        "sibling": [yes_id], "comments": [], "nodeType": "branch-no",
        "parentKey": cid, "advanceCanvasMeta": _pos(x + 150, y + 150),
    }
    return cid, [cond, yes, no], yes_id, no_id


def goal_step(name: str, tags: list[str], goal_condition: str = "add_contact_tag",
              action: str = "exit", **kw: Any) -> dict:
    """A `workflow_goal` exit step: leave the workflow when `goal_condition`
    fires (default: any of `tags` added). Shape captured from a live workflow.
    """
    return {
        "id": _uid(), "type": "workflow_goal", "name": name,
        "attributes": {
            "op": "or",
            "segments": [{
                "conditions": [{
                    "goal_condition": goal_condition,
                    "extras": {"tags": tags},
                    "id": _uid(),
                }],
                "op": "or",
            }],
            "type": "workflow_goal",
            "action": action,
        }, **kw,
    }


# ── Step Linker ───────────────────────────────────────────────────────────

def link_steps(steps: list[dict]) -> list[dict]:
    """Auto-link LINEAR steps with next/parentKey and set order.

    If any step carries a `nodeType` (an if_else condition-node / branch
    anchor), the list is a pre-wired branch graph — return it unchanged rather
    than clobbering its explicit next/parentKey wiring.
    """
    if any(s.get("nodeType") for s in steps):
        return steps
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

        # Resolve folder: reuse existing if folder_id given, else look up a
        # folder of the same name (POST always creates, so folder_name alone
        # spawned a DUPLICATE folder on every run -- Jay 2026-07-03), else create.
        if not folder_id:
            if not folder_name:
                self.stats["errors"].append(
                    "CampaignBuilder.build requires folder_id or folder_name"
                )
                self.stats["end_time"] = time.time()
                return self.stats
            listing = self.client.request("GET", f"/workflow/{self.loc}/directory")
            rows = listing.get("rows", []) if isinstance(listing, dict) else []
            existing = next(
                (r for r in rows if r.get("type") == "directory"
                 and r.get("name") == folder_name), None)
            if existing:
                folder_id = existing.get("id") or existing.get("_id")
            else:
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

                    # Branch graphs ("graph": True) carry their own
                    # advanceCanvasMeta / next / parentKey wiring — preserve it
                    # (setdefault) instead of overwriting with a linear x-lane.
                    graph_mode = bool(wf_def.get("graph"))
                    steps_with_meta = []
                    for idx, step in enumerate(wf_def["templates"]):
                        s = {**step}
                        default_meta = {"position": {"x": 400 + idx * 300, "y": 0}}
                        if graph_mode:
                            s.setdefault("advanceCanvasMeta", default_meta)
                        else:
                            s["advanceCanvasMeta"] = default_meta
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
