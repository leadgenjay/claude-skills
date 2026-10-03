#!/usr/bin/env bash
# Two overlapping reservations that each fit the total cap alone but cross it together.
# $15 is already spent against a $25 total; A and B each ask for $6. A reserves inside a
# transaction held open with pg_sleep; B asks while A is still open. Exactly one may pass.
set -euo pipefail
: "${LI_TEST_DB:?LI_TEST_DB not set}"
PSQL=(psql -U postgres -X -q -t -A -v ON_ERROR_STOP=1 -d "$LI_TEST_DB")
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

"${PSQL[@]}" -c "truncate li_runs restart identity" >/dev/null
"${PSQL[@]}" -c "insert into li_runs (step, actor_or_api, est_cost_usd, actual_cost_usd, finished_at) values ('seed', 'x', 15, 15, now())" >/dev/null

"${PSQL[@]}" > "$OUT/a" 2>&1 <<'SQL' &
begin;
select 'A:' || (reserve_spend('scrape-commenters', 'actor', 6, 10, 25)->>'ok');
select pg_sleep(2);
commit;
SQL
A_PID=$!

sleep 0.5
"${PSQL[@]}" > "$OUT/b" 2>&1 <<'SQL' &
do $$
declare r jsonb; t0 timestamptz := clock_timestamp();
begin
  r := reserve_spend('scrape-commenters', 'actor', 6, 10, 25);
  raise notice 'B:% reason:% waited:%', r->>'ok', coalesce(r->>'reason', '-'),
    round(extract(epoch from clock_timestamp() - t0)::numeric, 2);
end $$;
SQL
B_PID=$!
wait "$A_PID" "$B_PID"

A="$(grep -o 'A:[a-z]*' "$OUT/a")"
B="$(grep -o 'B:[a-z]*' "$OUT/b")"
REASON="$(grep -o 'reason:[a-z_-]*' "$OUT/b" | cut -d: -f2)"
WAITED="$(grep -o 'waited:[0-9.]*' "$OUT/b" | cut -d: -f2)"
WINS=$(printf '%s\n%s\n' "$A" "$B" | grep -c ':true' || true)
TOTAL="$("${PSQL[@]}" -c "select sum(coalesce(actual_cost_usd, est_cost_usd)) from li_runs where error is distinct from 'over_cap'")"
REFUSED="$("${PSQL[@]}" -c "select count(*) from li_runs where error = 'over_cap' and est_cost_usd is null")"

echo "  session A -> $A, session B -> $B ($REASON, blocked ${WAITED}s), counted total \$$TOTAL, over_cap rows $REFUSED"
if [ "$WINS" -ne 1 ]; then echo "FAIL expected exactly one reservation to pass, got $WINS"; exit 1; fi
if ! awk -v w="$WAITED" 'BEGIN { exit !(w >= 1.0) }'; then
  echo "FAIL session B did not overlap session A (waited ${WAITED}s), so this proved nothing"; exit 1
fi
if [ "$REASON" != "total_cap" ]; then echo "FAIL loser should be refused on total_cap, got $REASON"; exit 1; fi
if [ "$TOTAL" != "21" ]; then echo "FAIL counted total should be 21, is $TOTAL"; exit 1; fi
if [ "$REFUSED" != "1" ]; then echo "FAIL expected one over_cap row, found $REFUSED"; exit 1; fi
echo "PASS two concurrent reserve_spend calls crossing the total: only one succeeds"
