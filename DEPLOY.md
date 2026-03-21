# RWA Protocol 宝塔部署指南

域名: rwaprotocol.dpdns.org

## 前置要求

### 宝塔面板安装软件
1. Nginx 1.22+
2. MySQL 5.7+ (已有)
3. Redis 6.0+
4. PM2管理器
5. Node.js 18+

## 部署步骤

### 第一步：上传代码

1. 将项目代码上传到服务器 `/www/wwwroot/rwa-protocol`
2. 或使用Git克隆：
```bash
cd /www/wwwroot
git clone <你的仓库地址> rwa-protocol
```

### 第二步：执行部署脚本

```bash
cd /www/wwwroot/rwa-protocol
chmod +x deploy-step*.sh

# 1. 创建数据库
bash deploy-step1.sh

# 2. 配置环境变量（记得填写区块链配置）
bash deploy-step2.sh
nano backend/.env  # 编辑填写合约地址和私钥

# 3. 安装依赖和构建
bash deploy-step3.sh

# 4. 启动PM2
bash deploy-step4.sh
cd /www/wwwroot/rwa-protocol
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 第三步：配置Nginx

1. 宝塔面板 → 网站 → 添加站点
   - 域名: rwaprotocol.dpdns.org
   - 根目录: /www/wwwroot/rwa-protocol
   - PHP版本: 纯静态

2. 配置SSL证书
   - 宝塔面板 → SSL → Let's Encrypt
   - 自动申请并部署

3. 修改Nginx配置
   - 复制 `nginx.conf` 内容
   - 粘贴到宝塔 → 网站 → 配置文件
   - 保存并重启Nginx

### 第四步：验证部署

1. 检查服务状态
```bash
pm2 status
pm2 logs rwa-backend
pm2 logs rwa-frontend
```

2. 访问网站
   - 前端: https://rwaprotocol.dpdns.org
   - 后端API: https://rwaprotocol.dpdns.org/api/health

## 环境变量配置

### backend/.env 必填项

```env
# 区块链配置
STAKING_CONTRACT_ADDRESS=0x...  # 质押合约地址
RWA_TOKEN_ADDRESS=0x...         # RWA代币地址
REFERRAL_REWARD_POOL=0x...      # 推荐奖励池地址
BACKEND_PRIVATE_KEY=0x...       # 后端钱包私钥（用于自动结算）
```

## 常用命令

```bash
# 查看日志
pm2 logs rwa-backend
pm2 logs rwa-frontend

# 重启服务
pm2 restart rwa-backend
pm2 restart rwa-frontend

# 停止服务
pm2 stop all

# 查看状态
pm2 status

# 监控
pm2 monit
```

## 故障排查

### 1. 数据库连接失败
- 检查 backend/.env 中的数据库密码
- 确认MySQL服务运行中

### 2. 前端无法访问
- 检查PM2状态: `pm2 status`
- 查看前端日志: `pm2 logs rwa-frontend`
- 确认端口3000未被占用

### 3. 后端API 502错误
- 检查后端日志: `pm2 logs rwa-backend`
- 确认端口3001未被占用
- 检查.env配置是否正确

### 4. 区块链监听不工作
- 检查RPC_URL是否可访问
- 确认合约地址正确
- 查看后端日志中的EventMonitor状态

## 安全建议

1. **私钥安全**
   - backend/.env 权限设置为 600
   - 不要提交.env到Git

2. **数据库安全**
   - 定期备份数据库
   - 使用强密码

3. **防火墙**
   - 只开放80、443端口
   - 3000、3001端口仅本地访问

4. **SSL证书**
   - 使用Let's Encrypt自动续期
   - 强制HTTPS访问

## 维护

### 定期任务
- 每周备份数据库
- 每月检查日志文件大小
- 监控服务器资源使用

### 更新代码
```bash
cd /www/wwwroot/rwa-protocol
git pull
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart all
```

---

**部署完成后，记得测试所有功能！**
