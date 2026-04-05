# Production Video Patterns

Battle-tested Remotion patterns for vertical (9:16) short-form video. Extracted from the `video-editor` pipeline's ShortFormEdit composition and shared component library.

**Format:** 1080x1920 at 30fps. All components designed for mobile-first vertical video.

---

## Spring Config Presets

Four tested spring configurations exported from `design-system.ts`. Use these instead of inventing custom configs:

```tsx
// Natural entrance — slides, fades, general purpose
export const SPRING_ENTRANCE = { damping: 14, stiffness: 120 };

// Snappy pop — captions, emphasis, attention
export const SPRING_POP = { damping: 18, stiffness: 200 };

// Card slide-up — cards, panels, containers
export const SPRING_CARD_SLIDE = { damping: 16, stiffness: 140 };

// Title card — fade in/out only, no movement
export const SPRING_TITLE = { damping: 14, stiffness: 100 };
```

### Timing Constants

```tsx
export const STAGGER_FRAMES = 20;        // Delay between staggered items
export const CROSSFADE_FRAMES = 4;       // Crossfade overlap between segments
export const FADE_FRAMES = 6;            // Standard fade in/out duration
export const TITLE_DURATION_FRAMES = 45; // 1.5s at 30fps
export const MOTION_BLUR_FRAMES = 12;    // Blur-to-sharp entrance duration
```

### Design Tokens

```tsx
export const COLORS = {
  background: '#EEEAE4',    // Warm linen
  card: '#FFFFFF',           // White
  textPrimary: '#0A0A0A',   // Near-black
  textSecondary: '#888888',  // Gray
  textBody: '#1A1A1A',      // Dark gray
  highlight: '#E8342A',     // Red (configurable — swap for brand color)
  success: '#22C55E',       // Green
  accent: '#FF3B30',        // Bright red
  avatarBg: '#E8E4DF',      // Warm gray (behind talking head)
  cardBorder: '#F0ECE6',    // Subtle border
};

// Typography — configurable, not hardcoded
export const FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const KEYWORD_FONT_SIZE = 64;
export const CAPTION_FONT_SIZE = 32;
export const BODY_FONT_SIZE = 18;

// Layout
export const BROLL_PANEL_HEIGHT = 720;   // Top panel in split mode (px, not %)
export const GRID_SIZE = 60;             // Background grid spacing
export const GRID_OPACITY = 0.04;        // Background grid line opacity
export const CARD_BORDER_RADIUS = 24;
export const CARD_SHADOW = '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)';
```

---

## Layer Architecture

Z-index stack for the ShortFormEdit composition. Later layers render in front:

| Z-Index | Layer | Component |
|---------|-------|-----------|
| 0 | Background | `TenexBackground` (warm linen + grid) |
| 1 | Avatar | `AvatarLayer` (talking head video) |
| 5 | B-roll / Graphics | `GraphicsPanel` (screenshots, data graphics, video clips) |
| 80 | Step labels | `StepLabel` (dark pill badge) |
| 100 | Captions | `CaptionOverlay` (white pill, word-level) |
| 150 | Title card | `TitleCard` (opacity fade in/out, fixed position) |

### Three Display Modes

Each storyboard segment declares a `mode` that controls layout:

```tsx
type DisplayMode = 'split' | 'full_head' | 'full_content';
```

| Mode | Avatar | Content Panel | Use Case |
|------|--------|---------------|----------|
| `split` | Bottom portion visible | Top 720px panel | B-roll or graphic above talking head |
| `full_head` | Full screen | None | Pure talking head, no overlays |
| `full_content` | Fades out (6 frames) | Full screen | Full-screen graphic or screenshot |

**Split mode panel:** Always 720px fixed height (not percentage). Content is positioned `{ top: 0, left: 0, width: '100%', height: 720 }`.

**Avatar fade:** In `full_content` mode, avatar fades out over 6 frames at segment start, fades back in over 6 frames when returning to `split` or `full_head`.

---

## Storyboard-Driven Composition

The entire video is driven by a storyboard JSON manifest. The composition reads segments and maps them to `<Sequence>` elements.

### Storyboard Schema

