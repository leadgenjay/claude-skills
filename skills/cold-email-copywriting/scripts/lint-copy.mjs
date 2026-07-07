#!/usr/bin/env node
// lint-copy.mjs — mechanical guard for cold-email copy.
//
// Instructions alone do not reliably stop em dashes from leaking into generated
// copy (the #1 AI-detection tell), so this is the deterministic backstop. Run it
// on the sequence file before handing copy downstream / before deploy Gate 0.
//
//   node lint-copy.mjs path/to/sequence.md          # lint a file
//   cat sequence.md | node lint-copy.mjs             # lint stdin
//
// Exit 0 = clean. Exit 1 = hard violation found (dashes). Warnings never fail.
//
// HARD FAIL: em dash (—), en dash (–), figure dash (‒), horizontal bar (―),
//            or a literal double hyphen (--). These are AI tells.
// WARN:      spam trigger words. Reported but do not fail (may be false positives
//            in surrounding notes); a human confirms.

import { readFileSync } from 'node:fs';

const DASH_RE = /[‒–—―]|--/g; // figure/en/em dash, horizontal bar, `--`
const SPAM_WORDS = [
  'free', 'guarantee', 'act now', 'limited time', 'click here', 'buy now',
  'discount', 'winner', 'urgent', '100%', 'risk-free',
];

function read(input) {
  if (input && input !== '-') return readFileSync(input, 'utf8');
  return readFileSync(0, 'utf8'); // stdin
}

const path = process.argv[2];
let text;
try {
  text = read(path);
} catch (e) {
  console.error(`lint-copy: cannot read input (${e.message})`);
  process.exit(2);
}

const lines = text.split(/\r?\n/);
const dashHits = [];
const spamHits = [];

// Skip markdown scaffolding that never reaches a prospect: headers (`# ...`) and
// horizontal-rule separators (`---`, `***`, `___`). Everything else — email body
// prose AND annotation lines — is scanned, so the no-dash habit is reinforced
// across the whole deliverable.
const isScaffolding = (line) =>
  /^\s*#{1,6}\s/.test(line) || /^\s*[-*_]{3,}\s*$/.test(line);

lines.forEach((line, i) => {
  if (isScaffolding(line)) return;
  let m;
  DASH_RE.lastIndex = 0;
  while ((m = DASH_RE.exec(line)) !== null) {
    dashHits.push({ line: i + 1, col: m.index + 1, ch: m[0], ctx: line.trim().slice(0, 100) });
  }
  const lower = line.toLowerCase();
  for (const w of SPAM_WORDS) {
    const idx = lower.indexOf(w);
    if (idx !== -1) spamHits.push({ line: i + 1, word: w, ctx: line.trim().slice(0, 100) });
  }
});

const label = path ? path : '(stdin)';

if (dashHits.length) {
  console.error(`\n✗ FAIL — ${dashHits.length} dash violation(s) in ${label}:`);
  for (const h of dashHits) {
    console.error(`  line ${h.line}:${h.col}  "${h.ch}"  ${h.ctx}`);
  }
  console.error('\n  Replace every em/en dash and "--" with a comma, period, or split the sentence.');
}

if (spamHits.length) {
  console.warn(`\n⚠ WARN — ${spamHits.length} possible spam-trigger word(s) in ${label} (confirm by hand):`);
  for (const h of spamHits) {
    console.warn(`  line ${h.line}  "${h.word}"  ${h.ctx}`);
  }
}

if (!dashHits.length && !spamHits.length) {
  console.log(`✓ clean — no dash violations or spam-trigger words in ${label}`);
} else if (!dashHits.length) {
  console.log(`✓ no dash violations in ${label} (see warnings above)`);
}

process.exit(dashHits.length ? 1 : 0);
