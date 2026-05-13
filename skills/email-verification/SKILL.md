---
name: email-verification
description: "Verify email addresses before adding to cold email campaigns. Two backends: Consulti /verify (default for <500 batches — one key, one credit pool, server-side cache) and Reacher + No2Bounce (preferred for >1K batches — 8x faster via proxy + parallel xargs, with N2B catch-all recovery). Use when validating lead lists, checking email deliverability, or filtering invalid contacts before campaign launch."
---

# Email Verification

Two backends, picked by batch size:

| Backend | When to use | Throughput | Notes |
|---|---|---|---|
| **Consulti `/verify`** | Default for <500 leads | ~25/min (parallel `xargs -P 20`) | One key (`CONSULTI_API_KEY`), server-side cache so re-runs within the window are free. |
| **Reacher + No2Bounce** | >1K leads, time-sensitive launches | ~200/min Reacher + N2B for catch-alls | Proxy-based SMTP probe at scale. N2B for catch-all recovery (deliverable vs accept-all). |

The pipelines are independent — pick one per campaign based on volume. Both write the same downstream verdict (`safe`/`risky`/`invalid`/`unknown`) so the rest of the chain (Phase 3 of `list-optimize`, `cold-email-campaign-deploy`) doesn't care which was used.

## High-volume pipeline (>1K leads): Reacher + No2Bounce

**Throughput:** ~200/min with `xargs -P 20` (8x faster than Consulti at the same parallelism). For 4,500 leads expect ~25 min wall time vs ~3 hr on Consulti.

**Step 1 — Reacher (primary SMTP probe).**

```bash
source .env
curl -s --max-time 60 -X POST "${REACHER_URL}/v1/check_email" \
  -H "Content-Type: application/json" \
  -H "CF-Access-Client-Id: ${REACHER_CF_CLIENT_ID}" \
  -H "CF-Access-Client-Secret: ${REACHER_CF_CLIENT_SECRET}" \
  -d "{
    \"to_email\": \"${EMAIL}\",
    \"proxy\": {
      \"host\": \"${REACHER_PROXY_HOST}\",
      \"port\": ${REACHER_PROXY_PORT},
      \"username\": \"${REACHER_PROXY_USER}\",
      \"password\": \"${REACHER_PROXY_PASS}\"
    }
  }"
```

Required env vars in `.env`: `REACHER_URL`, `REACHER_CF_CLIENT_ID`, `REACHER_CF_CLIENT_SECRET`, `REACHER_PROXY_HOST`, `REACHER_PROXY_PORT`, `REACHER_PROXY_USER`, `REACHER_PROXY_PASS`. The Cloudflare Access headers are mandatory — the endpoint sits behind CF Access.

Response: `{is_reachable, smtp: {is_deliverable, is_catch_all}, misc: {is_role_account, is_disposable}, syntax: {address}, input: <string-or-object>}`.

**Watch-outs:**
- `.input` is sometimes a string (success path) and sometimes `{to_email: "..."}` (error path with `is_reachable: "error"`). Handle both shapes.
- Returns empty body on transient failures — use `--max-time 60` + 2 retries.

**Step 2 — Bucket the results.**

Send-eligible = `is_reachable: "safe"` AND `!is_role_account` AND `!is_disposable` AND `!is_catch_all`. Send catch-alls to N2B for recovery.

**Step 3 — No2Bounce catch-all recovery (for Reacher `risky` due to `is_catch_all: true` only).**

```bash
# Submit
curl -s --max-time 30 -X POST 'https://connect.no2bounce.com/v2/n2b_validate_email' \
  -H "apitoken: ${N2B_API_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\"}"
# Returns: {"data": {"trackingId": "..."}}

# Poll up to 6× 3s
curl -s --max-time 30 -X GET "https://connect.no2bounce.com/v2/n2b_validate_email?trackingId=${TID}" \
  -H "apitoken: ${N2B_API_TOKEN}"
# Wait for overallStatus == "Completed" then read result.scoreStatus
# If scoreStatus contains "Deliverable" (without "UnDeliverable") → recovered, mark safe.
```

**N2B credit watch:** When credits run out, the submit endpoint returns `statusCode: 400` with a message mentioning "credit". Pause the run, ask the user to top up at no2bounce.com, resume.

**Step 4 — Final filter for the send-ready CSV.**

Send-eligible = Reacher `safe` (and not role/disposable) OR (Reacher catch-all + N2B confirms `Deliverable`).

**Canonical implementations:**

- **Turso-backed (preferred — leads already imported):** `scripts/reacher-verify.sh` reads `leads WHERE pipeline_status='new'`, runs Reacher → N2B fallback, writes back `pipeline_status='verified'|'bounced'` + an `email_verifications` audit row. Halts on bounce rate >5%. Use this when the lead list is already in Turso.
- **JSON-file variant (campaign-specific, no DB):** `scripts/campaigns/consulti-beta-launch/verify-resume-reacher.sh` (Reacher) + `verify-n2b-catchall.sh` (N2B catch-all) + `build-final-csv.sh` (merger). Use this when leads live in a JSON file and you want to skip Turso ingestion (e.g. quick one-off pilots).

