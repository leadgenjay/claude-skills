---
name: instantly-audit
description: "Comprehensive Instantly campaign audit — performance scoring, A/B test analysis, deliverability health, lead response trends, copy optimization, and prioritized recommendations. Use when auditing Instantly campaigns, reviewing campaign health, analyzing A/B test winners, checking deliverability, or generating optimization reports."
---

# Instantly Campaign Audit

Structured 7-phase audit workflow for Instantly campaigns. Pulls data from the Instantly API/MCP, the lead tracking DB, and synthesizes into a prioritized report with specific, actionable recommendations.

## When to Use

- "audit instantly" / "campaign audit" / "audit my campaigns"
- "how are my campaigns performing?"
- "check campaign health" / "deliverability check"
- "which A/B variants are winning?"
- "what should I optimize?"

## Prerequisites

- `INSTANTLY_API_KEY` set in `.env`
- Lead tracking DB configured (`scripts/db-query.sh`)
- Instantly MCP server configured in `.mcp.json` (optional, enriches analysis)

---

## Phase 1: Data Collection

### Step 1A: Sync Fresh Data

```bash
./scripts/sync-analytics.sh --sequencer instantly
```

### Step 1B: Fetch All Campaigns (MCP-first, curl fallback)

**MCP (preferred):**
Use Instantly MCP tool `list_campaigns` with `limit: 100`.

**curl fallback:**
```bash
source scripts/db-query.sh
curl -s -X GET "https://api.instantly.ai/api/v2/campaigns?limit=100" \
  -H "Authorization: Bearer ${INSTANTLY_API_KEY}" \
  -H "Content-Type: application/json"
```

Response shape: `{ items: [{ id, name, status, sequences, ... }] }`

Status codes: 0=draft, 1=active, 2=paused, 3=completed

### Step 1C: Fetch Per-Campaign Analytics

**MCP:** Use `get_campaign_analytics` per campaign ID.

**curl fallback:**
```bash
curl -s -X GET "https://api.instantly.ai/api/v2/campaigns/${CAMPAIGN_ID}/analytics" \
  -H "Authorization: Bearer ${INSTANTLY_API_KEY}" \
  -H "Content-Type: application/json"
```

Fields: `emails_sent_count`, `open_count`, `reply_count`, `bounced_count`, `unsubscribed_count`

### Step 1D: Fetch Sender Accounts

**MCP:** Use `list_accounts` with `limit: 100`.

**curl fallback:**
```bash
curl -s -X GET "https://api.instantly.ai/api/v2/accounts?limit=100" \
  -H "Authorization: Bearer ${INSTANTLY_API_KEY}" \
  -H "Content-Type: application/json"
```

### Step 1E: Extract A/B Variant Structure

From each campaign's `sequences[].steps[].variants[]`, extract:
- Step index, variant count, subject lines, body previews (first 80 chars)
- Variant IDs (needed for winner declaration)

### Step 1F: Pull Lead-Level Data (MCP only)

**MCP:** Use `list_leads` per campaign for trend analysis.

**Without MCP:** Skip per-lead analysis, note degraded coverage in report.

### Step 1G: Query DB for Historical Context

```sql
-- Latest campaign snapshots
SELECT campaign_id, campaign_name, total_sent, total_replied, reply_rate,
  total_bounced, bounce_rate, synced_at
FROM campaign_analytics
WHERE sequencer = 'instantly'
  AND synced_at = (SELECT MAX(synced_at) FROM campaign_analytics ca2
    WHERE ca2.campaign_id = campaign_analytics.campaign_id
    AND ca2.sequencer = 'instantly')
ORDER BY total_sent DESC;

-- Previous snapshot for trend comparison
SELECT campaign_id, total_sent, total_replied, reply_rate, bounce_rate, synced_at
FROM campaign_analytics
WHERE sequencer = 'instantly'
  AND synced_at < (SELECT MAX(synced_at) FROM campaign_analytics WHERE sequencer = 'instantly')
GROUP BY campaign_id
HAVING synced_at = MAX(synced_at);

-- Domain/mailbox health
SELECT d.domain, d.status, d.spf_configured, d.dkim_configured, d.dmarc_configured,
  COUNT(m.id) AS mailboxes,
  SUM(CASE WHEN m.status = 'active' THEN 1 ELSE 0 END) AS active_mailboxes,
  AVG(m.warmup_score) AS avg_warmup
FROM domains d
LEFT JOIN mailboxes m ON m.domain_id = d.id
WHERE m.sequencer = 'instantly' OR m.sequencer IS NULL
GROUP BY d.id
ORDER BY d.domain;
```

