---
name: lead-routing-form
description: "Interview-driven installer that builds a qualification → routing → calendar booking form and drops it into the user's website. The lead answers a few questions, a lead-score (or hard rules) routes them to the right salesperson's calendar — or a soft-DQ card with a downsell. Backend-free: it POSTs 4 events to ONE webhook the user supplies (n8n/Zapier/Make/GHL/custom). Produces a self-contained vanilla embed (any site) OR a Next.js/React drop-in. Use when someone says 'install a routing form', 'qualification form', 'lead routing', 'round-robin booking form', 'book-a-call form', 'route leads to the right rep', or 'calendar routing'."
---

# Lead Routing Form — interview & install

This skill **interviews** the user, builds one routing **config** from their answers, then
**writes a working form into their project**. You (Claude) run the interview and generate files —
do not make the user hand-edit code.

## What it produces
- A multi-step form: **contact → qualification questions → (optional) consent gate → outcome**.
- The outcome is computed by a pure engine: lead-score **bands** (recommended) or hard **rules**
  → assign to a salesperson's **calendar embed** (any provider) OR a **soft-DQ card** (optional
  short qualification call + downsell CTA).
- Every lead is sent as **4 webhook events** (`lander_optin`, `partial_submission`, `qualified`,
  `disqualified`) to ONE URL the user controls. **No database, no API keys.** Their automation
  (n8n/Zapier/Make/GHL/custom) does the CRM work. Contract: `references/webhook-contract.md`.

## Before you start — read these bundled files
- `references/config-schema.md` — the `RoutingConfig` shape you'll fill from the interview.
- `references/webhook-contract.md` — the 4 events + ordering/dedup.
- `references/templates/book-a-call.example.json` — a complete worked config to model.
- `references/engine/{evaluate,types,countries}.ts` — the pure engine (you copy these for the Next.js path).
- `references/templates/embed.html` — the vanilla embed template.
- `references/templates/nextjs/{config.ts,qualification-router.tsx,submit-route.ts}` — the Next.js drop-in.

---

## The interview (ask, don't assume)

Work through these phases conversationally. Confirm a summary at the end before generating.

### Phase 1 — Stack
Detect the project (is there a `next.config.*` / `package.json` with `next`/`react`?). Then confirm:
- **Vanilla embed** (default) — one self-contained HTML/JS block; works on ANY site (WordPress,
  Webflow, Carrd, plain HTML, etc.). The webhook URL is inlined in the page.
- **Next.js / React drop-in** — idiomatic files + a server route that keeps the webhook URL in an
  env var. Pick this only for a Next.js/React codebase.

### Phase 2 — Contact fields
Name + email are always collected. Ask which extras to show: **phone**, **phone + country-code
dropdown** (captures dial code + country name + ISO — the ISO drives country lead-scoring),
**website** (optional field).

### Phase 3 — Qualification questions
For each question collect: a stable `id` (snake/kebab, used everywhere), the `label`, and 2–6
`options` (each a `{ value, label }`). Ask if any question needs an **"Other"** free-text option
(adds an option with `value: "other"` + `allowOther: true`). Keep it short — 2–5 questions converts best.

