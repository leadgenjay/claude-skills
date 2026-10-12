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
 * Also checks a skill manifest's optional `gallery:` list, the display-only
 * media shown on the marketplace page. Gallery files are never installed, so
 * every gallery path must exist, sit under the skill's own gallery/ folder, be
 * mp4, webm, jpg, png or gif, and stay under 2MB. A gallery path listed in
 * `files:` FAILS, because install.sh would then download it to every member.
 *
 * Usage:
 *   node scripts/validate-skills.js                 # scan ALL shipped docs + galleries (audit)
 *   node scripts/validate-skills.js --changed BASE  # scan only docs + skills changed since BASE (CI)
 *   node scripts/validate-skills.js path/to/SKILL.md [...]   # scan specific files
 *   node scripts/validate-skills.js path/to/manifest.yaml    # also checks that manifest's gallery
 *
 * Exit: 1 if any FAIL, else 0. Dependency-free (no js-yaml needed).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOTS = ["skills", "commands", "agents", "components"];
const SKILLS_ROOT = "skills";
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

// Returns every changed path under ROOTS, or null when git cannot answer.
function changedPaths(base) {
  const valid = base && !/^0+$/.test(base);
  const cmd = valid
    ? `git diff --name-only ${base} HEAD -- ${ROOTS.join(" ")}`
    : `git diff-tree --no-commit-id --name-only -r HEAD -- ${ROOTS.join(" ")}`;
  try {
    return execSync(cmd, { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch (e) {
    console.error(
      `validate-skills: could not compute changed files (${e.message}); scanning all.`,
    );
    return null;
  }
}

function allSkillDirs() {
  if (!fs.existsSync(SKILLS_ROOT)) return [];
  return fs
    .readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => path.join(SKILLS_ROOT, e.name));
}

// ---------------------------------------------------------------------------
// gallery: display-only marketplace media
// ---------------------------------------------------------------------------
const GALLERY_EXT = /\.(mp4|webm|jpg|png|gif)$/;
const VIDEO_EXT = /\.(mp4|webm)$/;
const GALLERY_MAX_BYTES = 2 * 1024 * 1024;

function unquote(v) {
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"');
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

/**
 * Reads `gallery:` and `files:` from a flat manifest. Not a YAML parser, for
 * the same reason as validate-skill-packaging.js: CI installs nothing. Any
 * gallery line it cannot read is returned in `unread`, so a shape this reader
 * does not know (flow style, a block scalar) FAILS instead of passing empty.
 */
function parseGallery(text) {
  const gallery = [];
  const files = [];
  const unread = [];
  let block = null;
  let cur = null;
  text.split("\n").forEach((l, i) => {
    if (!l.trim() || /^\s*#/.test(l)) return;
    if (/^gallery:\s*$/.test(l)) return void (block = "gallery");
    if (/^files:\s*$/.test(l)) return void (block = "files");
    if (/^\S/.test(l)) return void (block = null);
    if (block === "files") {
      const m = l.match(/^\s+-\s+(.+?)\s*$/);
      if (m) files.push(unquote(m[1]));
    } else if (block === "gallery") {
      const item = l.match(/^\s+-\s+([A-Za-z]+):\s*(.*?)\s*$/);
      const field = l.match(/^\s+([A-Za-z]+):\s*(.*?)\s*$/);
      if (item) gallery.push((cur = { [item[1]]: unquote(item[2]) }));
      else if (field && cur) cur[field[1]] = unquote(field[2]);
      else unread.push(i + 1);
    }
  });
  return { gallery, files, unread };
}

function galleryProblems(skillDir, rel, role) {
  const out = [];
  if (!rel) return [`${role} is missing`];
  if (path.isAbsolute(rel)) return [`${role} ${rel} is absolute; use a path relative to the skill`];
  const root = path.resolve(skillDir, "gallery");
  const abs = path.resolve(skillDir, rel);
  if (!abs.startsWith(root + path.sep)) {
    return [`${role} ${rel} is outside ${skillDir}/gallery/`];
  }
  if (!GALLERY_EXT.test(rel)) out.push(`${role} ${rel} is not mp4, webm, jpg, png or gif`);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    out.push(`${role} ${rel} does not exist`);
    return out;
  }
  // A symlink inside gallery/ could still point anywhere on disk.
  if (fs.existsSync(root) && !fs.realpathSync(abs).startsWith(fs.realpathSync(root) + path.sep)) {
    out.push(`${role} ${rel} resolves outside ${skillDir}/gallery/`);
  }
  const size = fs.statSync(abs).size;
  if (size >= GALLERY_MAX_BYTES) {
    out.push(`${role} ${rel} is ${(size / 1048576).toFixed(1)}MB; each gallery file must be under 2MB`);
  }
  return out;
}

function checkGallery(manifestPath) {
  const skillDir = path.dirname(manifestPath);
  const { gallery, files, unread } = parseGallery(fs.readFileSync(manifestPath, "utf8"));
  const problems = [];

  for (const ln of unread) problems.push(`line ${ln} of gallery: could not be read; write each entry as "- key: value" lines`);
  for (const f of files) {
    if (/^(\.\/)?gallery\//.test(f)) {
      problems.push(`${f} is in files: but gallery media is display-only; install.sh would download it to every member`);
    }
  }
  gallery.forEach((g, i) => {
    const at = `gallery[${i}]`;
    if (g.type !== "video" && g.type !== "image") problems.push(`${at} type must be video or image, got "${g.type || ""}"`);
    if (!g.caption || !g.caption.trim()) problems.push(`${at} has no caption; the page uses it for alt text`);
    for (const p of galleryProblems(skillDir, g.src, "src")) problems.push(`${at} ${p}`);
    if (g.src && g.type === "video" && !VIDEO_EXT.test(g.src)) problems.push(`${at} type video needs an mp4 or webm src`);
    if (g.src && g.type === "image" && VIDEO_EXT.test(g.src)) problems.push(`${at} type image cannot use a video src`);
    if (g.poster !== undefined) {
      for (const p of galleryProblems(skillDir, g.poster, "poster")) problems.push(`${at} ${p}`);
      if (VIDEO_EXT.test(g.poster)) problems.push(`${at} poster must be an image`);
    }
  });

  if (!problems.length) return 0;
  console.log(`\n${manifestPath}`);
  for (const p of problems) console.log(`  ✗ FAIL  gallery  ${p}`);
  return 1;
}

function manifestOf(dir) {
  for (const name of ["manifest.yaml", "manifest.yml"]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const args = process.argv.slice(2);
let files;
let manifests;
if (args[0] === "--changed") {
  const changed = changedPaths(args[1] || "");
  if (changed) {
    files = changed.filter((f) => SCAN_EXT.test(f) && fs.existsSync(f));
    const dirs = new Set(
      changed
        .filter((f) => f.startsWith(`${SKILLS_ROOT}/`))
        .map((f) => f.split("/").slice(0, 2).join("/")),
    );
    manifests = [...dirs].map(manifestOf).filter(Boolean);
  } else {
    files = listAll();
    manifests = allSkillDirs().map(manifestOf).filter(Boolean);
  }
} else if (args.length) {
  files = args.filter((f) => fs.existsSync(f));
  manifests = files.filter((f) => /(^|\/)manifest\.ya?ml$/.test(f));
} else {
  files = listAll();
  manifests = allSkillDirs().map(manifestOf).filter(Boolean);
}

let fails = 0;
let warns = 0;

for (const m of manifests) fails += checkGallery(m);

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
  `\nvalidate-skills: scanned ${files.length} doc(s), ${manifests.length} manifest gallery(s) — ${fails} FAIL, ${warns} WARN`,
);
if (fails > 0) {
  console.log(
    "BLOCKED: resolve FAILs (see publish-skill SKILL.md §6b / preflight-audit.sh check [7]).",
  );
  process.exit(1);
}
process.exit(0);
