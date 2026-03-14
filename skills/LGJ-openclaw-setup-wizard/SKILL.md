---
name: LGJ-openclaw-setup-wizard
description: Walk through complete OpenClaw installation — prerequisites, install, onboarding wizard, model auth, gateway startup, daemon setup, and verification. Use when setting up OpenClaw on a new machine, reinstalling, or helping someone get started.
---

# OpenClaw Setup Wizard

Complete walkthrough from zero to a running OpenClaw installation with authenticated models and a persistent gateway daemon.

---

## 1. Prerequisites Checklist

Before running a single install command, confirm every item below.

### Hardware

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Machine | Mac mini M1/M2/M4, Linux VPS, or Windows WSL2 | Mac mini M4 or Linux VPS (always-on) |
| RAM | 8 GB | 16 GB+ |
| Storage | 10 GB free | 50 GB+ (workspace + logs) |
| Network | Stable internet | Always-on / low-latency |

Windows users: OpenClaw runs inside WSL2. Install WSL2 first (`wsl --install` in PowerShell as Administrator), then follow the Linux path.

### Software

**Step 1.** Verify Node.js 22+:

```bash
node --version   # Must be v22.0.0 or higher
```

If Node is missing or outdated, install via [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 22
nvm use 22
nvm alias default 22
```

**Step 2.** Verify Git:

```bash
git --version   # Any modern version is fine
```

**Step 3.** Gather your API keys. You need at minimum:

- **Anthropic API key** (required) — get at [console.anthropic.com](https://console.anthropic.com)
- OpenAI API key (optional) — get at [platform.openai.com](https://platform.openai.com)
- Google AI API key (optional) — get at [aistudio.google.com](https://aistudio.google.com)

IMPORTANT: Never commit API keys to git. Never paste them into shell history. You will enter them through `openclaw models auth add` which encrypts them on disk.

---

## 2. Mac Mini Hardening

Skip this section if you are on Linux or WSL2.

For Mac mini as a persistent agent host, prevent sleep so the gateway never drops.

### Disable Sleep

```bash
sudo pmset -a sleep 0          # Never sleep
sudo pmset -a disksleep 0      # Never sleep disk
sudo pmset -a displaysleep 0   # Never sleep display
```

Verify the settings applied:

```bash
pmset -g   # Look for sleep 0, disksleep 0, displaysleep 0
```

### Enable Remote Login (SSH)

1. Open **System Settings > General > Sharing**
2. Turn on **Remote Login**
3. Note the IP address shown (e.g., `ssh jay@192.168.1.50`)

### Install Tailscale (Secure Remote Access)

```bash
brew install --cask tailscale
```

Then open Tailscale, log in, and connect. Your Mac mini gets a stable `100.x.x.x` Tailscale IP you can SSH into from anywhere without exposing port 22 publicly.

### Automatic Login (for iMessage continuity)

1. Open **System Settings > Users & Groups**
2. Click your user → turn on **Automatic Login**
3. This ensures iMessage stays authenticated after a reboot

---

## 3. Installation Walkthrough

### Step 1: Install OpenClaw globally

```bash
npm install -g openclaw@latest
```

Verify the install:

```bash
openclaw --version
```

### Step 2: Run the onboarding wizard

```bash
openclaw onboard --install-daemon
```

The wizard walks you through:

1. **Gateway setup** — confirms port (default `18789`) and workspace directory
2. **Workspace directory** — defaults to `~/.openclaw/workspace`. Accept the default unless you have a specific reason to change it.
3. **Model auth** — prompts you to add your first model (Anthropic recommended). Enter your API key when asked. The key is encrypted and stored locally.
4. **Channel config** — configure iMessage, Slack, or other channels. You can skip channels and add them later.
5. **Daemon install** — installs a launchd service on macOS or a systemd service on Linux so the gateway starts automatically on login/boot.

If the wizard asks whether to install the daemon, always say yes for a persistent setup.

### Step 3: Add your first model

If you skipped model auth during onboarding, or want to add additional providers:

```bash
openclaw models auth add
```

Follow the interactive prompts — select your provider, enter your API key, and confirm. The key is stored encrypted in `~/.openclaw/config`.

---

## 4. Gateway Startup & Verification

### Starting the gateway manually

```bash
openclaw gateway
```

With verbose output for debugging:

```bash
openclaw gateway --port 18789 --verbose
```

The gateway runs on `ws://127.0.0.1:18789`. You should see output like:

```
OpenClaw Gateway v1.x.x
Listening on ws://127.0.0.1:18789
Models loaded: claude-3-5-sonnet, gpt-4o
Daemon: active
```

### Verifying the installation

Run the built-in health check:

```bash
openclaw doctor
```

This checks: gateway connectivity, model auth, daemon status, and workspace integrity. Fix any issues it flags before proceeding.

Alternatively, hit the HTTP health endpoint directly:

```bash
curl http://127.0.0.1:18789/health
```

Expected response:

```json
{"status": "ok", "gateway": "running", "models": ["claude-3-5-sonnet"]}
```

### Daemon status

The daemon manages the gateway process automatically. Check its status:

On macOS (launchd):

```bash
launchctl list | grep openclaw
```

On Linux (systemd):

```bash
systemctl --user status openclaw-gateway
```

To restart the daemon after config changes:

```bash
# macOS
launchctl stop com.openclaw.gateway && launchctl start com.openclaw.gateway

# Linux
systemctl --user restart openclaw-gateway
```

---

## 5. Model Authentication

### Adding a provider

```bash
openclaw models auth add
```

Repeat for each provider you want (Anthropic, OpenAI, Google). You can add multiple providers and set a fallback chain.

### Testing auth live

```bash
openclaw models status --probe
```

This sends a test request to each configured model and reports latency + success/failure. If a model shows `auth_failed`, re-run `openclaw models auth add` for that provider.

### Listing available models

```bash
openclaw models list
```

Shows all models available across your authenticated providers, including which are enabled and their current status.

### Setting a fallback chain

Edit `~/.openclaw/config/openclaw.json` (JSON5 — comments and trailing commas allowed):

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

OpenClaw tries `primary` first. If it fails or is rate-limited, it falls through the `fallbacks` list in order.

### Key storage options

| Method | Security | Convenience |
|--------|----------|-------------|
| `openclaw models auth add` (encrypted) | High — AES-256 encrypted on disk | Best — no env var management |
| Environment variables in shell profile | Medium — plaintext in `.zshrc`/`.bashrc` | Convenient but less secure |
| `.env` file (never commit) | Medium | OK for local dev |

The encrypted storage via `openclaw models auth add` is the recommended approach for production setups.

---

## 6. Claude Code Integration

OpenClaw uses Claude Code for complex coding tasks, PR reviews, and refactoring. Install it separately.

### Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### Authenticate

```bash
claude
```

This opens a browser window for OAuth. Sign in with your Anthropic account. Once authenticated, Claude Code stores credentials in `~/.claude/`.

### Verify the integration

```bash
claude --version
openclaw doctor   # Re-run — will now detect Claude Code
```

When you ask OpenClaw to review or refactor code, it delegates to Claude Code automatically if installed.

---

## 7. Post-Install Checklist

Work through these in order. All should pass before you start using OpenClaw seriously.

### Quick verification commands

```bash
# 1. Full health check
openclaw doctor

# 2. Live model test
openclaw models status --probe

# 3. HTTP health endpoint
curl http://127.0.0.1:18789/health

# 4. Send a test message (substitute your channel)
openclaw send --channel imessage "OpenClaw test: are you running?"
```

### Checklist

- [ ] `openclaw doctor` reports no errors
- [ ] At least one model shows `healthy` in `openclaw models status --probe`
- [ ] `curl http://127.0.0.1:18789/health` returns `{"status":"ok"}`
- [ ] Daemon is running and survives a logout/login cycle
- [ ] First conversation works end-to-end

### Next steps

1. **Connect Google** — use the `LGJ-openclaw-google-integration` skill to set up Gmail, Calendar, and Drive access
2. **Connect Slack** — use the `LGJ-openclaw-slack-integration` skill
3. **Set up your first cron job** — use the `LGJ-openclaw-cron-automation` skill
4. **Customize your agent** — use the `LGJ-openclaw-skill-builder` skill to write your SOUL.md and AGENTS.md

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `command not found: openclaw` | npm global bin not in PATH | Add `$(npm bin -g)` to your PATH |
| Gateway won't start on port 18789 | Port already in use | `lsof -i :18789` to find the conflict, then kill it or use `--port` flag |
| `auth_failed` on model probe | Wrong or expired API key | Re-run `openclaw models auth add` for that provider |
| Daemon not starting on login | launchd/systemd registration failed | Re-run `openclaw onboard --install-daemon` |
| iMessage auth lost after reboot | Auto-login disabled | Enable Automatic Login in System Settings > Users & Groups |
| `openclaw doctor` shows workspace error | Workspace directory missing | `mkdir -p ~/.openclaw/workspace` then re-run onboarding |

---

## Resources

- **OpenClaw Docs:** [docs.openclaw.ai](https://docs.openclaw.ai)
- **OpenClaw GitHub:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- **Cheat Sheet:** [leadgenjay.com/openclaw](https://leadgenjay.com/openclaw)
- **Discord:** [discord.gg/clawd](https://discord.gg/clawd)
