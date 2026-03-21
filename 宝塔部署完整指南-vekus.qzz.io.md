# 宝塔部署完整指南 - vekus.qzz.io

## 📋 部署概览

本指南将帮助你将 RWA 质押平台部署到宝塔服务器,使用域名 **vekus.qzz.io**

## 🎯 部署架构

```
vekus.qzz.io (前端 - Next.js)
    ↓
api.vekus.qzz.io (后端 API - Node.js)
    ↓
MySQL 数据库
```

---

## 第一步: 服务器环境准备

### 1.1 登录宝塔面板

访问你的宝塔面板: `http://你的服务器IP:8888`

### 1.2 安装必要软件

在宝塔面板 → 软件商店,安装以下软件:

- ✅ **Nginx** (1.22+)
- ✅ **Node.js 版本管理器** (安装 Node.js 18.x 或 20.x)
- ✅ **MySQL** (5.7+ 或 8.0+) - **MySQL 5.7 完全支持!**
- ✅ **PM2 管理器** (用于进程管理)

> 💡 **注意**: 项目完全兼容 MySQL 5.7,无需升级到 8.0

### 1.3 创建数据库

1. 进入宝塔面板 → 数据库
2. 点击"添加数据库"
3. 填写信息:
   - 数据库名: `rwa_staking`
   - 用户名: `rwa_user`
   - 密码: 自动生成(记录下来)
   - 访问权限: 本地服务器

---

## 第二步: 上传项目文件

### 2.1 创建项目目录

在宝塔面板 → 文件,创建以下目录:

```
/www/wwwroot/vekus.qzz.io/          # 前端项目
/www/wwwroot/api.vekus.qzz.io/      # 后端项目
```

### 2.2 上传文件

#### 方法一: 使用宝塔文件管理器

1. 在本地打包项目:
   ```bash
   # 在项目根目录
   tar -czf frontend.tar.gz frontend/
   tar -czf backend.tar.gz backend/
   tar -czf contracts.tar.gz contracts/
   tar -czf scripts.tar.gz scripts/
   ```

2. 上传到服务器:
   - `frontend.tar.gz` → `/www/wwwroot/vekus.qzz.io/`
   - `backend.tar.gz` → `/www/wwwroot/api.vekus.qzz.io/`
   - `contracts.tar.gz` 和 `scripts.tar.gz` → `/www/wwwroot/`

3. 解压文件

#### 方法二: 使用 Git (推荐)

```bash
# SSH 登录服务器后
cd /www/wwwroot/
git clone <你的仓库地址> project
cd project
```

---

## 第三步: 配置后端服务

### 3.1 进入后端目录

```bash
cd /www/wwwroot/api.vekus.qzz.io/backend
```

### 3.2 创建环境变量文件

创建 `.env` 文件:

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=rwa_user
DB_PASSWORD=你的数据库密码
DB_NAME=rwa_staking

# 服务器配置
PORT=3002
NODE_ENV=production

# BSC 配置
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# 合约地址 (部署后填写)
STAKING_CONTRACT_ADDRESS=
RWA_TOKEN_ADDRESS=
USDT_ADDRESS=

# API 密钥 (可选)
API_SECRET_KEY=your-secret-key-here
```

### 3.3 安装依赖

```bash
npm install --production
```

### 3.4 初始化数据库

```bash
# 如果使用 MySQL 5.7,使用兼容版本
mysql -u rwa_user -p rwa_staking < src/config/database-mysql57.sql

# 如果使用 MySQL 8.0+,使用标准版本
# mysql -u rwa_user -p rwa_staking < src/config/database.sql
```

> 💡 **MySQL 5.7 用户**: 使用 `database-mysql57.sql` 文件,已针对 MySQL 5.7 优化

### 3.5 使用 PM2 启动后端

在宝塔面板 → PM2 管理器:

1. 点击"添加项目"
2. 填写信息:
   - 项目名称: `rwa-backend`
   - 启动文件: `/www/wwwroot/api.vekus.qzz.io/backend/src/index.ts`
   - 运行目录: `/www/wwwroot/api.vekus.qzz.io/backend`
   - 启动模式: `ts-node` 或 `node` (如果已编译)
3. 点击"提交"

---

## 第四步: 配置前端服务

### 4.1 进入前端目录

```bash
cd /www/wwwroot/vekus.qzz.io/frontend
```

### 4.2 创建环境变量文件

创建 `.env.production` 文件:

```bash
# API 地址
NEXT_PUBLIC_API_URL=https://api.vekus.qzz.io

# BSC 网络配置
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed1.binance.org

# 合约地址 (部署后填写)
NEXT_PUBLIC_STAKING_CONTRACT=
NEXT_PUBLIC_RWA_TOKEN=
NEXT_PUBLIC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955

# WalletConnect (可选)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

### 4.3 安装依赖并构建

```bash
npm install
npm run build
```

### 4.4 使用 PM2 启动前端

在宝塔面板 → PM2 管理器:

1. 点击"添加项目"
2. 填写信息:
   - 项目名称: `rwa-frontend`
   - 启动文件: `npm`
   - 运行参数: `start`
   - 运行目录: `/www/wwwroot/vekus.qzz.io/frontend`
3. 点击"提交"

---

## 第五步: 配置 Nginx 反向代理

### 5.1 配置前端域名

在宝塔面板 → 网站:

1. 点击"添加站点"
2. 填写信息:
   - 域名: `vekus.qzz.io`
   - 根目录: `/www/wwwroot/vekus.qzz.io/frontend`
   - PHP版本: 纯静态
