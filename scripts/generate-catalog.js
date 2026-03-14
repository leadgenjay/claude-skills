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

    // Get files — recursive for components, flat for others
    const files =
      type === "component"
        ? listFilesRecursive(itemDir)
        : fs.readdirSync(itemDir).filter((f) => !f.startsWith("."));

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
      hidden: manifest.hidden || undefined,
      bundledItems: manifest.bundledItems || undefined,
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
