#!/usr/bin/env node

import { existsSync } from "fs";
import { basename, dirname, extname, resolve } from "path";
import sharp from "sharp";

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--")) args[value.slice(2)] = argv[++index];
    else args._.push(value);
  }
  return args;
}

function usage() {
  console.error("Usage: thumbnail-face-qa.mjs <image> --region x,y,width,height [--out path]");
  console.error("Region values are normalized from 0 to 1, for example: --region 0.68,0,0.32,0.65");
}

const args = parseArgs(process.argv.slice(2));
const input = args._[0];
if (!input || !args.region) {
  usage();
  process.exit(1);
}

const inputPath = resolve(input);
if (!existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  process.exit(1);
}

const region = args.region.split(",").map(Number);
if (
  region.length !== 4
  || region.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  || region[2] <= 0
  || region[3] <= 0
  || region[0] + region[2] > 1
  || region[1] + region[3] > 1
) {
  console.error(`Invalid normalized region: ${args.region}`);
  usage();
  process.exit(1);
}

const image = sharp(inputPath);
const metadata = await image.metadata();
if (!metadata.width || !metadata.height) throw new Error("Could not read image dimensions");

const left = Math.floor(metadata.width * region[0]);
const top = Math.floor(metadata.height * region[1]);
const width = Math.min(metadata.width - left, Math.max(1, Math.round(metadata.width * region[2])));
const height = Math.min(metadata.height - top, Math.max(1, Math.round(metadata.height * region[3])));
const extension = extname(inputPath);
const stem = basename(inputPath, extension);
const outputPath = resolve(args.out || `${dirname(inputPath)}/${stem}-face-qa.png`);

await image
  .extract({ left, top, width, height })
  .png()
  .toFile(outputPath);

console.log(JSON.stringify({
  status: "face-crop-created",
  input: inputPath,
  output: outputPath,
  sourceDimensions: `${metadata.width}x${metadata.height}`,
  cropPixels: { left, top, width, height },
  normalizedRegion: region,
}, null, 2));
