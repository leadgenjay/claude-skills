---
name: LGJ-openclaw-skill-builder
description: Create custom OpenClaw skills and automations — skill anatomy (SKILL.md + references + scripts), workspace files (AGENTS.md, SOUL.md, MEMORY.md), memory patterns, and SOP creation. The meta-skill for extending your agent. Use when building custom workflows, creating workspace skills, or configuring your agent's personality and behavior.
---

# OpenClaw Skill Builder

The meta-skill for extending OpenClaw. Covers workspace architecture, identity files, memory patterns, SOP creation, and publishing custom skills to ClawHub.

---

## 1. Workspace Architecture

All files in `~/.openclaw/workspace/` are loaded on every agent start.

```
~/.openclaw/workspace/
├── AGENTS.md              # Critical behavior rules (hard constraints)
├── SOUL.md                # Persona, tone, communication style
├── TOOLS.md               # Tool-specific notes and preferences
├── IDENTITY.md            # Agent name, emoji, creature, vibe
├── USER.md                # Your profile (name, timezone, preferences)
├── MEMORY.md              # Durable memory — facts the agent always knows
├── memory/                # Organized long-term notes
│   ├── api-keys.md        # References to env vars (never raw keys)
│   ├── birthdays.md       # Dates and recurring events
│   ├── sent-notifications.md  # Deduplication log
│   └── sops/              # Standard operating procedures for cron jobs
│       ├── email-triage.md
│       ├── daily-briefing.md
│       └── weekly-report.md
├── skills/                # Custom skills (SKILL.md files)
│   └── my-custom-skill/
│       └── SKILL.md
└── scripts/               # Automation scripts called by cron jobs
    ├── morning-briefing.sh
    └── email-digest.py
```

Keep files focused — one concern per file.

---

## 2. Identity & Personality Files

These four files define WHO your agent is. Get them right and every interaction feels natural.

### IDENTITY.md — Agent name and character

```markdown
# Identity

- **Name:** Claw
- **Creature:** Owl (wise, always watching)
- **Vibe:** Calm, direct, no fluff
- **Emoji:** 🦉
```

Keep it short. The name and emoji appear in notifications and iMessage replies.

### USER.md — Your profile

```markdown
# User Profile

- **Name:** Jay Feldman
- **Preferred address:** Jay (never "Mr. Feldman", never "buddy")
- **Timezone:** America/New_York
- **Work hours:** 8am–6pm ET
- **Notes:**
  - I prefer bullet points over paragraphs
  - Lead Gen Jay is my business — all context flows from there
  - When in doubt, ask one clarifying question, not five
```

The agent uses this to personalize responses and schedule-aware behavior (e.g., no notifications after 10pm ET).

### SOUL.md — Communication style

```markdown
# Soul

## Reply Style
- Short, direct, no padding
- Bullet points for lists, not numbered unless order matters
- No filler phrases ("Great question!", "Certainly!", "Of course!")
- Confident assertions over hedged statements

## Platform Rules
- **iMessage:** NO MARKDOWN. No asterisks, no backticks, no headers.
  Use CAPS for emphasis. Use line breaks for structure.
- **Slack:** Light markdown OK. Keep threads short.
- **Email:** Full formatting fine. Professional tone.

## Never
- Never narrate your own actions ("I'm now going to...")
- Never apologize for being an AI
- Never say "As an AI language model..."
```

SOUL.md is the most impactful file. An agent without SOUL.md defaults to generic, robotic responses. The no-markdown-on-iMessage rule is especially important — markdown asterisks sent over iMessage look like `*hello*` literally.

### AGENTS.md — Hard behavior rules

```markdown
# Agent Rules

## Critical (Never Violate)
- NO NARRATION ON iMESSAGE. Send the answer, not commentary about what you're doing.
- CHECK ALL CREDENTIALS before asking the user to check them. Run `openclaw doctor` first.
- AUTO-ADD recurring tasks to the task manager. Don't ask, just do it.
- NEVER send duplicate notifications. Check `memory/sent-notifications.md` first.
- NEVER commit API keys to git. Reference env var names only.

## Workflow Rules
- When asked to research something, search first, then summarize. Don't ask for clarification unless truly ambiguous.
- When a cron job fails, notify immediately with the error message, not just "something went wrong."
- Prefer one decisive action over asking permission for every sub-step.

## Escalation
- If a task touches billing, payments, or account deletion: pause and confirm with the user before acting.
- If a script would modify more than 10 files: show a summary and ask for approval first.
```

AGENTS.md constraints are non-negotiable. The agent treats them as hard rules, not suggestions.

---

## 3. Memory File Patterns

