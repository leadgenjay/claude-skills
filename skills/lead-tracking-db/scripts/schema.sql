-- Cold Email Lead Tracking Database Schema V2
-- Turso (cloud SQLite) — 13 tables

-- ─── Scrape Jobs ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  apify_run_id TEXT,
  dataset_id TEXT,
  target_cities TEXT,
  target_states TEXT,
  job_titles TEXT,
  industries TEXT,
  company_sizes TEXT,
  seniority TEXT,
  category TEXT,
  search_params TEXT,  -- full JSON
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')),
  results_count INTEGER DEFAULT 0,
  leads_imported INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Leads ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  personal_email TEXT,
  phone TEXT,
  mobile TEXT,
  job_title TEXT,
  seniority TEXT,
  linkedin_url TEXT,
  company_name TEXT,
  company_domain TEXT,
  company_website TEXT,
  industry TEXT,
  company_size TEXT,
  company_revenue TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  google_place_id TEXT,
  business_phone TEXT,
  business_rating REAL,
  reviews_count INTEGER,
  scrape_job_id INTEGER REFERENCES scrape_jobs(id),
  source_actor TEXT,
  source_type TEXT,
  raw_data TEXT,  -- original JSON
  pipeline_status TEXT NOT NULL DEFAULT 'new' CHECK(pipeline_status IN ('new','verified','assigned','active','replied','bounced')),
  interest_status TEXT DEFAULT 'unknown',
  do_not_contact INTEGER DEFAULT 0,
  replied_at TEXT,
  total_campaigns INTEGER DEFAULT 0,
  -- list-optimize skill (qualification + normalization + personalization)
  qualification_status TEXT,                          -- pending | qualified | disqualified
  qualification_reason TEXT,                          -- LLM rationale
  qualification_score INTEGER,                        -- 0-100 fit score
  company_name_original TEXT,                         -- raw scraped value
  company_name_normalized TEXT,                       -- canonical form
  personalization_research TEXT,                      -- raw Perplexity response
  personalization_line TEXT,                          -- final 1-sentence E1 opener
  personalization_status TEXT,                        -- pending | researched | written | failed | skipped
  personalization_cost_cents INTEGER DEFAULT 0,
  icp_tier TEXT,                                      -- T1 | T2 | T3 | T4 (per-tier ICP segmentation)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_name_domain ON leads(first_name, last_name, company_domain)
  WHERE email IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL AND company_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_scrape_job ON leads(scrape_job_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON leads(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_leads_domain ON leads(company_domain);
CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_personalization ON leads(personalization_status);
CREATE INDEX IF NOT EXISTS idx_leads_company_normalized ON leads(company_name_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_icp_tier ON leads(icp_tier);

-- ─── Email Verifications ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER REFERENCES leads(id),
  email TEXT NOT NULL,
  is_reachable TEXT,
  smtp_deliverable INTEGER,
  smtp_catch_all INTEGER,
  is_disposable INTEGER,
  is_role_account INTEGER,
  reacher_raw TEXT,  -- full JSON
  n2b_tracking_id TEXT,
  n2b_score_status TEXT,
  verdict TEXT CHECK(verdict IN ('safe','risky','invalid','unknown')),
  verdict_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_verifications_lead ON email_verifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_verifications_email ON email_verifications(email);

-- ─── Campaign Assignments ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  sequencer TEXT NOT NULL CHECK(sequencer IN ('email_bison','instantly')),
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','active','paused','completed')),
  sequencer_lead_id TEXT,
  added_at_step INTEGER,
  current_step INTEGER,
  last_email_sent_at TEXT,
  interest_status TEXT,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_unique ON campaign_assignments(lead_id, sequencer, campaign_id);
CREATE INDEX IF NOT EXISTS idx_assignments_campaign ON campaign_assignments(sequencer, campaign_id);

-- ─── Lead Analytics ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES campaign_assignments(id),
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  emails_sent INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  replied INTEGER DEFAULT 0,
  bounced INTEGER DEFAULT 0,
  unsubscribed INTEGER DEFAULT 0,
  clicked INTEGER DEFAULT 0,
  interested INTEGER DEFAULT 0,
  last_sent_at TEXT,
  last_opened_at TEXT,
  last_replied_at TEXT,
  last_clicked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lead_analytics_assignment ON lead_analytics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_lead ON lead_analytics(lead_id);

-- ─── Campaign Analytics ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequencer TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  open_rate REAL DEFAULT 0,
  reply_rate REAL DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_lookup ON campaign_analytics(sequencer, campaign_id, synced_at);

-- ─── Domains ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  registrar TEXT CHECK(registrar IN ('dynadot','spaceship','porkbun')),
  purchase_date TEXT,
  purchase_price REAL,
  cloudflare_zone_id TEXT,
  nameservers_set INTEGER DEFAULT 0,
  spf_configured INTEGER DEFAULT 0,
  dkim_configured INTEGER DEFAULT 0,
  dmarc_configured INTEGER DEFAULT 0,
  redirect_target TEXT,
  status TEXT NOT NULL DEFAULT 'pending_dns' CHECK(status IN ('pending_dns','dns_verified','active','burned','retired')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Mailboxes ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mailboxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id),
  email_address TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'winnr' CHECK(provider IN ('winnr','google')),
  winnr_user_id TEXT,
  display_name TEXT,
  warmup_enabled INTEGER DEFAULT 0,
  warmup_started_at TEXT,
  warmup_score INTEGER,
  warmup_ready INTEGER DEFAULT 0,
  daily_send_limit INTEGER DEFAULT 30,
  daily_sent_today INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'warming' CHECK(status IN ('warming','active','paused','burned')),
  sequencer TEXT CHECK(sequencer IN ('email_bison','instantly')),
  sequencer_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_domain ON mailboxes(domain_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_status ON mailboxes(status);

-- ─── Copy Variants (A/B Testing) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS copy_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  sequencer TEXT NOT NULL CHECK(sequencer IN ('email_bison','instantly')),
  sequence_step INTEGER NOT NULL,
  variant_label TEXT NOT NULL DEFAULT 'A',
  subject_line TEXT,
  body_template TEXT,
  is_control INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','winner','retired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_copy_variants_campaign ON copy_variants(campaign_id, sequence_step);

-- ─── Sent Emails ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sent_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER REFERENCES campaign_assignments(id),
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  variant_id INTEGER REFERENCES copy_variants(id),
  sequence_step INTEGER,
  sequencer TEXT NOT NULL CHECK(sequencer IN ('email_bison','instantly')),
  sequencer_email_id TEXT,
  sender_mailbox_id INTEGER REFERENCES mailboxes(id),
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('scheduled','sent','bounced','unsubscribed')),
  scheduled_at TEXT,
  sent_at TEXT,
  opens INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  replied INTEGER DEFAULT 0,
  interested INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_lead ON sent_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_assignment ON sent_emails(assignment_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_variant ON sent_emails(variant_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at);

-- ─── Replies ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  sent_email_id INTEGER REFERENCES sent_emails(id),
  assignment_id INTEGER REFERENCES campaign_assignments(id),
  sequencer TEXT NOT NULL CHECK(sequencer IN ('email_bison','instantly')),
  sequencer_reply_id TEXT,
  classification TEXT CHECK(classification IN ('interested','not_interested','ooo','wrong_person','do_not_contact','question','referral','unsubscribe')),
  is_automated INTEGER DEFAULT 0,
  replied_at TEXT,
  folder TEXT DEFAULT 'inbox' CHECK(folder IN ('inbox','spam','bounced')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_replies_lead ON replies(lead_id);
CREATE INDEX IF NOT EXISTS idx_replies_assignment ON replies(assignment_id);
CREATE INDEX IF NOT EXISTS idx_replies_classification ON replies(classification);

-- ─── A/B Test Results ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ab_test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES copy_variants(id),
  campaign_id TEXT NOT NULL,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_interested INTEGER DEFAULT 0,
  open_rate REAL DEFAULT 0,
  reply_rate REAL DEFAULT 0,
  interest_rate REAL DEFAULT 0,
  calculated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant ON ab_test_results(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_campaign ON ab_test_results(campaign_id);

-- ─── Lead Events (Append-Only Audit Trail) ──────────────────────────

CREATE TABLE IF NOT EXISTS lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  event_type TEXT NOT NULL CHECK(event_type IN (
    'scraped','verified','verification_failed',
    'assigned_to_campaign','email_sent','email_opened','email_clicked',
    'replied','bounced','unsubscribed',
    'marked_interested','marked_dnc','status_changed'
  )),
  event_data TEXT,  -- JSON context
  source TEXT CHECK(source IN ('import','email_guesser','sync_eb','sync_instantly','manual')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON lead_events(created_at);

-- ─── Warmup Snapshots (Daily Tracking) ────────────────────────────────

CREATE TABLE IF NOT EXISTS warmup_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mailbox_id INTEGER REFERENCES mailboxes(id),
  email_address TEXT NOT NULL,
  sequencer_account_id TEXT,
  warmup_score INTEGER,
  emails_sent INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_warmup_snapshots_mailbox ON warmup_snapshots(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_warmup_snapshots_date ON warmup_snapshots(checked_at);

-- ─── Auto-update triggers ───────────────────────────────────────────

CREATE TRIGGER IF NOT EXISTS trg_scrape_jobs_updated AFTER UPDATE ON scrape_jobs
BEGIN UPDATE scrape_jobs SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_leads_updated AFTER UPDATE ON leads
BEGIN UPDATE leads SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_assignments_updated AFTER UPDATE ON campaign_assignments
BEGIN UPDATE campaign_assignments SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_lead_analytics_updated AFTER UPDATE ON lead_analytics
BEGIN UPDATE lead_analytics SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_domains_updated AFTER UPDATE ON domains
BEGIN UPDATE domains SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_mailboxes_updated AFTER UPDATE ON mailboxes
BEGIN UPDATE mailboxes SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_copy_variants_updated AFTER UPDATE ON copy_variants
BEGIN UPDATE copy_variants SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_sent_emails_updated AFTER UPDATE ON sent_emails
BEGIN UPDATE sent_emails SET updated_at = datetime('now') WHERE id = NEW.id; END;
