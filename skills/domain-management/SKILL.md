---
name: domain-management
description: "Purchase and configure cold email domains across Dynadot, Spaceship, and Porkbun. Use when buying domains, checking availability, setting nameservers, or managing domain registrar accounts."
---

# Domain Management for Cold Email

## Dynadot API

- **Base URL:** `https://api.dynadot.com/api3.xml`
- **Auth:** Query parameter `key={DYNADOT_API_KEY}`
- **Response format:** XML

### Commands (via query params)
- `command=register` — Register domain
  - Params: `domain`, `duration=1`, `renew_option=donotrenew`, `lock=0`, `privacy=1`
- `command=set_ns` — Set nameservers
  - Params: `domain`, `ns0={nameserver1}`, `ns1={nameserver2}`
- `command=get_account_balance` — Check account balance
- `command=search` — Search domain availability
  - Params: `domain0=example.com` (**ONE domain per call only** — multi-domain returns error)
  - **Rate limit:** ~50 req/min. Use max 3 parallel requests with 1s delays. Exceeding triggers 1-minute cooldown.

### Example
```
GET https://api.dynadot.com/api3.xml?key={KEY}&command=register&domain=example.com&duration=1&renew_option=donotrenew&lock=0&privacy=1
```

## Spaceship API

- **Base URL:** `https://spaceship.dev/api/v1`
- **Auth Headers:** `X-API-Key: {SPACESHIP_API_KEY}`, `X-API-Secret: {SPACESHIP_API_SECRET}`

### Endpoints
- `POST /domains/available` — Bulk availability check (body: array of domains)
- `POST /domains/{domain}` — Register domain
- `PUT /domains/{domain}/nameservers` — Update nameservers
  - Body: `{"provider": "custom", "hosts": ["ns1.example.com", "ns2.example.com"]}`
  - **CRITICAL:** Must include `"provider": "custom"` and use `"hosts"` (NOT `"hostNames"`). Omitting `provider` returns 422. Using `hostNames` instead of `hosts` returns 422.
- `GET /domains` — List domains (paginated)
- `GET /domains/{domain}` — Get domain details

### Rate Limits
- 300 req/300s for listing
- 30 req/30s for registration
- 5 req/domain/300s for nameserver updates

## Porkbun API

- **Base URL:** `https://api.porkbun.com/api/json/v3`
- **Auth:** Body params `apikey` + `secretapikey` in every request

### Endpoints
- `POST /domain/updateNs/{domain}` — Update nameservers
  - Body: `{"secretapikey": "...", "apikey": "...", "ns": ["ns1", "ns2"]}`
- `POST /domain/register/{domain}` — Register domain
- `POST /domain/availability/{domain}` — Check availability
- `POST /dns/create/{domain}` — Create DNS record
- `POST /dns/retrieve/{domain}` — List DNS records

## Cold Email Domain Strategy
- Buy 3-5 domains per campaign
- NEVER use exact match of your primary business domain
- 2-3 mailboxes per domain max
- Set `privacy=1` (WHOIS guard) on all domains
- Set `renew_option=donotrenew` for cold email domains (1 year lifespan)
- Two DNS paths: (A) Cloudflare NS for domains needing custom DNS/page rules, (B) Winnr NS directly (`ns1-4.programessentials.com`) for simpler setups where Winnr manages everything

## Cloudflare Zone + NS Setup Workflow (Proven)

**ALWAYS use this serial workflow when adding domains to Cloudflare. Do NOT batch zone creation.**

### Why Serial
Free CF accounts have a **pending zone limit** (~10 zones). Bulk-creating zones hits the limit instantly. The serial approach (create 1 → set NS → wait → next) allows earlier zones to activate and free pending slots.

### Bash Script Template
```bash
#!/bin/bash
CF_TOKEN="{cloudflare_api_token}"
CF_ACCOUNT="{cloudflare_account_id}"
DY_KEY="{dynadot_api_key}"

DOMAINS=( domain1.com domain2.com domain3.com )

for domain in "${DOMAINS[@]}"; do
  # Step 1: Create Cloudflare zone
  result=$(curl -s --max-time 15 -X POST "https://api.cloudflare.com/client/v4/zones" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$domain\",\"account\":{\"id\":\"$CF_ACCOUNT\"},\"type\":\"full\"}")

  success=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))")

  if [ "$success" = "True" ]; then
    ns1=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['name_servers'][0])")
    ns2=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['name_servers'][1])")

    # Step 2: Set registrar NS immediately
    curl -s --max-time 10 "https://api.dynadot.com/api3.xml?key=${DY_KEY}&command=set_ns&domain=${domain}&ns0=${ns1}&ns1=${ns2}" > /dev/null
    echo "✓ $domain → $ns1, $ns2"
  else
    error=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',[])[0].get('message','unknown'))")
    if [[ "$error" == *"exceeded the limit"* ]]; then
      echo "⏳ $domain — zone limit, waiting 60s..."
      sleep 60
      # Retry once after wait
      # (repeat curl above)
    else
      echo "✗ $domain — $error"
    fi
  fi

  # Step 3: Wait 15 seconds before next domain
  sleep 15
done
```