```tsx
interface ShortFormSegment {
  id: number;
  start: number;              // seconds
  end: number;                // seconds
  mode: 'split' | 'full_head' | 'full_content';
  description?: string;       // human-readable note
  graphicType?: 'data-table' | 'process-steps' | 'elimination-list';
  graphicData?: Record<string, unknown>;
  stepLabel?: { number: number; label: string };
  brollClip?: { clipId: string; clipPath: string; description: string };
  screenshotPlaceholder?: { description: string; url?: string };
}

interface ShortFormManifest {
  version: 1;
  sourceFile: string;           // talking head video path
  storyboard: {
    segments: ShortFormSegment[];
    talkingHeadRatio?: number;  // target: 20-25%
  };
  transcription: {
    words: { text: string; start: number; end: number }[];
    language: string;
  };
  captions?: {
    style: 'pill';
    splitPosition: string;      // '88%' — bottom offset in split mode
    fullContentPosition: string; // '75%' — bottom offset in full_content mode
    wordsPerGroup: number;       // default 3
    fontSize: number;            // default 32
    fontFamily: string;
  };
  backgroundMusic?: {
    src: string;
    volume: number;              // 0.08-0.15 typical
    trackDurationSec: number;
  };
  title?: {
    line1: string;
    line2: string;
    accentColor: string;         // default '#FF3B30'
    durationSec: number;         // default 1.5
  };
  openingZoom?: {
    scaleFrom: number;           // default 1.15
    scaleTo: number;             // default 1.0
    durationSec: number;         // default 0.5
  };
  avatar?: {
    transform?: string;          // CSS transform for framing
    backgroundColor: string;     // default '#E8E4DF'
  };
}
```

### How the Composition Uses the Storyboard

```tsx
// ShortFormEdit reads segments, maps to Sequences with display mode switching
const ShortFormEdit: React.FC<ShortFormManifest> = (props) => {
  const { storyboard, transcription, title, openingZoom } = props;
  const { fps } = useVideoConfig();

  // Dynamic duration from last segment end
  const totalFrames = Math.ceil(
    storyboard.segments[storyboard.segments.length - 1].end * fps
  );

  // Opening zoom wrapper (1.15→1.0 over 0.5s)
  // Avatar layer (visible in split/full_head, fades in full_content)
  // Graphics panel (renders per-segment content)
  // Caption overlay (word-level pill captions)
  // Title card (first 1.5s, fade in/out)
};
```

**Dynamic duration:** Use `calculateMetadata` in Root.tsx to compute `durationInFrames` from the storyboard rather than hardcoding.

---

## Reusable Component Library

### TitleCard

Fixed-position title card with smooth opacity fade in/out. Single brand-color block with stacked white text. No movement or scale animation — appears and disappears at the same spot.

**Animation:**
- Opacity: 0 → 1 over 0.3s (fade in), 1 → 0 over 0.3s (fade out)
- Position: fixed center with paddingTop 30%, never moves
- Outside zoom layer so unaffected by opening zoom

**Props:**

```tsx
interface TitleCardProps {
  line1: string;           // White bold uppercase text (68px, weight 900)
  line2: string;           // Same size/style as line1, both in one block
  accentColor?: string;    // Default: COLORS.accent (#ED0D51) — background color
  durationFrames: number;  // Total display duration in frames
}
```

**Pattern:**

```tsx
const TitleCard: React.FC<TitleCardProps> = ({ line1, line2, accentColor, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeInFrames = Math.ceil(0.3 * fps);
  const fadeOutFrames = Math.ceil(0.3 * fps);
  const fadeOutStart = durationFrames - fadeOutFrames;

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, fadeOutStart, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Line 2: same but delayed 3 frames
  const line2Spring = spring({ frame: Math.max(0, frame - 3), fps, config: SPRING_TITLE });
  const line2Scale = interpolate(line2Spring, [0, 1], [2, 1]);

  // Render at zIndex: 150 with AbsoluteFill
  // style={{ transform: `scale(${line1Scale})`, filter: `blur(${line1Blur}px)` }}
};
```

---

### BrollOverlay

Fade-in/fade-out overlay for B-roll clips (video or image). Used in the screenshare composition for simple overlays.

**Animation:**
- Opacity: 0 → 1 → 1 → 0 (fade in at start, fade out at end)
- Default fade duration: 10 frames

**Props:**

```tsx
interface BRollOverlayProps {
  src: string;             // Video or image path
  startFrame: number;
  endFrame: number;
  fadeFrames?: number;     // Default: 10
  playbackOffset?: number; // Trim frames from clip start
}
```

**Pattern:**

```tsx
const BRollOverlay: React.FC<BRollOverlayProps> = ({ src, startFrame, endFrame, fadeFrames = 10 }) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + fadeFrames, endFrame - fadeFrames, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const isVideo = /\.(mp4|mov|webm)$/i.test(src);
  // Render with objectFit: 'cover', full container
  // Use <Video> for video files, <Img> for images
};
```

