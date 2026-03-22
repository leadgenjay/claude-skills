---
name: auto-skill-improver
version: 1.0.0
description: "Autonomously improve any Claude Code skill.md file using an eval-driven feedback loop adapted from Karpathy's autoresearch. This skill should be used when the user wants to improve a skill, run skill evals, benchmark a skill, optimize a skill's pass rate, or run a self-improvement loop on a skill. Also use when the user mentions 'improve skill,' 'skill eval,' 'autoresearch,' 'benchmark skill,' 'optimize skill,' 'skill loop,' 'self-improve,' or 'auto-improve.'"
---

# Auto-Skill-Improver

Autonomous eval-driven improvement loop for Claude Code skills. Adapted from Karpathy's autoresearch: instead of modifying `train.py` and checking `val_bpb`, modify `SKILL.md` and check assertion pass rate.

**Three-file analogy:**
| Autoresearch | Auto-Skill-Improver |
|---|---|
| `train.py` (target) | Target skill's `SKILL.md` (target) |
| `prepare.py` (fixed constants) | `evals.json` (fixed test cases + assertions) |
| `program.md` (human direction) | This SKILL.md (loop instructions) |

**Supported domains:** general, copywriting, graphic-design.

---

## Before Starting

1. **Identify the target skill.** Read the target skill's `SKILL.md` and all files in its directory.
2. **Locate or create evals.** Check if `<target-skill>/evals/evals.json` exists.
   - If it exists: read it and validate the format.
   - If it does not exist: detect the domain from the skill's description and purpose, then copy the matching template from this skill's `evals/templates/` directory. Populate the template with realistic test prompts and assertions tailored to the target skill. Save to `<target-skill>/evals/evals.json`.
3. **Detect domain.** Read the `"domain"` field from evals.json. Valid values: `"general"`, `"copywriting"`, `"graphic-design"`.
4. **Read references.** Load `references/assertion-patterns.md` for the detected domain and `references/mutation-strategies.md` for mutation planning.
5. **Create workspace.** Create `<target-skill>-workspace/` alongside the target skill directory if it does not exist.
6. **Check git status.** Run `git status` on the target SKILL.md. If uncommitted external changes exist, commit them first with message `chore: save manual edits before auto-improvement loop`.

---

## The Autonomous Loop

Execute this 7-step cycle repeatedly until a stop condition is met.

### Step 1: Run All Evals

For each eval in `evals.json`:

1. Construct a test by combining the eval's `prompt` with the target skill's SKILL.md as system context.
2. Generate output by executing the prompt as if the skill were loaded. Capture the full response.
3. Save the raw output to `workspace/iteration-N/eval-<id>/with_skill/outputs/`.

For **iteration 0 only**, also run each eval **without** the skill (no SKILL.md in context) and save to `without_skill/outputs/`. This establishes the baseline.

### Step 2: Grade Each Assertion

For each assertion in each eval, determine pass or fail:

**Deterministic assertions** (when the assertion can be checked programmatically):
- Word count limits: count words in the output.
- Banned word detection: search for each banned word/phrase in the output.
- Character detection (em dashes, specific punctuation): regex search.
- Hex color presence: regex for `#[0-9A-Fa-f]{6}` patterns.
- Dimension values: regex for pixel values like `1080`, `1350`, `48px`.

**LLM-graded assertions** (when semantic judgment is required):
- Feed the output and assertion text to the grading prompt:
  ```
  Given this output:
  ---
  {output_text}
  ---

  Does it satisfy this assertion: "{assertion_text}"?

  Respond with JSON only:
  {"passed": true/false, "evidence": "specific quote or detail proving your judgment"}
  ```

**Visual assertions** (graphic-design domain, when `"render": true` in evals.json):
- Write the code output to a temp HTML file.
- Render with Playwright and capture a screenshot.
- Feed the screenshot to Claude Vision with the assertion text.
- Grade as pass/fail with evidence.

Save grading results to `grading.json`:
```json
{
  "expectations": [
    {"text": "assertion text", "type": "structural", "passed": true, "evidence": "..."}
  ],
  "summary": {"passed": 8, "failed": 2, "total": 10, "pass_rate": 0.8}
}
```

### Step 3: Calculate Aggregate Score

```
total_passed = sum of passed assertions across all evals
total_assertions = sum of total assertions across all evals
pass_rate = total_passed / total_assertions
```

Save to `benchmark.json`:
```json
{
  "iteration": N,
  "pass_rate": 0.8,
  "total_passed": 24,
  "total_assertions": 30,
  "evals": [{"id": 0, "pass_rate": 0.9}, {"id": 1, "pass_rate": 0.7}]
}
```

### Step 4: Diagnose Failures

If pass_rate < 1.0, analyze the failing assertions:

