# StakingContract 主合约资金分配详解

## 一、质押时资金分配（50/50）

### USDT质押 / RWA质押
用户质押时，资金按 **50/50** 分配：

```
用户质押 1000 USDT/RWA
├─ 50% (500) → Treasury地址（国库）
└─ 50% (500) → 合约地址（用于提现）
```

**代码位置**：
```solidity
uint256 treasuryAmount = internalAmount / 2;
uint256 contractAmount = internalAmount - treasuryAmount;

usdtToken.safeTransferFrom(msg.sender, treasuryAddress, treasuryAmount);
usdtToken.safeTransferFrom(msg.sender, address(this), contractAmount);
```

**记录到用户账户**：
- 锁仓质押：记录到 `usdtLockedPrincipals` / `rwaLockedPrincipals`
  - `totalAmount`: 1000（用户质押总额）
  - `principalAmount`: 500（合约持有的本金）
- 灵活质押：记录到 `usdtFlexiblePrincipal` / `rwaFlexiblePrincipal`
  - 只记录合约持有的50%

**重要**：用户提现本金时，支付100%（1000），但合约只有50%（500），不足部分由管理员从Treasury补充。

---

## 二、提现时手续费分配（8%总手续费）

### 提现手续费率
```solidity
WITHDRAWAL_FEE_RATE = 8%  // 总手续费
├─ BUYBACK_FEE_RATE = 3%  // 回购销毁
├─ TREASURY_FEE_RATE = 3% // 国库
└─ POOL_FEE_RATE = 2%     // 资金池（留在合约）
```

### 提现1000 USDT的分配
```
用户提现 1000 USDT
├─ 手续费 80 USDT (8%)
│   ├─ 30 USDT (3%) → Buyback地址（回购销毁）
│   ├─ 30 USDT (3%) → Treasury地址（国库）
│   └─ 20 USDT (2%) → 留在合约（资金池）
└─ 实际到账 920 USDT (92%)
```

**代码位置**：
```solidity
function _splitImmediateFee(uint256 grossAmount) internal pure returns (
    uint256 buybackAmount,
    uint256 treasuryAmount,
    uint256 poolAmount,
    uint256 netAmount
) {
    buybackAmount = grossAmount * BUYBACK_FEE_RATE / 100;  // 3%
    treasuryAmount = grossAmount * TREASURY_FEE_RATE / 100; // 3%
    poolAmount = grossAmount * POOL_FEE_RATE / 100;         // 2%
    netAmount = grossAmount - buybackAmount - treasuryAmount - poolAmount; // 92%
}
```

---

## 三、RWA提现特殊处理

### RWA提现时的回购销毁
```
用户提现 1000 RWA
├─ 手续费 80 RWA (8%)
│   ├─ 30 RWA (3%) → 0x...dEaD地址（销毁）
│   ├─ 30 RWA (3%) → Treasury地址
│   └─ 20 RWA (2%) → 留在合约
└─ 实际到账 920 RWA (92%)
```

**注意**：RWA的回购部分直接发送到死亡地址销毁，而不是Buyback地址。

---

## 四、推荐奖励逻辑

### 当前实现（数据库记录）
- 质押时调用 `IReferralRewardPool.recordReferralReward()` 记录推荐关系
- **不转账USDT**，只记录到合约的数组中
- 需要后端周结算时批量发放

### 推荐奖励率
```
L1: 3%   L2: 5%   L3: 8%   L4: 12%  L5: 17%
L6: 23%  L7: 30%  L8: 35%  L9: 40%
```

### 推荐奖励来源
**问题**：推荐奖励的USDT从哪里来？

**选项1**：从质押的50%合约部分扣除
- 优点：自动化，无需额外资金
- 缺点：减少合约可用余额

**选项2**：从Treasury额外拨款
- 优点：不影响合约余额
- 缺点：需要手动充值

**选项3**：从提现手续费的2%资金池部分支付
- 优点：利用现有资金池
- 缺点：资金池可能不足

---

## 五、资金流向总结

### 质押阶段
```
用户质押 1000 USDT
├─ 500 USDT → Treasury（国库）
└─ 500 USDT → 合约（用于提现）
```

### 提现阶段
```
用户提现 1000 USDT
├─ 从合约扣除 1000 USDT
├─ 手续费 80 USDT
│   ├─ 30 USDT → Buyback
│   ├─ 30 USDT → Treasury
│   └─ 20 USDT → 合约（资金池）
└─ 用户收到 920 USDT
```

### 推荐奖励（待实现）
```
用户质押 1000 USDT，推荐人L1（3%）
├─ 推荐奖励 30 USDT
└─ 来源：？（需要确定）
    ├─ 选项1：从合约的500 USDT扣除
    ├─ 选项2：从Treasury额外拨款
    └─ 选项3：从提现手续费资金池支付
```

---

## 六、合约地址配置

```solidity
address public treasuryAddress;      // 国库地址
address public buybackAddress;       // 回购地址
address public referralRewardPool;   // 推荐奖励池地址
address public immutable backendAddress; // 后端gasless地址
```

---

## 七、关键常量

```solidity
uint256 public constant WITHDRAWAL_FEE_RATE = 8;  // 提现总手续费
uint256 public constant BUYBACK_FEE_RATE = 3;     // 回购费率
uint256 public constant TREASURY_FEE_RATE = 3;    // 国库费率
uint256 public constant POOL_FEE_RATE = 2;        // 资金池费率
uint256 public constant ST_RWA_LOCK_DURATION = 30 days; // stRWA锁定期
```

---

## 八、推荐奖励实现建议

### 方案A：质押时自动转账（推荐）
修改质押函数，在50/50分配后，额外从合约部分转账推荐奖励到ReferralRewardPool：

```solidity
// 质押后计算推荐奖励
if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
    uint8 level = users[effectiveReferrer].nodeLevel;
    uint256 rewardRate = _getReferralRewardRate(level);
    uint256 rewardAmount = (amount * rewardRate) / 10000;
    
    // 从合约余额转账到ReferralRewardPool
    usdtToken.safeTransfer(referralRewardPool, rewardAmount);
}
```

**影响**：
- 合约实际持有 = 50% - 推荐奖励
- 例：1000 USDT质押，L1推荐人
  - Treasury: 500 USDT
  - 合约: 500 - 30 = 470 USDT
  - 推荐奖励池: 30 USDT

### 方案B：周结算批量转账
保持现有逻辑，后端每周一调用合约批量转账。

---

## 九、文件位置

- 主合约：`E:\MyRWA_Project\rwa aura\contracts\StakingContract.sol`
- 推荐奖励池：`E:\MyRWA_Project\rwa aura\contracts\ReferralRewardPool.sol`
