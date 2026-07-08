#!/usr/bin/env node
// upload-slides.mjs — host finished slides on the fal.ai public CDN.
//
// Instagram rejects Google Drive links; fal.ai storage URLs work everywhere.
// Uploads every slide-NN.png in --dir (in order) and prints the comma-joined
// public URLs on stdout (ready for publish-blotato.mjs --media or manual use).
//
// Usage:
//   node scripts/upload-slides.mjs --dir carousel-output/my-topic
//
// Requires FAL_KEY (env or config/.env).

import { readdirSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { uploadFileToFalStorage } from "./lib/fal.mjs";

const argv = process.argv.slice(2);
const dirIdx = argv.indexOf("--dir");
if (dirIdx < 0 || !argv[dirIdx + 1]) {
  console.error("usage: node scripts/upload-slides.mjs --dir <slides-dir>");
  process.exit(1);
}
const dir = resolve(argv[dirIdx + 1]);
if (!existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error(`upload-slides: dir not found: ${dir}`);
  process.exit(1);
}

const slides = readdirSync(dir)
  .filter((f) => /^slide-\d+\.png$/.test(f))
  .sort();
if (slides.length === 0) {
  console.error(`upload-slides: no slide-NN.png files in ${dir}`);
  process.exit(1);
}

const urls = [];
for (const f of slides) {
  const url = await uploadFileToFalStorage(resolve(dir, f));
  process.stderr.write(`  ${f} -> ${url}\n`);
  urls.push(url);
}
process.stdout.write(urls.join(",") + "\n");
