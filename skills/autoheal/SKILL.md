---
name: autoheal
version: 1.0.0
description: "Closed-loop skill healer: reviews creative output for blatant defects (misspellings, broken layout, missing elements, garbled text, wrong colors), traces each defect to a gap in the producing skill, mutates the skill, regenerates, and re-reviews. Triggers: 'autoheal', 'heal this', 'heal the skill', 'fix and prevent', 'output is broken', 'skill keeps producing bad output'."
---

# Autoheal

Closed-loop skill healer. Reviews creative output for blatant defects, traces each defect to a gap in the producing skill's SKILL.md, mutates the skill, regenerates, and loops until clean.

**How it differs from related skills:**

| Skill | What it fixes | Touches skill? | Reviews output? |
|-------|--------------|----------------|-----------------|
| **autoimprove** | Single output (3 passes, 98 checks) | No | Yes |
| **autoheal** | Skill + output (10 iterations, 10 checks) | Yes | Yes |
| **autolearn** | Skill via evals (unlimited, assertion-driven) | Yes | No |

---

## Step 0: Detect Context

Find three things before starting:

### A. The Output

Locate the creative output to heal. Search in this order:
1. File path provided by user (explicit argument)
2. Most recently generated image/file in conversation
3. Most recent creative text output in conversation

If nothing found: "No output to heal. Generate something first, then run /autoheal." Stop.

### B. The Producing Skill

Identify which skill produced the output. Search in this order:
1. User explicitly names the skill ("heal the ad-creative skill")
2. Conversation history mentions a skill invocation before the output
3. Output path pattern matching:
   | Output Pattern | Likely Skill |
   |---------------|-------------|
   | `output/ads/` or nano-banana command | `ad-creative-graphic` |
   | Carousel slides or `carousel` in path | `carousel-post` |
   | `output/banners/` or banner dimensions | `social-media-banner` |
   | `output/thumbnails/` or YouTube thumb | `youtube-thumbnail` |
   | Beat sheet or kinetic text | `kinetic-text-ad` |
   | Email copy or nurture sequence | `lgj-email-marketing` |
   | Script with timestamps | `short-form-script` or `youtube-script` |
4. Output type matching (graphic -> graphic skills, copy -> copy skills)
5. If ambiguous: ask user once, then proceed

Read the producing skill's full SKILL.md. If the skill path cannot be resolved, stop with message.

### C. The Original Brief

Find the user request that triggered the creative. Needed for regeneration in Step 5. If not recoverable from conversation, ask user once.

---

## Step 1: Blatant Defect Scan

NOT autoimprove's 98-check system. A focused 10-item "instant glance" scan for things a human would immediately spot as broken.

### Visual Domain

For graphic-ad, carousel, banner, thumbnail outputs.

**Preparation:** Resize the output image to max 1000px before viewing:
```bash
sips --resampleHeightWidthMax 1000 "<image-path>"
```
Then use the Read tool to view the image for AI vision review.

**Scan these 10 defects:**

| # | Defect | What to Look For |
|---|--------|-----------------|
| V1 | Misspelling / garbled text | Words with wrong letters, merged characters, letter substitutions (R->P), gibberish strings |
| V2 | Element overlap | Text covering other text, photo hiding CTA, elements stacked on each other |
| V3 | Text too small for mobile | Body text that would be unreadable on a phone screen (< ~20px equivalent) |
| V4 | Wrong colors / off-brand | Background not #0D0D0D or #FFFFFF, accent not #ED0D51, purple/blue/gradient present |
| V5 | Missing required element | No headline, no CTA, no photo when expected, no brand mark |
| V6 | Partially rendered / merged letters | Characters blended together, half-drawn glyphs, font rendering failures |
| V7 | Layout broken | Content off-screen, collapsed sections, giant empty gaps, elements outside frame |
| V8 | Wrong aspect ratio | Image dimensions don't match target format (4:5, 1:1, 16:9, 9:16) |
| V9 | Prompt leakage | Meta-instructions visible as text: "CRITICAL", "IMPORTANT", "DO NOT", "NOTE:", "EXACTLY" |
| V10 | Compositing failure | Sticker effect, size mismatch between composited elements, visible placeholder shapes, layering errors |

### Text Domain

For email, script, copy, carousel-copy outputs.

**Scan these 10 defects programmatically + LLM:**

| # | Defect | Detection Method |
|---|--------|-----------------|
| T1 | Banned AI words | Regex scan against banned word list from CLAUDE.md |
| T2 | Missing required section | Check for expected sections (subject line for email, CTA for ad copy, hook for script) |
| T3 | Wrong format | Expected carousel slides but got prose, expected beat sheet but got paragraphs |
| T4 | Placeholder text remaining | Scan for `[PLACEHOLDER]`, `{{variable}}`, `[YOUR_NAME]`, `INSERT_HERE`, `TODO` |
| T5 | Gross word count violation | 2x over or under the expected range for the format |
| T6 | Duplicate content | Same paragraph or section repeated verbatim |
| T7 | Wrong tone | Corporate/formal when should be conversational, or vice versa |
| T8 | Missing personalization | No "you" / "your" in copy that should address the reader directly |
| T9 | Em dashes present | Scan for U+2014 and U+2013 — banned in all copy |
| T10 | Gross structural error | Slides numbered wrong, sections out of order, incomplete sentences |

