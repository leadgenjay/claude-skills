#!/usr/bin/env bash
# Phase 3: Per-lead Perplexity research with cost preflight.
#
# Usage:
#   bash scripts/list-optimize/perplexity-research.sh <campaign-name>
#   bash scripts/list-optimize/perplexity-research.sh <campaign-name> --estimate-only
#   bash scripts/list-optimize/perplexity-research.sh <campaign-name> --limit 25
#   bash scripts/list-optimize/perplexity-research.sh <campaign-name> --yes  # skip confirm prompt
#
# Targets leads where:
#   qualification_status = 'qualified'
#   AND personalization_status IS NULL
#   AND (pipeline_status = 'verified' OR --include-unverified)
#
# Cost: $0.005/request (Perplexity sonar). Asks for confirmation unless --yes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_DIR/scripts/db-query.sh"

CAMPAIGN=""
LIMIT=""
ESTIMATE_ONLY=0
ASSUME_YES=0
INCLUDE_UNVERIFIED=0
COST_PER_REQ_CENTS=1   # $0.005 -> rounded UP to 1 cent for tracking; we count fractional below

while [[ $# -gt 0 ]]; do
  case "$1" in
    --estimate-only) ESTIMATE_ONLY=1; shift ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    --include-unverified) INCLUDE_UNVERIFIED=1; shift ;;
    -h|--help) sed -n '2,15p' "$0" | sed 's|^# ||; s|^#||'; exit 0 ;;
    *)
      if [[ -z "$CAMPAIGN" ]]; then CAMPAIGN="$1"; else
        echo "ERROR: Unknown arg: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -z "$CAMPAIGN" ]] && { echo "Usage: $0 <campaign-name> [--estimate-only] [--limit N] [--yes] [--include-unverified]" >&2; exit 1; }

if ! db_enabled; then echo "ERROR: Turso DB not configured." >&2; exit 1; fi

# Zeus search (search.nextwave.io) — no API key required, free, ~30s/req
ZEUS_SEARCH_URL="${ZEUS_SEARCH_URL:-https://search.nextwave.io/api/search}"

# Build WHERE
WHERE="WHERE qualification_status = 'qualified' AND personalization_status IS NULL"
[[ "$INCLUDE_UNVERIFIED" -eq 0 ]] && WHERE="$WHERE AND pipeline_status = 'verified'"
LIMIT_CLAUSE=""
[[ -n "$LIMIT" ]] && LIMIT_CLAUSE="LIMIT $LIMIT"

# Count
total=$(db_scalar "SELECT COUNT(*) FROM leads $WHERE")
total="${total:-0}"; total="${total// /}"
display="$total"
[[ -n "$LIMIT" && "$LIMIT" -lt "$total" ]] && display="$LIMIT"

# Cost calc — Zeus search is free; cost block kept for compat (always $0)
cost_dollars="0.00"
runtime_min=$(python3 -c "print(f'{$display * 30 / 60:.0f}')")
echo "Phase 3: Zeus search research"
echo "  Target leads: $display"
echo "  Estimated cost: \$$cost_dollars (Zeus search @ free, no API key)"
echo "  Estimated runtime: ~${runtime_min} min serial (~30s/req); P=20 parallel cuts to ~$((runtime_min / 20)) min"
echo "  Filter: $WHERE${LIMIT_CLAUSE:+ $LIMIT_CLAUSE}"
echo

if [[ "$ESTIMATE_ONLY" -eq 1 ]]; then
  echo "(estimate-only — no API calls made)"
  exit 0
fi

if [[ "$display" -eq 0 ]]; then
  echo "Nothing to research. Exiting."
  exit 0
fi

if [[ "$ASSUME_YES" -eq 0 ]]; then
  read -r -p "Continue? [y/N]: " ans
  case "$ans" in
    y|Y|yes|YES) : ;;
    *) echo "Aborted."; exit 0 ;;
  esac
fi

