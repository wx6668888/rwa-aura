# Origin DeFi 所有合约详细分析

## 📋 项目信息

**官网**: https://origindefi.io/#/invite  
**状态**: 网站显示地区限制，无法直接访问  
**网络**: BSC (Binance Smart Chain)  
**分析日期**: 2025-01-27

---

## 🔍 完整合约地址列表

### 一、核心代币合约

#### 1. LGNS 主代币合约
- **地址**: `0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01`
- **类型**: ERC20 代币合约
- **功能**: 
  - 主代币发行和管理
  - 交易税机制（5%）
  - 转账和余额管理
- **BSCScan**: https://bscscan.com/address/0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01#code
- **分析要点**:
  - 查看 `_transfer` 函数实现交易税
  - 查看 `_burn` 函数实现销毁机制
  - 查看 `excludeFromFee` 函数（白名单机制）

#### 2. sLGNS 质押版代币合约
- **地址**: `0x99a57e6c8558bc6689f894e068733adf83c19725`
- **类型**: 质押代币合约
- **功能**:
  - 质押版代币发行
  - 1:1 与 LGNS 兑换
  - 可能包含额外权益（分红、治理）
- **BSCScan**: https://bscscan.com/address/0x99a57e6c8558bc6689f894e068733adf83c19725#code
- **分析要点**:
  - 查看 `mint` 函数（质押时铸造）
  - 查看 `burn` 函数（赎回时销毁）
  - 查看 `convertToLGNS` 函数（转换逻辑）

---

### 二、质押系统合约

#### 3. 质押池合约（核心）
- **地址**: `0x1964Ca90474b11FFD08af387b110ba6C96251Bfc`
- **类型**: 质押池合约
- **功能**:
  - 用户质押 USDT/DAI
  - 分配资金（50% 国库 + 50% 质押池）
  - 奖励分配
  - 提现管理
- **BSCScan**: https://bscscan.com/address/0x1964Ca90474b11FFD08af387b110ba6C96251Bfc#code
- **关键函数**（推测）:
  ```solidity
  function stake(uint256 amount) external
  function unstake(uint256 amount) external
  function withdraw() external
  function getStakeInfo(address user) external view returns (...)
  function calculateRewards(address user) external view returns (uint256)
  ```
- **分析要点**:
  - 资金分配比例（50/50 分配逻辑）
  - 奖励计算机制
  - 锁仓期设置
  - 推荐关系处理

#### 4. 涡轮提现合约
- **地址**: `0x07Ff4e06865de4934409Aa6eCea503b08Cc1C78d`
- **类型**: 快速提现合约
- **功能**:
  - 快速提现通道
  - 可能收取额外手续费
  - 紧急提现功能
- **BSCScan**: https://bscscan.com/address/0x07Ff4e06865de4934409Aa6eCea503b08Cc1C78d#code
- **分析要点**:
  - 提现手续费率
  - 是否有时间限制
  - 资金池管理

---

### 三、资金管理合约

#### 5. 国库地址
- **地址**: `0x7B9B7d4F870A38e92c9a181B00f9b33cc8Ef5321`
- **类型**: 资金存储地址（可能是普通地址或合约）
- **功能**:
  - 存储 50% 的质押资金
  - DAI/USDT 储备金管理
  - 项目资金储备
- **BSCScan**: https://bscscan.com/address/0x7B9B7d4F870A38e92c9a181B00f9b33cc8Ef5321#code
- **分析要点**:
  - 检查是否为合约地址
  - 资金流入流出记录
  - 余额变化趋势

#### 6. 交易所底池地址
- **地址**: `0x882df4b0fb50a229c3b4124eb18c759911485bfb`
- **类型**: 流动性池地址
- **功能**:
  - DEX 交易对流动性
  - 自动加池机制
  - 交易税回流
- **BSCScan**: https://bscscan.com/address/0x882df4b0fb50a229c3b4124eb18c759911485bfb#code
- **分析要点**:
  - 是否为 PancakeSwap 或其他 DEX 的 LP 地址
  - 流动性池代币余额
  - 交易对信息

#### 7. DAO 管理奖励地址
- **地址**: `0x0309Ca717d6989676194b88fD06029a88CEEfee6`
- **类型**: 奖励分配地址（可能是合约）
- **功能**:
  - DAO 治理奖励
  - 分红分配
  - 可能包含推荐奖励
- **BSCScan**: https://bscscan.com/address/0x0309Ca717d6989676194b88fD06029a88CEEfee6#code
- **分析要点**:
  - 是否为多签钱包
  - 奖励分配逻辑
  - 推荐关系处理

---

### 四、销毁机制合约

