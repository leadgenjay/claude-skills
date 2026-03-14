---
name: LGJ-openclaw-troubleshooting
description: Diagnose and fix common OpenClaw issues — gateway failures, model auth errors, iMessage problems, cron not running, Slack disconnects. Includes 5 one-liner diagnostic commands and a systematic debugging workflow. Use when something isn't working.
---

# OpenClaw Troubleshooting

Systematic diagnosis for every common OpenClaw failure mode. Start with the Quick Diagnosis commands to identify the subsystem, then jump to the relevant section.

---

## 1. Quick Diagnosis Commands

Run these 5 commands first. They identify 90% of problems before you dig into logs.

```bash
# 1. Is OpenClaw healthy? (checks gateway, models, daemon, workspace)
openclaw doctor

# 2. Can I reach the gateway?
curl http://127.0.0.1:18789/health

# 3. Are my models working? (live API probe — actually calls each provider)
openclaw models status --probe

# 4. Are cron jobs enabled and scheduled?
openclaw cron list | grep -E "(enabled.*true|name)"

# 5. Is iMessage connected? (returns last message or auth error)
imsg history --limit 1
```

**Interpreting results:**

| Command | Healthy Output | Problem Indicator |
|---------|---------------|-------------------|
| `openclaw doctor` | `All checks passed` | Any `FAIL` or `WARN` line |
| `curl .../health` | `{"status":"ok"}` | Connection refused or `{"status":"degraded"}` |
| `models status --probe` | `claude-3-5-sonnet: healthy (234ms)` | `auth_failed` or `timeout` |
| `cron list` | Jobs listed with `enabled: true` | Empty list or all `enabled: false` |
| `imsg history` | Returns a message object | `Error: not authenticated` |

If `openclaw doctor` passes but something still isn't working, the problem is almost always in the specific subsystem — not the core installation.

---

## 2. "Command not found: openclaw"

This means either OpenClaw is not installed, or the npm global bin directory is not in your `PATH`.

### Step 1: Check Node.js

```bash
node --version
```

You need Node.js 22 or higher. If the command is missing or shows an older version:

**macOS:**

```bash
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux (Ubuntu/Debian):**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Using nvm (any platform):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc
nvm install 22
nvm use 22
nvm alias default 22
```

### Step 2: Reinstall OpenClaw

```bash
npm install -g openclaw@latest
```

### Step 3: Fix PATH issues

The npm global bin directory must be in your PATH:

```bash
# Find the global bin directory
npm bin -g

# Example output: /opt/homebrew/lib/node_modules/.bin
# or: /Users/jay/.nvm/versions/node/v22.0.0/bin
```

Add it to your shell profile:

```bash
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
which openclaw   # Should return a path, not "not found"
openclaw --version
```

---

## 3. Gateway Won't Start

The gateway is the core process — if it won't start, nothing works.

### Check for Port Conflict

The gateway uses port 18789 by default. If something else is using that port:

```bash
lsof -i :18789
```

If you see a process listed, kill it:

```bash
kill -9 <PID>
```

Or start OpenClaw on a different port:

```bash
openclaw gateway --port 18790
```

Update your config to match:

```json5
{
  gateway: {
    port: 18790,
  },
}
```

### Check Gateway Logs

```bash
tail -f ~/.openclaw/logs/gateway.log
```

Look for error lines at startup. Common patterns:

| Log message | Cause | Fix |
|-------------|-------|-----|
| `EADDRINUSE` | Port already in use | Kill conflicting process or change port |
| `Cannot find module` | Corrupted install | Reinstall: `npm install -g openclaw@latest` |
| `ENOENT: workspace` | Workspace dir missing | `mkdir -p ~/.openclaw/workspace` |
| `config parse error` | Invalid JSON5 in config | Validate config syntax |

### Check Daemon Status

**macOS (launchd):**

```bash
launchctl list | grep openclaw
```

If not listed, the daemon isn't registered. Re-register:

```bash
openclaw onboard --install-daemon
```

