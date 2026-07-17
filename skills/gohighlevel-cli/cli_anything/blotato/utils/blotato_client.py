"""Blotato REST API client with API key authentication."""
from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

BASE_URL = "https://backend.blotato.com/v2"


def _get_api_key() -> str:
    """Get API key from BLOTATO_API_KEY env var."""
    key = os.environ.get("BLOTATO_API_KEY", "").strip()
    if not key:
        print(
            "Error: BLOTATO_API_KEY environment variable is not set.\n"
            "Set it with: export BLOTATO_API_KEY='your-api-key-here'",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def _headers() -> dict[str, str]:
    """Build request headers with API key auth."""
    return {
        "blotato-api-key": _get_api_key(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def get(path: str, params: dict[str, Any] | None = None) -> dict:
    """Make a GET request to the Blotato API."""
    url = f"{BASE_URL}{path}"
    resp = requests.get(url, headers=_headers(), params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def post(path: str, data: dict[str, Any] | None = None) -> dict:
    """Make a POST request to the Blotato API."""
    url = f"{BASE_URL}{path}"
    resp = requests.post(url, headers=_headers(), json=data or {}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def delete(path: str) -> dict:
    """Make a DELETE request to the Blotato API."""
    url = f"{BASE_URL}{path}"
    resp = requests.delete(url, headers=_headers(), timeout=30)
    resp.raise_for_status()
    try:
        return resp.json()
    except (json.JSONDecodeError, requests.exceptions.JSONDecodeError):
        return {"status": "deleted", "statusCode": resp.status_code}


def format_output(data: Any, as_json: bool = False) -> str:
    """Format API response for display."""
    if as_json:
        return json.dumps(data, indent=2, default=str)
    if isinstance(data, dict):
        return _format_dict(data)
    if isinstance(data, list):
        return _format_list(data)
    return str(data)


def _format_dict(d: dict, indent: int = 0) -> str:
    """Format a dict for human-readable display."""
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
                    name = item.get("name") or item.get("title") or item.get("id", f"item {i}")
                    lines.append(f"{prefix}  - {name}")
                else:
                    lines.append(f"{prefix}  - {item}")
            if len(v) > 5:
                lines.append(f"{prefix}  ... and {len(v) - 5} more")
        else:
            lines.append(f"{prefix}{k}: {v}")
    return "\n".join(lines)


def _format_list(items: list, indent: int = 0) -> str:
    """Format a list for human-readable display."""
    lines = []
    prefix = "  " * indent
    for i, item in enumerate(items):
        if isinstance(item, dict):
            name = item.get("name") or item.get("title") or item.get("id", f"item {i}")
            lines.append(f"{prefix}{i + 1}. {name}")
            for k, v in item.items():
                if k not in ("name", "title") and not isinstance(v, (dict, list)):
                    lines.append(f"{prefix}   {k}: {v}")
        else:
            lines.append(f"{prefix}{i + 1}. {item}")
    return "\n".join(lines)
