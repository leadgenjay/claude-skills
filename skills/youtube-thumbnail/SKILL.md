---
name: youtube-thumbnail
version: 3.2.0
description: "Generate YouTube thumbnails using a 6-step fal.ai GPT-Image-2 pipeline with mandatory native and post-upscale face-crop QA. Use when the user wants to create, body-swap, remix, or generate YouTube thumbnail variations."
---

## Step 0 - Prerequisites

Before any other operation, verify these are present. If anything is missing, stop and tell the user where to get it. Do not continue with a broken or partial installation.

| Requirement | Check | Where to get it |
|---|---|---|
| Installed skill directory | Run the resolver below | Install `youtube-thumbnail` from the Lead Gen Jay skills marketplace, or set `YT_THUMBNAIL_SKILL_DIR` to its installed directory |
| Node.js 20+ | `node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)'` | [nodejs.org](https://nodejs.org/) |
| Bundled Node dependencies | `cd "$YT_THUMBNAIL_SKILL_DIR" && node -e 'import("sharp")'` | Reinstall the skill, or run `npm ci` inside the installed skill directory |
| fal.ai API key | `test -n "$FAL_KEY"` | Create a key at [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) and export it as `FAL_KEY` |
| Network access | Resolver below must report a non-`000` status for each fal.ai host | Allow HTTPS access to `queue.fal.run`, `rest.alpha.fal.ai`, and `v3.fal.media` |

Resolve the installed skill directory once and reuse it in every command:
```bash
if [ -z "${YT_THUMBNAIL_SKILL_DIR:-}" ]; then
  for candidate in \
    "$HOME/.agents/skills/youtube-thumbnail" \
    "$HOME/.codex/skills/youtube-thumbnail" \
    "$HOME/.Codex/skills/youtube-thumbnail" \
    "$HOME/.claude/skills/youtube-thumbnail"; do
    if [ -f "$candidate/SKILL.md" ]; then export YT_THUMBNAIL_SKILL_DIR="$candidate"; break; fi
  done
fi
test -f "$YT_THUMBNAIL_SKILL_DIR/SKILL.md" || { echo "youtube-thumbnail skill directory not found"; exit 1; }
for url in https://queue.fal.run/ https://rest.alpha.fal.ai/storage/upload/initiate https://v3.fal.media/; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "$url")"
  [ "$status" != "000" ] || { echo "Cannot reach $url"; exit 1; }
done
```

If anything is missing, STOP. Do not generate placeholder scripts or silently skip face-quality gates.

# YouTube Thumbnail — Lead Gen Jay

You are an expert YouTube thumbnail creator for **Lead Gen Jay**. You run a 6-step pipeline: source thumbnails in, remixed + body-swapped + auto-critiqued thumbnails out. All remix generation uses the **fal.ai GPT-Image-2 Edit API** (`openai/gpt-image-2/edit`).

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
- **Always use real logo files supplied by the user or found in their configured asset directory** — never AI-generated logos
- **Never change logo colors** — logos must appear with exact original colors regardless of thumbnail background/scheme
- **Subtle glow** around logos is OK for emphasis — but keep it soft, not a bright halo
- Optional operator asset directory: `JAY_THUMBNAIL_ASSET_DIR`. If it is unset or the requested logo is absent, ask the user for the real logo file. Never invent an author-machine path.

### Composition
- Person on right third, text on left
- 16:9 aspect ratio, 2K resolution
- Max 3 focal points, 1/3 of frame clear for text
- Clean, simple backgrounds — no complex scenes
- **Jay must fill at least 1/3 of the thumbnail, ideally half** — never small or in the corner
- **Serious/confident expression** — not smiley. Use the custom serious Jay photo when available

---

## Runtime Setup

Before any generation step:

1. **Load FAL_KEY if the current project keeps it in `.env.local`**:
```bash
if [ -z "$FAL_KEY" ] && [ -f .env.local ]; then set -a; source .env.local; set +a; fi
test -n "$FAL_KEY" || { echo "FAL_KEY is required"; exit 1; }
```

2. **Output directory**: All generated files go to `output/thumbnails/`

3. **Final delivery**: 1920×1080 PNG (YouTube-spec, max-quality, GPT-Image-2 `quality:"high"`) to `output/thumbnails/` and Downloads. The face-swap command always stops at `*-final-native.png` and creates a native face crop. Upscale only an approved native file. Never resize the final in place. An operator may additionally copy to a configured cloud-synced asset directory.

**Bundled upscale CLI:** `$YT_THUMBNAIL_SKILL_DIR/scripts/upscale-recraft.mjs <input> --out <output> --target WxH [--mode recraft|sharp]`. Recraft adds about $0.04. Sharp is the non-generative fallback and makes no API call.

---

## The 6-Step Pipeline

### Step 1: Receive Source Thumbnails

User provides 1 or more reference thumbnails (files or URLs).

**If URLs provided:**
```bash
mkdir -p output/thumbnails/research
curl -o output/thumbnails/research/source-1.jpg "[url]"
```

**For YouTube video URLs**, extract the thumbnail:
```text
https://i.ytimg.com/vi/[videoId]/maxresdefault.jpg
```

**Create a separate analysis preview** (mandatory, never overwrite the source):
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/resize-preview.mjs" output/thumbnails/research/source-1.jpg --max 1000
```

**Analyze each source thumbnail:**
- Composition layout (person placement, text zones)
- Color palette and contrast
- What works well (to KEEP)
- What to change for Jay's brand

Present analysis to user before proceeding.

---

### Step 2: Gather Direction from User

Use `AskUserQuestion` to collect the user's creative direction for each thumbnail. This is conversational — the user may specify some, all, or none of these:

| Input | Required | Rules |
|-------|----------|-------|
| **Headline text** | Optional | 3 words max. User may keep original or specify new text |
| **Background change** | Optional | Dark (#0D0D0D) default. White/light if requested |
| **Element swaps** | Optional | Screenshots, logos, props to add/remove/replace |
| **Screenshots/assets** | Optional | Product screens, tool UIs, and user-provided reference images |
| **Output name** | Yes | kebab-case, e.g. `cold-email-setup` |

**Logo lookup:** Check the user-provided path first, then `JAY_THUMBNAIL_ASSET_DIR` if configured. If the exact logo is unavailable, ask the user to attach it. Do not substitute an AI-rendered logo.

Confirm inputs before proceeding to generation.

---

### Step 3: Remix via GPT-Image-2 Edit API

**CRITICAL: Always use the fal.ai GPT-Image-2 Edit API for remix generation.** There is no secondary model fallback in this package. If GPT-Image-2 rejects a request, revise the prompt without changing the user's intent, or report the blocker.

#### How It Works

1. Upload the source thumbnail (and any reference images like screenshots, logos) to fal.ai storage
2. Call the `openai/gpt-image-2/edit` endpoint with `image_urls` referencing the uploads
3. Poll for completion, download 4 variations

#### Prompt Structure — KEEP/CHANGE Format (Mandatory)

```text
YouTube thumbnail, [background color], 16:9 aspect ratio,
KEEP EXACTLY:
1. [person position from source, e.g., "person on right third"]
2. [text zone placement, e.g., "text zone on upper left"]
3. [overall 16:9 composition and framing]
4. [any element that works well from analysis]
CHANGE:
1. [background change, e.g., "background to solid black (#0D0D0D)"]
2. [accent color, e.g., "accent color to hot pink (#ED0D51)"]
3. [headline text change, e.g., "headline text to 'Codex Channels is INSANE'"]
4. [element swaps, e.g., "replace Telegram logo with iMessage chat from second reference"]
clean professional look, 16:9
```

#### Tested Real-World Examples

**Example 1 — Element swap + text change (white BG):**
```bash
YouTube thumbnail, white/light clean background, 16:9 aspect ratio,
KEEP EXACTLY:
1. Person on left third in thinking/contemplative pose touching chin
2. A laptop/computer screen element on center-right area
3. Overall 16:9 composition layout and framing
4. Light/white clean background style
CHANGE:
1. The headline text to say "Codex Channels" in large bold Impact-style white font with dark stroke/outline at top right, and "is INSANE" below it with "INSANE" in extra large bold text
2. The computer/laptop screen should show the OpenClaw website (from second reference image) with a large red X overlaid on top of it
3. Add a small Codex AI orange sunburst logo icon on the right side
Clean professional YouTube thumbnail look, bold typography, high contrast text
```

**Example 2 — Background swap + logo replacement (dark BG):**
```bash
YouTube thumbnail, dark black faded background, 16:9 aspect ratio,
KEEP EXACTLY:
1. Person on right third with hands together/clasped pose
2. Bold large "STEP-BY-STEP" text in upper left area in massive white Impact-style font
3. Overall 16:9 composition layout
4. The orange Zapier sunburst logo icon on the lower left
CHANGE:
1. Background to solid black/very dark faded background instead of dark office
2. Replace the blue Telegram logo circle with the iMessage chat screen from the second reference image
3. Shift any accent colors to hot pink #ED0D51
4. Keep the "+" symbol between the Zapier logo and the iMessage element
Clean professional YouTube thumbnail, bold typography, high contrast, dark moody look
```

#### Inline Script Template

Write a temporary `.mjs` file for each remix job. Here is the reusable template:

```javascript
import { readFileSync, writeFileSync } from "fs";
import { resolve, extname } from "path";
import { execSync } from "child_process";

const outputDir = resolve("output/thumbnails");
const FAL_KEY = process.env.FAL_KEY;

async function uploadToFalStorage(filePath) {
  const fileBuffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
    : ext === ".webp" ? "image/webp" : "image/png";
  const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: "upload" + ext }),
  });
  if (!initRes.ok) throw new Error("Storage init failed: " + initRes.status);
  const { upload_url, file_url } = await initRes.json();
  await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBuffer,
  });
  return file_url;
}

