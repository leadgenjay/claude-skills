# Pathway: heal

Closed-loop skill healer. Reviews one real creative output for blatant defects, traces each
defect to a gap in the producing skill's SKILL.md, mutates the skill, regenerates, re-reviews,
and loops until clean. **This pathway mutates the producing skill.** The undo (`.iter0` plus
rolling revert copy) from the shared block must exist before Step 4 runs.

Loads with: `blatant-defect-catalog.md`, `defect-to-skill-mapping.md`, `mutation-strategies.md`,
`banned-words.md`.

## Step 0: What the router hands over

The output, the producing skill (its full SKILL.md, read in full), and the original brief. The
path-pattern table lives in the router's Step 0 (single copy); if the router resolved the skill
only by that table, it has already asked once. Do not ask again.

## Step 1: Blatant defect scan

Not the polish pathway's 100-check system. A focused "instant glance" scan for things a human
would immediately spot as broken. Twelve rows per domain.

### Visual domain (graphic ad, carousel, banner, thumbnail)

Resize with `sips` (shared block), then use the Read tool to view the image.

| # | Defect | What to look for |
|---|--------|-----------------|
| V1 | Misspelling / garbled text | Words with wrong letters, merged characters, letter substitutions (R->P), gibberish strings |
| V2 | Element overlap | Text covering other text, photo hiding CTA, elements stacked on each other |
| V3 | Text too small for mobile | Body text that would be unreadable on a phone screen (under ~20px equivalent) |
| V4 | Wrong colors / off-brand | Background not #0D0D0D or #FFFFFF, accent not #ED0D51, purple/blue/gradient present |
| V5 | Missing required element | No headline, no CTA, no photo when expected, no brand mark |
| V6 | Partially rendered / merged letters | Characters blended together, half-drawn glyphs, font rendering failures |
| V7 | Layout broken | Content off-screen, collapsed sections, giant empty gaps, elements outside frame |
| V8 | Wrong aspect ratio | Image dimensions don't match target format (4:5, 1:1, 16:9, 9:16) |
| V9 | Prompt leakage | Meta-instructions visible as text: "CRITICAL", "IMPORTANT", "DO NOT", "NOTE:", "EXACTLY" |
| V10 | Compositing failure | Sticker effect, size mismatch between composited elements, visible placeholder shapes, layering errors |
| V11 | **A flaw you already noticed and argued away** (load-bearing) | Search your own narration for a hedge: "a bit ragged", "slightly off", "acceptable", "good enough", "not ideal but". Every one of those is a defect you found and declined to file. Re-open it and decide again with the hedge deleted |
| V12 | **Dead space in a frame that will be cropped** (load-bearing) | A still or plate with a third or more of one axis empty. Invisible in the source medium (a terminal grows upward, so a short transcript leaves a gap nobody sees in a clip) and glaring the moment it becomes a slide |

### Text domain (email, script, copy, carousel-copy)

Programmatic where possible, LLM for the rest.

| # | Defect | Detection method |
|---|--------|-----------------|
| T1 | Banned AI words | Regex scan against `banned-words.md`, plus the banned list in the agent instruction file if one is loaded |
| T2 | Missing required section | Expected sections absent (subject line for email, CTA for ad copy, hook for script) |
| T3 | Wrong format | Expected carousel slides but got prose, expected beat sheet but got paragraphs |
| T4 | Placeholder text remaining | `[PLACEHOLDER]`, `{{variable}}`, `[YOUR_NAME]`, `INSERT_HERE`, `TODO` |
| T5 | Gross word count violation | 2x over or under the expected range for the format |
| T6 | Duplicate content | Same paragraph or section repeated verbatim |
| T7 | Wrong tone | Corporate/formal when should be conversational, or vice versa |
| T8 | Missing personalization | No "you" / "your" in copy that should address the reader directly |
| T9 | Em dashes present | U+2014 and U+2013, banned in all copy |
| T10 | Gross structural error | Slides numbered wrong, sections out of order, incomplete sentences |
| T11 | **Unsourced number** (load-bearing) | Any figure, percentage or comparative claim ("82% fewer mistakes", "3x faster", "cheaper than X") with no source in the repo, the docs, or a capture. Grep the number. A figure nobody can trace is a defect on anything a stranger will read |
| T12 | **Register misses the stated audience** (load-bearing) | The brief names a reader (beginner, CFO, developer) and the copy is pitched at someone else. Symptoms: internal identifiers in a sentence rather than a screenshot, terms the named reader would have to look up, documentation voice on a social asset |

**V11 is the highest-yield check in either table and the only one you can run without looking
at anything.** A rule that already exists on disk, correct and unambiguous, is defeated by an
argument rather than by ignorance, and the argument always sounds like a technicality that grants
an exception. Two from 2026-09-09, both real, both caught later by a blind reviewer and not by
the author: a fixed-width table cell whose columns visibly stair-stepped, filed at the time as
"ragged but acceptable"; and a proof slide given a reconstructed frame on the grounds that "the
content is real, so it is a rebuild for legibility". When a mutation targets a rule that already
existed, do not restate the rule. **Write down the argument that beat it, verbatim, and the
counter.** A rule that has already lost once loses again to the same sentence.

### Output

```
defects = [
  { "id": "V1", "category": "misspelling", "description": "Headline reads 'INRICIGA' instead of 'INSTANTLY'", "evidence": "Top-center text in image" },
  ...
]
```

