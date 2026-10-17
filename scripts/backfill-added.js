#!/usr/bin/env node

/**
 * One-off: stamp `added: YYYY-MM-DD` on every catalog item whose manifest has
 * none, using the date of the folder's first commit. The line is appended as
 * text so comments and quoting in the manifest are left alone. generate-catalog.js
 * reads the field from the manifest because CI clones are shallow.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const yaml = require("js-yaml");

const ROOT_DIR = path.join(__dirname, "..");
const DIRECTORIES = ["skills", "commands", "agents", "components"];
const MAIN_FILES = [
  "SKILL.md", "skill.md", "command.md", "COMMAND.md",
  "agent.md", "AGENT.md", "README.md", "readme.md",
];

function git(args) {
  return execFileSync("git", ["-C", ROOT_DIR, ...args], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function firstCommitDate(rel) {
  // Earliest add of anything under the folder; fall back to any commit touching it.
  let dates = git(["log", "--diff-filter=A", "--format=%as", "--", rel]);
  if (dates.length === 0) dates = git(["log", "--format=%as", "--", rel]);
  return dates.sort()[0];
}

let changed = 0;
const skipped = [];

for (const dirName of DIRECTORIES) {
  const baseDir = path.join(ROOT_DIR, dirName);
  if (!fs.existsSync(baseDir)) continue;
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const dir = path.join(baseDir, entry.name);
    if (!MAIN_FILES.some((f) => fs.existsSync(path.join(dir, f)))) continue;

    const rel = `${dirName}/${entry.name}`;
    const existing = ["manifest.yaml", "manifest.yml"]
      .map((f) => path.join(dir, f))
      .find((p) => fs.existsSync(p));
    const file = existing || path.join(dir, "manifest.yaml");
    const text = existing ? fs.readFileSync(file, "utf8") : "";

    if (existing && (yaml.load(text) || {}).added) continue;
    const date = firstCommitDate(rel);
    if (!date) {
      skipped.push(`${rel}: no git history`);
      continue;
    }
    const sep = text && !text.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(file, `${text}${sep}added: ${date}\n`);
    changed++;
    console.log(`${existing ? "~" : "+"} ${rel}: ${date}${existing ? "" : " (new manifest)"}`);
  }
}

console.log(`\n${changed} manifests changed, ${skipped.length} skipped`);
skipped.forEach((s) => console.log(`  skipped ${s}`));
