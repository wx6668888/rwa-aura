# 🚀 RWA 质押通道最小改动清单

## 📋 总体策略

**保留 USDT 质押（≥100 USDT），新增 RWA 质押作为主推荐入口**

- ✅ **不改动现有 USDT 质押逻辑**（降低风险）
- ✅ **新增 RWA 质押通道**（合约 + 后端 + 前端）
- ✅ **两种模式并行运行**（用户可选择）

---

## 🔧 一、合约层改动（StakingContract.sol）

### 1.1 新增数据结构

**位置**：`contracts/StakingContract.sol`

```solidity
// 新增：RWA 质押用户信息（与 USDT 质押并行）
struct RWAStakeInfo {
    uint256 totalStakedRWA;   // 总质押的 RWA 数量（18 decimals）
    uint256 rwaPending;        // 待提取的 RWA 代币（18 decimals）
    uint256 lastWithdrawTime;  // 最后提取时间
    address referrer;          // 推荐人地址
    uint256 firstStakeTime;    // 首次质押时间
    uint8 nodeLevel;           // 节点等级
    bool isActive;             // 是否活跃
}

// 新增：RWA 质押本金锁定（与 USDT 质押本金锁定并行）
struct RWALockedPrincipal {
    uint256 stakeId;           // 质押ID
    uint256 principalAmount;   // 本金金额（RWA，18 decimals）
    uint256 lockStartTime;     // 锁仓开始时间
    uint256 lockEndTime;       // 锁仓结束时间
    bool isWithdrawn;          // 是否已提取
    uint256 lockPeriod;        // 锁仓期限（天数）
}

// 新增映射
mapping(address => RWAStakeInfo) public rwaStakes;
mapping(address => RWALockedPrincipal[]) public rwaLockedPrincipals;
uint256 public totalStakedRWA;  // 全局质押的 RWA 总量
```

### 1.2 新增质押函数

**位置**：`contracts/StakingContract.sol`

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
    
    // Generate unique stakeId
    uint256 stakeId;
    unchecked {
        stakeId = stakesCounter++;
    }
    
    // Calculate 50/50 split
    uint256 treasuryAmount = amount / 2;
    uint256 contractAmount = amount - treasuryAmount;
    
    // Transfer 50% to Treasury (RWA tokens)
    // Note: Treasury will handle conversion to USDT for investment
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
    
    // Store lock period and create locked principal if needed
    require(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365, "Invalid lock period");
    
    if (lockPeriod > 0) {
        rwaLockedPrincipals[msg.sender].push(RWALockedPrincipal({
            stakeId: stakeId,
            principalAmount: contractAmount,  // 合约中的50%
            lockStartTime: block.timestamp,
            lockEndTime: block.timestamp + (lockPeriod * 1 days),
            isWithdrawn: false,
            lockPeriod: lockPeriod
        }));
    }
    
    // Update global statistics
    unchecked {
        totalStakedRWA += amount;
    }
    
    // Record stake history for weighted average holding period calculation
    stakeHistory[msg.sender].push(StakeRecord({
        amount: amount,  // RWA amount (18 decimals)
        timestamp: block.timestamp
    }));
    
    // Emit event
    emit RWAStakeEvent(msg.sender, amount, stake.referrer, stakeId, block.timestamp, lockPeriod);
}
```

### 1.3 新增事件

**位置**：`contracts/StakingContract.sol`

```solidity
// 新增事件
event RWAStakeEvent(
    address indexed user,
    uint256 amount,           // RWA amount (18 decimals)
    address indexed referrer,
    uint256 indexed stakeId,
    uint256 timestamp,
    uint256 lockPeriod
);

event RWAPrincipalWithdrawn(
    address indexed user,
    uint256 indexed lockIndex,
    uint256 amount,
    uint256 timestamp
);

event RWARewardWithdrawn(
    address indexed user,
    uint256 amount,
    uint256 fee,
    uint256 timestamp
);
```

### 1.4 新增本金提取函数

**位置**：`contracts/StakingContract.sol`

```solidity
/**
 * @dev Withdraw RWA principal (locked period ended)
 * @param lockIndex Index of the locked principal in userLockedPrincipals array
 */
