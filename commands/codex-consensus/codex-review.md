---
description: Codex GPT-5.6-sol reviews a plan and iterates to consensus (APPROVE) before execution
argument-hint: "[path-to-plan.md | inline plan text] [--max-rounds N] [--strict] [--budget N]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Have Codex (GPT-5.6-sol) act as consensus reviewer on a plan: review → revise → re-review **in one persistent Codex session** until APPROVE or a stop condition. You are the builder and final arbiter; Sol is a read-only critic.

Raw arguments: `$ARGUMENTS`

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds (need ≥ 0.130) | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which model to use instead — never downgrade silently. |

If anything is missing, STOP. Do NOT generate placeholder bash. Never silently retry an auth error.

Create one scratch directory for this run and use it for every file below:

```bash
RUN="$(mktemp -d)"    # per-run, never a fixed /tmp path — see § Rules
```

## 1. Resolve the plan (interview if unclear)

In order:
1. If `$ARGUMENTS` contains a path to an existing `.md`/`.json` file → that is the plan.
2. Else if `$ARGUMENTS` has substantial free text (>1 sentence) → treat it as an inline plan; write it to a plan file first (`.omc/plans/codex-review-<slug>.md` if the project uses oh-my-claudecode's `.omc/` directory, otherwise `docs/plans/codex-review-<slug>.md` or the project's existing plans location).
3. Else look for the most recent plan artifact in the project: newest of `.omc/plans/*.md` and `.omc/prd.json` (oh-my-claudecode projects), then `plans/*.md`, `PLAN.md`.
4. If nothing is found — or several candidates are equally plausible — **interview the user** with AskUserQuestion: which plan to review (list the candidates found), how strict the review should be (standard: block on HIGH+ / strict: block on MEDIUM+), and the max rounds if they want something other than 3.

Parse flags: `--max-rounds N` (default 3), `--strict` (reject on ANY unresolved MEDIUM+ finding; default only HIGH+ block), `--budget N` (total Sol rounds across this review **and** any `/codex-consensus:codex-execute` that follows; default 6).

Initialize an append-only log at `<plan-dir>/<plan-basename>-review-log.md`. The argument transcript is a deliverable, not a byproduct:

```markdown
# Plan Review Log: <task>
MAX_ROUNDS=<n>, BUDGET=<n> chain rounds, strict=<bool>, reviewer model=gpt-5.6-sol, codex-cli <version>.
```

**Declare the budget before round 1.** Echo the plan path, round cap, chain budget, strict mode and model to the user. A round cap bounds *count*, not *cost* — a single Sol round on a large repo runs 10–20 minutes, so the ceiling belongs in front of the user at the start, not as a discovery at round 3.

## 2. Round 1 — fresh session (capture `thread_id`)

Write the review prompt to a file. Never inline-quote it:

```bash
P="$RUN/prompt-r1.txt"
cat >"$P" <<'EOF'
You are the consensus reviewer in a planning loop. Be skeptical and specific — your job is to find what breaks, not to be agreeable. Read the plan at <PLAN_PATH>, plus any repo files it references that you need for context (you are read-only; do NOT modify any files).

Evaluate: (1) hidden assumptions and missing failure modes, (2) simpler alternatives — steelman at least one, (3) testable acceptance criteria present for every deliverable, (4) risk mitigation for anything touching prod/billing/data, (5) internal consistency and correct sequencing.

Output: numbered findings each tagged CRITICAL/HIGH/MEDIUM/LOW, each with a concrete one-line fix. End your reply with EXACTLY one final line: VERDICT: APPROVE or VERDICT: ITERATE.
EOF
```

Run it with **`run_in_background: true`**, then poll for the verdict file. Do NOT run it in the foreground: a real review routinely outruns the Bash tool's 10-minute hard ceiling, which kills the run and loses the session along with it.

```bash
V="$RUN/verdict-r1.txt"
codex exec --skip-git-repo-check -m gpt-5.6-sol -s read-only --json \
  -o "$V" - <"$P" 2>"$RUN/r1.err" | grep '"type":"thread.started"'
```

Three things in that command are load-bearing:

