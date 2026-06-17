# `openai-ads` CLI

CLI for the [OpenAI Ads API](https://platform.openai.com/docs/guides/ads) for ChatGPT ad campaign management. Built to drive OpenAI Ads from shell pipelines without paying the MCP-tool-registry tax.

## Install

Installed with the `openai-ads` skill at `~/.claude/skills/openai-ads/`. It needs Node plus the
`commander` and `tsx` packages — `npm i commander tsx` (or `-g`). Add an alias once (adjust the path
if your skills live elsewhere):

```sh
alias openai-ads='npx tsx ~/.claude/skills/openai-ads/cli/index.ts'
openai-ads verify
```

## Auth

Reads `OPENAI_ADS_API_KEY` from `.env.local` (auto-loaded by walking up from the CLI script) or falls back to `~/Downloads/ads-manager-api-key.txt` (the default key location per the API docs). Generate/rotate keys in the OpenAI Ads Manager → Settings.

- Base URL: `https://api.ads.openai.com/v1`
- Auth: Bearer token (`sk-svcacct-...`)
- Content-Type: `application/json`
- All money amounts: **micros** (USD × 1,000,000). CLI accepts USD and auto-converts.

## Commands

Every command accepts `--json` for machine-readable output.

### Account & Setup

```sh
# Verify API key and fetch account info
openai-ads verify

# Search for geo targeting IDs (e.g., countries, states, DMAs, ZIPs)
openai-ads geo "United States"
openai-ads geo "California"
openai-ads geo "10001"  # NYC ZIP
```

### Campaigns

```sh
# List all campaigns
openai-ads campaigns list

# Get campaign by ID
openai-ads campaigns get <campaign-id>

# Create a campaign (defaults to paused for safety)
openai-ads campaigns create \
  --name "97 Cold Email Setup" \
  --budget-usd 3000 \
  --geo 1000232 \  # US country ID
  --dry-run

# Confirm to create
openai-ads campaigns create \
  --name "97 Cold Email Setup" \
  --budget-usd 3000 \
  --geo 1000232 \
  --confirm

# Pause/activate/archive campaigns
openai-ads campaigns pause <id> --confirm
openai-ads campaigns activate <id> --confirm
openai-ads campaigns archive <id> --confirm
```

### Ad Groups

```sh
# List ad groups
openai-ads adgroups list

# List ad groups for a specific campaign
openai-ads adgroups list --campaign-id <campaign-id>

# Get ad group by ID
openai-ads adgroups get <adgroup-id>

# Create an ad group (paused by default)
# Context hints are buyer-situation descriptions (targeting). Example:
# "Someone whose cold emails keep landing in spam and wants them in the inbox"
openai-ads adgroups create \
  --campaign-id <campaign-id> \
  --name "AG1 Deliverability" \
  --context-hint "Someone whose cold emails keep landing in spam" \
  --context-hint "A founder warming up a new email domain" \
  --max-bid-usd 60 \
  --dry-run

# Confirm to create
openai-ads adgroups create \
  --campaign-id <campaign-id> \
  --name "AG1 Deliverability" \
  --context-hint "Someone whose cold emails keep landing in spam" \
  --context-hint "A founder warming up a new email domain" \
  --max-bid-usd 60 \
  --confirm

# Pause/activate/archive ad groups
openai-ads adgroups pause <id> --confirm
openai-ads adgroups activate <id> --confirm
openai-ads adgroups archive <id> --confirm
```

### Upload Images

```sh
# Upload from public URL (R2, CDN, etc.)
openai-ads upload image-url https://<your-public-image-host>/cold-email-ad.png

# Upload from local file (multipart)
openai-ads upload file ~/Downloads/ad-creative.png
```

Returns a `file_id` to use in ad creation.

### Ads

```sh
# List all ads
openai-ads ads list

# List ads for an ad group
openai-ads ads list --ad-group-id <adgroup-id>

# Get ad by ID
openai-ads ads get <ad-id>

# Create an ad (paused by default)
# Title ≤50 chars, body ≤100 chars (API limits)
openai-ads ads create \
  --ad-group-id <adgroup-id> \
  --name "AG1 native A" \
  --title "Cold emails landing in spam?" \
  --body "We set up domains, warmup & SPF/DKIM/DMARC so your cold email hits the inbox. $97." \
  --target-url "https://<your-site>/<offer>?utm_source=chatgpt&utm_medium=cpm&utm_campaign=97-cold-email&utm_term=deliverability&utm_content=ag1-native" \
  --file-id <file-id-from-upload> \
  --dry-run

# Confirm to create
openai-ads ads create \
  --ad-group-id <adgroup-id> \
  --name "AG1 native A" \
  --title "Cold emails landing in spam?" \
  --body "We set up domains, warmup & SPF/DKIM/DMARC so your cold email hits the inbox. $97." \
  --target-url "https://<your-site>/<offer>?utm_source=chatgpt&utm_medium=cpm&utm_campaign=97-cold-email&utm_term=deliverability&utm_content=ag1-native" \
  --file-id <file-id-from-upload> \
  --confirm

# Pause/activate/archive ads
openai-ads ads pause <id> --confirm
openai-ads ads activate <id> --confirm
openai-ads ads archive <id> --confirm
```

### Reporting

```sh
# Fetch insights/reporting
# TODO: exact schema TBD — verify against https://developers.openai.com/docs/guides/ads/insights
openai-ads insights report [--campaign-id ID] [--ad-group-id ID] [--ad-id ID] \
  [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]
```

## Write Safety

Every mutation (create/update/pause/delete) requires explicit confirmation:

- **default (no flag)**: prints the payload and REFUSES to send (safe by default)
- **`--dry-run`**: prints the payload and returns without sending
- **`--confirm`**: actually sends the request to the API

Safe-by-default: no create/update/pause/archive request goes out without `--confirm`.

```sh
# Dry-run to preview
openai-ads campaigns create --name "Test Campaign" --dry-run

# Confirm to execute
openai-ads campaigns create --name "Test Campaign" --confirm
```

## Key redaction

API keys (`sk-svcacct-...`) are redacted from all error output. Never commit `.env.local` or leave the key in shell history.

## Money conversion

All amounts in the API are **micros** (USD × 1,000,000). This CLI accepts USD as input and auto-converts:

- `--budget-usd 1000` → 1,000,000,000 micros
- `--max-bid-usd 60` → 60,000,000 micros (for CPM)

## Next steps

Smoke-test read-only commands (verify, geo search) to confirm auth works:

```sh
# Must have OPENAI_ADS_API_KEY set or ~/Downloads/ads-manager-api-key.txt in place
openai-ads verify
openai-ads geo "United States"
```

For full campaign creation, follow the `campaigns create`, `adgroups create`, `upload`, `ads create` flow in sequence. Always use `--dry-run` first, then `--confirm` to go live.

See [`../reference/openai-ads-api.md`](../reference/openai-ads-api.md) for full API reference and the $97 Cold Email Setup worked example.
