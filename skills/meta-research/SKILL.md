---
name: meta-research
description: >
  Build your Meta ads strategy from real market data: research competitors, pull + classify their
  live ads from the Meta Ad Library, and synthesize an intelligence brief (ICP, offer positioning,
  proven hooks, angles, formats) that your campaigns inherit. Interview-driven and standalone -
  brings your own Meta Ad Library access (free) and an optional scraper key; writes a local
  strategy.md. Use when the user says "meta research", "ad research", "competitor ads", "build my
  meta strategy", "what ads are working", or "ad angles".
---

# meta-research — Strategy & Competitor Research (standalone)

Turn the Meta Ad Library (every active ad on the platform, public + free) into a strategy your
campaigns inherit: who to target, what to say, and which angles to test first.

## Step 0 — Interview (gather inputs)

Ask the user:
1. **Offer** - what they sell, the price, the core promise.
2. **Ideal customer** - who buys (role, situation, pain).
3. **Competitors** - 3-10 brands/pages running ads in their space (names or Facebook Page URLs). If they don't know any, you'll find them via Ad Library keyword search in Step 1.
4. **Budget band** - rough monthly ad budget (frames how many angles to test).
5. **Existing winners** - any ad/angle that already worked for them.

Echo back the scope and confirm before pulling data. If the user can't name their offer or their ideal customer, STOP and pin those down first — a brief built on guesses is worthless. (No env vars or tools are required for the free manual path; only the optional scraper in Step 2 needs an API key.)

## Step 1 — Build the competitor set

For each competitor, find their **Facebook Page ID** (Ad Library shows it; or use the page's About
-> Page transparency). Keep a `research/competitors.json` list of `{ name, pageId, niche }`. If the
user has none, search the Ad Library by category keywords and pick the advertisers with the most
active, long-running ads (longevity = the ad is profitable).

## Step 2 — Pull their live ads

Two ways:
- **Manual (free, no key):** open `facebook.com/ads/library`, filter by country + the page, and skim
  the active ads. Good for a quick read of 1-3 competitors.
- **Automated (optional scraper key):** use a Meta Ad Library scraper actor (e.g. on Apify) with
  your own API token to pull ads at scale into `research/scraped-ads.json`. **Cost-gate it:** these
  bill per result - state the expected total (results x unit price) and get the user's OK before
  running. Never run a paid scrape without that confirmation.

For each ad capture: the hook (first line), the format (static / video / carousel), the angle
(problem-led, proof-led, offer-led, curiosity, us-vs-them, etc.), the CTA, and how long it's been
running (longevity = winner signal).

## Step 3 — Classify angles & formats

Tag every ad by **angle** and **format**. Count what recurs across competitors and what's been
running longest - those are the proven patterns. Note gaps (angles nobody is running = white space).

## Step 4 — Write the strategy brief

Write `strategy.md` with:
1. **ICP** - the customer the ads target (role, pain, desire, objections), tight enough to drive audience targeting.
2. **Offer positioning** - the promise + the differentiator vs. the competitors you studied.
3. **3+ ad angles to test** - each with a one-line hook and why it should work (backed by what you saw running).
4. **Format plan** - which formats to lead with (the ones winning in this niche).
5. **Targeting seeds** - interests, lookalike seeds (your best-customer list), and exclusions.

This file feeds `meta-launcher` (audiences + ads) and your creative.

## Step 5 — Summary

Report the competitor count, ads reviewed, the top recurring angles, the white-space opportunity, and
the 3 angles you recommend testing first. Hand off to creative + `meta-launcher`.

## Notes

- The Meta Ad Library is free and public - no paid tool is required to do real research.
- Keep all outputs in a local `research/` folder so the rest of the system can read them.
- Longevity is the single best free signal: an ad running for months is making money.
