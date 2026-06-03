---
name: lgj-email-marketing
description: "Full-suite email marketing for Lead Gen Jay. This skill should be used when writing email copy, creating nurture sequences, blast emails, onboarding emails, win-back campaigns, launch sequences, re-engagement emails, or any Kit/GHL email implementation. Also use when the user mentions 'email,' 'nurture,' 'blast,' 'sequence,' 'drip campaign,' 'email campaign,' 'email copy,' 'Kit,' 'Kit.com,' 'ConvertKit,' 'newsletter,' 'broadcast,' 'GHL,' 'GoHighLevel,' 'GHL email,' 'onboarding email,' 'win-back,' 'launch email,' or 're-engagement.' Covers copy creation in Jay's voice through the Kit CLI/API and GoHighLevel workflow implementation."
---

# LGJ Email Marketing

> **Voice Authority:** Always apply `.claude/skills/brand-voice/SKILL.md` for Jay's authentic voice, tone modes, and anti-patterns.

Full-suite email marketing skill for Lead Gen Jay — from writing copy in Jay's authentic voice to implementing campaigns in Kit (newsletter broadcasts + nurture sequences). Covers nurture sequences, weekly blasts, onboarding, win-back, launch, and re-engagement emails.

> **Migrated to Kit.com on 2026-05-21** (previously Beehiiv, and Brevo before that). Beehiiv and Brevo references in older docs are deprecated. See `docs/handoff/2026-05-21_beehiiv-to-kit-migration.md` for the migration record.

## Step 0 — Prerequisites

The **copywriting** half of this skill (voice, frameworks, sequence templates, offers, story bank) is fully self-contained and needs nothing external. The **deployment** half (the `kit` and `ghl` commands in "Kit Integration" and "Deployment Chain") is host-coupled to Lead Gen Jay's environment. If you only want to write the emails, skip the table below. If you intend to deploy, every row must check out first.

| Requirement | Check | Where to get it |
|-------------|-------|-----------------|
| `kit` CLI (Kit v4 wrapper) | `kit --help` runs, or `cli/kit/` exists in the repo | Host-only — lives in the `social-media-tool` repo (`npx tsx cli/kit/index.ts`). Not bundled with this skill. |
| `KIT_API_KEY` (Kit v4 key) | set in `.env.local` | Kit account → Settings → Advanced → API |
| `ghl` CLI (GoHighLevel) | `ghl --help` runs | Host-only — `highlevel-api-docs/agent-harness/` |
| `GHL_API_KEY` + `GHL_LOCATION_ID` | set in env | GoHighLevel Private Integration token |

If you are NOT on Jay's host and a deployment row fails, **STOP** the deployment step and hand the finished copy off for manual paste into Kit/GHL — the writing is still valid, only the CLI automation is unavailable.

## When to Use

- Writing any email copy for Lead Gen Jay
- Creating or editing nurture sequences
- Writing blast emails (3/week)
- Building onboarding, win-back, launch, or re-engagement sequences
- Implementing email campaigns in Kit via the `kit` CLI
- Creating or editing GoHighLevel workflow emails (inline-styled HTML)
- Migrating email content between GoHighLevel and Kit

## Email Types & Strategy

| Type | Frequency | Value:Sales Ratio | Word Count |
|------|-----------|-------------------|------------|
| Nurture sequence | Drip (1-2 day gaps) | 80:20 | 200-500 |
| Blast emails | 3/week | 80:20 | 200-400 |
| Onboarding | Immediate + days 1-7 | 90:10 | 100-300 |
| Win-back | After 30+ days inactive | 70:30 | 150-300 |
| Launch | 5-8 emails over 7-10 days | 60:40 | 300-600 |
| Re-engagement | 3-4 emails over 10 days | 80:20 | 150-300 |
| Cart recovery (abandoned checkout) | 1hr -> 1d -> 3d | 30:70 | 120-220 |

For detailed email-by-email templates for each type, see [references/sequence-templates.md](references/sequence-templates.md).

---

## Voice & Tone

Jay writes as an **expert mentor** — confident, helpful, slightly provocative, never salesy. Emails read like a smart friend who's a few steps ahead giving straight talk.

### Core Voice Rules

1. **Plain text only** - no HTML templates, no images, no fancy formatting
2. **Short paragraphs** - 1-3 sentences max, lots of white space
3. **Conversational** - write like talking, not like a brochure
4. **First person** - "I" not "we" (personal brand)
5. **Direct address** - "you" always, never "one" or "they"
6. **Active voice** - always
7. **Problem-solution framework** - "See, here's the problem..." then "Here's what actually works"
8. **NO em dashes or en dashes** - NEVER use the characters `—` or `–` in email copy. Use a regular hyphen `-` instead. This is a hard rule. The `kit` CLI runs an em-dash check before submitting broadcasts and sequence emails, and warns on violations.

