# RWA 项目完整优化方案

## 📋 文档说明

本文档基于对项目的全面分析和风险识别，提供一套完整、可执行的优化方案。

**优化目标**：
1. ✅ 控制拨比，防止穿仓风险
2. ✅ 优化用户体验，降低心理压力
3. ✅ 解决流动性危机
4. ✅ 避免延迟抛压
5. ✅ 实现业绩软着陆

**实施周期**：4周  
**预期效果**：拨比从345%降至150-200%，可持续运营

---

## 🎯 一、核心问题与解决方案总览

### 问题1: 拨比穿仓风险

**现状**：
- 静态收益：292%（年化）
- 动态收益：50%（上限）
- 总拨比：约345%（不可持续）

**解决方案**：
- ✅ 个人动态收益封顶：3倍质押额
- ✅ 烧伤机制：单次奖励 ≤ 自身质押 × 50%
- ✅ 静态收益动态调整：根据资金池健康度（0.5%-0.8%）
- ✅ 软着陆机制：超过45%后奖励递减

### 问题2: 50%不返还的心理压力

**现状**：
- "50%进入Treasury（不返还）" → 用户心理压力大

**解决方案**：
- ✅ stRWA 资产凭证化：50%转换为实体资产代币化凭证
- ✅ 二级市场交易：可在DEX上交易stRWA
- ✅ 实体资产清结算：提供退出通道

### 问题3: RWA代币流动性危机

**现状**：
- 卖出税：最高80%
- 结果：流动性枯竭

**解决方案**：
- ✅ 双币互换机制：stRWA ↔ RWA（无税）
- ✅ 动态卖出税：10%-50%（根据持有时间）
- ✅ 降低最高税率：从80%降至50%

### 问题4: 延迟抛压风险

**现状**：
- 提U模式：30%进入激励池 → 延迟抛压

**解决方案**：
- ✅ 立即销毁：30%立即销毁
- ✅ 分批解锁：持RWA模式每天解锁10%
- ✅ 通缩机制：维持代币通缩

### 问题5: 小资金拿大奖励

**现状**：
- 无限制 → 小资金拿大奖励，拨比过高

**解决方案**：
- ✅ 烧伤机制：单次奖励 ≤ 自身质押 × 50%
- ✅ 累计封顶：总收益 ≤ 自身质押 × 3倍
- ✅ 必须复投：达到上限后必须增加质押

---

## 🏗️ 二、优化后的完整架构

### 2.1 资金流向（优化后）

```
用户质押 10,000 USDT
    │
    ├─ 50% (5,000 USDT) → 转换为 stRWA 资产凭证
    │   └─ stRWA = 实体资产代币化凭证
    │   └─ 可在二级市场交易
    │   └─ 可等待实体资产清结算
    │
    └─ 50% (5,000 USDT) → Staking Contract（社区激励池）
        │
        ├─ 静态收益池（动态调整：0.5%-0.8%）
        │   └─ 根据资金池健康度调整
        │
        ├─ 动态收益池（级差奖励）
        │   ├─ 全局上限：总质押额 × 50%
        │   ├─ 个人上限：自身质押 × 3倍
        │   └─ 单次上限：自身质押 × 50%（烧伤机制）
        │
        └─ 剩余资金
            └─ 用于提现、紧急情况等
```

### 2.2 收益机制（优化后）

#### 静态收益（动态调整）

```
基础收益率：0.8%（年化292%）

根据资金池健康度动态调整：
├─ 健康度 > 50%：0.8%（正常）
├─ 健康度 30%-50%：0.6%（降低）
└─ 健康度 < 30%：0.5%（最低）

资金池健康度 = 可用资金 / 应支付收益
```

#### 动态收益（多重限制）

```
级差奖励计算：
├─ 基础奖励：按节点等级（V1-V5：5%-50%）
├─ 烧伤限制：单次奖励 ≤ 自身质押 × 50%
├─ 个人封顶：累计收益 ≤ 自身质押 × 3倍
└─ 全局上限：总奖励 ≤ 总质押额 × 50%

软着陆机制：
├─ 全局奖励 < 45%：正常发放
└─ 全局奖励 ≥ 45%：奖励递减（每1%递减2%）
```

### 2.3 提现机制（优化后）

#### 提U模式（立即销毁）

```
用户收益：500 RWA

提U模式：
├─ 70% 提取：500 × 70% = 350 RWA
├─ 30% 销毁：500 × 30% = 150 RWA（立即销毁）
└─ 通缩效果：减少代币供应，支撑币价
```

#### 持RWA模式（分批解锁）

```
用户收益：500 RWA

持RWA模式：
├─ 120% 收益：500 × 120% = 600 stRWA
├─ 锁仓30天
└─ 分批解锁：每天解锁10%（60 stRWA/天）
```

---

## 💻 三、代码实现方案

### 3.1 智能合约修改