Use structured memory files for facts that must persist across conversations and cron job runs.

### MEMORY.md — Top-level durable facts

```markdown
# Memory

## Business Context
- Lead Gen Jay is a lead generation agency
- Primary offer: AI Automation Insiders ($97/mo)
- Production site: https://leadgenjay.com
- Stack: Next.js, Supabase, Vercel, n8n

## Preferences
- Preferred email client: Superhuman
- Calendar: Google Calendar (main@leadgenjay.com)
- Task manager: Linear (workspace: leadgenjay)

## Frequently Used
- Staging URL: https://staging.leadgenjay.com
- Admin dashboard: https://leadgenjay.com/admin
- n8n instance: https://n8n.leadgenjay.com
```

### memory/api-keys.md — References only, NEVER raw values

```markdown
# API Key References

Store keys as environment variable names only. Never paste raw values here.

| Service | Env Var | Where Set |
|---------|---------|-----------|
| Anthropic | `ANTHROPIC_API_KEY` | `.env.local`, Vercel |
| OpenAI | `OPENAI_API_KEY` | `.env.local`, Vercel |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, Vercel |
| PostHog | `POSTHOG_API_KEY` | `.env.local`, Vercel |
| Hyros | `HYROS_API_KEY` | `.env.local`, Vercel |
```

### memory/birthdays.md — Recurring dates

```markdown
# Birthdays & Important Dates

| Person | Date | Note |
|--------|------|------|
| Mom | March 15 | Send flowers 2 days before |
| Sarah | July 4 | Text on the day |
| Business anniversary | September 1 | Post on social |
```

Cron jobs can reference this file to send proactive notifications.

### memory/sent-notifications.md — Deduplication log

```markdown
# Sent Notifications

Format: [ISO date] | [type] | [recipient] | [subject]

2026-03-14T08:00:00Z | daily-briefing | imessage:+15551234567 | Morning briefing
2026-03-14T10:30:00Z | alert | imessage:+15551234567 | Server CPU spike
```

Before sending any notification, cron SOPs should check this file to avoid sending the same message twice. After sending, append a new line.

---

## 4. Creating Workspace Skills

Skills are Markdown files that teach the agent to do specific things. They live in `~/.openclaw/workspace/skills/` or can be installed from ClawHub.

### Skill anatomy

```
~/.openclaw/workspace/skills/
└── my-skill/
    ├── SKILL.md          # Main skill file (required)
    └── references/       # Optional supplementary files
        ├── COMMANDS.md
        └── EXAMPLES.md
```

### SKILL.md structure

Every SKILL.md starts with YAML frontmatter:

```markdown
---
name: my-skill-name
description: One sentence describing what this skill does and when to use it.
---

# Skill Title

Brief intro paragraph.

---

## Section 1: First Topic

Step-by-step instructions...
```

### Writing tips

**Be actionable, not encyclopedic.** Every section should tell the agent what to DO, not just what things ARE. Instead of listing config options, show the exact edit with a code block.

**Use code blocks for every command.** If the agent needs to run something, it must be in a fenced code block — never inline prose.

**Tables for reference data.** Use tables for option lists, flag descriptions, and comparisons. Use numbered steps for procedures.

**Progressive disclosure.** Put the most common path first. Edge cases and troubleshooting go at the bottom.

---

## 5. SOP Creation for Cron Jobs

SOPs are the instructions your cron jobs follow. They live in `memory/sops/` and are referenced directly in cron job prompts.

### What makes a good SOP

A good SOP has four parts:

1. **Trigger** — what causes this job to run
2. **Steps** — numbered, atomic, specific
3. **Decision tree** — what to do in non-happy-path cases
4. **Error handling** — what to do when something fails

### Example: Email Triage SOP

Save as `memory/sops/email-triage.md`:

```markdown
# Email Triage SOP

## Trigger
Runs every weekday at 8am ET.

## Steps

1. Connect to Gmail via gog CLI: `gog gmail list --unread --max 50`
2. Classify each email:
   - **Actionable** — requires a response or task creation
   - **FYI** — no action needed, just information
   - **Junk** — newsletters, promos, automated notifications
3. For each Actionable email:
   a. Write a 1-sentence summary
   b. Extract the due date if mentioned
   c. Add to Linear task list via API
4. Compose a briefing message:
   - Count: "X actionable, Y FYI, Z junk"
   - List actionable items with summaries
   - Keep total under 200 words
5. Check `memory/sent-notifications.md` — if a briefing was already sent today, STOP.
6. Send briefing via iMessage to +15551234567
7. Append to `memory/sent-notifications.md`:
   `[timestamp] | email-triage | imessage:+15551234567 | Morning briefing`

## Edge Cases
- **No unread emails:** Send "Inbox zero." and stop.
- **More than 20 actionable:** Send count only, flag for manual review.
- **Gmail fails:** Retry once after 30s. If still failing, send error and stop.

## Error Handling
Log to `memory/sops/errors.md`, send one notification with step number and error, do not retry automatically.
```

