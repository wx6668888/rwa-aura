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
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_DIR/.deploy-backups}"

# Cloudflare options (used when ENABLE_CF_PURGE=1)
ENABLE_CF_PURGE="${ENABLE_CF_PURGE:-0}"
CF_BASE_URL="${CF_BASE_URL:-https://rwa.lat}"
# 含常用入口页：旧 HTML 会引用已删除的 Turbopack chunk，CDN 需刷新文档（静态 chunk 本身带 hash 可长期缓存）
CF_PURGE_PATHS="${CF_PURGE_PATHS:-/knowledge,/node/network,/withdraw,/swap,/stake}"
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

create_predeploy_backup() {
  require_cmd git
  require_cmd tar
  require_cmd date

  mkdir -p "$BACKUP_ROOT"

  local ts
  ts="$(date +%Y%m%d-%H%M%S)"
  local snapshot_dir="$BACKUP_ROOT/$ts"
  mkdir -p "$snapshot_dir"

  log "Creating pre-deploy snapshot: $snapshot_dir"

  # 基础元信息
  {
    echo "timestamp=$ts"
    echo "project_dir=$PROJECT_DIR"
    echo "git_head=$(git -C "$PROJECT_DIR/.." rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "git_branch=$(git -C "$PROJECT_DIR/.." rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  } > "$snapshot_dir/meta.env"

  # frontend 目录改动快照（含 staged / unstaged）
  git -C "$PROJECT_DIR/.." status --porcelain -- frontend > "$snapshot_dir/frontend.status" || true
  git -C "$PROJECT_DIR/.." diff --binary -- frontend > "$snapshot_dir/frontend.unstaged.patch" || true
  git -C "$PROJECT_DIR/.." diff --binary --staged -- frontend > "$snapshot_dir/frontend.staged.patch" || true

  # 备份未跟踪文件（若有，使用 NUL 分隔，兼容中文/空格文件名）
  git -C "$PROJECT_DIR/.." ls-files -z --others --exclude-standard frontend > "$snapshot_dir/frontend.untracked.list.z" || true
  if [[ -s "$snapshot_dir/frontend.untracked.list.z" ]]; then
    tar --null -czf "$snapshot_dir/frontend.untracked.tar.gz" -C "$PROJECT_DIR/.." -T "$snapshot_dir/frontend.untracked.list.z" || true
  fi

  # 记录快速恢复指令
  cat > "$snapshot_dir/RESTORE.md" <<EOF
# 快速恢复（部署前快照）

## 1) 恢复 tracked 文件改动
git -C "$PROJECT_DIR/.." apply --index "$snapshot_dir/frontend.staged.patch" || true
git -C "$PROJECT_DIR/.." apply "$snapshot_dir/frontend.unstaged.patch"

## 2) 恢复 untracked 文件（如果有）
if [ -f "$snapshot_dir/frontend.untracked.tar.gz" ]; then
  tar -xzf "$snapshot_dir/frontend.untracked.tar.gz" -C "$PROJECT_DIR/.."
fi
EOF

  log "Snapshot created."
  log "Snapshot meta: $snapshot_dir/meta.env"
  log "Restore guide: $snapshot_dir/RESTORE.md"
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
base = os.getenv("CF_BASE_URL", "https://rwa.lat").rstrip("/")
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

create_predeploy_backup

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

# Next.js 在「先 start 后 build」时不会自动加载新路由，必须 restart；此处校验新页面已注册
NN_URL="${NN_HEALTH_URL:-http://127.0.0.1:3000/node/network}"
log "Health check (my network route): $NN_URL"
NN_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$NN_URL" || true)"
if [[ "$NN_CODE" != "200" ]]; then
  fail "My Network route check failed (HTTP $NN_CODE). Did you forget pm2 restart after npm run build?"
fi

if [[ "$ENABLE_CF_PURGE" == "1" ]]; then
  purge_cloudflare_cache
fi

log "Deploy success. Frontend is live."
