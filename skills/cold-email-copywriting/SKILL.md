---
name: cold-email-copywriting
description: "Write cold email sequences with copy constraints, spintax, and deliverability rules. Reads strategy from workspace if available, or works standalone. Use when writing cold emails, email sequences, cold email copy, generating spintax, or when someone says 'write cold emails', 'email sequence', 'cold email copy', 'write sequence for'. This is Step 2 of the 4-skill chain: strategy -> copywriting -> ab-testing -> campaign-deploy."
---

# Cold Email Copywriting

Write a complete cold email sequence with platform-aware spintax, deliverability-safe copy, and subject lines. This skill produces the control copy (one body per email position) that feeds the A/B testing skill downstream.

**Skill chain:** `cold-email-strategy` -> `cold-email-copywriting` (you are here) -> `cold-email-ab-testing` -> `cold-email-campaign-deploy`

---

## Before You Start

**Read the open-rate playbook FIRST.** Before writing a single subject line, read
`references/open-rate-playbook.md`. It is the most important input to this skill. It encodes the
one law that decides whether any of your copy ever gets read: a prospect sees only the **subject
line** and the **first line (preview text)** before deciding to open, and if either telegraphs
"this is a cold email," they delete it and a reply becomes impossible. The playbook holds the
don't-telegraph rules, the `Re:` trick, curiosity openers, give-the-fix CTAs, the no-hook
personality fallback, and three fully worked before/after examples.

**Read the constraints.** `references/copy-constraints.md` is the deliverability checklist every
email must pass (plain text, under 100 words, no em dashes, first-name-only, spam words, spintax).

**Optional — query NotebookLM.** The "Cold Email Strategy & Copywriting" notebook (ID:
`cold-email-strategy-copywritin`) has additional angles and frameworks. Query it when you want
inspiration for a specific angle or to validate an approach. It is a supplement, not a substitute
for the playbook above.

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

### The Opens-First Law (read this before you write anything)

**A prospect only ever sees two things before deciding to open: the subject line and the first
line (preview text). These are the ONLY levers for opens.** If either one telegraphs "this is a
cold email," they delete it without opening, and no reply is possible. As Jay puts it: *"If they're
not opening it, they've got no chance of responding to it."* Spend disproportionate effort here.
Everything below serves this law. Full detail and worked examples live in
`references/open-rate-playbook.md`.

The old failure mode was a rigid "prove you researched them" opener. Lines like *"Curious about
[Company]'s recent LTL experience"* or *"When [Company] scales ad spend, does the cost per booked
call hold steady?"* read as a cold email on sight, so they never get opened. **Do not lead with a
research flex.** Lead with something that earns curiosity.

### The Email Skeleton (a flexible guide, not a rigid template)

| Part | Job | Notes |
|------|-----|-------|
| **Subject** | Earn the open | Sound like a vendor, client, or friend, not a salesperson. Curiosity or the `Re:` trick. Never telegraph. |
| **First line** | Earn the read | Curiosity / mild-confusion / diagnostic hook the prospect must resolve by reading. This IS the preview text. |
| **Body (1-2 short sentences)** | Bridge to the problem + the fix | Transition from the hook into their problem and what you'd fix. Keep it tiny. |
| **Proof (optional)** | Believability | ONE specific client + real number, IF you have it. If you have no proof, drop this and lean on personality (see the no-hook fallback). Never fabricate. |
| **CTA** | Get a yes | Give the fix, don't offer to "share what you do." One question answerable with a simple "yes." |
| **PS (optional)** | De-risk | Remove the reason to say no: *"PS: if you already have someone you trust, no worries."* |

### Writing Rules

Cold emails should read like a message from a sharp friend who happens to know about your problem, not a marketing pitch. Every sentence must earn the next sentence.

**Subject + first line:** Do NOT telegraph that this is cold outreach. Do NOT reference intent
signals (fundraising, growth, hiring, job postings) anywhere in the copy. Bait must be tied to
the actual content of the email, never bait-for-bait's-sake (a bare first name or "quick question"
baits opens but is lazy and Jay calls it out). See the playbook for the `Re:` trick and curiosity
patterns.

**Body:** Use the acute pain from the ICP and move straight to the fix. The more specific the pain,
the more the prospect feels understood. Vague pain = vague results. Never a blob of text — break it
into short lines with white space (Jay flagged "one block of text" twice).

