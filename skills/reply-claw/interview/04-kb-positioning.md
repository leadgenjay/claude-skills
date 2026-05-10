# Phase 4 — Knowledge Base: Positioning & Pricing

## Purpose
Collect the company's value prop, ICP, differentiators, and pricing posture to populate company-facts and pricing-posture KB files.

## Pre-checks
- None

## Questions

### Q1 — Company Pitch
**Header**: "Company pitch"
**Type**: free-text
**Question**: "In one sentence, what does your company sell? (Example: 'We help agencies scale cold email with AI-powered reply automation.')"
**Validation**: Non-empty, max 200 chars
**Persists to**: `config.kb.company_pitch`

### Q2 — Ideal Customer Profile (ICP)
**Header**: "ICP"
**Type**: free-text
**Question**: "Who's the ideal buyer? Describe by job title and company size. (Example: 'Marketing Director at 10-100 person B2B SaaS')"
**Validation**: Non-empty, max 300 chars
**Persists to**: `config.kb.icp_description`

### Q3 — Headline Outcome
**Header**: "Outcome"
**Type**: free-text
**Question**: "What's the key outcome your buyer gets? (1-2 sentences. Example: 'Increase reply rate by 40% and close deals 50% faster.')"
**Validation**: Non-empty, max 300 chars
**Persists to**: `config.kb.headline_outcome`

### Q4 — Differentiators
**Header**: "Differentiators"
**Type**: free-text
**Question**: "List 3 things that make you different from competitors. (One per line.)"
**Validation**: Non-empty; parse as 3 items
**Persists to**: `config.kb.differentiators[]`

### Q5 — Pricing Posture
**Header**: "Pricing posture"
**Type**: AskUserQuestion (single-select)
**Question**: "On first reply, should the agent: (Recommend: b — defer to call)"
**Options**:
- "a) Share pricing details upfront"
- "b) Defer pricing to a discovery call"
- "c) Share price range only"
**Persists to**: `config.kb.pricing_posture` (values: "share_upfront", "defer_to_call", "range_only")

### Q6 — Post-Reply Pricing Details
**Header**: "Post-reply pricing"
**Type**: free-text
**Question**: "What pricing details ARE OK to share once they reply? (E.g., 'Starting at $X/mo', 'X% of revenue recovered', etc.) Leave blank if none."
**Validation**: Optional, max 500 chars
**Persists to**: `config.kb.post_reply_pricing`

### Q7 — Never-Share Pricing (optional guidance)
**Header**: "Never share"
**Type**: (informational, no question)
**Display**: "These should NEVER appear in a reply: Enterprise pricing, custom quotes, discounts, competitor price comparisons."
**Action**: None (informational only)
