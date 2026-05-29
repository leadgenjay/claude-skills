---
name: lead-magnet
description: "Build and deploy a personalized **reverse lead magnet** web app — a single-purpose Next.js page that takes a URL parameter (e.g. `?linkedinURL=...`), scrapes/enriches the lead, runs the data through Claude, and renders custom output (3 book angles, audit, score, recommendation, etc.) with a CTA to a sales page. Ships end-to-end: source scaffold or Bolt-zip ingest → Dockerfile → private GitHub repo → Coolify on Zeus (stable host-port forwarded) → Cloudflare Tunnel + DNS swap → live verification. Takes a PRD document at start (markdown / google doc / notion export) OR runs a Socratic intake interview if none provided. Use when the user says 'lead-magnet', '/lead-magnet', 'build a lead magnet', 'reverse lead magnet', 'deploy a lead magnet', 'cold email funnel landing page', 'personalized landing page from URL param', 'ship a lead magnet to Coolify', or pastes a Bolt.new zip path and wants it deployed."
---

# Lead Magnet — Build & Deploy Pipeline

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, **STOP** and tell the user where to get each — do NOT generate placeholder bash or proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| `gh` CLI | `command -v gh` | https://cli.github.com (auto-installed on macOS by this skill's postInstall) |
| `jq` | `command -v jq` | https://jqlang.github.io/jq (auto-installed on macOS by this skill's postInstall) |
| `ssh zeus` access | `ssh zeus 'echo ok'` | `~/.ssh/config` host `zeus` over Tailscale (LGJ-internal deploy host) |
| `ANTHROPIC_API_KEY` **(validated)** | `curl -s https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -H 'content-type: application/json' -d '{"model":"claude-sonnet-4-6","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' \| jq -e '.type!="error"'` | https://console.anthropic.com — validate BEFORE deploy (§Gotchas/bolt-keys) |
| `APIFY_API_TOKEN` | `echo "$APIFY_API_TOKEN" \| grep -q apify_api` | https://console.apify.com/account/integrations |
| `COOLIFY_API_TOKEN` | `echo "$COOLIFY_API_TOKEN" \| grep -qE '^[0-9]+\|'` | Coolify UI → Settings → API Tokens (format `id\|hex`) |
| `COOLIFY_API_URL` | `curl -sf "$COOLIFY_API_URL/version" -H "Authorization: Bearer $COOLIFY_API_TOKEN"` | `http://server.nextwave.io:8000/api/v1` (via Tailscale) |
| `CLOUDFLARE_API_TOKEN` (Zone:DNS:Edit) | `curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \| jq -e '.success'` | https://dash.cloudflare.com/profile/api-tokens |
| `CLOUDFLARE_API_TOKEN_LEADGENJAY` (Account:Tunnel:Edit) | same verify endpoint with this token | CF token scoped to the account that owns the magnet's zone |
| `ZEUS_LEADMAGNETS_TUNNEL_ID` | `echo "$ZEUS_LEADMAGNETS_TUNNEL_ID" \| grep -qE '^[0-9a-f-]{36}$'` | created once in Phase 4a; reuse for all magnets |
| Public domain in a CF account you control | `dig +short "$DOMAIN"` | buy/transfer into a Cloudflare account you can scope a token to |

> ⚠️ **Host-environment note:** This skill deploys to LGJ's **private Zeus server** (Coolify v4 + a shared Cloudflare Tunnel). The infra identifiers used throughout Phases 3–4 (Zeus IP `192.168.5.174`, Coolify project/server UUIDs, Cloudflare account `3dafdcbda6ee12602610f9fc6415e327`, tunnel `6b13a880-7372-418f-8991-d725348bd12e`) are **LGJ-internal examples — yours will differ.** Substitute your own Coolify instance / tunnel / host, or adapt to any Docker host (Railway, Render, Fly.io).

---

A **reverse lead magnet** is a single-purpose landing page that turns a cold-email click into instant personalized value. The cold email contains a per-recipient URL like:

```
https://your-magnet-domain.com/?linkedinURL=https%3A%2F%2Flinkedin.com%2Fin%2F<their-handle>
```

The page auto-fills the input, scrapes/enriches via API, runs the data through Claude, renders the output (PDF / page / clip / score), and CTAs into a sales conversation. **No signup. Result in 15–30 seconds.**

This skill takes a brief (PRD or interview answers) and ships a working public URL.

---

## Operating Modes

