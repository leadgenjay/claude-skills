# Landing-page design system

This is the visual and conversion grammar for generated GHL pages. It exists to
make good decisions repeatable: the generator supplies a coherent baseline, the
linter catches predictable mistakes, and a human still makes the final judgment
about message, proof, imagery, and brand fit.

## Start here

```bash
# See the ten compositions and four visual themes
./ghl funnels templates

# Generate a working spec without touching GHL
./ghl funnels init-template pricing --theme otter --output pricing.json

# Replace placeholder copy and GHL asset IDs, then audit it
./ghl funnels lint pricing.json

# Inspect an approximate responsive preview locally (advisory only)
./ghl funnels preview pricing.json --output pricing-preview.html

# Only after the local sanity check: create a GHL draft, then test the real preview
./ghl --experimental funnels create-page FUNNEL_ID --from-json pricing.json
```

The available templates are `vsl`, `vsl-application`, `sales-letter`, `roadmap`,
`application`, `membership`, `pricing`, `optin`, `calendar`, and `intake`.
The available themes are `otter`, `editorial`, `modern`, and `warm`. A generated
spec records its choice in:

```json
"designSystem": {"version": 1, "theme": "otter", "template": "pricing"}
```

Each spec also records its intended traffic, awareness, friction, and sales
argument in `framework`. Generators should use that metadata to decide what the
page must prove before selecting components.

Explicit values always win over theme defaults, so a template can be art-directed
without forking the system.

## The visual rules

### 1. Use a restrained type system

- Default every generated page to Inter 700 for headings and Roboto 400/500 for
  body/UI. Override only when the user explicitly requests a different pairing.
- Default desktop scale: 58px H1, 38px H2, 18px body, 17px CTA.
- Default mobile scale: 38px H1, 29px H2, 17px body, 17px CTA.
- Hero headings use 1.08 line height; section headings use 1.15; body copy uses
  1.6–1.65.
- Keep body measures near 45–75 characters and never justify paragraph text.
- Use weight, size, and space for hierarchy. Avoid excessive colors, all caps,
  underlines, or letter spacing. Reserve the uppercase eyebrow for short labels.

The themes vary color and composition while keeping the approved default fonts:

| Theme | Display | Body | Character |
|---|---|---|---|
| Otter | Inter 700 | Roboto | Confident, clean, contemporary |
| Editorial | Inter 700 | Roboto | Authoritative, premium, human |
| Modern | Inter 700 | Roboto | Product-led and technical |
| Warm | Inter 700 | Roboto | Friendly professional service |

### 2. Let spacing create the polish

- Build on a 4px base and prefer the 8px rhythm: 8, 16, 24, 32, 48, 64, 88.
- Standard sections use 88px vertical padding on desktop and 58px on mobile.
- Content uses a 1,120px maximum grid with 24px gutters; long copy stays within
  roughly 68 characters.
- Card padding is 28–36px. Grid gaps are 24px. A heading normally receives
  16–20px before the next element.
- Compact proof bars and connected pricing grids can break the section-padding
  rule, but must opt in with `"compact": true`.
- Use one border, one radius family, and one shadow language. More decoration
  rarely creates more perceived quality.

### 3. Center with intent

Jay's binding rule for a true single-column page/section is stricter: center the
column and every child block—image/logo, heading, paragraph, button, proof group,
and embed wrapper. Center a bullet list as a block while preserving a shared left
edge inside the list. Native form/calendar field labels may remain left-aligned.

Center alignment works for a short, singular idea: VSLs, booking heroes, compact
opt-ins, pricing introductions, and final CTAs. Keep the centered copy narrow.

Left alignment works for longer reading, feature explanations, comparisons,
forms, qualification copy, and split heroes. Bullets and form labels stay left
aligned even when the surrounding section is centered.

Never center long paragraphs, dense lists, pricing details, or multi-step
instructions. The generator uses `"align": "center"` on sections only where the
composition benefits from symmetry.

### 4. Graphics must explain something

Use this hierarchy:

1. Real product or result proof: interface, coverage, report, case-study artifact.
2. Real people in context: founder, client, or team doing the work.
3. Purpose-built illustration that explains the mechanism.
4. Abstract texture used sparingly to establish mood.

Avoid generic handshakes, meetings, skylines, decorative dashboards, and imagery
that competes with the CTA. One strong visual is better than a row of unrelated
stock images. Compress raster assets, provide accurate alt text, and preserve the
subject's focal point on mobile.