### Signature Phrases (Use Naturally, Not Forced)

- **"The sauce"** — refers to insider strategies or valuable information
- **"Superpowers" / "Cheat code"** — when describing impact of mastering a tool or skill
- **"Insane"** — for genuinely impressive results or numbers
- **"BS"** — calling out fake gurus, bad advice, or industry lies
- **"Getting after it"** — focused execution mode
- **"The truth is..."** — pivoting to honest, no-BS advice

### Hook Patterns

- Challenge conventional wisdom: "Everyone says X. They're wrong."
- Provocative question: "Why are you still doing X when Y exists?"
- Specific result: "I generated 247 leads in 14 days. Here's the exact system."
- Pattern interrupt: "Stop. Before you send another cold email, read this."
- Personal story opener: "When I was [age], [vivid scene]..."

### Sales-Side Hook Patterns (locked 2026-05-28, AIA Sales E2-E4)

For mid-sequence sales emails (problem-aware → most-aware), Jay locked three high-performing opener variants in addition to the patterns above. Pick one per email; don't repeat within the same sequence.

- **Question hook (problem-aware):** `Do you ever feel like [other people's X is better than yours]?` Then agitate with specific failures, then introduce the solution. Reference impl: AIA Sales E2 (Claude Skills) — `"Do you ever feel like other people's Claude is better than yours?"`
- **Elephant-in-the-room (contrarian / anti-trend):** `There's an elephant in the room, and his name is [X].` Use when the topic is something the audience knows is uncool/old but still load-bearing. Reference impl: AIA Sales E3 (n8n stack) — `"There's an elephant in the room, and his name is n8n. Before Claude Code, n8n was the AI nerds' dream. Even though n8n has lost its sex-appeal, we still NEED it."`
- **Humility flex (credibility-by-disclaimer):** `[NAME], I am NOT smarter than you. But I have a secret.` Opens a story arc where the secret turns out to be hiring a coach / asking for help. Reference impl: AIA Sales E4 (Kevin coach story) — `"{{contact.first_name}}, I am NOT smarter than you. But I have a secret. Let me tell you a story about when I learned Claude Code in about 4 days over Christmas Break 2025."`

See [[feedback_jay_sales_email_opener_variants]] for the locked patterns + when to deploy each.

### CTA Phrasing (locked 2026-05-28)

Jay-authored CTA verb patterns from the AIA Sales rewrite. Use whichever matches the email's emotional moment.

| CTA verb | Pattern | Use for | Reference |
|---|---|---|---|
| **Invest in [Product] Today** | Action-verb + product + urgency adverb | Hard-close emails, last-note urgency emails | AIA Sales E1 + E6 |
| **Get [specific bonus / feature] inside [Product]** | Specific noun + product container | Feature-spotlight emails | AIA Sales E2 |
| **Get the Full [thing] in [Product]** | Total-stack framing | Stack/library emails | AIA Sales E3 |
| **Join [Product] and [do specific thing]** | Identity + action match | Story emails closing on a transformation | AIA Sales E4 |
| **Stack the deals inside [Product]** | Verb-noun-container, deal-flavored | Bonus / partner-rate emails | AIA Sales E5 |

Banned CTA phrasings (per project CLAUDE.md ban list): `unlock`, `unleash`, `elevate`, `transform your business` (as standalone phrase). Use straightforward action verbs instead.

### 5-Pillar Value Framework (for "What's Inside" emails)

Locked 2026-05-28 (AIA Sales E1) as the canonical structure for **first-email-in-sequence "what's actually inside [Product]"** emails. Replaces the older feature-bullet pattern.

```text
[Greeting + identity beat]

[1-2 sentence reason for the program existing — "I built this for [persona]"]

[1-sentence pain anchor — "There is SO MUCH noise online, and none of it actually makes you money."]

This is how I will get you from "[current state]" to "[desired state]":

**1- [Verb the tools].** [What they get + who it's for]
**2- [Verb the coaching].** [Group + 1-1 framing]
**3- [Verb the stack].** [Specific assets, dollar-credibility anchor like `$1M/mo companies`]
**4- [Verb the savings].** [Free + discounted, save-more-than-spend framing]
**5- [Verb the community / currency].** [Weekly updates, "stay in the KNOW"]

[Urgency line — "Now is the time to [action]. Waiting could be [cost]."]

[Lifetime / commercial framing]

**[CTA]**

[Sign-off]
```