**Mode A — PRD provided.** User pastes/links a PRD document. Parse for the fields in §Intake-Schema. Jump to Phase 1.

**Mode B — Interview.** No PRD. Run the §Intake-Interview via `AskUserQuestion` (≤4 questions per call). Output a synthesized PRD before Phase 1.

In both modes, write the finalized PRD to `scripts/lead-magnets/{slug}/PRD.md` before any code is written. It is the single source of truth for the build.

---

## Intake Schema (§Intake-Schema)

Every lead magnet needs these decisions resolved. Both modes must end with all of them answered.

| Field | Purpose | Default if vague |
|---|---|---|
| `slug` | kebab-case project name (`bestseller-angle-finder`) | derived from offer name |
| `domain` | public domain (must be in a CF account you control) | ask, no default |
| `input_param` | URL query string name (`linkedinURL`, `domain`, `site`, etc.) | `linkedinURL` |
| `input_validator` | substring required for accepted input (`linkedin.com/in/`, `.com`, etc.) | infer from `input_param` |
| `scrape_source` | which Apify actor / API / scraper to use | `dev_fusion~Linkedin-Profile-Scraper` |
| `scrape_fallback` | what to render if scrape fails (`infer-from-slug`, `block`, `manual-message`) | `infer-from-slug` |
| `ai_task` | one-paragraph spec of what Claude generates | required |
| `ai_output_shape` | JSON schema of the response Claude must return | required |
| `render_format` | `cards` (default), `single-page`, `pdf-only`, `email`, `download` | `cards` |
| `pdf_enabled` | bool — add jsPDF download button | `true` |
| `cta_url` | where Book-a-Call / sales conversation lives | required |
| `cta_label` | button text | `Book Your Strategy Call` |
| `brand_primary` | hex color for header / accents | `#312E81` (indigo-950) |
| `brand_accent` | hex color for CTA buttons | `#F59E0B` (amber-500) |
| `brand_signature_line` | bottom-of-PDF tagline | `Visit: {cta_url}` |
| `og_image` | OpenGraph image URL (must NOT be `bolt.new/static/og_default.png`) | placeholder, flag for post-launch swap |
| `meta_pixel_id` | Facebook pixel id, or `null` | `null` |
| `ga4_id` | GA4 measurement id, or `null` | `null` |
| `auto_trigger` | bool — fire analysis on page load when input is pre-filled | `true` (this IS the cold-email funnel point) |

---

## Intake Interview (§Intake-Interview)

Use `AskUserQuestion` in batches of 1–4 questions. Order matters — early answers narrow later options.

**Q-batch 1 — Identity & target:**
1. What product/service does this lead magnet drive sales to? (one sentence)
2. What's the public domain? (must be in a CF account you control, or we'll buy one)
3. What CTA URL should the "Book a Call" button hit?

**Q-batch 2 — Input & scrape:**
4. What does the cold email send the prospect with? options: `LinkedIn URL`, `Company website`, `Email address`, `Twitter handle`, `Custom`
5. If scrape fails (private profile, dead site), should we fall back to slug-inferred name+headline or block them?

**Q-batch 3 — AI output:**
6. What should Claude generate? options: `3 book angles`, `Free audit (5-10 findings)`, `Personalized roadmap`, `Score + ranking`, `Outreach script`, `Custom prompt`
7. What's the output format the user takes away? options: `Web page only`, `Web page + PDF download`, `Web page + emailed PDF`, `Just JSON for Zapier`

**Q-batch 4 — Brand & tracking:**
8. Brand colors? (paste hex or pick from preset palettes — Indigo+Amber, Slate+Teal, Black+Pink, Custom)
9. Do you have Meta Pixel + GA4 ids ready, or skip tracking for v1?

Synthesize answers into PRD.md and **show it to the user for sign-off** before Phase 1.

---

## Phase 1 — Source Scaffolding

Two intake sub-modes:

### 1a. From a Bolt.new zip (fast path)

User pastes a path like `~/Downloads/project-bolt-sb1-XXX.zip`. Steps:

```bash
PROJECT="$HOME/Documents/Tech & Dev/Studio Apps/{slug}"
mkdir -p "$PROJECT" && cd "$PROJECT"
unzip -q "{zip-path}"
# Bolt wraps everything in project/ — flatten
[ -d project ] && { mv project/.[!.]* . 2>/dev/null; mv project/* .; rmdir project; }
```