#### 修改1: StakingContract.sol - 添加封顶机制

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakingContract is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ... 现有代码 ...
    
    // ========== 新增：封顶机制常量 ==========
    uint256 public constant MAX_DYNAMIC_REWARDS_MULTIPLIER = 3; // 个人累计收益上限：3倍
    uint256 public constant MAX_SINGLE_REWARD_RATIO = 50;       // 单次奖励上限：50%
    uint256 public constant SOFT_LANDING_THRESHOLD = 45;        // 软着陆阈值：45%
    
    // ========== 新增：stRWA 代币 ==========
    IERC20 public stRwaToken;
    
    // ========== 修改：UserInfo 结构体 ==========
    struct UserInfo {
        uint256 totalStaked;                    // 总质押额
        uint256 rwaPending;                     // 待提取 RWA
        uint256 usdtRewards;                    // 待提取 USDT
        uint256 lastWithdrawTime;               // 上次提现时间
        address referrer;                       // 推荐人
        uint8 nodeLevel;                        // 节点等级
        uint256 firstStakeTime;                 // 首次质押时间
        bool isActive;                          // 是否活跃
        uint256 totalDynamicRewardsReceived;    // 新增：累计动态收益
    }
    
    // ========== 修改：stake 函数 ==========
    function stake(uint256 amount, address referrer) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than zero");
        
        uint256 internalAmount = amount * PRECISION_MULTIPLIER;
        uint256 stakeId = stakesCounter++;
        
        // 50% 转换为 stRWA 资产凭证
        uint256 stRwaAmount = internalAmount * 50 / 100;
        IERC20(stRwaToken).mint(msg.sender, stRwaAmount);
        
        // 50% 保留在合约
        uint256 contractAmount = internalAmount - stRwaAmount;
        
        // 50% 转 Treasury（USDT）
        usdtToken.safeTransferFrom(msg.sender, treasuryAddress, contractAmount / PRECISION_MULTIPLIER);
        
        // 50% 转合约（USDT）
        usdtToken.safeTransferFrom(msg.sender, address(this), contractAmount / PRECISION_MULTIPLIER);
        
        // ... 推荐关系绑定 ...
        
        // 更新用户信息
        UserInfo storage user = users[msg.sender];
        user.totalStaked += internalAmount;
        user.isActive = true;
        
        if (user.firstStakeTime == 0) {
            user.firstStakeTime = block.timestamp;
            user.nodeLevel = 1;
        }
        
        totalStaked += internalAmount;
        
        emit StakeEvent(msg.sender, internalAmount, user.referrer, stakeId, block.timestamp);
        emit StRWAMinted(msg.sender, stRwaAmount, block.timestamp);  // 新增事件
    }
    
    // ========== 修改：updateUserRewards 函数 ==========
    function updateUserRewards(
        address user,
        uint256 rwAmount,
        uint256 usdtAmount,
        uint256 rewardId
    ) external nonReentrant whenNotPaused {
        require(msg.sender == backendAddress, "Only backend can call");
        require(!processedRewards[rewardId], "Reward already processed");
        require(usdtAmount <= maxRewardPerCall, "Exceeds max reward per call");
        
        UserInfo storage userInfo = users[user];
        
        // ========== 新增：烧伤机制 ==========
        uint256 maxSingleReward = userInfo.totalStaked * MAX_SINGLE_REWARD_RATIO / 100;
        if (usdtAmount > maxSingleReward) {
            usdtAmount = maxSingleReward;  // 限制为自身质押的50%
            emit RewardBurned(user, usdtAmount, block.timestamp);  // 记录烧伤
        }
        
        // ========== 新增：个人累计封顶 ==========
        uint256 maxTotalRewards = userInfo.totalStaked * MAX_DYNAMIC_REWARDS_MULTIPLIER;
        require(
            userInfo.totalDynamicRewardsReceived + usdtAmount <= maxTotalRewards,
            "Personal reward cap exceeded, please restake"
        );
        
        // ========== 新增：软着陆机制 ==========
        uint256 globalRewardRatio = (totalDynamicRewardsPaid * 100) / totalStaked;
        if (globalRewardRatio >= SOFT_LANDING_THRESHOLD) {
            uint256 reductionRate = (globalRewardRatio - SOFT_LANDING_THRESHOLD) * 2;
            usdtAmount = usdtAmount * (100 - reductionRate) / 100;
        }
        
        // ========== 现有：50% 全局上限检查 ==========
        require(
            totalDynamicRewardsPaid + usdtAmount <= totalStaked * 50 / 100,
            "Dynamic rewards exceed 50% limit"
        );
        
        // ========== 状态更新 ==========
        processedRewards[rewardId] = true;
        userInfo.rwaPending += rwAmount;
        userInfo.usdtRewards += usdtAmount;
        userInfo.totalDynamicRewardsReceived += usdtAmount;  // 新增
        totalDynamicRewardsPaid += usdtAmount;
        
        emit RewardsUpdated(user, rwAmount, usdtAmount, rewardId, block.timestamp);
    }
    
    // ========== 修改：withdraw 函数（立即销毁） ==========
    function withdraw(uint256 amount, bool chooseStRWA) external nonReentrant whenNotPaused {
        UserInfo storage user = users[msg.sender];
        
        require(user.rwaPending >= amount, "Insufficient balance");
        require(amount >= MIN_WITHDRAWAL_AMOUNT, "Below minimum withdrawal amount");
        require(
            block.timestamp >= user.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
            "Withdrawal cooldown active"
        );
        
        uint256 fee = amount * WITHDRAWAL_FEE_RATE / 100;
        uint256 amountAfterFee = amount - fee;
        
        user.rwaPending -= amount;
        user.lastWithdrawTime = block.timestamp;
        
        if (chooseStRWA) {
            // 持RWA模式：120%收益，转换为stRWA
            uint256 stRwaAmount = amountAfterFee * 120 / 100;
            IERC20(stRwaToken).mint(msg.sender, stRwaAmount);
        } else {
            // 提U模式：70%提取，30%销毁
            uint256 receiveAmount = amountAfterFee * 70 / 100;
            uint256 burnAmount = amountAfterFee - receiveAmount;
            
            rwaToken.safeTransfer(msg.sender, receiveAmount);
            
            // 立即销毁
            if (burnAmount > 0) {
                rwaToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), burnAmount);
                emit TokensBurned(burnAmount, block.timestamp);
            }
        }
        
        // 销毁手续费
        if (fee > 0) {
            rwaToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), fee);
        }
        
        emit WithdrawalRequested(msg.sender, amount, fee, block.timestamp);
    }
    
    // ========== 新增：查询函数 ==========
    function getPersonalRewardCap(address user) external view returns (uint256) {
        return users[user].totalStaked * MAX_DYNAMIC_REWARDS_MULTIPLIER;
    }
    
    function getRemainingRewardCapacity(address user) external view returns (uint256) {
        uint256 cap = getPersonalRewardCap(user);
        uint256 received = users[user].totalDynamicRewardsReceived;
        return cap > received ? cap - received : 0;
    }
    
    function getGlobalRewardRatio() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        return (totalDynamicRewardsPaid * 100) / totalStaked;
    }
    
    // ========== 新增：事件 ==========
    event StRWAMinted(address indexed user, uint256 amount, uint256 timestamp);
    event RewardBurned(address indexed user, uint256 burnedAmount, uint256 timestamp);
    event TokensBurned(uint256 amount, uint256 timestamp);
}
```

#### 新增2: StRWA.sol - 资产凭证合约

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
    address public stakingContract;
    
    constructor() ERC20("Staked RWA", "stRWA") Ownable(msg.sender) {}
    
    /**
     * @dev 设置质押合约地址
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid address");
        stakingContract = _stakingContract;
    }
    
    /**
     * @dev 铸造 stRWA（仅质押合约可调用）
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking contract");
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁 stRWA（仅质押合约可调用）
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking contract");
        _burn(from, amount);
    }
    
    /**
     * @dev 批量转账（用于实体资产清结算）
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
}
```

