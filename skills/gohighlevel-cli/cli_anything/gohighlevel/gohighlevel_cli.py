"""GoHighLevel CLI — Agent-usable command-line interface to the GHL API."""
from __future__ import annotations

import json
import sys

import click
import requests

from cli_anything.gohighlevel.utils import ghl_client as api


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _output(ctx: click.Context, data, label: str = ""):
    """Print data respecting --json flag."""
    as_json = ctx.obj.get("json", False)
    if as_json:
        click.echo(json.dumps(data, indent=2, default=str))
    else:
        if label:
            click.echo(f"\n{label}")
            click.echo("-" * len(label))
        click.echo(api.format_output(data))


def _handle_error(e: Exception):
    """Handle API errors with clear messages."""
    if isinstance(e, requests.exceptions.HTTPError):
        resp = e.response
        try:
            body = resp.json()
            msg = body.get("message") or body.get("msg") or json.dumps(body)
        except Exception:
            msg = resp.text
        click.echo(f"API Error ({resp.status_code}): {msg}", err=True)
    else:
        click.echo(f"Error: {e}", err=True)
    sys.exit(1)


def _loc(ctx: click.Context) -> str:
    """Get location ID from context or env."""
    return ctx.obj.get("location_id") or api._get_location_id()


# ---------------------------------------------------------------------------
# Main CLI Group
# ---------------------------------------------------------------------------

@click.group(invoke_without_command=True)
@click.option("--json", "use_json", is_flag=True, help="Output as JSON")
@click.option("--location-id", envvar="GHL_LOCATION_ID", default=None, help="GHL Location/Sub-account ID")
@click.option("--experimental", is_flag=True, help="Enable experimental commands (UNOFFICIAL internal GHL API — own-account-only, uses your full Firebase session token)")
@click.version_option("2.0.0", prog_name="cli-anything-gohighlevel")
@click.pass_context
def cli(ctx, use_json, location_id, experimental):
    """GoHighLevel CLI — manage contacts, workflows, calendars, and more."""
    ctx.ensure_object(dict)
    ctx.obj["json"] = use_json
    ctx.obj["location_id"] = location_id
    ctx.obj["experimental"] = experimental
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


# ---------------------------------------------------------------------------
# REPL Command
# ---------------------------------------------------------------------------

@cli.command(hidden=True)
@click.pass_context
def repl(ctx):
    """Interactive REPL mode."""
    try:
        from cli_anything.gohighlevel.utils.repl_skin import ReplSkin
        skin = ReplSkin("gohighlevel", version="1.0.0")
        skin.print_banner()
        pt_session = skin.create_prompt_session()

        commands = {
            "contacts": "Manage contacts (list, get, create, update, delete, search, tags)",
            "opportunities": "Manage pipeline opportunities (list, get, create, update, delete)",
            "calendars": "Manage calendars and appointments (list, slots, book)",
            "workflows": "List and manage workflows",
            "conversations": "Manage conversations and messages",
            "emails": "Email campaigns (list, get, send)",
            "payments": "Transactions, invoices, orders",
            "forms": "Forms and submissions",
            "social": "Social media posts and analytics",
            "locations": "Location/sub-account management",
            "help": "Show this help",
            "exit": "Exit REPL",
        }

        while True:
            try:
                line = skin.get_input(pt_session, project_name="ghl")
                if not line or not line.strip():
                    continue
                parts = line.strip().split()
                cmd = parts[0].lower()

                if cmd in ("exit", "quit", "q"):
                    skin.print_goodbye()
                    break
                elif cmd == "help":
                    skin.help(commands)
                else:
                    # Pass through to Click CLI
                    try:
                        cli.main(parts, standalone_mode=False, obj=ctx.obj)
                    except SystemExit:
                        pass
                    except click.exceptions.UsageError as e:
                        skin.error(str(e))
            except (EOFError, KeyboardInterrupt):
                skin.print_goodbye()
                break
    except ImportError:
        click.echo("REPL requires prompt-toolkit. Install with: pip install prompt-toolkit")
        click.echo("Use subcommands directly instead: ghl contacts list")


# ===========================================================================
# CONTACTS
# ===========================================================================

@cli.group()
@click.pass_context
def contacts(ctx):
    """Manage contacts — list, get, create, update, delete, search, tags."""
    pass


