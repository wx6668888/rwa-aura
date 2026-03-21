# 🚀 RWA 质押模式完整逻辑设计

## 📋 核心设计理念

### 新模式：先买 RWA，再质押 RWA

**核心逻辑**：
```
用户操作流程：
1. 用户用 USDT 购买 RWA 代币（推高 RWA 价格）
2. 用户用 RWA 代币进行质押（获得收益）
3. 质押收益以 RWA 代币形式发放
4. 形成"购买需求 → 价格上涨 → 质押收益"的循环
```

---

## 🎯 完整逻辑设计

### 1. 用户操作流程

#### 1.1 第一步：购买 RWA 代币

```
用户想要质押 10,000 USDT 等值的资产

操作1：购买 RWA 代币
├─ 用户持有：10,000 USDT
├─ 在 DEX 或 SwapContract 购买 RWA
├─ 假设 RWA 价格：1 RWA = 0.85 USDT
├─ 购买数量：10,000 / 0.85 = 11,764.7 RWA
└─ 用户获得：11,764.7 RWA 代币

价格影响：
├─ 购买需求增加 → RWA 价格上涨
├─ 价格上涨 → 早期购买者受益
└─ 形成正向循环
```

#### 1.2 第二步：质押 RWA 代币

```
操作2：质押 RWA 代币
├─ 用户持有：11,764.7 RWA
├─ 选择锁仓期限：灵活/30/90/180/365天
├─ 调用 stakeRWA(11764.7, referrer, lockPeriod)
└─ 开始产生收益

资金分配：
├─ 50% (5,882.35 RWA) → Treasury
│   └─ 转换为 USDT 用于实体投资
│   └─ 用户获得：5,882.35 stRWA（投资份额凭证）
│
└─ 50% (5,882.35 RWA) → Staking Contract
    └─ 用于奖励池，发放收益
```

#### 1.3 第三步：获得收益

```
收益发放：
├─ 每日收益：基于质押的 RWA 数量
├─ 收益倍数：根据锁仓期限（1.0x - 2.5x）
├─ 每日收益：5,882.35 × 0.008 × 倍数 = RWA代币/天
├─ 收益类型：RWA代币 + USDT奖励
└─ 可以提取或复投
```

---

## 💰 资金流向（新模式）

### 2.1 完整资金流向

```
用户操作：购买 RWA → 质押 RWA

资金流向：
├─ 用户 USDT → DEX/SwapContract → RWA 代币
│   └─ 推高 RWA 价格 ✅
│
├─ 用户 RWA → Staking Contract
│   ├─ 50% → Treasury（转换为 USDT 用于实体投资）
│   │   └─ 用户获得：stRWA（投资份额凭证）
│   │
│   └─ 50% → Staking Contract（奖励池）
│       ├─ 用于发放 RWA 代币收益
│       ├─ 用于发放 USDT 奖励
│       └─ 用于支付推荐奖励和团队奖金
│
└─ 收益发放：
    ├─ RWA 代币收益（从奖励池发放）
    ├─ USDT 奖励（从奖励池发放）
    └─ 推荐奖励和团队奖金
```

### 2.2 与现有 USDT 质押的对比

| 特性 | USDT 质押（现有） | RWA 质押（新模式） |
|------|-----------------|------------------|
| **质押资产** | USDT | RWA 代币 |
| **购买步骤** | 无需购买 | 需要先购买 RWA |
| **价格影响** | 无直接价格影响 | 推高 RWA 价格 ✅ |
| **资金分配** | 50/50（Treasury/合约） | 50/50（Treasury/合约） |
| **收益类型** | RWA代币 + USDT | RWA代币 + USDT |
| **用户操作** | 一步完成 | 两步完成（购买+质押） |

---

## 📈 价格推高机制

### 3.1 购买需求推高价格

```
机制设计：
├─ 用户必须购买 RWA 才能质押
├─ 购买需求增加 → RWA 价格上涨
├─ 价格上涨 → 早期购买者受益
└─ 形成正向循环

价格影响因素：
├─ 质押需求（用户必须购买 RWA）
├─ 流动性池深度（DEX 或 SwapContract）
├─ 购买量大小（大额购买推高价格）
└─ 市场情绪（价格上涨吸引更多用户）
```

### 3.2 价格稳定机制

