---
name: animated-carousels
description: >-
  Build Instagram carousels as HTML slides from a bundled design library, check every word and
  every slide with render.mjs, pass a blind visual review, then optionally turn every slide into a
  silent 1080x1440 MP4 with HyperFrames (animate.mjs) for an animated carousel. Use when the user
  asks for an Instagram carousel, an animated or video carousel, a hyper carousel, or a
  multi-slide social post.
---

# Animated Carousels

An Instagram carousel, written to a measured copy formula, built as HTML slides from a small design
library, rendered to 1080x1440 PNGs, reviewed by a fresh agent, and (when the user wants it) turned
into one short silent video per slide. Every word on a slide is real text, so it is exact and
editable; nothing draws type into an image.

The skill folder is the folder holding this file, `~/.claude/skills/animated-carousels` by
default. Run every command below with the skill folder as the working directory and pass deck
folders as arguments.

**Build every deck inside the skill folder, at `carousels/<slug>/`.** HyperFrames serves a slide
from the folder that holds both the slide and the library, and finds its own renderer from there,
so a deck kept anywhere else cannot be animated. Copy the finished PNGs and MP4s wherever you post
from.

## Step 0: Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user
where to get each; do not proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Node.js 22 or newer | `node --version` prints v22 or higher | https://nodejs.org (HyperFrames needs 22) |
| The skill's packages | `ls node_modules/playwright node_modules/sharp node_modules/hyperframes` in the skill folder lists all three | `npm install` in the skill folder (installs Playwright 1.62.1, sharp 0.35.3, HyperFrames 0.8.97) |
| Chromium for Playwright | `node library/render.mjs examples/animated-carousel/slides --copy examples/animated-carousel/copy.json` prints seven PASS lines | `npx playwright install chromium` in the skill folder |
| ffmpeg and ffprobe (animated decks only) | `ffmpeg -version` and `ffprobe -version` both print a version | ffmpeg.org; the marketplace install tries Homebrew for you |
| The Chrome HyperFrames renders with (animated decks only) | `npx --no-install hyperframes browser ensure` exits 0 | that same command downloads it on first run |

If anything is missing, STOP. Do not write placeholder commands or skip a check because a tool is
absent.

Smoke test before the first real deck: copy `examples/animated-carousel` to `carousels/example`,
run Step 5 and Step 7's commands on it, and expect seven PASS lines from each and
`complete: every slide passed` at the end of the animate run. The first animate run takes a few
minutes; each slide renders twice.

## The rules that come first

1. **Every word on a slide is HTML text from `copy.json`.** Headlines and body lines carry
   `data-copy="<position>.<field>"` and must equal the copy sheet exactly. Recreated interface text
   (a terminal line, a window title) carries `data-ui`. `render.mjs` fails any other visible text.
   No image may carry type the slide relies on, except a real screenshot, whose text is evidence and
   is never retyped.
2. **Proof is real.** A slide that asserts what a tool did, showed or cost is PROOF and shows a real
   screenshot or real captured output, saved to `carousels/<slug>/raw/` first and pasted from that
   file. Never fake a screenshot: with no real capture, tell the user and let them capture it, cut
   the claim, or move it. Everything else is ILLUSTRATION and never sits under a factual claim.
3. **Light backgrounds only.** A dark terminal or phone on the light ground is content; a dark slide
   ground is refused.
4. **Look at the renders, not the source.** Open every PNG, and for an animated deck every frame
   sheet, before anyone else sees it. A passing check is not a look.
5. **Two review lanes.** The scripts check the mechanics. A blind reviewer in a fresh context judges
   the slides (`references/review-checklist.md`). Neither replaces the other, and the user never
   sees a set the reviewer has not passed. A slide changed after review makes the whole set
   unreviewed.
6. **No em dashes and no en dashes** anywhere you write for the deck. `render.mjs` refuses them.

## Step 1: Interview

Use `AskUserQuestion`, two to four questions at a time, options rather than prose. Ask only what
changes the copy:

1. **Topic and the single promise.** What does the reader walk away believing or able to do?
2. **Slide count.** Default 8; six to nine is the normal band.
3. **The comment keyword.** One word, ALL CAPS, about 6 characters, and what the commenter gets.
   Ask every time.
4. **Static or animated?** Static is the default. Animated means each approved slide becomes a short
   silent video built from the same slide (Step 7). Record the answer in `copy.json` as
   `"animate": true` or `false`. Decide now so the layout leaves room for motion; build the motion
   last so a copy change never means redoing it.

Then confirm any real number that will appear (never invent one; open its source) and what the deck
is not about.

## Step 2: Write the copy, then Gate 1

Read `references/copy-formula.md` and write every slide into `carousels/<slug>/copy.json` before
building anything: the arc, about 8 slides, a hook from a named template, a rehook on every slide
between the cover and the CTA, the giveaway on the CTA slide only.

Then have the copy criticised before the user sees it. Spawn a fresh agent with the Agent tool,
give it `copy.json` and `references/copy-formula.md`, tell it nothing about who wrote it, and ask it
to read as a beginner scrolling Instagram: any jargon, any slide about process, whether each slide
would be saved or sent to a friend, whether each rehook is paid off by the next slide, whether the
set argues one thing, and the strongest rewrite it would make. Fix what holds up.

**Gate 1.** Show the user the copy sheet, slide by slide, with the critic's findings, including any
you overruled. Wait for their approval. Nothing is built before it.