For a split hero, direct a person's gaze or the graphic's visual motion back toward
the copy. For a VSL, the player is the hero visual: use 16:9, no autoplay, native
controls, a clear thumbnail, and one video only.

### 5. Icons are a supporting language

- Use one family, preferably simple 2px outline icons.
- Keep feature icons at 24px inside a 48px container.
- Icons clarify categories or steps; they do not replace labels.
- Use the accent color consistently and never mix filled, outlined, 3D, and emoji
  styles in the same page.
- The templates include a dependency-free inline icon set for play, check,
  sparkle, calendar, and security concepts.

### 6. Forms should feel easy before they are read

- Ask only for data needed at this stage. An opt-in is normally email plus name;
  qualification and onboarding may require more.
- Keep labels visible above fields. Placeholder text never replaces a label.
- Put the form in a single high-contrast card with a descriptive heading, a short
  expectation statement, one submit action, and reassuring microcopy.
- Use the correct email, phone, and URL field types for mobile keyboards and
  autofill. Group related intake fields into logical sections.
- Explain what happens immediately after submission. Redirect to a dedicated
  confirmation step and trigger the matching GHL workflow.
- The linter blocks publishing-oriented workflows until `REPLACE_WITH_GHL_*` IDs
  are replaced with real assets.

### 7. Pricing modules make the decision legible

- Use two or three plans when there are real audience or service differences.
- Each card follows the same order: audience/plan, price and billing period,
  one-line fit, 3–6 differentiators, CTA, and terms.
- Highlight one recommended plan with border and elevation, not by shrinking the
  alternatives or hiding key details.
- State setup fees, contract length, renewals, usage limits, and what “custom”
  means. Avoid false discounts or an invented “most popular” claim.
- Plan buttons can repeat the same action, but they should not send visitors into
  unrelated funnels. Put comparison detail and FAQs after the cards.
- Add proof next to price anxiety: ROI evidence, guarantee terms, or a testimonial
  from a buyer with the same objection.

### 8. Popups are interrupts, not mini landing pages

Use a popup only when it adds a distinct, timely path: a genuine exit offer, a
two-step form, or a necessary scheduling/payment interaction. It gets one heading,
one short explanation, one action, and the minimum fields.

- Never show it immediately on arrival or repeatedly after dismissal.
- Exit intent is desktop behavior; use deliberate tap triggers on mobile.
- Keep the width near 560–720px and preserve comfortable mobile gutters.
- The dialog needs a visible close control, `Escape` behavior, focus moved inside,
  focus trapped while open, and focus returned to its trigger after closing.
- The page underneath must become inert. The overlay must be strong enough to
  establish modality without making text illegible.
- Do not put a popup on an intake page or interrupt an active form/calendar flow.

GHL owns part of the native dialog behavior. Always keyboard-test the published
popup; schema correctness alone is not proof of accessible behavior.

### 9. Timers must represent a real change

- Use a fixed countdown for a real launch, event, price change, enrollment close,
  or expiring bonus. Name that event beside the timer.
- Define the timezone and the exact post-expiry state: hide the offer, replace the
  CTA, or redirect to the current option.
- Do not use a resetting evergreen timer to imply a deadline that is not real.
- Keep the timer subordinate to the promise. It supports a decision; it is not the
  headline or the proof.
- Record the rationale as `urgencyReason` in the compact spec so lint and reviewers
  can distinguish operational urgency from decoration.

## Template blueprints

Choose the blueprint from traffic temperature, awareness, offer friction, and
proof burden. Page length follows the number of distinct decisions the visitor
must make—not a fixed section quota. The full evidence and pattern audit is in
[`reference-funnel-patterns.md`](reference-funnel-patterns.md).

### VSL

Four sections: video-led hero, three skimmer outcomes, qualification, repeated
CTA. The player dominates the page. No autoplay, navigation, pricing table,
testimonial carousel, or unrelated secondary action.

### Application VSL

Five stages: guarantee-led VSL hero, verified proof, named mechanism, explicit
fit/disqualification, and one application. Use for warm, high-ticket traffic.

### Long-form sales letter

Promise, belief shift, failure diagnosis, named mechanism, proof/ROI, fit,
offer stack and price, guarantee, FAQ, final close. Every section must advance a
new decision; long does not mean repetitive.

### Personalized roadmap

Three stages: specific personalized result and speed, mockup plus one-question-at-
a-time diagnostic, then compact proof and outputs. Ask contact details after the
visitor has engaged with the diagnostic.

