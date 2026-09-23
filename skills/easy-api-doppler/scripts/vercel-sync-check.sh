#!/usr/bin/env bash
#
# vercel-sync-check.sh - run this BEFORE you turn on a Doppler-to-Vercel sync.
#
# It answers one question: which of your production variables would a pull
# hand back empty? Those are the dangerous ones. Vercel marks some variables
# sensitive, which makes them write-only, and `vercel env pull` returns them
# as an empty string with no error and no warning. If you build your Doppler
# config from that pull and then sync it back, you overwrite the live secret
# with nothing.
#
# Read-only. It never prints a value, and it deletes the pulled file on exit.
#
# Usage:
#   cd <your linked project>
#   ./vercel-sync-check.sh [environment]      # environment defaults to production
#
# Written for bash 3.2, the version macOS ships.

set -u
export LC_ALL=C

ENVIRONMENT="${1:-production}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "The vercel CLI is not on your PATH." >&2
  echo "Install it first:  npm i -g vercel" >&2
  exit 2
fi

if [ ! -f .vercel/project.json ]; then
  echo "This directory is not linked to a Vercel project." >&2
  echo "Run 'vercel link' here first, or cd to the project you mean." >&2
  exit 2
fi

TMP=$(mktemp -t vercel-envcheck)
chmod 600 "$TMP"
trap 'rm -f "$TMP"' EXIT INT TERM

echo "Pulling $ENVIRONMENT variables (values stay in a private temp file)..."
ERRLOG=$(mktemp -t vercel-envcheck-err)
trap 'rm -f "$TMP" "$ERRLOG"' EXIT INT TERM
if ! vercel env pull "$TMP" --environment="$ENVIRONMENT" --yes >"$ERRLOG" 2>&1; then
  echo "The pull failed. Vercel said:" >&2
  sed 's/^/  /' "$ERRLOG" >&2
  echo >&2
  echo "Most often that is one of: not logged in (vercel whoami), no access to" >&2
  echo "this project, or a bad environment name. Valid names are production," >&2
  echo "preview, development, or a custom environment you created." >&2
  exit 1
fi

TOTAL=0
BLANK=""
BLANKN=0
RESERVED=""

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|'#'*) continue ;;
    *=*) : ;;
    *) continue ;;
  esac
  name="${line%%=*}"
  value="${line#*=}"
  bare=$(printf '%s' "$value" | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")
  TOTAL=$((TOTAL + 1))

  case "$name" in
    VERCEL|VERCEL_ENV|VERCEL_URL|VERCEL_REGION|VERCEL_TARGET_ENV|VERCEL_OIDC_TOKEN|VERCEL_BRANCH_URL|VERCEL_DEPLOYMENT_ID|VERCEL_PROJECT_PRODUCTION_URL|VERCEL_SKEW_PROTECTION_ENABLED|VERCEL_GIT_*)
      RESERVED="$RESERVED $name"
      continue ;;
  esac

  if [ -z "$bare" ]; then
    BLANK="$BLANK $name"
    BLANKN=$((BLANKN + 1))
  fi
done < "$TMP"

echo
echo "  variables pulled from $ENVIRONMENT     $TOTAL"
echo "  came back EMPTY                        $BLANKN"
echo

if [ -n "$RESERVED" ]; then
  echo "Platform-injected, strip these before any upload:"
  echo " $RESERVED"
  echo
  echo "Vercel injects them at runtime and then refuses to accept them back."
  echo "Leaving one in is what produces 'Secret name is a reserved name'."
  echo
fi

if [ "$BLANKN" = "0" ]; then
  echo "Nothing came back empty, so a sync built from this pull has nothing to"
  echo "blank out. Check the additions too, using the list in the skill."
  exit 0
fi

echo "DO NOT import these into your vault:"
echo " $BLANK"
echo
cat <<'NOTE'
Each one is either genuinely empty or marked sensitive, and a pull cannot tell
you which. Open the Vercel dashboard, look at the type shown next to each name,
and treat every sensitive one as unreadable.

The safe arrangement is to leave those where they are. Vercel keeps managing
them, Doppler never learns about them, and the sync cannot touch what it does
not know exists. Rotating one of them still means opening the dashboard, and
that is the price of having marked them sensitive in the first place.

For every name above that is genuinely empty, delete it in Vercel or give it a
value. An empty variable that no longer does anything is worth losing.
NOTE