1. List every failed assertion with its evidence.
2. Identify which section of SKILL.md is responsible for each failure (or which section is missing).
3. Determine the root cause category:
   - **Missing rule**: The skill has no instruction addressing this assertion.
   - **Ambiguous instruction**: The skill mentions it but too vaguely.
   - **Conflicting rules**: Two instructions contradict each other.
   - **Missing example**: The skill states the rule but lacks a concrete example.
   - **Wrong priority**: The rule exists but is buried too deep in the document.

Save analysis to `workspace/iteration-N/diagnosis.md`.

### Step 5: Plan and Apply One Mutation

Using the diagnosis and `references/mutation-strategies.md`, plan exactly **one** targeted change to SKILL.md.

**Mutation selection rules:**
- Address the highest-impact failure first (the assertion that fails across the most evals).
- Start at escalation Level 1 (precision fix). Only escalate if previous iterations at this level were reverted.
- Check `loop-log.json` history: do not repeat a mutation that was previously reverted unless the approach is meaningfully different. Document why this time is different.
- Keep the change minimal. One new rule, one clarified sentence, one added example — not a rewrite.

Save the mutation plan to `workspace/iteration-N/mutation.md`:
```markdown
## Mutation Plan — Iteration N

**Target assertion(s):** [list]
**Root cause:** [from diagnosis]
**Strategy level:** L1/L2/L3/L4/L5
**Change:** [exact description of what to add/modify/remove in SKILL.md]
**Rationale:** [why this should fix the failure]
```

Apply the edit to the target SKILL.md.

### Step 6: Re-evaluate and Commit or Revert

1. Re-run all evals with the modified SKILL.md (repeat Steps 1-3).
2. Compare `new_score` to `best_score`:

**If new_score > best_score:**
```bash
git add <target-skill>/SKILL.md
git commit -m "improve(<skill-name>): <old%>→<new%> pass rate — <mutation summary>"
```
Update `best_score = new_score`.

**If new_score <= best_score:**
```bash
git checkout -- <target-skill>/SKILL.md
```
Increment `stale_count`.

### Step 7: Log and Repeat

Append to `workspace/loop-log.json`:
```json
{
  "iteration": N,
  "score_before": 0.8,
  "score_after": 0.9,
  "action": "committed",
  "sha": "abc1234",
  "mutation_summary": "Added explicit word count rule to Output Format section",
  "failures_fixed": ["Copy is under 150 words"],
  "new_failures": [],
  "skill_md_size_bytes": 12450,
  "stale_count": 0
}
```

Print a one-line status update:
```
[Iteration N] Score: 80% → 90% | Action: committed | Stale: 0 | Failures remaining: 3
```

Return to Step 1.

---

## Domain Adapters

### General

- **Run**: Send prompt with SKILL.md as system context. Capture text response.
- **Grade**: LLM-as-judge on text for all assertion types (structural, content, quality).
- **No rendering step.**

### Copywriting

- **Run**: Send prompt with SKILL.md as system context. Capture text response (the copy).
- **Grade — deterministic first:**
  - Word count: split on whitespace, count tokens.
  - Banned AI words: check against list (delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate, unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted).
  - Em dash detection: search for `—` (U+2014).
  - Framework detection: search for PAS markers (Problem/Agitation/Solution), AIDA markers (Attention/Interest/Desire/Action), etc.
  - CTA presence: search for action verbs + link/keyword patterns.
- **Grade — LLM for semantic assertions:**
  - Tone checks, persuasion quality, audience targeting, specificity, urgency authenticity.

### Graphic Design

- **Run**: Send prompt with SKILL.md as system context. Capture code output (SVG, React/Tailwind component, HTML+CSS).
- **Grade — code inspection (default):**
  - Color values: regex for hex codes (`#ED0D51`, `#0D0D0D`, `#FFFFFF`).
  - Dimensions: search for width/height values matching spec.
  - Font declarations: search for font-family strings.
  - Font sizes: search for font-size/text-[size] values.
  - Padding/margin: search for padding/margin declarations.
  - Word count per element: parse text content nodes.
- **Grade — visual inspection (opt-in, when `"render": true` in evals.json):**
  - Write code to temp HTML file.
  - Open with Playwright, set viewport to target dimensions.
  - Capture screenshot.
  - Feed screenshot + assertion to Claude Vision for binary pass/fail.
  - Use only for assertions marked `"type": "visual"`.

---

## Mutation Strategies

Reference `references/mutation-strategies.md` for the full catalog. Summary of 5 escalation levels:

