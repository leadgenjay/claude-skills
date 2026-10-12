# The blind review

The agent that built a carousel cannot approve it. Reading your own slides and deciding you like
them is the same judgment that produced them. Approval comes from a separate agent in a fresh
context, spawned with the Agent tool, on the strongest model available. Pass the model in the
Agent call itself; a model named only in the prompt is not the model that reviewed.

`render.mjs` and `animate.mjs` are inputs to this review, never a substitute for it. They cannot see
an ugly slide, a confusing slide, or a slide that argues the wrong thing.

## Briefing the reviewer

Hand it the rendered PNGs, `copy.json` and every image the slides use. Do not tell it who built the
slides, that the checks passed, or what you meant. Tell it to be adversarial and to report defects
rather than praise. It must open the actual files: every slide at native size, every slide again
downscaled to 350px wide, and one crop per headline and per supplied image. A verdict that does not
report those observations is invalid; one that finds nothing still says what it checked.

Every finding about a logo, a capture or any supplied image names the file it compared against and
cites a measurement (a position, a size, a count, a sampled colour). A remembered version of a brand
is not evidence.

## What it checks, on every deck

- **Ground.** Light backgrounds only. A dark slide ground is critical. A dark terminal sitting on
  the light ground is content and is fine.
- **Style.** One highlighted phrase per headline; the accent on one phrase, never a block; no
  section labels, step badges or slide counters unless the user asked.
- **Every word a viewer can read**, quoted back: the copy, text inside every capture, every label
  in recreated interface. Spelling, sense, no em or en dash in anything composed for the deck.
- **Proof against illustration.** Every slide that asserts what a tool did shows a real screenshot
  or real captured text; compare it to the saved file. An illustration never sits under a factual
  claim and never reads as someone's real screenshot. No customer name, number or message.
- **Secrets.** No key, token, account id or scannable QR code on any slide, even partly.
- **Legibility at feed size.** At 350px wide, name what survives and what turns to mush.
- **Layout.** Nothing clipped, nothing crowding the edge, no orphan word on a headline line, no
  awkward empty band. Cards and frames line up with the grid.
- **Copy.** No word from the list in `copy-formula.md` rule 11. The cover can stand alone in the
  feed. The last slide carries the CTA and the keyword. A slide that only restates the one before
  it is a defect.
- **One argument.** The set reads as one argument, and its rhythm changes: the same layout and crop
  on every slide is a defect.
- **Rehooks.** For each pair, quote slide N's rehook and say whether slide N+1 pays it off. One the
  next slide does not answer, or one that would fit any deck, is a defect. The pill never covers a
  line of copy or the thing the headline names.
- **Anything that reads as template, generic or machine-made.**

## Added for an animated deck

The reviewer also gets every frame sheet in `video/sheets/` (eight frames per slide: 0s, 0.5s, 1s,
1.5s, 2s, 2.5s, mid-clip and the last frame), every poster, and `video/animate-report.json`.

- **Readable once settled.** From 2.5s on, every word reads at 350px, the same as the still.
- **Nothing moves over text after 2.5s.** Ambient motion stays behind or beside the copy.
- **The first frame is not blank.** The headline is on screen at 0s or arrives inside 0.5s.
- **The loop**, judged per slide from `animate-report.json`: `seamless` ends on its first frame;
  `jump` restarts as a deliberate rebuild, not a flash; `return` reverses out and ends on its first
  frame.
- **Motion carries the point.** The thing that moves is the thing the headline is about.
- **One carried element across each swipe**, named per pair, or the pair where it is missing.
- **The swipe arrow moves only after the build.**

## After the verdict

1. Fix the smallest set of slides the findings name, re-render, re-run the checks, and send the
   **whole** set back to the same reviewer. A changed slide is an unreviewed deck.
2. Two rounds failing on the same defect stop the loop. Change the input (the image, the layout),
   not the wording, or take it to the user.
3. On a pass, record the reviewer model and a sha256 of the PNGs it approved.
4. Show the user every finding of every round, fixed or not, with the slide beside it. The user
   decides what to leave, not you.
