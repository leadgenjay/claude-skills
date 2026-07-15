#!/usr/bin/env node
// render-preview.mjs — fill a shared HTML mockup template with a JSON config and write it.
//
// Usage:
//   node scripts/skills/render-preview.mjs \
//     --template ig-carousel \
//     --out output/hyper-carousel/<slug>/preview.html \
//     --config '<inline-json>'    # OR --config @path/to/config.json
//     [--open]
//
// The script reads the preview template bundled with this skill,
// replaces the literal token `__PREVIEW_CONFIG__` with JSON.stringify(config),
// writes the result to --out, also writes the raw config to preview.json next to it,
// and optionally launches the file in the default browser via macOS `open`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'assets', 'preview-templates');

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

function fail(msg, code = 1) {
  console.error(`render-preview: ${msg}`);
  process.exit(code);
}

const args = parseArgs(process.argv.slice(2));

if (!args.template) fail('missing --template <name>');
if (!args.out) fail('missing --out <path>');
if (!args.config) fail('missing --config <json|@filepath>');

const templatePath = path.join(TEMPLATES_DIR, `${args.template}.html`);
if (!fs.existsSync(templatePath)) {
  const available = fs.existsSync(TEMPLATES_DIR)
    ? fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''))
    : [];
  fail(`template not found: ${templatePath}\navailable: ${available.join(', ') || '(none)'}`);
}

// Resolve config (inline JSON or @path)
let configRaw;
if (typeof args.config === 'string' && args.config.startsWith('@')) {
  const cfgPath = args.config.slice(1);
  if (!fs.existsSync(cfgPath)) fail(`config file not found: ${cfgPath}`);
  configRaw = fs.readFileSync(cfgPath, 'utf-8');
} else {
  configRaw = args.config;
}

let config;
try {
  config = JSON.parse(configRaw);
} catch (e) {
  fail(`config is not valid JSON: ${e.message}`);
}

// Tag the config with the template name so preview.json is self-describing
if (!config.template) config.template = args.template;

const template = fs.readFileSync(templatePath, 'utf-8');

if (!template.includes('__PREVIEW_CONFIG__')) {
  fail(`template ${args.template}.html does not contain the __PREVIEW_CONFIG__ placeholder`);
}

// JSON.stringify is safe to drop inside <script type="application/json">, but we still
// guard against the rare case of a closing </script> tag appearing inside a string value.
const configJson = JSON.stringify(config).replace(/<\/script>/gi, '<\\/script>');

const html = template.replace('__PREVIEW_CONFIG__', configJson);

const outPath = path.resolve(args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);

// Write preview.json alongside preview.html for re-render / debugging
const jsonPath = path.join(path.dirname(outPath), 'preview.json');
fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

console.log(JSON.stringify({
  status: 'ok',
  template: args.template,
  preview: outPath,
  config: jsonPath
}, null, 2));

if (args.open) {
  // macOS `open` is fine here — repo is darwin-only per CLAUDE.md
  const r = spawnSync('open', [outPath], { stdio: 'inherit' });
  if (r.status !== 0) console.error('render-preview: failed to launch preview in browser');
}
