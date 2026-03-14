# 数据库优化方案

## 当前问题

1. **stakes表** - 被api.ts、database.config.ts使用，但数据不完整（只有3条）
2. **user_stake_orders表** - 被StakeOrderService使用
3. **rwa_stakes表** - 被EventMonitor使用
4. **stake_events表** - 主要的质押事件表（46条）

## 核心问题

**stakes表数据不完整**：
- stakes表只有3条记录（昨天的旧数据）
- stake_events表有46条记录（完整历史）
- 导致API返回的数据不准确

## 解决方案

### 方案1：同步stake_events到stakes（推荐）

让EventMonitor在记录stake_events的同时，也更新stakes表：

```typescript
// EventMonitor.ts
private async handleStakeEvent(event: any) {
    // 1. 记录到stake_events（已有）
    await query('INSERT INTO stake_events ...');
    
    // 2. 同步到stakes表
    await query(`
        INSERT INTO stakes (user_address, amount, lock_period, asset_type, tx_hash, block_number, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user, amount, lockPeriod, assetType, txHash, blockNumber, timestamp]);
}
```

### 方案2：废弃stakes表，修改API

修改所有使用stakes表的代码，改为查询stake_events：

```typescript
// api.ts - 修改前
const [stakes] = await pool.query('SELECT * FROM stakes WHERE user_address = ?');

// api.ts - 修改后
const [stakes] = await pool.query('SELECT * FROM stake_events WHERE user_address = ? AND event_type IN ("USDT_STAKE", "RWA_STAKE")');
```

## 推荐执行步骤

### 第1步：回填stakes表数据

```sql
-- 从stake_events回填到stakes
INSERT INTO stakes (user_address, amount, lock_period, asset_type, tx_hash, block_number, timestamp, created_at)
SELECT 
    user_address,
    amount,
    lock_period,
    CASE 
        WHEN event_type IN ('USDT_STAKE', 'USDT') THEN 'USDT'
        WHEN event_type IN ('RWA_STAKE', 'RWA') THEN 'RWA'
    END as asset_type,
    tx_hash,
    block_number,
    FROM_UNIXTIME(timestamp) as timestamp,
    NOW() as created_at
FROM stake_events
WHERE event_type IN ('USDT_STAKE', 'RWA_STAKE', 'USDT', 'RWA')
ON DUPLICATE KEY UPDATE
    amount = VALUES(amount);
```

### 第2步：修改EventMonitor同步逻辑

在EventMonitor中添加同步到stakes表的代码。

### 第3步：清理未使用的表

```sql
-- 确认后删除
DROP TABLE IF EXISTS reward_updates;
DROP TABLE IF EXISTS referral_quality_score;
DROP TABLE IF EXISTS node_level_history;
DROP TABLE IF EXISTS node_level_updates;
DROP TABLE IF EXISTS sync_status;
DROP TABLE IF EXISTS homepage_stats;
DROP TABLE IF EXISTS system_config_changes;
```

## 不建议删除的表

以下表虽然记录数为0，但代码中有使用：
- **user_stake_orders** - StakeOrderService使用
- **rwa_stakes** - EventMonitor使用
- **daily_settlements** - 可能与yield_settlements功能不同
- **emergency_withdrawals** - 紧急提现功能
- **strwa_mints** - stRWA铸造记录
- **token_burns** - 代币销毁记录

## 总结

**立即执行**：
1. 回填stakes表数据（从stake_events）
2. 修改EventMonitor同步逻辑

**谨慎删除**：
- 只删除完全未使用的7个表
- 保留所有在代码中有引用的表
