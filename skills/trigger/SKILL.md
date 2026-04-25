---
name: trigger
version: 1.0.0
description: "Create DM keyword triggers with auto-generated copy in Jay's voice. Matches keyword topics to the best offer/link from the KB, generates a short DM reply, shows for approval, then saves to Notion + Supabase. Use when the user says '/trigger KEYWORD', 'create trigger', 'new trigger', 'add trigger', 'dm trigger', or 'add dm keyword'."
---

# DM Keyword Trigger Creator

Create and save DM keyword triggers with auto-generated copy in Jay's brand voice.

## Trigger

- `/trigger KEYWORD` or `/trigger KEYWORD "optional context"`
- Also triggers on: "create trigger", "new trigger", "add trigger", "dm trigger", "add dm keyword"

## Workflow

```
1. Parse keyword and optional context from input
2. If no context provided, infer topic from keyword
3. Read references/link-kb.md → match keyword topic to best offer/link
4. Generate DM reply in Jay's voice
5. Show message for approval (editable)
6. On approval → run save script → report result
```

## Voice Authority

Chain to `brand-voice/SKILL.md` for voice rules. DM triggers use **Mode 5: Casual/Community** as primary tone, blended with **Mode 1: Teaching** when the keyword is educational.

## Input Parsing

```
/trigger CODE                    → keyword="CODE", context=auto (Claude Code topic)
/trigger LEADS "link to 8M DB"  → keyword="LEADS", context="link to 8M DB"
/trigger MYWORD                  → keyword="MYWORD", context=ask user
```

If keyword topic is ambiguous and no context is provided, ask: "What should this keyword link to or be about?"

## Link Selection

1. Read `references/link-kb.md` (relative to this skill directory)
2. Match the keyword (or user-provided context) to the best topic row
3. If user provides a specific link, use that instead
4. Always append UTM: `?utm_source=dm&utm_content={keyword_lowercase}`
5. Do NOT add UTMs to affiliate links (Instantly, AimFox, etc.) - they have native tracking

## Message Generation Rules

### Format
- **50-150 words max** (DMs are short - respect the medium)
- 3-5 short paragraphs
- One link only (the best match)

### Structure
1. **Casual opener** - "Hey!", "Thanks for the interest!", "Here you go!", "Glad you asked!"
2. **Value line** - What they get (1-2 sentences max)
3. **Link** - Full URL with UTM on its own line
4. **Optional closer** - Signature phrase, PS, or Skool community mention

### Voice Rules (from brand-voice)
- No em dashes (`-` or `...` only)
- No banned AI words (delve, leverage, seamless, etc.)
- No hedging (maybe, perhaps, potentially)
- Active voice always
- Conversational tone - texting a friend, not writing a press release
- 1-2 emoji max, strategic placement only
- Signature phrases used naturally (not forced): "the sauce", "cheat code", "dialed in", "getting after it"

### Example DM Messages

**Keyword: CODE**
```
Hey! Here's the Claude Code cheatsheet.

It covers the exact prompts and workflows I use to build apps, automations, and internal tools - all with plain English commands. No coding required.

https://leadgenjay.com/r/claude-code-cheatsheet?utm_source=dm&utm_content=code

If you want the full deep-dive, the AIA community has a 17-lesson Claude Code module. 3,500+ members building together.

Talk soon,
Jay
```

**Keyword: LEADS**
```
Here you go! Free 8M B2B lead database.

Verified contacts across every industry. Download it, filter by niche, and start sending.

https://leadgenjay.com/8m-leads?utm_source=dm&utm_content=leads

If you need help setting up the sending infrastructure, check out the free Skool community - we help people get dialed in every day.

- Jay
```

**Keyword: INSTANTLY**
```
Here's my link for Instantly - the cold email platform I use daily.

https://instantly.ai/?via=jay

Use code LGJ10 for 10% off. It handles sending, warmup, and lead management all in one place. If you need help setting it up, the free community has walkthroughs for everything.

https://skool.com/ai-automation-insiders

- Jay
```

## User-Provided Override

If the user provides specific links or copy:
- Use their links/copy verbatim
- Only apply light voice polish (fix em dashes, banned words, passive voice)
- Do NOT replace their links with KB links
- Still add UTM if it's an LGJ domain link without one

## Approval Gate

**Always show the generated message before saving.** Present it like:

```
Keyword: CODE
Trigger type: both (comment + DM)
Channels: IG, LinkedIn

Message:
---
Hey! Here's the Claude Code cheatsheet...
---

Save this trigger to Notion + Supabase?
```

Wait for explicit approval. Allow the user to edit before saving.

## Save Flow

After approval, run the save script:

```bash
node .claude/skills/trigger/scripts/save-dm-trigger.mjs --keyword "KEYWORD" --message "THE APPROVED MESSAGE"
```

Only two flags: `--keyword` and `--message`. Trigger type and channels are display-only metadata shown in the approval gate — they are NOT saved to Notion or Supabase.

Report the result: "Saved to Notion + Supabase" or surface error details.

## Pre-Flight Checklist

Run before showing for approval:

- [ ] No banned AI words
- [ ] No em dashes or en dashes
- [ ] Link has UTM (unless affiliate)
- [ ] Under 150 words
- [ ] Reads natural aloud (conversational, not robotic)
- [ ] Only one primary link (plus optional Skool community mention)
- [ ] Keyword is UPPERCASE in the save command
