#!/bin/bash
# RWA Protocol 部署脚本 - 第四步
# PM2配置和启动

set -e

PROJECT_DIR="/www/wwwroot/rwa-protocol"

echo "=========================================="
echo "配置PM2"
echo "=========================================="

# 创建PM2配置文件
cat > $PROJECT_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: 'rwa-backend',
      cwd: '$PROJECT_DIR/backend',
      script: 'npx',
      args: 'ts-node src/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'rwa-frontend',
      cwd: '$PROJECT_DIR/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

echo "PM2配置文件创建成功"

echo ""
echo "启动服务："
echo "  cd $PROJECT_DIR"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo "请继续执行 deploy-step5.sh 配置Nginx"