#### 8. 手续费销毁地址
- **地址**: `0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E`
- **类型**: 销毁地址（通常是零地址或特殊地址）
- **功能**:
  - 接收 2.1% 交易手续费
  - 代币销毁（通缩机制）
- **BSCScan**: https://bscscan.com/address/0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E#code
- **分析要点**:
  - 检查是否为零地址（0x000...）
  - 销毁代币总量
  - 销毁频率

#### 9. 撤回销毁地址
- **地址**: `0xeeeabf5304a7ed876e7a28ec016bb57ae6e89f26`
- **类型**: 销毁地址
- **功能**:
  - 用户撤回代币时销毁
  - 可能用于惩罚机制
- **BSCScan**: https://bscscan.com/address/0xeeeabf5304a7ed876e7a28ec016bb57ae6e89f26#code
- **分析要点**:
  - 销毁触发条件
  - 销毁比例

---

### 五、匿名稳定币系统合约

#### 10. 匿名稳定币A主合约
- **地址**: `0x6631eE651DA438Db2BE611B5A44dFE2Ca04590C5`
- **类型**: 匿名稳定币发行合约
- **功能**:
  - 匿名稳定币A的发行和管理
  - 隐私交易功能
  - 代币转换
- **BSCScan**: https://bscscan.com/address/0x6631eE651DA438Db2BE611B5A44dFE2Ca04590C5#code
- **关键函数**（推测）:
  ```solidity
  function mint(address to, uint256 amount) external
  function burn(uint256 amount) external
  function convert(address token, uint256 amount) external
  ```
- **分析要点**:
  - 匿名机制实现
  - 与其他代币的兑换比例
  - 隐私保护机制

#### 11. 匿名稳定币A空投合约
- **地址**: `0x7DC3d391dD1303894eB359b483C8894A0C1Cf681`
- **类型**: 空投合约
- **功能**:
  - 空投匿名稳定币A给用户
  - 可能用于营销活动
- **BSCScan**: https://bscscan.com/address/0x7DC3d391dD1303894eB359b483C8894A0C1Cf681#code
- **分析要点**:
  - 空投条件
  - 空投数量
  - 白名单机制

#### 12. 销毁铸造A合约
- **地址**: `0xA6036c7ae9F7dAE757E9BeE5BF02860A8D5F457e`
- **类型**: 销毁铸造合约
- **功能**:
  - 销毁其他代币（USDT、LGNS等）
  - 铸造匿名稳定币A
  - 1:1 或特定比例兑换
- **BSCScan**: https://bscscan.com/address/0xA6036c7ae9F7dAE757E9BeE5BF02860A8D5F457e#code
- **关键函数**（推测）:
  ```solidity
  function burnAndMint(address token, uint256 amount) external
  function getConversionRate(address token) external view returns (uint256)
  ```
- **分析要点**:
  - 支持的代币类型
  - 兑换比例
  - 手续费设置

#### 13. 撤底池销毁系统
- **撤底池合约**: `0x1D6A7F2cB262aFbb1204bbFCBb3db642662b15c3`
- **销毁中转地址**: `0x9dA64DF74565861708781B9Ad2e559b7328b97c4`
- **类型**: 流动性池管理合约
- **功能**:
  - 撤出流动性池时销毁A代币
  - 流动性管理
- **BSCScan**:
  - 撤底池: https://bscscan.com/address/0x1D6A7F2cB262aFbb1204bbFCBb3db642662b15c3#code
  - 销毁中转: https://bscscan.com/address/0x9dA64DF74565861708781B9Ad2e559b7328b97c4#code
- **分析要点**:
  - 撤出流动性时的销毁逻辑
  - 流动性池管理机制

---

## 🏗️ 完整系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Origin DeFi 完整生态系统                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│   LGNS 主代币合约          │         │   sLGNS 质押代币合约      │
│   0xeb51d9a39ad5...       │◄───────►│   0x99a57e6c8558bc...    │
│   - 交易税 5%              │  1:1    │   - 质押获得             │
│   - 转账管理               │         │   - 额外权益             │
│   - 销毁机制               │         │   - 治理权               │
└──────────────────────────┘         └──────────────────────────┘
         │                                      │
         │ 交易税 5%                            │ 质押
         │                                      │
         ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        资金分配系统                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 国库地址      │  │ 质押池合约   │  │ 交易所底池   │          │
