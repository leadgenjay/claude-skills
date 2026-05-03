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

## §P0.5.intro

> **One-time infrastructure setup.**
>
> Before we build campaigns we need three shared dependencies. **Future quickstart runs will skip this entire phase.**
>
> 1. **Turso database** (`cold-email-leads`) — stores leads, mailboxes, verifications, sent emails, replies, and analytics. Free tier covers everything we need.
> 2. **Anthropic API key** — used by `list-optimize` to AI-qualify each lead against your ICP (~$0.001/lead with Haiku).
> 3. **Perplexity API key** — used by `list-optimize` Phase 3 to research each lead before writing a personalized opener (~$0.005/lead on `sonar`).
>
> I'll auto-detect what's already configured in `.env` and only run setup for the missing pieces.

## §P0.5.turso

> **Setting up the Turso database.**
>
> Turso is hosted SQLite — free tier (9GB total, 1B row reads/month) covers everything we need.
>
> The setup script (`./scripts/db-setup.sh`) does five things:
> 1. Installs the `turso` CLI (~10 sec)
> 2. **Opens a browser to log you in** — sign up with GitHub or email at <https://turso.tech/>. Free, no credit card required.
> 3. Creates the `cold-email-leads` database
> 4. Applies the schema (13 tables, 27 indexes — see `docs/lead-tracking-db.md`)
> 5. Writes `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `TURSO_DB_NAME` to `.env`
>
> Then I run `bash scripts/list-optimize/migrate-schema.sh` to add 9 columns to the `leads` table for AI qualification + personalization.
>
> Running `./scripts/db-setup.sh` now — your browser will pop open for Turso auth.

## §P0.5.anthropic

> **Anthropic API key needed.**
>
> Used by `list-optimize` Phase 1 to AI-qualify each lead against your ICP. A Haiku call costs roughly **$0.001/lead** — qualifying 1,000 leads ≈ $1.
>
> 1. Go to <https://console.anthropic.com/settings/keys>
> 2. (Sign up if you don't have an account — add at least $5 of credit at <https://console.anthropic.com/settings/billing>)
> 3. Click **Create Key**, name it anything (e.g. `cold-email-leadgenjay`), copy the value (starts with `sk-ant-`)
> 4. Paste it here — I'll save to `.env` as `ANTHROPIC_API_KEY` and run a free `GET /v1/models` smoke test (no token cost)

## §P0.5.perplexity

> **Perplexity API key needed.**
>
> Used by `list-optimize` Phase 3 to research each verified lead before writing a 1-sentence personalized opener. Costs roughly **$0.005/lead** on the `sonar` model.
>
> 1. Go to <https://www.perplexity.ai/settings/api>
> 2. Add a payment method (Perplexity API requires it — free tier doesn't include API access)
> 3. Click **Generate API Key**, copy the value (starts with `pplx-`)
> 4. Paste it here — I'll save to `.env` as `PERPLEXITY_API_KEY` and format-check (first real call happens later in Phase 6c).

---

## §P1.instantly

> **Phase 1 of 9 — Sequencer setup.**
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

> **Phase 1 of 9 — Sequencer setup.**
>
> Email Bison is self-hosted at `send.leadgenjay.com`. If you don't have admin access, ask Jay.
>
> 1. Log in at <https://send.leadgenjay.com/>
> 2. Go to **Settings → API Keys**
> 3. Create a new key. Note it contains a pipe character (`|`) — I'll quote it correctly in `.env`.
> 4. Paste it — I'll save it to `.env` as `EMAIL_BISON_API_KEY` and run a smoke test

---

## §P2.intro

> **Phase 2 of 9 — Inbox provisioning via Inbox Insiders.**
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

> Mailboxes ordered. They're warming up now — **budget 4+ weeks before you can actually send cold**. We can build the strategy, lead list, and copy in parallel while warmup runs.

---

## §P3.intro

> **Phase 3 of 9 — Strategy.**
>
> `cold-email-strategy` runs a discovery interview to produce your ICP, offer positioning, and 3 messaging angles. The ICP it produces will pre-fill the scrape filters in Phase 5 and the qualification rules in Phase 6a — so taking the time here pays off twice downstream.
>
> You can either provide materials upfront — call transcripts, Google Docs, pitch decks, competitor emails, existing copy — or answer interview questions from scratch.
>
> If you have materials, share the file paths or paste them now. If not, say "no materials" and we'll run the full discovery.

---

## §P4.intro

> **Phase 4 of 9 — Lead tracking DB.**
>
> Quick, no decisions to make. I'm verifying the schema is current and persisting the **{N} domains + {M} mailboxes** from Phase 2 into the `domains` and `mailboxes` tables — that's what makes verification, list-optimize, and post-launch analytics queryable end-to-end. I'm also writing a `campaign_created` row to the `lead_events` audit trail.
>
> No prompt — this runs and reports back.

---

## §P5.intro

> **Phase 5 of 9 — Build the lead list via Consulti.**
>
> Consulti powers both **list building** (this phase) and **email verification** (Phase 6), so one account covers both.
>
> **If you don't have a Consulti account yet:**
> 1. Sign up at <https://app.consulti.ai/>
> 2. Go to **Settings → API** and generate a key (format `ctai_...`)
> 3. Paste it here — I'll save to `.env` as `CONSULTI_API_KEY`
>
> If you already have `$CONSULTI_API_KEY` in `.env`, I'll skip ahead.
>
> **I've read your `strategy.md` and pre-filled the ICP filters below — review and edit before I scrape:**
>
> - **Target type:** {b2b | local | creators}
> - **Job titles** (B2B): {strategy-derived list}
> - **Industries / categories:** {strategy-derived}
> - **Geos:** {strategy-derived}
> - **Company size** (B2B): {strategy-derived band}
> - **Target lead count:** _(you set this — hard cap to protect Consulti credits)_

---

## §P6.optimize_gate

> **Phase 6a — Run `list-optimize` (qualify + personalize)? [Y/n]**
>
> `list-optimize` adds two layers on top of plain verification:
>
> - **Qualify + normalize (before verification)** — AI-checks each lead against your `strategy.md` ICP and canonicalizes company names. Disqualified leads stay in the DB but get `do_not_contact=1`. Cost: ~$0.001/lead via Anthropic Haiku.
> - **Research + personalize (after verification)** — Perplexity researches each verified survivor for one specific recent thing, then writes a 1-sentence personalized opener that drops into E1 sentence 1. Cost: ~$0.005/lead.
>
> Skipping is safe: the copywriter's `{personalization|fallback}` token automatically uses the fallback when no `personalization_line` is in the DB.
>
> - **Y / yes / blank** → run the picker (default = both halves).
> - **n / no** → skip both 6a and 6c. E1 will use fallback only.

## §P6.intro

> **Phase 6 of 9 — Verify emails.**
>
> Even leads Consulti marks `"verified"` still bounce sometimes. The `/email-verification` skill is the hard gate: bounce rate must be <3% before any lead goes to a campaign. If the estimate is higher, we narrow the ICP and re-scrape (back to Phase 5) before continuing.
>
> Note: if `list-optimize` Phase 1+2 (qualify + normalize) ran before this gate, only the qualified survivors get verified — saves credits.

---

## §P7.intro

> **Phase 7 of 9 — Copywriting.**
>
> `cold-email-copywriting` reads your `strategy.md` and writes a 4-email sequence (Pitch → Nudge → Pivot → Breakup) with spintax variants. If `list-optimize` Phase 3+4 added a `{personalization}` token to the leads, the copywriter wires it into E1 sentence 1 with a fallback. Platform-specific spintax syntax is handled automatically based on your sequencer.

---

## §P8.intro

> **Phase 8 of 9 — A/B variant generation.**
>
> `cold-email-ab-testing` produces ≥9 positional variants (3 for the Pitch, 2 each for Nudge/Pivot/Breakup). This is a hard gate inside `cold-email-campaign-deploy` — skipping it stops the deploy.

---

## §P9.intro

> **Phase 9 of 9 — Deploy (PAUSED).**
>
> `cold-email-campaign-deploy` loads all upstream artifacts (strategy, copy, variants, verified leads, mailboxes from Phase 2) and pushes the campaign to your sequencer. It enforces 8 pre-launch gates:
>
> 1. Bounce rate <3% ✓ (Phase 6)
> 2. Warmup score ≥95 per mailbox
> 3. SPF/DKIM/DMARC configured
> 4. Open tracking off
> 5. Link tracking off
> 6. Plain text only (no HTML)
> 7. Spintax present
> 8. ≥9 A/B variants ✓ (Phase 8)
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
