---
name: email-verification
description: "Verify email addresses before adding to cold email campaigns using Reacher with SMTP proxy. Use when validating lead lists, checking email deliverability, or filtering invalid contacts."
---

# Email Verification via Reacher

## API Reference

- **Endpoint:** `https://reacher.nextwave.io`
- **Auth:** Cloudflare Access headers
- **SMTP Proxy:** `r1.proxy4smtp.com:1081` (eliminates "unknown" results)

## Single Email Verification

```bash
curl -s -X POST https://reacher.nextwave.io/v1/check_email \
  -H "Content-Type: application/json" \
  -H "CF-Access-Client-Id: {REACHER_CF_CLIENT_ID}" \
  -H "CF-Access-Client-Secret: {REACHER_CF_CLIENT_SECRET}" \
  -d '{
    "to_email": "name@example.com",
    "proxy": {
      "host": "r1.proxy4smtp.com",
      "port": 1081,
      "username": "{REACHER_PROXY_USER}",
      "password": "{REACHER_PROXY_PASS}"
    }
  }'
```

### Full Response Fields
```json
{
  "input": "name@example.com",
  "is_reachable": "safe|risky|invalid|unknown",
  "syntax": {
    "address": "name@example.com",
    "domain": "example.com",
    "is_valid_syntax": true,
    "username": "name"
  },
  "mx": {
    "accepts_mail": true,
    "records": ["mx1.example.com."]
  },
  "smtp": {
    "is_deliverable": true,
    "is_catch_all": false,
    "is_disabled": false,
    "has_full_inbox": false
  },
  "misc": {
    "is_disposable": false,
    "is_role_account": false,
    "is_b2c": false
  }
}
```

### `is_reachable` Verdicts
- `safe` — Email exists and is deliverable **(USE FOR CAMPAIGNS)**
- `risky` — Might exist but uncertain (catch-all, disposable, role)
- `unknown` — Could not determine (rare with proxy)
- `invalid` — Does not exist **(DO NOT SEND)**

## Quality Classification Rules

| Condition | Status | Action |
|-----------|--------|--------|
| `is_reachable: "safe"` | **good** | Add to campaign |
| `is_reachable: "safe"` + `is_disposable: true` | **risky** | Exclude |
| `is_reachable: "safe"` + `is_role_account: true` | **risky** | Exclude (info@, admin@, etc.) |
| `is_reachable: "safe"` + `is_catch_all: true` | **risky** | Include with caution |
| `is_reachable: "risky"` | **risky** | Include catch-all only, exclude others |
| `is_reachable: "invalid"` | **bad** | Never send |
| `is_reachable: "unknown"` | **unknown** | Retry once, then exclude |

### Downgrade Logic
Even if Reacher says `safe`, downgrade to `risky` if:
1. **Disposable email** (`misc.is_disposable: true`)
2. **Role account** (`misc.is_role_account: true`) — info@, admin@, support@
3. **Catch-all domain** (`smtp.is_catch_all: true`) — validate with No2Bounce (see below)

## Catch-All Validation via No2Bounce

When Reacher returns `risky` with `is_catch_all: true`, use No2Bounce to determine if the email actually exists.

### API Flow (Async)
```bash
# Step 1: Submit email
curl -s -X POST 'https://connect.no2bounce.com/v2/n2b_validate_email' \
  -H "apitoken: ${N2B_API_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"email": "name@catchall-domain.com"}'
# Returns: {"data": {"trackingId": "abc123..."}}

# Step 2: Poll for results (wait 3s)
curl -s -X GET "https://connect.no2bounce.com/v2/n2b_validate_email?trackingId=abc123" \
  -H "apitoken: ${N2B_API_TOKEN}"
# Returns: {"overallStatus": "Completed", "result": {"scoreStatus": "Deliverable"}}
```

### scoreStatus Values
- `Deliverable` — Real mailbox, safe to send
- `UnDeliverable/AcceptAll` — Catch-all fake, do NOT send

### Integration
The email guesser script (`scripts/email-guesser.sh`) automatically validates catch-all emails with No2Bounce after Reacher flags them.

## Verification Workflow for Cold Email

### Before Campaign Launch
1. Verify ALL leads in the list
2. Only add `is_reachable: "safe"` (non-disposable, non-role) to campaigns
3. Catch-all leads: validate with No2Bounce, include only `Deliverable`
4. NEVER send to `invalid` or `unknown`

### Bounce Rate Target
- Must stay < 3% to maintain sender reputation
- > 5% bounce rate = STOP sending immediately
- Re-verify lists older than 30 days (emails go stale)

### Rate Limits
- 60 requests/min recommended
- Add 1s delay between sequential single checks

## Email Guesser Pipeline

For leads that have name + domain but no email, use `scripts/email-guesser.sh`:
```bash
# Generates 3 permutations per person, verifies with Reacher proxy
./scripts/email-guesser.sh leads.csv verified-emails.csv
```

## Quick CLI Check
```bash
curl -s -X POST https://reacher.nextwave.io/v1/check_email \
  -H "Content-Type: application/json" \
  -H "CF-Access-Client-Id: $REACHER_CF_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $REACHER_CF_CLIENT_SECRET" \
  -d '{"to_email":"name@email.com","proxy":{"host":"r1.proxy4smtp.com","port":1081,"username":"'$REACHER_PROXY_USER'","password":"'$REACHER_PROXY_PASS'"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['is_reachable'])"
```

## Environment Variables
All credentials in `.env`:
- `REACHER_URL` — `https://reacher.nextwave.io`
- `REACHER_CF_CLIENT_ID` — Cloudflare Access client ID
- `REACHER_CF_CLIENT_SECRET` — Cloudflare Access client secret
- `REACHER_PROXY_HOST` — `r1.proxy4smtp.com`
- `REACHER_PROXY_PORT` — `1081`
- `REACHER_PROXY_USER` — proxy username
- `REACHER_PROXY_PASS` — proxy password
- `N2B_API_TOKEN` — No2Bounce API token (catch-all validation)

## Infrastructure
- Reacher instance behind Cloudflare Access at reacher.nextwave.io
- SMTP proxy at r1.proxy4smtp.com prevents IP blacklisting
- Based on: github.com/reacherhq/check-if-email-exists
- Reference implementation: `Studio Apps/Consulti/lib/reacher/client.ts`
