---
name: cold-email-ab-testing
description: "Full lifecycle A/B testing for cold email campaigns. Pre-launch: generate body and subject line variants with minimum thresholds (3/2/2/2) and verification gate. Post-launch: statistical winner analysis (z-test), pattern tracking, and optimization recommendations. Use when generating A/B variants, testing variants, checking which variant won, optimizing campaigns, or when someone says 'A/B test', 'generate variants', 'which variant is winning', 'campaign optimization', 'test my copy'. This is Step 3 of the 4-skill chain: strategy -> copywriting -> ab-testing -> campaign-deploy."
---

# Cold Email A/B Testing

Full lifecycle A/B testing: generate variants before launch, analyze winners after launch. This skill ensures every campaign has enough variants to optimize and provides data-driven recommendations for scaling winners.

**Skill chain:** `cold-email-strategy` -> `cold-email-copywriting` -> `cold-email-ab-testing` (you are here) -> `cold-email-campaign-deploy`

---

## Before You Start

**Read the knowledge base:**

| Working on... | Read first |
|---------------|-----------|
| A/B testing strategy | `Sequences/ab-testing-playbook.md` |
| Performance benchmarks | `Analytics/metrics-benchmarks.md` |

Knowledge base path: `/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/Cold Email/`

---

## Mode Detection

This skill operates in two modes based on context:

**Pre-Launch mode** (variant generation): Triggered when workspace has `copy/sequence.md` but no live campaign data. Or when user says "generate variants", "A/B test my copy", "create variants."

**Post-Launch mode** (winner analysis): Triggered when user asks about campaign performance, variant winners, or optimization. Or when user says "which variant won", "analyze my campaign", "optimize."

---

## Pre-Launch: Variant Generation

### Pre-Flight

1. Check workspace for `scripts/campaigns/{campaign-name}/copy/sequence.md`
2. If found, load all 4 email positions with their control copy, subject lines, and spintax
3. If NOT found, ask user to provide the control copy for each email position, or run `/cold-email-copywriting` first
4. Load strategy context from `strategy.md` if available (messaging angles inform variant approaches)

### Variant Minimums Per Position

Every email position MUST meet these minimums. Each position tests one variable (the approach/frame) while keeping tone, length, and CTA friction consistent across variants.

| Position | Min Body Variants | Test Variable | Why |
|----------|-------------------|---------------|-----|
| E1 (The Pitch) | **3** | Angle: pain vs proof vs curiosity vs RLM | First impression, most replies come from here. Max testing. |
| E2 (The Nudge) | **2** | Bump approach: data vs question vs new context | Short emails, test what re-engages |
| E3 (The Pivot) | **2** | Value lever: cost vs objection vs new offer | Different angle entirely |
| E4 (The Breakup) | **2** | Close approach: redirect vs direct ask vs humor | Last chance, test what converts stragglers |

**Total minimum: 9 steps** (3 + 2 + 2 + 2)

### Generating Variants

For each position, starting from the control copy:

1. **Identify the test variable** for this position (see table above)
2. **Write each variant with a descriptive label** (e.g., "Pain Dagger Opener" vs "Social Proof Opener" vs "Curiosity Hook Opener"). Labels make A/B results interpretable.
3. **Keep consistent across variants within a position:** tone, approximate length, CTA friction level, spintax structure
4. **Change only the approach/frame:** different angle, different hook, different proof point, different value lever
5. **Apply spintax** to each variant (platform-aware: Email Bison or Instantly)
6. **Generate 2-3 subject line variants** per position, testing one variable (length, format, personalization, tone)

### All variants must pass copy constraints

Every variant must meet the same constraints as the control (from the copywriting skill):
- Plain text, under 100 words (target 75), 6th grade reading level
- **No em dashes (—) or en dashes (–) anywhere.** Scan every variant character-by-character before output. Use commas, periods, or colons instead. This is the #1 deliverability killer in cold email.
- No signal references, no spam trigger words (free, guarantee, act now, limited time, risk-free)
- First name only personalization, sender signature token included
- Platform-correct spintax (see exact formats below)

### Spintax format by platform

**Email Bison** uses single curly braces:
```
{Hi|Hey|Hello} {FIRST_NAME}, ...
{Best|Cheers|Thanks},
{SENDER_EMAIL_SIGNATURE}
```
Personalization token: `{FIRST_NAME}`

**Instantly** uses double curly braces with RANDOM prefix:
```
{{RANDOM | Hi | Hey | Hello}} {{firstName}}, ...
{{RANDOM | Best | Cheers | Thanks}},
{SENDER_EMAIL_SIGNATURE}
```
Personalization token: `{{firstName}}`

**NEVER mix formats.** If the sequencer is Email Bison, every spintax block must use `{a|b|c}` single-brace format. If Instantly, every spintax block must use `{{RANDOM | a | b | c}}` double-brace format. Scan all variants before output to confirm correct format.

### Verification Gate (REQUIRED)

Before proceeding to deployment, count all body variants and verify:

```
E1 (Pitch):   >= 3 variants? [ ]
E2 (Nudge):   >= 2 variants? [ ]
E3 (Pivot):   >= 2 variants? [ ]
E4 (Breakup): >= 2 variants? [ ]
Total steps:  >= 9?          [ ]
```