To manually stop and start:

```bash
launchctl stop com.openclaw.gateway
launchctl start com.openclaw.gateway
```

**Linux (systemd):**

```bash
systemctl --user status openclaw-gateway
```

To restart:

```bash
systemctl --user restart openclaw-gateway
```

To view full logs:

```bash
journalctl --user -u openclaw-gateway -f
```

### Start in Verbose Mode

When logs aren't enough, start the gateway directly with verbose output:

```bash
openclaw gateway --verbose
```

This prints every event — tool calls, model requests, channel activity — to stdout in real time.

---

## 4. iMessage Not Working

iMessage issues fall into three categories: the `imsg` CLI is missing, macOS permissions aren't granted, or the account isn't signed in.

### Step 1: Check imsg CLI

```bash
which imsg
```

If not found, install it:

```bash
brew install imsg
```

Verify it works:

```bash
imsg --version
```

### Step 2: Grant Full Disk Access

iMessage data lives in `~/Library/Messages/`, which requires Full Disk Access permission.

1. Open **System Settings** (macOS Ventura+) or **System Preferences** (older)
2. Go to **Privacy & Security > Full Disk Access**
3. Click the `+` button
4. Navigate to `/Applications/Utilities/Terminal.app` (or your terminal app) and add it
5. If you run `imsg` via a shell script or OpenClaw daemon, add that binary too
6. Toggle the permission **on**

After granting, restart Terminal and test:

```bash
imsg history --limit 5
```

### Step 3: Verify iMessage Sign-In

The Mac must be signed into iMessage with the same account you want OpenClaw to use.

1. Open **Messages.app**
2. Go to **Messages > Settings > iMessage**
3. Confirm your Apple ID is shown and the status is "Connected"

If not connected, sign in. You may need to verify with a 2FA code sent to another Apple device.

### Step 4: Test Sending

```bash
imsg send --to "+15551234567" --text "OpenClaw iMessage test"
```

If this succeeds, iMessage is working. If it fails, check the error output — it will indicate whether the issue is auth, permissions, or account status.

### Automatic Login Required

iMessage stays authenticated across reboots only if macOS Automatic Login is enabled. Without it, the account logs out on restart and OpenClaw loses access.

1. Open **System Settings > Users & Groups**
2. Click your user account
3. Enable **Automatic Login**
4. Enter your password to confirm

---

## 5. Cron Jobs Not Running

Cron jobs depend on the gateway being healthy and the job being correctly configured.

### Step 1: Confirm Gateway is Running

```bash
openclaw doctor
curl http://127.0.0.1:18789/health
```

Cron jobs will not run if the gateway is down. Fix gateway issues first.

### Step 2: View Job Configuration

```bash
openclaw cron get <job-id-or-name>
```

Check:
- `enabled: true` — job must be enabled
- `schedule` — valid cron expression (5 fields: min hour day month weekday)
- `tz` — timezone set correctly (e.g., `America/New_York`)
- `prompt` — not empty

### Step 3: View Run History

```bash
openclaw cron runs <job-id-or-name>
```

Look for:
- Runs with `status: failed` — check the `error` field
- No runs at all — the job may never have triggered (check `schedule` and `tz`)
- Runs with `status: skipped` — a previous run was still in progress when the next one was due

### Step 4: Test Run Manually

Trigger a job immediately to verify it works outside of the schedule:

```bash
openclaw cron run <job-id-or-name>
```

Watch the output. If it fails, you'll see the exact error.

### Common Cron Causes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Job never runs | Wrong timezone — schedule fires at unexpected UTC time | Always set `tz` field explicitly |
| Job runs but does nothing | Model auth expired during run | `openclaw models status --probe`, re-auth if needed |
| Job runs but errors | Invalid prompt or missing MCP tool | Test prompt manually via DM first |
| Skipped runs | Previous run still in progress | Add timeout to job config, or simplify the prompt |
| Gateway not running | Daemon crashed or wasn't started | `openclaw gateway`, check daemon status |