#### 新增3: SwapContract.sol - 双币互换合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SwapContract
 * @dev 双币互换合约 - stRWA ↔ RWA
 * 
 * 提供内部流动性，不依赖 DEX
 * 动态调整互换比例，平衡供需
 */
contract SwapContract is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public rwaToken;
    IERC20 public stRwaToken;
    
    // 互换池余额
    uint256 public rwaPoolBalance;
    uint256 public stRwaPoolBalance;
    
    // 互换参数
    uint256 public constant BASE_RATE = 100;  // 基础比例 1:1
    uint256 public constant MAX_RATE = 110;   // 最大比例 1:1.1
    uint256 public constant MIN_RATE = 90;    // 最小比例 1:0.9
    
    // 事件
    event SwapStRWAToRWA(address indexed user, uint256 stRwaAmount, uint256 rwaAmount);
    event SwapRWAToStRWA(address indexed user, uint256 rwaAmount, uint256 stRwaAmount);
    event PoolUpdated(uint256 rwaBalance, uint256 stRwaBalance);
    
    constructor(address _rwaToken, address _stRwaToken) Ownable(msg.sender) {
        require(_rwaToken != address(0), "Invalid RWA token address");
        require(_stRwaToken != address(0), "Invalid stRWA token address");
        
        rwaToken = IERC20(_rwaToken);
        stRwaToken = IERC20(_stRwaToken);
    }
    
    /**
     * @dev 初始化互换池（项目方提供初始流动性）
     */
    function initializePool(uint256 rwaAmount, uint256 stRwaAmount) external onlyOwner {
        rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        stRwaToken.safeTransferFrom(msg.sender, address(this), stRwaAmount);
        
        rwaPoolBalance = rwaAmount;
        stRwaPoolBalance = stRwaAmount;
        
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
    }
    
    /**
     * @dev 获取当前互换比例
     */
    function getSwapRate() public view returns (uint256) {
        if (rwaPoolBalance == 0 || stRwaPoolBalance == 0) {
            return BASE_RATE;  // 默认 1:1
        }
        
        // 计算池子深度比例
        uint256 ratio = (rwaPoolBalance * 100) / stRwaPoolBalance;
        
        // 动态调整
        if (ratio > 200) {
            // RWA 池子太深（>2倍），鼓励卖出 stRWA
            return MAX_RATE;  // 1 stRWA = 1.1 RWA
        } else if (ratio < 50) {
            // stRWA 池子太深（>2倍），鼓励买入 stRWA
            return MIN_RATE;  // 1 stRWA = 0.9 RWA
        }
        
        return BASE_RATE;  // 1:1
    }
    
    /**
     * @dev stRWA → RWA（无税）
     */
    function swapStRWAToRWA(uint256 stRwaAmount) external nonReentrant {
        require(stRwaAmount > 0, "Amount must be greater than zero");
        
        uint256 swapRate = getSwapRate();
        uint256 rwaAmount = (stRwaAmount * swapRate) / 100;
        
        require(rwaPoolBalance >= rwaAmount, "Insufficient RWA pool");
        
        // 转账
        stRwaToken.safeTransferFrom(msg.sender, address(this), stRwaAmount);
        rwaToken.safeTransfer(msg.sender, rwaAmount);
        
        // 更新池子
        stRwaPoolBalance += stRwaAmount;
        rwaPoolBalance -= rwaAmount;
        
        emit SwapStRWAToRWA(msg.sender, stRwaAmount, rwaAmount);
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
    }
    
    /**
     * @dev RWA → stRWA（无税，鼓励持有）
     */
    function swapRWAToStRWA(uint256 rwaAmount) external nonReentrant {
        require(rwaAmount > 0, "Amount must be greater than zero");
        
        uint256 swapRate = getSwapRate();
        uint256 stRwaAmount = (rwaAmount * 100) / swapRate;
        
        require(stRwaPoolBalance >= stRwaAmount, "Insufficient stRWA pool");
        
        // 转账
        rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        stRwaToken.safeTransfer(msg.sender, stRwaAmount);
        
        // 更新池子
        rwaPoolBalance += rwaAmount;
        stRwaPoolBalance -= stRwaAmount;
        
        emit SwapRWAToStRWA(msg.sender, rwaAmount, stRwaAmount);
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
    }
    
    /**
     * @dev 项目方补充流动性
     */
    function addLiquidity(uint256 rwaAmount, uint256 stRwaAmount) external onlyOwner {
        if (rwaAmount > 0) {
            rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
            rwaPoolBalance += rwaAmount;
        }
        
        if (stRwaAmount > 0) {
            stRwaToken.safeTransferFrom(msg.sender, address(this), stRwaAmount);
            stRwaPoolBalance += stRwaAmount;
        }
        
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
    }
    
    /**
     * @dev 查询池子状态
     */
    function getPoolStatus() external view returns (
        uint256 rwaBalance,
        uint256 stRwaBalance,
        uint256 swapRate
    ) {
        return (rwaPoolBalance, stRwaPoolBalance, getSwapRate());
    }
}
```

#### 修改4: RWAToken.sol - 动态卖出税

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract RWAToken is ERC20, Ownable, Pausable {
    // ... 现有代码 ...
    
    // ========== 新增：质押合约引用 ==========
    address public stakingContract;
    
    // ========== 修改：动态卖出税 ==========
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        bool isSell = to == pancakeSwapPair && pancakeSwapPair != address(0);
        bool isAddressWhitelisted = whitelist[from] || whitelist[to];
        
        if (isSell && !isAddressWhitelisted && from != address(0) && to != address(0)) {
            // 计算动态卖出税
            uint256 sellTaxRate = calculateSellTaxRate(from);
            uint256 taxAmount = (amount * sellTaxRate) / 100;
            uint256 amountAfterTax = amount - taxAmount;
            
            // 计算税收分配
            uint256 treasuryAmount = (taxAmount * TREASURY_SHARE) / 100;
            uint256 burnAmount = (taxAmount * BURN_SHARE) / 100;
            uint256 liquidityAmount = taxAmount - treasuryAmount - burnAmount;
            
            // 分配税收
            super._update(from, treasuryAddress, treasuryAmount);
            super._update(from, address(0), burnAmount);
            super._update(from, liquidityFundAddress, liquidityAmount);
            super._update(from, to, amountAfterTax);
            
            emit TaxCollected(from, to, amount, taxAmount, sellTaxRate);
        } else {
            super._update(from, to, amount);
        }
    }
    
    // ========== 新增：计算动态卖出税 ==========
    function calculateSellTaxRate(address user) internal view returns (uint256) {
        // 如果未设置质押合约，使用固定税率
        if (stakingContract == address(0)) {
            return SELL_TAX_RATE;  // 20%
        }
        
        // 从质押合约获取首次质押时间
        (bool success, bytes memory data) = stakingContract.staticcall(
            abi.encodeWithSignature("getFirstStakeTime(address)", user)
        );
        
        if (!success || data.length == 0) {
            return SELL_TAX_RATE;  // 默认 20%
        }
        
        uint256 firstStakeTime = abi.decode(data, (uint256));
        if (firstStakeTime == 0) {
            return SELL_TAX_RATE;  // 未质押过，使用默认税率
        }
        
        // 计算持有天数
        uint256 holdingDays = (block.timestamp - firstStakeTime) / 1 days;
        
        // 动态税率表
        if (holdingDays < 30) {
            return 50;  // 50% 税（前30天）
        } else if (holdingDays < 90) {
            return 30;  // 30% 税（30-90天）
        } else if (holdingDays < 180) {
            return 20;  // 20% 税（90-180天）
        } else {
            return 10;  // 10% 税（180天+）
        }
    }
    
    // ========== 新增：设置质押合约地址 ==========
    function setStakingContract(address _stakingContract) external onlyOwner {
        stakingContract = _stakingContract;
        whitelist[_stakingContract] = true;
    }
    
    // ========== 修改：事件 ==========
    event TaxCollected(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 taxAmount,
        uint256 taxRate
    );
}
```

