---
name: list-optimize
description: "Clean a scraped lead list before campaign launch: AI-qualify against ICP, normalize company names, then (after email-verification) research each survivor via web-search (Zeus search default, Perplexity fallback) and write a 1-sentence personalization line for the E1 opener using Claude in-session (default — free on Max plan) or Anthropic API (fallback). Interactive phase picker lets you run qualify-only, personalize-only, both, or skip. Validates the target campaign template (Instantly/Email Bison) carries the personalization variable with a fallback before any DB writes. Updates the Turso `leads` table with qualification + normalization + personalization fields. Use when someone says 'clean my list', 'qualify leads', 'normalize company names', 'personalize leads', 'research leads', 'list cleaning', 'lead qualification', 'add personalization to copy', 'phase picker', 'qualify only', 'personalize only', 'validate campaign variables'. Slots between lead-import and email-verification (phases 1-2), and between email-verification and copywriting (phases 3-4)."
---

# List Optimize

Turn a raw scraped lead list into a qualified, deduplicated, personalized list ready for cold email. Four idempotent phases write back to the Turso `leads` table; the copywriting skill then consumes an optional `{personalization}` token in the E1 opener.

**Pipeline position:**
```
consulti-scrape -> import-leads.sh
        |
        v
  list-optimize Phase 1: qualify (AI on every lead vs strategy.md ICP)
  list-optimize Phase 2: normalize (company name canonicalization)
        |
        v
  email-verification (existing skill, runs only on qualified survivors)
        |
        v
  list-optimize Phase 3: research (Perplexity per lead, cost-gated)
  list-optimize Phase 4: personalize (LLM 1-sentence opener)
        |
        v
  cold-email-copywriting (consumes {personalization} token if present)
```

## Prerequisites

- Turso DB schema migrated: `bash scripts/list-optimize/migrate-schema.sh` (one-time, idempotent)
- `scripts/campaigns/{campaign-name}/strategy.md` exists (output of `cold-email-strategy`) — required for Phase 1 ICP rules and Phase 4 messaging angle
- `.env` contains `TURSO_DB_URL` + `TURSO_DB_TOKEN` (already required by other skills)
- Leads already imported into Turso via `scripts/import-leads.sh` (so `leads` rows exist)
- **Phase 3 (research):** Zeus search at `search.nextwave.io` works out of the box — no API key needed. Optional fallback: `.env` with `PERPLEXITY_API_KEY` for runs where Zeus is down. (Older docs may reference Perplexity as the default; the canonical default is now Zeus.)
- **Phase 4 (personalize):** Default is **Claude in-session** — the active Claude Code session writes openers directly (free on Max plan). Fallback: `ANTHROPIC_API_KEY` in `.env` for headless runs (uses Sonnet 4.6).

## Phase 0: Phase Picker (interactive, idempotent)

On every run, `run-pipeline.sh` reads `scripts/campaigns/{campaign}/.metadata.json` for a previous selection at `list_optimize.selection`. If absent, it prompts:

```
What do you want list-optimize to run?
  1) Qualify + Personalize  (recommended, full pipeline)
  2) Qualify only           (skip Perplexity research + opener writing — saves ~$0.005/lead)
  3) Personalize only       (skip ICP qualification — assumes leads pre-qualified)
  4) Skip everything
```

The selection is saved back to metadata so re-runs (resume after Ctrl-C, restart after email-verification) never re-prompt. Selection-to-phase mapping:

| Selection | Phase 1 (qualify) | Phase 2 (normalize) | Phase 3 (research) | Phase 4 (personalize) |
|---|---|---|---|---|
| `both` | yes | yes | yes | yes |
| `qualify_only` | yes | yes | skip | skip |
| `personalize_only` | skip | skip | yes | yes |
| `skip` | skip | skip | skip | skip (no-op exit) |

`personalize_only` keeps the Phase 3 filter `pipeline_status='verified'` — it does NOT bypass the verification gate, only the qualification gate.

To force re-prompt, edit `.metadata.json` and remove the `list_optimize` key (or pass `--reset-picker` to `run-pipeline.sh`).