### Timezone Reference

Always specify `tz` using IANA timezone names:

```json5
{
  name: "daily-report",
  schedule: "0 9 * * 1-5",
  tz: "America/New_York",   // Always set this explicitly
  prompt: "...",
}
```

Common IANA zones: `America/New_York`, `America/Chicago`, `America/Denver`, `America/Los_Angeles`, `Europe/London`, `UTC`.

---

## 6. Model API Errors

### Check Auth Status

```bash
openclaw models status
```

This shows configured models and their auth state without making a live API call.

### Live Probe (Actual API Test)

```bash
openclaw models status --probe
```

This sends a minimal test request to each provider and reports latency and success/failure. If a model shows `auth_failed`, the key is wrong or expired.

### Re-Authenticate

```bash
openclaw models auth add
```

Select the provider that's failing and enter your new API key. The old key is replaced.

### Common Model Error Codes

| Error | Provider | Cause | Fix |
|-------|----------|-------|-----|
| `auth_failed` | Any | Invalid or expired API key | Re-run `openclaw models auth add` |
| `rate_limited` | Any | Too many requests per minute | Wait and retry, or add a fallback model |
| `insufficient_quota` | OpenAI | Billing limit reached | Add credits at platform.openai.com |
| `model_not_found` | Any | Wrong model ID in config | Check model IDs at provider docs |
| `timeout` | Any | Slow provider response | Increase timeout in config, or switch to fallback |
| `context_length_exceeded` | Any | Prompt too long | Reduce context or use a model with larger context window |

### Set a Fallback Model

Add fallbacks so if one provider is rate-limited or down, OpenClaw continues:

```json5
{
  models: {
    primary: "claude-3-5-sonnet-20241022",
    fallbacks: [
      "gpt-4o",
      "gemini-1.5-pro",
    ],
  },
}
```

---

## 7. Slack Connection Issues

### Socket Mode Not Enabled

Symptom: OpenClaw connects but never receives events.

Fix:
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → your app
2. Click **Socket Mode** in the left sidebar
3. Toggle **Enable Socket Mode** on
4. Regenerate the `xapp-` App-Level Token if needed
5. Update `appToken` in your openclaw config

### Missing OAuth Scopes

Symptom: `missing_scope` error in logs.

Fix:
1. Go to **OAuth & Permissions** → **Bot Token Scopes**
2. Add the missing scope (minimum: `app_mentions:read`, `chat:write`, `im:history`, `im:read`, `im:write`)
3. Click **Reinstall App** — scope changes require reinstallation
4. Copy the new `xoxb-` token and update your config

### Invalid Auth Token

Symptom: `not_authed` or `invalid_auth` in logs.

Fix:
1. Go to **OAuth & Permissions** → scroll to the top
2. Click **Reinstall to Workspace**, then **Allow**
3. Copy the fresh `xoxb-` Bot User OAuth Token
4. Update `botToken` in your openclaw config

### Bot Not in Channel

Symptom: Bot token is valid but OpenClaw never sees messages in a channel.

Fix — run this in every channel you want OpenClaw to participate in:

```
/invite @OpenClaw
```

The bot cannot see channel activity unless explicitly invited. This applies even with `channels:history` scope.

### Events Not Subscribed

Symptom: @mentions don't trigger responses.

Fix:
1. Go to **Event Subscriptions** → **Subscribe to bot events**
2. Verify `app_mention` and `message.im` are listed
3. If not, add them and click **Save Changes**
4. Reinstall the app

---

## 8. Google Integration Errors

### Token Expired

Symptom: `invalid_grant` or `Token has been expired or revoked` error.

Google OAuth tokens for unverified apps expire after 7 days. Re-authenticate:

```bash
gog auth
```

Follow the OAuth browser flow. For long-lived access, submit your app for Google verification or use a service account instead.

### API Not Enabled

Symptom: `API has not been used in project` or `API disabled` error.