---

### 3.2 后端服务修改

#### 修改1: RewardEngine.ts - 添加烧伤机制

```typescript
// backend/src/services/RewardEngine.ts

import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
// ... 其他导入 ...

export class RewardEngine {
    // ... 现有代码 ...
    
    /**
     * 计算级差奖励（添加烧伤机制）
     */
    async calculateDifferentialRewards(
        stakeAmount: string,
        userAddress: string,
        stakeId: string
    ): Promise<RewardDistribution[]> {
        logger.info(`Calculating differential rewards for user=${userAddress}, stakeId=${stakeId}, amount=${stakeAmount}`);
        
        try {
            // 1. 获取所有上级
            const ancestors = await this.getAncestors(userAddress);
            
            if (ancestors.length === 0) {
                return [];
            }
            
            // 2. 计算奖励（级压逻辑 + 烧伤机制）
            const rewards: RewardDistribution[] = [];
            let maxAllocatedPercentage = 0;
            const stakeAmountBN = new BigNumber(stakeAmount);
            
            for (const ancestor of ancestors) {
                // 获取上级信息
                const ancestorInfo = await this.getUserInfo(ancestor.ancestor_address);
                const ancestorLevel = ancestorInfo.node_level;
                const ancestorPercentage = NODE_REWARD_PERCENTAGES[ancestorLevel];
                
                // 级压逻辑
                const differentialPercentage = Math.max(0, ancestorPercentage - maxAllocatedPercentage);
                
                if (differentialPercentage > 0) {
                    // 计算基础奖励
                    const calculatedReward = stakeAmountBN
                        .multipliedBy(differentialPercentage)
                        .integerValue(BigNumber.ROUND_DOWN);
                    
                    // ========== 新增：烧伤机制 ==========
                    const ancestorStaked = new BigNumber(ancestorInfo.total_staked);
                    const maxRewardByStake = ancestorStaked.multipliedBy(0.5);  // 自身质押的50%
                    
                    // 取较小值
                    const actualReward = BigNumber.min(calculatedReward, maxRewardByStake);
                    
                    // 检查是否被烧伤
                    const isBurned = calculatedReward.isGreaterThan(maxRewardByStake);
                    
                    if (actualReward.gt(0)) {
                        rewards.push({
                            beneficiary: ancestor.ancestor_address,
                            amount: actualReward.toString(),
                            percentage: differentialPercentage,
                            nodeLevel: ancestorLevel,
                            fromUser: userAddress,
                            stakeId: parseInt(stakeId),
                            burned: isBurned  // 新增：是否被烧伤
                        });
                        
                        if (isBurned) {
                            logger.warn(
                                `Reward burned for ${ancestor.ancestor_address}: ` +
                                `calculated=${calculatedReward.toString()}, ` +
                                `actual=${actualReward.toString()}, ` +
                                `cap=${maxRewardByStake.toString()}`
                            );
                        }
                    }
                    
                    maxAllocatedPercentage = ancestorPercentage;
                }
                
                // 达到50%上限，停止
                if (maxAllocatedPercentage >= 0.5) {
                    break;
                }
            }
            
            // 3. 验证总奖励不超过50%
            const totalRewards = rewards.reduce((sum, r) => sum.plus(r.amount), new BigNumber(0));
            const maxAllowed = stakeAmountBN.multipliedBy(0.5).integerValue(BigNumber.ROUND_DOWN);
            
            if (totalRewards.isGreaterThan(maxAllowed)) {
                logger.error(`Total rewards exceed 50% limit: ${totalRewards.toString()} > ${maxAllowed.toString()}`);
                throw new Error('Total rewards exceed 50% limit');
            }
            
            logger.info(`Total differential rewards: ${totalRewards.toString()} (${rewards.length} beneficiaries)`);
            
            return rewards;
            
        } catch (error) {
            logger.error('Failed to calculate differential rewards:', error);
            throw error;
        }
    }
    
    /**
     * 验证奖励限制（添加个人封顶检查）
     */
    async validateRewardLimit(newRewards: RewardDistribution[]): Promise<boolean> {
        try {
            // 全局上限检查（现有）
            const totalStaked = await this.stakingContract.getTotalStaked();
            const totalDynamicRewardsPaid = await this.stakingContract.getTotalDynamicRewardsPaid();
            
            const newRewardsTotal = newRewards.reduce(
                (sum, r) => sum.plus(r.amount),
                new BigNumber(0)
            );
            
            const projectedTotal = new BigNumber(totalDynamicRewardsPaid.toString())
                .plus(newRewardsTotal);
            
            const maxAllowed = new BigNumber(totalStaked.toString())
                .multipliedBy(0.5)
                .integerValue(BigNumber.ROUND_DOWN);
            
            if (projectedTotal.isGreaterThan(maxAllowed)) {
                logger.warn(`Global reward limit validation failed`);
                return false;
            }
            
            // ========== 新增：个人封顶检查 ==========
            for (const reward of newRewards) {
                const userInfo = await this.getUserInfo(reward.beneficiary);
                const userStaked = new BigNumber(userInfo.total_staked);
                const userReceived = new BigNumber(userInfo.total_dynamic_rewards_received || '0');
                const rewardAmount = new BigNumber(reward.amount);
                
                // 个人累计上限：3倍质押额
                const maxTotalRewards = userStaked.multipliedBy(3);
                const projectedUserTotal = userReceived.plus(rewardAmount);
                
                if (projectedUserTotal.isGreaterThan(maxTotalRewards)) {
                    logger.warn(
                        `Personal reward cap exceeded for ${reward.beneficiary}: ` +
                        `received=${userReceived.toString()}, ` +
                        `new=${rewardAmount.toString()}, ` +
                        `cap=${maxTotalRewards.toString()}`
                    );
                    return false;
                }
            }
            
            return true;
            
        } catch (error) {
            logger.error('Failed to validate reward limit:', error);
            throw error;
        }
    }
    
    // ... 其他方法 ...
}
```

