# Pathway: learn

Eval-driven improvement loop for a skill, adapted from Karpathy's autoresearch: instead of
modifying `train.py` and checking `val_bpb`, modify `SKILL.md` and check assertion pass rate.
**This pathway mutates the target skill.** The undo (`.iter0` plus rolling revert copy) from the
shared block must exist before the first mutation.

| Autoresearch | learn |
|---|---|
| `train.py` (target) | Target skill's `SKILL.md` |
| `prepare.py` (fixed constants) | `evals.json` (fixed test cases + assertions) |
| `program.md` (human direction) | This file |

Loads with: `assertion-patterns.md`, `mutation-strategies.md`, `banned-words.md`,
`evals/templates/*.evals.json`, `scripts/score_report.py`.

Supported domains: `general`, `copywriting`, `graphic-design`.

## Before starting

1. **Read the target skill** in full: `SKILL.md` and every file in its directory.
2. **Locate or create evals.** If `<target-skill>/evals/evals.json` exists, read and validate it.
   If not, detect the domain from the skill's description, copy the matching template from
   `evals/templates/`, populate it with realistic test prompts and assertions tailored to the
   target, and save it to `<target-skill>/evals/evals.json`.
3. **Detect domain** from the `"domain"` field.
4. **Read `assertion-patterns.md`** for that domain and `mutation-strategies.md`.
5. **Create the workspace** `<target-skill>-workspace/` beside the target skill directory.
6. **Undo.** Shared block: both scratchpad copies taken, `test -s` on each; if the target is in a
   repo and the file is tracked and clean, git is the per-iteration revert, otherwise the rolling
   copy is. Never commit pre-existing changes in the target's repo on the loop's behalf.

## The loop

Seven steps, repeated until a stop condition in the SKILL.md table is met.

### Step 1: Run all evals

For each eval in `evals.json`: combine the eval's `prompt` with the target SKILL.md as system
context, generate the output as if the skill were loaded, and save it to
`workspace/iteration-N/eval-<id>/with_skill/outputs/`.

**Iteration 0 only:** also run each eval **without** the skill and save to
`without_skill/outputs/`. That is the baseline.

### Step 2: Grade each assertion

**Deterministic** when the assertion can be checked programmatically: word counts, banned words,
character detection (em dashes, punctuation), hex colors (`#[0-9A-Fa-f]{6}`), dimension values
(`1080`, `1350`, `48px`).

**LLM-graded** when semantic judgment is required:

```
Given this output:
---
{output_text}
---

Does it satisfy this assertion: "{assertion_text}"?

Respond with JSON only:
{"passed": true/false, "evidence": "specific quote or detail proving your judgment"}
```

**Visual** (graphic-design, when `"render": true`): write the code output to a temp HTML file,
render with Playwright, screenshot, feed the screenshot and the assertion to vision, grade
pass/fail with evidence.

Save `grading.json`:

```json
{
  "expectations": [
    {"text": "assertion text", "type": "structural", "passed": true, "evidence": "..."}
  ],
  "summary": {"passed": 8, "failed": 2, "total": 10, "pass_rate": 0.8}
}
```

### Step 3: Aggregate score

`pass_rate = total_passed / total_assertions` across all evals. Save `benchmark.json`:

```json
{
  "iteration": N,
  "pass_rate": 0.8,
  "total_passed": 24,
  "total_assertions": 30,
  "evals": [{"id": 0, "pass_rate": 0.9}, {"id": 1, "pass_rate": 0.7}]
}
```

### Step 4: Diagnose failures

If pass_rate < 1.0: list every failed assertion with its evidence; identify which SKILL.md
section is responsible (or missing); classify the root cause as missing rule, ambiguous
instruction, conflicting rules, missing example, or wrong priority. Save
`workspace/iteration-N/diagnosis.md`.

### Step 5: Plan and apply one mutation

Using the diagnosis and `mutation-strategies.md`, plan exactly **one** change:

- Address the highest-impact failure first (fails across the most evals).
- Start at L1. Escalate only if previous iterations at this level were reverted.
- Check `loop-log.json`: do not repeat a reverted mutation unless the approach is meaningfully
  different, and say why.
