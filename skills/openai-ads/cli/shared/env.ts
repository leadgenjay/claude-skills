// Shared env loader for the ad-platform CLIs (linkedin-ads, tiktok-ads, reddit-ads).
// Lifted from cli/kit/client.ts so every CLI resolves .env.local the same way,
// regardless of the cwd it's invoked from.

import fs from "node:fs";
import path from "node:path";

// Walk up from the calling CLI script looking for .env.local so the CLI works
// from any cwd. Does not overwrite vars already present in process.env.
export function loadEnvLocal(): string | null {
  let dir = path.resolve(__dirname);
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, ".env.local");
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
        if (!m) continue;
        const [, k, vRaw] = m;
        if (process.env[k] !== undefined) continue;
        const v = vRaw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
        process.env[k] = v;
      }
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

loadEnvLocal();

// Read a required env var, exiting with a clear message (and optional hint) if absent.
export function requireEnv(name: string, hint?: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`error: ${name} not set (check .env.local or export it)`);
    if (hint) console.error(`       ${hint}`);
    process.exit(1);
  }
  return v;
}

// Read an optional env var with a fallback default.
export function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
