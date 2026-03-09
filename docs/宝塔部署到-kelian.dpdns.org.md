# 将网站部署到宝塔服务器（kelian.dpdns.org）

本文档说明如何在宝塔面板上，把本项目部署到域名 **kelian.dpdns.org**。

---

## 仅部署前端（不用后台）— 快速步骤

若你**暂时不用后台**，只部署前端用于查看页面，按下面做即可。

### 1. 宝塔与域名

- 安装 **Nginx**、**Node 版本管理**（或 PM2）。Node 建议 18+。
- 域名 **kelian.dpdns.org** 的 A 记录指向服务器 IP。
- 宝塔 → **网站** → **添加站点**，域名填 `kelian.dpdns.org`，根目录例如：`/www/wwwroot/kelian.dpdns.org`。

### 2. 只上传/构建前端

**方式 A：本地上传**

```bash
cd frontend
npm ci
npm run build
```

上传到服务器时，**不必上传整个 frontend**，只传下面「前端必须上传清单」里的内容即可；**不要上传 `node_modules`**，到服务器后再执行 `npm ci` 安装依赖。

**方式 B：服务器上拉代码**

```bash
cd /www/wwwroot/kelian.dpdns.org
git clone <你的仓库地址> .
cd frontend
npm ci
npm run build
```

### 3. 前端环境变量（可选）

不接后台时，可以不配 `NEXT_PUBLIC_API_URL`（页面里调用接口会走默认或报错，但不影响纯页面浏览）。若需要接链上（钱包、合约）或**提交欧易 DApp 审核**，在 `frontend` 目录建 `.env.production`：

```env
# 生产 DApp 域名（欧易审核、分享链接、Open Graph 使用）
NEXT_PUBLIC_APP_URL=https://kelian.dpdns.org
# 后端 API（与站点同域时填）
NEXT_PUBLIC_API_URL=https://kelian.dpdns.org/api
# 链与合约
NEXT_PUBLIC_CHAIN=testnet
# NEXT_PUBLIC_STAKING_CONTRACT_TESTNET=...
# NEXT_PUBLIC_RWA_TOKEN_TESTNET=...
# WalletConnect（必配，否则移动端/钱包内连接异常）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的项目ID
```

### 4. 用 PM2 启动前端

```bash
npm install -g pm2
cd /www/wwwroot/kelian.dpdns.org/frontend
pm2 start npm --name rwa-frontend -- start
pm2 save
pm2 startup
```

确认：`curl http://127.0.0.1:3000` 能打开页面。

### 5. Nginx 只反代前端

在宝塔里找到 **kelian.dpdns.org** 的站点 → **设置** → **配置文件**，在 `server { ... }` 里配置（或替换原有 `location /`）：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

保存后重载 Nginx。申请 SSL 后，在 **443** 的 server 里同样加上这段。

完成后访问 **http://kelian.dpdns.org**（或 https）即可查看前端页面。需要接后台时，再按下面「一」起做完整部署。

---

## 仅部署前端 — 上传后一步一步操作

假设你已经把 **frontend** 必须的文件（`.next/`、`public/`、`package.json`、`package-lock.json`、`next.config.mjs`）上传到了服务器，例如目录是 **`/www/wwwroot/kelian.dpdns.org/frontend`**。按下面顺序做即可（不部署后端）。

---

### 第 1 步：创建目录并确认 Node 版本

1. 用 **SSH** 或宝塔 **终端** 登录服务器。
2. **若目录不存在，先创建**（否则后面 `cd` 会报 No such file or directory）：

```bash
mkdir -p /www/wwwroot/kelian.dpdns.org/frontend
```

3. 再进入目录并查看文件：

```bash
cd /www/wwwroot/kelian.dpdns.org/frontend
ls -la
```

确认能看到：`.next`、`public`、`package.json`、`next.config.mjs`。若还没有这些文件，请先把本机 frontend 里必须的文件上传到此目录（见「前端必须上传清单」），再继续第 2 步。

3. 看 Node 版本（需要 18 或以上）：

```bash
node -v
```

若没有 Node 或版本太低：宝塔 → **软件商店** → 安装 **Node 版本管理**，在里面对应项目选 Node 18 或 20，并设为默认。

---

### 第 2 步：安装依赖

