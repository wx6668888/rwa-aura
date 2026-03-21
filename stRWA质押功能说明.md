# 🔄 stRWA 质押功能说明

## 📋 当前状态

### 核心答案

**当前不支持 stRWA 质押，但这是一个很好的功能建议！**

---

## 🔍 stRWA 的当前用途

### 1. stRWA 是什么？

```
stRWA = Staked RWA = 实体资产代币化凭证

特性：
├─ 1 stRWA = 1 USDT 等值的实体资产
├─ 代表用户持有的 Treasury 投资份额
├─ 可在二级市场交易
├─ 可在 SwapContract 中互换为 RWA
└─ 可等待实体资产清结算
```

### 2. 当前 stRWA 的用途

#### 2.1 作为投资份额凭证

```
用户质押 10,000 USDT

资金分配：
├─ 5,000 USDT → Treasury（永久锁定）
│   └─ 用户获得：5,000 stRWA 代币（投资份额凭证）
│
└─ 5,000 USDT → Staking Contract（可提取本金）
    └─ 用户获得：可提取的 5,000 USDT
```

#### 2.2 在 SwapContract 中互换

```
用户可以将 stRWA 互换为 RWA：
├─ 调用 SwapContract.swapStRWAToRWA(amount)
├─ 销毁 stRWA 代币
├─ 获得等值的 RWA 代币
└─ 可以卖出 RWA（有动态卖出税）
```

#### 2.3 在二级市场交易

```
用户可以在 DEX 上交易 stRWA：
├─ 在 PancakeSwap 上添加流动性
├─ 直接交易 stRWA/USDT 交易对
└─ 获得流动性收益
```

#### 2.4 等待实体资产清结算

```
项目方定期回购 stRWA：
├─ 按实体资产价值结算
├─ 返还 USDT 或 RWA
└─ 用户获得投资回报
```

---

## 💡 如果支持 stRWA 质押会怎样？

### 1. 功能设计

#### 1.1 质押 stRWA 获得收益

```
用户质押 5,000 stRWA

功能设计：
├─ 质押 stRWA 代币
├─ 获得 RWA 代币收益
├─ 获得 USDT 奖励
├─ 获得推荐奖励和团队奖金
└─ 可以随时提取（24小时冷却期）
```

#### 1.2 收益计算

```
质押 stRWA 的收益：
├─ 基础收益：基于质押的 stRWA 数量
├─ 收益倍数：根据锁仓期限（灵活/30/90/180/365天）
├─ 每日收益：stRWA数量 × 0.008 × 倍数
└─ 收益类型：RWA代币 + USDT奖励
```

#### 1.3 与 USDT 质押的区别

| 特性 | USDT 质押 | stRWA 质押 |
|------|-----------|-----------|
| **质押资产** | USDT | stRWA |
| **资金分配** | 50/50（Treasury/合约） | 100%在合约（已分配过） |
| **收益计算** | 基于 totalStaked | 基于 stakedStRWA |
| **提取本金** | 提取 50% USDT | 提取 100% stRWA |
| **投资份额** | 获得 stRWA | 不获得（已有） |

---

## 🎯 支持 stRWA 质押的优势

### 1. 提高资金利用率

```
用户场景：
├─ 用户质押 10,000 USDT
├─ 获得 5,000 stRWA（投资份额）
├─ 获得 5,000 USDT（可提取本金）
│
└─ 如果支持 stRWA 质押：
    ├─ 用户可以将 5,000 stRWA 再次质押
    ├─ 获得额外收益
    └─ 提高资金利用率
```

### 2. 增加用户粘性

```
优势：
├─ 用户持有 stRWA 可以继续产生收益
├─ 不需要先换成 USDT 再质押
├─ 简化操作流程
└─ 提高用户参与度
```

### 3. 增加协议收入

```
优势：
├─ 更多资金留在协议中
├─ 增加奖励池资金
├─ 提高协议可持续性
└─ 增加用户收益来源
```

