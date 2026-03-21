# StRWA.sol 合约详细说明

## 📋 什么是 StRWA？

**StRWA** = **Staked RWA** = **锁仓RWA** = **实体资产代币化凭证**

### 核心概念

StRWA 是一个 **ERC20 代币合约**，代表用户持有的**实体资产代币化凭证**。

**关键特点**：
- ✅ **1 stRWA = 1 USDT 等值的实体资产**
- ✅ **资产凭证化**：将用户质押的50%资金转换为可交易的资产凭证
- ✅ **降低心理压力**：用户感觉"还持有资产"，而非"资金被没收"
- ✅ **提供退出通道**：可在二级市场交易或等待实体资产清结算

---

## 🎯 为什么需要 StRWA？

### 问题背景

在 RWA 项目中，用户质押的 USDT 会按 **50/50 分配**：
- 50% → Treasury（储备金，用于实体投资）
- 50% → Staking 池（社区激励池）

**用户心理压力**：
- ❌ "50%不返还" → 心理压力大
- ❌ 容易被攻击为"资金盘"
- ❌ 用户担心资金安全

### 解决方案：资产凭证化

**StRWA 的作用**：
- ✅ **包装为"资产凭证"**：50%转换为 stRWA，用户名义上还持有资产
- ✅ **提供流动性**：可在 SwapContract 上交易 stRWA ↔ RWA
- ✅ **降低心理压力**：从"不返还"变为"资产凭证化"
- ✅ **合规性提升**：符合 DeFi 叙事，降低监管风险

---

## 💰 StRWA 的使用场景

### 场景1：用户质押时

```
用户质押 10,000 USDT

资金分配：
├─ 50% (5,000 USDT) → Treasury
│   └─ 转换为 5,000 stRWA 资产凭证
│   └─ 用户获得 5,000 stRWA 代币
│
└─ 50% (5,000 USDT) → Staking 池
    └─ 用于收益分配
```

**用户看到**：
- ✅ 钱包中有 5,000 stRWA 代币
- ✅ 感觉"还持有资产"
- ✅ 心理压力降低

### 场景2：用户提现时（持RWA模式）

```
用户收益：500 RWA

选择"持RWA模式"：
├─ 基础收益：500 RWA
├─ 加成奖励：500 × 20% = 100 RWA
├─ 总计：600 stRWA（锁仓30天）
└─ 分批解锁：每天解锁10%（60 stRWA/天）
```

**优势**：
- ✅ 获得120%收益（而非70%）
- ✅ 分批解锁，减少抛压
- ✅ 鼓励长期持有

### 场景3：二级市场交易

```
用户持有 5,000 stRWA

退出方式：
├─ 方式1：在 SwapContract 上互换
│   └─ stRWA → RWA（1:1比例，无税）
│   └─ 然后卖出 RWA（有动态卖出税）
│
├─ 方式2：等待实体资产清结算
│   └─ 项目方定期回购 stRWA
│   └─ 按实体资产价值结算
│
└─ 方式3：在 DEX 上直接交易
    └─ 如果有流动性池
```

---

## 🏗️ StRWA.sol 合约实现

### 基础版本（MVP）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StRWA
 * @dev Staked RWA - 实体资产代币化凭证
 * 
 * stRWA 代表用户持有的实体资产凭证
 * 1 stRWA = 1 USDT 等值的实体资产
 * 可在二级市场交易或等待实体资产清结算
 */