在 **frontend** 目录执行：

```bash
cd /www/wwwroot/kelian.dpdns.org/frontend
npm ci
```

若报错（例如没有 `package-lock.json`），改用：

```bash
npm install
```

等安装完成，不要报错再继续。

---

### 第 3 步：环境变量（可选）

只为了「能打开页面」可以跳过。若要接钱包/合约，在 **frontend** 目录新建环境变量文件：

```bash
cd /www/wwwroot/kelian.dpdns.org/frontend
nano .env.production
```

里面可以只写（按需改）：

```env
NEXT_PUBLIC_CHAIN=testnet
```

保存退出（nano：`Ctrl+O` 回车，`Ctrl+X`）。不接链可以先不建这个文件。

---

### 第 4 步：用 PM2 启动前端

1. 若未安装 PM2，先装：

```bash
npm install -g pm2
```

2. 在 **frontend** 目录启动：

```bash
cd /www/wwwroot/kelian.dpdns.org/frontend
pm2 start npm --name rwa-frontend -- start
```

3. 保存列表并设置开机自启（可选）：

```bash
pm2 save
pm2 startup
```

按提示执行它给出的那条命令（例如 `sudo env PATH=...`）。

4. 检查是否在跑：

```bash
pm2 list
```

应能看到 `rwa-frontend` 状态为 **online**。

5. 本机测一下 3000 端口：

```bash
curl -I http://127.0.0.1:3000
```

若有返回 HTTP 状态码（如 200、304），说明前端已起来。

---

### 第 5 步：在宝塔里配置网站（添加站点 + Nginx 反代）

若你**还没在宝塔里添加过站点**，按下面从零配置；若已添加过，直接看「5.2 配置 Nginx 反代」。

#### 5.1 添加站点

1. 登录 **宝塔面板**（浏览器打开面板地址，用账号密码登录）。
2. 左侧菜单点 **网站**。
3. 点 **添加站点**（或「Add site」）。
4. 填写：
   - **域名**：`kelian.dpdns.org`（若用 IP 访问可填 `165.154.239.48`，或两个都填，用空格隔开）。
   - **根目录**：`/www/wwwroot/kelian.dpdns.org`（或你实际放 frontend 文件的目录，例如 `/www/wwwroot/kelian.dpdns.org`）。
   - **FTP**、**数据库**：不需要就选「不创建」。
   - **PHP 版本**：选「纯静态」或随意（后面用 Nginx 反代，不跑 PHP）。
5. 点 **提交**，站点会出现在网站列表里。

#### 5.2 配置 Nginx 反代（把访问转到 Next.js 3000 端口）

1. 在 **网站** 列表里，找到刚加的 **kelian.dpdns.org**，点右侧 **设置**。
2. 左侧选 **配置文件**（有的版本在「设置」里，或叫「Nginx 配置」）。
3. 在打开的编辑器里，找到 `server { ... }` 中的 `location / { ... }` 这一段，**整段替换**为下面内容（若没有 `location /`，就放在 `server {` 后面、`}` 前面）：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

4. **保存** 配置文件，然后到 **软件商店** → **Nginx** → **重载配置**（或「重启」）。

**完整 server 配置示例**（已含反代、SSL、证书校验等，可直接替换整个 server 块使用）：

```nginx
server
{
    listen 80;
    listen 443 ssl;
    listen 443 quic;
    http2 on;
    server_name kelian.dpdns.org;
    index index.php index.html index.htm default.php default.htm default.html;
    root /www/wwwroot/kelian.dpdns.org/;
    #CERT-APPLY-CHECK--START
    include /www/server/panel/vhost/nginx/well-known/kelian.dpdns.org.conf;
    #CERT-APPLY-CHECK--END
    include /www/server/panel/vhost/nginx/extension/kelian.dpdns.org/*.conf;

    #SSL-START
    #error_page 404/404.html;
    ssl_certificate    /www/server/panel/vhost/cert/kelian.dpdns.org/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/kelian.dpdns.org/privkey.pem;
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_tickets on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000";
    add_header Alt-Svc 'quic=":443"; h3=":443"; h3-29=":443"; h3-27=":443";h3-25=":443"; h3-T050=":443"; h3-Q050=":443";h3-Q049=":443";h3-Q048=":443"; h3-Q046=":443"; h3-Q043=":443"';
    error_page 497  https://$host$request_uri;
    #SSL-END

    #ERROR-PAGE-START
    error_page 404 /404.html;
    #ERROR-PAGE-END

    # 反代到 Next.js（前端）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    #禁止访问的文件或目录
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md)
    {
        return 404;
    }

    location ~ \.well-known{
        allow all;
    }

    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    access_log  /www/wwwlogs/kelian.dpdns.org.log;
    error_log  /www/wwwlogs/kelian.dpdns.org.error.log;
}
```

