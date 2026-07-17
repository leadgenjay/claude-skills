"""Nextcloud OCS + WebDAV API client with Basic Auth."""
from __future__ import annotations

import json
import os
import sys
from typing import Any
from xml.etree import ElementTree

import requests

DAV_NS = "DAV:"


def _get_url() -> str:
    return os.environ.get("NEXTCLOUD_URL", "https://cloud.nextwave.io").rstrip("/")


def _get_user() -> str:
    user = os.environ.get("NEXTCLOUD_USER", "").strip()
    if not user:
        print(
            "Error: NEXTCLOUD_USER environment variable is not set.\n"
            "Set it with: export NEXTCLOUD_USER='your-username'",
            file=sys.stderr,
        )
        sys.exit(1)
    return user


def _get_password() -> str:
    pw = os.environ.get("NEXTCLOUD_APP_PASSWORD", "").strip()
    if not pw:
        print(
            "Error: NEXTCLOUD_APP_PASSWORD environment variable is not set.\n"
            "Set it with: export NEXTCLOUD_APP_PASSWORD='your-app-password'",
            file=sys.stderr,
        )
        sys.exit(1)
    return pw


def _auth() -> tuple[str, str]:
    return (_get_user(), _get_password())


def _ocs_headers() -> dict[str, str]:
    return {"OCS-APIREQUEST": "true", "Accept": "application/json"}


# ---------------------------------------------------------------------------
# OCS Sharing API
# ---------------------------------------------------------------------------

