#!/bin/bash
# 检查 EventMonitor 区块差距，超过 1000 发送告警

THRESHOLD=1000
BACKEND_DIR="/www/wwwroot/rwaprotocol.dpdns.org/backend"

cd $BACKEND_DIR
GAP=$(node check-event-monitor.js | grep "区块差距" | awk '{print $2}')

if [ "$GAP" -gt "$THRESHOLD" ]; then
  echo "⚠️ EventMonitor 区块差距过大: $GAP"
  # 发送告警（可以集成钉钉/邮件/Telegram）
  pm2 restart rwa-backend
fi
