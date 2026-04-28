# Phase 1: Qualification Prompt Template

Used by `scripts/list-optimize/qualify.sh`. The script substitutes `{ICP_RULES}` (extracted from strategy.md) and `{LEAD_BATCH}` (JSON array of up to 20 lead rows) before calling Claude with structured-output JSON.

## System prompt

```
You are a cold-email-list cleaning assistant. Score each lead against the campaign's Ideal Customer Profile (ICP). Output STRICT JSON only — no prose, no markdown, no commentary.

For each lead, return:
- status: "qualified" if the lead matches the ICP, "disqualified" if not
- reason: one short sentence explaining why
- score: integer 0-100 representing fit (100 = perfect ICP match, 0 = clearly out of profile)

Be strict. A lead must MATCH the ICP — close-but-not-quite is "disqualified". Wrong industry, wrong title seniority, wrong company size, wrong geography are all hard disqualifications.
```

## User prompt

```
ICP RULES FOR THIS CAMPAIGN
{ICP_RULES}

LEADS (score each one):
{LEAD_BATCH}

Output a JSON array of length N (one entry per lead, in input order). Schema:
[
  {
    "id": <lead.id>,
    "status": "qualified" | "disqualified",
    "reason": "<one sentence>",
    "score": <int 0-100>
  },
  ...
]

Output JSON only. No other text.
```

## ICP_RULES extraction

The script extracts these fields from `scripts/campaigns/{campaign}/strategy.md`:

- Job titles (e.g., `VP Marketing`, `Marketing Director`, `Head of Growth`)
- Industries (e.g., `SaaS`, `Marketing Agencies`, `B2B Software`)
- Company size range (employees, e.g., `3-100`)
- Geography (countries, states, cities)
- Pain points (acute problems the offer solves)
- Seniority levels (founder/owner/c_suite/director/etc.)
- Disqualifiers (e.g., `not direct competitors`, `not <3 employees`)

If a field is missing from strategy.md, the script logs a warning and proceeds without that constraint (treats as "any value matches").

## Lead batch shape

Each lead in `LEAD_BATCH` is a JSON object with:
```json
{
  "id": 12345,
  "first_name": "Sarah",
  "last_name": "Chen",
  "job_title": "VP Marketing",
  "company_name": "Acme Inc.",
  "industry": "SaaS",
  "company_size": "11-50",
  "city": "Austin",
  "state": "TX",
  "country": "US",
  "linkedin_url": "https://linkedin.com/in/sarahchen"
}
```

## Batch size

Default 20 leads/call. Adjust via `--batch-size N`. Larger batches = fewer Claude calls but slower per-batch validation.

## Failure handling

- If Claude returns malformed JSON: retry once with `Output VALID JSON only` reinforcement. On second failure, mark each lead in the batch with `qualification_status='pending'` and log to `lead_events`.
- If a lead is missing critical fields (no `job_title` AND no `industry`): auto-disqualify with reason `insufficient data to qualify`, score 0.
- If `strategy.md` is missing: abort with a clear error pointing the user to run `/cold-email-strategy` first.

## Manual override

A user can re-qualify a lead by setting `qualification_status = NULL` in the DB and re-running the phase. The audit trail in `lead_events` shows the prior decision.
