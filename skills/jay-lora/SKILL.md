---
name: jay-lora
version: 1.0.1
description: "Generate character-consistent AI photos of Jay (Lead Gen Jay) using Flux Lora. Use when any skill or workflow needs a Jay photo — thumbnails, carousels, ad creatives, banners, social posts. Also use when the user mentions 'Jay photo,' 'photo of me,' 'generate me,' 'Flux Lora,' 'jay lora,' 'headshot,' 'profile photo,' or 'body swap source.'"
---

# Jay Photo Generator — Flux Lora

Generate character-consistent AI photos of Jay (Lead Gen Jay) using a custom Flux Lora fine-tune. This skill is the single source of truth for all Jay photo generation across thumbnails, carousels, ad creatives, banners, and social content.

---

## Quick Reference

| Detail | Value |
|--------|-------|
| **Model** | Flux Lora (`fal-ai/flux-lora`) |
| **LoRA weights** | `https://v3.fal.media/files/tiger/Cubmr1zZLBb2fzlGo6Yao_pytorch_lora_weights.safetensors` |
| **Trigger token** | `jay` (must appear in every prompt) |
| **Script** | `scripts/generate-jay-photo.mjs` |
| **Output** | `output/photos/` |
| **Cost** | ~$0.03 per image |
| **Pre-generated photos** | `public/photos/jay-*.png` |

---

## Setup

```bash
export $(grep FAL_KEY .env.local | xargs)
```

---

## When to Use This Skill

This skill is invoked by other skills that need a Jay photo. It should be skill-chained:

| Calling Skill | Use Case | Recommended Framing |
|---------------|----------|---------------------|
| `youtube-thumbnail` | Body-swap source for thumbnail | Close-up, chest-up, serious/confident |
| `carousel-post` | Cover slide Jay photo | Upper body, clean background, matches slide palette |
| `ad-creative` | Ad creative with Jay | Varies by ad format (square, portrait, story) |
| `social-media-banner` | Banner/header compositing | Upper body or headshot, clean edges for cutout |
| `social-content` | General social posts | Context-dependent |

---

## Pre-Generated Photos

Check these first before generating fresh. Located in `public/photos/`:

| File | Expression | Best For |
|------|-----------|----------|
| `jay-serious.png` | Serious, confident, no smile | Thumbnails, authority content |
| `jay-excited.png` | Happy, energetic smile | Carousels, social posts |
| `jay-professional.png` | Business confident | LinkedIn, corporate |
| `jay-cinematic.png` | Dramatic, intense | Dark-bg content |
| `jay-headshot.png` | Clean, versatile | Profile photos, general use |
| `jay-pointing.png` | Pointing at camera | CTAs (has hand gesture — use with caution) |
| `jay-speaking-real.jpg` | Real photo, speaking on stage | Testimonials, social proof |

---

## Generation

### Using the Script

```bash
# Single preset
node scripts/generate-jay-photo.mjs [preset] [output-name]

# Examples
node scripts/generate-jay-photo.mjs headshot jay-headshot
node scripts/generate-jay-photo.mjs cinematic jay-dark-thumb

# All presets at once
node scripts/generate-jay-photo.mjs all
```

### Available Presets

| Preset | Description | Background | Expression | Framing |
|--------|-------------|------------|------------|---------|
| `serious` | **Default for thumbnails** | Dark, solid | Serious, no smile, calm intensity | Close-up chest-up |
| `headshot` | Clean studio headshot | White | Warm natural smile | Head and shoulders |
| `professional` | Business/corporate | Light office | Confident | Upper body |
| `casual` | Lifestyle/creator | Light, simple | Relaxed natural smile | Upper body |
| `action` | Energetic/dynamic | White, clean | Energetic, slight smile | Head and shoulders |
| `cinematic` | Dramatic portrait | Dark, moody | Intense, determined | Close-up chest-up |
| `thinking` | Contemplative | Dark, clean | Pensive, narrowed eyes | Upper body |
| `excited` | Happy/celebratory | Light, clean | Big natural smile | Head and shoulders |
| `stressed` | Overwhelmed/frustrated | Dark, dim | Frustrated, furrowed brow | Upper body |
| `metaphor` | Conceptual/atmospheric | Dark + red accent | Confident | Upper body |

**Removed presets:** `pointing` and `whiteboard` were removed because they require hand gestures which produce inconsistent results with Flux Lora.

**Key design pattern:** Presets that tend to trigger hand gestures (`excited`, `action`) use "close-up head and shoulders" framing to crop hands out of frame entirely.

### Custom Prompts (via Script or Direct API)

For prompts not covered by presets, call the Flux Lora API directly or modify the script prompt. Always follow the prompt rules below.

---

## Prompt Engineering Rules

These rules are mandatory for ALL Jay photo prompts — presets and custom alike.

### Must Include
1. **Trigger token `jay`** — must appear in every prompt, typically as the first word
2. **Expression description** — always specify the facial expression explicitly
3. **`looking directly at camera`** — Jay must make eye contact with the viewer (unless cinematic/off-camera is explicitly requested)
4. **Lighting description** — bright studio, natural, dramatic, etc.
5. **Framing description** — upper body, headshot, full body, etc.