---

## 🔧 实现方案

### 1. 合约修改

#### 1.1 添加 stRWA 质押数据结构

```solidity
// StakingContract.sol

// 用户 stRWA 质押信息
struct StRWAS takeInfo {
    uint256 totalStakedStRWA;  // 总质押的 stRWA 数量
    uint256 rwaPending;        // 待提取的 RWA 代币
    uint256 usdtRewards;       // USDT 奖励
    uint256 lastWithdrawTime;  // 最后提取时间
}

mapping(address => StRWAS takeInfo) public stRwaStakes;
uint256 public totalStakedStRWA;  // 全局质押的 stRWA 总量
```

#### 1.2 添加 stRWA 质押函数

```solidity
/**
 * @dev Stake stRWA tokens
 * @param amount stRWA amount (18 decimals)
 * @param referrer Referrer address (optional, only for first stake)
 * @param lockPeriod Lock period in days (0=flexible, 30, 90, 180, 365)
 */
function stakeStRWA(uint256 amount, address referrer, uint256 lockPeriod) external nonReentrant whenNotPaused {
    require(amount > 0, "Amount must be greater than zero");
    require(address(stRwaToken) != address(0), "StRWA token not set");
    
    // Transfer stRWA from user
    stRwaToken.safeTransferFrom(msg.sender, address(this), amount);
    
    // Cache user info
    StRWAS takeInfo storage stake = stRwaStakes[msg.sender];
    
    // Bind referral relationship (only on first stake)
    if (referrer != address(0) && referrer != msg.sender && stake.referrer == address(0)) {
        stake.referrer = referrer;
        emit ReferralBound(msg.sender, referrer, block.timestamp);
    }
    
    // Update user info
    unchecked {
        stake.totalStakedStRWA += amount;
    }
    
    // Update global statistics
    unchecked {
        totalStakedStRWA += amount;
    }
    
    // Store lock period
    require(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365, "Invalid lock period");
    
    emit StRWAStakeEvent(msg.sender, amount, stake.referrer, block.timestamp, lockPeriod);
}
```

#### 1.3 添加 stRWA 质押收益提取函数

```solidity
/**
 * @dev Withdraw stRWA staking rewards
 * @param amount RWA amount to withdraw (18 decimals)
 * @param chooseStRWA If true, choose "Hold RWA mode" (120% as stRWA), else "Withdraw U mode" (70% as RWA, 30% burn)
 */
function withdrawStRWARewards(uint256 amount, bool chooseStRWA) external nonReentrant whenNotPaused {
    StRWAS takeInfo storage stake = stRwaStakes[msg.sender];
    
    // Verify user has sufficient balance
    require(stake.rwaPending >= amount, "Insufficient balance");
    
    // Verify cooldown period
    require(
        block.timestamp >= stake.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
        "Withdrawal cooldown active"
    );
    
    // Calculate fee (5%)
    uint256 fee = (amount * WITHDRAWAL_FEE_RATE) / 100;
    uint256 amountAfterFee = amount - fee;
    
    // Update user balance
    stake.rwaPending -= amount;
    stake.lastWithdrawTime = block.timestamp;
    
    if (chooseStRWA) {
        // 持RWA模式：120%收益，转换为stRWA
        uint256 stRwaAmount = (amountAfterFee * 120) / 100;
        stRwaToken.mint(msg.sender, stRwaAmount);
        emit StRWAMinted(msg.sender, stRwaAmount, block.timestamp);
    } else {
        // 提U模式：70%提取，30%销毁
        uint256 receiveAmount = (amountAfterFee * 70) / 100;
        uint256 burnAmount = amountAfterFee - receiveAmount;
        
        rwaToken.safeTransfer(msg.sender, receiveAmount);
        if (burnAmount > 0) {
            rwaToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), burnAmount);
            emit TokensBurned(burnAmount, block.timestamp);
        }
    }
    
    // Burn fee
    if (fee > 0) {
        rwaToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), fee);
    }
    
    emit StRWARewardWithdrawn(msg.sender, amount, fee, block.timestamp);
}
```

