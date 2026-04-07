---
name: apify-scraping
description: "Web scraping and lead research via Apify platform. Use when scraping websites for offer analysis, building lead lists, enriching prospect data, or researching companies."
---

# Apify Web Scraping & Lead Research

## Overview
Apify provides 2,700+ pre-built web scraping Actors. The Apify MCP server allows direct Actor execution from Claude Code.

## MCP Server Tools

The `apify` MCP server provides these tools:

| Tool | Purpose |
|------|---------|
| `search-actors` | Search Apify Store for scrapers by keyword |
| `fetch-actor-details` | Get Actor description, input schema, pricing |
| `call-actor` | Run an Actor with input parameters |
| `get-actor-output` | Retrieve results from a completed run |
| `get-actor-run` | Check run status (RUNNING, SUCCEEDED, FAILED) |
| `get-actor-log` | View Actor execution logs for debugging |
| `get-dataset-items` | Fetch items from a dataset by ID |
| `search-apify-docs` | Search Apify documentation |

### MCP Config
Currently using local CLI in `.mcp.json`:
```json
"apify": {
  "command": "npx",
  "args": ["-y", "@apify/actors-mcp-server"],
  "env": { "APIFY_TOKEN": "{APIFY_TOKEN}" }
}
```
Alternative remote endpoint: `https://mcp.apify.com` (SSE transport).

## Top Actors for Cold Email Lead Gen

> **Tested 2026-03-15.** Actors ranked by real test results, not marketing claims.

### Tier 1: PROVEN — Use These

#### Leads Finder (Decision-Maker Emails) — BEST FOR COLD EMAIL
- **Actor:** `code_crafter/leads-finder` (ID: `IoSHqwTR9YGhzccez`, 3.9★, 23K users, 484K runs)
- **Price:** ~$3.80/1K leads
- **Use:** Find decision makers with personal business emails. Filters by title, seniority, industry, company size, location. Apollo/ZoomInfo alternative.
- **Input:**
```json
{
  "contact_job_title": ["owner", "founder", "ceo"],
  "seniority_level": ["owner", "founder", "c_suite"],
  "contact_location": ["united states"],
  "company_industry": ["marketing & advertising", "internet", "information technology & services"],
  "size": ["1-10", "11-20", "21-50", "51-100"],
  "fetch_count": 100
}
```
- **Key enums:**
  - `seniority_level`: founder, owner, c_suite, director, partner, vp, head, manager, senior, entry, trainee
  - `size`: 1-10, 11-20, 21-50, 51-100, 101-200, 201-500, 501-1000, 1001-2000, 2001-5000, 5001-10000, 10001-20000, 20001-50000, 50000+
  - `contact_location`: lowercase country names ("united states", "united kingdom", etc.)
  - `company_industry`: lowercase with ampersands ("marketing & advertising", "computer software", etc.)
- **Output:** first_name, last_name, email, personal_email, mobile_number, job_title, linkedin, company_name, company_website, company_domain, industry, company_size, company_annual_revenue, company_technologies, city, state, country
- **Test result:** 10/10 results, perfect targeting (US owners, <100 employees, marketing/IT). 90% have business email, 30% have mobile numbers, 30% have personal emails. 40% Reacher-safe.
- **Note:** This is the go-to actor for cold email lead gen. Unlike xmiso (role account emails) or Compass (no emails), this returns personal business emails to actual decision makers.

#### Google Maps Scraper (Local Business Leads) — BEST DISCOVERY TOOL
- **Actor:** `compass/crawler-google-places` (4.7★, 307K users)
- **Price:** ~$3/1K results
- **Use:** Find local businesses by category + location. Best-in-class for local B2B.
- **Input:**
```json
{
  "searchStringsArray": ["plumber in Miami FL"],
  "maxCrawledPlacesPerSearch": 100,
  "language": "en"
}
```
- **Output:** Business name, address, phone, website, rating, reviews count, category, placeId, location coords
- **Test result:** 10/10 results, 100% phone rate, 100% website rate, all correctly geo-targeted to Miami
- **Note:** No built-in email extraction — pair with email guesser pipeline or dedicated email finder
- **DO NOT USE `microworlds/crawler-google-places`** — undocumented input schema, returns 0 results

#### US Businesses Pre-Scraped Database — BEST FOR BULK US LEADS
- **Actor:** `xmiso_scrapers/millions-us-businesses-leads-with-emails-from-google-maps` (ID: `SO9xTra0rtb9NNVfw`)
- **Price:** ~$0.013/lead ($0.13/10 results)
- **Use:** Pre-scraped 10M+ US businesses from Google Maps. Filter by category + state. Instant results.
- **Input:**
```json
{
  "category": "marketing_agency",
  "state": "FL",
  "maxResults": 100
}
```
- **Category field:** snake_case enum of Google Maps categories. Key categories for cold email:
  - `marketing_agency`, `advertising_agency`, `internet_marketing_service`, `branding_agency`, `design_agency`
  - `software_company`, `consultant`, `business_management_consultant`, `financial_consultant`
  - `insurance_agency`, `real_estate_agency`, `commercial_real_estate_agency`
  - `employment_agency`, `temp_agency`, `human_ressource_consulting`
  - `e_commerce_agency`, `direct_mail_advertising`