# Pull lead rows
SELECT_COLS="id, first_name, last_name, job_title, company_name, company_name_normalized, company_domain, industry, city, state, country, linkedin_url"
LEADS_JSON_FILE="$(mktemp /tmp/zeus-leads-XXXXXX.json)"
trap 'rm -f "$LEADS_JSON_FILE"' EXIT
db_query "SELECT $SELECT_COLS FROM leads $WHERE $LIMIT_CLAUSE" | python3 -c "
import sys, json
rows = sys.stdin.read().strip().split('\n')
if len(rows) < 2: print('[]'); sys.exit(0)
header = rows[0].split('\t')
out = []
for r in rows[1:]:
    cells = r.split('\t')
    if len(cells) != len(header): continue
    out.append({header[i]: (cells[i] if cells[i] != '' else None) for i in range(len(header))})
print(json.dumps(out))
" > "$LEADS_JSON_FILE"

export LEADS_JSON_FILE PROJECT_DIR ZEUS_SEARCH_URL TURSO_DB_URL TURSO_DB_TOKEN ZEUS_RESEARCH_PARALLEL

python3 - <<'PYEOF'
import json, os, sys, urllib.request, urllib.error, time, re, subprocess

with open(os.environ["LEADS_JSON_FILE"]) as _f:
    leads = json.load(_f)
project_dir = os.environ["PROJECT_DIR"]

ENDPOINT = os.environ.get("ZEUS_SEARCH_URL", "https://search.nextwave.io/api/search")
ZEUS_CHAT_PROVIDER = "a512070c-aecb-4540-af21-fa64c0c03d94"
ZEUS_CHAT_MODEL = "qwen3-14b"
ZEUS_EMBED_PROVIDER = "a07fbfdd-1a9b-40f6-b729-92150936de0a"
ZEUS_EMBED_MODEL = "mixedbread-ai/mxbai-embed-large-v1"

def sql_escape(v):
    if v is None or v == "": return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

# Direct Turso HTTP — parallel-safe (no subprocess fork-bomb under ThreadPoolExecutor)
DB_URL = os.environ.get("TURSO_DB_URL", "")
DB_TOKEN = os.environ.get("TURSO_DB_TOKEN", "")
if DB_URL.startswith("libsql://"):
    DB_URL = "https://" + DB_URL[len("libsql://"):]
DB_URL = DB_URL.rstrip("/")
if DB_URL and not DB_URL.endswith("/v2/pipeline"):
    DB_URL = DB_URL + "/v2/pipeline"

