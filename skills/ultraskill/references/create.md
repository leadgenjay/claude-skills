# Pathway: create

Create a new skill, then improve it. This pathway owns none of the crafting. `skill-creator`
(the local skill at the skill root) runs the interview, writes the SKILL.md, and produces the
first test cases; this pathway takes what comes back and runs the mutating loops on it.

Loads with: `learn.md` (always), `heal.md` (when a sample output exists).

## Step 1: Delegate to skill-creator

Invoke the `skill-creator` skill with the user's ask, verbatim. Let it run its own flow: capture
intent, interview, research, write the SKILL.md, write test cases, run them with and without the
skill, and grade. Do not interleave this pathway's steps with its interview; the user is talking
to skill-creator until it hands back.

What must come back before Step 2 (ask skill-creator for whatever is missing):

- the new skill's directory path;
- `evals/evals.json` in that directory (skill-creator's test cases and assertions, in the
  `learn.md` shape; convert if it produced its own format);
- at least one with-skill output saved on disk, when the skill produces a creative.

## Step 2: Undo, then learn

Shared block: both scratchpad copies of the new SKILL.md, `test -s` on each. The new skill is
usually in a repo (its author just made it); if the file is tracked and clean, git is the
per-iteration revert.

Run `learn.md` on the new skill. Stop conditions are the learn column of the SKILL.md table.

## Step 3: Heal, if there is something to look at

If Step 1 left a real output on disk (an image, a rendered page, a script), run `heal.md` with
that output and the new skill as the producing skill. Skip silently when the skill produces no
creative (configuration skills, code-generation skills). Defects that heal fixes become new
assertions in `evals.json`, so the next learn pass covers them.

## Step 4: Closing checklist

Pass/fail. Any failure names which step to go back to.

- [ ] Learn's final pass rate is at least 0.90 (else back to Step 2 with more iterations or sharper assertions)
- [ ] Every eval has at least 5 assertions, mixing deterministic and LLM-graded, with at least one edge case, and none that pass regardless of the skill (else edit `evals.json`, back to Step 2)
- [ ] Final outputs score no lower than the first with-skill run, and the mutation log shows more keeps than reverts (else back to Step 2 at a higher ladder level)
- [ ] SKILL.md is under 500 lines; large material is in `references/`, deterministic work in `scripts/`; no file in the directory is unreferenced from SKILL.md
- [ ] The description says what the skill does and when to use it, under 100 words, with trigger phrases, no internal jargon
- [ ] The instructions explain why and not only what, carry 2-3 realistic input/output pairs, have a constraints section, contain no contradictions, and put the critical rules first

## Step 5: Report and next steps

```
Create complete
------------------------------------
Skill:            {name} at {path}
Learn:            {initial}% -> {final}% over {N} iterations (L1:{n} L2:{n} L3:{n} L4:{n} L5:{n})
Heal:             {defects before} -> {after} | skipped (no creative output)
Checklist:        PASSED | FAILED ({which gate})
Undo:             git | file baseline
```

Offer, once, in this order: run skill-creator's description-optimization loop (trigger-eval); run
`publish-skill` if the skill is meant for the marketplace; another learn pass with more test
cases. Then stop.

## When things go wrong

| Observation | Likely cause | Do |
|---|---|---|
| Score stuck at 0.70-0.80 | Skill misaligned with what the user meant | Back to Step 1; skill-creator re-interviews |
| Learn at 0.90 but heal finds many defects | Evals do not cover enough quality dimensions | Add assertions targeting the heal defects, back to Step 2 |
| Heal fixed the same defect 3+ times | Model-stochastic, not a skill gap | Accept, document as a known limitation |
| SKILL.md past 500 lines | Over-mutation without consolidation | Bloat-guard consolidation pass, then resume |
| All assertions pass but outputs feel wrong | Assertions too loose | Rewrite them to be specific and demanding |
