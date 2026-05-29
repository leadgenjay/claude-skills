# Conversion Tracking Gotchas (read before wiring any test)

A/B infrastructure is easy to stand up and easy to corrupt. Every item below is a
real failure mode that silently produced wrong numbers — wrong enough to ship the
losing variant — until it was found. They are ordered by how often they bite.

The thing they have in common: **the test "worked" the whole time.** No errors, no
zeroes, a plausible-looking dashboard. Bad attribution looks exactly like good
attribution until you audit it. Build the guards in from day one.

---

## 1. Decide WHERE the conversion fires before you wire anything

The conversion event must fire once, from the one place that actually represents
the win. There are three models — pick one per test:

| Model | The conversion is… | Fire it… | Why click-tracking breaks it |
|-------|--------------------|----------|------------------------------|
| **Opt-in / lead form** | the successful form submit | **server-side**, in the opt-in route's success path (`trackConversions={false}` on the tracker) | A click listener on the submit button fires on validation retries, double-clicks, and abandoned submits — inflating conversions for the variant with the buggier form, not the better one. |
| **Pure CTA / outbound checkout** | the click on a buy/checkout link | **client-side**, on the click (auto-detect, explicit `selector`, or `trackConversion()` before a programmatic redirect) | — (click is canonical here) |
| **Post-opt-in checkout** | a click after the visitor already opted in upstream | **client-side**, on the click; do NOT reconcile against the upstream landing test | The journey/attribution row belongs to the upstream test, not this one. |

**The footgun this skill used to ship:** auto-detecting `button[type=submit]` and
`form[action]` and attaching a conversion click listener. That is the #1 way to
corrupt an opt-in test. The bundled `conversion-tracker.tsx` now auto-detects
**outbound purchase links only** and never submit buttons/forms. For opt-in forms,
fire the conversion server-side.

> LGJ proof point: the entire 3-class "tracking model" system exists because of a
> 2026-05-15 incident where opt-in tests were click-tracking the submit button.

---

## 2. Mount the tracker ONCE, at the outermost root

A multi-step SPA that does `if (step === 2) return <StepTwo/>` will unmount and
remount everything on each transition. If the `ConversionTracker` lives inside a
step branch, its view-dedup `useRef` resets on every remount and it **re-fires the
view event** — inflating views 2-3× for any visitor who advances a step, which
deflates conversion rate and hides real winners.

Mount it once at the outermost fragment/root of the page and switch step *bodies*
underneath it, never the tracker itself.

> LGJ proof point: `/97-r` + `/97-new` view counts ran 2-3× high until the tracker
> was hoisted out of the step branches (2026-05-17).

---

## 3. Attribute from THIS page's assignment, not "the first cookie"

When you read which test/variant a conversion belongs to, use the value the edge
middleware assigned **for this request** (the `?v=/?vid=/?tid=` search params, or
SSR props). Never reach for "the first `ab_*` cookie on the browser."

A visitor who hit a *different* test earlier still carries that test's cookie. A
generic "grab the first ab cookie" helper (or an `abTestId: testId || ctx.abTestId`
fallback) will attribute the new page's conversion to the **old** test — 100% drift
even though the events themselves look fine.

Rule: in opt-in POST bodies, write the literal `abTestId: testId` (the SSR prop) —
no `|| fallback`. Let an empty assignment flow through as empty/NULL rather than
back-filling it from a leaked cookie.

> LGJ proof point: a `captureTrackingContext` helper leaked the prior funnel's
> cookie for ~a week (2026-05-27).

---

## 4. Injected-HTML CTAs need event DELEGATION, not per-element listeners

If any variant injects markup via `dangerouslySetInnerHTML` (or otherwise renders
CTAs outside React's tree), do **not** `addEventListener` on each element. React's
reconciliation can rewrite that inner DOM on an unrelated re-render (e.g. a modal
opening) and silently destroy your listeners — and the `useEffect` cleanup never
re-runs because its deps didn't change. The CTA goes dead and conversions flatline.

Attach **one** click listener on a React-stable parent and match with
`e.target.closest('[data-cta="..."]')`.

> LGJ proof point: cosmic-variant CTAs were dead for days; only the one CTA that
> happened to be appended outside React survived (2026-05-22 → fixed 2026-05-27).

---

## 5. Rebaseline by timestamp — never delete events

When a window is confounded (a broken variant, an infra regression, a tracking bug
you just fixed), do **not** delete the bad events. Bump the test's `started_at` to
"now" and have every read filter `created_at >= started_at`.

The catch: **both sides** of the rate must filter to the same baseline. If your
event reads filter by `started_at` but your conversion source (journey rows, sales,
whatever) does not — or vice versa — the rebaseline itself manufactures fake drift.
Stats RPC, paginated fallback, winner calc, drift badge, and any audit job must all
apply the same floor.

---

## 6. Zero-risk rollout: split on `enabled`, preview via `?v=`

The bundled middleware splits traffic across **enabled** variants only — `weight`
is cosmetic. Use that for a no-risk launch:

1. Register the test **active** with the new variant `enabled: false` → it gets 0%
   of real traffic, but `?v=<id>` still previews it.
2. Verify the new variant on production via `?v=` (preview visits don't count).
3. Flip `enabled: true` to start the split.

The edge cache is ~5 minutes, so allow that before expecting the change live.

Corollary: don't start a brand-new test on a path you just concluded within ~24h —
late-arriving conversions from the old test land in the new window. Give it a day.

---

## 7. Don't gate above-the-fold / SEO content behind scroll-reveal in a variant

`whileInView` / IntersectionObserver wrappers keep their children at `opacity: 0`
until they scroll into view. Wrapping a hero, an H1, or anything above the fold (or
anything a crawler must see) means first paint — and the bot — get a blank. Keep
scroll-reveal for genuinely below-the-fold decoration only.

---

## 8. Verify with REPEATED interactions, not one click

A whole class of bugs only appears on the **second** interaction: a handler detached
after a modal opened and closed, scroll position restored wrong, a fire-once guard
that should have reset. A script that clicks the hero CTA once and reports green is a
smoke test, not a verification.

Required shape for any CTA/opt-in/scroll verification:

```
for pass in 1..2:
  for each CTA on the page:
    click it
    assert the side effect (modal opened / conversion fired / navigated)
    dismiss the side effect
```

Pass 1 proves the wiring works at all; pass 2 proves it survives its own side
effect's mount/unmount.

---

## 9. Enforce the above with build guards

Documentation decays; a guard in the build does not. The patterns here are worth a
handful of cheap repo-grep checks that fail the build, e.g.:

- Ban client-side conversion fires on opt-in pages (no `trackConversion` import and
  no click-listening `<ConversionTracker selector=…>` under an opt-in route).
- Ban the `abTestId: testId || …` cookie-leak fallback in opt-in POST bodies.
- Require every `ab_test_events` read to carry the `started_at` filter.

Treat a build that goes green as the contract — not a comment that hopes the next
person reads it. Run the guards locally before any launch; a validator that fails on
a *dead* legacy variant file under the funnel directory will still block the deploy.