---

### 第 6 步：浏览器访问

在电脑浏览器打开：

**http://kelian.dpdns.org**

应能看到你的前端页面。若打不开：检查域名是否解析到这台服务器、防火墙/安全组是否放行 80 端口、PM2 里 `rwa-frontend` 是否 online。

---

### 第 7 步（可选）：开启 HTTPS

1. 宝塔 → **网站** → **kelian.dpdns.org** → **SSL**。
2. 选 **Let's Encrypt**，勾选域名，申请证书。
3. 申请成功后，打开 **强制 HTTPS**。
4. 若开启 HTTPS 后页面打不开，再到 **配置文件** 里，在 **443** 的 `server` 块中确认也有和上面一样的 `location / { ... proxy_pass http://127.0.0.1:3000; ... }`，保存后重载 Nginx。

---

### 常用命令（以后用）

- 看前端日志：`pm2 logs rwa-frontend`
- 重启前端：`pm2 restart rwa-frontend`
- 停止前端：`pm2 stop rwa-frontend`

---

## 前端必须上传的文件和文件夹（精简版）

若 **frontend/** 体积太大**（主要是 `node_modules` 和源码）**，可以只上传下面内容，**不要上传 `node_modules`**，到服务器后在 `frontend` 目录执行 `npm ci` 再 `npm run start`。

### 必须上传（缺一不可）

| 路径 | 说明 |
|------|------|
| **`.next/`** | 整个文件夹。本地 `npm run build` 生成的构建结果，运行 `next start` 必需。 |
| **`public/`** | 整个文件夹。静态资源（图片、favicon 等）。 |
| **`package.json`** | 依赖与脚本。 |
| **`package-lock.json`** | 有则上传，便于在服务器用 `npm ci` 复现依赖。 |
| **`next.config.mjs`** | Next 配置，运行时需要。 |

### 可选（按需）

| 路径 | 说明 |
|------|------|
| **`.env.production`** 或 **`.env.local`** | 生产环境变量（如 `NEXT_PUBLIC_API_URL`、合约地址等）。可到服务器再建。 |

### 不需要上传

- **`node_modules/`**：在服务器上进入 `frontend` 后执行 `npm ci` 或 `npm install` 生成。
- **`app/`、`components/`、`lib/`、`hooks/`** 等源码：已有 `.next` 时运行不需要，除非你要在服务器上重新 `npm run build`。

### 上传后服务器上的操作

```bash
cd /www/wwwroot/kelian.dpdns.org/frontend
npm ci
pm2 start npm --name rwa-frontend -- start
```

---

## 一、服务器与宝塔准备（完整部署时用）

### 1. 宝塔面板已安装

- 确保已安装 **Nginx**（或 Apache）、**MySQL**、**Node 版本管理器**（或 PM2 插件）。
- 若未安装 Node：宝塔 → **软件商店** → 搜索 **Node 版本管理** 或 **PM2** → 安装。

### 2. 域名解析

- 在域名服务商（或 dpdns）处，把 **kelian.dpdns.org** 的 A 记录指向你服务器的公网 IP。
- 在宝塔 → **网站** → **添加站点**：
  - 域名：`kelian.dpdns.org`
  - 根目录可先填：`/www/wwwroot/kelian.dpdns.org`
  - PHP 版本选「纯静态」或随意（后面会用 Nginx 反代）。
  - 可勾选「创建 FTP」「创建数据库」等按需。

### 3. 数据库（后端需要）

- 宝塔 → **数据库** → **添加数据库**：
  - 数据库名：如 `rwa_protocol`
  - 用户名、密码自行设置并记下（如 `rwa_user` / 你的密码）。
- 若项目有 SQL 初始化脚本，在 phpMyAdmin 或「管理」里导入执行（如 `backend/src/config/database.sql` 或迁移脚本）。

### 4. Node 版本建议

- 在服务器上执行：`node -v`，建议 **Node 18+**（推荐 20 LTS）。
- 宝塔「Node 版本管理」里可安装并切换版本。

---

## 二、项目上传与目录结构

两种方式二选一。

### 方式 A：本地上传（适合无 Git 或习惯用 FTP/SFTP）

1. **在本地构建**（在项目根目录 `rwa aura` 下）：

   ```bash
   # 前端
   cd frontend
   npm ci
   npm run build

   # 后端
   cd ../backend
   npm ci
   npm run build
   ```

   **提示**：在 Windows 上若 `npm ci` 报错（如 ENOTEMPTY），可改用 `npm install` 再执行 `npm run build`。

2. 上传到服务器（例如 `/www/wwwroot/kelian.dpdns.org/`）：
   - **frontend/**：可按上文「前端必须上传的文件和文件夹（精简版）」只上传 `.next/`、`public/`、`package.json`、`package-lock.json`、`next.config.mjs`，**不要上传** `node_modules`，到服务器后在该目录执行 `npm ci`。
   - **backend/**：上传整份（含 `dist/`、`package.json`、`.env` 等）；若不想传 `node_modules`，可只传 `dist/`、`package.json`、`package-lock.json`、`src/` 及配置，到服务器后执行 `npm ci`。

### 方式 B：服务器上 Git 拉取并构建

1. 在服务器上安装 Git，将代码拉到目录，例如：

   ```bash
   cd /www/wwwroot/kelian.dpdns.org
   git clone <你的仓库地址> .
   # 或先 clone 到子目录再移动
   ```

2. 在服务器上安装依赖并构建：

   ```bash
   cd /www/wwwroot/kelian.dpdns.org/frontend
   npm ci
   npm run build

   cd /www/wwwroot/kelian.dpdns.org/backend
   npm ci
   npm run build
   ```

---

## 三、后端运行（PM2）

### 1. 安装 PM2（若未安装）

```bash
npm install -g pm2
```

### 2. 后端环境变量

在 `backend` 目录下创建 `.env`，例如：

```bash
cd /www/wwwroot/kelian.dpdns.org/backend
nano .env
```

内容示例（按你实际环境修改）：

```env
PORT=3001
NODE_ENV=production

# 数据库（与宝塔里创建的库一致）
DB_HOST=localhost
DB_PORT=3306
DB_USER=rwa_user
DB_PASSWORD=你的数据库密码
DB_NAME=rwa_protocol

# 链与合约（按你部署的链填写）
RPC_URL=https://bsc-dataseed.binance.org
# 或测试网：https://data-seed-prebsc-1-s1.binance.org:8545
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
STAKING_CONTRACT_ADDRESS=你的质押合约地址
RWA_TOKEN_ADDRESS=你的RWA代币地址

# 可选：Redis（若未装 Redis 可先不配）
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379

# 跨域（前端域名）
CORS_ORIGIN=https://kelian.dpdns.org
```

生产环境若只用 HTTP（未配置 HTTPS），可写：`CORS_ORIGIN=http://kelian.dpdns.org`。

### 3. 启动后端

- **推荐：完整后端（含链上监听、定时任务等）**  
  与 `package.json` 中 `"start": "node dist/index.js"` 一致：

  ```bash
  cd /www/wwwroot/kelian.dpdns.org/backend
  pm2 start dist/index.js --name rwa-backend
  ```

- **若仅需 HTTP + API（不跑链上服务）**：  
  可改用轻量 dev-server（同样会编译到 `dist/dev-server.js`）：

  ```bash
  pm2 start dist/dev-server.js --name rwa-backend
  ```

保存并查看：

```bash
pm2 save
pm2 startup   # 按提示执行，开机自启
pm2 list
pm2 logs rwa-backend
```

确认后端健康：`curl http://127.0.0.1:3001/health` 应返回 `{"status":"ok",...}`。

---

## 四、前端运行（Next.js）

Next.js 需在服务器上用 Node 跑（本项目为 SSR，未做纯静态 export）。

### 1. 前端环境变量

在 `frontend` 目录创建 `.env.production`（或 `.env.local`），例如：

```env
# 后端 API 地址（用户浏览器会请求这个地址，必须是公网可访问的）
NEXT_PUBLIC_API_URL=https://kelian.dpdns.org/api
# 若暂时用 HTTP：http://kelian.dpdns.org/api

# 链与合约（与后端同链）
NEXT_PUBLIC_CHAIN=testnet
# 合约地址按你部署的填，例如 BSC 主网或测试网
NEXT_PUBLIC_STAKING_CONTRACT_TESTNET=你的质押合约地址
NEXT_PUBLIC_RWA_TOKEN_TESTNET=你的RWA代币地址
# WalletConnect（可选）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的项目ID
```

注意：`NEXT_PUBLIC_API_URL` 应写成 **同一域名 + /api**，这样 Nginx 反代到 3001 后，前端请求不会跨域。

### 2. 用 PM2 启动前端

```bash
cd /www/wwwroot/kelian.dpdns.org/frontend
pm2 start npm --name rwa-frontend -- start
# 或指定端口：pm2 start npm --name rwa-frontend -- start -- -p 3000
```

默认 Next 会占 3000 端口。确认：

```bash
pm2 save
curl http://127.0.0.1:3000
```

---

## 五、Nginx 反向代理（宝塔）

在宝塔里为 **kelian.dpdns.org** 配置 Nginx，把「网站」的域名对应站点 → **设置** → **配置文件**，在 `server { ... }` 内做反代。

### 示例配置（替换原有 location / 等）

```nginx
server {
    listen 80;
    server_name kelian.dpdns.org;

    # 前端 Next.js（默认 3000 端口）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查（可选）
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_set_header Host $host;
    }
}
```

保存后重载 Nginx：宝塔 → 软件商店 → Nginx → 重载配置，或：

```bash
nginx -t && nginx -s reload
```

---

## 六、HTTPS（推荐）

- 宝塔 → **网站** → 选中 **kelian.dpdns.org** → **SSL** → **Let's Encrypt** 申请证书并强制 HTTPS。
- 申请成功后，Nginx 会多一个 `listen 443 ssl;` 的 server，**把上面 `location /` 和 `location /api` 的配置同样复制到 443 的 server 里**（或放在共用的 include 里），否则 HTTPS 下反代不生效。

确保前端环境变量里：

- `NEXT_PUBLIC_API_URL=https://kelian.dpdns.org/api`
- `CORS_ORIGIN=https://kelian.dpdns.org`

---

## 七、检查清单

| 步骤 | 说明 |
|------|------|
| 1 | 域名 kelian.dpdns.org 解析到服务器 IP |
| 2 | 宝塔添加站点 kelian.dpdns.org |
| 3 | MySQL 建库并导入/迁移，backend `.env` 配置正确 |
| 4 | 后端 `npm run build`，PM2 启动 `rwa-backend`，端口 3001，`/health` 正常 |
| 5 | 前端 `npm run build`，`.env.production` 中 `NEXT_PUBLIC_API_URL` 为 `https://kelian.dpdns.org/api` |
| 6 | PM2 启动 `rwa-frontend`，端口 3000 可访问 |
| 7 | Nginx 反代 `/` → 3000，`/api` → 3001，并配置好 443 SSL |
| 8 | 浏览器访问 https://kelian.dpdns.org 能打开页面且接口请求正常 |

---

## 八、常见问题

- **前端请求 /api 报 404 或跨域**  
  检查 Nginx 是否有 `location /api { proxy_pass http://127.0.0.1:3001; ... }`，以及 `NEXT_PUBLIC_API_URL` 是否为 `https://kelian.dpdns.org/api`（与浏览器地址栏同域）。

- **502 Bad Gateway**  
  确认 PM2 里 `rwa-frontend`、`rwa-backend` 都在运行，且端口 3000、3001 未被其它程序占用。

- **数据库连接失败**  
  检查 backend `.env` 的 `DB_*` 与宝塔数据库一致；MySQL 是否只允许 localhost；必要时在宝塔放行 3306 或使用 socket。

- **合约相关功能异常**  
  确认 `.env` 与 `.env.production` 中链 ID、RPC、合约地址与当前部署的链一致（主网/测试网）。

按上述步骤完成后，网站即可通过 **https://kelian.dpdns.org** 访问。