#### 1.4 添加 stRWA 本金提取函数

```solidity
/**
 * @dev Withdraw stRWA principal
 * @param amount stRWA amount to withdraw (18 decimals)
 */
function withdrawStRWAPrincipal(uint256 amount) external nonReentrant whenNotPaused {
    StRWAS takeInfo storage stake = stRwaStakes[msg.sender];
    
    // Verify user has sufficient balance
    require(stake.totalStakedStRWA >= amount, "Insufficient balance");
    
    // Verify cooldown period
    require(
        block.timestamp >= stake.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
        "Withdrawal cooldown active"
    );
    
    // Update user balance
    stake.totalStakedStRWA -= amount;
    totalStakedStRWA -= amount;
    stake.lastWithdrawTime = block.timestamp;
    
    // Transfer stRWA back to user
    stRwaToken.safeTransfer(msg.sender, amount);
    
    emit StRWAPrincipalWithdrawn(msg.sender, amount, block.timestamp);
}
```

---

## 📊 完整流程示例

### 场景：用户质押 stRWA

**第1天：质押 stRWA**
```
用户持有 5,000 stRWA（来自之前的 USDT 质押）

操作：stakeStRWA(5000, referrer, 0)  // 灵活锁仓

结果：
├─ 转账：5,000 stRWA → Staking Contract
├─ 记录：stRwaStakes[user].totalStakedStRWA = 5,000
├─ 更新：totalStakedStRWA += 5,000
└─ 开始产生收益：5,000 × 0.008 × 1.0 = 40 RWA代币/天
```

**第2天及以后：产生收益**
```
状态：
├─ 质押的 stRWA：5,000 stRWA（锁定在合约里）
├─ 收益：每天 40 RWA代币
├─ 累计收益：40 × N 天
└─ 可以提取：收益（24h冷却）或本金（24h冷却）
```

**第30天：提取收益**
```
操作：withdrawStRWARewards(1200, false)  // 提取 1,200 RWA，选择提U模式

结果：
├─ 扣除手续费：1,200 × 5% = 60 RWA
├─ 实际收益：1,200 - 60 = 1,140 RWA
├─ 提取 70%：1,140 × 70% = 798 RWA → 用户钱包
├─ 销毁 30%：1,140 × 30% = 342 RWA → 销毁地址
└─ 手续费：60 RWA → 销毁地址
```

**第31天：提取本金**
```
操作：withdrawStRWAPrincipal(5000)

结果：
├─ 检查：质押的 stRWA = 5,000 ✅
├─ 检查：24小时冷却期已过 ✅
├─ 更新：stRwaStakes[user].totalStakedStRWA = 0
├─ 更新：totalStakedStRWA -= 5,000
└─ 转账：5,000 stRWA → 用户钱包 ✅
```

---

## 🎯 总结

### 当前状态

**不支持 stRWA 质押**，但这是一个很好的功能建议！

### stRWA 的当前用途

1. ✅ **投资份额凭证**：代表 Treasury 投资份额
2. ✅ **互换为 RWA**：在 SwapContract 中互换
3. ✅ **二级市场交易**：在 DEX 上交易
4. ✅ **等待清结算**：等待实体资产清结算

### 如果支持 stRWA 质押

**优势**：
- ✅ 提高资金利用率
- ✅ 增加用户粘性
- ✅ 增加协议收入
- ✅ 简化操作流程

**实现**：
- ✅ 需要修改 StakingContract
- ✅ 添加 stRWA 质押数据结构
- ✅ 添加 stRWA 质押和提取函数
- ✅ 更新后端服务支持 stRWA 质押收益计算

---

**需要我实现 stRWA 质押功能吗？** 🚀
