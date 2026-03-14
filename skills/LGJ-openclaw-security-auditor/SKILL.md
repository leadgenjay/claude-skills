---
name: LGJ-openclaw-security-auditor
description: Audit and harden your OpenClaw installation — OWASP Top 10 for LLM agents, secret scanning with Gitleaks/TruffleHog, permission sandboxing, MCP server safety, and a 21-item hardening checklist. Use when reviewing security or setting up a new OpenClaw instance.
---

# OpenClaw Security Auditor

A systematic guide for securing your OpenClaw installation against the most common AI agent attack vectors — prompt injection, credential leakage, excessive permissions, and malicious skills.

---

## 1. Why Security Matters for AI Agents

Traditional software runs deterministic code. AI agents are different: they execute code autonomously, interpret natural language instructions from untrusted content, and act on your behalf with real credentials. That combination creates a unique attack surface.

**What an OpenClaw instance typically holds access to:**

- API keys (Anthropic, OpenAI, Google, Stripe, Supabase)
- OAuth tokens (Gmail, Calendar, Drive, Slack)
- File system access (your workspace, potentially broader)
- Network access (outbound HTTP, webhook calls)
- Messaging channels (iMessage, Slack, email send permissions)
- Cloud infrastructure (Vercel deploys, Supabase mutations)

If your agent is compromised, all of the above is in scope for an attacker.

### OWASP Top 10 for LLM Agents

The Open Web Application Security Project maintains a dedicated Top 10 list for LLM applications. These are the risks that matter most for agent setups like OpenClaw:

| # | Risk | Impact |
|---|------|--------|
| 1 | Prompt Injection | Attacker-crafted content hijacks agent behavior |
| 2 | Sensitive Info Disclosure | Agent leaks API keys, passwords, or private data |
| 3 | Supply Chain | Malicious skills or compromised MCP servers |
| 4 | Excessive Agency | Agent acts beyond what the user intended |
| 5 | Insecure Output Handling | XSS or SQL injection from agent-generated output |
| 6 | Data Poisoning | Corrupted memory files alter agent behavior over time |
| 7 | Unbounded Consumption | Runaway API calls exhaust token budgets or rate limits |
| 8 | Model Theft/Extraction | System prompts or memory extracted by adversary |
| 9 | Overreliance | Blindly trusting agent output without human review |
| 10 | Insecure Plugin Design | Over-permissioned MCP servers with unnecessary access |

**The two biggest risks for most OpenClaw users are #1 (Prompt Injection) and #4 (Excessive Agency).** A well-crafted prompt in a webpage, email, or document can redirect your agent to exfiltrate data or take destructive actions — all while appearing to complete your original request.

---

## 2. Secrets & Credential Safety

### The Golden Rules

1. **Never hardcode API keys** — not in SOUL.md, AGENTS.md, MEMORY.md, or any skill file
2. **Use environment variable references** in config files — `$ENV:ANTHROPIC_API_KEY` not the raw key
3. **Never commit secrets to git** — add `.env`, `client_secret.json`, `*.pem`, and `credentials.json` to `.gitignore`
4. **Use dedicated bot accounts** — never use your personal Google account OAuth for automated agents
5. **Rotate tokens on a schedule** — especially after any team member departure or suspected leak

### Where Secrets Leak (6 Vectors)

Understanding where leaks happen is the first step to preventing them:

| Vector | Risk | Prevention |
|--------|------|------------|
| MEMORY.md / notepad files | Agent writes key values into memory during a session | Use `$ENV:KEY` references; audit memory files regularly |
| Skill code | Third-party skills may log or exfiltrate credentials | Audit all installed skills before use |
| Agent logs | Verbose logs may capture full request payloads | Set log level to `info`, never `debug` in production |
| Gateway payloads | HTTP request bodies may include tokens | Use HTTPS for any remote gateway; never expose port 18789 publicly |
| Git history | Keys committed then deleted still exist in history | Run `git log -S "sk-"` to scan history |
| LLM context window | Prompt includes credentials and model extracts them | Never include raw keys in prompts or system instructions |

### Environment Variable Pattern

**BAD — raw key in memory or config:**

```
MEMORY: My Anthropic API key is sk-ant-api03-xxxxx
```

**GOOD — reference pattern in config:**

```json5
{
  models: {
    anthropic: {
      apiKey: "$ENV:ANTHROPIC_API_KEY",
    },
  },
}
```

