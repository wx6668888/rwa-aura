# RWA Protocol 宝塔部署完整教程

## 📋 目录
1. [环境准备](#环境准备)
2. [项目上传](#项目上传)
3. [数据库配置](#数据库配置)
4. [环境变量配置](#环境变量配置)
5. [依赖安装和构建](#依赖安装和构建)
6. [PM2进程管理](#pm2进程管理)
7. [Nginx反向代理](#nginx反向代理)
8. [域名和SSL配置](#域名和ssl配置)
9. [常见问题排查](#常见问题排查)

---

## 环境准备

### 1. 安装必要软件

在宝塔面板 → 软件商店，安装以下软件：

- **Node.js 18.x** 或更高版本
- **MySQL 5.7** 或 **8.0**
- **Redis 7.x**
- **Nginx 1.20+**
- **PM2管理器**

### 2. 服务器要求

- **操作系统**：Linux（推荐Ubuntu 20.04+或CentOS 7+）
- **内存**：至少2GB（推荐4GB+）
- **硬盘**：至少20GB可用空间
- **带宽**：至少5Mbps

---

## 项目上传

### 方式1：Git克隆（推荐）

1. SSH连接到服务器
2. 执行以下命令：

```bash
cd /www/wwwroot
git clone https://github.com/wx6668888/rwa-aura.git rwa-protocol
cd rwa-protocol
```

### 方式2：手动上传

1. 在本地压缩项目为 `rwa-protocol.zip`
2. 通过宝塔面板 → 文件 → 上传
3. 上传到 `/www/wwwroot/`
4. 解压文件

---

## 数据库配置

### 1. 创建MySQL数据库

在宝塔面板 → 数据库 → 添加数据库：

- **数据库名**：`rwa_protocol`
- **用户名**：`rwa_user`
- **密码**：设置强密码（记住这个密码）
- **权限**：所有权限

### 2. 导入数据库结构

如果有SQL文件，执行：

```bash
mysql -u rwa_user -p rwa_protocol < /path/to/database.sql
```

或者通过宝塔面板 → 数据库 → 导入。

### 3. 配置Redis

Redis通常安装后即可使用，默认端口6379。

---

## 环境变量配置

### 1. 后端配置

编辑 `/www/wwwroot/rwa-protocol/backend/.env`：

```bash
cd /www/wwwroot/rwa-protocol/backend
nano .env
```

配置内容：

```env
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

# 合约地址（主网）
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
```

保存并退出（Ctrl+X，然后Y，然后Enter）。

### 2. 前端配置

编辑 `/www/wwwroot/rwa-protocol/frontend/.env.local`：

```bash
cd /www/wwwroot/rwa-protocol/frontend
nano .env.local
```

配置内容：

```env
# 后端API地址（使用你的域名）
NEXT_PUBLIC_RELAYER_URL=https://api.你的域名.com

# 主网合约地址
NEXT_PUBLIC_STAKING_CONTRACT_BSC=0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175
NEXT_PUBLIC_RWA_TOKEN_BSC=0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812
NEXT_PUBLIC_REFERRAL_REWARD_POOL_BSC=0x5DC995e0B3662F8071001F9454FDcAD47D4A4151

# WalletConnect配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的项目ID
```

保存并退出。

---

## 依赖安装和构建

### 1. 安装后端依赖

```bash
cd /www/wwwroot/rwa-protocol/backend
npm install --production
```

### 2. 安装前端依赖并构建

```bash
cd /www/wwwroot/rwa-protocol/frontend
npm install
npm run build
```

构建过程可能需要5-10分钟，请耐心等待。

---

## PM2进程管理

### 1. 创建PM2配置文件

在项目根目录创建 `ecosystem.config.js`：

```bash
cd /www/wwwroot/rwa-protocol
nano ecosystem.config.js
```

配置内容：

```javascript
module.exports = {
  apps: [
    {
      name: 'rwa-backend',
      cwd: '/www/wwwroot/rwa-protocol/backend',
      script: 'npm',
      args: 'run server',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/www/wwwroot/rwa-protocol/logs/backend-error.log',
      out_file: '/www/wwwroot/rwa-protocol/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'rwa-frontend',
      cwd: '/www/wwwroot/rwa-protocol/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/www/wwwroot/rwa-protocol/logs/frontend-error.log',
      out_file: '/www/wwwroot/rwa-protocol/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
```

### 2. 创建日志目录

```bash
mkdir -p /www/wwwroot/rwa-protocol/logs
```

### 3. 启动服务

```bash
cd /www/wwwroot/rwa-protocol
pm2 start ecosystem.config.js
```

### 4. 保存PM2配置

```bash
pm2 save
pm2 startup
```

执行 `pm2 startup` 后，会输出一条命令，复制并执行该命令以设置开机自启。

### 5. 查看服务状态

```bash
pm2 status
pm2 logs rwa-backend
pm2 logs rwa-frontend
```

---

## Nginx反向代理

### 1. 配置前端（主域名）

在宝塔面板 → 网站 → 添加站点：

- **域名**：`www.你的域名.com`
- **根目录**：`/www/wwwroot/rwa-protocol/frontend`
- **PHP版本**：纯静态

添加后，点击"设置" → "反向代理" → "添加反向代理"：

- **代理名称**：`rwa-frontend`
- **目标URL**：`http://127.0.0.1:3000`
- **发送域名**：`$host`

配置内容：

```nginx
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
```

### 2. 配置后端API（子域名）

在宝塔面板 → 网站 → 添加站点：

- **域名**：`api.你的域名.com`
- **根目录**：`/www/wwwroot/rwa-protocol/backend`
- **PHP版本**：纯静态

添加后，点击"设置" → "反向代理" → "添加反向代理"：

- **代理名称**：`rwa-backend`
- **目标URL**：`http://127.0.0.1:3001`
- **发送域名**：`$host`

配置内容：

```nginx
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
    
    # CORS配置
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization' always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

---

## 域名和SSL配置

### 1. 域名解析

在域名服务商处添加DNS记录：

- **主域名**：`www.你的域名.com` → A记录 → 服务器IP
- **API域名**：`api.你的域名.com` → A记录 → 服务器IP

### 2. 申请SSL证书

在宝塔面板 → 网站 → 设置 → SSL：

1. 选择"Let's Encrypt"
2. 勾选域名
3. 点击"申请"

等待证书申请成功后，开启"强制HTTPS"。

对两个域名（主域名和API域名）都执行此操作。

---

## 常见问题排查

### 1. 服务无法启动

**检查日志**：
```bash
pm2 logs rwa-backend
pm2 logs rwa-frontend
```

**常见原因**：
- 端口被占用：`netstat -tunlp | grep 3001`
- 环境变量配置错误
- 数据库连接失败

### 2. 前端无法访问后端API

**检查**：
- 后端服务是否运行：`pm2 status`
- Nginx配置是否正确
- 防火墙是否开放端口：`firewall-cmd --list-ports`
- CORS配置是否正确

### 3. 数据库连接失败

**检查**：
- MySQL服务是否运行：`systemctl status mysql`
- 数据库用户名密码是否正确
- 数据库是否存在：`mysql -u root -p -e "SHOW DATABASES;"`

### 4. EventMonitor速率限制

**解决方案**：
- 配置多个RPC节点（见前面的教程）
- 使用付费RPC服务
- 增加轮询间隔

### 5. 内存不足

**优化**：
```bash
# 增加swap空间
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 部署后检查清单

- [ ] 后端服务运行正常（`pm2 status`）
- [ ] 前端服务运行正常（`pm2 status`）
- [ ] 数据库连接成功
- [ ] Redis连接成功
- [ ] EventMonitor正常运行
- [ ] 前端可以访问（https://www.你的域名.com）
- [ ] 后端API可以访问（https://api.你的域名.com/health）
- [ ] SSL证书已配置
- [ ] 防火墙规则已配置
- [ ] PM2开机自启已设置

---

## 维护命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs rwa-backend
pm2 logs rwa-frontend

# 重启服务
pm2 restart rwa-backend
pm2 restart rwa-frontend

# 停止服务
pm2 stop rwa-backend
pm2 stop rwa-frontend

# 更新代码
cd /www/wwwroot/rwa-protocol
git pull
cd frontend && npm run build
pm2 restart all

# 查看数据库
mysql -u rwa_user -p rwa_protocol

# 备份数据库
mysqldump -u rwa_user -p rwa_protocol > backup_$(date +%Y%m%d).sql
```

---

## 安全建议

1. **定期更新系统**：`apt update && apt upgrade`
2. **配置防火墙**：只开放必要端口（80, 443, 22）
3. **使用强密码**：数据库、SSH等
4. **定期备份**：数据库、代码、配置文件
5. **监控日志**：定期检查错误日志
6. **限制SSH访问**：使用密钥登录，禁用密码登录

---

## 联系支持

如果遇到问题，请检查：
1. 服务日志（`pm2 logs`）
2. Nginx错误日志（`/www/wwwroot/logs/`）
3. 系统日志（`/var/log/`）

---

**部署完成！** 🎉

访问 https://www.你的域名.com 开始使用RWA Protocol！
