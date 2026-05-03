---
name: consulti-scrape
description: "Scrape leads from the Consulti.ai database (500M+ B2B, Google Maps local businesses, podcasts/YouTube creators) via the Consulti REST API. Use when pulling targeted leads for a cold email campaign, building a Consulti audience list, or excluding previously-scraped leads. Triggers: 'consulti-scrape', 'scrape consulti', 'pull consulti leads', 'consulti b2b', 'consulti list', 'add to consulti list', 'exclude consulti list'."
---

# Consulti Lead Scraping

Pulls leads from Consulti.ai's three databases and tracks each pull in a named Consulti audience list so repeat scrapes never return the same lead twice.

## Skill chain position

`consulti-scrape` → `/email-verification` (Consulti) → `/cold-email-campaign-deploy`.

Native Consulti JSON lands in the workspace. Turso ingest via `scripts/import-leads.sh` keeps the `leads` table authoritative so downstream skills read one source of truth.

## API reference

Base URL: `https://app.consulti.ai/api/v1` · Auth: `Authorization: Bearer $CONSULTI_API_KEY`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/leads/search` | 500M+ B2B DB — **supports `excludeListId`** |
| POST | `/local-leads/search` | Google Maps businesses (no native exclusion) |
| POST | `/creator-leads/search` | Podcasts / YouTube (no native exclusion) |
| GET  | `/lists` | List saved audience lists |
| POST | `/lists` | Create audience list |
| POST | `/lists/{listId}/add-leads` | Add members by `emails[]` or `businessIds[]` (upsert-safe) |
| POST | `/verify` | Email verification — primary method, used by `/email-verification` |
| POST | `/leads/enrich` | Enrich by email |
| POST | `/leads/find-by-linkedin` | Enrich by LinkedIn URL |
| POST | `/leads/find-by-name` | Find email by name + domain |

## Setup

1. app.consulti.ai → API settings → generate key
2. Append to `.env`: `CONSULTI_API_KEY=ctai_...`
3. Done. No MCP install, no restart.

## Audience list naming

One list per distinct ICP. Format: `lgj-scraped-{audience-slug}`:
- `lgj-scraped-us-saas-vp-marketing`
- `lgj-scraped-fl-marketing-agencies`
- `lgj-scraped-business-podcasts`

Re-scraping the same audience reuses the list. A new audience creates a new list. Internal ops reference the list UUID returned by `GET /lists` / `POST /lists`.

## Response shape (all searches)

```json
{
  "leads": [
    { "first_name": "John", "last_name": "Doe", "email": "john@acme.com",
      "job_title": "CEO", "company_name": "Acme Inc", "company_domain": "acme.com",
      "linkedin_url": "https://linkedin.com/in/johndoe", "city": "San Francisco",
      "country": "United States", "employees": 150, "industry": "Software",
      "email_status": "good" }
  ],
  "total": 1247, "page": 1, "size": 25
}
```

## B2B workflow (primary)

### 1. Resolve or create the audience list

```bash
source .env
AUDIENCE="lgj-scraped-us-saas-vp-marketing"

LIST_ID=$(curl -s -H "Authorization: Bearer $CONSULTI_API_KEY" \
  "https://app.consulti.ai/api/v1/lists" \
  | jq -r --arg n "$AUDIENCE" '.lists[] | select(.name == $n) | .id')

if [ -z "$LIST_ID" ]; then
  # POST /lists wraps the response in {"list": {...}} — extract .list.id
  LIST_ID=$(curl -s -X POST -H "Authorization: Bearer $CONSULTI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AUDIENCE\"}" \
    "https://app.consulti.ai/api/v1/lists" | jq -r '.list.id')
fi
echo "List: $LIST_ID"
```

### 2. Paginate `/leads/search` with native exclusion

```bash
RUN_DIR=".claude/skills/consulti-scrape-workspace/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
PAGE=1
TARGET=500   # hard cap — protect credits