3. 点击"提交"

4. 点击站点设置 → 配置文件,修改为:

```nginx
server {
    listen 80;
    server_name vekus.qzz.io;
    
    # 如果有 SSL 证书,自动跳转 HTTPS
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2 配置后端 API 域名

1. 点击"添加站点"
2. 填写信息:
   - 域名: `api.vekus.qzz.io`
   - 根目录: `/www/wwwroot/api.vekus.qzz.io`
   - PHP版本: 纯静态
3. 点击"提交"

4. 点击站点设置 → 配置文件,修改为:

```nginx
server {
    listen 80;
    server_name api.vekus.qzz.io;
    
    # 如果有 SSL 证书,自动跳转 HTTPS
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS 配置
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
    }
}
```

---

## 第六步: 配置 SSL 证书 (HTTPS)

### 6.1 申请免费 SSL 证书

在宝塔面板 → 网站 → 站点设置 → SSL:

1. 选择"Let's Encrypt"
2. 勾选域名: `vekus.qzz.io` 和 `www.vekus.qzz.io`
3. 点击"申请"

重复以上步骤为 `api.vekus.qzz.io` 申请证书

### 6.2 开启强制 HTTPS

在 SSL 设置页面,开启"强制 HTTPS"

---

## 第七步: 部署智能合约

### 7.1 在本地部署合约

```bash
# 在本地项目目录
cd contracts

# 部署到 BSC 主网
npx hardhat run scripts/deploy-all.ts --network bsc

# 或部署到 BSC 测试网
npx hardhat run scripts/deploy-all.ts --network bscTestnet
```

### 7.2 记录合约地址

部署完成后,记录以下地址:
- RWA Token: `0x...`
- Staking Contract: `0x...`
- Lottery Contract: `0x...`

### 7.3 更新环境变量

更新前端和后端的 `.env` 文件,填入合约地址

### 7.4 重启服务

```bash
# 在宝塔 PM2 管理器中
# 重启 rwa-frontend
# 重启 rwa-backend
```

---

## 第八步: 测试部署

### 8.1 检查服务状态

在宝塔面板 → PM2 管理器:
- ✅ rwa-frontend: 运行中
- ✅ rwa-backend: 运行中

### 8.2 访问网站

1. 前端: https://vekus.qzz.io
2. 后端 API: https://api.vekus.qzz.io/health

### 8.3 手机测试

1. 在手机浏览器访问: https://vekus.qzz.io
2. 连接 MetaMask 或 Trust Wallet
3. 测试质押功能

---

## 第九步: 性能优化

### 9.1 开启 Gzip 压缩

在宝塔面板 → 网站 → 站点设置 → 配置文件,添加:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 9.2 配置缓存

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 9.3 设置日志轮转

在宝塔面板 → 网站 → 站点设置 → 日志:
- 开启日志切割
- 保留天数: 7 天

---

## 第十步: 监控和维护

### 10.1 设置监控

在宝塔面板 → 监控:
- 开启服务器监控
- 设置告警通知

### 10.2 定期备份

在宝塔面板 → 计划任务:
1. 添加数据库备份任务 (每天凌晨 2 点)
2. 添加网站备份任务 (每周一次)

### 10.3 查看日志

```bash
# 前端日志
pm2 logs rwa-frontend

# 后端日志
pm2 logs rwa-backend

# Nginx 日志
tail -f /www/wwwroot/vekus.qzz.io/log/access.log
tail -f /www/wwwroot/vekus.qzz.io/log/error.log
```

---

## 🔧 常见问题排查

### 问题 1: 网站无法访问

**检查步骤:**
1. 检查 PM2 进程是否运行
2. 检查防火墙端口 (80, 443)
3. 检查域名 DNS 解析
4. 查看 Nginx 错误日志

### 问题 2: API 请求失败

**检查步骤:**
1. 检查后端服务是否运行
2. 检查数据库连接
3. 检查 CORS 配置
4. 查看后端日志

### 问题 3: 合约交互失败

**检查步骤:**
1. 确认合约地址正确
2. 确认网络配置 (BSC 主网/测试网)
3. 检查钱包连接
4. 确认有足够的 BNB 作为 Gas

---

## 📱 手机测试步骤

### 1. 安装钱包

- iOS: App Store 搜索 "MetaMask" 或 "Trust Wallet"
- Android: Google Play 搜索 "MetaMask" 或 "Trust Wallet"

### 2. 配置 BSC 网络

在钱包中添加 BSC 主网:
- 网络名称: BSC Mainnet
- RPC URL: https://bsc-dataseed1.binance.org
- Chain ID: 56
- 符号: BNB
- 区块浏览器: https://bscscan.com

### 3. 访问网站

在钱包内置浏览器中访问: https://vekus.qzz.io

### 4. 测试功能

- ✅ 连接钱包
- ✅ 查看余额
- ✅ 质押 USDT
- ✅ 查看收益
- ✅ 提现

---

## 🚀 快速命令参考

```bash
# 重启前端
pm2 restart rwa-frontend

# 重启后端
pm2 restart rwa-backend

# 查看日志
pm2 logs

# 重启 Nginx
nginx -s reload

# 查看端口占用
netstat -tlnp | grep 3001
netstat -tlnp | grep 3002
```

---

## 📞 技术支持

如遇到问题,请检查:
1. PM2 进程状态
2. Nginx 配置
3. 数据库连接
4. 合约地址配置
5. 环境变量设置

部署完成后,你的网站将在 **https://vekus.qzz.io** 上线!
