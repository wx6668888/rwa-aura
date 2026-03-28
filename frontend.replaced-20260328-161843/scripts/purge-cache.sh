#!/usr/bin/env bash
# 一键清缓存：Nginx 代理缓存（宝塔常见路径）+ 可选 Cloudflare 全站 Purge
# Cloudflare：在项目根创建 .env.cf（勿提交 git），内容示例：
#   CF_ZONE_ID=你的区域ID
#   CF_API_TOKEN=编辑权限的 API Token（Zone.Cache Purge）
set -euo pipefail


ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf "[purge-cache] %s\n" "$1"; }

# 1) Nginx 代理缓存（与 OPERATIONS_MANUAL / 宝塔文档中的 proxy_cache_path 一致）
NGINX_CACHE_DIRS=(
  "/www/server/nginx/proxy_cache_dir"
  "/var/cache/nginx"
)
for d in "${NGINX_CACHE_DIRS[@]}"; do
  if [[ -d "$d" ]] && [[ -w "$d" || -w "$(dirname "$d")" ]]; then
    if rm -rf "${d:?}/"* 2>/dev/null; then
      log "已清空可写目录: $d"
    fi
  elif [[ -d "$d" ]]; then
    if sudo rm -rf "${d:?}/"* 2>/dev/null; then
      log "已清空 (sudo): $d"
    fi
  fi
done

if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t 2>/dev/null && sudo nginx -s reload 2>/dev/null && log "nginx reload 成功" || log "nginx reload 跳过（无权限或未安装）"
fi

# 2) Cloudflare（可选）
CF_FILE="$ROOT/.env.cf"
if [[ -f "$CF_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CF_FILE"
  set +a
fi

if [[ -n "${CF_ZONE_ID:-}" && -n "${CF_API_TOKEN:-}" ]]; then
  log "正在请求 Cloudflare Purge Everything …"
  resp="$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')"
  if echo "$resp" | grep -q '"success":true'; then
    log "Cloudflare 缓存已清除"
  else
    printf "%s\n" "$resp" >&2
    log "Cloudflare API 返回异常，请检查 Token 权限（需要 Cache Purge）"
    exit 1
  fi
else
  log "未配置 CF_ZONE_ID/CF_API_TOKEN，已跳过 Cloudflare（可在 frontend/.env.cf 配置）"
fi

log "完成。请浏览器强制刷新：Ctrl+Shift+R 或 无痕窗口打开站点。"
