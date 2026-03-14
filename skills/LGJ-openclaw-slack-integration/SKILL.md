---
name: openclaw-slack-integration
description: Create a Slack app for OpenClaw — bot/user token scopes, Socket Mode events, @mentions, DMs, slash commands, and cron job posting. Use when connecting OpenClaw to Slack for team communication.
---

# OpenClaw Slack Integration

Step-by-step guide for connecting OpenClaw to Slack. Covers app creation, token scopes, Socket Mode, events, slash commands, and automated posting from cron jobs.

---

## 1. Create the Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. App Name: `OpenClaw`
4. Select your workspace from the dropdown
5. Click **Create App**

You'll land on the app's Basic Information page. Keep this tab open — you'll need it for the Signing Secret in step 3.

---

## 2. Bot Token Scopes

Go to **OAuth & Permissions** in the left sidebar, then scroll to **Scopes > Bot Token Scopes**. Add these 14 scopes:

| Scope | Purpose |
|-------|---------|
| `app_mentions:read` | Receive events when @OpenClaw is mentioned |
| `chat:write` | Send messages to channels and DMs |
| `channels:history` | Read messages in public channels |
| `channels:read` | List and see info about public channels |
| `groups:history` | Read messages in private channels |
| `groups:read` | List and see info about private channels |
| `im:history` | Read DM message history |
| `im:read` | See the DM list |
| `im:write` | Open DM conversations with users |
| `mpim:history` | Read group DM message history |
| `mpim:read` | See group DM list |
| `mpim:write` | Send messages to group DMs |
| `users:read` | View workspace member profiles |
| `users:read.email` | View email addresses in profiles |

**Minimum viable set** (if you only want @mentions + DMs): `app_mentions:read`, `chat:write`, `im:history`, `im:read`, `im:write`, `users:read`.

### User Token Scopes (Optional)