async function main() {
  // 1. Upload references
  console.log("Uploading source thumbnail...");
  const sourceUrl = await uploadToFalStorage("SOURCE_PATH");
  console.log("Uploading reference asset...");
  const refUrl = await uploadToFalStorage("REFERENCE_PATH");
  console.log("Uploads done");

  // 2. Build prompt
  const prompt = `KEEP/CHANGE PROMPT HERE`;

  // 3. Submit to GPT-Image-2 Edit
  console.log("Submitting remix...");
  const res = await fetch("https://queue.fal.run/openai/gpt-image-2/edit", {
    method: "POST",
    headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image_urls: [sourceUrl, refUrl],  // First = primary reference, rest = additional assets
      num_images: 4,
      image_size: "landscape_16_9",      // 16:9 thumbnail aspect; GPT-Image-2 has no aspect_ratio/resolution params
      quality: "high",                   // YouTube-spec max definition (upgraded from medium 2026-05-14)
      output_format: "png",
    }),
  });
  if (!res.ok) throw new Error("Failed: " + await res.text());
  const queued = await res.json();
  console.log("Submitted:", queued.request_id || "immediate");

  // 4. Poll for completion (status URL uses /requests/{id}/status — works for both /edit and base)
  let images;
  if (queued.images && queued.images.length > 0) {
    images = queued.images;
  } else if (queued.request_id) {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      process.stdout.write(".");
      const sRes = await fetch(
        "https://queue.fal.run/openai/gpt-image-2/requests/" + queued.request_id + "/status",
        { headers: { Authorization: "Key " + FAL_KEY } }
      );
      const s = await sRes.json();
      if (s.status === "COMPLETED") {
        const rRes = await fetch(
          "https://queue.fal.run/openai/gpt-image-2/requests/" + queued.request_id,
          { headers: { Authorization: "Key " + FAL_KEY } }
        );
        images = (await rRes.json()).images;
        break;
      }
      if (s.status === "FAILED") throw new Error("GPT-Image-2 failed: " + JSON.stringify(s));
    }
  }
  if (!images) throw new Error("No images returned");

  // 5. Download variations
  console.log("\nDownloading " + images.length + " variations...");
  for (let i = 0; i < images.length; i++) {
    const r = await fetch(images[i].url);
    writeFileSync(
      resolve(outputDir, "OUTPUT_NAME-remix-v1-" + (i + 1) + ".png"),
      Buffer.from(await r.arrayBuffer())
    );
    console.log("Saved v1-" + (i + 1));
  }
  console.log("DONE — run the preview-quality-gate + render-preview steps below to review");
}
main().catch(e => { console.error(e); process.exit(1); });
```

**To use:** Copy the template, replace `SOURCE_PATH`, `REFERENCE_PATH`, `OUTPUT_NAME`, and the prompt. Save as `output/thumbnails/_remix-[name].mjs`, run with `node output/thumbnails/_remix-[name].mjs`, then delete the temp file after.

**If only one reference image** (no additional assets), use `image_urls: [sourceUrl]` with a single upload.

**Cost:** ~$0.14 per 4 variations (quality:"high")

**Preview and pick** — NEVER resize the source PNGs (destroys YouTube-spec resolution). Copy first, then resize the copies:
```bash
for f in output/thumbnails/[name]-remix-v1-*.png; do
  cp "$f" "${f%.png}-preview.png"
  node "$YT_THUMBNAIL_SKILL_DIR/scripts/resize-preview.mjs" "$f" --out "${f%.png}-preview.png" --max 1000
