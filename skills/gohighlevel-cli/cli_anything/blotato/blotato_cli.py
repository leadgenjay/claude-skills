"""Blotato CLI — Schedule and publish social media posts via Blotato API."""
from __future__ import annotations

import json
import sys

import click
import requests

from cli_anything.blotato.utils import blotato_client as api


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
            msg = body.get("message") or body.get("error") or json.dumps(body)
        except Exception:
            msg = resp.text
        click.echo(f"API Error ({resp.status_code}): {msg}", err=True)
    else:
        click.echo(f"Error: {e}", err=True)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Main CLI Group
# ---------------------------------------------------------------------------

@click.group(invoke_without_command=True)
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.pass_context
def cli(ctx, output_json):
    """Blotato CLI — Schedule and publish social media posts."""
    ctx.ensure_object(dict)
    ctx.obj["json"] = output_json
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


# ---------------------------------------------------------------------------
# me — verify API key
# ---------------------------------------------------------------------------

@cli.command()
@click.pass_context
def me(ctx):
    """Verify API key and show user info."""
    try:
        data = api.get("/users/me")
        _output(ctx, data, "User Info")
    except Exception as e:
        _handle_error(e)


# ---------------------------------------------------------------------------
# accounts group
# ---------------------------------------------------------------------------

@cli.group()
@click.pass_context
def accounts(ctx):
    """Manage connected social media accounts."""
    pass


@accounts.command("list")
@click.option("--platform", type=str, default=None, help="Filter by platform (twitter, instagram, linkedin, ...)")
@click.pass_context
def accounts_list(ctx, platform):
    """List connected social media accounts."""
    try:
        data = api.get("/users/me/accounts")
        accts = data if isinstance(data, list) else data.get("items", data.get("accounts", data.get("data", [])))
        if platform and isinstance(accts, list):
            accts = [a for a in accts if a.get("platform", "").lower() == platform.lower()]
        _output(ctx, accts, f"Accounts{f' ({platform})' if platform else ''}")
    except Exception as e:
        _handle_error(e)


@accounts.command("subaccounts")
@click.argument("account_id")
@click.pass_context
def accounts_subaccounts(ctx, account_id):
    """List subaccounts (pages/profiles) for an account."""
    try:
        data = api.get(f"/users/me/accounts/{account_id}/subaccounts")
        _output(ctx, data, f"Subaccounts for {account_id}")
    except Exception as e:
        _handle_error(e)


# ---------------------------------------------------------------------------
# posts group
# ---------------------------------------------------------------------------

@cli.group()
@click.pass_context
def posts(ctx):
    """Publish and check status of posts."""
    pass


@posts.command("publish")
@click.option("--account", required=True, help="Account ID to post from")
@click.option("--platform", required=True, help="Platform (twitter, instagram, linkedin, facebook, tiktok, pinterest, threads, bluesky, youtube)")
@click.option("--text", required=True, help="Post text content")
@click.option("--media", default=None, help="Comma-separated public media URLs")
@click.option("--schedule", default=None, help="ISO 8601 timestamp (e.g. 2026-03-30T10:00:00Z)")
@click.option("--next-slot", is_flag=True, help="Schedule at next free slot")
@click.option("--page-id", default=None, help="Page/subaccount ID (required for Facebook, optional for LinkedIn)")
@click.option("--media-type", default=None, type=click.Choice(["reel", "story"]), help="Instagram media type")
@click.option("--privacy", default=None, help="TikTok/YouTube privacy setting")
@click.option("--board-id", default=None, help="Pinterest board ID (required for Pinterest)")
@click.option("--reply-control", default=None, help="Threads reply control")
@click.option("--title", default=None, help="YouTube video title")
@click.option("--notify-subscribers", is_flag=True, default=False, help="YouTube: notify subscribers")
@click.option("--thread", default=None, help="JSON string for additional thread posts")
@click.pass_context
def posts_publish(ctx, account, platform, text, media, schedule, next_slot,
                  page_id, media_type, privacy, board_id, reply_control,
                  title, notify_subscribers, thread):
    """Publish or schedule a post."""
    try:
        # Build content object
        # Blotato API requires the `mediaUrls` property on every post — default
        # to [] for text-only posts so the API doesn't 400 on missing property.
        content = {"text": text, "platform": platform, "mediaUrls": []}
        if media:
            content["mediaUrls"] = [u.strip() for u in media.split(",")]

        # Build target object — targetType must be a platform name, not "account"
        target = {"targetType": platform.lower()}

        # Platform-specific target fields
        plat = platform.lower()
        if page_id:
            target["pageId"] = page_id

        if plat == "instagram" and media_type:
            content["mediaType"] = media_type

        if plat == "tiktok":
            if privacy:
                content["privacyLevel"] = privacy
            # TikTok required booleans — default to false
            content.setdefault("commentDisabled", False)
            content.setdefault("duetDisabled", False)
            content.setdefault("stitchDisabled", False)

        if plat == "pinterest":
            if board_id:
                target["boardId"] = board_id

        if plat == "threads" and reply_control:
            content["replyControl"] = reply_control

        if plat == "youtube":
            if title:
                content["title"] = title
            if privacy:
                content["privacyStatus"] = privacy
            if notify_subscribers:
                content["notifySubscribers"] = True

        # Build payload — accountId is at post level per Blotato v2 API
        payload = {
            "post": {
                "accountId": account,
                "content": content,
                "target": target,
            }
        }

        # Scheduling at root level
        if schedule:
            payload["scheduledTime"] = schedule
        if next_slot:
            payload["useNextFreeSlot"] = True

        # Thread support
        if thread:
            try:
                additional = json.loads(thread)
                if isinstance(additional, list):
                    payload["additionalPosts"] = additional
                else:
                    payload["additionalPosts"] = [additional]
            except json.JSONDecodeError:
                click.echo("Error: --thread must be valid JSON", err=True)
                sys.exit(1)

        data = api.post("/posts", data=payload)
        _output(ctx, data, "Post Submitted")
    except Exception as e:
        _handle_error(e)


@posts.command("status")
@click.argument("submission_id")
@click.pass_context
def posts_status(ctx, submission_id):
    """Check the status of a submitted post."""
    try:
        data = api.get(f"/posts/{submission_id}")
        _output(ctx, data, f"Post Status: {submission_id}")

        # Show public URL if available
        if not ctx.obj.get("json"):
            public_url = None
            if isinstance(data, dict):
                public_url = data.get("publicUrl") or data.get("public_url")
            if public_url:
                click.echo(f"\nPublic URL: {public_url}")
    except Exception as e:
        _handle_error(e)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    cli()


if __name__ == "__main__":
    main()
