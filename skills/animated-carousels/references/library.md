# The carousel library

Instagram carousel slides authored as HTML at 1080x1440, rendered to PNG by Playwright and, when
animated, to silent MP4 by HyperFrames. Type is real text, so it is exact and editable.

Every path below is relative to the skill folder.

## Layout

| Path | What it is |
|---|---|
| `library/tokens.css` | Brand tokens and the slide frame. Imports `fonts/fonts.css`. Link it first on every slide. |
| `library/fonts/` | Vendored faces: Big Shoulders Display 700 to 900, Manrope 400 to 800, Geist Mono 400 to 600, all SIL OFL 1.1 (`OFL.txt`). `fonts.css` is also the font allowlist `render.mjs` enforces. |
| `library/styles/product.css` | The base style: light slate ground on a 60px hairline grid, uppercase headlines, the text-selection highlight (`.sel`), pills, cards, a dark terminal. |
| `library/components/tui.css` | A Claude Code session in a light terminal window (`.tui`, `.tui-prompt`, `.tui-text`, `.tui-tool`). |
| `library/components/mod-window.css` | A white app window with a title bar, main column, side pane and an accent name tag (`.mw`). |
| `library/components/cta-button.css` | The CTA: accent fill, thick ink outline, hard shadow (`.cta-btn`). |
| `library/components/next-teaser.css` | The swipe cue: a pill with an arrow. `.swipe` reads "Swipe" on the cover; `.rehook` carries the slide's rehook on every slide between the cover and the CTA. |
| `library/components/backgrounds.css` | Light slide backgrounds: `bg-gridsq` (grid with squares), `bg-glowgrid` (grid with a glow), `bg-rays` (light rays), and the still-only `bg-dots`, `bg-ripple`, `bg-flicker`. |
| `library/components/orbit.css`, `kbd.css` | Circles on orbits around a centre; keyboard key caps. |
| `library/render.mjs` | Renders and checks a folder of `slide-NN.html`. |
| `library/motion/` | The animated layer, opt-in per slide: `motion.js` (one paused GSAP timeline built from `data-motion` attributes), `rays.css`, `gridsq.css`, `glowgrid.css` (the backgrounds moving), `next-teaser.css` (the swipe arrow nudging), `vendor/gsap.min.js` (GSAP 3.14.2), `thresholds.json` (every `animate.mjs` limit). |
| `library/animate.mjs` | Turns approved slides into silent 1080x1440 MP4s with HyperFrames and checks them. |
| `library/test/` | `node --test` suites for both scripts. |
| `examples/animated-carousel/` | A finished seven-slide animated deck: `copy.json`, `slides/`, and the cover's reel images. Start a new slide from the closest one here. |

## Building a slide

1. Write `copy.json` (`slides[].position`, `headline`, `body`, `rehook`). Every visible string comes
   from it.
2. One `slide-NN.html` per slide, numbered from 01; slide-NN is `position` NN-1. Link
   `library/tokens.css` and `library/styles/product.css`, then any component, by relative path.
   A deck in `carousels/<slug>/slides/` links `../../../library/tokens.css`.
3. Mark copy `data-copy="<position>.<field>"`, recreated interface text `data-ui`, and any box that
   must stay inside the 60px margin `data-box`. An element meant to run off the edge carries
   `data-bleed`.
4. Render and check:

   ```bash
   node library/render.mjs carousels/<slug>/slides --copy carousels/<slug>/copy.json
   ```

   Exit 0 only when every slide passes: exact size, copy matches `copy.json`, nothing dropped, no
   stray text, nothing outside the safe margin, no em or en dash, and every face the text uses is
   listed in `fonts/fonts.css` and loaded. A slide with no text fails the font check rather than
   passing it with nothing tested. The platform font (`-apple-system`, `system-ui`) is allowed
   only inside `data-ui` chrome. It writes `slide-NN.png` beside each HTML file and
   `render-report.json`.

## Type on a phone

Instagram shows a slide about 350px wide. Headlines 108 to 184px, body 34 to 46px, text inside any
window, terminal or card 27px or larger. The `tui.css` default of 22px is too small: override it on
the slide. Muted text in a frame stays `#4b5563` or darker on white. Only the shipped weights
exist; a `<b>` inside Geist Mono defaults to 700, which is not shipped, so set `font-weight: 600`.
Buttons, pills and tags size to their text: padding and `white-space: nowrap`, never a fixed width.

## Animating a slide

The same `slide-NN.html` serves the still and the video. `motion.js` settles the slide to its rest
state everywhere except inside a HyperFrames render, so `render.mjs` still checks it.

1. Link `library/motion/vendor/gsap.min.js` then `library/motion/motion.js` before `</body>`, and
   the background's motion file after the component CSS (`motion/gridsq.css` for `bg-gridsq`,
   `motion/glowgrid.css` for `bg-glowgrid`, `motion/rays.css` for `bg-rays`).
