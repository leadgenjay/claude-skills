// Parity check for the routing engine.
//
//   node references/templates/verify-engine.mjs
//
// Asserts the vanilla-JS engine port (the SAME functions inlined in embed.html) reproduces
// engine.golden.json against book-a-call.example.json. The golden expectations were
// cross-checked against references/engine/evaluate.ts. If you edit the engine in embed.html,
// mirror the change in the functions below and re-run this.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, "book-a-call.example.json"), "utf8"));
const golden = JSON.parse(readFileSync(join(here, "engine.golden.json"), "utf8"));

/* ---- engine port (keep identical to embed.html) ---- */
const DEFAULT_COUNTRY_ANSWER_KEY = "__country_iso";
function conditionMatches(answers, qid, accepted) {
  const a = answers[qid];
  if (a == null || a === "") return false;
  return accepted.indexOf(a) !== -1;
}
function ruleMatches(answers, rule) {
  if (!rule.when || rule.when.length === 0) return false;
  const mode = rule.matchMode || "all";
  const res = rule.when.map((c) => conditionMatches(answers, c.questionId, c.in));
  return mode === "all" ? res.every(Boolean) : res.some(Boolean);
}
function countryTierPoints(answers, country) {
  const iso = answers[country.answerKey || DEFAULT_COUNTRY_ANSWER_KEY];
  if (iso && country.tier1.indexOf(iso) !== -1) return country.tier1Points;
  if (iso && country.tier2.indexOf(iso) !== -1) return country.tier2Points;
  return country.tier3Points;
}
function scoreLead(answers, scoring) {
  let total = 0;
  for (const qid in scoring.points) {
    if (!Object.prototype.hasOwnProperty.call(scoring.points, qid)) continue;
    const valuePoints = scoring.points[qid], a = answers[qid];
    if (a != null && a !== "" && valuePoints[a] != null) total += valuePoints[a];
  }
  if (scoring.country) total += countryTierPoints(answers, scoring.country);
  return total;
}
function scoreToOutcome(score, scoring, fallback) {
  for (let i = 0; i < scoring.bands.length; i++) if (score >= scoring.bands[i].minScore) return scoring.bands[i].outcome;
  return fallback;
}
function evaluateRouting(answers, cfg) {
  for (let i = 0; i < cfg.rules.length; i++) if (ruleMatches(answers, cfg.rules[i])) return cfg.rules[i].outcome;
  if (cfg.scoring) return scoreToOutcome(scoreLead(answers, cfg.scoring), cfg.scoring, cfg.defaultOutcome);
  return cfg.defaultOutcome;
}

/* ---- run ---- */
let failures = 0;
for (const c of golden.cases) {
  const score = config.scoring ? scoreLead(c.answers, config.scoring) : null;
  const outcome = evaluateRouting(c.answers, config);
  const scoreOk = c.expectedScore == null || score === c.expectedScore;
  const outOk = JSON.stringify(outcome) === JSON.stringify(c.expectedOutcome);
  if (scoreOk && outOk) {
    console.log(`  ok   ${c.name}  (score=${score})`);
  } else {
    failures++;
    console.log(`  FAIL ${c.name}`);
    if (!scoreOk) console.log(`       score: got ${score}, want ${c.expectedScore}`);
    if (!outOk) console.log(`       outcome: got ${JSON.stringify(outcome)}, want ${JSON.stringify(c.expectedOutcome)}`);
  }
}
console.log(failures === 0 ? `\nPASS — ${golden.cases.length} cases` : `\nFAIL — ${failures}/${golden.cases.length} cases`);
process.exit(failures === 0 ? 0 : 1);
