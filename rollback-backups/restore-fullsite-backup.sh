#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/www/wwwroot/rwaprotocol.dpdns.org"
BACKUP_DIR="$REPO_ROOT/rollback-backups"

cd "$REPO_ROOT"

ARCHIVE_PATH="${1:-}"
if [[ -z "$ARCHIVE_PATH" ]]; then
  shopt -s nullglob
  files=("$BACKUP_DIR"/fullsite-live-*.tar.gz)
  shopt -u nullglob
  if [[ ${#files[@]} -gt 0 ]]; then
    ARCHIVE_PATH="$(ls -t "${files[@]}" | sed -n '1p')"
  fi
fi

if [[ -z "${ARCHIVE_PATH:-}" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "No valid fullsite backup archive found."
  echo "Usage: bash rollback-backups/restore-fullsite-backup.sh [archive_path]"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Extracting: $ARCHIVE_PATH"
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

SNAPSHOT_DIR="$(ls -d "$TMP_DIR"/fullsite-live-* 2>/dev/null | sed -n '1p' || true)"
if [[ -z "$SNAPSHOT_DIR" || ! -d "$SNAPSHOT_DIR" ]]; then
  echo "Snapshot directory not found in archive."
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"

if [[ -d "$REPO_ROOT/frontend" ]]; then
  mv "$REPO_ROOT/frontend" "$REPO_ROOT/frontend.before-fullsite-restore.$TS"
fi
if [[ -d "$REPO_ROOT/backend" ]]; then
  mv "$REPO_ROOT/backend" "$REPO_ROOT/backend.before-fullsite-restore.$TS"
fi

rsync -a "$SNAPSHOT_DIR/frontend/" "$REPO_ROOT/frontend/"
rsync -a "$SNAPSHOT_DIR/backend/" "$REPO_ROOT/backend/"

if [[ -f "$SNAPSHOT_DIR/nginx/nginx.conf" ]]; then
  sudo cp -f "$SNAPSHOT_DIR/nginx/nginx.conf" "/www/server/nginx/conf/nginx.conf"
fi
for conf in rwa.lat.conf rwaprotocol.dpdns.org.conf api.rwaprotocol.dpdns.org.conf; do
  if [[ -f "$SNAPSHOT_DIR/nginx/$conf" ]]; then
    sudo cp -f "$SNAPSHOT_DIR/nginx/$conf" "/www/server/panel/vhost/nginx/$conf"
  fi
done

if [[ -x "/www/server/nginx/sbin/nginx" ]]; then
  sudo /www/server/nginx/sbin/nginx -t
  sudo /www/server/nginx/sbin/nginx -s reload
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart rwa-frontend || true
  pm2 restart rwa-backend || true
fi

echo "Fullsite restore completed."
echo "Recovered frontend + backend + nginx conf."
