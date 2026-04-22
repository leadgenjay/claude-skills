# Talking Head Short - Video Editing Skill

## Trigger Patterns

This skill activates when the user mentions:
- "talking head", "short form", "youtube short", "reel", "vertical video"
- "process short", "edit short", "caption video", "add captions"
- "silence removal", "trim silence", "auto-edit"

## Overview

End-to-end pipeline for creating polished short-form talking head videos (YouTube Shorts, Reels, TikTok) from raw footage. Handles: transcription, silence removal, storyboarding, AI-powered B-roll/graphics suggestions, branded captions, title cards, and CTA end cards.

## Pipeline Stages

| # | Stage | Tool | Output |
|---|-------|------|--------|
| 1 | Probe | FFprobe | Video metadata (resolution, duration, fps) |
| 2 | Transcribe | Groq Whisper (large-v3-turbo) | Word-level timestamps via `transcribe-whisper.ts` |
| 3 | Analyze & Cut | Unified pipeline (`unified-cutting.ts`) | Silence + fillers + repeats → EDL → `trimmed.mp4` |
| 4 | Storyboard | TypeScript | Segment map with display modes |
| 5 | Discovery | Claude Haiku | B-roll, graphics, emphasis suggestions |
| 6 | Build Manifest | TypeScript | TalkingHeadManifest JSON |
| 7 | Voice Enhance | FFmpeg + Replicate | Denoised, EQ'd, compressed voice audio (pre-render) |
| 8 | Render | Remotion | 1080x1920 H.264 MP4 |
| 9 | Loudnorm | FFmpeg | Normalize audio to -16 LUFS for social media |

## Workflow

### Step 1: Gather Input

Ask the user for:
1. **Video file path** (required)
2. **Title** - line 1 and line 2 for opening title card
3. **CTA** - call-to-action text for end card (e.g., "Comment LEADS below")
4. **Caption style** - pop (default), pill, karaoke, tiktok, subtitle-bar
5. **Options** - silence removal? AI discovery? Music?

### Step 2: Run Pipeline

```bash
tsx scripts/process-short.ts <video-path> \
  --title "Line 1" "Line 2" \
  --cta "Comment LEADS" \
  --cta-headline "Want the full system?" \
  --handle "@leadgenjay" \
  --caption-style pop
```

### Step 3: Review Discovery (if enabled)

During the discovery stage, the pipeline generates AI suggestions. Present them to the user:
- B-roll placement suggestions with timestamps
- Graphics (data tables, process steps, elimination lists)
- Emphasis moments for caption highlighting

**Logo sourcing:** When B-roll or graphics reference a specific tool/software, check `~/Nextcloud/Visual assets/Logos/Tool Logos/` first (204 logos) and `~/Nextcloud/Visual assets/Logos/AI logos/` for AI tools. Never AI-generate a company logo.

If the user approves, re-run with `--auto-approve`.

### Step 4: Open Output

```bash
# Quit QuickTime entirely before opening new video (prevents stale windows)
osascript -e 'tell application "QuickTime Player" to quit' 2>/dev/null
sleep 0.5
open output/shorts/<job-id>/output.mp4
```

### Step 5: Re-render (if changes needed)

For caption style changes or manifest edits:
```bash
tsx scripts/process-short.ts --render-only output/shorts/<job-id>/manifest.json
```

## Caption Styles

| Style | Description | Best For |
|-------|-------------|----------|
| **pop** | 1-2 words, spring scale animation (CapCut-style) | YouTube Shorts, Reels |
| **pill** | 3-word groups in rounded pill, active word highlighted | Professional, clean |
| **karaoke** | Word-by-word color highlight | Music, lyrics |
| **tiktok** | Full phrase display, bold | TikTok native feel |
| **subtitle-bar** | Dark bar with text | Accessibility, formal |

## Visual Style Rules