function withdrawRWAPrincipal(uint256 lockIndex) external nonReentrant whenNotPaused {
    RWALockedPrincipal storage lock = rwaLockedPrincipals[msg.sender][lockIndex];
    
    // Check lock period ended
    require(block.timestamp >= lock.lockEndTime, "Lock period not ended");
    
    // Check not withdrawn
    require(!lock.isWithdrawn, "Already withdrawn");
    
    // Check cooldown
    RWAStakeInfo storage stake = rwaStakes[msg.sender];
    require(
        block.timestamp >= stake.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
        "Cooldown active"
    );
    
    // Check contract balance
    uint256 rwaAmount = lock.principalAmount;
    require(
        rwaToken.balanceOf(address(this)) >= rwaAmount,
        "Insufficient contract balance"
    );
    
    // Update state
    lock.isWithdrawn = true;
    stake.totalStakedRWA -= lock.principalAmount;
    totalStakedRWA -= lock.principalAmount;
    stake.lastWithdrawTime = block.timestamp;
    
    // Transfer RWA to user
    rwaToken.safeTransfer(msg.sender, rwaAmount);
    
    emit RWAPrincipalWithdrawn(msg.sender, lockIndex, rwaAmount, block.timestamp);
}
```

### 1.5 新增收益提取函数

**位置**：`contracts/StakingContract.sol`

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
    
    // Verify minimum withdrawal amount
    require(amount >= MIN_WITHDRAWAL_AMOUNT, "Below minimum withdrawal amount");
    
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
        rwaToken.safeTransfer(address(0x000000000000000000000000000000dEaD), fee);
    }
    
    emit RWARewardWithdrawn(msg.sender, amount, fee, block.timestamp);
}
```

### 1.6 新增查询函数

**位置**：`contracts/StakingContract.sol`

```solidity
/**
 * @dev Get RWA stake info for tax calculation
 * @param user User address
 * @return totalStaked Total staked RWA amount
 * @return weightedAverageTime Weighted average holding time
 */
function getRWAStakeInfoForTax(address user) external view returns (uint256 totalStaked, uint256 weightedAverageTime) {
    RWAStakeInfo storage stake = rwaStakes[user];
    totalStaked = stake.totalStakedRWA;
    
    // Calculate weighted average holding time (same logic as USDT stake)
    uint256 totalWeightedTime = 0;
    uint256 totalAmount = 0;
    
    for (uint256 i = 0; i < stakeHistory[user].length; i++) {
        uint256 timeDiff = block.timestamp - stakeHistory[user][i].timestamp;
        totalWeightedTime += stakeHistory[user][i].amount * timeDiff;
        totalAmount += stakeHistory[user][i].amount;
    }
    
    if (totalAmount > 0) {
        weightedAverageTime = totalWeightedTime / totalAmount;
    }
    
    return (totalStaked, weightedAverageTime);
}

/**
 * @dev Get locked RWA principals for a user
 * @param user User address
 * @return stakeIds Array of stake IDs
 * @return amounts Array of principal amounts
 * @return lockStartTimes Array of lock start times
 * @return lockEndTimes Array of lock end times
 * @return canWithdraw Array of whether can withdraw
 * @return isWithdrawn Array of whether withdrawn
 */
function getRWALockedPrincipals(address user) external view returns (
    uint256[] memory stakeIds,
    uint256[] memory amounts,
    uint256[] memory lockStartTimes,
    uint256[] memory lockEndTimes,
    bool[] memory canWithdraw,
    bool[] memory isWithdrawn
) {
    RWALockedPrincipal[] storage locks = rwaLockedPrincipals[user];
    uint256 length = locks.length;
    
    stakeIds = new uint256[](length);
    amounts = new uint256[](length);
    lockStartTimes = new uint256[](length);
    lockEndTimes = new uint256[](length);
    canWithdraw = new bool[](length);
    isWithdrawn = new bool[](length);
    
    for (uint256 i = 0; i < length; i++) {
        stakeIds[i] = locks[i].stakeId;
        amounts[i] = locks[i].principalAmount;
        lockStartTimes[i] = locks[i].lockStartTime;
        lockEndTimes[i] = locks[i].lockEndTime;
        canWithdraw[i] = !locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime;
        isWithdrawn[i] = locks[i].isWithdrawn;
    }
}
```

