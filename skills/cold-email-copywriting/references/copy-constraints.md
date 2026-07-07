# Copy Constraints Checklist

Every cold email must pass ALL of these checks before it ships. Each rule exists because ESPs use AI to detect automated marketing emails, and every violation is a signal they check.

## Opens First (check this BEFORE anything else)

None of the rules below matter if the email never gets opened. Read ONLY the subject line and the
first line (preview text) as the prospect, then confirm. Full guidance: `open-rate-playbook.md`.

- [ ] **Subject does NOT telegraph a cold email** (no research flex like "Curious about
      [Company]'s recent…"; sounds like it's from a vendor, client, or friend)
- [ ] **First line provokes curiosity / confusion the prospect must resolve by reading** (not
      "here's who I am and why I researched you")
- [ ] **Bait is tied to the real content**, not bait-for-bait's-sake (bare first name /
      "quick question" alone is lazy)
- [ ] **CTA gives the fix**, answerable with a simple "yes" — not "let me share what we do" /
      "send a rundown of how X works"
- [ ] **Body is short lines with white space, not one block of text**
- [ ] **If there's no real proof/hook, the no-hook personality fallback is used** — social proof
      is NOT fabricated

## Format
- [ ] Plain text only (no HTML formatting)
- [ ] Under 100 words (target 75)
- [ ] 6th grade reading level (if they re-read a sentence, you lost them)
- [ ] No images or attachments

## Links & Tracking
- [ ] No links in Email 1 (links in first-touch signal automation)
- [ ] Max 1 link in follow-up emails (calendar/website only)
- [ ] Open tracking OFF
- [ ] Link tracking OFF
- [ ] No tracking pixels

## Personalization
- [ ] First name is the ONLY name-style merge variable
- [ ] No company name, industry, city, or other merge fields in the body
- [ ] Email Bison: `{FIRST_NAME}` | Instantly: `{{firstName}}`
- [ ] Sender signature token included after sign-off: `{SENDER_EMAIL_SIGNATURE}` (EB) or platform equivalent

### Optional `{personalization}` token (E1 first sentence ONLY)

If the campaign has been processed by `list-optimize` Phase 4, leads may have a per-lead `personalization_line` written to DB. The E1 opener MAY use the optional token to merge it in, but ONLY in the first sentence of E1, and ONLY wrapped in spintax with a generic fallback so leads with no `personalization_line` still send a natural opener.

- [ ] If used, `{personalization}` appears in **E1 sentence 1 only** (never E2-E4, never sentence 2+)
- [ ] MUST be wrapped in spintax with a generic fallback: `{personalization|<generic opener>}`
- [ ] The generic fallback must read naturally without any merge data (e.g., `Hey {FIRST_NAME}, came across your site and figured I'd reach out.`)
- [ ] If NOT used, all existing rules apply unchanged — first name only.

Example E1 opener with token:
```
{personalization|Hey {FIRST_NAME}, came across your site and figured I'd reach out.}
```

Example E1 opener without token (still valid):
```
{Hi|Hey|Hello} {FIRST_NAME},
```

## Banned Content
- [ ] No spam trigger words: free, guarantee, act now, limited time, click here, buy now, discount, winner, urgent, 100%, risk-free
- [ ] No em dashes (--) or en dashes anywhere (dead giveaway of AI copy)
- [ ] No signal references in copy (fundraising, growth, hiring plans, job postings)
- [ ] No unsubscribe link (use conversational opt-out: "If I'm barking up the wrong tree, just let me know")
- [ ] No ALL CAPS in subject lines

## Spintax (Platform-Specific)
- [ ] Email Bison: `{option1|option2|option3}`
- [ ] Instantly: `{{RANDOM | option1 | option2 | option3}}`
- [ ] Applied to: greetings, transitions, CTAs, sign-offs
- [ ] 3+ options per spintax block minimum