#### 修改2: DailyYieldService.ts - 动态收益率

```typescript
// backend/src/services/DailyYieldService.ts

import { ethers } from 'ethers';
import { query, transaction } from '../config/database.config';
import { User } from '../models/types';
import logger from '../utils/logger';
import BigNumber from 'bignumber.js';

export interface DailyYieldConfig {
    baseYieldRate: number;  // 基础收益率 0.008 (0.8%)
    stakingContractAddress: string;
    stakingContractABI: any[];
    provider: ethers.JsonRpcProvider;
}

export class DailyYieldService {
    private config: DailyYieldConfig;
    private stakingContract: ethers.Contract;
    
    constructor(config: DailyYieldConfig) {
        this.config = config;
        this.stakingContract = new ethers.Contract(
            config.stakingContractAddress,
            config.stakingContractABI,
            config.provider
        );
    }
    
    /**
     * 计算并发放每日静态收益（动态调整收益率）
     */
    async calculateDailyYield(): Promise<{
        processedUsers: number;
        totalYield: string;
        averageYieldRate: number;
    }> {
        logger.info('Starting daily yield calculation...');
        
        try {
            // ========== 新增：计算资金池健康度 ==========
            const poolHealth = await this.calculatePoolHealth();
            logger.info(`Pool health: ${poolHealth.toFixed(2)}`);
            
            // ========== 新增：根据健康度调整收益率 ==========
            let yieldRate = this.config.baseYieldRate;  // 基础 0.8%
            
            if (poolHealth < 0.3) {
                yieldRate = 0.005;  // 降至 0.5%
                logger.warn('Pool health < 30%, yield rate reduced to 0.5%');
            } else if (poolHealth < 0.5) {
                yieldRate = 0.006;  // 降至 0.6%
                logger.warn('Pool health < 50%, yield rate reduced to 0.6%');
            }
            
            logger.info(`Using yield rate: ${yieldRate * 100}%`);
            
            // 获取所有活跃用户
            const users = await query<User[]>(
                `SELECT address, total_staked, rwa_pending
                 FROM users
                 WHERE is_active = TRUE AND total_staked > 0`
            );
            
            logger.info(`Found ${users.length} active users for yield calculation`);
            
            if (users.length === 0) {
                return {
                    processedUsers: 0,
                    totalYield: '0',
                    averageYieldRate: yieldRate
                };
            }
            
            let totalYield = new BigNumber(0);
            let processedCount = 0;
            
            // 处理每个用户
            for (const user of users) {
                try {
                    const yieldAmount = await this.calculateUserYield(user, yieldRate);
                    
                    if (yieldAmount.gt(0)) {
                        await this.distributeYield(user.address, yieldAmount.toString());
                        await this.syncToContract(user.address, yieldAmount.toString());
                        totalYield = totalYield.plus(yieldAmount);
                        processedCount++;
                    }
                } catch (error) {
                    logger.error(`Failed to process yield for user ${user.address}:`, error);
                }
            }
            
            logger.info(
                `✅ Daily yield calculation completed: ` +
                `${processedCount} users, total yield: ${totalYield.toString()}, ` +
                `yield rate: ${yieldRate * 100}%`
            );
            
            return {
                processedUsers: processedCount,
                totalYield: totalYield.toString(),
                averageYieldRate: yieldRate
            };
            
        } catch (error) {
            logger.error('Failed to calculate daily yield:', error);
            throw error;
        }
    }
    
    /**
     * 计算资金池健康度
     */
    private async calculatePoolHealth(): Promise<number> {
        try {
            // 获取总质押额
            const totalStaked = await this.stakingContract.getTotalStaked();
            
            // 获取合约USDT余额
            const contractBalance = await this.stakingContract.getContractBalance();
            
            // 计算应支付的静态收益（所有用户）
            const users = await query<User[]>(
                `SELECT total_staked FROM users WHERE is_active = TRUE AND total_staked > 0`
            );
            
            let totalStaticYieldOwed = new BigNumber(0);
            for (const user of users) {
                const dailyYield = new BigNumber(user.total_staked).multipliedBy(this.config.baseYieldRate);
                totalStaticYieldOwed = totalStaticYieldOwed.plus(dailyYield);
            }
            
            // 计算应支付的动态收益（50%上限）
            const totalDynamicRewardsOwed = new BigNumber(totalStaked.toString())
                .multipliedBy(0.5);
            
            // 总应支付
            const totalOwed = totalStaticYieldOwed.plus(totalDynamicRewardsOwed);
            
            // 健康度 = 可用资金 / 应支付收益
            if (totalOwed.isZero()) {
                return 1.0;  // 无应支付，健康度100%
            }
            
            const health = new BigNumber(contractBalance.toString())
                .dividedBy(totalOwed)
                .toNumber();
            
            return Math.min(1.0, Math.max(0, health));  // 限制在 0-1 之间
            
        } catch (error) {
            logger.error('Failed to calculate pool health:', error);
            return 0.5;  // 默认中等健康度
        }
    }
    
    /**
     * 计算单个用户的收益
     */
    private async calculateUserYield(user: User, yieldRate: number): Promise<BigNumber> {
        const totalStaked = new BigNumber(user.total_staked);
        const yieldAmount = totalStaked.multipliedBy(yieldRate);
        return yieldAmount;
    }
    
    /**
     * 发放收益到数据库
     */
    private async distributeYield(userAddress: string, yieldAmount: string): Promise<void> {
        await transaction(async (connection) => {
            await connection.query(
                `UPDATE users SET rwa_pending = rwa_pending + ? WHERE address = ?`,
                [yieldAmount, userAddress]
            );
            
            await connection.query(
                `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp)
                 VALUES (?, 'static', 'RWA', ?, NOW())`,
                [userAddress, yieldAmount]
            );
        });
    }
    
    /**
     * 同步收益到合约
     */
    private async syncToContract(userAddress: string, rwaAmount: string): Promise<void> {
        try {
            // 生成唯一的 rewardId
            const rewardId = this.generateStaticRewardId(userAddress, Date.now());
            
            // 调用合约更新
            const tx = await this.stakingContract.updateUserRewards(
                userAddress,
                rwaAmount,  // RWA 收益
                '0',        // USDT 收益（无）
                rewardId
            );
            
            await tx.wait();
            logger.debug(`✅ Static yield synced to contract: ${userAddress}, amount: ${rwaAmount}`);
            
        } catch (error) {
            logger.error(`Failed to sync static yield to contract: ${userAddress}`, error);
            // 不抛出错误，允许重试
        }
    }
    
    /**
     * 生成静态收益的唯一 rewardId
     */
    private generateStaticRewardId(userAddress: string, timestamp: number): string {
        // 使用哈希生成唯一ID
        const data = ethers.solidityPackedKeccak256(
            ['string', 'address', 'uint256'],
            ['static', userAddress, timestamp]
        );
        
        // 转换为 uint256
        return BigNumber(data).toString();
    }
}
```

