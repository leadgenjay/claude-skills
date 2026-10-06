// Fake Unipile for wa.mjs tests: a loopback HTTP server driven by a route table,
// plus a runner that spawns the real CLI against it. Never touches the network.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WA = 'acct-wa-test-1';
export const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'wa.mjs');
// Distinctive enough that finding it in any output can only mean a leak.
export const TEST_KEY = 'unipile-test-key-not-real';

/**
 * routes: { 'GET /path?query': handler } where handler is a JSON-able value,
 * or (req, url, rawBody, hits) => ({ status, json } | { status, body, type }), sync or async.
 * Lookup tries the full path+query first, then the bare path.
 */
export async function fakeUnipile(routes, host = '127.0.0.1') {
  const hits = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      const url = new URL(req.url, 'http://x');
      const rel = url.pathname.replace(/^\/api\/v1\//, '');
      hits.push({ method: req.method, path: rel, query: url.search, key: req.headers['x-api-key'], body: raw });
      const h = routes[`${req.method} ${rel}${url.search}`] ?? routes[`${req.method} ${rel}`];
      if (h === undefined) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"error":"no route"}'); }
      const out = typeof h === 'function' ? await h(req, url, raw, hits) : { status: 200, json: h };
      if (out.body !== undefined) {
        res.writeHead(out.status ?? 200, { 'content-type': out.type ?? 'application/octet-stream' });
        return res.end(out.body);
      }
      res.writeHead(out.status ?? 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out.json));
    });
  });
  await new Promise((r) => server.listen(0, host, r));
  // A test that fails before close() must not leave this server holding the process open:
  // that turned a failing assertion into a run that never ended (2026-10-06).
  server.unref();
  const h = host.includes(':') ? `[${host}]` : host;
  const base = `http://${h}:${server.address().port}/api/v1`;
  return { base, hits, close: () => new Promise((r) => server.close(r)) };
}

export function tmpCache() { return mkdtempSync(join(tmpdir(), 'wa-test-')); }

/** Write a config file into a throwaway HOME at the default path, mode 600 unless told otherwise. */
export function writeConfig(home, keys, mode = 0o600) {
  const dir = join(home, '.config', 'whatsapp-skill');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, '.env');
  writeFileSync(file, Object.entries(keys).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  chmodSync(file, mode);
  return file;
}

/** The text field of a multipart form body, as the fake received it. */
export function formText(raw) {
  const m = raw.match(/name="text"\r\n\r\n([\s\S]*?)\r\n--/);
  return m ? m[1] : null;
}

/** Spawn the CLI asynchronously (spawnSync would block the fake server in this process). */
export function run(args, envOver = {}, home) { return runAt(CLI, args, envOver, home); }

/**
 * Same, for a copy of the CLI at another path. HOME is a throwaway folder (pass one to
 * seed a config file in it first), so no test reads a real config or writes a real cache.
 * An envOver value of undefined removes that variable. Rejects if the test API key shows
 * up anywhere in the output.
 */
export function runAt(cli, args, envOver = {}, home = tmpCache()) {
  const env = { PATH: process.env.PATH, HOME: home, UNIPILE_API_KEY: TEST_KEY, ...envOver };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      if ((stdout + stderr).includes(TEST_KEY)) return reject(new Error(`the API key appeared in the output of ${args.join(' ')}`));
      let json = null; try { json = JSON.parse(stdout); } catch { /* not JSON */ }
      resolve({ code, stdout, stderr, json, home });
    });
  });
}

export const testEnv = (base, cache) => ({ WA_TEST: '1', WA_API_BASE: base, WA_CACHE_DIR: cache, WA_ACCOUNT_ID: WA });

export const accountsOk = { items: [{ id: WA, type: 'WHATSAPP', name: '15550100000',
  sources: [{ id: `${WA}_MESSAGING`, status: 'OK' }] }] };

export const chat = (id, o = {}) => ({ id, type: 0, name: null, unread_count: 0, read_only: 0, account_id: WA,
  timestamp: '2026-10-06T12:00:00.000Z', provider_id: `${id}@s.whatsapp.net`, ...o });
export const group = (id, o = {}) => chat(id, { type: 1, name: `Group ${id}`, provider_id: `${id}@g.us`, ...o });
export const people = (...xs) => ({ items: xs });
export const me = { id: 'att-me', name: 'Alex Example', is_self: 1 };
