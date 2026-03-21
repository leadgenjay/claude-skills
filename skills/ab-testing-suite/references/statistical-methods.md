# Statistical Methods for A/B Testing

## Z-Test for Two Proportions

The core statistical test for comparing conversion rates between two variants. It determines whether the observed difference is statistically significant or could be due to random chance.

### Variables

| Symbol | Meaning |
|--------|---------|
| `pA` | Conversion rate of variant A (control): `conversionsA / viewsA` |
| `pB` | Conversion rate of variant B (challenger): `conversionsB / viewsB` |
| `nA` | Number of views for variant A |
| `nB` | Number of views for variant B |
| `p` | Pooled proportion: `(conversionsA + conversionsB) / (viewsA + viewsB)` |
| `SE` | Standard error of the difference |
| `z` | Z-score (number of standard deviations from zero) |

### Formulas

**Pooled proportion:**
```text
p = (cA + cB) / (nA + nB)
```

**Standard error:**
```text
SE = sqrt(p * (1 - p) * (1/nA + 1/nB))
```

**Z-score:**
```text
z = (pB - pA) / SE
```

**Confidence (from z-score):**

Convert z-score to confidence using the standard normal CDF. The Abramowitz and Stegun approximation works well:

```typescript
function zScoreToConfidence(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp((-absZ * absZ) / 2);
  const probability = d * t * (0.3193815 +
    t * (-0.3565638 + t * (1.781478 +
    t * (-1.821256 + t * 1.330274))));
  return Math.max(0, Math.min(100, (1 - 2 * probability) * 100));
}
```

This gives us a two-tailed confidence: the probability that the observed difference is not due to chance.

### Worked Example

**Variant A (Control):** 500 views, 25 conversions (5.0% rate)
**Variant B (Challenger):** 480 views, 36 conversions (7.5% rate)

```text
p   = (25 + 36) / (500 + 480) = 61 / 980 = 0.0622
SE  = sqrt(0.0622 * 0.9378 * (1/500 + 1/480))
    = sqrt(0.0583 * 0.00408)
    = sqrt(0.000238)
    = 0.01543
z   = (0.075 - 0.05) / 0.01543
    = 0.025 / 0.01543
    = 1.62
confidence = zScoreToConfidence(1.62) ≈ 89.5%
```

**Result:** 89.5% confidence — medium. The difference is likely real but not yet statistically significant at the 95% threshold.

## Confidence Levels

| Level | Range | Interpretation |
|-------|-------|---------------|
| **High** | 90%+ | Statistically significant difference. Safe to declare a winner. |
| **Medium** | 70-90% | Moderate evidence. Likely a real difference but more data would help. |
| **Low** | <70% | Insufficient evidence. Could be random noise. |

**Standard thresholds:**
- **90%** — Faster decisions, slightly higher risk of false positives. Good for high-traffic pages.
- **95%** — Industry standard. Recommended for most tests.

## Improvement Calculation

```typescript
function calculateImprovement(rateA: number, rateB: number): number {
  if (rateA === 0) return rateB > 0 ? 100 : 0;
  return ((rateB - rateA) / rateA) * 100;
}
```

**Example:** Control 5.0%, Challenger 7.5%
```text
improvement = ((0.075 - 0.05) / 0.05) * 100 = +50%
```

## Sample Size Requirements

### Quick Reference Table

| Daily Visitors | Baseline Rate | Min Detectable Effect | Days Needed |
|----------------|---------------|----------------------|-------------|
| 100 | 5% | 50% lift (to 7.5%) | 84 days |
| 500 | 5% | 20% lift (to 6.0%) | 28 days |
| 1,000 | 5% | 20% lift (to 6.0%) | 14 days |
| 1,000 | 5% | 10% lift (to 5.5%) | 56 days |
| 5,000 | 5% | 20% lift (to 6.0%) | 3 days |
| 5,000 | 5% | 10% lift (to 5.5%) | 11 days |
| 10,000 | 10% | 10% lift (to 11%) | 3 days |

### Rules of Thumb

- **Minimum 10 conversions per variant** for any directional signal
- **100+ conversions per variant** for reliable statistical results
- **2 full business cycles** (usually 14 days) to account for day-of-week variation
- Higher baseline conversion rates → tests resolve faster
- Smaller effects require much larger samples (quadratic relationship)

### Sample Size Formula

For 95% confidence and 80% power:

```text
n = (z_alpha + z_beta)^2 * (p1*(1-p1) + p2*(1-p2)) / (p2 - p1)^2
```

Where:
- `z_alpha = 1.96` (95% confidence, two-tailed)
- `z_beta = 0.84` (80% power)
- `p1` = baseline conversion rate
- `p2` = expected conversion rate with lift

## When NOT to Trust the Numbers

### Novelty Effect
New designs always get temporary attention. Wait at least 2 weeks before drawing conclusions — early lift often diminishes.

### Seasonality
Day-of-week and time-of-day patterns affect conversion rates. Always run tests for complete weeks to avoid bias.

### Low Sample Sizes
With <100 conversions per variant, a single unusual visitor can swing results by 5-10 percentage points. Wait for more data.

### Multiple Testing Problem
Testing 5+ variants simultaneously dilutes your sample across more groups. Each comparison increases the chance of a false positive. Prefer 2-3 variants maximum.

### Simpson's Paradox
Aggregate results can hide segment-specific patterns. If desktop and mobile behave very differently, a test that wins overall might be losing on the majority device. Consider device breakdown in your analysis.

### External Factors
Advertising campaigns, PR coverage, competitor activity, and platform algorithm changes all affect conversion rates. Note any unusual external events during the test period.

## Implementation Reference

The statistical functions are implemented in TypeScript. See `assets/` for the full source, or implement these functions:

| Function | Purpose |
|----------|---------|
| `calculateConfidence(variantA, variantB)` | Z-test confidence between two variants |
| `calculateImprovement(rateA, rateB)` | Percentage lift and direction |
| `getConfidenceLevel(confidence)` | Map percentage to high/medium/low |
| `calculateDaysElapsed(startDate)` | Duration tracking |
| `formatConfidence(confidence)` | Display formatting |