Set the actual value in `~/.zshrc` or `~/.bashrc`:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-xxxxx"
export OPENAI_API_KEY="sk-proj-xxxxx"
export GOOGLE_API_KEY="AIzaxxxxx"
```

Then reload your shell:

```bash
source ~/.zshrc
```

OpenClaw expands `$ENV:` references at runtime. The key never touches your config files or git history.

---

## 3. Secret Scanning Tools

Run these tools before committing and on a regular audit schedule. They detect API keys, tokens, and credentials that have slipped into your codebase or config files.

### Gitleaks

Gitleaks scans your entire git history and working directory for 160+ types of secrets.

**Install:**

```bash
brew install gitleaks   # macOS
# or
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh   # Linux
```

**Scan your current directory:**

```bash
gitleaks detect --source . --verbose
```

**Scan git history only:**

```bash
gitleaks git --verbose .
```

**Scan a specific file:**

```bash
gitleaks detect --source . --verbose --no-git
```

Gitleaks exits with code `1` if secrets are found, making it easy to use in CI pipelines.

### TruffleHog

TruffleHog has 800+ detectors and actively verifies whether found credentials are still valid (live secrets vs. historical ones).

**Install:**

```bash
brew install trufflehog   # macOS
```

**Scan git history:**

```bash
trufflehog git file://.
```

**Scan only unverified secrets (faster):**

```bash
trufflehog git file://. --only-verified
```

**Scan a specific branch:**

```bash
trufflehog git file://. --branch main
```

### detect-secrets (Enterprise Baseline Approach)

detect-secrets creates a baseline so you can track new secrets over time without re-flagging known false positives.

**Install:**

```bash
pip install detect-secrets
```

**Create initial baseline:**

```bash
detect-secrets scan > .secrets.baseline
```

**Audit detected items (mark false positives):**

```bash
detect-secrets audit .secrets.baseline
```

**Re-scan against baseline (fast CI check):**

```bash
detect-secrets scan --baseline .secrets.baseline
```

### Pre-commit Hook with Gitleaks

Block secret commits before they hit your repo:

**Step 1.** Install pre-commit:

```bash
brew install pre-commit
```

**Step 2.** Create `.pre-commit-config.yaml` in your repo root:

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks
```

**Step 3.** Install the hook:

```bash
pre-commit install
```

Now every `git commit` runs Gitleaks first. A detected secret blocks the commit.

---

## 4. Permission Sandboxing

Limit what OpenClaw can do, even if its prompts are hijacked. Defense-in-depth means an attacker who compromises the agent still can't take destructive actions outside the allowed set.

### Exec Policy

Control which shell commands OpenClaw can run. Add to `~/.openclaw/config/openclaw.json`:

```yaml
security:
  exec:
    policy: allowlist
    allowed:
      - git
      - npm
      - node
      - python3
      - curl
      - openclaw
    blocked:
      - "rm -rf"
      - sudo
      - chmod
      - chown
      - kill
      - shutdown
      - reboot
```

**Policy options:**

| Policy | Behavior |
|--------|----------|
| `allowlist` | Only listed commands can run — everything else blocked |
| `ask` | Agent asks permission before any exec — interactive safety net |
| `open` | All commands allowed — maximum capability, maximum risk |

Use `allowlist` for production. Use `ask` when experimenting with new skills.

### File System Restrictions

```json5
{
  security: {
    filesystem: {
      readOnly: ["/Users/jay/projects/", "/tmp/"],
      writable: ["/Users/jay/.openclaw/workspace/"],
      denied: [
        "~/.ssh/",
        "~/.aws/",
        "~/.gnupg/",
        "~/.kube/",
        "/etc/",
        "/var/",
      ],
    },
  },
}
```

**Always deny access to:**
- `~/.ssh/` — private keys
- `~/.aws/` — AWS credentials
- `~/.gnupg/` — GPG keys
- `~/.kube/` — Kubernetes credentials
- `/etc/` — system configuration

### Network Controls

Allowlist the domains your agent actually needs:

```json5
{
  security: {
    network: {
      policy: "allowlist",
      allowed: [
        "api.anthropic.com",
        "api.openai.com",
        "generativelanguage.googleapis.com",
        "api.github.com",
        "*.supabase.co",
        "api.vercel.com",
        "hooks.slack.com",
      ],
    },
  },
}
```

