#!/usr/bin/env bash
set -euo pipefail

# One-command frontend deploy:
# 1) build Next.js
# 2) restart PM2 app
# 3) verify app is reachable
# 4) optional: purge Cloudflare cache

APP_NAME="${APP_NAME:-rwa-frontend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/knowledge}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cloudflare options (used when ENABLE_CF_PURGE=1)
ENABLE_CF_PURGE="${ENABLE_CF_PURGE:-0}"
CF_BASE_URL="${CF_BASE_URL:-https://rwaprotocol.dpdns.org}"
CF_PURGE_PATHS="${CF_PURGE_PATHS:-/knowledge}"
CF_PURGE_EVERYTHING="${CF_PURGE_EVERYTHING:-0}"

log() {
  printf "[deploy-frontend] %s\n" "$1"
}

fail() {
  printf "[deploy-frontend][ERROR] %s\n" "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 not found"
}

purge_cloudflare_cache() {
  require_cmd python3

  if [[ -z "${CF_ZONE_ID:-}" ]]; then
    fail "CF_ZONE_ID is required when ENABLE_CF_PURGE=1"
  fi
  if [[ -z "${CF_API_TOKEN:-}" ]]; then
    fail "CF_API_TOKEN is required when ENABLE_CF_PURGE=1"
  fi

  local payload
  if [[ "$CF_PURGE_EVERYTHING" == "1" ]]; then
    payload='{"purge_everything":true}'
    log "Purging Cloudflare cache: everything"
  else
    payload="$(python3 - <<'PY'
import json, os
base = os.getenv("CF_BASE_URL", "https://rwaprotocol.dpdns.org").rstrip("/")
paths = [p.strip() for p in os.getenv("CF_PURGE_PATHS", "/knowledge").split(",") if p.strip()]
urls = [f"{base}{p if p.startswith('/') else '/' + p}" for p in paths]
print(json.dumps({"files": urls}, ensure_ascii=False))
PY
)"
    log "Purging Cloudflare cache: files -> ${CF_PURGE_PATHS}"
  fi

  local endpoint
  endpoint="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache"

  local response
  response="$(curl -sS -X POST "$endpoint" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "$payload")"

  if [[ "$response" != *'"success":true'* ]]; then
    printf "%s\n" "$response" >&2
    fail "Cloudflare purge failed"
  fi

  log "Cloudflare purge success."
}

require_cmd npm
require_cmd pm2
require_cmd curl

cd "$PROJECT_DIR"

log "Building frontend..."
npm run build

log "Restarting PM2 app: $APP_NAME"
pm2 restart "$APP_NAME"

log "Waiting for service warm-up..."
sleep 2

log "Health check: $HEALTH_URL"
HTTP_CODE="$(curl -sS -o /tmp/frontend-deploy-health.out -w "%{http_code}" "$HEALTH_URL" || true)"
if [[ "$HTTP_CODE" != "200" ]]; then
  fail "Health check failed (HTTP $HTTP_CODE). URL: $HEALTH_URL"
fi

if [[ "$ENABLE_CF_PURGE" == "1" ]]; then
  purge_cloudflare_cache
fi

log "Deploy success. Frontend is live."
