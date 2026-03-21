# A/B Test Hypothesis Library

Ready-to-use test ideas organized by element type, with hypothesis templates and PIE scoring.

---

## Hypothesis Template

Every test starts with a formal hypothesis:

```bash
Based on [observation/data],
we believe that [change]
will result in [expected outcome]
because [rationale].

We'll measure this by [metric]
and consider it successful if [success criteria].
```

---

## PIE Scoring Framework

Score each test on three factors (1-10):

### P — Potential
How much improvement could this test make?
- **10:** Could double conversions
- **7:** Significant improvement likely
- **5:** Moderate improvement possible
- **3:** Small improvement possible
- **1:** Minimal impact expected

### I — Importance
How valuable is the traffic/page being tested?
- **10:** Highest-traffic, highest-value page
- **7:** High-traffic or key conversion step
- **5:** Medium-traffic page
- **3:** Low-traffic page
- **1:** Minimal traffic or low-value page

### E — Ease
How easy is this test to implement?
- **10:** Copy change only
- **7:** Simple design change
- **5:** Moderate development needed
- **3:** Significant development needed
- **1:** Major rebuild required

**PIE Score = (P + I + E) / 3**

### Prioritization Tiers

| Score | Priority | Action |
|-------|----------|--------|
| 8-10 | Run Now | Highest impact, easiest wins |
| 6-7.9 | Next Up | Strong candidates |
| 4-5.9 | Backlog | Run when capacity allows |
| Below 4 | Skip | Low ROI on testing effort |

---

## Headline Tests (Highest Impact)

### Test 1: Benefit vs Curiosity
**Control:** "Get More Leads for Your Business"
**Variation:** "The Lead Generation Secret Top Agencies Don't Share"

**Hypothesis:** Curiosity-driven headlines increase scroll depth because visitors want to discover the "secret" mentioned.

**Metrics:** Scroll depth, time on page, CTA clicks

### Test 2: Specific Numbers vs Vague Claims
**Control:** "Grow Your Business Fast"
**Variation:** "Generate 47 Qualified Leads in 30 Days"

**Hypothesis:** Specific numbers increase credibility and clicks because specificity implies proof.

**Metrics:** CTA click rate, form submissions

### Test 3: Problem vs Solution Focus
**Control:** "The Complete Lead Generation System"
**Variation:** "Stop Wasting Time on Cold Leads That Never Convert"

**Hypothesis:** Problem-focused headlines resonate more with problem-aware audiences because they validate frustration.

**Metrics:** Bounce rate, CTA clicks

### Test 4: Question vs Statement
**Control:** "Finally, a System That Works"
**Variation:** "Tired of Leads That Never Convert?"

**Hypothesis:** Question headlines increase engagement because they prompt mental agreement.

**Metrics:** Time on page, scroll depth

---

## CTA Tests (High Impact)

### Test 5: Action Verb Variations
**Control:** "Submit"
**Variation A:** "Get Instant Access"
**Variation B:** "Start My Free Trial"
**Variation C:** "Claim My Spot"

**Hypothesis:** Benefit-oriented CTA copy outperforms generic "Submit" because it tells visitors what they get.

**Metrics:** Button click rate, form completion

### Test 6: First Person vs Second Person
**Control:** "Start Your Free Trial"
**Variation:** "Start My Free Trial"

**Hypothesis:** First-person creates psychological ownership that increases clicks.

**Metrics:** CTA click rate

### Test 7: CTA Placement
**Control:** CTA only at bottom of page
**Variation:** CTA above fold + after each section + at bottom

**Hypothesis:** Multiple CTAs increase conversions because visitors have different decision points.

**Metrics:** Total conversions, scroll depth to conversion

### Test 8: CTA with Reassurance
**Control:** "Get Started"
**Variation:** "Get Started" + "No credit card required" below

**Hypothesis:** Reassurance text reduces perceived risk and increases clicks.

**Metrics:** CTA click rate, form starts

---

## Form Tests (Medium-High Impact)

### Test 9: Number of Fields
**Control:** Name, Email, Phone, Company, Job Title (5 fields)
**Variation:** Name, Email (2 fields)

**Hypothesis:** Fewer fields increase completion because each field adds friction.

**Metrics:** Form completion rate, lead quality

### Test 10: Single Page vs Multi-Step
**Control:** All fields on one page
**Variation:** Step 1 (email) → Step 2 (name, phone) → Step 3 (details)

**Hypothesis:** Multi-step forms increase completion via commitment-consistency principle.

**Metrics:** Form start rate, completion rate, drop-off by step

### Test 11: Required vs Optional Fields
**Control:** All fields required
**Variation:** Only email required, others optional

**Hypothesis:** Optional fields reduce abandonment while still collecting data from willing users.

**Metrics:** Form completion rate, data completeness

