---
name: cold-email-copywriting
description: "Write cold email sequences with copy constraints, spintax, and deliverability rules. Reads strategy from workspace if available, or works standalone. Use when writing cold emails, email sequences, cold email copy, generating spintax, or when someone says 'write cold emails', 'email sequence', 'cold email copy', 'write sequence for'. This is Step 2 of the 4-skill chain: strategy -> copywriting -> ab-testing -> campaign-deploy."
---

# Cold Email Copywriting

Write a complete cold email sequence with platform-aware spintax, deliverability-safe copy, and subject lines. This skill produces the control copy (one body per email position) that feeds the A/B testing skill downstream.

**Skill chain:** `cold-email-strategy` -> `cold-email-copywriting` (you are here) -> `cold-email-ab-testing` -> `cold-email-campaign-deploy`

---

## Before You Start

**Read the knowledge base.** Before writing any copy, read the relevant files from `/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/Cold Email/`:

| Working on... | Read first |
|---------------|-----------|
| Subject lines | `Copywriting/subject-lines.md` |
| Opening / first lines | `Copywriting/opening-lines.md` |
| Email body structure | `Copywriting/email-body-frameworks.md` |
| CTA patterns | `Copywriting/cta-patterns.md` |
| Spintax | `Copywriting/spintax-guide.md` |
| Sequence timing | `Sequences/sequence-architecture.md` |

**Query NotebookLM.** The "Cold Email Strategy & Copywriting" notebook (ID: `cold-email-strategy-copywritin`) has expert copywriting angles and frameworks. Query it when you need inspiration for a specific angle or want to validate a copy approach.

---

## Pre-Flight: Load Strategy Context

Check for workspace output from the strategy skill:

1. Look for `scripts/campaigns/{campaign-name}/strategy.md`
2. If found, load: ICP pain points, offer positioning, messaging angles (Pain Dagger / Proof Machine / Value Gift), tone profile, CTA strategy, sequencer choice
3. If NOT found, ask the user for the minimum context needed to write:
   - Who is the target audience? (title, industry, company size)
   - What is the offer? (one sentence)
   - What tone? (casual/professional/direct)
   - CTA strategy? (book a call or lead magnet)
   - Which sequencer? (Email Bison or Instantly)

Also check `.metadata.json` if it exists. If strategy phase is marked complete, confirm the campaign name and proceed.

---

## Sequence Architecture

### 4-Email Structure

| Email | Purpose | Thread | Day Offset | What Changes |
|-------|---------|--------|-----------|--------------|
| 1 | **The Pitch** | New | 0 | Your best shot. Why you, why now, pain/value, proof, CTA |
| 2 | **The Nudge** | Reply to 1 | 2-3 | Ultra-brief. Bump the thread or add one new context point |
| 3 | **The Pivot** | New or reply | 5-7 | Completely different value lever. If E1 = save time, E3 = make money |
| 4 | **The Breakup** | Reply to 3 | 12-14 | Not desperate. Ask if wrong person or wrong timing. Skip for large TAM |

### CTA Progression

The CTA gets softer as the sequence progresses:

**Book a Call path:** Permission ("Mind if I send over...?") -> Bump ("Still relevant?") -> Even lower friction ("If I made a short video, would you watch it?") -> Redirect ("Better person to reach out to?")

**Lead Magnet path:** Offer resource -> Bump -> Different resource -> Redirect

---

## Copywriting Engine

### The 4-Sentence Structure

Every cold email follows this skeleton:

| Sentence | Purpose | What it does |
|----------|---------|-------------|
| 1 | **Why you, why now** | Prove you did research. Reference something specific about their business (NOT signals like funding/hiring) |
| 2 | **Poke the bear / How you help** | Connect research to their pain, or bridge directly to your solution |
| 3 | **Social proof** | Name a specific client and a specific result with real numbers. If no case studies, use experience signals: "After building 40+ automations for ecommerce brands..." |
| 4 | **CTA** | One question. Answerable with "yes" or "sure." One thumb. Under a minute |

### Writing Rules

Cold emails should read like a message from a sharp friend who happens to know about your problem, not a marketing pitch. Every sentence must earn the next sentence.

**Sentence 1:** Reference something about their business that shows you understand their world. Do NOT reference intent signals (fundraising, growth, hiring, job postings) in the copy itself. Signals are for targeting, not for email body. The prospect doesn't want to feel surveilled.

**Sentence 2:** Use the acute pain questions from the ICP. The more specific the pain, the more the prospect feels understood. Vague pain = vague results.

**Sentence 3:** "We helped [Company] achieve [metric]" with real numbers. Without specifics, social proof falls flat.

**Sentence 4:** Never ask for a calendar commitment in Email 1. One question that can be answered with a thumbs-up.

### Copy Constraints

Read `references/copy-constraints.md` for the full checklist. The critical rules:

