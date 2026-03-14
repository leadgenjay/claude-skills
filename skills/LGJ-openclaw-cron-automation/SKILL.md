---
name: openclaw-cron-automation
description: Set up OpenClaw cron jobs — expression syntax, YAML templates for email checks, calendar previews, ad reports, and overnight work sessions. Includes deduplication, session isolation, and timezone handling. Use when automating recurring tasks.
---

# OpenClaw Cron Automation

Complete guide for scheduling recurring tasks with OpenClaw cron jobs. Covers expression syntax, YAML job structure, production-ready templates, deduplication, and debugging.

---

## 1. Cron Expression Format

OpenClaw uses standard 5-field cron syntax:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-7, 0=Sunday, 7=Sunday)
│ │ │ │ │
* * * * *
```

### Common Schedules

| Expression | Schedule |
|------------|----------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/10 * * * *` | Every 10 minutes |
| `0 * * * *` | Every hour (on the hour) |
| `0 8 * * *` | Daily at 8am |
| `0 9 * * 1-5` | Weekdays at 9am |
| `0 17 * * 1-5` | Weekdays at 5pm |
| `0 10 * * 1` | Every Monday at 10am |
| `0 21 * * *` | Every day at 9pm |
| `0 23 * * 0-4` | Sun–Thu at 11pm (overnight jobs) |
| `0 0 1 * *` | 1st of every month at midnight |
| `0 8 * * 0` | Every Sunday at 8am |

