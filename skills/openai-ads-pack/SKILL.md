---
name: openai-ads-pack
description: >
  Bundle: run ads inside ChatGPT end-to-end. Installs two chained skills — `openai-ads`
  (build/manage campaigns via the REST API + CLI) and `openai-ads-setup` (install conversion
  tracking: pixel + client events + server Conversions API). Use when you want both the
  campaign-building and the measurement side of OpenAI/ChatGPT Ads.
---

# OpenAI Ads (ChatGPT Ads) Pack

Two skills that chain into a complete workflow for advertising inside ChatGPT:

| Skill | What it does | When |
|---|---|---|
| **`openai-ads-setup`** | Conversion tracking — the `oaiq` pixel, client events (`lead_created` / `checkout_started` / `order_created`), and the server Conversions API; then define + link the events in Ads Manager. | **First** — so campaigns can optimize toward real conversions, not just clicks. |
| **`openai-ads`** | Build + manage campaigns — context-hint targeting (not keywords), campaigns → ad groups → ads → creatives → geo → insights, a key-redacting CLI, and a worked $97 example. Builds PAUSED. | **Then** — once tracking is live. |

**Recommended order:** install tracking → build campaigns → define + link conversion events → activate.

Installing this pack installs both skills; each also works standalone. See each skill's `SKILL.md` for
its **Step 0 prerequisites** — an approved OpenAI Ads account + service-account API key for `openai-ads`;
a pixel + a `ads.third_party_events.write`-scoped CAPI key for `openai-ads-setup`.

**Starting from nothing?** Each skill's Step 0 has a **"Getting started from zero"** walkthrough that takes
you through signup, approval, and minting each API key step by step — set up tracking first
(`openai-ads-setup`: create your pixel + Conversions key), then build (`openai-ads`: sign up + service-account
key + campaigns). Claude never writes a secret key for you; it walks you to where you mint each one.
