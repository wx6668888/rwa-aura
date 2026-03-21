# RWA后台管理API文档

## 认证

所有admin API需要在请求头中携带token：
```
Authorization: Bearer admin123
```

可以在.env中配置：
```
ADMIN_TOKEN=your_secure_token
```

## API端点

### 1. 仪表板统计
```
GET /api/admin/dashboard/stats
```
返回：用户总数、质押总数、收益总数、提现总数、最近活动

### 2. 通用表查询
```
GET /api/admin/table/:tableName?page=1&limit=20&sortBy=id&sortOrder=DESC
```
支持的表名（27个）：
- users, stakes, stake_events, rwa_stakes, user_stake_orders
- balance_snapshots, rewards, yield_settlements, reward_updates
- direct_referral_rewards, referral_bindings, referral_settlement_batches, referral_quality_score
- withdrawal_events, emergency_withdrawals
- node_level_history, node_level_updates
- rwa_locked_principals, lock_maturity_events
- user_stats, event_processing_state, sync_status, homepage_stats
- strwa_mints, token_burns, system_config_changes, daily_settlements

### 3. 用户管理
```
GET /api/admin/users?page=1&limit=20&search=0x123
```
支持按地址搜索

### 4. 质押汇总
```
GET /api/admin/stakes/summary
```
返回：USDT质押统计、RWA质押统计、按锁仓期分组

### 5. 推荐奖励汇总
```
GET /api/admin/referrals/summary
```
返回：总奖励、按状态分组、Top推荐人、最近批次

### 6. 收益汇总
```
GET /api/admin/yields/summary
```
返回：总收益、最近结算、按资产类型分组

## 使用示例

```bash
# 获取仪表板统计
curl -H "Authorization: Bearer admin123" http://localhost:3001/api/admin/dashboard/stats

# 查询用户表
curl -H "Authorization: Bearer admin123" "http://localhost:3001/api/admin/table/users?page=1&limit=10"

# 查询质押事件
curl -H "Authorization: Bearer admin123" "http://localhost:3001/api/admin/table/stake_events?page=1&limit=20"

# 搜索用户
curl -H "Authorization: Bearer admin123" "http://localhost:3001/api/admin/users?search=0xcd5b"

# 获取质押汇总
curl -H "Authorization: Bearer admin123" http://localhost:3001/api/admin/stakes/summary
```

## 下一步：创建前端管理界面

建议使用React + Ant Design或者Next.js创建管理后台界面，包含：
1. 登录页面
2. 仪表板（显示关键指标）
3. 数据表格页面（27个表的CRUD）
4. 用户管理
5. 质押管理
6. 推荐奖励管理
7. 收益管理
8. 系统日志