**Proof:** "We helped [Company] achieve [metric]" with real numbers, only if it's true. Without
specifics, social proof falls flat — and if you have none, do not invent it; switch to the no-hook
personality fallback below.

**CTA:** Never ask for a calendar commitment in Email 1. Give the fix ("Can I share a quick fix
for your offline tracking?" / "Can I send you a link to compare rates? (no login needed)"), not
your process ("Mind if I send a rundown of how we do X?"). One question, answerable with a
thumbs-up.

### The No-Hook Personality Fallback

When there is **no lead magnet, no unique mechanism, and no social proof**, do not force a
proof-driven email. Rely on **short, personal, high-volume, handshake-style** copy that reads like
a note from a friend:

- **Subject:** use familiarity — the sender's own name or a warm question (*"NAME, it's Austin"*,
  *"Do you have an insurance guy?"*).
- **First line:** warm/familiar (*"What's up NAME! Long time no see."* / *"Hope all's well, my
  friend."*) so it feels like it could be from someone they know.
- **Body:** honest reveal + likable personality (*"We haven't met, but my name is Austin and I'd
  love to be your guy for all things insurance."*). Casual, low-pressure, friendly.
- **CTA:** ultra-low friction (*"Mind if I send my cell in case you ever need me?"*).
- **PS:** de-risk (*"PS: if you already have someone you love and trust, then no worries."*).

This fallback REPLACES the "proof required" expectation when there is nothing real to prove.

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
- **First name is the only name-style merge variable in the body.** No company name, industry, city, or other merge fields anywhere in E1 sentence 2+ or in E2-E4
- **Optional `{personalization}` token in E1 sentence 1 only.** If the campaign was processed by `list-optimize` Phase 4, the E1 opener MAY use a `{personalization|<generic fallback>}` spintax block. The fallback must read naturally with no merge data so un-personalized leads still send a clean opener. E2-E4 NEVER use this token.
- **Include sender signature in sign-off.** `{SENDER_EMAIL_SIGNATURE}` (Email Bison) or platform equivalent after the sign-off word

### Self-Evaluation Loop

After writing the first draft of all emails, run this check:

0. **The "would I open this?" gate (do this FIRST).** Read ONLY the subject line and the first
   line of each email, as the prospect seeing them in an inbox. Would you open it, or does it smell
   like a cold email? If it telegraphs cold outreach, reads as a research flex, or is bait-for-
   bait's-sake, rewrite it before doing anything else. Nothing else matters if it never gets opened.
1. **Re-read each email as the prospect.** Would you reply? Why or why not?
2. **"So What?" test.** Does every sentence earn its place? Take every feature and ask "so what?" until you reach the human outcome.
3. **AI smell scan (MANDATORY, mechanical).** Do NOT rely on eyeballing — em dashes reliably slip past a visual scan. After writing the sequence file, run the lint (`node scripts/lint-copy.mjs <sequence file>`, see Output & Handoff). It exits non-zero on any em dash (—), en dash (–), or double hyphen (--). Fix every hit (replace with a comma or period, or split the sentence) and re-run until it exits 0. Also check by eye: any phrase a real human wouldn't text to a friend? Rewrite it.
4. **Pain specificity check.** Is the pain specific or generic? "Struggling with lead gen" is generic. "Spending 6 hours a week manually scraping LinkedIn for decision-maker emails" is specific.
5. **Signal reference check.** Did you mention fundraising, growth, hiring, job postings, or other intent signals in the copy? Remove them.
6. **Personalization variable check.** The only name-style merge field allowed is first name. Remove any company name, industry, city tokens. The optional `{personalization|<fallback>}` token IS allowed but ONLY in the first sentence of E1, ONLY wrapped in spintax with a generic fallback that reads naturally without merge data, and NEVER in E2-E4. If the token appears anywhere else, remove it.
7. **Platform format check.** Verify EVERY token and spintax block matches the chosen sequencer. Email Bison: `{FIRST_NAME}`, `{option|option}`, `{SENDER_EMAIL_SIGNATURE}`. Instantly: `{{firstName}}`, `{{RANDOM | option | option}}`. If even ONE block uses the wrong format, fix it.
8. **Spam word scan.** Search every email body and subject line for: free, guarantee, act now, limited time, click here, buy now, discount, winner, urgent, 100%, risk-free. Replace "free" with "complimentary" or "no cost."
9. **Give-the-fix CTA check.** Does the CTA offer the FIX/value (something they say "yes" to receive), or does it offer to "share what we do" / "send a rundown of how X works"? Rewrite any process-sharing CTA into a give-the-fix CTA answerable with a simple "yes."
10. **No-blob formatting check.** Is any email one solid block of text? Break every email into short lines with white space between thoughts. A wall of text reads as automated and doesn't get read.
11. **If anything fails, rewrite and re-evaluate.** Keep iterating until every email passes all checks.

---

## Subject Line Generation

The subject line is half of the entire opens equation (see the Opens-First Law). Generate 2-3
variants per email position. Test ONE variable per position:

- Length (short <5 words vs medium 5-10)
- Format (question vs statement)
- Personalization (name-first vs no name)
- Tone (casual vs formal)

**Make it sound like it's from a vendor, a client, or a friend — not a salesperson.** These read
as internal or personal and get opened:
- Diagnostic / found-a-problem: *"Found a pixel issue"*, *"Tracking glitch found"*, *"Who set up
  your tracking?"*
- The `Re:` trick: prepend `Re:` so it reads like a reply to an ongoing thread. Works especially
  well in industries not used to cold email: *"Re: Latest LTL quote"*, *"Your LTL quote"*. Use it
  honestly (the follow-up emails genuinely thread).
- Personal/handshake (no-hook offers): *"NAME, it's Austin"*, *"Do you have an insurance guy?"*

**Never telegraph the pitch.** Kill anything that reads as "I'm about to sell you something"
(*"Curious about [Company]'s recent LTL experience"*). And avoid bait-for-bait's-sake — a bare
first name or a standalone "quick question" gets opens but is lazy; make the bait relate to what's
actually inside the email. A "quick question" opener is only OK when fused to a specific hook in
the same line (*"quick question, are you still using FedEx for your LTL?"*), never on its own and
never as the subject.

For follow-up emails that thread (E2 reply to E1, E4 reply to E3): use `Re:` prefix with the original subject, or empty subject for threading (Instantly: `""`, Email Bison: same subject).

## First Line / Preview Text

The first line is the OTHER half of the opens equation. In every inbox it doubles as the preview
text next to the subject, so it decides the open just as much as the subject does. **Write it to
provoke curiosity or mild confusion the prospect has to resolve by opening/reading** — never a
"here's who I am and why I researched you" line.

Patterns that work (from real corrected copy):
- **Curiosity / confusion:** *"Did you ask for this LTL quote from FedEx?"* (→ "wait, what?")
- **Show-me question:** *"Does this look like your latest LTL shipping quote?"* (they want to check)
- **Fix-framing statement:** *"We fixed your LTL shipping quote."*
- **Diagnostic claim:** *"I don't think your server-side tracking is set up correctly."* /
  *"Did you know your website isn't firing any offline conversions?"*
- **Warm/familiar (no-hook):** *"What's up NAME! Long time no see."* / *"Hope all's well, my friend."*

Each of these is a smooth transition into the problem — but its ONLY job is to earn the open. If
the first line reads like a cold email, rewrite it before anything else.

**Pain goes in sentence 2, NOT the opener.** When the strategy file hands you rich, specific pain
points, the temptation is to open by stating the pain (*"Most agencies manually scheduling posts
end up with inconsistent windows that are killing your engagement"*). That is a pain STATEMENT, and
it reads as a pitch — it telegraphs. Instead, convert the pain into a curiosity hook or diagnostic
question (*"Posting daily across 8 client accounts?"* / *"Did you know your posting windows are
drifting?"*), earn the open, THEN explain the pain in the body. The strategy's pain points are raw
material for the hook, never the hook itself verbatim.

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

### Lint the copy (MANDATORY before handoff)

Run the mechanical dash lint on the sequence file and do NOT hand off until it exits 0:

```bash
node .claude/skills/cold-email-copywriting/scripts/lint-copy.mjs scripts/campaigns/{campaign-name}/copy/sequence.md
```

It hard-fails (exit 1) on any em dash (—), en dash (–), or double hyphen (--) anywhere in the file
(the #1 AI-detection tell — these slip past visual scans, which is why the check is mechanical, not
manual). It also warns on spam-trigger words (non-failing; confirm by hand). Fix every dash hit
(comma, period, or split the sentence) and re-run until it prints `✓ clean` / exits 0.

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
