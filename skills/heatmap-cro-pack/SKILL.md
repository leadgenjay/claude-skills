---
name: heatmap-cro-pack
description: >
  Bundle: run conversion-rate optimization end-to-end. Installs two chained skills —
  `heatmap-analyzer` (read Microsoft Clarity heatmaps, scroll depth, rage/dead clicks +
  session recordings, then propose PIE-scored A/B hypotheses) and `ab-testing-suite`
  (full A/B lifecycle on Next.js + Supabase: zero-flicker edge variant assignment,
  z-test winner declaration, iteration). Use when you want both the diagnosis and the
  experimentation side of CRO.
---

# Heatmap Conversion Optimization System (CRO Pack)

Two skills that chain into a complete conversion-rate-optimization loop:

| Skill | What it does | When |
|---|---|---|
| **`heatmap-analyzer`** | Diagnosis — query Microsoft Clarity (scroll depth, rage/dead clicks, engagement, session recordings) by funnel / variant / device, turn it into ranked Findings, and propose PIE-scored A/B test hypotheses. | **First** — find where conversions leak and what to test. |
| **`ab-testing-suite`** | Experimentation — stand up zero-flicker edge A/B testing on Next.js + Supabase, design the test from the hypothesis, track conversions the right way, run z-test significance, declare the winner, plan the next round. | **Then** — ship the test, measure it, document the win. |

**Recommended order:** wire tracking (Clarity + PostHog) → let it record a few days → `/heatmap analyze <page>` → pick a hypothesis → `/ab create <page>` → measure with `/ab status` / `/ab analyze` → `/ab conclude` + document the finding.

Installing this pack installs both skills; each also works standalone. See each skill's `SKILL.md` for its
**Step 0 prerequisites** — a Microsoft Clarity account + Data-Export token + the Clarity MCP for
`heatmap-analyzer`; a Next.js + Supabase project for `ab-testing-suite`; an optional PostHog project for
event + funnel-sequence analysis.

**Starting from nothing?** Each skill's Step 0 has a **"Getting started from zero"** walkthrough that takes
you through signup and every API key step by step — set up diagnosis first (`heatmap-analyzer`: create your
Clarity account, paste the tracking snippet, mint the Data-Export token, install the Clarity MCP; plus the
from-zero PostHog note for event analysis), then experimentation (`ab-testing-suite`: create a Supabase
project, run the migration, wire the middleware + tracker). Claude never writes a secret token or key for
you; it walks you to where you mint each one.
