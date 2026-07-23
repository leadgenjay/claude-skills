# Rules & deliverability

The gate every campaign passes before `campaign-send`. These protect your sending
reputation (a bad send can get the whole account suspended) and keep you legal.

## Permission (non-negotiable)

- Only email people who **explicitly opted in** to hear from you. No bought,
  scraped, rented, or "found" lists — ever. One spam trap can blocklist your domain.
- When in doubt about a contact's consent, leave them off.

## CAN-SPAM / legal (baked into your template — never strip)

- **One-click unsubscribe** (`{{ UnsubscribeURL }}`) in every email, honored fast.
  Listmonk also sends the RFC 8058 `List-Unsubscribe` header automatically.
- **Valid physical postal address** in the footer.
- **Truthful "From" and subject** — no deceptive headers or bait-and-switch subjects.
- Identify the message as from you; don't impersonate anyone.

## Warm-up (new sending domain)

A brand-new sending domain/IP has no reputation. Ramp slowly:

- Your instance is **capped** (a daily sliding-window limit) so you can't over-send
  early — don't try to work around it.
- Suggested ramp: ~1k/day week 1 → 5k → 20k → full, only if bounces/complaints stay
  low. Send to your **most engaged** contacts first.
- Consistency beats bursts: a steady cadence builds reputation; a sudden blast burns it.

## List hygiene

- Remove hard bounces immediately (Listmonk auto-blocklists them).
- Suppress anyone who hasn't opened in ~6 months before big sends ("sunset" policy).
- Never re-add someone who unsubscribed or complained.

## Engagement (this is deliverability)

- Segment by engagement and email your openers/clickers more, your dormant contacts
  less. Mailbox providers watch engagement to decide inbox vs spam.
- One clear call to action per email. Relevant > frequent.

## Complaint & bounce watch

After a send, check `stats <id>`:

- **Complaint rate > ~0.1%** → stop. Something's wrong (consent, content, frequency).
- **Bounce rate > ~5%** → stop and clean the list before the next send.
- Rising trend across sends → pause and investigate; don't push through it.

## Pre-send checklist (run every time)

1. [ ] Everyone on this list opted in.
2. [ ] Sent myself a **test** — rendering, all links, and the unsubscribe link work.
3. [ ] Subject is honest and not spammy (no ALL CAPS, no "FREE!!!", minimal emoji).
4. [ ] Footer (address + unsubscribe) is intact.
5. [ ] Within the warm-up cap for a new domain.
6. [ ] The user gave explicit go-ahead on the final copy.

If any box is unchecked, do not send.
