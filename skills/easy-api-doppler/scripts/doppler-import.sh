#!/usr/bin/env bash
#
# doppler-import.sh - move an existing .env file into a Doppler config.
#
# Does four things the bare CLI does not:
#   1. Passes --silent, so the values are never echoed to your terminal.
#   2. Strips the platform-injected names that Vercel and friends refuse on
#      the way back in.
#   3. Warns about entries with an empty value before they land.
#   4. Verifies afterwards by comparing NAMES, never values.
#
# Usage:
#   ./doppler-import.sh <env-file> <project> [config] [--include-empty]
#
# Example:
#   ./doppler-import.sh .env.local my-app dev
#
# Variables with an empty value are left out by default. That is deliberate:
# a blank in a pulled file is either a genuinely empty variable or one the
# platform marked sensitive and refused to hand over, and importing the second
# kind stores a blank that a later sync writes over the live secret.
# Pass --include-empty once you have checked each one by hand.
#
# Written for bash 3.2, the version macOS ships.

set -u
export LC_ALL=C

ENVFILE=""
PROJECT=""
CONFIG=""
INCLUDE_EMPTY=0

for arg in "$@"; do
  case "$arg" in
    --include-empty) INCLUDE_EMPTY=1 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *)
      if [ -z "$ENVFILE" ]; then ENVFILE="$arg"
      elif [ -z "$PROJECT" ]; then PROJECT="$arg"
      elif [ -z "$CONFIG" ]; then CONFIG="$arg"
      fi ;;
  esac
done
[ -n "$CONFIG" ] || CONFIG="dev"

if [ -z "$ENVFILE" ] || [ -z "$PROJECT" ]; then
  echo "usage: doppler-import.sh <env-file> <project> [config] [--include-empty]" >&2
  exit 2
fi

if [ ! -f "$ENVFILE" ]; then
  echo "No such file: $ENVFILE" >&2
  exit 2
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "The doppler CLI is not on your PATH." >&2
  echo "Install it first:  brew install dopplerhq/cli/doppler" >&2
  exit 2
fi

if ! doppler me >/dev/null 2>&1; then
  echo "You are not logged in to Doppler." >&2
  echo "Open a real terminal window and run:  doppler login" >&2
  exit 2
fi

# Names the deploy platform injects at runtime. They come down in a
# `vercel env pull` and are then rejected when you try to push them back,
# so they must not enter the vault in the first place.
is_reserved() {
  case "$1" in
    VERCEL|VERCEL_ENV|VERCEL_URL|VERCEL_REGION|VERCEL_TARGET_ENV) return 0 ;;
    VERCEL_OIDC_TOKEN|VERCEL_BRANCH_URL|VERCEL_DEPLOYMENT_ID) return 0 ;;
    VERCEL_PROJECT_PRODUCTION_URL|VERCEL_SKEW_PROTECTION_ENABLED) return 0 ;;
    VERCEL_GIT_*) return 0 ;;
    *) return 1 ;;
  esac
}

TMP=$(mktemp -t doppler-import)
chmod 600 "$TMP"
trap 'rm -f "$TMP"' EXIT INT TERM

KEPT=0
SKIPPED=""
EMPTY=""
BADNAME=""
NAMES=""

echo "Reading $ENVFILE"

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|'#'*) continue ;;
    export\ *) line="${line#export }" ;;
  esac
  case "$line" in
    *=*) : ;;
    *) continue ;;
  esac

  name="${line%%=*}"
  value="${line#*=}"

  # A name has to look like a shell variable, or the app cannot read it anyway.
  case "$name" in
    [A-Za-z_]*) : ;;
    *) BADNAME="$BADNAME $name"; continue ;;
  esac
  if printf '%s' "$name" | grep -qE '[^A-Za-z0-9_]'; then
    BADNAME="$BADNAME $name"
    continue
  fi

  if is_reserved "$name"; then
    SKIPPED="$SKIPPED $name"
    continue
  fi

  # Strip one layer of surrounding quotes for the emptiness test only.
  bare=$(printf '%s' "$value" | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")
  if [ -z "$bare" ]; then
    EMPTY="$EMPTY $name"
    [ "$INCLUDE_EMPTY" = "1" ] || continue
  fi

  printf '%s\n' "$line" >> "$TMP"
  NAMES="$NAMES $name"
  KEPT=$((KEPT + 1))
done < "$ENVFILE"

echo "  variables to import   $KEPT"

if [ -n "$SKIPPED" ]; then
  echo "  platform-injected, not imported:$SKIPPED"
fi

if [ -n "$BADNAME" ]; then
  echo "  not valid variable names, left out:$BADNAME"
fi

if [ -n "$EMPTY" ]; then
  echo
  if [ "$INCLUDE_EMPTY" = "1" ]; then
    echo "Importing these even though they are empty, because you asked:$EMPTY"
  else
    echo "LEFT OUT because their value is empty:$EMPTY"
    echo
    echo "An empty value in a pulled file means one of two very different things,"
    echo "and they look identical: the variable is genuinely empty, or the platform"
    echo "marked it sensitive and refused to hand the value over. Storing the second"
    echo "kind puts a blank in your vault, and a later sync writes that blank over"
    echo "the live secret."
    echo
    echo "Open the platform dashboard and look at the type beside each name."
    echo "Genuinely empty, and you want it anyway: re-run with --include-empty."
    echo "Sensitive: leave it where it is. The platform keeps managing it."
  fi
fi

if [ "$KEPT" = "0" ]; then
  echo "Nothing to import."
  exit 1
fi

if ! doppler projects get "$PROJECT" >/dev/null 2>&1; then
  echo
  echo "Project '$PROJECT' does not exist yet. Create it with:"
  echo "  doppler projects create $PROJECT"
  exit 1
fi

echo
echo "Uploading to $PROJECT / $CONFIG ..."
if ! doppler secrets upload "$TMP" --project "$PROJECT" --config "$CONFIG" --silent; then
  echo "Upload failed. Nothing else was changed." >&2
  exit 1
fi

# Verify by name. Doppler adds three of its own, so compare the set, not a total.
REMOTE=$(doppler secrets --only-names --json --project "$PROJECT" --config "$CONFIG" 2>/dev/null \
  | tr ',' '\n' | sed -n 's/.*"\([A-Za-z_][A-Za-z0-9_]*\)":{}.*/\1/p' | sort -u)

MISSING=""
for n in $NAMES; do
  if ! printf '%s\n' "$REMOTE" | grep -qx "$n"; then
    MISSING="$MISSING $n"
  fi
done

if [ -n "$MISSING" ]; then
  echo "Uploaded, but these are not readable back:$MISSING" >&2
  echo "Check the Doppler dashboard before you delete anything." >&2
  exit 1
fi

echo "Verified. All $KEPT names are readable back from $PROJECT / $CONFIG."
echo
echo "Doppler adds DOPPLER_PROJECT, DOPPLER_CONFIG and DOPPLER_ENVIRONMENT of"
echo "its own. Seeing three more than you imported is correct."
echo
echo "Keep $ENVFILE where it is for now. It costs nothing as a fallback, and"
echo "you can delete it once the app has run against Doppler for a few days."