**For ShortFormEdit:** B-roll in the graphics panel uses `<OffthreadVideo>` with `objectFit: 'cover'` in the split-mode panel (top 720px).

---

### CaptionOverlay (Pill Style)

Word-level animated captions in a white pill container. The primary caption style for short-form video.

**Animation:**
- Pop scale: 1.06 → 1.0 via `SPRING_POP` when word group changes
- Active word: full opacity; inactive words: 0.4 opacity
- Position: mode-aware (split mode = bottom 88%, full_content = bottom 75%)

**Caption Config:**

```tsx
interface PillCaptionConfig {
  style: 'pill';
  wordsPerGroup: number;                  // Default: 3
  fontSize: number;                        // Default: 32
  fontFamily: string;
  pillBackground: string;                  // Default: 'rgba(255,255,255,0.95)'
  pillBorderRadius: number;                // Default: 24
  inactiveOpacity: number;                 // Default: 0.4
  yOffset: number;                         // % from bottom (2 for split, 15 for full_content)
}
```

**Key implementation details:**
- Words grouped into N-word chunks (default 3)
- Punctuation tokens merged into previous word (no standalone commas/periods)
- Gap tolerance: 0.3s between groups keeps previous group visible
- Pop spring triggers on group change: `spring({ from: 1.06, to: 1.0, config: SPRING_POP })`
- Container: `inline-flex`, white pill with `boxShadow: '0 4px 20px rgba(0,0,0,0.15)'`

**Other available caption styles:** `tiktok` (no background, text shadow), `pop` (1-2 words, scale 0.85→1.0), `subtitle-bar` (dark background bar), `karaoke` (gold highlight sweep).

---

### TenexBackground

Warm linen background with subtle grid overlay. Base layer for all data graphics.

**Visual:** `#EEEAE4` background with dual linear-gradient grid at 4% opacity, 60px squares.

**Props:**

```tsx
interface TenexBackgroundProps {
  width?: number;            // Default: 1080
  height?: number;           // Default: 1920
  backgroundColor?: string;  // Default: '#EEEAE4'
}
```

**Pattern:**

```tsx
const TenexBackground: React.FC<TenexBackgroundProps> = ({ backgroundColor = '#EEEAE4' }) => (
  <AbsoluteFill style={{ backgroundColor }}>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `
        linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
    }} />
  </AbsoluteFill>
);
```

---

### TenexCard

Animated white card container with spring slide-up entrance.

**Animation:**
- translateY: 60 → 0px via `SPRING_CARD_SLIDE`
- scale: 0.96 → 1.0
- opacity: 0 → 1

**Props:**

```tsx
interface TenexCardProps {
  children: React.ReactNode;
  delay?: number;           // Frame delay before entrance (default: 0)
  width?: string | number;  // Default: '88%'
  padding?: number;         // Default: 32
}
```

**Pattern:**

```tsx
const TenexCard: React.FC<TenexCardProps> = ({ children, delay = 0, width = '88%', padding = 32 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay, fps,
    config: SPRING_CARD_SLIDE, from: 0, to: 1,
  });

  const translateY = (1 - progress) * 60;
  const scale = 0.96 + 0.04 * progress;

  return (
    <div style={{
      width, margin: '0 auto',
      backgroundColor: '#FFFFFF', borderRadius: 24,
      boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      padding, opacity: progress,
      transform: `translateY(${translateY}px) scale(${scale})`,
    }}>
      {children}
    </div>
  );
};
```

---

### TenexKeyword

Bold headline text with spring slide-down entrance.

**Animation:**
- translateY: 20 → 0px via `SPRING_ENTRANCE`
- opacity: 0 → 1

**Props:**

```tsx
interface TenexKeywordProps {
  text: string;
  delay?: number;           // Default: 0
  fontSize?: number;        // Default: 64
  color?: string;           // Default: '#0A0A0A'
}
```

**Pattern:** Spring entrance with `translateY(${(1 - progress) * 20}px)`. Text is `fontWeight: 900`, `letterSpacing: '-0.02em'`.

---

### StepLabel

Dark pill badge for segment step indicators. Positioned top-left.

**Animation:**
- translateX: -40 → 0px via `SPRING_ENTRANCE` (slides in from left)
- opacity: 0 → 1

**Props:**

```tsx
interface StepLabelProps {
  step: number;
  label?: string;           // e.g., "STEP 1 — Setup"
  delay?: number;           // Default: 0
}
```

**Pattern:** Dark pill (`rgba(10,10,10,0.85)`) at `position: absolute, top: 40, left: 40, zIndex: 80`. Text is `fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'`.

