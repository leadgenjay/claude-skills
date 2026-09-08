---
description: Codex reviews a plan and iterates to consensus (APPROVE) before execution, with a second model ratifying risky approvals
argument-hint: "[path-to-plan.md | inline plan text] [--max-rounds N] [--strict] [--grill] [--astra | --no-astra]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Have Codex act as consensus reviewer on a plan: review → revise → re-review **in one persistent Codex session** until APPROVE or a stop condition. Claude is the builder and final arbiter; Codex is a read-only critic. Grill mechanics adapted from chaseai-yt/grill-me-codex (MIT).

Raw arguments: `$ARGUMENTS`

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds (need ≥ 0.130 for the loop, **≥ 0.153.4 for any Astra mode**) | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to `gpt-5.6-sol` | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK | GPT-5.6 models require a current ChatGPT plan. If the model is rejected, ask the user which model to use instead — never downgrade silently. |
| Access to `gpt-6-astra` (**optional** — ratification only) | `codex exec --skip-git-repo-check -m gpt-6-astra "Reply with exactly: OK"` returns OK | Not on every plan. If it is rejected or the CLI is below 0.153.4, say so once and run in `--no-astra` mode. Do **not** substitute another model as ratifier — a ratifier that is the same model as the reviewer is not a second opinion. |
| Bundled scripts present | `ls ~/.claude/commands/codex-bridge/scripts/` lists `assert-review-produced.sh` and `codex-dispatch.sh` | Reinstall the package. They ship with it; they are not optional helpers. |

If anything is missing, STOP. Do NOT generate placeholder bash. Never silently retry an auth error.

**Resolve the scripts directory once, in its own Bash call, and use the printed path literally
everywhere below.** Do not write `$HOME/...` or `~/...` inside a later command: Claude Code's
worktree isolation refuses a path argument it cannot resolve statically, and a refused compound
command runs *none* of its parts — so a heredoc riding along with it never writes, and the retry
then dies on a missing file, pointing at entirely the wrong cause.

```bash
ls -d ~/.claude/commands/codex-bridge/scripts
```

The scripts install non-executable (`install.sh` fetches with `curl -o` and does not chmod), so
invoke them as `bash <path>/<script>` — never `./`.

## 1. Resolve the plan + preflight

Plan resolution, in order:
1. If `$ARGUMENTS` contains a path to an existing `.md`/`.json` file → that is the plan.
2. Else if `$ARGUMENTS` has substantial free text (>1 sentence) → treat it as an inline plan; write it to a plan file first (`.omc/plans/codex-review-<slug>.md` if the project uses oh-my-claudecode's `.omc/` directory, otherwise `docs/plans/codex-review-<slug>.md` or the project's existing plans location).
3. Else look for the most recent plan artifact: newest of `.omc/plans/*.md`, `.omc/prd.json`, then `plans/*.md`, `PLAN.md`.
4. If nothing is found — or several candidates are equally plausible — **interview the user** with AskUserQuestion: which plan to review, how strict, and the max rounds.

Parse flags: `--max-rounds N` (default 3), `--strict` (reject on ANY unresolved MEDIUM+ finding; default only HIGH+ block), `--grill` (interview act before the review loop — see § 1b), `--budget N` (total Sol-equivalent rounds allowed across review **and** any `/codex-bridge:codex-execute` that follows; default 6). Ratification rounds (§ 4) are charged against it like any other call.

**Reviewer mode**, one of three. This is the axis § 4 turns on, so resolve it here and echo it:

| Flag | Primary reviewer | Approver | When |
|---|---|---|---|
| *(none)* | `gpt-5.6-sol` | Sol, **ratified by `gpt-6-astra`** when a risk trigger fires | Default |
| `--astra` | `gpt-6-astra` | Astra alone; Sol is not run | The user asked for the strongest reviewer end to end |
| `--no-astra` | `gpt-5.6-sol` | Sol alone | Astra is unavailable, or the user explicitly waived ratification |

`--astra` and `--no-astra` are mutually exclusive; if both appear, stop and ask rather than guessing. In `--astra` mode Astra inherits Sol's mechanics wholesale — pinned `-m gpt-6-astra` every round, `-s read-only` on the first call and `-c sandbox_mode="read-only"` on every resume, prompt via stdin, produced-content assertion, convergence check. It is a substitution of model, not of method.

