# Welcome message rules

The welcome message is the first thing a prospect reads from you after they accept your
connection request. Aimfox sends it, using the text you store for that person. The connection
request itself always goes out blank, so this message carries all the personalization.

## Hard limits (the script rejects a message that breaks these)

- 400 characters at most, counting spaces.
- No URL of any kind: no `http`, no `www.`, no bare domain like `example.com`.

A rejected message gets one rewrite. If the rewrite fails too, the prospect stays at
`qualified` and is not pushed. Do not try a third time.

## What the message must contain

1. One line that is specific to this person. Use their comment first, since that is what they
   chose to say in public. Fall back to their headline or company only when the comment is a
   one-word reply or an emoji.
2. One easy question they can answer in a few words. It should be about them or their work,
   not about your offer.

That is the whole message. Two or three sentences.

## What it must not contain

- A pitch, the offer, a price, or the booking link. Those come later, in the conversation.
- Flattery that would fit anyone ("Love your content!", "Great insights!").
- A reference to scraping, tools, or how you found them beyond the post itself. "Saw your
  comment on Sam's post about cold calling" is fine. "Our system flagged you" is not.
- More than one question.
- Em dashes, hashtags, emoji strings, or formatting. LinkedIn shows plain text.
- The same sentence you used for the last prospect. Vary the wording across a batch;
  near-identical messages to dozens of people read as automated.

## Voice

Write the way the user writes. Read `tone_samples` in config before the first message of a
batch and match their length, punctuation and how formal they are. When there are no samples,
write like a busy person texting a peer: short words, first person, no exclamation marks
stacked up.

## Examples

Comment: "We tried outbound for 6 months and the reply rate never got above 1%."

> Hey Dana, your comment on Priya's post about the 1% reply rate stuck with me. Was that
> mostly email, or were you running LinkedIn too?

Comment: "This is exactly why we stopped hiring SDRs."

> Hi Marco, saw your note on Lee's post about dropping SDRs. What did you replace them with,
> if anything?

Comment: "🔥"  (fall back to headline: "Founder, 12-person bookkeeping firm")

> Hey Chris, saw you run a bookkeeping firm. Are most of your new clients coming from
> referrals right now?

## Placeholders

Write the finished text. Do not leave `{first_name}` or any other placeholder in it: Aimfox
inserts only `{{CUSTOM.welcome_message}}`, and anything else would arrive as literal braces.
