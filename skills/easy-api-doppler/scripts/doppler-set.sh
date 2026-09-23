#!/usr/bin/env bash
#
# doppler-set.sh - write the clipboard into one or more Doppler configs, with
# the guards the bare one-liner does not have.
#
# Usage:
#   ./doppler-set.sh <VAR_NAME> <project> [config ...]   # default: dev prd
#   ./doppler-set.sh --check <VAR_NAME> <project> [config ...]
#
# Flags:
#   --validate      check the CLIPBOARD ALONE and stop. Needs no project and no
#                   variable name, so a caller can run it before asking for
#                   either and fail fast instead of at the end.
#   --check         report what would happen and write nothing
#   --overwrite     allow replacing a value that already exists
#   --allow-sync    allow writing to a config that pushes to a deploy platform
#   --force         allow a clipboard whose SHAPE looks wrong: a variable
#                   name, or implausibly short for a key
#
# What it refuses, and why each one exists:
#
#   1. An empty clipboard. The bare CLI accepts it, stores an empty string,
#      exits 0 and prints nothing under --silent. A later sync then writes
#      that blank over the live secret.
#
#   2. A clipboard that is the variable's own name, or any all-caps
#      underscored token. On 2026-08-29 the string OPENROUTER_MANAGEMENT_KEY
#      was stored as the value of OPENROUTER_MANAGEMENT_KEY in my-app,
#      synced to Vercel production 2 seconds later, and destroyed the only
#      copy of the real key. It is 25 characters with no whitespace, so every
#      guard that existed at the time passed it.
#
#   3. Replacing a value that is already there, unless you say so. That write
#      is the destructive one and it is the one nothing used to mention.
#
#   4. Writing to a config with a live sync, unless you say so. Doppler pushes
#      to the platform within seconds and the platform keeps no history.
#
#   5. A clipboard that moved since the run started, when the caller pinned it
#      with DOPPLER_SET_EXPECT_SHA. Between a button's dialogs the user has a
#      reason to copy something else -- the variable NAME, to paste into the
#      name field -- and that is the whole of how the incident above happened.
#
#   6. A value under 24 characters, unless you say so. Not a refusal, since a
#      few vendors issue short tokens, but 17 characters reached the write step
#      on this script's first real test and nothing but the length on screen
#      would have caught it. Suppressed for values that are plainly config
#      (booleans, numbers, URLs, addresses) and for names that describe
#      configuration, or it fires on nearly every feature flag you own.
#
# The value moves clipboard -> stdin -> Doppler. It is never an argument, never
# written to a file, and never printed. --silent is not optional and is not a
# flag you can forget here.
#
# Written for bash 3.2, the version macOS ships.

set -u
export LC_ALL=C

CHECK=0
VALIDATE=0
OVERWRITE=0
ALLOW_SYNC=0
FORCE=0
VARNAME=""
PROJECT=""
CONFIGS=""

for arg in "$@"; do
  case "$arg" in
    --check)      CHECK=1 ;;
    --validate)   VALIDATE=1 ;;
    --overwrite)  OVERWRITE=1 ;;
    --allow-sync) ALLOW_SYNC=1 ;;
    --force)      FORCE=1 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *)
      if   [ -z "$VARNAME" ]; then VARNAME="$arg"
      elif [ -z "$PROJECT" ]; then PROJECT="$arg"
      else CONFIGS="$CONFIGS $arg"
      fi ;;
  esac
done

if [ "$VALIDATE" = "0" ] && { [ -z "$VARNAME" ] || [ -z "$PROJECT" ]; }; then
  echo "usage: doppler-set.sh <VAR_NAME> <project> [config ...]" >&2
  echo "       doppler-set.sh --validate" >&2
  exit 2
fi
[ -n "$CONFIGS" ] || CONFIGS="dev prd"

if ! command -v doppler >/dev/null 2>&1; then
  echo "The doppler CLI is not on your PATH." >&2
  echo "Install it first:  brew install dopplerhq/cli/doppler" >&2
  exit 2
fi

if [ "$VALIDATE" = "0" ] && ! doppler me >/dev/null 2>&1; then
  echo "You are not logged in to Doppler." >&2
  echo "Open a real terminal window and run:  doppler login" >&2
  exit 2
fi

# How to read the clipboard on this machine. Point DOPPLER_SET_CLIP_FILE at a
# file to read from that instead, which is how the guards get exercised without
# disturbing whatever you actually have copied.
if [ -n "${DOPPLER_SET_CLIP_FILE:-}" ]; then
  if [ ! -r "$DOPPLER_SET_CLIP_FILE" ]; then
    echo "DOPPLER_SET_CLIP_FILE is set but not readable: $DOPPLER_SET_CLIP_FILE" >&2
    exit 2
  fi
  CLIP="cat $DOPPLER_SET_CLIP_FILE"
