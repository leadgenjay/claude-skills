-- LinkedIn Lead System schema.
-- Paste the whole file into the Supabase SQL editor and run it. Running it again is safe:
-- every statement is "if not exists" or "create or replace".
--
-- Anything that must not race (spend caps, claiming a message to send) is a SQL function here,
-- called through Supabase REST (POST /rest/v1/rpc/<name>), never a read-then-write in a script.

-- ---------------------------------------------------------------- tables

create table if not exists li_creators (
  id                bigint generated always as identity primary key,
  profile_url       text not null unique,
  name              text,
  headline          text,
  followers         integer,
  posts_sampled     integer,
  median_engagement numeric,
  score             numeric,
  status            text not null default 'candidate'
                    check (status in ('candidate', 'approved', 'rejected')),
  discovered_via    text,
  created_at        timestamptz not null default now()
);

create table if not exists li_posts (
  id          bigint generated always as identity primary key,
  creator_id  bigint references li_creators(id) on delete set null,
  post_url    text not null unique,
  posted_at   timestamptz,
  reactions   integer,
  comments    integer,
  post_text   text,
  scraped_at  timestamptz not null default now()
);

create table if not exists li_prospects (
  id                  bigint generated always as identity primary key,
  -- normalized LinkedIn slug, lowercase
  public_id           text not null unique check (public_id = lower(public_id) and public_id <> ''),
  profile_url         text,
  name                text,
  headline            text,
  company             text,
  location            text,
  source_creator_id   bigint references li_creators(id) on delete set null,
  source_post_id      bigint references li_posts(id) on delete set null,
  comment_text        text,
  icp_score           integer check (icp_score between 0 and 100),
  icp_reason          text,
  status              text not null default 'new'
                      check (status in ('new', 'qualified', 'rejected', 'drafted', 'approved',
                                        'pushing', 'pushed', 'connect_sent', 'accepted',
                                        'welcome_sent', 'replied', 'meeting_booked',
                                        'do_not_contact', 'push_failed')),
  dnc_reason          text,
  push_attempts       integer not null default 0,
  aimfox_lead_urn     text,
  unipile_provider_id text,
  -- time of the prospect's latest inbound message, set by the closer; read by unanswered_streak
  last_inbound_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists li_messages (
  id          bigint generated always as identity primary key,
  -- null for a chat or comment that matched no prospect
  prospect_id bigint references li_prospects(id) on delete cascade,
  kind        text not null check (kind in ('welcome', 'reply', 'comment_reply')),
  -- the chat message or comment id being answered
  external_id text,
  -- where the answer goes: the Unipile chat id (reply) or the post's social id (comment_reply)
  target_id   text,
  -- classification, not_from_campaign, commenter name, drop reason and the like
  meta        jsonb not null default '{}'::jsonb,
  body        text not null,
  -- set from body by a trigger, whatever the caller sends
  char_count  integer,
  status      text not null default 'draft'
              check (status in ('draft', 'sending', 'sent', 'failed', 'dropped', 'escalated')),
  attempts    integer not null default 0,
  sent_via    text,
  sent_at     timestamptz,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint li_messages_kind_external_id_key unique (kind, external_id)
);

create table if not exists li_alerts (
  id          bigint generated always as identity primary key,
  kind        text not null,
  prospect_id bigint references li_prospects(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Every paid call writes one row. A refused call writes error = 'over_cap' with no estimate,
-- and those rows never count toward the total.
create table if not exists li_runs (
  id              bigint generated always as identity primary key,
  step            text not null,
  actor_or_api    text not null,
  units           numeric,
  est_cost_usd    numeric check (est_cost_usd >= 0),
  actual_cost_usd numeric check (actual_cost_usd >= 0),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  error           text,
  constraint li_runs_over_cap_has_no_estimate check (error is distinct from 'over_cap' or est_cost_usd is null)
);

create table if not exists li_campaign_state (
  campaign_id       text primary key,
  fingerprint       text,
  confirmed_at      timestamptz,
  loop_installed_at timestamptz,
  -- set when a batch was enrolled into a PAUSED campaign; null = not waiting for a start
  awaiting_start    timestamptz
);

-- upgrades for installs made before these columns existed
alter table li_campaign_state add column if not exists awaiting_start timestamptz;
alter table li_posts add column if not exists post_text text;

create index if not exists li_prospects_status_idx on li_prospects (status);
create index if not exists li_messages_prospect_idx on li_messages (prospect_id);
create index if not exists li_messages_status_idx on li_messages (status);
create index if not exists li_alerts_open_idx on li_alerts (created_at) where resolved_at is null;

-- ---------------------------------------------------------------- triggers

create or replace function li_prospects_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists li_prospects_touch on li_prospects;
create trigger li_prospects_touch before update on li_prospects
  for each row execute function li_prospects_touch();

create or replace function li_messages_char_count() returns trigger
language plpgsql set search_path = public as $$
begin
  new.char_count := char_length(new.body);
  return new;
end $$;

drop trigger if exists li_messages_char_count on li_messages;
create trigger li_messages_char_count before insert or update of body on li_messages
  for each row execute function li_messages_char_count();

-- ---------------------------------------------------------------- spend control

-- Reserve an estimated spend before a paid call. One guarded insert, serialized by a
-- transaction-scoped advisory lock so two overlapping callers cannot both pass the total cap.
-- Returns {ok: true, run_id} or {ok: false, reason: 'per_run_cap'|'total_cap', run_id, spent_usd}.
create or replace function reserve_spend(
  p_step text, p_actor text, p_est numeric, p_per_run_cap numeric, p_total_cap numeric,
  p_units numeric default null
) returns jsonb
language plpgsql set search_path = public as $$
declare
  v_id    bigint;
  v_spent numeric;
  v_reason text;
begin
  if p_est is null or p_est < 0 then
    raise exception 'reserve_spend: estimate must be a number >= 0, got %', p_est;
  end if;
  if p_per_run_cap is null or p_total_cap is null then
    raise exception 'reserve_spend: both caps are required';
  end if;

  perform pg_advisory_xact_lock(hashtext('li_runs.reserve_spend'));

  insert into li_runs (step, actor_or_api, units, est_cost_usd)
  select p_step, p_actor, p_units, p_est
  where p_est <= p_per_run_cap
    and (select coalesce(sum(coalesce(actual_cost_usd, est_cost_usd)), 0)
           from li_runs where error is distinct from 'over_cap') + p_est <= p_total_cap
  returning id into v_id;

  if v_id is not null then
    return jsonb_build_object('ok', true, 'run_id', v_id);
  end if;

  select coalesce(sum(coalesce(actual_cost_usd, est_cost_usd)), 0) into v_spent
    from li_runs where error is distinct from 'over_cap';
  v_reason := case when p_est > p_per_run_cap then 'per_run_cap' else 'total_cap' end;

  insert into li_runs (step, actor_or_api, units, est_cost_usd, finished_at, error)
  values (p_step, p_actor, p_units, null, now(), 'over_cap')
  returning id into v_id;

  return jsonb_build_object('ok', false, 'reason', v_reason, 'run_id', v_id, 'spent_usd', v_spent);
end $$;

-- Record what a reserved run actually cost. A null actual leaves the estimate counting.
create or replace function settle_spend(p_run_id bigint, p_actual numeric, p_error text)
returns void
language plpgsql set search_path = public as $$
begin
  if p_error = 'over_cap' then
    raise exception 'settle_spend: over_cap is reserved for refused runs';
  end if;
  update li_runs
     set actual_cost_usd = p_actual, finished_at = now(), error = p_error
   where id = p_run_id and error is distinct from 'over_cap';
  if not found then
    raise exception 'settle_spend: no reserved run %', p_run_id;
  end if;
end $$;

-- ---------------------------------------------------------------- sending

-- Claim one draft for sending, with the daily cap checked under the same lock.
-- Returns 'claimed' for exactly one caller, 'busy' when the row is not a draft (another pass has
-- it, it was sent, or it does not exist), 'cap' when p_daily_cap rows of the same kind were sent
-- or are mid-send in the rolling 24 hours (the row stays a draft), or 'dropped' when the prospect
-- is do_not_contact (the draft is dropped). Claims of one kind are serialized by an advisory lock,
-- so two passes cannot both take the last slot under the cap.
create or replace function claim_send(p_id bigint, p_daily_cap int default null) returns text
language plpgsql set search_path = public as $$
declare
  v_kind text;
  v_used int;
begin
  select kind into v_kind from li_messages where id = p_id;
  if v_kind is null then
    return 'busy';
  end if;
  perform pg_advisory_xact_lock(hashtext('li_messages.claim_send.' || v_kind));

  update li_messages m set status = 'dropped'
   where m.id = p_id and m.status = 'draft'
     and exists (select 1 from li_prospects p
                  where p.id = m.prospect_id and p.status = 'do_not_contact');
  if found then
    return 'dropped';
  end if;

  if p_daily_cap is not null then
    select count(*) into v_used from li_messages
     where kind = v_kind and status in ('sent', 'sending')
       and coalesce(sent_at, claimed_at) > now() - interval '24 hours';
    if v_used >= p_daily_cap then
      return 'cap';
    end if;
  end if;

  update li_messages set status = 'sending', claimed_at = now(), attempts = attempts + 1
   where id = p_id and status = 'draft';
  return case when found then 'claimed' else 'busy' end;
end $$;

-- Boolean form kept for existing callers: claim_send with no cap. True only when claimed.
create or replace function claim_message(p_id bigint) returns boolean
language plpgsql set search_path = public as $$
begin
  return claim_send(p_id, null) = 'claimed';
end $$;

-- Record the outcome of a claimed send. 'sent' → sent; 'error' → back to draft, or failed
-- once attempts reaches 3. Returns the new status, or null if the row was not being sent.
-- A send that lands after expire_stuck_sends gave up on it is still recorded as sent.
create or replace function finish_message(p_id bigint, p_outcome text) returns text
language plpgsql set search_path = public as $$
declare
  v_status text;
begin
  if p_outcome = 'sent' then
    update li_messages set status = 'sent', sent_at = now()
     where id = p_id and (status = 'sending' or (status = 'failed' and claimed_at is not null))
    returning status into v_status;
  elsif p_outcome = 'error' then
    update li_messages
       set status = case when attempts >= 3 then 'failed' else 'draft' end
     where id = p_id and status = 'sending'
    returning status into v_status;
  else
    raise exception 'finish_message: outcome must be sent or error, got %', p_outcome;
  end if;
  return v_status;
end $$;

-- A row left in 'sending' longer than p_minutes may have gone out, so it is never retried:
-- it becomes failed and the caller alerts. Returns the ids it failed.
create or replace function expire_stuck_sends(p_minutes int default 15) returns setof bigint
language plpgsql set search_path = public as $$
begin
  return query
    update li_messages set status = 'failed'
     where status = 'sending' and claimed_at < now() - make_interval(mins => p_minutes)
    returning id;
end $$;

-- Messages of one kind sent (or mid-send) in the rolling 24 hours. Feeds the daily caps.
create or replace function daily_count(p_kind text) returns int
language plpgsql set search_path = public as $$
declare
  v_count int;
begin
  if p_kind is null or p_kind not in ('welcome', 'reply', 'comment_reply') then
    raise exception 'daily_count: unknown kind %', p_kind;
  end if;
  select count(*) into v_count from li_messages
   where kind = p_kind and status in ('sent', 'sending')
     and coalesce(sent_at, claimed_at) > now() - interval '24 hours';
  return v_count;
end $$;

-- Our replies to a prospect since they last wrote (li_prospects.last_inbound_at, set by the
-- closer). Mid-send rows count, since they may have gone out. The welcome is not counted: Aimfox
-- sends it before any conversation exists.
create or replace function unanswered_streak(p_prospect bigint) returns int
language plpgsql set search_path = public as $$
declare
  v_count int;
begin
  select count(*) into v_count
    from li_messages m join li_prospects p on p.id = m.prospect_id
   where m.prospect_id = p_prospect and m.kind = 'reply'
     and m.status in ('sent', 'sending')
     and coalesce(m.sent_at, m.claimed_at) > coalesce(p.last_inbound_at, '-infinity'::timestamptz);
  return v_count;
end $$;

-- ---------------------------------------------------------------- access

-- Only the service key may touch these tables. RLS with no policies shuts out the public anon
-- key; the service role bypasses RLS. Function grants are tightened the same way on Supabase.
alter table li_creators       enable row level security;
alter table li_posts          enable row level security;
alter table li_prospects      enable row level security;
alter table li_messages       enable row level security;
alter table li_alerts         enable row level security;
alter table li_runs           enable row level security;
alter table li_campaign_state enable row level security;

do $$
declare
  fn text;
  tbl text;
  r text;
begin
  -- Supabase's public API roles get nothing on these tables; only the service role reads them.
  foreach tbl in array array['li_creators', 'li_posts', 'li_prospects', 'li_messages', 'li_alerts',
                             'li_runs', 'li_campaign_state'] loop
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('revoke all on table %I from %I', tbl, r);
      end if;
    end loop;
  end loop;

  foreach fn in array array[
    'reserve_spend(text, text, numeric, numeric, numeric, numeric)',
    'settle_spend(bigint, numeric, text)',
    'claim_send(bigint, int)',
    'claim_message(bigint)',
    'finish_message(bigint, text)',
    'expire_stuck_sends(int)',
    'daily_count(text)',
    'unanswered_streak(bigint)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;