Then do the **3 cleanup edits** (all 3 can run in parallel as separate workers if using `/oh-my-claudecode:team`):

1. **Rewire frontend to local `/api/*` routes.** Bolt zips often call Supabase edge functions (`${supabaseUrl}/functions/v1/...`). Find the component and replace those `fetch(...)` URLs with `fetch('/api/scrape')` and `fetch('/api/generate')`. Drop the `supabaseUrl` / `supabaseAnonKey` const lines and any `Authorization: Bearer` header for that path.
2. **Cleanup junk.**
   - Move `.env` → `.env.local` (preserve values for `npm run dev` parity), then delete `.env`.
   - `rm -rf .next/ supabase/`
   - `rm netlify.toml` (if present)
   - Write `.gitignore` (see §Templates/gitignore.md)
   - Write `.env.example` with empty values for every key in `.env.local`
3. **Add Docker bits.**
   - Overwrite `next.config.ts` with `output: "standalone"` (required for slim container).
   - Write the multi-stage `Dockerfile` (see §Templates/Dockerfile).
   - Write `.dockerignore` (see §Templates/dockerignore.md).

### 1b. From scratch (no zip)

Run `npx create-next-app@latest {slug} --typescript --tailwind --app --no-eslint`, then add the three files from §Templates and the standard component structure (`app/api/scrape/route.ts`, `app/api/generate/route.ts`, `components/Finder.tsx`, `lib/types.ts`, `lib/pdf-generator.ts`).

### 1c. Local validation gate

Run `npm install && npm run build` locally. Must exit 0 before pushing. If `Cannot find module '@tailwindcss/postcss'` — that's the **NODE_ENV gotcha** (§Gotchas/devdeps). Confirm Dockerfile uses `npm ci --include=dev`.

---

## Phase 2 — GitHub repo + push

```bash
cd "{PROJECT}"
git init -b main
git add .
# CRITICAL: confirm .env is NOT staged
git ls-files --stage | grep -E '^.*\.env$' && echo "ABORT: secret staged" && exit 2
git -c commit.gpgsign=false commit -m "chore: initial commit for {slug}"
gh repo create leadgenjay/{slug} --private --description "{one-line PRD purpose}"
git remote add origin https://github.com/leadgenjay/{slug}.git
git push -u origin main
```

Repo settings convention: **private**, **leadgenjay org** (matches `inbox-insiders`, `web-builder`, `consulti`, etc.).

---

## Phase 3 — Coolify app on Zeus

> ⚠️ **LGJ-internal infrastructure.** This phase targets LGJ's private Zeus host running Coolify v4. The project/server/deploy-key UUIDs and the `192.168.5.174` host IP below are **examples — yours differ.** Outside LGJ, point `coolify-app-create.sh` at your own Coolify instance (set `COOLIFY_PROJECT_UUID` / `COOLIFY_SERVER_UUID` / `COOLIFY_DEPLOY_KEY_UUID`), or deploy the Dockerfile to any container host.

Coolify API base: `http://server.nextwave.io:8000/api/v1` (via Tailscale to `zeus.tail22f50.ts.net:8000`). Token in `$COOLIFY_API_TOKEN`.

> The full create→env→deploy flow is scripted in `references/coolify-app-create.sh`. The curl steps below document what it does; run the script for the happy path.

### 3a. One-time per repo: deploy key

Coolify needs a deploy key to read a private repo. Use the existing key UUID if there is one, else:

```bash
ssh zeus 'TMP=$(mktemp -d); ssh-keygen -t ed25519 -f "$TMP/k" -N "" -C "coolify-{slug}-deploy" -q; PRIV=$(awk "{printf \"%s\\\\n\", \$0}" "$TMP/k"); curl -sS -X POST -H "Authorization: Bearer $COOLIFY_API_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"{slug}-deploy\",\"private_key\":\"$PRIV\"}" http://localhost:8000/api/v1/security/keys; cat "$TMP/k.pub"'
# Capture the printed UUID + public key
gh repo deploy-key add - --repo leadgenjay/{slug} --title "coolify-zeus-{slug}-deploy" <<< "{PUBKEY}"
```

### 3b. Create project (one-time per category)

```bash
ssh zeus 'curl -sS -X POST -H "Authorization: Bearer $COOLIFY_API_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Lead Magnets\"}" http://localhost:8000/api/v1/projects'
# Capture project_uuid. Reuse for all future lead magnets.
```

### 3c. Create application

