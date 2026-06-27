/**
 * Calendar Routing — pure routing evaluator.
 *
 * Given a lead's answers and a page's RoutingConfig, decide the outcome:
 * assign to a salesperson, or disqualify. No side effects — unit-testable and
 * exercised by scripts/validate-calendar-routing-config.ts. Mirrors the
 * pure-function style of evaluateFilter() in src/lib/sales/calculators.ts.
 */

import type {
  Answers,
  CountryScoring,
  RoutingConfig,
  RoutingOutcome,
  RoutingRule,
  RoutingScoring,
  Salesperson,
} from "./types";

const DEFAULT_COUNTRY_ANSWER_KEY = "__country_iso";

function conditionMatches(answers: Answers, questionId: string, accepted: ReadonlyArray<string>): boolean {
  const answer = answers[questionId];
  if (answer == null || answer === "") return false;
  return accepted.includes(answer);
}

function ruleMatches(answers: Answers, rule: RoutingRule): boolean {
  // An empty `when` never matches — a rule with no conditions is a config error,
  // not a catch-all (use defaultOutcome for the fallback).
  if (rule.when.length === 0) return false;
  const mode = rule.matchMode ?? "all";
  const results = rule.when.map((c) => conditionMatches(answers, c.questionId, c.in));
  return mode === "all" ? results.every(Boolean) : results.some(Boolean);
}

/** Points for the lead's country tier (tier 3 when unlisted / not captured). */
function countryTierPoints(answers: Answers, country: CountryScoring): number {
  const iso = answers[country.answerKey ?? DEFAULT_COUNTRY_ANSWER_KEY];
  if (iso && country.tier1.includes(iso)) return country.tier1Points;
  if (iso && country.tier2.includes(iso)) return country.tier2Points;
  return country.tier3Points;
}

/**
 * Sum the weighted lead score across the configured answer points + country
 * tier. Pure — exercised by validate-calendar-routing-config.ts.
 */
export function scoreLead(answers: Answers, scoring: RoutingScoring): number {
  let total = 0;
  for (const [questionId, valuePoints] of Object.entries(scoring.points)) {
    const answer = answers[questionId];
    if (answer != null && answer !== "" && valuePoints[answer] != null) {
      total += valuePoints[answer];
    }
  }
  if (scoring.country) total += countryTierPoints(answers, scoring.country);
  return total;
}

/** Map a total score to an outcome via ordered (high→low) bands. */
export function scoreToOutcome(score: number, scoring: RoutingScoring, fallback: RoutingOutcome): RoutingOutcome {
  for (const band of scoring.bands) {
    if (score >= band.minScore) return band.outcome;
  }
  return fallback;
}

/**
 * Evaluate the routing for the lead's answers. Hard `rules` first (ordered,
 * first match wins), then the lead-`scoring` band, then the config's
 * `defaultOutcome` when nothing else catches.
 */
export function evaluateRouting(answers: Answers, config: RoutingConfig): RoutingOutcome {
  for (const rule of config.rules) {
    if (ruleMatches(answers, rule)) return rule.outcome;
  }
  if (config.scoring) {
    return scoreToOutcome(scoreLead(answers, config.scoring), config.scoring, config.defaultOutcome);
  }
  return config.defaultOutcome;
}

/**
 * Volume-balanced closer pick for a QUALIFIED lead — even volume + quality tilt + availability gate.
 *
 *  1. Preference order = the score's band winner first (tyler for ≥10, ian for
 *     7–9, jonathan_w for 3–6), then the remaining closers in descending band
 *     order. This is the quality tilt (a tie-break only).
 *  2. Availability is an OVERFLOW GATE, not a weight. The eligible pool = closers
 *     with `capacities[id] >= minSlots` open slots. If the pool is empty (every
 *     closer below minSlots), fall back to all closers (never fail to route).
 *  3. Volume is EQUAL across the eligible pool: `deficit = (1 / |pool|) × (totalLoad + 1) − load`.
 *     Pick the highest-preference closer whose deficit is within
 *     `slack = maxSpreadPct × avgLoad` of the top deficit.
 *
 * Behavior:
 *  - No availability data or all capacities equal → pool = all closers, deficit ranks by
 *    least-loaded → even volume, quality tilt (identical to simple count-only balancer).
 *  - Tyler full (0 slots < minSlots) → excluded → his top lead overflows to Ian.
 *  - All closers full → fall back to all closers (gate disabled; better to book full than fail).
 *
 * Pure — exercised by scripts/validate-calendar-routing-config.ts.
 */
export function balancedAssign(
  score: number,
  scoring: RoutingScoring,
  loads: Record<string, number>,
  closerIds: ReadonlyArray<string>,
  opts: { maxSpreadPct?: number; capacities?: Record<string, number>; minSlots?: number } = {}
): string {
  const maxSpreadPct = opts.maxSpreadPct ?? 0.15;
  const minSlots = opts.minSlots ?? 1;

  // Assign bands targeting a listed closer, descending by minScore (tyler→ian→jonathan_w).
  const banded = scoring.bands
    .filter((b) => b.outcome.type === "assign" && closerIds.includes(b.outcome.salespersonId))
    .slice()
    .sort((a, b) => b.minScore - a.minScore)
    .map((b) => (b.outcome as { type: "assign"; salespersonId: string }).salespersonId);

  // Preferred = highest band the score reaches; fall back to the lowest banded closer.
  const preferred =
    scoring.bands.find(
      (b) => score >= b.minScore && b.outcome.type === "assign" && closerIds.includes(b.outcome.salespersonId)
    )?.outcome as { type: "assign"; salespersonId: string } | undefined;
  const preferredId = preferred?.salespersonId ?? banded[banded.length - 1] ?? closerIds[0];

  // Full preference order: preferred first, then remaining banded, then any
  // listed closer not covered by a band (defensive — keeps every closer reachable).
  const order: string[] = [];
  for (const id of [preferredId, ...banded, ...closerIds]) {
    if (id && !order.includes(id)) order.push(id);
  }

  // Availability as an overflow GATE: closers with >= minSlots are eligible.
  // If no capacity data (GHL unreadable) → pool = all closers (equal balance fallback).
  // If capacity data exists but filtered pool is empty → fall back to all closers.
  const caps = opts.capacities ?? {};
  const hasCapacity = closerIds.some((id) => typeof caps[id] === "number");
  let pool = closerIds;
  if (hasCapacity) {
    pool = closerIds.filter((id) => (caps[id] ?? 0) >= minSlots);
    if (pool.length === 0) {
      // All closers below minSlots — fall back to all closers (never route to nobody).
      pool = [...closerIds];
    }
  }

  // Even volume across the eligible pool: deficit = (1/|pool|) * (totalLoad + 1) - load[id].
  const totalLoad = pool.reduce((s, id) => s + (loads[id] ?? 0), 0);
  const deficit = (id: string) => (totalLoad + 1) / Math.max(1, pool.length) - (loads[id] ?? 0);

  const maxDeficit = Math.max(...pool.map(deficit));
  const avgLoad = totalLoad / Math.max(1, pool.length);
  const slack = maxSpreadPct * avgLoad;

  return order.find((id) => pool.includes(id) && deficit(id) >= maxDeficit - slack) ?? pool[0] ?? preferredId;
}

/** Resolve a salesperson id to its config entry, or undefined if unknown. */
export function resolveSalesperson(config: RoutingConfig, id: string): Salesperson | undefined {
  return config.salespeople.find((s) => s.id === id);
}