| Level | Strategy | When to Use | Example |
|-------|----------|-------------|---------|
| L1 | Precision fix | First attempt at any failure | Add "Maximum 8 words per beat" rule |
| L2 | Add example | Rule exists but output ignores it | Add a concrete good/bad example |
| L3 | Add checklist | Multiple related assertions failing | Add "Before finishing" verification list |
| L4 | Rewrite section | Section consistently produces failures | Restructure the Output Format section |
| L5 | Try opposite | 3+ reverts on same assertion | If "always X" fails, try "prefer X unless Y" |

**Escalation trigger**: If 2 consecutive mutations at Level N are reverted for the same assertion, escalate to Level N+1.

---

## Stop Conditions

The loop terminates when any of these conditions is met:

1. **Perfect score**: pass_rate == 1.0 across all evals.
2. **Stale ceiling**: 10 consecutive iterations with no improvement (stale_count >= 10).
3. **Practical ceiling**: 3 consecutive reverts when best_score >= 0.95.
4. **User interrupt**: The user manually stops the process.
5. **SKILL.md bloat guard**: If SKILL.md grows beyond 2x its original byte size without proportional score improvement (score improved less than 10% while size doubled), trigger a consolidation pass instead of another mutation. The consolidation pass merges redundant rules, removes ineffective additions, and compresses the file. Then resume the loop.

On termination, generate a final report at `workspace/benchmark.md`:
```markdown
# Auto-Improvement Report: <skill-name>

## Results
- **Baseline (no skill):** X%
- **Initial (with skill):** Y%
- **Final:** Z%
- **Iterations:** N (M committed, K reverted)
- **Stop reason:** perfect_score | stale_ceiling | practical_ceiling | user_interrupt

## Score Progression
Iteration 0: 80% (baseline)
Iteration 1: 87% ✓ committed
Iteration 2: 83% ✗ reverted
Iteration 3: 90% ✓ committed
...

## Remaining Failures
- [assertion text] — [diagnosis summary]

## Mutations Applied
1. [mutation summary] — [score change]
2. ...
```

---

## Autonomy Rules

Once the loop begins:

- **Never stop to ask the human** if the loop should continue.
- **Never ask for permission** to make a change, commit, or revert.
- **Never ask if this is a good stopping point.** The only valid stops are the conditions listed above.
- **Never pause between iterations.** Proceed immediately to the next cycle.
- The human may be asleep, away from the computer, or otherwise unavailable. The expectation is continuous autonomous operation until a stop condition is met.
- If an unexpected error occurs (git failure, file read error, etc.), attempt to recover automatically. If recovery fails after 3 attempts, log the error and continue to the next iteration.

---

## Git Integration

**Commit format:**
```
improve(<skill-name>): <old%>→<new%> pass rate

Iteration <N>: <mutation summary>
Failed: <list of assertions that were failing>
Fixed: <list of assertions now passing>
```

**Revert method:**
```bash
git checkout -- <path-to-SKILL.md>
```

**Branch strategy (optional):** If the target skill's SKILL.md has uncommitted changes or the user prefers isolation, create a branch:
```bash
git checkout -b auto-improve/<skill-name>
```
Merge back to the original branch when the loop completes with improvements.

---

## Output and Reporting

### loop-log.json (master log)
```json
{
  "skill_name": "target-skill",
  "domain": "copywriting",
  "started_at": "ISO timestamp",
  "baseline_score": 0.70,
  "initial_score": 0.80,
  "iterations": [
    {
      "iteration": 1,
      "timestamp": "ISO timestamp",
      "score_before": 0.80,
      "score_after": 0.87,
      "action": "committed",
      "sha": "abc1234",
      "mutation_summary": "Added banned word list to Quality Rules section",
      "failures_fixed": ["No banned AI words used"],
      "new_failures": [],
      "skill_md_size_bytes": 8200,
      "stale_count": 0
    }
  ],
  "final_score": 1.0,
  "total_iterations": 5,
  "total_commits": 3,
  "total_reverts": 2,
  "ended_at": "ISO timestamp",
  "stop_reason": "perfect_score"
}
```

### Per-iteration workspace
Each iteration directory contains:
- `eval-<id>/with_skill/outputs/` — raw output
- `eval-<id>/with_skill/grading.json` — per-assertion results
- `benchmark.json` — aggregate scores
- `diagnosis.md` — failure analysis
- `mutation.md` — change plan and rationale

### Score report script
Run `scripts/score_report.py <workspace-path>` to print a summary at any time.

---

## Related Skills

- **skill-creator** — Create new skills from scratch (this skill plugs into Step 6: Iterate)
- **kinetic-text-ad** — The first skill evaluated with this framework; serves as the reference implementation
- **copywriting** / **dan-kennedy-copywriter** / **conversion-copywriting** — Copywriting skills that benefit from eval-driven improvement
- **ad-creative** / **frontend-design** / **canvas-design** — Design skills that benefit from eval-driven improvement
