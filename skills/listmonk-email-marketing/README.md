# Your AI email assistant (setup)

This is a **Claude skill** that runs your email marketing on your dedicated Listmonk
instance — it writes campaigns in your voice, builds and tests them, keeps them
compliant, sends them, and reads the results.

Anyone comfortable installing a small tool can set this up in ~5 minutes. If you'd
rather we run it for you, just say the word.

## 1. Install the skill (Claude Code)

Put this whole `listmonk-email-marketing/` folder into your Claude skills directory:

```
~/.claude/skills/listmonk-email-marketing/     # global (all projects), or
<your-project>/.claude/skills/listmonk-email-marketing/
```

Claude auto-discovers it. (Using Claude a different way? Ask us and we'll help you
wire it up.)

## 2. Add your credentials

The assistant talks to your instance with a private API token (this is separate
from your website login and is scoped so it can manage campaigns/subscribers but
**not** your deliverability settings). Set these in your shell:

```bash
export LISTMONK_BASE_URL="https://mail-<yourclient>.consulti.ai"   # your instance URL
export LISTMONK_API_USER="<your-api-user>"                         # the API user Consulti sent you
export LISTMONK_API_TOKEN="<your-api-token>"                       # keep this secret
```

Keep the token private — treat it like a password. If it ever leaks, tell us and
we'll rotate it instantly.

## 3. Test it

```bash
node scripts/listmonk.mjs lists
```

You should see your subscriber lists. That's it — you're set up.

## 4. Use it

Just talk to Claude with this skill installed:

- *"Write and send a newsletter announcing our November implant CE webinar."*
- *"Add these 40 contacts to my subscriber list."* (point it at a CSV)
- *"How did last week's campaign do?"*

Claude follows a safe workflow every time: it drafts in your voice, sends **you** a
test first, checks the email against deliverability + CAN-SPAM rules, and only sends
to your list after you say go.

## What's inside

- `SKILL.md` — the assistant's instructions (you don't need to read it).
- `scripts/listmonk.mjs` — the tool it uses to talk to your instance.
- `reference/rules-and-deliverability.md` — the sending rules it follows.
- `reference/ghost-ink.md` — how it writes in your voice.

## Requirements

Node.js 18 or newer (`node --version` to check). Nothing else to install.
