---
name: winnr-smtp
description: "Provision SMTP mailboxes via Winnr API. Use when connecting domains, creating email users, checking DNS verification status, or setting up cold email infrastructure."
---

# Winnr SMTP Mailbox Provisioning

## API Reference

- **Base URL:** `https://api.winnr.app/v1`
- **Auth:** `Authorization: Bearer {WINNR_API_KEY}`
- **Rate Limits:** 300 req/min (Startup), 500 req/min (Enterprise)

## Endpoints

### Domain Management
- `POST /domains/connect` — Batch connect domains to Winnr
  - Body: `{"domains": ["example1.com", "example2.com"]}`
  - Response: `{"data": {"domains": [{"domain": "...", "domain_id": "...", "status": "created", "dns_provider": "clouddns3", "nameservers": [...]}], "domains_used": N, "domain_limit": 100}}`
  - **Key fields:** `.data.domains[]` array, each with `domain_id` (NOT `id`)
  - **Already-connected domains** return `"status": "already_exists"` with `domain_id` still present
  - **CRITICAL:** When ALL domains already exist, `.data.domains` may be empty/null — always handle this case
- `POST /domains/{id}/check-ns` — Trigger NS verification check
- `GET /domains/{id}` — Check domain DNS verification status
  - Poll this endpoint until `dns_status` is `complete` (NOT "verified" or "active")
  - Polling strategy: wait 3 minutes initially, then retry every 60 seconds, max 30 attempts
- `POST /domains/{id}/redirect` — Set domain redirect
  - Body: `{"url": "https://target.com"}`
  - Response is async: `{"data": {"domain": "...", "redirect_url": "...", "queued": true, "message": "Redirect configured and queued for CDN setup"}}`
- `GET /domains` — List all connected domains (paginated, 25/page)

### Email User Creation
- `POST /email-users` — Create individual email user
  - Body: `{"username": "jay", "domain": "example.com", "name": "Jay Feldman", "password": "LGJmailbox123$"}`
  - Fields: `username` (local part only), `domain` (domain name string, NOT domain_id), `name` (full display name), `password`
  - **ASYNC response:** `{"data": {"job_id": "job_...", "status": "pending", "email": "jay@example.com", "message": "Email user creation queued"}}`
  - **NOT synchronous** — does NOT return `.data.id` immediately. Check via list endpoint later.
  - Duplicate check: returns 400 `{"error": {"code": "validation_error", "message": "Email user jay@example.com already exists"}}`
- `GET /email-users` — List email users (paginated)
  - Response: `{"data": {"data": [...], "pagination": {"has_more": bool, "cursor": "...", "count": 25}}}`
  - Pagination: append `?cursor={cursor}` for next page
- `DELETE /email-users/{id}` — Delete email user by ID

## Mailbox Setup Workflow

1. **Connect domains** — `POST /domains/connect` with domain list
2. **Update registrar NS** — Set nameservers to `ns1.programessentials.com` through `ns4.programessentials.com`
3. **Trigger NS verification** — `POST /domains/{id}/check-ns` for each domain
4. **Wait for DNS verification** — Poll `GET /domains/{id}` until `dns_status` is verified
5. **Set redirects** — `POST /domains/{id}/redirect` with `{"url": "https://target.com"}`
6. **Create email users** — `POST /email-users` with `username`, `domain`, `name`, `password`
7. **Record credentials** — Store email, password, domain for sequencer setup

## Domain Connection Details
- `POST /domains/connect` returns domain IDs in response — save to file for later use
- Winnr nameservers: `ns1.programessentials.com`, `ns2.programessentials.com`, `ns3.programessentials.com`, `ns4.programessentials.com`
- NS verification can be triggered immediately; propagation typically takes minutes from Dynadot
- Redirect endpoint: `POST /domains/{id}/redirect` body `{"url": "https://target.com"}`
- Domain limit: 100 per account (check `GET /domains` count before adding)
- Domains with 0 mailboxes can be deleted to free slots: `DELETE /domains/{id}`

## Mailbox Naming Preferences
- 3 mailboxes per domain (never more than 3)
- Standard names: `jay@` (Jay Feldman), `madison@` (Madison Popoff), `bob@` (Bob Porter)
- Default password: `LGJmailbox123$`
- **NEVER auto-generate random names** — always confirm names with user first
- Auth header must use single quotes due to underscores in token: `-H 'Authorization: Bearer wnr_...'`

## Credential Export
- `POST /v1/export` — Export SMTP credentials for sequencer import
  - Body: `{"format": "smartlead", "domains": ["d1.com", "d2.com"]}` (or `{"format": "smartlead", "getAllDomains": true}`)
  - **REQUIRED:** Must specify `domains` list OR `getAllDomains: true` — omitting both returns error `MISSING_PARAMETER`
  - Response: `{"data": {"download_url": "https://...s3.amazonaws.com/...", "count": 21, "format": "smartlead"}}`
  - Returns S3 download URL (CSV), NOT inline data — must `curl` the URL to get credentials
  - CSV columns: `domain,from_email,from_name,user_name,password,smtp_host,smtp_port,imap_host,imap_port,imap_username,imap_password,footer`
  - **Passwords are Winnr-generated** (NOT the password set during creation)

## DNS Records (Winnr-managed)
When using Winnr nameservers directly (no Cloudflare), Winnr manages ALL DNS:
- SPF, DKIM, MX records are auto-configured after domain connection
- No manual DNS record creation needed
- Only set registrar NS → `ns1-4.programessentials.com`

When using Cloudflare as DNS proxy, manually add:
- SPF: `v=spf1 include:_spf.winnr.app ~all`
- DKIM/MX: Provided by Winnr per domain after connection

## Full API Spec
See `docs/winnr-api.yaml` for the complete OpenAPI 3.1.0 specification.
