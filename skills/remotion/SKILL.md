---
name: remotion
description: >-
  Remotion video composition skill for creating programmatic videos with React.
  This skill should be used when working with Remotion code, creating video
  compositions, rendering videos, or building motion graphics. Triggers on
  "remotion", "video composition", "render video", "programmatic video",
  "video editing", "motion graphics video", "vertical video", "short-form video",
  "talking head video", "storyboard video", "b-roll overlay", "data graphic",
  "title card", "caption overlay", "screenshot b-roll".
---

# Remotion Video Composition

Create React-based video compositions rendered frame-by-frame with Remotion. Full documentation available via the `remotion-documentation` MCP server.

## When to Use

- Creating programmatic videos with React components
- Building motion graphics, explainer videos, or animated content
- Rendering videos from data (captions, segments, overlays)
- Building vertical (9:16) short-form videos with storyboard-driven segments
- Creating animated data graphics (tables, process steps, elimination lists)
- Capturing screenshot B-roll from web pages for video overlays
- Working with the video-editor pipeline (see `references/video-editor-integration.md`)

## Core Concepts

### Project Structure

The Root file (`src/Root.tsx`) defines compositions — each is a renderable video:

```tsx
import {Composition} from 'remotion';
import {MyComp} from './MyComp';

export const Root: React.FC = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComp}
      durationInFrames={120}
      width={1920}
      height={1080}
      fps={30}
      defaultProps={{}}
    />
  );
};
```

Defaults: 30 fps, 1920x1080, "MyComp" ID. Use `calculateMetadata` for dynamic duration/dimensions. Define props with Zod schemas for visual UI controls.

### Frame-Based Animation

Access the current frame (starts at 0) and video config:

```tsx
import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export const MyComp: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, height, width} = useVideoConfig();

  // Linear interpolation
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Spring animation (preferred for natural motion)
  const scale = spring({fps, frame, config: {damping: 200}});

  return (
    <div style={{opacity, transform: `scale(${scale})`}}>
      Hello World
    </div>
  );
};
```

### Critical Rules

- **Frame-based only** — all animations driven by `useCurrentFrame()`, never CSS animations/transitions
- **Deterministic** — no `Math.random()`, use `random('seed')` from remotion
- **No interactivity** — no `onClick`, `onHover`, `useState` for UI state, no event handlers
- **No side effects** — avoid `useEffect`, keep components pure
- **Use Remotion components** — `<Img>` not `<img>`, `<OffthreadVideo>` not `<video>`, `<Audio>` not `<audio>`

## Component Reference

### Media Components

```tsx
import {OffthreadVideo, Img, Audio, staticFile} from 'remotion';
import {Gif} from '@remotion/gif';

// Video — use OffthreadVideo (NOT HTML video)
<OffthreadVideo src={staticFile('video.mp4')} startFrom={30} endAt={120} volume={0.8} />

// Image — use Img (NOT HTML img, NOT Next.js Image)
<Img src={staticFile('photo.png')} style={{width: '100%'}} />

// Audio
<Audio src={staticFile('music.mp3')} startFrom={0} endAt={150} volume={0.5} />

// GIF (requires @remotion/gif)
<Gif src={staticFile('animation.gif')} style={{width: '100%'}} />
```

Properties: `startFrom` (trim frames from start), `endAt` (limit duration), `volume` (0-1). Use `staticFile()` for `public/` folder assets.

### Layout & Timing

```tsx
import {AbsoluteFill, Sequence, Series} from 'remotion';

// Layering — later children render in front
<AbsoluteFill>
  <AbsoluteFill style={{background: 'blue'}} />  {/* back */}
  <AbsoluteFill />  {/* front */}
</AbsoluteFill>

// Delayed appearance — child's useCurrentFrame() resets to 0
<Sequence from={30} durationInFrames={60}>
  <MyComponent />  {/* appears at frame 30, sees frame 0 internally */}
</Sequence>

// Sequential playback
<Series>
  <Series.Sequence durationInFrames={30}><SceneA /></Series.Sequence>
  <Series.Sequence durationInFrames={45}><SceneB /></Series.Sequence>
  <Series.Sequence durationInFrames={30} offset={-10}><SceneC /></Series.Sequence>
</Series>
```

### Transitions

