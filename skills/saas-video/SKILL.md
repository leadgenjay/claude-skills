---
name: saas-video
description: >-
  Build premium, deterministic SaaS product-demo animations (MP4 / looping GIF /
  square) from your app's REAL production React components using Remotion — not
  screenshot rebuilds. Use when asked to create a saas demo video, product
  animation, animated GIF of a feature, launch/hero video, or "record" a UI flow.
  Includes the showcase doctrine that keeps a demo from ever depicting the product
  failing. Triggers: "saas video", "product demo video", "animated gif of
  <feature>", "remotion", "launch video", "hero animation", "record the UI".
---

# saas-video — Remotion product animations from your real UI

Produce landing-page-quality, deterministic animations of your app by mounting the
**real production React components** inside a Remotion composition and driving them
frame-by-frame. The output matches the product exactly — same typography, spacing,
brand color, components — because it *is* the product.

Default delivery set: **MP4 (1920×1080), a looping GIF, and a square 1080×1080 MP4.**

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and
tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Node 18+ | `node -v` | https://nodejs.org |
| A React app whose components you can import | `ls package.json` + confirm React in deps | this skill animates an existing app; it does not create one |
| Remotion + matching `@remotion/*` | `npx remotion versions` | `npm i remotion @remotion/cli @remotion/tailwind-v4 @remotion/google-fonts` — **pin every `@remotion/*` to the same version as `remotion`** |
| ffmpeg (only for frame extraction / re-encode) | `ffmpeg -version` | `brew install ffmpeg` (optional — Remotion renders without it) |
| Chromium for headless render | first `remotion render` downloads it | automatic; needs network on first run |
| Delivery folder (optional) | `echo "${DEMO_LIBRARY:-$HOME/Videos/product-demos}"` | any folder you want finished videos in — see step 10 |

If anything is missing, STOP. Do NOT generate placeholder bash.

**Licensing:** Remotion is free for individuals and small teams but requires a paid
company license above a team-size threshold. Confirm the user's situation before
adding the dependency — see https://remotion.dev/license.

## When to use

- A marketing/demo clip of an existing app surface (a data table, dashboard, tool,
  settings flow) for a landing page, ad, email, or social post.
- You want the **exact** production look — reuse the real components, never rebuild
  from a screenshot.

## Showcase doctrine (READ FIRST — what the video must DEPICT)

The rest of this skill covers *how* to build the video. This section is *what it must
show*, and it outranks everything else. These clips are marketing assets: every frame
is a screenshot a prospect will judge the product by.

This section exists because a v1 build shipped **110 of 300 frames (37%) showing the
app's empty state** — "No results match your filters", "0 match" — and nobody noticed
until a human watched it. Reusing real components means you inherit their **failure
states** too.

**Rule 1 — the product is always succeeding. There is no acceptable frame that shows
the app failing to deliver.** Never render, for even one frame:

