// Apify runs for the prospector. Every run: print the estimate, reserve it against the caps in
// Supabase (reserve_spend refuses over-cap runs before any Apify call), start the run with Apify's
// own maxItems and maxTotalChargeUsd caps so it cannot exceed the estimate, wait on that run id,
// then settle with the cost from that run's record.

import { request } from './lib/http.mjs';
import { reserveSpend, settleSpend } from './lib/spend.mjs';

export const APIFY_BASE = 'https://api.apify.com/v2';

// Actor ids in Apify's URL form (username~actor).
export const POST_SEARCH_ACTOR = 'harvestapi~linkedin-post-search';
export const POST_COMMENTS_ACTOR = 'harvestapi~linkedin-post-comments';

// Unit prices, SILVER tier, from the Apify store on 2026-10-03.
export const POST_SEARCH_PRICE_PER_POST_USD = 0.00175;
export const POST_COMMENTS_PRICE_PER_COMMENT_USD = 0.002;
export const POST_COMMENTS_MAIN_PROFILE_PRICE_USD = 0.002;
// A comment with main-profile enrichment, which is how scrape-commenters always runs it.
export const COMMENT_WITH_PROFILE_PRICE_USD = POST_COMMENTS_PRICE_PER_COMMENT_USD + POST_COMMENTS_MAIN_PROFILE_PRICE_USD;

export class ApifyError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApifyError';
    this.status = status;
    this.body = body;
    this.auth = status === 401 || status === 403;
  }
}

export function estimateCost(units, unitPriceUsd) {
  return Math.round(units * unitPriceUsd * 10000) / 10000;
}

export function formatEstimate({ actor, units, unitPriceUsd }) {
  const est = estimateCost(units, unitPriceUsd);
  return `${actor}: ${units} units x $${unitPriceUsd} = $${est.toFixed(2)} estimated`;
}

// Largest unit count that fits under a per-run cap, for the "split into batches" suggestion.
export function unitsThatFit(capUsd, unitPriceUsd) {
  return Math.max(0, Math.floor((capUsd + 1e-9) / unitPriceUsd));
}

function token() {
  const t = process.env.APIFY_TOKEN;
  if (!t) throw new ApifyError('APIFY_TOKEN is not set in .env', 0, null);
  return t;
}