### Step 1H: Report Collection Summary (Gate)

Before proceeding, display:
```
Data Collection Summary
=======================
Campaigns found:     N (N active, N paused, N draft)
Sender accounts:     N
A/B variants:        N across N steps
DB snapshots:        N (latest: YYYY-MM-DD)
MCP available:       Yes/No (affects: per-lead analysis, variant-level stats)
```

If 0 campaigns found, STOP and report the issue.

---

## Phase 2: Campaign Performance Audit

### Benchmarks

| Metric | Excellent | Healthy | Warning | Critical |
|--------|-----------|---------|---------|----------|
| Reply Rate | >= 3% | >= 1% | 0.5-1% | < 0.5% |
| Bounce Rate | < 1% | < 3% | 3-5% | > 5% |
| Warmup Score | >= 95 | 85-95 | 80-85 | < 80 |

### Scoring Formula

For each campaign with 50+ sends:
```
score = 0
if reply_rate >= 3:    score += 40  # Excellent
elif reply_rate >= 1:  score += 25  # Healthy
elif reply_rate >= 0.5: score += 10 # Warning
else:                  score += 0   # Critical

if bounce_rate < 1:    score += 30  # Excellent
elif bounce_rate < 3:  score += 20  # Healthy
elif bounce_rate <= 5: score += 5   # Warning
else:                  score -= 20  # Critical (penalty)

# Volume bonus (campaigns that prove at scale)
if total_sent >= 1000: score += 15
elif total_sent >= 500: score += 10
elif total_sent >= 200: score += 5

# Reply quality bonus (if DB has classification data)
interested_pct = interested_replies / total_replies * 100
if interested_pct >= 50: score += 15
elif interested_pct >= 25: score += 10
```

Grade: A (80+), B (60-79), C (40-59), D (20-39), F (<20)

### Output Table

```
Campaign Performance Ranking
============================
Grade | Campaign               | Sent  | Reply% | Bounce% | Score | Action
──────┼────────────────────────┼───────┼────────┼─────────┼───────┼────────
  A   | Consulti - Agency v2   | 1,245 |  3.2%  |  1.1%   |  85   | Scale up
  C   | Magnexy - SaaS v1      |   340 |  0.8%  |  2.4%   |  45   | Fix copy
  F   | Test - Insurance        |   210 |  0.1%  |  6.2%   |  -5   | STOP NOW
```

### Immediate Action Flags

- **STOP** if bounce rate > 5% — pause campaign, re-verify list, check domain health
- **PAUSE** if reply rate < 0.5% after 200+ sends — rewrite copy before resuming
- **REDUCE VOLUME** if warmup score < 85 on any sender account
- **INVESTIGATE** if reply rate dropped > 1 percentage point vs previous snapshot

### Trend Analysis

Compare current vs previous DB snapshot:
```sql
-- Calculate deltas
SELECT
  curr.campaign_name,
  curr.reply_rate AS current_reply,
  prev.reply_rate AS previous_reply,
  ROUND(curr.reply_rate - prev.reply_rate, 2) AS reply_delta,
  curr.bounce_rate AS current_bounce,
  prev.bounce_rate AS previous_bounce,
  ROUND(curr.bounce_rate - prev.bounce_rate, 2) AS bounce_delta
FROM (
  SELECT campaign_id, campaign_name, reply_rate, bounce_rate
  FROM campaign_analytics WHERE sequencer = 'instantly'
  AND synced_at = (SELECT MAX(synced_at) FROM campaign_analytics WHERE sequencer = 'instantly')
) curr
LEFT JOIN (
  SELECT campaign_id, reply_rate, bounce_rate
  FROM campaign_analytics WHERE sequencer = 'instantly'
  AND synced_at = (
    SELECT MAX(synced_at) FROM campaign_analytics
    WHERE sequencer = 'instantly'
    AND synced_at < (SELECT MAX(synced_at) FROM campaign_analytics WHERE sequencer = 'instantly')
  )
) prev ON prev.campaign_id = curr.campaign_id;
```

Flag: reply drop > 1pp or bounce increase > 1pp between snapshots.

---

## Phase 3: A/B Test Analysis

### Extract Variants Per Step

