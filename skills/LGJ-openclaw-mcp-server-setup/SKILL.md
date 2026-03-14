---
name: LGJ-openclaw-mcp-server-setup
description: Install and configure MCP integrations — GitHub, Supabase, Vercel, n8n, Stripe, Apify, Instantly, GoHighLevel, Google Ads, Meta Ads, Hyros, fal.ai, Notion, Obsidian, and NotebookLM. Use when adding new tool capabilities to your agent.
---

# OpenClaw MCP Server Setup

Step-by-step installation and configuration for every MCP server in the Lead Gen Jay stack. Each entry includes the install command, required environment variables, and what capabilities you get.

---

## 1. How MCP Servers Work

MCP (Model Context Protocol) is an open standard that lets AI agents talk to external services through a uniform interface. When you install an MCP server and point OpenClaw at it, your agent gains new tools automatically — no custom integration code needed.

**The flow:**

```
OpenClaw agent receives a task
       ↓
Agent discovers available MCP tools
       ↓
Agent calls the right MCP tool (e.g., "create_issue" on GitHub MCP)
       ↓
MCP server handles auth and API calls
       ↓
Result returned to agent
```

**Config location:**

| Environment | Config File |
|-------------|-------------|
| Claude Code (standalone) | `~/.claude/mcp.json` |
| OpenClaw | `~/.openclaw/config/openclaw.json` → `mcpServers` key |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |

Most servers use `npx` (Node.js, no install required) or `uvx`/`pip` (Python). The `npx -y` flag auto-installs the package on first run and caches it.

**Basic config structure:**

```json5
{
  mcpServers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx",
      },
    },
  },
}
```

---

## 2. Developer & Deployment

### GitHub

Manage repos, issues, pull requests, and code search. 27k+ GitHub stars — the most widely deployed MCP server.

**Install test:**

```bash
npx -y @modelcontextprotocol/server-github
```

**Config:**

```json5
{
  mcpServers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "$ENV:GITHUB_PAT",
      },
    },
  },
}
```

