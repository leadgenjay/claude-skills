---
name: campaign-analytics
description: "Analyze cold email campaign performance and optimize results. Use when reviewing campaign stats, evaluating A/B tests, checking deliverability health, or making optimization recommendations."
---

# Campaign Analytics & Optimization

## Performance Benchmarks

### Reply Rate (Primary Metric)
- >= 3% — Excellent
- >= 1% — Healthy
- < 1% — Needs improvement
- < 0.5% — Critical — pause and fix

### Bounce Rate
- < 3% — Healthy
- 3-5% — Warning — check email verification
- > 5% — Critical — STOP sending, re-verify list

### Open Rate (Reference Only)
With open tracking OFF (recommended), open rate is unreliable. Use reply rate as primary metric.
- If tracking is ON: >= 40% healthy, < 20% indicates deliverability issues

### Warmup Score
- >= 95 — Good, safe to send
- 80-95 — Warning, reduce volume
- < 80 — Critical — pause cold sending, focus on warmup

### Unsubscribe Rate
- < 0.5% — Healthy
- 0.5-1% — Monitor
- > 1% — Review targeting and copy

## Analysis Workflow

### 1. Fetch Data
- Email Bison: `POST /campaigns/{id}/stats` with date range
- Instantly: `GET /campaigns/analytics?campaign_id={id}`

### 2. Calculate Metrics
```
replyRate = (totalReplied / totalSent) * 100
bounceRate = (totalBounced / totalSent) * 100
openRate = (totalOpened / totalSent) * 100
unsubscribeRate = (totalUnsubscribed / totalSent) * 100
```

### 3. Diagnose Issues

**Low reply rate + normal bounce rate:**
- Copy issue — rewrite subject lines and opening lines
- Targeting issue — refine ICP
- Timing issue — adjust send times

**High bounce rate:**
- List quality issue — re-verify emails before sending
- Domain reputation — check blacklists
- Infrastructure issue — check SPF/DKIM/DMARC

**Low warmup score:**
- Too many cold emails too fast — reduce daily limit
- Domain age too young — extend warmup period
- Poor email content — improve warmup reply rate

### 4. A/B Test Evaluation
Compare variants on reply rate (primary) or positive reply rate if available:
- Need minimum 100 sends per variant
- Calculate statistical significance (95% CI)
- Winner = higher reply rate with statistical significance
- If no significance after 200+ sends per variant, variants are equivalent

### 5. Optimization Actions
- **Deactivate losing variants** — Email Bison: `PATCH /campaigns/sequence-steps/{id}/activate-or-deactivate`
- **Pause underperforming campaigns** — reply rate < 0.5% for 7+ days
- **Adjust send limits** — reduce if deliverability degrades
- **Rotate domains** — if domain reputation drops

## Reporting Template
When presenting analytics, include:
1. Campaign name and date range
2. Total sent / replies / bounces
3. Key rates vs benchmarks (with color coding)
4. Per-variant performance comparison
5. Recommendations (specific, actionable)
