---
name: email-verification
description: "Verify email addresses before adding to cold email campaigns via the Consulti API. Use when validating lead lists, checking email deliverability, or filtering invalid contacts."
---

# Email Verification via Consulti

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
