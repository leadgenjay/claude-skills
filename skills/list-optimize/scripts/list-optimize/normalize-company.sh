#!/usr/bin/env bash
# Phase 2: Normalize company names. Pure deterministic rules — no API calls.
#
# Usage:
#   bash scripts/list-optimize/normalize-company.sh
#   bash scripts/list-optimize/normalize-company.sh --campaign golden-bestseller
#   bash scripts/list-optimize/normalize-company.sh --limit 50 --dry-run
#
# Strips legal-form suffixes (Inc, LLC, Corp, ...), leading "The ", title-cases with
# acronym preservation, and saves to company_name_original / company_name_normalized.
# After the pass, emits scripts/campaigns/{campaign}/company-dupes.csv listing groups
# with >= 2 leads sharing the same normalized name (review-only — no auto-merge).

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
    --campaign) CAMPAIGN="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '2,15p' "$0" | sed 's|^# ||; s|^#||'
      exit 0
      ;;
    *) echo "ERROR: Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if ! db_enabled; then
  echo "ERROR: Turso DB not configured." >&2
  exit 1
fi

WHERE="WHERE company_name IS NOT NULL AND company_name != '' AND company_name_normalized IS NULL"
LIMIT_CLAUSE=""
[[ -n "$LIMIT" ]] && LIMIT_CLAUSE="LIMIT $LIMIT"

total=$(db_scalar "SELECT COUNT(*) FROM leads $WHERE")
total="${total:-0}"; total="${total// /}"
if [[ "$total" -eq 0 ]]; then
  echo "No company names to normalize."
  # Still run dupe report if requested
else
  echo "Normalizing $total company names (dry-run=$DRY_RUN)..."
fi

