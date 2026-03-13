# 合约修改说明 - 直推奖励系统

## 修改目标
将推荐奖励逻辑从合约移到后端处理，合约只负责记录推荐关系和触发事件。

## 需要修改的部分

### 1. 删除 stakeUSDT 中的 IReferralRewardPool 调用

**当前代码：**
```solidity
// 记录推荐奖励（不立即发放，等待每周结算）
if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
    IReferralRewardPool(referralRewardPool).recordReferralReward(
        effectiveReferrer,
        msg.sender,
        amount / PRECISION_MULTIPLIER,
        0,
        0
    );
}
```

**修改为：**
```solidity
// 推荐奖励由后端处理，合约只触发事件
// 删除此段代码
```

### 2. 删除 stakeRWA 中的 IReferralRewardPool 调用

**当前代码：**
```solidity
if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
    uint256 usdtEquivalent = (amount * 85) / 100;
    IReferralRewardPool(referralRewardPool).recordReferralReward(
        effectiveReferrer,
        msg.sender,
        usdtEquivalent / PRECISION_MULTIPLIER,
        0,
        0
    );
}
```

**修改为：**
```solidity
// 推荐奖励由后端处理
// 删除此段代码
```

### 3. 删除状态变量和接口

**删除：**
```solidity
address public referralRewardPool;

interface IReferralRewardPool {
    function recordReferralReward(...) external;
}
```

## 后端处理流程

1. 监听 StakeEvent 和 RWAStakeEvent
2. 记录奖励到数据库（PENDING状态）
3. 30天后状态变为 MATURED
4. 每周一凌晨批量发放

## 优势

- 降低gas消耗
- 灵活调整规则
- 30天锁定期可控
- 便于审计

⚠️ **暂不部署**
