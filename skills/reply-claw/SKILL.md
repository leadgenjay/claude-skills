# Reply Claw Skill

## What This Skill Does

Reply Claw is a multi-tenant setup wizard that deploys a 24/7 cold-email reply agent. It interviews you about your company, personas, and reply handling preferences; generates a company-specific knowledge base; validates all API keys (Bison, Anthropic, Turso, Telegram); and deploys a parameterized fork of the bison-replies agent to your nanoclaw container with separate cron jobs, config, and state tables.

The agent runs autonomously: every 8 minutes it fetches new replies from Email Bison, classifies them (interested / objection / no-reply), drafts responses grounded in your KB, and either posts to Telegram for review or auto-sends booking confirmations. Every minute, it polls Telegram for slash commands (`/approve`, `/skip`, `/edit`, `/mute`, `/agent on|off|status`) and executes them against Bison and Turso.

## When to Invoke

- `/reply-claw` — Start a new tenant (interview + deploy)
- `/reply-claw resume` — Resume an interrupted wizard from the last saved phase
- `/reply-claw status {slug}` — Check agent health, today's stats, last cron tick
- `/reply-claw reset {slug}` — Wipe tenant config and optionally drop Turso rows
- `/reply-claw deploy {slug}` — Re-deploy an existing tenant after config edits

## The 10 Wizard Phases

| # | Phase | Action |
|---|-------|--------|
| 0 | Welcome + Identity | Intro; collect tenant slug (kebab-case) and display name; create `tenants/{slug}/` directory |
| 1 | Bison Workspaces | Ask: how many workspaces (1–4)? For each: account key, base URL, API key. Validate via `GET /api/me`. Save as `EMAIL_BISON_{KEY_UPPER}_API_KEY` to `.env` |
| 2 | Personas | For each workspace: persona count, then per-persona name/role/email/auto_send_eligible. Optional: fetch live signature from Bison `/api/sender-emails` |
| 3 | KB Positioning | Free-text interview (~15 questions) → company facts, ICP, offer angle, pricing posture. Render into `kb/{slug}/{company-facts,pricing-posture,faq/*,objections/*}.md` from templates. Skip option drops template stubs only |
| 4 | Booking Links | Per (workspace, persona): Calendly URL. Lint for `utm_source=bison` (auto-append with confirm). Render `kb/{slug}/shared/booking-links.md` |
| 5 | AI + State Keys | Read `.env`; ask for missing. Validate: Anthropic (1-token `/v1/messages` ping), Turso (`SELECT 1`), Telegram (`getMe` + test message + user confirms receipt). Run migration after Turso validates |
| 6 | Nanoclaw Access | Ask: SSH alias (default `zeus`), container name (default `nanoclaw`), group folder (default `main`). Validate: `ssh {alias} "docker exec {container} echo ok"`. Discover chat_jid from `messages.db` query |
| 7 | Preferences | Ask: daily auto-send cap (default 15), confidence floor (default 0.85), dry-run (ON for week 1), classify/draft models |
| 8 | Render + Validate | Run render-config, render-kb, validate-keys (full pass). Print summary table. Offer per-section edit loop |
| 9 | Deploy | Ask: deploy now / show command / skip. If yes: rsync runtime + KB to nanoclaw, append env vars, recreate container with bind mount, install crontabs (`*/8` + `*/1`), smoke test 1 cycle. Post Telegram: "🤖 reply-claw deployed for {slug}" |
| 10 | Operator Handoff | Print: slash-command grammar, how to flip dry-run, log paths, `/reply-claw status` + `/reply-claw resume` |

## Architecture

The wizard runs locally (Claude Code on your Mac). At the end of Phase 9:

1. **SSH deploy** — rsync `runtime/scripts/`, `runtime/prompts/`, `runtime/migrations/` and the rendered tenant KB to `{ssh_alias}:{skill_install_path}/`
2. **Env vars** — append generated env-block to `{env_conf_path}` (e.g. `/data/nanoclaw/env.conf`)
3. **Container recreation** — recreate nanoclaw with a narrow bind mount (`--mount type=bind,source={skill_install_path},target=/app/container/skills/reply-claw,readonly`)
4. **Crontab installation** — install two lines:
   - `*/8 * * * * docker exec {container} node /app/container/skills/reply-claw/scripts/check-replies.mjs >> /var/log/reply-claw-{slug}.log 2>&1`
   - `*/1 * * * * docker exec {container} node /app/container/skills/reply-claw/scripts/slash-command-handler.mjs >> /var/log/reply-claw-{slug}-slash.log 2>&1`
5. **Smoke test** — run 1 cycle of check-replies in dry-run mode; verify Telegram post and log output
6. **State persistence** — tenant config saved to `.claude/skills/reply-claw/tenants/{slug}/config.json` (gitignored); wizard state cleaned after Phase 9

Both crontab lines invoke the scripts with `RC_TENANT_CONFIG=/app/container/skills/reply-claw/tenants/{slug}/config.json` in the environment.

## Operator Commands

Use these slash commands in Telegram after deployment:

| Command | Action |
|---------|--------|
| `/approve {bison_reply_id}` | Send the draft via Bison; mark reply sent; log action to Turso |
| `/edit {bison_reply_id} <text>` | Send custom text instead of draft; log edit + send |
| `/skip {bison_reply_id}` | Mark reply as skipped (no Bison call); log action |
| `/mute {thread_id}` | Mark all pending replies in this thread as muted (no further processing) |
| `/agent off` | Kill the 24/7 agent; existing drafts stay in Telegram, no new replies processed |
| `/agent on` | Resume the 24/7 agent from last position |
| `/agent status` | Reply with health summary: uptime, today's counts, last cron tick timestamp |

## Resume & Re-Edit

- **`/reply-claw resume`** — Reads `tenants/{slug}/wizard-state.json` and continues from the last saved phase. Useful if the wizard is interrupted
- **`/reply-claw {slug}`** — If a config already exists, offer a per-phase edit menu (re-interview Phase 3, re-validate Phase 5, etc.)

## Files Inventory

- **`interview/`** — 12 markdown files (01–12) covering each wizard phase. Each file lists Q's and choice specs for AskUserQuestion
- **`templates/`** — Handlebars-based templates for tenant config and KB. Rendered into `tenants/{slug}/` during Phase 8
- **`runtime/`** — Parameterized fork of bison-replies. Deployed to nanoclaw:
  - `prompts/{classify,draft}.md` — AI prompts for reply classification and drafting
  - `migrations/001_agent_replies.sql` — Turso schema for agent_replies, agent_state, etc.
  - `scripts/` — 6 Node.js + shell scripts (check-replies, slash-command-handler, send-bison-reply, auto-send-interested, classify-haiku, deploy-tenant)
- **`scripts/`** — Wizard tooling:
  - `wizard.mjs` — orchestrates 10 phases, persists state, supports resume
  - `render-config.mjs` — answers → `tenants/{slug}/config.json`
  - `render-kb.mjs` — answers → KB markdown files
  - `validate-keys.mjs` — live tests all 4 service classes
  - `apply-migration.mjs` — posts SQL to Turso `/v2/pipeline`
  - `deploy.sh` — host wrapper invoking `runtime/scripts/deploy-tenant.sh`
  - `status.sh` — agent health check
  - `reset-tenant.sh` — wipe config and drop Turso rows
- **`tenants/`** — generated; gitignored except `.gitkeep`

## Related Skills

- **[bison-replies](../)** — the LGJ-exclusive parent agent; reply-claw is a generalized, multi-tenant fork
- **[lead-tracking-db](../)** — Turso DB patterns; reply-claw uses identical Turso schema + migration strategy
- **[cold-email-strategy](../)** — KB authoring methodology for positioning, FAQs, objections