> "$RUN_DIR/pages.jsonl"
while :; do
  RESP=$(curl -s -X POST -H "Authorization: Bearer $CONSULTI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"titles\":[\"VP Marketing\",\"Head of Marketing\"],
      \"industries\":[\"Computer Software\"],
      \"countries\":[\"United States\"],
      \"empMin\":50,\"empMax\":500,
      \"emailStatus\":\"good\",
      \"excludeListId\":\"$LIST_ID\",
      \"page\":$PAGE,\"size\":100
    }" \
    "https://app.consulti.ai/api/v1/leads/search")
  echo "$RESP" >> "$RUN_DIR/pages.jsonl"
  COUNT=$(echo "$RESP" | jq '.leads | length')
  TOTAL=$(echo "$RESP" | jq '.total')
  PULLED=$(jq -s 'map(.leads | length) | add' "$RUN_DIR/pages.jsonl")
  (( COUNT == 0 )) && break
  (( PAGE * 100 >= TOTAL )) && break
  (( PULLED >= TARGET )) && break
  (( PAGE++ ))
done

jq -s '{leads: (map(.leads[]) | unique_by(.email)), total: (map(.total) | max)}' \
  "$RUN_DIR/pages.jsonl" > "$RUN_DIR/leads.json"
```

### 3. Add emails to the audience list

Batches of ≤ 1000. `add-leads` is upsert-safe so retry on transient failures is cheap.

```bash
EMAILS=$(jq '[.leads[].email | select(. != null)]' "$RUN_DIR/leads.json")
curl -s -X POST -H "Authorization: Bearer $CONSULTI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"emails\":$EMAILS}" \
  "https://app.consulti.ai/api/v1/lists/$LIST_ID/add-leads"
```

### 4. Import to Turso

The import script's `leads-finder` mapper matches nearly all Consulti fields — a small `jq` rename handles `linkedin_url` → `linkedin` and coerces `employees` to a string for `company_size`.

```bash
jq '[.leads[] | {
  first_name, last_name, email, job_title,
  company_name, company_domain, industry,
  company_size: (.employees // empty | tostring),
  city, state, country,
  linkedin: .linkedin_url
}]' "$RUN_DIR/leads.json" \
  | ./scripts/import-leads.sh - consulti
```

This writes `source_actor='consulti'` on every lead and creates one `scrape_jobs` row with `actor_name='consulti'`.

### 5. Tell the user to run `/email-verification` next

Report: `{run_dir, list_id, scraped, unique_emails, imported}`.

## Local workflow (Google Maps)

No native exclusion. Dedup client-side via `leads.google_place_id` in Turso.

```bash
# Pre-fetch known place IDs
EXCLUDES=$(source ./scripts/db-query.sh && db_query \
  "SELECT google_place_id FROM leads WHERE source_actor='consulti' AND google_place_id IS NOT NULL" \
  | jq -R . | jq -s .)

# Page → filter → save
curl -s -X POST -H "Authorization: Bearer $CONSULTI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"states":["FL"],"keywords":["marketing agency"],"hasEmail":true,"page":1,"size":100}' \
  "https://app.consulti.ai/api/v1/local-leads/search" \
  | jq --argjson ex "$EXCLUDES" \
      '.leads |= map(select((.google_place_id // .place_id) as $g | ($ex | index($g)) | not))' \
  > "$RUN_DIR/page-1.json"

# Add businessIds (NOT emails) to the audience list
BIDS=$(jq '[.leads[].id | select(. != null)]' "$RUN_DIR/page-1.json")
curl -s -X POST -H "Authorization: Bearer $CONSULTI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"businessIds\":$BIDS}" \
  "https://app.consulti.ai/api/v1/lists/$LIST_ID/add-leads"
