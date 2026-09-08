#!/usr/bin/env bash
#
# assert-review-produced.sh <review-output-file>
#
# A review that produced nothing is a FAILED review, not a clean one.
#
# Why this exists:
#   `codex exec` exits 0 when it refuses to run — e.g. "Not inside a trusted
#   directory and --skip-git-repo-check was not specified" — printing nothing.
#   The openai-codex companion propagates that exit code verbatim and never
#   checks that a review produced content. So a refused review reaches a merge
#   gate looking exactly like "reviewed, found nothing" — a green check that read
#   no code.
#
#   A second shape: the run STARTS, reads ambient project documentation
#   (AGENTS.md and friends, which can carry an orchestration preamble) and answers
#   a different question entirely. It exits 0 with plausible prose and no
#   findings. --expect-verdict is the check for that: no VERDICT line, no review.
#
# Exit 0 = a real review landed. Exit 1 = it did not; treat as a blocker.
# Exit 2 = usage error.

set -uo pipefail

# --expect-verdict:      require a terminal "VERDICT: APPROVE|ITERATE" line.
# --expect-ratification: require a terminal "RATIFY" or "VETO" line.
# Either one proves the model answered the question it was asked. Opt-in, because
# not every caller mandates a decision line (ship.md does not).
expect_verdict=0
expect_ratification=0
args=()
for a in "$@"; do
  case "$a" in
    --expect-verdict) expect_verdict=1 ;;
    --expect-ratification) expect_ratification=1 ;;
    *) args+=("$a") ;;
  esac
done
set -- "${args[@]+"${args[@]}"}"

f="${1:-}"
if [[ -z "$f" ]]; then
  echo "usage: assert-review-produced.sh [--expect-verdict|--expect-ratification] <review-output-file>" >&2
  exit 2
fi

fail() {
  echo "REVIEW DID NOT RUN — $1" >&2
  echo "  file: $f" >&2
  echo "  Do NOT treat this as a clean review. Fix the run, or say plainly" >&2
  echo "  that nothing has read this code and let the human decide." >&2
  exit 1
}

[[ -f "$f" ]] || fail "no output file was written"

stripped="$(tr -d '[:space:]' < "$f")"
[[ -n "$stripped" ]] || fail "the reviewer wrote nothing at all"

# A terminal decision line, with its VALUE validated — not just the prefix.
# `VERDICT: banana` used to pass; it is not a decision.
DECISION_RE='^[[:space:]]*(\*\*)?(VERDICT:[[:space:]]*(APPROVE|ITERATE)|(RATIFY|VETO))\b'
has_decision=0
grep -qiE "$DECISION_RE" "$f" && has_decision=1

# Known no-op signatures: the tool ran, refused, and exited 0.
REFUSAL_RE='not inside a trusted directory|--skip-git-repo-check was not specified|could not enumerate the changed files|head moved during review|the ai reviewer did not run|no such file or directory|autopilot|omc state tools|cleanup is blocked'

# WHY THIS IS SCOPED — corrected after it rejected a real review:
#   These signatures used to be matched anywhere in the body. Every one of them is
#   a phrase a REVIEW MAY LEGITIMATELY QUOTE — a critique of Codex tooling will say
#   "no such file or directory" or "autopilot" while discussing those very traps.
#   A 7,148-character, 15-finding review was once thrown away as "REVIEW DID NOT
#   RUN" because one finding warned that this regex rejects critiques quoting that
#   phrase. The regex then proved the finding by rejecting it.
#   That failure is invisible in the safe direction: it looks like caution while
#   silently discarding findings, which is the worst way for a guard to break.
#
#   Every refusal actually observed was SHORT — the refusal message IS the whole
#   output ("Not inside a trusted directory" ~80 chars; the hijacked-preamble
#   one-liner below, 150). So: below the threshold a signature still means refusal, with
#   no escape. Above it, a signature only counts when the run produced no valid
#   terminal decision either — a refused run cannot render a real verdict.
REFUSAL_SCAN_MAX=800

if grep -qiE "$REFUSAL_RE" "$f"; then
  if [[ ${#stripped} -lt $REFUSAL_SCAN_MAX ]]; then
    echo "--- refusal text ---" >&2
    grep -iE "$REFUSAL_RE" "$f" >&2
    fail "the reviewer refused to start and exited 0 (${#stripped} chars, under the ${REFUSAL_SCAN_MAX}-char refusal-scan threshold)"
  elif [[ "$has_decision" -eq 0 ]]; then
    echo "--- refusal text ---" >&2
    grep -iE "$REFUSAL_RE" "$f" >&2
    fail "a refusal signature appears and the run produced no valid terminal decision"
  fi
fi

# A genuine review — even "no findings" — is never this short.
if [[ ${#stripped} -lt 40 ]]; then
  echo "--- full content ---" >&2
  cat "$f" >&2
  fail "output is ${#stripped} non-space characters; too short to be a review"
fi

# A caller that mandated a verdict and did not get one was answered off-topic.
# Ambient project docs (`~/.codex/AGENTS.md` and friends) are loaded into every
# `codex exec`, so an orchestration preamble in one can hijack the turn. A
# 20-minute round once came back as a single sentence — "Review complete.
# Autopilot cleanup is blocked because the required OMC state tools are
# unavailable in this read-only session." 150 non-space characters, no refusal
# signature, no file read, and this script passed it. Hence --expect-verdict, and
# `-c project_doc_max_bytes=0` on the calling side.
if [[ "$expect_verdict" -eq 1 ]] && ! grep -qiE '^[[:space:]]*(\*\*)?VERDICT:[[:space:]]*(APPROVE|ITERATE)\b' "$f"; then
  echo "--- full content ---" >&2
  cat "$f" >&2
  fail "the prompt mandated a trailing 'VERDICT: APPROVE|ITERATE' line and there is no valid one; the model answered something else"
fi

# A ratification call asks a different question and must answer it in kind.
# Accepting a bare "VERDICT:" here would let a re-review stand in for a ratification.
if [[ "$expect_ratification" -eq 1 ]] && ! grep -qiE '^[[:space:]]*(\*\*)?(RATIFY|VETO)\b' "$f"; then
  echo "--- full content ---" >&2
  cat "$f" >&2
  fail "the prompt mandated a trailing RATIFY or VETO line and there is none; the ratification did not happen"
fi

echo "review produced content: ${#stripped} non-space characters"
exit 0
