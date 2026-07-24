#!/usr/bin/env python3
"""Scaffold a minimal Agent Skill with progressive-disclosure directories."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def normalize_name(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    if not name or len(name) > 64:
        raise ValueError("skill name must normalize to 1-64 characters")
    return name


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold an Agent Skill")
    parser.add_argument("--output", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--description", required=True)
    parser.add_argument("--user-only", action="store_true", help="Set disable-model-invocation: true")
    args = parser.parse_args()

    try:
        name = normalize_name(args.name)
    except ValueError as exc:
        parser.error(str(exc))

    output = Path(args.output).expanduser().resolve() / name
    if output.exists():
        parser.error(f"output already exists: {output}")

    for directory in ["references", "scripts", "templates", "examples", "evals"]:
        (output / directory).mkdir(parents=True, exist_ok=True)

    frontmatter = ["---", f"name: {name}", f"description: {args.description}"]
    if args.user_only:
        frontmatter.append("disable-model-invocation: true")
    frontmatter.extend(["---", ""])
    body = "\n".join(frontmatter) + f"# {name.replace('-', ' ').title()}\n\n## Inputs\n\n## Workflow\n\n## Safety and approval gates\n\n## Verification\n\n## Supporting resources\n\n- Read `references/` only when relevant.\n- Use `scripts/` for deterministic operations.\n"
    (output / "SKILL.md").write_text(body, encoding="utf-8")

    evals = {
        "should_trigger": [],
        "should_not_trigger": [],
        "execution": [],
        "safety": [],
    }
    (output / "evals" / "prompts.json").write_text(json.dumps(evals, indent=2) + "\n", encoding="utf-8")
    (output / "README.md").write_text(
        f"# {name}\n\nScaffolded Agent Skill. Complete `SKILL.md`, add resources, and populate `evals/prompts.json`.\n",
        encoding="utf-8",
    )

    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
