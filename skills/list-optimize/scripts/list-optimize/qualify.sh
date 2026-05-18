#!/usr/bin/env bash
# Phase 1: AI-qualify leads against a campaign's ICP.
#
# Reads scripts/campaigns/{campaign}/strategy.md, batches unqualified leads to Claude,
# writes qualification_status / reason / score back to the leads table, and appends a
# lead_events audit row per lead.
#
# Usage:
#   bash scripts/list-optimize/qualify.sh <campaign-name>
#   bash scripts/list-optimize/qualify.sh <campaign-name> --limit 50
#   bash scripts/list-optimize/qualify.sh <campaign-name> --batch-size 20 --scrape-job 12
#   bash scripts/list-optimize/qualify.sh <campaign-name> --dry-run     # don't call API, don't write
#
# Idempotent: only processes leads WHERE qualification_status IS NULL.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_DIR/scripts/db-query.sh"

# ─── Args ───────────────────────────────────────────────────────────
CAMPAIGN=""
LIMIT=""
BATCH_SIZE=20
SCRAPE_JOB=""
REQUIRE_ICP_TIER=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2 ;;
    --batch-size) BATCH_SIZE="$2"; shift 2 ;;
    --scrape-job) SCRAPE_JOB="$2"; shift 2 ;;
    --require-icp-tier) REQUIRE_ICP_TIER=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's|^# ||; s|^#||'
      exit 0
      ;;
    *)
      if [[ -z "$CAMPAIGN" ]]; then CAMPAIGN="$1"; else
        echo "ERROR: Unknown arg: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -z "$CAMPAIGN" ]] && { echo "Usage: $0 <campaign-name> [--limit N] [--batch-size N] [--scrape-job ID] [--dry-run]" >&2; exit 1; }

STRATEGY_FILE="$PROJECT_DIR/scripts/campaigns/${CAMPAIGN}/strategy.md"
[[ -f "$STRATEGY_FILE" ]] || { echo "ERROR: Strategy not found: $STRATEGY_FILE" >&2; echo "Run /cold-email-strategy first." >&2; exit 1; }

if ! db_enabled; then
  echo "ERROR: Turso DB not configured. Run scripts/db-setup.sh first." >&2
  exit 1
fi

# LLM access: uses `claude -p --model claude-sonnet-4-6` (Claude Code subscription) — no API key required.
if [[ "$DRY_RUN" -eq 0 ]] && ! command -v claude >/dev/null 2>&1; then
  echo "ERROR: \`claude\` CLI not on PATH. Install Claude Code to enable qualification." >&2
  exit 1
fi

# ─── Build WHERE clause ─────────────────────────────────────────────
WHERE="WHERE qualification_status IS NULL"
[[ -n "$SCRAPE_JOB" ]] && WHERE="$WHERE AND scrape_job_id = $SCRAPE_JOB"
[[ "$REQUIRE_ICP_TIER" -eq 1 ]] && WHERE="$WHERE AND icp_tier IS NOT NULL"
LIMIT_CLAUSE=""
[[ -n "$LIMIT" ]] && LIMIT_CLAUSE="LIMIT $LIMIT"

# Count target leads
total=$(db_scalar "SELECT COUNT(*) FROM leads $WHERE")
total="${total:-0}"
total="${total// /}"  # strip whitespace

if [[ "$total" -eq 0 ]]; then
  echo "No leads to qualify (qualification_status IS NULL: 0)."
  exit 0
fi

# Apply explicit limit cap to count display
display_total="$total"
[[ -n "$LIMIT" && "$LIMIT" -lt "$total" ]] && display_total="$LIMIT"

echo "Qualifying $display_total leads against $STRATEGY_FILE"
echo "Batch size: $BATCH_SIZE  Dry run: $DRY_RUN"
echo

# ─── Pull leads as JSON via Python (write to temp file — large lists exceed ARG_MAX) ──
SELECT_COLS="id, first_name, last_name, job_title, company_name, industry, company_size, city, state, country, linkedin_url, icp_tier"
LEADS_JSON_FILE="$(mktemp /tmp/qualify-leads-XXXXXX.json)"
trap 'rm -f "$LEADS_JSON_FILE"' EXIT
db_query "SELECT $SELECT_COLS FROM leads $WHERE $LIMIT_CLAUSE" | python3 -c "
import sys, json
rows = sys.stdin.read().strip().split('\n')
if len(rows) < 2:
    print('[]'); sys.exit(0)
header = rows[0].split('\t')
out = []
for r in rows[1:]:
    cells = r.split('\t')
    if len(cells) != len(header): continue
    out.append({header[i]: (cells[i] if cells[i] != '' else None) for i in range(len(header))})
print(json.dumps(out))
" > "$LEADS_JSON_FILE"

actual_count=$(python3 -c "import json; print(len(json.load(open('$LEADS_JSON_FILE'))))")
echo "Pulled $actual_count leads from DB."

# Read strategy.md once
STRATEGY_TEXT=$(cat "$STRATEGY_FILE")

# ─── Batch processing ──────────────────────────────────────────────
# Export env vars for the Python heredoc below (LEADS_JSON via file path, not value)
export LEADS_JSON_FILE STRATEGY_TEXT BATCH_SIZE DRY_RUN PROJECT_DIR

# Use python to slice into batches, drive the loop, and call claude CLI in parallel
python3 - <<'PYEOF'
import json, os, sys, subprocess, time, re
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

with open(os.environ["LEADS_JSON_FILE"]) as _f:
    leads = json.load(_f)
strategy_text = os.environ["STRATEGY_TEXT"]
batch_size = int(os.environ["BATCH_SIZE"])
dry_run = os.environ["DRY_RUN"] == "1"
project_dir = os.environ["PROJECT_DIR"]

