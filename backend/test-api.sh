#!/bin/bash
# 快速测试脚本

echo "🧪 测试后端服务..."

# 1. 测试健康检查
echo "1️⃣ 健康检查"
curl -s http://localhost:3001/health | jq

# 2. 测试奖励统计
echo -e "\n2️⃣ 奖励统计"
curl -s "http://localhost:3001/api/monitoring/stats/rewards?hours=24" | jq

# 3. 测试奖励日志
echo -e "\n3️⃣ 最近奖励日志"
curl -s "http://localhost:3001/api/monitoring/logs/rewards?limit=5" | jq

# 4. 测试国库日志
echo -e "\n4️⃣ 国库补充日志"
curl -s "http://localhost:3001/api/monitoring/logs/treasury?limit=5" | jq

echo -e "\n✅ 测试完成"
