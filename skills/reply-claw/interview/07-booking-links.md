# Phase 7 — Booking Links

## Purpose
Collect calendar/booking URLs for each auto-send-eligible persona. URLs must include `utm_source=bison` for attribution tracking.

## Pre-checks
- Scan `config.bison.workspaces[].personas[]` for any where `auto_send_eligible=true`

## Questions

### Q1 — Booking URL per Persona (loop only auto-send-eligible)
**Header**: "Booking URL"
**Type**: free-text
**Question**: "What's the booking URL for {persona_name} ({account_key})? (Calendly, Xano, Stripe, etc. Example: 'https://calendly.com/...?utm_source=bison')"
**Validation**:
- Valid HTTPS URL
- Check for `utm_source=bison` (case-insensitive)
- If missing: Display AskUserQuestion: "URL doesn't have utm_source=bison. Auto-append it? [Yes / Use as-is / Re-enter URL]"
  - Yes → append `?utm_source=bison` or `&utm_source=bison` (check for existing ?), confirm and save
  - Use as-is → save without UTM (warn user in log)
  - Re-enter → return to free-text
**Persists to**: `config.booking_links[]` with fields: `account_key`, `persona_slug` (kebab of first_name-last_name), `url`
**Render to**: `kb/{slug}/shared/booking-links.md` (aggregated YAML per persona)