**Critical fields** (only what Coolify v4 accepts — do NOT send `is_build_time`):

```json
{
  "project_uuid": "{lead-magnets-project-uuid}",
  "server_uuid": "{zeus-localhost-server-uuid}",
  "environment_name": "production",
  "private_key_uuid": "{deploy-key-uuid}",
  "git_repository": "git@github.com:leadgenjay/{slug}.git",
  "git_branch": "main",
  "name": "{slug}",
  "build_pack": "dockerfile",
  "dockerfile_location": "/Dockerfile",
  "ports_exposes": "3000",
  "ports_mappings": "{free-host-port}:3000",
  "domains": "https://{domain}",
  "instant_deploy": false
}
```

**§Stable-Routing** — `ports_mappings` is non-optional. Without it, Coolify creates the container on the `coolify` docker network but doesn't publish the port to a stable host port. The tunnel then has to route to the timestamp-suffixed container name (e.g. `togo0w4scsg00wswggo48480-174907133636`), which **changes on every redeploy** and breaks the tunnel. Pattern used by the existing `v2.trustedleads.io` app and confirmed working: tunnel routes to `http://192.168.5.174:HOST_PORT`. Pick a free host port with `ss -lntp | grep -E ':30[0-9][0-9]'`.

### 3d. Set env vars

```bash
for KV in "ANTHROPIC_API_KEY={value}" "APIFY_API_TOKEN={value}" "NODE_ENV=production"; do
  K="${KV%%=*}"; V="${KV#*=}"
  ssh zeus "curl -sS -X POST -H 'Authorization: Bearer $COOLIFY_API_TOKEN' -H 'Content-Type: application/json' -d '{\"key\":\"$K\",\"value\":\"$V\",\"is_preview\":false,\"is_literal\":true}' http://localhost:8000/api/v1/applications/{app_uuid}/envs"
done
```

**Validate the keys first** with a `curl https://api.anthropic.com/v1/messages` ping. Bolt-generated zips often contain fake/revoked keys (§Gotchas/bolt-keys).

### 3e. Deploy + poll

```bash
ssh zeus "curl -sS -X POST -H 'Authorization: Bearer $COOLIFY_API_TOKEN' 'http://localhost:8000/api/v1/deploy?uuid={app_uuid}&force=false'"
# Capture deployment_uuid, poll /api/v1/deployments/{uuid} every 30-45s
# Build takes 3-5 min first time (canvas native compile), <2 min on subsequent (Docker layer cache)
```

If build fails with `Cannot find module '@tailwindcss/postcss'` → §Gotchas/devdeps.

---

## Phase 4 — Cloudflare Tunnel + DNS

> ⚠️ **LGJ-internal infrastructure.** Uses the leadgenjay Cloudflare account (`3dafdcbda6ee12602610f9fc6415e327`) and the shared `zeus-leadmagnets` tunnel (`6b13a880-7372-418f-8991-d725348bd12e`). These IDs are **examples — yours differ.** Outside LGJ, create a tunnel in the account that owns your zone and pass its id + account id to `references/tunnel-ingress-append.sh`.

Two Cloudflare auth requirements:
- `$CLOUDFLARE_API_TOKEN` — Zone:DNS:Edit on the zone's account (already exists in cold-email/.env)
- `$CLOUDFLARE_API_TOKEN_LEADGENJAY` — Account:Cloudflare Tunnel:Edit on the leadgenjay account (`3dafdcbda6ee12602610f9fc6415e327`)

If a leadgenjay-account tunnel called `zeus-leadmagnets` already exists, **reuse it** — one tunnel can serve many hostnames. Look it up:

```bash
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN_LEADGENJAY" \
  "https://api.cloudflare.com/client/v4/accounts/3dafdcbda6ee12602610f9fc6415e327/cfd_tunnel?is_deleted=false&name=zeus-leadmagnets"
```

### 4a. (Once) Create the shared `zeus-leadmagnets` tunnel + run cloudflared on Zeus

Only do this if the lookup above returns empty.

```bash
# Create tunnel via API
RESP=$(curl -sS -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN_LEADGENJAY" \
  -H "Content-Type: application/json" \
  -d '{"name":"zeus-leadmagnets","config_src":"cloudflare"}' \
  "https://api.cloudflare.com/client/v4/accounts/3dafdcbda6ee12602610f9fc6415e327/cfd_tunnel")
TUNNEL_ID=$(echo "$RESP" | jq -r .result.id)
TUN_TOKEN=$(echo "$RESP" | jq -r .result.token)

# Run cloudflared container on Zeus, attached to coolify network
ssh zeus "docker run -d --name cloudflared-leadmagnets --network coolify --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token $TUN_TOKEN"
```

