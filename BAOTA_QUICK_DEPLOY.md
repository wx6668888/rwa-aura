# RWA Protocol 宝塔快速部署指南

> 假设已安装：Node.js 18+、MySQL、Redis、Nginx、PM2

## 1️⃣ 上传项目

```bash
cd /www/wwwroot
git clone https://github.com/wx6668888/rwa-aura.git rwa-protocol
```

## 2️⃣ 创建数据库

宝塔面板 → 数据库 → 添加：
- 数据库名：`rwa_protocol`
- 用户名：`rwa_user`
- 密码：`你的密码`

## 3️⃣ 配置后端

```bash
cd /www/wwwroot/rwa-protocol/backend
nano .env
```

修改以下配置：
```env
DB_PASSWORD=你的数据库密码
RELAYER_PRIVATE_KEY=你的私钥
```

其他配置保持默认即可。

## 4️⃣ 配置前端

```bash
cd /www/wwwroot/rwa-protocol/frontend
nano .env.local
```

修改：
```env
NEXT_PUBLIC_RELAYER_URL=https://api.你的域名.com
```

## 5️⃣ 安装依赖

```bash
# 后端
cd /www/wwwroot/rwa-protocol/backend
npm install

# 前端
cd /www/wwwroot/rwa-protocol/frontend
npm install
npm run build
```

## 6️⃣ 创建PM2配置

```bash
cd /www/wwwroot/rwa-protocol
nano ecosystem.config.js
```

粘贴：
```javascript
module.exports = {
  apps: [
    {
      name: 'rwa-backend',
      cwd: '/www/wwwroot/rwa-protocol/backend',
      script: 'npm',
      args: 'run server',
      env: { NODE_ENV: 'production', PORT: 3001 }
    },
    {
      name: 'rwa-frontend',
      cwd: '/www/wwwroot/rwa-protocol/frontend',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
}
```

## 7️⃣ 启动服务

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8️⃣ 配置Nginx

### 主站（www.你的域名.com）
宝塔 → 网站 → 添加站点 → 设置 → 反向代理：
```
目标URL: http://127.0.0.1:3000
```

### API（api.你的域名.com）
宝塔 → 网站 → 添加站点 → 设置 → 反向代理：
```
目标URL: http://127.0.0.1:3001
```

## 9️⃣ 配置SSL

宝塔 → 网站 → 设置 → SSL → Let's Encrypt → 申请

对两个域名都执行此操作。

## 🎉 完成！

访问：https://www.你的域名.com

---

## 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启
pm2 restart all

# 更新代码
cd /www/wwwroot/rwa-protocol
git pull
cd frontend && npm run build
pm2 restart all
```
