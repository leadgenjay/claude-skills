// Shared strict input parser for campaign authoring. Validation precedes every network call.
import fs from 'node:fs';
import { AimfoxRefusal, authoringOptions } from './aimfox.mjs';

export function parseAuthoringArgs(args, { standalone = false } = {}) {
  const values = {};
  let apply = !standalone;
  let jsonFile;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--apply' && standalone && !values.apply) { values.apply = true; apply = true; continue; }
    if (!['--name', '--campaign', '--account', '--json-file'].includes(flag)) throw new AimfoxRefusal('Unknown or duplicate argument; use the documented options');
    const key = flag.slice(2);
    if (Object.hasOwn(values, key) || (key === 'json-file' && jsonFile !== undefined)) throw new AimfoxRefusal(`Duplicate option ${flag}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new AimfoxRefusal(`${flag} needs a value`);
    if (key === 'json-file') jsonFile = value;
    else values[key] = value;
  }
  delete values.apply;
  if (jsonFile !== undefined) {
    let data;
    try { data = JSON.parse(fs.readFileSync(jsonFile, 'utf8')); }
    catch { throw new AimfoxRefusal('Cannot read a valid --json-file JSON object'); }
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new AimfoxRefusal('--json-file must contain an object');
    for (const [key, value] of Object.entries(data)) {
      if (!['name', 'campaign', 'account'].includes(key)) throw new AimfoxRefusal('--json-file accepts only name, campaign and account');
      if (Object.hasOwn(values, key)) throw new AimfoxRefusal(`Conflicting --${key} and --json-file field`);
      if (typeof value !== 'string') throw new AimfoxRefusal(`--json-file ${key} must be a string`);
      values[key] = value;
    }
  }
  return { options: authoringOptions(values), apply };
}