### 1.7 修改现有函数（最小改动）

**位置**：`contracts/StakingContract.sol`

```solidity
// 修改 stake 函数：添加 USDT 最小限制（≥100 USDT）
function stake(uint256 amount, address referrer, uint256 lockPeriod) external nonReentrant whenNotPaused {
    require(amount > 0, "Amount must be greater than zero");
    require(amount >= 100 * 10**USDT_DECIMALS, "Minimum stake: 100 USDT");  // 新增：最小限制
    
    // ... 现有逻辑保持不变 ...
}

// 修改 updateUserRewards：支持 RWA 质押收益更新
function updateUserRewards(
    address user,
    uint256 rwAmount,
    uint256 usdtAmount,
    uint256 stakeId
) external nonReentrant whenNotPaused {
    require(msg.sender == backendAddress, "Only backend can call");
    
    // 检查是 USDT 质押还是 RWA 质押（通过 stakeId 或新增参数判断）
    // 这里简化处理：如果 usdtAmount == 0，认为是 RWA 质押
    if (usdtAmount == 0) {
        // RWA 质押收益更新
        RWAStakeInfo storage rwaStake = rwaStakes[user];
        require(!processedStakes[stakeId], "Stake already processed");
        require(rwAmount <= maxRewardPerCall, "Exceeds max reward per call");
        
        // 检查合约 RWA 余额
        require(
            rwaToken.balanceOf(address(this)) >= rwAmount,
            "Insufficient RWA contract balance"
        );
        
        processedStakes[stakeId] = true;
        unchecked {
            rwaStake.rwaPending += rwAmount;
        }
        
        emit RewardsUpdated(user, rwAmount, 0, stakeId, block.timestamp);
    } else {
        // USDT 质押收益更新（现有逻辑）
        // ... 保持不变 ...
    }
}
```

---

## 🔧 二、后端层改动

### 2.1 数据库改动

**位置**：`backend/src/config/database.sql`

```sql
-- 新增：stakes 表增加 asset_type 字段（区分 USDT/RWA）
ALTER TABLE stakes
ADD COLUMN asset_type VARCHAR(10) DEFAULT 'USDT' COMMENT 'Asset type: USDT or RWA';

-- 新增：RWA 质押本金锁定表
CREATE TABLE IF NOT EXISTS rwa_locked_principals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_address VARCHAR(42) NOT NULL,
    stake_id BIGINT NOT NULL,
    principal_amount DECIMAL(36, 18) NOT NULL COMMENT 'Principal amount in RWA (18 decimals)',
    lock_start_time BIGINT NOT NULL,
    lock_end_time BIGINT NOT NULL,
    lock_period INT NOT NULL COMMENT 'Lock period in days',
    is_withdrawn BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_address (user_address),
    INDEX idx_stake_id (stake_id),
    INDEX idx_lock_end_time (lock_end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='RWA locked principals';

-- 新增：RWA 质押用户信息表
CREATE TABLE IF NOT EXISTS rwa_stakes (
    user_address VARCHAR(42) PRIMARY KEY,
    total_staked_rwa DECIMAL(36, 18) NOT NULL DEFAULT 0 COMMENT 'Total staked RWA (18 decimals)',
    rwa_pending DECIMAL(36, 18) NOT NULL DEFAULT 0 COMMENT 'Pending RWA rewards (18 decimals)',
    last_withdraw_time BIGINT NOT NULL DEFAULT 0,
    referrer VARCHAR(42),
    first_stake_time BIGINT NOT NULL DEFAULT 0,
    node_level TINYINT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_referrer (referrer),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='RWA staking user info';
```

### 2.2 事件监听改动

**位置**：`backend/src/services/EventMonitor.ts`