done

node "$YT_THUMBNAIL_SKILL_DIR/scripts/preview-quality-gate.mjs" --dir output/thumbnails/ --type image --pattern '^\[name\]-remix-v1-.*\.png$' --min-width 1000 --min-height 500
```

Read each `-preview.png`. User picks the best remix (referenced by the source PNG name, not the preview) before proceeding — verify contrast, text readability at mobile size, composition, and dark background (#0D0D0D) applied correctly.

**Lock the non-person layers before body swap:** Finish every background-color, text, logo, screenshot, avatar, and card edit now. After Jay is body-swapped, do not send the full thumbnail through another generative image edit. A later generative edit can silently repaint the face even when the prompt says to preserve it. After body swap, only deterministic pixel compositing is allowed for non-person corrections. If a generative layout correction is unavoidable, apply it to the pre-swap remix and then run a fresh final body swap.

#### Rules
- Dark backgrounds preferred — black (#0D0D0D) is default
- High contrast is mandatory — readable at mobile thumbnail size
- White text on dark backgrounds only
- Never use complex backgrounds (no server rooms, cityscapes, busy scenes)
- If white background: headline MUST have a dark/colored bar behind it for contrast
- Logos: always include "KEEP the logo EXACTLY as-is — do not recolor, tint, or modify" in the prompt

---

### Step 4: Generate Close-Up Jay Photo

Map the thumbnail mood to a Jay preset:

| Mood | Preset |
|------|--------|
| Confident/serious | `confident` |
| Dramatic/intense | `cinematic` |
| Teaching/contemplative | `thinking` |
| CTA/engagement | `pointing` |
| Happy/energetic | `excited` |

**Generate Jay photo:**
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/generate-thumbnail.mjs" generate-jay --preset [preset] --name [output-name]
```