- **State field:** 2-letter US state codes (`FL`, `TX`, `CA`, etc.) or `"All"` for nationwide
- **Output fields:** name (100%), street (100%), city (100%), phone_number (100%), url/website (100%), email (100%), google_business_categories, google_maps_url, facebook (80%), instagram (60%), linkedin (70%)
- **Email quality:** 30% Reacher-safe, 70% role accounts (info@, support@). Pre-scraped emails are mostly generic — use email guesser pipeline for decision-maker emails.
- **Test result:** 10/10 results, perfect FL targeting, all marketing agencies, excellent data coverage

#### LinkedIn Profile Scraper (Profile Data) — GOOD FOR ENRICHMENT
- **Actor:** `harvestapi/linkedin-profile-scraper` (4.7★)
- **Price:** $4-10/1K profiles
- **Use:** Scrape LinkedIn profiles for enrichment data. No cookies needed.
- **Input:**
```json
{
  "urls": ["https://www.linkedin.com/in/username"],
  "searchEmails": true
}
```
- **Output:** firstName, lastName, headline, currentPosition, location, connectionsCount, followerCount, about, profilePicture
- **Test result:** Excellent profile data quality. Email extraction did NOT work in testing (0 emails found despite `searchEmails: true`). Use for profile enrichment, not email finding.

### Tier 2: UNTESTED BUT PROMISING

#### Google Maps Email Scraper (Business Emails from Maps)
- **Actor:** `contacts-api/google-maps-email-scraper`
- **Use:** Extract email addresses from Google Maps business listings (combines Maps + email scraping)
- **Input:**
```json
{
  "queries": ["dentist in Los Angeles"],
  "maxResults": 200
}
```
- **Output:** Business name, email, phone, website, address
- **Status:** Not tested yet. Could solve the Compass + email gap.

### Tier 3: TESTED — DO NOT USE

#### coladeu/apollo-people-leads-scraper — BROKEN (CAPTCHA BLOCKED)
- Under "maintenance mode" — only pages 1-5 available. Hit CAPTCHA on first attempt, returned HTML on retries. 0 results, $0 cost.
- Apollo is actively blocking this scraper.

#### boneswill/leads-generator — TERRIBLE TARGETING, OVERPRICED
- Search targeting completely broken: "marketing agency owner United States" returned Malta, Czechia, bartender in US.
- $3.75 for 5 results (aborted). 0/4 emails verified safe by Reacher (2 invalid, 1 unknown, 1 risky catch-all).
- **DO NOT USE** — worse than random.

#### vdrmota/contact-info-scraper — UNRELIABLE
- Tested with 5 plumber websites. Only scraped 2/5 at depth 0 only. Zero emails, phones, or social links found.

#### peakydev/leads-scraper-ppe — BROKEN TARGETING, OVERPRICED
- Search targeting completely broken. $2.98 for ~4 results (aborted). Advertised $1/1K is false.

#### gordian/email-extractor — INFRASTRUCTURE BROKEN
- All requests failed with proxy 502/503 errors after 10 retries each.

#### anchor/email-phone-extractor — REQUIRES PAID RENTAL
- Free trial expired. Cannot test without renting.

#### microworlds/crawler-google-places — BROKEN INPUT SCHEMA
- Input params undocumented. 0 results in 3 attempts. Geocodes "undefined" to Ethiopia.

### Utility Actors (Not Lead Gen)

#### Website Content Crawler (Offer Scanning)
- **Actor:** `apify/website-content-crawler`
- **Use:** Scrape prospect company websites for offer scanning/ICP research
- **Input:** `{"startUrls": [{"url": "https://example.com"}], "maxCrawlPages": 10}`
- **Output:** Page content, metadata, links

#### Google Search Scraper
- **Actor:** `apify/google-search-scraper`
- **Use:** Find prospects by searching industry + role + location
- **Input:** `{"queries": "CEO SaaS company San Francisco", "maxPagesPerQuery": 3}`

## Lead Gen Workflow (Validated Pipeline)

### Quick Decision: Which Actor to Use?

| Need | Actor | Cost | Emails? |
|------|-------|------|---------|
| Decision-maker emails by industry/title/size | `code_crafter/leads-finder` | $3.80/1K | Yes (personal business) |
| US businesses by category + state (bulk) | `xmiso pre-scraped DB` | $0.013/lead | Yes (mostly role accounts) |
| Local businesses by custom search query | `compass/crawler-google-places` | $3/1K | No (phone + website) |
| LinkedIn profile enrichment | `harvestapi/linkedin-profile-scraper` | $4-10/1K | No (profile data only) |