```typescript
// 新增：监听 RWAStakeEvent
async function monitorRWAStakeEvent(event: any) {
    const { user, amount, referrer, stakeId, timestamp, lockPeriod } = event.args;
    
    // 保存 RWA 质押记录
    await db.query(`
        INSERT INTO stakes (
            user_address, amount, referrer, stake_id, 
            timestamp, lock_period, asset_type
        ) VALUES (?, ?, ?, ?, ?, ?, 'RWA')
    `, [user, amount.toString(), referrer, stakeId.toString(), timestamp.toString(), lockPeriod.toString()]);
    
    // 更新 RWA 质押用户信息
    await db.query(`
        INSERT INTO rwa_stakes (
            user_address, total_staked_rwa, referrer, 
            first_stake_time, node_level, is_active
        ) VALUES (?, ?, ?, ?, 1, TRUE)
        ON DUPLICATE KEY UPDATE
            total_staked_rwa = total_staked_rwa + ?,
            referrer = COALESCE(referrer, ?),
            first_stake_time = COALESCE(first_stake_time, ?)
    `, [user, amount.toString(), referrer, timestamp.toString(), amount.toString(), referrer, timestamp.toString()]);
    
    // 如果有锁仓期限，保存本金锁定记录
    if (lockPeriod > 0) {
        const contractAmount = amount / 2n; // 50% in contract
        const lockEndTime = timestamp + (lockPeriod * 86400);
        
        await db.query(`
            INSERT INTO rwa_locked_principals (
                user_address, stake_id, principal_amount,
                lock_start_time, lock_end_time, lock_period
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [user, stakeId.toString(), contractAmount.toString(), timestamp.toString(), lockEndTime.toString(), lockPeriod.toString()]);
    }
}

// 修改：在事件监听循环中添加 RWAStakeEvent
// 在 monitorStakeEvents 函数中添加：
stakingContract.on('RWAStakeEvent', monitorRWAStakeEvent);
```

### 2.3 收益计算改动

**位置**：`backend/src/services/DailyYieldService.ts`

```typescript
// 新增：计算 RWA 质押收益
async function calculateRWAYield(userAddress: string): Promise<{
    rwaAmount: bigint;
    lockMultiplier: number;
}> {
    // 获取用户所有 RWA 质押记录（包括 lock_period）
    const stakes = await db.query(`
        SELECT amount, lock_period, timestamp
        FROM stakes
        WHERE user_address = ? AND asset_type = 'RWA'
        ORDER BY timestamp ASC
    `, [userAddress]);
    
    let totalYield = 0n;
    const baseDailyYield = 0.008; // 0.8%
    
    for (const stake of stakes) {
        const amount = BigInt(stake.amount);
        const lockPeriod = parseInt(stake.lock_period);
        const multiplier = getLockPeriodMultiplier(lockPeriod);
        
        // 计算每日收益：amount * baseDailyYield * multiplier
        const dailyYield = (amount * BigInt(Math.floor(baseDailyYield * 10000)) * BigInt(Math.floor(multiplier * 100))) / 1000000n;
        totalYield += dailyYield;
    }
    
    return {
        rwaAmount: totalYield,
        lockMultiplier: 1.0 // 加权平均（简化处理）
    };
}

// 修改：在每日收益分发函数中，同时处理 USDT 和 RWA 质押
async function distributeDailyYields() {
    // ... 获取所有活跃用户 ...
    
    for (const user of activeUsers) {
        // USDT 质押收益（现有逻辑）
        const usdtYield = await calculateUSDTYield(user.address);
        if (usdtYield.rwaAmount > 0n) {
            await updateUserRewards(user.address, usdtYield.rwaAmount, usdtYield.usdtAmount, stakeId);
        }
        
        // RWA 质押收益（新增）
        const rwaYield = await calculateRWAYield(user.address);
        if (rwaYield.rwaAmount > 0n) {
            await updateUserRewards(user.address, rwaYield.rwaAmount, 0n, stakeId); // usdtAmount = 0 表示 RWA 质押
        }
    }
}
```

### 2.4 模型类型改动

**位置**：`backend/src/models/types.ts`

```typescript
// 新增：RWA 质押相关类型
export interface RWAStakeInfo {
    userAddress: string;
    totalStakedRWA: string;
    rwaPending: string;
    lastWithdrawTime: number;
    referrer?: string;
    firstStakeTime: number;
    nodeLevel: number;
    isActive: boolean;
}