- **Cost:** ~$0.03
- **Output:** `output/thumbnails/[name]-jay.png`
- Quality gate: `node "$YT_THUMBNAIL_SKILL_DIR/scripts/preview-quality-gate.mjs" --dir output/thumbnails/ --type image --min-width 800 --min-height 450` — verifies photo is real PNG/JPG + dimensions. Read the extracted `[name]-jay-preview.png` to verify face-swap integrity (natural expression, proper lighting)

**Pre-generated photos are optional:** Use a user-provided Jay reference or a file in `JAY_THUMBNAIL_ASSET_DIR` when available. Otherwise generate a fresh reference with the bundled CLI.

User picks best Jay photo, or Codex auto-selects the strongest match.

---

### Step 5: Body-Swap Jay into the Remix

**Always use `generate-thumbnail.mjs face-swap`** (NOT the deprecated `face-swap-thumbnail.mjs`). Face fidelity is a hard blocker, not a polish preference.

```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/generate-thumbnail.mjs" face-swap --base output/thumbnails/[name]-remix-v1-[N].png --jay output/thumbnails/[name]-jay.png --name [output-name]
```

Or with a pre-generated photo:
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/generate-thumbnail.mjs" face-swap --base output/thumbnails/[name]-remix-v1-[N].png --jay /path/to/jay-reference.png --name [output-name]
```

- **Cost:** ~$0.30 (quality:"high")
- **Native output:** `output/thumbnails/[output-name]-final-native.png`
- **Final output after approval:** `output/thumbnails/[output-name]-final.png`

### Native Face Gate (Mandatory Before Upscaling)

Do not approve the body swap from a reduced full-thumbnail preview. Inspect a face crop at 100% native pixels and compare it side by side with the Jay reference.

Create the native crop with a normalized region that includes the full face, hairline, ears, beard, and neck. Reuse the exact same region after upscaling:
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/thumbnail-face-qa.mjs" \
  output/thumbnails/[name]-final-native.png \
  --region 0.68,0,0.32,0.65 \
  --out output/thumbnails/[name]-face-qa-native.png
```