### Phase 4 — Routing model
Default to **lead-score bands** (recommended — Jay's model):
- Assign **points** per answer (`scoring.points[questionId][answerValue]`).
- Optionally weight by **country** (the heaviest axis on `/book-a-call`): collect tier-1 / tier-2
  ISO lists + points; everything else is tier 3.
- Define ordered **bands** (high→low `minScore` → outcome). Top bands assign your best reps; the
  lowest band can `disqualify`.
- **Banding, not single-axis gates** — never let one answer (e.g. revenue) disqualify alone; a DQ
  should require a low TOTAL. Explain this if they want a hard cutoff.

Offer **hard rules** instead/additionally for absolute overrides (e.g. "country = X → always rep Y").
Rules run first, then scoring, then `defaultOutcome` (make the default a safe assign, never a DQ).

> The portable build does NOT include the availability-aware volume balancer from the LGJ original
> (that needs a backend + calendar API). Leads route by band to the band's salesperson. Say so if asked.

### Phase 5 — Salespeople + soft-DQ
For each salesperson: `id`, `name`, optional `role`, optional `avatarUrl`, and their **calendar
embed URL** (Calendly, Cal.com, GHL `/widget/booking/...`, SavvyCal, TidyCal — any URL that embeds
in an iframe). Then the **disqualified** card: `headline`, `body`, optionally a SHORT qualification-
call `bookingUrl` + `bookingNote`, and a downsell `cta` (and optional `downsellByAnswer` map to
route the downsell by an answer like stated interest).

### Phase 6 — Lead delivery
Collect the ONE **webhook URL** (n8n/Zapier/Make/GHL inbound/custom). Restate the contract: it
fires `lander_optin` on contact, then exactly one of `partial_submission` OR `qualified`/
`disqualified` — so a completed lead = 2 events. No retry; their webhook should respond 2xx fast and
upsert by email. If they don't have one yet, point them to webhook.site to test, or help stand up an
n8n/Zapier webhook.

### Phase 7 — Generate
Build the `RoutingConfig` object from the answers (validate it against `references/config-schema.md`:
every band/rule `salespersonId` exists; `allowOther` questions have an `"other"` option; `points`
keys reference real question ids/values). Then:

**Vanilla embed:**
1. Read `references/templates/embed.html`.
2. Replace the single token `__ROUTING_CONFIG__` with the config **as a JSON object literal**,
   including a top-level `"webhookUrl": "<their URL>"`.
3. Write the result where they want it (e.g. `lead-routing-form.html`) and give them the
   `<style>` + `<div id="lead-routing-form">` + `<script>` block to paste into their page `<body>`.

**Next.js / React drop-in:**
1. Copy `references/engine/{evaluate,types,countries}.ts` → `src/lib/lead-routing/engine/`.
2. Write the filled config → `src/lib/lead-routing/config.ts` (model it on
   `references/templates/nextjs/config.ts`; do NOT put the webhook URL here).
3. Copy `references/templates/nextjs/qualification-router.tsx` → `src/components/lead-routing/`
   (adjust the `@/lib/lead-routing/engine/...` import paths to where you placed the engine).
4. Copy `references/templates/nextjs/submit-route.ts` → `src/app/api/<key>/submit/route.ts`
   (e.g. `src/app/api/book-a-call/submit/route.ts`) — this matches the form's default `submitPath`.
5. Add `LEAD_ROUTING_WEBHOOK_URL=<their URL>` to `.env.local`.
6. Show them how to mount it: `<QualificationRouter config={ROUTING_CONFIG} />` on a page.

### Phase 8 — Place & test
Help them put the form on the right page, then **fire a real test submission** and confirm the
webhook received the events in order (a completed lead = `lander_optin` + `qualified|disqualified`;
an abandon = `lander_optin` + `partial_submission`). Verify a qualified lead lands on the correct
calendar and a low-score lead hits the DQ card. If they have `node`, you can sanity-check routing
logic edits against `references/templates/engine.golden.json` with
`node references/templates/verify-engine.mjs`.

---

## Notes
- **Privacy/consent:** the form collects email + answers and posts to the user's webhook. Remind
  them to add their own consent/privacy handling per their jurisdiction.
- **Theming:** override the CSS variables on `.lrf-root` (accent, ink, bg, line…) — both artifacts
  share the same `--lrf-*` variables; a `lrf-dark` variant ships for dark pages.
- **No secrets in the page:** the embed inlines only the webhook URL (treat it as an unguessable
  endpoint, not a secret). The Next.js path keeps it server-side in an env var.
- **Keep the engine faithful:** if you change scoring/routing logic in `embed.html`, mirror it in
  `references/templates/verify-engine.mjs` and re-run the golden test.
