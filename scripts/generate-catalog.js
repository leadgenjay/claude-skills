#!/usr/bin/env node

/**
 * Generate catalog.json from skills, commands, agents, and components directories
 *
 * This script is run by GitHub Actions on every push to regenerate
 * the catalog that powers the Skills Marketplace.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT_DIR = path.join(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT_DIR, "catalog.json");

const DIRECTORIES = {
  skill: "skills",
  command: "commands",
  agent: "agents",
  component: "components",
};

const MAIN_FILES = {
  skill: ["SKILL.md", "skill.md"],
  command: ["command.md", "COMMAND.md"],
  agent: ["agent.md", "AGENT.md"],
  component: ["README.md", "readme.md"],
};

function findMainFile(dir, type) {
  const patterns = MAIN_FILES[type];
  for (const pattern of patterns) {
    const filePath = path.join(dir, pattern);
    if (fs.existsSync(filePath)) {
      return pattern;
    }
  }
  // Fallback to first .md file
  const files = fs.readdirSync(dir);
  return files.find((f) => f.endsWith(".md")) || null;
}

function extractDescription(content) {
  // Try to extract first paragraph after any heading
  const lines = content.split("\n");
  let foundHeading = false;
  let description = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      foundHeading = true;
      continue;
    }
    if (foundHeading && line.trim()) {
      // Skip code blocks
      if (line.startsWith("```")) break;
      // Skip lists
      if (line.match(/^[-*]\s/)) break;
      description.push(line.trim());
      if (description.join(" ").length > 150) break;
    }
    if (foundHeading && !line.trim() && description.length > 0) {
      break;
    }
  }

  const text = description.join(" ").slice(0, 200);
  return text || "No description available";
}

function parseManifest(dir) {
  const manifestPath = path.join(dir, "manifest.yaml");
  const manifestPathYml = path.join(dir, "manifest.yml");

  let manifest = {};

  if (fs.existsSync(manifestPath)) {
    manifest = yaml.load(fs.readFileSync(manifestPath, "utf8")) || {};
  } else if (fs.existsSync(manifestPathYml)) {
    manifest = yaml.load(fs.readFileSync(manifestPathYml, "utf8")) || {};
  }

  return manifest;
}

/**
 * Recursively list all files in a directory, returning paths relative to baseDir.
 * Used for component type which has nested subdirectories.
 */
function listFilesRecursive(dir, base = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(path.join(dir, entry.name), relative));
    } else {
      files.push(relative);
    }
  }
  return files;
}

// jsDelivr, not raw.githubusercontent.com: raw serves mp4 as
// application/octet-stream, which Safari refuses to play.
const GALLERY_CDN = "https://cdn.jsdelivr.net/gh/leadgenjay/claude-skills@main";

/**
 * The manifest's optional `gallery:` list, with each path turned into an
 * absolute CDN URL for the marketplace page. validate-skills.js has already
 * checked that every path sits under the item's gallery/ folder.
 */
function toGallery(entries, itemPath) {
  if (!Array.isArray(entries) || entries.length === 0) return undefined;
  const url = (rel) => `${GALLERY_CDN}/${path.posix.join(itemPath, rel)}`;
  return entries.map((g) => {
    const out = { type: g.type, src: url(g.src) };
    if (g.poster) out.poster = url(g.poster);
    if (g.caption) out.caption = g.caption;
    return out;
  });
}

/**
 * The manifest's optional `added:` date. js-yaml parses an unquoted date into
 * a Date, so accept that and emit YYYY-MM-DD; anything else is dropped.
 */
function toAdded(value, id) {
  if (value === undefined || value === null) return undefined;
  const text =
    value instanceof Date
      ? Number.isNaN(value.getTime())
        ? "Invalid Date"
        : value.toISOString().slice(0, 10)
      : String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = new Date(`${text}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text) {
      return text;
    }
  }
  console.warn(`  ! ${id}: ignoring invalid added "${text}" (want YYYY-MM-DD)`);
  return undefined;
}

function processDirectory(type) {
  const dirName = DIRECTORIES[type];
  const baseDir = path.join(ROOT_DIR, dirName);

  if (!fs.existsSync(baseDir)) {
    console.log(`Directory ${dirName}/ not found, skipping`);
    return [];
  }

  const items = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const itemDir = path.join(baseDir, entry.name);
    const mainFile = findMainFile(itemDir, type);

    if (!mainFile) {
      console.log(`No main file found for ${entry.name}, skipping`);
      continue;
    }

    const manifest = parseManifest(itemDir);
    const mainContent = fs.readFileSync(path.join(itemDir, mainFile), "utf8");

    // Recursively list every file under the item dir. Skills/commands/agents
    // can have nested `references/`, `scripts/`, `evals/` subdirectories — a
    // non-recursive readdir would emit those as bare directory names, which
    // the install script then treats as file paths (curl GETs the dir URL,
    // GitHub returns plain-text "404: Not Found", and that body lands on
    // disk as a corrupt file). Components were always recursive; this aligns
    // skills/commands/agents with the same behavior.
    //
    // gallery/ is display-only marketplace media. It stays out of files[]
    // because install.sh downloads every entry there to the member's machine.
    const files = listFilesRecursive(itemDir).filter(
      (f) => !f.startsWith("gallery/"),
    );

    const item = {
      id: entry.name,
      type,
      name: manifest.name || entry.name,
      description: manifest.description || extractDescription(mainContent),
      categories: manifest.categories || [],
      tags: manifest.tags || [],
      icon: manifest.icon || undefined,
      path: `${dirName}/${entry.name}`,
      files,
      version: manifest.version || undefined,
      composesWell: manifest.composesWell || undefined,
      kind: manifest.kind || undefined,
      bundledItems: manifest.bundledItems || undefined,
      hidden: manifest.hidden || undefined,
      // Operator-authored bash that runs after the marketplace install.sh
      // route downloads this item's files (e.g. CLI bootstrap for `notes`).
      // Honored by Web-Designer's install.sh generator. Failure is non-fatal.
      postInstall: manifest.postInstall || undefined,
      gallery: toGallery(manifest.gallery, `${dirName}/${entry.name}`),
      featured: manifest.featured === true ? true : undefined,
      added: toAdded(manifest.added, entry.name),
    };

    // Remove undefined values
    Object.keys(item).forEach((key) => {
      if (item[key] === undefined) {
        delete item[key];
      }
    });

    items.push(item);
    console.log(`  + ${type}: ${entry.name} (${files.length} files)`);
  }

  return items;
}

function main() {
  console.log("Generating catalog.json...\n");

  const items = [
    ...processDirectory("skill"),
    ...processDirectory("command"),
    ...processDirectory("agent"),
    ...processDirectory("component"),
  ];

  const catalog = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    items,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2));

  console.log(`\nGenerated catalog with ${items.length} items`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