elif command -v pbpaste >/dev/null 2>&1; then
  CLIP="pbpaste"
elif command -v wl-paste >/dev/null 2>&1; then
  CLIP="wl-paste --no-newline"
elif command -v xclip >/dev/null 2>&1; then
  CLIP="xclip -selection clipboard -o"
else
  echo "No clipboard reader found (pbpaste, wl-paste or xclip)." >&2
  exit 2
fi

# macOS has shasum (perl); most Linux images have sha256sum and may not have
# shasum at all. The skill claims Linux support, so pick whichever is here
# rather than assuming the Mac one.
if command -v shasum >/dev/null 2>&1; then
  SHA256="shasum -a 256"
elif command -v sha256sum >/dev/null 2>&1; then
  SHA256="sha256sum"
else
  echo "Neither shasum nor sha256sum is available, so a write cannot be verified." >&2
  exit 2
fi

# ---------------------------------------------------------------- inspection
#
# Everything below reads the clipboard's SHAPE only: its length, whether it
# holds whitespace, and whether it is character-for-character equal to a string
# we already know. The value itself is never captured into a variable and never
# reaches stdout.

# Fingerprint first. Everything below re-reads the clipboard, and between a
# button's dialogs the user has both the opportunity and a reason to change it:
# they copy the variable NAME to paste into the name field, which overwrites the
# key they copied a moment earlier. That is not hypothetical. It is how
# OPENROUTER_MANAGEMENT_KEY came to be stored as its own value on 2026-08-29.
#
# DOPPLER_SET_EXPECT_SHA lets a caller pin the value it showed the user. It
# travels as an environment variable rather than an argument so it stays out of
# the process list, and a SHA-256 of a high-entropy key reveals nothing anyway.
CLIP_SHA=$($CLIP | tr -d '\n' | $SHA256 | awk '{print $1}')

if [ -n "${DOPPLER_SET_EXPECT_SHA:-}" ] && [ "$DOPPLER_SET_EXPECT_SHA" != "$CLIP_SHA" ]; then
  echo "REFUSED: the clipboard changed since this run started." >&2
  echo "Something was copied while you were answering, so the value now on the" >&2
  echo "clipboard is not the one you were shown. Copy the key again and retry." >&2
  echo "If you copied the variable's NAME to paste into a field: that is the bug." >&2
  exit 1
fi

CLIP_LEN=$($CLIP | tr -d '\n' | wc -c | tr -d ' ')
CLIP_HAS_SPACE=$($CLIP | head -1 | grep -cE '[[:space:]]' || true)

if [ "$CLIP_LEN" = "0" ]; then
  echo "REFUSED: the clipboard is empty." >&2
  echo "Copy the key from the vendor's site first, then run this again." >&2
  echo "(The bare CLI would have stored an empty string here and exited 0.)" >&2
  exit 1
fi

if [ "$CLIP_LEN" -lt 12 ]; then
  echo "REFUSED: the clipboard holds only $CLIP_LEN characters, too short for an API key." >&2
  exit 1
fi

CLIP_LINES=$($CLIP | grep -c '' || true)
if [ "$CLIP_LINES" -gt 1 ]; then
  echo "REFUSED: the clipboard holds $CLIP_LINES lines. An API key is one line." >&2
  echo "You have probably copied a block of text rather than the key itself." >&2
  echo "For a genuinely multi-line secret such as a certificate, use the CLI:" >&2
  echo "  doppler secrets set NAME --silent -p PROJECT -c CONFIG" >&2
  exit 1
fi

if [ "$CLIP_HAS_SPACE" != "0" ]; then
  echo "REFUSED: the clipboard has whitespace in it, so it does not look like a key." >&2
  echo "Copy just the key. If you copied a command by mistake, copy the key again." >&2
  exit 1
fi

# Guard 2, the one that would have caught the OPENROUTER_MANAGEMENT_KEY
# incident. Compared inside a pipeline so the value stays out of a variable.
if [ -n "$VARNAME" ] && $CLIP | tr -d '\n' | grep -qxiF "$VARNAME"; then
  echo "REFUSED: the clipboard is the string \"$VARNAME\" -- the variable's own name," >&2
  echo "not its value. You almost certainly copied the label instead of the secret." >&2
  echo "Reveal the value in the vendor or platform dashboard and copy that." >&2
  exit 1