**The review model never writes.** In every mode it is read-only on every call. The bundled `scripts/codex-dispatch.sh` — the only sanctioned way this package starts a *writing* worker — refuses `gpt-6-astra` a write sandbox outright, so a mistake here is a blocked command rather than a silent top-tier write. Do not rely on that to express the intent; the rule is the point.

**Pin `-m` on every single call, including resumes.** The pin is not belt-and-braces — it is the only thing that selects the model. An omitted `-m` does **not** default to Sol: `codex` reads `model =` from `~/.codex/config.toml`, so an unpinned call runs whatever that file names, which is frequently the newest and most expensive model on the account. Before 0.153.4 that failed loudly with `400 … requires a newer version of Codex`; from 0.153.4 it *succeeds*, so an unpinned call is a silent top-tier spend rather than a visible error. **The upgrade removed the symptom, not the bug.** Check what your config actually names before assuming otherwise:

```bash
grep -E '^\s*model' ~/.codex/config.toml
```

**The reviewer of record is whichever model the mode names, and it is written to the log before Round 1.** A review whose model is inferred later cannot be audited.

Initialize the append-only log at `<plan-dir>/<plan-basename>-review-log.md`. The argument transcript is a deliverable, not a byproduct:

```markdown
# Plan Review Log: <task>
MAX_ROUNDS=<n>, BUDGET=<n> chain rounds, strict=<bool>, codex-cli <version>.
MODE=<default|astra|no-astra>, primary reviewer=<model>, ratifier=<gpt-6-astra|none>.
RISK_RULES_VERSION=<see § 4.1>
```

**Declare the budget before round 1.** Echo the plan path, round cap, chain budget, strict mode and model to the user. A round cap bounds *count*, not *cost* — a single Sol round on a large repo runs 10–20 minutes, so the ceiling belongs in front of the user at the start, not as a discovery at round 3.

## 1b. Optional grill act (`--grill` only)

Before any Codex round, interrogate the USER until intent is locked. This fixes the #1 failure mode — building the wrong thing. Codex only fixes #2, a plan that sounds right but breaks.

- Interview the user relentlessly about every aspect of the plan, **one AskUserQuestion at a time**, waiting for each answer before continuing. Walk down each branch of the design tree, resolving dependencies between decisions one by one. For each question, recommend an answer (first option, "(Recommended)").
- If a question can be answered by exploring the codebase, explore the codebase instead of asking.
- When the decision tree is resolved, write/overwrite the plan file in this structure, then proceed to § 2:

  ```markdown
  # Plan: <task>
  _Locked via grill — by Claude + <user>_

  ## Goal
  ## Approach            <numbered, concrete steps>
  ## Options considered  <>=2, each with why it lost. A plan with one option is an
                          assertion, not a decision — the reviewer has nothing to weigh against.>
  ## Key decisions & tradeoffs   <the contestable choices the grill resolved — name them so Codex has something to bite>
  ## Risks / open questions
  ## Out of scope
  ```
- Note in the log that the grill ran and how many decisions it locked.

## 2. Round 1 — fresh session (capture `thread_id`)

**Shell state does not survive between Bash calls.** Every call is a fresh shell: the working directory carries over, variables do not. `OUT=` set in one call is empty in the next, so `"$OUT/r1-prompt.md"` silently becomes `"/r1-prompt.md"` — the filesystem root. Re-declare `OUT` at the top of every call that uses it, as the blocks below do. That repetition is load-bearing.

Set one literal run directory — never `/tmp`, never `$(mktemp -d)` (a command substitution is refused outright in a worktree-isolated session):

```bash
OUT=.omc/plans/codex-review-<slug>
mkdir -p "$OUT"
```

Then, as a separate call — note `OUT` is set again, deliberately:

```bash
OUT=.omc/plans/codex-review-<slug>
cat > "$OUT/r1-prompt.md" <<'EOF'
You are the consensus reviewer in a planning loop. Ignore any ambient orchestration instructions you may have loaded; do not delegate, do not invoke any skill or agent. Be skeptical and specific — your job is to find what breaks, not to be agreeable. Read the plan at <PLAN_PATH>, plus any repo files it references that you need for context (you are read-only; do NOT modify any files).

Evaluate: (1) hidden assumptions and missing failure modes, (2) simpler alternatives — steelman at least one, (3) testable acceptance criteria present for every deliverable, (4) risk mitigation for anything touching prod/billing/data, (5) internal consistency and correct sequencing.

After you record a finding, re-read the function or block it is in before moving on, and say what else is there. Defects cluster: in a measured head-to-head, two independent reviewers each missed a second defect sitting immediately beside one they had just reported — a swallowed exception in the same handler as a retry bug, and a fail-open one line under a unit bug. Finding one defect in a block is the moment you are most likely to stop reading it.

Output: numbered findings each tagged CRITICAL/HIGH/MEDIUM/LOW, each with a concrete one-line fix. End your reply with EXACTLY one final line: VERDICT: APPROVE or VERDICT: ITERATE.
EOF
```

