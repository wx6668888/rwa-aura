# 本地测试环境配置指南

**系统**: Windows  
**目标**: 配置并测试后端服务

---

## 步骤 1: 安装必要软件

### 1.1 安装 MySQL

**下载地址**: https://dev.mysql.com/downloads/mysql/

**安装步骤**:
1. 下载 MySQL Installer for Windows
2. 选择 "Developer Default" 安装类型
3. 设置 root 密码（记住这个密码）
4. 完成安装

**验证安装**:
```cmd
mysql --version
```

### 1.2 安装 Redis

**下载地址**: https://github.com/microsoftarchive/redis/releases

**安装步骤**:
1. 下载 Redis-x64-xxx.msi
2. 运行安装程序
3. 选择默认端口 6379
4. 完成安装

**验证安装**:
```cmd
redis-cli ping
```
应该返回 `PONG`

---

## 步骤 2: 配置数据库

### 2.1 创建数据库和用户

打开 MySQL 命令行：

```cmd
mysql -u root -p
```

执行以下 SQL：

```sql
-- 创建数据库
CREATE DATABASE rwa_protocol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'rwa_user'@'localhost' IDENTIFIED BY 'rwa_password_123';

-- 授权
GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 2.2 验证数据库连接

```cmd
mysql -u rwa_user -p rwa_protocol
```

输入密码 `rwa_password_123`，如果能登录说明配置成功。

---

## 步骤 3: 配置环境变量

### 3.1 创建 .env 文件

在项目根目录创建 `.env` 文件（如果不存在）：

```bash
# Network Configuration
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
NETWORK=testnet

# Private Keys (测试用)
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
BACKEND_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000002

# Contract Addresses (测试用，暂时留空)
RWA_TOKEN_ADDRESS=
STAKING_CONTRACT_ADDRESS=
TREASURY_ADDRESS=
LIQUIDITY_FUND_ADDRESS=

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rwa_protocol
DB_USER=rwa_user
DB_PASSWORD=rwa_password_123

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Price Oracle Configuration
PRICE_ORACLE_CACHE_TTL=300
PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E
USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# Backend API Configuration
PORT=3000
CORS_ORIGIN=*

# Event Monitor Configuration
CONFIRMATION_BLOCKS=12
POLL_INTERVAL=5000

# Logging
LOG_LEVEL=info

# Reward Calculation
MAX_REWARD_PER_CALL=10000000000000000000000
DAILY_YIELD_RATE=0.008
```

---

## 步骤 4: 安装后端依赖

```cmd
cd backend
npm install
```

---

## 步骤 5: 初始化数据库

```cmd
cd backend
npm run migrate:up
```

如果成功，你会看到：
```
✅ Database migration completed successfully
```

---

## 步骤 6: 测试数据库连接

创建测试脚本来验证数据库连接。

---

## 步骤 7: 启动后端服务

```cmd
cd backend
npm run dev
```

如果成功，你会看到：
```
============================================================
RWA Protocol Backend Service
============================================================

✅ Database connected
✅ Redis connected
✅ HTTP server listening on port 3000
✅ Event monitor started
✅ Scheduler started

🚀 Backend service is running
```

---

## 步骤 8: 测试 API 端点

打开新的命令行窗口，测试 API：

```cmd
# 测试健康检查
curl http://localhost:3000/health

# 测试全局统计
curl http://localhost:3000/api/stats/global
```

---

## 常见问题

### 问题 1: MySQL 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决**:
1. 检查 MySQL 服务是否运行
2. 检查 .env 中的数据库配置
3. 验证用户名和密码

### 问题 2: Redis 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决**:
1. 检查 Redis 服务是否运行
2. 在命令行运行 `redis-server` 启动 Redis

### 问题 3: 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决**:
1. 更改 .env 中的 PORT 为其他端口（如 3001）
2. 或者关闭占用 3000 端口的程序

---

## 下一步

配置完成后，可以：
1. 运行完整的 API 测试
2. 部署合约到本地 Hardhat 网络
3. 测试完整的质押流程
4. 准备测试网部署

