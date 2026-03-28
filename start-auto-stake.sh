#!/bin/bash

# 自动质押定时任务启动脚本

echo "🚀 RWA 自动质押定时任务"
echo "========================"
echo ""

# 检查环境变量
if [ -z "$OWNER_PRIVATE_KEY" ]; then
  echo "❌ 错误: 未设置 OWNER_PRIVATE_KEY 环境变量"
  echo ""
  echo "请先设置私钥："
  echo "  export OWNER_PRIVATE_KEY='your_private_key_here'"
  echo ""
  exit 1
fi

echo "✅ 环境变量已设置"
echo "📍 工作目录: $(pwd)"
echo ""

# 使用pm2启动（后台运行）
echo "🔧 使用 PM2 启动定时任务..."
pm2 start auto-stake-scheduler.js \
  --name "auto-stake" \
  --time \
  --log-date-format "YYYY-MM-DD HH:mm:ss" \
  -- --network bscMainnet

echo ""
echo "✅ 定时任务已启动！"
echo ""
echo "📊 查看状态: pm2 status"
echo "📋 查看日志: pm2 logs auto-stake"
echo "🛑 停止任务: pm2 stop auto-stake"
echo "🔄 重启任务: pm2 restart auto-stake"
echo "❌ 删除任务: pm2 delete auto-stake"
echo ""
