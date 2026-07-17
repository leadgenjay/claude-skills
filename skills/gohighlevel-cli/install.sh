#!/usr/bin/env bash
# One-shot installer for the GoHighLevel CLI.
# Creates a local .venv, installs the package, and prints next steps.

set -e

cd "$(dirname "$0")"

PY=${PYTHON:-python3}

echo "→ checking python..."
"$PY" -c "import sys; assert sys.version_info >= (3, 10), 'need python 3.10+'"

if [ ! -d .venv ]; then
  echo "→ creating .venv ..."
  "$PY" -m venv .venv
fi

echo "→ installing package ..."
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -e . >/dev/null

chmod +x ghl

if [ ! -f .env ]; then
  echo "→ creating .env from .env.example ..."
  cp .env.example .env
  echo
  echo "  ⚠  Edit .env now and add your GHL_API_KEY + GHL_LOCATION_ID."
fi

echo
echo "✓ installed."
echo
echo "Next steps:"
echo "  1. Edit .env  (GHL_API_KEY, GHL_LOCATION_ID at minimum)"
echo "  2. Run:        ./ghl contacts list --limit 5"
echo "  3. Optional:   to build/update workflows (internal API), grab your"
echo "                 Firebase token with the DevTools snippet in"
echo "                 docs/get-firebase-token.md and set GHL_FIREBASE_REFRESH_TOKEN."
echo
