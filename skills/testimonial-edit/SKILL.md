---
name: testimonial-edit
version: 1.0.0
description: "Edit testimonial videos into polished social clips. Triggers on: 'testimonial edit', 'edit testimonial', 'testimonial video', 'cut testimonial', 'testimonial clip', 'social proof video', 'customer video edit', 'case study video'."
---

# Testimonial Video Edit

Transform raw customer testimonial videos into polished, short social clips with AI-driven content selection, speaker intro cards, and multi-format output.

## When to Use

- User has a raw testimonial video (customer interview, case study, social proof)
- Need to cut down a long testimonial to the best 30-90 seconds
- Need multi-format output (square + vertical, or landscape + square)
- Need speaker name/title/company intro card overlay

## Before Starting

### Gather from User (ask if not provided)

| Context | Default | Why |
|---------|---------|-----|
| Video file path | (required) | Source testimonial |
| Speaker name | "Speaker" | Intro card + AI context |
| Speaker title | "" | Intro card subtitle |
| Speaker company | "" | Intro card subtitle |
| Caption style | pill | Professional testimonial default |
| Target duration | 30-60s | Social platform sweet spot |
| Auto-approve? | No | Show AI cuts for review first |

### Prerequisites

- FFmpeg installed (`brew install ffmpeg`)
- `DEEPGRAM_API_KEY` in `.env.local` (transcription)
- `ANTHROPIC_API_KEY` in `.env.local` (AI content selection)
- Remotion dependencies installed (`npm install`)

## Pipeline (10 Stages)

```
[1] PROBE ─→ [2] TRANSCRIBE ─→ [2.5] IDENTITY CHECK ─→ [3] AI SELECT ─→ [4] SILENCE ─→ [5] CROP
                                                              ↓ (review gate)
[6] APPLY EDITS ─→ [6.5] CAPTION REVIEW ─→ [7] ENHANCE ─→ [8] MANIFEST ─→ [9] RENDER ─→ [10] QA
```

| # | Stage | Tool | Output |
|---|-------|------|--------|
| 1 | Probe | ffprobe | Resolution, FPS, duration, aspect |
| 2 | Transcribe | Deepgram Nova-3 | Word-level timestamps |
| 2.5 | Identity Check | CLI output | Confirms name/title/company against transcript opening |
| 3 | AI Content Selection | Claude API | Scored snippets, keep/cut decisions |
| 4 | Silence Detection | FFmpeg silencedetect | Silence segments |
| 5 | Crop & Scale | FFmpeg crop/scale | Format-specific crops |
| 6 | Apply Edits | FFmpeg trim+concat | edited.mp4 + re-transcribe |
| 6.5 | AI Caption Review | Claude API | Corrected words, auto-fixes, uncertain items |
| 7 | Enhance Audio | FFmpeg filters | Denoised, EQ'd, compressed |
| 8 | Build Manifest | TypeScript | Remotion input props |
| 9 | Render | Remotion | Final MP4 (x2 formats) |
| 10 | QA | ffprobe + frame extract | Verification |

## Workflow

### Step 1: Gather Input

Ask the user for the video path, speaker info, and preferences. Then run:

```bash
tsx scripts/process-testimonial.ts <video-path> \
  --name "Ray Lee" \
  --title "CEO" \
  --company "Zero2.AI" \
  --caption-style pill
```

This runs stages 1-3 and pauses at the **interactive review gate**.

### Step 2: Review AI Content Selection

The pipeline outputs scored snippets to `snippets.json` and prints a summary:

```
  KEEP [9/10] (12.3-18.1s) We saw a 40% increase in qualified leads...
  CUT  [3/10] (0.0-4.2s)   Hi everyone, thanks for having me...
```

Present the AI's edit plan to the user. They can:
- Approve as-is → re-run with `--auto-approve`
- Adjust keepSegments in `snippets.json` → re-run with `--auto-approve`

### Step 3: Render

Once approved, the pipeline continues through stages 4-10 automatically:

```bash
tsx scripts/process-testimonial.ts <video-path> \
  --name "Ray Lee" \
  --title "CEO" \
  --company "Zero2.AI" \
  --caption-style pill \
  --auto-approve
```

### Step 4: QA

Pipeline auto-extracts QA frames. Open outputs in Preview:

```bash
open output/testimonials/<job-id>/output-square.mp4
open output/testimonials/<job-id>/output-vertical.mp4
```

### Step 5: Save to Nextcloud

Copy finished videos to `~/Nextcloud/Testimonials/` with descriptive titles:

```bash
mkdir -p ~/Nextcloud/Testimonials
cp output/testimonials/<job-id>/output-square.mp4 \
  ~/Nextcloud/Testimonials/"<Speaker Name> - <Company> Testimonial (Square).mp4"
cp output/testimonials/<job-id>/output-vertical.mp4 \
  ~/Nextcloud/Testimonials/"<Speaker Name> - <Company> Testimonial (Vertical).mp4"
```

Naming format: `Ray Lian - Sarah2.ai Testimonial (Square).mp4`. Nextcloud syncs automatically.

## Output Format (Adaptive)

| Input Aspect | Primary Output | Secondary Output |
|-------------|----------------|-----------------|
| Vertical (9:16) | 1080x1080 square | 1080x1920 vertical |
| Landscape (16:9) | 1920x1080 landscape | 1080x1080 square |
| Square (1:1) | 1080x1080 square | — |

Auto-detected from ffprobe. AI face detection (face-api.js 68-point landmarks) extracts a frame at 2s and computes crownY, chinY, faceCenterX, faceCenterY, leftEarX, rightEarX.

For vertical→square crops: the crop window is positioned so the **crown touches the top of the frame**. Full source width is preserved (no horizontal cropping, no blur background). This produces a tight, professional framing where the speaker's head fills the top of the square. Override with `--crop-y`.

## AI Content Selection Rules

### High-Value (Keep)
- Specific results: numbers, metrics, dollar amounts, timeframes
- Emotional impact: genuine enthusiasm, surprise, relief
- Social proof: client names, revenue figures, team adoption
- Problem/solution: "before" state, comparison to alternatives

### Low-Value (Cut First)
1. Introductions and sign-offs
2. Filler and hedging ("um", "you know", "I think maybe")
3. Repeated points (keep stronger version)
4. Tangents and off-topic segments
5. Generic praise without specifics
6. **Program pricing / cost details** — NEVER reveal what the customer paid to join (e.g. "$1,500", "entry price", "how much it costs"). This is proprietary sales info that should not appear in public testimonial clips.

### Sentence Completeness (Critical)
- Every kept segment MUST end on a complete thought
- If a sentence trails off mid-phrase ("I hope you believe...", "and he's really..."), either cut it or ensure it merges with the next segment
- The **last kept segment** is especially important — the video must end cleanly, not mid-sentence
- Review each kept segment's final words to confirm the thought is finished

### Constraints
- Achieve 50%+ reduction from original
- Minimum 20s output (configurable with `--min-duration`)
- Maximum 90s output (configurable with `--max-duration`)

## TestimonialIntroCard Component

| Property | Spec |
|----------|------|
| Background | Transparent (overlays video) |
| Name | Big Shoulders, 68px bold, white, uppercase |
| Title / Company | Manrope, 32px, #E0E0E0 |
| Accent bar | #ED0D51, 4px height, beneath name |
| Position | Always centered (both axes, all formats) |
| Animation | Fade in 0.3s + slide up 20px, hold, fade out 0.3s |
| Timing | Starts at 1s, duration 4s (configurable). Captions show alongside intro (NOT suppressed). |

## Brand System

| Element | Value |
|---------|-------|
| Background | #0D0D0D (near-black) |
| Accent | #ED0D51 (hot pink) |
| Headline font | Big Shoulders (bold, uppercase) |
| Body font | Manrope |
| Caption style | Pill (default for testimonials) |
| Caption safe zone | Bottom 15% |
| Music volume | 0.08 (lower than talking-head — voice clarity priority) |
| Audio normalization | -16 LUFS (two-pass loudnorm) |

## Audio Enhancement Pipeline

1. **FFT Denoise**: `afftdn=nr=12:nf=-25:tn=1`
2. **Highpass 80Hz**: Remove room rumble
3. **Lowpass 12kHz**: Remove hiss
4. **EQ 200Hz +1dB**: Warmth
5. **EQ 3kHz +2.5dB**: Clarity/presence
6. **EQ 6.5kHz -2dB**: De-essing
7. **Compressor**: Smooth dynamics
8. **Loudnorm**: -16 LUFS (two-pass with limiter)

## CLI Reference

```bash
tsx scripts/process-testimonial.ts <video-path> [options]

Options:
  --name "Speaker Name"     Speaker name for intro card (required)
  --title "CEO"             Speaker title
  --company "Acme Inc"      Speaker company
  --caption-style pill      Caption style (pill|pop|karaoke|tiktok|subtitle-bar)
  --no-captions             Skip captions entirely
  --no-music                Skip background music
  --no-silence-removal      Keep all silences
  --auto-approve            Skip interactive review of AI snippets
  --transcript <path>       Use existing transcript (skip Deepgram, saves ~$0.01)
  --crop-y <0-1>            Manual crop Y position (0=top, default: 0.25)
  --min-duration <sec>      Minimum output duration (default: 20)
  --max-duration <sec>      Maximum output duration (default: 90)
  --output <dir>            Custom output directory
  --render-only <manifest>  Skip to render with existing manifest
```

