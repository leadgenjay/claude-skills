#!/usr/bin/env python3
"""Create a conservative, read-only repository fingerprint using stdlib only."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any

IGNORE_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "coverage", ".venv", "venv",
    "__pycache__", ".turbo", ".cache", "target", "vendor", ".reeper"
}
MANIFESTS = {
    "package.json", "pnpm-lock.yaml", "yarn.lock", "package-lock.json", "bun.lockb", "bun.lock",
    "pyproject.toml", "requirements.txt", "poetry.lock", "Pipfile", "uv.lock",
    "Cargo.toml", "Cargo.lock", "go.mod", "go.sum", "Gemfile", "Gemfile.lock",
    "composer.json", "pom.xml", "build.gradle", "build.gradle.kts", "mix.exs",
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml",
}
INSTRUCTION_NAMES = {"CLAUDE.md", "AGENTS.md", "README.md", "CONTRIBUTING.md"}
LICENSE_NAMES = {"LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING", "NOTICE"}
SENSITIVE_PATTERNS = [
    re.compile(r"^\.env(?:\..+)?$"),
    re.compile(r".*\.(?:pem|key|p12|pfx)$", re.I),
    re.compile(r"^(?:id_rsa|id_ed25519)$"),
]


def run_git(root: Path, *args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *args], check=True, capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip() or None
    except (subprocess.SubprocessError, FileNotFoundError):
        return None


def safe_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def is_sensitive(name: str) -> bool:
    return any(pattern.match(name) for pattern in SENSITIVE_PATTERNS)


def walk(root: Path):
    for current, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".git")]
        base = Path(current)
        for name in names:
            path = base / name
            try:
                rel = path.relative_to(root)
            except ValueError:
                continue
            yield path, rel


def detect_frameworks(package: dict[str, Any] | None, pyproject_text: str) -> list[str]:
    found = set()
    if package:
        deps = {}
        for key in ("dependencies", "devDependencies", "peerDependencies"):
            deps.update(package.get(key) or {})
        mapping = {
            "next": "Next.js", "react": "React", "vue": "Vue", "nuxt": "Nuxt",
            "@sveltejs/kit": "SvelteKit", "svelte": "Svelte", "express": "Express",
            "fastify": "Fastify", "nestjs": "NestJS", "@nestjs/core": "NestJS",
            "drizzle-orm": "Drizzle", "prisma": "Prisma", "@prisma/client": "Prisma",
            "@supabase/supabase-js": "Supabase", "stripe": "Stripe", "tailwindcss": "Tailwind CSS",
        }
        for dep, label in mapping.items():
            if dep in deps:
                found.add(label)
    low = pyproject_text.lower()
    for token, label in {
        "django": "Django", "fastapi": "FastAPI", "flask": "Flask", "sqlalchemy": "SQLAlchemy",
        "pydantic": "Pydantic", "pytest": "pytest"
    }.items():
        if token in low:
            found.add(label)
    return sorted(found)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fingerprint a repository without executing it")
    parser.add_argument("path", nargs="?", default=".")
    parser.add_argument("--json-out")
    args = parser.parse_args()

    root = Path(args.path).expanduser().resolve()
    if not root.is_dir():
        parser.error(f"not a directory: {root}")

    extensions: Counter[str] = Counter()
    manifests: list[str] = []
    instructions: list[str] = []
    licenses: list[str] = []
    workflows: list[str] = []
    migrations: list[str] = []
    scripts: list[str] = []
    sensitive_names: list[str] = []
    env_names: set[str] = set()
    total_files = 0
    total_bytes = 0

    package = None
    pyproject_text = ""

    env_pattern = re.compile(r"(?:process\.env\.|import\.meta\.env\.|os\.environ\[?[\"']?|getenv\([\"'])([A-Z][A-Z0-9_]{2,})")

    for path, rel in walk(root):
        total_files += 1
        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        total_bytes += size
        suffix = path.suffix.lower() or "[no-extension]"
        extensions[suffix] += 1
        rel_s = rel.as_posix()

        if path.name in MANIFESTS:
            manifests.append(rel_s)
        if path.name in INSTRUCTION_NAMES or ".claude/" in rel_s or ".github/copilot-instructions" in rel_s:
            instructions.append(rel_s)
        if path.name in LICENSE_NAMES:
            licenses.append(rel_s)
        if rel_s.startswith(".github/workflows/"):
            workflows.append(rel_s)
        if "migration" in rel_s.lower() or "migrations" in rel.parts:
            migrations.append(rel_s)
        if path.suffix.lower() in {".sh", ".ps1", ".bat", ".cmd"} or path.name in {"Makefile", "Taskfile.yml", "justfile"}:
            scripts.append(rel_s)
        if is_sensitive(path.name):
            sensitive_names.append(rel_s)

        if path.name == "package.json" and rel.parent == Path("."):
            package = safe_json(path)
        if path.name == "pyproject.toml" and rel.parent == Path("."):
            try:
                pyproject_text = path.read_text(encoding="utf-8", errors="ignore")[:200_000]
            except OSError:
                pass

        if size <= 1_000_000 and path.suffix.lower() in {".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".rb", ".php", ".java", ".kt", ".md", ".toml", ".yaml", ".yml"}:
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for match in env_pattern.finditer(text):
                env_names.add(match.group(1))

    package_manager = None
    for marker, manager in [
        ("pnpm-lock.yaml", "pnpm"), ("yarn.lock", "yarn"), ("package-lock.json", "npm"),
        ("bun.lockb", "bun"), ("bun.lock", "bun"), ("uv.lock", "uv"), ("poetry.lock", "poetry")
    ]:
        if marker in manifests:
            package_manager = manager
            break

    lifecycle_scripts = {}
    package_scripts = {}
    dependencies = []
    if isinstance(package, dict):
        package_scripts = package.get("scripts") or {}
        lifecycle_scripts = {k: v for k, v in package_scripts.items() if k in {"preinstall", "install", "postinstall", "prepare", "prepublish", "prepublishOnly"}}
        deps = set()
        for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            deps.update((package.get(key) or {}).keys())
        dependencies = sorted(deps)

    fingerprint = {
        "version": 1,
        "root": str(root),
        "git": {
            "is_repository": (root / ".git").exists() or run_git(root, "rev-parse", "--is-inside-work-tree") == "true",
            "remote": run_git(root, "remote", "get-url", "origin"),
            "branch": run_git(root, "branch", "--show-current"),
            "commit": run_git(root, "rev-parse", "HEAD"),
            "status_porcelain": run_git(root, "status", "--porcelain=v1"),
        },
        "inventory": {
            "files": total_files,
            "bytes": total_bytes,
            "top_extensions": extensions.most_common(20),
        },
        "manifests": sorted(manifests),
        "instructions": sorted(set(instructions)),
        "license_files": sorted(licenses),
        "workflows": sorted(workflows),
        "migration_candidates": sorted(migrations)[:500],
        "executable_script_candidates": sorted(scripts)[:500],
        "sensitive_filename_candidates": sorted(sensitive_names)[:200],
        "environment_variable_names": sorted(env_names),
        "package_manager": package_manager,
        "package_scripts": package_scripts,
        "lifecycle_scripts": lifecycle_scripts,
        "dependencies": dependencies,
        "frameworks": detect_frameworks(package if isinstance(package, dict) else None, pyproject_text),
    }

    output = json.dumps(fingerprint, indent=2) + "\n"
    if args.json_out:
        out = Path(args.json_out).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