### Tool Scoping

Disable tools OpenClaw doesn't need. Fewer capabilities = smaller attack surface:

```json5
{
  tools: {
    browser: { enabled: false },      // Disable if agent doesn't browse the web
    shellExec: { enabled: true },
    fileSystem: { enabled: true },
    email: { enabled: false },        // Disable if no email integration
  },
}
```

### OS-Level Isolation (Maximum Security)

For production or sensitive workloads:

**Docker container:**

```bash
docker run -d \
  --name openclaw \
  --memory="2g" \
  --cpus="2" \
  --network="openclaw-net" \
  --read-only \
  --tmpfs /tmp \
  -v ~/.openclaw/workspace:/workspace:rw \
  -v ~/.openclaw/config:/config:ro \
  openclaw/openclaw:latest
```

**macOS Seatbelt (sandbox-exec):** Creates a minimal-capability sandbox at the OS level. Run `openclaw gateway` inside a sandbox profile that only allows access to required paths and network endpoints.

---

## 5. Skill & MCP Server Auditing

Every skill and MCP server you install extends OpenClaw's capabilities — and its attack surface. Treat third-party skills like third-party code: audit before use.

### Pre-Install Checklist (7 Checks)

Before installing any skill or MCP server, verify:

1. **Source code available?** — Never install a skill you can't read. No black boxes.
2. **Hardcoded secrets?** — Grep the code: `grep -r "sk-\|api_key\|password\|token" ./skill-directory/`
3. **Unexpected API calls?** — Check for network calls to domains outside the skill's stated purpose
4. **File access scope?** — Verify file operations are limited to expected directories
5. **Exec commands?** — Any `child_process.exec()`, `subprocess.run()`, or similar deserves scrutiny
6. **GitHub activity?** — Low stars, no recent commits, or a brand-new repo are yellow flags
7. **Author reputation?** — Is this from a known maintainer, an established org, or an anonymous account?

### Scanning Tools

**Snyk Agent Scan** — dedicated AI agent security scanner:

```bash
npx -y @anthropic/agent-scan check <skill-name>
```

Reports on excessive permissions, unsafe tool combinations, and known vulnerabilities.

**MCP-Scan** (mcpscan.ai) — scans MCP servers for security issues:

```bash
npx -y @mcpscan/cli scan ./path/to/mcp-server
```

**Invariant MCP-Scan** — detects tool poisoning attacks (tools that override instructions):

```bash
pip install mcp-scan
mcp-scan ./your-mcp-config.json
```

**Promptfoo** — red team your agent against the OWASP LLM Top 10:

```bash
npx promptfoo redteam run --config ./openclaw-config.yaml
```

Runs automated adversarial tests: prompt injection, data exfiltration attempts, jailbreaks, and more.

### Red Flags — Reject Immediately

- Requires `sudo` or elevated privileges
- Asks for plaintext credentials (not env var references)
- No source code available (binary-only distribution)
- Requests broad file system access without explanation
- Makes network calls to domains unrelated to its stated function
- Installs additional packages at runtime without disclosure

---

## 6. DM Security

Attackers can send messages to your agent through connected channels. DM security controls who can give OpenClaw instructions.

### DM Policies

| Policy | Behavior | When to Use |
|--------|----------|-------------|
| `pairing` | Unknown senders get a pairing code challenge | Default — recommended for most users |
| `allowlist` | Only specified senders can interact | Strict — no surprises |
| `open` | Anyone can message the agent | Dangerous — only for isolated test setups |
| `disabled` | No DM responses | Maximum security when not in active use |

### Approve a Sender (Pairing Flow)

When a new contact messages your agent, OpenClaw generates a pairing code and sends it back. The user relays the code to you out-of-band (e.g., a phone call). You approve:

```bash
openclaw pairing approve imessage <code>
openclaw pairing approve slack <code>
```

### DM Config Example

```json5
{
  messaging: {
    dmPolicy: "pairing",
    allowFrom: [
      "+15551234567",         // Your personal number (iMessage)
      "U012AB3CD",            // Your Slack user ID
      "jay@leadgenjay.com",   // Email sender (if email channel enabled)
    ],
  },
}
```

To find your Slack user ID: `https://app.slack.com/team/<workspace>` → click your profile → copy Member ID.

---

## 7. Security Hardening Checklist

Work through all 21 items. The Essential tier covers 90% of risk. Complete them all for a production-grade setup.

