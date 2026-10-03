#!/usr/bin/env bash
# Two sessions claim the same draft at the same time. Session A claims inside a transaction and
# holds it open with pg_sleep; session B claims while A is still open, so B has to wait on A's row
# lock and then re-check. Exactly one may win, and B must have actually overlapped A.
set -euo pipefail
: "${LI_TEST_DB:?LI_TEST_DB not set}"
PSQL=(psql -U postgres -X -q -t -A -v ON_ERROR_STOP=1 -d "$LI_TEST_DB")
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

"${PSQL[@]}" -c "set client_min_messages = warning; truncate li_messages, li_prospects restart identity cascade" >/dev/null
ID="$("${PSQL[@]}" -c "insert into li_messages (kind, external_id, body) values ('reply', 'race-1', 'hi') returning id" | head -1)"

"${PSQL[@]}" > "$OUT/a" 2>&1 <<SQL &
begin;
select 'A:' || claim_message($ID);
select pg_sleep(2);
commit;
SQL
A_PID=$!

sleep 0.5
"${PSQL[@]}" > "$OUT/b" 2>&1 <<SQL &
do \$\$
declare r boolean; t0 timestamptz := clock_timestamp();
begin
  r := claim_message($ID);
  raise notice 'B:% waited:%', r, round(extract(epoch from clock_timestamp() - t0)::numeric, 2);
end \$\$;
SQL
B_PID=$!
wait "$A_PID" "$B_PID"

A="$(grep -o 'A:[a-z]*' "$OUT/a")"
B="$(grep -o 'B:[a-z]*' "$OUT/b")"
WAITED="$(grep -o 'waited:[0-9.]*' "$OUT/b" | cut -d: -f2)"
WINS=$(printf '%s\n%s\n' "$A" "$B" | grep -c ':true' || true)
STATUS="$("${PSQL[@]}" -c "select status || '/' || attempts from li_messages where id = $ID")"

echo "  session A -> $A, session B -> $B (B blocked ${WAITED}s), row now $STATUS"
if [ "$WINS" -ne 1 ]; then echo "FAIL expected exactly one winning claim, got $WINS"; exit 1; fi
if ! awk -v w="$WAITED" 'BEGIN { exit !(w >= 1.0) }'; then
  echo "FAIL session B did not overlap session A (waited ${WAITED}s), so this proved nothing"; exit 1
fi
if [ "$STATUS" != "sending/1" ]; then echo "FAIL row should be sending with 1 attempt, is $STATUS"; exit 1; fi
echo "PASS two concurrent claim_message calls on one draft: exactly one true"
