// Spend caps. reserveSpend() runs before every paid call; the cap check and the li_runs row are
// one SQL function (reserve_spend), so two overlapping runs cannot both pass.

import { loadConfig } from './config.mjs';
import { rpc } from './db.mjs';

const usd = (n) => `$${Number(n).toFixed(2)}`;
const unitUsd = (n) => `$${Number(n).toFixed(4).replace(/(\.\d\d\d*?)0+$/, '$1')}`;

// Prints the estimate to stderr, then reserves it. Returns { ok: true, runId, estUsd } or
// { ok: false, reason: 'per_run_cap' | 'total_cap', runId, estUsd, spentUsd }.
// A refusal means the caller must not make the paid call and should exit non-zero.
export async function reserveSpend({ step, actor, units, unitPriceUsd, config = loadConfig() }) {
  if (!Number.isFinite(units) || units < 0) throw new Error(`reserveSpend: units must be a number >= 0`);
  if (!Number.isFinite(unitPriceUsd) || unitPriceUsd < 0) throw new Error(`reserveSpend: unitPriceUsd must be a number >= 0`);
  const estUsd = Math.round(units * unitPriceUsd * 10000) / 10000;
  process.stderr.write(`${step}: ${actor}, ${units} units at ${unitUsd(unitPriceUsd)} each, estimated ${usd(estUsd)}\n`);

  const res = await rpc('reserve_spend', {
    p_step: step,
    p_actor: actor,
    p_est: estUsd,
    p_per_run_cap: config.per_run_cap_usd,
    p_total_cap: config.total_cap_usd,
    p_units: units,
  });
  if (res && res.ok === true) return { ok: true, runId: res.run_id, estUsd };
  if (!res || (res.reason !== 'per_run_cap' && res.reason !== 'total_cap')) {
    throw new Error(`reserve_spend returned an unexpected answer: ${JSON.stringify(res)}`);
  }
  const why = res.reason === 'per_run_cap'
    ? `the estimate ${usd(estUsd)} is over the per-run cap of ${usd(config.per_run_cap_usd)}`
    : `${usd(res.spent_usd)} already spent plus ${usd(estUsd)} would pass the total cap of ${usd(config.total_cap_usd)}`;
  process.stderr.write(`Refused, nothing was run: ${why}.\n`);
  return { ok: false, reason: res.reason, runId: res.run_id, estUsd, spentUsd: Number(res.spent_usd) };
}

// actualUsd null keeps the estimate counting toward the total (a crashed or unknown-cost run).
export async function settleSpend(runId, actualUsd, error = null) {
  await rpc('settle_spend', { p_run_id: runId, p_actual: actualUsd ?? null, p_error: error });
}
