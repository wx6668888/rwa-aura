# 🎁 RWA 奖励机制 - 完整深度解析

**目录**
1. [奖励体系总览](#奖励体系总览)
2. [三种奖励类型详解](#三种奖励类型详解)
3. [节点等级系统](#节点等级系统)
4. [项目分红机制](#项目分红机制)
5. [级压逻辑（核心算法）](#级压逻辑核心算法)
6. [数据流完整示例](#数据流完整示例)
7. [数据库设计](#数据库设计)
8. [安全机制](#安全机制)
9. [常见问题](#常见问题)

---

## 奖励体系总览

### 核心概念

RWA 的奖励体系分为**4 种类型**：

```
┌─────────────────────────────────────────────────────────┐
│              RWA 奖励体系（总体）                        │
└─────────────────────────────────────────────────────────┘
          ├─ 静态收益 (Static Yield)
          │  └─ 0.8% 每日，给所有活跃用户
          │
          ├─ 动态收益 (Differential Rewards)
          │  └─ 来自下级质押，按节点等级分配
          │
          ├─ 项目分红 (Project Dividend)
          │  └─ L2+ 参与，基于团队总留存按比例分红
          │
          └─ 节点等级奖励 (Node Level Bonus)
             └─ V1-V5 五个等级，每升一级收益百分比增加
```

---

## 三种奖励类型详解

### 类型 1️⃣ 静态收益（Daily Yield）

**什么是静态收益？**
- 每天自动计算，给所有 `isActive = true` 的用户
- 固定 **0.8% 每日**
- 按日期统计，每天执行一次

**计算公式**
```
每日 RWA 奖励 = 用户质押额 × 0.8%

例子：
用户质押 1000 USDT (转为 1000 × 10^18 wei 在合约内部)
第 1 天收益: 1000 × 0.008 = 8 RWA
第 2 天收益: 1000 × 0.008 = 8 RWA
第 3 天收益: 1000 × 0.008 = 8 RWA
...
365 天收益: 8 × 365 = 2920 RWA (年化 292%)
```

**触发机制**

```
SchedulerService (定时任务)
        ↓
每天 00:00 执行 calculateDailyYield()
        ↓
查询所有 is_active = true 的用户
        ↓
对每个用户计算 total_staked × 0.008
        ↓
UPDATE users SET rwa_pending = rwa_pending + ?
        ↓
INSERT rewards (记录日志)
```

**代码实现** (`DailyYieldService.ts`)

```typescript
async calculateDailyYield() {
    // 查询所有活跃用户
    const users = await query(
        `SELECT address, total_staked 
         FROM users 
         WHERE is_active = TRUE AND total_staked > 0`
    );
    
    for (const user of users) {
        // 计算 0.8% 收益
        const yieldAmount = user.total_staked × 0.008;
        
        // 更新用户余额
        await transaction(async (conn) => {
            await conn.query(
                'UPDATE users SET rwa_pending = rwa_pending + ? WHERE address = ?',
                [yieldAmount, user.address]
            );
            
            // 记录到 rewards 表
            await conn.query(
                `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp)
                 VALUES (?, 'static', 'RWA', ?, NOW())`,
                [user.address, yieldAmount]
            );
        });
    }
}
```

**存储位置**
- 数据库：`users.rwa_pending` 字段
- 合约：无（仅数据库记录）
- 用户可提现

---

### 类型 2️⃣ 动态收益（推荐奖励）

**什么是动态收益？**
- 当下级用户质押时，上级自动获得奖励
- 根据上级的**节点等级**决定奖励百分比
- 奖励直接发放，无需级压逻辑

**奖励百分比表（L1-L9）**

```
节点等级 → 对下级质押的奖励百分比

L1 (量子)    → 3%
L2 (粒子)    → 5%
L3 (光子)    → 8%
L4 (星舰)    → 12%
L5 (彗星)    → 17%
L6 (行星)    → 23%
L7 (恒星)    → 30%
L8 (星云)    → 35%
L9 (超新星)  → 40%
```

**计算方式**
- 下级质押时，直接按上级当前等级的百分比发放奖励
- 无需复杂的级压计算
- 奖励为 RWA 代币

上级1 (V1) 得: 1000 × 5% = 50
上级2 (V2) 得: 1000 × 10% = 100  ← 重复计算了 5%!
上级3 (V3) 得: 1000 × 15% = 150  ← 重复计算了 10%!
上级4 (V4) 得: 1000 × 20% = 200  ← 重复计算了 15%!
上级5 (V5) 得: 1000 × 50% = 500  ← 重复计算了 20%!

总计: 50+100+150+200+500 = 1000 (等于质押额的 100%!)
这是合约设计之初不允许的！
```

**有级压后（正确方式）**

```
User 质押 1000 USDT
推荐链: User → 上级1(V1) → 上级2(V2) → 上级3(V3) → 上级4(V4) → 上级5(V5)

计算逻辑:
maxAllocated = 0

上级1 (V1, 5%):
  差异百分比 = 5% - 0% = 5%
  奖励 = 1000 × 5% = 50 USDT ✓
  maxAllocated = 5%

上级2 (V2, 10%):
  差异百分比 = 10% - 5% = 5%
  奖励 = 1000 × 5% = 50 USDT ✓
  maxAllocated = 10%

上级3 (V3, 15%):
  差异百分比 = 15% - 10% = 5%
  奖励 = 1000 × 5% = 50 USDT ✓
  maxAllocated = 15%

上级4 (V4, 20%):
  差异百分比 = 20% - 15% = 5%
  奖励 = 1000 × 5% = 50 USDT ✓
  maxAllocated = 20%

上级5 (V5, 50%):
  差异百分比 = 50% - 20% = 30%
  奖励 = 1000 × 30% = 300 USDT ✓
  maxAllocated = 50%

总计: 50+50+50+50+300 = 500 (等于质押额的 50%, 符合规则!)
```

**核心代码** (`RewardEngine.ts`)

```typescript
async calculateDifferentialRewards(
    stakeAmount: string,
    userAddress: string,
    stakeId: string
): Promise<RewardDistribution[]> {
    // 1. 获取所有上级（按深度排序）
    const ancestors = await this.getAncestors(userAddress);
    // ancestors = [
    //   {ancestor: 上级1, depth: 1, level: 1},
    //   {ancestor: 上级2, depth: 2, level: 2},
    //   ...
    // ]
    
    const rewards: RewardDistribution[] = [];
    let maxAllocatedPercentage = 0;  // 追踪已分配的最大百分比
    
    for (const ancestor of ancestors) {
        const ancestorLevel = ancestor.node_level;
        const ancestorPercentage = NODE_REWARD_PERCENTAGES[ancestorLevel];
        
        // 关键：计算差异百分比（级压）
        const differentialPercentage = 
            Math.max(0, ancestorPercentage - maxAllocatedPercentage);
        
        if (differentialPercentage > 0) {
            // 计算奖励金额
            const rewardAmount = stakeAmount 
                × differentialPercentage / 100;
            
            rewards.push({
                beneficiary: ancestor.ancestor_address,
                amount: rewardAmount,
                percentage: differentialPercentage
            });
            
            logger.info(
                `奖励计算: ${ancestor} 获得 ${rewardAmount} USDT (${differentialPercentage*100}%)`
            );
        }
        
        // 更新已分配的最大百分比
        maxAllocatedPercentage = Math.max(
            maxAllocatedPercentage, 
            ancestorPercentage
        );
        
        // 如果达到 50%，停止计算（已达到最大值）
        if (maxAllocatedPercentage >= 0.5) {
            break;
        }
    }
    
    // 2. 验证总奖励不超过 50%
    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0);
    const maxAllowed = stakeAmount × 0.5;
    
    if (totalRewards > maxAllowed) {
        throw new Error('奖励超过 50% 上限!');
    }
    
    return rewards;
}
```

**存储位置**
- 数据库：`users.usdt_rewards` 字段
- 合约：`users[address].usdtRewards` 字段
- 用户可提现

---

### 类型 3️⃣ 节点等级系统

**节点等级的作用是什么？**

节点等级决定了你在推荐链中对下级的**奖励百分比**。

**五个等级的升级要求**

```
┌──────┬────────────────┬──────────────────┬─────────────────┐
│ 等级 │ 直推要求       │ 团队量要求       │ 大小区平衡      │
├──────┼────────────────┼──────────────────┼─────────────────┤
│ V1   │ 无             │ 无               │ 无              │
│ V2   │ 3 个 V1+       │ 5,000 USDT       │ 单区 ≤ 50%      │
│ V3   │ 3 个 V2+       │ 20,000 USDT      │ 单区 ≤ 50%      │
│ V4   │ 3 个 V3+       │ 100,000 USDT     │ 单区 ≤ 50%      │
│ V5   │ 3 个 V4+       │ 500,000 USDT     │ 单区 ≤ 50%      │
└──────┴────────────────┴──────────────────┴─────────────────┘
```

**升级流程**

```
后端定期检查 (每小时或每次有新 stake)
        ↓
checkAndUpgradeNodeLevel(userAddress)
        ↓
检查 4 个条件：
  ├─ 直推数量够吗？(有 3 个直推达到要求等级)
  ├─ 团队量够吗？(sum(所有下级质押) ≥ 要求)
  ├─ 大小区平衡吗？(最大的 1 个下属区的量 ≤ 总量的 50%)
  └─ 还没升过？(node_level < 5)
        ↓
全部通过 ✓
        ↓
数据库: UPDATE users SET node_level = nextLevel
        ↓
合约: updateNodeLevel(userAddress, nextLevel)
        ↓
记录升级历史到 node_level_history 表
```

**升级示例**

```
用户 Alice 当前 V1，想升到 V2

检查条件 1: 直推有 3 个 V1+ 吗？
  Alice 的直推: Bob(V1), Charlie(V1), David(V1), Eve(V1)
  → 有 4 个 V1，满足 ✓

检查条件 2: 团队量有 5000 USDT 吗？
  Alice 的团队总量: Bob(1000) + Charlie(2000) + David(1500) + Eve(500)
                = 5000 USDT
  → 满足 ✓

检查条件 3: 大小区平衡吗？
  Alice 最大的直属区: Bob(1000)
  占比: 1000 / 5000 = 20% < 50%
  → 满足 ✓

升级成功！
  Alice: V1 → V2 ✓
  奖励百分比: 5% → 10%
```

---

## 节点等级系统

### 等级升级要求详解

#### V2 升级条件

```sql
SELECT COUNT(*) as direct_v1_count
FROM referral_relations rr
JOIN users u ON rr.user_address = u.address
WHERE rr.ancestor_address = 'Alice'
  AND rr.depth = 1              -- 直推（depth=1）
  AND u.node_level >= 1;        -- 等级 ≥ V1

结果: 4 ≥ 3 ✓
```

#### 团队量要求

```sql
SELECT SUM(total_staked) as team_volume
FROM users u
JOIN referral_relations rr ON u.address = rr.user_address
WHERE rr.ancestor_address = 'Alice';

结果: 5000 USDT ≥ 5000 USDT ✓
```

#### 大小区平衡要求（V2+）

```sql
SELECT direct_referral, department_volume
FROM department_volumes
WHERE user_address = 'Alice'
ORDER BY department_volume DESC;

结果:
  Bob:     1000 (20%)
  Charlie: 2000 (40%)
  David:   1500 (30%)
  Eve:      500 (10%)

最大: 2000 / 5000 = 40% ≤ 50% ✓
```

---

## 项目分红机制

### 核心概念

项目分红是 L2+ 节点独享的奖励机制，基于**团队总留存**按比例分红。

**关键特点：**
- ✅ L2-L9 参与，L1 不参与
- ✅ 基于团队总留存实时计算
- ✅ 每月1日结算上月数据
- ✅ 分红比例随等级递增（5%-50%）

---

### 分红计算公式

```
用户分红 = 团队总留存 × 分红比例

团队总留存 = 团队总充值 - 团队总提现
```

**团队总充值：**
- 所有团队成员（含自己）的所有质押
- USDT 质押 + RWA 质押（按 0.85 换算）

**团队总提现：**
- 所有团队成员的所有提现操作
- 包括：RWA 收益提现、USDT 奖励提现、本金提现、分红提现等

**负留存处理：**
- 如果团队总提现 > 团队总充值，总留存计为 0

---

### 分红比例表

| 等级 | 名称 | 分红比例 | 团队质押要求 | 个人质押要求 | 总留存要求 |
|------|------|----------|--------------|--------------|------------|
| L1 | 量子 | 0% | 0 | 0 | 0 |
| L2 | 粒子 | **5%** | 5,000 | 500 | 2,000 |
| L3 | 光子 | **8%** | 20,000 | 1,000 | 8,000 |
| L4 | 星舰 | **12%** | 50,000 | 3,000 | 20,000 |
| L5 | 彗星 | **17%** | 150,000 | 8,000 | 60,000 |
| L6 | 行星 | **23%** | 400,000 | 20,000 | 160,000 |
| L7 | 恒星 | **30%** | 1,000,000 | 50,000 | 400,000 |
| L8 | 星云 | **40%** | 2,500,000 | 100,000 | 1,000,000 |
| L9 | 超新星 | **50%** | 5,000,000 | 200,000 | 2,000,000 |

---

### 结算机制

#### 结算时间
- **结算日期**：每月1日 00:00
- **结算周期**：上月1日 00:00:00 至 上月末日 23:59:59
- **结算顺序**：从下级到上级（避免重复计算）

#### 前端显示
1. **结算前**：显示预估分红（实时模拟）
2. **结算后**：显示实际可提取金额
3. **提取时间**：只能在1日后端计算完成后提取

#### 资金来源
- **来源**：除国库外的所有资金池
- **不足处理**：提示管理员，可从国库调拨资金

---

### 计算示例

**场景：用户 Alice，L2 等级**

```
团队成员：Alice（自己）+ Bob（下级）+ Charlie（下下级）

团队总充值：
- Alice 质押：10,000 USDT
- Bob 质押：5,000 USDT  
- Charlie 质押：3,000 USDT
- 合计：18,000 USDT

团队总提现：
- Alice 提现 RWA 收益：500 USDT
- Bob 提现本金：1,000 USDT
- 合计：1,500 USDT

团队总留存 = 18,000 - 1,500 = 16,500 USDT

Alice 分红（L2，5%）= 16,500 × 5% = 825 USDT
```

---

### 重要说明

#### 1. 分红提现影响留存
⚠️ **分红提现会减少团队总留存**

```
初始状态：
- 团队总留存：16,500 USDT
- Alice 分红（L2，5%）：825 USDT

Alice 提现分红后：
- 团队总留存：16,500 - 825 = 15,675 USDT
- 下月 Alice 分红：15,675 × 5% = 783.75 USDT（减少）
```

这是设计特性，鼓励用户保持资金留存。

#### 2. 等级变动影响
- 用户等级实时计算
- 分红按当前等级计算
- 等级下降会影响分红比例

#### 3. 链上实时计算
- 所有数据从区块链事件读取
- 不依赖后端数据库
- 完全去中心化

---

## 级压逻辑（核心算法）

### 数学定义

对于用户 U 的质押，其推荐链上的奖励分配为：

$$R_i = S \times (P_i - P_{i-1})$$

其中：
- $R_i$ = 第 i 层上级的奖励
- $S$ = 质押金额
- $P_i$ = 第 i 层上级的等级奖励百分比
- $P_{i-1}$ = 第 i-1 层上级的等级奖励百分比

**约束条件：**

$$\sum_{i=1}^{n} R_i \leq S \times 0.5$$

即：总奖励不超过质押金额的 50%

### 推荐链数据结构

系统使用 `referral_relations` 表存储所有推荐关系：

```sql
-- 例子：Alice → Bob → Charlie → David

referral_relations 表：
┌──────────┬──────────────┬───────┐
│ user     │ ancestor     │ depth │
├──────────┼──────────────┼───────┤
│ Alice    │ Bob          │   1   │  Alice 的直推是 Bob
│ Alice    │ Charlie      │   2   │  Alice 的二级推是 Charlie
│ Alice    │ David        │   3   │  Alice 的三级推是 David
│ Bob      │ Charlie      │   1   │  Bob 的直推是 Charlie
│ Bob      │ David        │   2   │  Bob 的二级推是 David
│ Charlie  │ David        │   1   │  Charlie 的直推是 David
└──────────┴──────────────┴───────┘

当 Alice 质押时，查询：
  SELECT ancestor_address, depth, node_level
  FROM referral_relations rr
  JOIN users u ON rr.ancestor_address = u.address
  WHERE rr.user_address = 'Alice'
  ORDER BY rr.depth ASC;

结果（按深度排序）:
  Bob (depth=1, V1)
  Charlie (depth=2, V2)
  David (depth=3, V3)
```

### 实时计算示例

**场景：Alice 质押 10000 USDT**

推荐链结构：
```
Alice (V1) 
  ↓ 推荐
Bob (V2, node_level=2, reward_pct=10%)
  ↓ 推荐
Charlie (V3, node_level=3, reward_pct=15%)
  ↓ 推荐
David (V4, node_level=4, reward_pct=20%)
  ↓ 推荐
Eve (V5, node_level=5, reward_pct=50%)
```

**计算过程**

```
质押金额: S = 10000 USDT

迭代 1: Bob (V2, 10%)
  maxAllocated = 0%
  差异百分比 = 10% - 0% = 10%
  奖励 = 10000 × 10% = 1000 USDT ✓
  maxAllocated = 10%

迭代 2: Charlie (V3, 15%)
  maxAllocated = 10%
  差异百分比 = 15% - 10% = 5%
  奖励 = 10000 × 5% = 500 USDT ✓
  maxAllocated = 15%

迭代 3: David (V4, 20%)
  maxAllocated = 15%
  差异百分比 = 20% - 15% = 5%
  奖励 = 10000 × 5% = 500 USDT ✓
  maxAllocated = 20%

迭代 4: Eve (V5, 50%)
  maxAllocated = 20%
  差异百分比 = 50% - 20% = 30%
  奖励 = 10000 × 30% = 3000 USDT ✓
  maxAllocated = 50%

总奖励: 1000 + 500 + 500 + 3000 = 5000 USDT = 50% ✓
```

---

## 数据流完整示例

### 真实场景：三人推荐链

**初始状态**

```
系统中已有用户：
  Leo (V4, team_volume=100000 USDT)
  Mike (V2, team_volume=20000 USDT, referrer=Leo)
  
新用户加入：
  Nancy 质押 5000 USDT，推荐人是 Mike
```

**Step 1: 用户 Nancy 在合约上调用 stake()**

```solidity
// Nancy 在 Web3 钱包上调用
stakingContract.stake(5000 USDT, Mike_address)

// 合约执行：
// 1. 转账 2500 USDT 到 Treasury（50%）
// 2. 转账 2500 USDT 到合约地址（50%）
// 3. 生成 stakeId (假设是 1001)
// 4. 发出事件
emit StakeEvent(Nancy, 5000 USDT, Mike, 1001, timestamp)
```

**Step 2: EventMonitor 捕获事件（12 块确认后）**

```typescript
// EventMonitor 轮询检测到 StakeEvent

// 幂等性检查
const existing = await query('SELECT id FROM stakes WHERE tx_hash = ?', [tx_hash]);
if (existing.length > 0) return; // 已处理，跳过

// 存入数据库
INSERT stakes (id, user_address, amount, tx_hash, block_number, timestamp)
VALUES (1001, Nancy, 5000e18, tx_hash, 12345, timestamp);

INSERT users (address, total_staked, first_stake_time, is_active)
VALUES (Nancy, 5000e18, timestamp, true)
ON DUPLICATE KEY UPDATE
  total_staked = total_staked + 5000e18,
  is_active = true;
```

**Step 3: 建立推荐关系**

```typescript
// EventMonitor 绑定推荐关系

// 1. 在 users 表更新
UPDATE users SET referrer = Mike WHERE address = Nancy;

// 2. 调用存储过程 sp_build_referral_relations
CALL sp_build_referral_relations(Nancy, Mike);

// 存储过程执行：
// 直接关系：
INSERT referral_relations (user_address, ancestor_address, depth)
VALUES (Nancy, Mike, 1);

// 间接关系（Mike 的上级变成 Nancy 的间接推荐人）：
INSERT referral_relations (user_address, ancestor_address, depth)
SELECT Nancy, ancestor_address, depth + 1
FROM referral_relations
WHERE user_address = Mike;
// → INSERT (Nancy, Leo, 2)

// 结果：referral_relations 表中新增
// (Nancy, Mike, 1)
// (Nancy, Leo, 2)
```

**Step 4: 计算差异化收益**

```typescript
// RewardEngine.processStake(Nancy, 5000e18, 1001)

// 查询 Nancy 的所有上级
const ancestors = await query(`
  SELECT ancestor_address, depth, u.node_level
  FROM referral_relations rr
  JOIN users u ON rr.ancestor_address = u.address
  WHERE rr.user_address = Nancy
  ORDER BY depth ASC
`);

// 结果：
// [
//   {ancestor: Mike, depth: 1, node_level: 2},
//   {ancestor: Leo, depth: 2, node_level: 4}
// ]

// 计算奖励（级压逻辑）
maxAllocated = 0

迭代 1: Mike (V2, 10%)
  差异 = 10% - 0% = 10%
  奖励 = 5000 × 10% = 500 USDT
  maxAllocated = 10%

迭代 2: Leo (V4, 20%)
  差异 = 20% - 10% = 10%
  奖励 = 5000 × 10% = 500 USDT
  maxAllocated = 20%

总奖励: 500 + 500 = 1000 USDT (< 5000 × 50% = 2500 ✓)

返回 rewards:
[
  {beneficiary: Mike, amount: 500, percentage: 10%},
  {beneficiary: Leo, amount: 500, percentage: 10%}
]
```

**Step 5: 更新数据库**

```typescript
// RewardEngine.distributeRewards(rewards)

BEGIN TRANSACTION;

// 对 Mike 更新（行锁防并发）
SELECT address FROM users WHERE address = Mike FOR UPDATE;
UPDATE users SET usdt_rewards = usdt_rewards + 500 WHERE address = Mike;
INSERT rewards (user_address, reward_type, token_type, amount, from_user, stake_id)
VALUES (Mike, 'differential', 'USDT', 500, Nancy, 1001);

// 对 Leo 更新
SELECT address FROM users WHERE address = Leo FOR UPDATE;
UPDATE users SET usdt_rewards = usdt_rewards + 500 WHERE address = Leo;
INSERT rewards (user_address, reward_type, token_type, amount, from_user, stake_id)
VALUES (Leo, 'differential', 'USDT', 500, Nancy, 1001);

COMMIT;

// 结果：数据库中新增 2 条 reward 记录
```

**Step 6: 更新智能合约**

```typescript
// RewardEngine.updateContractRewards(rewards)

// 对每个受益人调用合约方法

// 第 1 次调用
tx1 = await stakingContract.updateUserRewards(
    Mike,           // beneficiary
    0,              // rwAmount (RWA 数量，动态收益没有)
    500e18,         // usdtAmount (USDT 数量)
    1001            // stakeId (防重复)
);

合约执行：
  ✓ CHECK: !processedStakes[1001] (第一次处理)
  ✓ CHECK: 500 ≤ 10000 USDT (单次上限)
  ✓ CHECK: contractBalance ≥ 500 (余额足够)
  ✓ CHECK: totalDynamicRewards + 500 ≤ totalStaked × 50%
  
  State update:
    processedStakes[1001] = true
    users[Mike].usdtRewards += 500
    totalDynamicRewardsPaid += 500
  
  emit RewardsUpdated(Mike, 0, 500, 1001, timestamp)

// 第 2 次调用
tx2 = await stakingContract.updateUserRewards(
    Leo,            // beneficiary
    0,              // rwAmount
    500e18,         // usdtAmount
    1001            // stakeId (同一个 stakeId!)
);

合约执行：
  ✓ CHECK: !processedStakes[1001] 
    → 这里会 FAIL! 因为 processedStakes[1001] 已经在第 1 次调用中设置为 true

问题： 这样会导致 Leo 无法获得奖励！
```

**❌ 发现问题！**

上面的流程有 bug：`processedStakes[stakeId]` 是按 stakeId 全局唯一的，不能对多个受益人重复使用！

**✅ 正确的实现**

应该为每个受益人生成唯一的奖励 ID：

```typescript
// 改进：为每个受益人生成唯一的 rewardId

// Step 4 的计算结果中添加 rewardId
rewards = [
  {beneficiary: Mike, amount: 500, rewardId: 1001_001},
  {beneficiary: Leo, amount: 500, rewardId: 1001_002}
]

// Step 6 的合约调用
tx1 = stakingContract.updateUserRewards(Mike, 0, 500, 1001_001);
tx2 = stakingContract.updateUserRewards(Leo, 0, 500, 1001_002);

// 这样每个受益人都有唯一的 rewardId，不会冲突
```

**或者使用哈希作为唯一 ID**

```typescript
const rewardId1 = keccak256(abi.encodePacked(stakeId, Nancy, Mike, 1));
const rewardId2 = keccak256(abi.encodePacked(stakeId, Nancy, Leo, 2));

tx1 = stakingContract.updateUserRewards(Mike, 0, 500, rewardId1);
tx2 = stakingContract.updateUserRewards(Leo, 0, 500, rewardId2);
```

---

## 数据库设计

### 核心表关系

```
┌───────────────┐
│    users      │
├───────────────┤
│ address (PK)  │
│ referrer      │──┐
│ node_level    │  │
│ total_staked  │  │
│ team_volume   │  │
│ rwa_pending   │  │
│ usdt_rewards  │  │
│ is_active     │  │
└───────────────┘  │
       ▲           │ (一对多)
       │           │
       │           │
┌──────┴───────────┘
│
├──→ ┌──────────────────┐
│    │  stakes          │  (记录质押事件)
│    ├──────────────────┤
│    │ id (PK)          │
│    │ user_address (FK)│
│    │ amount           │
│    │ tx_hash (UNIQUE) │
│    └──────────────────┘
│
├──→ ┌──────────────────┐
│    │  referral_relations  │  (推荐链关系)
│    ├──────────────────┤
│    │ id               │
│    │ user_address     │
│    │ ancestor_address │
│    │ depth (1,2,3...) │
│    └──────────────────┘
│
├──→ ┌──────────────────┐
│    │  rewards         │  (奖励日志)
│    ├──────────────────┤
│    │ id               │
│    │ user_address     │
│    │ reward_type      │  (static/differential)
│    │ token_type       │  (RWA/USDT)
│    │ amount           │
│    │ from_user        │
│    │ stake_id         │
│    └──────────────────┘
│
└──→ ┌──────────────────┐
     │  department_volumes  │  (大小区计算)
     ├──────────────────┤
     │ user_address     │
     │ direct_referral  │
     │ department_volume│
     └──────────────────┘
```

### 关键字段说明

#### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `address` | VARCHAR(42) | 钱包地址 |
| `referrer` | VARCHAR(42) | 推荐人地址（不可变） |
| `node_level` | TINYINT | 节点等级 1-5 |
| `total_staked` | DECIMAL(38,0) | 18 位小数的质押总额 |
| `team_volume` | DECIMAL(38,0) | 所有下级的质押总额（递推） |
| `rwa_pending` | DECIMAL(38,0) | 待领 RWA（静态收益） |
| `usdt_rewards` | DECIMAL(38,0) | 待领 USDT（动态收益） |
| `is_active` | BOOLEAN | 是否有活跃本金（影响静态收益计算） |

#### referral_relations 表（最重要！）

```sql
┌─────────────────────────────────────────────────┐
│ referral_relations (推荐关系表)                  │
└─────────────────────────────────────────────────┘

CREATE TABLE referral_relations (
    id BIGINT PRIMARY KEY,
    user_address VARCHAR(42),        -- 下级地址
    ancestor_address VARCHAR(42),    -- 上级地址（任意深度）
    depth INT,                       -- 深度（1=直推, 2=二级推, etc）
    created_at TIMESTAMP,
    
    UNIQUE KEY (user_address, ancestor_address),
    INDEX (ancestor_address),
    INDEX (user_address, depth)
);

作用：用于快速查询任何人的所有上级或下级
优点：
  ✓ O(1) 查询复杂度（通过索引）
  ✓ 避免使用 LIKE 模糊查询（低效）
  ✓ 支持任意深度的推荐链
```

**示例数据**

```sql
假设推荐链：Alice → Bob → Charlie → David

referral_relations 表中的数据：
┌───────────┬──────────┬────────┐
│ user      │ ancestor │ depth  │
├───────────┼──────────┼────────┤
│ Bob       │ Alice    │ 1      │  Bob 的直推是 Alice
│ Charlie   │ Bob      │ 1      │  Charlie 的直推是 Bob
│ Charlie   │ Alice    │ 2      │  Charlie 的二级推是 Alice
│ David     │ Charlie  │ 1      │  David 的直推是 Charlie
│ David     │ Bob      │ 2      │  David 的二级推是 Bob
│ David     │ Alice    │ 3      │  David 的三级推是 Alice
└───────────┴──────────┴────────┘

查询 Alice 的所有下级：
  SELECT user_address FROM referral_relations
  WHERE ancestor_address = 'Alice'
  ORDER BY depth ASC;
  
  结果: Bob (depth=1), Charlie (depth=2), David (depth=3)

查询 David 的所有上级：
  SELECT ancestor_address FROM referral_relations
  WHERE user_address = 'David'
  ORDER BY depth ASC;
  
  结果: Charlie (depth=1), Bob (depth=2), Alice (depth=3)
```

#### rewards 表（审计追踪）

```sql
┌──────────────────────────────────────────────────┐
│ rewards (奖励日志)                               │
└──────────────────────────────────────────────────┘

CREATE TABLE rewards (
    id BIGINT PRIMARY KEY,
    user_address VARCHAR(42),        -- 收益人
    reward_type ENUM('static', 'differential'),
    token_type ENUM('RWA', 'USDT'),
    amount DECIMAL(38, 0),
    from_user VARCHAR(42),           -- 来源用户（动态收益）
    stake_id BIGINT,                 -- 相关 stake ID
    timestamp TIMESTAMP,
    created_at TIMESTAMP
);

示例数据：
┌───────────────┬──────────────┬──────────┬──────────┐
│ user_address  │ reward_type  │ token    │ amount   │
├───────────────┼──────────────┼──────────┼──────────┤
│ Mike          │ differential │ USDT     │ 500      │  来自 Nancy 的质押
│ Leo           │ differential │ USDT     │ 500      │  来自 Nancy 的质押
│ Mike          │ static       │ RWA      │ 8        │  每日自动计算
│ Leo           │ static       │ RWA      │ 80       │  每日自动计算
└───────────────┴──────────────┴──────────┴──────────┘
```

---

## 安全机制

### 1️⃣ 幂等性保护

**问题**：如果网络故障，同一个事件被处理多次怎么办？

**解决**：使用 `tx_hash` 作为唯一标识

```typescript
// EventMonitor.handleStakeEvent()

// 检查是否已处理
const existing = await query(
    'SELECT id FROM stakes WHERE tx_hash = ?',
    [txHash]
);

if (existing.length > 0) {
    logger.warn(`已处理过: tx=${txHash}, 跳过`);
    return; // 直接返回，不重复处理
}

// 存储 tx_hash
INSERT stakes (tx_hash, ...) VALUES (txHash, ...);
```

**合约中的幂等性**

```solidity
mapping(uint256 => bool) public processedStakes;

function updateUserRewards(
    address user,
    uint256 rwAmount,
    uint256 usdtAmount,
    uint256 stakeId  // ← 用作幂等性标记
) external {
    require(!processedStakes[stakeId], "已处理过");
    
    processedStakes[stakeId] = true;  // ← 立即标记
    
    // 后续操作...
}
```

**问题**：同一个 stakeId 不能给多个人分配奖励！

**改进**：应该为每个受益人生成唯一的 rewardId

```solidity
mapping(uint256 => bool) public processedRewards;

function updateUserRewards(
    address user,
    uint256 rwAmount,
    uint256 usdtAmount,
    uint256 rewardId  // ← 改为 rewardId，确保全局唯一
) external {
    require(!processedRewards[rewardId], "已处理过");
    processedRewards[rewardId] = true;
    // ...
}
```

### 2️⃣ 50% 硬上限检查（三层防御）

**层级 1：后端验证**

```typescript
// RewardEngine.calculateDifferentialRewards()

const totalRewards = rewards.reduce((sum, r) => sum.plus(r.amount), new BigNumber(0));
const maxAllowed = stakeAmountBN.multipliedBy(0.5);

require(totalRewards.isLessThanOrEqualTo(maxAllowed), 
    "总奖励超过 50% 限制");
```

**层级 2：合约验证**

```solidity
// StakingContract.updateUserRewards()

require(
    totalDynamicRewardsPaid + usdtAmount <= totalStaked * 50 / 100,
    "超过 50% 限制"
);
```

**层级 3：单次奖励上限**

```solidity
// 防止后端一次性分配过多奖励

require(usdtAmount <= maxRewardPerCall, "单次奖励超限");

// maxRewardPerCall = 10000 USDT (可由 owner 调整)
```

### 3️⃣ 并发控制

**问题**：两个 Worker 同时修改同一用户的余额会导致数据不一致

**解决**：行级锁 + 事务

```typescript
await transaction(async (connection) => {
    // 锁定行
    await connection.query(
        'SELECT address FROM users WHERE address = ? FOR UPDATE',
        [userAddress]
    );
    
    // 原子更新
    await connection.query(
        'UPDATE users SET usdt_rewards = usdt_rewards + ? WHERE address = ?',
        [amount, userAddress]
    );
});
```

**Row-Level Lock 的作用**

```
Worker A                        Worker B
    |                               |
    ├─ BEGIN TRANSACTION            |
    ├─ SELECT ... FOR UPDATE (获得行锁)
    │                               ├─ BEGIN TRANSACTION
    │                               ├─ SELECT ... FOR UPDATE (等待行锁！)
    ├─ UPDATE (修改)
    ├─ INSERT (记录)
    ├─ COMMIT (释放行锁)
    │                               ├─ SELECT ... FOR UPDATE (获得行锁)
    │                               ├─ UPDATE (修改)
    │                               ├─ INSERT (记录)
    │                               └─ COMMIT

结果: 两个修改都被正确记录，无数据丢失 ✓
```

### 4️⃣ 12 块确认延迟

**问题**：链可能重组（reorg），导致已确认的交易被回滚

**解决**：等待 12 块确认

```typescript
// EventMonitor.processNewBlocks()

const currentBlock = await provider.getBlockNumber();
const confirmedBlock = currentBlock - 12;  // 延迟 12 块

if (confirmedBlock <= lastProcessedBlock) {
    return; // 还没有新的确认块
}

// 只处理 currentBlock - 12 之前的块
processBlockRange(lastProcessedBlock + 1, confirmedBlock);
```

**12 块的选择理由**

BSC (Binance Smart Chain) 的特性：
- 块时间：3 秒
- 12 块 = 36 秒
- 足够防止小规模的短链重组

---

## 常见问题

### Q1: 为什么动态收益是 USDT，而不是 RWA？

**A**: 这是商业设计：

- **USDT 是美元稳定币** - 价格稳定，利于用户规划
- **RWA 是激励代币** - 价格波动，用于吸引投资者
- **分开发放** 可以平衡两种代币的供给

```
静态收益 → RWA (激励用户长期持有和参与)
动态收益 → USDT (奖励推荐贡献，价值稳定)
```

### Q2: 一个用户最多能获得多少奖励？

**A**: 理论上无限，但有以下限制：

```
总奖励上限 = 质押总额 × 50%

例子：
  全网质押: 1000000 USDT
  最多分配动态收益: 500000 USDT
  
  如果已分配: 400000 USDT
  还能分配: 100000 USDT
  
  再有人质押 200000 USDT 时，只能分配 100000 USDT
  (系统会拒绝超出的部分)
```

### Q3: 如果推荐链特别长（100+ 层），系统能处理吗？

**A**: 可以，但会有性能问题：

```typescript
// 当前实现
for (const ancestor of ancestors) {
    // 处理每一层
    // 性能: O(n)，其中 n = 推荐链深度
}

// 优化方案（未来）
- 缓存推荐链
- 只计算到某个深度（例如 10 层）
- 使用 GraphQL 或缓存层加速查询
```

### Q4: 用户升级到 V5 后，还能继续赚奖励吗？

**A**: 是的，V5 是最高等级：

```
V5 的奖励百分比 = 50%

例子：
  一个 V5 用户的直推质押 10000 USDT
  V5 获得奖励: 10000 × 50% = 5000 USDT
  (已达到上限，不再增长)
```

### Q5: 级压逻辑中，如果有人等级降低会怎样？

**A**: 当前系统中**级别不会降低**，只能升级或保持：

```
用户升级: V1 → V2 → V3 → ... ✓
用户降级: V3 → V2 (不支持)

原因：
- 避免复杂的逆向计算
- 用户已获得的奖励不会被追回
- 降级需要修改历史数据（复杂）
```

### Q6: 后端 Worker 崩溃了，奖励会丢失吗？

**A**: 不会，系统有恢复机制：

```
EventMonitor 崩溃恢复流程：

1. 从数据库读取 last_processed_block
2. 继续处理未处理的块
3. 重新计算并分配奖励

关键：
  - event_processing_state 表记录进度
  - 数据库事务保证原子性
  - tx_hash 幂等性保证不重复处理
```

### Q7: 团队量是怎么计算的？

**A**: 

```
团队量 = 用户自己的质押 + 所有下级的质押

公式：
  team_volume = total_staked (自己)
              + sum(所有下级的 total_staked)

例子：
  Alice 质押: 1000
  Bob (Alice 的下级) 质押: 500
  Charlie (Bob 的下级) 质押: 300
  
  Alice 的团队量: 1000 + 500 + 300 = 1800
  Bob 的团队量: 500 + 300 = 800
  Charlie 的团队量: 300
```

### Q8: 大小区平衡是什么意思？

**A**: 防止一个下级贡献太大比例：

```
V2+ 要求: 最大的 1 个下级 ≤ 团队总量的 50%

例子 1（满足）：
  Alice 的团队量: 5000
  直推成员:
    Bob: 1500 (30%)
    Charlie: 2000 (40%)
    David: 1500 (30%)
  
  最大: 2000 (40%) ≤ 50% ✓ 满足

例子 2（不满足）：
  Alice 的团队量: 5000
  直推成员:
    Bob: 4500 (90%)  ← 太大了！
    Charlie: 500 (10%)
  
  最大: 4500 (90%) > 50% ✗ 不满足 (违反大小区平衡)
```

---

## 总结

### 三种奖励对比

| 类型 | 触发条件 | 计算周期 | 代币类型 | 上限 |
|------|---------|---------|---------|------|
| 静态 | 用户是活跃状态 | 每日自动 | RWA | 无（按 0.8% 算） |
| 动态 | 下级质押 | 实时 | USDT | 质押额的 50% |
| 级别 | 满足升级条件 | 实时检查 | 影响百分比 | V1-V5 五级 |

### 关键数字

```
静态收益: 0.8% / 天 × 365 天 = 292% / 年 (RWA)

动态收益: 最高 50% 一次 (USDT)

节点等级收益:
  V1: 5%
  V2: 10%
  V3: 15%
  V4: 20%
  V5: 50%

升级要求（V2 示例）:
  直推: 3 个 V1+ 用户
  团队: 5000 USDT
  平衡: 最大下级 ≤ 50%
```

### 安全保证

```
✓ 幂等性: tx_hash 全局唯一
✓ 50% 上限: 三层检查（后端/合约/单次）
✓ 并发安全: 行级锁 + 事务
✓ 链安全: 12 块确认延迟
✓ 恢复能力: 进度记录 + 幂等处理
```

---

**完成！这就是完整的 RWA 奖励机制。任何还有疑问吗？** 🚀
