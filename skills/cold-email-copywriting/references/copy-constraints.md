# Copy Constraints Checklist

Every cold email must pass ALL of these checks before it ships. Each rule exists because ESPs use AI to detect automated marketing emails, and every violation is a signal they check.

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
- [ ] First name is the ONLY personalization variable
- [ ] No company name, industry, city, or other merge fields in body
- [ ] Email Bison: `{FIRST_NAME}` | Instantly: `{{firstName}}`
- [ ] Sender signature token included after sign-off: `{SENDER_EMAIL_SIGNATURE}` (EB) or platform equivalent

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
