---
name: lead-tracking-db
description: "Manage the lead tracking database (Turso/SQLite). Use when querying leads, inserting domains/mailboxes, syncing analytics, running reports, writing SQL against the lead DB, or tracking campaign infrastructure."
---

# Lead Tracking Database Management

## Connection

- **Database:** `cold-email-leads` on Turso (aws-us-east-1)
- **CLI:** `~/.turso/turso db shell cold-email-leads "SQL"`
- **Scripts:** All use `source scripts/db-query.sh` which provides `db_exec`, `db_query`, `db_scalar`, `db_batch`, `sql_escape`
- **Full schema docs:** `docs/lead-tracking-db.md`

## Tables (13)

| Table | Purpose |
|-------|---------|
| `scrape_jobs` | Apify actor run tracking |
| `leads` | Central lead records (deduplicated on email) |
| `email_verifications` | Reacher + No2Bounce results |
| `campaign_assignments` | Lead → campaign links |
| `lead_analytics` | Per-lead engagement counters |
| `campaign_analytics` | Campaign-level snapshots |
| `domains` | Cold email domains |
| `mailboxes` | SMTP accounts per domain |
| `copy_variants` | A/B test content per step |
| `sent_emails` | Every individual email sent |
| `replies` | Reply metadata + classification |
| `ab_test_results` | A/B performance snapshots |
| `lead_events` | Append-only audit trail |

## Scripts

```bash
./scripts/import-leads.sh <file.json> [actor]           # Import Apify leads
./scripts/email-guesser.sh <input.csv> [output.csv]     # Guess + verify emails
./scripts/sync-analytics.sh [--sequencer email_bison]    # Sync from sequencers
./scripts/lead-report.sh <report-type>                   # CLI reports
```

### Report Types
`summary` | `sources` | `verification` | `campaigns` | `stale` | `pipeline` | `jobs` | `ab-tests` | `replies` | `timeline <lead_id>` | `infrastructure`

## Domain & Mailbox Tracking

### Register a new domain
```sql
INSERT INTO domains (domain, registrar, purchase_date, purchase_price, status)
VALUES ('example.com', 'dynadot', '2026-03-15', 8.99, 'pending_dns');
```

### Track DNS setup progress
```sql
UPDATE domains SET
  cloudflare_zone_id = 'abc123',
  nameservers_set = 1,
  spf_configured = 1,
  dkim_configured = 1,
  dmarc_configured = 1,
  status = 'dns_verified'
WHERE domain = 'example.com';
```

### Add a mailbox
```sql
INSERT INTO mailboxes (domain_id, email_address, provider, display_name, status)
VALUES (
  (SELECT id FROM domains WHERE domain = 'example.com'),
  'jay@example.com', 'winnr', 'Jay Feldman', 'warming'
);
```

### Update warmup status
```sql
UPDATE mailboxes SET
  warmup_enabled = 1,
  warmup_started_at = datetime('now'),
  warmup_score = 72
WHERE email_address = 'jay@example.com';
```

### Mark mailbox ready for sending
```sql
UPDATE mailboxes SET
  warmup_score = 97,
  warmup_ready = 1,
  status = 'active'
WHERE email_address = 'jay@example.com';
```

### Connect mailbox to sequencer
```sql
UPDATE mailboxes SET
  sequencer = 'email_bison',
  sequencer_account_id = 'eb-sender-id-123'
WHERE email_address = 'jay@example.com';
```

### Burn a domain (reputation damaged)
```sql
UPDATE domains SET status = 'burned', notes = 'High bounce rate on campaign X'
WHERE domain = 'example.com';
UPDATE mailboxes SET status = 'burned' WHERE domain_id = (SELECT id FROM domains WHERE domain = 'example.com');
```

## A/B Test Tracking

### Create variants for a campaign step
```sql
INSERT INTO copy_variants (campaign_id, sequencer, sequence_step, variant_label, subject_line, body_template, is_control)
VALUES
  ('camp-123', 'email_bison', 1, 'A', 'Quick question about {company}', 'Hi {{first_name}}...', 1),
  ('camp-123', 'email_bison', 1, 'B', '{{first_name}}, noticed something about {company}', 'Hey {{first_name}}...', 0);
```

### Get A/B winner
```sql
SELECT cv.variant_label, ab.total_sent, ab.reply_rate, ab.interest_rate
FROM ab_test_results ab
JOIN copy_variants cv ON cv.id = ab.variant_id
WHERE ab.campaign_id = 'camp-123'
  AND ab.calculated_at = (SELECT MAX(calculated_at) FROM ab_test_results WHERE campaign_id = ab.campaign_id)
ORDER BY ab.reply_rate DESC;
```

### Retire losing variant
```sql
UPDATE copy_variants SET status = 'retired' WHERE campaign_id = 'camp-123' AND variant_label = 'B';
UPDATE copy_variants SET status = 'winner' WHERE campaign_id = 'camp-123' AND variant_label = 'A';
```

## Reply Classification

Valid values: `interested`, `not_interested`, `ooo`, `wrong_person`, `do_not_contact`, `question`, `referral`, `unsubscribe`

### Classify a reply
```sql
UPDATE replies SET classification = 'interested', notes = 'Wants a demo call'
WHERE id = 42;
```