- **Prompt via stdin (`- <"$P"`)** — this avoids shell-quoting bugs AND sidesteps a silent hang: `codex exec` reads stdin in addition to the prompt argument, so under a non-TTY driver (Claude Code's Bash tool) it otherwise blocks forever at ~0% CPU waiting for stdin EOF.
- **A unique `-o` path per round.** A fixed path like `/tmp/codex-verdict.txt` is shared by every concurrent session on the machine, and a stale read looks exactly like a fresh one.
- **stderr to a file, never `2>/dev/null` or `2>&1`.** Discarding it turns a config-parse failure into a silent "the review produced nothing," because the only symptom you see is `grep` finding no `thread.started`. Success = verdict file exists + `thread.started` appeared + the `.err` file is empty.

Parse `thread_id` from the `{"type":"thread.started","thread_id":"..."}` line → `THREAD_ID`. The critique lands in `$V` — read that file; don't parse the JSONL stream for content.

**If a round dies, read the `.err` file first.** The most common cause is a broken MCP server declared in `~/.codex/config.toml` or `<repo>/.codex/config.toml` killing the session transport before the model is reached. Disable the offending server for this invocation with `-c mcp_servers.<name>.enabled=false` — but first confirm the name actually exists (`grep '^\[mcp_servers' ~/.codex/config.toml`). Passing that flag for a server that is *not* in the config **creates** a stanza with no transport and the parser rejects the entire file, so a stale workaround becomes the fault it was meant to fix.

Surface Sol's findings to the user **verbatim** — this second opinion is the deliverable, do not paraphrase. Append the full critique to the log under `## Round 1 — Codex`.

## 3. Consensus loop (rounds 2..MAX resume the SAME session)

Grep the LAST line of the verdict file for the token.

- **VERDICT: APPROVE** → done. Print `✅ Consensus reached (round N)` + plan path + log path + rounds spent vs budget. Then **AskUserQuestion** for the handoff — never chain automatically:
  - *Execute now via `/codex-consensus:codex-execute <plan-path>` (Recommended)* — pass the unspent budget through as `--budget <remaining>`.
  - *Stop here* — plan approved and parked.
  - *One more review round* — for when APPROVE landed sooner than it should have.

  An approved plan is not an approved diff. Auto-chaining is how a plan that reads well becomes a repo full of code nobody agreed to.

- **VERDICT: ITERATE** → you are the final arbiter; Sol advises, it does not command. Revise the plan file, addressing every CRITICAL/HIGH (and MEDIUM if `--strict`) finding with a concrete plan change — do not just append rebuttals. Note deliberately-rejected suggestions in a `## Reviewer pushback` section with one-line rationale, and append `### Response` (what changed, what was rejected and why) to the log. Then re-review by **resuming the same session**, so Sol remembers its prior critiques and won't re-litigate settled points:

  ```bash
  # SAFETY: resume REJECTS -s. Force read-only via -c sandbox_mode, or Codex
  # inherits config.toml's sandbox (possibly full access) and could WRITE files
  # mid-review. This is the most important line in this command.
  codex exec resume "$THREAD_ID" -c sandbox_mode="read-only" --json \
    -o "$RUN/verdict-r2.txt" \
    "I revised the plan. Re-review <PLAN_PATH> — check whether your prior findings are addressed and flag anything new. Same rules. End with VERDICT: APPROVE or VERDICT: ITERATE." \
    < /dev/null 2>"$RUN/r2.err" >/dev/null
  ```

  `< /dev/null` is required here for the same non-TTY stdin hang. Keep the same background + 10-minute ceiling discipline. **Echo `$THREAD_ID` visibly before running** — `resume` with a missing or malformed id can silently fall back to the most recent session, and a wrong-target resume looks exactly like a successful one. Never use `resume --last`.

- **Convergence check — run this BEFORE spending another round.** Compare round N's findings with round N-1's. If no new CRITICAL/HIGH appeared and the bulk of the findings restate the previous round, **stop immediately and declare deadlock** — do not spend the remaining rounds. A reviewer repeating itself is a stalled loop, not a loop that needs more turns, and each further round costs 10–20 minutes to reproduce the same list. Log it as `Round N: converged-no-progress`. This check, not the round cap, is what actually bounds the loop: the cap bounds count, convergence bounds waste.

- **No valid verdict line** → count it as ITERATE, but quote the malformed tail to the user and re-ask once within the same session for a verdict line before burning a full revision round.

- **Stop without APPROVE (round cap, budget exhausted, or convergence stall)** → do NOT fake convergence. List each unresolved point plus your counter-position, say which of the three limits was hit, then AskUserQuestion: Accept as-is / One more round / Abandon. A flagged disagreement beats a false "approved."

## Rules

- Model is always `gpt-5.6-sol` — never downgrade silently. If it is unavailable, stop and re-run the Step 0 checks with the user.
- Sol is read-only EVERY round — `-s read-only` on the first call, `-c sandbox_mode="read-only"` on every resume. It never writes.
- Never begin implementing during this command. Review-only; code comes after the user's go-ahead.
- The loop terminates on the FIRST of three limits: round cap, chain budget, or convergence stall. No unbounded recursion, and no spending a cap the loop has stopped learning from.
- Every `-o` and every `2>` goes to the per-run scratch directory. No fixed `/tmp` paths, no discarded stderr.
- On APPROVE the plan should carry an ADR block — Decision, Drivers, Alternatives considered, Why chosen, Consequences, Follow-ups — so the executing command inherits the reasoning and not just the steps.
- The handoff to codex-execute is ALWAYS human-gated. Never invoke it automatically on APPROVE.
- Don't cave to every critique (that defeats the cross-model check) and don't ignore it (that defeats the point) — every rejection gets a logged reason.
- Keep every round's verdict line in a running summary printed at the end (round → verdict → # findings), and keep the log file complete. The argument transcript is the artifact.
