# 推荐奖励自动转账方案

## 问题
- 主质押合约只记录推荐关系，不转USDT
- ReferralRewardPool需要USDT才能让用户提取
- 目前需要手动给ReferralRewardPool充值

## 解决方案：修改StakingContract

### 修改位置
在`stake()`和`stakeRWA()`函数中，质押时计算推荐奖励并转账到ReferralRewardPool

### 修改逻辑

```solidity
// 在质押成功后，计算并转账推荐奖励
if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
    uint8 referrerLevel = users[effectiveReferrer].nodeLevel;
    if (referrerLevel > 0) {
        uint256 rewardRate = _getReferralRewardRate(referrerLevel);
        uint256 rewardAmount = (amount * rewardRate) / 10000; // amount是USDT金额（6位小数）
        
        // 从合约余额转账到ReferralRewardPool
        if (usdtToken.balanceOf(address(this)) >= rewardAmount) {
            usdtToken.safeTransfer(referralRewardPool, rewardAmount);
        }
    }
    
    // 仍然调用recordReferralReward记录（用于统计）
    IReferralRewardPool(referralRewardPool).recordReferralReward(...);
}
```

### ReferralRewardPool需要添加接收方法

```solidity
// 接收USDT并记录到用户余额
function depositReward(address user, uint256 amount) external {
    require(msg.sender == stakingContract, "Only staking");
    withdrawableBalance[user] += amount;
}
```

## 优点
- 质押时自动转账，无需手动充值
- 用户可以立即在withdraw页面看到奖励
- 无需后端周结算调用合约

## 缺点
- 需要重新部署主合约
- 合约余额需要足够支付推荐奖励

## 实施步骤
1. 修改ReferralRewardPool合约，添加`depositReward`方法
2. 修改StakingContract合约，质押时转账推荐奖励
3. 重新编译和部署两个合约
4. 更新前端合约地址
5. 测试质押和提取流程