Each pillar is a SHORT bold header (`**N- Title**.`) followed by one prose line. NOT bulleted lists. The parser at `_email_sequences_parser.py::to_ghl_html` renders each pillar as its own `<p>` paragraph — keep them tight.

Reference impl: AIA Sales E1, `docs/email-sequences/aia-sales-nurture-rewrite.md`.

### What NOT to Do

- No corporate speak ("leverage," "synergize," "utilize," "optimize")
- No passive voice ("leads were generated" → "I generated leads")
- No hedging ("I think maybe" → "Here's the truth")
- No clickbait that doesn't deliver
- No emojis (occasional is fine, never emoji-heavy)
- No "Dear [Name]" — just start talking

### Sign-Off Variations

**Welcome / intro sequence lock (relaxed 2026-05-25):** For any Jay welcome / intro sequence (LG Nurture, LG Insiders Sales, AIA Nurture, etc.), the closer phrase MUST signal peer-energy — one of three classes: **friend** (e.g. "Your friend,"), **fellow nerd** (e.g. "Later fellow nerd,"), or **personal-care** (e.g. "Telling you this because I care about you."). The name line MUST be **`-Jay`** (not "Lead Gen Jay", not "Jay Feldman", not standalone "Jay"). See [[feedback_jay_welcome_email_pattern]].

