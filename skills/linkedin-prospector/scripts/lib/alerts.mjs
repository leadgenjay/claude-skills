// Anything that needs a human goes to two places: the li_alerts table and a line in
// <home>/needs-you.md, which the user is told to open daily.

import fs from 'node:fs';
import path from 'node:path';
import { ensureHome, homeDir } from './config.mjs';
import { insert, select, update } from './db.mjs';

export function needsYouPath() {
  return path.join(homeDir(), 'needs-you.md');
}

function appendLine(line) {
  ensureHome();
  const file = needsYouPath();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '# Needs you\n\nNewest at the bottom. Resolved alerts stay listed here.\n\n', { mode: 0o600 });
  }
  fs.appendFileSync(file, line + '\n', { mode: 0o600 });
}

// Writes the file line first, so an alert survives a database outage. Never throws on a
// database failure (alerts are the error path); returns { saved, id }.
export async function alert(kind, body, prospectId = null) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const who = prospectId ? ` (prospect ${prospectId})` : '';
  const oneLine = String(body).replace(/\s*\n\s*/g, ' ');
  appendLine(`- [${stamp} UTC] ${kind}${who}: ${oneLine}`);
  try {
    const rows = await insert('li_alerts', { kind, body: String(body), prospect_id: prospectId });
    return { saved: true, id: rows[0]?.id ?? null };
  } catch (err) {
    appendLine(`  - not saved to li_alerts: ${err.message}`);
    return { saved: false, id: null };
  }
}

export async function openAlerts() {
  return select('li_alerts', { resolved_at: null, order: 'created_at.asc' });
}

// Marks one alert resolved. Returns the row, or null if no open alert has that id.
export async function resolveAlert(id) {
  const [row] = await update('li_alerts', { id, resolved_at: null }, { resolved_at: new Date().toISOString() });
  return row ?? null;
}

// Every CLI entry point calls this first. Prints to stderr so JSON on stdout stays clean.
// Prints ids, kinds and times only, never the body: bodies quote DM and comment text written by
// strangers, and this output is read back into Claude on every pass. Bodies live in needs-you.md.
// Returns the number of open alerts, or null if they could not be read.
export async function printOpenAlerts() {
  let rows;
  try {
    rows = await openAlerts();
  } catch (err) {
    process.stderr.write(`Could not read open alerts (${err.message}). Check ${needsYouPath()}.\n`);
    return null;
  }
  if (rows.length === 0) return 0;
  process.stderr.write(`${rows.length} open alert${rows.length === 1 ? '' : 's'} need you (also in ${needsYouPath()}):\n`);
  for (const r of rows) {
    const who = r.prospect_id ? ` (prospect ${r.prospect_id})` : '';
    process.stderr.write(`  #${r.id} ${r.kind}${who}${r.created_at ? ` ${r.created_at}` : ''}\n`);
  }
  process.stderr.write('\n');
  return rows.length;
}