Fix:
1. Go to [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)
2. Search for the API you need (e.g., "Gmail API", "Google Calendar API")
3. Click **Enable**
4. Wait 1-2 minutes for propagation

### Access Denied (Unverified App)

Symptom: OAuth screen shows a warning about unverified apps, or users can't complete OAuth.

Fix — add your email as a test user:
1. Go to [console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
2. Scroll to **Test users**
3. Click **Add Users**
4. Enter the email address that needs access
5. Save

Test users can complete OAuth flows for unverified apps without any warning.

### Service Account Not Working

Symptom: Service account key is valid but API calls return 403.

Fix — verify domain-wide delegation:
1. Go to [admin.google.com](https://admin.google.com) → **Security > Access and data control > API controls**
2. Click **Manage Domain Wide Delegation**
3. Confirm your service account's Client ID is listed with the correct scopes
4. If not, click **Add new** and enter the Client ID and required scopes

---

## 9. Systematic Debugging Workflow

When quick diagnosis doesn't pinpoint the problem, use this 5-step process.

### Step 1: Run `openclaw doctor`

```bash
openclaw doctor
```

This identifies ~80% of issues automatically. Fix everything it flags before continuing. Each failure includes a suggested fix.

### Step 2: Identify the Subsystem

Classify which part of OpenClaw is failing:

| Symptom | Subsystem | Relevant Section |
|---------|-----------|-----------------|
| No response to any message | Gateway or model | Sections 3, 6 |
| Responds via Slack but not iMessage | Channel (iMessage) | Section 4 |
| Responds via iMessage but not Slack | Channel (Slack) | Section 7 |
| Doesn't do scheduled tasks | Cron | Section 5 |
| Responses wrong/hallucinated | Model or prompt | Section 6 |
| Google tools fail | Google auth | Section 8 |
| Can't find `openclaw` command | Install/PATH | Section 2 |

### Step 3: Check Logs

```bash
# Gateway logs (most useful)
tail -f ~/.openclaw/logs/gateway.log

# All logs
ls ~/.openclaw/logs/
tail -f ~/.openclaw/logs/<relevant-log>.log
```

Look for timestamps around when the failure occurred. Error lines are prefixed with `ERROR` or `WARN`.

### Step 4: Isolate the Issue

Test one thing at a time:

```bash
# Test model directly
openclaw models status --probe

# Test a specific cron job
openclaw cron run <job-name>

# Test channel sending
openclaw send --channel imessage "test message"
openclaw send --channel slack --to "#test-channel" "test message"

# Test an MCP tool directly
openclaw tool github.list_repos
```

### Step 5: Restart and Re-Authenticate

If you've changed config or credentials, a full restart often resolves lingering state issues:

```bash
# Stop the gateway
openclaw gateway stop

# Re-authenticate models
openclaw models auth add

# Restart the gateway
openclaw gateway

# Verify
openclaw doctor
```

---

## Getting Help

When you've exhausted local debugging, these resources have the most current information:

| Resource | Where |
|----------|-------|
| OpenClaw Docs | [docs.openclaw.ai](https://docs.openclaw.ai) |
| GitHub Issues (search first) | [github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues) |
| Discord community | [discord.gg/clawd](https://discord.gg/clawd) |
| OpenClaw Cheat Sheet | [leadgenjay.com/openclaw](https://leadgenjay.com/openclaw) |

When filing a GitHub issue or asking in Discord, include:

1. Output of `openclaw doctor`
2. Output of `openclaw --version`
3. Relevant lines from `~/.openclaw/logs/gateway.log`
4. Your OS and Node.js version (`node --version`)
5. What you expected vs. what happened

---

## Related Skills

- **LGJ-openclaw-setup-wizard** — Full fresh install if issues are unresolvable
- **LGJ-openclaw-security-auditor** — If unexpected behavior suggests compromise
- **LGJ-openclaw-slack-integration** — Detailed Slack setup reference for recurring Slack issues
- **LGJ-openclaw-google-integration** — Detailed Google OAuth setup for recurring auth issues
