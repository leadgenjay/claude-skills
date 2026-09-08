---
description: Codex subagents execute an approved plan, routed across the model ladder by complexity and run in parallel
argument-hint: "[path-to-plan.md | task text] [--serial] [--no-verify] [--budget N] [--tier low|medium|high]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

Execute a plan using **Codex subagents as the workers**, each routed to a model by the complexity and risk of its own work item (§ 3b). Claude orchestrates, classifies, verifies and commits; the workers write the code. Hardened with chaseai-yt/grill-me-codex's verified Codex-CLI failure modes.

`--tier low|medium|high` overrides classification for **every** item — an escape hatch for when the automatic read is obviously wrong, not a default. Say in the report that it was forced, and to what.

Raw arguments: `$ARGUMENTS`

Not worth delegating: single-obvious-change edits of ~20 lines or fewer — just make the edit yourself; delegation overhead loses.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Codex CLI installed | `codex --version` succeeds (need ≥ 0.130) | `npm install -g @openai/codex` (the installer attempts this automatically) |
| Logged in via **ChatGPT subscription** (Plus/Pro/Team) | `codex login status` reports logged in | Run `codex login` and choose **"Sign in with ChatGPT"**. Model usage bills to the ChatGPT subscription — no OpenAI API key or API credits needed. |
| Access to the ladder models | `codex exec --skip-git-repo-check -m gpt-5.6-sol "Reply with exactly: OK"` returns OK; repeat for `gpt-5.6-terra` and `gpt-5.6-luna` | GPT-5.6 models require a current ChatGPT plan. **Probe all three before dispatching** — a rung that is unavailable must be collapsed into the one above it deliberately, and said out loud, not discovered mid-run. Never downgrade silently. |
| Bundled scripts present | `ls ~/.claude/commands/codex-bridge/scripts/` lists `codex-dispatch.sh` | Reinstall the package. `codex-dispatch.sh` is the only sanctioned way this command starts a writing worker — it is not an optional helper. |
| Git repository (strongly recommended) | `git rev-parse HEAD` succeeds | Workers edit files; git gives the rollback point and the review base. If this is not a repo, confirm with the user before dispatching write-enabled workers. |

If anything is missing, STOP. Do NOT generate placeholder bash. Never silently retry an auth error.

**Resolve the scripts directory once, in its own Bash call, and use the printed path literally
everywhere below** — not `~/…` or `$HOME/…` inside a later command (see § 0a):

```bash
ls -d ~/.claude/commands/codex-bridge/scripts
```

The scripts install non-executable (`install.sh` fetches with `curl -o` and does not chmod), so invoke them as `bash <path>/codex-dispatch.sh` — never `./`.

## 0a. Shell constraints (read before running anything)

A **worktree-isolated Claude Code session refuses any Bash command it cannot statically verify**, and there is no override token. Three shapes that appear naturally in dispatch code are all refused:

- **`$(…)` command substitution** — `P=$(mktemp)`, `COMPANION="$(ls … | tail -1)"`, `"$(cat "$P")"`.
- **`$PWD` anywhere in the command** — `--cwd "$PWD"` is refused; `--cwd .` passes.
- **`cd <dir> && …`**, and `A && B` / `A; B` chains generally.

What passes: one command per Bash call, plain `VAR=value` lines, pipelines (`ls … | sort -V | tail -1` is fine), redirections, and heredocs to a literal path. Resolve dynamic values by running the pipeline in its **own** call and reading the printed result, then using it literally in the next call.

**Shell state does not survive to the next call.** Every Bash call is a fresh shell: the working directory carries over, variables do not. `OUT=…` set in one call is **empty** in the next, so `"$OUT/item-1-prompt.md"` silently becomes `"/item-1-prompt.md"` — the filesystem root. Nothing warns you. Where a snippet below repeats an assignment, that repetition is load-bearing.