**Tool**: Use [crontab.guru](https://crontab.guru) to validate expressions visually before adding them to config.

### Special characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Any value | `* * * * *` = every minute |
| `*/n` | Every n units | `*/15 * * * *` = every 15 min |
| `n-m` | Range | `1-5` = Mon through Fri |
| `n,m` | List | `1,3,5` = Mon, Wed, Fri |

---

## 2. YAML Job Structure

Every cron job follows this schema:

```yaml
name: "Job Name"
schedule:
  kind: cron
  expr: "*/10 * * * *"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Your prompt here. Be specific about what to do,
    what to check, and what to skip.
delivery:
  mode: none
```

### Key Fields Explained

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Descriptive, unique identifier |
| `schedule.kind` | Yes | Always `cron` for scheduled jobs |
| `schedule.expr` | Yes | 5-field cron expression |
| `schedule.tz` | Yes | Always set — see timezone section |
| `sessionTarget` | Yes | Use `isolated` for clean runs |
| `payload.kind` | Yes | Always `agentTurn` |
| `payload.message` | Yes | The agent prompt for this run |
| `delivery.mode` | Yes | `none` = agent handles notifications itself |

### sessionTarget Options

| Value | Behavior | Use when |
|-------|----------|---------|
| `isolated` | Fresh session each run, no prior context | Most cron jobs — prevents context bleed |
| `shared` | Reuses existing session | Jobs that need to continue a conversation |

Use `isolated` by default. Shared sessions accumulate context and can produce unpredictable behavior across runs.

### delivery.mode Options

| Value | Behavior |
|-------|----------|
| `none` | Agent decides how to notify (recommended) |
| `slack` | Post result to Slack channel |
| `imessage` | Send result via iMessage |

When `delivery.mode` is `none`, instruct the agent explicitly in the prompt where to send results (e.g., "send via iMessage to Jay" or "post to #openclaw"). This keeps the prompt and delivery logic together.

---

## 3. Ready-to-Use Templates

### Template A: Email Check (Every 10 Minutes)

Checks inbox during business hours and surfaces actionable items without repeating notifications.

```yaml
name: "email-check"
schedule:
  kind: cron
  expr: "*/10 8-18 * * 1-5"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Check Gmail inbox for new emails in the last 10 minutes.

    For each actionable email (requires response or decision):
    - Summarize in 1 sentence
    - Note sender and urgency level

    Dedupe against memory/sent-notifications.md — do NOT notify
    about emails already listed there.

    If there are actionable emails not yet notified:
    - Send a single iMessage to Jay with the summary
    - Append email IDs to memory/sent-notifications.md

    If nothing new: do nothing. No message needed.
delivery:
  mode: none
```

### Template B: Calendar Preview (8pm Daily)

Delivers tomorrow's schedule each evening via iMessage. Plain text only — no markdown.

```yaml
name: "calendar-preview"
schedule:
  kind: cron
  expr: "0 20 * * *"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Get tomorrow's calendar events from Google Calendar.

    Format as plain text for iMessage:
    - List events in chronological order
    - Include time, title, and location if present
    - Note any back-to-back blocks or conflicts
    - CAPS for emphasis if needed — NO MARKDOWN, no **, no ##

    Send via iMessage to Jay.

    If no events tomorrow: send "Clear calendar tomorrow."
delivery:
  mode: none
```

### Template C: Birthday Reminder (8am Daily)

Reads a birthdays file and sends iMessage reminders on the right day.

```yaml
name: "birthday-reminder"
schedule:
  kind: cron
  expr: "0 8 * * *"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Read memory/birthdays.md to get the list of birthdays.

    Check if today's date matches any birthday on the list.

    If yes:
    - Send an iMessage to Jay: "Today is [Name]'s birthday!"
    - Include their relationship context if noted in the file

    If no birthdays today: do nothing. No message needed.
delivery:
  mode: none
```

**birthdays.md format:**

```markdown
# Birthdays

- March 14 — Mom (mother)
- April 2 — Mike Chen (college friend)
- July 19 — Sarah (business partner)
```

### Template D: Weekly Ads Report (Tuesday 10am)

Pulls Meta Ads performance and uploads a formatted report to Google Drive.

```yaml
name: "weekly-ads-report"
schedule:
  kind: cron
  expr: "0 10 * * 2"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Generate the weekly Meta Ads performance report for the
    past 7 days (last Tuesday through yesterday).

    Include:
    - Total spend, impressions, clicks, leads
    - Cost per lead by campaign
    - Best and worst performing ad sets
    - Week-over-week comparison if prior data is available

    Format as a clean table in a Google Doc.
    Upload to the "Reports" folder in Google Drive.
    Share the doc link via iMessage to Jay.
delivery:
  mode: none
```

### Template E: Overnight Pipeline Review (11pm)

Reviews data pipelines and fixes errors silently — no messages during overnight hours.

```yaml
name: "overnight-pipeline-review"
schedule:
  kind: cron
  expr: "0 23 * * 0-4"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Review n8n workflow execution logs from the past 24 hours.

    For any workflows that failed:
    - Identify the error
    - Attempt to fix the configuration if the cause is clear
    - Log the fix attempt in memory/pipeline-fixes.md

    For pipelines that succeeded: no action needed.

    IMPORTANT: Do NOT send any messages or notifications.
    It is overnight. Log results to memory/pipeline-fixes.md only.
    Jay will review in the morning.
delivery:
  mode: none
```

---

## 4. Creating Your First Cron Job

### Method 1: CLI

```bash
# Add a job with all options inline
openclaw cron add \
  --name "daily-weather" \
  --schedule "0 7 * * *" \
  --tz "America/New_York" \
  --message "Get current weather for New York and send a 2-line summary via iMessage to Jay."

# List all jobs to confirm it was added
openclaw cron list

# Test it manually before waiting for the schedule
openclaw cron run daily-weather
```

### Method 2: Edit openclaw.json Directly

```bash
# Open config
nano ~/.openclaw/openclaw.json
```

Add your job to the `crons` array:

```json
{
  "crons": [
    {
      "name": "daily-weather",
      "schedule": {
        "kind": "cron",
        "expr": "0 7 * * *",
        "tz": "America/New_York"
      },
      "sessionTarget": "isolated",
      "payload": {
        "kind": "agentTurn",
        "message": "Get current weather for New York and send a 2-line summary via iMessage to Jay."
      },
      "delivery": {
        "mode": "none"
      }
    }
  ]
}
```

### Test Before Trusting the Schedule

Always run a job manually before relying on the scheduler:

```bash
# Trigger immediately
openclaw cron run <job-name>

# Watch the output
openclaw cron runs <job-name>
```

Check the output for errors, wrong tone, or missing data before letting it run unattended.

---

## 5. Deduplication and Notification Patterns

Without deduplication, cron jobs that run every 10 minutes will spam the same notification repeatedly until the underlying data changes. Use a memory file to track what's already been sent.

### The Pattern

```
1. Job runs
2. Agent checks for new items
3. Agent reads memory/sent-notifications.md
4. Agent cross-references: new items minus already-notified items
5. If any remain: send notification, append IDs to memory file
6. If nothing new: do nothing
```

### Prompt Language for Deduplication

Include this in any cron prompt that could repeat:

```
Dedupe against memory/sent-notifications.md. Only notify about
items not already listed. After notifying, append the IDs/keys
to memory/sent-notifications.md so they are not repeated.
```

### sent-notifications.md Format

```markdown
# Sent Notifications Log

## Emails
- msg_18abc123 (2026-03-14 09:20)
- msg_18abc456 (2026-03-14 09:40)

## Pipeline Errors
- workflow_lead-capture (2026-03-13 23:00)
```

### iMessage Formatting Rules

iMessage does not render Markdown. Instruct OpenClaw explicitly:

```
Format for iMessage:
- Plain text only
- CAPS for emphasis (not bold or *asterisks*)
- Short sentences
- No markdown headers (##), no bullet markdown (-)
- Use line breaks for visual separation
```

---

## 6. Advanced Patterns

### Job Chaining (Morning Sequence)

A single job can run multiple subtasks and compile them into one message:

```yaml
name: "morning-briefing"
schedule:
  kind: cron
  expr: "0 7 * * 1-5"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Morning briefing sequence:
    1. WEATHER: Today's weather for New York. 1 sentence.
    2. CALENDAR: Today's events from Google Calendar.
    3. EMAIL: Any urgent unread emails from overnight.

    Send as one iMessage to Jay. Plain text, CAPS for headers.
delivery:
  mode: none
```

### Error Alert Pattern

```yaml
name: "pipeline-monitor"
schedule:
  kind: cron
  expr: "*/30 * * * *"
  tz: "America/New_York"
sessionTarget: isolated
payload:
  kind: agentTurn
  message: |
    Check n8n for workflow failures in the last 30 minutes.
    If found: send iMessage "PIPELINE ALERT: [name] failed. Error: [brief]."
    Dedupe against memory/sent-notifications.md.
    If none: do nothing.
delivery:
  mode: none
```

### Token Monitoring

Run nightly before overnight jobs to catch expired auth early:

```bash
# Add as a 10pm cron job with this prompt:
# "Run: openclaw models status
#  If any model is auth_expired or unavailable, send iMessage:
#  'TOKEN EXPIRED: [model] needs re-auth before overnight jobs.'
#  If all healthy: do nothing."
```

### Timezone Handling

Always set `tz` explicitly. Never rely on system timezone — it can differ between machines and after DST changes.

| Location | TZ Value |
|----------|----------|
| Eastern (ET) | `America/New_York` |
| Central (CT) | `America/Chicago` |
| Mountain (MT) | `America/Denver` |
| Pacific (PT) | `America/Los_Angeles` |
| UTC | `UTC` |
| London | `Europe/London` |

**DST note**: Named timezones (e.g., `America/New_York`) handle Daylight Saving Time automatically. Offset-based strings (e.g., `UTC-5`) do not — avoid them.

---

## 7. Monitoring and Debugging

### Core Commands

```bash
# List all configured jobs with their schedules
openclaw cron list

# Get details for a specific job
openclaw cron get <job-name>

# View run history for a job
openclaw cron runs <job-name>

# Trigger a job immediately (for testing)
openclaw cron run <job-name>

# Enable Slack/iMessage delivery on an existing job
openclaw cron edit <job-name> --announce

# Update a job's schedule
openclaw cron edit <job-name> --schedule "0 8 * * *"

# Remove a job
openclaw cron remove <job-name>
```

### Reading Run History

```bash
openclaw cron runs email-check
# Output:
# Run ID    Started              Status    Duration
# run_001   2026-03-14 08:00    success   12s
# run_002   2026-03-14 08:10    success   9s
# run_003   2026-03-14 08:20    failed    3s
```

For a failed run, get details:

```bash
openclaw cron runs email-check --id run_003
# Shows full agent output and error
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Job never runs | Gateway not running | Start with `openclaw start` |
| Runs at wrong time | Timezone not set | Add `tz` to schedule config |
| Duplicate notifications | No deduplication | Add deduplication instructions to prompt |
| Auth errors mid-run | Model token expired | Re-auth model, add token-health-check job |
| Job runs but no message | Delivery logic in wrong mode | Check `delivery.mode` and prompt instructions |
| `sessionTarget` errors | Old config format | Ensure `sessionTarget: isolated` (not `session_target`) |
| Overnight job messages Jay | Missing overnight silence instruction | Add "do NOT send messages" to prompt |

### Debugging a Prompt

If a job produces wrong output:

1. Run manually: `openclaw cron run <job-name>`
2. Read the output: `openclaw cron runs <job-name> --latest`
3. Adjust the prompt — add more specific instructions
4. Re-run and compare
5. Only update the schedule once output is correct

---

## Summary

**Core workflow for a new cron job:**
1. Write the cron expression (verify at crontab.guru)
2. Set `tz` explicitly — always
3. Use `sessionTarget: isolated`
4. Include deduplication instructions if the job could repeat notifications
5. Test manually with `openclaw cron run <name>` before trusting the schedule
6. Check run history with `openclaw cron runs <name>` after first real execution

**The five production templates:**

| Template | Schedule | Delivers via |
|----------|----------|-------------|
| Email Check | Every 10 min, weekdays 8am–6pm | iMessage (deduplicated) |
| Calendar Preview | 8pm daily | iMessage |
| Birthday Reminder | 8am daily | iMessage (day-of only) |
| Weekly Ads Report | Tuesday 10am | Google Drive + iMessage |
| Overnight Pipeline Review | 11pm Sun–Thu | memory file (silent) |

**Three rules that prevent the most mistakes:**
1. Always set `tz` — jobs will fire at the wrong time without it
2. Always add deduplication to notification jobs — without it, every run notifies
3. Add "do NOT send messages" to overnight jobs — otherwise they'll wake you up

**Related Skills:**
- OpenClaw Slack Integration — post cron job results to Slack channels
- OpenClaw Google Integration — use Google Calendar and Drive in cron jobs