def db_exec(sql):
    if not DB_URL or not DB_TOKEN:
        return False
    body = json.dumps({"requests": [
        {"type": "execute", "stmt": {"sql": sql}},
        {"type": "close"},
    ]}).encode("utf-8")
    req = urllib.request.Request(DB_URL, data=body, headers={
        "Authorization": f"Bearer {DB_TOKEN}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            d = json.loads(resp.read())
            for r in d.get("results", []):
                if r.get("type") == "error":
                    return False
            return True
    except Exception:
        return False

def call_zeus_search(query, system_instructions, retries=2):
    body = json.dumps({
        "chatModel": {"providerId": ZEUS_CHAT_PROVIDER, "key": ZEUS_CHAT_MODEL},
        "embeddingModel": {"providerId": ZEUS_EMBED_PROVIDER, "key": ZEUS_EMBED_MODEL},
        "optimizationMode": "balanced",
        "sources": ["web"],
        "query": query,
        "systemInstructions": system_instructions,
        "stream": False
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "curl/8.0",
            "Accept": "*/*"
        }
    )
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode()[:300]}"
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            break
        except Exception as e:
            last_err = str(e)
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            break
    raise RuntimeError(f"Zeus search API failed: {last_err}")

def extract_json_obj(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m: raise ValueError(f"No JSON object: {text[:200]}")
    return json.loads(m.group(0))

from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

PARALLEL = int(os.environ.get("ZEUS_RESEARCH_PARALLEL", "20"))
print_lock = threading.Lock()
counters = {"researched": 0, "skipped": 0, "errors": 0, "error": 0, "done": 0}

def process_lead(lead):
    name_part = " ".join(filter(None, [lead.get("first_name"), lead.get("last_name")])) or "the contact"
    title = lead.get("job_title") or "their role"
    company = lead.get("company_name_normalized") or lead.get("company_name") or "their company"

    query = (
        f"Recent newsworthy items from the last 90 days about {name_part} "
        f"({title} at {company}): personal news, podcast appearances, posts, "
        "interviews, hires, funding, product launches, or notable company moments."
    )
    system_instructions = (
        "/no_think\n\n"
        "You are a cold email researcher. Find ONE specific recent newsworthy thing "
        "to mention in a cold email opener. Output STRICT JSON only, no markdown, no preamble: "
        '{"topic": "<short label or null>", "source_url": "<url or null>", '
        '"one_sentence_summary": "<1 sentence or null>"}. '
        "If nothing notable found, return {\"topic\": null}. "
        "Do NOT include thinking tags. Do NOT explain. Output ONLY the JSON object."
    )

    try:
        resp = call_zeus_search(query, system_instructions)
    except Exception as e:
        return ("error", lead["id"], str(e)[:120])

    try:
        text = resp.get("message", "") or ""
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    except Exception:
        return ("error", lead["id"], "malformed Zeus response")

    try:
        parsed = extract_json_obj(text)
    except ValueError:
        parsed = {"topic": None, "_raw": text[:1000]}

    # Hallucination guard: qwen3-14b confabulates plausible "news" when web search returns nothing.
    # If sources_count == 0, force topic=null regardless of what the model said.
    sources_count = len(resp.get("sources", []) or [])
    if sources_count == 0:
        parsed["topic"] = None
        parsed["_hallucination_guard"] = "no sources returned by Zeus search"

    has_topic = bool(parsed.get("topic"))
    new_status = "researched" if has_topic else "skipped"

    research_blob = json.dumps({
        "zeus_response": {"message": text, "sources_count": len(resp.get("sources", []) or [])},
        "parsed": parsed
    })

    update_sql = (
        f"UPDATE leads SET "
        f"personalization_research = {sql_escape(research_blob)}, "
        f"personalization_status = {sql_escape(new_status)}, "
        f"personalization_cost_cents = COALESCE(personalization_cost_cents, 0) + 0 "
        f"WHERE id = {int(lead['id'])}"
    )
    if not db_exec(update_sql):
        return ("error", lead["id"], "db_update_failed")

    event_data = json.dumps({
        "phase": "list_optimize_research",
        "status": new_status,
        "has_topic": has_topic,
        "topic": parsed.get("topic") if has_topic else None
    })
    db_exec(
        "INSERT INTO lead_events (lead_id, event_type, event_data, source) VALUES ("
        f"{int(lead['id'])}, 'status_changed', {sql_escape(event_data)}, 'manual')"
    )

    return ("researched" if has_topic else "skipped", lead["id"], parsed.get("topic"))

print(f"Starting parallel research with {PARALLEL} workers across {len(leads)} leads...")
import time as _t
t0 = _t.time()

with ThreadPoolExecutor(max_workers=PARALLEL) as ex:
    futures = {ex.submit(process_lead, L): L for L in leads}
    for fut in as_completed(futures):
        try:
            result = fut.result()
        except Exception as e:
            result = ("error", -1, str(e)[:120])
        kind, lead_id, _ = result
        with print_lock:
            counters[kind] += 1
            counters["done"] += 1
            if counters["done"] % 25 == 0:
                elapsed = _t.time() - t0
                rate = counters["done"] / elapsed * 60 if elapsed > 0 else 0
                eta_min = (len(leads) - counters["done"]) / rate if rate > 0 else 0
                print(f"  [{counters['done']}/{len(leads)}] researched={counters['researched']} skipped={counters['skipped']} errors={counters['errors']}  rate={rate:.0f}/min  eta={eta_min:.0f} min")

print()
print(f"Done in {_t.time()-t0:.0f}s. researched={counters['researched']}  skipped={counters['skipped']}  errors={counters['errors']}")
print(f"Total cost: $0.00 (Zeus search is free)")
PYEOF
