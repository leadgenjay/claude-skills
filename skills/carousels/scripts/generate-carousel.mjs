#!/usr/bin/env node
// generate-carousel.mjs — generate an Instagram carousel from a slides.json plan.
//
// Claude writes the plan (per the prompt templates in SKILL.md), this script
// executes it: GPT-Image-2 only, 4:5 aspect, Sharp-upscaled finals at
// 1080x1350 so the quality gate passes.
//
// Plan file shape (slides.json):
//   {
//     "outDir": "carousel-output/my-topic",          // relative to CWD or absolute
//     "slides": [
//       {
//         "num": 1,
//         "filename": "slide-01.png",
//         "ref": "PHOTO_COVER" | "PHOTO_CTA" | "PREV" | "NONE" | "<path-or-url>",
//         "prompt": "full GPT-Image-2 prompt for this slide"
//       }, ...
//     ]
//   }
//
// ref values:
//   PHOTO_COVER / PHOTO_CTA — the client reference photos from config
//     (config.photos.cover / config.photos.cta). Pass the FULL photo as the
//     sole reference: GPT-Image-2 Edit preserves the person's identity.
//   PREV — the previous generated slide (visual-consistency chain). On a
//     single-slide rerun it falls back to a neighboring slide on disk.
//   NONE — text-to-image, no reference.
//   <path-or-url> — a local screenshot path (uploaded to fal storage) or an
//     existing https URL.
//
// Usage:
//   node scripts/generate-carousel.mjs --plan slides.json          # full run
//   node scripts/generate-carousel.mjs --plan slides.json 4 7      # only slides 4 and 7
//
// Requires FAL_KEY (env or config/.env) and config/config.json (setup interview).

import { existsSync } from "node:fs";
import { readFile, mkdir, readdir, unlink } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import {
  loadConfig,
  CONFIG_DIR,
  editImageWithRetry,
  uploadFileToFalStorage,
  saveResized,
} from "./lib/fal.mjs";

const TARGET_W = 1080;
const TARGET_H = 1350; // true IG 4:5

function usageFail(msg) {
  console.error(`generate-carousel: ${msg}`);
  console.error("usage: node scripts/generate-carousel.mjs --plan <slides.json> [slideNum ...]");
  process.exit(1);
}

const argv = process.argv.slice(2);
const planIdx = argv.indexOf("--plan");
if (planIdx < 0 || !argv[planIdx + 1]) usageFail("missing --plan <slides.json>");
const planPath = resolve(argv[planIdx + 1]);
if (!existsSync(planPath)) usageFail(`plan not found: ${planPath}`);

const onlySlides = argv.filter((a) => /^\d+$/.test(a)).map(Number);

const config = loadConfig();
if (!config) {
  usageFail(
    `config/config.json not found — run the setup interview first (SKILL.md Step 1). Expected at: ${CONFIG_DIR}/config.json`,
  );
}

const plan = JSON.parse(await readFile(planPath, "utf8"));
if (!Array.isArray(plan.slides) || plan.slides.length === 0) usageFail("plan.slides is empty");
const OUT = isAbsolute(plan.outDir || "") ? plan.outDir : resolve(process.cwd(), plan.outDir || "carousel-output");

function photoPath(kind) {
  const p = config.photos?.[kind];
  if (!p) return null;
  return isAbsolute(p) ? p : resolve(CONFIG_DIR, p);
}

// Cache of uploaded reference URLs (photos + local screenshots)
const uploadCache = new Map();
async function uploadOnce(path) {
  if (!uploadCache.has(path)) {
    uploadCache.set(path, await uploadFileToFalStorage(path));
  }
  return uploadCache.get(path);
}

async function resolveRef(slide, previousSlideUrl) {
  const ref = slide.ref || "NONE";
  if (ref === "NONE") return [];
  if (ref === "PHOTO_COVER" || ref === "PHOTO_CTA") {
    const kind = ref === "PHOTO_COVER" ? "cover" : "cta";
    const p = photoPath(kind);
    if (!p || !existsSync(p)) {
      throw new Error(
        `Slide ${slide.num} needs the ${kind} reference photo but config.photos.${kind} is missing. Re-run the setup interview.`,
      );
    }
    return [await uploadOnce(p)];
  }
  if (ref === "PREV") {
    if (previousSlideUrl) return [previousSlideUrl];
    // Single-slide rerun: use a neighboring slide from disk as the style ref.
    const candidates = [
      resolve(OUT, `slide-${String(slide.num - 1).padStart(2, "0")}.png`),
      resolve(OUT, "slide-01.png"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return [await uploadOnce(p)];
    }
    return [];
  }
  if (/^https?:\/\//.test(ref)) return [ref];
  const local = isAbsolute(ref) ? ref : resolve(process.cwd(), ref);
  if (!existsSync(local)) throw new Error(`Slide ${slide.num} ref not found: ${local}`);
  return [await uploadOnce(local)];
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const slides =
    onlySlides.length > 0 ? plan.slides.filter((s) => onlySlides.includes(s.num)) : plan.slides;
  if (slides.length === 0) usageFail(`no slides match ${onlySlides.join(",")}`);

  // Cleanup old slide files only on a full run (stale slides from a longer
  // previous run would otherwise pollute the gate).
  if (onlySlides.length === 0) {
    const olds = (await readdir(OUT)).filter((f) => /^slide-\d+.*\.png$/.test(f));
    for (const f of olds) await unlink(resolve(OUT, f));
    if (olds.length) console.log(`  cleaned ${olds.length} old slide file(s)`);
  }

  console.log(`\nCarousel: ${slides.length} slide(s), 4:5 -> ${TARGET_W}x${TARGET_H}\nOutput: ${OUT}\n`);

  let previousSlideUrl = null;
  for (const slide of slides) {
    const outPath = resolve(OUT, slide.filename || `slide-${String(slide.num).padStart(2, "0")}.png`);
    const imageUrls = await resolveRef(slide, previousSlideUrl);
    console.log(`  slide ${String(slide.num).padStart(2, "0")} (ref=${slide.ref || "NONE"})`);
    const results = await editImageWithRetry({
      image_urls: imageUrls,
      prompt: slide.prompt,
      num_images: 2,
      aspect_ratio: "4:5",
    });
    const bytes = await saveResized(results[0].url, outPath, { width: TARGET_W, height: TARGET_H });
    console.log(
      `    saved ${outPath.split("/").pop()} (${Math.round(bytes / 1024)}KB)${bytes < 200000 ? " WARN small — likely missing visual content" : ""}`,
    );
    // Keep the alternate take OUT of the gated dir (the gate globs all PNGs).
    if (results.length > 1) {
      const altDir = resolve(OUT, "alts");
      await mkdir(altDir, { recursive: true });
      await saveResized(results[1].url, resolve(altDir, outPath.split("/").pop().replace(".png", "-v2.png")), {
        width: TARGET_W,
        height: TARGET_H,
      });
    }
    previousSlideUrl = results[0].url;
  }

  console.log("\nDone. Next: run the quality gate, then render the preview (SKILL.md Step 7.5).");
}

main().catch((err) => {
  console.error("\nFAILED:", err?.message ?? err);
  process.exit(1);
});