```
防止价格过度波动：
├─ 价格稳定合约（PriceStabilizer）
│   ├─ 价格过高时：自动卖出 RWA
│   └─ 价格过低时：自动买入 RWA
│
├─ 动态卖出税（RWAToken）
│   ├─ 根据持有时间调整税率
│   └─ 短期持有税率高，长期持有税率低
│
└─ 流动性管理（LiquidityManager）
    ├─ 自动添加流动性
    └─ 维持池子深度
```

---

## 🔧 合约实现方案

### 4.1 修改 StakingContract

#### 4.1.1 添加 RWA 质押数据结构

```solidity
// StakingContract.sol

// 用户 RWA 质押信息
struct RWAStakeInfo {
    uint256 totalStakedRWA;   // 总质押的 RWA 数量
    uint256 rwaPending;        // 待提取的 RWA 代币
    uint256 usdtRewards;       // USDT 奖励
    uint256 lastWithdrawTime;  // 最后提取时间
    address referrer;          // 推荐人地址
    uint256 firstStakeTime;    // 首次质押时间
    uint8 nodeLevel;           // 节点等级
    bool isActive;             // 是否活跃
}

mapping(address => RWAStakeInfo) public rwaStakes;
uint256 public totalStakedRWA;  // 全局质押的 RWA 总量
```

#### 4.1.2 添加 RWA 质押函数

```solidity
/**
 * @dev Stake RWA tokens
 * @param amount RWA amount (18 decimals)
 * @param referrer Referrer address (optional, only for first stake)
 * @param lockPeriod Lock period in days (0=flexible, 30, 90, 180, 365)
 */
function stakeRWA(uint256 amount, address referrer, uint256 lockPeriod) external nonReentrant whenNotPaused {
    require(amount > 0, "Amount must be greater than zero");
    
    // Transfer RWA from user
    rwaToken.safeTransferFrom(msg.sender, address(this), amount);
    
    // Calculate 50/50 split
    uint256 treasuryAmount = amount / 2;
    uint256 contractAmount = amount - treasuryAmount;
    
    // Transfer 50% to Treasury (convert RWA to USDT for investment)
    // Note: This requires a RWA → USDT swap mechanism
    // For now, we'll transfer RWA to Treasury and let Treasury handle conversion
    rwaToken.safeTransfer(treasuryAddress, treasuryAmount);
    
    // 50% 转换为 stRWA 资产凭证（如果 stRWA 已设置）
    if (address(stRwaToken) != address(0)) {
        (bool success, ) = address(stRwaToken).call(
            abi.encodeWithSignature("mint(address,uint256)", msg.sender, treasuryAmount)
        );
        require(success, "StRWA mint failed");
        emit StRWAMinted(msg.sender, treasuryAmount, block.timestamp);
    }
    
    // Cache user info
    RWAStakeInfo storage stake = rwaStakes[msg.sender];
    
    // Bind referral relationship (only on first stake)
    if (referrer != address(0) && referrer != msg.sender && stake.referrer == address(0)) {
        stake.referrer = referrer;
        emit ReferralBound(msg.sender, referrer, block.timestamp);
    }
    
    // Update user info
    unchecked {
        stake.totalStakedRWA += amount;
    }
    stake.isActive = true;
    
    if (stake.firstStakeTime == 0) {
        stake.firstStakeTime = block.timestamp;
        stake.nodeLevel = 1; // Default to V1
    }
    
    // Store lock period
    require(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365, "Invalid lock period");
    
    // Update global statistics
    unchecked {
        totalStakedRWA += amount;
    }
    
    emit RWAStakeEvent(msg.sender, amount, stake.referrer, block.timestamp, lockPeriod);
}
```

#### 4.1.3 添加 RWA 质押收益提取函数

```solidity
/**
 * @dev Withdraw RWA staking rewards
 * @param amount RWA amount to withdraw (18 decimals)
 * @param chooseStRWA If true, choose "Hold RWA mode" (120% as stRWA), else "Withdraw U mode" (70% as RWA, 30% burn)
 */
function withdrawRWARewards(uint256 amount, bool chooseStRWA) external nonReentrant whenNotPaused {
    RWAStakeInfo storage stake = rwaStakes[msg.sender];
    
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
        require(address(stRwaToken) != address(0), "StRWA token not set");
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
    
    emit RWARewardWithdrawn(msg.sender, amount, fee, block.timestamp);
}
```

