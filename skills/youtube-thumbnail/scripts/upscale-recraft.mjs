#!/usr/bin/env node
/**
 * Thumbnail upscale CLI with generative Recraft and non-generative Sharp modes.
 *
 * Usage:
 *   node scripts/upscale-recraft.mjs <input> --out <output> --target WxH [--mode recraft|sharp] [--format png|jpg] [--quality 92]
 *
 * Examples:
 *   # YouTube thumbnail (1920x1080)
 *   node scripts/upscale-recraft.mjs in.png --out final.png --target 1920x1080
 *
 *   # Vertical short cover (1080x1920)
 *   node scripts/upscale-recraft.mjs in.png --out final.png --target 1080x1920
 *
 *   # Instagram carousel slide (1080x1350)
 *   node scripts/upscale-recraft.mjs in.png --out final.png --target 1080x1350
 *
 *   # LinkedIn personal banner (1584x396), JPEG quality 92 for size cap
 *   node scripts/upscale-recraft.mjs in.png --out final.jpg --target 1584x396 --format jpg
 *
 * Default behavior:
 *   - Recraft Crisp Upscale (fal-ai/recraft-crisp-upscale) returns ~4x of source
 *   - Sharp downscale to --target using lanczos3, fit:"cover"
 *   - PNG output by default (compressionLevel 9, adaptive filtering)
 *   - Falls back to JPEG when --format jpg (quality 92 default)
 *
 * Environment: FAL_KEY is required only for the default Recraft mode.
 *
 * Cost: ~$0.04 per upscale (Recraft Crisp Upscale)
 */
import { readFileSync, writeFileSync, statSync } from "fs";
import { resolve, extname } from "path";
import sharp from "sharp";

const FAL_KEY = process.env.FAL_KEY;

const ENDPOINT = "fal-ai/recraft-crisp-upscale";

// ─── Arg parsing ───────────────────────────────────────────────
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) args[a.slice(2)] = argv[++i];
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const input = args._[0];
if (!input) {
  console.error("Usage: upscale-recraft.mjs <input> --out <output> --target WxH [--mode recraft|sharp] [--format png|jpg] [--quality 92]");
  process.exit(1);
}
const output = args.out || input;
const targetStr = args.target;
const format = (args.format || (output.toLowerCase().endsWith(".jpg") || output.toLowerCase().endsWith(".jpeg") ? "jpg" : "png")).toLowerCase();
const jpegQuality = parseInt(args.quality || "92", 10);
const mode = String(args.mode || "recraft").toLowerCase();
if (!["recraft", "sharp"].includes(mode)) {
  console.error(`Invalid --mode "${mode}". Use recraft or sharp.`);
  process.exit(1);
}
if (mode === "recraft" && !FAL_KEY) {
  console.error("FAL_KEY not set. It is required for --mode recraft.");
  process.exit(1);
}

let targetW = null, targetH = null;
if (targetStr) {
  const m = targetStr.match(/^(\d+)x(\d+)$/i);
  if (!m) { console.error(`Invalid --target "${targetStr}". Use WxH (e.g. 1920x1080).`); process.exit(1); }
  targetW = parseInt(m[1], 10);
  targetH = parseInt(m[2], 10);
}

// ─── Pipeline ──────────────────────────────────────────────────
async function uploadToFalStorage(filePath) {
  const ext = extname(filePath).toLowerCase();
  const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
    : ext === ".webp" ? "image/webp" : "image/png";
  const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: `upload${ext}` }),
  });
  if (!initRes.ok) throw new Error(`Upload init failed: ${initRes.status}`);
  const { upload_url, file_url } = await initRes.json();
  const putRes = await fetch(upload_url, {
    method: "PUT", headers: { "Content-Type": contentType }, body: readFileSync(filePath),
  });
  if (!putRes.ok) throw new Error(`Upload PUT failed: ${putRes.status}`);
  return file_url;
}

async function recraftUpscale(imageUrl) {
  const submitRes = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!submitRes.ok) throw new Error(`Submit failed (${submitRes.status}): ${await submitRes.text()}`);
  const { request_id } = await submitRes.json();

  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const sRes = await fetch(`https://queue.fal.run/${ENDPOINT}/requests/${request_id}/status`,
      { headers: { Authorization: `Key ${FAL_KEY}` } });
    const s = await sRes.json();
    if (s.status === "COMPLETED") {
      const rRes = await fetch(`https://queue.fal.run/${ENDPOINT}/requests/${request_id}`,
        { headers: { Authorization: `Key ${FAL_KEY}` } });
      const final = await rRes.json();
      const url = final.image?.url || final.images?.[0]?.url;
      if (!url) throw new Error(`No image in result: ${JSON.stringify(final).slice(0, 300)}`);
      return url;
    }
    if (s.status === "FAILED") throw new Error(`Recraft FAILED: ${JSON.stringify(s)}`);
  }
  throw new Error("Recraft timed out after 200s");
}

async function encodeOutput(buffer, w, h, fmt) {
  let pipe = sharp(buffer);
  if (w && h) pipe = pipe.resize(w, h, { fit: "cover", kernel: "lanczos3" });
  if (fmt === "jpg") return await pipe.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
  return await pipe.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

(async () => {
  const inputPath = resolve(input);
  const outputPath = resolve(output);
  const inputStat = statSync(inputPath);
  const inputKB = (inputStat.size / 1024).toFixed(0);
  const inputMeta = await sharp(inputPath).metadata();

  console.log(`Input:  ${inputPath} (${inputMeta.width}x${inputMeta.height}, ${inputKB} KB)`);
  console.log(`Target: ${targetW && targetH ? `${targetW}x${targetH}` : "native (no resize)"} ${format === "jpg" ? `JPEG q${jpegQuality}` : "PNG"}`);
  console.log(`Mode:   ${mode}`);

  const t0 = Date.now();
  if (mode === "sharp") {
    const finalBuffer = await encodeOutput(readFileSync(inputPath), targetW, targetH, format);
    writeFileSync(outputPath, finalBuffer);
    const finalMeta = await sharp(finalBuffer).metadata();
    console.log(`Output: ${outputPath} (${finalMeta.width}x${finalMeta.height}, ${(finalBuffer.length / 1024).toFixed(0)} KB)`);
    console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Non-generative resize, no fal.ai call.`);
    return;
  }
  console.log("Uploading to fal storage...");
  const sourceUrl = await uploadToFalStorage(inputPath);

  console.log("Submitting to Recraft Crisp Upscale...");
  const upscaledUrl = await recraftUpscale(sourceUrl);

  console.log("Downloading upscaled result...");
  const rawBuffer = Buffer.from(await (await fetch(upscaledUrl)).arrayBuffer());
  const rawMeta = await sharp(rawBuffer).metadata();

  const finalBuffer = await encodeOutput(rawBuffer, targetW, targetH, format);
  writeFileSync(outputPath, finalBuffer);

  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const finalKB = (finalBuffer.length / 1024).toFixed(0);
  const finalMeta = await sharp(finalBuffer).metadata();
  console.log(`Output: ${outputPath} (${finalMeta.width}x${finalMeta.height}, ${finalKB} KB)`);
  console.log(`Done in ${sec}s. Recraft native: ${rawMeta.width}x${rawMeta.height}. Cost: ~$0.04.`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
