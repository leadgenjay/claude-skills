# Reply Claw — Multi-Tenant Cold Email Reply Agent

Deploy a 24/7 cold-email reply agent to your infrastructure in minutes.

## What It Does

Reply Claw is an interactive setup wizard that transforms your cold email workflow. It automatically classifies incoming replies into 11 categories, applies one of 8 custom Bison funnel tags to each lead (`Interested`, `Hard No`, `Soft No`, `Auto Reply`, `Follow up 7d`, `Follow up 30d`, `Booked`, `Lead Magnet` — exclusive: one funnel tag per lead), drafts personalized responses grounded in your KB, and either posts them to Telegram for your review or auto-sends booking confirmations to qualified leads — all without manual intervention.

Every 8 minutes, the agent polls your Email Bison workspace(s) for new tracked replies (untracked inbox spam is filtered out automatically to save Anthropic spend). Every minute, it checks for slash commands (`/approve`, `/skip`, `/edit`, `/mute`) to fine-tune actions in real time. The `Lead Magnet` tag swaps in post-send when the drafter delivers a resource instead of a booking link.

## Who This Is For

You're sending cold emails at scale (≥1 warmed mailbox on Email Bison) and want to:
- Automate reply classification and drafting
- Build a company-specific KB (FAQs, objection handlers, booking handoff) without hardcoding
- Run the agent on your own infrastructure (nanoclaw container on Zeus)
- Maintain tenant isolation (separate config, separate Turso tables, separate cron jobs)

## Prerequisites

Before running the wizard, gather:

1. **Email Bison workspace(s)** — ≥1 workspace with warmed mailboxes and connected domains
2. **API keys** — one per workspace (from Email Bison settings)
3. **Anthropic API key** — for reply classification + drafting (Claude 3.5 Haiku + Sonnet)
4. **Turso DB** — SQLite-compatible DB for agent state, reply history, and settings (free tier works)
5. **Telegram bot** — for review notifications + slash commands (create via @BotFather on Telegram)
6. **Zeus host** — nanoclaw container + SSH access + Docker + 2GB free disk (for agent runtime)

## What Gets Deployed

The wizard generates:

- **Per-tenant KB** — company facts, pricing posture, FAQ responses, objection handlers, booking links
- **Tenant config** — JSON file scoped to your workspace(s), personas, and preferences
- **24/7 agent** — two cron jobs on your Zeus host:
  - `*/8` reply checker — polls Bison, classifies, drafts, posts to Telegram
  - `*/1` slash-command handler — reads Telegram commands, executes actions, updates Turso

Both run inside your nanoclaw container in isolated mode (no access to other secrets).

## Setup Time

**~15 minutes** end-to-end:
- Interview: 8 min (company details, personas, booking links, preferences)
- Validation: 3 min (API key health checks)
- Deployment: 2 min (rsync + container restart + smoke test)
- Handoff: 1 min (operator command cheat sheet)

## Getting Started

Run this in Claude Code:

```
/reply-claw
```

The wizard will guide you through every step. If you get stuck, resume from where you left off with:

```
/reply-claw resume
```

To check agent status or view logs:

```
/reply-claw status
```

## Learn More

- **[bison-replies](../)** — the LGJ-exclusive parent agent (reference implementation)
- **[lead-tracking-db](../)** — Turso DB patterns for lead + agent state
- **[cold-email-strategy](../)** — how to author KB content for cold email