@contacts.command("list")
@click.option("--limit", default=20, help="Number of contacts to return")
@click.option("--offset", "skip", default=0, help="Number to skip (for pagination)")
@click.option("--query", default=None, help="Search query string")
@click.pass_context
def contacts_list(ctx, limit, skip, query):
    """List contacts in the location."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit, "startAfterId": skip if skip else None}
        if query:
            params["query"] = query
        data = api.get("/contacts/", params=params)
        contacts_data = data.get("contacts", data)
        _output(ctx, contacts_data if ctx.obj["json"] else data, "Contacts")
    except Exception as e:
        _handle_error(e)


@contacts.command("get")
@click.argument("contact_id")
@click.pass_context
def contacts_get(ctx, contact_id):
    """Get a single contact by ID."""
    try:
        data = api.get(f"/contacts/{contact_id}")
        _output(ctx, data, "Contact Details")
    except Exception as e:
        _handle_error(e)


@contacts.command("create")
@click.option("--email", default=None, help="Contact email")
@click.option("--phone", default=None, help="Contact phone")
@click.option("--first-name", default=None, help="First name")
@click.option("--last-name", default=None, help="Last name")
@click.option("--name", default=None, help="Full name")
@click.option("--company", "company_name", default=None, help="Company name")
@click.option("--tag", "tags", multiple=True, help="Tags to add (repeatable)")
@click.option("--source", default=None, help="Contact source")
@click.pass_context
def contacts_create(ctx, email, phone, first_name, last_name, name, company_name, tags, source):
    """Create a new contact."""
    try:
        body = {"locationId": _loc(ctx)}
        if email:
            body["email"] = email
        if phone:
            body["phone"] = phone
        if first_name:
            body["firstName"] = first_name
        if last_name:
            body["lastName"] = last_name
        if name:
            body["name"] = name
        if company_name:
            body["companyName"] = company_name
        if tags:
            body["tags"] = list(tags)
        if source:
            body["source"] = source
        data = api.post("/contacts/", data=body)
        _output(ctx, data, "Contact Created")
    except Exception as e:
        _handle_error(e)


@contacts.command("update")
@click.argument("contact_id")
@click.option("--email", default=None)
@click.option("--phone", default=None)
@click.option("--first-name", default=None)
@click.option("--last-name", default=None)
@click.option("--company", "company_name", default=None)
@click.option("--tag", "tags", multiple=True, help="Replace all tags")
@click.pass_context
def contacts_update(ctx, contact_id, email, phone, first_name, last_name, company_name, tags):
    """Update a contact by ID."""
    try:
        body = {}
        if email:
            body["email"] = email
        if phone:
            body["phone"] = phone
        if first_name:
            body["firstName"] = first_name
        if last_name:
            body["lastName"] = last_name
        if company_name:
            body["companyName"] = company_name
        if tags:
            body["tags"] = list(tags)
        data = api.put(f"/contacts/{contact_id}", data=body)
        _output(ctx, data, "Contact Updated")
    except Exception as e:
        _handle_error(e)


@contacts.command("delete")
@click.argument("contact_id")
@click.pass_context
def contacts_delete(ctx, contact_id):
    """Delete a contact by ID."""
    try:
        data = api.delete(f"/contacts/{contact_id}")
        _output(ctx, data, "Contact Deleted")
    except Exception as e:
        _handle_error(e)


@contacts.command("search")
@click.argument("query")
@click.option("--limit", default=20)
@click.pass_context
def contacts_search(ctx, query, limit):
    """Search contacts with advanced filters."""
    try:
        body = {
            "locationId": _loc(ctx),
            "pageSize": limit,
            "searchAfter": [],
            "filters": [{"field": "firstNameLowerCase", "operator": "contains", "value": query.lower()}],
        }
        data = api.post("/contacts/search", data=body)
        _output(ctx, data, f"Search: '{query}'")
    except Exception as e:
        _handle_error(e)


@contacts.command("add-tag")
@click.argument("contact_id")
@click.argument("tags", nargs=-1, required=True)
@click.pass_context
def contacts_add_tag(ctx, contact_id, tags):
    """Add tags to a contact."""
    try:
        data = api.post(f"/contacts/{contact_id}/tags", data={"tags": list(tags)})
        _output(ctx, data, "Tags Added")
    except Exception as e:
        _handle_error(e)


@contacts.command("remove-tag")
@click.argument("contact_id")
@click.argument("tags", nargs=-1, required=True)
@click.pass_context
def contacts_remove_tag(ctx, contact_id, tags):
    """Remove tags from a contact."""
    try:
        data = api.delete(f"/contacts/{contact_id}/tags", version=None)
        _output(ctx, data, "Tags Removed")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# OPPORTUNITIES
# ===========================================================================

@cli.group()
@click.pass_context
def opportunities(ctx):
    """Manage pipeline opportunities — list, get, create, update, delete."""
    pass


@opportunities.command("list")
@click.option("--pipeline-id", default=None, help="Filter by pipeline ID")
@click.option("--limit", default=20)
@click.option("--status", default=None, type=click.Choice(["open", "won", "lost", "abandoned"]))
@click.pass_context
def opportunities_list(ctx, pipeline_id, limit, status):
    """List opportunities."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit}
        if pipeline_id:
            params["pipelineId"] = pipeline_id
        if status:
            params["status"] = status
        data = api.get("/opportunities/search", params=params)
        _output(ctx, data, "Opportunities")
    except Exception as e:
        _handle_error(e)