Only add these if OpenClaw needs to read messages on behalf of a real user account (e.g., reading a user's DM threads with other people). User tokens start with `xoxp-` and require the user to authorize explicitly.

| Scope | Purpose |
|-------|---------|
| `im:history` | Read user's DM history |
| `im:read` | See user's DM list |
| `mpim:history` | Read user's group DM history |
| `channels:history` | Read channels on user's behalf |
| `search:read` | Search messages and files |

**Warning**: User token scopes are sensitive. They grant OpenClaw access to conversations the user has with other people. Only add them if your use case requires it.

---

## 3. Install the App and Get Tokens

1. Still on **OAuth & Permissions**, scroll to the top and click **Install to Workspace**
2. Click **Allow** on the permissions screen
3. Copy the **Bot User OAuth Token** — it starts with `xoxb-`

Get the Signing Secret:
1. Go to **Basic Information** > **App Credentials**
2. Click **Show** next to Signing Secret
3. Copy it

Store both values in your environment config — never commit them to git.

```bash
# .env or ~/.openclaw/secrets
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
# Only if using Socket Mode (see next section)
SLACK_APP_TOKEN=xapp-your-app-token-here
```

---

## 4. Socket Mode Setup

Socket Mode lets OpenClaw receive Slack events over an outbound WebSocket connection instead of requiring an inbound HTTP endpoint. This is ideal for local machines, home setups, or servers behind firewalls.

**Socket Mode vs HTTP Events:**

| | Socket Mode | HTTP Events |
|--|------------|-------------|
| Requires public URL | No | Yes |
| Works behind firewall | Yes | No |
| Best for | Local/home servers | Cloud servers |
| Connection type | Outbound WebSocket | Inbound HTTPS |
| Latency | ~100ms | ~50ms |

**To enable Socket Mode:**

1. Go to **Socket Mode** in the left sidebar
2. Toggle **Enable Socket Mode** on
3. When prompted, name the token: `openclaw-socket`
4. Click **Generate**
5. Copy the **App-Level Token** — it starts with `xapp-`

This `xapp-` token is separate from your bot token. It's used only to maintain the WebSocket connection.

---

## 5. Event Subscriptions

1. Go to **Event Subscriptions** in the left sidebar
2. Toggle **Enable Events** on
3. If using Socket Mode: no Request URL needed — it auto-connects
4. Scroll to **Subscribe to bot events**
5. Click **Add Bot User Event** and add these:

| Event | When it fires | Required? |
|-------|--------------|-----------|
| `app_mention` | User types @OpenClaw anywhere | Yes |
| `message.im` | User sends OpenClaw a DM | Yes |
| `message.channels` | Any message in channels OpenClaw is in | Optional — noisy |
| `message.groups` | Any message in private channels | Optional — noisy |

**Recommended minimum**: `app_mention` + `message.im`. Add `message.channels` only if you need OpenClaw to watch channel activity.

6. Click **Save Changes**
7. If you added scopes or events after initial install, you'll see a banner: **Reinstall your app**. Do it — changes don't take effect until reinstalled.

---

## 6. Configure OpenClaw

Add the Slack config to your `openclaw.json`:

```json
{
  "messaging": {
    "channel": "slack",
    "slack": {
      "botToken": "xoxb-your-token",
      "signingSecret": "your-signing-secret",
      "appToken": "xapp-your-app-token"
    }
  }
}
```

**Invite the bot to channels** — the bot only sees channels it has been invited to:

```
/invite @OpenClaw
```

Run this command in every channel you want OpenClaw to participate in. The bot cannot see or post to channels it hasn't been invited to, even with `channels:history` scope.

---

## 7. How Mentions and DMs Work

### @Mention Flow

```
User types: "@OpenClaw check my calendar for tomorrow"
     ↓
Slack fires app_mention event
     ↓
OpenClaw receives event payload:
  {
    "type": "app_mention",
    "user": "U012AB3CD",
    "text": "<@U0LAN0Z89> check my calendar for tomorrow",
    "channel": "C012AB3CD",
    "thread_ts": "1512085950.000216"
  }
     ↓
OpenClaw strips the @mention, processes the request
     ↓
Replies in thread (keeps #channel clean)
```

### DM Flow

```
User opens DM with OpenClaw, types: "summarize my unread emails"
     ↓
Slack fires message.im event
     ↓
OpenClaw receives event payload:
  {
    "type": "message",
    "channel_type": "im",
    "user": "U012AB3CD",
    "text": "summarize my unread emails"
  }
     ↓
OpenClaw processes the request
     ↓
Replies in the same DM thread
```

**Best practice**: Prefer DMs for personal requests (emails, calendar) and @mentions in channels for team-visible tasks. OpenClaw always replies in-thread to avoid flooding channels.

---

## 8. Slash Commands

Slash commands give users a clean way to invoke OpenClaw without @mentions.

**Create a command:**

1. Go to **Slash Commands** in the left sidebar
2. Click **Create New Command**
3. Fill in the form:

| Field | Value |
|-------|-------|
| Command | `/openclaw` |
| Request URL | Leave blank if using Socket Mode |
| Short Description | `Ask OpenClaw anything` |
| Usage Hint | `[your question or task]` |

4. Click **Save**
5. **Reinstall the app** — slash commands require a reinstall to take effect

**Usage examples:**

```
/openclaw summarize my last 10 emails
/openclaw what's on my calendar today?
/openclaw check if the overnight pipeline ran
```

**Multiple commands** — you can create specialized commands:

| Command | Description |
|---------|-------------|
| `/openclaw` | General-purpose assistant query |
| `/oc-email` | Email triage shortcut |
| `/oc-cal` | Calendar preview shortcut |
| `/oc-report` | Trigger an ads or pipeline report |

Each command appears in Slack's autocomplete when users type `/`.

---

## 9. Cron Jobs Posting to Slack

Cron jobs can post automated summaries and alerts directly to Slack channels. Set `announce: true` on any cron job to enable this.

**Daily standup prep (9am weekdays):**

```json
{
  "name": "daily-standup-prep",
  "schedule": "0 9 * * 1-5",
  "tz": "America/New_York",
  "prompt": "Check calendar for today, summarize any unread emails flagged as urgent, then post a standup prep summary to #openclaw. Format: bullet points only, no markdown headers.",
  "announce": true,
  "announceChannel": "#openclaw"
}
```

**End-of-day pipeline check (5pm weekdays):**

```json
{
  "name": "eod-pipeline-check",
  "schedule": "0 17 * * 1-5",
  "tz": "America/New_York",
  "prompt": "Review today's n8n workflow execution logs. If any workflows failed, post a summary to #openclaw-alerts with workflow name, error, and suggested fix. If all passed, post a green check confirmation.",
  "announce": true,
  "announceChannel": "#openclaw-alerts"
}
```

**Recommended channel strategy:**

| Channel | Purpose |
|---------|---------|
| `#openclaw` | General queries and standup summaries |
| `#openclaw-alerts` | Automated failure and anomaly notifications |
| DMs | Personal requests (email triage, calendar) |

Keep automated posts out of high-traffic team channels. Dedicated `#openclaw` channels prevent notification fatigue.

---

## 10. Troubleshooting

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Bot doesn't respond to @mentions | `app_mention` event not subscribed | Add event, save, reinstall |
| Bot can't see channel messages | Bot not invited to channel | `/invite @OpenClaw` in channel |
| `missing_scope` error | Required scope not added | Add scope in OAuth & Permissions, reinstall |
| `not_authed` error | Wrong or expired token | Re-copy bot token from OAuth & Permissions |
| DMs not working | `message.im` event missing | Add event, reinstall app |
| Slash command not appearing | Not reinstalled after adding | Reinstall app |
| Messages look wrong | Markdown formatting mismatch | See formatting note below |

### Slack Message Formatting (mrkdwn)

Slack uses its own dialect called **mrkdwn** — it is NOT standard Markdown:

```
✅ Slack mrkdwn:
*bold text*
_italic text_
~strikethrough~
`inline code`
<https://example.com|link text>
:emoji_name:

❌ Does NOT work in Slack:
**bold**
[link text](url)
# Heading
```

When writing prompts for cron jobs that post to Slack, instruct OpenClaw to use Slack formatting:

```
"...post to #openclaw using Slack mrkdwn. Bold with *asterisks*, links as <url|text>, no markdown headers."
```

### Rate Limits

Slack enforces per-channel rate limits. Exceeding them causes `ratelimited` errors with a `retry_after` value.

| Limit | Default |
|-------|---------|
| Messages per channel per second | 1 |
| Channel history reads per minute | ~50 |
| API calls per minute (tier 3) | 50 |

For burst workloads (e.g., posting to many channels at once), add delays between messages or batch into a single post.

### Quick Reference Links

- App management: [api.slack.com/apps](https://api.slack.com/apps)
- Scope reference: [api.slack.com/scopes](https://api.slack.com/scopes)
- Event reference: [api.slack.com/events](https://api.slack.com/events)
- mrkdwn formatting: [api.slack.com/reference/surfaces/formatting](https://api.slack.com/reference/surfaces/formatting)
- Rate limits: [api.slack.com/docs/rate-limits](https://api.slack.com/docs/rate-limits)

---

## Summary

**Setup order:**
1. Create app at api.slack.com/apps
2. Add bot token scopes (14 scopes for full functionality)
3. Install to workspace, copy `xoxb-` token and signing secret
4. Enable Socket Mode, copy `xapp-` token
5. Subscribe to `app_mention` + `message.im` events
6. Add tokens to openclaw.json
7. `/invite @OpenClaw` in each channel
8. Optionally add slash commands + reinstall

**Token types at a glance:**

| Token prefix | Type | Used for |
|-------------|------|---------|
| `xoxb-` | Bot token | Sending messages, reading channels |
| `xapp-` | App-level token | Socket Mode WebSocket connection |
| `xoxp-` | User token | Acting as a real user (optional) |

**Related Skills:**
- OpenClaw Cron Automation — schedule jobs that post to Slack
- OpenClaw Security Auditor — audit what OpenClaw can access via Slack
