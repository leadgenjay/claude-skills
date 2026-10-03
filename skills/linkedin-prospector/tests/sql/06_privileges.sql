-- With Supabase's anon and authenticated roles present and holding grants, reloading schema.sql
-- takes every table and function privilege away from them, and every function pins search_path.
-- Runs in one transaction that is rolled back, so the roles never outlive the test.
\set ON_ERROR_STOP 1
begin;
set local client_min_messages = warning;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant all on li_creators, li_posts, li_prospects, li_messages, li_alerts, li_runs, li_campaign_state to anon, authenticated;
grant execute on function reserve_spend(text, text, numeric, numeric, numeric, numeric), claim_message(bigint), claim_send(bigint, int) to anon, authenticated;
\ir ../../schema.sql
do $$
declare
  t text;
  r text;
  f record;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach t in array array['li_creators', 'li_posts', 'li_prospects', 'li_messages', 'li_alerts',
                             'li_runs', 'li_campaign_state'] loop
      if has_table_privilege(r, t, 'select') or has_table_privilege(r, t, 'insert')
         or has_table_privilege(r, t, 'update') or has_table_privilege(r, t, 'delete') then
        raise exception 'FAIL % still has privileges on %', r, t;
      end if;
    end loop;
    for f in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname in ('reserve_spend', 'settle_spend', 'claim_send', 'claim_message',
               'finish_message', 'expire_stuck_sends', 'daily_count', 'unanswered_streak') loop
      if has_function_privilege(r, f.oid, 'execute') then
        raise exception 'FAIL % can still execute %', r, f.proname;
      end if;
    end loop;
  end loop;
  for f in select p.proname, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname like 'li\_%' or p.proname in ('reserve_spend', 'settle_spend',
             'claim_send', 'claim_message', 'finish_message', 'expire_stuck_sends', 'daily_count', 'unanswered_streak')) loop
    if f.proconfig is null or not ('search_path=public' = any(f.proconfig)) then
      raise exception 'FAIL function % has no pinned search_path', f.proname;
    end if;
  end loop;
  set local client_min_messages = notice;
  raise notice 'PASS anon and authenticated lose all table and function privileges; every function pins search_path';
end $$;
rollback;
