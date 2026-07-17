#!/usr/bin/env node

/**
 * audit-catalog-parity.js — daily drift audit between the LIVE marketplace
 * catalog (https://leadgenjay.com/api/skills) and this repo's branch trees.
 *
 * Companion to Web-Designer's build-time `validate-catalog-parity.ts` (which
 * blocks catalog EDITS that don't match a branch). This audit catches the
 * reverse direction: files pushed to a content branch (LGJ-exclusive,
 * LGJ-n8n-skills, …) without updating the supplementary catalog — the drift
 * that shipped gohighlevel-cli as a 2-of-40-files doc shell to a paying
 * customer (2026-07-17).
 *
 * For every catalog item on a non-main branch:
 *   - file in the branch dir but not in files[] → customers don't get it
 *   - file in files[] but absent from the branch → installs a 404 body
 * Either direction fails the run (GitHub emails on workflow failure).
 *
 * main-branch items are skipped — catalog.json is auto-generated for those.
 * Transient false positives are possible in the window between a branch push
 * and the Web-Designer deploy that updates the catalog; a failure that
 * self-resolves on the next run is that window, not a real drift.
 *
 * Usage: GITHUB_TOKEN=... node scripts/audit-catalog-parity.js
 */

const CATALOG_URL = "https://leadgenjay.com/api/skills";
const REPO = process.env.GITHUB_REPOSITORY || "leadgenjay/claude-skills";

// id → reason. Known-incomplete items the operator chose to leave.
const KNOWN_BAD_ALLOWLIST = {
  "demo-imsg":
    "ships 2/12 files (renderer unlisted) — Jay 2026-07-17: leave as-is",
};

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "audit-catalog-parity",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const catalog = await fetchJson(CATALOG_URL);
  const branchItems = catalog.items.filter(
    (i) => (i.branch || "main") !== "main",
  );

  const trees = new Map();
  for (const branch of new Set(branchItems.map((i) => i.branch))) {
    const data = await fetchJson(
      `https://api.github.com/repos/${REPO}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      headers,
    );
    if (data.truncated) throw new Error(`tree for ${branch} truncated`);
    trees.set(
      branch,
      new Set(data.tree.filter((n) => n.type === "blob").map((n) => n.path)),
    );
  }

  const failures = [];
  const waived = [];
  let checked = 0;

  for (const item of branchItems) {
    checked += 1;
    const tree = trees.get(item.branch);
    // Package/bundle entries (or entries rooted at the branch top) list a
    // deliberate subset — only the ghost direction applies.
    const subsetOnly = item.kind === "package" || !item.path;
    const prefix = item.path ? `${item.path}/` : "";
    const branchFiles = new Set(
      [...tree]
        .filter((p) => (prefix ? p.startsWith(prefix) : true))
        .map((p) => p.slice(prefix.length)),
    );
    const listed = new Set(item.files);
    const missing = subsetOnly
      ? []
      : [...branchFiles].filter((f) => !listed.has(f)).sort();
    const ghost = [...listed].filter((f) => !branchFiles.has(f)).sort();
    if (!missing.length && !ghost.length) continue;

    const detail = [
      missing.length
        ? `  on branch but MISSING from files[] (won't install): ${missing.join(", ")}`
        : "",
      ghost.length
        ? `  in files[] but NOT on branch (installs a 404 body): ${ghost.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (KNOWN_BAD_ALLOWLIST[item.id]) {
      waived.push(`${item.id} (${KNOWN_BAD_ALLOWLIST[item.id]})`);
      continue;
    }
    failures.push(`${item.id} @ ${item.branch}:${item.path}\n${detail}`);
  }

  if (waived.length) console.log(`waived known-bad: ${waived.join("; ")}`);
  if (failures.length) {
    console.error(
      `FAIL — ${failures.length} live catalog entr(ies) out of parity:\n\n${failures.join("\n\n")}\n`,
    );
    console.error(
      "Fix: regenerate files[] in Web-Designer's supplementary catalog from " +
        "`git ls-tree -r <branch> --name-only -- <path>` and deploy. " +
        "If this run raced a just-pushed branch update, the next run self-resolves.",
    );
    process.exit(1);
  }
  console.log(`OK — ${checked} branch-hosted catalog entr(ies) match their trees`);
}

main().catch((err) => {
  console.error(`audit crashed: ${err.stack || err}`);
  process.exit(1);
});