### Must Avoid
1. **No hand gestures** — never include pointing, OK sign, thumbs up, or any specific hand/arm positioning unless the user explicitly requests it. Default to relaxed natural arms
2. **No exaggerated expressions** — never use "jaw-dropped," "screaming," "eyes popping," "mouth wide open." Use natural terms: "genuine surprise," "calm confidence," "natural excitement"
3. **No complex backgrounds** — keep backgrounds simple (solid colors, soft gradients, clean studio). Never busy scenes, cityscapes, or cluttered environments unless explicitly requested
4. **No smiling for thumbnails** — when generating for YouTube thumbnails, default to serious/confident. Explicitly add "NO SMILE, serious confident expression, calm intensity" to the prompt
5. **When overriding user-requested expressions:** Always acknowledge what the user asked for, convert it to a natural equivalent first (e.g., "surprised" becomes "genuine subtle surprise"), then explain why the context default (e.g., serious for thumbnails) is recommended instead. Present both options so the user can choose. Never silently replace a user's requested expression without showing the natural conversion.

### Expression-to-Context Mapping

Use this to auto-select the right expression when the calling skill doesn't specify:

| Context | Default Expression | Prompt Addition |
|---------|-------------------|-----------------|
| YouTube thumbnail | Serious, confident | "NO SMILE, serious confident expression, calm intensity, direct eye contact" |
| Carousel cover | Friendly, approachable | "warm natural smile, approachable, direct eye contact" |
| Ad creative | Confident, authority | "confident expression, authoritative, professional" |
| Social post | Warm, relatable | "natural genuine smile, relaxed, approachable" |
| Banner/header | Professional, composed | "calm professional expression, composed, direct eye contact" |
| Testimonial/proof | Genuine, authentic | "natural smile, authentic, candid feel" |

### Framing Guidelines by Use Case

| Use Case | Framing | Size | Notes |
|----------|---------|------|-------|
| Thumbnail body-swap | Close-up, chest up | `square_hd` | Face must be large enough for clean face-swap |
| Carousel cover | Upper body, waist up | `square_hd` | Leave room for text above or beside |
| Ad creative (1:1) | Upper body | `square_hd` | Center-framed for square crop |
| Ad creative (4:5) | Upper body, more headroom | `square_hd` | Generate square, crop to 4:5 after |
| Banner compositing | Upper body, clean edges | `square_hd` | Solid/simple bg for easy cutout |
| Profile/headshot | Head and shoulders only | `square_hd` | Tight crop, clean background |

---

## API Parameters

When calling the Flux Lora API directly (not via the script):

```json
{
  "prompt": "jay, [your prompt here]",
  "loras": [{ "path": "https://v3.fal.media/files/tiger/Cubmr1zZLBb2fzlGo6Yao_pytorch_lora_weights.safetensors", "scale": 1.0 }],
  "image_size": "square_hd",
  "num_images": 1,
  "output_format": "png",
  "num_inference_steps": 28,
  "guidance_scale": 3.5
}
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| `loras[0].scale` | `1.0` | Full LoRA strength for character consistency |
| `num_inference_steps` | `28` | Good quality/speed balance |
| `guidance_scale` | `3.5` | Default Flux guidance |
| `image_size` | `square_hd` | Always square — crop after if needed |
| `output_format` | `png` | Lossless for compositing |

---

## Quality Verification

After every generation, verify before passing to the calling skill:

### Critical Checks (fail = regenerate)
- [ ] **Looks like Jay** — consistent with the LoRA fine-tune, recognizable
- [ ] **Correct expression** — matches the requested mood/context
- [ ] **Direct eye contact** — looking at camera (unless cinematic was requested)
- [ ] **No unwanted hand gestures** — hands relaxed or not visible
- [ ] **Natural, not cartoonish** — no exaggerated features or uncanny valley

### Quality Checks (flag but don't auto-regenerate)
- [ ] Clean background (no artifacts, no unexpected objects)
- [ ] Good lighting (matches the requested mood)
- [ ] Sharp focus on face
- [ ] No LoRA artifacts (distorted hands, extra fingers, odd skin texture)

### Thumbnail-Specific Checks
- [ ] Expression is serious/confident (NOT smiling)
- [ ] Face is large enough for clean body-swap
- [ ] High enough resolution for 1920x1080 compositing

---

## Batch Generation

Generate multiple variations for selection:

```bash
# Generate 4 of the same preset (run 4 times, different names)
for i in 1 2 3 4; do
  node scripts/generate-jay-photo.mjs cinematic jay-cinematic-$i
done
```

Or for the calling skill to pick from, generate 4 via the `generate-thumbnail.mjs generate-jay` command which handles this automatically:

```bash
node scripts/generate-thumbnail.mjs generate-jay --preset [preset] --name [output-name]
```

This generates 4 variations and saves to `output/thumbnails/[name]-jay-{1-4}.png`.

---

## Key Files

| File | Role |
|------|------|
| `scripts/generate-jay-photo.mjs` | Primary generation script (11 presets) |
| `scripts/generate-thumbnail.mjs generate-jay` | Thumbnail-specific Jay generation (4 variations) |
| `public/photos/jay-*.png` | 5 pre-generated photos for quick use |
| `output/photos/` | Fresh generation output directory |
| `output/thumbnails/` | Thumbnail pipeline output (when called via generate-thumbnail.mjs) |