│  │ 50%资金       │  │ 50%资金      │  │ 流动性管理   │          │
│  │ DAI/USDT储备  │  │ 奖励分配     │  │ DEX交易对    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 手续费销毁    │  │ DAO管理奖励   │  │ 涡轮提现     │          │
│  │ 2.1%交易税    │  │ 治理分红     │  │ 快速通道     │          │
│  │ 通缩机制      │  │ 推荐奖励     │  │ 紧急提现     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ 撤回销毁地址  │                                               │
│  │ 惩罚机制      │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   匿名隐私稳定币A系统                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 主合约        │  │ 空投合约     │  │ 销毁铸造     │          │
│  │ 发行管理      │  │ 营销活动     │  │ 代币转换     │          │
│  │ 隐私交易      │  │ 用户奖励     │  │ 1:1兑换      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ 撤底池合约    │  │ 销毁中转地址 │                             │
│  │ 流动性管理    │  │ 销毁A代币    │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔬 详细分析步骤

### 步骤 1: 访问 BSCScan 查看合约

**优先级排序**（按重要性）：

1. **质押池合约**（最重要）
   ```
   https://bscscan.com/address/0x1964Ca90474b11FFD08af387b110ba6C96251Bfc#code
   ```
   - 查看是否有 "Contract" 标签
   - 如果有源代码，复制完整代码
   - 查看 "Read Contract" 标签，了解可调用函数
   - 查看 "Write Contract" 标签，了解需要权限的函数

2. **LGNS 主代币合约**
   ```
   https://bscscan.com/address/0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01#code
   ```
   - 查看交易税实现
   - 查看白名单机制
   - 查看销毁逻辑

3. **sLGNS 质押代币合约**
   ```
   https://bscscan.com/address/0x99a57e6c8558bc6689f894e068733adf83c19725#code
   ```
   - 查看转换逻辑
   - 查看权益分配

### 步骤 2: 分析交易记录

在 BSCScan 上查看每个地址的 "Transactions" 标签：

1. **查看质押池合约的交易**
   - 找到 `stake` 函数调用
   - 分析资金流向（50/50 分配）
   - 查看奖励分配逻辑

2. **查看代币合约的交易**
   - 分析交易税分配
   - 查看销毁记录
   - 查看白名单地址

### 步骤 3: 分析合约交互

使用 BSCScan 的 "Contract" → "Read Contract" 功能：

1. **质押池合约**
   - 调用 `getStakeInfo(address)` 查看用户质押信息
   - 调用 `calculateRewards(address)` 查看奖励计算
   - 查看总质押量、总奖励池等

2. **代币合约**
   - 查看总供应量
   - 查看销毁总量
   - 查看白名单地址

---

## 📊 关键机制分析

### 1. 质押机制（推测）

```solidity
// 用户质押流程
function stake(uint256 amount) external {
    // 1. 接收用户 USDT/DAI
    usdt.transferFrom(msg.sender, address(this), amount);
    
    // 2. 50% 转入国库
    uint256 treasuryAmount = amount * 50 / 100;
    usdt.transfer(treasuryAddress, treasuryAmount);
    
    // 3. 50% 保留在质押池
    uint256 poolAmount = amount - treasuryAmount;
    
    // 4. 铸造 sLGNS（1:1 比例）
    sLgns.mint(msg.sender, amount);
    
    // 5. 记录质押信息
    stakeInfo[msg.sender].amount += amount;
    stakeInfo[msg.sender].timestamp = block.timestamp;
    
    // 6. 更新总质押量
    totalStaked += amount;
}
```

### 2. 交易税机制（推测）

```solidity
function _transfer(address from, address to, uint256 amount) internal {
    // 检查是否需要收税
    bool takeFee = !_isExcludedFromFee[from] && !_isExcludedFromFee[to];
    
    if (takeFee) {
        uint256 taxAmount = amount * 5 / 100;  // 5% 交易税
        
        // 2.1% 销毁
        uint256 burnAmount = taxAmount * 21 / 50;
        _burn(from, burnAmount);
        
        // 2.9% 分配给其他地址
        uint256 remaining = taxAmount - burnAmount;
        uint256 daoAmount = remaining * 30 / 100;  // 假设 30% 给 DAO
        uint256 poolAmount = remaining - daoAmount;  // 剩余给流动性池
        
        _transfer(from, daoRewardAddress, daoAmount);
        _transfer(from, exchangePoolAddress, poolAmount);
        
        amount = amount - taxAmount;
    }
    
    _transferStandard(from, to, amount);
}
```

### 3. 双代币转换机制（推测）

```solidity
// LGNS → sLGNS（质押）
function stakeLGNS(uint256 amount) external {
    lgns.transferFrom(msg.sender, address(this), amount);
    sLgns.mint(msg.sender, amount);  // 1:1 兑换
}

// sLGNS → LGNS（赎回）
function unstakeLGNS(uint256 amount) external {
    sLgns.burnFrom(msg.sender, amount);
    lgns.transfer(msg.sender, amount);  // 1:1 兑换
}
```