### Output

Produce a `defects[]` list:
```
[
  { "id": "V1", "category": "misspelling", "description": "Headline reads 'INRICIGA' instead of 'INSTANTLY'", "evidence": "Top-center text in image" },
  ...
]
```

**If 0 defects:** "No blatant defects found. Output looks clean." Open output in Preview.app and stop.

---

## Step 2: Triage — Skill Defect vs Model Defect

Classify each defect into one of three categories:

### (A) Skill-Fixable

The skill's SKILL.md is missing a rule, has an ambiguous rule, wrong template, missing negative constraint, or buried priority that allowed this defect.

**Examples:**
- Missing CTA -> skill has no CTA requirement
- Wrong background color -> skill doesn't specify background color
- Prompt leakage -> skill lacks negative constraint for meta-instruction words
- Missing photo -> skill template doesn't include photo placement

**Action:** Proceed to Step 3.

### (B) Model-Stochastic

The skill instructions are correct but the AI model rendered wrong anyway. Common with Gemini text rendering (garbled text despite correct prompt) and color rendering (wrong color despite explicit hex code).

**Detection signals:**
- The skill explicitly states the correct requirement
- The requirement is positioned prominently (not buried)
- The requirement has reinforcement language (repetition, negative constraint)
- Previous outputs from the same skill sometimes get it right

**Action:** Retry the same generation up to 2 additional times (3 total attempts). If the defect persists across all 3 attempts, reclassify as (A) and add reinforcement language to the skill.

### (C) Tool Limitation

Cannot be fixed by skill mutation or retries. Fundamental limitation of the generation tool.

**Examples:**
- Gemini cannot render certain Unicode characters
- fal.ai cannot produce exact pixel-level layouts
- Text-to-image models cannot reliably render long paragraphs

**Action:** Log the defect, note it as unfixable, skip it. Do not waste iterations on tool limitations.

---

## Step 3: Diagnose Skill Gap

For each (A) defect:

1. **Read the producing skill's SKILL.md in full.**
2. **Search for existing coverage** of the defect:
   - Is there a rule that should prevent this? Where is it?
   - Is the rule present but vague?
   - Is the rule present but contradicted by another rule?
   - Is the rule present but buried deep in the file?
3. **Classify the gap:**

| Gap Type | Description | Example |
|----------|-------------|---------|
| Missing rule | No instruction addresses this defect at all | No CTA requirement anywhere in SKILL.md |
| Vague rule | Rule exists but too abstract to enforce | "Include brand elements" instead of "Background must be #0D0D0D" |
| Conflicting rules | Two instructions contradict each other | "Keep prompt under 200 words" + template that expands to 350 words |
| Buried priority | Rule exists but positioned too late/deep | Background color spec on line 280 of a 300-line file |
| Template gap | Output template is missing a section | Prompt template has no CTA button section |
| Missing negative | Rule states what TO do but not what NOT to do | "Use #ED0D51 for accent" but no "Do NOT use purple, blue, or gradients" |

4. **Produce diagnosis** for each defect:
```markdown
**Defect V4: Wrong colors**
- Gap type: Missing negative
- Location: Design Specs section, line ~45
- Current rule: "Accent color: #ED0D51"
- Missing: No negative constraint against purple, blue, or gradient backgrounds
- Proposed fix: Add "Do NOT use purple, blue, or gradient backgrounds. Background must be exactly #0D0D0D (dark) or #FFFFFF (white)."
```

Reference `defect-to-skill-mapping.md` for common patterns.

---

## Step 4: Mutate the Skill

Apply the L1-L5 escalation strategy from `auto-skill-improver/references/mutation-strategies.md`:

| Level | Strategy | When to Use |
|-------|----------|-------------|
| L1 | Precision fix | First attempt — add one specific rule |
| L2 | Add example | Rule exists but output ignores it — add good/bad example |
| L3 | Add checklist | Multiple related defects — add verification checklist |
| L4 | Rewrite section | Section patched 2+ times and still failing |
| L5 | Strategic reversal | 3+ reverts on same defect — try opposite approach |

### Mutation Rules

1. **ONE targeted change per iteration.** Batch only if defects share the exact same root cause section.
2. **Start at L1.** Escalate only if previous level was reverted for the same defect.
3. **Track escalation level per defect** in the iteration log.
4. **Position matters.** Place new rules near the TOP of their section (primacy effect). Put negative constraints immediately after the positive rule they reinforce.
5. **Bloat guard:** If SKILL.md grows beyond 2x its original byte size without proportional defect reduction, run a consolidation pass — merge redundant rules, remove ineffective additions, compress.

### Applying the Edit

1. Use the Edit tool to make the change to the producing skill's SKILL.md.
2. Record what was changed and why.

---