Save `ZEUS_LEADMAGNETS_TUNNEL_ID` to `cold-email/.env`.

### 4b. Add this magnet's hostname to the tunnel ingress

**PUT replaces** the entire ingress config. So fetch the current config first, append the new hostname, and write back.

```bash
TUNNEL_ID="{from-env}"
ACCOUNT="3dafdcbda6ee12602610f9fc6415e327"
# Fetch current ingress
CUR=$(curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN_LEADGENJAY" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/cfd_tunnel/$TUNNEL_ID/configurations")
# references/tunnel-ingress-append.sh does the merge for you: it fetches the
# current ingress, prepends {domain} + www.{domain} → http://{service_host}:{host_port},
# keeps every existing hostname, and re-appends the catch-all http_status:404.
# Idempotent — re-running with an already-present hostname is a no-op.
bash references/tunnel-ingress-append.sh "{domain}" "{host_port}" "$ZEUS_LEADMAGNETS_TUNNEL_ID" "{account_id}" "$CLOUDFLARE_API_TOKEN_LEADGENJAY"
# 6th arg = service_host; defaults to the LGJ Zeus IP (192.168.5.174). Pass your own host's IP if different.
```

### 4c. DNS swap

For lead magnets coming from Bolt, the zone often has CNAMEs to `site-dns.bolt.host` that need to be replaced.

```bash
ZONE_ID="{from-CF-API-lookup-by-name}"
# Delete any record pointing at bolt.host
# Add CNAME {domain} → {TUNNEL_ID}.cfargotunnel.com (proxied=true)
# Add CNAME www → {TUNNEL_ID}.cfargotunnel.com (proxied=true)
```

Cloudflare proxy handles TLS termination at the edge — **no Let's Encrypt needed**, the cert is automatic. Do NOT set up Coolify's certresolver labels; they'll never be hit.

---

## Phase 5 — Verification (acceptance gates)

Run all six. Each must pass before declaring done.

```bash
# 1. DNS resolves to Cloudflare proxy IPs (104.x or 172.x)
dig +short {domain}

# 2. Public homepage returns 200 with the right title
curl -sSL -w "HTTP %{http_code}\n" https://{domain}/ | grep -oE '<title>[^<]*</title>'

# 3. /api/scrape works with a real input
curl -sS -X POST https://{domain}/api/scrape -H 'Content-Type: application/json' \
  -d '{"{input_param}":"{realistic-test-value}"}'  | jq .success
# expect: true

# 4. /api/generate returns the right shape (uses live Anthropic key)
curl -sS -X POST https://{domain}/api/generate -H 'Content-Type: application/json' \
  -d '{"profile":{...}}' | jq '.angles | length'
# expect: matches PRD ai_output_shape

# 5. Auto-fill cold-email URL renders without click
# Open in browser: https://{domain}/?{input_param}=<encoded-real-prospect>
# Expect: input pre-filled, analysis fires automatically, results in 15-30s

# 6. Stable across redeploy
# Trigger a Coolify redeploy; tunnel must NOT need any ingress update.
# Confirm host port mapping survived (ss -lntp on Zeus shows :HOST_PORT bound).
```

If gate 6 fails, the `ports_mappings` field wasn't set on the app. Patch via `PATCH /api/v1/applications/{uuid}` and re-deploy.

---

## §Gotchas (every one of these cost real time on the first build — bake into the run, don't relearn)

### §Gotchas/devdeps — `Cannot find module '@tailwindcss/postcss'` at Docker build

Coolify injects `NODE_ENV=production` into the build container. With that set, `npm ci` skips devDependencies — but Tailwind / `@tailwindcss/postcss` / `eslint-config-next` all live there, and Next.js build needs them. **Fix:** Dockerfile must use `RUN npm ci --include=dev` in the deps stage.

### §Gotchas/bolt-keys — Bolt-generated `.env` keys are usually fake

Zip files exported from bolt.new sometimes ship `.env` files with placeholder / revoked / never-real Anthropic API keys (e.g. `sk-ant-api03---hdSGZ...` with three dashes after `api03`). **Always validate** every API key against the provider before pushing to Coolify env. A 30-second `curl /v1/messages` ping catches this. Don't waste a deploy on it.