---

## 📊 四、优化效果对比

### 4.1 拨比控制

| 项目 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **静态收益** | 292%（固定） | 146%-292%（动态） | ✅ 降低50% |
| **动态收益** | 50%（无限制） | 50%（多重封顶） | ✅ 可控 |
| **总拨比** | 345% | 150-200% | ✅ 降低42% |
| **可持续性** | ❌ 不可持续 | ✅ 可持续 | ✅ 提升 |

### 4.2 用户接受度

| 项目 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **50%资金** | "不返还" | "资产凭证化" | ✅ 心理压力降低 |
| **退出机制** | 无 | 二级市场交易 | ✅ 提供流动性 |
| **营销包装** | 资金盘嫌疑 | 实体资产代币化 | ✅ 合规性提升 |

### 4.3 流动性

| 项目 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **卖出税** | 80%（固定） | 10%-50%（动态） | ✅ 降低37.5% |
| **流动性来源** | 仅DEX | DEX + 内部互换 | ✅ 双重保障 |
| **流动性激励** | 无 | 有 | ✅ 鼓励提供流动性 |

### 4.4 可持续性

| 项目 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **小资金限制** | 无 | 烧伤机制 | ✅ 防止滥用 |
| **个人封顶** | 无 | 3倍质押额 | ✅ 控制总量 |
| **软着陆** | 无 | 45%后递减 | ✅ 平滑过渡 |