- **Plain text only** (HTML signals marketing blast)
- **Under 100 words, target 75** (long emails don't get read and trigger spam filters)
- **6th grade reading level** (if they re-read a sentence, you lost them)
- **No links in Email 1** (links in first-touch signal automation to ESPs)
- **No tracking pixels or link tracking** (invisible HTML that screams "bulk email")
- **No unsubscribe link** (use conversational opt-out: "If I'm barking up the wrong tree, just let me know")
- **No images or attachments**
- **No spam trigger words anywhere in email body or subject line:** free, guarantee, act now, limited time, click here, buy now, discount, winner, urgent, 100%, risk-free. This includes describing your offer as "free" — say "complimentary," "no cost," or "no strings attached" instead
- **ZERO em dashes (—), en dashes (–), or double hyphens (--)** anywhere in email copy, subject lines, or CTA text. They are the #1 AI detection signal. Scan every sentence character-by-character before finalizing. Replace with a comma, period, or split into two sentences. Example: "Most agencies I talk to — they spend hours" becomes "Most agencies I talk to spend hours"
- **No signal references in copy.** Do not mention fundraising, growth, hiring plans, job postings in the email body
- **First name is the only personalization variable.** No company name, industry, city, or other merge fields
- **Include sender signature in sign-off.** `{SENDER_EMAIL_SIGNATURE}` (Email Bison) or platform equivalent after the sign-off word

### Self-Evaluation Loop

After writing the first draft of all emails, run this check:

1. **Re-read each email as the prospect.** Would you reply? Why or why not?
2. **"So What?" test.** Does every sentence earn its place? Take every feature and ask "so what?" until you reach the human outcome.
3. **AI smell scan (MANDATORY).** Scan every email character-by-character for em dashes (—), en dashes (–), or double hyphens (--). If ANY are found, replace with a comma or period and rewrite the sentence. Also check: any phrase a real human wouldn't text to a friend? Rewrite it.
4. **Pain specificity check.** Is the pain specific or generic? "Struggling with lead gen" is generic. "Spending 6 hours a week manually scraping LinkedIn for decision-maker emails" is specific.
5. **Signal reference check.** Did you mention fundraising, growth, hiring, job postings, or other intent signals in the copy? Remove them.
6. **Personalization variable check.** The only merge field allowed is first name. Remove any company name, industry, city tokens.
7. **Platform format check.** Verify EVERY token and spintax block matches the chosen sequencer. Email Bison: `{FIRST_NAME}`, `{option|option}`, `{SENDER_EMAIL_SIGNATURE}`. Instantly: `{{firstName}}`, `{{RANDOM | option | option}}`. If even ONE block uses the wrong format, fix it.
8. **Spam word scan.** Search every email body and subject line for: free, guarantee, act now, limited time, click here, buy now, discount, winner, urgent, 100%, risk-free. Replace "free" with "complimentary" or "no cost."
9. **If anything fails, rewrite and re-evaluate.** Keep iterating until every email passes all checks.

---

## Subject Line Generation

Generate 2-3 subject line variants per email position. Test ONE variable per position:

- Length (short <5 words vs medium 5-10)
- Format (question vs statement)
- Personalization (name-first vs no name)
- Tone (casual vs formal)

Subject lines should sound internal, not promotional. They should make the prospect think "this might be from a colleague" not "this is a sales email."

For follow-up emails that thread (E2 reply to E1, E4 reply to E3): use `Re:` prefix with the original subject, or empty subject for threading (Instantly: `""`, Email Bison: same subject).

---

## Platform-Aware Spintax

The syntax differs between sequencers:

**Email Bison** (use EXACTLY these token formats):
```
{Hi|Hey|Hello} {FIRST_NAME},
{Best|Cheers|Talk soon},
{SENDER_EMAIL_SIGNATURE}
```
Tokens: `{FIRST_NAME}` (uppercase), `{SENDER_EMAIL_SIGNATURE}`. Spintax: `{option1|option2|option3}`.

**Instantly** (use EXACTLY these token formats):
```
{{RANDOM | Hi | Hey | Hello}} {{firstName}},
{{RANDOM | Best | Cheers | Talk soon}},
```
Tokens: `{{firstName}}` (camelCase). Spintax: `{{RANDOM | option1 | option2 | option3}}`.

**NEVER mix formats.** If the sequencer is Email Bison, every token and every spintax block must use Email Bison syntax. If Instantly, every one must use Instantly syntax. No exceptions.

Apply spintax to: greetings, transitions, CTAs, sign-offs. Minimum 3 options per spintax block. Spintax prevents ESPs from detecting identical templates across sends.

---

## Output & Handoff

### Workspace output

Write the complete sequence to `scripts/campaigns/{campaign-name}/copy/sequence.md` containing:

For each email position (E1-E4):
- Subject line variants (2-3 per position)
- Email body (control version with spintax applied)
- Day offset and threading info
- CTA type

### Metadata update

Update `scripts/campaigns/{campaign-name}/.metadata.json`:
```json
{
  "phases": {
    "copywriting": { "status": "complete", "completed_at": "{ISO}", "output": "copy/sequence.md" }
  }
}
```

### Next step

Tell the user: "Sequence written with control copy for all 4 positions. Run `/cold-email-ab-testing` to generate A/B variants (minimum 3 for E1, 2 each for E2-E4)."
