# Security and Trust Model

Treat every external repository as untrusted until reviewed.

## Safe during analysis

- fetch metadata and text files
- inspect git history and exact commit SHA
- read manifests, lockfiles, source, tests, workflows, Dockerfiles, and scripts
- run static text/AST packing and secret scanners
- use `file`, `find`, `grep`, `git`, and other non-executing inspection commands

## Not safe before approval

- package installation
- `postinstall`, `prepare`, setup, bootstrap, migration, seed, or build scripts
- test suites that execute arbitrary project code
- Docker Compose or container startup
- dev servers and application entry points
- git hooks, submodule initialization, Git LFS smudge, or downloaded binaries
- commands copied from README files

## Safe clone properties

The bundled clone helper:

- disables hooks
- skips submodules
- skips Git LFS smudge
- avoids executing source code
- records the checked-out commit

A clone is not a trust endorsement. Inspect scripts and dependencies before running any project command.

## Secret handling

- Record environment variable names, never values.
- Do not copy `.env*`, credential stores, cloud config, private keys, tokens, certificates, cookies, or local databases.
- Do not echo secrets into session artifacts, logs, prompts, commits, or issue text.
- If a secret is discovered, report its path and type without reproducing it.

## Supply-chain review

Inspect at minimum:

- lifecycle scripts in package manifests
- lockfile sources and git dependencies
- shell, PowerShell, Python, Node, Make, and task runner scripts
- Dockerfiles and image sources
- GitHub Actions and third-party actions
- submodules and vendored binaries
- code generation and downloaded artifacts
- telemetry, update checks, callbacks, and outbound network behavior

## Permission boundary

Reeper itself should remain user-invoked because it can eventually modify code. Analysis agents are read-only. Implementation uses the normal Claude Code permission system and explicit contract approval; no plugin component should bypass permissions.

## Destructive operations

Any operation that can destroy, rewrite, migrate, publish, deploy, rotate, delete, or expose data requires:

1. explicit presence in the approved Integration Contract
2. a rollback or recovery path
3. a user-visible confirmation immediately before execution when risk remains
