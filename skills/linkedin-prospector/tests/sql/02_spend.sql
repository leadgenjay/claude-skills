-- Spend caps (plan build step 2, offline).
\set ON_ERROR_STOP 1
truncate li_runs restart identity;

do $$
declare
  r jsonb;
  n int;
begin
  r := reserve_spend('scrape-commenters', 'harvestapi/linkedin-post-comments', 11, 10, 25, 2750);
  if (r->>'ok')::boolean or r->>'reason' <> 'per_run_cap' then
    raise exception 'FAIL $11 at a $10 cap returned %', r;
  end if;
  select count(*) into n from li_runs
   where id = (r->>'run_id')::bigint and error = 'over_cap' and est_cost_usd is null;
  if n <> 1 then raise exception 'FAIL refused run did not write an over_cap row with no estimate'; end if;
  raise notice 'PASS $11 refused at $10 per-run cap, over_cap row written with est NULL';

  r := reserve_spend('s', 'a', 10, 10, 25);
  if not (r->>'ok')::boolean then raise exception 'FAIL exactly-at-cap $10 refused: %', r; end if;
  raise notice 'PASS $10 at a $10 cap is allowed';
end $$;

truncate li_runs restart identity;

do $$
declare
  r jsonb;
  spent numeric;
begin
  -- seeded: one settled run ($12 actual over an $8 estimate), one crashed run (estimate only)
  insert into li_runs (step, actor_or_api, est_cost_usd, actual_cost_usd, finished_at)
    values ('find-creators', 'a', 8, 12, now());
  insert into li_runs (step, actor_or_api, est_cost_usd) values ('scrape-commenters', 'b', 8);
  -- $20 counts toward the total

  r := reserve_spend('scrape-commenters', 'b', 6, 10, 25);
  if (r->>'ok')::boolean or r->>'reason' <> 'total_cap' then
    raise exception 'FAIL $6 on $20 spent at a $25 total returned %', r;
  end if;
  if (r->>'spent_usd')::numeric <> 20 then raise exception 'FAIL spent_usd reported %', r->>'spent_usd'; end if;

  select sum(coalesce(actual_cost_usd, est_cost_usd)) into spent from li_runs
   where error is distinct from 'over_cap';
  if spent <> 20 then raise exception 'FAIL over_cap row changed the total to %', spent; end if;
  raise notice 'PASS reservation crossing the $25 total refused; total unchanged at $20';

  r := reserve_spend('s', 'b', 5, 10, 25);
  if not (r->>'ok')::boolean then raise exception 'FAIL $5 to reach exactly $25 refused: %', r; end if;
  r := reserve_spend('s', 'b', 0.01, 10, 25);
  if (r->>'ok')::boolean then raise exception 'FAIL a cent past the total was allowed'; end if;
  raise notice 'PASS the total cap is inclusive and holds after it is reached';
end $$;

do $$
declare
  r jsonb;
  v numeric;
begin
  truncate li_runs restart identity;
  r := reserve_spend('s', 'a', 4, 10, 25);
  perform settle_spend((r->>'run_id')::bigint, 3.5, null);
  select actual_cost_usd into v from li_runs where id = (r->>'run_id')::bigint;
  if v <> 3.5 then raise exception 'FAIL settle_spend stored %', v; end if;

  begin
    perform settle_spend((r->>'run_id')::bigint, 1, 'over_cap');
    raise exception 'FAIL settle_spend accepted error over_cap';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  r := reserve_spend('s', 'a', 40, 10, 25);
  begin
    perform settle_spend((r->>'run_id')::bigint, 1, null);
    raise exception 'FAIL settle_spend settled a refused run';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS settle_spend records actual cost and will not touch refused runs';
end $$;
