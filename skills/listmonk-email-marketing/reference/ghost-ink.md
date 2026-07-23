# Ghost Ink — generate the copy and inject it into the email's HTML

> **What "Ghost Ink" is:** the step where Claude generates the campaign copy and
> **injects it directly into the email's branded HTML** — turning a one-line brief plus
> your branded template into a finished, send-ready HTML email. You describe the send;
> Ghost Ink writes the words *and* lays them into the HTML for you. (Same idea as the
> email-optimizer tool at `inboxinsiders.io/email-optimizer`.)

The output of Ghost Ink is not a prose draft you then have to paste somewhere — it's the
actual HTML body of the campaign, with your logo, colors, footer, and the copy already in
place, ready to load into Listmonk via `campaign-create --body <file.html>`.

## How it works (the flow)

1. **Take the brief** — what the email is about, who it's to, the one action you want.
2. **Write the copy** in the client's authentic voice (sections below).
3. **Inject it into the HTML** — drop the copy into the branded template structure
   (heading, body paragraphs, the call-to-action button, signature). Keep the branded
   header/footer and the required unsubscribe + postal-address block intact.
4. **Emit finished HTML** — a single `.html` file that renders correctly and passes the
   compliance gate, ready for `campaign-create` and a test send.

Your instance already has a **default branded template** (logo, colors, one-click
unsubscribe footer) applied by Consulti — Ghost Ink fills the *content* region of that
template. Never strip the template's footer or the `{{ UnsubscribeURL }}` link when
injecting copy.

## Writing the copy that gets injected

The copy has to read like the client wrote it — not like AI. Study signal first, then write.

### 1. Learn the voice first

- Paste 1–3 of the client's past emails, or point Claude at their website / a few pages of
  their writing.
- Note: sentence length, formality, "we" vs "I", humor level, emoji use, how they open and
  sign off, recurring phrases.
- Mirror those. When unsure, write plainer and warmer, not more corporate.

### 2. Subject line (the whole send depends on it)

- **Specific and honest** beats clever. "3 new implant CE courses this month" beats
  "You won't believe what's inside 👀".
- 4–8 words. Front-load the value. No ALL CAPS, no "FREE!!!", at most one emoji and only if
  on-brand.
- Never write a subject the body doesn't deliver on — that trains people to ignore you.
- Offer 2–3 subject options and let the user pick.

### 3. Structure

- **One idea, one call to action.** Decide the single thing you want the reader to do.
- Open with the value in the first line (it shows in the preview pane). Skip "Hope you're well."
- Short paragraphs, scannable. A button/link for the action.
- Sign off as a real person (your first name), not "The Team".

### 4. Keep it human

- Cut filler: "in order to" → "to", "at this point in time" → "now".
- Vary sentence length. Contractions are fine. A little personality > polished blandness.
- No hollow hype ("game-changing", "revolutionary"), no walls of adjectives.
- Read it aloud in your head — if it sounds like a press release, rewrite it.

## Worked example (dental CE club)

**Brief:** announce next month's implant CE webinar to subscribers.

**Subject options:**
- "New: Live implant CE webinar, Nov 14"
- "Earn 2 CE credits — implant webinar next month"

**Copy (voice: warm, direct, first person) — injected into the branded template's content region:**

> Hi {{ .Subscriber.FirstName }},
>
> We're running a live implant CE webinar on **Thursday, Nov 14 at 6pm PT** — 2 CE credits,
> and you can ask the presenter questions in real time.
>
> This month's focus is immediate-load protocols for the anterior. If you place implants (or
> want to start), it's worth the hour.
>
> [Save your seat →]
>
> See you there,
> Donavan

Notice: one idea, one CTA, specific value in line one, a real signature — dropped into the
branded HTML with the header/footer and unsubscribe block untouched. That's Ghost Ink.

## Personalization tokens (Listmonk)

Use these in the copy and Listmonk fills them per recipient:
`{{ .Subscriber.FirstName }}`, `{{ .Subscriber.Name }}`, `{{ .Subscriber.Email }}`.
Always phrase so it still reads fine if a name is missing.