## Pre-flight: Cold Email Tool Variable Validation

Before any Phase 3 or Phase 4 DB writes, `run-pipeline.sh` calls `scripts/list-optimize/validate-campaign-vars.sh <campaign>` to confirm the target Instantly / Email Bison campaign template can actually consume what we generate. Three checks; all must pass.

**1. Template scan (read-only).** Pull the campaign's E1–E4 sequence text from the API and grep for `{var}` / `{{var}}` tokens. Hard-fail on any token that has no value in our lead payload schema:

| Allowed (Instantly) | Allowed (Email Bison) |
|---|---|
| `{{firstName}}`, `{{lastName}}`, `{{companyName}}`, `{{email}}`, `{{personalization}}` | `{FIRST_NAME}`, `{LAST_NAME}`, `{COMPANY}`, `{EMAIL}`, `{personalization}` |

Any other token = fail with `unknown token '{X}' in step Y`.

**2. Fallback check (read-only).** Every reference to `{personalization}` (Bison) or `{{personalization}}` (Instantly) MUST be wrapped as `{personalization|fallback}` per `cold-email-copywriting/references/copy-constraints.md`. Bare token = hard fail. Citation: copy-constraints.md.

**3. Dry-run roundtrip (real campaign, immediately deleted).** Push one sentinel lead (`hyperlist-test+{epoch}@example.invalid`) with every custom field populated, GET it back, confirm every field round-tripped, then DELETE. Wrapped in a `trap` so failure paths still delete. The `.invalid` TLD is reserved per RFC 2606 — even if the lead were ever sent, it would NXDOMAIN immediately.

Validator exits non-zero on any failure with the offending check + step + token named. Skipped automatically when only `qualify_only` is selected (no personalization variable to check).

## Phase 1: Qualify (AI on every lead)

For every lead with `qualification_status IS NULL`, batch 20 leads at a time to Claude with the campaign's ICP rules. Returns `{status: qualified|disqualified, reason, score}` per lead.

```bash
bash scripts/list-optimize/qualify.sh <campaign-name> [--limit N]
```

What it does:
1. Reads `scripts/campaigns/{campaign}/strategy.md` and extracts the ICP block (job titles, industries, size range, geography, pain points).
2. Pulls leads where `qualification_status IS NULL` (default all, `--limit N` for testing).
3. For each batch of 20, builds a JSON request to Claude that includes the lead rows and the ICP rules + the AI Qualification Prompt from strategy.md.
4. Parses the structured-output response and writes back per-lead:
   - `qualification_status` = `qualified` | `disqualified`
   - `qualification_reason` = LLM rationale
   - `qualification_score` = 0-100
   - `do_not_contact` = `1` if disqualified
5. Appends a `lead_events` row per lead with `event_type='status_changed'`, `source='manual'`, and JSON `event_data` containing `{phase: "list_optimize_qualify", status, reason, score}`.

Idempotent: re-running skips leads already qualified.

See `references/qualification-prompt.md` for the LLM prompt template.

## Phase 2: Normalize Company Name

Canonicalize `company_name` so duplicates merge under one normalized form (e.g., `Acme Inc.`, `Acme, LLC`, `acme inc` -> `Acme`). Pure bash, no API calls.

```bash
bash scripts/list-optimize/normalize-company.sh [--limit N]
```

What it does:
1. Pulls leads where `company_name IS NOT NULL AND company_name_normalized IS NULL`.
2. For each row:
   - Saves the raw value to `company_name_original` (preserve audit trail).
   - Strips suffixes: `Inc`, `Inc.`, `LLC`, `L.L.C.`, `Corp`, `Corporation`, `Ltd`, `Limited`, `Co.`, `Co`, `Pty Ltd`, `GmbH`, `S.A.`, `S.r.l.`, `K.K.`
   - Strips leading `The `
   - Title-cases tokens (preserves all-caps acronyms ≤4 chars: `IBM`, `NASA`, `AT&T`)
   - Collapses whitespace
   - Saves to `company_name_normalized`
