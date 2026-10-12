# The copy formula

Measured on 128 Instagram carousels from nine large creators in the AI, automation and
lead-generation niche (134 scraped, six photo dumps with no text dropped), counted in August 2026.
Every number is how often these creators do something. **None of it is proof that a shape gets more
comments**: the performance split was too small to show anything after correcting for the number of
things tested. Treat the numbers as the register to write in, not as a growth lever.

## The numbers

| | measured |
|---|---|
| Slides per carousel | median **8**; 7 to 9 covers 58%; p10 5, p90 10 |
| Words on the cover | median **16** (about 87 characters, two or three lines) |
| Words on a body slide | median **34**; only 22% of slides are 15 words or fewer |
| Words on the final slide | median 30 |
| Hooks that are a question | **5%** |
| Hooks that name a product or tool | 30% |
| Carousels with a comment CTA | **73%** |
| Comment keyword | always one word; 65% ALL CAPS; median 6 characters; 78% say what arrives |
| CTA on the final slide | 56% (15% on the one before) |
| Final slides with no text at all | a third |
| Numbered "Step 1 to 5" lists | 14% |
| Comparison language (old way, new way) | 27% |
| A swipe cue on the cover | 13% |
| Slides that end on a line leading into the next | 13.6% |

## The arc

Default to an **argument chain**: the cover makes a promise, slide 2 names the problem, the middle
slides walk through the fix in order, the last slide tells people exactly what to comment. Each
inner slide reads as following from the one before it, never as an independent poster. A numbered
procedure is the other shape that appears at the top of the corpus; pick one on purpose and do not
mix them. If you number steps, every step is something the reader does, and it names a part they can
point at ("THE MEMORY: a notes folder Claude reads first"), with the action as the body's opening
sentence.

## The hook

Declarative, about 16 words, two or three lines. Write it from one of these shapes and record which
one in `copy.json` as `hookTemplateId`:

| Id | Shape |
|---|---|
| T1 | I built `<system>` with `<tool>`. Here's how to set it up. |
| T2 | `<old approach>` is dead. Build `<new approach>` instead. |
| T3 | There's a short window where `<outcome>`. |
| T4 | Meet `<name>`. `<specific promise>`. |
| T5 | `<number>` `<skills, ways, tools>` you should know. |
| T6 | I'm `<claim>` / I've `<done thing>`. Here's how. |
| T7 | The most `<adjective>` thing isn't `<assumption>`. It's `<reality>`. |
| T8 | `<someone>` just `<released, launched, dropped>` `<thing>`. Here's how to use it. |
| T9 | What if `<scenario>`? Use only with a stated reason: questions are rare. |
| T10 | `<advice>`. Here are `<the points>`. |

A better hook that fits none of them ships as `hookTemplateOverride` with one sentence saying why.
A template is a register, not a promise of reach.

## Drafting rules

1. **Draft 8 slides.** Six to nine is the band. Cut any slide a beginner would not save or send to
   a friend, even below eight.
2. **Cover short, body long.** Cover about 16 words; do not cap body slides at 15.
3. **Name the giveaway on the CTA slide only.** Never pitch it inside a teaching slide. The caption
   may repeat it.
4. **Comment keyword:** one word, ALL CAPS, about 6 characters, and say what arrives: "Comment
   GUIDE and I'll send you the checklist." Reuse a keyword across posts when the offer is the same.
5. **CTA on the last slide, and the last slide carries text.**
6. **No slide about your own process**: checks, approvals, tests, review steps. People do not care.
7. **Use the words a beginner would use.** Swap each of these for a plain one: UI (the design),
   keyframe (the moves), render (make, turn into), component (piece), pixel (cut the detail),
   pipeline (the steps), deterministic (the same every time), threshold (the limit), CLI (a
   command), repo (the project folder). A product name the reader needs is fine; say what it does
   the first time.
8. **Fix an inaccurate claim by cutting it**, never by adding precision. "Checked to 1 pixel in
   10,000" is true and boring; drop the line.
9. **A number needs a source**, recorded on the slide's `source` field and opened before the copy is
   approved. Never invent a figure, a quote or a result.
10. **No em dashes and no en dashes** anywhere, in copy or in interface text. `render.mjs` refuses
    them on the slide. Ranges take a hyphen.
11. **Avoid the words that read as machine-written:** delve, tapestry, realm, landscape,
    ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling,
    seamless, groundbreaking, leverage, harness, embark, unveil, facilitate, synergy, game-changer,
    unlock, unleash, elevate, utilize, multifaceted.
12. **Rehooks.** Every slide between the cover and the CTA ends on a `rehook`: one line of 8 words
    or fewer that the next slide pays off. It goes in the slide's `rehook` field, not the body, and
    rides in the next-teaser pill.
    - Specific to the next slide: point at what it delivers without giving it away.
    - Paid off: the next slide answers it.
    - No line that fits any deck ("here's where it gets interesting", "keep swiping", "swipe to
      see"). The arrow already says swipe.
    - Varied: no two rehooks open with the same two words. Mix a tease, a stake, a promise, a
      question and a "Next: ..." label.
    - Never the giveaway.
    Only 13.6% of corpus slides do this; it is a house choice that gives people a reason to keep
    swiping, not a measured lever.

## copy.json

```json
{
  "productName": "...", "offer": "...", "ctaKeyword": "GUIDE",
  "animate": true, "hookTemplateId": "T2", "shape": "argument chain",
  "motion": { "loop": "jump" },
  "slides": [
    { "position": 0, "headline": "...", "body": "...", "visual": "...", "label": "ILLUSTRATION",
      "motion": { "loop": "seamless" } },
    { "position": 1, "headline": "...", "body": "...", "visual": "...", "label": "PROOF",
      "source": "...", "rehook": "So how does it work?" }
  ]
}
```

`label` is PROOF when a viewer could call the slide a lie (it asserts what a tool did, showed or
cost), else ILLUSTRATION. A PROOF slide shows a real screenshot or real captured output, pasted from
a saved file, never retyped. An illustration never sits under a factual claim and is never called a
screenshot.