## Step 3: Plan each slide and gather real images

For every slide decide, in one table: the label (PROOF or ILLUSTRATION), the visual that
demonstrates the headline's specific claim (not just the topic), where it comes from, and which
library piece builds it. For an animated deck add what moves and the one element that carries
across the swipe into the next slide; one carried element per pair is what makes the videos read as
one piece. No visual is used twice.

Gather what you can produce yourself first (run the command and save its output, screenshot a
public page with Playwright), then ask the user for the screenshots only they can take. Save
untouched captures in `carousels/<slug>/raw/` and slide-ready crops in `carousels/<slug>/assets/`.
Blur anything private, and treat a QR code as a password.

## Step 4: Build the slides in HTML

One file per slide, `carousels/<slug>/slides/slide-NN.html`, numbered from 01 (slide-NN is
`position` NN-1). Start from the closest slide in `examples/animated-carousel/slides/` and link the
library by relative path:

```html
<link rel="stylesheet" href="../../../library/tokens.css">
<link rel="stylesheet" href="../../../library/styles/product.css">
<link rel="stylesheet" href="../../../library/components/backgrounds.css">
<link rel="stylesheet" href="../../../library/components/next-teaser.css">
```

`references/library.md` lists every piece, the data attributes, and the type sizes that read on a
phone (headlines 108 to 184px, body 34 to 46px, text inside a window 27px or larger). Put the
rehook in a next-teaser pill (`<span data-copy="N.rehook">`) on every slide between the cover and
the CTA; the cover's pill reads "Swipe". Use one background for the whole deck, from `bg-gridsq`,
`bg-glowgrid` or `bg-rays`, and a different one from the user's last deck.

Brand: the user's colours and faces go in `library/tokens.css`; see the Brand section of
`references/library.md` for the two places that do not read the tokens.

## Step 5: Render and check

```bash
node library/render.mjs carousels/<slug>/slides --copy carousels/<slug>/copy.json
```

It must exit 0: every slide exactly 1080x1440, every word matching `copy.json` and placed, nothing
outside the 60px safe margin, no dashes, every face shipped and loaded. Fix the HTML and re-run
until it does. Then open every `slide-NN.png` yourself, at full size and at 350px wide.

## Step 6: Blind review, then Gate 2

Follow `references/review-checklist.md`: a fresh agent on the strongest model, given the PNGs,
`copy.json` and the images, told nothing about who built them. Fix the smallest set it names,
re-render, and send the whole set back. Two failed rounds on the same defect means change the
image or the layout, not the wording, or ask the user.

**Gate 2.** Show the user the slides in a three-across grid at their real 3:4 shape, with every
finding and what you fixed. Wait for approval. A static deck is done here; go to Step 8.

## Step 7: Animate, then Gate 3 (only when `copy.json` says `"animate": true`)

Runs only after Gate 2. The approved stills are the design; motion is added to the same files and
must come to rest exactly on them. Videos are silent: music is added in Instagram when posting, so
trending audio stays possible.

1. **Add motion to each approved slide.** Do not change the layout. Link the motion scripts and the
   background's motion file, mark choreography with `data-motion` (`type`, `rise`, `select`,
   `reselect`) and `data-at`, and finish every build by 2.5s. Details in `references/library.md`,
   "Animating a slide".
2. **Set the loop** in `copy.json`: `"motion": { "loop": "jump" }`, build then hold, for the set.
   The cover overrides to `"seamless"` so its first frame, the profile-grid thumbnail, is the
   approved cover: in its headline only the highlight moves (`reselect`), its visual moves with
   ambient motion that starts and ends on the still, and its Swipe pill's arrow nudges. The
   example cover's card swipes through the deck's own slides.
3. **Render and check:**

   ```bash
   node library/animate.mjs carousels/<slug>/slides --copy carousels/<slug>/copy.json
   ```

   It must end with `complete: every slide passed` and exit 0. It refuses to run if the approved
   PNGs changed since its snapshot; after re-approving a changed still, add `--refresh-stills`.
4. **Look at it.** Open every frame sheet in `carousels/<slug>/video/sheets/` and play a few MP4s.
   Then the blind review again, with the motion checklist, on the sheets, posters and
   `video/animate-report.json`.

**Gate 3.** Show the user the preview videos (`video/preview/slide-NN.mp4`) in the same
three-across grid and wait for approval.

## Step 8: Post

Upload the slides in order as one Instagram carousel: `video/slide-NN.mp4` for an animated deck,
`slides/slide-NN.png` for a static one. Add music in Instagram's editor. Write the caption in the user's voice with the comment keyword and what it delivers, and
make sure something actually answers that keyword before the post goes live: a comment CTA nobody
answers loses every lead.

## Files

| File | Role |
|---|---|
| `references/copy-formula.md` | The measured copy rules, hook templates, rehooks and `copy.json` shape |
| `references/library.md` | Every library piece, the data attributes, motion, brand, sources |
| `references/review-checklist.md` | The blind review, for stills and for motion |
| `library/render.mjs` | Renders and checks the slides |
| `library/animate.mjs` | Renders, checks and encodes the videos |
| `examples/animated-carousel/` | A finished seven-slide animated deck to start from |
| `library/test/` | `npm test` (fast) and `npm run test:animate` (slow, renders video) |
| `LICENSES.md` | Fonts, GSAP and component sources |