3. After the pass, runs a duplicate-detection query and emits a CSV report `scripts/campaigns/{campaign}/company-dupes.csv` listing groups of leads with the same normalized name. **Does not auto-merge** — review-only.

See `references/company-normalization-rules.md` for the full rule set.

## Run email-verification BETWEEN Phase 2 and Phase 3

After phases 1-2, run the existing `email-verification` skill against `WHERE qualification_status = 'qualified'`. This sets `pipeline_status` to `verified` / `bounced` per existing logic. **Phase 3 only runs on verified survivors** to keep Perplexity spend efficient.

## Phase 3: Research (Zeus search default, Perplexity fallback)

For each verified+qualified lead with `personalization_status IS NULL`, hit a citation-grounded web-search API to find a recent newsworthy thing about that person/company.

```bash
bash scripts/list-optimize/research.sh <campaign-name> [--limit N] [--yes]
# Legacy alias: scripts/list-optimize/perplexity-research.sh (still works)
```

**Default backend: Zeus search** (`search.nextwave.io`) — free, no API key required, ~30s/req, citation-grounded. Set `User-Agent: curl/8.0` on every request (urllib default UA hits a 403 from the Cloudflare WAF).

```bash
curl -s -X POST "https://search.nextwave.io/api/search" \
  -H "Content-Type: application/json" \
  -H "User-Agent: curl/8.0" \
  -d '{
    "chatModel": {"providerId": "a512070c-aecb-4540-af21-fa64c0c03d94", "key": "qwen3-14b"},
    "embeddingModel": {"providerId": "a07fbfdd-1a9b-40f6-b729-92150936de0a", "key": "mixedbread-ai/mxbai-embed-large-v1"},
    "optimizationMode": "balanced",
    "sources": ["web"],
    "query": "Recent newsworthy items from the last 90 days about <first_name> <last_name> (<job_title> at <company_name>): posts, podcast appearances, hires, funding, product launches, or notable company moments.",
    "systemInstructions": "/no_think\n\nFind ONE specific recent newsworthy thing for a cold email opener. Output STRICT JSON only: {\"topic\": \"<short label or null>\", \"source_url\": \"<url or null>\", \"one_sentence_summary\": \"<1 sentence or null>\"}. If nothing notable, return {\"topic\": null}.",
    "stream": false
  }'
```

**Fallback backend: Perplexity sonar** (`api.perplexity.ai/chat/completions`, model `sonar`) — paid at ~$0.005/req. Use when Zeus is down (set `--backend perplexity` or detect 5xx and retry on Perplexity). Requires `PERPLEXITY_API_KEY`.

Cost preflight (always runs first):
1. Counts target leads via `SELECT COUNT(*) FROM leads WHERE qualification_status='qualified' AND pipeline_status='verified' AND personalization_status IS NULL`.
2. Backend-aware cost calc: Zeus = $0.00, Perplexity = N × $0.005.
3. Prints `Estimated cost: $X.XX for N leads (backend: zeus|perplexity). Continue? [y/N]`.
4. Aborts on anything other than `y`. `--yes` skips the prompt for headless runs.

**Required quality guards (apply on the response, BEFORE writeback):**

1. **Hallucination guard.** If `len(sources) == 0` in the Zeus response (or `citations: []` in Perplexity), force `topic = null` regardless of what the model said. qwen3-14b confabulates plausible-sounding fake news when web search returns zero hits. Without this guard ~15-25% of "researched" results are fabricated.
2. **Company-name match filter.** After parsing the JSON, lowercase both the lead's normalized company name (strip `Inc/LLC/Corp/Ltd` suffixes) and the topic+summary text. If the company name (≥4 chars) does NOT appear anywhere in topic/summary, force `topic = null`. Drops wrong-person false positives (e.g. Aaron Boone the Yankees coach vs Aaron Boone the marketing exec). ~30% of grounded topics are wrong-person without this gate.

Writeback (same as before, plus the new filter result):
- `personalization_research` = full backend response (JSON string) — store `{message, sources_count, parsed, _hallucination_guard?}`
- `personalization_cost_cents` = 0 for Zeus, 1 for Perplexity (rounded up)
- `personalization_status` = `researched` if `topic != null` AFTER both guards, else `skipped`
- `lead_events` row: `event_type='status_changed'`, `event_data={phase:"list_optimize_research", status, has_topic, backend}`

