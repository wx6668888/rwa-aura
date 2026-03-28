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
RWA_TOKEN_ADDRESS=0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6
STAKING_CONTRACT_ADDRESS=0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99
REFERRAL_REWARD_POOL_ADDRESS=0x80748B89042Ee30953E55856Cac473D1126720A6
USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
USDT_RWA_SWAP_ADDRESS=0x485a3bba1EB07680E418846ba412f1BB1E65F7a1
LOTTERY_CONTRACT_ADDRESS=0x82D475812BE018BF113c6815783DFa6d6658Ff88

# Relayer配置
RELAYER_PRIVATE_KEY=你的私钥
RELAYER_ADDRESS=0x8927e74e0fCaED1D4C87116C805464800651f222

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
NEXT_PUBLIC_STAKING_CONTRACT_BSC=0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99
NEXT_PUBLIC_RWA_TOKEN_BSC=0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6
NEXT_PUBLIC_REFERRAL_REWARD_POOL_BSC=0x80748B89042Ee30953E55856Cac473D1126720A6

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
