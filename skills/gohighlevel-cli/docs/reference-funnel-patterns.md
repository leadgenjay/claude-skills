# Reference funnel pattern library

This study converts twelve live funnels into reusable principles. It is not a
visual cloning guide. Claims, proof, identity, and media must always be original,
licensed, and true for the offer being built.

Audit date: July 16, 2026. Desktop and 390px mobile layouts were reviewed. The
Scaling With Systems page was blocked behind a loader/Cloudflare during review;
only its guarantee-led page title was available, so no visual conclusions rely on
that page.

## What each reference teaches

| Reference | Funnel type | Pattern worth reusing | Pattern not to copy |
|---|---|---|---|
| [Scaling With Systems](https://www.scalingwsystems.com/dfyf-free-training-vsl-1) | Guarantee VSL | A specific time-bound promise can make the hero self-explanatory. | Visual implementation could not be verified. |
| [GetClients MDW](https://getclients.com/mdw) | Paid long-form sales letter | Quantified promise, named mechanism, failure diagnosis, ROI math, fit/disqualification, stack, guarantee, FAQ. | Repeated H1 semantics and unnecessary length. |
| [Agency Founders](https://theagencyfounders.com/vsl-837544) | Application VSL | Audience-specific promise, scarcity context, dominant video, one application action. | Autoplay/muted video as an unquestioned default. |
| [Closers BSS](https://go.closers.io/vsl-bss-igo) | Minimal VSL | Headline, talking-head video, and one demo action can be enough for warm traffic. | Missing semantic H1 and generic page scaffolding. |
| [Viral Coach training](https://www.viralcoach.com/g/getting-started-2) | Guarantee VSL | Premium dark art direction, strong performance promise, early quantified proof. | Dozens of images/videos without a strict evidence hierarchy. |
| [Viral Coach](https://www.viralcoach.com/) | Premium service page | Four-stat proof bar, problem reframe, named integrated system, third-party reviews. | Homepage navigation on a campaign landing page. |
| [Elite CEOs opt-in](https://go.eliteceos.com/start-portfolio-optin-831310-699580) | Compact application | Two-column promise/proof plus form; on mobile, remove decorative media and prioritize the form. | Generic “Learn More” CTA after a highly specific promise. |
| [Elite CEOs proof page](https://go.eliteceos.com/start) | Proof portfolio VSL | Segment results by the prospect’s desired milestone. | A 330-image proof wall, horizontal overflow, and the resulting performance cost. |
| [Acquisition roadmap](https://www.acquisition.com/roadmap) | Diagnostic opt-in | Promise a personalized deliverable and speed; use one question per screen; place contact data last. | Allowing an embed to create a large blank region while loading. |
| [Acquisition Vantage](https://vantage.acquisition.com/) | Premium membership | Benefit-led split hero, price in CTA, Challenge/Win case studies, plan comparison, objection-led FAQ. | Letting the page grow without a clear content budget. |
| [Closers VSL](https://g.closers.io/vsl) | Guarantee VSL | A seven-day mechanism and first-month guarantee make the next step concrete. | Treating every embed as a substitute for accessible page structure. |
| [Viral Coach qualifier](https://www.viralcoach.com/cpy/about-you) | High-ticket application | Guarantee → CTA → trusted logos → application is a strong warm-traffic sequence. | Mobile controls below the 48px target and excessive supporting media. |

## The governing model

Select a composition from four inputs before choosing colors or components:

1. **Traffic:** cold, warm, customer.
2. **Awareness:** problem-aware, solution-aware, product-aware, most-aware.
3. **Offer friction:** low (free opt-in), medium (purchase/membership), high
   (application or sales call), or task (onboarding).
4. **Proof burden:** how surprising, expensive, risky, or novel the claim is.

Page length follows proof burden, not ambition. A free roadmap may need three
sections. A new $1,000/month membership may need case studies, plans, comparison,
terms, and an FAQ. Add a section only when it resolves a distinct decision.

## Reusable archetypes

### Simple VSL

`Promise → short explanation → one video → CTA → three outcomes → fit → CTA`

Use for free training and warm traffic. Keep one video and one destination.

### Application VSL

`Audience + guarantee → VSL → verified proof → named mechanism → fit / not-fit → application`

Use for a high-ticket service where qualification protects both parties. Put the
application after enough proof to justify the effort.

### Paid sales letter

`Promise → belief shift → failure diagnosis → named mechanism → proof + ROI → fit → offer stack → price → guarantee → FAQ → final close`

The mechanism explains why this solution should work. The proof verifies each
major claim near where it is made. The close summarizes; it does not introduce a
new argument.

### Personalized roadmap

`Specific result + speed → deliverable mockup → sequential diagnostic → usage proof → three outputs`

Use one question per screen, show progress, ask easy diagnostic questions first,
and request name/email/phone after the visitor has invested in the result.

### Qualification application

`Guarantee → authority logos → fit criteria → progressive application → review expectations`

Explain who reviews the application, the response time, and what happens when the
prospect is not a fit. “Apply” must never imply acceptance.

### Premium membership

`Benefit stack + price CTA → proof story → Challenge / Change / Win cases → plans → feature comparison → first-30-days path → FAQ → CTA`

Differentiate plans by support and speed, not a confusing collection of trivial
features. State billing, renewal, cancellation, and access terms beside price.

### Curated proof portfolio

`Milestone selector → 3–6 representative results per milestone → one expanded case study → CTA`

Proof needs a starting point, intervention, result, timeframe, and verification
type. Use a filter or accordion instead of loading hundreds of screenshots.

## Design rules derived from the set

- Use exactly one semantic H1. A visually small eyebrow is never an H1.
- Keep the desktop hero H1 around 48–64px and mobile around 32–44px. A display
  serif or condensed face can create personality; pair it with a highly readable
  sans-serif body and use no more than two families.
- Design mobile intentionally: stack copy before media, preserve 20px gutters,
  make primary controls at least 48px tall, and remove decorative imagery when it
  delays the action.
- Center short singular ideas, videos, proof bars, and final CTAs. Left-align
  lists, forms, comparisons, long copy, and multi-part arguments.
- Above the fold, allow one eyebrow, one promise, one explanation, one primary
  visual, one action, and one compact proof cue. More than eight elements needs a
  deliberate reason.
- Use graphics as evidence: product mockups, result artifacts, client context,
  mechanism diagrams. Decoration comes last.
- Default to no video autoplay. If a campaign deliberately uses autoplay, keep
  controls, captions/transcript, reduced-motion handling, and an understandable
  page without audio.
- Budget media: one primary VSL, no more than three videos on a normal sales page,
  and roughly 20 images before requiring an explicit performance/proof rationale.
- CTA copy combines action and benefit. High-consideration CTAs add microcopy for
  time, price, risk, or next step.
- Headings must carry the argument. Replace “How It Works” with the conclusion the
  section proves.
- Pair proof with the claim or objection it resolves. Logo strips establish
  familiarity; they do not prove an outcome.
- Popups are optional interrupts, never required steps. One offer, one action,
  minimum fields, keyboard support, and no popup during intake.
- Countdown timers must correspond to a real event or offer change, name that
  event, define the timezone and expired state, and never silently reset a stated
  deadline.

## Proof integrity schema

Store every proof item with enough context to keep generators honest:

```json
{
  "claim": "Qualified pipeline increased 38%",
  "startingPoint": "Before the campaign",
  "intervention": "Authority Compounding System",
  "result": "38% increase",
  "timeframe": "90 days",
  "source": "CRM export reviewed July 2026",
  "permission": "approved",
  "disclaimer": "Results vary by offer, market, and execution"
}
```

If any required field is unknown, use an honest placeholder in drafts and block
publishing. Never invent counts, publication logos, revenue, guarantees, scarcity,
reviews, or savings.