### Key Rules
1. **One domain at a time** — create zone → set NS → wait → next
2. **15 second delay** between each domain (lets CF activate earlier zones)
3. **On zone limit error:** wait 60s and retry up to 3 times — earlier zones will have activated
4. **Set NS immediately** after zone creation (don't batch NS updates separately)
5. **CF token needs:** `Zone:Edit` + `DNS:Edit` permissions on the account
6. **Registrar NS varies per CF account** — always read `name_servers[]` from the zone creation response (e.g., `leland.ns.cloudflare.com`, `paris.ns.cloudflare.com`)
7. **For Spaceship/Porkbun:** replace the Dynadot `set_ns` call with the appropriate registrar API call

### Error Reference
| Error | Cause | Fix |
|-------|-------|-----|
| `exceeded the limit for adding zones` | Too many pending zones | Wait 60s, retry |
| `Requires permission "zone.create"` | Token missing Zone:Edit | Update token permissions |
| `zone already exists` | Domain already in this CF account | Skip, use existing zone |
- **TLD: `.com` ONLY** — do not use .io, .co, or other TLDs for cold email domains

## Cold Email Domain Naming Conventions

Given a **root brand** (e.g., `otterpr`), generate 50+ candidates using these patterns:

### Prefix Patterns (prefix + root)
| Prefix | Example |
|--------|---------|
| `get` | getotterpr.com |
| `try` | tryotterpr.com |
| `my` | myotterpr.com |
| `go` | gootterpr.com |
| `hello` | hellootterpr.com |
| `meet` | meettotterpr.com |
| `the` | theotterpr.com |
| `use` | useotterpr.com |
| `with` | withotterpr.com |
| `join` | joinotterpr.com |
| `hire` | hireotterpr.com |
| `run` | runotterpr.com |
| `via` | viaotterpr.com |
| `at` | atotterpr.com |
| `send` | sendotterpr.com |
| `reach` | reachotterpr.com |
| `contact` | contactotterpr.com |
| `team` | teamotterpr.com |

### Suffix Patterns (root + suffix)
| Suffix | Example |
|--------|---------|
| `hq` | otterprhq.com |
| `hub` | otterprhub.com |
| `team` | otterprteam.com |
| `group` | otterprgroup.com |
| `co` | otterprco.com |
| `agency` | otterpragency.com |
| `now` | otterprnow.com |
| `pro` | otterprpro.com |
| `media` | otterprmedia.com |
| `works` | otterprworks.com |
| `studio` | otterprstudio.com |
| `digital` | otterprdigital.com |
| `solutions` | otterprsolutions.com |
| `labs` | otterprlabs.com |
| `partners` | otterprpartners.com |
| `network` | otterprnetwork.com |
| `central` | otterprcentral.com |
| `office` | otterproffice.com |
| `mail` | otterprmail.com |
| `site` | otterprsite.com |
| `plus` | otterprplus.com |
| `x` | otterprx.com |

### Expanded Brand Patterns (root word + industry expansion)
Break the abbreviated root into its full meaning and recombine:
- `otter` + `pr` → otterpublicrelations, ottercommunications, ottercomms, otterrelations
- `otter` + industry → ottermedia, otteragency, otterconsulting, otteroutreach, otterstrategic, otterconnect, otterpress, otterstrategy

Then apply prefix/suffix patterns to expanded forms:
- `getottermedia.com`, `myottercomms.com`, `ottermediahq.com`, etc.

### Creative Abbreviations & Misspellings
Shorten or creatively respell the root/industry words to create unique domains:
- Drop vowels: `otterpr` → `ottrpr`, `ottrmedia`, `ottrcomms`
- Abbreviate industry: `publicrelations` → `pubrel`, `communications` → `comms`/`comm`, `media` → `mdia`
- Phonetic respelling: `otter` → `ottr`, `otrpr`
- Blend/mash: `otterpubrel`, `ottrpubrel`, `ottrelations`, `ottrreach`
- Add descriptive words: `otterprgroup`, `otterprdigital`, `otterprnetwork`

### Standalone Root Variations (root word + generic suffix)
| Pattern | Example |
|---------|---------|
| root + `hq` | otterhq.com |
| root + `hub` | otterhub.com |
| root + `team` | otterteam.com |
| root + `group` | ottergroup.com |
| root + `co` | otterco.com |
| root + `now` | otternow.com |
| root + `pro` | otterpro.com |
| root + `works` | otterworks.com |
| root + `studio` | otterstudio.com |
| root + `labs` | otterlabs.com |
| root + `partners` | otterpartners.com |

### Generation Strategy
1. Generate ALL prefix × root combinations (~18 prefixes × 1 root = 18)
2. Generate ALL root × suffix combinations (~22 suffixes = 22)
3. Generate expanded brand forms (~8-12 expansions)
4. Apply prefix/suffix to top expanded forms (~20-30 more)
5. Generate creative misspellings/abbreviations of root (e.g., `otterpr` → `ottrpr`, `otterpubrel`, `ottrcomms`, `ottrmedia`)
6. Total: ~80-120 candidates (.com only) → check availability → pick best 50
7. **Rate limit aware:** Check 3 at a time with 1.5s delay on Dynadot
8. **TLD: .com ONLY** — never suggest .io, .co, or other TLDs
