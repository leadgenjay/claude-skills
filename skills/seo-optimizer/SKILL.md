---
name: seo-optimizer
description: Comprehensive SEO optimization skill for leadgenjay.com. Combines technical audit, on-page optimization, keyword research, and Search Console analysis.
triggers:
  - optimize SEO
  - SEO audit
  - improve rankings
  - keyword research
  - search engine optimization
  - meta tags
  - structured data
  - JSON-LD
---

# SEO Optimizer

## When This Skill Activates

Use when optimizing search engine rankings, auditing pages, researching keywords, or implementing structured data for leadgenjay.com.

## SEO Infrastructure

### JSON-LD Structured Data (`src/lib/seo/json-ld.tsx`)

Available schemas:
- `websiteSchema()` — WebSite with SearchAction (homepage only)
- `organizationSchema()` — Organization with logo + sameAs (homepage only)
- `serviceSchema(overrides?)` — ProfessionalService for lead gen services
- `courseSchema({ name, description, url, offers? })` — Course for educational products
- `faqSchema(items)` — FAQPage for FAQ sections
- `breadcrumbSchema(items)` — BreadcrumbList for navigation
- `softwareApplicationSchema({ name, description, url })` — SoftwareApplication for tools

Usage:
```tsx
import { JsonLd, courseSchema } from "@/lib/seo/json-ld";
<JsonLd data={courseSchema({ name: "...", description: "...", url: "..." })} />
```

### Google Indexing API (`src/lib/seo/google-indexing.ts`)

```typescript
import { requestIndexing } from "@/lib/seo/google-indexing";
const result = await requestIndexing("https://leadgenjay.com/page");
```

### DataForSEO Client (`src/lib/website/dataforseo.ts`)

Functions: `getSearchVolume()`, `getKeywordSuggestions()`, `getRelatedKeywords()`, `getKeywordIdeas()`, `getSerpResults()`, `getKeywordDifficulty()`

### Dynamic Sitemap (`src/app/sitemap.ts`)

Async with ISR (1hr). Uses `getSitePages()` for dynamic page discovery. Excludes checkout, admin, API, demo pages.

## SEO Checklist for New Pages

1. Export `metadata` with title, description, canonical, OG tags, Twitter card
2. Add appropriate JSON-LD schema
3. Ensure page is included in dynamic sitemap (check page type filtering)
4. Request Google indexing via admin UI or API

## Metadata Conventions

- Use relative paths for `alternates.canonical` (metadataBase handles the domain)
- Sync `openGraph.url` with canonical path
- Checkout pages: add `robots: { index: false, follow: true }`
- Twitter card: always `summary_large_image`

## Keyword Research Workflow

1. Use DataForSEO MCP or client to research seed keywords
2. Analyze search volume, difficulty, and competition
3. Check current rankings via Search Console
4. Identify content gaps and optimization opportunities
5. Implement targeted meta tags and content updates
