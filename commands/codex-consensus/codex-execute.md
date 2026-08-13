---
description: Codex GPT-5.6-sol subagents execute an approved plan (parallel workers; Claude orchestrates)
argument-hint: "[path-to-plan.md | task text] [--serial] [--no-verify] [--budget N]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Execute a plan using **Codex GPT-5.6-sol subagents as the workers**. Claude orchestrates, verifies and commits; Sol writes the code.

Raw arguments: `$ARGUMENTS`

Not worth delegating: single-obvious-change edits of ~20 lines or fewer — just make the edit yourself, delegation overhead loses.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds (need ≥ 0.130) | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which model to use instead — never downgrade silently. |
| Git repository (strongly recommended) | `git rev-parse HEAD` succeeds | Workers edit files; git gives the rollback point and the review base. If not a repo, confirm with the user before dispatching write-enabled workers. |

If anything is missing, STOP. Do NOT generate placeholder bash. Never silently retry an auth error.

Create one scratch directory for this run and use it for every file below:

```bash
RUN="$(mktemp -d)"    # per-run, never a fixed /tmp path — see § Rules
```

## 1. Resolve plan + dispatch mode

- **Plan resolution** — same order as `/codex-consensus:codex-review`: explicit path → inline task text → newest project plan artifact (`.omc/plans/*.md` / `.omc/prd.json` on oh-my-claudecode projects, else `plans/*.md`, `PLAN.md`) → **interview the user** with AskUserQuestion (which plan, or describe the task; serial vs parallel; verify or not).
- **Dispatch mode** — check for the Codex companion script shipped by the `openai-codex` Claude Code plugin (optional; most installs won't have it):
  ```bash
  COMPANION="$(ls "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)"
  ```
  - **Companion found** → verify it with `node "$COMPANION" setup --json` (require `ready:true`, `auth.loggedIn:true`); use companion background jobs below.
  - **No companion (default)** → use plain `codex exec` workers via Bash with `run_in_background: true`. Everything else in this flow is identical.
- **Budget.** `--budget N` caps total Sol rounds for this run — dispatches plus fix rounds — and is normally passed through from the review command as its unspent remainder. Default 6. Per-item fix caps do NOT bound the run: N items × 2 fix rounds each is unbounded in N, which is the real runaway path. Echo the budget before dispatch, and stop taking new fix rounds once it is spent.
- If the plan has not been consensus-reviewed (no APPROVE marker / user hasn't run the review command), note it in one line and continue — do not block.

## 2. Worktree gate + rollback point

Record the base before anything is dispatched: `git rev-parse HEAD` and `git status --short`.

- **Dirty tree → isolate in a worktree.** Workers write with full workspace access; on a dirty tree their changes interleave with the user's uncommitted work and the resulting diff can neither be reviewed cleanly nor reverted. Create `git worktree add "$RUN/exec" HEAD`, copy or symlink any untracked local env files the build needs (e.g. `.env.local` — worktree builds fail without them), and run ALL workers with the worktree as their cwd. Merge back only after verification passes, via a 3-way apply of the worktree diff onto the real tree.
- **Clean tree → run in place.**

## 3. Decompose into work items (prompt contract)

Split the plan into discrete, independently-executable work items (a story, a numbered plan step, or a file-scoped chunk). Independence check: two items are parallel-safe only if their file sets don't overlap; overlapping items run sequentially. `--serial` forces one at a time.

A worker starts with **zero session context** — everything it needs must be in the prompt. Write each one to a file using this contract; never inline-quote it:

```bash
P="$RUN/item-<n>.txt"
cat >"$P" <<'EOF'
GOAL: <one paragraph — what done looks like for this item>
SPEC: <the relevant plan step(s), verbatim or tightly summarized. It is frozen —
  implement it exactly; if a step is impossible as written, implement the closest
  faithful version and report the deviation. Do not redesign.>
KEY PATHS: <exact files/dirs to touch or read first>
CONSTRAINTS: <"do not touch anything outside this scope", style rules, deps that must not change>
NON-GOALS: <explicitly out of scope>
PROOF: Run `<item's test/build/lint command>` and include its full output in your report.
OUTPUT: End with a report — files changed (one line each: path + what/why),
  proof output, and any deviations from the spec with reasons.
EOF
```

## 4. Dispatch Sol workers

For each work item (parallel-safe items launched together):

**Companion mode:**
```bash
node "$COMPANION" task --background --write --model gpt-5.6-sol "$(cat "$P")"
```
- `--write` is REQUIRED — without it the worker cannot edit files.
- Record each returned job/task ID → work item mapping; poll `node "$COMPANION" status --json`; on completion fetch `node "$COMPANION" result <job-id> --json`.

**Plain-CLI mode (no companion):**
```bash
codex exec --skip-git-repo-check -m gpt-5.6-sol -s workspace-write \
  -c approval_policy="never" --json \
  -o "$RUN/out-item-<n>.txt" - <"$P" 2>"$RUN/err-item-<n>.txt" \
  | grep '"type":"thread.started"'
```
- Run each via Bash with `run_in_background: true` and a 10-minute ceiling (`timeout: 600000` on the tool call — the default 2-minute timeout kills real builds). Note `timeout` is a Bash *tool* parameter; the `timeout` shell command does not exist on macOS.
- `-s workspace-write` is REQUIRED — without it the worker cannot edit files. Prefer it over any flag that disables sandboxing entirely. (`--yolo` was removed from codex-cli by 0.144.)
- **Prompt via stdin (`- <"$P"`)** — avoids shell-quoting bugs AND a silent hang: `codex exec` reads stdin in addition to the prompt argument, so under a non-TTY driver it otherwise blocks forever at ~0% CPU waiting for stdin EOF.
- Capture `thread_id` per item so fix rounds can resume that worker's session:
  ```bash
  codex exec resume "$THREAD_ID" -c sandbox_mode="workspace-write" \
    -c approval_policy="never" --json -o "$RUN/out-item-<n>-fix.txt" \
    - <"$P2" 2>"$RUN/err-item-<n>-fix.txt" >/dev/null
  ```
  `resume` REJECTS `-s`; the sandbox must be set via `-c sandbox_mode`, or Codex inherits whatever `config.toml` specifies and may be unable to write. Echo the thread id visibly before running — a missing or malformed id can silently fall back to the most recent session, and a wrong-target resume looks exactly like a successful one. Never use `resume --last`.

**Don't kill a quiet background run early** — Codex builds are legitimately slow. If a job returns empty, read its `.err` file before concluding anything.

**Fix loop (bounded):**
1. Failed/incomplete job → retry ONCE, appending the exact failure context (what broke, which file, what proof is expected) to the prompt, with the same contract discipline.
2. **Same-failure check** — if the retry fails with substantially the same error, stop immediately rather than waiting out the round. An identical failure twice means the prompt contract is wrong, not that the worker was unlucky, and a third dispatch reproduces it at full cost.
3. Second failure, or chain budget exhausted → mark the item **blocked** and continue with the rest. Offer takeover as an AskUserQuestion option rather than silently implementing it yourself.

## 5. Verify (skip only with --no-verify)

Worker reports are **ADVISORY**. After all items finish, verify independently:

1. `git status --short` plus the FULL diff against the recorded base (`git diff <base-HEAD>`). Judge it like a contributor PR: correctness, spec fidelity, style match with the surrounding code, and nothing touched outside each item's scope.
2. Run each item's PROOF command yourself and read the output. A worker's pasted output never counts as proof.
3. Fire a final Sol review of the combined result against the pre-run base:
   - Companion mode: `node "$COMPANION" review --background --base <base-HEAD>`; poll and fetch.
   - Plain-CLI mode: the same prompt-file pattern with `-s read-only`, asking it to review `git diff <base-HEAD>` against the plan and tag findings CRITICAL/HIGH/MEDIUM/LOW.

   Surface findings verbatim. CRITICAL/HIGH → AskUserQuestion: fix via another Sol worker (Recommended) / fix manually / accept.
4. If a worktree was used and verification passed, merge its diff back onto the real tree (3-way apply), re-run the fastest proof there, then remove the worktree.

## 6. Report + commit gate

Print a completion table: work item → job/worker ID → status (done/blocked) → files changed, then verification results and any remaining blockers. List codex session IDs so the user can `codex resume <id>`.

Then present, and ask before committing: a 3-bullet summary of what was built, the files-changed list, proof output (pass/fail, verbatim tail), fix rounds and blocked items, and any spec deviations. Commit ONLY on an explicit yes, and **Claude writes the commit** — Codex never commits, pushes, or touches the remote. Rejected → ask what's wrong and route back to the fix loop within budget.

## Rules

- Workers are always `gpt-5.6-sol` — never downgrade silently.
- Never skip the diff read. Worker claims are advisory until you have read the diff and run the proof yourself.
- Claude does NOT implement plan items itself in this command; if a Sol worker fails twice, report it as blocked rather than silently taking over (offer takeover as an AskUserQuestion option).
- The fix loop terminates on the FIRST of: 2 failed rounds for that item, a repeated identical failure, or the chain budget. No unbounded delegation ping-pong.
- Capture the pre-run git state before dispatching, so the final review has a clean base and a rollback point. Dirty tree → worktree, always.
- Every `-o` and every `2>` goes to the per-run scratch directory. No fixed `/tmp` paths, no discarded stderr, no `2>&1` — merging stderr into the output stream is how a config-parse failure comes back looking like an empty result.
- Commits happen on the Claude side only, after the human gate.
- oh-my-claudecode users with the codex team integration can alternatively run workers via `omc team N:codex "<task>"` — mention it only if the user asks for many (>4) parallel workers and has omc installed.
