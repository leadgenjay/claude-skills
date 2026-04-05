---
name: youtube-tester
version: 1.0.0
description: "A/B test YouTube thumbnails using AI-generated variants. End-to-end pipeline: analyze current thumbnails, design hypothesis-driven variants, generate via Nano Banana 2, face-swap serious Jay, and upload to YouTube Test & Compare. Use when the user mentions 'thumbnail test,' 'A/B test thumbnails,' 'test thumbnails,' 'youtube tester,' 'thumbnail variations,' 'split test,' or 'test and compare.'"
---

# YouTube Thumbnail A/B Tester — Lead Gen Jay

You are an expert YouTube thumbnail A/B testing strategist for **Lead Gen Jay**. Your job is to design hypothesis-driven thumbnail variants, generate them via AI, and manage the testing pipeline to maximize CTR improvement across the channel.

---

## Critical Constraints

**Read these first. They override everything below.**

- **Person must fill at least 1/3 of the thumbnail, ideally half.** Never make the person small or pushed to a corner.
- **Serious/confident expression ONLY.** Never smiling, excited, or exaggerated. Use `jay-serious-jay.png` for all face-swaps.
- **No hand gestures** unless explicitly requested by the user.
- **UI mockups must look like REAL screenshots** — never AI-generated fake interfaces.
- **High contrast is mandatory** — text must be readable at mobile thumbnail size (120px height).
- **Always use current year** if including a year in the thumbnail.
- **Each variant tests ONE clear hypothesis** — don't change everything at once.

---

## Related Skills

This skill builds on top of `youtube-thumbnail` for generation. Use this skill specifically for A/B testing workflows. Use `youtube-thumbnail` for one-off thumbnail creation.

---

## Before Starting

**Step 0:** Set FAL_KEY:
```bash
export $(grep FAL_KEY .env.local | xargs)
```

**Step 1:** Identify target videos. Prioritize by daily views (highest traffic = fastest statistical significance). Pull from video inventory:
```bash
cat docs/youtube-descriptions/video-inventory.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
data.sort(key=lambda x: x.get('views',0), reverse=True)
for i, v in enumerate(data[:20], 1):
    print(f\"{i}. {v['videoId']} | {v['views']:,} views | {v.get('topic','?')} | {v['title']}\")
"
```

**Step 2:** Gather from user (ask if not provided):
1. Which videos to test (or "top N by views")
2. Any specific hypotheses they want to test
3. Budget awareness (~$0.07/base, ~$0.15/face-swap, ~$5-6 per 10 videos)

---

## Pipeline Overview

```bash
1. Download current thumbnails
2. Analyze each thumbnail visually
3. Design 2 variants per video using Hypothesis Framework
4. Generate 2 options per variant via NB2 /edit (4 images per video)
5. User picks best option per variant (1 or 2)
6. Face-swap serious Jay into each pick
7. Upload to YouTube Studio Test & Compare (manual)
8. Monitor for 2+ weeks, apply winners
```

---

## Step 1: Download Current Thumbnails

```bash
mkdir -p output/thumbnails/ab-tests/{slug}
curl -o output/thumbnails/ab-tests/{slug}/current.jpg "https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg"
```

Always download `maxresdefault.jpg` (1280x720). View each one before writing prompts.

---

## Step 2: Analyze Current Thumbnail

For each thumbnail, document:

| Element | Current State |
|---------|--------------|
| **Person position** | Left / Center / Right, size relative to frame |
| **Background** | Dark / Light / Colored / Scene |
| **Text** | What it says, size, color, position |
| **Props/Icons** | Logos, screenshots, UI elements |
| **Overall feel** | Authority / Casual / Educational / Clickbait |

---

## Step 3: Design Variants Using Hypothesis Framework

Every variant must test ONE clear hypothesis. Pick from these categories:

### Hypothesis Categories

