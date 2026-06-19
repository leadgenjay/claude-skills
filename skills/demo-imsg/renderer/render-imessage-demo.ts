/**
 * Remotion render script for the IMessageDemo composition (bundled with the
 * demo-imsg skill — self-contained, no external project required).
 *
 * Usage:
 *   npx tsx render-imessage-demo.ts <manifest.json> [output.mov] [--mp4]
 *
 * Renders an iMessage conversation as a transparent ProRes 4444 .mov, or an
 * H.264 MP4 with a black background if --mp4 is passed.
 *
 * Run this from the skill's renderer/ directory (where this file lives) after
 * installing the deps in package.json — see the skill's Step 0 prerequisites.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { IMessageDemoManifest } from './compositions/imessage-demo/schemas/manifest';

// Resolve paths relative to THIS script's own location, not the caller's CWD,
// so the renderer works no matter where the customer invokes it from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const useMp4 = args.includes('--mp4');
  const positional = args.filter((a) => !a.startsWith('--'));

  const manifestPath = positional[0];
  const defaultExt = useMp4 ? 'mp4' : 'mov';

  if (!manifestPath) {
    console.error(
      'Usage: npx tsx render-imessage-demo.ts <manifest.json> [output.mov] [--mp4]',
    );
    process.exit(1);
  }

  const outputPath =
    positional[1] ??
    path.join(path.dirname(manifestPath), `imessage-demo.${defaultExt}`);

  const manifest: IMessageDemoManifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  );
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const entryPoint = path.resolve(__dirname, 'Root.tsx');

  console.log('[render] Bundling Remotion project...');
  const bundleDir = await bundle({ entryPoint });

  // Copy contact avatar into bundle if provided (so the renderer can serve it)
  let renderManifest = { ...manifest };
  if (manifest.contactAvatarPath) {
    const absPath = path.resolve(manifest.contactAvatarPath);
    if (fs.existsSync(absPath)) {
      const filename = `contact-avatar${path.extname(absPath)}`;
      const dest = path.join(bundleDir, filename);
      try {
        fs.linkSync(absPath, dest);
      } catch {
        fs.copyFileSync(absPath, dest);
      }
      renderManifest = { ...renderManifest, contactAvatarPath: filename };
    } else {
      console.warn(
        `[render] Avatar not found: ${absPath} — rendering with a gray initial instead.`,
      );
      renderManifest = { ...renderManifest, contactAvatarPath: undefined };
    }
  }

  console.log('[render] Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleDir,
    id: 'IMessageDemo',
    inputProps: renderManifest,
  });

  const durationSec = (composition.durationInFrames / composition.fps).toFixed(1);
  console.log(
    `[render] Rendering ${composition.durationInFrames} frames at ${composition.fps}fps ` +
      `(${composition.width}x${composition.height}, ${durationSec}s)...`,
  );

  const renderStart = Date.now();
  let lastLoggedPct = -1;
  const onProgress = ({ progress }: { progress: number }) => {
    const pct = Math.floor(progress * 100);
    if (pct > lastLoggedPct && pct % 10 === 0) {
      lastLoggedPct = pct;
      console.log(`[render] ${pct}%`);
    }
  };

  if (useMp4) {
    // Standard H.264 MP4 (no transparency)
    await renderMedia({
      composition,
      serveUrl: bundleDir,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: renderManifest,
      concurrency: 8,
      onProgress,
    });
  } else {
    // ProRes 4444 with transparency
    await renderMedia({
      composition,
      serveUrl: bundleDir,
      codec: 'prores',
      proResProfile: '4444',
      outputLocation: outputPath,
      inputProps: renderManifest,
      concurrency: 8,
      pixelFormat: 'yuva444p10le',
      onProgress,
    });
  }

  const elapsed = ((Date.now() - renderStart) / 1000).toFixed(1);
  const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`[render] Done in ${elapsed}s — ${fileSize}MB → ${outputPath}`);
}

main().catch((err) => {
  console.error('[render] Fatal:', err);
  process.exit(1);
});
