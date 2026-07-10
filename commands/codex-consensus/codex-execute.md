---
description: Codex GPT-5.6-sol subagents execute an approved plan (parallel workers; Claude orchestrates)
argument-hint: "[path-to-plan.md | task text] [--serial] [--no-verify]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Execute a plan using **Codex GPT-5.6-sol subagents as the workers**. Claude orchestrates; Sol writes the code.

Raw arguments: `$ARGUMENTS`

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which model to use instead — never downgrade silently. |
| Git repository (strongly recommended) | `git rev-parse HEAD` succeeds | Workers edit files; git gives the rollback point and the review base. If not a repo, confirm with the user before dispatching write-enabled workers. |

If anything is missing, STOP. Do NOT generate placeholder bash.

## 1. Resolve plan + dispatch mode

- **Plan resolution** — same order as `/codex-consensus:codex-review`: explicit path → inline task text → newest project plan artifact (`.omc/plans/*.md` / `.omc/prd.json` on oh-my-claudecode projects, else `plans/*.md`, `PLAN.md`) → **interview the user** with AskUserQuestion (which plan, or describe the task; serial vs parallel; verify or not).
- **Dispatch mode** — check for the Codex companion script shipped by the `openai-codex` Claude Code plugin (optional; most installs won't have it):
  ```bash
  COMPANION="$(ls "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)"
  ```
  - **Companion found** → verify it with `node "$COMPANION" setup --json` (require `ready:true`, `auth.loggedIn:true`); use companion background jobs below.
  - **No companion (default)** → use plain `codex exec` workers via Bash with `run_in_background: true`. Everything else in this flow is identical.
- If the plan has not been consensus-reviewed (no APPROVE marker / user hasn't run the review command), note it in one line and continue — do not block.

## 2. Decompose into work items

Split the plan into discrete, independently-executable work items (a story, a numbered plan step, or a file-scoped chunk). For each item write a self-contained worker prompt containing: the goal, exact file paths, acceptance criteria, and "do not touch anything outside this scope".

Independence check: two items are parallel-safe only if their file sets don't overlap. Overlapping items run sequentially. `--serial` forces one at a time.

## 3. Dispatch Sol workers

For each work item (parallel-safe items launched together):

**Companion mode:**
```bash
node "$COMPANION" task --background --write --model gpt-5.6-sol "<worker prompt>"
```
- `--write` is REQUIRED — without it the codex worker cannot edit files.
- Record each returned job/task ID → work item mapping; poll `node "$COMPANION" status --json`; on completion fetch `node "$COMPANION" result <job-id> --json`.

**Plain-CLI mode (no companion):**
```bash
codex exec --skip-git-repo-check -m gpt-5.6-sol --sandbox workspace-write "<worker prompt>" 2>&1
```
- Run each via Bash with `run_in_background: true`; collect each worker's output when it finishes.
- `--sandbox workspace-write` is REQUIRED — without it the worker cannot edit files.

Either mode: on a failed/incomplete job, retry once with the failure context appended to the prompt. Second failure → mark the item blocked and continue with the rest.

## 4. Verify (skip only with --no-verify)

After all workers finish:
1. Check each item's acceptance criteria with fresh evidence (run the project's tests/build/lint for touched areas; read the output).
2. Fire a final Sol review of the combined result against the pre-run base commit:
   - Companion mode: `node "$COMPANION" review --background --base <pre-run-HEAD>`; poll and fetch.
   - Plain-CLI mode: `codex exec --skip-git-repo-check -m gpt-5.6-sol --sandbox read-only "Review the changes shown by 'git diff <pre-run-HEAD>' against the plan at <PLAN_PATH>. Tag findings CRITICAL/HIGH/MEDIUM/LOW."`
   Surface findings verbatim. CRITICAL/HIGH findings → AskUserQuestion: fix via another Sol worker (Recommended) / fix manually / accept.

## 5. Report

Print a completion table: work item → job/worker ID → status (done/blocked) → files changed, then verification results and any remaining blockers. In companion mode, list codex session IDs so the user can `codex resume <id>`.

## Rules

- Workers are always `gpt-5.6-sol` — never downgrade silently.
- Claude does NOT implement plan items itself in this command; if a Sol worker fails twice, report it as blocked rather than silently taking over (offer takeover as an AskUserQuestion option).
- Capture the pre-run git state (`git rev-parse HEAD`, `git status --short`) before dispatching, so the final review has a clean base and a rollback point.
- oh-my-claudecode users with the codex team integration can alternatively run workers via `omc team N:codex "<task>"` — mention it only if the user asks for many (>4) parallel workers and has omc installed.
