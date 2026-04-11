# Manifest Schema Reference

## TalkingHeadManifest

The manifest is the single JSON file that drives Remotion rendering. It contains all data needed to compose the final video.

```typescript
interface TalkingHeadManifest {
  version: 1;
  sourceFile: string;              // Path to source video
  videoMetadata: VideoMetadata;
  outputPreset?: OutputPreset;
  storyboard: Storyboard;
  transcription: Transcription;
  captionConfig?: CaptionConfig;
  title?: TitleConfig;
  endCard?: EndCardConfig;
  openingZoom?: OpeningZoomConfig;
  avatar?: AvatarConfig;
  backgroundMusic?: BackgroundMusic;
}
```

## VideoMetadata

```typescript
interface VideoMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;       // seconds
  codec: string;          // e.g. "h264"
  hasAudio: boolean;
  isVFR: boolean;         // variable frame rate
}
```

## OutputPreset

```typescript
interface OutputPreset {
  name: string;           // e.g. "vertical"
  width: number;          // 1080
  height: number;         // 1920
  fps: number;            // 30
  crf: number;            // 23 (quality, lower = better)
}
```

## Storyboard

```typescript
interface Storyboard {
  segments: TalkingHeadSegment[];
}

interface TalkingHeadSegment {
  id: number;
  start: number;          // seconds
  end: number;            // seconds
  mode: DisplayMode;      // "split" | "full_head" | "full_content"
  description?: string;
  graphicType?: "data-table" | "process-steps" | "elimination-list";
  graphicData?: Record<string, unknown>;
  stepLabel?: { number: number; label: string };
  brollClip?: { clipId: string; clipPath: string; description: string };
}
```

### Display Modes

| Mode | Avatar | Graphics | Use Case |
|------|--------|----------|----------|
| `split` | Top half | Bottom half | Hook, CTA, data overlay |
| `full_head` | Full frame | None | Personal story, emphasis |
| `full_content` | Hidden | Full frame | B-roll, graphics, demos |

## CaptionConfig

```typescript
interface CaptionConfig {
  style: "pop" | "pill" | "karaoke" | "tiktok" | "subtitle-bar";
  fontSize?: number;          // default: 64
  fontFamily?: string;        // default: "Manrope"
  color?: string;             // default: "#FFFFFF"
  outlineColor?: string;      // default: "#000000"
  outlineWidth?: number;      // default: 3
  highlightColor?: string;    // default: "#ED0D51"
  safeZoneBottom?: number;    // default: 15 (percentage)
  wordsPerGroup?: number;     // default: 2
}
```

## TitleConfig

```typescript
interface TitleConfig {
  line1: string;              // Main headline (white bold uppercase)
  line2: string;              // Second line (same size/style as line1, both in one red block)
  accentColor?: string;       // default: "#ED0D51" — used as background color for title block
  durationSec?: number;       // default: 1.5
}
```

## EndCardConfig

```typescript
interface EndCardConfig {
  headline: string;           // e.g. "Want the full system?"
  cta: string;                // e.g. "Comment LEADS below"
  handle: string;             // e.g. "@leadgenjay"
  durationSec?: number;       // default: 3.0
}
```

## OpeningZoomConfig

```typescript
interface OpeningZoomConfig {
  scaleFrom: number;          // default: 1.15
  scaleTo: number;            // default: 1.0
  durationSec: number;        // default: 0.8
}
```

## BackgroundMusic

```typescript
interface BackgroundMusic {
  src: string;                // Path to audio file
  volume: number;             // 0.0 - 1.0 (typically 0.08-0.12)
  trackDurationSec: number;   // For looping
}
```

## Example Manifest

```json
{
  "version": 1,
  "sourceFile": "output/shorts/short-123/trimmed.mp4",
  "videoMetadata": {
    "width": 1080, "height": 1920, "fps": 30,
    "duration": 45.2, "codec": "h264",
    "hasAudio": true, "isVFR": false
  },
  "outputPreset": {
    "name": "vertical", "width": 1080, "height": 1920,
    "fps": 30, "crf": 23
  },
  "storyboard": {
    "segments": [
      { "id": 0, "start": 0, "end": 3.5, "mode": "split" },
      { "id": 1, "start": 3.5, "end": 15.0, "mode": "full_content" },
      { "id": 2, "start": 15.0, "end": 40.2, "mode": "full_content" },
      { "id": 3, "start": 40.2, "end": 45.2, "mode": "split" }
    ]
  },
  "transcription": {
    "words": [
      { "text": "Hey", "start": 0.1, "end": 0.3 },
      { "text": "here's", "start": 0.35, "end": 0.55 }
    ],
    "language": "en"
  },
  "captionConfig": {
    "style": "pop",
    "fontSize": 64,
    "highlightColor": "#ED0D51",
    "safeZoneBottom": 15,
    "wordsPerGroup": 2
  },
  "title": {
    "line1": "The Machine",
    "line2": "Is Real",
    "durationSec": 1.5
  },
  "endCard": {
    "headline": "Want the full system?",
    "cta": "Comment MACHINE below",
    "handle": "@leadgenjay",
    "durationSec": 3.0
  }
}
```
