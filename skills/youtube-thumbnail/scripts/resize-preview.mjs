#!/usr/bin/env node
import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import sharp from "sharp";

const input = process.argv[2];
const maxIndex = process.argv.indexOf("--max");
const outIndex = process.argv.indexOf("--out");
if (!input || !existsSync(input)) {
  console.error("Usage: resize-preview.mjs <input> [--out path] [--max 1000]");
  process.exit(1);
}
const max = Number(maxIndex >= 0 ? process.argv[maxIndex + 1] : 1000);
const inputPath = resolve(input);
const ext = extname(inputPath) || ".png";
const outputPath = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : inputPath.slice(0, -ext.length) + "-preview" + ext);
await sharp(inputPath).resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).toFile(outputPath);
console.log(outputPath);