- Keep it minimal: one new rule, one clarified sentence, one added example. Not a rewrite.

Save `workspace/iteration-N/mutation.md`:

```markdown
## Mutation Plan, Iteration N

**Target assertion(s):** [list]
**Root cause:** [from diagnosis]
**Strategy level:** L1/L2/L3/L4/L5
**Change:** [exact description of what to add/modify/remove in SKILL.md]
**Rationale:** [why this should fix the failure]
```

Apply the edit.

### Step 6: Re-evaluate, keep or revert

Re-run Steps 1-3. Compare `new_score` to `best_score`:

- **new_score > best_score:** keep. In a repo, `git add <target>/SKILL.md` and `git commit -F
  <message-path>`; outside one, copy over the rolling revert copy. `best_score = new_score`.
- **new_score <= best_score:** revert (`git checkout -- <path>` or `cp <rolling-copy> <path>`).
  Increment `stale_count`.

Commit message shape:

```
improve(<skill-name>): <old%> to <new%> pass rate

Iteration <N>: <mutation summary>
Failed: <assertions that were failing>
Fixed: <assertions now passing>
```

### Step 7: Log and repeat

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

Status line:

```
[Learn N] Score: 80% -> 90% | Action: kept | Stale: 0 | Failures remaining: 3
```

Return to Step 1.

## Domain adapters

**General.** Run: prompt with SKILL.md as system context, capture text. Grade: LLM-as-judge on
every assertion type. No rendering.

**Copywriting.** Run as above, capture the copy. Grade deterministically first: word count
(split on whitespace); banned words (`banned-words.md`, copywriting overlay); em dash (U+2014,
U+2013); framework markers (PAS, AIDA); CTA presence (action verb + link/keyword). Then LLM for
tone, persuasion, audience, specificity, urgency authenticity.

**Graphic design.** Run as above, capture code (SVG, React/Tailwind, HTML+CSS). Grade by code
inspection by default: hex colors (`#ED0D51`, `#0D0D0D`, `#FFFFFF`), dimensions, font-family
strings, font sizes, padding/margin, word count per text node. Visual inspection is opt-in
(`"render": true`): temp HTML, Playwright at target viewport, screenshot, vision pass/fail, only
for assertions marked `"type": "visual"`.

## Escalation

If 2 consecutive mutations at level N are reverted for the same assertion, escalate to N+1. After
L5 is reverted, mark the assertion "resistant" and move on.

## Bloat guard

If SKILL.md grows past 2x its original bytes while the score improved less than 10%, the next
iteration is a consolidation pass instead of a mutation: merge redundant rules, remove
ineffective additions, compress. Then resume.

## Final report

Write `workspace/benchmark.md`:

```markdown
# Learn Report: <skill-name>

## Results
- **Baseline (no skill):** X%
- **Initial (with skill):** Y%
- **Final:** Z%
- **Iterations:** N (M kept, K reverted)
- **Undo:** git | file baseline
- **Stop reason:** perfect_score | stale_ceiling | practical_ceiling | bloat_consolidation | cost_guard | user_interrupt

## Score progression
Iteration 0: 80% (baseline)
Iteration 1: 87% kept
Iteration 2: 83% reverted

## Remaining failures
- [assertion text]: [diagnosis summary]

## Mutations applied
1. [mutation summary]: [score change]
```

`scripts/score_report.py <workspace-path>` prints a summary at any time.

## Workspace layout

```
<target-skill>-workspace/
  loop-log.json              master log (skill_name, domain, started_at, baseline_score, initial_score, iterations[], final_score, stop_reason)
  benchmark.md               final report
  iteration-N/
    eval-<id>/with_skill/outputs/
    eval-<id>/with_skill/grading.json
    benchmark.json
    diagnosis.md
    mutation.md
```

## Related

- `skill-creator` creates skills; this pathway plugs into its "Iterate" step (see `create.md`).
- `kinetic-text-ad` was the first skill evaluated with this loop and is the reference case.
