# Mutation Strategies

How to decide what change to make to SKILL.md when assertions fail. Organized by escalation level — always start at Level 1 and only escalate when lower levels are reverted.

---

## Level 1: Precision Fix

**When:** First attempt at fixing any failure.
**What:** Add a single, specific rule that directly addresses the failed assertion.
**Risk:** Low. Minimal side effects.

### Examples

| Failed Assertion | Mutation |
|---|---|
| "Max 8 words per beat" | Add to the Beat Rules section: "Each beat must contain 8 words or fewer. Count every word including articles and prepositions." |
| "No banned AI words" | Add a Banned Words subsection listing every banned word: "Never use these words in any output: delve, tapestry, realm..." |
| "Headline under 12 words" | Add to Headline section: "Headlines must be 12 words or fewer. Count before finalizing." |
| "CTA uses action verb" | Add to CTA section: "Begin every CTA with an action verb: Get, Start, Book, Join, Download, Claim." |
| "Background color #0D0D0D" | Add to Design Specs: "Background color must be #0D0D0D (near-black). Do not use #000000 or any gray variant." |

### Pattern
```
Find the section most related to the failing assertion.
Add one declarative sentence stating the exact requirement.
Include the specific number, value, or constraint.
```

---

## Level 2: Add Example

**When:** A rule exists in SKILL.md but the output still violates it (rule is too abstract).
**What:** Add a concrete good/bad example showing the correct behavior.
**Risk:** Low-medium. May increase SKILL.md size but rarely conflicts.

### Examples

| Failed Assertion | Mutation |
|---|---|
| "PAS framework used" | Add example block: "**Good (PAS):** Problem: 'You're sending 500 cold emails and getting 0 replies.' Agitation: 'Every day without replies costs you $2,400 in lost revenue.' Solution: 'The Machine books 47 meetings/month on autopilot.' **Bad:** Starting with features or company description." |
| "Urgency is genuine" | Add example: "**Good:** 'Only 5 buildout spots available this month — we cap capacity to maintain quality.' **Bad:** 'Act now before it's too late!' 'Limited time offer!' (vague, no specifics)" |
| "Font size 48px+" | Add example: "**Correct:** `font-size: 48px` or `className='text-5xl'` **Wrong:** `font-size: 36px` or `className='text-3xl'`" |

### Pattern
```
Find the existing rule that should prevent the failure.
Add a "Good example / Bad example" block immediately after the rule.
The good example should EXACTLY match what passing looks like.
The bad example should EXACTLY match the failing output pattern.
```

---

## Level 3: Add Checklist

**When:** Multiple related assertions are failing — the output misses several requirements from the same area.
**What:** Add a verification checklist that maps 1:1 to the failing assertions.
**Risk:** Medium. May feel redundant with existing rules, but checklists are highly effective at forcing compliance.

### Examples

| Failed Assertions | Mutation |
|---|---|
| 3 copy quality assertions failing | Add "## Pre-Delivery Checklist" section: "Before finalizing copy, verify: [ ] No banned AI words [ ] No em dashes [ ] Reader addressed as 'you' [ ] Sentences average under 20 words [ ] At least 1 specific stat in first 50 words" |
| 4 design spec assertions failing | Add "## Design Spec Verification" section: "Before finalizing, confirm: [ ] Dimensions: {W}x{H}px [ ] Background: #0D0D0D [ ] Headline font: Big Shoulders, 48px+ [ ] Body font: Manrope, 16-30px [ ] Padding: 40-80px all sides [ ] Max 15 words per slide" |

### Pattern
```
Identify the cluster of related failing assertions.
Create a new section titled "Pre-Delivery Checklist" or "Verification Checklist."
List each requirement as a checkbox item, one per line.
Place the checklist LATE in the SKILL.md (near the output section) so it serves as a final gate.
```

---

## Level 4: Rewrite Section

