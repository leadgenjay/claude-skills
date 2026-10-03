// Every HTTP call in both skills goes through request().
//
// LINKEDIN_LEADGEN_MOCK=<file.json>  serve responses from a JSON list instead of the network:
//   [{ "method": "GET", "urlPattern": "/rest/v1/li_alerts", "status": 200, "body": [...], "times": 1 }]
//   urlPattern is a JavaScript regular expression tested against the full URL. method is optional
//   (any method). The first matching entry wins; an entry with "times" stops matching after that
//   many uses in this process. An entry with "timeout": true throws the same error a request that
//   got no answer within timeoutMs throws. A request no entry matches throws: a mock never falls
//   through to the network.
// LINKEDIN_LEADGEN_OFFLINE=1         with no mock set, every request throws.
// LINKEDIN_LEADGEN_HTTP_LOG=<file>   append one JSON line per request (secrets in the query
//   string redacted, headers never written).

import fs from 'node:fs';

export const USER_AGENT = 'linkedin-lead-system/1.0';

export class HttpError extends Error {
  constructor(message, { method, url, cause, timeout = false } = {}) {
    super(message, { cause });
    this.name = 'HttpError';
    this.method = method;
    this.url = url;
    this.timeout = timeout; // no answer within timeoutMs
  }
}

function timeoutError(method, url, timeoutMs, cause) {
  return new HttpError(`${method} ${redactUrl(url)} got no answer within ${timeoutMs / 1000}s`,
    { method, url, cause, timeout: true });
}

const SECRET_PARAMS = /^(token|api_?key|apikey|key|access_token|secret)$/i;
const mockUses = new Map();

export function redactUrl(url) {
  try {
    const u = new URL(url);
    for (const name of [...u.searchParams.keys()]) {
      if (SECRET_PARAMS.test(name)) u.searchParams.set(name, 'REDACTED');
    }
    return u.toString();
  } catch {
    return url;
  }
}

function findMock(file, method, url) {
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new HttpError(`cannot read mock file ${file}: ${err.message}`, { method, url });
  }
  if (!Array.isArray(entries)) throw new HttpError(`mock file ${file} must hold a JSON list`, { method, url });
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.method && e.method.toUpperCase() !== method) continue;
    if (!new RegExp(e.urlPattern).test(url)) continue;
    const key = `${file}#${i}`;
    const used = mockUses.get(key) || 0;
    if (e.times !== undefined && used >= e.times) continue;
    mockUses.set(key, used + 1);
    return e;
  }
  return null;
}

function writeLog(entry) {
  const file = process.env.LINKEDIN_LEADGEN_HTTP_LOG;
  if (file) fs.appendFileSync(file, JSON.stringify(entry) + '\n', { mode: 0o600 });
}

// What the request log records for a body: strings as sent, form fields as an object
// (files as "[file name]"), raw bytes as their length.
function logBody(payload) {
  if (payload === undefined || payload === null) return undefined;
  if (typeof payload === 'string') return payload;
  if (payload instanceof URLSearchParams) return payload.toString();
  if (payload instanceof FormData) {
    const form = {};
    for (const [k, v] of payload.entries()) form[k] = typeof v === 'string' ? v : `[file ${v.name || 'blob'}]`;
    return { form };
  }
  return { bytes: payload.size ?? payload.byteLength ?? null };
}

function parseBody(text, contentType) {
  if (text === '') return null;
  if (/json/i.test(contentType || '') || /^[\s]*[[{"0-9tfn-]/.test(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

// Returns { status, body, headers } for any HTTP status. Throws HttpError only when no response
// arrives (offline, no mock match, network failure, timeout).
export async function request(method, url, { headers = {}, body, timeoutMs = 30000 } = {}) {
  method = method.toUpperCase();
  const mockFile = process.env.LINKEDIN_LEADGEN_MOCK;
  const hasHeader = (name) => Object.keys(sendHeaders).some((h) => h.toLowerCase() === name);
  const sendHeaders = { ...headers };
  if (!hasHeader('user-agent')) sendHeaders['User-Agent'] = USER_AGENT;
  let payload = body;
  // FormData, URLSearchParams, Blob and byte bodies go to fetch untouched (fetch sets their
  // Content-Type, including the multipart boundary); plain objects and arrays are sent as JSON.
  const passThrough = body instanceof FormData || body instanceof URLSearchParams
    || body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
  if (body !== undefined && body !== null && typeof body !== 'string' && !passThrough) {
    payload = JSON.stringify(body);
    if (!hasHeader('content-type')) sendHeaders['Content-Type'] = 'application/json';
  }
  const logBase = {
    ts: new Date().toISOString(),
    method,
    url: redactUrl(url),
    ua: Object.entries(sendHeaders).find(([h]) => h.toLowerCase() === 'user-agent')[1],
    body: logBody(payload),
  };

  if (mockFile) {
    const mock = findMock(mockFile, method, url);
    if (!mock) {
      writeLog({ ...logBase, mocked: true, status: null, error: 'no mock matched' });
      throw new HttpError(`no mock matched ${method} ${redactUrl(url)}`, { method, url });
    }
    if (mock.timeout) {
      writeLog({ ...logBase, mocked: true, status: null, error: 'TimeoutError' });
      throw timeoutError(method, url, timeoutMs);
    }
    const status = mock.status ?? 200;
    writeLog({ ...logBase, mocked: true, status });
    return { status, body: mock.body ?? null, headers: mock.headers ?? {} };
  }

  if (process.env.LINKEDIN_LEADGEN_OFFLINE === '1') {
    writeLog({ ...logBase, mocked: false, status: null, error: 'offline' });
    throw new HttpError(`offline mode: refused ${method} ${redactUrl(url)}`, { method, url });
  }

  // The timeout covers the whole exchange, body included: a stall while reading the body is a
  // timeout too, never a short or empty answer.
  let res;
  let text;
  try {
    res = await fetch(url, {
      method,
      headers: sendHeaders,
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    });
    text = await res.text();
  } catch (err) {
    writeLog({ ...logBase, mocked: false, status: res?.status ?? null, error: err.name });
    if (err.name === 'TimeoutError') throw timeoutError(method, url, timeoutMs, err);
    throw new HttpError(`${method} ${redactUrl(url)} failed: ${err.message}`, { method, url, cause: err });
  }
  writeLog({ ...logBase, mocked: false, status: res.status });
  return {
    status: res.status,
    body: parseBody(text, res.headers.get('content-type')),
    headers: Object.fromEntries(res.headers.entries()),
  };
}
