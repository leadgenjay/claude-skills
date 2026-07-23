#!/usr/bin/env node
// Self-contained client tooling for the listmonk-email-marketing skill.
// Node 18+ (built-in fetch). No dependencies. Talks to YOUR Listmonk instance via
// its API using an API user token (HTTP Basic Auth).
//
// Config (env):
//   LISTMONK_BASE_URL   e.g. https://mail-yourclient.consulti.ai
//   LISTMONK_API_USER   API username (e.g. client-api)
//   LISTMONK_API_TOKEN  API token (keep secret — never commit or paste in chat)
//
// Read commands are always safe. Write commands (subscriber-add, import,
// campaign-create, campaign-test, campaign-send) require --confirm (or an
// interactive "yes") before they touch the live instance.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

// A real browser User-Agent so a Cloudflare-proxied instance doesn't 1010-block us.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function cfg() {
  const baseUrl = process.env.LISTMONK_BASE_URL;
  const user = process.env.LISTMONK_API_USER;
  const token = process.env.LISTMONK_API_TOKEN;
  if (!baseUrl || !user || !token) {
    fail(
      "Missing config. Set LISTMONK_BASE_URL, LISTMONK_API_USER, LISTMONK_API_TOKEN " +
        "(Consulti provides these).",
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), user, token };
}

function authHeader({ user, token }) {
  return "Basic " + Buffer.from(`${user}:${token}`).toString("base64");
}

async function api(path, { method = "GET", body } = {}) {
  const c = cfg();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${c.baseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Authorization: authHeader(c),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
      fail(`API error: ${msg}`);
    }
    return json && typeof json === "object" && "data" in json ? json.data : json;
  } catch (e) {
    if (e && e.name === "AbortError") fail("Request timed out.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// --- tiny arg parser: `--flag value` and `--bool` --------------------------
function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, opts };
}

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

async function confirmWrite(opts, description) {
  if (opts.confirm) return true;
  process.stdout.write(`About to: ${description}\nProceed? type "yes": `);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question("", (a) => (rl.close(), r(a))));
  if (answer.trim().toLowerCase() !== "yes") {
    console.error("aborted (no changes made).");
    return false;
  }
  return true;
}

// --- CSV: minimal parser for a header row + email,name ---------------------
function parseCsv(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!rows.length) return [];
  const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  const nameIdx = header.indexOf("name");
  if (emailIdx === -1) fail('CSV must have an "email" column header.');
  return rows.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      email: (cols[emailIdx] || "").trim(),
      name: nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "",
    };
  });
}