Recovered ~68% of catch-alls in the 2026-05-11 Consulti Beta-Launch run (588 of 870 catch-alls → send-ready).

---

# Default pipeline (<500 leads): Consulti /verify

Single-email verification through the same Consulti account that powers `/consulti-scrape`. One API key, one credit pool, one source of truth.

## API reference

- **Endpoint:** `POST https://app.consulti.ai/api/v1/verify`
- **Auth:** `Authorization: Bearer $CONSULTI_API_KEY`
- **Body:** `{"email": "name@example.com"}` — single email per call
- **Cost:** 1 verification credit on a fresh lookup, 0 on cache hit (server-side cache)

## Single email verification

```bash
source .env
curl -s -X POST "https://app.consulti.ai/api/v1/verify" \
  -H "Authorization: Bearer $CONSULTI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"name@example.com"}'
```

### Response shape

```json
{
  "success": true,
  "data": {
    "email": "name@example.com",
    "status": "good",
    "is_deliverable": true,
    "is_disposable": false,
    "is_role_account": false,
    "is_catch_all": false,
    "credits_used": 1,
    "cached": false
  }
}
```

### `data.status` verdicts

- `good` — Mailbox exists and accepts mail **(USE FOR CAMPAIGNS)**
- `risky` — Catch-all, disposable, or role account — possible but uncertain
- `bad` — Address does not exist or rejected at SMTP **(DO NOT SEND)**
- `unknown` — SMTP probe inconclusive — retry once, exclude on second `unknown`

### Error responses

| HTTP | Meaning | Action |
|------|---------|--------|
| 400 | Invalid email format | Drop the row, don't retry |
| 401 | Bad / missing API key | Verify `$CONSULTI_API_KEY` in `.env` |
| 402 | Out of verification credits | Top up at app.consulti.ai → Billing |
| 500 | Verification service down | Sleep 5s, retry up to 3× |

## Quality classification rules

| Condition | Status | Action |
|-----------|--------|--------|
| `status: "good"` | **good** | Add to campaign |
| `status: "good"` + `is_disposable: true` | **risky** | Exclude |
| `status: "good"` + `is_role_account: true` | **risky** | Exclude (info@, admin@, support@) |
| `status: "good"` + `is_catch_all: true` | **risky** | Include with caution — domain accepts everything |
| `status: "risky"` | **risky** | Include catch-all only, exclude disposable + role |
| `status: "bad"` | **bad** | Never send |
| `status: "unknown"` | **unknown** | Retry once, then exclude |

### Downgrade logic (post-call)

Even on `good`, downgrade to `risky` if **any** of these are true:
1. `is_disposable: true` — temp-mail, mailinator, etc.
2. `is_role_account: true` — info@, admin@, support@, sales@
3. `is_catch_all: true` — domain accepts every address (no actual mailbox confirmation)

## Bulk verification (loop pattern)

The API is single-email only on the public surface, so loop with conservative pacing.

```bash
source .env
INPUT="$1"   # JSON array of {email,...} rows or CSV with email column
OUT_DIR="${INPUT%/*}/verified"
mkdir -p "$OUT_DIR"

jq -r '.[].email' "$INPUT" | while read -r EMAIL; do
  RESP=$(curl -s -X POST "https://app.consulti.ai/api/v1/verify" \
    -H "Authorization: Bearer $CONSULTI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\"}")
  echo "$RESP" >> "$OUT_DIR/results.jsonl"
  sleep 1   # 60 req/min ceiling
done

# Bucket by classification
jq -s '
  map(.data) |
  {
    safe:    map(select(.status == "good"   and (.is_disposable|not) and (.is_role_account|not) and (.is_catch_all|not))),
    risky:   map(select(.status == "risky"  or  .is_disposable or .is_role_account or .is_catch_all)),
    invalid: map(select(.status == "bad")),
    unknown: map(select(.status == "unknown"))
  }' "$OUT_DIR/results.jsonl" > "$OUT_DIR/buckets.json"
```

### Rate limits & pacing

- 60 requests/minute is a safe ceiling — add `sleep 1` between sequential calls
- For large lists, parallelize with `xargs -P 4` (240 req/min) — back off on 429
- Cache hits are **free** — re-running `/email-verification` on the same list within the cache window costs nothing

## Verification workflow for cold email

### Before campaign launch

1. Verify **every** lead in the list — even `emailStatus: "verified"` from `/consulti-scrape`
2. Add only `safe` (good + non-disposable + non-role + non-catch-all) to the campaign
3. **Never** send to `bad` or `unknown`
4. Re-verify any list older than 30 days

### Bounce rate target

- < 3% — healthy
- 3–5% — investigate; pause if rising
- \> 5% — **STOP sending immediately**, re-verify, replace mailboxes if needed

## Quick CLI check

```bash
source .env
EMAIL="name@example.com"
curl -s -X POST "https://app.consulti.ai/api/v1/verify" \
  -H "Authorization: Bearer $CONSULTI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" \
  | jq -r '.data.status'
```

## Environment variables

All credentials in `.env`:
- `CONSULTI_API_KEY` — same key used by `/consulti-scrape` (format `ctai_...`)

That's it. No CF-Access, no SMTP proxy, no second verifier — Consulti handles SMTP probing and catch-all detection in one call.
