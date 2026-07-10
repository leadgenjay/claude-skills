---
description: Codex consensus toolkit router — plan review or plan execution with GPT-5.6-sol workers
argument-hint: "[review|execute] [path-to-plan.md | task text]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Route to the right Codex consensus flow. This package uses **OpenAI Codex (GPT-5.6-sol)** as a second, independent model: it reviews your plans adversarially and can execute them as background workers, while Claude orchestrates.

Raw arguments: `$ARGUMENTS`

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which available model to use instead (e.g. via `codex exec -m <model>` probe) — never downgrade silently. |

If anything is missing, STOP. Do NOT generate placeholder bash.

## Routing

1. First token of `$ARGUMENTS` is `review` (or `plan-review`, `consensus`) → follow the instructions in `codex-review.md` in this command's directory, passing the remaining arguments.
2. First token is `execute` (or `exec`, `implement`, `build`) → follow `codex-execute.md` in this directory, passing the remaining arguments.
3. No recognizable route token → **interview the user** with AskUserQuestion:
   - "What should Codex do?" → options: **Review a plan for consensus** (Sol critiques + iterates to APPROVE) / **Execute a plan with Sol workers** (Codex writes the code) / **Full pipeline** (review to consensus, then execute).
   - If they picked a flow but no plan/task text was given, ask where the plan lives (file path, paste inline, or describe the task).
4. Then follow the chosen sibling command file's instructions end-to-end.

Sibling files installed with this package: `codex-review.md`, `codex-execute.md` (also directly invocable as `/codex-consensus:codex-review` and `/codex-consensus:codex-execute`).
