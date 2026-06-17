// Shared output helpers: JSON dump or auto-width ASCII table.
// Copied from cli/kit/lib/output.ts so the ad-platform CLIs format identically.

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(rows: Record<string, unknown>[], columns?: string[]): void {
  if (rows.length === 0) {
    console.log("(no results)");
    return;
  }
  const cols = columns ?? Object.keys(rows[0]);
  const data = rows.map((r) => {
    const out: Record<string, string> = {};
    for (const c of cols) {
      const v = (r as Record<string, unknown>)[c];
      out[c] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    return out;
  });
  const widths: Record<string, number> = {};
  for (const c of cols) widths[c] = c.length;
  for (const r of data) {
    for (const c of cols) {
      if (r[c].length > widths[c]) widths[c] = r[c].length;
    }
  }
  console.log(cols.map((c) => c.padEnd(widths[c])).join("  "));
  console.log(cols.map((c) => "-".repeat(widths[c])).join("  "));
  for (const r of data) {
    console.log(cols.map((c) => r[c].padEnd(widths[c])).join("  "));
  }
}

// Routes a result to JSON or table. Arrays render as a table (unless --json),
// single objects always render as JSON.
export function handleOutput(
  data: unknown,
  opts: { json?: boolean; columns?: string[] },
): void {
  if (opts.json) {
    printJson(data);
    return;
  }
  if (Array.isArray(data)) {
    printTable(data as Record<string, unknown>[], opts.columns);
  } else {
    printJson(data);
  }
}

export function exitWithError(err: unknown): never {
  if (err instanceof Error) {
    console.error("error:", err.message);
    if (process.env.DEBUG) console.error(err.stack);
  } else {
    console.error("error:", err);
  }
  process.exit(1);
}