@opportunities.command("get")
@click.argument("opportunity_id")
@click.pass_context
def opportunities_get(ctx, opportunity_id):
    """Get opportunity details."""
    try:
        data = api.get(f"/opportunities/{opportunity_id}")
        _output(ctx, data, "Opportunity Details")
    except Exception as e:
        _handle_error(e)


@opportunities.command("create")
@click.option("--pipeline-id", required=True, help="Pipeline ID")
@click.option("--stage-id", required=True, help="Stage ID")
@click.option("--name", required=True, help="Opportunity name")
@click.option("--contact-id", required=True, help="Contact ID")
@click.option("--value", "monetary_value", default=None, type=float, help="Monetary value")
@click.option("--status", default="open", type=click.Choice(["open", "won", "lost", "abandoned"]))
@click.pass_context
def opportunities_create(ctx, pipeline_id, stage_id, name, contact_id, monetary_value, status):
    """Create a new opportunity."""
    try:
        body = {
            "locationId": _loc(ctx),
            "pipelineId": pipeline_id,
            "pipelineStageId": stage_id,
            "name": name,
            "contactId": contact_id,
            "status": status,
        }
        if monetary_value is not None:
            body["monetaryValue"] = monetary_value
        data = api.post("/opportunities/", data=body)
        _output(ctx, data, "Opportunity Created")
    except Exception as e:
        _handle_error(e)


@opportunities.command("update")
@click.argument("opportunity_id")
@click.option("--name", default=None)
@click.option("--stage-id", default=None, help="Move to stage")
@click.option("--status", default=None, type=click.Choice(["open", "won", "lost", "abandoned"]))
@click.option("--value", "monetary_value", default=None, type=float)
@click.pass_context
def opportunities_update(ctx, opportunity_id, name, stage_id, status, monetary_value):
    """Update an opportunity."""
    try:
        body = {}
        if name:
            body["name"] = name
        if stage_id:
            body["pipelineStageId"] = stage_id
        if status:
            body["status"] = status
        if monetary_value is not None:
            body["monetaryValue"] = monetary_value
        data = api.put(f"/opportunities/{opportunity_id}", data=body)
        _output(ctx, data, "Opportunity Updated")
    except Exception as e:
        _handle_error(e)


@opportunities.command("delete")
@click.argument("opportunity_id")
@click.pass_context
def opportunities_delete(ctx, opportunity_id):
    """Delete an opportunity."""
    try:
        data = api.delete(f"/opportunities/{opportunity_id}")
        _output(ctx, data, "Opportunity Deleted")
    except Exception as e:
        _handle_error(e)


@opportunities.command("pipelines")
@click.pass_context
def opportunities_pipelines(ctx):
    """List all pipelines."""
    try:
        data = api.get("/opportunities/pipelines", params={"locationId": _loc(ctx)})
        _output(ctx, data, "Pipelines")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# CALENDARS
# ===========================================================================

@cli.group()
@click.pass_context
def calendars(ctx):
    """Manage calendars, appointments, and availability slots."""
    pass


@calendars.command("list")
@click.pass_context
def calendars_list(ctx):
    """List all calendars."""
    try:
        data = api.get("/calendars/", params={"locationId": _loc(ctx)})
        _output(ctx, data, "Calendars")
    except Exception as e:
        _handle_error(e)


@calendars.command("get")
@click.argument("calendar_id")
@click.pass_context
def calendars_get(ctx, calendar_id):
    """Get calendar details."""
    try:
        data = api.get(f"/calendars/{calendar_id}")
        _output(ctx, data, "Calendar Details")
    except Exception as e:
        _handle_error(e)


@calendars.command("slots")
@click.argument("calendar_id")
@click.option("--start", required=True, help="Start date (YYYY-MM-DD or epoch ms)")
@click.option("--end", required=True, help="End date (YYYY-MM-DD or epoch ms)")
@click.option("--timezone", default="America/New_York")
@click.pass_context
def calendars_slots(ctx, calendar_id, start, end, timezone):
    """Get available appointment slots."""
    try:
        params = {
            "calendarId": calendar_id,
            "startDate": start,
            "endDate": end,
            "timezone": timezone,
        }
        data = api.get(f"/calendars/{calendar_id}/free-slots", params=params)
        _output(ctx, data, "Available Slots")
    except Exception as e:
        _handle_error(e)


@calendars.command("appointments")
@click.option("--calendar-id", default=None, help="Filter by calendar ID")
@click.option("--contact-id", default=None, help="Filter by contact ID")
@click.option("--start", default=None, help="Start date filter")
@click.option("--end", default=None, help="End date filter")
@click.pass_context
def calendars_appointments(ctx, calendar_id, contact_id, start, end):
    """List appointments."""
    try:
        params = {"locationId": _loc(ctx)}
        if calendar_id:
            params["calendarId"] = calendar_id
        if contact_id:
            params["contactId"] = contact_id
        if start:
            params["startTime"] = start
        if end:
            params["endTime"] = end
        data = api.get("/calendars/events/appointments", params=params)
        _output(ctx, data, "Appointments")
    except Exception as e:
        _handle_error(e)


