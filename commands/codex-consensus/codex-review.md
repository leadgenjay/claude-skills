---
description: Codex GPT-5.6-sol reviews a plan and iterates to consensus (APPROVE) before execution
argument-hint: "[path-to-plan.md | inline plan text] [--max-rounds N] [--strict]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Have Codex (GPT-5.6-sol) act as consensus reviewer on a plan: review → revise → re-review until APPROVE or the round cap.

Raw arguments: `$ARGUMENTS`

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which model to use instead — never downgrade silently. |

If anything is missing, STOP. Do NOT generate placeholder bash.

## 1. Resolve the plan (interview if unclear)

In order:
1. If `$ARGUMENTS` contains a path to an existing `.md`/`.json` file → that is the plan.
2. Else if `$ARGUMENTS` has substantial free text (>1 sentence) → treat it as an inline plan; write it to a plan file first (`.omc/plans/codex-review-<slug>.md` if the project uses oh-my-claudecode's `.omc/` directory, otherwise `docs/plans/codex-review-<slug>.md` or the project's existing plans location).
3. Else look for the most recent plan artifact in the project: newest of `.omc/plans/*.md` and `.omc/prd.json` (oh-my-claudecode projects), then `plans/*.md`, `PLAN.md`.
4. If nothing is found — or several candidates are equally plausible — **interview the user** with AskUserQuestion: which plan to review (list the candidates found), how strict the review should be (standard: block on HIGH+ / strict: block on MEDIUM+), and the max rounds if they want something other than 3.

Parse flags: `--max-rounds N` (default 3), `--strict` (reject on ANY unresolved MEDIUM+ finding; default only HIGH+ block).

## 2. Review round (Sol)

Run (foreground; reviews are read-only):

```bash
codex exec --skip-git-repo-check -m gpt-5.6-sol --sandbox read-only \
  "You are the consensus reviewer in a planning loop. Review the plan at <PLAN_PATH> (read it, plus any files it references that you need for context).

Evaluate: (1) hidden assumptions and missing failure modes, (2) simpler alternatives — steelman at least one, (3) testable acceptance criteria present for every deliverable, (4) risk mitigation for anything touching prod/billing/data, (5) internal consistency and correct sequencing.

Output: numbered findings each tagged CRITICAL/HIGH/MEDIUM/LOW, each with a concrete fix. End with exactly one final line: VERDICT: APPROVE or VERDICT: ITERATE." 2>&1
```

Surface Sol's findings to the user **verbatim** (this second opinion is the deliverable — do not paraphrase).

## 3. Consensus loop

- **APPROVE** → done. Print `✅ Consensus reached (round N)` + the plan path. Suggest next step: `/codex-consensus:codex-execute <plan-path>` (or, if the user runs oh-my-claudecode, `ralph --critic=codex`).
- **ITERATE** → YOU revise the plan file, addressing every CRITICAL/HIGH (and MEDIUM if `--strict`) finding with a concrete plan change — do not just append rebuttals. Note deliberately-rejected suggestions in a `## Reviewer pushback` section with one-line rationale. Then re-run step 2. Max `--max-rounds` rounds.
- Round cap without APPROVE → present the best version + remaining disagreements and let the user decide via AskUserQuestion: Accept as-is / One more round / Abandon.

## Rules

- Model is always `gpt-5.6-sol` — never downgrade silently. If it is unavailable, stop and re-run the Step 0 checks with the user.
- Never begin implementing during this command. Review-only.
- Keep every round's verdict line in a running summary printed at the end (round → verdict → # findings).
