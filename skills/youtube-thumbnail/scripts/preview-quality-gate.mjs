#!/usr/bin/env node
// preview-quality-gate.mjs — pre-review quality gate for visual skill output.
//
// Wraps the autoheal frame-extract-and-checklist loop originally built into
// /hyper-carousel so every visual skill can call the same gate before showing
// the user the in-browser preview.
//
// For --type video:
//   - For each MP4 matched by --pattern in --dir, extract a frame at t=<at>s
//     using ffmpeg, saved as <basename>-preview.png
//   - Verify the MP4 is real ISO Media (via `file`) and >50KB
//
// For --type image:
//   - For each PNG/JPG matched by --pattern in --dir, verify magic bytes
//     and minimum dimensions (via `sips`)
//
// On success: prints a JSON object with extracted frame paths + the deterministic
// checklist Claude should consult before declaring the output ready. Exits 0.
// On failure: prints a JSON object describing the defect. Non-zero exit code.
//
// Usage:
//   node scripts/skills/preview-quality-gate.mjs --dir output/<skill>/<slug>/ --type video
//   node scripts/skills/preview-quality-gate.mjs --dir output/<skill>/<slug>/ --type image --min-width 720
//   node scripts/skills/preview-quality-gate.mjs --dir … --type video --at 3 --pattern '^slide-\d+\.mp4$'

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function fail(obj, code = 2) {
  console.log(JSON.stringify({ status: 'gate-failed', ...obj }, null, 2));
  process.exit(code);
}

const args = parseArgs(process.argv.slice(2));

if (!args.dir) fail({ reason: 'missing --dir <path>' }, 1);
if (!args.type) fail({ reason: 'missing --type <video|image>' }, 1);
if (!['video', 'image'].includes(args.type)) fail({ reason: `--type must be 'video' or 'image', got '${args.type}'` }, 1);

const dir = path.resolve(args.dir);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  fail({ reason: `dir not found or not a directory: ${dir}` }, 1);
}

const at = Number(args.at || 3);
const minWidth = Number(args['min-width'] || 0);
const minHeight = Number(args['min-height'] || 0);
const minBytes = Number(args['min-bytes'] || 50_000);

let pattern;
if (args.pattern) {
  pattern = new RegExp(args.pattern);
} else {
  pattern = args.type === 'video' ? /\.(mp4|mov|webm)$/i : /\.(png|jpe?g)$/i;
}

const all = fs.readdirSync(dir).filter(f => pattern.test(f)).sort();
if (all.length === 0) {
  fail({ reason: `no files matched ${pattern} in ${dir}` }, 1);
}

const defects = [];
const extractedFrames = [];
const verifiedFiles = [];

if (args.type === 'video') {
  for (const f of all) {
    const src = path.join(dir, f);
    const stats = fs.statSync(src);
    if (stats.size < minBytes) {
      defects.push({ file: f, kind: 'too-small', actual: stats.size, expected: `>=${minBytes}` });
      continue;
    }
    // Real container check
    let fileOut = '';
    try {
      fileOut = execFileSync('file', [src], { encoding: 'utf-8' });
    } catch (e) {
      defects.push({ file: f, kind: 'file-probe-failed', error: e.message });
      continue;
    }
    if (!/ISO Media|MP4|Quicktime|Matroska/i.test(fileOut)) {
      defects.push({ file: f, kind: 'not-real-video', file_output: fileOut.trim() });
      continue;
    }
    // Extract frame at t=<at>s
    const framePath = path.join(dir, f.replace(/\.[^.]+$/, '-preview.png'));
    const ff = spawnSync('ffmpeg', [
      '-y', '-i', src, '-ss', String(at), '-frames:v', '1', '-update', '1', framePath
    ], { stdio: 'pipe' });
    if (ff.status !== 0) {
      defects.push({ file: f, kind: 'ffmpeg-extract-failed', stderr: ff.stderr?.toString().slice(-400) });
      continue;
    }
    extractedFrames.push(framePath);
    verifiedFiles.push(src);
  }
} else {
  // image
  for (const f of all) {
    const src = path.join(dir, f);
    const buf = fs.readFileSync(src);
    const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const isJpg = buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    if (!isPng && !isJpg) {
      defects.push({ file: f, kind: 'bad-magic-bytes' });
      continue;
    }
    if (minWidth > 0 || minHeight > 0) {
      try {
        const wOut = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf-8' });
        const w = Number((wOut.match(/pixelWidth:\s*(\d+)/) || [])[1] || 0);
        const h = Number((wOut.match(/pixelHeight:\s*(\d+)/) || [])[1] || 0);
        if (w < minWidth || h < minHeight) {
          defects.push({ file: f, kind: 'too-small-dimensions', actual: `${w}x${h}`, expected: `>=${minWidth}x${minHeight}` });
          continue;
        }
      } catch (e) {
        defects.push({ file: f, kind: 'sips-probe-failed', error: e.message });
        continue;
      }
    }
    verifiedFiles.push(src);
  }
}

if (defects.length > 0) {
  fail({ reason: 'defects-detected', defects, hint: 'invoke /autoheal to mutate the producing skill, regenerate, then re-run the gate' }, 3);
}

const checklist = args.type === 'video' ? [
  'Read each *-preview.png frame with the Read tool (in-context, single image)',
  'Verify no decorative element overlaps text glyphs',
  'Verify all text is fully visible — no cropping at edges',
  'Verify counters/scrubs/tweens show FINAL state (frame is at t=3s — anything still mid-animation is broken)',
  'Verify brand colors are correct (#ED0D51 hot-pink / #0D0D0D near-black, or skill-specific palette)',
  'Verify the footer / handle / progress indicator (if any) is present and legible',
  'If any defect: invoke /autoheal, re-render the affected slide, re-run this gate',
  'Only AFTER all frames pass: invoke render-preview.mjs to write preview.html and open it for user review'
] : [
  'Read each verified image with the Read tool',
  'Verify text is fully visible and legible at display size',
  'Verify brand colors are correct (#ED0D51 hot-pink / #0D0D0D near-black, or skill-specific palette)',
  'Verify no decorative element overlaps text',
  'Verify the headline and CTA (if any) are inside the safe zone',
  'If any defect: invoke /autoheal, regenerate, re-run this gate',
  'Only AFTER all images pass: invoke render-preview.mjs to write preview.html and open it for user review'
];

console.log(JSON.stringify({
  status: 'gate-passed',
  dir,
  type: args.type,
  verifiedFiles,
  extractedFrames,
  checklist
}, null, 2));
