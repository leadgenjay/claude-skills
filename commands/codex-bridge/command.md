---
description: Codex Bridge router — plan review with a ratifying second reviewer, or tiered parallel execution
argument-hint: "[review|execute] [path-to-plan.md | task text]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Route to the right Codex Bridge flow. This package uses **OpenAI Codex as a second, independent model**: it reviews your plans adversarially, a stronger model ratifies the risky approvals, and tiered workers execute the plan while Claude orchestrates and verifies.

Raw arguments: `$ARGUMENTS`

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds (≥ 0.130; **≥ 0.153.4** for the `gpt-6-astra` ratification gate) | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which available model to use instead — never downgrade silently. |
| Bundled scripts present | `ls ~/.claude/commands/codex-bridge/scripts/` lists `codex-dispatch.sh` and `assert-review-produced.sh` | Reinstall the package. Both are load-bearing, not optional helpers. |

If anything is missing, STOP. Do NOT generate placeholder bash.

## The one thing to know before running anything

**An omitted model flag is not a safe default.** `codex` reads `model =` from `~/.codex/config.toml` whenever `-m` / `--model` is absent, so an unpinned call runs whatever that file names — often the newest and most expensive model on the account. Below codex-cli 0.153.4 that failed loudly with a 400; from 0.153.4 it succeeds. **The upgrade removed the symptom, not the bug.** Check yours once:

```bash
grep -E '^\s*model' ~/.codex/config.toml
```

Every command in this package pins the model on every call, including resumes, and the bundled `scripts/codex-dispatch.sh` refuses to build a writing invocation without one.

## Routing

1. First token of `$ARGUMENTS` is `review` (or `plan-review`, `consensus`) → follow the instructions in `codex-review.md` in this command's directory, passing the remaining arguments.
2. First token is `execute` (or `exec`, `implement`, `build`) → follow `codex-execute.md` in this directory, passing the remaining arguments.
3. No recognizable route token → **interview the user** with AskUserQuestion:
   - "What should Codex do?" → options: **Review a plan for consensus** (critique + iterate to APPROVE, with a second model ratifying risky approvals) / **Execute a plan with Codex workers** (tiered, parallel, Codex writes the code) / **Full pipeline** (review to consensus, then execute).
   - If they picked a flow but no plan/task text was given, ask where the plan lives (file path, paste inline, or describe the task).
4. Then follow the chosen sibling command file's instructions end-to-end.

Sibling files installed with this package: `codex-review.md`, `codex-execute.md` (also directly invocable as `/codex-bridge:codex-review` and `/codex-bridge:codex-execute`), plus `scripts/codex-dispatch.sh` and `scripts/assert-review-produced.sh`.

The two scripts install non-executable, because `install.sh` fetches files with `curl -o` and does not chmod. Invoke them as `bash <path>` — never `./`. To restore the bit permanently:

```bash
chmod +x ~/.claude/commands/codex-bridge/scripts/*.sh
```

## What the two flows guarantee

- **The reviewer never writes.** Read-only on the first call (`-s read-only`) and on every resume (`-c sandbox_mode="read-only"`, because `resume` rejects `-s`). `gpt-6-astra` is review-and-ratify only, in every mode, and `codex-dispatch.sh` refuses it a write sandbox rather than trusting a document to be read.
- **An approval that failed is not an approval.** `codex exec` exits 0 when it refuses to run, so a review that read nothing looks exactly like a review with no objections. `assert-review-produced.sh` is what tells those apart, and a failed ratification leaves the plan unapproved rather than quietly consenting.
- **Nothing chains itself.** Review → execute is always human-gated, and so is the commit at the end. An approved plan is not an approved diff.
