#!/bin/bash
# RWA Protocol Xshell部署脚本
# 使用方法：复制命令逐行执行，或保存为deploy.sh后执行

echo "=== RWA Protocol 部署脚本 ==="
echo ""

# 1. 检查环境
echo "1. 检查环境..."
node -v
npm -v
mysql --version
redis-cli --version
nginx -v

# 2. 克隆项目
echo ""
echo "2. 克隆项目到 /www/wwwroot/rwaprotocol.dpdns.org ..."
cd /www/wwwroot/rwaprotocol.dpdns.org
git clone https://github.com/wx6668888/rwa-aura.git .

# 3. 创建数据库
echo ""
echo "3. 创建数据库..."
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS rwa_protocol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'rwa_user'@'localhost' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 4. 配置后端环境变量
echo ""
echo "4. 配置后端..."
cd /www/wwwroot/rwaprotocol.dpdns.org/backend
cat > .env << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=rwa_user
DB_PASSWORD=你的数据库密码
DB_NAME=rwa_protocol

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# BSC主网配置
BSC_RPC_URL=https://bsc-dataseed.binance.org/
CHAIN_ID=56

# 合约地址
RWA_TOKEN_ADDRESS=0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812
STAKING_CONTRACT_ADDRESS=0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175
REFERRAL_REWARD_POOL_ADDRESS=0x5DC995e0B3662F8071001F9454FDcAD47D4A4151
USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
USDT_RWA_SWAP_ADDRESS=0xE6812B78091D64D983079B375c9afEfF9d2EB764
LOTTERY_CONTRACT_ADDRESS=0xD4Fce5360C56200ca299EF53E13904dAf1b1662c

# Relayer配置
RELAYER_PRIVATE_KEY=你的私钥
RELAYER_ADDRESS=0x08Ea66321c4dd47468c3aDc55d06c5De7129A292

# 服务端口
PORT=3001

# EventMonitor配置
EVENT_MONITOR_START_BLOCK=87244270
EOF

# 5. 配置前端环境变量
echo ""
echo "5. 配置前端..."
cd /www/wwwroot/rwaprotocol.dpdns.org/frontend
cat > .env.local << 'EOF'
# 后端API地址
NEXT_PUBLIC_RELAYER_URL=https://api.rwaprotocol.dpdns.org

# 主网合约地址
NEXT_PUBLIC_STAKING_CONTRACT_BSC=0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175
NEXT_PUBLIC_RWA_TOKEN_BSC=0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812
NEXT_PUBLIC_REFERRAL_REWARD_POOL_BSC=0x5DC995e0B3662F8071001F9454FDcAD47D4A4151

# WalletConnect配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的项目ID
EOF

# 6. 安装后端依赖
echo ""
echo "6. 安装后端依赖..."
cd /www/wwwroot/rwaprotocol.dpdns.org/backend
npm install

# 7. 安装前端依赖并构建
echo ""
echo "7. 安装前端依赖并构建..."
cd /www/wwwroot/rwaprotocol.dpdns.org/frontend
npm install
npm run build

# 8. 创建PM2配置
echo ""
echo "8. 创建PM2配置..."
cd /www/wwwroot/rwaprotocol.dpdns.org
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'rwa-backend',
      cwd: '/www/wwwroot/rwaprotocol.dpdns.org/backend',
      script: 'npm',
      args: 'run server',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'rwa-frontend',
      cwd: '/www/wwwroot/rwaprotocol.dpdns.org/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
}
EOF

# 9. 配置Nginx
echo ""
echo "9. 配置Nginx..."
cat > /etc/nginx/conf.d/rwaprotocol.conf << 'EOF'
# 主站配置
server {
    listen 80;
    server_name rwaprotocol.dpdns.org;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API配置
server {
    listen 80;
    server_name api.rwaprotocol.dpdns.org;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF

# 10. 测试Nginx配置
echo ""
echo "10. 测试Nginx配置..."
nginx -t

# 11. 重载Nginx
echo ""
echo "11. 重载Nginx..."
systemctl reload nginx

# 12. 启动PM2服务
echo ""
echo "12. 启动PM2服务..."
cd /www/wwwroot/rwaprotocol.dpdns.org
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "=== 部署完成！==="
echo ""
echo "访问："
echo "  主站: http://rwaprotocol.dpdns.org"
echo "  API:  http://api.rwaprotocol.dpdns.org"
echo ""
echo "查看服务状态："
echo "  pm2 status"
echo "  pm2 logs"