### §Gotchas/coolify-aliases — Container network aliases are unstable

Coolify v4 on this Zeus only sets the timestamp-suffixed container name as a docker network alias (e.g. `togo0w4scsg00wswggo48480-174907133636`). The UUID-only alias and the app-name alias are NOT set. **Never route the tunnel to a container name.** Always route via the published host port — `http://192.168.5.174:{host_port}` — which survives redeploys.

### §Gotchas/coolify-envs — `is_build_time` is not a valid env-payload field

Coolify v4 API rejects `is_build_time` with a 422. Use only `is_preview` + `is_literal`. Coolify auto-derives `is_buildtime` and `is_runtime` from `is_preview`.

### §Gotchas/cf-tunnel-account — Tunnel hostname must live in a CF account you can scope an API token to

If the zone is in one CF account and the existing tunnel is in another, the existing tunnel cannot route the new hostname (you'd need cross-account API access, which CF doesn't easily allow on Free/Pro). **Always create the tunnel in the same account as the zone.** That's why we use the leadgenjay-account `zeus-leadmagnets` tunnel.

### §Gotchas/cf-tunnel-put — `PUT /configurations` is a full replace

Cloudflare's tunnel configurations API replaces the entire ingress array on each PUT. To add one hostname, fetch the current config first, splice in the new rule before the catch-all `http_status:404`, then PUT the merged config. See `references/tunnel-ingress-append.sh`.

### §Gotchas/bash-empty-grep — `grep` returns exit 1 on zero matches

Empty `grep` matches abort bash pipelines under the hooks-aggressive shell that this project runs. Suffix every `grep` in verification scripts with `|| true` or use `awk` for "did we find any matches" checks.

---

## Required env vars (in `cold-email/.env`)

```
COOLIFY_API_TOKEN=5|xxxxxxxx                                # format: id|hex, get from Coolify UI Settings → API Tokens
COOLIFY_API_URL=http://server.nextwave.io:8000/api/v1       # API endpoint (reachable via Tailscale)
CLOUDFLARE_API_TOKEN=xxxxxxxx                               # Zone:DNS:Edit on leadgenjay account (existing)
CLOUDFLARE_API_TOKEN_LEADGENJAY=cfat_xxxxxxxx               # Account:Cloudflare Tunnel:Edit on leadgenjay (new)
ZEUS_LEADMAGNETS_TUNNEL_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx # shared tunnel for all lead magnets
APIFY_API_TOKEN=apify_api_xxxxxxxx                          # for default LinkedIn-Profile-Scraper actor
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx                     # validated against /v1/messages before deploy
```

---

## Templates and references

See the `references/` directory next to this file:
- `references/Dockerfile.template` — multi-stage Next.js + canvas-native deps
- `references/dockerignore.template` — standard ignore set
- `references/gitignore.template` — Next.js + secrets + Coolify artifacts
- `references/api-route-scrape.template.ts` — LinkedIn (Apify) scrape route, swap actor + normalizer per PRD
- `references/api-route-generate.template.ts` — Anthropic Sonnet generate route, swap system+user prompt per PRD
- `references/tunnel-ingress-append.sh` — idempotently append a hostname to the shared tunnel
- `references/coolify-app-create.sh` — full Coolify app-creation flow as one script (deploy key + project + app + env vars + deploy)
- `references/PRD.template.md` — minimal PRD template the interview should populate

---

## Marketplace publish

After a magnet is verified live, the *skill* itself (not the magnet) can be (re)published to the LGJ marketplace via `/publish-skill`. Only do so on an explicit user signal.

---

## Reference example

The first lead magnet shipped via this skill: **Bestseller Angle Finder** for SassyZenGirl.
- Domain: `bestsellerangle.com`
- Source: `github.com/leadgenjay/bestseller-angle-finder` (private)
- Coolify app UUID: `togo0w4scsg00wswggo48480` (project "Lead Magnets")
- Host port: `3003:3000`
- Tunnel: `zeus-leadmagnets` (`6b13a880-7372-418f-8991-d725348bd12e`)
- PRD: not formalized at build time (predates this skill); reconstruct from `components/BestsellerAngleFinder.tsx` if needed as a worked example.

Total run time: ~25 min from zip to public URL, on a cold cache, including two debug cycles (devdeps fix + key swap). On a warm cache with a valid PRD up front: ~10 min.