```tsx
import {TransitionSeries, springTiming, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}><SceneA /></TransitionSeries.Sequence>
  <TransitionSeries.Transition timing={springTiming({config: {damping: 200}})} presentation={fade()} />
  <TransitionSeries.Sequence durationInFrames={60}><SceneB /></TransitionSeries.Sequence>
  <TransitionSeries.Transition timing={linearTiming({durationInFrames: 30})} presentation={wipe()} />
  <TransitionSeries.Sequence durationInFrames={60}><SceneC /></TransitionSeries.Sequence>
</TransitionSeries>
```

## Quick-Start Workflow

1. **Scaffold**: `npx create-video@latest` (select Blank + TailwindCSS + Skills)
2. **Compose**: Build components in `src/`, define in `Root.tsx`
3. **Preview**: `npm run dev` (opens Remotion Studio)
4. **Render**: `npx remotion render MyComp output.mp4`

## Production Video Workflow

For storyboard-driven short-form video (9:16 vertical):

1. **Transcribe** — Word-level timestamps via Whisper (medium.en model)
2. **Storyboard** — Build segment JSON: assign display modes (`split`/`full_head`/`full_content`), graphic types, step labels
3. **Capture B-roll** — Screenshot web pages via Playwright (see `references/screenshot-pipeline.md`), save to `public/`
4. **Build graphics** — Create data graphics (DataTable, ProcessSteps, EliminationList) from storyboard data
5. **Compose** — Wire storyboard into ShortFormEdit: avatar layer + graphics panel + captions + title card
6. **QA** — Verify: text legibility at mobile size, caption sync, avatar framing, mode transitions. Score >= 90/100
7. **Render** — `npx remotion render ShortFormEdit output.mp4`

## Talking Head Short Checklist

Before rendering any talking-head short-form video, verify ALL items:

### Pre-render (Mandatory)
- [ ] **Silence/filler removal** — NEVER render raw footage. Run `roughcut-*.ts` script first (Silero VAD + detectFillers + buildEdl + applyEdl). Expect 30-40% duration reduction
- [ ] **Trim leading silence** — always cut dead air before the first word. Keep 50ms pre-roll max. The roughcut pipeline adds a synthetic cut from `0` to `firstWord.start - 0.05` automatically
- [ ] **Don't cut pauses < 0.3s** — use `silenceBuffer: 0.3` (300ms) in buildEdl to preserve natural speech rhythm. Detect silences at `minDuration: 0.5` but the buffer ensures only silences > ~1.1s are actually removed
- [ ] **Review transcript after edit** — ALWAYS review the roughcut transcript output. Verify no meaningful words were cut. Re-check any flagged gaps (>0.5s between words). The script prints `[CUT]` lines for removed words and `[GAP]` lines for suspicious gaps
- [ ] **Remap word timestamps** — after cuts, offset all subsequent word timestamps by `-cutDuration` so captions stay synced
- [ ] **Target duration** — final video should be under 40s for Reels/TikTok (60s absolute max)

### Captions
- [ ] **Font size minimum: 108px** at 1080x1920 — 36px is illegible on mobile. `CAPTION_FONT_SIZE` in design-system.ts
- [ ] **Pill padding scales with fontSize** — `padding: ${fontSize * 0.33}px ${fontSize * 0.67}px`
- [ ] **wordsPerGroup: 2** for pill style — single-line only, never wrap to 2 lines. Max 2 words per pill group. `PILL_DEFAULTS.wordsPerGroup` in design-system.ts
- [ ] **Pill flexWrap: nowrap** — caption pill container must use `flexWrap: 'nowrap'` to enforce single-line rendering
- [ ] **Caption position** — bottom 10-15% of frame, never overlapping face

### Title Card
- [ ] **No full-screen dark backdrop** — KineticTitle renders text with motion blur over the video. Never add `AbsoluteFill` with `backgroundColor: rgba(0,0,0,...)`
- [ ] **Accent color: #ED0D51** (brand pink, not default red)

### Audio
- [ ] **Background music** from `/Users/jayfeldman/Nextcloud/Music Library for Videos/` — only use `yes-` prefixed tracks (pre-approved). `maybe-` tracks need user approval. `buildup-` tracks for non-talking sections only. (See `references/music-library.md`)
- [ ] **Music volume: 0.10** (Remotion `volume` prop) — barely perceptible under voice
- [ ] **Normalize to -16 LUFS** — `audio.targetLufs: -16` in EDL config
- [ ] **Fade music** — 1-2s fade in/out, never hard cut

### QA
- [ ] Captions synced with speech throughout (spot-check 3+ points)
- [ ] Text legible at mobile size (captions fill ~50-60% of screen width)
- [ ] No long silences or "um/uh" remain
- [ ] Title card shows video behind text (transparent, no black overlay)
- [ ] Music is subtle — voice always dominates

