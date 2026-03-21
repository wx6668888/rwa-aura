#!/bin/bash
# 快速启动测试环境

echo "========== RWA 测试环境启动 =========="

# 1. 检查 Node.js
echo "1. 检查 Node.js..."
node --version || { echo "请先安装 Node.js"; exit 1; }

# 2. 启动后端
echo -e "\n2. 启动后端..."
cd backend
npm start &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

# 3. 等待后端就绪
echo -e "\n3. 等待后端就绪..."
sleep 5

# 4. 启动前端
echo -e "\n4. 启动前端..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "前端 PID: $FRONTEND_PID"

echo -e "\n========== 启动完成 =========="
echo "前端: http://localhost:3000"
echo "后端: http://localhost:3001"
echo -e "\n按 Ctrl+C 停止服务"

# 等待
wait