From campaign data, map each step's variants:
```
Campaign: "Consulti - Agency v2"
  Step 1 (Day 0):
    Variant A: "Quick question about {{companyName}}" — 520 sent, 3.8% reply
    Variant B: "{{firstName}}, noticed something"   — 510 sent, 2.1% reply
  Step 2 (Day 3):
    Variant A (only): "Following up..."              — 380 sent, 1.6% reply
```

### Statistical Significance (Z-Test)

Use this embedded Python snippet to test two-proportion z-test:

```python
import math

def ab_significance(sent_a, replies_a, sent_b, replies_b, confidence=0.95):
    """Two-proportion z-test for A/B variant comparison.
    Returns dict with z_score, p_value, significant (bool), verdict (str).
    Requires 100+ sends per variant minimum for reliable results."""

    if sent_a < 100 or sent_b < 100:
        return {
            "z_score": 0, "p_value": 1, "significant": False,
            "verdict": f"Need more data (A:{sent_a}, B:{sent_b} — need 100+ each)"
        }

    p_a = replies_a / sent_a
    p_b = replies_b / sent_b
    p_pool = (replies_a + replies_b) / (sent_a + sent_b)

    if p_pool == 0 or p_pool == 1:
        return {
            "z_score": 0, "p_value": 1, "significant": False,
            "verdict": "Cannot compute (zero or 100% reply rate in both)"
        }

    se = math.sqrt(p_pool * (1 - p_pool) * (1/sent_a + 1/sent_b))
    if se == 0:
        return {"z_score": 0, "p_value": 1, "significant": False, "verdict": "Identical rates"}

    z = (p_a - p_b) / se
    # Two-tailed p-value using error function
    p_value = 1 - math.erf(abs(z) / math.sqrt(2))

    alpha = 1 - confidence
    significant = p_value < alpha

    if not significant:
        verdict = f"No significant difference (p={p_value:.4f})"
    elif p_a > p_b:
        verdict = f"Variant A wins (p={p_value:.4f}, {p_a*100:.1f}% vs {p_b*100:.1f}%)"
    else:
        verdict = f"Variant B wins (p={p_value:.4f}, {p_b*100:.1f}% vs {p_a*100:.1f}%)"

    return {"z_score": round(z, 4), "p_value": round(p_value, 4), "significant": significant, "verdict": verdict}
```

### A/B Decision Rules

1. **Winner declared** — significant at 95% CI with 100+ sends each: recommend deactivating loser
2. **Trending** — one variant leads but not yet significant: continue, note the leader
3. **Equivalent** — 200+ sends each, no significance: variants perform the same, can retire either
4. **Insufficient data** — < 100 sends on any variant: flag "need more volume"
5. **Missing A/B** — step has only 1 variant: flag "missed A/B opportunity"

### DB Cross-Reference (if copy_variants populated)

```sql
SELECT cv.campaign_id, cv.sequence_step, cv.variant_label,
  cv.subject_line, cv.status,
  COALESCE(ab.total_sent, 0) AS sent,
  COALESCE(ab.reply_rate, 0) AS reply_pct,
  COALESCE(ab.interest_rate, 0) AS interest_pct
FROM copy_variants cv
LEFT JOIN ab_test_results ab ON ab.variant_id = cv.id
  AND ab.calculated_at = (SELECT MAX(calculated_at) FROM ab_test_results WHERE variant_id = cv.id)
WHERE cv.sequencer = 'instantly'
ORDER BY cv.campaign_id, cv.sequence_step, cv.variant_label;
```

### Winning Patterns Tracker

Across all campaigns, identify patterns:
- Subject line format: question vs statement vs name-first
- Subject length: short (<5 words) vs medium (5-10) vs long (10+)
- Opening style: pain question, observation, compliment, direct pitch
- CTA type: permission ("mind if I send..."), direct ("let's chat"), soft redirect ("worth exploring?")

---

## Phase 4: Deliverability Audit

### Account Warmup Assessment

For each sender account from Instantly:
- Warmup status (enabled/disabled)
- Warmup score if available from DB
- Daily send limit vs actual volume

```sql
SELECT m.email_address, m.warmup_score, m.warmup_ready, m.warmup_enabled,
  m.daily_send_limit, m.daily_sent_today, m.status,
  d.domain, d.status AS domain_status
FROM mailboxes m
JOIN domains d ON d.id = m.domain_id
WHERE m.sequencer = 'instantly'
ORDER BY m.warmup_score ASC;
```