## Detailed References

For comprehensive rules on all Remotion features (30+ topics):
- `references/rules.md` — animations, media, fonts, captions, charts, 3D, transitions, utilities
- `references/video-editor-integration.md` — existing video pipeline, B-roll/music catalogs, critical gotchas
- `references/production-patterns.md` — spring presets, layer architecture, storyboard schema, 7 reusable components, data graphic templates
- `references/screenshot-pipeline.md` — Playwright screenshot capture recipe for deterministic B-roll
- `references/music-library.md` — 25-track catalog, audio level preferences, mood-based selection guide

## Packages

| Package | Purpose |
|---------|---------|
| `remotion` | Core framework |
| `@remotion/cli` | CLI tools, Remotion Studio |
| `@remotion/renderer` | Programmatic rendering |
| `@remotion/player` | In-browser video player |
| `@remotion/captions` | Caption rendering + SRT import |
| `@remotion/transitions` | Scene transitions (fade, wipe, etc.) |
| `@remotion/gif` | Animated GIF support |
| `@remotion/google-fonts` | Google Fonts loading |
| `@remotion/three` | Three.js 3D integration |
| `@remotion/lottie` | Lottie animation support |
| `@remotion/shapes` | SVG shape primitives |

## Lessons Learned

- [2026-04-05] [CAPTION_MAX_WIDTH]: Caption pills must constrain max-width to 90% and use flexWrap: wrap to prevent text clipping at right edge. Font size 108px with padding demands tight bounds. Add maxWidth style to pill container div.
- [2026-04-05] [TITLE_CAPTION_TIMING]: KineticTitle and first caption must not overlap. Increase title.durationSec to 2.0s minimum, and ensure first caption word starts after title animation completes. Use manifest timing to delay captions if needed.
- [2026-04-05] [SENTENCE_BOUNDARY]: Pill caption grouping must detect sentence-end punctuation (., !, ?) and force new group immediately after. Don't split sentences across groups. Modify wordGroups builder to check SENTENCE_ENDERS.has(word.text.slice(-1)).
- [2026-04-05] [TITLE_INITIAL_FRAME]: KineticTitle animation must have 3-4 static, readable frames before spring animation starts. Add animFrame = Math.max(0, frame - 3) offset to delay all animations. Frames 0-2 will show unblurred text at initial scale.
- [2026-04-05] [WORD_HYPHENATION]: Caption pills must use CSS word-break: keep-all and whiteSpace: nowrap on word spans to prevent hyphenation and awkward wrapping of compound words (one-time, end-to-end, etc.).
- [2026-04-05] [END_CTA_REQUIRED]: Talking-head videos must end with a CTA caption, not silent footage. Add final transcription word with CTA text (e.g., "Claim now.") at final timestamp, starting 1s before video end. Never have > 1s of silent staring at video end.
- [2026-04-05] [LEADING_SILENCE]: Always trim dead air before first spoken word. Roughcut pipeline adds synthetic cut from 0 to firstWord.start - 0.05s. Even 0.1s of leading silence hurts hook delivery.
- [2026-04-05] [SILENCE_BUFFER]: Use silenceBuffer: 0.3 (300ms) in buildEdl. VAD gaps < 0.2s are auto-skipped. Preserves natural pauses. Previous FFmpeg silencedetect + 0.15 buffer was too aggressive and inaccurate.
- [2026-04-05] [SILERO_VAD]: Use Silero VAD (python/detect_speech.py) for silence detection instead of FFmpeg silencedetect. ML-based, finds precise speech boundaries. Invert speech segments to get silence gaps. 10x more accurate than threshold-based detection.
- [2026-04-05] [TRANSCRIPT_REVIEW]: Always review roughcut transcript output before rendering. Script prints [CUT] for removed words and [GAP] for suspicious gaps >0.5s. Verify no meaningful words were lost.
- [2026-04-05] [CAPTION_SINGLE_LINE]: Caption pills must be single-line. wordsPerGroup: 2, flexWrap: nowrap. 3 words caused wrapping at 108px fontSize with 90% maxWidth. 2 words stays single-line reliably.
- [2026-04-05] [MUSIC_LIBRARY]: Background music must come from `/Users/jayfeldman/Nextcloud/Music Library for Videos/`. Only `yes-` prefixed tracks are pre-approved. `maybe-` tracks need user approval. `buildup-` tracks for non-talking sections only.
