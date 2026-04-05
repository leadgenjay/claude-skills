---
name: youtube-thumbnail
version: 1.0.0
description: "Generate YouTube thumbnails using the AI pipeline. This skill should be used when the user wants to create a YouTube thumbnail, face-swap a thumbnail, remix a competitor thumbnail, or research competitor thumbnails. Also use when the user mentions 'thumbnail,' 'YouTube thumbnail,' 'face-swap thumbnail,' 'body swap thumbnail,' 'thumbnail concept,' 'generate thumbnail,' 'remix thumbnail,' or 'competitor thumbnail.'"
---

# YouTube Thumbnail — Lead Gen Jay

You are an expert YouTube thumbnail creator for **Lead Gen Jay**. You orchestrate the existing AI thumbnail pipeline — concept writing, base generation via Nano Banana 2, Jay photo generation via Flux Lora, and body-swap compositing via fal.ai.

---

## Jay's Thumbnail Design Preferences

These preferences are learned from real feedback sessions and MUST be followed in all thumbnail generation.

### Background & Color
- **Dark backgrounds preferred** — solid black (#0D0D0D) is the default. Only use white/light if explicitly requested
- **Hot pink accent** (#ED0D51) — use sparingly as pill badges, thin underlines, or subtle glow effects. Never as large background blocks behind text
- **White text on dark backgrounds** — always. Never dark text on colored backgrounds

### Typography
- **Font hierarchy:** Massive bold headline (Impact-style) > large bold subheadline > small compact subtitle
- **Subtitle styling:** Small font, thin/clean, inside a colored pill badge (hot pink #ED0D51 rounded pill background)
- **All text WHITE** on dark backgrounds — no exceptions
- **Banned combos:** Black text on red/pink background, dark text on any colored background

### Logo Rules
- **Always use real logo files** from `/Users/jayfeldman/Nextcloud/AI logos/` — never AI-generated logos
- **Never change logo colors** — logos must appear with exact original colors regardless of thumbnail background/scheme
- **Subtle glow** around logos is OK for emphasis — but keep it soft, not a bright halo

### Composition
- Person on right third, text on left
- 16:9 aspect ratio, 2K resolution
- Max 3 focal points, 1/3 of frame clear for text
- Clean, simple backgrounds — no complex scenes

---

## Workflow Router

Start every thumbnail request by determining which workflow fits. Present these options via `AskUserQuestion`:

| Option | When to Use | Cost | Time |
|--------|-------------|------|------|
| **1. From Scratch** | Fully custom concept, no reference | ~$1.04 | 5-8 min |
| **2. Scrape Competitors** | Research top thumbnails for this topic, then remix | ~$0.20 + $0.15/remix | 3-5 min |
| **3. From Specific URL** | Already found a specific thumbnail to remix | ~$0.15 | 1-2 min |

If invoked from `/youtube-script`, use the script's `thumbnailConcepts` array and skip straight to Option 1 Step 2.

---

## Setup (All Workflows)

Before any generation step:

1. **Gather context** (if not already provided):
   - Video topic or title
   - Desired emotion/mood
   - Text overlay (3 words max, or none)
   - Output name (kebab-case, e.g. `cold-email-setup`)

2. **Set FAL_KEY**:
```bash
export $(grep FAL_KEY .env.local | xargs)
```

---

## Option 1: From Scratch

### Step 1: Write Thumbnail Concepts

Write 2-3 concept options using the format from `lib/thumbnail-prompt-builder.ts`. The `buildThumbnailPrompt()` utility auto-adds: character placeholder, bright & clean lighting, composition rules, and quality keywords.

**Concept format:**
```
[emotion] expression, [action/pose], [key props], [environment], text: "[HEADLINE]" — [composition note]
```

**Examples:**
- `"excited expression, looking directly at camera, standing next to a massive glowing server rack, LED lights, hardware visible, text: '$50K/MONTH' — left third clear for text"`
- `"natural surprised expression, looking directly at camera, holding phone showing error message, red warning icons floating, text: 'IT'S OVER' — right side clear"`
- `"confident expression, looking directly at camera, arms crossed, multiple monitors showing dashboards behind, text: 'NEW PLAYBOOK' — left side"`

**Rules:**
- Always specify emotion/expression (the builder detects and applies it)
- Always include `looking directly at camera` in every concept — Jay must make eye contact with the viewer
- Keep expressions natural and confident — never exaggerated, cartoonish, or over-the-top (no "jaw-dropped", "screaming", "eyes popping out", "mouth wide open"). Use terms like "genuine surprise", "natural excitement", "calm confidence"
- Always include `text: "..."` for the baked-in headline (3 words max)
- Include composition hints (left/right/split) for text placement
- Only specify lighting to override the bright & clean default (e.g., "dark lighting mood")
- Never use "Jay" — the builder uses a generic man placeholder (body-swapped later)
- Max 3 focal points, 1/3 of frame clear for text

Present concepts to user for selection before proceeding.

### Step 2: Generate 4 Base Thumbnails

```bash
node scripts/generate-thumbnail.mjs generate-base --prompt "[selected concept]" --name [output-name] --count 4
```

- **Cost:** ~$0.32
- **Output:** `output/thumbnails/[name]-base-{1-4}.png`
- Open in Preview.app: `open -a Preview output/thumbnails/[name]-base-*.png`
- User picks the best (1-4)

### Step 3: Generate Jay Photos

Map the thumbnail emotion to a Jay preset:
- excited/happy → `excited`
- confident/serious → `confident`
- dramatic/intense → `cinematic`
- teaching/contemplative → `thinking`
- CTA/engagement → `pointing`

```bash
node scripts/generate-thumbnail.mjs generate-jay --preset [preset] --name [output-name]
```

- **Cost:** ~$0.12
- **Output:** `output/thumbnails/[name]-jay-{1-4}.png`
- Open in Preview.app for review

### Step 4: Body-Swap

```bash
node scripts/generate-thumbnail.mjs face-swap --base output/thumbnails/[name]-base-[N].png --jay output/thumbnails/[name]-jay-[M].png --name [output-name]
```

- **Cost:** ~$0.60
- **Output:** `output/thumbnails/[name]-final.png`
- Quality check: natural seams, matching lighting, expression readable at mobile size

### Step 5: Text Overlay (Optional)

If text wasn't baked into the base, add it via the script's `add-text` command or skip.

### Alternative: Full Interactive Pipeline

Run all steps in one interactive command:
```bash
node scripts/generate-thumbnail.mjs full --prompt "[concept]" --jay-preset [preset] --name [output-name]
```

---

## Remix Differentiation (Options 1 & 2)

Before face-swapping a competitor thumbnail, differentiate it so the result looks original while keeping the proven compositional pattern.

### Step A: Propose Differentiation Edits

Analyze the competitor thumbnail and propose 3 simple changes via `AskUserQuestion`:

| Change | Options | Rule |
|--------|---------|------|
| **Colors** | LGJ hot pink accent (#ED0D51), dark bg (#0D0D0D) preferred | Always shift to brand palette |
| **Background** | Dark/black preferred, plain white acceptable | Keep simple — never complex scenes |
| **Element** | Swap a prop, headline text, or small icon | Change the most recognizable non-person element |

Present as: "Here are 3 changes to differentiate this thumbnail: [list]. Which do you want to adjust?"

### Step B: Generate Remix

```bash
nano-banana "[differentiation prompt]" -r [source-thumb-path] -a 16:9 -s 2K -d output/thumbnails/ -o [name]-remix
```

**Prompt formula — use explicit KEEP vs CHANGE structure:**
```
YouTube thumbnail,
KEEP EXACTLY:
1. [person position from original, e.g., "person on right third"]
2. [text zone placement, e.g., "text zone on upper left"]
3. [overall 16:9 composition and framing]
4. [any element that works well]
CHANGE:
1. [approved color shift, e.g., "background to plain white"]
2. [approved accent color, e.g., "accent color to hot pink #ED0D51"]
3. [approved element swap, e.g., "swap laptop icon with email dashboard"]
clean professional look, 16:9
```

**Why KEEP/CHANGE matters:** Generic prompts don't override the reference image enough. You must explicitly call out what to preserve and what to change using numbered lists and CAPITALIZED emphasis. Without this structure, nano-banana will reproduce the reference too closely.

**Rules:**
- Keep the composition/layout from the original (person placement, text zones)
- Only change what was approved — don't add complexity
- Never use complex backgrounds (no server rooms, no cityscapes, no busy scenes)
- Approved backgrounds: solid black (#0D0D0D) preferred, plain white acceptable, simple solid/gradient
- **Dark backgrounds preferred** — black/dark backgrounds produce higher contrast and more professional-looking thumbnails. Default to dark unless the user requests otherwise
- **High contrast is mandatory** — every thumbnail must have strong text-to-background contrast readable at mobile size
- **White background text rule:** If using a white/light background, key headline text MUST have a dark or colored background bar/block behind it for contrast. Never place dark text directly on a plain white background without a backing element — it looks washed out at thumbnail size
- **Banned text/background combos:** Never use dark text on a colored background (e.g., black text on red/pink). Use WHITE text on dark or colored backgrounds. Use dark text ONLY on white/light backgrounds. If in doubt, white text + dark background is always safe
- **Cost:** ~$0.07
- Open result in Preview.app for approval before face-swap: `open -a Preview output/thumbnails/[name]-remix.png`

### Logo Assets

When a remix includes a brand/tool logo (e.g., Claude Code, ChatGPT, Gemini, n8n), **always use the real logo file** — never let the AI hallucinate a logo.

**CRITICAL: Never change logo colors.** Logos must appear with their exact original colors, shapes, and proportions. The prompt MUST explicitly say "KEEP the logo EXACTLY as-is — do not recolor, tint, or modify the logo in any way." This applies regardless of the thumbnail's background or color scheme.

**Logo directory:** `/Users/jayfeldman/Nextcloud/AI logos/`

Available logos:
| File | Logo |
|------|------|
| `claude code logo.png` | Claude Code |
| `claude ai icon.webp` | Claude AI |
| `chatgpt icon.png` | ChatGPT |
| `codex icon.png` | Codex |
| `gemini icon.png` / `gemini logo.png` | Gemini |
| `n8n icon.png` / `n8n logo.svg` | n8n |
| `openclaw icon.png` | OpenClaw |

**Workflow for logo insertion:**
1. Generate the remix via `nano-banana` first (with a placeholder text like "claude code" in the prompt)
2. Then use `nano-banana` edit mode to composite the real logo onto the remix:
```bash
nano-banana "[instruction to place logo — KEEP the logo EXACTLY as-is, do not recolor or modify]" -r [remix-path] -r "/Users/jayfeldman/Nextcloud/AI logos/[logo-file]" -a 16:9 -s 2K -d output/thumbnails/ -o [name]-remix-logo
```
3. Or pass the logo as a second `-r` reference during the initial remix generation
4. **Always include in the prompt:** "KEEP the logo EXACTLY as-is — do not recolor, tint, or modify the logo in any way"

### Step C: Iterative Reference Chaining (for v2+ iterations)

If the first remix (v1) gets some elements right but others wrong, **use v1 as the -r reference for v2** instead of going back to the original competitor thumbnail. This preserves the good elements while allowing targeted fixes.

```bash
# v2 uses v1 as reference (NOT the original competitor thumbnail)
nano-banana "[KEEP/CHANGE prompt targeting v1's issues]" -r output/thumbnails/[name]-remix-v1.png -a 16:9 -s 2K -d output/thumbnails/ -o [name]-remix-v2
```

**When to chain:**
- v1 got person position right but background wrong → use v1, CHANGE only background
- v1 got colors right but missing a badge/element → use v1, KEEP colors, add element
- v1 got most things right but one detail off → use v1, fix that detail only

**Naming convention:** Append `-v1`, `-v2`, `-v3` to track iterations.

---

## Option 2: Scrape Competitor Thumbnails

### Step 1: Discover via Apify MCP

Use `streamers/youtube-scraper` via Apify MCP tools:

1. `fetch-actor-details` — get the actor's input schema
2. `call-actor` — search 10-20 videos by topic keywords
3. `get-actor-output` — extract results

Extract thumbnail URLs from results: `https://i.ytimg.com/vi/[videoId]/maxresdefault.jpg`

**Cost:** ~$0.05-0.10

### Step 2: Download & Analyze

Download top 5-10 thumbnails to `output/thumbnails/research/`:

```bash
mkdir -p output/thumbnails/research
curl -o output/thumbnails/research/thumb-1.jpg "https://i.ytimg.com/vi/[id]/maxresdefault.jpg"
```

Resize before viewing (mandatory — prevents Claude Code crashes with large images):
```bash
sips --resampleHeightWidthMax 1000 output/thumbnails/research/*.jpg
```

Open in Preview.app for user review:
```bash
open -a Preview output/thumbnails/research/
```

Assess each candidate:
- Face visible and single person?
- Good lighting, clear composition?
- Space for text overlay?
- Body-swap suitability (full body or at least upper body visible)?

### Step 3: User Picks Best

Present ranked candidates with assessment notes. User selects which to remix.

### Step 4: Remix Differentiation

Follow the **Remix Differentiation** section above:
1. **Propose 3 changes** (color, background, element) via `AskUserQuestion`
2. **Generate remix** via `nano-banana` with `-r` referencing the selected competitor thumbnail

### Step 5: Face-Swap

**Always use `generate-thumbnail.mjs face-swap`** (NOT `face-swap-thumbnail.mjs`) — it properly uploads both local images to fal.ai storage, which produces better results for remix workflows.

```bash
node scripts/generate-thumbnail.mjs face-swap --base output/thumbnails/[name]-remix.png --jay public/photos/jay-excited.png --name [output-name]
```

- Default Jay photo: `public/photos/jay-excited.png`
- Available pre-generated photos: `jay-excited`, `jay-pointing`, `jay-professional`, `jay-cinematic`, `jay-headshot` (all in `public/photos/`)
- **Cost:** ~$0.60
- **Output:** `output/thumbnails/[output-name]-final.png`

### Step 6: Text Overlay (Optional)

Add text overlay if the original thumbnail's text doesn't fit the new video.

---

## Option 3: From Specific URL

### Step 1: Resolve URL

- **YouTube video URL** → extract videoId → `https://i.ytimg.com/vi/[id]/maxresdefault.jpg`
- **Direct image URL** → use as-is

Download and preview:
```bash
curl -o output/thumbnails/source-thumb.jpg "[resolved-url]"
sips --resampleHeightWidthMax 1000 output/thumbnails/source-thumb.jpg
open -a Preview output/thumbnails/source-thumb.jpg
```

### Step 2: Remix Differentiation

Follow the **Remix Differentiation** section above:
1. **Propose 3 changes** (color, background, element) via `AskUserQuestion`
2. **Generate remix** via `nano-banana` with `-r` referencing the downloaded source thumbnail

### Step 3: Select Jay Preset

Ask user which expression matches the thumbnail mood. Default: `jay-excited`.

### Step 4: Face-Swap

**Always use `generate-thumbnail.mjs face-swap`** (NOT `face-swap-thumbnail.mjs`) — it properly uploads both local images to fal.ai storage.

```bash
node scripts/generate-thumbnail.mjs face-swap --base output/thumbnails/[name]-remix.png --jay public/photos/jay-excited.png --name [output-name]
```

- Default Jay photo: `public/photos/jay-excited.png`
- **Cost:** ~$0.60
- **Output:** `output/thumbnails/[output-name]-final.png`

### Step 5: Text Overlay (Optional)

---

## Jay Presets Reference

| Preset | Best For | Pre-generated Photo | Generate Fresh? |
|--------|----------|---------------------|-----------------|
| `excited` | Happy, energetic (default) | `public/photos/jay-excited.png` | No |
| `pointing` | CTAs, engagement | `public/photos/jay-pointing.png` | No |
| `professional` | Authority, business | `public/photos/jay-professional.png` | No |
| `cinematic` | Dramatic, intense | `public/photos/jay-cinematic.png` | No |
| `headshot` | Clean, versatile | `public/photos/jay-headshot.png` | No |
| `thinking` | Contemplative, teaching | — | Yes, via Flux Lora |
| `confident` | Calm authority | — | Yes, via Flux Lora |
| `whiteboard` | Tutorial, teaching | — | Yes, via Flux Lora |

For presets without pre-generated photos, use `generate-jay` with `--preset` or `--prompt`:
```bash
node scripts/generate-thumbnail.mjs generate-jay --preset thinking --name [output-name]
```

For all face-swap operations (Options 1, 2 & 3 above), use `generate-thumbnail.mjs face-swap` with the `--jay` flag pointing to a pre-generated photo: `public/photos/jay-excited.png`, `jay-pointing.png`, `jay-professional.png`, `jay-cinematic.png`, or `jay-headshot.png`.

---

## Quality Checklist

Before presenting the final thumbnail to the user, run the Post-Generation Verification section below. Additionally verify:

- [ ] **Jay is in the FRONT layer** — always in front of props, icons, laptops, badges. Never behind or occluded by any element
- [ ] **Jay is looking directly at the camera** — direct eye contact with viewer
- [ ] **Expression is natural** — confident, genuine, not exaggerated or cartoonish
- [ ] Jay looks natural — no artifacts at seams, no mismatched skin tones
- [ ] Lighting direction matches the environment
- [ ] Expression readable at 120px height (mobile thumbnail size)
- [ ] Text overlay: max 3 words, high contrast, readable at 320px width
- [ ] 16:9 aspect ratio maintained, 1K+ resolution
- [ ] Opened in Preview.app for visual confirmation (`open -a Preview [file]`)

---

## Post-Generation Verification (Mandatory)

After EVERY face-swap, verify the result before presenting to the user:

### Step 1: Resize for analysis
```bash
sips --resampleHeightWidthMax 1000 output/thumbnails/[name]-final.png
```

### Step 2: Analyze the image
Read the resized image via the Read tool and check these **critical criteria** (any failure = regenerate):

| Check | Pass | Fail |
|-------|------|------|
| **Front layer** | Jay is visibly in front of ALL props, icons, badges, screens | Jay is behind or occluded by any element |
| **Camera direction** | Jay is looking directly at the camera | Jay is looking away, sideways, or eyes are closed |
| **Natural expression** | Confident, genuine, natural | Exaggerated, cartoonish, grimacing, or uncanny |

### Step 3: Handle failures
- If any critical check fails, **do not present to the user**
- Report what failed and regenerate with an adjusted prompt that emphasizes the failing criterion
- After 2 failed attempts on the same issue, flag to the user and ask for guidance

### Step 4: Non-critical checks (visual inspection via Preview.app)
- Seam quality and skin tone matching
- Lighting direction consistency
- Expression readable at 120px height (mobile size)
- 16:9 aspect ratio and 1K+ resolution

---

## Integration with YouTube Script Workflow

When invoked from `/youtube-script`:

1. Read the script's `thumbnailConcepts` array for pre-written concepts
2. Use the script's recommended `jayPreset` if provided
3. Skip concept writing (Step 1) — go straight to generating bases
4. Save final thumbnail path back to the script context

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `youtube-script` | Full video pipeline — calls this skill for thumbnails |
| `nano-banana` | Standalone image generation (lower level) |
| `ad-creative` | Ad images with Jay (different pipeline, different aspect ratios) |
| `generate-jay-photo.mjs` | Standalone Jay photo generation script |

---

## Key Files

| File | Role |
|------|------|
| `scripts/generate-thumbnail.mjs` | Primary CLI (commands: `full`, `generate-base`, `generate-jay`, `face-swap`) — **use this for ALL face-swap operations** |
| `scripts/face-swap-thumbnail.mjs` | DEPRECATED — has local file upload bug. Use `generate-thumbnail.mjs face-swap` instead |
| `scripts/generate-jay-photo.mjs` | Jay photo generation (8 presets via Flux Lora) |
| `lib/thumbnail-prompt-builder.ts` | Concept → structured Nano Banana prompt |
| `docs/plans/thumbnail-generation-sop.md` | Full SOP reference |
| `public/photos/jay-*.png` | 5 pre-generated Jay photos |
| `output/thumbnails/` | All generated output |
