#!/usr/bin/env node

/**
 * validate-skills.js — guards published skills against author-machine coupling.
 *
 * Catches the class that shipped the 2026-06-19 cold-email KB-path bug: a skill
 * SKILL.md that tells Claude to read from a hardcoded /Users/<author>/... path or
 * query a personal NotebookLM notebook by ID — neither of which exists on a
 * customer's machine, so on install Claude hunts for "missing" files at step 1.
 *
 * Severity (mirrors publish-skill's preflight-audit.sh check [7]):
 *   - HARD FAIL: username-bearing absolute paths — /Users/<name>, /home/<name>,
 *     C:\Users\<name>. These can NEVER resolve for another person; labeling
 *     doesn't help. Bundle the file under references/ and reference it relatively.
 *   - FAIL-unless-labeled: author home paths (~/Nextcloud, ~/Documents, ~/Library)
 *     and personal-account services (NotebookLM / notebook IDs). Labeling or
 *     fallback language ("use your own", "if available", "ask the user",
 *     "example", "operator-only", "may differ") downgrades these to WARN.
 *
 * Usage:
 *   node scripts/validate-skills.js                 # scan ALL shipped docs (audit)
 *   node scripts/validate-skills.js --changed BASE  # scan only docs changed since BASE (CI)
 *   node scripts/validate-skills.js path/to/SKILL.md [...]   # scan specific files
 *
 * Exit: 1 if any FAIL, else 0. Dependency-free (no js-yaml needed).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOTS = ["skills", "commands", "agents", "components"];
const SCAN_EXT = /\.(md|markdown)$/i; // shipped instruction docs

const ABS = /\/Users\/[A-Za-z]|\/home\/[A-Za-z]|[A-Za-z]:\\Users\\/;
const SOFT = /~\/(Nextcloud|Documents|Library)\//;
const ACCT = /NotebookLM|notebook[^A-Za-z]{0,4}\(?[Ii][Dd]/;
const LABEL =
  /your (own )?(path|machine|folder|directory)|replace .*(path|with your)|example( only)?|operator(-| )?only|if .*(exists|present|available)|adjust .*path|host-?only|may differ|ask the user/i;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(e.name)) out.push(p);
  }
}

function listAll() {
  const out = [];
  for (const r of ROOTS) if (fs.existsSync(r)) walk(r, out);
  return out;
}

function changedFiles(base) {
  const valid = base && !/^0+$/.test(base);
  const cmd = valid
    ? `git diff --name-only --diff-filter=ACM ${base} HEAD -- ${ROOTS.join(" ")}`
    : `git diff-tree --no-commit-id --name-only -r HEAD -- ${ROOTS.join(" ")}`;
  try {
    return execSync(cmd, { encoding: "utf8" })
      .split("\n")
      .filter((f) => SCAN_EXT.test(f) && fs.existsSync(f));
  } catch (e) {
    console.error(
      `validate-skills: could not compute changed files (${e.message}); scanning all.`,
    );
    return listAll();
  }
}

const args = process.argv.slice(2);
let files;
if (args[0] === "--changed") files = changedFiles(args[1] || "");
else if (args.length) files = args.filter((f) => fs.existsSync(f));
else files = listAll();

let fails = 0;
let warns = 0;

for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const lines = text.split("\n");
  const abs = [];
  const soft = [];
  const acct = [];
  lines.forEach((l, i) => {
    if (ABS.test(l)) abs.push(i + 1);
    if (SOFT.test(l)) soft.push(i + 1);
    if (ACCT.test(l)) acct.push(i + 1);
  });
  if (!abs.length && !soft.length && !acct.length) continue;

  const labeled = LABEL.test(text);
  console.log(`\n${f}`);

  if (abs.length) {
    console.log(
      `  ✗ FAIL  author-absolute-path  line(s) ${abs.join(", ")} — username-bearing path can't resolve for customers (cold-email KB-path bug, 2026-06-19). Bundle under references/ + reference relatively.`,
    );
    fails++;
  }
  if (soft.length || acct.length) {
    const where = [
      ...soft.map((n) => `~path:${n}`),
      ...acct.map((n) => `acct:${n}`),
    ].join(", ");
    if (labeled) {
      console.log(
        `  ⚠ WARN  home-path/personal-account  ${where} — labeling/fallback present; confirm it's "use your own" / "if available", not a hard read directive.`,
      );
      warns++;
    } else {
      console.log(
        `  ✗ FAIL  home-path/personal-account  ${where} — no label/fallback. Add "use your own"/fallback, label operator-only, or bundle the resource.`,
      );
      fails++;
    }
  }
}

console.log(
  `\nvalidate-skills: scanned ${files.length} doc(s) — ${fails} FAIL, ${warns} WARN`,
);
if (fails > 0) {
  console.log(
    "BLOCKED: resolve FAILs (see publish-skill SKILL.md §6b / preflight-audit.sh check [7]).",
  );
  process.exit(1);
}
process.exit(0);
