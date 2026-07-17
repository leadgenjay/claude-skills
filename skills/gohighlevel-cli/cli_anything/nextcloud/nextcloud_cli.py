"""Nextcloud CLI — Agent-usable command-line interface to the Nextcloud API."""
from __future__ import annotations

import json
import sys

import click
import requests

from cli_anything.nextcloud.utils import nc_client as api


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
            msg = body.get("ocs", {}).get("meta", {}).get("message") or json.dumps(body)
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
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_context
def main(ctx, as_json):
    """Nextcloud CLI — manage files and shares on Nextcloud."""
    ctx.ensure_object(dict)
    ctx.obj["json"] = as_json
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


# ---------------------------------------------------------------------------
# Shares Group
# ---------------------------------------------------------------------------

@main.group()
@click.pass_context
def shares(ctx):
    """Manage public share links."""
    pass


@shares.command("create")
@click.option("--path", required=True, help="Nextcloud folder/file path to share")
@click.option("--password", default=None, help="Optional password for the share link")
@click.option("--expiry", type=int, default=None, help="Expire after N days")
@click.pass_context
def shares_create(ctx, path, password, expiry):
    """Create a public read-only share link."""
    try:
        result = api.create_share(path, password=password, expire_days=expiry)
        ocs_data = result.get("ocs", {}).get("data", {})
        share_url = ocs_data.get("url", "")

        if ctx.obj.get("json"):
            click.echo(json.dumps(ocs_data, indent=2, default=str))
        else:
            click.echo(f"\nShare created!")
            click.echo(f"  URL: {share_url}")
            click.echo(f"  ID:  {ocs_data.get('id', 'N/A')}")
            if ocs_data.get("expiration"):
                click.echo(f"  Expires: {ocs_data['expiration']}")
    except Exception as e:
        _handle_error(e)


@shares.command("list")
@click.option("--path", default=None, help="Filter shares by path")
@click.pass_context
def shares_list(ctx, path):
    """List active shares."""
    try:
        result = api.list_shares(path=path)
        data = result.get("ocs", {}).get("data", [])

        if ctx.obj.get("json"):
            click.echo(json.dumps(data, indent=2, default=str))
        else:
            if not data:
                click.echo("No shares found.")
                return
            click.echo(f"\n{len(data)} share(s):")
            for s in data:
                share_type = "link" if s.get("share_type") == 3 else f"type={s.get('share_type')}"
                click.echo(f"  [{s.get('id')}] {s.get('path')} ({share_type})")
                click.echo(f"       URL: {s.get('url', 'N/A')}")
    except Exception as e:
        _handle_error(e)


@shares.command("delete")
@click.option("--id", "share_id", required=True, type=int, help="Share ID to delete")
@click.pass_context
def shares_delete(ctx, share_id):
    """Delete a share by ID."""
    try:
        result = api.delete_share(share_id)
        if ctx.obj.get("json"):
            click.echo(json.dumps(result, indent=2, default=str))
        else:
            click.echo(f"Share {share_id} deleted.")
    except Exception as e:
        _handle_error(e)


# ---------------------------------------------------------------------------
# Files Group
# ---------------------------------------------------------------------------

@main.group()
@click.pass_context
def files(ctx):
    """Browse files and folders via WebDAV."""
    pass


@files.command("list")
@click.option("--path", default="/", help="Folder path to list (default: /)")
@click.pass_context
def files_list(ctx, path):
    """List files and folders."""
    try:
        items = api.list_files(path)
        if ctx.obj.get("json"):
            click.echo(json.dumps(items, indent=2, default=str))
        else:
            if not items:
                click.echo(f"No files in {path}")
                return
            click.echo(f"\n{path} ({len(items)} items):")
            click.echo(api.format_output(items))
    except Exception as e:
        _handle_error(e)


@files.command("info")
@click.option("--path", required=True, help="File/folder path")
@click.pass_context
def files_info(ctx, path):
    """Get file or folder metadata."""
    try:
        info = api.file_info(path)
        _output(ctx, info, f"Info: {path}")
    except Exception as e:
        _handle_error(e)


if __name__ == "__main__":
    main()