---

## Data-Driven Graphic Templates

Three graphic templates that compose TenexBackground + TenexKeyword + TenexCard into animated data visualizations.

### DataTableGraphic

Animated data table with staggered row entrances and optional highlight borders.

**Structure:** TenexBackground → TenexKeyword (headline) → TenexCard (rows)

**Animation:**
- Rows stagger at `STAGGER_FRAMES` (20) intervals
- Each row: translateY 30→0 + opacity 0→1 via `SPRING_ENTRANCE`
- Highlighted rows: red left border (3px) + light red background

**Props:**

```tsx
interface DataRow {
  label: string;
  value: string;
  highlighted?: boolean;    // Red border + tinted background
  annotation?: string;      // Small red text after value
}

interface DataTableGraphicProps {
  keyword: string;          // Headline text
  rows: DataRow[];
  delay?: number;
}
```

**Timing:** Keyword at `delay`, card at `delay+10`, first row at `delay+20`, each subsequent row at +20 frames.

---

### ProcessStepsGraphic

Numbered step sequence with connecting lines and optional callout box.

**Structure:** TenexBackground → TenexKeyword → numbered circles with connector lines → optional callout

**Animation:**
- Steps stagger at 40-frame intervals (slower than table rows)
- Each step: translateX 40→0 + opacity 0→1 via `SPRING_ENTRANCE`
- Callout box appears after last step with translateY 20→0

**Props:**

```tsx
interface ProcessStep {
  label: string;
  description?: string;
}

interface ProcessStepsGraphicProps {
  keyword: string;
  steps: ProcessStep[];
  callout?: string;         // Highlighted note after last step
  delay?: number;
}
```

**Visual:** Red numbered circles (40x40, borderRadius 20) connected by 2px lines in `cardBorder` color. Callout has red left border + light red background.

---

### EliminationListGraphic

Animated list where items get struck through, revealing a positive alternative.

**Structure:** TenexBackground → TenexKeyword → TenexCard (items with strikethrough) → alternative box

**Animation:**
- Items stagger at 25-frame intervals
- Each item: translateY 20→0 + opacity 0→1 via `SPRING_ENTRANCE`
- Strikethrough: width 0→100% over 8 frames (starts 15 frames after item appears)
- Text color fades from primary to secondary when struck
- Alternative box: green left border, translateY 20→0, appears after all items struck

**Props:**

```tsx
interface EliminationItem {
  text: string;
  delay?: number;           // Custom per-item delay override
}

interface EliminationListGraphicProps {
  keyword: string;
  items: EliminationItem[];
  alternative?: { label: string; text: string };  // Green "better way" box
  delay?: number;
}
```

**Timing:** Items at `delay+20 + i*25`, strikethrough at item delay + 15, alternative at `delay+20 + items.length*25 + 20`.

---

## Avatar Layer Patterns

### Framing

- `objectFit: 'cover'` on `<OffthreadVideo>`
- Background color: `#E8E4DF` (warm gray, visible during fade transitions)
- Use `transform` prop for framing adjustments (e.g., `translateY(-5%) scale(1.1)`)

### Mode Transitions

Avatar fades based on segment display mode:

```tsx
// full_content → avatar fades out over 6 frames
// split / full_head → avatar fades in over 6 frames
const FADE_FRAMES = 6;
const targetOpacity = currentSegment?.mode === 'full_content' ? 0 : 1;
// interpolate framesIntoSegment over [0, FADE_FRAMES] for smooth transition
```

### Gap Prevention

Extend segment `end` times slightly to prevent avatar flash between segments. If segment N ends at 10.5s and segment N+1 starts at 10.5s, the avatar may briefly flash. Overlap by 1-2 frames.

---

## Opening Zoom

Subtle zoom-out on video start creates a polished opening feel:

```tsx
// Default: 1.15→1.0 over 0.5s (15 frames at 30fps)
const openingZoom = { scaleFrom: 1.15, scaleTo: 1.0, durationSec: 0.5 };

// Applied as wrapper transform on the entire composition
const zoomFrames = Math.ceil(openingZoom.durationSec * fps);
const zoomScale = interpolate(frame, [0, zoomFrames], [1.15, 1.0], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
// <AbsoluteFill style={{ transform: `scale(${zoomScale})` }}>
```

