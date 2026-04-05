---
name: nano-banana
version: 1.0.0
description: "Generate AI images using the Gemini-powered nano-banana CLI. Use when asked to 'generate image,' 'create transparent asset,' 'style transfer,' 'gemini image,' 'quick image,' 'generate mockup,' 'create sprite,' 'make icon,' 'generate illustration,' or any standalone image generation that does NOT require Jay's face or the full fal.ai ad pipeline. For ads with Jay or the 5-step pipeline, use the ad-creative skill instead."
---

# Nano Banana — Gemini Image Generation CLI

Generate images using the `nano-banana` CLI powered by Gemini 3.1 Flash (default) and Gemini 3 Pro. Free with a paid Google account.

## Gemini CLI vs fal.ai Pipeline — When to Use Which

| Need | Use This Skill (nano-banana CLI) | Use ad-creative Skill (fal.ai) |
|------|----------------------------------|-------------------------------|
| Quick standalone image | Yes | No |
| Transparent asset / icon | Yes (`-t` flag) | No |
| Style transfer / image editing | Yes (`-r` flag) | No |
| Mockup / UI screenshot | Yes | No |
| Carousel slide illustration | Yes | No |
| **Jay's face in the image** | **No** — use ad-creative | **Yes** (Flux LoRA) |
| **Full 5-step ad pipeline** | **No** — use ad-creative | **Yes** (Scene → LoRA → Composite → Text → QA) |
| **Smart Swap / Body Swap** | **No** — use ad-creative | **Yes** |

**Rule of thumb:** If it needs Jay or the ad pipeline → `ad-creative`. Everything else → `nano-banana`.

## Quick Reference

```bash
# Basic generation (1K, Flash model)
nano-banana "your prompt"

# With options
nano-banana "prompt" -o filename -s 2K -a 16:9 -d output/dir

# Transparent asset
nano-banana "robot mascot" -t -o mascot

# Style transfer / edit
nano-banana "make background white" -r input.png -o result

# Pro model (highest quality)
nano-banana "detailed hero image" --model pro -s 2K
```

## Core Options

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output` | `nano-gen-{timestamp}` | Output filename (no extension) |
| `-s, --size` | `1K` | `512`, `1K`, `2K`, or `4K` |
| `-a, --aspect` | model default | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `4:5`, `5:4`, `21:9` |
| `-m, --model` | `flash` | `flash`/`nb2`, `pro`/`nb-pro`, or any model ID |
| `-d, --dir` | current directory | Output directory |
| `-r, --ref` | — | Reference image(s), can use multiple |
| `-t, --transparent` | — | Green screen → background removal (needs ffmpeg + imagemagick) |
| `--costs` | — | Show cost tracking summary |

## Model Selection Guide

| Model | Alias | Best For | Cost (1K) |
|-------|-------|----------|-----------|
| Gemini 3.1 Flash | `flash`, `nb2` | Default. Speed, batch generation, concepts, mockups | ~$0.067 |
| Gemini 3 Pro | `pro`, `nb-pro` | Hero images, style transfer, thumbnails, final assets | ~$0.134 |

**Free with paid Google account** — use Flash for iteration, Pro for finals.

## Lead Gen Jay Presets

### Brand-Aligned Prompts

**Dark mode SaaS dashboard:**
```bash
nano-banana "premium SaaS dashboard, dark mode with near-black #0D0D0D background, hot pink #ED0D51 accent highlights on charts and buttons, clean minimal UI, analytics view" -a 16:9 -s 2K -o dashboard
```

**Marketing hero image:**
```bash
nano-banana "cinematic tech workspace, dramatic lighting, laptop showing automation dashboard, professional atmosphere, shallow depth of field" --model pro -s 2K -o hero
```

**Transparent carousel icon:**
```bash
nano-banana "flat illustration of a robot arm automating emails, clean vector style, bold colors" -t -s 1K -o carousel-icon
```

**Product mockup:**
```bash
nano-banana "MacBook Pro on clean desk showing SaaS dashboard with analytics, minimal setup, soft lighting, editorial product photography" --model pro -s 2K -a 16:9 -o product-mockup
```

### Ad Creative Sizes

| Format | Flag | Use Case |
|--------|------|----------|
| 1:1 (1024x1024) | `-a 1:1` | Feed ads, social posts |
| 4:5 (1080x1350) | `-a 4:5` | Instagram feed (max real estate) |
| 9:16 (1080x1920) | `-a 9:16` | Stories, Reels, TikTok |
| 16:9 (1920x1080) | `-a 16:9` | YouTube thumbnails, hero images |

## Output Directory Conventions

Route output to project structure using the `-d` flag:

```bash
# Ad scene backgrounds (before pipeline Steps 4-5)
nano-banana "..." -d output/ads/

# Carousel slide assets
nano-banana "..." -t -d output/carousel-assets/

# YouTube thumbnails
nano-banana "..." -a 16:9 -d output/thumbnails/

# General photos / mockups
nano-banana "..." -d output/photos/
```

## Pipeline Integration

Nano-banana output can feed into the ad-creative pipeline at Steps 4-5:

1. **Generate scene** with nano-banana → use as base image
2. **Apply text overlay** with `addAdHeadline()` (Sharp + SVG from `scripts/generate-cold-email-ads.mjs`)
3. **QA with Claude Vision** via `analyzeWithVision()` for scoring

**Transparent assets** feed directly into carousel `NotebookBackground` components as slide visuals.

See `references/integration-guide.md` for detailed integration patterns.

## Key Workflows

### Transparent Assets (Icons, Sprites, Logos)
```bash
nano-banana "robot mascot character" -t -o mascot
nano-banana "minimalist tech logo, bold geometric" -t -o logo
nano-banana "pixel art treasure chest" -t -s 512 -o chest
```

### Reference Image Editing
```bash
# Edit existing image
nano-banana "change background to pure white" -r dark-ui.png -o light-ui

# Style transfer from multiple references
nano-banana "combine these two UI styles" -r style1.png -r style2.png -o combined
```

### Batch Concept Generation
```bash
# Quick low-res concepts first
nano-banana "automation dashboard concept A" -s 512 -o concept-a
nano-banana "automation dashboard concept B" -s 512 -o concept-b

# Then upscale the winner
nano-banana "refined version of concept A with more detail" -r concept-a.png --model pro -s 2K -o final
```

## Image Size Limits (Context Safety)

- All downloaded/scraped reference images used with `-r` must be max 1000px — resize before use: `sips --resampleHeightWidthMax 1000 <file>`
- NEVER use Read tool to view images — use `open` for Preview.app or `sips -g pixelWidth -g pixelHeight` for dimensions
- nano-banana output at 1K (1024px) is already safe — only external/scraped images need resizing
- This prevents Claude Code context crashes from the 2000px many-image limit

## Cost Tracking

```bash
nano-banana --costs  # Shows total spend, per-model breakdown
```

Logs stored at `~/.nano-banana/costs.json`.

## Related Skills

| Skill | When to Use |
|-------|-------------|
| `ad-creative` | Jay's face, full 5-step ad pipeline, Smart Swap |
| `canvas-design` | Post-generation overlays and graphic design |
| `frontend-design` | UI components that use generated assets |
