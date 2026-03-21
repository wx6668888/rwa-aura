#!/bin/bash
# RWA Protocol 部署脚本 - 第三步
# 安装依赖和构建

set -e

PROJECT_DIR="/www/wwwroot/rwa-protocol"
cd $PROJECT_DIR

echo "=========================================="
echo "安装依赖"
echo "=========================================="

echo "1. 安装后端依赖..."
cd backend
npm install --production
echo "后端依赖安装完成"

echo "2. 安装前端依赖..."
cd ../frontend
npm install
echo "前端依赖安装完成"

echo "3. 构建前端..."
npm run build
echo "前端构建完成"

echo ""
echo "请继续执行 deploy-step4.sh"