### Qualification application

Guarantee and authority, fit criteria, progressive application, clear review
expectations. State that application is not acceptance and what happens next.

### Premium membership

Benefit-led split hero with price in the CTA, objection-matched case studies,
support-based plans, comparison, first-30-days context, FAQ, final CTA.

### Pricing

Five sections: decision-oriented hero, three-card plan grid, proof, FAQ, and a
recommendation CTA. Use the same plan structure so differences are scannable.

### Simple opt-in

Three sections: split hero with form card, compact proof strip, qualification.
Keep it short. Do not add a long founder bio, curriculum, guarantee, or FAQ to a
free resource page.

### Calendar

Four sections: clear outcome hero, calendar, three expectations, trust. Tell the
visitor how long the call lasts, who it is for, what to prepare, and what they
leave with.

### Onboarding/intake

Four sections: welcome, preparation checklist, intake form, next steps. This is a
task-completion surface, not a sales page: calm layout, explicit progress, save
expectations, privacy context, and no promotional popup.

## Automated quality gate

`funnels lint` returns a score and machine-readable findings. Current rules cover:

- exactly one H1;
- a primary action above the fold;
- one action path across repeated CTAs;
- 48px minimum primary controls;
- mobile body type of at least 16px and readable line height;
- column widths totaling 100%;
- sensible content widths and section rhythm;
- image alternatives;
- proof on persuasion-oriented pages;
- real GHL form/calendar/survey IDs;
- concise popup structure;
- placeholder content left in a template;
- overloaded heroes and overlong mobile headlines;
- generic section headings that do not advance the argument;
- autoplay video and excessive image/video budgets;
- missing required stages in high-consideration templates;
- missing risk, price, timing, or next-step microcopy on high-friction CTAs;
- excessive length for low-friction funnel types;
- unexplained timers, evergreen deadline risk, and undefined expiry behavior.

Use `--strict` when a build should fail on every warning and informational note.
The linter complements visual review; it cannot judge whether a photo feels real,
a claim is credible, or the overall composition has emotional resonance.

## Required real-preview completion gate

1. Run `funnels lint` and resolve every error.
2. Render `funnels preview` for an advisory local sanity check only.
3. Read only the H1/H2s and buttons. The argument should still make sense.
4. Check the five-second test: offer, audience, value, action, and trust.
5. Replace all placeholder IDs, URLs, proof, pricing terms, and media.
6. Back up the current draft before replacement (`set-content` now does this
   automatically; use `--backup-output` to select the artifact path).
7. Save a draft without `--publish`, then audit the real draft preview URL for
   the target GHL account. Wait for fonts and native
   form/calendar embeds before capture.
8. Capture full-page PNGs at 1440x900, 768x1024, and 393x852. The primary agent
   must visually inspect every PNG; lint/DOM/worker prose does not count.
9. Run every CTA/form/calendar path twice. Fill forms and advance calendars only;
   never submit a contact or finalize a booking unless explicitly authorized.
10. Check console/network errors, literal escaped markup, font resolution, brand
    CTA color, single-column centering, intermediate breakpoints, and tablet stack.
11. Run the project's WebKit/mobile-overflow harness against that real preview.
    Lead-capture email/submit must begin within 390x664.
12. Verify title, description, canonical URL, analytics, and conversion events;
    open the real preview in the user's browser.
13. Publish only with explicit user authorization and only after the live URL
    passes the same visual, WebKit, and two-pass interaction checks.

## Research basis

- Webflow's current example review reinforces strong whitespace, restrained
  palettes, concrete proof, and visuals that demonstrate the product:
  <https://webflow.com/blog/best-landing-pages>
- Stripe's pricing page demonstrates consistent plan structure, explicit billing
  terms, scannable inclusions, and a clear custom tier:
  <https://stripe.com/billing/pricing>
- web.dev recommends responsive type, relative line height, and a 45–75 character
  reading measure: <https://web.dev/learn/design/typography>
- W3C recommends labels for every form control and collecting only necessary
  information: <https://www.w3.org/WAI/tutorials/forms/>
- WCAG 2.2 defines a 24px minimum target; this system deliberately uses a more
  forgiving 48px primary-action baseline:
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum>
- The WAI modal pattern defines focus placement, focus containment, Escape-to-close,
  labeling, and a visible close action:
  <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>
- Baymard's usability research supports persistent labels above fields instead of
  relying on placeholders: <https://baymard.com/learn/form-design>