async function apify(method, path, body) {
  const res = await request(method, `${APIFY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body,
    timeoutMs: 300_000,
  });
  if (res.status < 200 || res.status >= 300) {
    const what = res.status === 401 || res.status === 403 ? 'Apify refused the token' : 'Apify request failed';
    throw new ApifyError(`${what}: ${method} ${path} -> HTTP ${res.status}`, res.status, res.body);
  }
  return res.body;
}

export async function apifyMe() {
  return apify('GET', '/users/me');
}

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);
export const RUN_DEADLINE_MS = 30 * 60 * 1000;
const WAIT_SECS = 60; // Apify holds each poll open up to this long, so the loop does not spin

const finite = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Pay-per-event charges from the run record.
// UNVERIFIED body shape — build step 3 confirms against a real run record. Assumed:
// chargedEventCounts {event: count} priced by pricingInfo.pricingPerEvent.actorChargeEvents[event]
// .eventPriceUsd, or a ready total in chargedEventsTotalUsd / totalChargeUsd / pricingInfo.totalChargeUsd.
export function eventChargeUsd(run) {
  const direct = finite(run?.chargedEventsTotalUsd) ?? finite(run?.totalChargeUsd) ?? finite(run?.pricingInfo?.totalChargeUsd);
  const counts = run?.chargedEventCounts;
  const prices = run?.pricingInfo?.pricingPerEvent?.actorChargeEvents;
  let fromCounts = null;
  if (counts && typeof counts === 'object' && prices && typeof prices === 'object') {
    fromCounts = 0;
    for (const [event, n] of Object.entries(counts)) {
      fromCounts += (finite(n) ?? 0) * (finite(prices[event]?.eventPriceUsd) ?? 0);
    }
  }
  if (direct === null && fromCounts === null) return null;
  return Math.max(direct ?? 0, fromCounts ?? 0);
}

// What a run is taken to have cost: the largest of Apify's usage figure, its event charges, and
// items returned x unit price (the unit price already includes profile enrichment). usageTotalUsd
// may leave out pay-per-event charges, so it is never trusted alone. Rounded to 1/10000 of a dollar.
export function chargedUsd(run, itemCount, unitPriceUsd) {
  const v = Math.max(finite(run?.usageTotalUsd) ?? 0, eventChargeUsd(run) ?? 0, estimateCost(itemCount, unitPriceUsd));
  return Math.round(v * 10000) / 10000;
}

// Runs one actor under the spend caps. Returns {ok:true, items, estUsd, actualUsd} or
// {ok:false, reason} when the reservation was refused (no Apify request was made).
// reserveSpend prints the actor, unit price, units and estimate before deciding.
// Apify enforces the caps itself (maxItems and maxTotalChargeUsd on the run), and cost and items
// are read from THIS run's record. A run still going at the deadline is aborted and never re-run.
export async function runActor({ step, actor, input, units, unitPriceUsd, deadlineMs = RUN_DEADLINE_MS, waitSecs = WAIT_SECS }) {
  if (!Number.isInteger(units) || units <= 0) throw new Error(`runActor: units must be a positive integer, got ${units}`);
  const estUsd = estimateCost(units, unitPriceUsd);

  const reservation = await reserveSpend({ step, actor, units, unitPriceUsd });
  if (!reservation?.ok) return { ok: false, reason: reservation?.reason ?? 'refused', estUsd };

  // Every failure below settles at least at the estimate, so a lost run still counts.
  const settleFailed = async (run, why) => {
    await settleSpend(reservation.runId, Math.max(chargedUsd(run, 0, unitPriceUsd), estUsd), why).catch(() => {});
  };

  let run;
  try {
    run = (await apify('POST', `/acts/${actor}/runs?maxItems=${units}&maxTotalChargeUsd=${estUsd}`,
      { ...input, maxItems: units }))?.data;
  } catch (err) {
    await settleFailed(null, String(err.message ?? err));
    throw err;
  }
  if (!run?.id) {
    await settleFailed(null, 'Apify returned no run id');
    throw new ApifyError('Apify started no run (no run id in the answer)', 0, null);
  }

  const deadline = Date.now() + deadlineMs;
  try {
    while (!TERMINAL.has(run?.status)) {
      if (Date.now() >= deadline) {
        await apify('POST', `/actor-runs/${run.id}/abort`).catch(() => {});
        await settleFailed(run, 'timed out waiting; aborted');
        throw new ApifyError(`Apify run ${run.id} was still going after ${Math.round(deadlineMs / 60000)} minutes, so it `
          + 'was aborted. It is not re-run automatically; it counts at its estimate.', 0, null);
      }
      run = (await apify('GET', `/actor-runs/${run.id}?waitForFinish=${waitSecs}`))?.data ?? run;
    }
  } catch (err) {
    if (!(err instanceof ApifyError) || err.status !== 0) {
      await apify('POST', `/actor-runs/${run.id}/abort`).catch(() => {});
      await settleFailed(run, String(err.message ?? err));
    }
    throw err;
  }

  // ABORTED and TIMED-OUT (including a run Apify stopped at maxTotalChargeUsd) still hold paid
  // results: read them and use what came back. Only FAILED, or a failed dataset read, throws.
  if (run.status === 'FAILED') {
    await settleFailed(run, `run ${run.status}`);
    throw new ApifyError(`Apify run ${run.id} ended ${run.status}; it is not re-run automatically.`, 0, null);
  }

  let items;
  try {
    items = await apify('GET', `/datasets/${run.defaultDatasetId}/items?clean=true&limit=${units}`);
  } catch (err) {
    await settleFailed(run, String(err.message ?? err));
    throw err;
  }
  items = Array.isArray(items) ? items : [];
  const actualUsd = chargedUsd(run, items.length, unitPriceUsd);
  const partial = run.status === 'SUCCEEDED' ? null : `partial: run ${run.status}, ${items.length} items kept`;
  await settleSpend(reservation.runId, actualUsd, partial);
  if (partial) process.stderr.write(`Apify run ${run.id} ended ${run.status}; using the ${items.length} items it returned.\n`);
  return { ok: true, items, estUsd, actualUsd, apifyRunId: run.id, partial: Boolean(partial) };
}

// ---- input builders ----------------------------------------------------------------------------
// UNVERIFIED input field values (postedLimit, sortBy, profileScraperMode enums) — build step 3
// confirms against the actor's input schema. The field NAMES are from the store listing.

export function postSearchInput({ keywords, authorUrls, maxPosts }) {
  const input = { maxPosts, postedLimit: 'month', sortBy: 'date' };
  if (keywords?.length) input.searchQueries = keywords;
  if (authorUrls?.length) input.authorUrls = authorUrls;
  return input;
}

export function postCommentsInput({ postUrls, maxItems }) {
  return { posts: postUrls, maxItems, profileScraperMode: 'main' };
}