@calendars.command("book")
@click.option("--calendar-id", required=True, help="Calendar ID")
@click.option("--contact-id", required=True, help="Contact ID")
@click.option("--slot-id", required=True, help="Slot ID from 'slots' command")
@click.option("--start", required=True, help="Start time (ISO 8601)")
@click.option("--end", required=True, help="End time (ISO 8601)")
@click.option("--title", default=None, help="Appointment title")
@click.pass_context
def calendars_book(ctx, calendar_id, contact_id, slot_id, start, end, title):
    """Book an appointment."""
    try:
        body = {
            "calendarId": calendar_id,
            "locationId": _loc(ctx),
            "contactId": contact_id,
            "selectedSlot": slot_id,
            "startTime": start,
            "endTime": end,
        }
        if title:
            body["title"] = title
        data = api.post("/calendars/events/appointments", data=body)
        _output(ctx, data, "Appointment Booked")
    except Exception as e:
        _handle_error(e)


@calendars.command("groups")
@click.pass_context
def calendars_groups(ctx):
    """List calendar groups."""
    try:
        data = api.get("/calendars/groups", params={"locationId": _loc(ctx)})
        _output(ctx, data, "Calendar Groups")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# WORKFLOWS
# ===========================================================================

def _require_experimental(ctx: click.Context):
    """Guard: exit if --experimental flag not set."""
    if not ctx.obj.get("experimental"):
        click.echo(
            "Error: This command requires --experimental flag (uses internal GHL API).\n"
            "Usage: ghl --experimental workflows create ...",
            err=True,
        )
        sys.exit(1)


def _get_internal_client(ctx: click.Context):
    """Get an InternalGHLClient (lazy import to avoid dep when not needed)."""
    from cli_anything.gohighlevel.utils.ghl_internal_client import TokenManager, InternalGHLClient
    token_mgr = TokenManager()
    return InternalGHLClient(token_mgr, _loc(ctx))


@cli.group()
@click.pass_context
def workflows(ctx):
    """List and manage workflows. Create commands require --experimental."""
    pass


@workflows.command("list")
@click.pass_context
def workflows_list(ctx):
    """List all workflows."""
    try:
        data = api.get("/workflows/", params={"locationId": _loc(ctx)})
        _output(ctx, data, "Workflows")
    except Exception as e:
        _handle_error(e)


@workflows.command("enroll")
@click.option("--contact-id", required=True, help="Contact ID to enroll")
@click.option("--workflow-id", required=True, help="Workflow ID")
@click.pass_context
def workflows_enroll(ctx, contact_id, workflow_id):
    """Enroll a contact in a workflow (public API)."""
    try:
        data = api.post(f"/contacts/{contact_id}/workflow/{workflow_id}")
        _output(ctx, data, "Contact Enrolled")
    except Exception as e:
        _handle_error(e)


@workflows.command("remove")
@click.option("--contact-id", required=True, help="Contact ID to remove")
@click.option("--workflow-id", required=True, help="Workflow ID")
@click.pass_context
def workflows_remove(ctx, contact_id, workflow_id):
    """Remove a contact from a workflow (public API)."""
    try:
        data = api.delete(f"/contacts/{contact_id}/workflow/{workflow_id}")
        _output(ctx, data, "Contact Removed from Workflow")
    except Exception as e:
        _handle_error(e)


@workflows.command("create")
@click.option("--name", required=True, help="Workflow name")
@click.option("--folder", default=None, help="Folder name (created if needed)")
@click.option("--from-json", "json_file", required=True, type=click.Path(exists=True),
              help="Campaign JSON file path")
@click.pass_context
def workflows_create(ctx, name, folder, json_file):
    """Create workflows from a campaign JSON file (experimental, internal API).

    The JSON file should contain a campaign dict where each key is a workflow
    with 'name', 'templates' (linked steps), and optional 'tag' (trigger).
    """
    _require_experimental(ctx)
    try:
        from cli_anything.gohighlevel.utils.workflow_builder import CampaignBuilder

        with open(json_file) as f:
            campaign = json.load(f)

        client = _get_internal_client(ctx)
        builder = CampaignBuilder(client)
        stats = builder.build(campaign, folder or name)

        if ctx.obj["json"]:
            click.echo(json.dumps(stats, indent=2, default=str))
        else:
            click.echo(builder.format_summary())
    except Exception as e:
        _handle_error(e)


@workflows.command("create-step")
@click.option("--type", "step_type", required=True,
              type=click.Choice(["email", "sms", "wait", "tag", "webhook", "ai"]))
@click.option("--name", required=True, help="Step name")
@click.option("--output-file", "out_file", required=True, type=click.Path(),
              help="JSON file to append step to")