**Parallelism:** Use `ThreadPoolExecutor(max_workers=20)` for Zeus (single-tenant, no rate limit) or `xargs -P 4` for Perplexity (50 req/min ceiling). 20-way parallel on Zeus cuts a 4,500-lead run from ~38 hr serial to ~3 hr wall time.

**Subprocess avoidance:** Use direct HTTP to Turso (`POST /v2/pipeline`) for DB writes from the worker threads — `bash → subprocess → sql_escape` in 20 parallel workers fork-bombs the harness. The new script template handles this.

`--estimate-only` flag: prints the cost calc and exits without making any paid call. Use for dry-runs.

## Phase 4: Personalize (Claude in-session default, Anthropic API fallback)

For each lead with `personalization_status='researched'`, generate a 1-sentence opener using the lead row + research result + strategy messaging angle.

**Default: Claude in-session.** When running inside an active Claude Code session (Max plan), bypass the Anthropic API entirely:

```bash
# 1. Dump researched leads to a JSON prompt-pack
bash scripts/list-optimize/personalize.sh <campaign-name> --mode in-session --dump /tmp/personalize-todo.json

# 2. Claude (the active session) reads /tmp/personalize-todo.json, writes openers to /tmp/openers.json
#    Format: [{"id": <lead_id>, "opener": "<sentence>"}, ...]
#    Use "SKIP" as the opener value for any lead where the topic is bad-sentiment
#    (criminal/wrong-direction/wrong-person) — those fall back to the generic opener.

# 3. Import the openers back to Turso
bash scripts/list-optimize/personalize.sh <campaign-name> --mode in-session --import /tmp/openers.json
```

**Fallback: Anthropic API.** For headless runs (no active session) use Sonnet 4.6:

```bash
bash scripts/list-optimize/personalize.sh <campaign-name> --mode api [--limit N]
# Requires ANTHROPIC_API_KEY. Uses claude-sonnet-4-6. Skip Haiku — quality too low for cold-email openers.
```

**Constraints (validated before writeback in both modes; failures retry once, then mark `failed`):**
- 25 words maximum
- No banned tokens: `!`, `dear`, `hope this finds you well`, `I hope you're doing well`
- No em dash (`—`), en dash (`–`), or double hyphen (`--`)
- Must NOT contain merge tags inside (`{first_name}` is added by the copywriting template, not here)
- Must mention the lead's first name OR the specific topic from research (not both — keeps it natural)
- Sentiment check: reject openers riffing on criminal charges, recalls, layoffs, wrong-direction news (exec leaving). When in doubt mark `SKIP` and let fallback fire.

**Writeback:**
- `personalization_line` = the validated sentence (NULL when SKIP)
- `personalization_status` = `written` (success) | `skipped` (SKIP marker or filter-rejected) | `failed` (after retry)
- `lead_events` row: `event_type='status_changed'`, `event_data={phase:"list_optimize_personalize", status, line_preview, mode}`

See `references/personalization-prompt.md` for the prompt template.

## End-to-end orchestrator

```bash
bash scripts/list-optimize/run-pipeline.sh <campaign-name>
```

Flow:

1. **Phase 0 picker** (interactive, idempotent — see "Phase 0: Phase Picker" above). Selection persists in `.metadata.json`.
2. **Phases 1-2** (qualify + normalize) if selection includes them.
3. **Pauses, prompts user to run `/email-verification`** if any qualified leads are still unverified.
4. **Pre-flight variable validation** — runs `validate-campaign-vars.sh` before any Phase 3/4 DB writes (skipped for `qualify_only`). Hard-fails if the target Instantly/Email Bison campaign template can't carry our personalization payload.
5. **Phases 3-4** (Perplexity research + 1-sentence opener) if selection includes them.

Resume-aware: skips phases already complete (detects via `qualification_status` / `personalization_status` populated). Re-running with a stale selection in metadata replays only the unfinished phases per the saved selection.