### DNS Health Check

```sql
SELECT d.domain, d.status,
  d.spf_configured AS spf, d.dkim_configured AS dkim, d.dmarc_configured AS dmarc,
  CASE WHEN d.spf_configured = 0 OR d.dkim_configured = 0 OR d.dmarc_configured = 0
    THEN 'INCOMPLETE' ELSE 'OK' END AS dns_health
FROM domains d
WHERE d.id IN (SELECT DISTINCT domain_id FROM mailboxes WHERE sequencer = 'instantly')
ORDER BY d.domain;
```

Flag any domain missing SPF, DKIM, or DMARC.

### Bounce Rate Per Domain

```sql
SELECT d.domain,
  COUNT(se.id) AS total_sent,
  SUM(CASE WHEN se.status = 'bounced' THEN 1 ELSE 0 END) AS bounced,
  ROUND(SUM(CASE WHEN se.status = 'bounced' THEN 1 ELSE 0 END) * 100.0 / COUNT(se.id), 2) AS bounce_rate
FROM sent_emails se
JOIN mailboxes m ON m.id = se.sender_mailbox_id
JOIN domains d ON d.id = m.domain_id
WHERE se.sequencer = 'instantly'
GROUP BY d.domain
HAVING COUNT(se.id) >= 10
ORDER BY bounce_rate DESC;
```

### Deliverability Output Table

```
Deliverability Health
=====================
Domain              | DNS   | Warmup | Bounce% | Mailboxes | Status
────────────────────┼───────┼────────┼─────────┼───────────┼───────
consulti-ai.com     | OK    |  97    |  1.2%   | 3 active  | Healthy
talk-consulti.com   | OK    |  82    |  3.1%   | 3 warming | Reduce volume
bad-domain.com      | MISS  |  65    |  7.3%   | 2 burned  | STOP — burned
```

### Critical Flags

- **BURNED** — bounce rate > 5% on a domain: stop all sending, retire domain
- **DNS INCOMPLETE** — missing SPF/DKIM/DMARC: fix immediately, do not send
- **LOW WARMUP** — score < 80: pause cold sending on that account
- **OVER LIMIT** — daily_sent_today >= daily_send_limit * 0.9: approaching daily cap

---

## Phase 5: Lead Response Trends

### Segment Analysis Queries

**Reply rate by job title:**
```sql
SELECT l.job_title, COUNT(*) AS total_leads,
  SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) AS replied,
  ROUND(SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS reply_pct
FROM leads l
JOIN campaign_assignments ca ON ca.lead_id = l.id AND ca.sequencer = 'instantly'
JOIN lead_analytics la ON la.assignment_id = ca.id
WHERE la.emails_sent > 0
GROUP BY l.job_title
HAVING COUNT(*) >= 10
ORDER BY reply_pct DESC;
```

**Reply rate by industry:**
```sql
SELECT l.industry, COUNT(*) AS total_leads,
  SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) AS replied,
  ROUND(SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS reply_pct
FROM leads l
JOIN campaign_assignments ca ON ca.lead_id = l.id AND ca.sequencer = 'instantly'
JOIN lead_analytics la ON la.assignment_id = ca.id
WHERE la.emails_sent > 0
GROUP BY l.industry
HAVING COUNT(*) >= 10
ORDER BY reply_pct DESC;
```

**Reply rate by company size:**
```sql
SELECT l.company_size, COUNT(*) AS total_leads,
  SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) AS replied,
  ROUND(SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS reply_pct
FROM leads l
JOIN campaign_assignments ca ON ca.lead_id = l.id AND ca.sequencer = 'instantly'
JOIN lead_analytics la ON la.assignment_id = ca.id
WHERE la.emails_sent > 0
GROUP BY l.company_size
HAVING COUNT(*) >= 10
ORDER BY reply_pct DESC;
```

**Reply rate by seniority:**
```sql
SELECT l.seniority, COUNT(*) AS total_leads,
  SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) AS replied,
  ROUND(SUM(CASE WHEN la.replied > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS reply_pct
FROM leads l
JOIN campaign_assignments ca ON ca.lead_id = l.id AND ca.sequencer = 'instantly'
JOIN lead_analytics la ON la.assignment_id = ca.id
WHERE la.emails_sent > 0
GROUP BY l.seniority
HAVING COUNT(*) >= 10
ORDER BY reply_pct DESC;
```

### Segment Classification

For each segment with 10+ leads:

| Category | Criteria | Action |
|----------|----------|--------|
| **Double down** | > 3% reply AND 50+ leads | Increase volume, build lookalike lists |
| **Promising** | 1-3% reply AND 50+ leads | Optimize copy, maintain volume |
| **Test more** | Any replies but < 50 leads | Increase sample size before deciding |
| **Exclude** | 0% reply AND 100+ leads | Remove from targeting, save budget |
| **Insufficient** | < 10 leads | Skip — not enough data |

### MCP Fallback

If no leads in DB for Instantly campaigns, use MCP `list_leads` per campaign:
```
list_leads(campaign_id="{id}", limit=100)
```
Parse in-memory and compute segment stats. Note in report: "Lead data from MCP (not persisted in DB)."

---

## Phase 6: Copy Performance Analysis

### Subject Line Analysis

Categorize each subject line variant:

**Format:**
- Question — ends with `?` ("Quick question about {{companyName}}")
- Statement — declarative ("Noticed something about {{companyName}}")
- Name-first — starts with `{{firstName}}` or first name token
- Numeric — contains numbers ("3 ideas for {{companyName}}")

**Length:**
- Short: < 5 words
- Medium: 5-10 words
- Long: > 10 words

**Personalization:**
- Company mention: contains `{{companyName}}` or company token
- Name mention: contains `{{firstName}}`
- Industry mention: contains `{{industry}}` or specific vertical
- None: generic subject

### Opening Line Analysis

Classify the first sentence of each body variant:

| Style | Pattern | Example |
|-------|---------|---------|
| Pain question | Asks about a problem | "Struggling to get replies from cold email?" |
| Observation | References something specific | "Noticed {{companyName}} is expanding..." |
| Compliment | Opens with praise | "Love what you're doing at {{companyName}}" |
| Direct pitch | States the offer immediately | "We help agencies book 10+ meetings/month" |
| Social proof | Leads with credibility | "We just helped [client] achieve [result]" |
| Curiosity hook | Teases without revealing | "Found something interesting about {{companyName}}" |

### CTA Analysis

Classify the call-to-action in each variant:

| Type | Pattern | Example |
|------|---------|---------|
| Permission | Asks for permission to share more | "Mind if I send over a quick case study?" |
| Direct | Asks for a meeting/call | "Free for a 15-min chat this week?" |
| Soft redirect | Low-commitment next step | "Worth exploring?" |
| Value-first | Offers something free | "Happy to send you our playbook" |
| Binary close | Yes/no question | "Is this something you'd be open to?" |

### Cross-Campaign Pattern Table

```
Copy Pattern Performance
========================
Pattern             | Campaigns | Avg Reply% | Best Campaign | Worst Campaign
────────────────────┼───────────┼────────────┼───────────────┼───────────────
Question subject    |     4     |   2.8%     | Agency v2     | Insurance v1
Pain opener         |     3     |   3.1%     | SaaS v2       | Retail v1
Permission CTA      |     5     |   2.4%     | Agency v2     | Insurance v1
Name-first subject  |     2     |   1.9%     | SaaS v1       | —
```

### Messaging Angle Analysis

Track which angles perform best:
- **Pain-based** — focuses on a problem the prospect has
- **Proof-based** — leads with results/case studies
- **Curiosity-based** — teases without full reveal
- **Value-gift** — offers free resource upfront
- **Authority** — positions sender as expert

---

## Phase 7: Recommendations Report

### Save Report

Save full detailed report to:
```
scripts/audits/instantly-YYYY-MM-DD.md
```

### Report Structure

```markdown
# Instantly Campaign Audit — YYYY-MM-DD

## Executive Summary
- N campaigns audited (N active, N paused)
- Overall reply rate: X.X% (benchmark: 1-3%)
- Overall bounce rate: X.X% (benchmark: <3%)
- Top performer: [Campaign Name] (X.X% reply)
- Biggest concern: [specific issue]

## P0 — Do Today
1. [STOP] Campaign "X" — bounce rate 6.2%, re-verify list before resuming
2. [FIX] Domain bad-domain.com — missing DKIM record, all mail going to spam
3. [PAUSE] Accounts jay@bad-domain.com — warmup score 62, needs 4+ more weeks

## P1 — This Week
4. [WINNER] Campaign "Y" Step 1 — Variant A wins (3.8% vs 2.1%, p=0.02), deactivate B
5. [REWRITE] Campaign "Z" — 0.3% reply after 450 sends, test new pain-based opener
6. [ADD A/B] Campaign "W" Step 2 — only 1 variant, missing optimization opportunity

## P2 — This Month
7. [SCALE] Double down on "Owner" job title segment — 4.2% reply across 120 leads
8. [EXCLUDE] Remove "Manager" seniority from targeting — 0% reply across 150 leads
9. [TEST] Try curiosity-based subject lines — pain questions winning at 3.1% vs 1.9%

## Detailed Sections
### Campaign Scorecard
[Phase 2 output table]

### A/B Test Results
[Phase 3 output tables]

### Deliverability Health
[Phase 4 output table]

### Lead Response Segments
[Phase 5 output tables]

### Copy Pattern Analysis
[Phase 6 output tables]
```