@click.option("--subject", default=None, help="Email subject (email type)")
@click.option("--body", default=None, help="Message body (email/sms type)")
@click.option("--from-name", default="", help="Sender name (email type)")
@click.option("--value", default=None, type=int, help="Wait value (wait type)")
@click.option("--unit", default="days", type=click.Choice(["minutes", "hours", "days"]),
              help="Wait unit (wait type)")
@click.option("--tags", default=None, help="Comma-separated tags (tag type)")
@click.option("--remove-tags", is_flag=True, help="Remove tags instead of add (tag type)")
@click.option("--url", default=None, help="Webhook URL (webhook type)")
@click.option("--method", default="POST", help="HTTP method (webhook type)")
@click.option("--prompt", default=None, help="AI prompt (ai type)")
@click.option("--model", default="gpt-4o", help="AI model (ai type)")
@click.pass_context
def workflows_create_step(ctx, step_type, name, out_file, subject, body, from_name,
                          value, unit, tags, remove_tags, url, method, prompt, model):
    """Build a workflow step and append to a JSON file (experimental).

    Use repeatedly to build up a workflow step-by-step, then pass the
    file to 'workflows create --from-json'.
    """
    _require_experimental(ctx)
    try:
        from cli_anything.gohighlevel.utils import workflow_builder as wb

        if step_type == "email":
            if not subject or not body:
                click.echo("Error: --subject and --body required for email step", err=True)
                sys.exit(1)
            step = wb.email_step(name, subject, body, from_name)
        elif step_type == "sms":
            if not body:
                click.echo("Error: --body required for sms step", err=True)
                sys.exit(1)
            step = wb.sms_step(name, body)
        elif step_type == "wait":
            if value is None:
                click.echo("Error: --value required for wait step", err=True)
                sys.exit(1)
            step = wb.wait_step(name, value, unit)
        elif step_type == "tag":
            if not tags:
                click.echo("Error: --tags required for tag step", err=True)
                sys.exit(1)
            step = wb.tag_step(name, [t.strip() for t in tags.split(",")], remove=remove_tags)
        elif step_type == "webhook":
            if not url:
                click.echo("Error: --url required for webhook step", err=True)
                sys.exit(1)
            step = wb.webhook_step(name, url, method)
        elif step_type == "ai":
            if not prompt:
                click.echo("Error: --prompt required for ai step", err=True)
                sys.exit(1)
            step = wb.ai_step(name, prompt, model)
        else:
            click.echo(f"Error: Unknown step type: {step_type}", err=True)
            sys.exit(1)

        # Load existing or start fresh
        import os
        if os.path.exists(out_file):
            with open(out_file) as f:
                steps = json.load(f)
        else:
            steps = []

        steps.append(step)

        # Auto-link all steps
        linked = wb.link_steps(steps)
        with open(out_file, "w") as f:
            json.dump(linked, f, indent=2)

        if ctx.obj["json"]:
            click.echo(json.dumps(step, indent=2))
        else:
            click.echo(f"Step added: {step['name']} ({step['type']})")
            click.echo(f"Total steps in {out_file}: {len(linked)}")
    except Exception as e:
        _handle_error(e)


@workflows.command("create-n8n")
@click.option("--name", required=True, help="Workflow name")
@click.option("--webhook-url", required=True, help="n8n webhook URL")
@click.option("--tag", default=None, help="Trigger tag (creates tag trigger)")
@click.option("--folder", default=None, help="Folder name")
@click.pass_context
def workflows_create_n8n(ctx, name, webhook_url, tag, folder):
    """Create a minimal GHL workflow that triggers an n8n webhook (experimental).

    Creates: [tag trigger] → [webhook POST to n8n URL]
    """
    _require_experimental(ctx)
    try:
        from cli_anything.gohighlevel.utils import workflow_builder as wb

        steps = [wb.webhook_step(f"n8n: {name}", webhook_url, "POST")]
        if tag:
            steps.insert(0, wb.tag_step(f"Tag: {tag}", [tag]))

        linked = wb.link_steps(steps)
        campaign = {
            "n8n_bridge": {
                "name": name,
                "templates": linked,
                "tag": tag,
            }
        }

        from cli_anything.gohighlevel.utils.workflow_builder import CampaignBuilder
        client = _get_internal_client(ctx)
        builder = CampaignBuilder(client)
        stats = builder.build(campaign, folder or f"n8n-{name}")

        if ctx.obj["json"]:
            click.echo(json.dumps(stats, indent=2, default=str))
        else:
            click.echo(builder.format_summary())
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# DOCUMENTS / CONTRACTS
# ===========================================================================

@cli.group()
@click.pass_context
def documents(ctx):
    """Documents, contracts, and proposals — list, send, templates."""
    pass