The failure mode is worth naming because it does not look like a shell problem: **a refused compound command runs none of its parts**. A `cat > file <<EOF` riding along with a refused dispatch never writes, and the retry then dies on a missing file, pointing at entirely the wrong cause.

Set `OUT=.omc/codex/exec-<slug>` (a literal slug, never `/tmp`) and put every prompt, log and artifact under it. **`mkdir -p "$OUT"` before the first write** — a heredoc redirect opens its target before `cat` runs, so writing into a directory that does not exist yet fails on every fresh run, before a single item dispatches.

## 1. Resolve plan + preflight

- **Plan resolution** — same order as `/codex-bridge:codex-review`: explicit path → inline task text → newest project plan artifact (`.omc/plans/*.md` / `.omc/prd.json` on oh-my-claudecode projects, else `plans/*.md`, `PLAN.md`) → **interview the user** with AskUserQuestion.
- **Dispatch mode** — check for the Codex companion script shipped by the `openai-codex` Claude Code plugin (optional; most installs won't have it). Run this as its own call and read the path it prints; do **not** wrap it in `COMPANION="$(…)"`:
  ```bash
  ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1
  ```
  Then, as a separate call with that path substituted in literally, `node "<companion path>" setup --json` and require `ready:true`, `auth.loggedIn:true`.
  - **Companion found** → companion background jobs (§ 4). Real parallelism.
  - **No companion (default)** → `scripts/codex-dispatch.sh` via Bash with `run_in_background: true`, one worker at a time. Everything else in this flow is identical.
- **Never `/tmp`, never `2>/dev/null`.** A shared `/tmp` output path collides across concurrent sessions and a stale read looks exactly like a fresh one; discarded stderr turns a config-parse failure into a silent "the worker produced nothing." Use `$OUT` for every `-o` and every `2>`, and read the `.err` file whenever a job returns empty.
- **Budget.** `--budget N` is an **invocation allowance, not a spend cap** — it bounds how many worker launches this run may make, not dollars. It is normally passed through from `/codex-bridge:codex-review` as its unspent remainder. Default 6. Per-item fix caps do NOT bound the run: N items × 2 fix rounds each is unbounded in N, which is the actual runaway path here. Echo the budget before dispatch, and stop taking new fix rounds once it is spent — finishing the remainder via Claude takeover (§ 4) rather than abandoning items.
- **`--budget N` still means "N Sol-equivalent rounds", and that is deliberate.** Internally the allowance is held in weighted units at **3 units per Sol round**, so `--budget 6` is 18 units and means exactly what it always did. A cheaper worker draws fewer units, so the same number stretches further rather than buying less:

  | Model | Units per launch |
  |---|---|
  | `gpt-5.6-luna` | 1 |
  | `gpt-5.6-terra` | 2 |
  | `gpt-5.6-sol` | 3 |
  | `gpt-6-astra` | 6 — **review/ratification only, never dispatched here** |

  ⚠️ **These weights are proxies derived from the published model priority ordering, not billing data.** They are good enough to stop a runaway and are *not* good enough to report a cost to anyone. Never present a unit count as money.
- **Reserve before launching, not after.** Deduct an item's units from the allowance *before* its dispatch, in the same step that records the job ID. Charging on completion means N parallel launches can all pass a check that only one of them could afford. Every attempt is charged, including retries, escalations, and any ratification round inherited from the review command — a budget that only counts successes is not a bound.
- If the plan has **never** been consensus-reviewed (no APPROVE marker / the user hasn't run the review command), note it in one line and continue — do not block.
- **But a plan that WAS reviewed and did not come out approved is a different case, and it blocks.** If the plan's review log carries a `## Ratification` block (see `codex-review.md` § 4.4), read its `Final state`:
  - `RATIFIED` or `OVERRIDDEN` → proceed.
  - `PROVISIONAL`, `VETOED`, `FAILED`, or `EXHAUSTED` → **stop and tell the user which state it is in and why.** Do not execute. These are not "unreviewed" — they are reviewed and *not approved*, which is strictly worse, because the presence of a review log reads as approval to anyone skimming. `FAILED` in particular means the ratifier errored and nothing judged the risky part of this plan.
  - Only the user can move a plan out of those states, and the review command is where that happens. Do not re-run the ratification from here.

## 2. Worktree gate + rollback point

Record the base before anything is dispatched: `git rev-parse HEAD` and `git status --short`.

- **Dirty tree → isolate, and move the session into the isolation.** Workers write with full workspace access; on a dirty tree their changes interleave with the user's uncommitted work and the resulting diff can neither be reviewed cleanly nor reverted.

  **Use `EnterWorktree` (Claude Code's own tool)** where it is available — it creates the worktree *and switches the session's working directory into it*. Do not `git worktree add` and then try to aim at it from outside: you cannot `cd`, so three things break at once. The companion resolves `--prompt-file` against the current working directory, so a prompt written in the original checkout is **ENOENT before the worker starts**; § 5's `git status` / `git diff` / PROOF commands would read the original dirty tree and could approve a patch they never inspected; and `status` / `result` polls need the same `--cwd` as the dispatch or they return an empty list that reads as "no jobs". Inside the worktree, cwd *is* the isolation and all three dissolve.

  Symlink any untracked local env files the build needs (e.g. `.env.local`) into it — worktree builds fail without them. Hand the result back by committing in the worktree and cherry-picking, **not** by applying `git diff`: that omits untracked files, so any new file the worker created is lost when the worktree is removed.
- **Clean tree → run in place.**

## 3. Decompose into work items (prompt contract)

Split the plan into discrete, independently-executable work items (a `prd.json` story, a numbered plan step, or a file-scoped chunk). `--serial` forces one at a time.

### 3a. Independence is not file-disjointness

Non-overlapping file sets are necessary and **not sufficient**. Two items are parallel-safe only if none of these also hold:

- **Producer/consumer ordering** — one item creates the module, type, migration or fixture the other imports. Disjoint files, strict ordering.
- **A shared database, schema or seed** — two migrations against one database race regardless of which files they live in.
- **A shared port, socket, lockfile or dev server** — the second worker fails to bind and reports a defect that does not exist.
- **Generated or build output** — two items whose builds write the same `dist/`, lockfile or codegen target clobber each other's results, and the loser looks like a bad worker.
- **A shared test fixture or snapshot file.**

When in doubt, sequence it. A wrongly-parallelised pair costs a full re-run plus the time spent diagnosing a failure that was never in the code; a wrongly-sequenced pair costs some wall clock.

### 3b. Classify each item's tier — by inspection, not by size

Assign every item `low` / `medium` / `high`. **Claude does this classification, always** — never a Codex worker.

**File count is a weak proxy and must not decide this.** One config file can change authorisation globally; six generated fixtures can be mechanical. Judge on risk, coupling, test quality and ambiguity, in that order of precedence.

**`high` — any one of these is sufficient:**
- Touches auth, permissions, secrets, cryptography, or a security boundary
- Touches money, pricing, billing, or anything that sends to a customer
- Data migrations, deletions, or irreversible overwrites
- Deploy, release, CI, or a merge gate
- Concurrency, ordering, or transactional correctness
- The touched area has weak, absent, or untrustworthy tests
- The spec is ambiguous, or the plan step is impossible as written
- High coupling — many call sites, or a public contract others depend on

**`medium`** — real logic across more than one file, in an area with meaningful tests and an unambiguous spec.

**`low`** — mechanical and local: a rename, a formatting pass, a config value, a well-specified single-file change in a well-tested area.

**Precedence and fail-closed.** The highest matching tier wins; on a tie take the higher. **If you cannot cite evidence for a classification, it is not low** — record the tier as uncertain and take one tier up. The cost of over-classifying one item is a few units; the cost of under-classifying an auth change is the thing this whole command exists to avoid.

Record per item, in the exec log: `tier`, `confidence` (high/low), and **one line of evidence** — the file, the plan step, or the missing test that decided it. A tier with no evidence is an assertion, and the next reader cannot tell a judgement from a guess.

### 3c. Which model each tier gets

| Tier | Model | Units |
|---|---|---|
| `low` | `gpt-5.6-luna` | 1 |
| `medium` | `gpt-5.6-terra` | 2 |
| `high` | `gpt-5.6-sol` | 3 |

**`gpt-6-astra` is never on this ladder.** It reviews and ratifies; it does not write code. `scripts/codex-dispatch.sh` refuses it a write sandbox, and refuses a missing `--model` rather than defaulting — because defaulting is the whole bug (§ 4).

**Where the evidence for down-ladder routing stops.** A measured head-to-head found execution correctness *tied* between two models of quite different strength, at both difficulty levels tested, including on traps invisible to the test suite — both were past the threshold the work demanded. That is the argument for not sending mechanical work to the most expensive worker. What has **not** been measured is `luna` and `terra` specifically, on your codebase. Treat the ladder as a reasonable default that is still unproven at the bottom: if a `low` item comes back wrong twice, that is data, and § 4's escalation is how it gets used.

### 3d. The prompt contract

For EACH item, write the worker prompt to a file under the run directory using this contract — never inline-quote it. A worker starts with **zero session context**; everything it needs must be in the prompt.

**Not `P=$(mktemp)`.** That is a command substitution, refused outright in a worktree-isolated session, and it takes the heredoc down with it — so the prompt file is silently never created and the dispatch then fails on a different, misleading error. Use a literal path under `$OUT`, written in its **own** Bash call, separate from the dispatch:

```bash
OUT=.omc/codex/exec-<slug>
mkdir -p "$OUT"
cat > "$OUT/item-1-prompt.md" <<'EOF'
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

## 4. Dispatch workers

For each work item, at **the model its § 3b tier selected** — parallel-safe items launched together, **at most 3 concurrent**.

**Plain-CLI mode (default) — always through the bundled dispatcher:**

```bash
OUT=.omc/codex/exec-<slug>
bash <scripts-dir>/codex-dispatch.sh \
  --model <gpt-5.6-luna|gpt-5.6-terra|gpt-5.6-sol> \
  --prompt-file "$OUT/item-1-prompt.md" \
  --out "$OUT/out-item-1.txt" --cwd .
```

**Why a script and not a raw `codex exec` line.** Omitting `-m` does not "default to Sol" — `codex` reads `model =` from `~/.codex/config.toml`, which commonly names the newest model on the account. Below codex-cli 0.153.4 that 400s, so the bug is masked as an error; from 0.153.4 it **succeeds**, and a review-only model writes the code, silently and at top tier. There is no error left to notice. The first design here was a preflight the command was merely *instructed* to call, and that is decorative: the fallback path is exactly the path that forgets. So `codex-dispatch.sh` does not validate an invocation someone else built — it **builds** the invocation. There is no argument you can pass it that produces an unpinned or review-model-backed write. It exits `3` on a policy refusal, which is not a transient error and will not pass on retry.

It resumes a worker's session for fix rounds with the same pin:

```bash
OUT=.omc/codex/exec-<slug>
bash <scripts-dir>/codex-dispatch.sh --model <same tier model> \
  --resume <THREAD_ID> --out "$OUT/out-item-1-fix1.txt" --cwd .
```

`resume` REJECTS `-s`, so the script sets the sandbox via `-c sandbox_mode` instead; it also passes `--skip-git-repo-check`, without which a resume from a scratch directory dies instantly with *"Not inside a trusted directory"* and writes no output file. Echo the thread id visibly before running — a missing or garbage id silently falls back to the most recent session, and a wrong-target resume looks exactly like a successful one. Never use `resume --last`.

Run each dispatch via Bash with `run_in_background: true` and a 10-minute ceiling (`timeout: 600000` on the tool call — the default 2-minute timeout kills real builds). Note `timeout` is a Bash *tool* parameter; the `timeout` shell command does not exist on macOS.

**Companion mode (openai-codex plugin installed):**

```bash
OUT=.omc/codex/exec-<slug>
node "<companion path from § 1>" task --background --write \
  --model <gpt-5.6-luna|gpt-5.6-terra|gpt-5.6-sol> \
  --prompt-file "$OUT/item-1-prompt.md" --cwd .
```

- **`--model` is mandatory on every one of these.** The companion inherits the same config default, so an unpinned dispatch puts the review-only model in a write sandbox at 6 units a launch.
- `--write` is REQUIRED — without it the worker cannot edit files.
- **`--prompt-file`, not `"$(cat …)"`** — the substitution form is refused in a worktree. The companion accepts `--prompt-file` for `task` even though its `--help` does not list it.
- ⚠️ **An unrecognised flag is silently folded into the PROMPT.** The companion's argument parser has no unknown-option handling: a `--flag` not in that subcommand's option list is pushed onto positionals, and the prompt reader falls back to joining positionals when no `--prompt-file` is given. So a typo does not warn and does not drop — it corrupts the instruction the worker receives. Passing `--prompt-file` is what makes the prompt immune to it.
- **Never `--cwd "$PWD"`** — refused in a worktree. Use `.` **only when § 2 left you running in place**. If § 2 isolated into a worktree, pass its literal path on every `task`, `status` and `result` call: `status` keys its job list to the workspace root, so asking from the wrong root returns an empty list that reads as "no jobs".
- Record each returned job/task ID → work item mapping. Poll `node "<companion path>" status --cwd <same cwd> --json`; on completion fetch `node "<companion path>" result <job-id> --cwd <same cwd> --json`.
- **The worker's answer is in `job.summary`, not `job.result`** — there is no `result` key, so a reader looking for one finds nothing and reports "the worker produced nothing." The full transcript is at `job.logFile`; read that for the actual report and treat `job.summary` as the headline only.
- ⚠️ **`job.summary` holds the PROMPT while the job is running** and is overwritten with the answer on completion. A summary read mid-flight hands you your own prompt back, which reads convincingly like a reply. Always gate on `job.status == "completed"` before believing anything in it.

**Before each launch**, in the same step that records the job ID: deduct the item's units (§ 1) from the allowance and log `item → tier → model → units → remaining`. If the remaining allowance is smaller than the item's cost, do **not** launch a cheaper model to squeeze it in — that silently re-classifies work the tier rules already decided. Stop dispatching and take the remainder over directly.

**Don't kill a quiet background run early** — Codex builds are legitimately slow. If a job returns empty, read its `.err` file before concluding anything.

**Completion banner (required):** when a background job finishes, the FIRST line of your next message to the user must be `🔔 CODEX FINISHED — <item> (ok/fail) — verifying now`, before any verification output. The user is not watching tool calls.

**Fix loop (bounded, then takeover):**

**0. Classify the failure BEFORE deciding anything.** Most failures are not reasoning failures, and retrying those on a costlier model reproduces them at higher cost while looking like diligence.

| Failure class | Tell | What to do |
|---|---|---|
| **Infrastructure** | auth error, stale broker, missing binary or dependency, network, rate cap, no disk | **Do not escalate and do not retry blind.** Fix the cause, then retry at the *same* tier. A better model cannot log itself in. |
| **Contract** | worker edited the wrong files, misread the scope, asked for missing context, or produced nothing | **Do not escalate.** The prompt is wrong, not the model. Fix the contract and retry at the same tier. |
| **Merge/state** | conflict, dirty tree, another item's output clobbered this one | **Do not escalate.** This is a § 3a independence failure. Sequence it and re-run. |
| **Reasoning** | correct files, correct understanding, wrong solution — the proof command fails on logic | **Escalate one tier** (`luna → terra → sol`) and retry once. |

1. Failed or incomplete job → classify per step 0, then retry ONCE, appending the exact failure context (what broke, which file, what proof is expected) to the prompt with the same contract discipline. Charge the retry against the allowance like any other launch.
2. Second failure → **Claude takes over and finishes that item directly.** Log the takeover in the report and the exec log. Ping-ponging trivia through delegation burns more than it saves. Other items continue regardless.
   - **Above `sol` there is no next tier.** Never escalate to `gpt-6-astra` — it does not write code, in any circumstance, and "the item was hard" is not an exception. A reasoning failure at `sol` goes to Claude, not up the ladder.
   - **Log every escalation with its class and its evidence.** A `low` item that needed `terra` twice is the only real signal available about whether the § 3c ladder is calibrated for this codebase, and it is worth more than the units it cost.
3. **Same-failure check.** If the retry fails with substantially the same error as the first attempt, do not wait for the round to expire — take over immediately. An identical failure twice means the prompt contract is wrong, not that the worker was unlucky, and a third dispatch reproduces it at full cost.
4. Chain budget exhausted → stop dispatching, take over the remaining items, and say so plainly in the completion table rather than silently narrowing scope.

## 5. Verify (skip only with --no-verify)

Worker reports are **ADVISORY**. After all items finish, verify independently:

1. `git status --short` plus the FULL diff against the recorded base (`git diff <base-HEAD>`). Judge it like a contributor PR: correctness, spec fidelity, style match with the surrounding code, and nothing touched outside each item's scope. **When you find a defect, re-read the whole function it sits in before moving on.** Defects cluster, and the moment you have just recorded one is the moment you are most likely to stop reading that block — in a measured head-to-head this accounted for two of the three defects both reviewers missed.
2. Run each item's PROOF command yourself and read the output. A worker's pasted output never counts as proof.
3. Fire a final review of the combined result against the pre-run base.
   - Companion mode: `node "<companion path>" review --background --model gpt-5.6-sol --base <base-HEAD>`.
     ⚠️ **`--background` does not background it.** The review handler parses the flag and then runs in the foreground regardless, so this call BLOCKS for the full review — 10–20 minutes on a large diff. Give it a generous `timeout:` and expect to wait; do not read the silence as a hung job and kill it.
   - Plain-CLI mode: the same prompt-file pattern as the review command, with `-m gpt-5.6-sol -s read-only`, asking it to review `git diff <base-HEAD>` against the plan and tag findings CRITICAL/HIGH/MEDIUM/LOW.

   `--model` / `-m` is mandatory here too: unpinned, this "final Sol review" silently runs — and bills — as whatever the config names. Surface findings **verbatim** (the banner rule applies). CRITICAL/HIGH → AskUserQuestion: fix via another worker (Recommended) / fix manually / accept. A fix worker is dispatched at **the tier of the item the finding is against**, not the tier of whatever ran last — and a finding the review caught is evidence the original tier was too low, so re-classify before re-dispatching rather than sending the same tier back at the same problem.
4. If a worktree was used and verification passed, **stop here — do not move anything into the real tree yet.** Commit *inside the worktree* so nothing is lost (that commit is local to the isolation and reaches no branch anybody uses), then go to § 7. The cherry-pick into the real tree, the proof re-run there, and the `worktree remove` all happen **after** the human answers the commit gate.

   This replaces the older "3-way apply the worktree diff" instruction, which was wrong twice over: `git diff` omits untracked files, so a new module or test is absent from the patch and is **destroyed** when the worktree is removed; and applying it before § 7 puts the change on the real branch before anyone approved it, leaving "no" nothing to refuse.

## 6. Exec log + report

Maintain an append-only `EXEC-LOG.md` next to the plan — or, if the review command left a `*-review-log.md`, append a `## Execution` section there instead, so one artifact tells the whole story. Per item: prompt summary, job ID, worker report, Claude's verdict, retries, takeovers.

**Record the routing decisions too, or the next run learns nothing:**

```markdown
| Item | Tier | Evidence | Conf | Model | Units | Escalations | Outcome |
|---|---|---|---|---|---|---|---|
| 1 | low | single file, area has real tests | high | luna | 1 | — | done |
| 2 | high | touches auth middleware | high | sol | 3 | — | done |
| 3 | low | formatting only | low | terra | 1+2 | reasoning @luna → terra | done |
```

Item 3 is the row that matters: a `low` classification that needed an escalation is evidence the ladder is mis-calibrated for this codebase, and it is the only such evidence anyone collects. Total the units spent against the allowance and print both.

Print a completion table: work item → job ID → tier/model → status (done / taken over) → files changed, then verification results and any remaining blockers. List codex session IDs so the user can `codex resume <id>`.

## 7. Commit gate (human)

Present: a 3-bullet summary of what was built, the files-changed list, proof output (pass/fail, verbatim tail), fix rounds and takeovers, and any spec deviations.

Ask the question that names what happens next, so "commit" is not ambiguous between the isolation commit that already exists and the change landing on a branch:

- Ran in place → *"Built, proof passes, diff reviewed. Commit?"*
- Ran in a worktree → *"Built, proof passes, diff reviewed. The work is committed inside the isolation worktree and has not touched this tree. Bring it across?"*

On the worktree path that commit exists by design — it is how untracked files survive — but it lives only in the isolation, so the real tree is clean and "no" still means nothing lands.

- Commit ONLY on an explicit yes, and **Claude writes the commit**. Codex never commits, pushes, or touches the remote.
- On yes, and only then: cherry-pick the worktree commit into the real tree, re-run the fastest proof there, then remove the worktree.
- Rejected → the real tree is untouched, which is the point; the worktree still holds the work. Ask what's wrong and route back to the fix loop within budget.

## Rules

- **Every worker is pinned to a model, at the tier § 3b assigned. Never omit the flag and never change a model silently** — omitting it inherits whatever `~/.codex/config.toml` names. Downgrading an item below its tier to fit the budget is the same silent change wearing a different hat: stop dispatching and take over instead.
- **`gpt-6-astra` never writes code.** It is not on the execution ladder, it is not an escalation target, and a reasoning failure at `sol` goes to Claude. `scripts/codex-dispatch.sh` refuses it a write sandbox, so the intent is enforced somewhere that does not depend on this file being read — but the rule is the point, not the guard.
- **Claude classifies. Always.** Tier assignment and orchestration are never delegated to a worker.
- **Classify the failure before escalating.** Auth, stale brokers, missing dependencies, bad prompts and merge conflicts are not reasoning failures, and a costlier model reproduces every one of them at higher cost.
- **The unit weights are proxies, not prices.** Never report a unit count as money.
- Claude never skips the diff read. Worker claims are advisory until Claude has read the diff and run the proof itself.
- The fix loop terminates on the FIRST of: 2 failed rounds for that item, a repeated identical failure, or the chain budget → logged Claude takeover. No unbounded delegation ping-pong.
- Concurrency cap is **3** — not a performance knob. Beyond three, workers contend for the same dev server, ports and build outputs, and the resulting failures are indistinguishable from real defects. `--serial` forces one.
- Dirty tree → worktree, always. The base HEAD is recorded before dispatch: rollback point and review base.
- Every `-o` and every `2>` goes to the run directory. No fixed `/tmp` paths, no discarded stderr, no `2>&1` — merging stderr into the output stream is how a config-parse failure comes back looking like an empty result.
- Commits happen on the Claude side only, after the human gate.