### Pipeline A: leads-finder (Fastest — Emails Included)
```
1. Run leads-finder with ICP filters (industry, title, size, location)
2. Export: first_name, last_name, email, company_domain, job_title, mobile
3. Verify ALL emails → scripts/email-guesser.sh or direct Reacher check
   - safe → add to campaign
   - catch-all → No2Bounce validates → deliverable = add, undeliverable = skip
   - invalid/risky → skip
4. Import verified leads to Email Bison / Instantly
```
**Yield:** ~40% Reacher-safe from raw output. With catch-all validation, ~50-60%.

### Pipeline B: xmiso + Email Guesser (Cheapest — Bulk US)
```
1. Run xmiso with category + state filters → businesses with domain + phone
2. Find owner names (LinkedIn/About page/Google "{company} owner {city}")
3. Feed name + domain to email-guesser.sh → 3 permutations per person
   - Reacher verifies each guess
   - Catch-all guesses validated by No2Bounce
4. Import verified leads to Email Bison / Instantly
```
**Yield:** ~50% hit rate when owner name is known. Rate: ~3,333 people/day.

### Pipeline C: Google Maps + Email Guesser (Flexible Geo)
```
1. Run compass/crawler-google-places with search query (e.g., "plumber in Miami FL")
2. Get: business name, phone, website, address, reviews
3. Find owner names (same as Pipeline B)
4. Feed name + domain to email-guesser.sh
5. Import verified leads to Email Bison / Instantly
```

### Verification Flow (All Pipelines)
```
Email → Reacher (proxy endpoint)
  ├── safe + not disposable + not role → ACCEPT ✓
  ├── catch-all + deliverable → No2Bounce
  │     ├── Deliverable → ACCEPT ✓
  │     └── UnDeliverable/AcceptAll → REJECT ✗
  ├── risky (disposable/role) → REJECT ✗
  ├── invalid → REJECT ✗
  └── unknown → REJECT ✗
```
**Target:** < 3% bounce rate. Pause campaign if > 5%.

## Email Guesser Pipeline

**Script:** `scripts/email-guesser.sh`
**Purpose:** Generate email permutations from name + domain, verify with Reacher + No2Bounce

```bash
# Single lead test
echo "John,Smith,acme.com" | ./scripts/email-guesser.sh - output.csv

# Batch from CSV (header: firstName,lastName,domain)
./scripts/email-guesser.sh leads.csv verified-emails.csv
```

**Input CSV:** `firstName,lastName,domain` (header optional, auto-detected)
**Output CSV:** `firstName,lastName,domain,verifiedEmail,status,allGuesses`

**Status values:**
- `safe` — Reacher confirmed deliverable
- `safe (catch-all verified)` — Catch-all domain, No2Bounce confirmed real mailbox
- `no-match` — No valid email found from any permutation

**How it works:**
1. For "John Smith" at "acme.com", generates: `john@acme.com`, `john.smith@acme.com`, `jsmith@acme.com`
2. Verifies each via Reacher proxy endpoint (`reacher.nextwave.io` + SMTP proxy)
3. If Reacher says `safe` → accepts immediately
4. If Reacher says catch-all → sends to No2Bounce for final verdict
5. Returns first verified email, skips disposable/role accounts
6. Rate-limited: 1.1s between Reacher calls, ~3s for No2Bounce polling

**Capacity:**
- Reacher: 60 req/min, 10K verifications/day
- At 3 guesses/person: ~3,333 people/day
- No2Bounce: async (submit → poll), adds ~3-9s per catch-all check

## Known Issues (Updated 2026-03-15)
- **Role account emails**: Pre-scraped emails from xmiso/Maps are mostly `info@`/`support@` (70%). Use email guesser pipeline for decision-maker emails.
- **Owner name gap**: xmiso provides business data but NOT owner names. Need LinkedIn/website/Google for name lookup before email guessing.
- **MCP tools not always available**: The Apify MCP server may not connect in every session. Fallback: use Apify REST API directly (`POST https://api.apify.com/v2/acts/{actorId}/runs?token={APIFY_TOKEN}`).
- **Apollo scraper blocked**: `coladeu/apollo-people-leads-scraper` is captcha-blocked as of 2026-03-15. Do not use.

## Use Cases for Cold Email

### Offer Scanning
1. Use Website Content Crawler to scrape prospect's website
2. Extract: company overview, products/services, testimonials, case studies
3. Feed into cold-email-copywriting skill for ICP and messaging angle generation

### Competitor Research
1. Scrape competitor websites and review sites
2. Identify their messaging, pricing, positioning
3. Use for differentiation in cold email copy

## Environment
- **API Token:** `APIFY_TOKEN` in `.env`
- **MCP Config:** `apify` server in `.mcp.json`
