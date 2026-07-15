#!/usr/bin/env node

/**
 * YouTube Thumbnail Generator — 4-Step Pipeline
 *
 * Interactive pipeline:
 *   1. Generate base thumbnail with Nano Banana 2 (generic man, 4 variations)
 *   2. Pick the best base (interactive pause)
 *   3. Generate matching Jay photo with Flux Lora
 *   4. Face-swap Jay onto the chosen base
 *
 * Commands:
 *   node scripts/generate-thumbnail.mjs full --prompt "..." --jay-preset excited --name my-thumb
 *   node scripts/generate-thumbnail.mjs generate-base --prompt "..." --name my-thumb
 *   node scripts/generate-thumbnail.mjs generate-jay --preset excited --name my-thumb
 *   node scripts/generate-thumbnail.mjs generate-jay --prompt "jay, custom prompt..." --name my-thumb
 *   node scripts/generate-thumbnail.mjs face-swap --base path/to/base.png --jay path/to/jay.png --name my-thumb
 *
 * Environment: FAL_KEY must be set
 *   export $(grep FAL_KEY .env.local | xargs)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = process.env.YT_THUMBNAIL_WORK_DIR
  ? resolve(process.env.YT_THUMBNAIL_WORK_DIR)
  : process.cwd();
const outputDir = resolve(PROJECT_ROOT, "output", "thumbnails");

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("FAL_KEY environment variable not set");
  console.error("Run: export $(grep FAL_KEY .env.local | xargs)");
  process.exit(1);
}

// ─── Endpoints ──────────────────────────────────────────────────

// Default model: GPT-Image-2 (since 2026-04-26). NB2 endpoints retained as
// `*_LEGACY` constants for fallback when GPT-Image-2 returns content_policy_violation.
const GPT_IMAGE_2_ENDPOINT = "https://queue.fal.run/openai/gpt-image-2";
const GPT_IMAGE_2_STATUS_BASE = "https://queue.fal.run/openai/gpt-image-2/requests";
const NANO_BANANA_ENDPOINT_LEGACY = "https://queue.fal.run/fal-ai/nano-banana-2";
const NANO_BANANA_STATUS_BASE_LEGACY = "https://queue.fal.run/fal-ai/nano-banana-2/requests";
// Aliases for back-compat with code below; default path now hits GPT-Image-2.
const NANO_BANANA_ENDPOINT = GPT_IMAGE_2_ENDPOINT;
const NANO_BANANA_STATUS_BASE = GPT_IMAGE_2_STATUS_BASE;
const FLUX_LORA_ENDPOINT = "https://queue.fal.run/fal-ai/flux-lora";
const FAL_STORAGE_URL = "https://rest.alpha.fal.ai/storage/upload/initiate";

const LORA_URL = "https://v3.fal.media/files/tiger/Cubmr1zZLBb2fzlGo6Yao_pytorch_lora_weights.safetensors";
const TRIGGER = "jay";

// ─── Jay Presets ────────────────────────────────────────────────

const JAY_PRESETS = {
  headshot: `${TRIGGER}, full body photo standing, looking directly at camera, confident natural smile, arms crossed, clean minimal white background, bright studio lighting, sharp focus, high quality photography, full body visible head to waist`,
  professional: `${TRIGGER}, full body photo standing confidently, looking directly at camera, wearing button-down shirt, clean white background, natural expression, bright studio lighting, corporate photography style, sharp detail, full body visible head to waist`,
  cinematic: `${TRIGGER}, full body photo standing, looking directly at camera, dramatic rim lighting, dark moody background, confident determined expression, shallow depth of field, film quality, full body visible head to waist`,
  excited: `${TRIGGER}, full body photo standing, looking directly at camera, natural confident smile, holding phone showing results, bright natural lighting, casual professional outfit, clean white background, full body visible head to waist`,
  pointing: `${TRIGGER}, full body photo standing, pointing at camera with one hand, looking directly at camera, natural confident smile, clean white background, bright studio lighting, engaging expression, full body visible head to waist`,
  thinking: `${TRIGGER}, full body photo standing, looking directly at camera, hand on chin, calm contemplative expression, clean white background, bright studio lighting, professional look, full body visible head to waist`,
  whiteboard: `${TRIGGER}, full body photo standing next to large whiteboard with diagrams, pointing at whiteboard, looking directly at camera, modern office, bright lighting, tech startup aesthetic, natural teaching expression, full body visible head to waist`,
  confident: `${TRIGGER}, full body photo standing, looking directly at camera, slight natural smile, arms crossed, clean white background, bright studio lighting, professional casual outfit, calm confident expression, full body visible head to waist, sharp detail`,
};

// ─── Helpers ────────────────────────────────────────────────────

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
      parsed[key] = val;
      if (val !== true) i++;
    }
  }
  return parsed;
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function uploadToFalStorage(filePath) {
  const fileBuffer = readFileSync(filePath);

  const initRes = await fetch(FAL_STORAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content_type: "image/png", file_name: "upload.png" }),
  });

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`Storage initiate failed (${initRes.status}): ${text}`);
  }

  const { upload_url, file_url } = await initRes.json();

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: fileBuffer,
  });

  if (!putRes.ok) throw new Error(`Storage PUT failed (${putRes.status})`);

  return file_url;
}

async function downloadImage(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(outputPath, buffer);
  return outputPath;
}

function openInPreview(paths) {
  try {
    const quoted = (Array.isArray(paths) ? paths : [paths]).map((p) => `"${p}"`).join(" ");
    execSync(`open ${quoted}`, { stdio: "ignore" });
  } catch {
    // Non-fatal if open fails
  }
}

// ─── Step 2: Generate Base Thumbnails (GPT-Image-2) ─────────

async function generateBase(prompt, name, numImages = 4) {
  console.log("\n  Step 2: Generating base thumbnails with GPT-Image-2");
  console.log(`  Prompt: ${prompt.slice(0, 80)}...`);
  console.log(`  Variations: ${numImages}`);
  console.log(`  Cost: ~$${(0.14 * numImages).toFixed(2)} (landscape pricing)\n`);

  process.stdout.write("  Submitting to GPT-Image-2...");

  const res = await fetch(NANO_BANANA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      num_images: numImages,
      image_size: "landscape_16_9", // GPT-Image-2 has no aspect_ratio/resolution; use image_size preset
      quality: "high",              // YouTube-spec max definition (upgraded from medium 2026-05-14)
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GPT-Image-2 submit failed (${res.status}): ${text}`);
  }

  const response = await res.json();
  console.log(" submitted");

  // Handle queued response
  let images;
  if (response.images && response.images.length > 0) {
    images = response.images;
  } else if (response.request_id) {
    process.stdout.write("  Waiting for generation");
    images = await pollNanoBanana(response.request_id);
  } else {
    throw new Error(`Unexpected response: ${JSON.stringify(response)}`);
  }

  // Download all variations
  const paths = [];
  for (let i = 0; i < images.length; i++) {
    const imgUrl = images[i].url;
    const outputPath = resolve(outputDir, `${name}-base-${i + 1}.png`);
    process.stdout.write(`  Downloading variation ${i + 1}/${images.length}...`);
    await downloadImage(imgUrl, outputPath);
    console.log(" done");
    paths.push(outputPath);
  }

  return paths;
}

async function pollNanoBanana(requestId, maxAttempts = 60, intervalMs = 3000) {
  const statusUrl = `${NANO_BANANA_STATUS_BASE}/${requestId}/status`;
  const responseUrl = `${NANO_BANANA_STATUS_BASE}/${requestId}`;
  const startTime = Date.now();

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (i > 0 && i % 10 === 0) {
      process.stdout.write(`(${elapsed}s)`);
    } else {
      process.stdout.write(".");
    }

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    const statusData = await statusRes.json();

    if (statusData.status === "FAILED") {
      throw new Error(`Nano Banana 2 failed: ${JSON.stringify(statusData)}`);
    }

    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      const resultData = await resultRes.json();
      if (resultData.images && resultData.images.length > 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(` completed in ${elapsed}s`);
        return resultData.images;
      }
    }
  }
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  throw new Error(`Timeout waiting for Nano Banana 2 after ${elapsed}s`);
}

// ─── Step 3: Generate Jay Photo (Flux Lora) ─────────────────────

async function generateJay(prompt, name, index = null) {
  const suffix = index !== null ? `-jay-${index}` : "-jay";
  console.log(`\n  Step 3${index !== null ? ` (variation ${index})` : ""}: Generating Jay photo with Flux Lora`);
  console.log(`  Prompt: ${prompt.slice(0, 80)}...`);
  console.log(`  Cost: ~$0.03\n`);

  process.stdout.write("  Submitting to Flux Lora...");

  const res = await fetch(FLUX_LORA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      loras: [{ path: LORA_URL, scale: 1.0 }],
      image_size: "square_hd",
      num_images: 1,
      output_format: "png",
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Flux Lora submit failed (${res.status}): ${text}`);
  }

  const queued = await res.json();
  console.log(" submitted");

  process.stdout.write("  Waiting for generation");
  const result = await pollFluxLora(queued.request_id);
  console.log(" done");

  const outputPath = resolve(outputDir, `${name}${suffix}.png`);
  process.stdout.write("  Downloading Jay photo...");
  await downloadImage(result.images[0].url, outputPath);
  console.log(" done");

  return outputPath;
}

async function generateMultipleJay(presets, name) {
  console.log(`\n  Generating ${presets.length} Jay photos with different expressions...`);
  console.log(`  Presets: ${presets.map(p => p.name).join(", ")}`);
  console.log(`  Cost: ~$${(0.03 * presets.length).toFixed(2)}\n`);

  const paths = [];
  for (let i = 0; i < presets.length; i++) {
    const path = await generateJay(presets[i].prompt, name, i + 1);
    paths.push(path);
  }
  return paths;
}

async function pollFluxLora(requestId, maxAttempts = 30, intervalMs = 3000) {
  const url = `${FLUX_LORA_ENDPOINT}/requests/${requestId}`;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    process.stdout.write(".");

    const res = await fetch(url, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    const data = await res.json();
    if (data.images) return data;
    if (data.status === "FAILED") throw new Error("Flux Lora generation failed");
  }
  throw new Error("Timeout waiting for Flux Lora");
}

// ─── Step 4: Face Swap (GPT-Image-2 /edit) ────────────────────

async function faceSwap(basePath, jayPath, name, index = null, { skipUpscale = false } = {}) {
  const suffix = index !== null ? `-final-${index}` : "-final";
  console.log(`\n  Step 4${index !== null ? ` (variation ${index})` : ""}: Face-swapping Jay onto base thumbnail`);
  console.log(`  Base: ${basePath}`);
  console.log(`  Jay:  ${jayPath}`);
  console.log(`  Cost: ~$0.15\n`);

  process.stdout.write("  Uploading base thumbnail to fal.ai storage...");
  const baseUrl = await uploadToFalStorage(basePath);
  console.log(" done");

  process.stdout.write("  Uploading Jay photo to fal.ai storage...");
  const jayUrl = await uploadToFalStorage(jayPath);
  console.log(" done");

  const swapPrompt = `Replace the entire person in the first image with the person from the second reference image. The replacement person should have the same pose, position, and scale as the original person. Preserve the second reference person's real facial geometry, natural pores, skin texture, beard texture, eye shape, teeth, and identity. Do not blend the original person's facial structure into the replacement face.

CRITICAL RULES:
1. The replacement person MUST be in the FRONT layer — rendered in front of all props, icons, badges, laptops, screens, and UI elements. Never behind or occluded by any element.
2. The replacement person MUST be looking directly at the camera with clear eye contact.
3. The expression must be natural and confident — never exaggerated, cartoonish, or over-the-top.
4. The face must remain photographic and anatomically natural. No etched or topographic contour lines, wrinkle bands, waxy or plastic skin, beauty-filter smoothing, painted skin, over-sharpened pores, malformed eye highlights, beard hatching, neck banding, doubled features, or hybrid identity.
5. Do not redraw or stylize the face. Match the reference identity first, then adapt only pose, lighting, and color grade.

Keep the background, lighting, composition, text overlays, and all non-person elements exactly the same. The replacement person should look natural in the scene — match the lighting direction, color grading, and shadows to the environment. Seamless integration with no artifacts, seams, or color mismatches.`;

  process.stdout.write("  Submitting body swap via GPT-Image-2...");
  const res = await fetch("https://queue.fal.run/openai/gpt-image-2/edit", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: swapPrompt,
      image_urls: [baseUrl, jayUrl],
      num_images: 1,
      image_size: "landscape_16_9", // GPT-Image-2 has no aspect_ratio/resolution; use image_size preset
      quality: "high",              // YouTube-spec max definition (upgraded from medium 2026-05-14)
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Face swap submit failed (${res.status}): ${text}`);
  }

  const queued = await res.json();
  console.log(" submitted");

  let images;
  if (queued.images && queued.images.length > 0) {
    images = queued.images;
  } else if (queued.request_id) {
    process.stdout.write("  Waiting for body swap");
    images = await pollNanoBananaEdit(queued.request_id);
  } else {
    throw new Error(`Unexpected response: ${JSON.stringify(queued)}`);
  }

  const imageUrl = images[0].url;
  const nativeOutputPath = resolve(outputDir, `${name}${suffix}-native.png`);
  const outputPath = resolve(outputDir, `${name}${suffix}.png`);
  process.stdout.write("  Downloading native body-swap result...");
  await downloadImage(imageUrl, nativeOutputPath);
  console.log(" done");
  console.log(`  Native body-swap saved for face QA: ${nativeOutputPath}`);

  if (skipUpscale) {
    console.log("  Skipping upscale. Inspect the native face at 100% before continuing.");
    return nativeOutputPath;
  }

  console.log("  Chaining Recraft Crisp Upscale → 1920x1080 (YouTube spec)...");
  execSync(
    `node "${resolve(SKILL_ROOT, "scripts/upscale-recraft.mjs")}" "${nativeOutputPath}" --out "${outputPath}" --target 1920x1080`,
    { stdio: "inherit", env: process.env },
  );

  return outputPath;
}

async function pollNanoBananaEdit(requestId, maxAttempts = 60, intervalMs = 3000) {
  // Default poll path: GPT-Image-2 (since 2026-04-26). Function name retained for back-compat.
  const statusUrl = `${GPT_IMAGE_2_STATUS_BASE}/${requestId}/status`;
  const responseUrl = `${GPT_IMAGE_2_STATUS_BASE}/${requestId}`;
  const startTime = Date.now();

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const elapsed2 = Math.round((Date.now() - startTime) / 1000);
    if (i > 0 && i % 10 === 0) {
      process.stdout.write(`(${elapsed2}s)`);
    } else {
      process.stdout.write(".");
    }

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    const statusData = await statusRes.json();

    if (statusData.status === "FAILED") {
      throw new Error(`Face swap failed: ${JSON.stringify(statusData)}`);
    }

    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      const resultData = await resultRes.json();
      if (resultData.images && resultData.images.length > 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(` completed in ${elapsed}s`);
        return resultData.images;
      }
    }
  }
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  throw new Error(`Timeout waiting for body swap after ${elapsed}s`);
}

// ─── Step 5: Headline Text Overlay ──────────────────────────────

function suggestHeadlines(videoTitle) {
  // Generate headline options from the video title/prompt
  // Keep to 1-3 words, bold, high contrast
  const words = videoTitle.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  const suggestions = [];

  // Try to extract key power words
  const moneyWords = words.filter(w => /^\$|k$|money|revenue|income|profit/i.test(w));
  const numberWords = words.filter(w => /^\d|k$/i.test(w));
  const actionWords = words.filter(w => /build|built|make|create|launch|start/i.test(w));

  // Generate 4 options
  if (moneyWords.length > 0) {
    suggestions.push(moneyWords.slice(0, 2).join(" ").toUpperCase());
  }
  if (numberWords.length > 0 && actionWords.length > 0) {
    suggestions.push(`${actionWords[0]} ${numberWords[0]}`.toUpperCase());
  }

  return suggestions;
}

async function addHeadlineText(imagePath, headline, name, position = "left", accentColor = "#ED0D51") {
  console.log("\n  Step 5: Adding headline text overlay");
  console.log(`  Headline: "${headline}"`);
  console.log(`  Position: ${position}`);

  const sharp = (await import("sharp")).default;
  const img = sharp(imagePath);
  const metadata = await img.metadata();
  const { width, height } = metadata;

  // Detect background brightness in the text region
  const textRegionLeft = position === "right" ? Math.round(width * 0.55) : 0;
  const textRegionWidth = Math.round(width * 0.45);
  const regionStats = await sharp(imagePath)
    .extract({ left: textRegionLeft, top: 0, width: textRegionWidth, height: Math.round(height * 0.5) })
    .stats();
  const avgBrightness = regionStats.channels.reduce((sum, c) => sum + c.mean, 0) / 3;
  const isDark = avgBrightness < 128;

  console.log(`  Background: ${isDark ? "dark" : "light"} (brightness: ${Math.round(avgBrightness)})`);

  // Text styling
  const fontSize = Math.round(height * 0.12);
  const strokeWidth = Math.round(fontSize * 0.04);
  const lineHeight = fontSize * 1.2;
  const padding = Math.round(width * 0.04);
  const highlightPadX = Math.round(fontSize * 0.25);
  const highlightPadY = Math.round(fontSize * 0.1);

  // Word wrap: max 2 lines
  const words = headline.split(" ");
  let lines = [];
  if (words.length <= 2) {
    lines = [headline];
  } else {
    const mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }

  // Position
  const x = position === "right" ? width - padding : padding;
  const y = height * 0.15;
  const anchor = position === "right" ? "end" : "start";

  // Colors based on background brightness
  const textColor = isDark ? "#FFFFFF" : "#1A1A1A";
  const strokeColor = isDark ? "#000000" : "#FFFFFF";

  // For dark backgrounds: add accent color highlight bar behind the last line (key word)
  // For light backgrounds: just use dark text with light stroke
  let highlightRects = "";
  if (isDark && lines.length > 0) {
    // Highlight the last line (usually the key word/number)
    const lastIdx = lines.length - 1;
    const lastLine = lines[lastIdx];
    // Per-character width estimation for Impact/Arial Black
    const narrowChars = "$!/|[]().,;: ";
    const wideChars = "MWQO@%";
    let textWidth = 0;
    for (const ch of lastLine) {
      if (narrowChars.includes(ch)) textWidth += fontSize * 0.35;
      else if (wideChars.includes(ch)) textWidth += fontSize * 0.7;
      else textWidth += fontSize * 0.52;
    }
    const rectY = y + (lastIdx * lineHeight) + fontSize * 0.05;
    const rectX = position === "right" ? x - textWidth - highlightPadX : x - highlightPadX;
    const rectW = textWidth + highlightPadX * 2;
    const rectH = fontSize + highlightPadY * 2;

    highlightRects = `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="4" fill="${accentColor}" />`;
  }

  // Build SVG text overlay
  const textSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .headline {
        font-family: 'Arial Black', 'Impact', 'Helvetica Neue', sans-serif;
        font-weight: 900;
        font-size: ${fontSize}px;
        fill: ${textColor};
        stroke: ${strokeColor};
        stroke-width: ${strokeWidth}px;
        paint-order: stroke fill;
        text-anchor: ${anchor};
      }
      .headline-highlight {
        font-family: 'Arial Black', 'Impact', 'Helvetica Neue', sans-serif;
        font-weight: 900;
        font-size: ${fontSize}px;
        fill: #FFFFFF;
        text-anchor: ${anchor};
      }
    </style>
    ${highlightRects}
    ${lines.map((line, i) => {
      const isHighlighted = isDark && i === lines.length - 1;
      const cls = isHighlighted ? "headline-highlight" : "headline";
      return `<text x="${x}" y="${y + (i * lineHeight) + fontSize}" class="${cls}">${escapeXml(line)}</text>`;
    }).join("\n    ")}
  </svg>`;

  const outputPath = resolve(outputDir, `${name}-headline.png`);
  await sharp(imagePath)
    .composite([{ input: Buffer.from(textSvg), top: 0, left: 0 }])
    .toFile(outputPath);

  console.log(`  Saved: ${outputPath}`);
  return outputPath;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Commands ───────────────────────────────────────────────────

async function cmdGenerateBase(args) {
  const prompt = args.prompt;
  const name = args.name || `thumb-${Date.now()}`;
  const count = parseInt(args.count || "4", 10);

  if (!prompt) {
    console.error("--prompt is required for generate-base");
    process.exit(1);
  }

  const paths = await generateBase(prompt, name, count);
  console.log(`\n  Base thumbnails saved:`);
  paths.forEach((p, i) => console.log(`    ${i + 1}. ${p}`));
  openInPreview(paths);
}

async function cmdGenerateJay(args) {
  const name = args.name || `thumb-${Date.now()}`;
  let prompt;

  if (args.prompt) {
    prompt = args.prompt;
  } else if (args.preset && JAY_PRESETS[args.preset]) {
    prompt = JAY_PRESETS[args.preset];
  } else {
    console.error("--preset or --prompt is required for generate-jay");
    console.error(`Available presets: ${Object.keys(JAY_PRESETS).join(", ")}`);
    process.exit(1);
  }

  const path = await generateJay(prompt, name);
  console.log(`\n  Jay photo saved: ${path}`);
  openInPreview(path);
}

async function cmdFaceSwap(args) {
  const name = args.name || `thumb-${Date.now()}`;
  const basePath = args.base;
  const jayPath = args.jay;

  if (!basePath || !jayPath) {
    console.error("--base and --jay are required for face-swap");
    process.exit(1);
  }

  if (!existsSync(basePath)) {
    console.error(`Base file not found: ${basePath}`);
    process.exit(1);
  }
  if (!existsSync(jayPath)) {
    console.error(`Jay file not found: ${jayPath}`);
    process.exit(1);
  }

  const upscale = args.upscale === true;
  const path = await faceSwap(basePath, jayPath, name, null, { skipUpscale: !upscale });
  console.log(`\n  ${upscale ? "Final thumbnail" : "Native body-swap for face QA"} saved: ${path}`);
  openInPreview(path);
}

async function cmdAddText(args) {
  const name = args.name || `thumb-${Date.now()}`;
  const imagePath = args.image;
  const headline = args.headline;
  const position = args.position || "left";

  if (!imagePath || !headline) {
    console.error("--image and --headline are required for add-text");
    console.error('Example: node scripts/generate-thumbnail.mjs add-text --image path/to/thumb.png --headline "$50K/MONTH" --position left --name zeus');
    process.exit(1);
  }

  if (!existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }

  const path = await addHeadlineText(imagePath, headline, name, position);
  console.log(`\n  Thumbnail with headline saved: ${path}`);
  openInPreview(path);
}

async function cmdFull(args) {
  const prompt = args.prompt;
  const name = args.name || `thumb-${Date.now()}`;
  const jayPreset = args["jay-preset"] || "excited";

  if (!prompt) {
    console.error("--prompt is required for full pipeline");
    process.exit(1);
  }

  // Pick 4 Jay expression presets
  const expressionSets = {
    excited: [
      { name: "excited", prompt: JAY_PRESETS.excited },
      { name: "confident", prompt: JAY_PRESETS.confident },
      { name: "pointing", prompt: JAY_PRESETS.pointing },
      { name: "cinematic", prompt: JAY_PRESETS.cinematic },
    ],
    professional: [
      { name: "professional", prompt: JAY_PRESETS.professional },
      { name: "headshot", prompt: JAY_PRESETS.headshot },
      { name: "thinking", prompt: JAY_PRESETS.thinking },
      { name: "cinematic", prompt: JAY_PRESETS.cinematic },
    ],
    confident: [
      { name: "confident", prompt: JAY_PRESETS.confident },
      { name: "excited", prompt: JAY_PRESETS.excited },
      { name: "pointing", prompt: JAY_PRESETS.pointing },
      { name: "professional", prompt: JAY_PRESETS.professional },
    ],
  };
  const jayExpressions = expressionSets[jayPreset] || expressionSets.excited;

  console.log("=== YouTube Thumbnail Generator — Full Pipeline ===");
  console.log(`  Name: ${name}`);
  console.log(`  Jay expressions: ${jayExpressions.map(e => e.name).join(", ")}`);
  console.log(`  Estimated cost: ~$0.76`);
  console.log(`    Base thumbnails (4x Nano Banana 2): ~$0.32`);
  console.log(`    Jay photos (4x Flux Lora): ~$0.12`);
  console.log(`    Face swaps (4x Nano Banana 2 edit): ~$0.32`);

  // Step 2: Generate base thumbnails
  const basePaths = await generateBase(prompt, name, 4);
  console.log(`\n  Base thumbnails generated:`);
  basePaths.forEach((p, i) => console.log(`    ${i + 1}. ${p}`));

  // PAUSE: Open in Preview and ask user to pick
  openInPreview(basePaths);
  console.log("");
  const choice = await ask("  Which base do you want to use? (1-4, or 'r' to regenerate): ");

  if (choice.toLowerCase() === "r") {
    console.log("  Regenerating... Run the command again with the same or modified prompt.");
    process.exit(0);
  }

  const choiceNum = parseInt(choice, 10);
  if (choiceNum < 1 || choiceNum > basePaths.length) {
    console.error(`  Invalid choice: ${choice}. Must be 1-${basePaths.length}`);
    process.exit(1);
  }

  const chosenBase = basePaths[choiceNum - 1];
  console.log(`  Selected: ${chosenBase}`);

  // Step 3: Generate 4 Jay photos with different expressions
  const jayPaths = await generateMultipleJay(jayExpressions, name);
  console.log(`\n  Jay photos generated:`);
  jayPaths.forEach((p, i) => console.log(`    ${i + 1}. (${jayExpressions[i].name}) ${p}`));

  // PAUSE: Review Jay photos
  openInPreview(jayPaths);
  console.log("");
  await ask("  Review Jay photos above. Press Enter to proceed with all 4 face-swaps...");

  // Step 4: Face-swap each Jay photo onto the chosen base
  console.log("\n  Running 4 face-swaps...");
  const finalPaths = [];
  for (let i = 0; i < jayPaths.length; i++) {
    const path = await faceSwap(chosenBase, jayPaths[i], name, i + 1, { skipUpscale: true });
    finalPaths.push(path);
  }

  console.log("\n  Face-swap results:");
  finalPaths.forEach((p, i) => console.log(`    ${i + 1}. (${jayExpressions[i].name}) ${p}`));

  // PAUSE: Pick best face-swap
  openInPreview(finalPaths);
  console.log("");
  const swapChoice = await ask("  Inspect each face and neck at 100% native pixels. Which clean face-swap looks best? (1-4): ");
  const swapNum = parseInt(swapChoice, 10);
  if (swapNum < 1 || swapNum > finalPaths.length) {
    console.error(`  Invalid choice. Using #1.`);
  }
  const chosenNative = finalPaths[Math.max(0, Math.min((swapNum || 1) - 1, finalPaths.length - 1))];
  console.log(`  Selected native swap: ${chosenNative}`);

  const chosenFinal = resolve(outputDir, `${name}-selected-final.png`);
  console.log("  Upscaling the approved native swap to 1920x1080...");
  execSync(
    `node "${resolve(SKILL_ROOT, "scripts/upscale-recraft.mjs")}" "${chosenNative}" --out "${chosenFinal}" --target 1920x1080`,
    { stdio: "inherit", env: process.env },
  );

  // Step 5: Headline text overlay
  const videoTitle = args.title || prompt;
  console.log("\n  Step 5: Headline Text Overlay");
  console.log("  Suggested headlines (1-3 words, bold, high contrast):");
  const defaultHeadlines = [
    "$50K/MONTH",
    "I BUILT THIS",
    "MY $8.5K SERVER",
    "SUPERCOMPUTER",
  ];

  // Use video title to generate contextual suggestions
  const autoSuggestions = suggestHeadlines(videoTitle);
  const allSuggestions = [...new Set([...autoSuggestions, ...defaultHeadlines])].slice(0, 5);
  allSuggestions.forEach((h, i) => console.log(`    ${i + 1}. ${h}`));
  console.log(`    Or type your own headline`);
  console.log("");

  const headlineChoice = await ask("  Pick a headline (number or custom text): ");
  let headline;
  const hNum = parseInt(headlineChoice, 10);
  if (hNum >= 1 && hNum <= allSuggestions.length) {
    headline = allSuggestions[hNum - 1];
  } else {
    headline = headlineChoice.toUpperCase();
  }
  console.log(`  Using: "${headline}"`);

  const posChoice = await ask("  Text position? (left/right, default: left): ");
  const position = posChoice.toLowerCase() === "right" ? "right" : "left";

  const headlinePath = await addHeadlineText(chosenFinal, headline, name, position);

  console.log("\n=== DONE ===");
  console.log(`  Final thumbnail: ${headlinePath}`);
  console.log(`\n  Total cost: ~$0.76`);
  console.log("");
  console.log("  Next steps:");
  console.log("  1. Verify readability at 320px width (mobile)");
  console.log("  2. Export final at 1280x720px if needed");

  openInPreview(headlinePath);
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  switch (command) {
    case "full":
      await cmdFull(args);
      break;
    case "generate-base":
      await cmdGenerateBase(args);
      break;
    case "generate-jay":
      await cmdGenerateJay(args);
      break;
    case "face-swap":
      await cmdFaceSwap(args);
      break;
    case "add-text":
      await cmdAddText(args);
      break;
    default:
      console.log("YouTube Thumbnail Generator — 4-Step Pipeline");
      console.log("");
      console.log("Commands:");
      console.log("  full           Run the full interactive pipeline (all 5 steps)");
      console.log("  generate-base  Generate base thumbnails with Nano Banana 2 (text-to-image)");
      console.log("  generate-jay   Generate a Jay photo with Flux Lora");
      console.log("  face-swap      Face-swap Jay and stop at native resolution for mandatory face QA");
      console.log("  add-text       Add headline text overlay to a thumbnail");
      console.log("");
      console.log("Full pipeline:");
      console.log('  node scripts/generate-thumbnail.mjs full --prompt "A young man..." --title "I Built a $8,500 Supercomputer" --jay-preset excited --name my-thumb');
      console.log("");
      console.log("Individual steps:");
      console.log('  node scripts/generate-thumbnail.mjs generate-base --prompt "A young man..." --name my-thumb');
      console.log("  node scripts/generate-thumbnail.mjs generate-jay --preset excited --name my-thumb");
      console.log("  node scripts/generate-thumbnail.mjs face-swap --base path/base.png --jay path/jay.png --name my-thumb");
      console.log("  Add --upscale only when intentionally bypassing the separate native face gate");
      console.log('  node scripts/generate-thumbnail.mjs add-text --image path/thumb.png --headline "$50K/MONTH" --position left --name my-thumb');
      console.log("");
      console.log(`Jay presets: ${Object.keys(JAY_PRESETS).join(", ")}`);
      process.exit(0);
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