**Get your token:** [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token (classic) → select scopes: `repo`, `read:org`, `read:user`.

**Capabilities:** Create/list/close issues, create PRs, search code, read file contents, push commits, list repos, manage branches.

---

### Supabase

Query databases, manage tables, run migrations, and inspect schemas — all from your agent.

**Install test:**

```bash
npx -y supabase-mcp
```

**Config:**

```json5
{
  mcpServers: {
    supabase: {
      command: "npx",
      args: ["-y", "supabase-mcp"],
      env: {
        SUPABASE_URL: "$ENV:SUPABASE_URL",
        SUPABASE_SERVICE_ROLE_KEY: "$ENV:SUPABASE_SERVICE_ROLE_KEY",
      },
    },
  },
}
```

**Get your keys:** Supabase Dashboard → Project Settings → API → `anon` key (read-only) or `service_role` key (full access). Use `service_role` only for trusted agent setups — it bypasses Row Level Security.

**Capabilities:** Run SQL queries, list tables, describe schemas, insert/update/delete rows, run migrations, manage storage buckets.

---

### Vercel

Deploy projects, check deployment status, manage environment variables, and inspect build logs.

**Install test:**

```bash
npx -y mcp-vercel
```

**Config:**

```json5
{
  mcpServers: {
    vercel: {
      command: "npx",
      args: ["-y", "mcp-vercel"],
      env: {
        VERCEL_TOKEN: "$ENV:VERCEL_TOKEN",
      },
    },
  },
}
```

**Get your token:** [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create token → copy it.

**Capabilities:** List projects, trigger deployments, check deployment status, read build logs, manage environment variables, manage domains.

---

### n8n

Access full n8n node documentation, search 543+ nodes, validate workflows, and manage executions — without leaving your agent.

**Install test:**

```bash
npx -y n8n-mcp
```

**Config:**

```json5
{
  mcpServers: {
    n8n: {
      command: "npx",
      args: ["-y", "n8n-mcp"],
      env: {
        MCP_MODE: "stdio",
        N8N_API_KEY: "$ENV:N8N_API_KEY",
        N8N_BASE_URL: "$ENV:N8N_BASE_URL",
      },
    },
  },
}
```

**Get your key:** n8n instance → Settings → API → Create API key. Base URL is your instance URL, e.g., `https://your-instance.app.n8n.cloud`.

**Capabilities:** Search nodes by keyword, get full node documentation, validate workflow JSON, create/update/delete workflows, list and trigger executions.

---

### Stripe

Official Stripe MCP server for payment operations, customer management, and subscription handling.

**Install test:**

```bash
npx -y @stripe/mcp
```

**Config:**

```json5
{
  mcpServers: {
    stripe: {
      command: "npx",
      args: ["-y", "@stripe/mcp", "--tools=all"],
      env: {
        STRIPE_SECRET_KEY: "$ENV:STRIPE_SECRET_KEY",
      },
    },
  },
}
```

**Get your key:** [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) — use the secret key (starts with `sk_live_` or `sk_test_`). Use test keys (`sk_test_`) until you've validated the setup.

**Capabilities:** Create/retrieve customers, list charges and invoices, manage subscriptions, create payment links, retrieve balance, handle refunds.

---

## 3. Web Scraping & Data

### Apify

Access 1,000+ pre-built scrapers for social media, search engines, e-commerce, and more. No infrastructure setup required.

**Install test:**

```bash
npx -y @apify/actors-mcp-server
```

**Config:**

```json5
{
  mcpServers: {
    apify: {
      command: "npx",
      args: ["-y", "@apify/actors-mcp-server"],
      env: {
        APIFY_TOKEN: "$ENV:APIFY_TOKEN",
      },
    },
  },
}
```

**Get your token:** [console.apify.com/account/integrations](https://console.apify.com/account/integrations) → API tokens → Create new token.

**Capabilities:** Run any Apify Actor (web scraper), get run results, search the Actor marketplace, monitor run status. Commonly used actors: Google Search Scraper, LinkedIn Profile Scraper, Instagram Scraper, Amazon Product Scraper.

---

## 4. Cold Email & CRM

### Instantly.ai

Full access to Instantly's email sending infrastructure — accounts, campaigns, leads, and analytics.

**Install:**

```bash
pip install instantly-mcp
```

**Config:**

```json5
{
  mcpServers: {
    instantly: {
      command: "python",
      args: ["-m", "instantly_mcp"],
      env: {
        INSTANTLY_API_KEY: "$ENV:INSTANTLY_API_KEY",
      },
    },
  },
}
```

**Get your key:** Instantly dashboard → Settings → Integrations → API Keys → Create Key.

**Capabilities (38 tools):** List/create/update campaigns, add leads to campaigns, check sending account health, retrieve analytics (opens, clicks, replies), move leads between campaigns, check deliverability scores.

---

### GoHighLevel

Full GHL CRM access — contacts, messaging, opportunities, pipelines, and calendar management.

**Install:**

```bash
git clone https://github.com/mastanley13/GoHighLevel-MCP.git ~/.openclaw/mcp-servers/gohighlevel
cd ~/.openclaw/mcp-servers/gohighlevel
npm install && npm run build
```

**Config:**

```json5
{
  mcpServers: {
    gohighlevel: {
      command: "node",
      args: ["$HOME/.openclaw/mcp-servers/gohighlevel/dist/index.js"],
      env: {
        GHL_API_KEY: "$ENV:GHL_API_KEY",
        GHL_LOCATION_ID: "$ENV:GHL_LOCATION_ID",
      },
    },
  },
}
```

**Get your key:** GHL → Settings → Integrations → API Keys → Create. Location ID is in the URL when viewing your sub-account: `app.gohighlevel.com/location/<ID>/...`.

**Capabilities (269+ tools):** Create/search/update contacts, send SMS/email, manage opportunities and pipelines, book calendar appointments, create tasks, manage tags and custom fields.

---

## 5. Advertising & Attribution

### Google Ads

Official Google MCP for read-only ad performance queries using GAQL (Google Ads Query Language).

**Install:**

```bash
pipx install google-ads-mcp
```

**Config:**

```json5
{
  mcpServers: {
    google_ads: {
      command: "google-ads-mcp",
      env: {
        GOOGLE_ADS_DEVELOPER_TOKEN: "$ENV:GOOGLE_ADS_DEVELOPER_TOKEN",
        GOOGLE_ADS_CLIENT_ID: "$ENV:GOOGLE_ADS_CLIENT_ID",
        GOOGLE_ADS_CLIENT_SECRET: "$ENV:GOOGLE_ADS_CLIENT_SECRET",
        GOOGLE_ADS_REFRESH_TOKEN: "$ENV:GOOGLE_ADS_REFRESH_TOKEN",
        GOOGLE_ADS_CUSTOMER_ID: "$ENV:GOOGLE_ADS_CUSTOMER_ID",
      },
    },
  },
}
```

**Get credentials:** [developers.google.com/google-ads/api/docs/get-started/introduction](https://developers.google.com/google-ads/api/docs/get-started/introduction) — requires a Google Ads account with API access and an approved developer token.

**Capabilities:** Query campaign performance, get ad group metrics, retrieve keyword stats, check budget utilization, list conversions — all via GAQL. Read-only by default.

---

### Meta Ads

Manage Meta (Facebook/Instagram) ad campaigns, budgets, and creative performance.

**Install:**

```bash
npm install @pipeboard/meta-ads-mcp
```

**Config:**

```json5
{
  mcpServers: {
    meta_ads: {
      command: "npx",
      args: ["-y", "@pipeboard/meta-ads-mcp"],
      env: {
        META_ACCESS_TOKEN: "$ENV:META_ACCESS_TOKEN",
        META_AD_ACCOUNT_ID: "$ENV:META_AD_ACCOUNT_ID",
      },
    },
  },
}
```

**Get your token:** [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer) → generate a user token with `ads_management` and `ads_read` permissions.

**Capabilities:** List campaigns and ad sets, retrieve performance metrics (impressions, clicks, ROAS), update campaign budgets, pause/resume campaigns, analyze creative performance by placement.

---

### Hyros

Lead attribution and customer journey tracking — 24 tools for understanding where your customers come from.

**Install:**

```bash
git clone https://github.com/leadgenjay/hyros-mcp.git ~/.openclaw/mcp-servers/hyros
cd ~/.openclaw/mcp-servers/hyros
npm install
```

**Config:**

```json5
{
  mcpServers: {
    hyros: {
      command: "node",
      args: ["$HOME/.openclaw/mcp-servers/hyros/index.js"],
      env: {
        HYROS_API_KEY: "$ENV:HYROS_API_KEY",
      },
    },
  },
}
```

**Get your key:** Hyros → Settings → API → Generate API Key.

**Capabilities (24 tools):** Look up lead attribution, retrieve customer journey data, check conversion paths, query traffic source performance, review ad-to-sale attribution chains.

---

## 6. AI & Media Generation

### fal.ai

Access 600+ AI models for image, video, audio, and 3D generation — all through a single API.

**Install:**

```bash
uvx --from fal-mcp-server fal-mcp
```

Or install permanently:

```bash
pip install fal-mcp-server
```

**Config:**

```json5
{
  mcpServers: {
    fal: {
      command: "uvx",
      args: ["--from", "fal-mcp-server", "fal-mcp"],
      env: {
        FAL_KEY: "$ENV:FAL_KEY",
      },
    },
  },
}
```

**Get your key:** [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) → Create Key.

**Capabilities:** Generate images (FLUX, Stable Diffusion, DALL-E), generate video (Kling, Runway), upscale images, remove backgrounds, generate audio, run any model in the fal.ai catalog. Billing is per-use — check [fal.ai/pricing](https://fal.ai/pricing) for model costs.

---

## 7. Notes & Knowledge

### Notion

Official Notion MCP server for reading, creating, and updating pages and databases.

**Install test:**

```bash
npx -y @notionhq/notion-mcp-server
```

**Config:**

```json5
{
  mcpServers: {
    notion: {
      command: "npx",
      args: ["-y", "@notionhq/notion-mcp-server"],
      env: {
        OPENAPI_MCP_HEADERS: "{\"Authorization\": \"Bearer $ENV:NOTION_API_KEY\", \"Notion-Version\": \"2022-06-28\"}",
      },
    },
  },
}
```

**Get your key:** [notion.so/my-integrations](https://www.notion.so/my-integrations) → New Integration → copy the Internal Integration Token. Then share any pages/databases you want the agent to access with that integration.

**Capabilities:** Read page content, create pages, update existing pages, query databases with filters, append blocks, search workspace content.

---

### Obsidian

Read and search your Obsidian vault for knowledge retrieval and note creation.

**Install:**

```bash
npx @smithery/cli install mcp-obsidian --client claude
```

Or add manually:

```json5
{
  mcpServers: {
    obsidian: {
      command: "npx",
      args: ["-y", "mcp-obsidian"],
      env: {
        OBSIDIAN_VAULT_PATH: "$ENV:OBSIDIAN_VAULT_PATH",
      },
    },
  },
}
```

Set `OBSIDIAN_VAULT_PATH` to the full path of your vault, e.g., `/Users/jay/Documents/Obsidian/Main`.

**Capabilities:** Read note contents, search notes by keyword, list notes in a folder, create new notes, read frontmatter/tags.

---

### NotebookLM

Query your NotebookLM notebooks and receive answers with citations from your uploaded sources.

**Install:**

```bash
pip install notebooklm-mcp-cli
```

**Config:**

```json5
{
  mcpServers: {
    notebooklm: {
      command: "notebooklm-mcp",
      env: {
        GOOGLE_ACCOUNT_EMAIL: "$ENV:GOOGLE_ACCOUNT_EMAIL",
      },
    },
  },
}
```

Requires Google OAuth authentication on first run. Run `notebooklm-mcp auth` to complete the OAuth flow.

**Capabilities:** Query notebooks by natural language, get answers with source citations, list available notebooks, retrieve source summaries.

---

## 8. Multi-Server Config Example

A complete production config combining the most commonly used servers:

```json5
{
  mcpServers: {
    // Developer tooling
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: "$ENV:GITHUB_PAT" },
    },
    supabase: {
      command: "npx",
      args: ["-y", "supabase-mcp"],
      env: {
        SUPABASE_URL: "$ENV:SUPABASE_URL",
        SUPABASE_SERVICE_ROLE_KEY: "$ENV:SUPABASE_SERVICE_ROLE_KEY",
      },
    },
    vercel: {
      command: "npx",
      args: ["-y", "mcp-vercel"],
      env: { VERCEL_TOKEN: "$ENV:VERCEL_TOKEN" },
    },

    // Workflow automation
    n8n: {
      command: "npx",
      args: ["-y", "n8n-mcp"],
      env: {
        MCP_MODE: "stdio",
        N8N_API_KEY: "$ENV:N8N_API_KEY",
        N8N_BASE_URL: "$ENV:N8N_BASE_URL",
      },
    },

    // Marketing & attribution
    instantly: {
      command: "python",
      args: ["-m", "instantly_mcp"],
      env: { INSTANTLY_API_KEY: "$ENV:INSTANTLY_API_KEY" },
    },

    // AI generation
    fal: {
      command: "uvx",
      args: ["--from", "fal-mcp-server", "fal-mcp"],
      env: { FAL_KEY: "$ENV:FAL_KEY" },
    },
  },
}
```

All corresponding `$ENV:` variables set in `~/.zshrc`:

```bash
export GITHUB_PAT="ghp_xxx"
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJxxx"
export VERCEL_TOKEN="xxx"
export N8N_API_KEY="xxx"
export N8N_BASE_URL="https://xxx.app.n8n.cloud"
export INSTANTLY_API_KEY="xxx"
export FAL_KEY="key_xxx"
```

---

## 9. Security Considerations

Before adding any MCP server to your config:

**Never hardcode API keys** — always use `$ENV:` references. If your config file is ever read by an attacker (or accidentally committed), raw keys are immediately exploitable.

**Prefer high-star, maintained servers** — the official Anthropic-maintained servers (`@modelcontextprotocol/server-*`) and official vendor servers (`@stripe/mcp`, `@notionhq/notion-mcp-server`) are the safest choices. Community servers vary widely in quality and maintenance.

**Test before committing to config** — run the server manually first:

```bash
npx -y @modelcontextprotocol/server-github
# Should start without errors and print available tools
```

**Start with 2-3 servers** — each server adds tools that the agent must discover and consider. Too many servers (10+) can slow down tool discovery and increase the chance of tool name collisions.

**Red flags — investigate before installing:**

- Requires `sudo` or root privileges
- No source code available (closed-source binary)
- Requests file system access outside its stated purpose
- Makes network calls to unknown domains
- No GitHub repository or under 6 months old with no stars

**Tool for auditing MCP servers:**

```bash
npx -y @anthropic/agent-scan check <server-name>
```

---

## Related Skills

- **LGJ-openclaw-security-auditor** — Full security audit including MCP server scanning
- **LGJ-openclaw-troubleshooting** — Fix connection errors and auth failures for MCP servers
- **LGJ-openclaw-google-integration** — Dedicated guide for Google OAuth (Gmail, Calendar, Drive)
