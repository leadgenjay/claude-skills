---
name: cloudflare-dns
description: "Manage DNS zones and records via Cloudflare API. Use when creating DNS zones, adding SPF/DKIM/DMARC records, configuring MX records, or managing cold email domain DNS."
---

# Cloudflare DNS Management

## API Reference

- **Base URL:** `https://api.cloudflare.com/client/v4`
- **Auth:** `Authorization: Bearer {CLOUDFLARE_API_TOKEN}`
- **Account ID:** `3dafdcbda6ee12602610f9fc6415e327`

## Endpoints

### Zone Management
- `POST /zones` — Create zone
  - Body: `{"name": "example.com", "account": {"id": "3dafdcbda6ee12602610f9fc6415e327"}, "type": "full", "jump_start": true}`
- `GET /zones?name=example.com` — Get zone by name
- `GET /zones/{zone_id}` — Get zone details
- `DELETE /zones/{zone_id}` — Delete zone

### DNS Records
- `GET /zones/{zone_id}/dns_records` — List all records
- `POST /zones/{zone_id}/dns_records` — Create record
  - Body: `{"type": "TXT", "name": "example.com", "content": "v=spf1 ...", "ttl": 1}`
- `PUT /zones/{zone_id}/dns_records/{record_id}` — Update record
- `DELETE /zones/{zone_id}/dns_records/{record_id}` — Delete record

### Common Record Types
- `A` — IP address
- `CNAME` — Canonical name
- `MX` — Mail exchange (requires `priority` field)
- `TXT` — Text records (SPF, DKIM, DMARC)

## Cold Email DNS Setup Checklist

After creating a zone and pointing domain nameservers to Cloudflare:

### 1. SPF Record
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.winnr.app ~all
```

### 2. DKIM Record
Provided by SMTP provider (Winnr) after domain connection. Usually:
```
Type: TXT
Name: default._domainkey
Content: (provided by Winnr)
```

### 3. DMARC Record
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:dmarc@example.com
```

### 4. MX Records
```
Type: MX
Name: @
Content: (provided by SMTP provider)
Priority: 10
```

## Workflow
1. Purchase domain on Dynadot/Spaceship/Porkbun
2. Create Cloudflare zone (`POST /zones` with `jump_start: true`)
3. Get Cloudflare nameservers from zone response (`name_servers` field)
4. Set nameservers on registrar (Dynadot `set_ns` / Spaceship `PUT /nameservers` / Porkbun `updateNs`)
5. Wait for DNS propagation (usually 5-30 minutes)
6. Add SPF, DKIM, DMARC, and MX records

## Google Workspace Mailbox DNS Setup

For domains using Google Workspace (not Winnr/cold-email SMTP), use these records:

### Flow Order
`Set DNS values` → `Get Zone` → `SPF` → `DMARC` → `MX`

### 1. Get Zone ID
```
GET /zones?name={domain}
→ response: result[0].id = zone_id, result[0].name = domain
```

### 2. SPF Record (Google)
```
POST /zones/{zone_id}/dns_records
{
    "type": "TXT",
    "name": "{domain}",
    "content": "v=spf1 include:_spf.google.com ~all",
    "ttl": 3600
}
```

### 3. DMARC Record
```
POST /zones/{zone_id}/dns_records
{
    "type": "TXT",
    "name": "_dmarc.{domain}",
    "content": "v=DMARC1; p=none; rua=mailto:dmarc@{domain}; ruf=mailto:dmarc@{domain}; fo=1; adkim=s; aspf=s; sp=none",
    "ttl": 3600
}
```

### 4. MX Record (Google)
```
POST /zones/{zone_id}/dns_records
{
    "type": "MX",
    "name": "{domain}",
    "content": "SMTP.GOOGLE.COM",
    "priority": 1,
    "ttl": 3600
}
```

> **Note:** Google mailbox domains use `include:_spf.google.com` for SPF and `SMTP.GOOGLE.COM` for MX. This differs from cold-email/Winnr domains which use `include:_spf.winnr.app`.

## Domain Redirect Setup (Page Rules)

For cold email domains that should redirect to your main website:

### Flow Order
`A Record` → `CNAME www` → `Page Rule Forward`

### 1. A Record (Dummy IP for Cloudflare Proxy)
```
POST /zones/{zone_id}/dns_records
{
    "type": "A",
    "name": "{domain}",
    "content": "192.0.2.1",
    "ttl": 3600,
    "proxied": true
}
```

### 2. CNAME www
```
POST /zones/{zone_id}/dns_records
{
    "type": "CNAME",
    "name": "www",
    "content": "{domain}",
    "ttl": 3600,
    "proxied": true
}
```

### 3. Page Rule — 301 Redirect
```
POST /zones/{zone_id}/pagerules
{
    "targets": [
        {"target": "url", "constraint": {"operator": "matches", "value": "{domain}/*"}}
    ],
    "actions": [
        {"id": "forwarding_url", "value": {"url": "https://www.{main_website}/$1", "status_code": 301}}
    ],
    "priority": 1,
    "status": "active"
}
```

> **Note:** The `{main_website}` should be the user's primary business website (without protocol/www prefix). The `$1` captures the path for pass-through.

## Also Available: Cloudflare MCP Server
The `cloudflare-api` MCP server provides direct access to all 2,500+ Cloudflare API endpoints via `search()` and `execute()` tools. Use it for complex operations.
