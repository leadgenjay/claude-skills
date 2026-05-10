# Phase 1 — Tenant Identity

## Purpose
Establish the tenant's unique slug and display name. The slug is used as the directory key; the display name is human-readable and shown in logs and UI.

## Pre-checks
- Scan `tenants/` directory for existing slugs to warn on collision

## Questions

### Q1 — Tenant Slug
**Header**: "Tenant slug"
**Type**: free-text
**Question**: "Enter a unique slug for this tenant (lowercase letters, numbers, hyphens). Examples: 'acme-corp', 'client-abc', 'lg-consulting'. This becomes the folder name."
**Validation**: 
- Regex: `^[a-z][a-z0-9-]{1,30}$`
- Check: not already in `tenants/` directory
- Reject on collision: "Slug already in use. Choose another."
**Persists to**: `config.tenant_slug`

### Q2 — Display Name
**Header**: "Display name"
**Type**: free-text
**Question**: "What's the human-readable name for this tenant? (e.g., 'Acme Corp', 'Client ABC', 'LG Consulting')"
**Validation**: 
- Required, non-empty
- Max 100 characters
**Persists to**: `config.tenant_display_name`
