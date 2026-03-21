# RWA Protocol 快速测试指南

**目标**: 快速配置本地环境并测试后端服务

---

## 🚀 快速开始（3 步）

### 步骤 1: 运行自动化测试脚本

```cmd
test-backend.bat
```

这个脚本会自动检查和配置所有必要的环境。

### 步骤 2: 初始化数据库

```cmd
cd backend
npm run migrate:up
```

### 步骤 3: 启动并测试

**启动后端服务**（窗口 1）:
```cmd
cd backend
npm run dev
```

**测试 API**（窗口 2）:
```cmd
cd backend
node test-api.js
```

---

## 📋 详细步骤

### 前置要求

需要安装以下软件：

1. **Node.js** (已安装 ✅)
2. **MySQL** (需要安装)
   - 下载: https://dev.mysql.com/downloads/mysql/
   - 安装后设置 root 密码

3. **Redis** (需要安装)
   - 下载: https://github.com/microsoftarchive/redis/releases
   - 安装后自动启动服务

### 配置步骤

#### 1. 配置 MySQL

打开 MySQL 命令行：
```cmd
mysql -u root -p
```

执行：
```sql
CREATE DATABASE rwa_protocol;
CREATE USER 'rwa_user'@'localhost' IDENTIFIED BY 'rwa_password_123';
GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 2. 配置环境变量

编辑 `.env` 文件（如果不存在，从 `.env.example` 复制）：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rwa_protocol
DB_USER=rwa_user
DB_PASSWORD=rwa_password_123

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# API 配置
PORT=3000
```

#### 3. 测试环境

```cmd
cd backend
node test-setup.js
```

如果看到 "🎉 所有测试通过！"，说明环境配置成功。

#### 4. 初始化数据库

```cmd
npm run migrate:up
```

#### 5. 启动服务

```cmd
npm run dev
```

成功启动后会看到：
```
============================================================
🚀 Backend service is running
============================================================

Service Status:
  HTTP Server: ✅ Running on port 3000
  Event Monitor: ✅ Running
  Scheduler: ✅ Running

API Endpoints:
  GET  /health
  GET  /api/user/:address
  GET  /api/stakes/:address
  ...
```

#### 6. 测试 API

打开新的命令行窗口：
```cmd
cd backend
node test-api.js
```

---

## 🧪 测试内容

### 合约测试 ✅
```cmd
npm test
```

**测试内容**:
- RWAToken 部署
- StakingContract 部署
- 基础功能验证

**结果**: 3/3 通过

### 环境测试 ⏳
```cmd
cd backend
node test-setup.js
```

**测试内容**:
- 环境变量检查
- 数据库连接
- Redis 连接

### API 测试 ⏳
```cmd
cd backend
node test-api.js
```

**测试内容**:
- 健康检查
- 用户信息查询
- 质押历史查询
- 收益明细查询
- 推荐关系查询
- 节点等级历史查询
- 全局统计查询

---

## 📁 测试文件说明

| 文件 | 用途 |
|------|------|
| `test-backend.bat` | Windows 自动化测试脚本 |
| `backend/test-setup.js` | 环境配置测试 |
| `backend/test-api.js` | API 端点测试 |
| `test/BasicTest.test.ts` | 合约单元测试 |
| `LOCAL_TEST_SETUP.md` | 详细配置指南 |
| `TEST_RESULTS.md` | 测试结果报告 |

---

## ❓ 常见问题

### Q1: MySQL 连接失败？

**检查**:
```cmd
mysql -u rwa_user -p rwa_protocol
```

如果失败，重新创建用户和数据库。

### Q2: Redis 连接失败？

**检查**:
```cmd
redis-cli ping
```

如果返回 `PONG`，说明 Redis 正常。

如果失败，启动 Redis：
```cmd
redis-server
```

### Q3: 端口 3000 被占用？

**解决**:
1. 修改 `.env` 中的 `PORT=3001`
2. 或关闭占用端口的程序

### Q4: 数据库没有表？

**解决**:
```cmd
cd backend
npm run migrate:up
```

---

## ✅ 成功标志

当你看到以下输出时，说明一切正常：

**环境测试**:
```
🎉 所有测试通过！可以启动后端服务了
```

**后端服务**:
```
🚀 Backend service is running
```

**API 测试**:
```
🎉 所有测试通过！
```

---

## 🎯 下一步

环境配置完成后，可以：

1. **本地开发**: 修改代码并测试
2. **测试网部署**: 部署到 BSC Testnet
3. **前端开发**: 开始实现用户界面
4. **集成测试**: 完整的端到端测试

---

**需要帮助？**

查看详细文档：
- `LOCAL_TEST_SETUP.md` - 详细配置步骤
- `DEPLOYMENT_GUIDE.md` - 部署指南
- `OPERATIONS_MANUAL.md` - 运维手册
- `backend/API_DOCUMENTATION.md` - API 文档

---

**更新时间**: 2026-02-26