contract StRWA is ERC20, Ownable {
    // 质押合约地址（只有质押合约可以铸造/销毁）
    address public stakingContract;
    
    /**
     * @dev 构造函数
     */
    constructor() ERC20("Staked RWA", "stRWA") Ownable(msg.sender) {}
    
    /**
     * @dev 设置质押合约地址（仅Owner可调用）
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid address");
        stakingContract = _stakingContract;
    }
    
    /**
     * @dev 铸造 stRWA（仅质押合约可调用）
     * 
     * 使用场景：
     * - 用户质押时：50%转换为 stRWA
     * - 用户选择"持RWA模式"提现时：120%收益转换为 stRWA
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking contract");
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁 stRWA（仅质押合约可调用）
     * 
     * 使用场景：
     * - 用户解锁 stRWA 时
     * - 用户互换 stRWA → RWA 时
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking contract");
        _burn(from, amount);
    }
    
    /**
     * @dev 批量转账（用于实体资产清结算）
     * 
     * 使用场景：
     * - 项目方定期回购 stRWA
     * - 实体资产清结算时批量转账
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
}
```

### 完整版本（后续迭代）

完整版本可以添加：
- ✅ 锁仓机制（30/90/180/365天）
- ✅ 解锁流程（7天解锁期 + 3天冷却期）
- ✅ 锁仓时间加成（最高+50%）
- ✅ 持币分红分配（按 stRWA 持有量）
- ✅ 铸造限额（单次+每日）

---

## 🔄 StRWA 的工作流程

### 流程1：用户质押

```
1. 用户调用 StakingContract.stake(10,000 USDT)
   ↓
2. StakingContract 内部：
   ├─ 50% (5,000 USDT) → Treasury
   └─ 50% (5,000 USDT) → Staking 池
   ↓
3. StakingContract 调用 StRWA.mint(user, 5,000 stRWA)
   ↓
4. 用户钱包收到 5,000 stRWA 代币
```

### 流程2：用户提现（持RWA模式）

```
1. 用户调用 StakingContract.withdraw(500 RWA, chooseStRWA=true)
   ↓
2. StakingContract 计算：
   ├─ 基础收益：500 RWA
   ├─ 加成奖励：500 × 20% = 100 RWA
   └─ 总计：600 stRWA
   ↓
3. StakingContract 调用 StRWA.mint(user, 600 stRWA)
   ↓
4. 用户钱包收到 600 stRWA（锁仓30天）
```

### 流程3：用户互换 stRWA → RWA

```
1. 用户调用 SwapContract.swapStRWAToRWA(1,000 stRWA)
   ↓
2. SwapContract 内部：
   ├─ 从用户转账 1,000 stRWA 到合约
   ├─ 从合约转账 1,000 RWA 给用户
   └─ 更新池子余额
   ↓
3. 用户获得 1,000 RWA（可以卖出，有动态卖出税）
```

---

## 📊 StRWA 与 RWA 的区别

| 特性 | RWA | stRWA |
|------|-----|-------|
| **全称** | RWA Token | Staked RWA |
| **代表** | 项目代币 | 实体资产凭证 |
| **用途** | 交易、收益 | 资产凭证、分红 |
| **交易税** | 有（动态10%-50%） | 无（互换时） |
| **流动性** | DEX + SwapContract | SwapContract |
| **价值** | 市场价 | 1:1 USDT等值 |
| **铸造** | 初始供应量 | 质押时铸造 |

---

## 🎯 StRWA 的核心价值

### 1. 用户心理保障

**问题**：用户担心"50%不返还"

**解决**：
- ✅ 50%转换为 stRWA 资产凭证
- ✅ 用户名义上还持有资产
- ✅ 提供退出通道（SwapContract）
- ✅ 降低心理压力

### 2. 提供流动性

**问题**：用户无法退出

**解决**：
- ✅ SwapContract 提供内部流动性
- ✅ stRWA ↔ RWA 互换（无税）
- ✅ 用户可以选择退出时机

### 3. 合规性提升

**问题**：容易被攻击为"资金盘"

**解决**：
- ✅ "资产凭证化"符合 DeFi 叙事
- ✅ 符合 RWA（真实世界资产）概念
- ✅ 降低监管风险

### 4. 激励机制

**问题**：如何鼓励长期持有

**解决**：
- ✅ 持RWA模式：120%收益（vs 70%）
- ✅ 锁仓时间加成（最高+50%）
- ✅ 持币分红（按 stRWA 持有量）

---

## ⚠️ 重要注意事项

### 1. 安全性

- ✅ 只有 StakingContract 可以铸造/销毁
- ✅ Owner 可以设置 StakingContract 地址
- ✅ 使用 OpenZeppelin 安全库

### 2. 铸造限额（完整版本）

为了防止无限铸造，可以添加：
- ✅ 单次铸造限额
- ✅ 每日铸造限额
- ✅ 总供应量上限

### 3. 解锁机制（完整版本）

如果添加锁仓功能：
- ✅ 7天解锁期
- ✅ 3天冷却期
- ✅ 分批解锁（每天10%）

---

## 📝 总结

**StRWA.sol 是什么？**

1. **ERC20 代币合约**：代表实体资产代币化凭证
2. **资产凭证化工具**：将50%质押资金转换为可交易的资产凭证
3. **用户心理保障**：降低"资金不返还"的心理压力
4. **流动性提供者**：通过 SwapContract 提供退出通道
5. **激励机制**：鼓励长期持有，获得更高收益

**核心价值**：
- ✅ 用户感觉"还持有资产"
- ✅ 提供退出通道
- ✅ 降低心理压力
- ✅ 提升合规性

---

**这是 StRWA.sol 合约的完整说明。它是项目"用户不亏保障机制"的核心组件之一。**
