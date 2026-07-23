---
name: listmonk-email-marketing
description: Run your email marketing on your dedicated Listmonk instance with Claude — Ghost Ink generates your campaign copy and injects it straight into the branded email HTML, then builds, tests, and sends it while staying CAN-SPAM/deliverability compliant, and reads the results. Triggers on "email campaign", "newsletter", "send to my list", "write an email", "listmonk".
---

# Listmonk Email Marketing

This skill lets you run your whole email program on **your own private Listmonk
instance** (set up and hosted for you by Consulti) with Claude doing the heavy
lifting: drafting copy in your voice, building the campaign, running a test,
checking it against deliverability + legal rules, sending, and reading the stats.

You do **not** need to know Listmonk. Describe what you want ("announce next
month's implant CE webinar to my subscribers") and Claude handles the rest through
the tooling below.

## When to use

Use this skill whenever the user wants to: write or send an email campaign or
newsletter, import/manage subscribers, check how a past send performed, or ask
"is this email okay to send?".

## Step 0 — Prerequisites

Before any campaign work, verify these are present. If any is missing, STOP and get it
first — do NOT proceed with broken state or invent placeholder commands.

| Requirement | Check | Where to get it |
|---|---|---|
| Node.js 18+ | `node --version` (≥ v18) | https://nodejs.org |
| `LISTMONK_BASE_URL` | `echo $LISTMONK_BASE_URL` → `https://mail-<yourclient>.consulti.ai` | Consulti (your instance URL) |
| `LISTMONK_API_USER` | `echo $LISTMONK_API_USER` | Consulti (API username) |
| `LISTMONK_API_TOKEN` | `echo $LISTMONK_API_TOKEN` (keep secret) | Consulti (scoped API token) |
| Connectivity | `node scripts/listmonk.mjs lists` prints your lists | fails → recheck the three vars |

Set the three env vars (Consulti provides them — the API token is separate from the web login):

```bash
export LISTMONK_BASE_URL="https://mail-<yourclient>.consulti.ai"
export LISTMONK_API_USER="<your-api-user>"      # the API user Consulti sent you
export LISTMONK_API_TOKEN="<your-api-token>"     # provided by Consulti; keep secret
```

If `node scripts/listmonk.mjs lists` prints your lists, you're ready. The web UI (for manual
work) lives at the same base URL — log in with the admin username/password Consulti emailed
you (change that password on first login). If anything above is missing, STOP.

## The workflow (always follow this order)

1. **Clarify the goal** — audience, the one action you want readers to take, the
   deadline. If the user is vague, ask before writing.
2. **Ghost Ink — write the copy and inject it into the HTML** — generate the subject + body
   in the client's authentic voice and lay it into the branded email HTML, producing a
   finished, send-ready `.html`. See `reference/ghost-ink.md`. Never send AI-obvious copy.
3. **Build it** — create the campaign against the right list with the branded
   default template: `listmonk.mjs campaign-create`.
4. **Test it** — send yourself a test first, ALWAYS: `listmonk.mjs campaign-test <id> --to you@...`. Check rendering, links, and the unsubscribe footer.
5. **Compliance gate** — run through `reference/rules-and-deliverability.md`. Do
   not skip. If anything fails, fix before sending.
6. **Send** — `listmonk.mjs campaign-send <id>` (asks for confirmation). Respect
   the warm-up cap on a new sending domain.
7. **Read the results** — after a few hours: `listmonk.mjs stats <id>` (opens,
   clicks, bounces, complaints). Use it to segment the next send.

## Rules (never break these)

Full detail in `reference/rules-and-deliverability.md`. The non-negotiables:

- **Permission only.** Only email people who opted in. Never buy/scrape lists.
- **One-click unsubscribe + physical address** must be present (they're baked into
  your template — never remove the footer or the `{{ UnsubscribeURL }}` link).
- **Test before every send.** No exceptions.
- **Watch complaints + bounces.** If a send's complaint rate is climbing, stop and
  investigate — a spike can get the whole sending account suspended.
- **Warm-up.** A new sending domain ramps volume slowly (your instance is capped
  for this). Don't try to blast your whole list on day one.
- **Never send without the user's explicit go-ahead** on the final copy.

## Ghost Ink (generate + inject the copy)

"Ghost Ink" is the step where Claude generates the campaign copy and **injects it directly
into the email's branded HTML** — turning a brief plus your branded template into a finished,
send-ready HTML email (the same idea as the `inboxinsiders.io/email-optimizer` tool). The copy
still has to read like the client wrote it, not like AI. See `reference/ghost-ink.md` for the
flow plus the voice system, subject-line craft, structure, and worked example. Core idea:
study past emails / the brand's site, mirror their cadence, lead with one clear idea, keep it
human — then lay it into the HTML with the branded header/footer and unsubscribe block intact.

## Tooling — `scripts/listmonk.mjs`

Self-contained (Node 18+, no dependencies). Run `node scripts/listmonk.mjs help`.

| Command | What it does |
|---|---|
| `lists` | list your subscriber lists (+ counts) |
| `templates` | list available templates |
| `subscriber-add --email <e> [--name <n>] --list <id>` | add one subscriber |
| `import --list <id> --file <csv>` | import a CSV (`email,name` header) |
| `campaign-create --name <n> --subject <s> --list <id> [--template <id>] --body <file.html>` | create a draft campaign |
| `campaigns` | list campaigns + status |
| `campaign-test <id> --to <email>` | send a test copy |
| `campaign-send <id>` | start the send (confirmation required) |
| `stats [<id>]` | dashboard, or one campaign's opens/clicks/bounces |

Write actions echo what they'll do and require `--confirm` (or an interactive
"yes") before touching the live instance. Read actions are always safe.

## Guardrails for Claude

- Treat `campaign-send` like sending real mail to real people — confirm the final
  copy and the target list with the user first, then run it with `--confirm`.
- If `stats` shows a complaint rate above ~0.1% or bounces above ~5% on a send,
  tell the user to pause and clean the list before the next campaign.
- Never invent subscriber data, never email a list the user didn't name, and never
  remove the compliance footer to "clean up" a template.