### Essential (Do These First)

- [ ] Set exec policy to `allowlist` — only allow commands the agent actually uses
- [ ] Deny access to `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, and `/etc/` in filesystem config
- [ ] Use `$ENV:` references for all API keys — no raw keys in any config or memory file
- [ ] Add `.env`, `client_secret.json`, `*.pem`, `credentials.json` to `.gitignore`
- [ ] Use a dedicated bot account for Google OAuth — not your personal account
- [ ] Run `gitleaks detect --source . --verbose` — confirm zero secrets in codebase
- [ ] Review every installed skill's source code before trusting it

### Recommended

- [ ] Add network allowlist — restrict outbound connections to required domains only
- [ ] Disable unused tools (browser, email, etc.) in tool scoping config
- [ ] Install Gitleaks pre-commit hook — block secrets from entering git history
- [ ] Use read-only OAuth scopes wherever possible (e.g., `readonly` Gmail scope vs. `modify`)
- [ ] Set DM policy to `pairing` or `allowlist` — never leave on `open`
- [ ] Run `openclaw doctor` after any config change to catch regressions
- [ ] Review gateway hooks and skill triggers in AGENTS.md for unexpected behavior

### Advanced

- [ ] Run OpenClaw inside a Docker container with `--read-only` flag and restricted mounts
- [ ] Enable audit logging — log all tool calls and agent actions for review
- [ ] Set up network monitoring (e.g., Little Snitch on macOS) to catch unexpected outbound calls
- [ ] Run Promptfoo red team tests against your agent config monthly
- [ ] Scan all MCP servers with Snyk Agent Scan and Invariant MCP-Scan before deployment
- [ ] Define a token rotation schedule — rotate all API keys every 90 days
- [ ] Generate an SBOM (Software Bill of Materials) for your installed skills and MCP servers

---

## 8. Incident Response

If you suspect your agent has been compromised or a credential has leaked, work through these steps in order.

**Step 1 — Revoke the compromised credential immediately.** Don't investigate first. Revoke first, then investigate.

```bash
# Example: revoke Anthropic API key
# Go to console.anthropic.com → API Keys → Revoke
# Issue a new key, update config
openclaw models auth add   # re-authenticate with new key
```

**Step 2 — Check access logs** at the provider dashboard (Anthropic, OpenAI, Google Cloud Console). Look for API calls from unexpected IPs or at unexpected times.

**Step 3 — Scan memory files for exfiltrated data:**

```bash
grep -r "sk-\|api_key\|password\|token\|secret" ~/.openclaw/workspace/
grep -r "sk-\|api_key\|password\|token\|secret" ~/.claude/
```

**Step 4 — Scan git history for committed secrets:**

```bash
gitleaks git --verbose .
trufflehog git file://. --only-verified
```

**Step 5 — Update all secrets** with fresh credentials from each provider. Do not reuse compromised keys even if you think the exposure was brief.

**Step 6 — Review installed skills** for malicious code that may have been injected or that you may have installed inadvertently:

```bash
# List installed skills
openclaw skills list

# Check each skill's files for suspicious code
grep -r "fetch\|axios\|http\|exec\|eval" ~/.openclaw/skills/<skill-name>/
```

### Quick Reference Links

| Resource | URL |
|----------|-----|
| OWASP Top 10 for LLMs | [owasp.org/www-project-top-10-for-large-language-model-applications](https://owasp.org/www-project-top-10-for-large-language-model-applications) |
| OWASP AI Agent Security Cheat Sheet | [cheatsheetseries.owasp.org/cheatsheets/AI_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/AI_Security_Cheat_Sheet.html) |
| Snyk Agent Scan | [snyk.io/blog/agent-scan](https://snyk.io/blog/agent-scan) |
| MCP-Scan | [mcpscan.ai](https://mcpscan.ai) |
| Gitleaks | [github.com/gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) |
| TruffleHog | [github.com/trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) |
| Promptfoo Red Team | [promptfoo.dev/docs/red-team](https://promptfoo.dev/docs/red-team) |

---

## Related Skills

- **LGJ-openclaw-setup-wizard** — Initial install with security best practices baked in
- **LGJ-openclaw-mcp-server-setup** — Audit MCP servers before adding them to your config
- **LGJ-openclaw-troubleshooting** — Diagnose unexpected agent behavior that may indicate compromise