2. Mark choreography with `data-motion` and a start time in seconds, `data-at`:
   - `type` types a line left to right; wrap only the typed words in a `<span>`.
   - `rise` fades in from 28px below. The default entrance.
   - `pop` scales in. Avoid it: scaling failed the same-every-time check repeatedly in testing.
   - `select` sweeps the `.sel` highlight across its phrase.
   - `reselect` starts drawn, clears and sweeps back, so frame 0 is the still. Use it on a cover.
   Everything must finish by 2.5s. Ambient CSS loops may run the whole clip.
3. Set the loop in `copy.json`, which is required: `"motion": { "loop": "jump" }` builds then
   holds and restarts from empty (the default house style). `"seamless"` must end where it began
   (use it on the cover, with only ambient motion and a `reselect`). `"return"` plays the build in
   reverse before the end. A slide's own `slides[i].motion.loop` overrides the set.
4. Every next-teaser arrow nudges if the slide links `library/motion/next-teaser.css`. It rests
   until 45% of the clip, so `animate.mjs` refuses a clip shorter than about 5.6s on such a slide.
5. Render and check:

   ```bash
   node library/animate.mjs carousels/<slug>/slides --copy carousels/<slug>/copy.json [--duration 6]
   ```

   It snapshots the approved stills to `carousels/<slug>/stills/` and refuses if they later
   change (rerun with `--refresh-stills` after you re-approve a changed still). It runs the still
   checks on the rest state, requires the visible text to match the still word for word and the
   pixels within 0.01%, checks the build ends by 2.5s, renders every slide twice and requires the
   two renders to match, checks the loop seam, and encodes H.264 with no audio. Output:
   `carousels/<slug>/video/slide-NN.mp4`, `slide-NN-poster.png`, `preview/slide-NN.mp4`
   (540x720), `sheets/slide-NN.png` (eight frames: 0s, 0.5s, 1s, 1.5s, 2s, 2.5s, mid-clip and the
   last frame) and `animate-report.json`. Exit 0 all pass, 1 a check failed, 2 refused.
   `--only 3,5` is for iterating; a deck is done only when a full run prints
   `complete: every slide passed`.

## What renders the same every time, and what does not

HyperFrames renders are not bit-identical run to run (GPU drawing differs in the lowest bits), so
`animate.mjs` judges two renders at the pixel level against `thresholds.json`. In testing these
reproduced: translate and opacity moves, a modest blur on a still layer, a fixed layer whose
opacity changes. These did not: blend modes, large blurs or rotation on moving layers, moving
`background-position`, `pop` (a scale), an SVG moved by its own `transform` rather than a wrapping
element, an element centred with `translateX(-50%)` that also rises (centre it by layout and rise
a wrapper), a strip of images that jumps a long way in one frame (cover the landing with a fixed
copy faded in, as the example cover does), and moving images much larger than they display (size
images to their on-screen pixels). Use `rise`, not `pop`.

## Brand

`library/tokens.css` is the brand file. Set `--accent`, `--accent-deep` and `--accent-soft`, and
the faces in `--font-head`, `--font-body` and `--font-mono`. Two places do not read the tokens:

- `components/backgrounds.css` writes the accent tint as `rgba(37, 99, 235, a)` and, inside data
  URIs, as `rgba%2837%2C99%2C235%2C...%29`. Replace both with your accent's RGB.
- Inline SVG strokes on the example slides (`stroke="#2563EB"`). The next-teaser arrow already
  follows `--accent`.

A new face goes into `fonts/` as woff2 with one `@font-face` per weight in `fonts/fonts.css`.
`render.mjs` refuses any face not listed there, so a slide can never silently fall back to a
system font. Ship only faces whose licence allows it.

## Sources

The components were written by hand as static HTML and CSS, animation frozen at rest. No
component code or screenshot from these sources ships; the 21st.dev entries are the looks they were
drawn after:

| Source | How it was used | Used as |
|---|---|---|
| 21st.dev Terminal (id 28361) | redrawn in CSS after its look | `tui.css`, `mod-window.css`, the `.term` block in `product.css` |
| 21st.dev Announcement (539), Chip (3259), Stepper (28565) | redrawn in CSS after their look | pills and badges in `product.css` |
| 21st.dev Message Bubble (34988) | redrawn in CSS after its look | the comment composer on the example CTA slide |
| Magic UI Orbiting Circles, Dot Pattern, Ripple, Flickering Grid, Light Rays, Grid Pattern | MIT, ported to CSS | `orbit.css`, `backgrounds.css`, `motion/rays.css`, `motion/gridsq.css` |
| shadcn/ui Kbd | MIT, ported to CSS | `kbd.css` |
| ibelick background snippets (21st.dev 6678) | redrawn in CSS after its look | `bg-glowgrid`, `motion/glowgrid.css` |
| GSAP 3.14.2 | vendored unmodified, GSAP Standard License | `motion/vendor/gsap.min.js` |