MODEL = "claude-sonnet-4-6"
PARALLEL = int(os.environ.get("QUALIFY_PARALLEL", "12"))

SYSTEM_PROMPT = """You are a cold-email-list cleaning assistant. Score each lead against the campaign's Ideal Customer Profile (ICP). Output STRICT JSON only — no prose, no markdown, no commentary.

For each lead, return:
- id: the lead.id from the input
- status: "qualified" if the lead matches the ICP, "disqualified" if not
- reason: one short sentence explaining why
- score: integer 0-100 representing fit (100 = perfect ICP match, 0 = clearly out of profile)

Be strict. A lead must MATCH the ICP. Wrong industry, wrong title seniority, wrong company size, wrong geography are hard disqualifications. If a critical field is missing, disqualify with reason "insufficient data" and score 0.

Output a JSON array, one entry per input lead, in input order. No other text."""

def sql_escape(v):
    if v is None: return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def db_exec(sql):
    """Execute via the bash helper (uses Turso HTTP API)."""
    if dry_run:
        print(f"  [dry-run] {sql[:120]}...")
        return True
    env = {**os.environ, "_DB_DIR": project_dir}
    r = subprocess.run(
        ["bash", "-c", 'source "$_DB_DIR/scripts/db-query.sh" && db_exec "$1"', "_", sql],
        capture_output=True, text=True, env=env
    )
    if r.returncode != 0:
        print(f"  WARN: db_exec failed: {r.stderr.strip()[:200]}", file=sys.stderr)
        return False
    return True

def call_claude_cli(prompt_text, retries=2):
    """Invoke `claude -p --model <MODEL>` reading the combined prompt from stdin."""
    last_err = None
    for attempt in range(retries + 1):
        try:
            r = subprocess.run(
                ["claude", "-p", "--model", MODEL],
                input=prompt_text, capture_output=True, text=True, timeout=240
            )
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout
            last_err = f"claude exit={r.returncode} stderr={r.stderr.strip()[:300]}"
        except subprocess.TimeoutExpired:
            last_err = "claude CLI timeout (240s)"
        except Exception as e:
            last_err = str(e)
        if attempt < retries:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"claude CLI failed: {last_err}")

def extract_json_array(text):
    """Find the first JSON array in the text. Claude sometimes wraps in markdown."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    m = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if not m:
        raise ValueError(f"No JSON array found in response: {text[:300]}")
    return json.loads(m.group(0))

counters = {"q": 0, "dq": 0, "err": 0, "batches_done": 0}
lock = threading.Lock()

def process_batch(batch_idx, batch):
    user_msg = (
        "ICP RULES (from strategy.md):\n"
        f"{strategy_text}\n\n"
        "LEADS (score each):\n"
        f"{json.dumps(batch, indent=2)}\n\n"
        "Output a JSON array of length "
        f"{len(batch)} matching the input order. JSON only, no prose, no markdown fences."
    )
    combined = SYSTEM_PROMPT + "\n\n" + user_msg

    if dry_run:
        results = [{"id": l["id"], "status": "qualified", "reason": "dry-run stub", "score": 75} for l in batch]
    else:
        try:
            text = call_claude_cli(combined)
            results = extract_json_array(text)
        except Exception as e:
            with lock:
                counters["err"] += len(batch)
                counters["batches_done"] += 1
            print(f"  batch {batch_idx+1} ERROR: {e}", file=sys.stderr)
            return

    by_id = {r["id"]: r for r in results if "id" in r}
    local_q = local_dq = local_err = 0

    for lead in batch:
        result = by_id.get(lead["id"])
        if not result:
            local_err += 1
            continue
        status = result.get("status", "")
        reason = (result.get("reason", "") or "")[:500]
        score = result.get("score", None)
        if status not in ("qualified", "disqualified"):
            local_err += 1
            continue
        dnc = 1 if status == "disqualified" else 0
        score_sql = "NULL" if score is None else int(score)
        update_sql = (
            f"UPDATE leads SET "
            f"qualification_status = {sql_escape(status)}, "
            f"qualification_reason = {sql_escape(reason)}, "
            f"qualification_score = {score_sql}, "
            f"do_not_contact = {dnc} "
            f"WHERE id = {int(lead['id'])}"
        )
        if not db_exec(update_sql):
            local_err += 1
            continue
        event_data = json.dumps({"phase":"list_optimize_qualify","status":status,"reason":reason,"score":score})
        db_exec(f"INSERT INTO lead_events (lead_id, event_type, event_data, source) VALUES ({int(lead['id'])}, 'status_changed', {sql_escape(event_data)}, 'manual')")
        if status == "qualified": local_q += 1
        else: local_dq += 1

    with lock:
        counters["q"] += local_q
        counters["dq"] += local_dq
        counters["err"] += local_err
        counters["batches_done"] += 1
        bd = counters["batches_done"]
    total_batches = (len(leads) + batch_size - 1) // batch_size
    if bd % 5 == 0 or bd == total_batches:
        print(f"  [batch {bd}/{total_batches}] qualified={counters['q']} disqualified={counters['dq']} errors={counters['err']}")

batches = [(i // batch_size, leads[i:i+batch_size]) for i in range(0, len(leads), batch_size)]
print(f"Dispatching {len(batches)} batches across {PARALLEL} parallel workers (model={MODEL})")
t0 = time.time()

with ThreadPoolExecutor(max_workers=PARALLEL) as ex:
    futures = [ex.submit(process_batch, idx, b) for idx, b in batches]
    for _ in as_completed(futures):
        pass

print()
print(f"Done in {time.time()-t0:.0f}s. qualified={counters['q']}  disqualified={counters['dq']}  errors={counters['err']}")
PYEOF