- an empty state ("No results", "Try adjusting your filters", "Nothing here yet")
- a zero or `—` headline count ("0 results")
- an error state, a paywall/lock card, a "get started" / pre-search empty state
- a mostly-blank content area (dead space is the #1 tell that a demo is fake)

**Rule 2 — open on a populated surface.** Frame 0 already shows a full table/grid, a
real headline count, and filters that are already applied. Never animate "from nothing":
a count-up starting at `0`, or a table built by growing an array from `[]`, both put a
failure state on screen and both imply the product returns nothing.

Frame 0 is also the **poster frame** — it's what an MP4 shows before playback, what a
GIF shows paused, and what a social embed thumbnails. So a fade-in that starts at
`opacity: 0` ships a *blank* first frame. Start intro ramps partway (`0.6 → 1`) and let
blur/scale carry the focus-in; verify by looking at the frame-0 still.

**Rule 3 — refine, never build from empty.** The narrative is *broad healthy result →
add a filter → narrower, still-healthy result*. Numbers move **between two large
values** (e.g. `~4.18M → ~1.22M`). Never `0 → N`.

**Rule 4 — stagger with style, never with data.** To reveal rows, animate `opacity` /
`transform` on a **full** row set (inject CSS on `tbody tr:nth-child(n)`, driven by
frame). NEVER `rows.slice(0, revealed)` — a sliced-to-empty array hits the real
component's empty state, which is exactly Rule 1's failure.

**Rule 5 — reproduce the WHOLE surface, not a sketch of it.** Before writing an adapter,
open the real page component and **inventory every section**, then include all of them.
A demo that shows 3 of 9 filters makes the product look thin. This includes:

- the real page header (title, subtitle, stat pills, badges)
- every filter/control section in the real sidebar or toolbar, in the real order
- the real action bar — the actual buttons with their actual labels. Never invent a
  control the app doesn't have (a made-up "Export" button is a lie about the product).
- the "success" affordances that only appear mid-flow: selection banners, chips,
  counts, toasts. These are the most persuasive elements — build the storyboard so they
  appear on screen.

**Rule 6 — data fixtures are marketing copy.** Every visible row is fully populated:
no `null` field that renders as `—` in a visible column, plausible names/bios, big
believable numbers. Show a realistic *mix* of quality statuses where the app has them
(that showcases the underlying engine) — but never a row that looks like missing data.

**Enforcement:** the adapter must **throw** when handed an empty row set, so a violation
fails the render loudly instead of silently shipping a broken clip:

```ts
if (rows.length === 0) {
  throw new Error('showcase doctrine: never render the empty state — pass a full row set');
}
```

## Scaffold the workspace (first run in a repo)

Everything lives in a `remotion/` directory, isolated from your app's build:

```
remotion.config.ts            # entry, image format, Tailwind + path-alias webpack hooks
remotion/
  tsconfig.json               # isolates Remotion TS from the app build
  index.ts                    # registerRoot(RemotionRoot)
  Root.tsx                    # <Composition> registry
  styles.css                  # @import your app's global stylesheet
  fonts.ts                    # @remotion/google-fonts + CSS-var injection
  animation/                  # reusable primitives (cursor, camera, typewriter…)
  adapters/                   # prop-driven views that mount REAL components
  fixtures/                   # deterministic data typed to the app's real types
  compositions/               # the storyboarded scenes
```

Add scripts to `package.json` (adjust the composition id):

```json
"remotion:studio": "remotion studio remotion/index.ts",
"remotion:render": "remotion render remotion/index.ts MyDemo out/MyDemo.mp4",
"remotion:gif":    "remotion render remotion/index.ts MyDemo out/MyDemo.gif --codec=gif --width=960 --every-nth-frame=2",
"remotion:square": "remotion render remotion/index.ts MyDemoSquare out/MyDemoSquare.mp4"
```

**Isolation invariants (do not break):**

- If your app's `tsconfig.json` globs `**/*.tsx` (Next.js default), `remotion` **and**
  `remotion.config.ts` MUST go in its `exclude` array, with a separate
  `remotion/tsconfig.json` type-checking the workspace. Otherwise the video code lands
  in your production build and fails CI.
- **No app route may import from `remotion/`.** Dependencies are the only shared change.
- Keep every `@remotion/*` package pinned to the **same** version as `remotion`. Version
  skew across `@remotion/*` breaks the bundle with confusing errors.

Config wiring (path alias + Tailwind + fonts) is in
`references/real-component-mounting.md`. Copy-pasteable animation patterns — camera,
cursor, CSS row stagger, square reframe — are in `references/reference-implementation.md`.

**Note on repo command wrappers.** Some repos require a prefix on every `npm`/`npx`
call (e.g. a Socket Firewall `sfw` prefix). Check the repo's `AGENTS.md`/`CLAUDE.md` and
apply it to every command in this skill if so.

## Determinism rules (mandatory — a render must be identical every time)

- Drive ALL motion from `useCurrentFrame()` / `useVideoConfig()` + `interpolate` /
  `spring` / `Easing`. Never CSS `transition`/`animation`, `setTimeout`/`setInterval`.
- No `Date.now()`, `new Date()` (for timing), or `Math.random()`. Need randomness?
  Use Remotion's `random('seed')`. Fixtures use fixed literals + fixed `new Date('…')`.
- No `useState`/`useEffect` for animation state — components are pure functions of frame.
- Media: `<Img>` not `<img>`, `<OffthreadVideo>` not `<video>`, `<Audio>` not `<audio>`;
  `staticFile()` for `public/` assets.
- See `references/remotion-rules.md`.

## Mount recipe (real components, no rebuild)

Mount **leaf presentational components** (props in → UI out), never container/hook
components. A component is safe when its callbacks default to no-ops and it takes its
data as props. It is unsafe when it calls a hook that fetches, reads URL state, or
touches a client SDK — those will not bundle or won't render deterministically.

Full safe/unsafe taxonomy, the shim escape hatch, and how to neutralize a reused
component's own animations: `references/real-component-mounting.md`.

## Workflow for a NEW surface

1. **Scope + surface inventory.** Read the real **page** component and its container top
   to bottom, and write down every section it renders: header, each sidebar/toolbar block
   in order, the action bar's exact buttons, banners, chips, table, pagination. That list
   is the adapter's spec (Showcase Rule 5) — build all of it. Then confirm which pieces
   are safe leaves and which must be reproduced from leaves because the real one owns its
   state (a filter container, or an input whose value you must drive per frame).
2. **Fixtures.** `remotion/fixtures/<surface>.ts` — deterministic array matching the real
   type EXACTLY (no `as any`; fill every field; fixed dates). Every row fully populated
   per Showcase Rule 6. Export the headline numbers too — including a **pre-refine** and
   **post-refine** count so the storyboard can move between two large values instead of
   counting up from zero.
3. **Adapter.** `remotion/adapters/<Surface>VideoView.tsx` — reproduce the layout from the
   step-1 inventory with the real leaf components; take ALL dynamic state as props (the
   composition drives them per frame). Guard the row set (throw on empty, per the showcase
   doctrine). Inject a small `<style>` that kills `transition`/`animation` inside the view
   for determinism, and that carries the frame-driven row stagger.
4. **Primitives.** Build/reuse pure frame-driven helpers in `remotion/animation/` —
   animated cursor, camera frame, typewriter, count-up.
5. **Composition.** `remotion/compositions/<Surface>Demo.tsx` — a `useSceneState(frame)`
   that returns camera + view props + cursor per frame across labeled frame windows. Keep
   the camera transform to the intro/outro bookends; run interaction at scale 1 so
   absolute cursor coordinates line up with the rendered layout.
6. **Register.** Add `<Composition>`(s) to `remotion/Root.tsx` (1920×1080 + a square
   1080×1080 reframe).
7. **Tune with stills.** `npx remotion still remotion/index.ts <Id> out/f.png --frame=N
   --scale=0.5` at key frames; read the pixels; correct layout anchor coordinates.
8. **Showcase QA gate (MANDATORY — do not render final until this passes).** Sample the
   whole timeline, not just the beats you designed:

   ```bash
   for f in 0 25 50 75 100 125 150 175 200 225 250 275 299; do
     npx remotion still remotion/index.ts <Id> "out/frames/f$f.png" --frame=$f --scale=0.4
   done
   ```

   **Look at every one of them** (Read the PNGs — do not infer from code). Each frame
   must pass all of:
   - [ ] rows/content present — no empty state, no "No … match", no blank content area
   - [ ] headline count is a real number, never `0` / `—` / `…`
   - [ ] every section from the step-1 inventory is on screen (count the filter blocks)
   - [ ] no element clipped by the frame edge, and no row/control half-cut by its own
         card (check the LAST table row — it is the one that gets clipped, and it moves
         when a banner mounts mid-clip; size the row count for the *tallest* state, not
         the opening one)
   - [ ] no blank region inside the product surface larger than ~1/4 of the frame.
         Deliberate poster margins around an inset app window are design, not dead space —
         an empty results card is dead space. A 16:9 surface can't fill a 1:1 frame, so
         square variants pair the app with a headline block instead of letterboxing it
   - [ ] real typography (fonts loaded), no distorted/overlapping text
   - [ ] action bar shows the app's real buttons with real labels

   One failing frame = a defect. Fix and re-sample before rendering video.

   **Cheap variant:** render once at `--scale=0.4`, then pull the stills out of that MP4
   with ffmpeg instead of re-bundling per frame —
   `ffmpeg -i out/smoke.mp4 -vf "select=eq(n\,120)" -vframes 1 out/f120.png`.
9. **Smoke then full render.** Low-res first (`--scale=0.5`), then full.
10. **Deliver to an asset library.** `out/` is scratch (and usually gitignored) — it is
    NOT where a finished video lives. Every build gets **its own subfolder**, never loose
    files in the library root (one build is 3+ formats; loose files bury everything else):

    ```
    ${DEMO_LIBRARY:-$HOME/Videos/product-demos}/<surface-slug>_<YYYY-MM-DD>/
      <surface-slug>_<YYYY-MM-DD>.mp4
      <surface-slug>_<YYYY-MM-DD>.gif
      <surface-slug>-square_<YYYY-MM-DD>.mp4
    ```

    Ask the user where their library lives (or read `$DEMO_LIBRARY`) and **match the
    naming convention already in that folder** rather than imposing this one. Repeat the
    slug+date in the filenames even though the folder carries them: these get shared
    individually and must stand alone out of context. Never copy the composition ID
    verbatim (`MyDemo.mp4`) — it breaks name-sorted browsing.

    Delete the `out/frames/` QA stills before delivering; they are scratch. Verify each
    copy against its source (`md5 -q` / `md5sum`), then open **the subfolder** — not the
    library root.

    **Review playback (macOS):** never hand over a video or GIF with bare `open` — it
    routes to Preview.app, which shows both as a *static image*. Use
    `open -a "QuickTime Player" <file>.mp4` and `open -a "Google Chrome" <file>.gif`.
    Opening a folder needs an explicit raise or it appears behind the current window:
    `osascript -e 'tell application "Finder" to open POSIX file "<dir>" as alias' -e 'tell application "Finder" to activate'`.

## Commands

```
npm run remotion:studio     # interactive Studio (preview + prop editor)
npm run remotion:render     # MP4
npm run remotion:gif        # looping GIF (960w, every 2nd frame)
npm run remotion:square     # 1080x1080 square MP4

# single still (fast layout tuning):
npx remotion still remotion/index.ts <CompId> out/f.png --frame=120 --scale=0.5
# low-res motion smoke test of any render script: add  -- --scale=0.5
```

Type-check the workspace with `npx tsc --noEmit -p remotion/tsconfig.json`, and confirm
your app's own `tsc --noEmit` still passes (proves the isolation held).

## Gotchas (the expensive lessons)

- **A sliced-to-empty row array renders the app's EMPTY STATE.** Reusing real components
  means you inherit their failure states: `rows.slice(0, revealed)` with `revealed = 0`
  makes the real table print "No results" — a v1 demo shipped 110 of 300 frames (37%) in
  that state. Stagger with CSS on a full array (Rule 4), and keep the adapter's empty-set
  `throw` so this can never ship silently again.
- **A count that animates from 0 shows "0 results".** Interpolate between two real counts
  instead, and format them through the app's own formatter so magnitude and any `~`
  approximate marker match production.
- **One number must feed every place it appears.** A separately-animated header count and
  table footer will disagree mid-transition. Compute it once in `useSceneState` and pass
  it everywhere.
- **Hand-rolling "close enough" chrome makes the product look thin, and drifts.** A v1
  adapter invented a 3-filter sidebar against the app's real 9, plus an "Export" button
  that does not exist. Build from the real page's inventory (workflow step 1) and mount
  real leaves so it can't drift.
- **A real component's internal state can't be frame-driven.** A filter block that owns
  its input value in `useState` can't be driven by a typewriter. Reproduce just that block
  from the real leaves it already uses (filter section + input + badge) and keep everything
  around it real — don't rebuild the whole rail because of one input.
- **Size the row count for the video's TALLEST state.** A banner mounting mid-clip pushes
  the grid down and clips the last row. Anchor coordinates measured before that shift are
  wrong after it — re-measure in the shifted layout.
- **A Next.js `tsconfig` include of `**/*.tsx`** drags the workspace into the app build
  unless `remotion` is in `exclude`. Verify the app's `tsc --noEmit` stays at 0.
- **`next/font` can't run under Remotion** → use `@remotion/google-fonts` and inject the
  same `--font-*` CSS variables your app expects, gated by `delayRender`.
- **Mount leaf components only.** A hook/container component (data fetch, URL state,
  server component) will not bundle or won't render deterministically.
- **`@remotion/tailwind-v4` peer deps**: `@tailwindcss/webpack`, `style-loader`,
  `css-loader` must resolve (usually transitive; install them if not).
- **Sandboxed agents often can't write to skill/config dirs** (`.claude/`, `.agents/`).
  If delegating this work to a sandboxed worker, write those files yourself.

## References

- `references/remotion-rules.md` — determinism + Remotion API/CLI cheat-sheet.
- `references/real-component-mounting.md` — config wiring, safe/unsafe component
  taxonomy, shims, neutralizing a reused component's own animations.
- `references/reference-implementation.md` — copy-pasteable patterns from a shipped
  build: poster-safe camera bookends, CSS row stagger, cursor anchoring, square reframe.
