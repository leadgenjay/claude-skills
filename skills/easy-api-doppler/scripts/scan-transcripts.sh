#!/usr/bin/env bash
#
# scan-transcripts.sh - count API-key-shaped strings sitting in your own
# Claude Code transcripts.
#
# Read-only. It prints file names and counts, and it never prints a match.
# Printing one would put the key straight back into the session you are
# reading the report in, which is the problem this whole skill exists to stop.
#
# Usage:
#   ./scan-transcripts.sh                 # scans ~/.claude/projects
#   ./scan-transcripts.sh <directory>     # scans somewhere else
#
# Written for bash 3.2, the version macOS ships.

set -u
export LC_ALL=C

DIR="${1:-$HOME/.claude/projects}"

if [ ! -d "$DIR" ]; then
  echo "No transcript directory at: $DIR"
  echo
  echo "If you have used Claude Code on this machine, transcripts normally live"
  echo "in ~/.claude/projects. Pass the directory as an argument if yours differs."
  exit 0
fi

# Vendor prefixes with a length requirement, so ordinary prose does not match.
# Public/publishable keys are deliberately left out; they are meant to ship.
PATTERN='sk-ant-[A-Za-z0-9_-]{24,}'
PATTERN="$PATTERN"'|sk-proj-[A-Za-z0-9_-]{24,}'
PATTERN="$PATTERN"'|sk-[A-Za-z0-9]{32,}'
PATTERN="$PATTERN"'|ghp_[A-Za-z0-9]{36}'
PATTERN="$PATTERN"'|gho_[A-Za-z0-9]{36}'
PATTERN="$PATTERN"'|github_pat_[A-Za-z0-9_]{50,}'
PATTERN="$PATTERN"'|glpat-[A-Za-z0-9_-]{20,}'
PATTERN="$PATTERN"'|xai-[A-Za-z0-9]{40,}'
PATTERN="$PATTERN"'|re_[A-Za-z0-9_]{24,}'
PATTERN="$PATTERN"'|AIza[0-9A-Za-z_-]{35}'
PATTERN="$PATTERN"'|SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
PATTERN="$PATTERN"'|xox[baprs]-[A-Za-z0-9-]{12,}'
PATTERN="$PATTERN"'|shpat_[a-f0-9]{32}'
PATTERN="$PATTERN"'|apify_api_[A-Za-z0-9]{30,}'
PATTERN="$PATTERN"'|dop_v1_[a-f0-9]{40,}'
PATTERN="$PATTERN"'|whsec_[A-Za-z0-9]{30,}'
PATTERN="$PATTERN"'|sk_live_[A-Za-z0-9]{20,}'
PATTERN="$PATTERN"'|rk_live_[A-Za-z0-9]{20,}'
PATTERN="$PATTERN"'|ntn_[A-Za-z0-9]{40,}'
PATTERN="$PATTERN"'|tskey-auth-[A-Za-z0-9-]{20,}'
PATTERN="$PATTERN"'|AKIA[0-9A-Z]{16}'
# A JWT, matched by its three-segment shape rather than a header literal.
PATTERN="$PATTERN"'|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'

echo "Scanning: $DIR"
echo "On a large history this takes a minute or two. Nothing is modified."
echo

TOTAL=$(find "$DIR" -type f -name '*.jsonl' 2>/dev/null | wc -l | tr -d ' ')
if [ "$TOTAL" = "0" ]; then
  echo "No .jsonl transcripts found. Nothing to report."
  exit 0
fi

SIZE=$(du -sh "$DIR" 2>/dev/null | awk '{print $1}')

# -l stops at the first match per file, so no value is ever read into a variable.
HITFILE=$(mktemp -t doppler-scan)
trap 'rm -f "$HITFILE"' EXIT INT TERM
find "$DIR" -type f -name '*.jsonl' -print0 2>/dev/null \
  | xargs -0 grep -lE "$PATTERN" 2>/dev/null > "$HITFILE" || true

HITS=$(wc -l < "$HITFILE" | tr -d ' ')

echo "  transcripts on disk        $TOTAL"
echo "  size of the directory      ${SIZE:-unknown}"
echo "  containing a key-shaped string   $HITS"
echo

if [ "$HITS" = "0" ]; then
  echo "Nothing matched. Worth re-running after a few weeks of normal work,"
  echo "because one paste is all it takes."
  exit 0
fi

echo "Files, most recently modified first. Values are not shown."
echo
# stat -f works on macOS; the GNU form is the fallback for Linux.
while IFS= read -r f; do
  [ -n "$f" ] || continue
  when=$(stat -f '%Sm' -t '%Y-%m-%d' "$f" 2>/dev/null || stat -c '%y' "$f" 2>/dev/null | cut -d' ' -f1)
  echo "  ${when:-?}  $f"
done < "$HITFILE" | sort -r | head -40

if [ "$HITS" -gt 40 ]; then
  echo
  echo "  ... and $((HITS - 40)) more."
fi

cat <<'NOTE'

What this means

Those files are plain text on your disk and they are not going anywhere. A
match is a string shaped like a credential, which is not proof that a live one
is in there: test keys, examples and revoked keys all match too.

Two things to do with the number.

Treat any key you know you pasted as exposed and rotate it. That advice is
the correct one, which is why your assistant keeps giving it.

Then stop making new ones, which is the rest of this skill.
NOTE