@documents.command("list")
@click.option("--status", default=None, type=click.Choice(["draft", "sent", "viewed", "completed", "accepted"]))
@click.option("--payment-status", default=None, type=click.Choice(["waiting_for_payment", "paid", "no_payment"]))
@click.option("--limit", default=20)
@click.option("--offset", "skip", default=0)
@click.option("--query", default=None, help="Search by name")
@click.pass_context
def documents_list(ctx, status, payment_status, limit, skip, query):
    """List documents/contracts."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit, "skip": skip}
        if status:
            params["status"] = status
        if payment_status:
            params["paymentStatus"] = payment_status
        if query:
            params["query"] = query
        data = api.get("/proposals/document", params=params)
        _output(ctx, data, "Documents")
    except Exception as e:
        _handle_error(e)


@documents.command("templates")
@click.option("--type", "template_type", default=None, type=click.Choice(["proposal", "estimate", "contentLibrary"]))
@click.option("--name", default=None, help="Filter by template name")
@click.option("--limit", default=20)
@click.pass_context
def documents_templates(ctx, template_type, name, limit):
    """List document/contract templates."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit}
        if template_type:
            params["type"] = template_type
        if name:
            params["name"] = name
        data = api.get("/proposals/templates", params=params)
        _output(ctx, data, "Document Templates")
    except Exception as e:
        _handle_error(e)


@documents.command("send")
@click.option("--document-id", required=True, help="Document ID to send")
@click.option("--sent-by", required=True, help="User ID of sender")
@click.option("--medium", default="email", type=click.Choice(["email", "link"]), help="Delivery method")
@click.option("--name", "document_name", default=None, help="Document name override")
@click.pass_context
def documents_send(ctx, document_id, sent_by, medium, document_name):
    """Send an existing document to its recipients."""
    try:
        body = {
            "locationId": _loc(ctx),
            "documentId": document_id,
            "sentBy": sent_by,
            "medium": medium,
        }
        if document_name:
            body["documentName"] = document_name
        data = api.post("/proposals/document/send", data=body)
        _output(ctx, data, "Document Sent")
    except Exception as e:
        _handle_error(e)


@documents.command("send-template")
@click.option("--template-id", required=True, help="Template ID")
@click.option("--contact-id", required=True, help="Contact ID to send to")
@click.option("--user-id", required=True, help="User ID (sender)")
@click.option("--opportunity-id", default=None, help="Link to opportunity")
@click.option("--send/--no-send", "send_document", default=True, help="Send immediately or just create")
@click.pass_context
def documents_send_template(ctx, template_id, contact_id, user_id, opportunity_id, send_document):
    """Create and send a contract from a template."""
    try:
        body = {
            "templateId": template_id,
            "contactId": contact_id,
            "userId": user_id,
            "locationId": _loc(ctx),
            "sendDocument": send_document,
        }
        if opportunity_id:
            body["opportunityId"] = opportunity_id
        data = api.post("/proposals/templates/send", data=body)
        _output(ctx, data, "Template Sent")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# CONVERSATIONS
# ===========================================================================

@cli.group()
@click.pass_context
def conversations(ctx):
    """Manage conversations and messages."""
    pass


@conversations.command("list")
@click.option("--limit", default=20)
@click.option("--status", default=None, type=click.Choice(["all", "read", "unread", "starred"]))
@click.option("--type", "msg_type", default=None,
              type=click.Choice(["Email", "SMS", "WhatsApp", "GMB", "IG", "FB", "Live_Chat", "Custom"]),
              help="Filter by last message type")
@click.pass_context
def conversations_list(ctx, limit, status, msg_type):
    """List conversations. Use --type Email to see email conversations."""
    try:
        # API uses TYPE_EMAIL format for lastMessageType filter
        TYPE_MAP = {
            "Email": "TYPE_EMAIL", "SMS": "TYPE_SMS", "WhatsApp": "TYPE_WHATSAPP",
            "GMB": "TYPE_GMB", "IG": "TYPE_INSTAGRAM", "FB": "TYPE_FACEBOOK",
            "Live_Chat": "TYPE_LIVE_CHAT", "Custom": "TYPE_CUSTOM",
        }
        params = {"locationId": _loc(ctx), "limit": limit}
        if status:
            params["status"] = status
        if msg_type:
            params["lastMessageType"] = TYPE_MAP.get(msg_type, f"TYPE_{msg_type.upper()}")
        data = api.get("/conversations/search", params=params)
        _output(ctx, data, "Conversations")
    except Exception as e:
        _handle_error(e)


@conversations.command("get")
@click.argument("conversation_id")
@click.pass_context
def conversations_get(ctx, conversation_id):
    """Get conversation details."""
    try:
        data = api.get(f"/conversations/{conversation_id}")
        _output(ctx, data, "Conversation Details")
    except Exception as e:
        _handle_error(e)


@conversations.command("messages")
@click.argument("conversation_id")
@click.option("--limit", default=20)
@click.option("--type", "msg_type", default=None,
              type=click.Choice(["Email", "SMS", "WhatsApp", "GMB", "IG", "FB", "Live_Chat", "Custom"]),
              help="Filter messages by type")