fi

if [ "$FORCE" = "0" ] && $CLIP | tr -d '\n' | grep -qxE '[A-Z][A-Z0-9]*(_[A-Z0-9]+)+'; then
  echo "REFUSED: the clipboard looks like a variable name (all caps with underscores)," >&2
  echo "not a secret. Real keys carry lowercase, hyphens or dots." >&2
  echo "If it genuinely is the value, re-run with --force." >&2
  exit 1
fi

# Implausibly short for a key. Not a refusal: a few vendors really do issue
# short tokens. But 17 characters slipped past every other check during the
# first test of this script, and the only thing that would have caught it was
# a human reading the length off the screen. So it asks.
SHORTVAL=0
if [ "$CLIP_LEN" -lt 24 ]; then
  SHORTVAL=1

  # Measured against a real workplace of eight projects, the bare length rule
  # fired on about 300 perfectly good values: ports, feature flags, vendor ids,
  # Listmonk list numbers. A prompt that cries wolf 300 times gets clicked
  # through on the one occasion it is right, so two things suppress it.
  #
  # First, a value that is plainly not a credential.
  if $CLIP | tr -d '\n' | grep -qxiE 'true|false|yes|no|on|off|[0-9]+|[0-9]+\.[0-9]+|https?://.+|[^@[:space:]]+@[^@[:space:]]+\.[a-z]+'; then
    SHORTVAL=0
  fi

  # Second, a name that describes configuration rather than a secret. Only
  # available once a name is known, so --validate relies on the value test
  # alone -- which is right for the button, since reaching for the API-key
  # button to store a feature flag deserves the question.
  case "${VARNAME:-}" in
    NEXT_PUBLIC_*|TURBO_*|NX_*|*_ID|*_IDS|*_URL|*_URI|*_HOST|*_PORT) SHORTVAL=0 ;;
    *_MODE|*_ENABLED|*_DISABLED|*_EMAIL|*_USERNAME|*_LOGIN|*_USER)   SHORTVAL=0 ;;
    *_BUCKET|*_REGION|*_NAME|*_HANDLE|*_MODEL|*_BACKEND|*_VERSION)   SHORTVAL=0 ;;
    *_DAYS|*_SIZE|*_BATCH|*_LIMIT|*_COUNT|*_PAGES_PER_RUN|*_COHORT)  SHORTVAL=0 ;;
  esac
fi

# --validate has now judged everything that can be judged from the clipboard
# alone. Stop before anything that needs a project, so a caller can run this
# first and refuse a bad clipboard before asking the user any questions.
if [ "$VALIDATE" = "1" ]; then
  echo "CLIPLEN $CLIP_LEN"
  [ "$SHORTVAL" = "1" ] && echo "SHORT $CLIP_LEN"
  echo "OK"
  exit 0
fi

# Which of the target configs already hold this name, and which push onward.
EXISTS=""
MISSING_CFG=""
for c in $CONFIGS; do
  if ! doppler configs get "$c" --project "$PROJECT" >/dev/null 2>&1; then
    MISSING_CFG="$MISSING_CFG $c"
    continue
  fi
  if doppler secrets get "$VARNAME" --project "$PROJECT" --config "$c" --plain >/dev/null 2>&1; then
    EXISTS="$EXISTS $c"
  fi
done

if [ -n "$MISSING_CFG" ]; then
  echo "REFUSED: these configs do not exist in $PROJECT:$MISSING_CFG" >&2
  echo "See what does:  doppler configs --project $PROJECT" >&2
  exit 1
fi

# Live syncs on the target configs. A sync means this write leaves Doppler.
# Read through the API because the CLI has no syncs command. No jq, no python:
# each sync is a flat object, so one per line after splitting on the brace.
SYNCED=""
SYNCJSON=""
SYNC_DESC_LIST=""
DTOKEN=$(doppler configure get token --plain 2>/dev/null)
if [ -n "$DTOKEN" ] && command -v curl >/dev/null 2>&1; then
  SYNCJSON=$(curl -s --max-time 10 -u "$DTOKEN:" "https://api.doppler.com/v3/integrations" 2>/dev/null | tr '{' '\n') # gitleaks:allow (runtime var from the user's own CLI, no literal)
  for c in $CONFIGS; do
    line=$(printf '%s\n' "$SYNCJSON" | grep "\"project\":\"$PROJECT\"" | grep "\"config\":\"$c\"" | grep '"enabled":true' | head -1)
    if [ -n "$line" ]; then
      desc=$(printf '%s' "$line" | sed -n 's/.*"description":"\([^"]*\)".*/\1/p')
      [ -n "$desc" ] || desc="a deploy platform"
      SYNCED="$SYNCED $c"
      SYNC_DESC_LIST="${SYNC_DESC_LIST:-}
  $c -> $desc"
    fi
  done