The example region assumes Jay is on the right. Adjust it to the actual person position. Do not resize the crop before reviewing it.

Reject and regenerate if any of these are visible:
- etched, topographic, or repeated contour lines on the forehead, cheeks, nose, or neck
- waxy, plastic, painted, or beauty-filter skin with collapsed natural texture
- malformed eye highlights, doubled eyelids, glassy black eyes, or asymmetrical pupils
- beard hatching, repeated hair strokes, neck banding, doubled facial edges, or hybrid identity
- distorted teeth, lips, ears, hands, or facial proportions

Only after the native face passes, upscale it:
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/upscale-recraft.mjs" \
  output/thumbnails/[name]-final-native.png \
  --out output/thumbnails/[name]-final.png \
  --target 1920x1080
```

**Post-swap verification**: never resize the final PNG in place. Create a preview:
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/resize-preview.mjs" \
  output/thumbnails/[name]-final.png \
  --out output/thumbnails/[name]-final-preview.png --max 1000
```

Read `[name]-final-preview.png` and check:
- Jay is in the FRONT layer (not behind any element)
- Jay is looking directly at the camera
- Expression is natural, not cartoonish
- The face remains photographic at 100% crop with natural skin texture
- No contour lines, waxy smoothing, eye artifacts, beard hatching, or neck banding were introduced or amplified by upscaling

Compare the native and upscaled face crops. If the native file is clean but the final is not, reject the upscale and use a non-generative resize. If both contain the defect, regenerate the body swap with a different Jay reference or variation.

Exact non-generative fallback:
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/upscale-recraft.mjs" \
  output/thumbnails/[name]-final-native.png \
  --out output/thumbnails/[name]-final.png \
  --target 1920x1080 --mode sharp
```

Create the upscaled comparison crop with the same normalized region:
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/thumbnail-face-qa.mjs" \
  output/thumbnails/[name]-final.png \
  --region 0.68,0,0.32,0.65 \
  --out output/thumbnails/[name]-face-qa-upscaled.png
```

The dimension-only `preview-quality-gate.mjs` is not evidence of face quality. Both face crops must pass visual review before delivery.

If any critical check fails, regenerate with adjusted parameters. After **2 failed attempts** on the same issue, flag to user and ask for guidance rather than looping indefinitely.

---

### Step 6: Codex Vision Feedback Loop (2 Auto-Iterations)

This step automatically critiques and improves the thumbnail twice, then presents all versions for the user's final pick.

#### Iteration 1

**Critique the v1 final thumbnail** by reading the image and evaluating:

