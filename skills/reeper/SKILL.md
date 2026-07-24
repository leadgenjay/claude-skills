---
name: reeper
description: Safely adapt an external GitHub repository into an existing project instead of blindly copying its architecture. Use when the user wants to import, transplant, fork, vendor, or reimplement someone else's repo for their own stack, merge a repo into an existing app, preserve their own auth/database/billing/design-system while taking a source repo's features, resume an interrupted repository adaptation, or turn a repository or workflow into a callable Agent Skill or plugin. Performs evidence-first source and target analysis, builds a conflict matrix, interviews one material decision at a time, requires explicit approval of an Integration Contract before any code changes, implements in isolation, and verifies against the contract.
---

# Reeper

Adapt an external repository to the current project without treating either codebase as disposable.

Coding agents are good at copying code and bad at noticing when the copied assumptions quietly replace the target's authentication, database, billing, deployment, design system, or operational conventions. Reeper turns repository adaptation into a reconciliation process with a hard approval gate.

## Operating principles

- **Target-preserving by default.** Existing project systems stay authoritative unless the user approves replacement.
- **Evidence before questions.** Inspect both repositories first. Ask only what the code cannot answer.
- **One conflict at a time.** Every material decision is recommended, answered, and recorded.
- **Contract before code.** Implementation is blocked until the user approves the Integration Contract.
- **Untrusted source model.** Source scripts, installs, hooks, submodules, and binaries are never executed during analysis.
- **Resumable.** Sessions live in `.reeper/sessions/<session>/` and survive context loss.
- **Provenance-aware.** Copied, adapted, replaced, rejected, and reimplemented components are all tracked.

## Non-negotiable gates

These apply to every workflow below and are never waived:

1. Do not run source install, build, setup, migration, hook, or executable scripts during analysis.
2. Do not copy secrets, `.env` values, tokens, private keys, generated credentials, or local machine state.
3. Do not modify application code until the user explicitly approves the written Integration Contract.
4. Do not overwrite target architecture by default.
5. Pin the source to an exact commit SHA and record its license before implementation.
6. Implement on an isolated branch or worktree when the target is a Git repository.
7. Keep imported code attributable in provenance artifacts.

## Choose the workflow

| The user wants | Read and follow |
|---|---|
| To import, transplant, fork, vendor, or reimplement an external repo into this project | `${CLAUDE_SKILL_DIR}/workflows/import.md` |
| To continue an adaptation that was interrupted, or return with answers or approval | `${CLAUDE_SKILL_DIR}/workflows/resume.md` |
| To turn a repository or a stable workflow into a callable skill, command, or plugin | `${CLAUDE_SKILL_DIR}/workflows/skillify.md` |

Before starting `import.md`, check whether `.reeper/sessions/` already contains an incomplete session for the same source. If it does, use `resume.md` instead of restarting analysis.

Read exactly one workflow file. Each one names the further references and scripts it needs; do not preload the whole `references/` directory.

## What ships with this skill

| Directory | Contents |
|---|---|
| `workflows/` | The three workflow definitions above |
| `references/` | Operating guides loaded on demand by the workflows: `workflow.md`, `security.md`, `conflict-resolution.md`, `interview-taxonomy.md`, `artifact-contract.md`, `packaging.md` |
| `scripts/` | Deterministic helpers, Python standard library only: `new_session.py`, `safe_clone.sh`, `repo_fingerprint.py`, `validate_session.py`, `scaffold_skill.py` |
| `templates/session/` | The durable session artifact templates |
| `agents/` | Optional read-only subagent definitions (source, target, conflict, verification analysts) |

The workflows reference the subagents in `agents/` as a preference, not a requirement. When they are not installed as agents, perform the same analysis inline and keep it read-only.

## Requirements

- Git
- Python 3.10 or newer
- Optional: Node/npm for Repomix (`npx repomix@latest`) when packing a large remote repository

## Related

This skill is the single-skill build of the Reeper Claude Code plugin. The plugin form adds namespaced commands (`/reeper:import`, `/reeper:resume`, `/reeper:skillify`) and registers the four subagents automatically:

```text
/plugin marketplace add leadgenjay/Reeper
/plugin install reeper@reeper
```

Source and issues: https://github.com/leadgenjay/Reeper (MIT).
