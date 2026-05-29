#!/usr/bin/env bash
# tunnel-ingress-append.sh
# Idempotently append a hostname (+ www) to a Cloudflare Tunnel's ingress config.
#
# WHY THIS EXISTS: Cloudflare's PUT /cfd_tunnel/{id}/configurations REPLACES the
# entire ingress array. A naive PUT wipes every other hostname sharing the
# tunnel. This script fetches the current ingress, splices the new rules in
# BEFORE the catch-all http_status:404, and PUTs the merged config back.
#
# Usage:
#   ./tunnel-ingress-append.sh <domain> <host_port> <tunnel_id> <account_id> <cf_token> [service_host]
#
#   service_host defaults to the LGJ Zeus host (192.168.5.174) — an LGJ-INTERNAL
#   example. Pass your own deploy host's reachable IP/hostname as the 6th arg.
#
# Requires: curl, jq
set -euo pipefail

DOMAIN="${1:?missing domain}"
HOST_PORT="${2:?missing host_port}"
TUNNEL_ID="${3:?missing tunnel_id}"
ACCOUNT_ID="${4:?missing account_id}"
CF_TOKEN="${5:?missing cloudflare_api_token}"
SERVICE_HOST="${6:-192.168.5.174}" # LGJ-internal example — override for your host
SERVICE="http://${SERVICE_HOST}:${HOST_PORT}"

BASE="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}"

echo "▶ Fetching current tunnel ingress…"
CURRENT=$(curl -sS -H "Authorization: Bearer $CF_TOKEN" "$BASE/configurations")
if [ "$(echo "$CURRENT" | jq -r '.success')" != "true" ]; then
  echo "✗ Failed to fetch tunnel config:"; echo "$CURRENT" | jq -r '.errors // .'; exit 1
fi

EXISTING=$(echo "$CURRENT" | jq -c '.result.config.ingress // []')

# Idempotent: bail early if the hostname is already routed.
if echo "$EXISTING" | jq -e --arg d "$DOMAIN" 'any(.[]; .hostname == $d)' >/dev/null; then
  echo "✓ $DOMAIN already in ingress — nothing to do."
  exit 0
fi

# Drop any existing catch-all (rule with no .hostname), keep real hostnames,
# prepend our two new rules, re-append a single catch-all 404.
MERGED=$(echo "$EXISTING" | jq -c \
  --arg d "$DOMAIN" --arg svc "$SERVICE" '
  [ {hostname: $d, service: $svc},
    {hostname: ("www." + $d), service: $svc} ]
  + [ .[] | select(.hostname != null) ]
  + [ {service: "http_status:404"} ]')

echo "▶ Writing merged ingress ($(echo "$MERGED" | jq 'length') rules)…"
RESP=$(curl -sS -X PUT -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d "{\"config\":{\"ingress\":$MERGED}}" "$BASE/configurations")

if [ "$(echo "$RESP" | jq -r '.success')" != "true" ]; then
  echo "✗ PUT failed:"; echo "$RESP" | jq -r '.errors // .'; exit 1
fi

echo "✓ Tunnel ingress updated: $DOMAIN + www.$DOMAIN → $SERVICE"