### Linking SOPs to cron job prompts

When setting up the cron job in OpenClaw:

```bash
openclaw cron add \
  --schedule "0 8 * * 1-5" \
  --prompt "Run the email triage SOP. Instructions: @memory/sops/email-triage.md"
```

The `@memory/sops/email-triage.md` reference loads the file contents into the prompt at runtime.

---

## 6. Config Customization

The main config file is `~/.openclaw/config/openclaw.json`. It uses JSON5 format — you can add comments and trailing commas.

### Key sections

```json5
{
  // Channel configuration
  channels: {
    imessage: {
      enabled: true,
      dmPolicy: "allow-list",    // "allow-list" | "all" | "none"
      allowFrom: [
        "+15551234567",          // Your own number
        "+15559876543",          // Trusted contact
      ],
    },
    slack: {
      enabled: true,
      botToken: "${SLACK_BOT_TOKEN}",  // Reference env var
      appToken: "${SLACK_APP_TOKEN}",
    },
  },

  // Model fallback chain
  models: {
    primary: "claude-3-5-sonnet-20241022",
    fallbacks: [
      "gpt-4o",
      "gemini-1.5-pro",
    ],
    timeout: 30000,     // 30s per request
    maxRetries: 2,
  },

  // Memory search sources
  memory: {
    sources: [
      "~/.openclaw/workspace/MEMORY.md",
      "~/.openclaw/workspace/memory/",
    ],
    extraPaths: [
      "~/Documents/notes/",    // Search personal notes too
    ],
  },

  // Workspace
  workspace: "~/.openclaw/workspace",
  logLevel: "info",   // "debug" | "info" | "warn" | "error"
}
```

### Environment variable references

Use `${VAR_NAME}` in config — resolved at runtime from your shell environment. Set in `~/.zshrc` or `~/.bashrc`:

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..."
```

---

## 7. Publishing to ClawHub

Once your skill is working locally, share it with the community.

### Package structure

```
my-skill/
├── SKILL.md          # Required
├── manifest.yaml     # Required for ClawHub
└── references/       # Optional
    └── EXAMPLES.md
```

### manifest.yaml fields

```yaml
name: my-skill-name
version: 1.0.0
description: One sentence describing the skill.
author: your-github-handle
tags:
  - automation
  - productivity
files:
  - SKILL.md
  - references/EXAMPLES.md
```

### Test before publish

```bash
# Install locally
cp -r my-skill/ ~/.openclaw/workspace/skills/

# Restart and test all workflows, edge cases (empty inputs, network failures, missing files)
# Review SKILL.md for any hardcoded values that should be configurable
```

### Publish

```bash
cd my-skill/
clawhub publish
# Prompts for ClawHub auth, then publishes to:
# clawhub.com/skills/your-handle/my-skill-name
```

---

## 8. Pro Tips

**SOUL.md is the highest-leverage file.** Without it, your agent sounds like a generic chatbot. With a well-crafted SOUL.md, every iMessage reply feels like it came from a human assistant who knows you.

**No markdown on iMessage.** The most common mistake. Test by sending yourself a message and checking your phone — if you see literal `*asterisks*`, fix your SOUL.md.

**Git backup your workspace.**

```bash
cd ~/.openclaw/workspace
git init && git add -A && git commit -m "Initial workspace"
git remote add origin git@github.com:yourusername/openclaw-workspace-private.git
git push -u origin main
```

Keep the repo private — it references env var names and personal preferences.

**Iterate on SOPs after real-world testing.** Write the first draft, run it 5 times, then rewrite based on what actually happened. The first draft always misses at least one edge case.

**One memory file per concern.** Don't dump everything into MEMORY.md. Focused files (`memory/clients.md`, `memory/sops/email-triage.md`) are far easier to search and maintain.

**Test config changes without restarting.** Most config changes take effect on the next request. Only model auth and daemon settings require a full restart.

---

## Resources

- **OpenClaw Docs:** [docs.openclaw.ai](https://docs.openclaw.ai)
- **ClawHub (Skill Registry):** [clawhub.com](https://clawhub.com)
- **OpenClaw GitHub:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- **Cheat Sheet:** [leadgenjay.com/openclaw](https://leadgenjay.com/openclaw)
- **Discord:** [discord.gg/clawd](https://discord.gg/clawd)