## Output Directory Structure

```
output/testimonials/<job-id>/
  transcript.json           — Word-level transcript (Deepgram)
  transcript-edited.json    — Re-transcribed after edits
  transcript-reviewed.json  — AI-reviewed captions (corrected words)
  snippets.json             — AI content selection (scores + reasons)
  edited.mp4                — Trimmed video (AI cuts + silence removal)
  enhanced.mp4              — Audio-enhanced version
  cropped-square.mp4        — Cropped for square format
  cropped-vertical.mp4      — Cropped for vertical format (if vertical input)
  manifest-square.json      — Remotion manifest (square)
  manifest-vertical.json    — Remotion manifest (vertical)
  output-square.mp4         — Final rendered square (1080x1080)
  output-vertical.mp4       — Final rendered vertical (1080x1920)
  qa/                       — QA verification frames
```

## Cost Estimate

| Stage | Service | Cost |
|-------|---------|------|
| Transcribe | Deepgram Nova-3 | ~$0.01 (3min video) |
| AI Selection | Claude Sonnet | ~$0.02 |
| Caption Review | Claude Haiku | ~$0.005 |
| Render | Local (Remotion) | Free |
| **Total** | | **~$0.03/video** |

## Autonomy Rules

- Don't ask permission between pipeline stages (except the AI review gate)
- Auto-detect aspect ratio — only ask if ambiguous (very close to 1:1)
- Default to `pill` captions for testimonials (professional, clean)
- Always pause at AI content selection for review unless `--auto-approve`
- Skip re-transcription if `--transcript` provided
- If video is already under 30s, skip AI content selection entirely

## Known Gotchas

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| **0% reduction / 1 giant sentence** | Deepgram word-level data has bare words (no punctuation). Punctuation-based sentence splitting (`/[.!?]$/`) never matches. | Use pause-based splitting (gaps > 0.7s between words) + 30-word safety cap. Already fixed in `testimonial-analyzer.ts`. |
| **Wrong speaker name on intro card** | Deepgram phonetically transcribes names — "Ray Lian" becomes "ray leon", "Sarah2.ai" becomes "serra two dot a i". Must verify against transcript. | Pipeline shows identity check (stage 2.5) when not using `--auto-approve`. Always compare transcript opening against `--name` / `--company` flags. |
| **Program pricing leaks into clip** | Customers often mention what they paid ("$1,500", "entry price"). This is proprietary sales info. | AI analyzer prompt has explicit rule to cut all pricing/cost segments. |
| **Last sentence trails off mid-thought** | Pause-based chunking can split mid-sentence if there's a brief pause. Last segment is most visible. | AI analyzer prompt enforces sentence completeness — especially for the final kept segment. |
| **Captions hidden during intro card** | Previous implementation suppressed captions for first 5s. User wants captions visible alongside intro. | Caption opacity wrapper removed from `index.tsx`. Captions render from frame 0. |
| **Stale snippets.json reused** | `--auto-approve` loads existing `snippets.json` if present. After changing analyzer rules, old snippets persist. | Delete `snippets.json` before re-running when analyzer logic changes. |

## Files

| File | Purpose |
|------|---------|
| `scripts/process-testimonial.ts` | Main pipeline orchestrator |
| `lib/video/testimonial-analyzer.ts` | Claude API content scoring |
| `lib/video/caption-review.ts` | AI caption review — fixes STT errors, flags uncertain names |
| `lib/video/face-detection.ts` | face-api.js 68-point landmark detection → FacePosition |
| `lib/video/testimonial-crop.ts` | FFmpeg crop/scale (crown-at-top for vertical→square) + edit plan |
| `remotion/compositions/talking-head/components/testimonial-intro-card.tsx` | Speaker intro overlay |
| `remotion/compositions/talking-head/schemas/manifest.ts` | Extended with TestimonialIntroConfig |
| `remotion/compositions/talking-head/index.tsx` | Renders TestimonialIntroCard layer |

### Reused (not modified)

| File | What |
|------|------|
| `lib/video/transcribe.ts` | Deepgram Nova-3 transcription |
| `lib/video/silence-detection.ts` | Silence detection |
| `scripts/render-short.ts` | Remotion rendering + loudnorm |