---

## Social Proof Tests (Medium Impact)

### Test 12: Testimonial Placement
**Control:** Testimonials at bottom of page
**Variation:** Testimonials immediately after headline

**Hypothesis:** Earlier testimonials build trust sooner and improve downstream engagement.

**Metrics:** Scroll depth, conversions

### Test 13: Testimonial Format
**Control:** Text testimonials with names
**Variation:** Video testimonials

**Hypothesis:** Video testimonials create stronger emotional connection and trust.

**Metrics:** Video play rate, conversion rate

### Test 14: Number Proof vs Story Proof
**Control:** "Join 5,000+ businesses..."
**Variation:** "See how [Client] increased leads by 347%..."

**Hypothesis:** Specific case studies are more memorable than aggregate numbers.

**Metrics:** Engagement, conversions

### Test 15: Trust Badge Position
**Control:** Security badges in footer
**Variation:** Security badges near CTA button

**Hypothesis:** Trust badges near the conversion point reduce last-moment hesitation.

**Metrics:** Form completion rate

---

## Visual & Layout Tests (Variable Impact)

### Test 16: Hero Image Type
**Control:** Stock photo
**Variation:** Product screenshot or illustration

**Hypothesis:** Relevant product visuals outperform generic stock because they preview what visitors get.

**Metrics:** Scroll depth, time on page

### Test 17: Video vs Static Hero
**Control:** Static hero image
**Variation:** Auto-play video (muted)

**Hypothesis:** Video increases engagement because movement captures attention.

**Metrics:** Video play rate, time on page, bounce rate

### Test 18: Long vs Short Page
**Control:** Full sales page (3000+ words)
**Variation:** Short page (500 words)

**Hypothesis:** Page length should match offer complexity and audience awareness level.

**Metrics:** Scroll depth, conversion rate, bounce rate

### Test 19: Section Order
**Control:** Problem → Solution → Features → Testimonials → CTA
**Variation:** Problem → Testimonials → Solution → Features → CTA

**Hypothesis:** Earlier social proof increases trust before presenting the solution.

**Metrics:** Scroll completion, conversions

---

## Urgency & Scarcity Tests

### Test 20: Deadline Countdown
**Control:** "Sign up today"
**Variation:** "Offer ends in [countdown timer]"

**Hypothesis:** Visible deadlines motivate action over procrastination.

**Metrics:** Conversion rate, conversion velocity

### Test 21: Limited Availability
**Control:** "Get started today"
**Variation:** "Only 7 spots remaining this month"

**Hypothesis:** Scarcity creates FOMO that increases conversion urgency.

**Metrics:** Conversion rate

---

## Pricing & Offer Tests

### Test 22: Price Anchoring
**Control:** "$997"
**Variation:** "~~$1,997~~ $997 (50% off)"

**Hypothesis:** Showing original price creates value perception and makes the current price feel like a deal.

**Metrics:** Conversion rate

### Test 23: Value Stack Display
**Control:** Simple price with feature list
**Variation:** Itemized value stack with individual values summed

**Hypothesis:** Breaking down total value per component increases perceived value.

**Metrics:** Conversion rate

### Test 24: Guarantee Prominence
**Control:** Guarantee mentioned in fine print
**Variation:** Guarantee with dedicated section and badge

**Hypothesis:** Prominent guarantee reduces risk perception and increases conversions.

**Metrics:** Conversion rate, refund rate

---

## Quick Reference: What to Test First

### Highest Impact (Test These First)
1. Headlines
2. CTA button text
3. Form field count
4. Above-fold content

### Medium Impact (Test Next)
5. Social proof placement
6. Urgency/scarcity elements
7. Page length
8. Image choices

### Lower Impact (Test Later)
9. Button colors
10. Font choices
11. Minor copy changes
12. Layout tweaks

---

## Test Documentation Template

```text
## A/B Test Plan: [Test Name]

### Test ID: [unique-identifier]

### Hypothesis
Based on [observation],
we believe [change]
will [expected outcome]
because [rationale].

### Variations
- **Control:** [Current version]
- **Variation:** [Changed version]

### Primary Metric
[The one metric that determines winner]

### PIE Score
- Potential: X/10
- Importance: X/10
- Ease: X/10
- **Total: X/10**

### Success Criteria
- Statistical confidence: 95%+
- Minimum lift: X%
- Minimum runtime: 14 days
```

## Results Documentation Template

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
[What we learned about the audience]

### Next Test
[Follow-up test based on results]
```

---

## PIE Scoring Worksheet

| # | Test Name | P | I | E | PIE Score |
|---|-----------|---|---|---|-----------|
| | | /10 | /10 | /10 | |
| | | /10 | /10 | /10 | |
| | | /10 | /10 | /10 | |

Sort by PIE Score descending to create your testing roadmap.
