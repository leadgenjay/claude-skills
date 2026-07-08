#!/usr/bin/env node
// publish-blotato.mjs — publish a finished carousel to Instagram via the
// Blotato REST API. OPTIONAL: if BLOTATO_API_KEY isn't configured, this
// prints a manual-posting handoff instead of failing.
//
// Usage:
//   node scripts/publish-blotato.mjs --caption-file caption.txt --media "url1,url2,..." [--schedule <ISO8601>]
//   node scripts/publish-blotato.mjs --list-accounts
//
// Account: config.blotato.instagramAccountId (set by the setup interview).
// A feed carousel needs no media type flag. Success returns a submission id —
// verify at https://app.blotato.com/scheduled.

import { readFileSync, existsSync } from "node:fs";
import { getBlotatoKey, loadConfig } from "./lib/fal.mjs";

const API_BASE = "https://backend.blotato.com/v2";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const key = getBlotatoKey();

function manualHandoff(mediaUrls) {
  console.log("Blotato is not configured — manual posting handoff:");
  console.log("");
  console.log("1. Open Instagram (app or Meta Business Suite).");
  console.log("2. Create a new post and add the slides IN ORDER from these URLs:");
  (mediaUrls || []).forEach((u, i) => console.log(`   slide ${i + 1}: ${u}`));
  console.log("3. Paste the caption (no hashtags), publish, then paste the hashtag block as the FIRST COMMENT.");
  console.log("");
  console.log("To automate future posts: get an API key at https://blotato.com, then re-run the setup interview.");
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "blotato-api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Blotato API ${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

if (args["list-accounts"]) {
  if (!key) {
    console.error("BLOTATO_API_KEY not configured. Get one at https://blotato.com, add it via the setup interview.");
    process.exit(1);
  }
  const accounts = await api("/users/me/accounts");
  console.log(JSON.stringify(accounts, null, 2));
  process.exit(0);
}

if (!args["caption-file"] || !args.media) {
  console.error(
    "usage: node scripts/publish-blotato.mjs --caption-file <file> --media 'url1,url2,...' [--schedule <ISO8601>]",
  );
  process.exit(1);
}
if (!existsSync(args["caption-file"])) {
  console.error(`caption file not found: ${args["caption-file"]}`);
  process.exit(1);
}

const mediaUrls = String(args.media)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!key) {
  manualHandoff(mediaUrls);
  process.exit(0);
}

const config = loadConfig();
const accountId = args.account || config?.blotato?.instagramAccountId;
if (!accountId) {
  console.error(
    "No Instagram account id configured. Run with --list-accounts to find yours, then save it as blotato.instagramAccountId in config/config.json (or pass --account <id>).",
  );
  process.exit(1);
}

const caption = readFileSync(args["caption-file"], "utf8").trim();
const body = {
  post: {
    accountId: String(accountId),
    content: { text: caption, platform: "instagram", mediaUrls },
    target: { targetType: "instagram" },
  },
};
if (args.schedule) body.scheduledTime = args.schedule;

const result = await api("/posts", { method: "POST", body: JSON.stringify(body) });
const submissionId = result?.postSubmissionId ?? result?.id ?? null;
console.log(JSON.stringify({ status: "submitted", submissionId, scheduled: args.schedule || "immediate", result }, null, 2));
console.log("\nVerify at https://app.blotato.com/scheduled — then paste the hashtag block as the first comment.");