Flags:
- `--reset-picker` — clear `list_optimize.selection` from metadata and re-prompt.
- `--skip-research` — legacy alias for `qualify_only` (preserved for backward compat).
- `--auto-yes` / `-y` — skip cost preflight prompt in Phase 3.
- `--resume` — pick up where you left off (default behavior; flag exists for clarity).

## Yield expectations (set these with the user before running)

For broad SMB B2B audiences (5-75 employee marketing agencies / IT services / consultancies / SaaS), the realistic yield is **2-5% of input leads end up with a personalized opener.** Most founders at this size don't have recent press coverage in the 90-day window.

Distribution from a real 4,562-lead run (Consulti Beta-Launch 2026-05-11):

| Stage | Count | % |
|---|---|---|
| Started (verified + qualified) | 4,562 | 100% |
| Zeus returned 0 sources → killed by hallucination guard | ~3,500 | 77% |
| Zeus returned sources but no usable topic | ~500 | 11% |
| Zeus found topic, killed by company-name match filter (wrong-person) | 50 | 1% |
| Topic found, killed by sentiment filter (criminal/wrong-direction) | 9 | 0.2% |
| **Personalized opener written** | **110** | **2.4%** |
| Errors / timeouts | ~400 | 8% |

The remaining 95%+ get the generic spintax opener via the `{personalization|fallback}` token in E1. **This is the expected outcome, not a bug.** If a user expects 30%+ personalization, calibrate that expectation BEFORE running — the volume gain from going paid (Perplexity sonar) vs free (Zeus search) is marginal because the underlying problem is lack of press coverage, not search quality.

## Copywriting integration

After `list-optimize` finishes, `cold-email-copywriting` MAY include an optional `{personalization}` token in the **first sentence of E1 only**. The token is required to be wrapped in spintax with a generic fallback so leads with no `personalization_line` still get a natural-sounding opener:

```
{personalization|Hey {FIRST_NAME} – came across <company_name_normalized> and figured I'd reach out.}
```

The deploy step (Email Bison / Instantly) substitutes the per-lead value at upload time. If `personalization_line IS NULL` for a given lead, the spintax fallback fires.

E2-E4 are NOT personalized — they reuse generic openers per the standard 4-email structure.

## Database fields written

This skill is the only writer of these `leads` columns:

| Column | Phase | Values |
|---|---|---|
| `qualification_status` | 1 | `qualified` / `disqualified` |
| `qualification_reason` | 1 | LLM text |
| `qualification_score` | 1 | 0-100 |
| `company_name_original` | 2 | preserved raw |
| `company_name_normalized` | 2 | canonical form |
| `personalization_research` | 3 | Perplexity JSON |
| `personalization_cost_cents` | 3 | per-lead cost |
| `personalization_status` | 3, 4 | `researched` / `written` / `failed` / `skipped` |
| `personalization_line` | 4 | 1-sentence opener |

Existing columns this skill READS: `first_name`, `last_name`, `email`, `job_title`, `company_name`, `company_domain`, `industry`, `company_size`, `city`, `state`, `country`, `pipeline_status`, `do_not_contact`, `linkedin_url`.

Existing column this skill WRITES: `do_not_contact` (set to `1` for disqualified leads in Phase 1).

## Reports

Use `lead-report.sh` to inspect cleaning results:
```bash
bash scripts/lead-report.sh qualification    # distribution by status
bash scripts/lead-report.sh personalization  # distribution + total Perplexity spend
bash scripts/lead-report.sh dupes            # near-duplicate company groups
```

(These report flags are added by the list-optimize install — they read directly from the new columns.)

## Safety rules

- **NEVER** delete leads. Disqualified = mark + keep (`qualification_status='disqualified'`, `do_not_contact=1`).
- **NEVER** auto-merge company-name duplicates. Report only.
- **ALWAYS** confirm cost preflight before any Phase 3 paid run. Default to abort.
- **ALWAYS** write a `lead_events` row when changing `qualification_status` or `personalization_status`.
- Phase 3 is skipped automatically for leads with `pipeline_status != 'verified'` — no Perplexity spend on bounces.
