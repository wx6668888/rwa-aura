#!/usr/bin/env bash
# 一键恢复首页多语言改动前的文件（备份时间：2026-04-05）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
B="$(cd "$(dirname "$0")" && pwd)"

cp "$B/i18n.ts.bak" "$ROOT/frontend/lib/i18n.ts"
for f in features-section.tsx how-it-works-section.tsx knowledge-hub-card.tsx withdraw-cta-card.tsx security-transparency-card.tsx home-trust-cards-carousel.tsx footer-section.tsx home-latest-stakes.tsx hero-section.tsx; do
  if [[ -f "$B/$f" ]]; then
    cp "$B/$f" "$ROOT/frontend/components/$f"
  fi
done

echo "OK: restored homepage i18n files from $B"