```

Then `jq` the pages into `leads.json` and import with actor `consulti` as in step 4.

## Creator workflow (podcasts / YouTube)

```bash
curl -s -X POST -H "Authorization: Bearer $CONSULTI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source":"podcast","categories":["Business"],"hasEmail":true,"page":1,"size":100}' \
  "https://app.consulti.ai/api/v1/creator-leads/search"
```

Response uses `"creators"` key (not `"leads"`):
```json
{
  "creators": [
    {"id":"...", "name":"...", "email":"...", "source":"podcast", "category":"Business",
     "website":"https://...", "episodes":100, "language":"en"}
  ],
  "total": 2832, "page": 1, "size": 100
}
```

Dedup client-side against `leads.email` where `source_actor='consulti'`. Add members via `{emails}`.

## Input schemas

### `/leads/search` (B2B)
| Field | Type | Notes |
|-------|------|-------|
| `q` | string | Free-text over name/title/company/industry. Use this for fuzzy intent (`"web design"`, `"agency"`); `industries[]` is exact-match. |
| `titles` | string[] | e.g. `["CEO","Founder","VP Marketing"]` |
| `industries` | string[] | **Exact-match, case-sensitive** against Apollo's canonical list — see [Canonical industries](#canonical-industries) below. Wrong case or off-list strings silently return zero. |
| `countries` | string[] | Full country names (`"United States"`, not `"US"`) |
| `states` | string[] | Full state/region names |
| `cities` | string[] | |
| `company` | string | Company name search |
| `empMin` / `empMax` | number | Employee count bounds |
| `emailStatus` | `"good"` \| `"all"` | **Use `"good"`** — matches the `email_status` response value. `"verified"` silently returns 0 results. Default `all`. |
| `excludeListId` | string (UUID) | **Native exclusion — B2B only** |
| `page` / `size` | number | 1-indexed · max size 100 |

### `/local-leads/search`
`q`, `name`, `keywords[]`, `states[]` (full or 2-letter), `cities[]`, `zips[]`, `ratingMin/Max`, `reviewsMin/Max`, `hasEmail`, `hasPhone`, `hasWeb`, `page`, `size`.

### `/creator-leads/search`
`source: "youtube" | "podcast"` (**required**), `q`, `hasEmail`, `categories[]` (e.g. `["Business"]`), `niches[]`, `country`, `language`, `minSubscribers` / `maxSubscribers`, `minEpisodes`, `page`, `size`.

**Note:** Response uses `creators` key (array of creator objects with name, email, website, category, episodes, language, source fields).

## Canonical industries

`industries[]` is **case-sensitive exact-match** against Apollo's standardized list (`industry_std`). Off-list strings, lowercase variants, or `&` ↔ `and` swaps silently return zero. For fuzzy intent (e.g. "agencies", "web design"), use the `q` field instead.

The full 120-value list (use these strings verbatim):

```
Accounting · Aerospace & Defense · Agriculture · Apparel & Fashion · Architecture & Planning ·
Automotive · Banking · Biotechnology · Broadcast Media · Building Materials · Capital Markets ·
Chemicals · Computer Games · Computer Hardware · Computer Networking · Computer Software ·
Construction · Consumer Electronics · Consumer Goods · Consumer Services · Cosmetics ·
Defense & Space · Education Management · E-Learning · Electrical & Electronic Manufacturing ·
Entertainment · Environmental Services · Events Services · Executive Office · Facilities Services ·
Financial Services · Food & Beverages · Food Production · Furniture · Government Administration ·
Government Relations · Graphic Design · Health, Wellness & Fitness · Higher Education ·
Hospital & Health Care · Hospitality · Human Resources · Import & Export ·
Individual & Family Services · Industrial Automation · Information Services ·
Information Technology & Services · Insurance · Internet · Investment Banking ·
Investment Management · Law Practice · Legal Services · Leisure, Travel & Tourism ·
Logistics & Supply Chain · Luxury Goods & Jewelry · Machinery · Management Consulting ·
Manufacturing · Market Research · Marketing & Advertising · Mechanical & Industrial Engineering ·
Media Production · Medical Devices · Medical Practice · Mining & Metals ·
Motion Pictures & Film · Museums & Institutions · Music · Nanotechnology · Newspapers ·
Non-Profit Organization Management · Oil & Energy · Online Media · Outsourcing/Offshoring ·
Package/Freight Delivery · Packaging & Containers · Paper & Forest Products · Pharmaceuticals ·
Philanthropy · Photography · Plastics · Political Organization · Primary/Secondary Education ·
Printing · Professional Training & Coaching · Program Development · Public Policy ·
Public Relations & Communications · Public Safety · Publishing · Real Estate ·
Recreational Facilities & Services · Religious Institutions · Renewables & Environment ·
Research · Restaurants · Retail · Security & Investigations · Semiconductors · Shipbuilding ·
Sporting Goods · Sports · Staffing & Recruiting · Supermarkets · Telecommunications · Textiles ·
Think Tanks · Tobacco · Translation & Localization · Transportation/Trucking/Railroad ·
Utilities · Venture Capital & Private Equity · Veterinary · Warehousing · Wholesale ·
Wine & Spirits · Wireless · Writing & Editing
```

**Watch-outs:**
- `Health, Wellness & Fitness` and `Leisure, Travel & Tourism` contain commas — pass them as single array items, don't split.
- Use `&` (with spaces), not `and` — `"Marketing & Advertising"` ✓, `"Marketing and Advertising"` ✗.
- Common cold-email targets: `Marketing & Advertising`, `Internet`, `Computer Software`, `Information Technology & Services`, `Online Media`, `Public Relations & Communications`, `Management Consulting`, `Staffing & Recruiting`, `Professional Training & Coaching`.

## Pagination & credit safety

- Use `size: 100` always (max)
- Stop conditions: empty page, `page * size >= total`, or `pulled >= target_count`
- **`total: 10001` is a server-side cap** — when the true match count exceeds 10k the API returns `10001` literally. Do not trust it as a real count above 10k; rely on `pulled >= target_count` to stop.
- Credits deduct on **result view** (search cached for 30s server-side — repeat queries in-window are free)
- Always hard-cap every run with a `target_count` ceiling

## Gotchas

- **`emailStatus` enum is `"good" | "all"`** — `"verified"` silently returns 0 results and looks like an empty result set, not an error
- **`industries[]` is exact-match against the canonical list above** — wrong case or off-list strings return zero. Use `q` for fuzzy intent
- **`POST /lists` wraps the response in `{"list": {...}}`** — extract `.list.id`, not `.id`. `GET /lists` uses `.lists[].id` (plural). Don't conflate them
- **`total: 10001` is a server-side cap, not a true count** — at >10k matches the API returns the literal `10001`. Trust `pulled >= target_count` to stop, not `total`
- **`excludeListId` is B2B-only** — local + creator dedup happens client-side against Turso
- **Email masking on free tier** — do a `size: 1` smoke test first to confirm your API key returns full emails
- **`add-leads` upsert-safe** via `UNIQUE(list_id, email)` / `(list_id, business_id)` — resending batches is harmless
- **Pick the right ID field**: B2B + creators use `{emails}`, local uses `{businessIds}`
- **Field rename**: Consulti returns `linkedin_url`; the import script's mapper reads `linkedin` — the step-4 `jq` transform handles it
- **`employees` vs `company_size`**: Consulti's `employees` is a number; Turso `leads.company_size` is text — `jq | tostring` coerces

## Safety rules

- **Always** pass an audience list name — unnamed runs are not reproducible
- **Always** cap with `target_count` — runaway paginators drain credits fast
- **Always** smoke-test new `industries[]` strings with a `size:1` query first — wrong casing returns zero silently
- **Never** add scraped leads to a campaign without `/email-verification` — even `emailStatus: "good"` entries bounce occasionally
- **Never** skip `scripts/import-leads.sh` — Turso is how the chain dedups across skills