#### 4.1.4 添加 RWA 本金提取函数

```solidity
/**
 * @dev Withdraw RWA principal
 * @param amount RWA amount to withdraw (18 decimals)
 */
function withdrawRWAPrincipal(uint256 amount) external nonReentrant whenNotPaused {
    RWAStakeInfo storage stake = rwaStakes[msg.sender];
    
    // Verify user has sufficient balance
    require(stake.totalStakedRWA >= amount, "Insufficient balance");
    
    // Verify cooldown period
    require(
        block.timestamp >= stake.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
        "Withdrawal cooldown active"
    );
    
    // Update user balance
    stake.totalStakedRWA -= amount;
    totalStakedRWA -= amount;
    stake.lastWithdrawTime = block.timestamp;
    
    // Transfer RWA back to user
    rwaToken.safeTransfer(msg.sender, amount);
    
    emit RWAPrincipalWithdrawn(msg.sender, amount, block.timestamp);
}
```

---

## 🎯 完整流程示例

### 5.1 场景：用户质押 RWA

**第1步：购买 RWA 代币**
```
用户持有：10,000 USDT

操作：在 DEX 或 SwapContract 购买 RWA
├─ 当前 RWA 价格：1 RWA = 0.85 USDT
├─ 购买数量：10,000 / 0.85 = 11,764.7 RWA
├─ 购买后价格：1 RWA = 0.86 USDT（价格上涨）
└─ 用户获得：11,764.7 RWA 代币

价格影响：
├─ 购买需求增加 → RWA 价格上涨 ✅
├─ 价格上涨 → 早期购买者受益 ✅
└─ 形成正向循环 ✅
```

**第2步：质押 RWA 代币**
```
用户持有：11,764.7 RWA

操作：stakeRWA(11764.7, referrer, 180)  // 180天锁仓

资金分配：
├─ 5,882.35 RWA → Treasury
│   └─ 转换为 USDT 用于实体投资
│   └─ 用户获得：5,882.35 stRWA（投资份额凭证）
│
└─ 5,882.35 RWA → Staking Contract
    └─ 用于奖励池，发放收益

合约状态：
├─ rwaStakes[user].totalStakedRWA: 11,764.7 RWA
├─ totalStakedRWA: 11,764.7 RWA
└─ 开始产生收益
```

**第3步：获得收益**
```
收益计算：
├─ 基于质押的 RWA 数量：5,882.35 RWA
├─ 收益倍数：2.0x（180天锁仓）
├─ 每日收益：5,882.35 × 0.008 × 2.0 = 94.12 RWA/天
├─ 收益类型：RWA代币 + USDT奖励
└─ 可以提取或复投

收益发放：
├─ RWA 代币收益：从奖励池发放
├─ USDT 奖励：从奖励池发放
└─ 推荐奖励和团队奖金
```

**第4步：提取收益或本金**
```
提取收益：
├─ 操作：withdrawRWARewards(1000, false)
├─ 提取：1,000 RWA（扣除手续费后）
├─ 获得：700 RWA（70%），300 RWA 销毁（30%）
└─ 可以卖出或复投

提取本金：
├─ 操作：withdrawRWAPrincipal(5882.35)
├─ 提取：5,882.35 RWA（合约中的50%）
├─ 获得：5,882.35 RWA
└─ 可以卖出或复投
```

---

## 📊 价格推高机制分析

### 6.1 购买需求推高价格

```
机制设计：
├─ 用户必须购买 RWA 才能质押
├─ 购买需求增加 → RWA 价格上涨
├─ 价格上涨 → 早期购买者受益
└─ 形成正向循环

价格影响因素：
├─ 质押需求（用户必须购买 RWA）✅
├─ 流动性池深度（DEX 或 SwapContract）
├─ 购买量大小（大额购买推高价格）✅
└─ 市场情绪（价格上涨吸引更多用户）✅
```

### 6.2 价格稳定机制

```
防止价格过度波动：
├─ 价格稳定合约（PriceStabilizer）
│   ├─ 价格过高时：自动卖出 RWA
│   └─ 价格过低时：自动买入 RWA
│
├─ 动态卖出税（RWAToken）
│   ├─ 根据持有时间调整税率
│   └─ 短期持有税率高，长期持有税率低
│
└─ 流动性管理（LiquidityManager）
    ├─ 自动添加流动性
    └─ 维持池子深度
```

---