fi

# --check reports and stops. The button uses this to build its dialog.
if [ "$CHECK" = "1" ]; then
  echo "NAME $VARNAME"
  echo "PROJECT $PROJECT"
  echo "CONFIGS$CONFIGS"
  echo "CLIPLEN $CLIP_LEN"
  [ "$SHORTVAL" = "1" ] && echo "SHORT $CLIP_LEN"
  for c in $EXISTS; do echo "EXISTS $c"; done
  for c in $SYNCED; do
    d=$(printf '%s\n' "$SYNCJSON" | grep "\"project\":\"$PROJECT\"" | grep "\"config\":\"$c\"" | sed -n 's/.*"description":"\([^"]*\)".*/\1/p' | head -1)
    echo "SYNCED $c ${d:-unknown}"
  done
  echo "OK"
  exit 0
fi

confirm() {
  # Ask on the terminal if there is one. /dev/tty existing is not the same as
  # /dev/tty being connected -- under a hook, a cron job or an AI session's
  # shell the path is there and opening it fails. So open it and let that be
  # the test. With no terminal there is no way to ask, and the answer is no:
  # an unattended run must not take a destructive path nobody authorised.
  exec 3<>/dev/tty 2>/dev/null || return 1
  printf '%s [y/N] ' "$1" >&3
  if ! read ans <&3; then exec 3>&- 2>/dev/null; return 1; fi
  exec 3>&- 2>/dev/null
  case "$ans" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

if [ "$SHORTVAL" = "1" ] && [ "$FORCE" = "0" ]; then
  echo "The clipboard is only $CLIP_LEN characters. Most API keys run 32 to 200."
  echo "Check it is the whole key and not a truncated copy or the wrong thing."
  confirm "Use it anyway?" || {
    echo "Stopped. Nothing was written. Pass --force to allow it." >&2
    exit 1
  }
fi

if [ -n "$EXISTS" ] && [ "$OVERWRITE" = "0" ]; then
  echo "$VARNAME already has a value in:$EXISTS"
  echo "Replacing it destroys the current one. Doppler keeps no rollback on this plan."
  confirm "Replace it?" || {
    echo "Stopped. Nothing was written. Pass --overwrite to allow it." >&2
    exit 1
  }
fi

if [ -n "$SYNCED" ] && [ "$ALLOW_SYNC" = "0" ]; then
  echo "These configs push onward within seconds of the write:${SYNC_DESC_LIST:-$SYNCED}"
  echo "The platform keeps no version history, so a wrong value is not recoverable there."
  confirm "Write anyway?" || {
    echo "Stopped. Nothing was written. Pass --allow-sync to allow it." >&2
    exit 1
  }
fi

# -------------------------------------------------------------------- write

for c in $CONFIGS; do
  NOW_SHA=$($CLIP | tr -d '\n' | $SHA256 | awk '{print $1}')
  if [ "$NOW_SHA" != "$CLIP_SHA" ]; then
    echo "REFUSED: the clipboard changed after the checks ran and before the write." >&2
    echo "Nothing further was written. Copy the key again and retry." >&2
    exit 1
  fi
  if ! $CLIP | doppler secrets set "$VARNAME" --project "$PROJECT" --config "$c" --silent; then
    echo "Writing $VARNAME to $PROJECT/$c failed. Stopping here." >&2
    exit 1
  fi
  BACK_SHA=$(doppler secrets get "$VARNAME" --project "$PROJECT" --config "$c" --plain 2>/dev/null \
    | tr -d '\n' | $SHA256 | awk '{print $1}')
  if [ "$BACK_SHA" != "$CLIP_SHA" ]; then
    echo "Wrote $VARNAME to $PROJECT/$c but read a different value back." >&2
    echo "Check the Doppler dashboard before you rely on it." >&2
    exit 1
  fi
  echo "  $PROJECT/$c  written and read back intact"
done

echo
echo "$VARNAME is in $PROJECT ($CONFIGS), $CLIP_LEN characters."
echo
echo "The read-back above is a TRANSPORT check. It proves the bytes on your"
echo "clipboard arrived unmangled. It cannot tell you those bytes were the"
echo "right secret, because it compares the stored value against the same"
echo "clipboard it came from. Exercise the credential against the real API"
echo "before you trust it."