---

## Production Lessons

### Text Rendering
- **NEVER put text in AI image prompts** — always composite text in Remotion
- Remotion renders fonts deterministically, AI image generators don't
- Use Google Fonts or system fonts loaded via `@remotion/google-fonts`

### B-Roll Panel
- Split mode panel height: **720px fixed** (not percentage-based)
- This prevents layout shifts when avatar video dimensions vary
- B-roll/graphics fill the panel with `objectFit: 'cover'` or `AbsoluteFill`

### Caption Positioning
- Split mode: captions at bottom 88% (below the panel, over avatar area)
- Full content mode: captions at bottom 75% (higher, to clear visual content)
- Adjust `yOffset` dynamically based on current segment's display mode

### Talking Head Ratio
- Target: 20-25% of total video duration in `full_head` mode
- Rest should be `split` or `full_content` with visual enrichments
- Pure talking head > 30% feels monotonous for short-form

### QA Threshold
- Score >= 90/100 before final render
- Check: text legibility at mobile size, caption sync, avatar framing, transitions between modes

### Music & Audio Levels

**Reference levels** (from Jay's talking head reel analysis — ~106 BPM, -17.8 dB mean):

| Layer | Level | Remotion `volume` |
|-------|-------|-------------------|
| Voice (speaker) | -10 to -16 dB RMS | `1.0` |
| Music under voice | -25 to -30 dB RMS | `0.08-0.12` |
| Music during B-roll | -20 to -22 dB RMS | `0.15-0.25` |
| Music in kinetic text (no VO) | -15 to -18 dB RMS | `0.20-0.35` |
| SFX (hits, whooshes) | -18 to -22 dB RMS | `0.3-0.5` |

**Rules:**
- Music must NEVER compete with voice — if you consciously notice it during speech, it's too loud
- Duck music during speech, raise during visual-only segments
- Fade in/out 1-2 seconds at track boundaries, never hard cut
- Loop with `<Loop>` + `<Audio>` wrapping full video duration
- All tracks normalized to -16 LUFS before import
- Use `trackDurationSec` in manifest to set loop length

**Library:** 25 curated tracks at `/Users/jayfeldman/Nextcloud/music/Background/`

---

## QA Frame Extraction

Post-render verification step that extracts key frames from the final video for visual review. Runs after loudnorm in `render-short.ts`.

### Extraction Timestamps

| Frame | Timestamp | Visual Rules |
|-------|-----------|-------------|
| Title card | `titleDurationSec * 0.5` | Title visible at paddingTop 30%, accent color (#ED0D51) background, text uppercase |
| First speech | First segment after title + 1.0s | Jay's face visible (top 35% of frame), captions in bottom 15% safe zone |
| Screenshot segments | Each `segment.start + 1.0` where `screenshotOverlay.src` exists | Screenshot top-edge at 42% from top, fills ~40% height, no face overlap |
| Pre-end-card | `endCardStart - 0.5` | No overlays bleeding into transition zone |
| End card | `endCardStart + 1.0` | Fully opaque (opacity 1.0), CTA box hot pink, handle visible, no caption bleed-through |

### Output Structure

```
output/shorts/<job-id>/qa/
  checklist.json              — Frame paths + verification rules
  frame-title-0.8s.png        — Title card midpoint
  frame-speech-2.5s.png       — First speech segment
  frame-screenshot-seg3-8.0s.png — Screenshot overlay segment
  frame-pre-endcard-25.5s.png — Just before end card
  frame-endcard-27.0s.png     — End card fully visible
```

### Checklist JSON Schema

```json
{
  "outputPath": "output/shorts/.../output.mp4",
  "manifestPath": "output/shorts/.../manifest.json",
  "extractedAt": "2026-03-25T...",
  "frames": [
    {
      "time": 0.8,
      "label": "title",
      "file": "frame-title-0.8s.png",
      "checks": ["Title visible at top 1/3", "Accent color background", "Text uppercase and readable"]
    }
  ]
}
```

### Fix Loop

If a frame fails visual review:
1. Identify the manifest property causing the issue (screenshot position, end card duration, etc.)
2. Edit `manifest.json` directly
3. Re-render: `tsx scripts/render-short.ts <manifest> [output]`
4. QA frames auto-extract again — re-verify
- Search: `tsx scripts/search-music.ts --mood calm --energy low --no-vocals`
- Full catalog and selection guide: see `references/music-library.md`
