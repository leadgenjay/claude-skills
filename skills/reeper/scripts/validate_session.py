#!/usr/bin/env python3
"""Validate Reeper session structure and phase consistency."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

REQUIRED = [
    "manifest.json", "intake.md", "source-profile.md", "target-profile.md",
    "conflict-matrix.md", "decisions.md", "integration-contract.md",
    "plan.md", "tasks.md", "verification.md", "provenance.json"
]
PLACEHOLDER_PATTERNS = [
    re.compile(r"\{\{[A-Z0-9_]+\}\}"),
    re.compile(r"\b(?:TBD|TODO|FIXME)\b", re.I),
]


def contract_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Reeper session")
    parser.add_argument("session_dir")
    parser.add_argument("--allow-incomplete", action="store_true")
    args = parser.parse_args()

    session = Path(args.session_dir).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    if not session.is_dir():
        parser.error(f"not a directory: {session}")

    for name in REQUIRED:
        if not (session / name).is_file():
            errors.append(f"missing required file: {name}")

    manifest = None
    manifest_path = session / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"invalid manifest.json: {exc}")

    for path in session.iterdir():
        if not path.is_file() or path.suffix not in {".md", ".json"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            errors.append(f"cannot read {path.name}: {exc}")
            continue
        for pattern in PLACEHOLDER_PATTERNS:
            if pattern.search(text):
                warnings.append(f"placeholder found in {path.name}: {pattern.pattern}")

    if isinstance(manifest, dict):
        approval = manifest.get("approval") or {}
        phases = manifest.get("phases") or {}
        if phases.get("implementation") == "complete" and approval.get("status") != "approved":
            errors.append("implementation marked complete without approved contract")
        if approval.get("status") == "approved":
            contract = session / "integration-contract.md"
            expected = approval.get("contract_hash")
            if contract.exists() and expected and contract_hash(contract) != expected:
                errors.append("approved Integration Contract changed without a new approval hash")
        if phases.get("verification") == "complete":
            verification = (session / "verification.md").read_text(encoding="utf-8") if (session / "verification.md").exists() else ""
            if "| pass" not in verification.lower() and "status: pass" not in verification.lower():
                warnings.append("verification marked complete but no explicit passing status was detected")

    if warnings:
        print("Warnings:")
        for item in warnings:
            print(f"- {item}")

    if errors:
        print("Errors:")
        for item in errors:
            print(f"- {item}")
        return 1

    if warnings and not args.allow_incomplete:
        print("Session structure is valid, but incomplete placeholders remain.")
        return 2

    print("Reeper session validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