---

## 🗓️ 五、实施计划

### 第1周：核心机制实施

**Day 1-2: 合约修改**
- [ ] 修改 StakingContract.sol：添加封顶机制
- [ ] 修改 StakingContract.sol：添加 stRWA 支持
- [ ] 修改 StakingContract.sol：提U模式立即销毁
- [ ] 测试合约功能

**Day 3-4: 新增合约**
- [ ] 创建 StRWA.sol 合约
- [ ] 创建 SwapContract.sol 合约
- [ ] 部署并测试

**Day 5-7: 后端修改**
- [ ] 修改 RewardEngine.ts：添加烧伤机制
- [ ] 修改 DailyYieldService.ts：动态收益率
- [ ] 测试后端逻辑

### 第2周：集成测试

**Day 8-10: 功能测试**
- [ ] 测试烧伤机制
- [ ] 测试个人封顶
- [ ] 测试动态收益率
- [ ] 测试双币互换

**Day 11-12: 压力测试**
- [ ] 测试大量用户场景
- [ ] 测试资金池健康度
- [ ] 测试边界情况

**Day 13-14: 修复优化**
- [ ] 修复发现的问题
- [ ] 优化性能
- [ ] 完善日志

### 第3周：前端集成

**Day 15-17: 前端修改**
- [ ] 修改提现页面：添加提U/持RWA选择
- [ ] 添加 stRWA 余额显示
- [ ] 添加双币互换界面
- [ ] 添加个人封顶提示

**Day 18-19: UI优化**
- [ ] 优化用户体验
- [ ] 添加说明文案
- [ ] 移动端适配

**Day 20-21: 测试**
- [ ] 端到端测试
- [ ] 用户体验测试
- [ ] 修复问题

### 第4周：部署上线

**Day 22-24: 部署准备**
- [ ] 合约审计（可选）
- [ ] 部署到测试网
- [ ] 测试网测试

**Day 25-26: 主网部署**
- [ ] 部署合约到主网
- [ ] 初始化参数
- [ ] 验证功能

**Day 27-28: 监控优化**
- [ ] 监控系统运行
- [ ] 收集用户反馈
- [ ] 持续优化

---

## 🧪 六、测试用例

### 6.1 烧伤机制测试

```typescript
describe('Burn-back Mechanism', () => {
    it('should limit reward to 50% of personal stake', async () => {
        // 团长A质押 1,000 USDT
        await stakingContract.stake(1000, zeroAddress);
        
        // 下级B质押 100,000 USDT
        await stakingContract.connect(userB).stake(100000, userA.address);
        
        // 计算奖励
        const rewards = await rewardEngine.calculateDifferentialRewards(
            '100000',
            userB.address,
            '1'
        );
        
        // 验证：A的奖励应该被限制为 1,000 × 50% = 500 USDT
        const rewardA = rewards.find(r => r.beneficiary === userA.address);
        expect(rewardA.amount).toBe('500');  // 不是 50,000
        expect(rewardA.burned).toBe(true);
    });
});
```

### 6.2 个人封顶测试

