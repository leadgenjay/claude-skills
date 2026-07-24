#!/usr/bin/env python3
"""Create a durable Reeper session without external dependencies."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
from pathlib import Path


def slugify(value: str) -> str:
    value = re.sub(r"^https?://", "", value.strip(), flags=re.I)
    value = re.sub(r"\.git$", "", value)
    value = value.rstrip("/").split("/")[-1] or "source"
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value[:40] or "source"


def render(template: str, replacements: dict[str, str]) -> str:
    for key, value in replacements.items():
        template = template.replace("{{" + key + "}}", value)
    return template


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a Reeper session")
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", default=".")
    parser.add_argument("--goal", default="Adapt selected source capabilities to the target project.")
    parser.add_argument("--slug")
    args = parser.parse_args()

    target = Path(args.target).expanduser().resolve()
    if not target.exists() or not target.is_dir():
        parser.error(f"target directory does not exist: {target}")

    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    stamp = now.strftime("%Y%m%d")
    digest = hashlib.sha256(f"{args.source}|{target}|{now.isoformat()}".encode()).hexdigest()[:6]
    session_slug = args.slug or f"{stamp}-{slugify(args.source)}-{digest}"
    session_slug = re.sub(r"[^a-z0-9-]+", "-", session_slug.lower()).strip("-")

    plugin_root = Path(__file__).resolve().parents[1]
    template_dir = plugin_root / "templates" / "session"
    reeper_root = target / ".reeper"
    session_dir = reeper_root / "sessions" / session_slug
    if session_dir.exists():
        parser.error(f"session already exists: {session_dir}")
    session_dir.mkdir(parents=True)

    gitignore = reeper_root / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("cache/\nworktrees/\n*.xml\n", encoding="utf-8")

    replacements = {
        "SESSION_SLUG": session_slug,
        "CREATED_AT": now.isoformat(),
        "SOURCE": args.source,
        "TARGET": str(target),
        "GOAL": args.goal,
    }

    for template_path in sorted(template_dir.iterdir()):
        if template_path.is_file():
            content = render(template_path.read_text(encoding="utf-8"), replacements)
            (session_dir / template_path.name).write_text(content, encoding="utf-8")

    manifest = {
        "version": 1,
        "session": session_slug,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "source": {
            "input": args.source,
            "resolved_url": None,
            "ref": None,
            "commit": None,
            "license": None,
        },
        "target": str(target),
        "goal": args.goal,
        "integration_mode": None,
        "approval": {
            "status": "not_requested",
            "approved_at": None,
            "contract_hash": None,
        },
        "phases": {
            "session": "complete",
            "source_analysis": "pending",
            "target_analysis": "pending",
            "conflict_matrix": "pending",
            "interview": "pending",
            "contract": "pending",
            "implementation": "blocked",
            "verification": "blocked",
            "packaging": "optional",
        },
        "paths": {
            "session_dir": str(session_dir),
            "source_checkout": None,
            "worktree": None,
            "generated_skill": None,
        },
    }
    (session_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(session_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
