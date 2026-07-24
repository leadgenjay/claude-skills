# Remotion rules & API cheat-sheet

Remotion renders React frame-by-frame in headless Chromium. Every frame must be a
pure function of `useCurrentFrame()`. Break that and renders flicker or differ run
to run.

## Hard determinism rules

- Motion ONLY from `useCurrentFrame()` / `useVideoConfig()` + `interpolate` / `spring`
  / `Easing`. Never CSS `transition`/`animation`, `requestAnimationFrame`,
  `setTimeout`/`setInterval`.
- No `Date.now()` / `new Date()` for timing, no `Math.random()`. Use `random('seed')`.
- No `useState`/`useEffect` for animation. Data effects that must run before a frame
  is ready → `delayRender()` … `continueRender(handle)`.
- Media tags: `<Img>` (not `<img>` / Next's `<Image>`), `<OffthreadVideo>` (not
  `<video>`), `<Audio>` (not `<audio>`). Assets from `public/` via `staticFile('x.png')`.

## Core APIs

```tsx
import {
  AbsoluteFill, Sequence, Series, Composition,
  useCurrentFrame, useVideoConfig, interpolate, spring, Easing,
  delayRender, continueRender, random, Img, OffthreadVideo, Audio, staticFile,
} from 'remotion';

const frame = useCurrentFrame();
const { fps, durationInFrames, width, height } = useVideoConfig();

// Linear (always clamp at edges):
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

// Eased:
interpolate(frame, [0, 25], [1.06, 1], { easing: Easing.out(Easing.cubic), ... });

// Natural motion:
const p = spring({ frame: Math.max(0, frame - startFrame), fps, config: { damping: 200 } });
```

Always clamp both extrapolations. An unclamped `interpolate` keeps extrapolating past
its input range and silently produces negative opacity or runaway scale off-window.

- **Layering**: later `AbsoluteFill` children render in front. Use
  `<Sequence from=… durationInFrames=…>` to time-shift a subtree's local frame;
  `<Series>` for back-to-back segments.
- **Dynamic duration/size**: `calculateMetadata` on a `<Composition>`. Props can be
  described with Zod for Studio controls — optional; plain `defaultProps` is fine and
  avoids a runtime dep.

## Render flags (CLI)

```
remotion render <entry> <CompId> <out.mp4>          # H.264 MP4 (default)
  --codec=gif  --width=960 --every-nth-frame=2      # small looping GIF
  --codec=vp9  out.webm                             # WebM, if a target needs it
  --scale=0.5                                       # low-res smoke test
  --frames=0-59                                     # subset
remotion still <entry> <CompId> <out.png> --frame=N --scale=0.5   # one frame
```

- Transparent output needs an alpha codec (`--codec=prores --prores-profile=4444`, or a
  PNG sequence) AND a composition with no opaque background fill.
- **Motion blur** (use sparingly, for fast pans): `@remotion/motion-blur`'s `<Trail>` /
  `<CameraMotionBlur>` wrappers.
- GIF is loop-friendly but large — keep it short, downscale (`--width=960`), and drop
  every other frame. A 10s 1080p GIF is multiple MB no matter what you do.

## Extracting many stills cheaply

`remotion still` re-bundles the project on every call, so 13 stills = 13 bundles. When
you need a contact sheet, render one low-res video and pull frames out of it:

```bash
npx remotion render remotion/index.ts MyDemo out/smoke.mp4 --scale=0.4
for f in 0 50 100 150 200 250 299; do
  ffmpeg -y -i out/smoke.mp4 -vf "select=eq(n\,$f)" -vframes 1 "out/frames/f$f.png"
done
```

## Loop seams

A clean loop needs frame `N` ≈ frame `0`. Persisted state (selections, typed text,
revealed rows) usually won't reset, so mirror the intro's camera treatment at the tail —
ease scale/blur/opacity back toward the opening values — rather than promising a
pixel-perfect loop.
