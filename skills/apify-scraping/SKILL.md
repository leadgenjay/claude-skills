---
name: apify-scraping
description: "Web scraping and lead research via Apify platform. Use when scraping websites for offer analysis, building lead lists, enriching prospect data, or researching companies."
---

# Apify Lead Scraping (B2B + Google Maps)

Two battle-tested Apify actors cover the full cold-email lead-gen surface. Both chain into `/email-verification` (Consulti) before campaign upload — single API, single credit pool.

## MCP server tools

`apify` MCP exposes:

| Tool | Purpose |
|------|---------|
| `search-actors` | Search Apify Store by keyword |
| `fetch-actor-details` | Description, input schema, pricing |
| `call-actor` | Run an Actor with input |
| `get-actor-output` / `get-dataset-items` | Pull results |
| `get-actor-run` / `get-actor-log` | Status + debug |
| `search-apify-docs` | Docs lookup |

`.mcp.json` runs the local CLI (`npx -y @apify/actors-mcp-server`). REST fallback: `POST https://api.apify.com/v2/acts/{actorId}/runs?token=$APIFY_TOKEN`.

## Quick decision

| Need | Actor | Cost | Emails returned? |
|------|-------|------|---|
| Decision-maker emails by industry/title/size | `code_crafter/leads-finder` | ~$3.80/1K | Yes (personal business) |
| Local businesses by custom search query | `compass/crawler-google-places` | ~$3/1K | No (phone + website only) |

## Actor 1 — Leads Finder (B2B decision makers)

**Actor:** `code_crafter/leads-finder` (id: `IoSHqwTR9YGhzccez`)
**Use when:** You need personal business emails of owners/founders/C-suite filtered by industry, headcount, geography, or title. Apollo/ZoomInfo alternative.

**Input:**
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

**Enums:**
- `seniority_level`: founder, owner, c_suite, director, partner, vp, head, manager, senior, entry, trainee
- `size`: 1-10, 11-20, 21-50, 51-100, 101-200, 201-500, 501-1000, 1001-2000, 2001-5000, 5001-10000, 10001-20000, 20001-50000, 50000+
- `contact_location`: lowercase country names (`"united states"`, `"united kingdom"`)
- `company_industry`: lowercase with ampersands (`"marketing & advertising"`, `"computer software"`)

**Output fields:** `first_name`, `last_name`, `email`, `personal_email`, `mobile_number`, `job_title`, `linkedin`, `company_name`, `company_website`, `company_domain`, `industry`, `company_size`, `company_annual_revenue`, `company_technologies`, `city`, `state`, `country`

**Yield:** ~40% Consulti-safe out of the box. Rest are catch-all / role / unknown — Consulti filters these in one pass.

## Actor 2 — Google Maps Scraper (local businesses)

**Actor:** `compass/crawler-google-places`
**Use when:** You need local businesses by category + city/region (plumbers in Miami, HVAC in Dallas). No emails returned — pair with `/consulti-scrape` (creator/local mode) or use the website + name to derive an email and verify.

**Input:**
```json
{
  "searchStringsArray": ["plumber in Miami FL"],
  "maxCrawledPlacesPerSearch": 100,
  "language": "en"
}
```

**Output fields:** business name, address, phone, website, rating, reviewsCount, category, placeId, location coords. 100% phone + website rate in testing.

**DO NOT USE:** `microworlds/crawler-google-places` — undocumented schema, 0 results.

## Pipelines

### B2B pipeline — `leads-finder` → `/email-verification`
```
1. Apify call-actor: code_crafter/leads-finder with ICP filters
2. get-dataset-items → CSV: first_name, last_name, email, company_domain, job_title
3. /email-verification (Consulti /verify) on the email column
   - status=good      → add to campaign
   - status=risky     → drop (catch-all/role/disposable)
   - status=bad       → drop
   - status=unknown   → retry once, drop on 2nd unknown
4. Upload survivors to Email Bison or Instantly
```

### Local pipeline — `compass/crawler-google-places` → `/email-verification`
```
1. Apify call-actor: compass/crawler-google-places with searchStringsArray
2. get-dataset-items → name, website, phone, address
3. Derive owner email candidates from website domain + owner name
   (LinkedIn / About page / Google "{company} owner {city}")
4. /email-verification (Consulti /verify) on each candidate
5. Upload status=good only to Email Bison or Instantly
```

Bounce-rate target: < 3%. Pause any campaign at > 5%.

## Environment

- `APIFY_TOKEN` in `.env`
- `apify` MCP server in `.mcp.json`
- Chains to: `/email-verification` (Consulti `POST /api/v1/verify`, `CONSULTI_API_KEY`)
