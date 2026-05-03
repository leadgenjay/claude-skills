---
name: list-optimize
description: "Clean a scraped lead list before campaign launch: AI-qualify against ICP, normalize company names, then (after email-verification) research each survivor with Perplexity and write a 1-sentence personalization line for the E1 opener. Interactive phase picker lets you run qualify-only, personalize-only, both, or skip. Validates the target campaign template (Instantly/Email Bison) carries the personalization variable with a fallback before any DB writes. Updates the Turso `leads` table with qualification + normalization + personalization fields. Use when someone says 'clean my list', 'qualify leads', 'normalize company names', 'personalize leads', 'research leads', 'list cleaning', 'lead qualification', 'add personalization to copy', 'phase picker', 'qualify only', 'personalize only', 'validate campaign variables'. Slots between lead-import and email-verification (phases 1-2), and between email-verification and copywriting (phases 3-4)."
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
- `.env` contains `PERPLEXITY_API_KEY` (required only for Phase 3) — get one at https://www.perplexity.ai/settings/api
- Leads already imported into Turso via `scripts/import-leads.sh` (so `leads` rows exist)

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

## Phase 3: Research (Perplexity, cost-gated)

For each verified+qualified lead with `personalization_status IS NULL`, hit the Perplexity API to find a recent newsworthy thing about that person/company.

```bash
bash scripts/list-optimize/perplexity-research.sh <campaign-name> [--limit N]
```

Cost preflight (always runs first):
1. Counts target leads via `SELECT COUNT(*) FROM leads WHERE qualification_status='qualified' AND pipeline_status='verified' AND personalization_status IS NULL`.
2. Multiplies by `$0.005` (Perplexity sonar pricing).
3. Prints `Estimated cost: $X.XX for N leads. Continue? [y/N]`.
4. Aborts on anything other than `y`.

Per-lead request (after confirmation):
```bash
curl -s -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [{
      "role": "user",
      "content": "Research <first_name> <last_name>, <job_title> at <company_name>. Find ONE specific recent newsworthy thing to mention in a cold email opener: a recent post, hire, news mention, podcast appearance, fundraising, product launch, or notable company moment from the last 90 days. Output JSON: {\"topic\": \"<short label>\", \"source_url\": \"<url>\", \"one_sentence_summary\": \"<1 sentence>\"}. If nothing notable: {\"topic\": null}."
    }]
  }'
```

Writeback:
- `personalization_research` = full Perplexity response (JSON string)
- `personalization_cost_cents` = `0.5` per call (rounded up to integer cents — track aggregate via `lead-report.sh`)
- `personalization_status` = `researched` if `topic != null`, else `skipped`
- `lead_events` row: `event_type='status_changed'`, `event_data={phase:"list_optimize_research", status, has_topic}`

`--estimate-only` flag: prints the cost calc and exits without making any paid call. Use for dry-runs.

## Phase 4: Personalize (LLM 1-sentence opener)

For each lead with `personalization_status='researched'`, send the lead row + research result + messaging angle to Claude and generate a 1-sentence opener.

```bash
bash scripts/list-optimize/personalize.sh <campaign-name> [--limit N]
```

Constraints (validated before writeback; failures retry once, then mark `failed`):
- 25 words maximum
- No banned tokens: `!`, `dear`, `hope this finds you well`, `I hope you're doing well`
- No em dash (`—`), en dash (`–`), or double hyphen (`--`)
- Must NOT contain merge tags inside (`{first_name}` is added by the copywriting template, not here)
- Must mention the lead's first name OR the specific topic from research (not both — keeps it natural)

Writeback:
- `personalization_line` = the validated sentence
- `personalization_status` = `written` (success) | `failed` (after retry)
- `lead_events` row: `event_type='status_changed'`, `event_data={phase:"list_optimize_personalize", status, line_preview}`

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