def create_share(
    path: str,
    share_type: int = 3,
    permissions: int = 1,
    password: str | None = None,
    expire_days: int | None = None,
) -> dict:
    """Create a public share link. share_type=3 is public link, permissions=1 is read-only."""
    url = f"{_get_url()}/ocs/v2.php/apps/files_sharing/api/v1/shares"
    data: dict[str, Any] = {
        "path": path,
        "shareType": share_type,
        "permissions": permissions,
    }
    if password:
        data["password"] = password
    if expire_days:
        from datetime import datetime, timedelta
        expire_date = (datetime.now() + timedelta(days=expire_days)).strftime("%Y-%m-%d")
        data["expireDate"] = expire_date

    resp = requests.post(
        url, auth=_auth(), headers=_ocs_headers(), data=data,
        params={"format": "json"}, timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def list_shares(path: str | None = None) -> dict:
    """List shares, optionally filtered by path."""
    url = f"{_get_url()}/ocs/v2.php/apps/files_sharing/api/v1/shares"
    params: dict[str, Any] = {"format": "json"}
    if path:
        params["path"] = path
    resp = requests.get(url, auth=_auth(), headers=_ocs_headers(), params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def delete_share(share_id: int) -> dict:
    """Delete a share by ID."""
    url = f"{_get_url()}/ocs/v2.php/apps/files_sharing/api/v1/shares/{share_id}"
    resp = requests.delete(
        url, auth=_auth(), headers=_ocs_headers(),
        params={"format": "json"}, timeout=30,
    )
    resp.raise_for_status()
    try:
        return resp.json()
    except (json.JSONDecodeError, requests.exceptions.JSONDecodeError):
        return {"status": "deleted", "statusCode": resp.status_code}


# ---------------------------------------------------------------------------
# WebDAV Files API
# ---------------------------------------------------------------------------

def list_files(path: str = "/") -> list[dict]:
    """List files/folders via WebDAV PROPFIND."""
    user = _get_user()
    dav_path = path.strip("/")
    url = f"{_get_url()}/remote.php/dav/files/{user}/{dav_path}"

    resp = requests.request(
        "PROPFIND", url, auth=_auth(),
        headers={"Depth": "1", "Content-Type": "application/xml"},
        timeout=30,
    )
    resp.raise_for_status()

    tree = ElementTree.fromstring(resp.content)
    items = []
    for response in tree.findall(f"{{{DAV_NS}}}response"):
        href = response.findtext(f"{{{DAV_NS}}}href", "")
        props = response.find(f".//{{{DAV_NS}}}prop")
        if props is None:
            continue
        display = props.findtext(f"{{{DAV_NS}}}displayname", "")
        content_type = props.findtext(f"{{{DAV_NS}}}getcontenttype", "")
        size = props.findtext(f"{{{DAV_NS}}}getcontentlength", "0")
        last_modified = props.findtext(f"{{{DAV_NS}}}getlastmodified", "")
        is_dir = props.find(f"{{{DAV_NS}}}resourcetype/{{{DAV_NS}}}collection") is not None

        items.append({
            "name": display,
            "href": href,
            "type": "directory" if is_dir else "file",
            "contentType": content_type,
            "size": int(size) if size else 0,
            "lastModified": last_modified,
        })

    # Skip the first entry (the folder itself)
    return items[1:] if len(items) > 1 else items


def file_info(path: str) -> dict:
    """Get metadata for a single file/folder."""
    user = _get_user()
    dav_path = path.strip("/")
    url = f"{_get_url()}/remote.php/dav/files/{user}/{dav_path}"

    resp = requests.request(
        "PROPFIND", url, auth=_auth(),
        headers={"Depth": "0", "Content-Type": "application/xml"},
        timeout=30,
    )
    resp.raise_for_status()

    tree = ElementTree.fromstring(resp.content)
    response = tree.find(f"{{{DAV_NS}}}response")
    if response is None:
        return {"error": "not found"}

    props = response.find(f".//{{{DAV_NS}}}prop")
    if props is None:
        return {"error": "no properties"}

    display = props.findtext(f"{{{DAV_NS}}}displayname", "")
    content_type = props.findtext(f"{{{DAV_NS}}}getcontenttype", "")
    size = props.findtext(f"{{{DAV_NS}}}getcontentlength", "0")
    last_modified = props.findtext(f"{{{DAV_NS}}}getlastmodified", "")
    is_dir = props.find(f"{{{DAV_NS}}}resourcetype/{{{DAV_NS}}}collection") is not None

    return {
        "name": display,
        "path": path,
        "type": "directory" if is_dir else "file",
        "contentType": content_type,
        "size": int(size) if size else 0,
        "lastModified": last_modified,
    }


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

def format_output(data: Any) -> str:
    """Format API response for human-readable display."""
    if isinstance(data, dict):
        return _format_dict(data)
    if isinstance(data, list):
        return _format_list(data)
    return str(data)


def _format_dict(d: dict, indent: int = 0) -> str:
    lines = []
    prefix = "  " * indent
    for k, v in d.items():
        if isinstance(v, dict):
            lines.append(f"{prefix}{k}:")
            lines.append(_format_dict(v, indent + 1))
        elif isinstance(v, list):
            lines.append(f"{prefix}{k}: [{len(v)} items]")
            for i, item in enumerate(v[:5]):
                if isinstance(item, dict):
                    name = item.get("name") or item.get("path") or item.get("id", f"item {i}")
                    lines.append(f"{prefix}  - {name}")
                else:
                    lines.append(f"{prefix}  - {item}")
            if len(v) > 5:
                lines.append(f"{prefix}  ... and {len(v) - 5} more")
        else:
            lines.append(f"{prefix}{k}: {v}")
    return "\n".join(lines)


def _format_list(items: list, indent: int = 0) -> str:
    lines = []
    prefix = "  " * indent
    for i, item in enumerate(items):
        if isinstance(item, dict):
            name = item.get("name") or item.get("path") or item.get("id", f"item {i}")
            item_type = item.get("type", "")
            icon = "📁" if item_type == "directory" else "📄"
            lines.append(f"{prefix}{icon} {name}")
            size = item.get("size", 0)
            if size and item_type != "directory":
                if size > 1_000_000:
                    lines.append(f"{prefix}   size: {size / 1_000_000:.1f} MB")
                elif size > 1_000:
                    lines.append(f"{prefix}   size: {size / 1_000:.1f} KB")
        else:
            lines.append(f"{prefix}{i + 1}. {item}")
    return "\n".join(lines)