| Category | Variant A Direction | Variant B Direction | What You're Testing |
|----------|-------------------|-------------------|-------------------|
| **Dark vs Light** | Dark BG (#0D0D0D), bold white text | Clean white BG, bold black text | Which background drives more clicks |
| **Hook/Claim** | Result-focused headline ("$23,007") | Curiosity-focused headline ("THE SECRET") | Which emotional trigger works better |
| **Proof Point** | Add specific numbers, stats, dollar amounts | Clean/minimal without numbers | Whether social proof increases CTR |
| **Layout Shift** | Person right, text left | Person left, text right | Whether layout affects click behavior |
| **UI Integration** | Add real-looking dashboard/screenshot | Keep clean without UI elements | Whether specificity beats simplicity |
| **Simplify vs Enrich** | Clean minimal (person + text only) | Multiple visual elements (icons, badges, props) | Whether complexity helps or hurts |

### Designing Good Hypotheses

**DO:**
- Change ONE major element between the current thumbnail and each variant
- Keep recognizable elements (person position, core theme) consistent
- Make variants visually distinct from each other AND from the current
- Use specific numbers when testing proof points ("2,847 LEADS" not "LOTS OF LEADS")
- Design variants that would appeal to different viewer psychologies

**DON'T:**
- Change everything at once (can't learn what worked)
- Make variants that look too similar to each other
- Use fake UI mockups that look AI-generated
- Include text that's too small to read at mobile size
- Make the person small to fit more elements

### KEEP/CHANGE Prompt Format

Every variant uses this structured prompt format with the current thumbnail as reference:

```text
YouTube thumbnail,
KEEP EXACTLY:
1. [Element to preserve — be specific]
2. [Another element to preserve]
3. Overall 16:9 composition
CHANGE:
1. [Primary change — the hypothesis being tested]
2. [Supporting change]
3. Person fills at least half the frame, serious confident expression, looking at camera
[style keywords], high contrast, YouTube thumbnail, 16:9
```

**Rules:**
- KEEP list: 2-4 items, always include composition
- CHANGE list: 2-4 items, lead with the hypothesis
- Always specify person size ("fills at least half the frame")
- Always specify expression ("serious confident expression")
- End with style keywords for the desired look
- Be explicit about text content in CHANGE items

---

## Step 4: Generate Base Variations

Use Nano Banana 2 `/edit` endpoint with current thumbnail as reference image.

### Script Pattern

Create a batch script following `scripts/batch-ab-thumbnails.mjs` pattern:

```javascript
const VIDEOS = [
  {
    slug: "video-slug",
    videoId: "YouTubeID",
    title: "Video Title",
    variants: {
      a: {
        prompt: `YouTube thumbnail,
KEEP EXACTLY:
1. ...
CHANGE:
1. ...
high contrast, YouTube thumbnail, 16:9`,
        needsFaceSwap: true,
      },
      b: {
        prompt: `...`,
        needsFaceSwap: true,
      },
    },
  },
];
```

**Generation settings:**
- `num_images: 2` (2 options per variant to pick from)
- `aspect_ratio: "16:9"`
- `resolution: "2K"`
- `output_format: "png"`
- `safety_tolerance: 6`

### Run Phase 1

```bash
node scripts/batch-ab-thumbnails-{batch}.mjs --mode bases
```

This generates all variations in parallel and opens them in Preview.app.

---

## Step 5: User Picks Winners

Show each pair (option 1 vs option 2) to the user. For each pair:

1. Open both in Preview.app: `open file-1.png file-2.png`
2. Show both inline via Read tool for quick comparison
3. Ask: "#1 or #2?"
4. Record pick in `picks.json`

**Rejection criteria (skip and re-generate):**
- Person too small (less than 1/3 of frame)
- Smiling or excited expression
- Hand gestures (unless requested)
- Fake-looking UI mockups
- Poor contrast (text unreadable)
- Wrong year

Save picks:
```json
{
  "video-slug": { "a": 1, "b": 2 },
  "video-slug-2": { "a": 0, "b": 1 }
}
```
Use `0` to skip a variant entirely.

---

## Step 6: Face-Swap Serious Jay

**Always use:** `output/thumbnails/ab-tests/jay-serious-jay.png`

This is a custom Flux Lora generation of Jay with a serious/confident expression. Never use `jay-excited.png` or `jay-professional.png` for A/B tests — they're too smiley.

### Run Phase 2

```bash
node scripts/batch-ab-thumbnails-{batch}.mjs --mode finalize --picks output/thumbnails/ab-tests/picks-{batch}.json
```

### Face-swap prompt (used in the script):

```bash
Replace the person in the first image with the person from the second reference image.
Same pose, position, scale.

CRITICAL RULES:
1. Person MUST be in the FRONT layer — in front of all props, icons, badges, screens.
2. Person MUST be looking directly at the camera with clear eye contact.
3. Expression must be natural, serious, and confident — never smiling or exaggerated.

Keep background, text, composition identical. Natural lighting match, no artifacts.
```

---

## Step 7: Upload to YouTube Test & Compare

**There is NO API for YouTube's Test & Compare.** This must be done manually.

For each video:

1. Copy final thumbnails to Downloads:
   ```bash
   cp output/thumbnails/ab-tests/{slug}/variant-a-final.png ~/Downloads/"{Title}-Variant-A.png"
   cp output/thumbnails/ab-tests/{slug}/variant-b-final.png ~/Downloads/"{Title}-Variant-B.png"
   ```

2. Provide YouTube Studio URL: `https://studio.youtube.com/video/{videoId}/edit`

3. User uploads manually:
   - Go to URL > Thumbnail section > "Test & Compare"
   - Upload variant(s)
   - Start the test

4. Do one video at a time — show the user what they're uploading.

---

## Step 8: Monitor & Apply Winners

- Tests need **2+ weeks minimum** for statistical significance
- Higher traffic videos reach significance faster
- Check YouTube Studio > Analytics > Content tab for "Test" badge
- Apply winner permanently once YouTube declares a result
- Document which hypothesis won for future reference

---

## Batch Management

### Naming Convention

| Item | Pattern |
|------|---------|
| Script | `scripts/batch-ab-thumbnails-{batch}.mjs` |
| Picks | `output/thumbnails/ab-tests/picks-{batch}.json` |
| Directories | `output/thumbnails/ab-tests/{slug}/` |
| Finals | `output/thumbnails/ab-tests/{slug}/variant-{a|b}-final.png` |

### Prioritization

Always test highest-traffic videos first:
- **Batch 1:** Videos 1-5 by daily views
- **Batch 2:** Videos 6-15
- **Batch 3:** Videos 16-25
- Wait for Batch 1 results before starting Batch 3

### Cost Per Batch

| Item | Per Video | 10 Videos |
|------|-----------|-----------|
| Base variations (4 images) | ~$0.28 | ~$2.80 |
| Face-swaps (2 finals) | ~$0.30 | ~$3.00 |
| **Total** | **~$0.58** | **~$5.80** |

---

## Handoff for Remote Machines

When thumbnails need to move between machines (e.g., MacBook to Mac Studio):

1. Copy finals to `Nextcloud/Thumbnails/ab-tests-{batch}/` with clear naming:
   ```css
   {slug}_a.png
   {slug}_b.png
   jay-serious-reference.png
   ```

2. Copy scripts to `Nextcloud/HANDOFF/`

3. Create handoff doc at `Nextcloud/HANDOFF/thumbnail-ab-tests-handoff.md` with:
   - Video table (ID, title, views, variant descriptions)
   - YouTube Studio URLs for each video
   - Known issues / TODO items
   - Cost summary

---

## Existing Assets

| Asset | Location |
|-------|----------|
| Serious Jay photo | `output/thumbnails/ab-tests/jay-serious-jay.png` |
| Batch 1 script | `scripts/batch-ab-thumbnails.mjs` |
| Batch 2 script | `scripts/batch-ab-thumbnails-b2.mjs` |
| Video inventory | `docs/youtube-descriptions/video-inventory.json` |
| Batch 1 picks | `output/thumbnails/ab-tests/picks.json` |
| Batch 2 picks | `output/thumbnails/ab-tests/picks-b2.json` |

---

## Quality Checklist (Before Upload)

- [ ] Person fills at least 1/3 of frame (ideally half)
- [ ] Serious/confident expression (not smiling)
- [ ] No hand gestures (unless requested)
- [ ] Text readable at mobile thumbnail size
- [ ] High contrast between text and background
- [ ] Current year if year is shown
- [ ] UI mockups look real (not AI-generated)
- [ ] Each variant tests a clear, distinct hypothesis
- [ ] Variants are visually different from each other AND from current
- [ ] Face-swap looks natural (no artifacts, matching lighting)