@click.pass_context
def conversations_messages(ctx, conversation_id, limit, msg_type):
    """Get messages in a conversation. Use --type Email for email messages only."""
    try:
        TYPE_MAP = {
            "Email": "TYPE_EMAIL", "SMS": "TYPE_SMS", "WhatsApp": "TYPE_WHATSAPP",
            "GMB": "TYPE_GMB", "IG": "TYPE_INSTAGRAM", "FB": "TYPE_FACEBOOK",
            "Live_Chat": "TYPE_LIVE_CHAT", "Custom": "TYPE_CUSTOM",
        }
        params = {"limit": limit}
        if msg_type:
            params["type"] = TYPE_MAP.get(msg_type, f"TYPE_{msg_type.upper()}")
        data = api.get(f"/conversations/{conversation_id}/messages", params=params)
        _output(ctx, data, "Messages")
    except Exception as e:
        _handle_error(e)


@conversations.command("get-email")
@click.argument("email_message_id")
@click.pass_context
def conversations_get_email(ctx, email_message_id):
    """Get full email details (subject, body, headers, attachments).

    Two-step workflow: list conversations --type Email → get message IDs → get-email <id>
    """
    try:
        data = api.get(f"/conversations/messages/email/{email_message_id}")
        _output(ctx, data, "Email Details")
    except Exception as e:
        _handle_error(e)


@conversations.command("send")
@click.argument("conversation_id")
@click.option("--type", "msg_type", default="SMS", type=click.Choice(["SMS", "Email", "WhatsApp", "GMB", "IG", "FB", "Live_Chat"]))
@click.option("--message", required=True, help="Message text")
@click.pass_context
def conversations_send(ctx, conversation_id, msg_type, message):
    """Send a message in a conversation."""
    try:
        body = {
            "type": msg_type,
            "message": message,
            "conversationId": conversation_id,
        }
        data = api.post(f"/conversations/messages", data=body)
        _output(ctx, data, "Message Sent")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# EMAILS
# ===========================================================================

@cli.group()
@click.pass_context
def emails(ctx):
    """Email campaigns and templates."""
    pass


@emails.command("list-campaigns")
@click.option("--status", default=None, help="Filter by status")
@click.pass_context
def emails_list_campaigns(ctx, status):
    """List email campaigns. Note: Uses the campaigns API."""
    try:
        params = {"locationId": _loc(ctx)}
        if status:
            params["status"] = status
        data = api.get("/campaigns/", params=params)
        _output(ctx, data, "Email Campaigns")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# PAYMENTS
# ===========================================================================

@cli.group()
@click.pass_context
def payments(ctx):
    """Payments, invoices, transactions, and orders."""
    pass


@payments.command("transactions")
@click.option("--limit", default=20)
@click.option("--offset", default=0)
@click.option("--contact-id", default=None)
@click.pass_context
def payments_transactions(ctx, limit, offset, contact_id):
    """List transactions."""
    try:
        params = {"altId": _loc(ctx), "altType": "location", "limit": limit, "offset": offset}
        if contact_id:
            params["contactId"] = contact_id
        data = api.get("/payments/transactions", params=params)
        _output(ctx, data, "Transactions")
    except Exception as e:
        _handle_error(e)


@payments.command("orders")
@click.option("--limit", default=20)
@click.option("--offset", default=0)
@click.pass_context
def payments_orders(ctx, limit, offset):
    """List orders."""
    try:
        params = {"altId": _loc(ctx), "altType": "location", "limit": limit, "offset": offset}
        data = api.get("/payments/orders", params=params)
        _output(ctx, data, "Orders")
    except Exception as e:
        _handle_error(e)


