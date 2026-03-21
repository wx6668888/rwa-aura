# 后端启动指南

## 1. 配置环境变量
```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：
```env
# BSC 测试网
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# 合约地址（部署后填写）
STAKING_CONTRACT_ADDRESS=0x...
RWA_TOKEN_ADDRESS=0x...
USDT_TOKEN_ADDRESS=0x...

# 钱包私钥
BACKEND_PRIVATE_KEY=你的私钥
TREASURY_PRIVATE_KEY=你的私钥

# 数据库
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=rwa_protocol

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务端口
PORT=3001
```

## 2. 数据库初始化
```bash
mysql -u root -p
CREATE DATABASE rwa_protocol;
USE rwa_protocol;
source src/config/migrations/001_initial_schema.sql
source src/config/migrations/002_reward_logs.sql
```

## 3. 启动服务
```bash
npm install
npm run build
npm start
```

## 4. 验证运行
访问: http://localhost:3001/health

预期返回:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```