### Update global lead interest from reply
```sql
UPDATE leads SET interest_status = 'interested', pipeline_status = 'replied'
WHERE id = (SELECT lead_id FROM replies WHERE id = 42);
```

### Mark lead as Do Not Contact
```sql
UPDATE leads SET do_not_contact = 1, interest_status = 'dnc' WHERE id = 99;
INSERT INTO lead_events (lead_id, event_type, source) VALUES (99, 'marked_dnc', 'manual');
```

## Lead Events (Audit Trail)

### Event types
| Event | When | Source |
|-------|------|--------|
| `scraped` | Lead imported from Apify | import |
| `verified` | Email verified safe | email_guesser |
| `verification_failed` | Email failed verification | email_guesser |
| `assigned_to_campaign` | Lead added to campaign | manual |
| `email_sent` | Individual email sent | sync_eb/sync_instantly |
| `email_opened` | Email opened | sync_eb/sync_instantly |
| `email_clicked` | Link clicked | sync_eb/sync_instantly |
| `replied` | Reply received | sync_eb/sync_instantly |
| `bounced` | Email bounced | sync_eb/sync_instantly |
| `unsubscribed` | Lead unsubscribed | sync_eb/sync_instantly |
| `marked_interested` | Manually marked interested | manual |
| `marked_dnc` | Marked do not contact | manual |
| `status_changed` | Pipeline status changed | manual |

### Write a manual event
```sql
INSERT INTO lead_events (lead_id, event_type, event_data, source)
VALUES (42, 'marked_interested', '{"reason":"Replied positively to step 2"}', 'manual');
```

### View lead timeline
```bash
./scripts/lead-report.sh timeline 42
```

## Keeping Data Up to Date

### Daily sync routine
```bash
# Sync campaign analytics + sent emails + replies from sequencers
./scripts/sync-analytics.sh

# Check infrastructure health
./scripts/lead-report.sh infrastructure
```

### After importing new leads
```bash
./scripts/import-leads.sh /path/to/leads.json leads-finder
# Automatically writes lead_events with event_type='scraped'
```

### After verifying emails
```bash
./scripts/email-guesser.sh leads.csv verified.csv
# Automatically writes lead_events with event_type='verified' or 'verification_failed'
```

### After purchasing new domains
```sql
-- Bulk insert domains
INSERT INTO domains (domain, registrar, purchase_date, purchase_price) VALUES
  ('domain1.com', 'dynadot', '2026-03-15', 8.99),
  ('domain2.com', 'dynadot', '2026-03-15', 8.99);
```

### After setting up mailboxes
```sql
-- Bulk insert mailboxes
INSERT INTO mailboxes (domain_id, email_address, provider, display_name) VALUES
  ((SELECT id FROM domains WHERE domain='domain1.com'), 'jay@domain1.com', 'winnr', 'Jay Feldman'),
  ((SELECT id FROM domains WHERE domain='domain1.com'), 'madison@domain1.com', 'winnr', 'Madison Popoff'),
  ((SELECT id FROM domains WHERE domain='domain1.com'), 'bob@domain1.com', 'winnr', 'Bob Porter');
```

## Health Checks

### Domains missing DNS records
```sql
SELECT domain, status, spf_configured, dkim_configured, dmarc_configured
FROM domains
WHERE status = 'pending_dns'
  AND (spf_configured = 0 OR dkim_configured = 0 OR dmarc_configured = 0);
```

### Mailboxes not warming
```sql
SELECT m.email_address, d.domain, m.warmup_score, m.warmup_started_at
FROM mailboxes m JOIN domains d ON d.id = m.domain_id
WHERE m.status = 'warming' AND m.warmup_enabled = 0;
```

### Campaigns with high bounce rate
```sql
SELECT campaign_name, sequencer, total_sent, bounce_rate
FROM campaign_analytics
WHERE bounce_rate > 5
  AND synced_at = (SELECT MAX(synced_at) FROM campaign_analytics ca2
    WHERE ca2.campaign_id = campaign_analytics.campaign_id)
ORDER BY bounce_rate DESC;
```

### Leads stuck in pipeline
```sql
SELECT pipeline_status, COUNT(*) AS count,
  MIN(created_at) AS oldest
FROM leads
WHERE do_not_contact = 0
GROUP BY pipeline_status
ORDER BY CASE pipeline_status
  WHEN 'new' THEN 1 WHEN 'verified' THEN 2
  WHEN 'assigned' THEN 3 WHEN 'active' THEN 4
  WHEN 'replied' THEN 5 WHEN 'bounced' THEN 6 END;
```

### Unclassified replies
```sql
SELECT r.id, l.first_name, l.last_name, l.email, r.replied_at
FROM replies r JOIN leads l ON l.id = r.lead_id
WHERE r.classification IS NULL
ORDER BY r.replied_at DESC;
```

## Safety Rules

- **NEVER** delete from `lead_events` — it's an append-only audit trail
- **NEVER** update `lead_events.created_at` — timestamps are immutable
- **ALWAYS** write a `lead_events` entry when changing `leads.pipeline_status` or `leads.interest_status`
- **ALWAYS** run `sync-analytics.sh` before generating reports for fresh data
- **ALWAYS** verify emails before setting `pipeline_status = 'verified'`
- **NEVER** set `mailboxes.status = 'active'` unless `warmup_score >= 95`
