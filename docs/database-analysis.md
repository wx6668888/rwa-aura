# RWA数据库表分析报告

## 当前表统计（27个表）

### 1. 质押相关表（5个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| stakes | 3 | 当前有效质押仓位 | ❓ 用途不明确 |
| stake_events | 46 | 所有质押事件历史 | ✅ EventMonitor使用 |
| rwa_stakes | 2 | RWA质押记录 | ❓ 与stake_events重复？ |
| user_stake_orders | 2 | 用户质押订单 | ❓ 用途不明确 |
| balance_snapshots | 37 | 收益计算快照 | ✅ DailySettlement使用 |

**问题**：
- stakes、rwa_stakes、user_stake_orders 功能重叠
- stake_events已记录所有质押，为何还需要stakes？

### 2. 收益相关表（3个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| rewards | 765 | 用户收益记录 | ✅ 使用中 |
| yield_settlements | 0 | 收益结算记录 | ✅ 等待明天发放 |
| reward_updates | 0 | 收益更新日志 | ❓ 未使用 |

### 3. 推荐奖励相关表（4个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| direct_referral_rewards | 30 | 推荐奖励记录 | ✅ 使用中 |
| referral_bindings | 2 | 推荐关系绑定 | ✅ 使用中 |
| referral_settlement_batches | 1 | 推荐奖励批次 | ✅ 使用中 |
| referral_quality_score | 0 | 推荐质量评分 | ❓ 未使用 |

### 4. 提现相关表（2个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| withdrawal_events | 9 | 提现事件记录 | ✅ EventMonitor使用 |
| emergency_withdrawals | 0 | 紧急提现记录 | ✅ 备用 |

### 5. 节点等级相关表（2个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| node_level_history | 0 | 节点等级历史 | ❓ 未使用 |
| node_level_updates | 0 | 节点等级更新 | ❓ 未使用 |

### 6. 锁仓相关表（2个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| rwa_locked_principals | 11 | RWA锁仓本金 | ✅ 使用中 |
| lock_maturity_events | 0 | 锁仓到期事件 | ✅ LockMaturity使用 |

### 7. 系统相关表（5个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| users | 4 | 用户基本信息 | ✅ 使用中 |
| user_stats | 2 | 用户统计数据 | ✅ 使用中 |
| event_processing_state | 1 | EventMonitor状态 | ✅ 使用中 |
| sync_status | 0 | 同步状态 | ❓ 未使用 |
| homepage_stats | 0 | 首页统计 | ❓ 未使用 |

### 8. 其他表（4个）

| 表名 | 记录数 | 用途 | 状态 |
|------|--------|------|------|
| strwa_mints | 0 | stRWA铸造记录 | ✅ 备用 |
| token_burns | 0 | 代币销毁记录 | ✅ 备用 |
| system_config_changes | 0 | 系统配置变更 | ❓ 未使用 |
| daily_settlements | 0 | 每日结算记录 | ❓ 与yield_settlements重复？ |

## 主要问题

### 问题1：质押表重复
- **stakes**（3条）：当前有效质押
- **stake_events**（46条）：所有质押历史
- **rwa_stakes**（2条）：RWA质押
- **user_stake_orders**（2条）：质押订单

**建议**：只保留stake_events和balance_snapshots，删除其他

### 问题2：未使用的表
以下表记录数为0且代码中未使用：
- reward_updates
- referral_quality_score
- node_level_history
- node_level_updates
- sync_status
- homepage_stats
- system_config_changes

**建议**：删除或标记为废弃

### 问题3：功能重叠
- daily_settlements vs yield_settlements
- stakes vs stake_events

**建议**：合并或明确用途

## 优化建议

### 立即删除（7个表）
```sql
DROP TABLE IF EXISTS reward_updates;
DROP TABLE IF EXISTS referral_quality_score;
DROP TABLE IF EXISTS node_level_history;
DROP TABLE IF EXISTS node_level_updates;
DROP TABLE IF EXISTS sync_status;
DROP TABLE IF EXISTS homepage_stats;
DROP TABLE IF EXISTS system_config_changes;
```

### 考虑删除（4个表）
需要确认代码中是否使用：
- stakes（可能被stake_events替代）
- rwa_stakes（可能被stake_events替代）
- user_stake_orders（可能被stake_events替代）
- daily_settlements（可能被yield_settlements替代）

### 保留的核心表（16个）
1. **质押**: stake_events, balance_snapshots
2. **收益**: rewards, yield_settlements
3. **推荐**: direct_referral_rewards, referral_bindings, referral_settlement_batches
4. **提现**: withdrawal_events, emergency_withdrawals
5. **锁仓**: rwa_locked_principals, lock_maturity_events
6. **系统**: users, user_stats, event_processing_state
7. **其他**: strwa_mints, token_burns

## 下一步行动

1. 确认stakes、rwa_stakes、user_stake_orders是否在代码中使用
2. 确认daily_settlements与yield_settlements的区别
3. 备份数据库
4. 执行清理SQL
5. 更新数据库文档