**If 0 defects:** "No blatant defects found. Output looks clean." Open the output in Preview.app
and stop.

## Step 2: Triage, skill defect vs model defect

**(A) Skill-fixable.** SKILL.md is missing a rule, has an ambiguous rule, wrong template,
missing negative constraint, or buried priority that allowed this defect. Missing CTA → no CTA
requirement; wrong background → no background spec; prompt leakage → no negative constraint for
meta-instruction words. Proceed to Step 3.

**(B) Model-stochastic.** The skill is correct and prominent (positioned early, reinforced with
repetition or a negative constraint, sometimes rendered right before) but the model rendered
wrong anyway. Common with Gemini text rendering and hex colors. Retry the same generation up to
2 more times (3 total). If it persists across all 3, reclassify as (A) and add reinforcement.

**(C) Tool limitation.** Cannot be fixed by mutation or retry (Gemini cannot render certain
Unicode; fal.ai cannot do pixel-exact layouts; text-to-image cannot render long paragraphs). Log
it as unfixable and skip it. Do not spend iterations here.

## Step 3: Diagnose the skill gap

For each (A) defect, with the producing SKILL.md read in full:

1. Search for existing coverage: is there a rule that should prevent this? Vague? Contradicted?
   Buried?
2. Classify the gap:

| Gap type | Description | Example |
|---|---|---|
| Missing rule | No instruction addresses this defect | No CTA requirement anywhere |
| Vague rule | Rule exists but too abstract to enforce | "Include brand elements" instead of "Background must be #0D0D0D" |
| Conflicting rules | Two instructions contradict | "Keep prompt under 200 words" + a template that expands to 350 |
| Buried priority | Rule positioned too late/deep | Background spec on line 280 of 300 |
| Template gap | Output template missing a section | Prompt template has no CTA button section |
| Missing negative | States what TO do, not what NOT to | "Use #ED0D51" but no "Do NOT use purple, blue, or gradients" |

3. Write the diagnosis:

```markdown
**Defect V4: Wrong colors**
- Gap type: Missing negative
- Location: Design Specs section, line ~45
- Current rule: "Accent color: #ED0D51"
- Missing: No negative constraint against purple, blue, or gradient backgrounds
- Proposed fix: Add "Do NOT use purple, blue, or gradient backgrounds. Background must be exactly #0D0D0D (dark) or #FFFFFF (white)."
```

`defect-to-skill-mapping.md` has the common patterns.

## Step 4: Mutate the skill

Apply the L1-L5 ladder from the shared block and `mutation-strategies.md`. Start at L1; escalate
only when the previous level was reverted for the same defect; track the level per defect in the
iteration log. One targeted change per iteration (batch only when defects share the exact same
root-cause section). Place new rules near the TOP of their section; put a negative constraint
immediately after the positive rule it reinforces. Apply with the Edit tool; record what changed
and why.

## Step 5: Regenerate

Re-run the creative with the updated skill and the original brief.

| Domain | Method |
|---|---|
| Graphic ad (nano-banana) | Re-run the `nano-banana` CLI command with the same arguments |
| Graphic ad (fal.ai) | Re-run the fal.ai pipeline |
| Carousel / banner | Re-run that generation pipeline |
| Email / copy / script | Regenerate text using the updated skill as context |
| Video script | Regenerate the beat sheet |

Save the new output beside the original as `original-filename-heal-N.ext`. Resize images before
any vision review.

## Step 6: Re-review

Run the Step 1 scan on the new output and count defects against the previous iteration.

- **Decreased:** keep. In a repo, `git add` the producing SKILL.md and `git commit -F
  <message-path>` (shared block). Outside a repo, copy the improved file over the **rolling**
  revert copy so the next iteration reverts to this state. The `.iter0` is never overwritten.
- **Same or increased:** revert (`git checkout -- <path>` in a repo, `cp <rolling-copy> <path>`
  otherwise). Increment `stale_count`; the next iteration escalates.
- **Zero:** keep, print success, go to termination.

Commit message shape:

```
heal(<skill-name>): <summary>

Defect: <defect id and description>
Gap: <gap type and location>
Fix: <what was changed in SKILL.md>
Remaining: <N defects>
```

## Step 7: Loop control

Stop conditions are in the SKILL.md table (clean output; 10 iterations; stale 5; all remaining
defects (B)-after-retries or (C); cost guard). Status line after each iteration:

```
[Heal N] Defects: X -> Y | Action: kept/reverted | Stale: S/5 | Remaining: Z
```

## Final report

```markdown
# Heal Report: <skill-name>

## Summary
- **Output:** <file path>
- **Skill:** <skill name and path>
- **Iterations:** N (M kept, K reverted)
- **Undo:** git | file baseline (say which; outside a repo `git revert` is not available)
- **Stop reason:** clean_output | max_iterations | stale_ceiling | all_stochastic | cost_guard

## Defect progression
| Iteration | Defects | Action | Detail |
|---|---|---|---|
| 0 (initial) | 4 | (none) | V1: misspelling, V4: wrong color, V5: no CTA, V9: prompt leakage |
| 1 | 3 | kept | Fixed V5 (added CTA requirement to skill) |
| 2 | 2 | reverted | Attempted V4 fix but introduced V7 |

## Skill changes applied
1. `abc1234` — heal(ad-creative-graphic): add CTA button requirement to prompt template

## Remaining defects
- None (or list with triage category)
```

Open the final output in Preview.app (`open -a Preview "<path>"`).
