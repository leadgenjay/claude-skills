// fal.mjs — portable fal.ai helpers for the carousels skill.
//
// No host project required. Reads FAL_KEY from the environment first, then
// from <skill>/config/.env (written by the setup interview).
//
// Models:
//   - GPT-Image-2 (openai/gpt-image-2 via fal.ai queue) — ALL slide generation.
//     No silent fallback to any other model: transient errors retry on
//     GPT-Image-2 itself; a content-policy error is surfaced to the caller.
//   - Flux LoRA (fal-ai/flux-lora) — OPTIONAL, only when config.loraUrl is set
//     (for clients who own a trained character LoRA). Default identity flow is
//     the client's real reference photos passed to GPT-Image-2 Edit.

import { readFileSync, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = resolve(__dirname, "..", "..");
export const CONFIG_DIR = resolve(SKILL_ROOT, "config");

// --------------- config + key loading ---------------

/** Load config/config.json written by the setup interview. Null if missing. */
export function loadConfig() {
  const p = resolve(CONFIG_DIR, "config.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

/** Read a KEY=value line from config/.env (quotes stripped). */
function envFileValue(name) {
  const p = resolve(CONFIG_DIR, ".env");
  if (!existsSync(p)) return undefined;
  const m = readFileSync(p, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
}

export function getFalKey() {
  const key = process.env.FAL_KEY || envFileValue("FAL_KEY");
  if (!key) {
    throw new Error(
      "FAL_KEY not set. Run the setup interview (see SKILL.md Step 1) or add FAL_KEY to " +
        resolve(CONFIG_DIR, ".env"),
    );
  }
  return key;
}

export function getBlotatoKey() {
  return process.env.BLOTATO_API_KEY || envFileValue("BLOTATO_API_KEY") || null;
}

// --------------- generic queue helpers ---------------

async function submitToQueue(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`fal.ai submit failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function pollQueue(baseUrl, requestId, { maxAttempts = 60, intervalMs = 3000 } = {}) {
  const headers = { Authorization: `Key ${getFalKey()}` };
  const statusUrl = `${baseUrl}/requests/${requestId}/status`;
  const responseUrl = `${baseUrl}/requests/${requestId}`;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) {
      throw new Error(`fal.ai status check failed (${statusRes.status}): ${await statusRes.text()}`);
    }
    const status = await statusRes.json();
    if (status.status === "FAILED") {
      throw new Error(`fal.ai generation failed: ${JSON.stringify(status)}`);
    }
    if (status.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, { headers });
      if (!resultRes.ok) {
        throw new Error(`fal.ai result fetch failed (${resultRes.status}): ${await resultRes.text()}`);
      }
      const result = await resultRes.json();
      if (!result.images || result.images.length === 0) {
        throw new Error("fal.ai returned no images");
      }
      return result;
    }
  }
  throw new Error("Timeout waiting for fal.ai generation");
}

// --------------- GPT-Image-2 ---------------

const GPT_IMAGE_2_BASE = "https://queue.fal.run/openai/gpt-image-2";
const GPT_IMAGE_2_EDIT = `${GPT_IMAGE_2_BASE}/edit`;

/**
 * Aspect ratio → GPT-Image-2 image_size. 4:5 (IG feed) returns 1024x1280 —
 * UNDER the IG 1080x1350 spec, so finals must go through saveResized().
 */
export function aspectToImageSize(aspectRatio) {
  switch (aspectRatio) {
    case "1:1": return "square_hd";
    case "16:9": return "landscape_16_9";
    case "9:16": return "portrait_16_9";
    case "4:3": return "landscape_4_3";
    case "3:4": return "portrait_4_3";
    case "4:5": return { width: 1024, height: 1280 };
    case "5:4": return { width: 1280, height: 1024 };
    default: return aspectRatio || "square_hd";
  }
}

async function resolveImages(response, baseUrl) {
  if (response.images && response.images.length > 0) return response.images;
  if (response.request_id) {
    const result = await pollQueue(baseUrl, response.request_id);
    return result.images;
  }
  throw new Error("Unexpected fal.ai response shape");
}

/** GPT-Image-2 Edit: composite a slide from reference image URLs + prompt. */
export async function editImage({ image_urls, prompt, num_images = 2, aspect_ratio = "4:5", quality = "medium" }) {
  const response = await submitToQueue(GPT_IMAGE_2_EDIT, {
    image_urls,
    prompt,
    quality,
    output_format: "png",
    num_images,
    image_size: aspectToImageSize(aspect_ratio),
  });
  return resolveImages(response, GPT_IMAGE_2_BASE);
}

/** GPT-Image-2 text-to-image (slides with no reference). */
export async function generateImage({ prompt, num_images = 2, aspect_ratio = "4:5", quality = "medium" }) {
  const response = await submitToQueue(GPT_IMAGE_2_BASE, {
    prompt,
    quality,
    output_format: "png",
    num_images,
    image_size: aspectToImageSize(aspect_ratio),
  });
  return resolveImages(response, GPT_IMAGE_2_BASE);
}

/**
 * GPT-Image-2 ONLY, with retries. Transient errors retry up to 3x; a content
 * policy refusal is surfaced immediately — never silently swap models.
 */
export async function editImageWithRetry(opts) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await (opts.image_urls && opts.image_urls.length > 0
        ? editImage(opts)
        : generateImage(opts));
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      if (/content_policy|policy_violation|safety/i.test(msg)) {
        throw new Error(`GPT-Image-2 content policy on this slide: ${msg}`);
      }
      console.log(`    GPT-Image-2 transient error (attempt ${attempt}/3): ${msg}`);
    }
  }
  throw lastErr;
}

// --------------- Flux LoRA (optional, config.loraUrl) ---------------

const FLUX_LORA_ENDPOINT = "https://queue.fal.run/fal-ai/flux-lora";

/**
 * Generate a character photo via the client's own Flux LoRA. Only available
 * when the setup interview recorded a loraUrl (and optional loraTrigger).
 */
export async function generateLoraPhoto({ prompt, image_size = "square_hd", num_images = 1 }) {
  const config = loadConfig();
  if (!config?.loraUrl) {
    throw new Error("No loraUrl in config — use reference photos instead (the default identity flow).");
  }
  const response = await submitToQueue(FLUX_LORA_ENDPOINT, {
    prompt: config.loraTrigger ? `${config.loraTrigger}, ${prompt}` : prompt,
    loras: [{ path: config.loraUrl, scale: 1.0 }],
    image_size,
    num_images,
    output_format: "png",
    num_inference_steps: 28,
    guidance_scale: 3.5,
  });
  const result = response.request_id
    ? await pollQueue(FLUX_LORA_ENDPOINT, response.request_id, { maxAttempts: 30 })
    : response;
  if (!result.images || result.images.length === 0) throw new Error("Flux LoRA returned no images");
  return result.images;
}

// --------------- storage + files ---------------

const FAL_STORAGE_INITIATE = "https://rest.alpha.fal.ai/storage/upload/initiate";

/** Upload a buffer to fal.ai storage; returns a public CDN URL. */
export async function uploadToFalStorage(buffer, fileName, contentType = "image/png") {
  const initRes = await fetch(FAL_STORAGE_INITIATE, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: fileName, content_type: contentType }),
  });
  if (!initRes.ok) {
    throw new Error(`fal.ai storage initiate failed (${initRes.status}): ${await initRes.text()}`);
  }
  const { file_url, upload_url } = await initRes.json();
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(buffer),
  });
  if (!uploadRes.ok) throw new Error(`fal.ai file upload failed (${uploadRes.status})`);
  return file_url;
}

/** Upload a local file path to fal.ai storage; returns a public CDN URL. */
export async function uploadFileToFalStorage(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const contentType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return uploadToFalStorage(readFileSync(filePath), basename(filePath), contentType);
}

export async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Download a generated slide and upscale to true IG 1080x1350 (4:5) with
 * Sharp lanczos3. GPT-Image-2's 4:5 output is 1024x1280 — below the quality
 * gate's minimum — so EVERY final slide goes through this.
 */
export async function saveResized(url, outPath, { width = 1080, height = 1350 } = {}) {
  const sharp = (await import("sharp")).default;
  const buf = await downloadImage(url);
  const resized = await sharp(buf)
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();
  await writeFile(outPath, resized);
  return resized.length;
}
