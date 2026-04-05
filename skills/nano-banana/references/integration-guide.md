# Nano Banana ↔ Ad Pipeline Integration Guide

## Overview

The nano-banana Gemini CLI and the fal.ai ad-creative pipeline are complementary tools. This guide covers how they work together.

## Architecture

```
nano-banana CLI (Gemini)          fal.ai Pipeline (ad-creative skill)
─────────────────────────         ──────────────────────────────────
Quick standalone images           Jay's face via Flux LoRA
Transparent assets (-t)           5-step ad pipeline
Style transfer (-r)               Smart Swap / Body Swap
Mockups, icons, sprites           Scene → LoRA → Composite → Text → QA
FREE with paid Google account     Pay-per-generation (~$0.05-0.15/image)
```

## Integration Pattern 1: Scene Generation → Ad Pipeline

Use nano-banana to generate scene backgrounds, then feed into ad-creative Steps 4-5:

```bash
# 1. Generate scene with nano-banana (free)
nano-banana "modern tech office, clean desk, large monitor, bright lighting" -a 1:1 -s 2K -d output/ads/ -o tof-scene

# 2. Apply text overlay (Sharp + SVG)
# Uses addAdHeadline() from scripts/generate-cold-email-ads.mjs
```

```javascript
import sharp from 'sharp'

// addAdHeadline(imagePath, headline, subheadline, position)
const finalPath = await addAdHeadline(
  'output/ads/tof-scene.png',
  'COLD EMAIL IS DEAD',
  'Your spam folder proves it.',
  'top'
)
```

```javascript
// 3. QA with Claude Vision
// Uses analyzeWithVision() from scripts/generate-cold-email-ads.mjs
const analysis = await analyzeWithVision([finalPath])
// Returns: { device_orientation, realism, ai_artifacts, compositing, text_readability }
```

## Integration Pattern 2: Transparent Assets → Carousel Slides

Generate transparent icons/illustrations with nano-banana, use in carousel components:

```bash
# Generate transparent asset
nano-banana "flat illustration of email automation workflow, bold colors" -t -s 1K -d output/carousel-assets/ -o email-auto
```

Use in Instagram carousel slides with `NotebookBackground` component:

```tsx
// In carousel slide component
<NotebookBackground>
  <img src="/carousel-assets/email-auto.png" alt="Email automation" />
  {/* Sketch annotations via sketch-primitives.tsx */}
  <SketchArrow from={[100, 200]} to={[300, 200]} />
  <DashedBox x={50} y={150} width={200} height={100} label="Step 1" />
</NotebookBackground>
```

## Integration Pattern 3: Thumbnail Generation

```bash
# Generate base thumbnail scene
nano-banana "dramatic tech scene with code on screens, cinematic lighting" --model pro -a 16:9 -s 2K -d output/thumbnails/ -o yt-thumb-base

# For Jay's face in thumbnail → use face-swap-thumbnail.mjs (fal.ai)
# node scripts/face-swap-thumbnail.mjs output/thumbnails/yt-thumb-base.png
```

## fal.ai Functions Reference

These are the fal.ai functions from `lib/fal.ts` that nano-banana output may feed into:

| Function | Purpose | When to Use with nano-banana |
|----------|---------|------------------------------|
| `editWithNanoBanana()` | fal.ai nano-banana-2 edit mode | When you need to composite Jay into a nano-banana scene |
| `generateImage()` | Flux LoRA Jay photos | When the scene needs Jay — generate separately, then composite |
| `addAdHeadline()` | Sharp text overlay | Always use for adding text to any generated image |
| `analyzeWithVision()` | Claude Vision QA | Always use for scoring final ad images |
| `downloadImage()` | Download fal.ai URLs | Only for fal.ai URLs, not local nano-banana files |

## Sharp Text Overlay Reference

The `addAdHeadline()` function from `scripts/generate-cold-email-ads.mjs`:

- Adds a solid `#ED0D51` accent bar at top or bottom
- Bold white headline text (Big Shoulders Bold)
- Optional subheadline in smaller text
- Brightness-adaptive bar opacity

```javascript
// Signature
async function addAdHeadline(imagePath, headline, subheadline, position = 'top')

// Example
await addAdHeadline('output/ads/scene.png', 'HEADLINE', 'Subheadline text', 'top')
```

## Claude Vision QA Reference

The `analyzeWithVision()` function scores images on:

- **device_orientation** — screens facing viewer
- **realism** — editorial photography quality
- **ai_artifacts** — absence of AI tells
- **compositing** — seamless integration
- **text_readability** — overlay text clarity

Model: `claude-haiku-4-5-20251001` (fast, cheap)

## Output Directory Mapping

| nano-banana `-d` flag | Purpose | Feeds Into |
|------------------------|---------|------------|
| `output/ads/` | Ad backgrounds / scenes | addAdHeadline() → analyzeWithVision() |
| `output/ads/tof/` | Top of Funnel scenes | Text overlay with pain headlines |
| `output/ads/mof/` | Middle of Funnel scenes | Text overlay with transition headlines |
| `output/ads/bof/` | Bottom of Funnel scenes | Text overlay with outcome headlines |
| `output/carousel-assets/` | Transparent icons/illustrations | NotebookBackground carousel slides |
| `output/thumbnails/` | YouTube thumbnail bases | face-swap-thumbnail.mjs for Jay's face |
| `output/photos/` | General mockups/photos | Direct use or further editing |

## Cost Comparison

| Tool | Cost | Speed | Quality |
|------|------|-------|---------|
| nano-banana Flash | FREE (paid Google) | ~3-5s | Good for concepts, mockups |
| nano-banana Pro | FREE (paid Google) | ~5-8s | Great for hero images |
| fal.ai nano-banana-2 | ~$0.05-0.10/image | ~5-10s | Good scene generation |
| fal.ai Flux LoRA | ~$0.05/image | ~10-15s | Only way to get Jay's face |
| fal.ai nano-banana-2 edit | ~$0.05-0.10/image | ~10-15s | Best for compositing |

**Strategy:** Use Gemini CLI for free iteration, fal.ai only when you need Jay's face or the edit/composite mode.
