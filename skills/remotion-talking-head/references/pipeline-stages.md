# Pipeline Stages Reference

## Stage 1: Probe (FFprobe)

Extracts video metadata: resolution, duration, fps, codec, audio presence.

```bash
ffprobe -v quiet -print_format json -show_streams -show_format <video>
```

**Output:** `VideoMetadata` — width, height, fps, duration, codec, hasAudio, isVFR

## Stage 2: Transcribe (Groq Whisper)

Transcribes video audio via Groq Whisper API (`whisper-large-v3-turbo` model) using `lib/video/transcribe-whisper.ts`.

**Key details:**
- Extracts audio internally (no separate extract step needed)
- Handles files >25MB via automatic chunking (24MB chunks with 3s overlap)
- Fixes Whisper's overlapping timestamp bug via post-processing
- Returns word-level timestamps with `verbose_json` format
- Requires `GROQ_API_KEY` in `.env.local`
- **Cost:** Free

**Output:** `TranscriptionResult` — words[] with { text, start, end, confidence }, duration, language

## Stage 3: Analyze & Cut (Unified Pipeline)

Runs all detection sources and produces a trimmed video via `lib/video/unified-cutting.ts` (`analyzeAndCut()`).

**6 detection sources (run internally):**
1. **Silence detection** — FFmpeg silencedetect (min 0.3s for shorts, 0.5s for courses)
2. **Filler detection** — Pattern matching: um, uh, like, you know, stutters
3. **Repeat detection** — Jaccard similarity sliding window for repeated sentences
4. **AI editorial** — Claude Haiku 2-pass (transcript analysis + post-cut review)
5. **Credential detection** — API keys, passwords mentioned aloud
6. **Post-cut review** — Verifies cuts didn't break sentence flow

**Output:** EDL (Edit Decision List), `trimmed.mp4`, remapped word timestamps, human-readable report

## Stage 4: Storyboard (TypeScript)

Pure TypeScript logic that segments the video based on transcript timing.

**Algorithm:**
1. Find pause breaks (gaps > 0.8s between words)
2. Build segments with display modes:
   - Hook (first 3.5s) → `split` mode
   - Body segments → `full_content` mode
   - CTA (last 5s) → `split` mode
3. Close tiny gaps (< 0.3s)
4. Merge short segments (< 1.5s) into neighbors

**Output:** `Storyboard` — segments[], segmentCount, talkingHeadRatio

## Stage 5: Discovery (Claude Haiku)

AI analyzes transcript + storyboard to suggest enrichments.

**Suggestions include:**
- B-roll placement (max 4 per video)
- Data table graphics (for statistics/comparisons)
- Process step graphics (for workflows)
- Elimination list graphics (for "stop doing X" moments)
- Screenshot placeholders (for tool demos)

**Rules:**
- Only enrich `full_content` segments
- Skip hook and CTA segments
- Max 1 enrichment per segment
- 30-40% segments should stay as talking head (breathing room)

**Output:** `EditPlan` — items[] with segmentId, type, reason, confidence

## Stage 6: Build Manifest (TypeScript)

Assembles all pipeline outputs into `TalkingHeadManifest` JSON.

Applies edit plan enrichments to segments, configures:
- Caption style and colors
- Title card text
- End card CTA
- Opening zoom (1.15 → 1.0 scale)
- Background music (if provided)

**Output:** `manifest.json` — complete Remotion input props

## Stage 7: Render (Remotion)

Programmatic render via `@remotion/renderer`.

1. Bundle the Remotion project
2. Copy source video + B-roll + music into bundle dir
3. Select `TalkingHeadShort` composition
4. Render H.264 MP4 at 1080x1920, 30fps

**Output:** `output.mp4` — final rendered video
