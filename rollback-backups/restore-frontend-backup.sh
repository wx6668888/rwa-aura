#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/www/wwwroot/rwaprotocol.dpdns.org"
BACKUP_DIR="$REPO_ROOT/rollback-backups"

cd "$REPO_ROOT"

ARCHIVE_PATH="${1:-}"
if [[ -z "$ARCHIVE_PATH" ]]; then
  shopt -s nullglob
  files=("$BACKUP_DIR"/frontend-live-*.tar.gz)
  shopt -u nullglob
  if [[ ${#files[@]} -gt 0 ]]; then
    ARCHIVE_PATH="$(ls -t "${files[@]}" | head -n 1)"
  fi
fi

if [[ -z "${ARCHIVE_PATH:-}" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "No valid backup archive found."
  echo "Usage: bash rollback-backups/restore-frontend-backup.sh [archive_path]"
  exit 1
fi

echo "Restoring from: $ARCHIVE_PATH"

if [[ -d "$REPO_ROOT/frontend" ]]; then
  mv "$REPO_ROOT/frontend" "$REPO_ROOT/frontend.before-restore.$(date +%Y%m%d-%H%M%S)"
fi

tar -xzf "$ARCHIVE_PATH" -C "$REPO_ROOT"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart rwa-frontend || true
fi

echo "Restore completed."
echo "If needed, reinstall deps: cd frontend && npm install"
