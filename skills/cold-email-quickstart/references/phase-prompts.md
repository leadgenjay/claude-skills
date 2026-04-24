# Phase Prompts — cold-email-quickstart

User-facing copy for each phase gate. Referenced from `SKILL.md` as `§P{n}.{tag}`. Use these verbatim — they set expectations and prevent the orchestrator from re-explaining things the specialist skills already handle.

---

## §P0.resume

> I see an in-progress quickstart campaign: **`{name}`** (last completed phase: `{phase}`).
> Resume it, or start a new campaign?

## §P0.new

> Let's start a new cold email campaign from scratch. I need two things:
>
> 1. **Campaign name** (slug, e.g. `acme-q2-outbound`) — this becomes the working directory under `scripts/campaigns/`.
> 2. **Sequencer** — Instantly (default) or Email Bison.

---

## §P1.instantly

> **Phase 1 of 8 — Sequencer setup.**
>
> You need an Instantly account + API key before we continue. If you already have one, paste the API key and I'll skip ahead.
>
> **Sign up with Jay's affiliate link + 10% off:**
> - **Link:** <https://refer.instantly.ai/lgj>
> - **Discount code:** `LGJ10` (10% off — apply at checkout)
>
> Then:
> 1. Sign up via the link above
> 2. Pick a plan — the "Growth" plan is the cheapest tier that supports custom SMTP mailboxes. Apply `LGJ10` at checkout.
> 3. Go to **Settings → Integrations → API Keys** (<https://app.instantly.ai/app/settings/integrations>)
> 4. Create a new key with full scopes; copy the entire token
> 5. Paste it here — I'll save it to `.env` as `INSTANTLY_API_KEY` and run a smoke test

## §P1.emailbison

> **Phase 1 of 8 — Sequencer setup.**
>
> Email Bison is self-hosted at `send.leadgenjay.com`. If you don't have admin access, ask Jay.
>
> 1. Log in at <https://send.leadgenjay.com/>
> 2. Go to **Settings → API Keys**
> 3. Create a new key. Note it contains a pipe character (`|`) — I'll quote it correctly in `.env`.
> 4. Paste it — I'll save it to `.env` as `EMAIL_BISON_API_KEY` and run a smoke test

---

## §P2.intro

> **Phase 2 of 8 — Inbox provisioning via Inbox Insiders.**
>
> This orders domains + SMTP mailboxes + auto-uploads them to your sequencer in one async order. `/inbox-insiders` handles the whole flow.
>
> **Cost heads-up:** the Inbox Insiders skill will quote the exact Stripe charge before calling the API. Typical: `$3.50/mailbox/month recurring + $12/domain one-time`. Example: **9 mailboxes = $67 first invoice, $31.50/mo after.**
>
> Tell me:
> - **Sender name** for the mailboxes (e.g., "Jay Feldman")
> - **Brand name** and **website URL** (used for AI-suggested domains)
> - **Quantity** of mailboxes (3 per domain; rounded up)

## §P2.done

> Mailboxes ordered. They're warming up now — **budget 4+ weeks before you can actually send cold**. We can build the lead list and copy in parallel while warmup runs.

---

## §P3.intro

> **Phase 3 of 8 — Build the lead list via Consulti.**
>
> Consulti powers both **list building** (this phase) and **email verification** (Phase 4), so one account covers both.
>
> **If you don't have a Consulti account yet:**
> 1. Sign up at <https://app.consulti.ai/>
> 2. Go to **Settings → API** and generate a key (format `ctai_...`)
> 3. Paste it here — I'll save to `.env` as `CONSULTI_API_KEY`
>
> If you already have `$CONSULTI_API_KEY` in `.env`, I'll skip ahead.
>
> Then tell me your ICP filters:
>
> - **Target type:** B2B (job titles + industries), local businesses (Google Maps categories + geo), or creators (YouTube/podcast)
> - **Job titles** (for B2B): e.g., `["founder", "ceo", "owner"]`
> - **Industries** or categories
> - **Geos:** countries, states, or cities
> - **Company size** (for B2B): e.g., `1-10`, `11-50`
> - **Target lead count:** hard cap so we don't drain Consulti credits

---

## §P4.intro

> **Phase 4 of 8 — Verify emails.**
>
> Even leads Consulti marks `"verified"` still bounce sometimes. The `/email-verification` skill is the hard gate: bounce rate must be <3% before any lead goes to a campaign. If the estimate is higher, we narrow the ICP and re-scrape before continuing.

---

## §P5.intro

> **Phase 5 of 8 — Strategy.**
>
> `cold-email-strategy` runs a discovery interview to produce your ICP, offer positioning, and 3 messaging angles. You can either provide materials upfront — call transcripts, Google Docs, pitch decks, competitor emails, existing copy — or answer interview questions from scratch.
>
> If you have materials, share the file paths or paste them now. If not, say "no materials" and we'll run the full discovery.

---

## §P6.intro

> **Phase 6 of 8 — Copywriting.**
>
> `cold-email-copywriting` reads your `strategy.md` and writes a 4-email sequence (Pitch → Nudge → Pivot → Breakup) with spintax variants. Platform-specific spintax syntax is handled automatically based on your sequencer.

---

## §P7.intro

> **Phase 7 of 8 — A/B variant generation.**
>
> `cold-email-ab-testing` produces ≥9 positional variants (3 for the Pitch, 2 each for Nudge/Pivot/Breakup). This is a hard gate inside `cold-email-campaign-deploy` — skipping it stops the deploy.

---

## §P8.intro

> **Phase 8 of 8 — Deploy (PAUSED).**
>
> `cold-email-campaign-deploy` loads all upstream artifacts (strategy, copy, variants, verified leads, mailboxes from Phase 2) and pushes the campaign to your sequencer. It enforces 8 pre-launch gates:
>
> 1. Bounce rate <3% ✓ (Phase 4)
> 2. Warmup score ≥95 per mailbox
> 3. SPF/DKIM/DMARC configured
> 4. Open tracking off
> 5. Link tracking off
> 6. Plain text only (no HTML)
> 7. Spintax present
> 8. ≥9 A/B variants ✓ (Phase 7)
>
> **Campaign lands in PAUSED state.** You review in the sequencer dashboard, send a test, then activate manually.

---

## §final

> **Quickstart complete.** Campaign is live in PAUSED state. Before activating:
>
> 1. **Wait for warmup.** All mailboxes need 4+ weeks of warmup and warmup score ≥95 before cold sending.
> 2. **Review in the sequencer dashboard.** Send a test email to yourself. Check formatting, spintax rendering, personalization tokens.
> 3. **Activate when ready.** Toggle status manually in the sequencer — never auto-activate.
> 4. **Monitor daily** for the first week: `/campaign-analytics` (both platforms) or `/instantly-audit` (Instantly only).
> 5. **Re-verify leads** via `/email-verification` if >30 days pass before activation.
>
> To rebuild a phase, flip `phases.<name>.status` to `"pending"` in `scripts/campaigns/{name}/.metadata.json` and re-invoke `/cold-email-quickstart`.