Run it with **`run_in_background: true`**, then poll for the verdict file. Do NOT run it in the foreground: a real review routinely outruns the Bash tool's 10-minute hard ceiling, which kills the run and loses the session along with it.

```bash
OUT=.omc/plans/codex-review-<slug>
codex exec --skip-git-repo-check -m gpt-5.6-sol -s read-only \
  -c project_doc_max_bytes=0 --json \
  -o "$OUT/r1-verdict.txt" - <"$OUT/r1-prompt.md" 2>"$OUT/r1.err" | grep '"type":"thread.started"'
```

Four things in that command are load-bearing:

- **`-m gpt-5.6-sol`** (or the mode's model). See § 1 — omitting it selects the config default, not Sol.
- **Prompt via stdin (`- <"$OUT/r1-prompt.md"`)** — this avoids shell-quoting bugs AND sidesteps a silent hang: `codex exec` reads stdin in addition to the prompt argument, so under a non-TTY driver (Claude Code's Bash tool) it otherwise blocks forever at ~0% CPU waiting for stdin EOF.
- **A unique `-o` path per round, under the run directory.** A fixed path like `/tmp/codex-verdict.txt` is shared by every concurrent session on the machine, and a stale read looks exactly like a fresh one.
- **stderr to a file, never `2>/dev/null` or `2>&1`.** Discarding it turns a config-parse failure into a silent "the review produced nothing," because the only symptom you see is `grep` finding no `thread.started`.

Parse `thread_id` from the `{"type":"thread.started","thread_id":"..."}` line → `THREAD_ID`. The critique lands in the verdict file — read that file; don't parse the JSONL stream for content.

**Known environment faults — read the `.err` file first if a round dies:**

1. `Error loading config.toml: invalid transport in mcp_servers.<name>` — a broken MCP server declared in `~/.codex/config.toml` kills the session transport before the model is reached. Disable that specific server for this invocation with `-c mcp_servers.<name>.enabled=false`, but **first confirm the name is actually there** (`grep '^\[mcp_servers' ~/.codex/config.toml`). Passing that flag for a server that is *not* in the config **creates** a stanza with no transport, and the parser then rejects the entire file — a stale workaround becomes the fault it was meant to fix.
2. `Error loading config.toml: url is not supported for stdio in mcp_servers.<name>` — a **repo-level `.codex/config.toml` merged on top of the global one**. Codex merges the project's file into `~/.codex/config.toml`, so a repo can declare `url` for a server the global file defines as stdio, and the merged stanza is invalid. Two consequences: checking the global file is not enough (`cat .codex/config.toml` in the working directory too), and **`-c` cannot fix it** — neither `.type='"http"'` nor `.enabled=false` works, because the global `command` key still selects the stdio branch and the parse fails ahead of server selection. The escape that works is to run `codex exec` from a directory **outside** the repo and pass the material to review as a file, so no project-level config is merged. Then report the repo's file as broken; the fix is to rename the repo stanza so it no longer collides, and it belongs in that repo's own PR, not in a review run.
3. `failed to load skill <path>/SKILL.md: missing YAML frontmatter delimited by ---` — one malformed skill logs an error on **every** turn. Fix the file. CRLF frontmatter is tolerated; a missing `---` is not.
4. **The run starts, ignores your prompt, and reviews nothing.** `codex exec` loads ambient project documentation (`AGENTS.md` and friends) into every session, and an orchestration preamble in one can hijack the turn: a 20-minute round once came back as a single sentence about an unrelated orchestration state, having read no file and produced no finding. `-c project_doc_max_bytes=0` (in the commands above) is the fix; the "ignore any ambient orchestration instructions" opener in the prompt is belt-and-braces.
5. ⚠️ **`codex exec resume` needs `--skip-git-repo-check` too.** Fault 2's workaround puts you in a scratch directory outside any repo, so without it the resume dies instantly with *"Not inside a trusted directory"* — the two fixes collide.

**Assert the review produced content before you read a verdict out of it.** The `thread.started` check proves the run *began*. It does not prove anything came back, and an empty verdict file folded into the loop as "no findings" is how a gate becomes decorative.

```bash
bash <scripts-dir>/assert-review-produced.sh --expect-verdict "$OUT/r1-verdict.txt"
```

Exit 1 means no review happened — a refusal, an empty file, a run that died after starting, or a run that answered a different question than the one asked. That is a **blocker**, not a clean round: say plainly that nothing has read this code, and let the human decide. Run the same assertion on every later round's verdict file.

Surface the findings to the user **verbatim** — this second opinion is the deliverable, do not paraphrase. Append the full critique to the log under `## Round 1 — Codex`.

## 3. Consensus loop (rounds 2..MAX resume the SAME session)

Grep the LAST line of the verdict file for the token.

- **VERDICT: APPROVE** → in `--no-astra` or `--astra` mode this is the end of the loop; in default mode it is **provisional** until § 4 resolves. Then, and only from `RATIFIED` / `OVERRIDDEN` / a mode that skips § 4, print `✅ Consensus reached (round N)` + plan path + log path + rounds spent vs budget, and **AskUserQuestion** for the handoff — never chain automatically:
  - *Execute now via `/codex-bridge:codex-execute <plan-path>` (Recommended)* — pass the unspent budget through as `--budget <remaining>`; codex-execute appends its `## Execution` section to this same log.
  - *Stop here* — plan approved and parked.
  - *One more review round* — for when APPROVE landed sooner than it should have.

  An approved plan is not an approved diff. Auto-chaining is how a plan that reads well becomes a repo full of code nobody agreed to.

- **VERDICT: ITERATE** → Claude is the final arbiter; Codex advises, it does not command. Revise the plan file, addressing every CRITICAL/HIGH (and MEDIUM if `--strict`) finding with a concrete plan change — do not just append rebuttals. Note deliberately-rejected suggestions in a `## Reviewer pushback` section with one-line rationale, and append `### Response` (what changed, what was rejected and why) to the log. Then re-review by **resuming the same session**, so the reviewer remembers its prior critiques and won't re-litigate settled points:

  ```bash
  # SAFETY: resume REJECTS -s. Force read-only via -c sandbox_mode, or Codex
  # inherits config.toml's sandbox (possibly danger-full-access) and could WRITE
  # files mid-review. This is the most important line in this command.
  # OUT and THREAD_ID are re-declared on purpose: shell state does not survive
  # between Bash calls, so inheriting them from round 1 gives you "".
  OUT=.omc/plans/codex-review-<slug>
  THREAD_ID=<the id echoed by round 1>
  codex exec resume --skip-git-repo-check "$THREAD_ID" \
    -m gpt-5.6-sol \
    -c sandbox_mode="read-only" -c project_doc_max_bytes=0 --json \
    -o "$OUT/r2-verdict.txt" \
    "I revised the plan. Re-review <PLAN_PATH> — check whether your prior findings are addressed and flag anything new. Same rules. End with VERDICT: APPROVE or VERDICT: ITERATE." \
    < /dev/null 2>"$OUT/r2.err" >/dev/null
  ```

  `< /dev/null` is required here for the same non-TTY stdin hang. Keep the same background + 10-minute ceiling discipline. **Echo `$THREAD_ID` visibly before running** — `resume` with a missing or malformed id can silently fall back to the most recent session, and a wrong-target resume looks exactly like a successful one. Never use `resume --last`.

  ⚠️ **`-m` does NOT carry over from round 1.** `resume` re-reads the config default. On codex-cli below 0.153.4 that failed in ~15s with a 400, and the error landed on *stdout*, which the `>/dev/null` above discards — so it read as the session being gone. That was the good case. From 0.153.4 an unpinned resume no longer errors: it runs, at top-tier cost, having silently changed reviewer mid-loop. There is no symptom left to diagnose. Pin `-m` on every round.

  Keep stderr in a file on resumes too, for the same reason as round 1.

- **Convergence check — run this BEFORE spending another round.** Compare round N's findings with round N-1's. If no new CRITICAL/HIGH appeared and the bulk of the findings restate the previous round, **stop immediately and declare deadlock** — do not spend the remaining rounds. A reviewer repeating itself is a stalled loop, not a loop that needs more turns, and each further round costs 10–20 minutes to reproduce the same list. Log it as `Round N: converged-no-progress`. This check, not the round cap, is what actually bounds the loop: the cap bounds count, convergence bounds waste.

- **No valid verdict line** → count it as ITERATE, but quote the malformed tail to the user and re-ask once within the same session for a verdict line before burning a full revision round.

- **Stop without APPROVE (round cap, budget exhausted, or convergence stall)** → do NOT fake convergence. List each unresolved point plus Claude's counter-position, say which of the three limits was hit, then AskUserQuestion: Accept as-is / One more round / Abandon. A flagged disagreement beats a false "approved."

## 4. Ratification (default mode only)

Skip this section entirely under `--astra` (Astra already *is* the approver) and under `--no-astra` (record the override per § 4.4 and stop).

An APPROVE from the primary reviewer is **provisional**. It becomes a real approval only by passing § 4.2. Nothing here runs until the loop has actually produced an APPROVE — ratifying an ITERATE is meaningless.

Why a second reviewer rather than a better one: in a 12-defect seeded benchmark the two models tied on recall at 10/13, **and missed exactly the same three defects** — two of which sat immediately beside a defect each had just reported. Raising the bar on one reviewer would not have caught them. A second pair of eyes on the risky subset would.

### 4.1 Assess risk, and record the assessment

**Do this before the ratification call, and write the result to the log.** `Astra gate: SKIPPED` proves only that a line was written; what has to be auditable is *why*. Record the plan file's SHA-256, `RISK_RULES_VERSION=2026-09-08.1`, and then every trigger below as **true / false / unknown**, each with a one-line citation of the evidence (a plan section, a file path, a diff hunk).

Triggers — does the plan touch:

1. Deployment or release mechanics
2. Infrastructure, DNS, or hosting
3. Permissions, authentication, CI protections, or merge gates
4. Cryptography, secrets, or a security boundary
5. Writes to an external API — anything that leaves this machine
6. Irreversible overwrites, deletions, or data migrations
7. Public API or contract compatibility
8. Dependency upgrades
9. Money, pricing, or anything that sends to a customer
10. The controls on agents themselves — a guard, a hook, a gate, an allowlist

**Ratification is required if ANY trigger is true OR unknown.** Unknown fails closed and is not a tie-breaker to be reasoned away: if the evidence for a trigger cannot be cited, the honest answer is unknown, and the cost of an unnecessary ratification is one read-only call. Do not mark a trigger false to avoid the round.

Trigger 10 deserves its own note. A plan that weakens a control on agents is exactly the plan whose reviewer should not be the thing being reviewed, and it is the one case where an approving reviewer's confidence is worth least.

### 4.2 The state machine

Six states. Every path out of PROVISIONAL is explicit, because the failure this prevents is a ratification that errors and is read as consent.

| State | Reached when | Means |
|---|---|---|
| `PROVISIONAL` | Primary reviewer returned APPROVE, ratification required | **Not approved.** No handoff. |
| `RATIFIED` | Astra returned `RATIFY` | Approved. Proceed to handoff. |
| `VETOED` | Astra returned `VETO` | Rejected. Back to the loop, see below. |
| `FAILED` | Astra errored, timed out, or returned no valid decision | **Not approved.** Never silently an approval. |
| `EXHAUSTED` | Budget or round cap hit before a decision | **Not approved.** |
| `OVERRIDDEN` | `--no-astra`, or the user waived after FAILED/EXHAUSTED | Approved by a human, on the record. |

Transitions:

- `PROVISIONAL → RATIFIED` — done. Log the verdict and hand off.
- `PROVISIONAL → VETOED` — Astra's findings go back to the loop as a normal corrective round. **The corrective round must produce a FRESH APPROVE from the primary reviewer before Astra is asked again.** A vetoed plan cannot be re-ratified against the old APPROVE; the earlier verdict was rendered on content that has since changed, so re-using it would ratify a plan nobody approved.
- `PROVISIONAL → FAILED` — do not retry blindly. Classify first: an auth failure, a stale broker, or a missing binary is not a judgment, and re-running it reproduces it. Fix the cause, or take it to the user. **A FAILED ratification is never an approval**, and this is the single most important line in the section: the whole gate collapses if an error reads as consent.
- `FAILED | EXHAUSTED → OVERRIDDEN` — only by asking the user, with AskUserQuestion, naming what went wrong and which triggers fired. Never self-override.

A ratifier returning something unparseable is `FAILED`, not ITERATE. Assert it rather than eyeballing the tail — `codex exec` exits 0 when it refuses to run, so a review that read nothing looks exactly like a review with no objections:

```bash
bash <scripts-dir>/assert-review-produced.sh --expect-ratification "$OUT/ratify.txt"
```

### 4.3 The ratification call

Astra reads the **repo**, not just the plan. Handing it only the plan and the primary reviewer's log invites it to agree with that framing, which is the one thing a second reviewer is there not to do.

```bash
OUT=.omc/plans/codex-review-<slug>
codex exec --skip-git-repo-check \
  -m gpt-6-astra \
  -s read-only -c project_doc_max_bytes=0 --json \
  -o "$OUT/ratify.txt" \
  - < "$OUT/ratify-prompt.md" 2>"$OUT/ratify.err" >/dev/null
```

Run it from the repo root so the referenced paths resolve. `-s read-only` is not optional and is not a formality: it is what `scripts/codex-dispatch.sh` and any write guard key on, and a review-only model holding a write sandbox is a blocked command by design.

The prompt file must carry: the plan, the primary reviewer's final verdict and the findings it cleared, **the list of repo paths the plan touches**, and this instruction —

> You are ratifying, not re-reviewing. The primary reviewer has already approved this plan. Read the referenced files yourself; do not take its characterisation of them on trust. Answer the narrow question: is there a defect serious enough that executing this plan would cause harm the primary reviewer did not account for? Cite file and line for anything you raise. Pay particular attention to the code immediately around what has already been flagged: defects cluster, and a reviewer that has just recorded one is at its most likely to stop reading that block — in a measured head-to-head this accounted for two of the three defects both reviewers missed. End with exactly one of `RATIFY` or `VETO` on its own line. `VETO` requires at least one CRITICAL or HIGH finding — style disagreements and preferences are not grounds.

The `VETO` bar is deliberately high. A ratifier that vetoes on taste turns a safety gate into a second full review, doubles the cost of every risky plan, and gets switched off within a week — which costs more than it ever saved.

### 4.4 Record it

Append to the log, whatever the outcome:

```markdown
## Ratification
Plan SHA-256: <sha>
RISK_RULES_VERSION: 2026-09-08.1
Triggers fired: <n of 10> — <list, or "none">
Unknown: <list, or "none">
Required: <yes|no>   Ratifier: <gpt-6-astra|none>
Final state: <RATIFIED|VETOED|FAILED|EXHAUSTED|OVERRIDDEN>
<if OVERRIDDEN: who waived it, when, and what they were told>
```

The SHA binds the verdict to the exact bytes reviewed. If the plan changes afterwards, the ratification does not carry over — re-assess.

## Rules

- The reviewer model is whatever § 1's mode table names, pinned with `-m` on **every** call including resumes, and never changed mid-loop. Omitting `-m` does not default to Sol — it reads `~/.codex/config.toml`.
- **`gpt-6-astra` reviews and ratifies. It never writes code, in any mode, ever.** Read-only on every call. This is a standing rule, not a tunable; `scripts/codex-dispatch.sh` refuses it a write sandbox so the intent is enforced somewhere that does not depend on this file being read.
- Codex is read-only EVERY round — `-s read-only` on the first call, `-c sandbox_mode="read-only"` on every resume. It never writes.
- Never begin implementing during this command. Review-only; code comes after the user's go-ahead.
- The loop terminates on the FIRST of three limits: round cap, chain budget, or convergence stall. No unbounded recursion, and no spending a cap the loop has stopped learning from.
- Every `-o` and every `2>` goes to the run directory. No fixed `/tmp` paths, no discarded stderr.
- The plan must carry an ADR block — Decision, Drivers, Alternatives considered, Why chosen, Consequences, Follow-ups — so the executing command inherits the reasoning and not just the steps. **Write it BEFORE the round you expect to approve, not on APPROVE.** Adding it afterwards edits the file the verdict was rendered on: the plan SHA recorded in § 4.4 no longer matches, and the approval is bound to bytes that no longer exist. Draft it early and revise it in the loop like any other section.
- The handoff to codex-execute is ALWAYS human-gated. Never invoke it automatically on APPROVE — and in default mode, a PROVISIONAL approval is not an APPROVE at all. Only `RATIFIED` and `OVERRIDDEN` reach the handoff.
- **A ratification that failed is not a ratification that passed.** A call that errors, times out, or returns no `RATIFY`/`VETO` line leaves the plan unapproved. If this rule is ever softened "just to unblock", the gate is decorative from that moment on.
- Don't cave to every critique (that defeats the cross-model check) and don't ignore it (that defeats the point) — every rejection gets a logged reason.
- Keep every round's verdict line in a running summary printed at the end (round → verdict → # findings), and keep the log file complete. The argument transcript is the artifact.
