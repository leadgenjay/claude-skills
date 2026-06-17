// Write-safety guard for destructive ad-platform operations.
//
// Context: a 2026-05-26 GoHighLevel incident wiped 9,068 tags off 897 contacts
// via an unguarded write. Every create/update/pause/delete command in these
// CLIs must route its payload through requireConfirm() so that:
//   - default (no flag): prints the payload and REFUSES to send (safe by default)
//   - --dry-run:         prints the payload and returns false (never sends)
//   - --confirm:         returns true (caller proceeds with the API call)

import type { Command } from "commander";
import { printJson } from "./output";

export interface WriteOpts {
  confirm?: boolean;
  dryRun?: boolean;
}

// Attach the standard --confirm / --dry-run flags to a write command.
export function addWriteFlags(cmd: Command): Command {
  return cmd
    .option("--confirm", "Actually perform the write (required for any mutation)")
    .option("--dry-run", "Print the payload that would be sent, then stop");
}

// Gate a mutation. Returns true only when --confirm is present.
// `action` is a human label (e.g. "create campaign"); `payload` is printed for review.
export function requireConfirm(opts: WriteOpts, action: string, payload: unknown): boolean {
  console.error(`\n${opts.dryRun ? "[dry-run] " : ""}about to ${action}:`);
  printJson(payload);

  if (opts.dryRun) {
    console.error("\n[dry-run] nothing sent.");
    return false;
  }
  if (!opts.confirm) {
    console.error(
      `\nrefusing to ${action} without --confirm. Re-run with --confirm to proceed, or --dry-run to preview only.`,
    );
    process.exit(1);
  }
  return true;
}
