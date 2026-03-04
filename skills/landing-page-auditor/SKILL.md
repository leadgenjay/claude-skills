---
name: landing-page-auditor
description: Perform systematic conversion audits on landing pages with scoring and prioritized recommendations. This skill should be used when reviewing landing pages for optimization opportunities, identifying conversion blockers, or preparing improvement recommendations. Integrates with /improve-site command.
---

# Landing Page Auditor

This skill provides a systematic framework for auditing landing pages and identifying high-impact optimization opportunities.

## When to Use

- Reviewing landing pages before launch
- Analyzing underperforming pages
- Preparing optimization recommendations
- Identifying conversion blockers
- Prioritizing improvement efforts
- Supporting `/improve-site` command

## Audit Workflow

### Step 1: First Impression Test (5 seconds)

View the page for exactly 5 seconds, then answer:
- What is the page offering?
- Who is it for?
- What should I do next?
- Why should I trust this?

If any answer is unclear → Critical issue.

### Step 2: Section-by-Section Audit

Run through each section using the checklist in `references/audit-checklist.md`.

### Step 3: Score the Page

Use the scoring system below to quantify issues.

### Step 4: Prioritize Recommendations

Rank fixes by Impact × Effort matrix.

## Scoring System

### Category Weights

| Category | Weight | Max Points |
|----------|--------|------------|
| Above-Fold | 25% | 25 |
| Copy & Messaging | 20% | 20 |
| CTA & Conversion Path | 20% | 20 |
| Trust & Social Proof | 15% | 15 |
| Design & UX | 10% | 10 |
| Technical Performance | 10% | 10 |

**Total Possible: 100 points**

### Score Interpretation

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Excellent | Minor optimizations only |
| 80-89 | Good | A/B test improvements |
| 70-79 | Fair | Multiple issues to address |
| 60-69 | Needs Work | Significant improvements needed |
| Below 60 | Poor | Major overhaul recommended |

## Quick Audit Framework

### Above-Fold Essentials (25 points)

- [ ] Clear headline stating the value proposition (0-5)
- [ ] Supporting subheadline with specifics (0-3)
- [ ] Visible CTA without scrolling (0-5)
- [ ] Relevant hero image or visual (0-4)
- [ ] Trust indicator present (0-3)
- [ ] Load time under 3 seconds (0-5)

### Copy & Messaging (20 points)

- [ ] Headline addresses reader directly (0-3)
- [ ] Benefits over features (0-4)
- [ ] Problem clearly articulated (0-3)
- [ ] Solution clearly explained (0-3)
- [ ] Objections addressed (0-3)
- [ ] Appropriate length for offer (0-4)

### CTA & Conversion Path (20 points)

- [ ] Single clear primary CTA (0-5)
- [ ] CTA copy is action-oriented (0-3)
- [ ] CTA stands out visually (0-4)
- [ ] Form fields minimized (0-3)
- [ ] Clear next step explained (0-3)
- [ ] No competing CTAs (0-2)

### Trust & Social Proof (15 points)

- [ ] Testimonials with specifics (0-4)
- [ ] Case studies or results (0-3)
- [ ] Trust badges present (0-2)
- [ ] Client logos or "as seen in" (0-2)
- [ ] Guarantee or risk reversal (0-2)
- [ ] Contact information visible (0-2)

### Design & UX (10 points)

- [ ] Visual hierarchy clear (0-3)
- [ ] Consistent branding (0-2)
- [ ] Readable typography (0-2)
- [ ] Mobile responsive (0-3)

### Technical Performance (10 points)

- [ ] Page loads in under 3s (0-4)
- [ ] No broken elements (0-2)
- [ ] Forms work correctly (0-2)
- [ ] Analytics tracking present (0-2)

## Common Conversion Killers

### Critical (Fix Immediately)

1. **No clear CTA** - Visitors don't know what to do
2. **Slow load time** - Every second costs conversions
3. **Unclear value proposition** - Why should they care?
4. **No trust signals** - Why should they believe you?
5. **Mobile broken** - 50%+ traffic is mobile

### High Priority (Fix Soon)

6. **Too many CTAs** - Paradox of choice kills action
7. **Weak headline** - Not benefit-focused
8. **Long forms** - Every field reduces conversions
9. **No social proof** - Testimonials matter
10. **Generic copy** - "We're the best" means nothing

### Medium Priority (Optimize)

11. **Poor visual hierarchy** - Eye doesn't flow naturally
12. **Friction in process** - Too many steps
13. **Lack of urgency** - No reason to act now
14. **Missing guarantee** - Risk not reversed
15. **Below-fold CTA only** - Some won't scroll

## Priority Matrix

### High Impact + Easy Fix (Do First)
- Rewrite weak headline
- Add testimonial
- Improve CTA copy
- Add trust badges
- Shorten forms

### High Impact + Hard Fix (Plan For)
- Page speed optimization
- Complete copy overhaul
- Mobile redesign
- New hero section

### Low Impact + Easy Fix (Quick Wins)
- Button color tests
- Image swaps
- Micro-copy improvements
- Form field labels

### Low Impact + Hard Fix (Skip Unless Necessary)
- Complete redesign
- Platform migration
- Animation additions

## Audit Report Format

```
## Landing Page Audit Report

**Page:** [URL]
**Date:** [Date]
**Overall Score:** [X]/100 ([Rating])

### Executive Summary
[2-3 sentences on overall findings]

### Scores by Category
- Above-Fold: X/25
- Copy & Messaging: X/20
- CTA & Conversion Path: X/20
- Trust & Social Proof: X/15
- Design & UX: X/10
- Technical: X/10

### Critical Issues (Fix Immediately)
1. [Issue] - [Recommendation]
2. [Issue] - [Recommendation]

### High Priority Improvements
1. [Issue] - [Recommendation]
2. [Issue] - [Recommendation]

### Quick Wins
1. [Issue] - [Recommendation]

### Detailed Findings
[Section-by-section analysis]
```

## Integration with Lead Gen Jay

When auditing pages:

1. Use this skill's framework for systematic analysis
2. Reference `dan-kennedy-copywriter` skill for copy improvements
3. Reference `conversion-copywriting` skill for awareness matching
4. Reference `social-proof-builder` skill for trust elements
5. Use `/improve-site` command to implement recommendations

## Reference Materials

For complete checklist, consult:
- `references/audit-checklist.md` - 50+ point detailed checklist