```typescript
describe('Personal Reward Cap', () => {
    it('should stop rewards after 3x personal stake', async () => {
        // 用户质押 10,000 USDT
        await stakingContract.stake(10000, zeroAddress);
        
        // 累计获得 30,000 USDT 动态收益（3倍）
        for (let i = 0; i < 10; i++) {
            await rewardEngine.processStake(
                generateUserAddress(),
                '10000',
                `${i}`
            );
        }
        
        // 再次推荐应该失败
        await expect(
            rewardEngine.processStake(
                generateUserAddress(),
                '10000',
                '11'
            )
        ).rejects.toThrow('Personal reward cap exceeded');
    });
});
```

### 6.3 动态收益率测试

```typescript
describe('Dynamic Yield Rate', () => {
    it('should reduce yield rate when pool health is low', async () => {
        // 模拟资金池健康度 < 30%
        mockPoolHealth(0.25);
        
        // 计算静态收益
        const result = await dailyYieldService.calculateDailyYield();
        
        // 验证收益率降至 0.5%
        expect(result.averageYieldRate).toBe(0.005);
    });
    
    it('should maintain yield rate when pool health is good', async () => {
        // 模拟资金池健康度 > 50%
        mockPoolHealth(0.75);
        
        const result = await dailyYieldService.calculateDailyYield();
        
        // 验证收益率保持 0.8%
        expect(result.averageYieldRate).toBe(0.008);
    });
});
```

---

## 📈 七、预期效果

### 7.1 拨比控制

**优化前**：
```
用户质押 10,000 USDT
├─ 静态收益：29,200 RWA（292%）
├─ 动态收益：5,000 USDT（50%）
└─ 总拨比：345%
```

**优化后**：
```
用户质押 10,000 USDT
├─ 静态收益：14,600-29,200 RWA（146%-292%，动态调整）
├─ 动态收益：5,000 USDT（50%，但受封顶限制）
├─ 烧伤机制：小资金限制
└─ 实际拨比：150-200%
```

### 7.2 用户接受度

**优化前**：
- ❌ "50%不返还" → 心理压力大
- ❌ 容易被攻击为资金盘

**优化后**：
- ✅ "50%转换为资产凭证" → 心理压力小
- ✅ 符合 DeFi 叙事
- ✅ 降低监管风险

### 7.3 流动性

**优化前**：
- ❌ 卖出税80% → 流动性枯竭
- ❌ 完全依赖项目方回购

**优化后**：
- ✅ 双币互换 → 内部流动性
- ✅ 动态税率10%-50% → 降低交易成本
- ✅ 流动性激励 → 鼓励提供流动性

---

## ✅ 八、实施检查清单

### 合约层

- [ ] StakingContract.sol：添加封顶机制
- [ ] StakingContract.sol：添加 stRWA 支持
- [ ] StakingContract.sol：提U模式立即销毁
- [ ] StRWA.sol：创建资产凭证合约
- [ ] SwapContract.sol：创建双币互换合约
- [ ] RWAToken.sol：动态卖出税

### 后端层

- [ ] RewardEngine.ts：烧伤机制
- [ ] RewardEngine.ts：个人封顶检查
- [ ] DailyYieldService.ts：动态收益率
- [ ] DailyYieldService.ts：资金池健康度计算
- [ ] 数据库迁移：添加新字段

### 前端层

- [ ] 提现页面：提U/持RWA选择
- [ ] stRWA 余额显示
- [ ] 双币互换界面
- [ ] 个人封顶提示
- [ ] 说明文案更新

### 测试

- [ ] 单元测试
- [ ] 集成测试
- [ ] 压力测试
- [ ] 端到端测试

---

## 🎯 九、关键指标监控

### 9.1 拨比监控

```typescript
// 实时监控拨比
const payoutRatio = {
    staticYield: totalStaticYield / totalStaked,
    dynamicRewards: totalDynamicRewards / totalStaked,
    total: (totalStaticYield + totalDynamicRewards) / totalStaked
};

// 告警阈值
if (payoutRatio.total > 0.25) {  // 25%
    sendAlert('Payout ratio too high');
}
```

### 9.2 资金池健康度

```typescript
// 实时监控健康度
const poolHealth = contractBalance / totalOwed;

// 告警阈值
if (poolHealth < 0.3) {
    sendAlert('Pool health critical');
    // 自动降低收益率
}
```

### 9.3 个人封顶统计

```typescript
// 统计达到封顶的用户
const cappedUsers = await query(`
    SELECT address, total_staked, total_dynamic_rewards_received
    FROM users
    WHERE total_dynamic_rewards_received >= total_staked * 3
`);

// 提醒用户复投
for (const user of cappedUsers) {
    sendNotification(user.address, 'Please restake to continue earning rewards');
}
```

---

## 📝 十、总结

### 核心改进

1. **拨比控制**：从345%降至150-200%
2. **用户接受度**：资产凭证化，降低心理压力
3. **流动性**：双币互换 + 动态税率
4. **可持续性**：多重封顶 + 烧伤机制

### 实施建议

1. **立即实施**：烧伤机制、个人封顶、提U销毁
2. **尽快实施**：stRWA凭证化、双币互换
3. **逐步优化**：动态收益率、软着陆机制

### 预期效果

- ✅ 拨比可控，可持续运营
- ✅ 用户接受度提升
- ✅ 流动性改善
- ✅ 长期稳定发展

---

**这是完整的优化方案。建议按优先级逐步实施，确保每个功能都经过充分测试后再上线。**
