#!/usr/bin/env bash
# Offline test suite for both LinkedIn skills.
# Creates a throwaway database li_test_<pid> on the local Postgres (psql -U postgres), loads
# schema.sql twice (it must be idempotent), runs tests/sql/*.sql and *.sh, then runs node --test
# over every *.test.mjs under linkedin-prospector/tests and linkedin-closer/tests. The database is
# dropped on exit, pass or fail. No test may touch the network: LINKEDIN_LEADGEN_OFFLINE=1.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL="$(dirname "$HERE")"
SKILLS="$(dirname "$SKILL")"
DB="li_test_$$"
PSQL=(psql -U postgres -X -q -v ON_ERROR_STOP=1)
FAILED=0
TMP="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP"
  "${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 \
    && echo "dropped database $DB" || echo "WARNING could not drop database $DB"
}
trap cleanup EXIT

"${PSQL[@]}" -d postgres -c "create database $DB" || { echo "FAIL cannot create database $DB"; exit 1; }
export LI_TEST_DB="$DB"

echo "== schema: load twice"
for pass in 1 2; do
  if "${PSQL[@]}" -d "$DB" -f "$SKILL/schema.sql" >/dev/null 2>"$TMP/schema.err"; then
    echo "PASS schema.sql load $pass"
  else
    echo "FAIL schema.sql load $pass"; cat "$TMP/schema.err"; FAILED=1
  fi
done

echo "== sql tests"
for f in "$HERE"/sql/*.sql; do
  [ -e "$f" ] || continue
  echo "-- $(basename "$f")"
  out="$("${PSQL[@]}" -d "$DB" -f "$f" 2>&1)"; rc=$?
  printf '%s\n' "$out" | sed -n 's/^.*NOTICE:  \(PASS.*\)$/  \1/p'
  if [ $rc -ne 0 ]; then
    printf '%s\n' "$out" | grep -v 'NOTICE:' | sed 's/^/  /'
    echo "FAIL $(basename "$f")"; FAILED=1
  fi
done
for f in "$HERE"/sql/*.sh; do
  [ -e "$f" ] || continue
  echo "-- $(basename "$f")"
  if ! bash "$f"; then echo "FAIL $(basename "$f")"; FAILED=1; fi
done

echo "== node tests"
TESTS=()
while IFS= read -r t; do TESTS+=("$t"); done < <(
  for d in "$SKILLS/linkedin-prospector/tests" "$SKILLS/linkedin-closer/tests"; do
    [ -d "$d" ] && find "$d" -name '*.test.mjs' -type f
  done | sort
)
if [ ${#TESTS[@]} -eq 0 ]; then
  echo "FAIL no *.test.mjs files found"; FAILED=1
else
  if ! LINKEDIN_LEADGEN_OFFLINE=1 node --test --test-reporter=spec "${TESTS[@]}"; then FAILED=1; fi
fi

echo
if [ $FAILED -ne 0 ]; then echo "RESULT: FAILED"; exit 1; fi
echo "RESULT: ALL PASSED"