// --- commands --------------------------------------------------------------
const commands = {
  async lists() {
    const d = await api("/api/lists?per_page=all");
    const arr = Array.isArray(d) ? d : d.results ?? [];
    out(arr.map((l) => ({ id: l.id, name: l.name, type: l.type, optin: l.optin, subscribers: l.subscriber_count })));
  },

  async templates() {
    const d = await api("/api/templates");
    const arr = Array.isArray(d) ? d : d.results ?? [];
    out(arr.map((t) => ({ id: t.id, name: t.name, type: t.type, is_default: t.is_default })));
  },

  async ["subscriber-add"](opts) {
    if (!opts.email || !opts.list) fail("need --email and --list <id>");
    if (!(await confirmWrite(opts, `add ${opts.email} to list ${opts.list}`))) return;
    const d = await api("/api/subscribers", {
      method: "POST",
      body: {
        email: opts.email,
        name: opts.name || opts.email.split("@")[0],
        status: "enabled",
        lists: [Number(opts.list)],
        preconfirm_subscriptions: true,
      },
    });
    out({ ok: true, id: d.id, email: d.email });
  },

  async import(opts) {
    if (!opts.list || !opts.file) fail("need --list <id> and --file <csv>");
    const rows = parseCsv(readFileSync(opts.file, "utf8"));
    if (!rows.length) fail("no rows in CSV");
    if (!(await confirmWrite(opts, `import ${rows.length} subscribers into list ${opts.list}`))) return;
    let ok = 0;
    const errors = [];
    for (const r of rows) {
      if (!r.email) continue;
      try {
        await api("/api/subscribers", {
          method: "POST",
          body: {
            email: r.email,
            name: r.name || r.email.split("@")[0],
            status: "enabled",
            lists: [Number(opts.list)],
            preconfirm_subscriptions: true,
          },
        });
        ok++;
      } catch (e) {
        errors.push({ email: r.email, error: String(e.message || e) });
      }
    }
    out({ imported: ok, failed: errors.length, errors: errors.slice(0, 10) });
    console.error(
      "Note: for large lists (10k+) use the Listmonk web UI → Subscribers → Import (bulk) instead.",
    );
  },

  async ["campaign-create"](opts) {
    if (!opts.name || !opts.subject || !opts.list || !opts.body) {
      fail("need --name, --subject, --list <id>, --body <file.html>");
    }
    const body = readFileSync(opts.body, "utf8");
    if (!(await confirmWrite(opts, `create draft campaign "${opts.name}" to list ${opts.list}`))) return;
    const payload = {
      name: opts.name,
      subject: opts.subject,
      lists: [Number(opts.list)],
      type: "regular",
      content_type: "html",
      body,
      messenger: "email",
    };
    if (opts.template) payload.template_id = Number(opts.template);
    const d = await api("/api/campaigns", { method: "POST", body: payload });
    out({ ok: true, id: d.id, name: d.name, status: d.status, note: "Draft created. Test it, then campaign-send." });
  },

  async campaigns() {
    const d = await api("/api/campaigns?per_page=all");
    const arr = Array.isArray(d) ? d : d.results ?? [];
    out(arr.map((c) => ({ id: c.id, name: c.name, status: c.status, sent: c.sent, to_send: c.to_send })));
  },

  async ["campaign-test"](opts, positional) {
    const id = positional[0];
    if (!id || !opts.to) fail("usage: campaign-test <id> --to you@example.com");
    if (!(await confirmWrite(opts, `send a TEST of campaign ${id} to ${opts.to}`))) return;
    await api(`/api/campaigns/${Number(id)}/test`, {
      method: "POST",
      body: { subscribers: [opts.to] },
    });
    out({ ok: true, tested: id, to: opts.to });
  },

  async ["campaign-send"](opts, positional) {
    const id = positional[0];
    if (!id) fail("usage: campaign-send <id>");
    if (!(await confirmWrite(opts, `START SENDING campaign ${id} to its whole list (real emails)`))) return;
    const d = await api(`/api/campaigns/${Number(id)}/status`, {
      method: "PUT",
      body: { status: "running" },
    });
    out({ ok: true, id: d.id, status: d.status });
  },

  async stats(_opts, positional) {
    const id = positional[0];
    if (id) {
      const c = await api(`/api/campaigns/${Number(id)}`);
      out({
        id: c.id,
        name: c.name,
        status: c.status,
        sent: c.sent,
        views: c.views,
        clicks: c.clicks,
        bounces: c.bounces,
      });
    } else {
      const d = await api("/api/dashboard/counts");
      out(d);
    }
  },

  help() {
    console.log(`listmonk.mjs — client tooling for the listmonk-email-marketing skill

Read (safe):
  lists
  templates
  campaigns
  stats [<campaign-id>]

Write (need --confirm):
  subscriber-add --email <e> [--name <n>] --list <id>
  import --list <id> --file <subscribers.csv>        (csv header: email,name)
  campaign-create --name <n> --subject <s> --list <id> [--template <id>] --body <file.html>
  campaign-test <id> --to <email>
  campaign-send <id>

Config (env): LISTMONK_BASE_URL, LISTMONK_API_USER, LISTMONK_API_TOKEN`);
  },
};

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const handler = commands[cmd] || (cmd ? null : commands.help);
  if (!handler) fail(`unknown command "${cmd}". Try: node listmonk.mjs help`);
  const { positional, opts } = parseArgs(rest);
  await handler(opts, positional);
}

main().catch((e) => fail(String(e && e.message ? e.message : e)));