| Criteria | What to Check |
|----------|---------------|
| **Contrast** | Text readable at 120px height (mobile thumbnail size)? Strong text-to-background contrast? |
| **Jay Positioning** | Fills 1/3+ of frame? In front layer? Serious/confident expression? Direct eye contact? |
| **Text** | Max 3 words? High contrast? Properly placed? Readable at 320px width? |
| **Composition** | Clean layout? Max 3 focal points? 16:9 maintained? |
| **Brand** | Dark bg (#0D0D0D)? Hot pink accent (#ED0D51) used correctly? White text? |
| **Seams** | Natural face-swap? No artifacts? Matching skin tones and lighting? |

**Write a specific critique** with 2-3 actionable improvements.

**Regenerate from the pre-swap remix, never from a body-swapped final:**
- Write a new inline script targeting the specific non-person issues in the pre-swap remix
- Use the last pre-swap remix as the reference, not `v1FinalUrl`
- Finish all background, text, logo, card, and avatar corrections before a fresh body swap
- Run the native face gate again. Never allow a generative edit to repaint an approved Jay face

**Re-do face-swap on v2 remix:**
```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/generate-thumbnail.mjs" face-swap --base output/thumbnails/[name]-remix-v2.png --jay [same-jay-photo] --name [name]-v2
```

#### Iteration 2

Repeat the same critique cycle on v2:
1. Read and critique `[name]-v2-final.png`
2. Write 2-3 actionable improvements
3. Generate v3 from the v2 pre-swap remix
4. Face-swap onto v3, then repeat native and upscaled face QA

#### Final Presentation

Run the shared quality gate on all 3 finals, then open in browser mockup:

```bash
node "$YT_THUMBNAIL_SKILL_DIR/scripts/preview-quality-gate.mjs" --dir output/thumbnails/ --type image --pattern '.*-(final|v2-final|v3-final)\.png$' --min-width 1920 --min-height 1080

cat > output/thumbnails/preview.json <<'EOF'
{
  "template": "youtube-watch",
  "asset": "[name]-final.png",
  "aspectRatio": "16:9"
}
EOF

node "$YT_THUMBNAIL_SKILL_DIR/scripts/render-preview.mjs" \
  --template youtube-watch \
  --out output/thumbnails/preview-v1.html \
  --config @output/thumbnails/preview.json \
  --open
```

Repeat for v2 and v3 (write `preview-v2.html` and `preview-v3.html`). Each opens in a YouTube watch-page mockup showing the thumbnail alongside YT chrome (title, channel row, suggested videos). User compares all 3 in context and picks the winner.

**Iteration cost:** ~$0.14 (remix) + $0.30 (face-swap) = ~$0.44 per iteration
**Total feedback loop cost:** ~$0.88

---

## Delivery

After the user picks the final thumbnail:

1. **Copy to Downloads:**
```bash
cp output/thumbnails/[name]-final.png ~/Downloads/[name]-final.png
```

2. **Optionally copy to a configured cloud asset directory:**
```bash
if [ -n "$JAY_THUMBNAIL_DELIVERY_DIR" ]; then
  mkdir -p "$JAY_THUMBNAIL_DELIVERY_DIR"
  cp output/thumbnails/[name]-final.png "$JAY_THUMBNAIL_DELIVERY_DIR/[name]-final.png"
fi
```

3. **Clean up temp files** (including preview copies):
```bash
rm output/thumbnails/_remix-*.mjs 2>/dev/null
rm output/thumbnails/*-preview.png 2>/dev/null
```

---

## Total Pipeline Cost

| Step | Cost |
|------|------|
| 1. Source thumbnails | Free |
| 2. Direction gathering | Free |
| 3. Remix via GPT-Image-2 Edit, quality:"high" (4 variations) | ~$0.14 |
| 4. Jay photo generation | ~$0.03 (skip if using pre-generated) |
| 5. Body-swap via GPT-Image-2 Edit, quality:"high" + 1920×1080 upscale | ~$0.30 |
| 6. Feedback loop (2 iterations) | ~$0.88 |
| **Total per thumbnail** | **~$0.50–$1.32** |

---

## Batch Workflow

When processing multiple thumbnails in sequence:

1. Run Steps 1-2 for all thumbnails upfront (gather all source images and direction)
2. Process each thumbnail through Steps 3-5 sequentially
3. Run Step 6 (feedback loop) only if user requests it — for batch work, the user may skip auto-iteration
4. Deliver all finals at the end in one batch copy to Downloads and any operator-configured delivery directory

---

## Integration with YouTube Script Workflow

When invoked from `/youtube-script`:

1. Read the script's `thumbnailConcepts` array for creative direction
2. Use the script's recommended `jayPreset` if provided
3. User still provides source thumbnails (Step 1) — concepts inform the KEEP/CHANGE prompt
4. Save final thumbnail path back to the script context

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `youtube-script` | Full video pipeline — calls this skill for thumbnails |
| `youtube-tester` | A/B testing thumbnails on YouTube |
| `ad-creative` | Ad images with Jay (different pipeline, different aspect ratios) |

---

## Key Files

| File | Role |
|------|------|
| `scripts/generate-thumbnail.mjs` | Bundled primary CLI for base generation, Jay reference generation, and body swaps |
| `scripts/upscale-recraft.mjs` | Bundled Recraft upscale and exact-size encoder |
| `scripts/thumbnail-face-qa.mjs` | Bundled normalized face-crop tool for native and post-upscale QA |
| `scripts/resize-preview.mjs` | Bundled cross-platform, non-destructive preview resizer |
| `scripts/preview-quality-gate.mjs` | Bundled image dimension and magic-byte gate |
| `scripts/render-preview.mjs` | Bundled YouTube watch-page preview renderer |
| `output/thumbnails/` | All generated output |
| `JAY_THUMBNAIL_ASSET_DIR` | Optional user-configured directory for real Jay photos and logos |
| `JAY_THUMBNAIL_DELIVERY_DIR` | Optional user-configured cloud delivery directory |

---