**If any position is below its minimum, write additional variants before proceeding.** Do not skip this check. A campaign with single-variant positions wastes sending volume on untested copy.

---

## Post-Launch: Winner Analysis

### Data Collection

Fetch campaign analytics from the appropriate sequencer:

**Email Bison:**
```bash
curl -s -X POST "https://send.leadgenjay.com/api/campaigns/{id}/stats" \
  -H 'Authorization: Bearer {EMAIL_BISON_API_KEY}' \
  -H "Content-Type: application/json" \
  -d '{"date_from": "YYYY-MM-DD", "date_to": "YYYY-MM-DD"}'
```

**Instantly:**
```bash
curl -s -X GET "https://api.instantly.ai/api/v2/campaigns/{id}/analytics" \
  -H "Authorization: Bearer ${INSTANTLY_API_KEY}"
```

Also query the lead tracking DB for historical context:
```sql
SELECT campaign_id, campaign_name, total_sent, total_replied, reply_rate,
  total_bounced, bounce_rate, synced_at
FROM campaign_analytics
WHERE campaign_id = '{id}'
ORDER BY synced_at DESC LIMIT 2;
```

### Statistical Significance (Z-Test)

Use the z-test snippet in `references/z-test-snippet.py` or compute inline:

**Requirements for a valid test:**
- Minimum 100 sends per variant
- 95% confidence interval
- Run for at least 7 days
- Only test one variable at a time

### Decision Rules

| Status | Criteria | Action |
|--------|----------|--------|
| **Winner declared** | Significant at 95% CI, 100+ sends each | Deactivate losing variant |
| **Trending** | One variant leads but not yet significant | Continue, note the leader |
| **Equivalent** | 200+ sends each, no significance | Variants perform the same, retire either |
| **Insufficient data** | < 100 sends on any variant | Need more volume, continue |
| **Missing A/B** | Step has only 1 variant | Flag as missed optimization opportunity |

### Performance Benchmarks

| Metric | Excellent | Healthy | Warning | Critical |
|--------|-----------|---------|---------|----------|
| Reply Rate | >= 3% | >= 1% | 0.5-1% | < 0.5% |
| Bounce Rate | < 1% | < 3% | 3-5% | > 5% |
| Warmup Score | >= 95 | 85-95 | 80-85 | < 80 |

### Immediate Action Flags

- **STOP** if bounce rate > 5% on any campaign or domain
- **PAUSE** if reply rate < 0.5% after 200+ sends per variant
- **REDUCE VOLUME** if warmup score < 85 on any sender account
- **INVESTIGATE** if reply rate dropped > 1 percentage point vs previous snapshot

### Cross-Campaign Pattern Tracking

Across all campaigns, identify winning patterns:

| Pattern Type | Categories to Track |
|-------------|-------------------|
| Subject line format | Question vs statement vs name-first vs numeric |
| Subject length | Short (<5 words) vs medium (5-10) vs long (10+) |
| Opening style | Pain question, observation, compliment, direct pitch, social proof, curiosity hook |
| CTA type | Permission, direct, soft redirect, value-first, binary close |
| Messaging angle | Pain-based, proof-based, curiosity-based, value-gift, authority |

### Optimization Recommendations

Every recommendation MUST:
1. **Name the specific entity** (campaign name, variant label, domain)
2. **State the data** ("3.8% reply after 520 sends" not "good reply rate")
3. **Explain why** ("because variant B's pain question outperformed curiosity hook")
4. **State the action** ("deactivate Variant A, scale Variant B to full send volume")

Never output generic advice like "improve your subject lines" or "test more variants."

---

## Output & Handoff

### Pre-Launch Output

Write to `scripts/campaigns/{campaign-name}/ab-testing/variants.md`:
- All variants per position with labels
- Subject line variants per position
- Verification gate checklist (all passed)

Write to `scripts/campaigns/{campaign-name}/ab-testing/ab-schema.json`:
```json
{
  "positions": [
    {
      "email": 1,
      "purpose": "The Pitch",
      "day_offset": 0,
      "variants": [
        {"label": "Pain Dagger", "subject": "...", "body": "...", "is_control": true},
        {"label": "Social Proof", "subject": "...", "body": "...", "is_control": false},
        {"label": "Curiosity Hook", "subject": "...", "body": "...", "is_control": false}
      ]
    }
  ],
  "total_steps": 9,
  "verification_gate": "passed"
}
```

Update `.metadata.json`:
```json
{
  "phases": {
    "ab_testing": { "status": "complete", "completed_at": "{ISO}", "output": "ab-testing/variants.md" }
  }
}
```

Tell the user: "A/B variants generated and verified (9+ steps). Run `/cold-email-campaign-deploy` to deploy."

### Post-Launch Output

Write to `scripts/campaigns/{campaign-name}/ab-testing/analysis.md`:
- Per-variant performance with z-test results
- Winner declarations or trending status
- Cross-campaign pattern insights
- Prioritized recommendations (P0/P1/P2)

Present the summary in conversation and offer to expand any section.
