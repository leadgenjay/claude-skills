#!/usr/bin/env bash
# Phase 4: Generate 1-sentence personalization openers from Perplexity research.
#
# Usage:
#   bash scripts/list-optimize/personalize.sh <campaign-name>
#   bash scripts/list-optimize/personalize.sh <campaign-name> --limit 25
#   bash scripts/list-optimize/personalize.sh <campaign-name> --dry-run
#
# Targets leads where personalization_status = 'researched'. Generates a single
# opener per lead via Claude with strict validation (≤25 words, no banned tokens,
# no merge tags, must reference research topic OR first name).
#
# Writes personalization_line + sets personalization_status to 'written' or 'failed'.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_DIR/scripts/db-query.sh"

CAMPAIGN=""
LIMIT=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,15p' "$0" | sed 's|^# ||; s|^#||'; exit 0 ;;
    *)
      if [[ -z "$CAMPAIGN" ]]; then CAMPAIGN="$1"; else
        echo "ERROR: Unknown arg: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -z "$CAMPAIGN" ]] && { echo "Usage: $0 <campaign-name> [--limit N] [--dry-run]" >&2; exit 1; }

STRATEGY_FILE="$PROJECT_DIR/scripts/campaigns/${CAMPAIGN}/strategy.md"
[[ -f "$STRATEGY_FILE" ]] || { echo "ERROR: Strategy not found: $STRATEGY_FILE" >&2; exit 1; }

if ! db_enabled; then echo "ERROR: Turso DB not configured." >&2; exit 1; fi
# LLM access: uses `claude -p --model claude-sonnet-4-6` (Claude Code subscription) — no API key required.
if [[ "$DRY_RUN" -eq 0 ]] && ! command -v claude >/dev/null 2>&1; then
  echo "ERROR: \`claude\` CLI not on PATH. Install Claude Code to enable personalization." >&2
  exit 1
fi

WHERE="WHERE personalization_status = 'researched'"
LIMIT_CLAUSE=""
[[ -n "$LIMIT" ]] && LIMIT_CLAUSE="LIMIT $LIMIT"

total=$(db_scalar "SELECT COUNT(*) FROM leads $WHERE")
total="${total:-0}"; total="${total// /}"
display="$total"
[[ -n "$LIMIT" && "$LIMIT" -lt "$total" ]] && display="$LIMIT"

if [[ "$display" -eq 0 ]]; then
  echo "No leads with personalization_status='researched'. Run perplexity-research.sh first."
  exit 0
fi

echo "Generating personalization openers for $display leads (dry-run=$DRY_RUN)..."

SELECT_COLS="id, first_name, last_name, job_title, company_name_normalized, company_name, city, state, personalization_research"
LEADS_JSON_FILE="$(mktemp /tmp/personalize-leads-XXXXXX.json)"
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

STRATEGY_TEXT=$(cat "$STRATEGY_FILE")

export LEADS_JSON_FILE STRATEGY_TEXT DRY_RUN PROJECT_DIR

python3 - <<'PYEOF'
import json, os, sys, time, re, subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

with open(os.environ["LEADS_JSON_FILE"]) as _f:
    leads = json.load(_f)
strategy_text = os.environ["STRATEGY_TEXT"]
dry_run = os.environ["DRY_RUN"] == "1"
project_dir = os.environ["PROJECT_DIR"]

MODEL = "claude-sonnet-4-6"
PARALLEL = int(os.environ.get("PERSONALIZE_PARALLEL", "15"))

# Pull messaging angle from strategy text (best-effort)
def find_angle(text):
    m = re.search(r"(?im)^#+\s*Messaging Angle.*?$(.*?)(?=^#|\Z)", text, re.DOTALL | re.MULTILINE)
    if m: return m.group(1).strip()[:1000]
    m = re.search(r"(Pain Dagger|Proof Machine|Value Gift)", text, re.IGNORECASE)
    return m.group(0) if m else "Pain Dagger"

ANGLE = find_angle(strategy_text)

SYSTEM_PROMPT = f"""You are a cold-email opener writer for a cold email campaign with messaging angle: {ANGLE}.

Write ONE sentence (maximum 25 words) that opens the FIRST email of the sequence. The sentence must:
- Reference a specific recent thing about the lead from the research provided
- Sound like a sharp friend texting, not a marketing pitch
- Be casual and direct
- Mention either the lead's first name OR the specific topic — not both
- Lead naturally into a sales email (it's the FIRST sentence; the rest of the email continues the pitch)

Hard constraints:
- Maximum 25 words
- No exclamation marks
- No em dashes (—), en dashes (–), or double hyphens (--)
- No banned phrases: "Dear", "Hope this finds you well", "I hope you're doing well", "I came across your profile", "I noticed that"
- No merge tags inside the sentence ({{first_name}}, {{company_name}}, etc.)
- No questions in the opener
- No links

Output STRICT JSON only:
{{"line": "<the sentence>", "uses_topic": true|false, "uses_first_name": true|false}}"""

BANNED = ["dear", "hope this finds you well", "i hope you're doing well", "i came across your profile", "i noticed that"]

