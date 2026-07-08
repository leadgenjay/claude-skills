#!/usr/bin/env node
// preview-quality-gate.mjs — deterministic quality gate for generated slides.
//
// For each PNG/JPG matched by --pattern in --dir, verifies magic bytes and
// minimum dimensions (via sharp — cross-platform, no macOS sips dependency).
//
// On success: prints JSON with verified files + the review checklist Claude
// must run before presenting the carousel. Exits 0.
// On failure: prints JSON describing every defect. Non-zero exit.
//
// Usage:
//   node scripts/preview-quality-gate.mjs --dir carousel-output/my-topic --min-width 1080 --min-height 1350
//   node scripts/preview-quality-gate.mjs --dir … --pattern '^slide-\d+\.png$'
//
// NOTE: the gate globs ALL matching images in --dir. Keep the slide dir clean —
// alternates live in alts/, avatars and stray photos stay out.

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function fail(obj, code = 2) {
  console.log(JSON.stringify({ status: "gate-failed", ...obj }, null, 2));
  process.exit(code);
}

const args = parseArgs(process.argv.slice(2));
if (!args.dir) fail({ reason: "missing --dir <path>" }, 1);

const dir = path.resolve(args.dir);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  fail({ reason: `dir not found or not a directory: ${dir}` }, 1);
}

const minWidth = Number(args["min-width"] || 1080);
const minHeight = Number(args["min-height"] || 1350);
const minBytes = Number(args["min-bytes"] || 0);
const pattern = args.pattern ? new RegExp(args.pattern) : /\.(png|jpe?g)$/i;

const all = fs
  .readdirSync(dir)
  .filter((f) => pattern.test(f) && fs.statSync(path.join(dir, f)).isFile())
  .sort();
if (all.length === 0) fail({ reason: `no files matched ${pattern} in ${dir}` }, 1);

const sharp = (await import("sharp")).default;

const defects = [];
const verifiedFiles = [];

for (const f of all) {
  const src = path.join(dir, f);
  const buf = fs.readFileSync(src);
  const isPng =
    buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isPng && !isJpg) {
    defects.push({ file: f, kind: "bad-magic-bytes" });
    continue;
  }
  if (minBytes > 0 && buf.length < minBytes) {
    defects.push({ file: f, kind: "too-small-filesize", actual: buf.length, expected: `>=${minBytes}` });
    continue;
  }
  try {
    const meta = await sharp(src).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (w < minWidth || h < minHeight) {
      defects.push({
        file: f,
        kind: "too-small-dimensions",
        actual: `${w}x${h}`,
        expected: `>=${minWidth}x${minHeight}`,
      });
      continue;
    }
  } catch (e) {
    defects.push({ file: f, kind: "metadata-probe-failed", error: e.message });
    continue;
  }
  const sizeNote = buf.length < 200_000 ? "warn-small-filesize" : "ok";
  verifiedFiles.push({ file: src, bytes: buf.length, note: sizeNote });
}

if (defects.length > 0) {
  fail(
    {
      reason: "defects-detected",
      defects,
      hint: "regenerate the failing slide(s) via generate-carousel.mjs <num>, then re-run this gate",
    },
    3,
  );
}

const checklist = [
  "Read EVERY verified slide with the Read tool at full resolution",
  "Check every visible word for spelling and coherence — AI generators hallucinate text",
  "Check embedded chrome text too (document titles, app labels), not just headlines — and confirm no em/en dashes anywhere",
  "Verify the person's face on cover + CTA matches the reference photos (identity preserved)",
  "Verify brand colors match the client config (accent on 1-2 words max, light background)",
  "Verify no icons, no slide counters, no pixel values, no dark backgrounds",
  "Verify each image is large (40-60% of slide) and matches the slide's claim",
  "Any slide with warn-small-filesize likely lost its visual content — inspect it first",
  "If any defect: regenerate that slide and re-run this gate before presenting",
  "Only AFTER all slides pass: run render-preview.mjs and review in the phone mockup",
];

console.log(
  JSON.stringify({ status: "gate-passed", dir, verifiedFiles, checklist }, null, 2),
);
