# RWA Protocol 部署指南

**版本**: 1.0.0  
**更新时间**: 2026-02-26

---

## 目录

1. [部署前准备](#部署前准备)
2. [本地开发环境部署](#本地开发环境部署)
3. [BSC Testnet 部署](#bsc-testnet-部署)
4. [BSC Mainnet 部署](#bsc-mainnet-部署)
5. [后端服务部署](#后端服务部署)
6. [监控和维护](#监控和维护)
7. [故障排查](#故障排查)

---

## 部署前准备

### 1. 环境要求

**开发环境**:
- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Git

**服务器环境**（生产环境）:
- Ubuntu 20.04 LTS 或更高版本
- 4 核 CPU
- 8GB RAM
- 100GB SSD
- Nginx
- PM2

### 2. 准备钱包和资金

**需要的钱包**:
1. **部署者钱包**: 用于部署合约（需要 BNB 作为 Gas）
2. **Treasury 钱包**: 接收 50% 质押资金（建议使用 Gnosis Safe 多签）
3. **Liquidity Fund 钱包**: 接收 5% 交易税
4. **Backend 钱包**: 后端服务调用合约（需要少量 BNB）
5. **Market Maker 钱包**: 做市机器人（需要 USDT）

**资金需求**:
- **Testnet**: 
  - 部署者: 0.5 BNB（测试网）
  - Backend: 0.1 BNB（测试网）
  - 从水龙头获取: https://testnet.binance.org/faucet-smart

- **Mainnet**:
  - 部署者: 0.5 BNB
  - Backend: 1 BNB
  - Market Maker: 500 USDT

### 3. 克隆项目

```bash
git clone https://github.com/your-org/rwa-protocol.git
cd rwa-protocol
```

### 4. 安装依赖

```bash
# 安装根目录依赖（Hardhat）
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

---

## 本地开发环境部署

### 1. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# Network Configuration
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NETWORK=testnet

# Private Keys
PRIVATE_KEY=your_deployer_private_key_here
BACKEND_PRIVATE_KEY=your_backend_private_key_here

# Contract Addresses (will be filled after deployment)
RWA_TOKEN_ADDRESS=
STAKING_CONTRACT_ADDRESS=
TREASURY_ADDRESS=your_treasury_address_here
LIQUIDITY_FUND_ADDRESS=your_liquidity_fund_address_here

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rwa_protocol
DB_USER=rwa_user
DB_PASSWORD=your_strong_password_here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# USDT Token Address (BSC Testnet)
USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
```

### 2. 启动本地数据库

**MySQL**:

```bash
# 安装 MySQL
sudo apt-get install mysql-server

# 创建数据库和用户
mysql -u root -p

CREATE DATABASE rwa_protocol;
CREATE USER 'rwa_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Redis**:

```bash
# 安装 Redis
sudo apt-get install redis-server

# 启动 Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### 3. 初始化数据库

```bash
cd backend
npm run migrate:up
```

### 4. 编译合约

```bash
npm run compile
```

### 5. 运行测试

```bash
npm test
```

---

## BSC Testnet 部署

### 1. 获取测试网 BNB

访问 BSC 测试网水龙头：https://testnet.binance.org/faucet-smart

### 2. 部署合约

```bash
# 部署所有合约
npx hardhat run scripts/deploy-all.ts --network bscTestnet
```

部署脚本会输出：

```
============================================================
RWA Protocol - 完整部署脚本
============================================================

部署账户: 0x1234...
账户余额: 0.5 BNB

配置地址:
  Treasury: 0xabcd...
  Liquidity Fund: 0xefgh...
  Backend: 0xijkl...
  USDT: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

1. 部署 RWAToken...
✅ RWAToken 部署成功: 0x1111...

2. 部署 StakingContract...
✅ StakingContract 部署成功: 0x2222...

3. 配置白名单...
✅ StakingContract 已添加到白名单

============================================================
部署完成！
============================================================

合约地址:
  RWAToken: 0x1111...
  StakingContract: 0x2222...

请将以下地址添加到 .env 文件:
RWA_TOKEN_ADDRESS=0x1111...
STAKING_CONTRACT_ADDRESS=0x2222...
```

### 3. 更新 .env 文件

将部署输出的合约地址添加到 `.env` 文件：

```bash
RWA_TOKEN_ADDRESS=0x1111...
STAKING_CONTRACT_ADDRESS=0x2222...
```

### 4. 在 PancakeSwap Testnet 创建交易对

访问 PancakeSwap Testnet: https://pancake.kiemtienonline360.com/

1. 连接钱包
2. 添加 RWA Token（使用合约地址）
3. 创建 RWA/USDT 交易对
4. 添加初始流动性（例如：1000 RWA + 1000 USDT）

### 5. 设置 PancakeSwap Pair 地址

```bash
npx hardhat run scripts/set-pancakeswap-pair.ts --network bscTestnet
```

### 6. 验证合约（可选）

```bash
# 验证 RWAToken
npx hardhat verify --network bscTestnet <RWA_TOKEN_ADDRESS> <TREASURY_ADDRESS> <LIQUIDITY_FUND_ADDRESS>

# 验证 StakingContract
npx hardhat verify --network bscTestnet <STAKING_CONTRACT_ADDRESS> <USDT_ADDRESS> <RWA_TOKEN_ADDRESS> <TREASURY_ADDRESS> <BACKEND_ADDRESS>
```

### 7. 启动后端服务

```bash
cd backend
npm run dev
```

检查服务状态：

```bash
curl http://localhost:3000/health
```

### 8. 测试完整流程

1. **质押测试**:
   - 授权 USDT: `approve(stakingContract, amount)`
   - 质押: `stake(amount, referrer)`
   - 检查事件: `StakeEvent`

2. **收益测试**:
   - 等待后端处理事件
   - 查询用户信息: `GET /api/user/:address`
   - 查询收益明细: `GET /api/rewards/:address`

3. **提现测试**:
   - 等待 24 小时冷却时间
   - 提现: `withdraw(amount)`
   - 检查余额变化

---

## BSC Mainnet 部署

### ⚠️ 警告

主网部署前，请确保：

1. ✅ 所有测试网测试通过
2. ✅ 代码经过安全审计
3. ✅ 准备好足够的资金
4. ✅ 配置好多签钱包（Treasury）
5. ✅ 配置好时间锁（敏感操作）
6. ✅ 准备好监控和告警系统

### 1. 部署 Gnosis Safe 多签钱包

访问 Gnosis Safe: https://gnosis-safe.io/

配置：
- 签名者数量: 3
- 确认阈值: 2（2/3 多签）
- 签名者地址: 
  - 0xSigner1...
  - 0xSigner2...
  - 0xSigner3...

### 2. 部署 TimeLockController

```bash
npx hardhat run scripts/deploy-timelock.ts --network bscMainnet
```

配置：
- 延迟时间: 48 小时
- 提议者: Gnosis Safe 地址
- 执行者: Gnosis Safe 地址

### 3. 更新 .env 文件

```bash
# Network Configuration
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
NETWORK=mainnet

# Private Keys
PRIVATE_KEY=your_deployer_private_key_here
BACKEND_PRIVATE_KEY=your_backend_private_key_here

# Contract Addresses
TREASURY_ADDRESS=<GNOSIS_SAFE_ADDRESS>
LIQUIDITY_FUND_ADDRESS=<LIQUIDITY_FUND_ADDRESS>

# USDT Token Address (BSC Mainnet)
USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955

# PancakeSwap Router (BSC Mainnet)
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E
```

### 4. 部署合约

```bash
npx hardhat run scripts/deploy-all.ts --network bscMainnet
```

### 5. 在 PancakeSwap 创建交易对

访问 PancakeSwap: https://pancakeswap.finance/

1. 连接钱包
2. 添加 RWA Token
3. 创建 RWA/USDT 交易对
4. 添加初始流动性（建议：10000 RWA + 10000 USDT）

### 6. 设置 PancakeSwap Pair 地址

```bash
npx hardhat run scripts/set-pancakeswap-pair.ts --network bscMainnet
```

### 7. 验证合约

```bash
npx hardhat verify --network bscMainnet <RWA_TOKEN_ADDRESS> <TREASURY_ADDRESS> <LIQUIDITY_FUND_ADDRESS>
npx hardhat verify --network bscMainnet <STAKING_CONTRACT_ADDRESS> <USDT_ADDRESS> <RWA_TOKEN_ADDRESS> <TREASURY_ADDRESS> <BACKEND_ADDRESS>
```

---

## 后端服务部署

### 1. 服务器准备

**安装依赖**:

```bash
# 更新系统
sudo apt-get update
sudo apt-get upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 MySQL
sudo apt-get install -y mysql-server

# 安装 Redis
sudo apt-get install -y redis-server

# 安装 Nginx
sudo apt-get install -y nginx

# 安装 PM2
sudo npm install -g pm2
```

### 2. 配置数据库

```bash
# 创建数据库
mysql -u root -p

CREATE DATABASE rwa_protocol;
CREATE USER 'rwa_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 部署后端代码

```bash
# 克隆代码
cd /var/www
git clone https://github.com/your-org/rwa-protocol.git
cd rwa-protocol/backend

# 安装依赖
npm install

# 配置环境变量
cp ../.env.example .env
nano .env

# 初始化数据库
npm run migrate:up

# 编译 TypeScript
npm run build
```

### 4. 配置 PM2

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'rwa-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
```

启动服务：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 配置 Nginx

创建 `/etc/nginx/sites-available/rwa-api`:

```nginx
server {
    listen 80;
    server_name api.rwa-protocol.com;

    location / {
        proxy_pass http://localhost:3000;
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
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/rwa-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 配置 SSL（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.rwa-protocol.com

# 自动续期
sudo certbot renew --dry-run
```

### 7. 配置防火墙

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许 SSH
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

---

## 监控和维护

### 1. 日志监控

**查看 PM2 日志**:

```bash
pm2 logs rwa-backend
pm2 logs rwa-backend --lines 100
```

**查看应用日志**:

```bash
tail -f /var/www/rwa-protocol/backend/logs/combined.log
tail -f /var/www/rwa-protocol/backend/logs/error.log
```

### 2. 性能监控

**PM2 监控**:

```bash
pm2 monit
```

**系统资源监控**:

```bash
# CPU 和内存
htop

# 磁盘使用
df -h

# 网络连接
netstat -an | grep 3000
```

### 3. 数据库监控

```bash
# 连接数
mysql -u root -p -e "SHOW PROCESSLIST;"

# 数据库大小
mysql -u root -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.TABLES GROUP BY table_schema;"

# 慢查询
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query%';"
```

### 4. 备份策略

**数据库备份**:

创建备份脚本 `/var/www/rwa-protocol/scripts/backup-db.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/rwa-protocol"
mkdir -p $BACKUP_DIR

mysqldump -u rwa_user -p'your_password' rwa_protocol | gzip > $BACKUP_DIR/rwa_protocol_$DATE.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -name "rwa_protocol_*.sql.gz" -mtime +7 -delete
```

配置定时任务：

```bash
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /var/www/rwa-protocol/scripts/backup-db.sh
```

### 5. 告警配置

**配置 Telegram Bot**:

1. 创建 Telegram Bot: https://t.me/BotFather
2. 获取 Bot Token
3. 获取 Chat ID
4. 更新 `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
ALERT_ENABLED=true
```

---

## 故障排查

### 1. 合约部署失败

**问题**: Gas 不足

```
Error: insufficient funds for gas * price + value
```

**解决**:
- 检查部署账户余额
- 增加 Gas Limit: `hardhat.config.ts` 中设置 `gas: 8000000`

---

### 2. 后端服务无法启动

**问题**: 数据库连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决**:
- 检查 MySQL 是否运行: `sudo systemctl status mysql`
- 检查数据库配置: `.env` 中的 `DB_*` 变量
- 检查防火墙规则

---

### 3. 事件监听不工作

**问题**: RPC 节点连接失败

```
Error: could not detect network
```

**解决**:
- 检查 RPC URL: `.env` 中的 `BSC_RPC_URL`
- 尝试其他 RPC 节点:
  - https://bsc-dataseed1.binance.org/
  - https://bsc-dataseed2.binance.org/
  - https://bsc-dataseed3.binance.org/

---

### 4. API 请求失败

**问题**: CORS 错误

```
Access to fetch at 'http://api.rwa-protocol.com' from origin 'http://localhost:3001' has been blocked by CORS policy
```

**解决**:
- 更新 `.env`: `CORS_ORIGIN=http://localhost:3001`
- 或允许所有来源（仅开发环境）: `CORS_ORIGIN=*`

---

### 5. 价格预言机失败

**问题**: Redis 连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解决**:
- 检查 Redis 是否运行: `sudo systemctl status redis`
- 检查 Redis 配置: `.env` 中的 `REDIS_*` 变量

---

## 安全检查清单

部署前请确认：

- [ ] 所有私钥已安全存储（不要提交到 Git）
- [ ] Treasury 使用多签钱包（Gnosis Safe）
- [ ] 敏感操作挂载时间锁（48 小时）
- [ ] 合约已通过安全审计
- [ ] 数据库使用强密码
- [ ] 服务器配置防火墙
- [ ] 启用 HTTPS（SSL 证书）
- [ ] 配置速率限制（防止 DDoS）
- [ ] 配置日志轮转（防止磁盘满）
- [ ] 配置监控和告警
- [ ] 配置自动备份
- [ ] 准备应急预案

---

## 联系方式

如有问题，请联系：
- 技术支持: support@rwa-protocol.com
- Telegram: https://t.me/rwa_protocol
- Discord: https://discord.gg/rwa_protocol

---

**版本历史**:
- v1.0.0 (2026-02-26): 初始版本

