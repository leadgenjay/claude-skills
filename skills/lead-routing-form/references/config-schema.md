# Config schema — what the interview produces

The interview's only job is to fill in **one `RoutingConfig` object** (plus a list of
salespeople). That object is pure data — no code. Both artifacts (the vanilla embed and the
Next.js drop-in) read the same shape. The full TypeScript definitions live in
`references/engine/types.ts`; this is the working summary.

## `RoutingConfig`

```ts
{
  key: string,            // page id, e.g. "book-a-call" — used in the source tag + webhook
  funnel: string,         // a label for your own analytics; can equal key
  contactFields?: { phone?: boolean, phoneCountry?: boolean, website?: boolean },
  questions: RoutingQuestion[],
  consents?: RoutingConsent[],   // commitment checkboxes shown before the calendar (not a routing input)
  salespeople: Salesperson[],
  rules: RoutingRule[],          // hard overrides, evaluated FIRST; [] is fine
  scoring?: RoutingScoring,      // lead-score bands, evaluated AFTER rules (the usual router)
  defaultOutcome: RoutingOutcome,// used only if nothing above matches — make it a safe assign
  disqualified: DisqualifiedCopy,
  ghlPrefillKeys?: Record<string,string>  // answerId → calendar query-param key (prefill)
}
```

> **Where the webhook URL lives** (it is NOT part of the typed `RoutingConfig`):
> - **Embed** — inline it as a top-level `webhookUrl` field on the config object (plain JSON, not
>   type-checked), e.g. `references/templates/book-a-call.example.json`.
> - **Next.js** — leave it OUT of the config; the forwarder route reads it from the
>   `LEAD_ROUTING_WEBHOOK_URL` env var, so it never reaches the client bundle.

### `RoutingQuestion`
```ts
{
  id: string,                    // stable answer key (used in scoring + rules + webhook answers)
  label: string,
  type: "radio" | "select",
  required?: boolean,            // default true
  options: { value: string, label: string }[],
  allowOther?: boolean,          // reveals an optional free-text input; needs an option value "other"
  otherPlaceholder?: string,
  adaptiveLabels?: {             // purely cosmetic re-wording of THIS question's option labels
    dependsOn: string,           // an earlier question id
    map: { [answerValue]: { [optionValue]: string } }
  }
}
```
Routing only ever reads option **values**, never labels — adaptive labels can't change an outcome.

### `Salesperson`
```ts
{
  id: string,                    // referenced by rules / scoring bands
  name: string,
  role?: string,                 // shown on the "matched" card
  avatarUrl?: string,            // optional headshot; falls back to initials
  bookingUrl: string             // ANY calendar embed URL (Calendly, Cal.com, GHL, SavvyCal, …)
}
```
`bookingUrl` is rendered in an `<iframe>`. Contact answers are appended as query params
(`?name=&email=&phone=` plus any `ghlPrefillKeys`) so the calendar can prefill — providers ignore
unknown params, so this is safe across Calendly/Cal.com/GHL.

### Routing model — `rules` then `scoring`
`evaluateRouting()` runs hard `rules` first (ordered, first match wins), then `scoring` bands, then
`defaultOutcome`.

```ts
// RoutingRule (hard override)
{ when: [{ questionId, in: [..values] }], matchMode?: "all"|"any", outcome }

// RoutingScoring (the recommended router)
{
  points: { [questionId]: { [answerValue]: number } },   // unlisted answers contribute 0
  country?: {                                             // the heaviest axis on book-a-call
    answerKey?: "__country_iso",
    tier1: [..ISO], tier2: [..ISO], tier1Points, tier2Points, tier3Points
  },
  bands: [ { minScore, outcome } ],                       // ordered high→low; first match wins
  // balance?: {...}  ← LGJ-only (needs a backend + calendar API). OMITTED in the portable build.
}

// RoutingOutcome
{ type: "assign", salespersonId } | { type: "disqualify", reason? }
```

> **Balancer note:** the LGJ original adds an availability-aware even-volume `balance` block that
> reads each closer's open slots and rolling assignment counts from a backend. The portable build
> has no backend, so **omit `scoring.balance`** — leads route by band to the band's salesperson.
> If a band should round-robin across several reps, list them and the form picks one at random
> client-side (documented in the embed template).

### `DisqualifiedCopy` (the soft-DQ card)
```ts
{
  headline: string,
  body: string,
  bookingUrl?: string,           // optional SHORT qualification-call calendar embedded in the card
  bookingNote?: string,          // small-print under that calendar (e.g. a refundable-fee notice)
  cta?: { label, href },         // default downsell
  downsellByAnswer?: {           // replace cta based on an answer (e.g. by stated interest)
    questionId: string, map: { [answerValue]: { label, href } }
  }
}
```

## Worked example
See `references/templates/book-a-call.example.json` for a complete config (the live LGJ
`/book-a-call`, with the LGJ calendars + webhook replaced by placeholders) you can copy and edit.
