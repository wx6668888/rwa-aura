# RWA Protocol 运维手册

**版本**: 1.0.0  
**更新时间**: 2026-02-26

---

## 目录

1. [日常运维](#日常运维)
2. [监控指标](#监控指标)
3. [常见操作](#常见操作)
4. [应急响应](#应急响应)
5. [性能优化](#性能优化)

---

## 日常运维

### 每日检查清单

**上午检查（10:00）**:

```bash
# 1. 检查服务状态
pm2 status

# 2. 检查日志错误
tail -n 100 /var/www/rwa-protocol/backend/logs/error.log | grep ERROR

# 3. 检查数据库连接
mysql -u rwa_user -p -e "SHOW PROCESSLIST;"

# 4. 检查 Redis 状态
redis-cli ping

# 5. 检查磁盘空间
df -h

# 6. 检查内存使用
free -h

# 7. 检查 API 健康
curl http://localhost:3000/health
```

**下午检查（16:00）**:

```bash
# 1. 检查事件处理进度
curl http://localhost:3000/api/stats/global

# 2. 检查价格预言机
curl http://localhost:3000/api/price/rwa

# 3. 检查用户增长
mysql -u rwa_user -p -e "SELECT COUNT(*) as total_users FROM rwa_protocol.users;"

# 4. 检查质押总额
mysql -u rwa_user -p -e "SELECT SUM(total_staked) as total_staked FROM rwa_protocol.users;"
```

---

## 监控指标

### 1. 系统指标

**CPU 使用率**:
- 正常: < 70%
- 警告: 70-85%
- 严重: > 85%

```bash
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
```

**内存使用率**:
- 正常: < 80%
- 警告: 80-90%
- 严重: > 90%

```bash
free | grep Mem | awk '{print ($3/$2) * 100.0}'
```

**磁盘使用率**:
- 正常: < 80%
- 警告: 80-90%
- 严重: > 90%

```bash
df -h | grep /dev/sda1 | awk '{print $5}' | cut -d'%' -f1
```

### 2. 应用指标

**事件处理延迟**:
- 正常: < 5 分钟
- 警告: 5-15 分钟
- 严重: > 15 分钟

```sql
SELECT 
  MAX(block_number) as latest_block,
  (SELECT MAX(block_number) FROM stakes) as processed_block,
  MAX(block_number) - (SELECT MAX(block_number) FROM stakes) as delay
FROM event_processing_state;
```

**API 响应时间**:
- 正常: < 200ms
- 警告: 200-500ms
- 严重: > 500ms

```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/stats/global
```

创建 `curl-format.txt`:
```
time_total: %{time_total}s
```

**数据库连接数**:
- 正常: < 50
- 警告: 50-100
- 严重: > 100

```sql
SHOW STATUS WHERE `variable_name` = 'Threads_connected';
```

### 3. 业务指标

**每日新增用户**:
```sql
SELECT COUNT(*) as new_users 
FROM users 
WHERE DATE(created_at) = CURDATE();
```

**每日质押金额**:
```sql
SELECT SUM(amount) as daily_staked 
FROM stakes 
WHERE DATE(created_at) = CURDATE();
```

**每日收益分发**:
```sql
SELECT 
  reward_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM rewards 
WHERE DATE(created_at) = CURDATE()
GROUP BY reward_type;
```

---

## 常见操作

### 1. 重启服务

**重启后端服务**:
```bash
pm2 restart rwa-backend
```

**重启所有服务**:
```bash
pm2 restart all
```

**重启 Nginx**:
```bash
sudo systemctl restart nginx
```

**重启 MySQL**:
```bash
sudo systemctl restart mysql
```

**重启 Redis**:
```bash
sudo systemctl restart redis
```

### 2. 查看日志

**实时查看应用日志**:
```bash
pm2 logs rwa-backend --lines 100
```

**查看错误日志**:
```bash
tail -f /var/www/rwa-protocol/backend/logs/error.log
```

**查看 Nginx 日志**:
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 3. 数据库操作

**备份数据库**:
```bash
/var/www/rwa-protocol/scripts/backup-db.sh
```

**恢复数据库**:
```bash
gunzip < /var/backups/rwa-protocol/rwa_protocol_20260226_020000.sql.gz | mysql -u rwa_user -p rwa_protocol
```

**优化数据库**:
```sql
OPTIMIZE TABLE users;
OPTIMIZE TABLE stakes;
OPTIMIZE TABLE rewards;
OPTIMIZE TABLE referral_relations;
```

**查看慢查询**:
```sql
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

### 4. 清理操作

**清理旧日志**:
```bash
find /var/www/rwa-protocol/backend/logs -name "*.log" -mtime +30 -delete
```

**清理 PM2 日志**:
```bash
pm2 flush
```

**清理 Redis 缓存**:
```bash
redis-cli FLUSHDB
```

### 5. 更新代码

**拉取最新代码**:
```bash
cd /var/www/rwa-protocol
git pull origin main
```

**更新后端**:
```bash
cd backend
npm install
npm run build
pm2 restart rwa-backend
```

**数据库迁移**:
```bash
cd backend
npm run migrate:up
```

---

## 应急响应

### 1. 服务宕机

**症状**: API 无响应

**排查步骤**:
```bash
# 1. 检查进程
pm2 status

# 2. 检查端口
netstat -tulpn | grep 3000

# 3. 检查日志
pm2 logs rwa-backend --err --lines 50

# 4. 检查系统资源
top
df -h
free -h
```

**解决方案**:
```bash
# 重启服务
pm2 restart rwa-backend

# 如果无法重启，强制停止后重启
pm2 delete rwa-backend
pm2 start ecosystem.config.js
```

### 2. 数据库连接失败

**症状**: 日志显示 `ECONNREFUSED 3306`

**排查步骤**:
```bash
# 1. 检查 MySQL 状态
sudo systemctl status mysql

# 2. 检查连接数
mysql -u root -p -e "SHOW STATUS WHERE variable_name = 'Threads_connected';"

# 3. 检查错误日志
sudo tail -f /var/log/mysql/error.log
```

**解决方案**:
```bash
# 重启 MySQL
sudo systemctl restart mysql

# 如果连接数过多，增加最大连接数
mysql -u root -p -e "SET GLOBAL max_connections = 200;"
```

### 3. 事件处理延迟

**症状**: 用户质押后长时间未收到奖励

**排查步骤**:
```bash
# 1. 检查事件监听服务
pm2 logs rwa-backend | grep EventMonitor

# 2. 检查最后处理的区块
mysql -u rwa_user -p -e "SELECT * FROM rwa_protocol.event_processing_state;"

# 3. 检查 RPC 节点
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $BSC_RPC_URL
```

**解决方案**:
```bash
# 1. 重启服务
pm2 restart rwa-backend

# 2. 如果 RPC 节点有问题，更换 RPC URL
nano /var/www/rwa-protocol/backend/.env
# 修改 BSC_RPC_URL
pm2 restart rwa-backend
```

### 4. 价格预言机失败

**症状**: 价格查询返回错误

**排查步骤**:
```bash
# 1. 检查 Redis
redis-cli ping

# 2. 检查价格缓存
redis-cli GET rwa_price

# 3. 检查日志
pm2 logs rwa-backend | grep PriceOracle
```

**解决方案**:
```bash
# 1. 重启 Redis
sudo systemctl restart redis

# 2. 清除缓存
redis-cli FLUSHDB

# 3. 重启服务
pm2 restart rwa-backend
```

### 5. 磁盘空间不足

**症状**: 磁盘使用率 > 90%

**排查步骤**:
```bash
# 1. 查看磁盘使用
df -h

# 2. 查找大文件
du -h /var/www/rwa-protocol | sort -rh | head -20

# 3. 查看日志大小
du -sh /var/www/rwa-protocol/backend/logs
```

**解决方案**:
```bash
# 1. 清理旧日志
find /var/www/rwa-protocol/backend/logs -name "*.log" -mtime +7 -delete

# 2. 清理旧备份
find /var/backups/rwa-protocol -name "*.sql.gz" -mtime +7 -delete

# 3. 清理 PM2 日志
pm2 flush

# 4. 清理系统日志
sudo journalctl --vacuum-time=7d
```

---

## 性能优化

### 1. 数据库优化

**添加索引**:
```sql
-- 检查缺失的索引
SELECT * FROM sys.schema_unused_indexes;

-- 添加常用查询的索引
CREATE INDEX idx_user_address ON users(address);
CREATE INDEX idx_stake_user ON stakes(user_address);
CREATE INDEX idx_reward_user ON rewards(user_address);
```

**优化查询**:
```sql
-- 使用 EXPLAIN 分析查询
EXPLAIN SELECT * FROM users WHERE address = '0x1234...';

-- 优化慢查询
-- 避免 SELECT *
-- 使用 LIMIT
-- 使用索引字段
```

**配置优化**:
```bash
# 编辑 MySQL 配置
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# 添加以下配置
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 2G
innodb_log_file_size = 512M
query_cache_size = 64M
```

### 2. Redis 优化

**配置优化**:
```bash
# 编辑 Redis 配置
sudo nano /etc/redis/redis.conf

# 添加以下配置
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

**监控 Redis**:
```bash
redis-cli INFO stats
redis-cli INFO memory
```

### 3. Nginx 优化

**配置优化**:
```nginx
# 编辑 Nginx 配置
sudo nano /etc/nginx/nginx.conf

# 添加以下配置
worker_processes auto;
worker_connections 2048;

# 启用 gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
```

### 4. 应用优化

**PM2 集群模式**:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rwa-backend',
    script: './dist/index.js',
    instances: 4, // 增加实例数
    exec_mode: 'cluster'
  }]
};
```

**数据库连接池**:
```typescript
// database.config.ts
const pool = mysql.createPool({
  connectionLimit: 20, // 增加连接数
  queueLimit: 0,
  waitForConnections: true
});
```

---

## 告警配置

### 1. 系统告警

**CPU 使用率告警**:
```bash
#!/bin/bash
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$CPU_USAGE > 85" | bc -l) )); then
    # 发送告警
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
         -d "chat_id=$TELEGRAM_CHAT_ID" \
         -d "text=⚠️ CPU 使用率过高: $CPU_USAGE%"
fi
```

**磁盘空间告警**:
```bash
#!/bin/bash
DISK_USAGE=$(df -h | grep /dev/sda1 | awk '{print $5}' | cut -d'%' -f1)
if [ $DISK_USAGE -gt 85 ]; then
    # 发送告警
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
         -d "chat_id=$TELEGRAM_CHAT_ID" \
         -d "text=⚠️ 磁盘空间不足: $DISK_USAGE%"
fi
```

### 2. 应用告警

**服务宕机告警**:
```bash
#!/bin/bash
if ! pm2 list | grep -q "rwa-backend.*online"; then
    # 发送告警
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
         -d "chat_id=$TELEGRAM_CHAT_ID" \
         -d "text=🚨 后端服务宕机"
fi
```

**事件处理延迟告警**:
```bash
#!/bin/bash
DELAY=$(mysql -u rwa_user -p'password' -N -e "SELECT MAX(block_number) - (SELECT MAX(block_number) FROM stakes) FROM rwa_protocol.event_processing_state;")
if [ $DELAY -gt 100 ]; then
    # 发送告警
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
         -d "chat_id=$TELEGRAM_CHAT_ID" \
         -d "text=⚠️ 事件处理延迟: $DELAY 个区块"
fi
```

---

## 联系方式

**紧急联系人**:
- 技术负责人: +86 138-xxxx-xxxx
- 运维负责人: +86 139-xxxx-xxxx
- 安全负责人: +86 137-xxxx-xxxx

**技术支持**:
- Email: support@rwa-protocol.com
- Telegram: https://t.me/rwa_protocol_support

---

**版本历史**:
- v1.0.0 (2026-02-26): 初始版本