export interface RWALockedPrincipal {
    stakeId: string;
    principalAmount: string;
    lockStartTime: number;
    lockEndTime: number;
    lockPeriod: number;
    isWithdrawn: boolean;
}
```

---

## 🔧 三、前端层改动

### 3.1 质押页面改动

**位置**：`frontend/components/stake/stake-action-panel.tsx`

```typescript
// 新增：质押模式选择（USDT / RWA）
const [stakeMode, setStakeMode] = useState<'USDT' | 'RWA'>('RWA'); // 默认 RWA

// 新增：RWA 余额
const { balance: rwaBalance } = useRWA(); // 需要新增 useRWA hook

// 修改：根据模式显示不同的输入和授权
{stakeMode === 'RWA' ? (
    <>
        {/* RWA 质押输入 */}
        <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter RWA amount"
        />
        <button onClick={handleApproveRWA}>Approve RWA</button>
        <button onClick={handleStakeRWA}>Stake RWA</button>
    </>
) : (
    <>
        {/* USDT 质押输入（现有逻辑） */}
        {/* 添加提示：最小 100 USDT */}
        <p>Minimum stake: 100 USDT</p>
        {/* ... 现有 USDT 质押逻辑 ... */}
    </>
)}
```

### 3.2 新增一键买入并质押组件

**位置**：`frontend/components/stake/rwa-stake-with-buy.tsx`（新建文件）

```typescript
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransaction } from 'wagmi';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useStakingContract } from '@/hooks/useStakingContract';

export function RWAStakeWithBuy() {
    const { address } = useAccount();
    const [usdtAmount, setUsdtAmount] = useState('');
    const [lockPeriod, setLockPeriod] = useState<'flexible' | '30' | '90' | '180' | '365'>('flexible');
    
    // Step 1: 获取 RWA 报价
    const { quote: rwaQuote, isLoading: quoteLoading } = useSwapQuote({
        fromToken: 'USDT',
        toToken: 'RWA',
        amount: usdtAmount
    });
    
    // Step 2: 执行买入 + 质押
    const { writeContract: buyAndStake, data: txHash, isLoading } = useWriteContract();
    
    const handleBuyAndStake = async () => {
        if (!rwaQuote || !address) return;
        
        // 这里需要调用一个组合合约函数，或者分两步：
        // 1. 买入 RWA（通过 SwapContract 或 DEX Router）
        // 2. 质押 RWA（通过 StakingContract）
        
        // 简化版：假设有一个 Router 合约可以组合执行
        // 实际实现需要根据你的 DEX 集成方式调整
    };
    
    return (
        <div>
            <h2>Buy RWA & Stake (One-Click)</h2>
            <input
                type="number"
                value={usdtAmount}
                onChange={(e) => setUsdtAmount(e.target.value)}
                placeholder="Enter USDT amount"
            />
            <p>You will receive: {rwaQuote?.amount || '0'} RWA</p>
            {/* 锁仓期限选择 */}
            {/* ... */}
            <button onClick={handleBuyAndStake} disabled={isLoading || quoteLoading}>
                {isLoading ? 'Processing...' : 'Buy & Stake RWA'}
            </button>
        </div>
    );
}
```

### 3.3 新增 RWA Hook

**位置**：`frontend/hooks/useRWA.ts`（新建文件）

```typescript
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { rwaTokenABI } from '@/lib/contracts/rwaTokenABI';
import { addresses } from '@/lib/contracts/addresses';

