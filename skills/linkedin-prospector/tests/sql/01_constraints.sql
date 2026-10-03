-- Tables exist, uniqueness and status enums hold, triggers fill derived columns.
\set ON_ERROR_STOP 1
truncate li_messages, li_alerts, li_prospects, li_posts, li_creators, li_runs, li_campaign_state restart identity cascade;

do $$
declare
  t text;
begin
  foreach t in array array['li_creators', 'li_posts', 'li_prospects', 'li_messages',
                           'li_alerts', 'li_runs', 'li_campaign_state'] loop
    if to_regclass(t) is null then raise exception 'FAIL table % missing', t; end if;
  end loop;
  foreach t in array array['reserve_spend', 'settle_spend', 'claim_send', 'claim_message', 'finish_message',
                           'expire_stuck_sends', 'daily_count', 'unanswered_streak'] loop
    if not exists (select 1 from pg_proc where proname = t) then raise exception 'FAIL function % missing', t; end if;
  end loop;
  raise notice 'PASS all 7 tables and 8 functions exist';
end $$;

do $$
begin
  insert into li_prospects (public_id) values ('jane-doe');
  begin
    insert into li_prospects (public_id) values ('jane-doe');
    raise exception 'FAIL duplicate public_id was accepted';
  exception when unique_violation then
    raise notice 'PASS duplicate public_id rejected';
  end;
  begin
    insert into li_prospects (public_id) values ('Jane-Doe-2');
    raise exception 'FAIL uppercase public_id was accepted';
  exception when check_violation then
    raise notice 'PASS non-lowercase public_id rejected';
  end;
end $$;

do $$
declare
  bad record;
begin
  for bad in
    select * from (values
      ('li_prospects', 'insert into li_prospects (public_id, status) values (''x1'', ''contacted'')'),
      ('li_creators',  'insert into li_creators (profile_url, status) values (''u1'', ''maybe'')'),
      ('li_messages kind',   'insert into li_messages (kind, body) values (''connect_note'', ''hi'')'),
      ('li_messages status', 'insert into li_messages (kind, body, status) values (''reply'', ''hi'', ''queued'')')
    ) v(what, stmt)
  loop
    begin
      execute bad.stmt;
      raise exception 'FAIL % accepted a value outside its enum', bad.what;
    exception when check_violation then
      raise notice 'PASS % enum enforced', bad.what;
    end;
  end loop;
end $$;

do $$
declare
  s text;
begin
  -- every plan status is accepted
  foreach s in array array['new', 'qualified', 'rejected', 'drafted', 'approved', 'pushing', 'pushed',
                           'connect_sent', 'accepted', 'welcome_sent', 'replied', 'meeting_booked',
                           'do_not_contact', 'push_failed'] loop
    insert into li_prospects (public_id, status) values ('status-' || replace(s, '_', '-'), s);
  end loop;
  foreach s in array array['draft', 'sending', 'sent', 'failed', 'dropped', 'escalated'] loop
    insert into li_messages (kind, external_id, body, status) values ('reply', 'enum-' || s, 'x', s);
  end loop;
  raise notice 'PASS every plan status value is accepted';
end $$;

do $$
declare
  n int;
begin
  insert into li_messages (kind, external_id, body, char_count) values ('reply', 'chat-1', 'hello there', 999);
  select char_count into n from li_messages where external_id = 'chat-1';
  if n <> 11 then raise exception 'FAIL char_count is %, expected 11', n; end if;
  begin
    insert into li_messages (kind, external_id, body) values ('reply', 'chat-1', 'again');
    raise exception 'FAIL duplicate (kind, external_id) accepted';
  exception when unique_violation then
    raise notice 'PASS duplicate (kind, external_id) rejected; char_count set by trigger';
  end;
  -- same external id under another kind is fine
  insert into li_messages (kind, external_id, body) values ('comment_reply', 'chat-1', 'ok');
end $$;

do $$
begin
  begin
    insert into li_runs (step, actor_or_api, est_cost_usd, error) values ('s', 'a', 1, 'over_cap');
    raise exception 'FAIL over_cap row with an estimate accepted';
  exception when check_violation then
    raise notice 'PASS over_cap rows cannot carry an estimate';
  end;
end $$;

do $$
declare
  m bigint;
begin
  insert into li_messages (kind, external_id, target_id, body) values ('reply', 'cols-1', 'chat-abc', 'x') returning id into m;
  if (select meta from li_messages where id = m) <> '{}'::jsonb then raise exception 'FAIL meta default'; end if;
  if (select target_id from li_messages where id = m) <> 'chat-abc' then raise exception 'FAIL target_id'; end if;
  if (select prospect_id from li_messages where id = m) is not null then raise exception 'FAIL prospect_id should be nullable'; end if;
  raise notice 'PASS li_messages has target_id, meta default {}, nullable prospect_id';
end $$;