### Recommendation Rules

Every recommendation MUST:
1. **Name the specific entity** — campaign name, domain, variant label, segment
2. **State the data** — "3.8% reply after 520 sends" not "good reply rate"
3. **Explain why** — "because bounce rate exceeds 5% threshold"
4. **State the action** — "pause campaign and re-verify the remaining 180 leads"

NEVER output generic advice like "improve your subject lines" or "test more variants."

### Conversation Output

Present the **Executive Summary + P0/P1/P2 actions** in conversation first (keep concise).

Then say: "Full audit saved to `scripts/audits/instantly-YYYY-MM-DD.md`. Want me to expand any section?"

---

## Quick Reference: All SQL Queries

### Campaign performance (latest snapshot)
```sql
SELECT campaign_id, campaign_name, total_sent, total_replied, reply_rate,
  total_bounced, bounce_rate, synced_at
FROM campaign_analytics
WHERE sequencer = 'instantly'
  AND synced_at = (SELECT MAX(synced_at) FROM campaign_analytics ca2
    WHERE ca2.campaign_id = campaign_analytics.campaign_id
    AND ca2.sequencer = 'instantly')
ORDER BY total_sent DESC;
```

### Interested replies breakdown
```sql
SELECT ca.campaign_name,
  COUNT(r.id) AS total_replies,
  SUM(CASE WHEN r.classification = 'interested' THEN 1 ELSE 0 END) AS interested,
  SUM(CASE WHEN r.classification = 'not_interested' THEN 1 ELSE 0 END) AS not_interested,
  SUM(CASE WHEN r.classification = 'ooo' THEN 1 ELSE 0 END) AS ooo,
  SUM(CASE WHEN r.classification = 'wrong_person' THEN 1 ELSE 0 END) AS wrong_person
FROM replies r
JOIN campaign_assignments ca ON ca.id = r.assignment_id
WHERE ca.sequencer = 'instantly'
GROUP BY ca.campaign_id
ORDER BY interested DESC;
```

### Mailboxes approaching daily limit
```sql
SELECT m.email_address, m.daily_sent_today, m.daily_send_limit,
  d.domain, m.warmup_score
FROM mailboxes m
JOIN domains d ON d.id = m.domain_id
WHERE m.sequencer = 'instantly' AND m.status = 'active'
  AND m.daily_sent_today >= m.daily_send_limit * 0.8
ORDER BY m.daily_sent_today DESC;
```

### Unclassified replies needing review
```sql
SELECT r.id, l.first_name, l.last_name, l.email, l.company_name,
  ca.campaign_name, r.replied_at
FROM replies r
JOIN leads l ON l.id = r.lead_id
JOIN campaign_assignments ca ON ca.id = r.assignment_id
WHERE ca.sequencer = 'instantly' AND r.classification IS NULL
ORDER BY r.replied_at DESC;
```

---

## Degraded Mode (No MCP)

When Instantly MCP is unavailable, the audit still works but with reduced coverage:

| Phase | With MCP | Without MCP |
|-------|----------|-------------|
| 1. Data Collection | Full campaign + lead data | Campaign-level only via curl |
| 2. Performance | Full | Full (uses DB snapshots) |
| 3. A/B Tests | Variant-level stats from MCP | Structure from campaign JSON, stats from DB |
| 4. Deliverability | Account warmup from MCP | DB warmup scores (may be stale) |
| 5. Lead Trends | Per-lead data from MCP | DB lead_analytics (requires prior sync) |
| 6. Copy Analysis | Full variant content | Structure from campaign JSON |
| 7. Recommendations | Full | Full (slightly less granular) |

Note degraded areas in the report header.