**When:** A section has been patched 2+ times (Levels 1-3) and still produces failures.
**What:** Rewrite the entire section with clearer structure, explicit constraints, and examples.
**Risk:** Medium-high. May fix the target but break assertions handled by the old wording.

### Approach

1. Read the existing section in full.
2. Identify every assertion (passing AND failing) that relates to this section.
3. Rewrite the section to explicitly satisfy all related assertions.
4. Include at least one example per key constraint.
5. Use numbered lists for sequential steps, bullet lists for requirements.
6. Put the most-violated requirement FIRST in the section (primacy effect).

### Guard Rails

- Before rewriting, document which currently-passing assertions depend on this section.
- After rewriting, verify those assertions still pass in mental review.
- If the rewrite is longer than the original by 2x+, look for redundancy to trim.

---

## Level 5: Strategic Reversal

**When:** 3+ consecutive reverts on the same assertion across different strategies.
**What:** Try the opposite approach — if adding rules hasn't worked, try removing rules, or flip the framing.
**Risk:** High. This is experimental, but sometimes necessary when the obvious approaches aren't working.

### Strategies

| Stuck Pattern | Try Instead |
|---|---|
| Adding specific rules but output ignores them | Remove conflicting rules that may be overriding. Look for "always" statements that conflict with the failing assertion. |
| Adding examples but output copies the wrong parts | Remove all examples and use pure constraint language. Or replace with a single, perfect example. |
| Output oscillates (fixes A, breaks B, repeat) | Combine the two conflicting requirements into one unified rule. "Do X, and when doing X, ensure Y." |
| Rule is followed for some evals but not others | Add conditional logic: "For [context A], do X. For [context B], do Y." |
| Section is bloated from multiple patches | Strip section to bare minimum — just the 3 most critical rules. Delete everything else. |

### Nuclear Option

If the assertion has been attacked from 5+ different angles and still fails:

1. Check if the assertion itself is unreasonable (too subjective, impossible for LLM output).
2. If the assertion is valid, consider restructuring the SKILL.md's top-level architecture — the section order itself may be causing the issue (e.g., conflicting instructions early in the doc override later ones).
3. As a last resort, add the exact wording of the assertion as a rule: "The output MUST satisfy: '{assertion text}'." This is inelegant but sometimes effective.

---

## Mutation Selection Algorithm

When planning a mutation for iteration N:

```
1. List all failing assertions sorted by:
   a. Frequency of failure (fails in most evals first)
   b. Previous attempt count (fewer attempts = try first)

2. Select the top-priority failing assertion.

3. Check loop-log.json for previous mutations targeting this assertion:
   - If no previous attempts: Start at Level 1.
   - If Level 1 was reverted: Try Level 2.
   - If Level 2 was reverted: Try Level 3.
   - If Level 3 was reverted: Try Level 4.
   - If Level 4 was reverted: Try Level 5.
   - If Level 5 was reverted: Mark as "resistant" and move to next assertion.

4. Plan the mutation:
   - Write what section of SKILL.md to modify.
   - Write the exact change (add/modify/remove).
   - Write why this should fix the assertion.
   - Write which other assertions might be affected.

5. Apply exactly ONE change. Not two. Not "a small cleanup." One.
```

---

## Anti-Patterns (What NOT to Do)

| Anti-Pattern | Why It Fails |
|---|---|
| Add 3 rules at once | Can't tell which one helped or hurt. Revert wipes all 3. |
| Copy the assertion text verbatim as a rule | Gaming — produces technically compliant but low-quality output. |
| Add "IMPORTANT:" or "CRITICAL:" prefixes | These lose effectiveness quickly. Use structural placement instead. |
| Make the rule overly specific to one eval | Passes that eval, fails on future evals with different prompts. |
| Add contradictory rules | "Keep it short" + "Be comprehensive" → model freezes or oscillates. |
| Delete rules that were passing | Side effects — may break currently-passing assertions. |
| Rewrite the entire SKILL.md | Nuclear option that destroys all passing assertions. Use Level 4 on individual sections instead. |