def sql_escape(v):
    if v is None or v == "": return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def db_exec(sql):
    if dry_run: return True
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
                input=prompt_text, capture_output=True, text=True, timeout=180
            )
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout
            last_err = f"claude exit={r.returncode} stderr={r.stderr.strip()[:300]}"
        except subprocess.TimeoutExpired:
            last_err = "claude CLI timeout (180s)"
        except Exception as e:
            last_err = str(e)
        if attempt < retries:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"claude CLI failed: {last_err}")

def extract_json_obj(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m: raise ValueError(f"No JSON: {text[:200]}")
    return json.loads(m.group(0))

def validate(line, uses_topic, uses_first_name):
    """Return (ok, reason)."""
    if not line or not line.strip(): return False, "empty"
    if len(line.split()) > 25: return False, f"word count {len(line.split())} > 25"
    low = line.lower()
    for b in BANNED:
        if b in low: return False, f"banned phrase: {b}"
    if "—" in line or "–" in line or "--" in line: return False, "dash"
    if "{" in line or "}" in line: return False, "merge tag"
    if "?" in line: return False, "question"
    if "!" in line: return False, "exclamation"
    if "http://" in low or "https://" in low: return False, "url"
    if uses_topic and uses_first_name: return False, "both topic and first name (overpersonalized)"
    if not uses_topic and not uses_first_name: return False, "neither topic nor first name (under-personalized)"
    return True, ""

counters = {"written": 0, "failed": 0, "errors": 0, "done": 0}
lock = threading.Lock()

def process_lead(lead):
    research_blob = lead.get("personalization_research") or "{}"
    try:
        research = json.loads(research_blob)
        parsed = research.get("parsed", {})
    except Exception:
        parsed = {}

    topic = parsed.get("topic")
    summary = parsed.get("one_sentence_summary")
    company = lead.get("company_name_normalized") or lead.get("company_name") or "their company"

    user_msg = (
        f"LEAD:\n"
        f"- first_name: {lead.get('first_name')}\n"
        f"- last_name: {lead.get('last_name')}\n"
        f"- job_title: {lead.get('job_title')}\n"
        f"- company: {company}\n"
        f"- city: {lead.get('city')}, {lead.get('state')}\n\n"
        f"RESEARCH:\n"
        f"- topic: {topic}\n"
        f"- one_sentence_summary: {summary}\n\n"
        "Write the opener. JSON only."
    )

    if dry_run:
        return ("written", lead["id"], "(dry-run stub)", "")

    line = None
    last_reason = ""
    for attempt in (1, 2):
        try:
            retry_hint = "" if attempt == 1 else f"\n\nPrevious attempt failed validation: {last_reason}. Try again, JSON only."
            combined = SYSTEM_PROMPT + "\n\n" + user_msg + retry_hint
            text = call_claude_cli(combined)
            obj = extract_json_obj(text)
        except Exception as e:
            last_reason = str(e)
            return ("error", lead["id"], None, last_reason[:200])
        ok, reason = validate(obj.get("line",""), obj.get("uses_topic"), obj.get("uses_first_name"))
        if ok:
            line = obj["line"].strip()
            break
        last_reason = reason

    if line is None:
        event_data = json.dumps({"phase":"list_optimize_personalize","status":"failed","reason":last_reason})
        db_exec(f"UPDATE leads SET personalization_status = 'failed' WHERE id = {int(lead['id'])}")
        db_exec("INSERT INTO lead_events (lead_id, event_type, event_data, source) VALUES ("
                f"{int(lead['id'])}, 'status_changed', {sql_escape(event_data)}, 'manual')")
        return ("failed", lead["id"], None, last_reason)

    db_exec(f"UPDATE leads SET personalization_line = {sql_escape(line)}, personalization_status = 'written' WHERE id = {int(lead['id'])}")
    event_data = json.dumps({"phase":"list_optimize_personalize","status":"written","preview":line[:80]})
    db_exec("INSERT INTO lead_events (lead_id, event_type, event_data, source) VALUES ("
            f"{int(lead['id'])}, 'status_changed', {sql_escape(event_data)}, 'manual')")
    return ("written", lead["id"], line, "")

print(f"Dispatching {len(leads)} leads across {PARALLEL} parallel workers (model={MODEL})")
t0 = time.time()

with ThreadPoolExecutor(max_workers=PARALLEL) as ex:
    futures = {ex.submit(process_lead, L): L for L in leads}
    for fut in as_completed(futures):
        try:
            kind, lead_id, line, reason = fut.result()
        except Exception as e:
            kind, lead_id, line, reason = ("errors", -1, None, str(e)[:200])
        with lock:
            counters[kind if kind != "error" else "errors"] += 1
            counters["done"] += 1
            d = counters["done"]
        if d % 25 == 0:
            elapsed = time.time() - t0
            rate = d / elapsed * 60 if elapsed else 0
            eta = (len(leads) - d) / rate if rate else 0
            print(f"  [{d}/{len(leads)}] written={counters['written']} failed={counters['failed']} errors={counters['errors']}  rate={rate:.0f}/min  eta={eta:.0f}min")

print()
print(f"Done in {time.time()-t0:.0f}s. written={counters['written']}  failed={counters['failed']}  errors={counters['errors']}")
PYEOF
