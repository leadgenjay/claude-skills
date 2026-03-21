# A/B Test Decision Framework

When to call winners, how to handle inconclusive data, and how to conclude tests.

---

## Decision Tree

Apply these rules in order for each active test:

### 1. Clear Winner
**When:** 95%+ confidence between leader and runner-up
**Action:** Recommend declaring winner immediately
**Label:** "Ready — declare winner"

### 2. Likely Winner
**When:** 90-95% confidence AND 500+ total views
**Action:** Recommend declaring with high conviction
**Label:** "Likely winner — recommend concluding"

### 3. Early Leader
**When:** One variant is 30%+ ahead of all others AND 200+ total views
**Action:** Recommend with practical significance note
**Label:** "Early leader — strong directional signal, consider concluding"

### 4. Confirmed Loser
**When:** A variant has been disabled (manually turned off)
**Action:** Mark as loser automatically — no statistical proof needed
**Label:** "Loser (disabled)"
**Rule:** If the user disabled it, it was underperforming. Don't second-guess.

### 5. Inconclusive
**When:** <90% confidence after 1000+ total views
**Action:** Present leading variant as "most likely winner" with full stats. Let user choose to conclude or keep running.
**Label:** "Inconclusive — present options"

### 6. Too Early
**When:** <14 days running OR <200 total views
**Action:** Keep running. Don't make decisions on insufficient data.
**Label:** "Collecting data — too early to call"

### 7. Max Runtime
**When:** Test has been running 60+ days without a clear winner
**Action:** Present most likely winner and recommend concluding. Tests shouldn't run forever.
**Label:** "Max runtime reached — recommend concluding"

### 8. Broken / No Data
**When:** Active test with 0 events after 7+ days
**Action:** Flag as broken. Investigate tracking setup.
**Label:** "Broken — investigate tracking"

---

## Key Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| **Minimum runtime** | 14 days | Two full business cycles to account for day-of-week variation |
| **Maximum runtime** | 60 days | Diminishing returns; opportunity cost of not testing the next idea |
| **Never auto-conclude** | Always confirm | Present recommendation and ask user to approve |
| **Disabled = loser** | No stats needed | Manual disable is an explicit judgment call |
| **Minimum views** | 200 total | Below this, results are too noisy to trust |
| **Minimum conversions** | 10 per variant | Below this, a single visitor can swing the rate dramatically |

---

## Conclusion Workflow

When concluding a test after user approval:

### Step 1: Record Final Stats

Pull from `ab_test_events`:
- Views per variant
- Conversions per variant
- Conversion rates
- Confidence between winner and runner-up

### Step 2: Update Registry

```text
POST /api/ab-test/toggle
{
  "testId": "[test_id]",
  "action": "stop",
  "winnerId": "[variant_id]"
}
```

This sets `status='completed'`, `winner_variant_id`, `concluded_at`, `is_active=false`.

### Step 3: Document Results

Update the test's `description` field:

```text
PATCH /api/ab-test/[testId]
{
  "description": "[Results using template below]"
}
```

**Results template:**
```text
## Results: [test_id]

**Duration:** X days (YYYY-MM-DD to YYYY-MM-DD)
**Total Views:** X | **Total Conversions:** X
**Confidence:** X% (z-test, two-tailed)

### Winner: [variant_name] — [description]
- Conversion rate: X%
- Lift vs control: +X%

### Losers
- [variant_name]: X% (-X% vs control) — [why it lost]

### Learning
[What we learned about the audience from this test]

### Next Test
[Follow-up test based on results, or "No follow-up needed"]
```

### Step 4: Apply Winner to Code

If the page component has variant conditional rendering:
1. Find the variant rendering logic (e.g., `if (variantId === "a") ...`)
2. Remove the conditionals
3. Keep the winning variant's content as the single default
4. Remove unused variant code

### Step 5: Update CHANGELOG

Add entry under `## [Unreleased]` → `### Changed`:
```text
- A/B test [test_id]: declared [variant] winner (+X% conversion vs control)
```

### Step 6: Status Management for Sequential Rounds

When concluding and starting a new round on the same `path_pattern`:
1. Ensure old test is `status: 'completed'` before activating new test
2. The middleware uses STATUS_PRIORITY (active > paused > completed)
3. If both old and new are `active`, behavior is unpredictable
4. Safe pattern: conclude old → create new as `draft` → activate new

---

## Visual Verification (Required for Layout Tests)

When a test changes element placement, layout, or visual design (not just copy), verify before concluding:

**Run for each variant on both desktop (1440px) and mobile (390px):**

- [ ] No layout overflow or clipping on mobile
- [ ] No text truncation on CTA buttons
- [ ] Correct element ordering
- [ ] Sticky elements still work with new layout
- [ ] Mobile sticky CTA not blocked by new elements
- [ ] Forms still usable on mobile
- [ ] Images properly sized and not cropped

**When to apply:** Any test that modifies placement, order, visibility, or layout.
**Skip for:** Pure copy-change tests (headline text, CTA text).

---

## Stopping Without a Winner

Sometimes tests don't produce a winner. That's OK — it's still learning.

**Workflow:**
1. Pull final stats and present them
2. Note the leading variant as "most likely winner"
3. Confirm with user
4. Toggle to completed (no `winner_variant_id`)
5. Document learnings in description

**Common reasons for inconclusive results:**
- Not enough traffic (test ran on a low-traffic page)
- The change was too subtle to matter
- External factors (seasonality, ad campaigns) muddied results
- Both variants are equally good (the original was already strong)

---

## Iteration Planning

After concluding a test, plan the next one:

1. **Winner becomes new control** — The winning variant is now the baseline
2. **Never test the same hypothesis twice** — Find a new angle
3. **Build on learnings** — If benefit-focused headlines won, test which specific benefit resonates most
4. **Use PIE framework** — Score follow-up hypotheses before committing
5. **Round numbering** — Use clear IDs: `pricing-v1`, `pricing-v2`, `pricing-v3`
6. **No cleanup needed** — Old completed tests stay in the database; STATUS_PRIORITY handles routing

---

## Auto-Winner Selection

When enabled globally (via `app_settings`), tests automatically conclude when confidence reaches the threshold.

**Configuration:**
- `confidenceThreshold`: 90 or 95
- `autoSelectWinner`: true/false
- `webhookUrl`: notification URL

**Auto-winner webhook payload:**
```json
{
  "event": "ab_test_winner_selected",
  "timestamp": "2026-03-15T10:30:00Z",
  "test": {
    "id": "pricing-headline-v1",
    "name": "Pricing Headline Test",
    "pathPattern": "/pricing",
    "durationDays": 14
  },
  "winner": {
    "id": "a",
    "name": "Benefit-Focused",
    "conversionRate": 7.5,
    "views": 500,
    "conversions": 38
  },
  "confidence": 95.2,
  "selectionMethod": "auto"
}
```

**Important:** Always verify auto-selected winners manually. Auto-winner is a notification, not a substitute for human judgment.