| Element | Rule |
|---------|------|
| **Title card** | Fixed center position (paddingTop 30%), single brand-color (#ED0D51) background block, white bold uppercase text (68px, 900 weight, Big Shoulders), both lines in one container. No movement or animation - smooth opacity fade in (0.3s) and fade out (0.3s) at the same spot. Outside zoom layer so unaffected by opening zoom |
| **Captions** | 72px minimum (1.5x multiplier applied to config fontSize). Pop style with white background pill, black bold text (#000000 on #FFFFFF), 3 words per group, no entrance animation (static position, no scale/spring). Centered in lower 1/3, must be readable on mobile. Outside zoom layer so unaffected by opening zoom. Auto-scales font size down for long word groups (>18 chars) to prevent overflow - minimum 60% scale floor (~43px) to stay readable |
| **Screenshots** | Top-edge positioned at 42% from top (torso zone), explicit 40% screen height + 92% width (active sizing, not max constraints - `objectFit: contain` fills the box), **minimum 3 seconds on screen** (hard rule - if segment is too short or end card cuts it early, move the screenshot to an earlier segment or extend the segment). Max 5 seconds on screen (first defense against end card overlap). Uses `translate(-50%, 0%)` so top edge is fixed - tall images grow downward, never upward into face zone |
| **End card CTA** | Same style and placement as title card - accent bg block (#ED0D51), centered at paddingTop 30%, 68px Big Shoulders uppercase (weight 900), fade in/out only (0.3s each). Headline on line 1, CTA on line 2 inside the same block. Handle text below in accent color |
| **Face visibility** | Never cover Jay's face with overlays. Title goes center, screenshots start at 42% (top-edge anchored, grow downward only), captions stay in bottom safe zone |
| **End card overlay** | Must be fully opaque (opacity 1.0) to completely hide captions and screenshots behind it |
| **Layer conflicts** | CaptionOverlay has `useMemo` hooks inside style-conditional blocks - never change its `endFrame` dynamically (causes React hooks error #300). Use opaque overlays to hide instead |

> **Note:** The `endFrame` is calculated from the trimmed video duration and should not be changed after initial calculation. The `--render-only` flag re-renders using the same calculated endFrame, it does not recalculate it.

| **Screenshot cutoff** | Screenshots auto-cut before end card via `cutoffFrame` prop (second defense). Two-layer overlap prevention: 5-second max duration + `cutoffFrame` hard stop |

## Brand System

- **Background**: #0D0D0D (near-black)
- **Accent**: #ED0D51 (hot pink)
- **Headline font**: Big Shoulders (uppercase, bold)
- **Body font**: Manrope
- **Caption safe zone**: Bottom 15% minimum

## Output Directory

```
output/shorts/<job-id>/
  output.mp4         - Final rendered video
  manifest.json      - Remotion input props (editable)
  transcript.json    - Word-level transcript
  storyboard.json    - Segment map
  discovery.json     - AI suggestions (if enabled)
```

## CLI Flags

| Flag | Effect |
|------|--------|
| `--no-captions` | Skip caption overlay |
| `--no-music` | Skip background music |
| `--no-discovery` | Skip AI enrichment |
| `--no-silence-removal` | Keep all silences |
| `--auto-approve` | Auto-approve AI suggestions |
| `--render-only <manifest>` | Skip to render stage |
| `--output <path>` | Custom output directory |

## Prerequisites

- FFmpeg and FFprobe installed (`brew install ffmpeg`)
- `GROQ_API_KEY` in `.env.local` (Groq Whisper transcription)
- `ANTHROPIC_API_KEY` in `.env.local` (for discovery stage)
- `REPLICATE_API_TOKEN` in `.env.local` (optional - enables AI voice enhancement via Resemble Enhance)

## Audio Enhancement

Two-tier voice enhancement runs on the source audio BEFORE Remotion adds background music:

| Tier | Tool | What It Does | Cost |
|------|------|-------------|------|
| 1 (always) | FFmpeg filters | Denoise (afftdn) + highpass 80Hz + lowpass 12kHz + warmth EQ + presence boost + de-ess + compression | Free |
| 2 (opt-in) | Resemble Enhance via Replicate | AI perceptual enhancement - restores lost frequencies, removes artifacts, broadcast quality | ~$0.02/video |

Tier 2 activates when `REPLICATE_API_TOKEN` is set. Skip with `--no-enhance` flag (TODO).

## Pipeline Stage 12: QA Review

After render + loudnorm, the pipeline auto-extracts key frames to `output/shorts/<job>/qa/` for visual verification.

**Extracted frames:**

| Frame | Timestamp | What to verify |
|-------|-----------|----------------|
| Title card | `titleDurationSec * 0.5` | Title visible at top 1/3, accent color bg, text uppercase |
| First speech | `firstSegment.start + 1.0` | Jay's face visible (top 35%), captions in bottom safe zone |
| Each screenshot | `segment.start + 1.0` | Screenshot at ~42% from top, fills ~40% height, no face overlap |
| Pre-end-card | `endCardStart - 0.5` | No overlays bleeding into end card zone |
| End card | `endCardStart + 1.0` | Fully opaque dark overlay, CTA visible, no caption bleed-through |

**Review workflow:**
1. **Pre-render manifest check:** Verify every screenshot segment has at least 3 seconds of visible time (segment duration minus any end card overlap). If a screenshot's visible time < 3s, move it to an earlier/longer segment or extend the segment before rendering
2. Read `qa/checklist.json` for frame paths and verification rules
3. Open each frame with `open` command (Preview.app) or read with Read tool
4. Verify against checklist rules
5. If issues found: fix `manifest.json` → re-run `tsx scripts/render-short.ts <manifest> [output]`
6. Only show video to user after all checks pass

## Cost Estimate

- Groq Whisper: Free (large-v3-turbo)
- Claude Haiku (discovery): ~$0.01 per run
- Resemble Enhance (optional): ~$0.02 per run
- Total per video: ~$0.01 (without AI enhance) / ~$0.03 (with AI enhance)

## Skill Chain: Thumbnail Generation

After the video is rendered and approved, offer to generate a thumbnail for the short:

> "Want me to generate a thumbnail for this short?"

If yes, chain to the **short-thumbnail** skill:

```bash
node scripts/generate-short-thumbnail.mjs --video "<rendered-output.mp4>"
```

This extracts the best frame (Vision-ranked for clear face + expression), generates clickbait headline options, and composites a TikTok-native text overlay. See `.claude/skills/short-thumbnail/SKILL.md` for full details.

## Skill Chain: Short Copy (Captions)

After thumbnail is done (or skipped), offer to generate platform captions:

> "Want me to generate captions for YouTube Shorts, Instagram Reels, and TikTok?"

If yes, chain to the **short-copy** skill (`.claude/skills/short-copy/SKILL.md`). Pass along:
- Video topic (from the script/storyboard)
- Key points (from the transcript)
- Duration (from the rendered video)
- Video goal (ask user if not obvious from context)

Short-copy generates titles + captions + hashtags for all 3 platforms, then offers to publish via Blotato.