export function useRWA() {
    const { address } = useAccount();
    const chainId = 31337; // Hardhat Local
    
    const { data: balance } = useReadContract({
        address: addresses[chainId].RWAToken,
        abi: rwaTokenABI,
        functionName: 'balanceOf',
        args: [address],
    });
    
    const { writeContract: approve } = useWriteContract();
    
    const approveStaking = async (amount: bigint) => {
        return approve({
            address: addresses[chainId].RWAToken,
            abi: rwaTokenABI,
            functionName: 'approve',
            args: [addresses[chainId].StakingContract, amount],
        });
    };
    
    return {
        balance: balance ? balance.toString() : '0',
        approveStaking,
    };
}
```

### 3.4 修改 Staking Hook

**位置**：`frontend/hooks/useStakingContract.ts`

```typescript
// 新增：RWA 质押函数
export function useStakingContract() {
    // ... 现有 USDT 质押函数 ...
    
    // 新增：RWA 质押
    const stakeRWA = async (amount: string, referrer: string, lockPeriod: number) => {
        const amountBigInt = parseUnits(amount, 18); // RWA 是 18 decimals
        const lockPeriodNum = lockPeriod === 'flexible' ? 0 : parseInt(lockPeriod);
        
        return writeContract({
            address: stakingContractAddress,
            abi: stakingContractABI,
            functionName: 'stakeRWA',
            args: [amountBigInt, referrer || ZeroAddress, lockPeriodNum],
        });
    };
    
    // 新增：提取 RWA 本金
    const withdrawRWAPrincipal = async (lockIndex: number) => {
        return writeContract({
            address: stakingContractAddress,
            abi: stakingContractABI,
            functionName: 'withdrawRWAPrincipal',
            args: [lockIndex],
        });
    };
    
    // 新增：提取 RWA 收益
    const withdrawRWARewards = async (amount: string, chooseStRWA: boolean) => {
        const amountBigInt = parseUnits(amount, 18);
        return writeContract({
            address: stakingContractAddress,
            abi: stakingContractABI,
            functionName: 'withdrawRWARewards',
            args: [amountBigInt, chooseStRWA],
        });
    };
    
    return {
        // ... 现有函数 ...
        stakeRWA,
        withdrawRWAPrincipal,
        withdrawRWARewards,
    };
}
```

### 3.5 更新 ABI

**位置**：`frontend/lib/contracts/stakingContractABI.ts`

```typescript
// 新增：RWA 质押相关 ABI
export const stakingContractABI = [
    // ... 现有 ABI ...
    
    // RWA 质押函数
    {
        name: 'stakeRWA',
        type: 'function',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'referrer', type: 'address' },
            { name: 'lockPeriod', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    
    // RWA 质押事件
    {
        name: 'RWAStakeEvent',
        type: 'event',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256' },
            { name: 'referrer', type: 'address', indexed: true },
            { name: 'stakeId', type: 'uint256', indexed: true },
            { name: 'timestamp', type: 'uint256' },
            { name: 'lockPeriod', type: 'uint256' }
        ]
    },
    
    // RWA 本金提取
    {
        name: 'withdrawRWAPrincipal',
        type: 'function',
        inputs: [{ name: 'lockIndex', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    
    // RWA 收益提取
    {
        name: 'withdrawRWARewards',
        type: 'function',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'chooseStRWA', type: 'bool' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    
    // 查询函数
    {
        name: 'rwaStakes',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'totalStakedRWA', type: 'uint256' },
            { name: 'rwaPending', type: 'uint256' },
            { name: 'lastWithdrawTime', type: 'uint256' },
            { name: 'referrer', type: 'address' },
            { name: 'firstStakeTime', type: 'uint256' },
            { name: 'nodeLevel', type: 'uint8' },
            { name: 'isActive', type: 'bool' }
        ],
        stateMutability: 'view'
    },
    
    {
        name: 'getRWALockedPrincipals',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'stakeIds', type: 'uint256[]' },
            { name: 'amounts', type: 'uint256[]' },
            { name: 'lockStartTimes', type: 'uint256[]' },
            { name: 'lockEndTimes', type: 'uint256[]' },
            { name: 'canWithdraw', type: 'bool[]' },
            { name: 'isWithdrawn', type: 'bool[]' }
        ],
        stateMutability: 'view'
    }
];
```

### 3.6 更新 Dashboard/Withdraw 页面

**位置**：`frontend/components/dashboard/earnings-card.tsx`、`frontend/components/withdraw/*`

```typescript
// 修改：显示 RWA 质押信息
// 在 earnings-card.tsx 中：
const { data: rwaStakeInfo } = useReadContract({
    address: stakingContractAddress,
    abi: stakingContractABI,
    functionName: 'rwaStakes',
    args: [address],
});

// 显示 RWA 质押本金、收益、锁定本金列表等
```

---

## 📋 四、测试改动

### 4.1 新增测试文件

**位置**：`test/StakingContractRWA.test.ts`（新建文件）

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('StakingContract - RWA Staking', () => {
    let stakingContract: any;
    let rwaToken: any;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    
    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
        
        // 部署 RWA Token
        const RWAToken = await ethers.getContractFactory('RWAToken');
        rwaToken = await RWAToken.deploy(
            'RWA Token',
            'RWA',
            ethers.parseUnits('1000000', 18),
            owner.address,
            owner.address
        );
        
        // 部署 StakingContract（需要传入 RWA Token 地址）
        const StakingContract = await ethers.getContractFactory('StakingContract');
        stakingContract = await StakingContract.deploy(
            usdtTokenAddress,
            rwaToken.target,
            treasuryAddress,
            backendAddress
        );
        
        // 给用户 mint RWA
        await rwaToken.transfer(user.address, ethers.parseUnits('10000', 18));
    });
    
    it('Should stake RWA successfully', async () => {
        const stakeAmount = ethers.parseUnits('1000', 18);
        
        // Approve
        await rwaToken.connect(user).approve(stakingContract.target, stakeAmount);
        
        // Stake
        await expect(stakingContract.connect(user).stakeRWA(stakeAmount, ethers.ZeroAddress, 0))
            .to.emit(stakingContract, 'RWAStakeEvent');
        
        // Check user stake info
        const stakeInfo = await stakingContract.rwaStakes(user.address);
        expect(stakeInfo.totalStakedRWA).to.equal(stakeAmount);
    });
    
    it('Should withdraw RWA principal after lock period', async () => {
        // ... 测试本金提取 ...
    });
    
    it('Should withdraw RWA rewards', async () => {
        // ... 测试收益提取 ...
    });
});
```

---

## 📋 五、部署脚本改动

**位置**：`scripts/deploy-local-test.ts`、`scripts/deploy-to-bsc-testnet.ts`

```typescript
// 修改：部署后初始化 RWA 奖励池
async function deployAndInitialize() {
    // ... 部署所有合约 ...
    
    // 初始化 RWA 奖励池：给 StakingContract 注入 RWA 作为奖励池
    const initialRewardPool = ethers.parseUnits('100000', 18); // 10万 RWA
    await rwaToken.transfer(stakingContract.target, initialRewardPool);
    
    console.log('✅ RWA reward pool initialized:', initialRewardPool.toString());
}
```

---

## 📋 六、文档更新

### 6.1 更新 README

**位置**：`README.md`

```markdown
## 质押模式

### USDT 质押（保留）
- 最小质押：100 USDT
- 适合：不想购买 RWA 的用户
- 操作：一步完成

### RWA 质押（主推荐）
- 最小质押：无限制（建议至少等值 100 USDT）
- 适合：想推高 RWA 价格的用户
- 操作：购买 RWA → 质押 RWA（或一键完成）
- 优势：推高 RWA 价格 ✅
```

---

## ✅ 总结

### 改动范围
- **合约**：新增 RWA 质押函数/事件/查询，最小改动现有 USDT 质押
- **后端**：新增 RWA 事件监听/收益计算，保留 USDT 逻辑
- **前端**：新增 RWA 质押入口，一键买入+质押，保留 USDT 入口
- **测试**：新增 RWA 质押测试，保留 USDT 测试

### 关键点
1. ✅ **两种模式并行**，互不干扰
2. ✅ **USDT 质押限制 ≥100 USDT**
3. ✅ **RWA 质押作为主推荐入口**
4. ✅ **一键买入+质押提升用户体验**

---

**这就是完整的 RWA 质押通道最小改动清单！** 🚀
