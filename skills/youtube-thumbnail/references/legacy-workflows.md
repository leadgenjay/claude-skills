# Legacy Thumbnail Workflows (Archived)

These were the original 3 workflow options in the youtube-thumbnail skill, replaced by the unified 6-step pipeline. Preserved here for reference.

---

## Workflow Router (Original)

| Option | When to Use | Cost | Time |
|--------|-------------|------|------|
| **1. From Scratch** | New video, full creative control | ~$1.04 | 5-8 min |
| **2. Scrape Competitors** | Research first, then remix the best | ~$0.20 + $0.15/remix | 3-5 min |
| **3. From Specific URL** | Already found a thumbnail to remix | ~$0.15 | 1-2 min |

---

## Option 1: From Scratch

### Step 1: Write Thumbnail Concepts

Write 2-3 concept options using the format from `lib/thumbnail-prompt-builder.ts`. The `buildThumbnailPrompt()` utility auto-adds: character placeholder, bright & clean lighting, composition rules, and quality keywords.

**Concept format:**
```text
[emotion] expression, [action/pose], [key props], [environment], text: "[HEADLINE]" — [composition note]
```

**Examples:**
- `"excited expression, looking directly at camera, standing next to a massive glowing server rack, LED lights, hardware visible, text: '$50K/MONTH' — left third clear for text"`
- `"natural surprised expression, looking directly at camera, holding phone showing error message, red warning icons floating, text: 'IT'S OVER' — right side clear"`
- `"confident expression, looking directly at camera, arms crossed, multiple monitors showing dashboards behind, text: 'NEW PLAYBOOK' — left side"`

**Rules:**
- Always specify emotion/expression (the builder detects and applies it)
- Always include `looking directly at camera` in every concept
- Keep expressions natural and confident — never exaggerated, cartoonish, or over-the-top
- Always include `text: "..."` for the baked-in headline (3 words max)
- Include composition hints (left/right/split) for text placement
- Only specify lighting to override the bright & clean default
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
- excited/happy -> `excited`
- confident/serious -> `confident`
- dramatic/intense -> `cinematic`
- teaching/contemplative -> `thinking`
- CTA/engagement -> `pointing`

```bash
node scripts/generate-thumbnail.mjs generate-jay --preset [preset] --name [output-name]
```

- **Cost:** ~$0.12
- **Output:** `output/thumbnails/[name]-jay-{1-4}.png`

### Step 4: Body-Swap

```bash
node scripts/generate-thumbnail.mjs face-swap --base output/thumbnails/[name]-base-[N].png --jay output/thumbnails/[name]-jay-[M].png --name [output-name]
```

- **Cost:** ~$0.60
- **Output:** `output/thumbnails/[name]-final.png`

### Step 5: Text Overlay (Optional)

If text wasn't baked into the base, add it via the script's `add-text` command.

### Alternative: Full Interactive Pipeline

```bash
node scripts/generate-thumbnail.mjs full --prompt "[concept]" --jay-preset [preset] --name [output-name]
```

---

## Remix Differentiation (Options 2 & 3)

Before face-swapping a competitor thumbnail, differentiate it so the result looks original while keeping the proven compositional pattern.

### Step A: Propose Differentiation Edits

Analyze the competitor thumbnail and propose 3 simple changes:

| Change | Options | Rule |
|--------|---------|------|
| **Colors** | LGJ hot pink accent (#ED0D51), dark bg (#0D0D0D) preferred | Always shift to brand palette |
| **Background** | Dark/black preferred, plain white acceptable | Keep simple -- never complex scenes |
| **Element** | Swap a prop, headline text, or small icon | Change the most recognizable non-person element |

### Step B: Generate Remix

```bash
nano-banana "[differentiation prompt]" -r [source-thumb-path] -a 16:9 -s 2K -d output/thumbnails/ -o [name]-remix
```

**Prompt formula -- use explicit KEEP vs CHANGE structure:**
```text
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

**Why KEEP/CHANGE matters:** Generic prompts don't override the reference image enough. You must explicitly call out what to preserve and what to change using numbered lists and CAPITALIZED emphasis.

**Rules:**
- Keep the composition/layout from the original (person placement, text zones)
- Only change what was approved
- Never use complex backgrounds
- Dark backgrounds preferred
- High contrast is mandatory
- White background text rule: key headline text MUST have a dark or colored background bar/block behind it
- Banned text/background combos: Never use dark text on a colored background

### Step C: Iterative Reference Chaining (for v2+ iterations)

If the first remix (v1) gets some elements right but others wrong, use v1 as the -r reference for v2 instead of going back to the original.

```bash
nano-banana "[KEEP/CHANGE prompt targeting v1's issues]" -r output/thumbnails/[name]-remix-v1.png -a 16:9 -s 2K -d output/thumbnails/ -o [name]-remix-v2
```

Naming convention: Append `-v1`, `-v2`, `-v3` to track iterations.

---

## Option 2: Scrape Competitor Thumbnails

### Step 1: Discover via Apify MCP

Use `streamers/youtube-scraper` via Apify MCP tools:

1. `fetch-actor-details` -- get the actor's input schema
2. `call-actor` -- search 10-20 videos by topic keywords
3. `get-actor-output` -- extract results

Extract thumbnail URLs: `https://i.ytimg.com/vi/[videoId]/maxresdefault.jpg`

**Cost:** ~$0.05-0.10

### Step 2: Download & Analyze

Download top 5-10 thumbnails to `output/thumbnails/research/`:

```bash
mkdir -p output/thumbnails/research
curl -o output/thumbnails/research/thumb-1.jpg "https://i.ytimg.com/vi/[id]/maxresdefault.jpg"
sips --resampleHeightWidthMax 1000 output/thumbnails/research/*.jpg
open -a Preview output/thumbnails/research/
```

Assess each candidate:
- Face visible and single person?
- Good lighting, clear composition?
- Space for text overlay?
- Body-swap suitability?

### Step 3: User Picks Best

Present ranked candidates. User selects which to remix.

### Step 4: Remix Differentiation

Follow the Remix Differentiation section above.

### Step 5: Face-Swap

```bash
node scripts/generate-thumbnail.mjs face-swap --base output/thumbnails/[name]-remix.png --jay public/photos/jay-excited.png --name [output-name]
```

### Step 6: Text Overlay (Optional)

---

## Option 3: From Specific URL

### Step 1: Resolve URL

- YouTube video URL -> extract videoId -> `https://i.ytimg.com/vi/[id]/maxresdefault.jpg`
- Direct image URL -> use as-is

```bash
curl -o output/thumbnails/source-thumb.jpg "[resolved-url]"
sips --resampleHeightWidthMax 1000 output/thumbnails/source-thumb.jpg
open -a Preview output/thumbnails/source-thumb.jpg
```

### Step 2: Remix Differentiation

Follow the Remix Differentiation section above.

### Step 3: Select Jay Preset

Ask user which expression matches the thumbnail mood. Default: `jay-excited`.

### Step 4: Face-Swap

```bash
node scripts/generate-thumbnail.mjs face-swap --base output/thumbnails/[name]-remix.png --jay public/photos/jay-excited.png --name [output-name]
```

### Step 5: Text Overlay (Optional)