| Email type | Closer + name |
|---|---|
| Welcome sequence (default) | `Your friend, -Jay` |
| Welcome sequence (with tease for next email) | `Stay tuned friend, -Jay` |
| Welcome sequence (mid, continuity nod) | `Until next time my friend, -Jay` |
| Welcome sequence (domain flex — scaling) | `Your friend in scaling, -Jay` |
| Welcome sequence (domain flex — copy) | `Your friend in copy, -Jay` |
| Welcome sequence (domain flex — AI) | `Your friend in AI, -Jay` |
| Welcome sequence (domain flex — automation) | `Your friend in automation, -Jay` (n8n / workflow-focused emails, locked AIA Sales E3 2026-05-28) |
| Welcome sequence (domain flex — stacking deals) | `Your friend in stacking deals, -Jay` (bonus-stack / partner-rate emails, locked AIA Sales E5 2026-05-28) |
| Welcome sequence (domain flex — lead gen) | `Your friend in lead gen, -Jay` |
| Welcome sequence (nerd-bonding flex) | `Later fellow nerd, -Jay` (AI/tech/builder topics, e.g. AIA Zeus 2026-05-25) |
| Welcome sequence (personal-care flex) | `Telling you this because I care about you. -Jay` (learning-curve / objection-handling, e.g. AIA Learning curve 2026-05-25) |
| Nurture / value emails (non-welcome) | `- Jay` |
| Sales emails | `Jay Feldman, Lead Gen Jay` |
| Abandoned cart / cart recovery | `Your friend, -Jay` (warm welcome-class — the exception to the sales sign-off rule, locked from Jay's $97 cart sequence 2026-06-01) |
| Blast emails | `Talk soon,` then `Jay` |
| Final sequence email | `Jay Feldman` / `Lead Gen Jay` + P.S. with final hook or urgency |

### Profanity by Platform

- **GHL / inline-styled HTML emails:** Zero or asterisked only (`sh*t`, `BS`). Formal HTML context.
- **GHL inline-styled HTML emails (sales / story context):** Asterisked F-word allowed (`F&$K`) in personal-narrative beats — e.g. quoted first-reaction lines (`"I thought F&$K that I am not learning how to code"`). Locked AIA Sales E4 2026-05-28 (Kevin coach story). Still NO raw `fuck`.
- **Kit plain-text emails (welcome / personal mode):** Raw OK (`shit`, `FULL OF SHIT`). Friend-text energy overrides asterisking. Confirmed in LG Nurture E1-E2 (live 2026-05-24). See [[feedback_jay_welcome_email_pattern]].
- **Kit plain-text emails (sales / proof / launch):** Asterisked only (`sh*t`, `BS`). Match brand-voice Mode 2 Selling.

For complete voice guide with sample paragraphs, see [references/jay-voice-guide.md](references/jay-voice-guide.md).

---

## Copywriting Framework

### PAS (Problem-Agitate-Solution) — Primary Framework

Use for all sales-oriented emails:

1. **Problem** — Name the specific pain. Be vivid. ("You're sending 500 emails a day and getting zero replies.")
2. **Agitate** — Make them feel the cost of inaction. ("Meanwhile, your competitor just booked 12 calls this week using the same leads.")
3. **Solution** — Present the offer as the answer. ("That's exactly why I built [offer].")

### Awareness Levels (Eugene Schwartz)

Match email tone to where the subscriber is:

| Level | Approach | Email Example |
|-------|----------|---------------|
| Unaware | Educate on the problem | "Most coaches don't know this is why they can't scale" |
| Problem Aware | Agitate + show solutions exist | "Tired of leads going cold? There's a fix." |
| Solution Aware | Differentiate your approach | "Forget hiring SDRs. Here's what actually works." |
| Product Aware | Proof + objection handling | "See why 2,700+ B2B businesses trust this system" |
| Most Aware | Offer + urgency | "Last chance: price goes up Friday" |

### Core Principles

1. **One Email, One Job** — Each email has one primary purpose and one CTA
2. **Value Before Ask** — 80/20 ratio: 4 value emails for every 1 sales email in blasts
3. **Bold Claims + Specific Numbers** — "Generated $635,000 in pipeline" not "great results"
4. **Story-Based Selling** — ~1 in 4 emails uses a personal story from the story bank
5. **Always A/B Test Subjects** — Generate 2 subject line variants for every email
6. **Always Include Relevant Resources** — Every email should link to at least one free resource or lead magnet where it fits naturally (cheatsheets, free tools, guides). This adds value, builds goodwill, and gives non-buyers a reason to stay engaged. Place the resource link near the teaching content it relates to, not buried at the bottom. **NEVER repeat the same lead magnet across emails in a sequence** - each email gets a unique resource. If unsure about the correct lead magnet URL or CTA URL, ASK the user before writing.

### Subject Line Strategy

**Always provide two variants (A and B).**

Patterns that convert:
- Direct value: "The exact system I use to book 40 calls/month"
- Curiosity gap: "I almost didn't share this..."
- Specific result: "From 2 clients to 18 in 6 months (here's how)"
- Personal: "Jay here — quick question"
- Pattern interrupt: "Stop building funnels the old way"
- Provocative: "This is why your emails land in spam"

Rules:
- 40-60 characters max
- No ALL CAPS
- No excessive punctuation (!!!)
- Deliver on the promise inside

---

## Offers & Segments

Route subscribers to the appropriate offer based on their entry point and segment.

### Primary Offers

| Offer | Price | Ideal For | Primary CTA |
|-------|-------|-----------|-------------|
| AI Automation Insiders (AIA) | Subscription | Beginners wanting AI/automation | "Join AIA" |
| Lead Gen Insiders | $1,497 one-time | Coaches/agencies wanting lead gen | "Get Lifetime Access" |
| The Machine (Custom Buildout) | $7,500-$10K | Business owners wanting DFY | "Reserve My Lead Machine" |
| Inbox Insiders | SaaS subscription | Cold emailers needing infrastructure | "Start Free Today" |
| Consulti.ai | Freemium | Anyone needing B2B lead data | "Get 1,000 Free Leads" |

### Segment Routing

- **AIA segment** → Nurture toward AI Automation Insiders subscription
- **Insiders segment** → Nurture toward Lead Gen Insiders $1,497
- **General/YouTube** → Start with value, then segment based on engagement
- **Cold email focused** → Route to Consulti.ai or Inbox Insiders

For complete offer details, objection handling, proof points, and CTAs, see [references/offers-and-segments.md](references/offers-and-segments.md).

---

## Story Usage Protocol

Personal stories are **seasoning, not the main dish**. Approximately 1 in 4 emails should use a story from the bank.

### When to Use Stories

- Opening a nurture sequence (story email #3 or #4 in the series)
- Teaching a lesson through experience rather than instruction
- Building relatability and trust
- Making a pivot to a sales message feel natural

### How to Use Stories

1. Open with a vivid scene (not "Let me tell you a story...")
2. Keep it to 2-4 paragraphs max — this is email, not a memoir
3. Always tie the story back to the email's lesson
4. End with a clear connection to the CTA

For the complete indexed story bank with themes and email type recommendations, see [references/story-bank.md](references/story-bank.md).

### Story-First Sales Email Pattern (6-beat arc, locked 2026-05-28)

Reference impl: AIA Sales E4 (Kevin coach story). Use for any mid-to-late sequence email where the "lesson" is the value pillar of the offer (e.g. coaching value, community value, infrastructure value).

```text
1. HOOK — Humility flex or identity disclaimer
   "{{contact.first_name}}, I am NOT smarter than you. But I have a secret."

2. RESISTANCE — Show the friction / past hesitation (vulnerability beat)
   "I will skip the part where it took my entire team harassing me for months to get me to learn."

3. TRIGGER — Specific scene + raw reaction (asterisked profanity OK here)
   "I remember the first time I saw someone using their Terminal with Claude Code and I thought F&$K that I am not learning how to code."

4. THE SECRET — Reveal the move + name a specific person/tool
   "I hired a coach to teach me Claude Code. His name is Kevin."

5. TIMELINE ANCHOR — Concrete dates, escalating results
   "2 weeks: building real apps. 2 months: production apps my team uses. 3 months: business changed forever."

6. CTA + PS-CALLBACK — Identity-match CTA + PS that brings the named person/tool back as part of the offer
   "**[Join AIA and learn Claude Code](url)**"
   "PS: Remember my coach Kevin? He is one of the experts for our Insiders..."
```

The PS-callback is critical: the story character (Kevin) reappears as a buyable resource. Chekov's coach.

When to deploy: emails 4-6 of a sales sequence, after foundational value/feature emails have set the table. NOT first email in sequence (no foundation to rest on).

---

## KPIs & Success Metrics

### Nurture Sequences
- New emails added/edited per month
- Open rate target: 40%+ (personal brand lists perform higher)
- Click rate: 5-10%
- Sales/calls booked (secondary metric)
- Unsubscribe rate: <1% per email

### Blast Emails (3/week)
- Sales generated (primary)
- Click rate: 5-10%
- Open rate: 35%+
- Reply rate (engagement indicator)

### All Email Types
- Deliverability: 95%+ inbox placement
- Bounce rate: <2%
- Spam complaint rate: <0.1%

---

## Kit Integration

### Platform Details
- **Platform**: Kit.com (formerly ConvertKit) — newsletter broadcasts + nurture sequences
- **Auth**: `KIT_API_KEY` env var (a v4 API key, loaded from `.env.local`)
- **API**: Kit v4 REST API (`https://api.kit.com/v4/`) — no official SDK, called directly via `fetch`
- **CLI**: `kit` (npm script `kit`, or alias to `npx tsx cli/kit/index.ts`) — canonical interface, see `cli/kit/README.md`
- **MCP**: Kit's official MCP (`https://app.kit.com/mcp`) is **intentionally NOT registered** — the CLI covers the full v4 surface and the MCP would only add registry bloat. If ever needed: `claude mcp add --transport http kit https://app.kit.com/mcp`.
- **Sender**: jay@leadgenjay.com (verified domain)

### Critical Kit facts

1. **Newsletter + sequences, not transactional** — Kit does NOT do transactional email (receipts, password resets). All Lead Gen Jay email is marketing/nurture, so this is fine.
2. **Sequences are API-authorable.** Unlike Beehiiv, Kit lets you build a full linear nurture sequence over the API: create the sequence, add each email (subject + HTML body + delay), then activate. No UI handoff needed. Kit's branching *visual automations* are still UI-only — but LGJ nurture sequences are linear drips, so the API covers them.
3. **Content is an HTML string** (not blocks). The CLI's `--body-file <md>` converts plain-text-style markdown to HTML; `--html-file <html>` passes raw HTML through.
4. **Broadcasts create directly via API** — no Enterprise-plan gate. `kit broadcasts create` makes a draft; `--send-at <ISO>` schedules it.
5. **Webhooks are rich** — 15+ events (subscriber activate / unsubscribe / bounce, tag add / remove, form subscribe, link click, purchase, custom field changes).

### Merge tags (Kit)

Kit uses **Liquid** templating. **Different from GHL — never mix.**

| Tag | Renders | Fallback form |
|-----|---------|---------------|
| `{{ subscriber.first_name }}` | Subscriber first name | `{{ subscriber.first_name \| default: "there" }}` |
| `{{ subscriber.email_address }}` | Subscriber email | (no fallback needed) |
| `{{ subscriber.<custom field key> }}` | A custom field by its `key` (lowercased, underscored) | `{{ subscriber.<key> \| default: "..." }}` |
| `{{ snippet.<key> }}` | A reusable content snippet | — |
| `{% if subscriber.first_name != blank %}<GREETING> {{ subscriber.first_name }},{% else %}<GREETING>,{% endif %}` | **Greeting-slot conditional** (e.g. "Welcome NAME,"). Avoids awkward "Welcome there," when name is blank. | (the conditional IS the fallback) |

**Greeting-slot rule (locked):** For the first-line salutation of any Kit email, use the conditional above — not the `default` filter. The `default` filter is fine for inline body use (`{{ subscriber.first_name | default: "friend" }}`) but produces awkward "Welcome there," salutations. See [[feedback_kit_greeting_merge_tag_pattern]].

**Banned legacy syntax** (flag and reject if seen in Kit content): `{{ first_name }}` (bare Beehiiv form — renders empty in Kit Liquid), `{{contact.first_name}}` (GHL syntax — does not parse in Kit), `[FNAME]` / `||first_name||` / `@@email@@` (Brevo / pre-migration). The `kit` CLI validator rejects these. For GHL-side merge tags, see the GHL Variable Reference below and [[feedback_no_ghl_merge_tag_fallback]].

The `kit` CLI validates merge-tag syntax before submitting broadcasts and sequence emails. It flags any Beehiiv bare tags (`{{ first_name }}`), GHL tags (`{{contact.first_name}}`), or retired Brevo tags that leaked into Kit content, and aborts.

### Implementation Workflow

**For one-off broadcasts:**
1. Write the email copy in markdown using this skill's voice and framework.
2. `kit broadcasts create --subject "..." --body-file out.md --dry-run` to preview the payload and run validators (merge-tag check + em-dash warning).
3. Drop `--dry-run` to create the draft. Add `--send-at <ISO>` to schedule, or `--segment <id>` / `--tag <id>` to target a subset.

**For nurture sequences (authored via API):**
1. Write every email in the sequence using this skill's sequence-template format.
2. `kit sequences create --name "..."` and capture the returned sequence id.
3. For each email: `kit sequence-emails create --sequence <id> --subject "..." --delay-value <n> --delay-unit days --body-file emailN.md --published`.
4. `kit sequences update <id> --active` to turn it on.
5. Confirm in the Kit UI, then enroll subscribers with `kit sequences add-subscriber <id> --email ...` (or a tag-triggered automation built in the Kit UI).

For complete CLI + API patterns, see [references/kit-integration.md](references/kit-integration.md).

---

## GHL Email Formatting

GoHighLevel emails use inline-styled HTML (Kit handles styling on its own; GHL does not). Every GHL email must follow these specs exactly.

### HTML Specs

| Property | Body | Footer | CTA Links | Red Pill CTA |
|----------|------|--------|-----------|-------------|
| Font | `font-family: arial` | `font-family: arial` | `font-family: arial` | `font-family: arial` |
| Size | `font-size: 16px` | `font-size: 14px` | `font-size: 16px` | `font-size: 16px` |
| Color | `color: rgb(13, 13, 13)` | `color: rgb(114, 114, 115)` | `color: rgb(0, 87, 255)` | `color: rgb(255, 0, 35)` |
| Weight | normal | normal | normal | **bold** |
| Line-height | `line-height: 1.5` | — | `line-height: 1.5` | `line-height: 1.5` |

**Critical:** `line-height: 1.5` goes on EVERY `<p>` tag — including the first paragraph. No exceptions.

**Critical:** NEVER indent tags inside `<p>` — GHL renders leading whitespace literally, causing visible leading spaces in emails. All tags MUST be on a single line with zero whitespace between `>` and `<`.

### HTML Template Patterns

**Standard paragraph:**
```html
<p style="margin:0px; line-height: 1.5; padding-left: 0px!important;"><span style="font-size: 16px; font-family: arial; color: rgb(13, 13, 13)">Text here</span></p><br/>
```

**CTA link (standard blue):**
```html
<p style="margin:0px; line-height: 1.5; padding-left: 0px!important;"><a target="_blank" rel="noopener noreferrer nofollow" href="https://leadgenjay.com/link?utm_source=email&utm_content=identifier"><span style="font-size: 16px; font-family: arial; color: rgb(0, 87, 255)">>> CTA Text Here</span></a></p><br/>
```

**Red pill CTA (urgency/sales):**
```html
<p style="margin:0px; line-height: 1.5; padding-left: 0px!important;"><a target="_blank" rel="noopener noreferrer nofollow" href="https://leadgenjay.com/link?utm_source=email&utm_content=identifier"><strong><span style="font-size: 16px; font-family: arial; color: rgb(255, 0, 35)">>> Red Pill CTA Here</span></strong></a></p><br/>
```

**Bold text (inline):**
```html
<strong><span style="font-size: 16px; font-family: arial">Bold text</span></strong>
```

**Sign-off block (no `<br/>` between name lines):**
```html
<p style="margin:0px; line-height: 1.5; padding-left: 0px!important;"><span style="font-size: 16px; font-family: arial; color: rgb(13, 13, 13)">Jay Feldman</span></p><p style="margin:0px; line-height: 1.5; padding-left: 0px!important;"><span style="font-size: 16px; font-family: arial; color: rgb(13, 13, 13)">Lead Gen Jay</span></p>
```

**Footer (minimal — address + unsubscribe only):**
```html
<p style="margin:0px; text-align: center; padding-left: 0px!important;"><span style="font-size: 16px; font-family: Arial, sans-serif; color: rgb(0, 0, 0)">==================================================</span></p><br/><p style="margin:0px; text-align: left; padding-left: 0px!important;"><span style="font-size: 14px; color: rgb(114, 114, 115)">846 NW 24th Ave | Boca Raton | FL 33496 | United States.</span></p>
```

### GHL Variable Reference

| Variable | Syntax | Use |
|----------|--------|-----|
| First name | `{{contact.first_name}}` | Subject lines, body |
| Last name | `{{contact.last_name}}` | Formal emails |
| Full name | `{{contact.name}}` | Formal emails |
| Email | `{{contact.email}}` | Rarely in body |
| Phone | `{{contact.phone}}` | SMS templates |
| Company | `{{contact.company_name}}` | B2B personalization |
| Custom field | `{{contact.custom.field_key}}` | Segment-specific data |

**NEVER add fallback syntax** to GHL merge tags. GHL does not parse the Brevo-style `||` operator — `{{contact.first_name || "there"}}` ships literally in the email and looks broken. Use the bare merge tag `{{contact.first_name}}` and write copy that reads naturally when the name is blank (e.g., "Hey {{contact.first_name}}," still reads acceptably as "Hey ,", or rewrite to drop the name entirely). Same rule applies to `{{custom_values.X}}` and all other GHL variables. Confirmed by Jay 2026-05-13 on the Consulti free-trial nurture deploy.

### GHL Best Practices

1. **line-height: 1.5 on every `<p>`** — the existing emails have 1.38 or missing entirely on first paragraphs. Always use 1.5.
2. **Consistent link color** — always `rgb(0, 87, 255)`. Never `rgb(0, 8, 255)` or other blues.
3. **Consistent text color** — always `rgb(13, 13, 13)` on body spans. Never omit the color property.
4. **UTM tracking on all CTA links** — `?utm_source=email&utm_content=<sequence-name><email-number>` (e.g., `courseinterest1`)
5. **Minimal footer** — address + unsubscribe link only. The existing ~500-word CAN-SPAM filler is unnecessary; legally you only need physical address + unsubscribe mechanism.
6. **Plain-text style** — no images, no HTML templates, no colored backgrounds. Inline-styled text only. This maximizes deliverability and reply rates for sales sequences.
7. **Spam evasion characters** — intentional misspellings like `miIIion`, `f'ree`, `N0W`, `0FF` are used in existing emails to bypass spam filters. Preserve these when editing existing copy but avoid in new emails unless specifically requested.

---

## Required Context (ASK Before Writing)

Before writing ANY email sequence, you MUST ask the user for these two things:

1. **Trigger** - What starts this sequence? (e.g., tag added, form submitted, checkout abandoned, link clicked)
2. **Goal** - What ends this sequence? (e.g., purchase completed, call booked, tag removed, specific action taken)

Every sequence needs both a trigger (entry) and a goal (exit). Do NOT start writing until both are confirmed. If the user doesn't specify, ask directly: "What triggers this sequence, and what's the goal that takes them out of it?"

---

## Output Format

When creating emails, use this format:

```bash
Email [#]: [Purpose]
Segment: [AIA / Insiders / General]
Type: [Nurture / Blast / Onboarding / Win-back / Launch / Re-engagement]
Send: [Timing — e.g., "Day 3" or "Immediately"]

Subject A: [variant 1]
Subject B: [variant 2]
Preview: [preview text — 40-90 chars]

---

[Full plain text email body in Jay's voice]

---

CTA: [Action text] → [destination URL or description]
Story: [Yes/No — if yes, which story from bank and why]
Awareness Level: [Unaware / Problem / Solution / Product / Most Aware]
Word Count: [actual count]
```

**For GHL emails**, wrap each email body in the HTML template patterns above and include the full HTML in the output:

```bash
Email [#]: [Purpose]
Platform: GHL
Segment: [AIA / Insiders / General]
Type: [Nurture / Blast / Onboarding / Win-back / Launch / Re-engagement]
Send: [Timing — e.g., "Day 3" or "Immediately"]

Subject A: [variant 1]
Subject B: [variant 2]

---

[Full inline-styled HTML email body using the template patterns above]

---

CTA: [Action text] → [destination URL with UTM params]
Story: [Yes/No — if yes, which story from bank and why]
Awareness Level: [Unaware / Problem / Solution / Product / Most Aware]
Word Count: [actual count]
```

When creating a full sequence, provide:
1. Sequence overview (name, trigger, goal, length, timing, segment)
2. Each email in the format above
3. Exit conditions (when subscribers leave the sequence)
4. Transition logic (what happens after the sequence ends)

---

## Pre-Flight Checklist

Before finalizing any email:

- [ ] **All links verified** — confirm every URL is real and resolves to an actual page. If unsure, ASK the user before including
- [ ] **No invented offers** — never add discounts, bonuses, free resources, or pricing claims without verifying they exist first. If unsure, ASK
- [ ] **Full product names** — use "AI Automation Insiders" not "AIA", "Lead Gen Insiders" not "LGI". Never abbreviate product names in email body copy
- [ ] **UTM tracking on all links** — every CTA link must include `utm_source=ghl&utm_content=<email-identifier>` (e.g., `utm_content=abandoned-cart-email1`)
- [ ] Plain text only — no HTML formatting
- [ ] A/B subject lines provided (2 variants)
- [ ] One clear CTA per email
- [ ] Word count within range for email type
- [ ] Voice check: sounds like Jay talking, not a copywriter writing
- [ ] Story used appropriately (if included)
- [ ] Correct offer for segment
- [ ] Value:sales ratio maintained across sequence
- [ ] No em dashes (use hyphens instead)
- [ ] No corporate speak, passive voice, or hedging
- [ ] All URLs use markdown link format `[display text](https://full-url)` in body-file markdown - the `kit` CLI converts them to `<a>` tags, keeping ugly UTM strings out of the visible text. Never paste bare URLs.
- [ ] Sign-off matches email type

### GHL-Specific Checks (when platform is GHL)

- [ ] All `<p>` tags have `line-height: 1.5` (including the first paragraph)
- [ ] Font is `font-family: arial` and `font-size: 16px` on all body spans
- [ ] Text color is `color: rgb(13, 13, 13)` on all body spans
- [ ] Link color is consistent — `rgb(0, 87, 255)` for standard, `rgb(255, 0, 35)` for red pill CTAs only
- [ ] Merge tags are bare — NO `||` fallback syntax (`{{contact.first_name}}`, not `{{contact.first_name || "there"}}` — GHL renders the operator literally)
- [ ] UTM parameters on all CTA links (`?utm_source=email&utm_content=<identifier>`)
- [ ] Footer is minimal — address + unsubscribe link only (no 500-word filler)
- [ ] No images or HTML templates — inline-styled text only

---

## Deployment Chain

After a complete email sequence is written and approved, **always ask the user** where to deploy it:

> "Sequence is ready. Deploy to **Kit** (newsletter broadcast / nurture sequence) or **GHL** (GoHighLevel workflow for transactional + funnel emails)?"

### Kit Deployment

Uses the `kit` CLI (calls the Kit v4 REST API directly). See `cli/kit/README.md` for the full command reference.

**For a one-off broadcast (newsletter):**
1. Save the email body as markdown (no inline-styled HTML required — Kit handles styling)
2. `kit broadcasts create --subject "..." --body-file out.md --dry-run` to preview
3. Validators run automatically: merge-tag check (catches stray Beehiiv/GHL/Brevo tags) + em-dash warning
4. Drop `--dry-run` to create the draft. Add `--send-at <ISO>` to schedule, `--public` to publish to the archive, or `--segment <id>` / `--tag <id>` to target a subset.

**For a nurture sequence (multi-email drip):**
1. Write the sequence emails in this skill's standard sequence format
2. `kit sequences create --name "..."` and capture the returned sequence id
3. Add each email: `kit sequence-emails create --sequence <id> --subject "..." --delay-value <n> --delay-unit days --body-file emailN.md --published`
4. Activate: `kit sequences update <id> --active`
5. Branching *visual automations* (conditional logic) are still UI-only — hand that copy to the team. Linear drips are fully API-authorable.

**Operational commands:**
- List draft/scheduled broadcasts: `kit broadcasts list`
- Check broadcast stats after send: `kit broadcasts stats <id>`
- List sequences: `kit sequences list`
- List the emails in a sequence: `kit sequence-emails list --sequence <id>`
- List segments / tags / custom fields: `kit segments list`, `kit tags list`, `kit custom-fields list`

### GHL Deployment

Uses `ghl` CLI with workflow enrollment.

1. Create workflow emails in GHL using inline-styled HTML format (see GHL section above)
2. Enroll contacts via `ghl contacts enroll-workflow`

---

## Related Skills

- **dan-kennedy-copywriter**: PAS framework and direct response principles (incorporated here)
- **conversion-copywriting**: Schwartz awareness levels (incorporated here)
- **content-research-writer**: For researching topics before writing email content
- **social-content**: For Instagram content that feeds email sequences
- **copywriting**: General copywriting principles
