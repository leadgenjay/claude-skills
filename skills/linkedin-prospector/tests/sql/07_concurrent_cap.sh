#!/usr/bin/env bash
# The daily cap holds under concurrency. Cap 1, nothing sent yet, two different reply drafts.
# Session A claims one inside a transaction held open with pg_sleep; session B claims the other
# while A is still open. Without the lock both would count 0 and both would claim.
set -euo pipefail
: "${LI_TEST_DB:?LI_TEST_DB not set}"
PSQL=(psql -U postgres -X -q -t -A -v ON_ERROR_STOP=1 -d "$LI_TEST_DB")
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

"${PSQL[@]}" -c "set client_min_messages = warning; truncate li_messages, li_prospects restart identity cascade" >/dev/null
ID1="$("${PSQL[@]}" -c "insert into li_messages (kind, external_id, body) values ('reply', 'cap-1', 'hi') returning id" | head -1)"
ID2="$("${PSQL[@]}" -c "insert into li_messages (kind, external_id, body) values ('reply', 'cap-2', 'hi') returning id" | head -1)"

"${PSQL[@]}" > "$OUT/a" 2>&1 <<SQL &
begin;
select 'A:' || claim_send($ID1, 1);
select pg_sleep(2);
commit;
SQL
A_PID=$!

sleep 0.5
"${PSQL[@]}" > "$OUT/b" 2>&1 <<SQL &
do \$\$
declare r text; t0 timestamptz := clock_timestamp();
begin
  r := claim_send($ID2, 1);
  raise notice 'B:% waited:%', r, round(extract(epoch from clock_timestamp() - t0)::numeric, 2);
end \$\$;
SQL
B_PID=$!
wait "$A_PID" "$B_PID"

A="$(grep -o 'A:[a-z]*' "$OUT/a")"
B="$(grep -o 'B:[a-z]*' "$OUT/b")"
WAITED="$(grep -o 'waited:[0-9.]*' "$OUT/b" | cut -d: -f2)"
CLAIMED=$(printf '%s\n%s\n' "$A" "$B" | grep -c ':claimed' || true)
SENDING="$("${PSQL[@]}" -c "select count(*) from li_messages where status = 'sending'")"

echo "  session A -> $A, session B -> $B (B blocked ${WAITED}s), rows sending: $SENDING"
if [ "$CLAIMED" -ne 1 ]; then echo "FAIL expected exactly one claim under a cap of 1, got $CLAIMED"; exit 1; fi
if ! awk -v w="$WAITED" 'BEGIN { exit !(w >= 1.0) }'; then
  echo "FAIL session B did not overlap session A (waited ${WAITED}s), so this proved nothing"; exit 1
fi
if [ "$B" != "B:cap" ]; then echo "FAIL the loser should be refused on the cap, got $B"; exit 1; fi
if [ "$SENDING" != "1" ]; then echo "FAIL expected one sending row, found $SENDING"; exit 1; fi
echo "PASS two concurrent claim_send calls on different rows with a cap of 1: exactly one claimed"