### 4. 匿名稳定币机制（推测）

```solidity
// 销毁其他代币，铸造匿名稳定币A
function burnAndMint(address token, uint256 amount) external {
    // 1. 接收其他代币
    IERC20(token).transferFrom(msg.sender, address(this), amount);
    
    // 2. 销毁代币（发送到销毁地址）
    IERC20(token).transfer(burnAddress, amount);
    
    // 3. 铸造匿名稳定币A（1:1 比例）
    stablecoinA.mint(msg.sender, amount);
}
```

---

## 🎯 与 RWA 项目的对比分析

| 特性 | Origin DeFi | RWA 项目 | 说明 |
|------|------------|---------|------|
| **双代币系统** | ✅ LGNS/sLGNS | ✅ RWA/stRWA | 都采用双代币质押模式 |
| **质押机制** | ✅ USDT/DAI | ✅ USDT | 都支持稳定币质押 |
| **资金分配** | ✅ 50% 国库 + 50% 池 | ❓ 待确认 | Origin 有明确的分配比例 |
| **交易税** | ✅ 5% | ✅ 20% | RWA 税率更高 |
| **销毁机制** | ✅ 2.1% | ✅ 5% | RWA 销毁比例更高 |
| **匿名稳定币** | ✅ 有 | ❌ 无 | Origin 独有的隐私功能 |
| **涡轮提现** | ✅ 有 | ⚠️ 紧急提现 | 功能类似但名称不同 |
| **推荐奖励** | ❓ 未知 | ✅ 15代级差 | RWA 有明确的推荐机制 |
| **锁仓机制** | ❓ 未知 | ✅ 分层锁仓 | RWA 有更复杂的锁仓系统 |

---

## 🔧 如何获取合约源代码

### 方法 1: BSCScan 直接查看（如果已验证）

1. 访问合约地址页面
2. 点击 "Contract" 标签
3. 如果有 "Code" 标签，说明合约已验证
4. 复制完整源代码

### 方法 2: 使用 BSCScan API

```javascript
// 获取合约源代码
const apiKey = 'YOUR_BSCSCAN_API_KEY';
const address = '0x1964Ca90474b11FFD08af387b110ba6C96251Bfc';

fetch(`https://api.bscscan.com/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`)
  .then(response => response.json())
  .then(data => {
    console.log(data.result[0].SourceCode);
  });
```

### 方法 3: 反编译合约（如果未验证）

1. 使用 BSCScan 的 "Contract" → "Decompile Bytecode" 功能
2. 或使用在线工具如 [Dedaub](https://library.dedaub.com/decompile)
3. 或使用本地工具如 [Panoramix](https://github.com/palkeo/panoramix)

---

## 📝 分析检查清单

### 核心合约分析

- [ ] 质押池合约源代码
- [ ] LGNS 代币合约源代码
- [ ] sLGNS 代币合约源代码
- [ ] 交易税实现逻辑
- [ ] 资金分配逻辑（50/50）
- [ ] 奖励计算机制

### 功能合约分析

- [ ] 涡轮提现合约
- [ ] 匿名稳定币主合约
- [ ] 销毁铸造合约
- [ ] 撤底池合约

### 地址分析

- [ ] 国库地址（是否为合约）
- [ ] DAO 奖励地址（是否为多签）
- [ ] 销毁地址（余额和销毁记录）
- [ ] 交易所底池（LP 代币信息）

### 机制分析

- [ ] 质押流程完整逻辑
- [ ] 提现流程和限制
- [ ] 推荐奖励机制（如果存在）
- [ ] 锁仓机制（如果存在）
- [ ] 匿名稳定币兑换机制

---

## 🚀 下一步操作建议

1. **优先分析质押池合约**
   - 这是整个系统的核心
   - 包含最重要的业务逻辑

2. **分析代币合约**
   - 了解交易税机制
   - 了解销毁机制

3. **查看交易记录**
   - 分析实际运行情况
   - 验证推测的逻辑

4. **对比 RWA 项目**
   - 找出可以借鉴的机制
   - 优化 RWA 项目的实现

---

## 📚 参考资源

- **BSCScan**: https://bscscan.com/
- **BSCScan API 文档**: https://docs.bscscan.com/
- **Solidity 文档**: https://docs.soliditylang.org/
- **OpenZeppelin 合约库**: https://docs.openzeppelin.com/contracts/

---

**请访问上述 BSCScan 链接，查看合约源代码，然后我可以帮您进行更详细的分析！**
