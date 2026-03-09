# Origin World 项目架构分析

## 📋 项目信息

**官网**: https://originworld.org/  
**状态**: 网站显示加载中，无法直接访问

**相关项目**: 
- Origin DeFi (origindefi.io) - 可能是同一项目或相关项目
- 合约地址列表已提供

---

## 🔍 基于合约地址和常见模式的架构分析

### 一、核心系统架构

根据您提供的合约地址和搜索结果中的常见DeFi模式，这个项目可能采用以下架构：

#### 1. 双代币质押系统

```
用户质押流程：
用户质押 USDT/DAI
    ↓
质押池合约（0x1964Ca90474b11FFD08af387b110ba6C96251Bfc）
    ↓
获得 sLGNS（质押版代币）
    ↓
获得收益（LGNS代币）
```

**代币合约**：
- **LGNS**（主代币）: `0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01`
- **sLGNS**（质押版）: `0x99a57e6c8558bc6689f894e068733adf83c19725`

---

#### 2. 交易税分配机制（参考常见模式）[2][4]

根据搜索结果，典型的DeFi项目采用以下税率分配：

```
用户交易 LGNS（卖出）
    │
    ├─ 5% 交易手续费
    │   │
    │   ├─ 2.1% → 手续费销毁地址
    │   │   └─ 0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E
    │   │   └─ 通缩机制
    │   │
    │   └─ 2.9% → 其他用途
    │       ├─ 营销税：扣除代币兑换为USDT进营销钱包[2]
    │       ├─ 回流税：自动加池子增加流动性[2]
    │       ├─ LP分红税：分配给加池用户[2][4]
    │       └─ 推荐返利：多级返佣机制[2]
```

**典型分配比例**（参考）：
- 营销：30-40%
- 回流：30-40%
- 销毁：20-30%
- LP分红：10-20%

---

#### 3. 推荐返利机制（参考常见模式）[2][3]

根据搜索结果，推荐返利机制通常：

```
推荐返利系统：
    │
    ├─ 多层级返佣（最高7层）[2]
    │   └─ 每层返佣比例递减
    │
    ├─ 返佣触发条件
    │   ├─ 用户质押时触发
    │   ├─ 用户交易时触发
    │   └─ 用户加池时触发
    │
    └─ 返佣分配
        ├─ 直推：最高返佣比例
        ├─ 间推：递减返佣比例
        └─ 深度限制：防止无限层级
```

**典型返佣比例**（参考）：
- 第1层（直推）：15-25%
- 第2层：10-15%
- 第3层：5-10%
- 第4-7层：递减至1-5%

---

#### 4. LP分红机制（参考常见模式）[2][4]

```
LP分红系统：
    │
    ├─ 用户加池
    │   └─ 提供流动性，获得LP代币
    │
    ├─ LP分红触发
    │   ├─ 交易税的一部分进入LP分红池
    │   └─ 按LP持有量分配
    │
    └─ 分红分配
        ├─ 按LP持有量比例分配
        ├─ 可能有锁仓加成
        └─ 定期发放（每日/每周）
```

---

#### 5. 反机器人保护（参考常见模式）[1]

```
安全机制：
    │
    ├─ 防狙击机制
    │   └─ 前3个区块自动拉黑机器人地址[1]
    │
    ├─ 防鲸鱼机制
    │   ├─ 单笔交易限额
    │   └─ 最大持币限制
    │
    └─ 黑名单功能
        ├─ 自动拉黑机器人
        └─ 手动管理黑名单
```

---

## 🎯 完整项目架构推测

### 核心流程

```
用户注册
    ↓
绑定推荐人（可选）
    ↓
质押 USDT/DAI
    ├─ 50% → 国库（储备金）
    └─ 50% → 质押池
        ↓
获得 sLGNS（质押版代币）
        ↓
获得收益（LGNS代币）
        ↓
选择操作：
    ├─ 提取收益
    ├─ 继续质押
    ├─ 加池获得LP分红
    └─ 交易（触发交易税和推荐返利）
```

---

### 资金流向

```
用户质押 10,000 USDT
    │
    ├─ 5,000 USDT → 国库地址
    │   └─ 0x7B9B7d4F870A38e92c9a181B00f9b33cc8Ef5321
    │   └─ 储备金管理
    │
    └─ 5,000 USDT → 质押池地址
        └─ 0x1964Ca90474b11FFD08af387b110ba6C96251Bfc
        └─ 用于奖励分配
```

---

### 交易税分配（推测）

```
用户卖出 LGNS
    │
    ├─ 5% 交易手续费
    │   │
    │   ├─ 2.1% → 销毁地址
    │   │   └─ 0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E
    │   │
    │   └─ 2.9% → 其他用途
    │       ├─ 营销钱包（兑换为USDT）
    │       ├─ 回流池（自动加池）
    │       ├─ LP分红池（分配给LP持有者）
    │       └─ 推荐返利（分配给推荐人）
```

---

## 💡 关键机制推测

### 1. 质押机制

