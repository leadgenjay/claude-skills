#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: safe_clone.sh <repo-url|owner/repo> <destination> [ref]" >&2
  exit 2
fi

source_repo="$1"
destination="$2"
requested_ref="${3:-}"

if [[ "$source_repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  source_repo="https://github.com/${source_repo}.git"
fi

if [[ -e "$destination" ]]; then
  echo "Destination already exists: $destination" >&2
  exit 3
fi

mkdir -p "$(dirname "$destination")"

export GIT_LFS_SKIP_SMUDGE=1
export GIT_TERMINAL_PROMPT=0

git -c core.hooksPath=/dev/null \
  clone --filter=blob:none --no-recurse-submodules --no-checkout \
  "$source_repo" "$destination"

git -C "$destination" config core.hooksPath /dev/null
git -C "$destination" config submodule.recurse false

if [[ -n "$requested_ref" ]]; then
  git -C "$destination" checkout --detach "$requested_ref"
else
  default_ref="$(git -C "$destination" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [[ -n "$default_ref" ]]; then
    git -C "$destination" checkout --detach "$default_ref"
  else
    git -C "$destination" checkout --detach HEAD
  fi
fi

printf 'repository=%s\n' "$source_repo"
printf 'commit=%s\n' "$(git -C "$destination" rev-parse HEAD)"
printf 'destination=%s\n' "$(cd "$destination" && pwd)"
printf 'notice=No dependencies, submodules, LFS objects, hooks, or repository scripts were executed.\n'