@payments.command("invoices")
@click.option("--limit", default=20)
@click.option("--offset", default=0)
@click.option("--status", default=None, type=click.Choice(["draft", "sent", "paid", "void"]))
@click.option("--contact-id", default=None)
@click.pass_context
def payments_invoices(ctx, limit, offset, status, contact_id):
    """List invoices."""
    try:
        params = {"altId": _loc(ctx), "altType": "location", "limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if contact_id:
            params["contactId"] = contact_id
        data = api.get("/invoices/", params=params)
        _output(ctx, data, "Invoices")
    except Exception as e:
        _handle_error(e)


@payments.command("create-invoice")
@click.option("--contact-id", required=True, help="Contact ID")
@click.option("--name", required=True, help="Invoice name/title")
@click.option("--amount", required=True, type=float, help="Total amount in cents")
@click.option("--due-date", required=True, help="Due date (YYYY-MM-DD)")
@click.pass_context
def payments_create_invoice(ctx, contact_id, name, amount, due_date):
    """Create a new invoice."""
    try:
        body = {
            "altId": _loc(ctx),
            "altType": "location",
            "contactId": contact_id,
            "name": name,
            "total": amount,
            "dueDate": due_date,
        }
        data = api.post("/invoices/", data=body)
        _output(ctx, data, "Invoice Created")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# FORMS
# ===========================================================================

@cli.group()
@click.pass_context
def forms(ctx):
    """Forms and form submissions."""
    pass


@forms.command("list")
@click.option("--limit", default=20)
@click.option("--offset", "skip", default=0)
@click.option("--type", "form_type", default=None, help="Form type filter")
@click.pass_context
def forms_list(ctx, limit, skip, form_type):
    """List forms."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit, "skip": skip}
        if form_type:
            params["type"] = form_type
        data = api.get("/forms/", params=params)
        _output(ctx, data, "Forms")
    except Exception as e:
        _handle_error(e)


@forms.command("submissions")
@click.argument("form_id")
@click.option("--limit", default=20)
@click.option("--page", default=1)
@click.pass_context
def forms_submissions(ctx, form_id, limit, page):
    """Get form submissions."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit, "page": page}
        data = api.get(f"/forms/submissions", params={"formId": form_id, **params})
        _output(ctx, data, f"Submissions for form {form_id}")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# SOCIAL MEDIA
# ===========================================================================

@cli.group()
@click.pass_context
def social(ctx):
    """Social media posts and analytics."""
    pass


@social.command("accounts")
@click.pass_context
def social_accounts(ctx):
    """List connected social media accounts."""
    try:
        data = api.get(f"/social-media-posting/{_loc(ctx)}/accounts")
        _output(ctx, data, "Social Accounts")
    except Exception as e:
        _handle_error(e)


@social.command("posts")
@click.option("--limit", default=20)
@click.option("--offset", "skip", default=0)
@click.option("--type", "post_type", default=None, help="Filter by post type")
@click.pass_context
def social_posts(ctx, limit, skip, post_type):
    """List social media posts."""
    try:
        params = {"locationId": _loc(ctx), "limit": limit, "skip": skip}
        if post_type:
            params["type"] = post_type
        data = api.post(f"/social-media-posting/{_loc(ctx)}/posts/list", data=params)
        _output(ctx, data, "Social Posts")
    except Exception as e:
        _handle_error(e)


@social.command("create-post")
@click.option("--account-id", required=True, multiple=True, help="Social account IDs (repeatable)")
@click.option("--text", required=True, help="Post text content")
@click.option("--media-url", default=None, multiple=True, help="Media URLs (repeatable)")
@click.option("--schedule", default=None, help="Schedule time (ISO 8601)")
@click.pass_context
def social_create_post(ctx, account_id, text, media_url, schedule):
    """Create a social media post."""
    try:
        body = {
            "locationId": _loc(ctx),
            "accountIds": list(account_id),
            "summary": text,
        }
        if media_url:
            body["media"] = [{"url": u, "type": "image"} for u in media_url]
        if schedule:
            body["scheduledAt"] = schedule
        data = api.post(f"/social-media-posting/{_loc(ctx)}/posts", data=body)
        _output(ctx, data, "Post Created")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# LOCATIONS
# ===========================================================================

@cli.group()
@click.pass_context
def locations(ctx):
    """Location/sub-account management."""
    pass


@locations.command("get")
@click.pass_context
def locations_get(ctx):
    """Get current location details."""
    try:
        data = api.get(f"/locations/{_loc(ctx)}")
        _output(ctx, data, "Location Details")
    except Exception as e:
        _handle_error(e)


@locations.command("search")
@click.option("--company-id", required=True, help="Company/Agency ID")
@click.option("--limit", default=20)
@click.option("--offset", "skip", default=0)
@click.option("--query", default=None, help="Search query")
@click.pass_context
def locations_search(ctx, company_id, limit, skip, query):
    """Search locations (requires company-level access)."""
    try:
        params = {"companyId": company_id, "limit": limit, "skip": skip}
        if query:
            params["query"] = query
        data = api.get("/locations/search", params=params)
        _output(ctx, data, "Locations")
    except Exception as e:
        _handle_error(e)


@locations.command("tags")
@click.pass_context
def locations_tags(ctx):
    """List tags for current location."""
    try:
        data = api.get(f"/locations/{_loc(ctx)}/tags")
        _output(ctx, data, "Location Tags")
    except Exception as e:
        _handle_error(e)


@locations.command("custom-fields")
@click.pass_context
def locations_custom_fields(ctx):
    """List custom fields for current location."""
    try:
        data = api.get(f"/locations/{_loc(ctx)}/customFields")
        _output(ctx, data, "Custom Fields")
    except Exception as e:
        _handle_error(e)


@locations.command("custom-values")
@click.pass_context
def locations_custom_values(ctx):
    """List custom values for current location."""
    try:
        data = api.get(f"/locations/{_loc(ctx)}/customValues")
        _output(ctx, data, "Custom Values")
    except Exception as e:
        _handle_error(e)


# ===========================================================================
# Entry point
# ===========================================================================

def main():
    cli(obj={})


if __name__ == "__main__":
    main()
