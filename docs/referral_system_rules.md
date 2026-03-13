# 推荐系统规则说明

## 一、推荐关系绑定

### 1.1 绑定规则
- **永久绑定**：用户首次质押时绑定推荐人，之后无法更改
- **绑定时机**：调用 `stakeUSDT()` 或 `stakeRWA()` 时传入推荐人地址
- **自动绑定**：如果用户已有推荐人，后续质押自动使用已绑定的推荐人
- **无效推荐人**：零地址、自己、已经是自己下级的地址都无效

### 1.2 存储位置
- 合约：`users[address].referrer` 和 `rwaStakes[address].referrer`
- 数据库：`referral_relationships` 表

## 二、等级系统

### 2.1 等级与奖励比例

| 等级 | 奖励比例 | 说明 |
|------|---------|------|
| L1   | 3%      | 初始等级 |
| L2   | 5%      | - |
| L3   | 8%      | - |
| L4   | 12%     | - |
| L5   | 17%     | - |
| L6   | 23%     | - |
| L7   | 30%     | - |
| L8   | 35%     | - |
| L9   | 40%     | 最高等级 |

### 2.2 等级存储
- 合约：`users[address].nodeLevel` 和 `rwaStakes[address].nodeLevel`
- 数据库：`user_levels` 表
- 默认等级：L1

## 三、奖励计算

### 3.1 USDT 质押奖励
```
奖励金额 = 质押金额 × 推荐人等级比例
```

**示例**：
- 用户 A（L5，17%）推荐用户 B
- 用户 B 质押 1000 USDT
- 用户 A 获得奖励：1000 × 17% = 170 USDT

### 3.2 RWA 质押奖励
```
USDT等价值 = RWA质押数量 × 0.85
奖励金额 = USDT等价值 × 推荐人等级比例
```

**示例**：
- 用户 A（L7，30%）推荐用户 B
- 用户 B 质押 1000 RWA
- USDT等价值：1000 × 0.85 = 850 USDT
- 用户 A 获得奖励：850 × 30% = 255 USDT

### 3.3 奖励记录时机
- 质押时立即调用 `IReferralRewardPool.recordReferralReward()` 记录
- **不立即发放**，等待每周结算

## 四、结算流程

### 4.1 每周结算周期
- **结算频率**：每周一次
- **结算时间**：建议每周一凌晨执行
- **批次号格式**：`YYYY-Wxx`（如：2026-W11）

### 4.2 结算步骤
1. 创建结算批次记录
2. 查询本周所有 `PENDING` 状态的奖励记录
3. 按推荐人地址汇总奖励金额
4. 调用 ReferralRewardPool 合约批量发放
5. 更新奖励记录状态为 `SETTLED`
6. 更新用户统计数据

### 4.3 结算状态
- `PENDING`：待结算
- `SETTLED`：已结算
- `CANCELLED`：已取消（如质押被撤回）

## 五、数据流

### 5.1 质押时的数据流
```
用户质押 → StakingContract
    ↓
检查推荐关系（首次绑定 / 使用已绑定）
    ↓
计算奖励金额（质押金额 × 推荐人等级比例）
    ↓
调用 ReferralRewardPool.recordReferralReward()
    ↓
写入数据库 referral_rewards 表（状态：PENDING）
```

### 5.2 结算时的数据流
```
定时任务触发（每周一次）
    ↓
创建结算批次（settlement_batches）
    ↓
查询 PENDING 状态的奖励记录
    ↓
按推荐人汇总金额
    ↓
调用 ReferralRewardPool 合约批量发放
    ↓
更新奖励记录状态为 SETTLED
    ↓
更新用户统计（referral_statistics）
```

## 六、技术实现

### 6.1 合约接口
```solidity
interface IReferralRewardPool {
    function recordReferralReward(
        address referrer,      // 推荐人地址
        address referee,       // 被推荐人地址
        uint256 stakeAmount,   // 质押金额（USDT等价值，6位精度）
        uint256 rewardAmount,  // 奖励金额（预留，当前为0）
        uint8 userLevel        // 用户等级（预留，当前为0）
    ) external;
}
```

### 6.2 后端监听事件
监听合约事件，同步数据到数据库：
- `StakeEvent`：USDT质押事件
- `RWAStakeEvent`：RWA质押事件

事件参数包含：
- 用户地址
- 质押金额
- 推荐人地址
- 质押ID
- 时间戳

### 6.3 数据库操作流程
1. **质押时**：
   - 监听链上事件
   - 查询推荐人等级
   - 计算奖励金额
   - 插入 `referral_rewards` 表
   - 更新 `referral_statistics` 表

2. **结算时**：
   - 创建 `settlement_batches` 记录
   - 查询待结算奖励
   - 批量发放（调用合约）
   - 更新状态和统计

## 七、注意事项

### 7.1 精度处理
- 合约内部使用 18 位精度
- USDT 原生 6 位精度，需转换
- 数据库使用 DECIMAL(36,18) 存储

### 7.2 安全考虑
- 推荐关系永久绑定，防止刷奖励
- 不能推荐自己或自己的下级
- 奖励延迟发放，防止快速提现攻击

### 7.3 性能优化
- 使用 `team_hierarchy` 闭包表快速查询团队
- 批量结算减少 gas 消耗
- 索引优化查询性能

## 八、待实现功能

### 8.1 必须实现
- [ ] 部署 ReferralRewardPool 合约
- [ ] 设置 `referralRewardPool` 地址
- [ ] 实现后端事件监听
- [ ] 实现每周结算定时任务

### 8.2 可选功能
- [ ] 等级自动升级规则
- [ ] 团队业绩统计
- [ ] 推荐排行榜
- [ ] 奖励提现功能