**可能的实现**：
```solidity
function stake(uint256 amount, address referrer) external {
    // 50% 转入国库
    usdt.transfer(treasuryAddress, amount * 50 / 100);
    
    // 50% 保留在质押池
    usdt.transferFrom(msg.sender, address(this), amount * 50 / 100);
    
    // 绑定推荐关系
    if (referrer != address(0)) {
        bindReferrer(msg.sender, referrer);
    }
    
    // 铸造 sLGNS（1:1 比例）
    sLgns.mint(msg.sender, amount);
}
```

### 2. 推荐返利机制

**可能的实现**（参考多层级返佣）[2]：
```solidity
function distributeReferralReward(address user, uint256 amount) internal {
    address currentReferrer = referrers[user];
    uint256 depth = 0;
    uint256 totalReward = 0;
    
    // 最多7层返佣[2]
    while (currentReferrer != address(0) && depth < 7) {
        uint256 rewardRate = getRewardRate(depth);  // 递减比例
        uint256 reward = amount * rewardRate / 100;
        
        // 分配奖励
        distributeReward(currentReferrer, reward);
        
        totalReward += reward;
        currentReferrer = referrers[currentReferrer];
        depth++;
    }
    
    // 确保总返佣不超过上限（如50%）
    require(totalReward <= amount * 50 / 100, "Reward exceeds limit");
}
```

### 3. LP分红机制

**可能的实现**（参考加池分红）[2][4]：
```solidity
function addLiquidity(uint256 amount) external {
    // 用户加池
    // 获得LP代币
    // 记录LP持有量
    
    lpHolders[msg.sender] += lpAmount;
    totalLP += lpAmount;
}

function distributeLPDividend() external {
    uint256 dividendPool = getDividendPool();  // 来自交易税
    
    // 按LP持有量分配
    for (each LP holder) {
        uint256 share = dividendPool * lpAmount / totalLP;
        distributeReward(holder, share);
    }
}
```

---

## 📊 与RWA项目的对比

### 相似点

| 特性 | Origin World | RWA项目 |
|------|-------------|---------|
| 双代币系统 | ✅ LGNS/sLGNS | ✅ RWA/stRWA |
| 质押机制 | ✅ | ✅ |
| 国库储备 | ✅ DAI/USDT | ✅ USDT |
| 交易税 | ✅ 5% | ✅ 20% |
| 销毁机制 | ✅ 2.1% | ✅ 5% |
| 推荐返利 | ✅ 多层级 | ✅ 15代级差奖励 |

### 不同点

| 特性 | Origin World | RWA项目 |
|------|-------------|---------|
| LP分红 | ✅ 有 | ❌ 无（但有持币分红） |
| 匿名稳定币 | ✅ 有 | ❌ 无 |
| 涡轮提现 | ✅ 有 | ⚠️ 紧急提现 |
| 返佣层级 | ❓ 可能7层 | ✅ 15代 |

---

## 🔧 如何获取更多信息

### 方法1：查看BSCScan合约（推荐）

**优先查看的合约**：

1. **质押池合约**（最可能已验证）
   ```
   https://bscscan.com/address/0x1964Ca90474b11FFD08af387b110ba6C96251Bfc#code
   ```

2. **sLGNS 代币合约**
   ```
   https://bscscan.com/address/0x99a57e6c8558bc6689f894e068733adf83c19725#code
   ```

3. **LGNS 代币合约**
   ```
   https://bscscan.com/address/0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01#code
   ```

### 方法2：查看官网（需要VPN或等待加载）

1. 访问 https://originworld.org
2. 查找以下信息：
   - 项目白皮书
   - 合约地址列表
   - 质押机制说明
   - 收益计算方式
   - 推荐返利规则

### 方法3：查看交易记录

在BSCScan上查看这些地址的交易记录，可以推断：
- 资金流向
- 函数调用
- 业务逻辑

---

## ✅ 建议

### 如果您能访问官网或BSCScan：

1. **查找以下信息**：
   - 项目白皮书或文档
   - 合约地址列表
   - 质押机制说明
   - 推荐返利规则
   - LP分红机制

2. **查看BSCScan合约**：
   - 优先查看质押池合约
   - 查看sLGNS代币合约
   - 分析核心逻辑

3. **提供给我分析**：
   - 将合约源代码复制给我
   - 或者将官网信息截图/复制给我
   - 我可以详细分析项目架构

---

## 🎯 下一步操作

**建议操作顺序**：

1. **尝试访问质押池合约**：
   ```
   https://bscscan.com/address/0x1964Ca90474b11FFD08af387b110ba6C96251Bfc#code
   ```
   看看是否有 "Contract" 标签和源代码

2. **如果能看到源代码**：
   - 复制源代码给我
   - 我可以详细分析每个函数
   - 梳理完整的项目架构

3. **如果看不到源代码**：
   - 查看 "Read Contract" 标签
   - 查看交易记录
   - 我可以根据这些信息推断架构

4. **访问官网**（如果可能）：
   - 使用VPN访问或等待加载完成
   - 查找白皮书或文档
   - 截图或复制关键信息给我

---

**请尝试访问质押池合约地址，看看能否看到源代码！或者提供官网的关键信息，我可以帮您详细分析！**