## Step 5: Regenerate

Re-run the creative using the updated skill and the original brief from Step 0C.

### Domain-Specific Regeneration

| Domain | Method |
|--------|--------|
| Graphic ad (nano-banana) | Re-run the `nano-banana` CLI command with the same arguments |
| Graphic ad (fal.ai) | Re-run the fal.ai pipeline |
| Carousel | Re-run the carousel generation pipeline |
| Banner | Re-run the banner generation pipeline |
| Email / copy / script | Regenerate text using the updated skill as context |
| Video script | Regenerate the beat sheet |

### Output Handling

- Save new output alongside the original for comparison
- Use a suffix: `original-filename-heal-N.ext` where N is the iteration number
- For images: resize to 1000px via `sips` before any vision review

---

## Step 6: Re-review

Run the Step 1 blatant defect scan on the new output.

### Compare Results

Count defects in new output vs previous iteration:

**Defects decreased:**
```bash
git add <producing-skill>/SKILL.md
git commit -m "$(cat <<'EOF'
heal(<skill-name>): <summary of fix>

Defect: <defect id and description>
Gap: <gap type and location>
Fix: <what was changed in SKILL.md>
Remaining: <N defects>
EOF
)"
```

**Defects same or increased:**
```bash
git checkout -- <producing-skill>/SKILL.md
```
Increment `stale_count`. The mutation didn't help — next iteration will escalate.

**Defects = 0:**
Commit the fix, print success message, proceed to termination.

---

## Step 7: Loop Control

Continue to the next iteration. Check stop conditions before each new iteration:

### Stop Conditions

| # | Condition | Action |
|---|-----------|--------|
| 1 | **Clean output** — 0 blatant defects | Commit + stop (success) |
| 2 | **Max iterations** — 10 reached | Stop with report |
| 3 | **Stale ceiling** — 5 consecutive iterations with no defect reduction | Stop with report |
| 4 | **All stochastic** — every remaining defect triaged as (B) after retries or (C) | Stop with report |
| 5 | **Cost guard** — >$2.00 estimated generation costs | Pause, report costs, stop |

### Iteration Status Line

Print after each iteration:
```
[Heal N] Defects: X -> Y | Action: committed/reverted | Stale: S/5 | Remaining: Z
```

---

## Final Report

On termination, print:

```markdown
# Autoheal Report: <skill-name>

## Summary
- **Output:** <file path>
- **Skill:** <skill name and path>
- **Iterations:** N (M committed, K reverted)
- **Stop reason:** clean_output | max_iterations | stale_ceiling | all_stochastic | cost_guard

## Defect Progression
| Iteration | Defects | Action | Detail |
|-----------|---------|--------|--------|
| 0 (initial) | 4 | — | V1: misspelling, V4: wrong color, V5: no CTA, V9: prompt leakage |
| 1 | 3 | committed | Fixed V5 (added CTA requirement to skill) |
| 2 | 2 | committed | Fixed V9 (added negative constraint for meta-instructions) |
| 3 | 2 | reverted | Attempted V4 fix but introduced V7 |
| 4 | 1 | committed | Fixed V4 (explicit background color + negative for gradients) |
| 5 | 0 | committed | V1 resolved by retry (model-stochastic) |

## Skill Changes Applied
1. `abc1234` — heal(ad-creative-graphic): add CTA button requirement to prompt template
2. `def5678` — heal(ad-creative-graphic): add negative constraint for meta-instruction words
3. `ghi9012` — heal(ad-creative-graphic): explicit background color with anti-gradient rule

## Remaining Defects
- None (or list any remaining with triage category)
```

Open the final output in Preview.app (`open -a Preview "<path>"`) for human review.

---

## Autonomy Rules

Once the loop begins:

- **Never stop to ask** if the loop should continue.
- **Never ask for permission** to make changes, commits, or reverts.
- **Never ask if this is a good stopping point.** The only valid stops are the 5 conditions above.
- **Never pause between iterations.** Proceed immediately to the next cycle.
- If an unexpected error occurs (git failure, file read error, generation failure), attempt recovery 3 times. If recovery fails, log the error and continue to the next iteration.
- The human may be away from the computer. The expectation is continuous autonomous operation until a stop condition is met.

---

## Git Integration

**Commit format:**
```
heal(<skill-name>): <summary>

Defect: <defect id and description>
Gap: <gap type and location>
Fix: <what was changed in SKILL.md>
Remaining: <N defects>
```

**Revert method:**
```bash
git checkout -- <path-to-SKILL.md>
```

**Pre-loop safety:** Before starting, check git status on the target SKILL.md. If uncommitted external changes exist, commit them first:
```bash
git commit -m "chore(<skill-name>): save manual edits before autoheal loop"
```

---

## References

- `references/blatant-defect-catalog.md` — Expanded defect checklists with detection methods and false positives
- `references/defect-to-skill-mapping.md` — Mapping from defect categories to common SKILL.md gaps
- `auto-skill-improver/references/mutation-strategies.md` — L1-L5 mutation escalation strategy (shared with autolearn)