# Pull rows
ROWS_JSON=$(db_query "SELECT id, company_name FROM leads $WHERE $LIMIT_CLAUSE" | python3 -c "
import sys, json
rows = sys.stdin.read().strip().split('\n')
if len(rows) < 2: print('[]'); sys.exit(0)
header = rows[0].split('\t')
out = []
for r in rows[1:]:
    cells = r.split('\t')
    if len(cells) != len(header): continue
    out.append({header[i]: cells[i] for i in range(len(header))})
print(json.dumps(out))
")

export ROWS_JSON DRY_RUN PROJECT_DIR

python3 - <<'PYEOF'
import json, os, re, subprocess, sys

rows = json.loads(os.environ["ROWS_JSON"])
dry_run = os.environ["DRY_RUN"] == "1"
project_dir = os.environ["PROJECT_DIR"]

# Suffixes — longest first so we match "Incorporated" before "Inc"
SUFFIXES = [
    "Incorporated", "Corporation", "Limited", "Pty Ltd",
    "L.L.C.", "K.K.", "S.r.l.", "S.A.", "GmbH",
    "PLLC", "LLP", "LLC", "PA", "PC", "LP",
    "Inc.", "Inc", "Corp.", "Corp", "Ltd.", "Ltd",
    "Co.", "Co", "Company"
]
KNOWN_ACRONYMS = {
    "IBM", "NASA", "IKEA", "AT&T", "H&R", "B&H", "CNN", "BBC",
    "NBC", "CBS", "ESPN", "MIT", "UCLA", "USC", "NYU", "BMW",
    "AMD", "GM", "GE", "HP", "PWC", "EY", "KPMG", "JPMC", "JPM"
}

def normalize(raw: str) -> str:
    if not raw: return ""
    s = raw.strip()
    # Strip surrounding punctuation
    s = re.sub(r"^[,.;()\s]+|[,.;()\s]+$", "", s)
    # Strip leading "The "
    s = re.sub(r"^[Tt]he\s+", "", s)
    # Iteratively strip suffixes (handles "Co. Ltd" -> "Co." -> "")
    changed = True
    while changed:
        changed = False
        for suf in SUFFIXES:
            # ", Inc." or " Inc." or " Inc"
            pattern = r"[,\s]+" + re.escape(suf) + r"\s*$"
            new_s = re.sub(pattern, "", s, flags=re.IGNORECASE)
            if new_s != s:
                s = new_s.rstrip(" ,.")
                changed = True
                break
    # Collapse internal whitespace
    s = re.sub(r"\s+", " ", s).strip()
    # If input is already mixed-case (CamelCase brands like PeopleTech, eBay, McDonalds,
    # AT&T after suffix strip, etc.), preserve as-is. Only normalize all-lower or all-upper.
    has_upper = any(c.isupper() for c in s)
    has_lower = any(c.islower() for c in s)
    if has_upper and has_lower:
        # Already mixed-case — preserve. Just clean up known acronyms in case.
        tokens = s.split(" ")
        out = []
        for t in tokens:
            if t.upper() in KNOWN_ACRONYMS:
                out.append(t.upper())
            else:
                out.append(t)
        return " ".join(out).strip()
    # All-caps or all-lower → title-case with acronym + particle handling
    PARTICLES = {"a","an","and","as","at","but","by","for","from","in","into","of",
                 "on","or","the","to","with","via","per","vs"}
    tokens = s.split(" ")
    out_tokens = []
    for idx, t in enumerate(tokens):
        if not t:
            continue
        upper = t.upper()
        # Known acronyms always upper
        if upper in KNOWN_ACRONYMS:
            out_tokens.append(upper)
            continue
        # All-caps short tokens (length 1-4) preserved only if INPUT was all caps
        if t.isupper() and 1 <= len(t) <= 4 and any(c.isalpha() for c in t) and not has_lower:
            out_tokens.append(t)
            continue
        # Lowercase particles mid-string (never first/last token)
        if idx not in (0, len(tokens)-1) and t.lower() in PARTICLES:
            out_tokens.append(t.lower())
            continue
        # Default: title-case each hyphen-separated part (Well-Known not Well-known)
        parts = t.split("-")
        cased = []
        for p in parts:
            if not p: cased.append(p); continue
            if p.upper() in KNOWN_ACRONYMS: cased.append(p.upper()); continue
            cased.append(p[0].upper() + p[1:].lower() if p[0].isalpha() else p)
        out_tokens.append("-".join(cased))
    return " ".join(out_tokens).strip()

def dedup_key(s: str) -> str:
    """Lowercased, with & → and, for duplicate detection only."""
    if not s: return ""
    return re.sub(r"\s+", " ", s.lower().replace("&", "and")).strip()

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
    return r.returncode == 0

# ─── Apply normalization ──
updated = 0
unchanged = 0
for row in rows:
    raw = row["company_name"] or ""
    canonical = normalize(raw)
    if not canonical:
        # Strange edge case (e.g., the whole name was a suffix) — leave the raw value
        canonical = raw.strip()
    raw_esc = sql_escape(raw)
    canon_esc = sql_escape(canonical)
    sql = (
        f"UPDATE leads SET "
        f"company_name_original = COALESCE(company_name_original, {raw_esc}), "
        f"company_name_normalized = {canon_esc} "
        f"WHERE id = {int(row['id'])}"
    )
    if dry_run:
        if raw != canonical:
            print(f"  {row['id']}: '{raw}' -> '{canonical}'")
        else:
            print(f"  {row['id']}: '{raw}' (unchanged)")
    if db_exec(sql):
        updated += 1
        if raw == canonical: unchanged += 1
    else:
        print(f"  ERROR updating lead {row['id']}", file=sys.stderr)

print()
print(f"Normalized {updated} leads ({unchanged} unchanged, {updated - unchanged} changed).")
PYEOF

# ─── Duplicate report ──
echo
echo "Generating duplicate report..."

# Determine output path
if [[ -n "$CAMPAIGN" ]]; then
  REPORT_DIR="$PROJECT_DIR/scripts/campaigns/$CAMPAIGN"
  mkdir -p "$REPORT_DIR"
  REPORT="$REPORT_DIR/company-dupes.csv"
else
  REPORT="$PROJECT_DIR/scripts/list-optimize/company-dupes.csv"
fi

DUPES_TSV=$(db_query "
SELECT
  company_name_normalized,
  COUNT(*) AS lead_count,
  GROUP_CONCAT(id) AS lead_ids,
  GROUP_CONCAT(email) AS sample_emails
FROM leads
WHERE company_name_normalized IS NOT NULL
GROUP BY LOWER(REPLACE(company_name_normalized, '&', 'and'))
HAVING COUNT(*) >= 2
ORDER BY COUNT(*) DESC
LIMIT 100
")

echo "$DUPES_TSV" | python3 -c "
import sys, csv
out = csv.writer(sys.stdout)
rows = sys.stdin.read().strip().split('\n')
if len(rows) < 2:
    sys.stderr.write('  No duplicate company groups found.\n'); sys.exit(0)
header = rows[0].split('\t')
out.writerow(header)
for r in rows[1:]:
    out.writerow(r.split('\t'))
" > "$REPORT" 2>&1 || true

if [[ -s "$REPORT" ]]; then
  total_groups=$(($(wc -l < "$REPORT") - 1))
  echo "  $total_groups duplicate groups written to $REPORT"
else
  echo "  No duplicate groups found."
  rm -f "$REPORT"
fi