## ✅ 可行性分析

### 7.1 优势

1. ✅ **推高 RWA 价格**
   - 用户必须购买 RWA 才能质押
   - 购买需求增加 → 价格上涨
   - 早期购买者受益

2. ✅ **增加代币需求**
   - 质押需求 → 购买需求 → 价格上涨
   - 形成正向循环

3. ✅ **提高用户参与度**
   - 用户需要先了解 RWA 代币
   - 增加代币持有者数量

4. ✅ **简化资金流向**
   - 不需要 50/50 分配（RWA 直接质押）
   - 或者保持 50/50 分配（RWA → USDT 转换）

### 7.2 挑战

1. ⚠️ **用户操作步骤增加**
   - 需要先购买 RWA，再质押
   - 增加用户操作复杂度

2. ⚠️ **价格波动风险**
   - RWA 价格波动影响用户收益
   - 需要价格稳定机制

3. ⚠️ **流动性要求**
   - 需要足够的 RWA/USDT 流动性池
   - 大额购买可能影响价格

4. ⚠️ **与现有 USDT 质押的关系**
   - 是替代还是并行？
   - 如何平衡两种模式？

---

## 🎯 推荐方案

### 方案 A：并行模式（推荐）

```
两种质押模式并行：
├─ USDT 质押（现有模式）
│   └─ 适合：不想购买 RWA 的用户
│   └─ 操作：一步完成
│
└─ RWA 质押（新模式）
    └─ 适合：想推高 RWA 价格的用户
    └─ 操作：两步完成（购买+质押）
    └─ 优势：推高 RWA 价格 ✅
```

### 方案 B：替代模式

```
只支持 RWA 质押：
├─ 用户必须购买 RWA 才能质押
├─ 推高 RWA 价格 ✅
└─ 简化资金流向
```

### 方案 C：混合模式

```
根据锁仓期限选择：
├─ 灵活锁仓：支持 USDT 质押
├─ 30/90/180/365天：支持 RWA 质押
└─ 鼓励长期锁仓用户购买 RWA
```

---

## 📋 实施步骤

### 8.1 合约修改

1. ✅ 修改 `StakingContract.sol`
   - 添加 RWA 质押数据结构
   - 添加 `stakeRWA()` 函数
   - 添加 `withdrawRWARewards()` 函数
   - 添加 `withdrawRWAPrincipal()` 函数

2. ✅ 修改 `TreasuryContract.sol`
   - 支持接收 RWA 代币
   - 添加 RWA → USDT 转换机制

3. ✅ 更新 `SwapContract.sol`
   - 确保 RWA/USDT 流动性充足
   - 优化购买体验

### 8.2 后端修改

1. ✅ 更新 `DailyYieldService.ts`
   - 支持 RWA 质押收益计算
   - 区分 USDT 质押和 RWA 质押

2. ✅ 更新 `RewardEngine.ts`
   - 支持 RWA 质押奖励计算
   - 统一奖励发放机制

### 8.3 前端修改

1. ✅ 添加 RWA 购买界面
   - 集成 DEX 或 SwapContract
   - 显示 RWA 价格和购买数量

2. ✅ 添加 RWA 质押界面
   - 显示 RWA 余额
   - 支持 RWA 质押操作
   - 显示 RWA 质押收益

---

## 🎯 总结

### 核心逻辑

**新模式：先买 RWA，再质押 RWA**

1. ✅ **用户操作流程**：
   - 用 USDT 购买 RWA 代币
   - 用 RWA 代币进行质押
   - 获得 RWA 代币收益

2. ✅ **价格推高机制**：
   - 购买需求增加 → RWA 价格上涨
   - 价格上涨 → 早期购买者受益
   - 形成正向循环

3. ✅ **资金流向**：
   - 用户 USDT → RWA 代币 → Staking Contract
   - 50% → Treasury（转换为 USDT）
   - 50% → 奖励池（发放收益）

### 可行性

**优势**：
- ✅ 推高 RWA 价格
- ✅ 增加代币需求
- ✅ 提高用户参与度

**挑战**：
- ⚠️ 用户操作步骤增加
- ⚠️ 价格波动风险
- ⚠️ 流动性要求

### 推荐方案

**并行模式**：USDT 质押和 RWA 质押并行，用户可以选择。

---

**这就是 RWA 质押模式的完整逻辑设计！** 🚀
