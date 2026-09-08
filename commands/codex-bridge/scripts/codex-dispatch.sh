#!/usr/bin/env bash
#
# codex-dispatch.sh — the ONLY sanctioned way to start a WRITING codex worker.
#
# WHY THIS EXISTS
#   The raw-CLI execution fallback used to run `codex exec -s workspace-write` with
#   no -m. Omitting -m does not "default to Sol" — codex reads the `model =` key in
#   ~/.codex/config.toml, which commonly names the newest model on the account. On
#   codex-cli <0.153.4 that 400s, so the bug is masked as a version error. On
#   >=0.153.4 it SUCCEEDS, and the review-only model writes the code, silently and
#   at top tier. The upgrade removed the symptom, not the bug.
#   gpt-6-astra reviews and ratifies. It never writes.
#
#   The first design was a preflight the command was *instructed* to call. Two
#   independent reviewers both rejected that as decorative: the fallback path is
#   exactly the path that forgets, and an instruction cannot bind it. So this
#   script does not validate an invocation someone else built — it BUILDS the
#   invocation. There is no argument you can pass that produces an unpinned or
#   review-model-backed write.
#
#   Optional belt and braces: a PreToolUse hook that denies any Bash command
#   pairing a write sandbox with a review-only model (or with no -m at all) catches
#   a future caller that bypasses this script entirely. Not shipped here — it needs
#   settings.json wiring this installer cannot do for you.
#
# Usage:
#   codex-dispatch.sh --model <slug> --prompt-file <f> --out <f> [--err <f>]
#                     [--cwd <dir>] [--resume <thread-id>] [--dry-run]
#
# Exit: 0 dispatched · 2 usage error · 3 REFUSED by policy · other = codex's own.

set -uo pipefail

# Models permitted to WRITE. gpt-6-astra is deliberately absent and must stay so.
WRITE_ALLOWLIST="gpt-5.6-luna gpt-5.6-terra gpt-5.6-sol"
REVIEW_ONLY_MODELS="gpt-6-astra"

model=""; prompt_file=""; out_file=""; err_file=""; cwd="."; resume_id=""; dry_run=0

die_usage() { echo "codex-dispatch: $1" >&2; echo "usage: codex-dispatch.sh --model <slug> --prompt-file <f> --out <f> [--err <f>] [--cwd <dir>] [--resume <id>] [--dry-run]" >&2; exit 2; }

refuse() {
  echo "REFUSED — $1" >&2
  echo "  This is a policy refusal, not a transient error. Retrying will not help." >&2
  exit 3
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)       model="${2:-}"; shift 2 ;;
    --prompt-file) prompt_file="${2:-}"; shift 2 ;;
    --out)         out_file="${2:-}"; shift 2 ;;
    --err)         err_file="${2:-}"; shift 2 ;;
    --cwd)         cwd="${2:-}"; shift 2 ;;
    --resume)      resume_id="${2:-}"; shift 2 ;;
    --dry-run)     dry_run=1; shift ;;
    *)             die_usage "unknown argument: $1" ;;
  esac
done

# --- policy gate, before anything else happens -------------------------------

# 1. A missing model is refused, never defaulted. Defaulting is the whole bug.
[[ -n "$model" ]] || refuse "no --model given. A writing worker must name its model explicitly; falling back to the config default is how gpt-6-astra ends up writing code."

# 2. Astra (and any future review-only model) may never hold a write sandbox.
for m in $REVIEW_ONLY_MODELS; do
  if [[ "$model" == "$m" ]]; then
    refuse "$model is review-only and must never be given a write sandbox. It reviews and ratifies; it does not write code."
  fi
done

# 3. Anything not explicitly allowed is refused — allowlist, not denylist, so a
#    new model added upstream is refused by default rather than silently trusted.
allowed=0
for m in $WRITE_ALLOWLIST; do
  [[ "$model" == "$m" ]] && allowed=1
done
[[ "$allowed" -eq 1 ]] || refuse "$model is not on the write allowlist ($WRITE_ALLOWLIST). If it should be, add it deliberately."

# --- argument checks ---------------------------------------------------------

[[ -n "$out_file" ]] || die_usage "--out is required (never /tmp; use the run directory)"
if [[ -z "$resume_id" ]]; then
  [[ -n "$prompt_file" ]] || die_usage "--prompt-file is required for a fresh dispatch"
  [[ -f "$prompt_file" ]] || die_usage "prompt file does not exist: $prompt_file"
fi
[[ -n "$err_file" ]] || err_file="${out_file}.err"

# --- build the invocation ----------------------------------------------------
# -m is placed by THIS script, not by the caller, which is what makes the pin
# structural. `resume` REJECTS -s, so its sandbox goes via -c sandbox_mode.

if [[ -n "$resume_id" ]]; then
  set -- codex exec resume --skip-git-repo-check "$resume_id" \
    -m "$model" \
    -c sandbox_mode="workspace-write" -c approval_policy="never" \
    --json -o "$out_file"
else
  set -- codex exec --skip-git-repo-check \
    -m "$model" \
    -s workspace-write -c approval_policy="never" \
    --json -o "$out_file"
fi

if [[ "$dry_run" -eq 1 ]]; then
  printf '%q ' "$@"; echo
  exit 0
fi

echo "codex-dispatch: model=$model cwd=$cwd out=$out_file${resume_id:+ resume=$resume_id}" >&2

# Prompt via stdin: avoids shell-quoting bugs AND the non-TTY hang where
# `codex exec` blocks forever at ~0% CPU waiting for stdin EOF.
if [[ -n "$resume_id" ]]; then
  ( cd "$cwd" && "$@" < /dev/null 2>"$err_file" >/dev/null )
else
  ( cd "$cwd" && "$@" - <"$prompt_file" 2>"$err_file" | grep '"type":"thread.started"' )
fi
