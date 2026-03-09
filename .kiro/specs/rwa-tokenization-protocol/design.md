# Design Document

## 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v1.1 | 2026-02-26 | 澄清后端私钥防御方案、删除价格预言机矛盾、补充 stakeId 定义、补充事件定义、强化紧急提取警告 |
| v1.0 | 2026-02-01 | 初始版本 |

---

## Overview

本 RWA 代币化协议是一个基于 BSC（币安智能链）的去中心化金融系统，实现现实资产的链上代币化、质押管理和社区激励分配。系统采用智能合约 + 后端服务的混合架构，通过 **50/50 资产分配模型**确保资产储备和社区激励的平衡，并通过无限级差算法驱动社区裂变增长。

核心特性包括：
- 自动化资金分配（**50% 储备金 + 50% 激励池**）
- 无限层级推荐关系和级差奖励系统
- 交易调节税机制（20% 卖出税）
- 每日静态收益释放（0.8% RWA Token）
- 五级节点体系（V1-V5）
- 自动化做市支持系统

### 资金分配与国库管理模型（The 50/50 Model）

**战略升级：共识倍增阶段**

为加速全球共识节点扩张并赋予社区更大的治理与获利空间，协议采用 **50/50 激励模型**，将一半的入金流量直接回馈给生态建设者。

**50% 资产配置资金（Asset Acquisition Fund）**
- 直接转入协议指定的 Treasury Address（国库地址）
- 用于锚定底层实物资产，确保协议具备真实的价值支撑与兑付能力
- 资金流转路径：
  - **专项资产收购**：根据资产采购计划，划拨至合作的 SPV（特殊目的实体）进行实物资产采购
  - **战略流动性储备**：部分转化为协议管理费，用于覆盖全球合规审计、法律架构维护及技术节点运营
  - **做市调节基金**：授权给自动化做市系统（AMM），维护 RWA Token 价格稳定性

**50% 生态激励池（Community Incentive Pool）**
- 保留在 Staking Contract 内或分配至激励池
- 用于驱动 DAO 节点的全球化扩张，支付社区建设者的推广报酬
- 支持无限级差奖励分发（**总支出锁定在 50% 以内**）
- 打造全网最强的造富矩阵

**风险控制与治理机制**
- **多签保护**：所有储备金的调拨均由 Gnosis Safe 多签钱包（3/2）触发，确保操作的严肃性
- **审计豁免与白名单**：协议管理地址、做市维护地址、节点分红地址设为免税，降低运维成本
- **紧急熔断机制**：管理员可启动 Pause 函数，在极端市场波动时暂停所有质押和提现操作
- **透明度承诺**：所有链上资金流转可通过区块链浏览器公开审计，DAO 治理公示中心实时展示

本架构设计旨在通过"现实资产"与"社区激励"的双驱动模型，实现 RWA 赛道的指数级增长。

## Architecture

系统采用三层架构设计：

### 1. 智能合约层（Blockchain Layer）

**RWAToken Contract (BEP-20)**
- 标准 BEP-20 代币实现
- 集成交易税逻辑（买入免税，卖出 20% 税）
- 白名单管理（免税地址）
- 销毁机制（发送至黑洞地址）

**StakingContract**
- 处理 USDT 质押
- 自动分配资金（50% 转 Treasury，50% 留合约）
- 推荐关系绑定和存储
- 级差奖励计算和分发
- 用户余额管理（静态收益 + 动态奖励）
- 提现控制（最低额度、冷却时间、手续费）
- 紧急熔断机制

### 2. 后端服务层（Backend Service Layer）

**Event Monitor Service**
- 监听链上质押事件
- 解析事件参数并存储到数据库
- 触发级差奖励计算流程

**Reward Calculation Engine**
- 实现无限级差算法
- 追溯推荐链条并计算每个上级收益
- 更新用户可提取余额
- 处理节点等级升级逻辑

**Daily Yield Scheduler**
- 定时任务（每日执行）
- 计算所有用户的静态收益（0.8% × 质押金额）
- 更新用户 RWA Token 余额

**Price Oracle Service**
- 从 PancakeSwap 获取 RWA/USDT 实时价格
- 用于提现门槛验证（10 USDT 等值）
- 缓存价格数据以减少 RPC 调用

**API Service**
- 提供用户查询接口（质押信息、收益明细、推荐关系）
- 处理前端请求
- 数据聚合和格式化

### 3. 自动化做市层（Market Support Layer）

**Market Maker Bot**
- Python 脚本，定时执行
- 随机时间间隔在 PancakeSwap 买入 RWA Token
- 维护价格稳定性和流动性深度
- 记录交易日志和监控钱包余额

### 系统交互流程

```
用户 → StakingContract.stake(amount, referrer)
  ↓
  ├─ 50% USDT → Treasury Address
  ├─ 50% USDT → 合约激励池
  └─ 触发 StakeEvent
       ↓
Event Monitor → 捕获事件 → 存储数据库
       ↓
Reward Engine → 计算级差奖励 → 更新用户余额
       ↓
Daily Scheduler → 计算静态收益 → 累加 RWA Token

用户 → StakingContract.withdraw(amount)
  ↓
  ├─ 验证余额和门槛
  ├─ 扣除 5% 手续费并销毁
  └─ 转账 RWA Token 至用户钱包
```

## Components and Interfaces

### Smart Contract Components

#### 1. RWAToken Contract

```solidity
interface IRWAToken {
    // BEP-20 标准函数
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    
    // 税收管理
    function setTaxEnabled(bool enabled) external;
    function setWhitelist(address account, bool exempt) external;
    function setTreasuryAddress(address treasury) external;
    function setLiquidityFundAddress(address liquidityFund) external;
    function setPancakeSwapPair(address pair) external;
    
    // 销毁
    function burn(uint256 amount) external;
}
```

**关键逻辑：**
- `_transfer` 函数中检测交易方向（买入/卖出）
- 如果是从 PancakeSwap Pair 卖出且不在白名单，征收 20% 税
- 税收分配：10% → Treasury，5% → 销毁，5% → Liquidity Fund

#### 2. StakingContract

```solidity
interface IStakingContract {
    // 质押
    function stake(uint256 amount, address referrer) external;
    
    // 提现
    function withdraw(uint256 amount) external;
    
    // 查询
    function getUserStakeInfo(address user) external view returns (
        uint256 totalStaked,
        uint256 rwaPending,
        uint256 usdtRewards,
        uint256 lastWithdrawTime,
        address referrer,
        uint8 nodeLevel
    );
    
    // 管理员函数
    function setTreasuryAddress(address treasury) external;
    function setWhitelist(address account, bool exempt) external;
    function pause() external;
    function unpause() external;
    function emergencyWithdraw() external;
    
    // 后端调用（需权限控制 + 双重锁死 + 单次限额）
    function updateUserRewards(
        address user, 
        uint256 rwAmount, 
        uint256 usdtAmount,
        uint256 stakeId  // 新增：质押记录 ID，防止重复计奖
    ) external;
    function updateNodeLevel(address user, uint8 level) external;
    
    // 管理员设置单次奖励上限（防止后端被黑导致合约被掏空）
    function setMaxRewardPerCall(uint256 maxAmount) external;
    
    // 查询已发放的动态奖励总额（用于 50% 上限校验）
    function getTotalDynamicRewardsPaid() external view returns (uint256);
    function getTotalStaked() external view returns (uint256);
}
```

**关键数据结构：**

```solidity
struct UserInfo {
    uint256 totalStaked;        // 累计质押金额
    uint256 rwaPending;          // 待提取 RWA Token (18 decimals)
    uint256 usdtRewards;         // 动态 USDT 奖励 (18 decimals)
    uint256 lastWithdrawTime;    // 上次提现时间
    address referrer;            // 推荐人（一旦设置不可更改）
    uint8 nodeLevel;             // 节点等级 (1-5)
    uint256 firstStakeTime;      // 首次质押时间
    bool isActive;               // 是否有活跃本金（控制收益计算）
}

mapping(address => UserInfo) public users;
mapping(address => bool) public whitelist;  // 使用 mapping 而非 array，优化 Gas
mapping(uint256 => bool) public processedStakes;  // 新增：记录已处理的质押 ID，防止重复计奖

// 新增：全局统计变量
uint256 public totalStaked;  // 总质押金额
uint256 public totalDynamicRewardsPaid;  // 已发放的动态奖励总额
uint256 public maxRewardPerCall;  // 单次奖励上限（防止后端被黑导致合约被掏空）
```

**关键设计说明：**
- 推荐人地址一旦设置不可更改（除非管理员紧急干预）
- `isActive` 标志控制静态收益计算，当用户撤资或紧急提取后设为 false
- 所有代币金额使用 18 位精度，避免精度丢失
- **新增 `processedStakes` 映射**：防止同一笔质押被重复计算奖励
- **新增全局统计变量**：用于实时校验动态奖励总额不超过 50% 上限

#### StakeId 生成机制

**选择方案：合约内维护自增计数器**

**实现代码：**

```solidity
// 全局自增计数器
uint256 private stakesCounter = 0;

function stake(uint256 amount, address referrer) external nonReentrant whenNotPaused {
    require(amount > 0, "Invalid amount");
    
    // 1. 生成唯一 stakeId（自增）
    uint256 stakeId = stakesCounter++;
    
    // 2. 执行 50/50 分配
    uint256 treasuryAmount = amount * 50 / 100;
    uint256 contractAmount = amount - treasuryAmount;
    
    IERC20(usdt).safeTransferFrom(msg.sender, treasury, treasuryAmount);
    IERC20(usdt).safeTransferFrom(msg.sender, address(this), contractAmount);
    
    // 3. 绑定推荐关系（仅首次）
    if (referrer != address(0) && referrer != msg.sender && users[msg.sender].referrer == address(0)) {
        users[msg.sender].referrer = referrer;
        emit ReferralBound(msg.sender, referrer, block.timestamp);
    }
    
    // 4. 记录质押信息
    users[msg.sender].totalStaked += amount;
    users[msg.sender].isActive = true;
    totalStaked += amount;
    
    // 5. 触发事件（包含 stakeId）
    emit StakeEvent(msg.sender, amount, users[msg.sender].referrer, stakeId, block.timestamp);
}
```

**对应数据库：**
- `stakes` 表的 `id` 字段为自增主键
- 后端从 StakeEvent 中读取 stakeId
- 存储到 `stakes.id` 字段
- 确保合约 stakeId 和数据库 id 保持对应

**防重入机制：**
- 合约维护 `mapping(uint256 => bool) processedStakes`
- 记录已处理的 stakeId
- 后端调用 `updateUserRewards(user, rwAmount, usdtAmount, stakeId)` 时必须传入 stakeId
- 合约检查 `require(!processedStakes[stakeId], "Stake already processed")`
- 防止同一笔质押被多次计奖

**关键设计原则：**
1. stakeId 从 0 开始，单调递增
2. 每次 stake 都会生成新的 stakeId，不会重复
3. stakeId 在事件中暴露，后端可以可靠地获取和存储
4. 为未来的 Merkle Root 验证预留了链条标识

#### 事件定义（Solidity Events）

**质押事件**
```solidity
/// @notice 用户质押事件
/// @param user 质押用户地址
/// @param amount 质押 USDT 金额（6 位精度）
/// @param referrer 推荐人地址（可能为零地址）
/// @param stakeId 唯一质押 ID
/// @param timestamp 事件时间戳
event StakeEvent(
    address indexed user,
    uint256 amount,
    address indexed referrer,
    uint256 indexed stakeId,
    uint256 timestamp
);
```

**推荐关系绑定事件**
```solidity
/// @notice 推荐关系绑定事件
/// @param user 新用户地址
/// @param referrer 推荐人地址
/// @param timestamp 绑定时间戳
event ReferralBound(
    address indexed user,
    address indexed referrer,
    uint256 timestamp
);
```

**奖励发放事件**
```solidity
/// @notice 级差奖励发放事件
/// @param user 受益人地址
/// @param rwAmount 发放的 RWA Token 数量（18 位精度）
/// @param usdtAmount 发放的 USDT 金额（18 位精度）
/// @param stakeId 对应的质押 ID
/// @param timestamp 发放时间戳
event RewardsUpdated(
    address indexed user,
    uint256 rwAmount,
    uint256 usdtAmount,
    uint256 indexed stakeId,
    uint256 timestamp
);
```

**节点等级升级事件**
```solidity
/// @notice 节点等级升级事件
/// @param user 升级的用户地址
/// @param oldLevel 升级前的等级
/// @param newLevel 升级后的等级
/// @param timestamp 升级时间戳
event NodeLevelUpdated(
    address indexed user,
    uint8 oldLevel,
    uint8 newLevel,
    uint256 timestamp
);
```

**提现请求事件**
```solidity
/// @notice 用户提现事件
/// @param user 提现用户地址
/// @param amount 提现 RWA Token 数量（18 位精度）
/// @param fee 手续费（销毁）金额
/// @param timestamp 提现时间戳
event WithdrawalRequested(
    address indexed user,
    uint256 amount,
    uint256 fee,
    uint256 timestamp
);
```

**合约暂停事件**
```solidity
/// @notice 合约暂停状态变更
/// @param paused 暂停状态（true=暂停，false=恢复）
event PausedStatusChanged(bool indexed paused);
```

**单次限额更新事件**
```solidity
/// @notice 后端单次奖励限额更新
/// @param newLimit 新的限额（USDT 数量，18 位精度）
event MaxRewardPerCallUpdated(uint256 newLimit);
```

**紧急提取事件**
```solidity
/// @notice 紧急提取事件
/// @param user 提取用户地址
/// @param refundAmount 退回金额
/// @param deductedRewards 扣除的奖励
event EmergencyWithdrawal(
    address indexed user,
    uint256 refundAmount,
    uint256 deductedRewards
);
```

**事件使用规范：**

| 规范 | 说明 |
|------|------|
| indexed 属性 | 所有 address 类型参数都使用 indexed，便于链上事件筛选 |
| indexed 属性 | 所有关键 ID（stakeId、level 等）都使用 indexed |
| timestamp 字段 | 所有事件都包含 timestamp，便于后端查询和排序 |
| 参数注释 | 每个参数都注明单位和精度（如"18 位精度"） |
| 事件命名 | 使用动宾或被动语态，清晰表达含义 |

### Backend Service Components

#### 1. Database Schema

**users 表**
```sql
CREATE TABLE users (
    address VARCHAR(42) PRIMARY KEY,
    referrer VARCHAR(42),
    referral_path TEXT,  -- 推荐链条路径，格式：,A,B,C, 用于快速向上追溯
    node_level TINYINT DEFAULT 1,
    total_staked DECIMAL(38, 0) DEFAULT 0,  -- 改为 18 位整数存储，避免精度丢失
    team_volume DECIMAL(38, 0) DEFAULT 0,  -- 改为 18 位整数存储（增量更新）
    rwa_pending DECIMAL(38, 0) DEFAULT 0,  -- 改为 18 位整数存储
    usdt_rewards DECIMAL(38, 0) DEFAULT 0,  -- 改为 18 位整数存储
    direct_referral_count INT DEFAULT 0,
    last_withdraw_time TIMESTAMP,
    first_stake_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,  -- 是否有活跃本金（用于控制收益计算）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_referrer (referrer),
    INDEX idx_node_level (node_level),
    INDEX idx_referral_path (referral_path(100))
);
```

**department_volumes 表（用于大区小区计算）**
```sql
CREATE TABLE department_volumes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    direct_referral VARCHAR(42) NOT NULL,  -- 直推用户地址（部门根节点）
    department_volume DECIMAL(38, 0) DEFAULT 0,  -- 改为 18 位整数存储
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_department (user_address, direct_referral),
    INDEX idx_user (user_address)
);
```

**stakes 表**
```sql
CREATE TABLE stakes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    amount DECIMAL(38, 0) NOT NULL,  -- 改为 18 位整数存储
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_address),
    INDEX idx_timestamp (timestamp)
);
```

**rewards 表**
```sql
CREATE TABLE rewards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    reward_type ENUM('static', 'differential') NOT NULL,
    token_type ENUM('RWA', 'USDT') NOT NULL,
    amount DECIMAL(38, 0) NOT NULL,  -- 改为 18 位整数存储
    from_user VARCHAR(42),  -- 对于级差奖励，记录来源用户
    stake_id BIGINT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_address),
    INDEX idx_type (reward_type),
    INDEX idx_timestamp (timestamp)
);
```

**node_level_history 表**
```sql
CREATE TABLE node_level_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    old_level TINYINT NOT NULL,
    new_level TINYINT NOT NULL,
    team_volume DECIMAL(38, 0) NOT NULL,  -- 改为 18 位整数存储
    direct_v_count INT NOT NULL,  -- 达标的直推高级节点数
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_address)
);
```

**referral_relations 表（用于精确匹配级差查询）**
```sql
CREATE TABLE referral_relations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    ancestor_address VARCHAR(42) NOT NULL,  -- 上级地址（任意层级）
    depth INT NOT NULL,  -- 层级深度（1=直推，2=二级，以此类推）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_ancestor (user_address, ancestor_address),
    INDEX idx_ancestor (ancestor_address),
    INDEX idx_user (user_address),
    INDEX idx_depth (depth)
);
```

#### 2. Reward Calculation Engine API

```typescript
interface IRewardEngine {
    // 计算级差奖励
    calculateDifferentialRewards(
        stakeAmount: number,
        userAddress: string,
        stakeId: number  // 新增：质押记录 ID
    ): Promise<RewardDistribution[]>;
    
    // 计算静态收益
    calculateDailyYield(userAddress: string): Promise<number>;
    
    // 更新团队业绩（增量）
    updateTeamVolume(
        userAddress: string,
        incrementAmount: number
    ): Promise<void>;
    
    // 检查并升级节点等级
    checkAndUpgradeNodeLevel(userAddress: string): Promise<boolean>;
    
    // 新增：验证动态奖励总额不超过 50% 上限
    validateRewardLimit(
        newRewards: RewardDistribution[]
    ): Promise<boolean>;
}

interface RewardDistribution {
    beneficiary: string;
    amount: string;  // 改为 string 类型，避免精度丢失
    percentage: number;
    nodeLevel: number;
}
```

**关键约束：**
- 所有金额字段使用 **string 类型**传输，避免 JavaScript Number 精度丢失
- 后端内部使用 `ethers.BigNumber` 或 `bignumber.js` 进行计算
- 调用合约前验证动态奖励总额不超过总质押的 50%

#### 3. Price Oracle API

```typescript
interface IPriceOracle {
    // 获取 RWA/USDT 价格（每 5 分钟更新一次）
    getRWAPrice(): Promise<number>;
    
    // 计算 RWA 等值 USDT
    convertRWAToUSDT(rwaAmount: number): Promise<number>;
    
    // 计算 USDT 等值 RWA
    convertUSDTToRWA(usdtAmount: number): Promise<number>;
    
    // 获取缓存的价格和更新时间
    getCachedPrice(): { price: number; updatedAt: Date };
}
```

#### V1 版本（当前方案 - 已确定）

**✅ 采用：后端价格预言机 + Redis 缓存**

V1 版本使用后端服务从 PancakeSwap 获取实时价格，并通过 Redis 缓存提供价格验证服务。

**架构设计：**
- 后端服务每 5 分钟从 PancakeSwap 获取 RWA/USDT 实时价格
- 调用 PancakeSwap Router 的 `getAmountsOut` 或直接查询 Pair 合约
- 价格缓存到 Redis，TTL = 5 分钟
- 提现时从缓存读取价格，验证"10 USDT 等值"门槛
- 合约调用后端提供的价格验证接口

**优点：**
- ✅ 实现相对简单，无需链上部署价格预言机
- ✅ 成本低，仅需 Redis 存储
- ✅ 性能高，缓存查询 < 10ms
- ✅ 灵活性高，可以快速调整价格源
- ✅ 满足 V1 版本的"10 USDT 等值"需求

**风险控制：**
- ⚠️ 后端宕机风险：使用上次成功缓存的价格（最长 5 分钟前）
- ⚠️ 价格操纵风险：设置价格变动阈值告警（如单次变动 > 20%）
- ⚠️ 缓存失效风险：多级降级策略（见下文）

**实现方式：**
```solidity
// 合约端：调用后端价格验证
function withdraw(uint256 amount) external nonReentrant whenNotPaused {
    // 调用后端 API 获取当前 RWA 价格（USDT 计价）
    uint256 rwaPrice = priceOracle.getRWAPrice();
    uint256 usdtValue = (amount * rwaPrice) / 1e18;
    
    require(usdtValue >= 10 * 1e18, "Minimum withdrawal is 10 USDT equivalent");
    // ... 其他验证和转账逻辑
}
```

```typescript
// 后端价格预言机服务
class PriceOracle {
    async getRWAPrice(): Promise<string> {
        // 1. 尝试从 Redis 缓存读取
        const cached = await redis.get('rwa_price');
        if (cached && Date.now() - cached.timestamp < 300000) {
            return cached.price;
        }
        
        // 2. 从 PancakeSwap 获取实时价格
        const price = await this.fetchFromPancakeSwap();
        
        // 3. 缓存到 Redis（TTL 5 分钟）
        await redis.setex('rwa_price', 300, JSON.stringify({
            price,
            timestamp: Date.now()
        }));
        
        return price;
    }
    
    async fetchFromPancakeSwap(): Promise<string> {
        const router = new ethers.Contract(PANCAKE_ROUTER, ABI, provider);
        const amounts = await router.getAmountsOut(
            ethers.utils.parseUnits('1', 18), // 1 RWA
            [RWA_TOKEN, USDT_TOKEN]
        );
        return amounts[1].toString(); // USDT 数量
    }
}
```

---

#### 降级策略和容错机制

为了确保价格预言机服务的高可用性，实现多级降级策略：

| 场景 | 处理方案 | 说明 |
|------|---------|------|
| Redis 缓存有效（< 5 分钟） | 使用缓存价格 | 正常情况，性能最优 |
| Redis 缓存过期但可获取新价格 | 从 PancakeSwap 获取并更新缓存 | 缓存刷新流程 |
| PancakeSwap 请求失败 | 使用上次成功的价格（最长 10 分钟前） | 短期降级 |
| 缓存也失效（> 10 分钟） | **拒绝提现，发送告警** | 安全优先 |
| 价格异常波动（> 20%） | 触发人工审核，暂停提现 | 防止价格操纵 |

**告警机制：**
- 价格获取失败 → Telegram Bot 通知管理员
- 价格异常波动 → 立即告警并暂停提现
- 缓存失效超过 10 分钟 → 紧急告警

**价格验证逻辑：**
```typescript
async function validateWithdrawal(amount: string): Promise<boolean> {
    try {
        // 1. 获取价格（带缓存）
        const price = await priceOracle.getRWAPrice();
        
        // 2. 计算 USDT 等值
        const usdtValue = BigNumber.from(amount)
            .mul(BigNumber.from(price))
            .div(BigNumber.from('1000000000000000000'));
        
        // 3. 验证是否 >= 10 USDT
        const minThreshold = BigNumber.from('10000000000000000000'); // 10 USDT
        return usdtValue.gte(minThreshold);
    } catch (error) {
        // 4. 获取价格失败，拒绝提现
        logger.error('Price oracle failed', error);
        await sendAlert('Price oracle unavailable');
        return false;
    }
}
```

---

#### V2 版本（未来升级 - 可选）

**计划升级：链上 Chainlink 价格预言机**

如果 RWA Token 被 Chainlink 支持，可以升级为完全去中心化的价格预言机：

- 使用 Chainlink Price Feed 直接在合约中获取价格
- 完全去中心化，无单点故障
- 适用于大规模、对价格精度要求高的场景
- Gas 成本略高，但安全性最佳

**V2 升级条件：**
1. RWA Token 被 Chainlink 支持
2. V1 版本稳定运行 6 个月以上
3. 用户量达到一定规模（如 10,000+ 用户）

**V1 版本专注于后端价格预言机**，保持实现简单且成本可控。

### Market Maker Bot Interface

```python
class MarketMakerBot:
    def __init__(self, config):
        self.web3 = Web3(HTTPProvider(config.rpc_url))
        self.wallet = self.web3.eth.account.from_key(config.private_key)
        self.router = self.web3.eth.contract(
            address=config.pancake_router,
            abi=PANCAKE_ROUTER_ABI
        )
    
    def execute_buy(self, usdt_amount: float):
        """在 PancakeSwap 执行买入操作"""
        pass
    
    def get_random_interval(self) -> int:
        """返回随机时间间隔（秒）"""
        return random.randint(1800, 7200)  # 30分钟到2小时
    
    def check_wallet_balance(self) -> float:
        """检查钱包 USDT 余额"""
        pass
    
    def run(self):
        """主循环"""
        while True:
            try:
                self.execute_buy(random.uniform(10, 50))
                time.sleep(self.get_random_interval())
            except Exception as e:
                logging.error(f"Buy failed: {e}")
```

## Data Models

### 1. 用户状态模型

```typescript
interface User {
    address: string;
    referrer: string | null;
    referralPath: string;       // 推荐链条路径，如 ",A,B,C,"
    nodeLevel: 1 | 2 | 3 | 4 | 5;
    totalStaked: number;        // 用户本人累计质押
    teamVolume: number;         // 团队总业绩（含本人）
    rwaPending: number;         // 待提取 RWA (18 decimals)
    usdtRewards: number;        // 动态 USDT 奖励 (18 decimals)
    directReferralCount: number;
    lastWithdrawTime: Date;
    firstStakeTime: Date;
    isActive: boolean;          // 是否有活跃本金
}
```

### 2. 质押记录模型

```typescript
interface StakeRecord {
    id: number;
    userAddress: string;
    amount: number;
    txHash: string;
    blockNumber: number;
    timestamp: Date;
}
```

### 3. 奖励记录模型

```typescript
interface RewardRecord {
    id: number;
    userAddress: string;
    rewardType: 'static' | 'differential';
    tokenType: 'RWA' | 'USDT';
    amount: number;
    fromUser?: string;  // 级差奖励来源
    stakeId?: number;
    timestamp: Date;
}
```

### 4. 节点等级升级条件模型

```typescript
interface NodeLevelRequirement {
    level: number;
    directReferrals: {
        minLevel: number;  // 直推用户的最低等级
        count: number;     // 需要的数量
    };
    teamVolume: number;    // 团队总业绩要求
    maxDepartmentRatio: number;  // 最大单部门业绩占比（大区限制）
}

const NODE_REQUIREMENTS: NodeLevelRequirement[] = [
    { level: 1, directReferrals: { minLevel: 0, count: 0 }, teamVolume: 0, maxDepartmentRatio: 1.0 },
    { level: 2, directReferrals: { minLevel: 1, count: 3 }, teamVolume: 5000, maxDepartmentRatio: 0.5 },
    { level: 3, directReferrals: { minLevel: 2, count: 3 }, teamVolume: 20000, maxDepartmentRatio: 0.5 },
    { level: 4, directReferrals: { minLevel: 3, count: 3 }, teamVolume: 100000, maxDepartmentRatio: 0.5 },
    { level: 5, directReferrals: { minLevel: 4, count: 3 }, teamVolume: 500000, maxDepartmentRatio: 0.5 }
];
```

**大区小区平衡机制：**
- 从 V2 开始，单个直推部门的业绩不得超过总业绩要求的 50%
- 例如：升级 V3 需要 20000 USDT 团队业绩，任何单个直推分支的业绩不得超过 10000 USDT
- 这强制用户进行多线裂变，增强网络稳定性和抗风险能力

### 5. 级差奖励比例模型

```typescript
const NODE_REWARD_PERCENTAGES: Record<number, number> = {
    1: 0.05,   // V1: 5%
    2: 0.10,   // V2: 10%
    3: 0.15,   // V3: 15%
    4: 0.20,   // V4: 20%
    5: 0.50    // V5: 50%
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 50/50 资金分配正确性
*For any* 质押金额，当用户调用 stake 函数时，Treasury Address 收到的金额应该等于质押金额的 50%，合约保留的金额应该等于质押金额的 50%
**Validates: Requirements 1.1, 1.2**

### Property 2: 质押记录完整性
*For any* 成功的质押操作，合约应该正确记录用户的质押金额和时间戳，且记录的金额应该等于实际质押的金额
**Validates: Requirements 1.3**

### Property 3: 推荐关系不可变性
*For any* 用户，一旦推荐关系被记录，后续的质押操作不应该改变该用户的推荐人地址
**Validates: Requirements 2.1, 2.2**

### Property 4: 推荐关系事件发射
*For any* 首次质押且提供有效推荐人的用户，合约应该触发包含正确参数的推荐关系事件
**Validates: Requirements 2.4**

### Property 5: 级差奖励计算正确性
*For any* 质押金额和推荐链条，计算出的每个上级节点收益应该等于：质押金额 × (上级当前等级比例 - 路径上已分配过的最高比例)，且该值不应为负数
**Validates: Requirements 3.1, 3.4**

### Property 6: 无限层级支持
*For any* 深度的推荐链条，级差奖励计算算法应该能够追溯到链条顶端或直到没有更多上级
**Validates: Requirements 3.2**

### Property 7: 级差奖励总额上限
*For any* 质押金额和任意推荐网络结构，所有上级节点获得的级差奖励总和不应超过质押金额的 50%
**Validates: Requirements 3.3**

### Property 8: 资金完整性
*For any* 质押操作，50% 转入 Treasury + 50% 社区池（包含所有级差奖励和剩余资金）的总和应该等于原始质押金额，不应有资金丢失
**Validates: Requirements 3.5**

### Property 9: 节点等级到奖励比例映射
*For any* 节点等级（V1-V5），系统返回的奖励比例应该严格等于预定义的比例（V1:5%, V2:10%, V3:15%, V4:20%, V5:50%）
**Validates: Requirements 3.6, 3.7, 3.8, 3.9, 3.10**

### Property 10: 动态奖励币种正确性
*For any* 级差奖励分发，受益人收到的应该是 USDT 代币，而不是 RWA 代币
**Validates: Requirements 3.11**

### Property 11: 卖出交易税征收
*For any* 在 DEX 的 RWA Token 卖出交易（非白名单地址），实际到账金额应该等于卖出金额的 80%（扣除 20% 税）
**Validates: Requirements 4.1**

### Property 12: 交易税分配正确性
*For any* 征收的交易税，Treasury 收到的应该是税额的 50%（总交易的 10%），销毁的应该是税额的 25%（总交易的 5%），流动性基金收到的应该是税额的 25%（总交易的 5%）
**Validates: Requirements 4.2, 4.3, 4.4, 17.3**

### Property 13: 白名单免税
*For any* 在白名单中的地址，其在 DEX 的卖出交易不应被征收任何交易税
**Validates: Requirements 4.5**

### Property 14: 买入交易免税
*For any* 在 DEX 的 RWA Token 买入交易，不应被征收任何交易税
**Validates: Requirements 4.6**

### Property 15: 静态收益计算正确性
*For any* 用户的质押金额，每日释放的 RWA Token 数量应该等于质押金额的 0.8%
**Validates: Requirements 5.1**

### Property 16: 收益余额更新
*For any* 收益计算完成后，用户的可提取余额应该增加相应的 RWA Token 数量
**Validates: Requirements 5.2**

### Property 17: 提现余额扣减
*For any* 成功的提现操作，用户的可提取余额应该减少提现金额，且转账到用户钱包的金额应该等于提现金额减去手续费
**Validates: Requirements 6.2, 6.3**

### Property 18: 管理员权限控制
*For any* 管理函数（如设置 Treasury、添加白名单、暂停合约），只有管理员地址调用时应该成功，非管理员调用应该被拒绝并返回错误
**Validates: Requirements 9.3, 15.5**

### Property 19: 白名单管理往返一致性
*For any* 地址，添加到白名单后再移除，该地址的白名单状态应该恢复到初始状态（非白名单）
**Validates: Requirements 9.4, 9.5**

### Property 20: 查询功能数据一致性
*For any* 用户地址，查询返回的质押金额、节点等级和推荐人应该与合约存储的实际数据一致
**Validates: Requirements 12.1, 12.3**

### Property 21: 节点等级升级条件
*For any* 用户，当其直推达标节点数和团队业绩同时满足升级条件时，系统应该将其节点等级升级到对应级别
**Validates: Requirements 13.2, 13.3, 13.4, 13.5**

### Property 22: 提现门槛验证
*For any* 提现请求，当提现金额的 USDT 等值低于 10 USDT 时，合约应该拒绝该请求
**Validates: Requirements 14.1**

### Property 23: 提现手续费扣除
*For any* 满足门槛的提现请求，实际销毁的 RWA Token 应该等于提现金额的 5%，用户收到的应该是提现金额的 95%
**Validates: Requirements 14.3**

### Property 24: 提现冷却时间
*For any* 用户，在成功提现后的 24 小时内，新的提现请求应该被拒绝；24 小时后应该允许新的提现
**Validates: Requirements 14.4, 14.5**

### Property 25: 暂停机制往返一致性
*For any* 合约状态，管理员调用 pause 后再调用 unpause，合约应该恢复到可以正常执行 stake 和 withdraw 操作的状态
**Validates: Requirements 15.1, 15.2, 15.3**

### Property 26: 紧急提取本金保护
*For any* 用户在紧急提取模式下，应该能够取回其本金（总质押金额），但不应包含任何收益
**Validates: Requirements 15.4**

### Property 27: 动态奖励资金来源
*For any* 级差奖励分发，支付的 USDT 应该从合约的社区池余额中扣除，社区池余额应该相应减少
**Validates: Requirements 16.3**

### Property 28: 大区小区平衡限制
*For any* 用户升级到 V2 及以上等级，其任何单个直推部门的业绩不应超过总业绩要求的 50%
**Validates: Requirements 13.2, 13.3, 13.4, 13.5**

### Property 29: 推荐关系不可修改性
*For any* 用户，一旦推荐关系被设置，任何后续操作（包括再次质押）都不应改变该推荐人地址
**Validates: Requirements 2.1, 2.2**

### Property 30: 收益计算与本金状态关联
*For any* 用户，当其 isActive 状态为 false 时（撤资或紧急提取后），静态收益计算应该停止
**Validates: Requirements 5.1**

### Property 31: 精度一致性
*For any* 涉及 USDT 和 RWA 的计算，所有中间结果和最终结果都应使用 18 位小数精度，不应出现精度丢失
**Validates: Requirements 1.1, 1.2, 3.1, 5.1**

### Property 32: stakeId 唯一性保证
*For any* 质押记录 ID（stakeId），合约的 updateUserRewards 函数只应成功执行一次，第二次调用应该被拒绝
**Validates: Requirements 3.11, 7.4**

### Property 33: 动态奖励 50% 上限硬性约束
*For any* 时刻，合约中已发放的动态奖励总额（totalDynamicRewardsPaid）不应超过总质押金额（totalStaked）的 50%
**Validates: Requirements 3.3, 16.3**

### Property 34: Treasury 多签安全性
*For any* Treasury 地址，应该是一个多签合约地址，而不是普通的 EOA（外部账户）地址
**Validates: Requirements 9.2, 11.4**

### Property 35: 时间锁延迟验证
*For any* 敏感参数修改操作（如修改 Treasury 地址），从提交到执行之间应该至少间隔 48 小时
**Validates: Requirements 9.2, 15.1**

## Error Handling

### 智能合约错误处理

1. **输入验证错误**
   - 质押金额为 0 或超过用户余额 → `revert("Invalid stake amount")`
   - 推荐人地址为零地址或自身地址 → 忽略推荐人，继续处理
   - 提现金额超过可用余额 → `revert("Insufficient balance")`

2. **权限错误**
   - 非管理员调用管理函数 → `revert("Ownable: caller is not the owner")`
   - 非授权地址调用后端专用函数 → `revert("Unauthorized")`

3. **状态错误**
   - 合约暂停时调用 stake/withdraw → `revert("Pausable: paused")`
   - 提现冷却时间未过 → `revert("Withdrawal cooldown active")`
   - 提现金额低于最低门槛 → `revert("Below minimum withdrawal amount")`

4. **转账错误**
   - USDT 转账失败 → 整个交易回滚，使用 `require(success, "Transfer failed")`
   - RWA Token 转账失败 → 整个交易回滚

5. **重入攻击防护**
   - 所有涉及资金转移的函数使用 `ReentrancyGuard` 修饰符
   - 遵循 Checks-Effects-Interactions 模式

### 后端服务错误处理

1. **区块链连接错误**
   - RPC 节点不可用 → 自动切换到备用节点
   - 事件监听中断 → 从上次处理的区块号恢复
   - 交易确认超时 → 记录日志并重试

2. **数据库错误**
   - 连接失败 → 使用连接池自动重连
   - 查询超时 → 记录慢查询日志，优化索引
   - 数据不一致 → 触发告警，人工介入
   - **并发冲突** → 使用数据库事务（Transaction）确保级差分润和余额更新的原子性

3. **计算错误**
   - 推荐链条循环引用 → 检测并拒绝（理论上不应发生）
   - 级差奖励计算溢出 → 使用 BigNumber 库防止精度丢失
   - 团队业绩更新失败 → 回滚事务，保证数据一致性
   - **精度问题** → 所有计算统一使用 18 位小数精度，避免四舍五入导致的财务差额

4. **外部依赖错误**
   - 价格预言机返回异常 → 使用缓存价格（5 分钟内有效）或拒绝提现
   - 价格预言机超时 → 记录错误并使用上次成功获取的价格
   - PancakeSwap 流动性不足 → 做市机器人跳过本次买入

### 错误日志和监控

- 所有错误应记录到日志系统（如 Winston + ELK Stack）
- 关键错误触发告警（如 Telegram Bot 通知）
- 定期审计日志，识别异常模式

## Testing Strategy

### 单元测试（Unit Testing）

使用 Hardhat + Chai 进行智能合约单元测试，使用 Jest 进行后端服务单元测试。

**智能合约单元测试覆盖：**

1. **RWAToken 合约**
   - 基本 BEP-20 功能（transfer, approve, transferFrom）
   - 交易税逻辑（买入免税，卖出 20% 税）
   - 税收分配（Treasury 10%, 销毁 5%, 流动性 5%）
   - 白名单功能（添加、移除、免税验证）
   - 管理员权限控制

2. **StakingContract 合约**
   - 质押功能（资金分配、推荐关系绑定）
   - 提现功能（余额验证、手续费扣除、冷却时间）
   - 管理员功能（设置 Treasury、白名单管理、暂停/恢复）
   - 紧急提取功能
   - 事件发射验证

3. **后端服务单元测试**
   - 级差奖励计算引擎（各种推荐树结构）
   - 静态收益计算
   - 节点等级升级逻辑
   - 团队业绩增量更新
   - 价格预言机接口

**示例单元测试：**

```typescript
describe("StakingContract", () => {
    it("should split funds 50/50 on stake", async () => {
        const stakeAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
        await staking.stake(stakeAmount, referrer.address);
        
        const treasuryBalance = await usdt.balanceOf(treasury.address);
        const contractBalance = await usdt.balanceOf(staking.address);
        
        expect(treasuryBalance).to.equal(stakeAmount.mul(50).div(100));
        expect(contractBalance).to.equal(stakeAmount.mul(50).div(100));
    });
    
    it("should reject withdrawal below minimum threshold", async () => {
        const smallAmount = ethers.utils.parseUnits("5", 18); // 5 RWA (< 10 USDT)
        await expect(staking.withdraw(smallAmount))
            .to.be.revertedWith("Below minimum withdrawal amount");
    });
});
```

### 属性测试（Property-Based Testing）

使用 **fast-check** 库进行 JavaScript/TypeScript 的属性测试。每个属性测试应运行至少 100 次迭代。

**属性测试库配置：**
- 库：fast-check (npm install --save-dev fast-check)
- 最小迭代次数：100
- 标记格式：`// Feature: rwa-tokenization-protocol, Property X: [property description]`

**关键属性测试：**

1. **Property 7: 级差奖励总额上限**
```typescript
// Feature: rwa-tokenization-protocol, Property 7: 级差奖励总额上限
it("differential rewards should never exceed 50% of stake amount", async () => {
    await fc.assert(
        fc.asyncProperty(
            fc.nat(1000000), // stake amount
            fc.array(fc.nat(4), { minLength: 0, maxLength: 10 }), // referral chain levels
            async (stakeAmount, levels) => {
                // Build referral chain
                const chain = await buildReferralChain(levels);
                
                // Calculate rewards
                const rewards = await calculateDifferentialRewards(stakeAmount, chain);
                const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0);
                
                // Verify total <= 50%
                expect(totalRewards).to.be.lte(stakeAmount * 0.5);
            }
        ),
        { numRuns: 100 }
    );
});
```

2. **Property 1: 50/50 资金分配正确性**
```typescript
// Feature: rwa-tokenization-protocol, Property 1: 50/50 资金分配正确性
it("should always split funds 50% treasury and 50% contract", async () => {
    await fc.assert(
        fc.asyncProperty(
            fc.integer({ min: 100, max: 1000000 }), // stake amount in USDT
            async (amount) => {
                const stakeAmount = ethers.utils.parseUnits(amount.toString(), 6);
                
                const treasuryBefore = await usdt.balanceOf(treasury.address);
                const contractBefore = await usdt.balanceOf(staking.address);
                
                await staking.stake(stakeAmount, ethers.constants.AddressZero);
                
                const treasuryAfter = await usdt.balanceOf(treasury.address);
                const contractAfter = await usdt.balanceOf(staking.address);
                
                const treasuryReceived = treasuryAfter.sub(treasuryBefore);
                const contractReceived = contractAfter.sub(contractBefore);
                
                expect(treasuryReceived).to.equal(stakeAmount.mul(50).div(100));
                expect(contractReceived).to.equal(stakeAmount.mul(50).div(100));
            }
        ),
        { numRuns: 100 }
    );
});
```

3. **Property 12: 交易税分配正确性**
```typescript
// Feature: rwa-tokenization-protocol, Property 12: 交易税分配正确性
it("should distribute 20% sell tax correctly (10% treasury, 5% burn, 5% liquidity)", async () => {
    await fc.assert(
        fc.asyncProperty(
            fc.integer({ min: 1000, max: 1000000 }), // sell amount
            async (amount) => {
                const sellAmount = ethers.utils.parseUnits(amount.toString(), 18);
                
                const treasuryBefore = await rwaToken.balanceOf(treasury.address);
                const totalSupplyBefore = await rwaToken.totalSupply();
                const liquidityBefore = await rwaToken.balanceOf(liquidityFund.address);
                
                // Simulate sell on DEX
                await rwaToken.transfer(pancakePair.address, sellAmount);
                
                const treasuryAfter = await rwaToken.balanceOf(treasury.address);
                const totalSupplyAfter = await rwaToken.totalSupply();
                const liquidityAfter = await rwaToken.balanceOf(liquidityFund.address);
                
                const treasuryReceived = treasuryAfter.sub(treasuryBefore);
                const burned = totalSupplyBefore.sub(totalSupplyAfter);
                const liquidityReceived = liquidityAfter.sub(liquidityBefore);
                
                expect(treasuryReceived).to.equal(sellAmount.mul(10).div(100));
                expect(burned).to.equal(sellAmount.mul(5).div(100));
                expect(liquidityReceived).to.equal(sellAmount.mul(5).div(100));
            }
        ),
        { numRuns: 100 }
    );
});
```

### 集成测试

- 端到端流程测试（质押 → 收益计算 → 提现）
- 合约与后端服务集成测试
- 价格预言机集成测试
- 做市机器人集成测试

### 测试环境

- 本地开发：Hardhat Network（本地区块链）
- 测试网：BSC Testnet
- 主网前验证：BSC Mainnet Fork（使用 Hardhat Forking）

## Deployment and Configuration

### 智能合约部署顺序

1. 部署 RWAToken 合约
2. 部署 StakingContract 合约
3. 在 RWAToken 中设置 PancakeSwap Pair 地址
4. 在 RWAToken 中设置 Treasury 和 Liquidity Fund 地址
5. 将 StakingContract 地址添加到 RWAToken 白名单
6. 将管理地址、做市地址添加到白名单
7. 在 PancakeSwap 创建 RWA/USDT 交易对并添加初始流动性

### 后端服务部署

**服务器要求：**
- 操作系统：Ubuntu 20.04 LTS
- 内存：至少 4GB RAM
- 存储：至少 50GB SSD
- 管理工具：宝塔面板（BT Panel）

**部署步骤：**

1. 安装 Node.js 16+ 和 MySQL 8.0
2. 配置 MySQL（仅允许本地访问，强密码）
3. 创建数据库和表结构
4. 部署后端服务代码
5. 配置环境变量（RPC URL、私钥、数据库连接）
6. 启动事件监听服务（使用 PM2 管理进程）
7. 启动每日收益计算定时任务（使用 cron）
8. 配置 Nginx 反向代理和 SSL 证书

**环境变量配置：**

```bash
# .env
BSC_RPC_URL=https://bsc-dataseed.binance.org/
STAKING_CONTRACT_ADDRESS=0x...
RWA_TOKEN_ADDRESS=0x...
TREASURY_ADDRESS=0x...
BACKEND_PRIVATE_KEY=0x...  # 用于调用合约的后端钱包私钥

DB_HOST=localhost
DB_PORT=3306
DB_NAME=rwa_protocol
DB_USER=rwa_user
DB_PASSWORD=strong_password

PRICE_ORACLE_CACHE_TTL=300  # 5 minutes
```

### 做市机器人部署

**Python 环境：**
- Python 3.9+
- web3.py 库
- 独立服务器或与后端服务共享

**配置文件：**

```python
# config.py
RPC_URL = "https://bsc-dataseed.binance.org/"
PRIVATE_KEY = "0x..."  # 做市钱包私钥
PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E"
RWA_TOKEN = "0x..."
USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"

MIN_BUY_AMOUNT = 10  # USDT
MAX_BUY_AMOUNT = 50  # USDT
MIN_INTERVAL = 1800  # 30 minutes
MAX_INTERVAL = 7200  # 2 hours
```

**启动命令：**

```bash
python3 market_maker.py &
# 或使用 systemd 服务管理
```

### 安全配置

1. **私钥管理**
   - Treasury 私钥物理隔离（冷钱包或硬件钱包）
   - 后端服务私钥加密存储
   - 做市机器人钱包仅保留必要资金

2. **网络安全**
   - 启用 SSL/TLS（Let's Encrypt）
   - 配置防火墙（仅开放必要端口）
   - 数据库仅允许本地访问

3. **合约安全**
   - 部署前进行安全审计
   - 使用 OpenZeppelin 标准库
   - 启用 ReentrancyGuard 和 Pausable

4. **监控和告警**
   - 部署日志监控系统
   - 配置关键事件告警（Telegram Bot）
   - 定期备份数据库

## Performance Considerations

### 智能合约优化

1. **Gas 优化**
   - 使用 `uint256` 而非 `uint8` 等小类型（避免额外的类型转换）
   - **使用 mapping 而非 array 存储白名单地址**，降低查询 Gas 费
   - 批量操作时使用循环优化
   - 合理使用 `memory` 和 `storage`

2. **存储优化**
   - 使用 mapping 而非 array 存储用户数据
   - 避免存储可计算的数据

3. **精度统一**
   - 所有代币金额使用 **18 位小数精度**（与 ERC20 标准一致）
   - USDT 虽然是 6 位精度，但在合约内部计算时转换为 18 位
   - 避免精度不一致导致的计算错误

### 后端服务优化

1. **数据库优化**
   - 在 `referrer`、`node_level`、`timestamp` 字段上建立索引
   - 使用团队业绩增量更新而非实时递归查询
   - **使用 referral_path 字段存储推荐链条**（格式：`,A,B,C,`），支持一键查询所有上级，无需递归
   - 定期归档历史数据
   - **使用 department_volumes 表**记录每个用户的各部门业绩，支持大区小区计算

2. **缓存策略**
   - 价格数据缓存 5 分钟（使用 Redis）
   - 用户查询结果缓存 1 分钟
   - 推荐链条缓存（referral_path 字段）

3. **并发处理**
   - 事件监听使用队列处理（如 Bull Queue）
   - 级差奖励计算使用异步任务
   - 数据库连接池配置（最大 20 连接）
   - **使用数据库事务**确保级差分润和余额更新的原子性，防止并发导致的双倍支付

4. **精度处理**
   - 所有涉及 USDT 和 RWA 的计算统一使用 **18 位小数精度**
   - 使用 `ethers.BigNumber` 或 `bignumber.js` 库进行计算
   - 避免使用 JavaScript 原生 Number 类型（会丢失精度）

### 扩展性设计

- 后端服务支持水平扩展（多实例 + 负载均衡）
- 数据库支持主从复制（读写分离）
- 事件监听支持断点续传（记录最后处理的区块号）

## Future Enhancements

1. **DAO 治理投票系统（V2）**
   - 当前 V1 实现"治理公示栏"（只读展示）
   - 未来实现链上投票合约
   - 仅控制 50% 社区池中的少量运营费
   - **严格权限隔离**：DAO 合约绝对不能干涉 50% Treasury 地址

2. **链上级差计算**
   - 当前级差计算在后端，未来可考虑链上实现
   - 需要优化 Gas 成本和递归深度限制

3. **多链支持**
   - 扩展到 Ethereum、Polygon 等其他链
   - 使用跨链桥实现资产互通

4. **NFT 节点徽章**
   - 为不同等级节点发放 NFT 徽章
   - 增加社区归属感和激励

5. **自动化流动性管理**
   - 将流动性基金的手动添加改为自动化
   - 使用智能合约自动调用 PancakeSwap Router

## Governance Transparency (V1 Implementation)

### 治理公示栏（DAO 1.0 公示期）

**设计理念：名义先行，功能后补**

V1 阶段不开发复杂的投票合约，而是实现一个透明的"治理公示栏"，展示所有协议参数和调整历史。

**功能范围：**
- 纯前端展示页面，无链上投票功能
- 展示当前协议参数（税率、收益率、节点升级条件等）
- 展示参数调整历史和时间锁状态
- 展示 Treasury 和社区池余额（链上数据）
- 展示多签钱包签名者列表
- 对外宣传为"DAO 1.0 公示期"，建立透明度和信任

**严格权限隔离：**
- 公示栏是纯展示页面，**没有任何合约调用权限**
- 不能提现或转移任何资金
- 不能修改任何合约参数
- 所有数据从链上只读查询

**V2 升级路径：**
- 在 V1 稳定运行后，开发链上投票合约
- 投票权重基于 RWA Token 持有量或质押量
- 投票范围：社区池运营费使用、协议参数微调（需时间锁）
- **永久限制**：DAO 合约永远不能控制 50% Treasury 地址

## Production Deployment Checklist

### 合约端关键注意事项

1. **SafeERC20 使用**
   - **必须使用 OpenZeppelin 的 SafeERC20** 处理 USDT 转账
   - BSC 上某些 USDT 变体不遵循标准 ERC20 返回值
   - 直接使用 `transfer` 可能导致交易失败但不回滚
   - 示例：
     ```solidity
     import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
     
     using SafeERC20 for IERC20;
     
     // 安全转账
     IERC20(usdtAddress).safeTransferFrom(msg.sender, treasury, amount);
     ```

2. **合约审计**
   - 部署前必须通过专业安全审计（如 CertiK、SlowMist）
   - 重点审计：重入攻击、整数溢出、权限控制、资金安全

3. **测试网验证**
   - 在 BSC Testnet 完整测试所有功能
   - 使用 Hardhat Fork 模拟主网环境测试

### 后端服务关键注意事项

1. **事件监听的区块确认延迟**
   - **建议增加 12 个区块确认延迟**，防止 BSC 短链分叉
   - BSC 的最终性（Finality）约为 15 个区块
   - 在 12 个区块确认后再处理事件，避免"假充值"攻击
   - 配置示例：
     ```typescript
     const CONFIRMATION_BLOCKS = 12;
     
     contract.on('StakeEvent', async (user, amount, referrer, event) => {
         const currentBlock = await provider.getBlockNumber();
         const eventBlock = event.blockNumber;
         
         if (currentBlock - eventBlock < CONFIRMATION_BLOCKS) {
             console.log(`Waiting for confirmations: ${currentBlock - eventBlock}/${CONFIRMATION_BLOCKS}`);
             return;  // 等待更多确认
         }
         
         // 确认数足够，处理事件
         await handleStakeEvent(event);
     });
     ```

2. **数据库备份策略**
   - 每日自动备份数据库
   - 保留至少 30 天的备份历史
   - 定期测试备份恢复流程

3. **监控和告警**
   - 部署 Prometheus + Grafana 监控系统
   - 关键指标：事件处理延迟、数据库连接数、RPC 节点响应时间
   - 告警渠道：Telegram Bot、邮件、短信

### 做市机器人关键注意事项

1. **钱包资金安全**
   - **做市钱包不要存放过量 USDT**
   - 建议每次充值仅够 1-2 天使用（如 1000-2000 USDT）
   - **设置每日买入上限（Daily Hard Cap）**，如 500 USDT/天
   - 防止私钥泄露导致的资产损失
   - 配置示例：
     ```python
     DAILY_BUY_LIMIT = 500  # USDT
     daily_spent = 0
     
     def execute_buy(amount):
         global daily_spent
         
         if daily_spent + amount > DAILY_BUY_LIMIT:
             logging.warning(f"Daily limit reached: {daily_spent}/{DAILY_BUY_LIMIT}")
             return False
         
         # 执行买入
         success = buy_on_pancakeswap(amount)
         if success:
             daily_spent += amount
         
         return success
     ```

2. **私钥管理**
   - 使用环境变量或加密配置文件存储私钥
   - 不要将私钥硬编码在代码中
   - 定期轮换做市钱包地址

3. **异常处理**
   - 买入失败时记录详细日志
   - 连续失败 3 次后暂停并发送告警
   - 钱包余额低于阈值时立即告警

### 安全检查清单

**🔴 硬性安全要求（必须严格执行）：**
- [ ] **合约 updateUserRewards 函数严格按"先锁后查后加"顺序实现**
- [ ] **合约增加 maxRewardPerCall 单次限额校验（默认 10000 USDT）**
- [ ] **数据库所有金额字段使用 DECIMAL(38, 0) 存储 18 位整数**
- [ ] **级差查询使用 referral_relations 表精确匹配，禁止 LIKE 模糊匹配**

**其他安全检查：**
- [ ] 合约通过专业安全审计
- [ ] 使用 SafeERC20 处理 USDT 转账
- [ ] 事件监听增加 12 区块确认延迟
- [ ] 数据库事务正确实现（级差分发）
- [ ] 事件幂等性检查（tx_hash 唯一约束）
- [ ] 合约层 stakeId 唯一性校验（processedStakes 映射）
- [ ] updateUserRewards 函数增加 stakeId 参数
- [ ] 动态奖励 50% 上限硬性校验（合约层）
- [ ] Treasury 部署为 Gnosis Safe 多签合约（3/2）
- [ ] 敏感参数修改挂载 48 小时时间锁
- [ ] API 接口所有金额字段使用 string 类型
- [ ] 精度统一为 18 位（先乘后除）
- [ ] 白名单使用 mapping 存储
- [ ] 价格预言机 5 分钟缓存
- [ ] 做市钱包设置每日买入上限
- [ ] Treasury 私钥物理隔离（冷钱包）
- [ ] 数据库仅允许本地访问
- [ ] SSL 证书配置正确
- [ ] 监控和告警系统部署
- [ ] 数据库备份策略实施

### 风险防御矩阵

| 风险点 | 防御策略 | 实现逻辑 | 状态 |
|--------|----------|----------|------|
| 重入攻击 | Checks-Effects-Interactions | 先校验、再更新状态、最后外部调用 | 📋 待实现 |
| 后端被黑 | 单次限额 + 实时余额校验 | maxRewardPerCall + contractBalance >= usdtAmount | 📋 待实现 |
| 后端私钥泄露 | 多签或 Merkle 验证 | 🔴 高危：引入 2/3 多签或 Merkle Root 验证机制 | 📋 待实现 |
| 精度丢失 | 18 位整数存储 | 数据库所有金额字段使用 DECIMAL(38, 0) | 📋 待实现 |
| 查询卡死 | 精确匹配 | 使用 referral_relations 表，禁止 LIKE 模糊匹配 | 📋 待实现 |
| 资金双发 | 幂等性校验 | 以 tx_hash 为唯一键，处理前检查数据库 | 📋 待实现 |
| 重复计奖 | stakeId 唯一性 | 合约 processedStakes 映射 + 后端传入 stakeId | 📋 待实现 |
| 奖励超限 | 50% 硬性校验 + 实时余额 | totalDynamicRewardsPaid + usdtAmount ≤ totalStaked × 50% + 余额校验 | 📋 待实现 |
| 账目不平 | 数据库事务 | 使用 BEGIN...COMMIT 包装奖励分发 | 📋 待实现 |
| API 精度丢失 | string 类型传输 | 所有金额字段使用 string，禁用 number | 📋 待实现 |
| 假充值攻击 | 区块确认延迟 | 等待 12 个区块确认后再处理事件 | 📋 待实现 |
| 私钥泄露 | 资金限额 | 做市钱包每日买入上限 500 USDT | 📋 待实现 |
| 单点故障 | 多签合约 | Treasury 和 TimeLock 都使用 Gnosis Safe 3/2 多签 | 📋 待实现 |
| 恶意修改 | 时间锁 + 多签 | 敏感参数修改挂载 48 小时 TimeLock + 2/3 多签授权 | 📋 待实现 |
| 短链分叉 | 最终性等待 | BSC 15 区块最终性，等待 12 区块 | 📋 待实现 |
| USDT 转账失败 | SafeERC20 | 使用 OpenZeppelin SafeERC20 库 | 📋 待实现 |
| 并发冲突 | 行级锁 | SELECT ... FOR UPDATE | 📋 待实现 |
| 单线通关 | 大区平衡 | 最大单部门业绩占比 ≤ 50% | 📋 待实现 |
| 价格预言机单点 | 固定 Token 门槛 | 推荐使用固定数量（10 RWA），去除价格依赖 | 📋 待实现 |
| 节点等级不一致 | 定时同步校验 + 事务回滚 | 以链上为准，后端每小时对比并自动同步 | 📋 待实现 |
| 紧急提取误解 | 明确文档说明 | 只能退回 50% 本金，前端和合约注释明确告知 | 📋 待实现 |

**状态说明：**
- 📋 待实现：设计文档已完成，等待开发实现
- 🧪 待验证：代码已实现，等待测试验证
- ✅ 已验证：代码已实现并通过测试验证

## Document Status

**Status:** ✅ READY FOR PRODUCTION

本设计文档已完成所有核心模块的详细设计，包括：
- 完整的架构设计和组件接口
- 27+ 个可验证的正确性属性
- 详细的错误处理和安全机制
- 性能优化和扩展性设计
- 关键实现细节和防御性编程指南
- 生产部署检查清单和风险防御矩阵

本文档可直接指导开发团队进行实施，所有潜在风险点都已识别并提供了防御策略。

## Critical Implementation Notes

### 🔴 硬性安全要求（CRITICAL SECURITY REQUIREMENTS）

以下四条是**死命令**，必须严格执行，否则后期隐患极大：

#### 1. 合约发奖必须"先锁后查后加"（防重入攻击）

**错误示例：**
```solidity
function updateUserRewards(address user, uint256 amount, uint256 stakeId) external {
    require(!processedStakes[stakeId], "Already processed");
    
    users[user].usdtRewards += amount;  // ❌ 先修改状态
    processedStakes[stakeId] = true;    // ❌ 后设置锁
}
```

**正确示例（必须严格按此顺序）：**
```solidity
function updateUserRewards(
    address user, 
    uint256 rwAmount, 
    uint256 usdtAmount,
    uint256 stakeId
) external onlyBackend nonReentrant {
    // ========== 第一阶段：所有校验（Checks） ==========
    
    // 1.1 防重入校验
    require(!processedStakes[stakeId], "Stake already processed");
    
    // 1.2 单次限额校验
    require(usdtAmount <= maxRewardPerCall, "Exceeds max reward per call");
    
    // 1.3 实时余额校验
    uint256 contractBalance = IERC20(usdtToken).balanceOf(address(this));
    require(contractBalance >= usdtAmount, "Insufficient contract balance");
    
    // 1.4 50% 上限校验（使用更新后的值进行预判）
    require(
        totalDynamicRewardsPaid + usdtAmount <= totalStaked * 50 / 100,
        "Dynamic rewards exceed 50% limit"
    );
    
    // ========== 第二阶段：状态更新（Effects） ==========
    
    // 2.1 立即设置锁定标记（防重入攻击）
    processedStakes[stakeId] = true;
    
    // 2.2 更新用户余额
    users[user].rwaPending += rwAmount;
    users[user].usdtRewards += usdtAmount;
    
    // 2.3 更新全局统计
    totalDynamicRewardsPaid += usdtAmount;
    
    // ========== 第三阶段：外部调用（Interactions） ==========
    
    // 3.1 触发事件
    emit RewardsUpdated(user, rwAmount, usdtAmount, stakeId);
    
    // 3.2 如果需要外部转账，放在最后
    // IERC20(usdtToken).safeTransfer(user, usdtAmount);
}
```

**关键原则：**
- **所有校验必须在状态更新之前完成**
- **状态更新的第一步必须是设置锁定标记（processedStakes[stakeId] = true）**
- 遵循 Checks-Effects-Interactions 模式
- 使用 OpenZeppelin 的 ReentrancyGuard 修饰符作为双重保险

#### 2. 后端调用合约必须设置"单次最高限额"（防止服务器被黑）

**问题：** 如果后端服务器被黑客入侵，攻击者可以调用 `updateUserRewards` 一次性掏空合约。

**解决方案：** 合约层增加单次奖励上限校验 + 实时余额校验

```solidity
uint256 public maxRewardPerCall = 10000 * 1e18;  // 默认单次最高 10000 USDT

function updateUserRewards(
    address user, 
    uint256 rwAmount, 
    uint256 usdtAmount,
    uint256 stakeId
) external onlyBackend nonReentrant {
    // ========== 第一阶段：所有校验（Checks） ==========
    
    // 1.1 防重入校验
    require(!processedStakes[stakeId], "Stake already processed");
    
    // 1.2 单次限额校验（防止后端被黑导致合约被掏空）
    require(usdtAmount <= maxRewardPerCall, "Exceeds max reward per call");
    
    // 1.3 实时余额校验（确保合约有足够资金支付）
    uint256 contractBalance = IERC20(usdtToken).balanceOf(address(this));
    require(contractBalance >= usdtAmount, "Insufficient contract balance");
    
    // 1.4 50% 上限校验（使用更新后的值进行预判）
    require(
        totalDynamicRewardsPaid + usdtAmount <= totalStaked * 50 / 100,
        "Dynamic rewards exceed 50% limit"
    );
    
    // ========== 第二阶段：状态更新（Effects） ==========
    
    // 2.1 立即设置锁定标记
    processedStakes[stakeId] = true;
    
    // 2.2 更新用户余额
    users[user].rwaPending += rwAmount;
    users[user].usdtRewards += usdtAmount;
    
    // 2.3 更新全局统计
    totalDynamicRewardsPaid += usdtAmount;
    
    // ========== 第三阶段：外部调用（Interactions） ==========
    
    emit RewardsUpdated(user, rwAmount, usdtAmount, stakeId);
}

// 管理员可调整单次限额
function setMaxRewardPerCall(uint256 newLimit) external onlyOwner {
    require(newLimit > 0 && newLimit <= 100000 * 1e18, "Invalid limit");
    maxRewardPerCall = newLimit;
    emit MaxRewardPerCallUpdated(newLimit);
}
```

**50% 校验逻辑说明：**
- **实时余额校验**：确保合约当前有足够的 USDT 支付本次奖励
- **50% 上限校验**：确保历史累计动态奖励不超过总质押的 50%
- **两个校验都必须通过**才能发放奖励
- **边界情况处理：**
  - 如果合约余额不足但未超 50%：拒绝发放，后端需要等待新的质押补充资金
  - 如果合约余额充足但已超 50%：拒绝发放，这是协议设计的硬性限制
  - 两个校验是"与"关系，必须同时满足

**建议配置：**
- 初始值：10000 USDT（单次最高奖励）
- 根据实际业务调整，但不应超过 100000 USDT
- 即使后端被黑，攻击者每次调用最多只能转走 10000 USDT
- **实时余额校验确保合约不会因提现导致资金不足**

**进一步加固建议（可选）：**
- **方案 1：引入 Merkle Root 验证**
  - 后端计算奖励后生成 Merkle Tree
  - 将 Merkle Root 提交到链上
  - 用户提现时提供 Merkle Proof，合约验证后发放
  - 完全去除对后端私钥的依赖
- **方案 2：多签授权机制**
  - updateUserRewards 需要 2/3 多签授权
  - 后端生成奖励数据，多个签名者验证后签名
  - 合约验证多签后才执行
- **方案 3：链上级差计算**
  - 将级差奖励计算逻辑完全迁移到链上
  - 需要优化 Gas 成本和递归深度限制
  - 彻底消除后端单点风险

---

### 【决策声明】V1 版本采用方案

根据成本-收益分析，**V1 版本采用"短期方案"：单次限额（maxRewardPerCall）+ 实时余额校验**

**理由：**
- ✅ 实现快速（1-2 周）
- ✅ 安全系数充分（即使后端被黑，每次最多转走 10000 USDT）
- ✅ Gas 成本低（无链上验证开销）
- ✅ 用户体验最佳（无需额外步骤）

**长期规划（V2 版本）：**
- 可评估引入 Merkle Root 验证，完全去除后端私钥依赖
- 需要专项研究和 Gas 优化

**后端被黑应急预案：**
1. 检测到异常交易 → 立即调用 pause() 暂停合约
2. 通过 TimeLock 队列修改 maxRewardPerCall 为 0
3. 48 小时后执行，此间所有 updateUserRewards 调用被阻止
4. 进行安全审计，修复后恢复 maxRewardPerCall

#### 3. 数据库必须存储 18 位整数（不能用小数）

**错误示例：**
```sql
-- ❌ 错误：使用小数存储，会导致精度丢失和账目对不上
total_staked DECIMAL(20, 6)   -- 6 位小数
usdt_rewards DECIMAL(20, 18)  -- 18 位小数
```

**正确示例：**
```sql
-- ✅ 正确：统一使用 18 位整数存储（DECIMAL(38, 0)）
total_staked DECIMAL(38, 0)   -- 存储 1000000000000000000 表示 1 USDT
usdt_rewards DECIMAL(38, 0)   -- 存储 800000000000000000 表示 0.8 USDT
```

**关键原则：**
- **所有金额字段统一使用 DECIMAL(38, 0) 存储 18 位整数**
- 1 USDT = 1000000000000000000（1e18）
- 0.8 USDT = 800000000000000000（0.8e18）
- 前端显示时除以 1e18 转换为可读格式
- 后端计算时使用 `ethers.BigNumber` 或 `bignumber.js`

**为什么必须这样做：**
- MySQL 的 DECIMAL 小数运算存在精度问题
- 累计计算会导致误差累积，最终账目对不上
- 使用整数存储可以完全避免精度丢失

#### 4. 级差查询必须用精确匹配（不能用模糊匹配）

**错误示例：**
```sql
-- ❌ 错误：使用 LIKE 模糊匹配，用户多了会卡死
SELECT * FROM users WHERE referral_path LIKE '%,0xABC,%';
```

**正确示例：**
```sql
-- ✅ 正确：使用关联表 + 精确匹配
CREATE TABLE referral_relations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    ancestor_address VARCHAR(42) NOT NULL,  -- 上级地址（任意层级）
    depth INT NOT NULL,  -- 层级深度（1=直推，2=二级，以此类推）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_ancestor (user_address, ancestor_address),
    INDEX idx_ancestor (ancestor_address),
    INDEX idx_user (user_address)
);

-- 查询某用户的所有上级（精确匹配，性能高）
SELECT ancestor_address, depth FROM referral_relations 
WHERE user_address = '0xABC' 
ORDER BY depth ASC;

-- 查询某用户的所有下级（精确匹配，性能高）
SELECT user_address, depth FROM referral_relations 
WHERE ancestor_address = '0xABC' 
ORDER BY depth ASC;
```

**实现逻辑：**
```typescript
// 用户首次质押时，构建推荐关系链
async function buildReferralRelations(userAddress: string, referrerAddress: string) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
        // 1. 添加直推关系（depth = 1）
        await connection.query(
            'INSERT INTO referral_relations (user_address, ancestor_address, depth) VALUES (?, ?, 1)',
            [userAddress, referrerAddress]
        );
        
        // 2. 查询推荐人的所有上级
        const ancestors = await connection.query(
            'SELECT ancestor_address, depth FROM referral_relations WHERE user_address = ?',
            [referrerAddress]
        );
        
        // 3. 为新用户添加所有间接上级关系
        for (const ancestor of ancestors) {
            await connection.query(
                'INSERT INTO referral_relations (user_address, ancestor_address, depth) VALUES (?, ?, ?)',
                [userAddress, ancestor.ancestor_address, ancestor.depth + 1]
            );
        }
        
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
```

**为什么必须这样做：**
- LIKE 模糊匹配在用户量大时（10 万+）会导致全表扫描，系统卡死
- 使用关联表 + 精确匹配，查询性能提升 100 倍以上
- 支持快速查询任意层级的上下级关系

---

### 1. 推荐关系的唯一性和不可变性

- 推荐人地址一旦在首次质押时设置，**永久锁定，不可修改**
- 合约层面拒绝任何修改推荐关系的尝试
- 仅管理员可在紧急情况下通过特殊函数修改（需记录日志）
- 防止用户因想更换上线而产生投诉或系统混乱

### 2. 收益计算与本金状态的实时关联

- 用户的静态收益计算与 `isActive` 状态严格绑定
- 当用户发起撤资（Unstake）或紧急提取时，立即将 `isActive` 设为 false
- 每日收益计算任务跳过所有 `isActive = false` 的用户
- 防止"空转"收益导致的资金漏洞

### 3. 提现门槛验证（基于价格预言机）

- V1 版本使用后端价格预言机验证"10 USDT 等值"门槛
- 后端服务每 5 分钟从 PancakeSwap 获取 RWA/USDT 实时价格
- 价格缓存到 Redis，TTL = 5 分钟
- 提现时调用价格预言机 API 获取当前价格
- 计算提现金额的 USDT 等值：`usdtValue = amount × rwaPrice / 1e18`
- 验证：`require(usdtValue >= 10 * 1e18, "Minimum withdrawal is 10 USDT equivalent")`
- 多级降级策略：缓存有效 → 使用缓存 → 获取新价格 → 使用旧价格（< 10 分钟）→ 拒绝提现
- 价格异常波动（> 20%）触发告警和人工审核

### 4. 大区小区平衡机制（防止单线通关）

- 从 V2 开始，升级条件增加"最大单部门业绩占比不超过 50%"限制
- 使用 `department_volumes` 表记录每个用户的各直推部门业绩
- 升级检查时，计算 `max(department_volume) / team_volume`，必须 ≤ 0.5
- 强制用户进行多线裂变，增强网络稳定性

### 5. 并发安全和事务一致性

- 级差奖励分发使用数据库事务（BEGIN TRANSACTION ... COMMIT）
- 确保资金发放和余额更新的原子性
- 防止网络波动或并发请求导致的双倍支付
- 使用行级锁（SELECT ... FOR UPDATE）防止并发冲突

### 6. 精度统一（18 位小数）

- 所有涉及 USDT 和 RWA 的计算统一使用 **18 位小数精度**
- USDT 原生是 6 位精度，在合约内部转换为 18 位后计算
- 使用 `ethers.BigNumber` 或 `bignumber.js` 库，避免 JavaScript Number 精度丢失
- 防止四舍五入导致的财务差额累积

### 7. 推荐链条的高效查询（referral_relations 表）

- 在 `referral_relations` 表中记录用户与所有上级的关系
- 用户首次质押时，构建完整的推荐关系链
- 向上追溯时，直接使用精确匹配查询：
  ```sql
  SELECT ancestor_address, depth FROM referral_relations 
  WHERE user_address = '0xABC' 
  ORDER BY depth ASC;
  ```
- **禁止使用 LIKE 模糊匹配**，避免全表扫描导致性能问题
- 大幅提升级差奖励计算和团队业绩更新的性能

### 8. Gas 优化（白名单使用 mapping）

- 白名单地址使用 `mapping(address => bool)` 存储，而非 `address[]` 数组
- 查询白名单状态的 Gas 成本从 O(n) 降低到 O(1)
- 减少用户交易时的 Gas 费用

### 9. 紧急熔断和管理员权限

- 合约实现 Pausable 模式，管理员可暂停所有质押和提现操作
- **紧急提取模式说明：**
  - 用户质押时 50% 已转入 Treasury，合约内只保留 50%
  - 紧急提取金额 = 用户质押总额 × 50% - 已获得的 USDT 动态奖励
  - **用户无法取回全部本金，只能取回合约内保留的 50% 部分**
  - 前端和合约注释必须明确告知用户这一限制
- 所有管理员操作记录事件日志，便于审计
- 管理员权限使用 OpenZeppelin Ownable 标准实现

---

#### 🔴 前端展示要求（CRITICAL FOR UX）

为了避免用户投诉和误解，前端在紧急提取流程中**必须**遵循以下要求：

**第一步：入口处警告**
- [ ] 紧急提取按钮上显示 🔴 **红色气泡提示**
- [ ] 提示文案：**"⚠️ 注意：最多可退回 50% 本金"**
- [ ] 使用醒目颜色和图标，吸引用户注意

**第二步：点击后的确认对话框**
```
标题：紧急提取确认

⚠️ 重要警告

您的本金分配如下：
- Treasury（已转出，无法退回）: 50%
- 合约内（可退回）: 50%

本次紧急提取将退回合约内的 50% 本金。
另外 50% 已用于锚定实物资产，永久无法退回。

已获得的 USDT 奖励将被扣除。

现有本金: X USDT
可退回金额: X/2 USDT - 已获奖励
不可退回金额: X/2 USDT

□ 我已理解退回限制，确认继续
[ 取消 ]  [ 确认 ]
```

**第三步：交易确认后的结果显示**
- [ ] 明确显示"已退回金额"和"无法退回金额"的对比
- [ ] 示例：
  ```
  提取成功 ✓

  已退回到钱包: 5,000 RWA Token (相当于 5,000 USDT)
  已扣除奖励: 200 USDT
  未能取回: 5,000 USDT (已转入 Treasury，用于资产锚定)
  总本金损失: 5,200 USDT（包含不可退回的 5,000 + 扣除的奖励 200）
  
  Treasury 地址: 0x...xxx
  Transaction Hash: 0x...xxx
  ```

**第四步：常见问题（FAQ）**
- [ ] 在紧急提取页面下方添加 FAQ 部分
- [ ] Q: 为什么只能取回 50%？
  - A: 用户质押时，50% 即时转入 Treasury 用于锚定实物资产，这是协议的核心设计。只有合约内保留的 50% 可在紧急情况下退回。
- [ ] Q: 另外 50% 去哪了？
  - A: 已转入 Treasury 多签钱包，用于收购和维护现实资产，不可退回。
- [ ] Q: 我的奖励呢？
  - A: 在紧急提取时，已获得的 USDT 动态奖励将从退回金额中扣除。

---

#### 合约实现

```solidity
/// @notice 紧急提取用户本金（50% 部分）
/// @dev 用户只能取回合约内保留的 50% 本金，另外 50% 已转入 Treasury
function emergencyWithdraw() external nonReentrant whenEmergency {
    require(users[msg.sender].totalStaked > 0, "No stake found");
    
    // 计算可退回金额 = 本金 × 50% - 已获得的 USDT 奖励
    uint256 refundAmount = users[msg.sender].totalStaked * 50 / 100;
    uint256 alreadyWithdrawn = users[msg.sender].usdtRewards;
    
    uint256 finalRefund = refundAmount > alreadyWithdrawn 
        ? refundAmount - alreadyWithdrawn 
        : 0;
    
    require(finalRefund > 0, "No amount to refund");
    
    // 转账并标记用户为非活跃（停止生息）
    IERC20(rwaToken).safeTransfer(msg.sender, finalRefund);
    users[msg.sender].isActive = false;
    users[msg.sender].totalStaked = 0;  // 清空本金记录
    
    emit EmergencyWithdrawal(msg.sender, finalRefund, alreadyWithdrawn);
}
```

---

#### 用户手册补充说明

在"常见问题"和"使用指南"中添加：

**【紧急提取详解】**

协议采用 50/50 分配模型：
- **50% 即时转入 Treasury**：用于锚定底层实物资产，确保协议有真实价值支撑
- **50% 保留在合约**：用于支付日常收益和紧急情况退款

**紧急提取时：**
1. 用户只能取回合约内保留的 50% 本金
2. 需扣除已获得的 USDT 动态奖励
3. 另外 50%（在 Treasury 中）无法退回，因为已用于收购资产

**建议：** 
- 正常情况下，用户应该继续质押以获得日常收益
- 仅在协议出现严重问题时，才需要使用紧急提取

**示例场景：**
```
用户 Alice 质押 10,000 USDT

立即：
- Treasury 收到 5,000 USDT（用于资产锚定）
- 合约保留 5,000 USDT（用于运营和收益）

3 个月后，Alice 获得收益 200 USDT

如果 Alice 选择紧急提取：
- 可取回：5,000 USDT - 200 USDT = 4,800 USDT
- 不可取回：5,000 USDT（在 Treasury，已用于资产收购）
- 总本金损失：5,200 USDT（包含不可退回的 5,000 + 扣除的奖励 200）
```

### 10. 做市机器人的随机化和监控

- 买入时间间隔随机化（30 分钟到 2 小时）
- 买入金额随机化（10-50 USDT）
- 钱包余额监控，低于阈值时发送告警
- 所有交易记录日志，包含交易哈希和执行时间

### 11. 节点等级链上与数据库同步机制

- **数据权威来源：以链上 UserInfo.nodeLevel 为准**
- **后端升级流程（使用数据库事务）：**
  ```typescript
  async function upgradeNodeLevel(userAddress: string, newLevel: number) {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
          // 1. 先更新数据库
          await connection.query(
              'UPDATE users SET node_level = ? WHERE address = ?',
              [newLevel, userAddress]
          );
          
          // 2. 立即调用合约同步链上
          const tx = await stakingContract.updateNodeLevel(userAddress, newLevel);
          await tx.wait();
          
          // 3. 两者都成功，提交事务
          await connection.commit();
      } catch (error) {
          // 4. 任何一步失败，回滚数据库
          await connection.rollback();
          throw error;
      } finally {
          connection.release();
      }
  }
  ```

- **双向失败处理：**
  - **情况 A：数据库更新成功，链上调用失败**
    - 数据库事务回滚，两者保持一致
  - **情况 B：数据库更新失败，链上未调用**
    - 数据库事务回滚，两者保持一致
  - **情况 C：链上调用成功，数据库提交失败**
    - 数据库事务回滚，但链上已写入（无法回滚）
    - 定时同步任务会检测到不一致
    - **同步方向：以链上为准，覆盖数据库**
    - 这是正确的，因为链上是权威来源

- **同步校验任务：**
  ```typescript
  // 每小时执行一次
  async function syncNodeLevels() {
      const users = await db.query('SELECT address, node_level FROM users');
      
      for (const user of users) {
          // 从链上查询最新等级
          const onChainLevel = await stakingContract.getUserStakeInfo(user.address).nodeLevel;
          
          // 对比数据库等级
          if (onChainLevel !== user.node_level) {
              console.warn(`Level mismatch for ${user.address}: DB=${user.node_level}, Chain=${onChainLevel}`);
              
              // 以链上为准，更新数据库
              await db.query(
                  'UPDATE users SET node_level = ? WHERE address = ?',
                  [onChainLevel, user.address]
              );
              
              // 触发告警
              await sendAlert(`Node level synced for ${user.address}: ${user.node_level} -> ${onChainLevel}`);
          }
      }
  }
  ```

- **级差奖励计算：统一读取链上等级**
  - 后端计算级差奖励时，从合约查询 getUserStakeInfo 获取最新等级
  - 避免数据库与链上不一致导致的奖励计算错误

### 11. 精度转换的溢出预防（USDT 6 位 → 内部 18 位）

- USDT 原生精度为 6 位（1 USDT = 1e6），RWA Token 为 18 位（1 RWA = 1e18）
- **合约内部统一使用 18 位精度**进行所有计算
- 接收 USDT 时：`internalAmount = usdtAmount * 1e12`（6 位转 18 位）
- 发送 USDT 时：`usdtAmount = internalAmount / 1e12`（18 位转 6 位）
- **关键：先乘后除**，避免整数除法导致的精度丢失
- 示例：
  ```solidity
  // 正确：先转换精度再计算
  uint256 internalAmount = usdtAmount * 1e12;
  uint256 treasury = internalAmount * 50 / 100;  // 50% 给 Treasury
  
  // 错误：先计算再转换（会丢失精度）
  uint256 treasury = (usdtAmount * 50 / 100) * 1e12;
  ```

### 12. 数据库事务的行锁范围和回滚策略

- 级差奖励分发必须在**单个数据库事务**内完成
- 事务范围：从计算第一个上级奖励到更新最后一个上级余额
- 使用行级锁防止并发修改：`SELECT ... FOR UPDATE`
- 如果事务中任何一步失败（如第 5 个上级更新失败），**整个事务回滚**
- 回滚后，前 4 个上级的余额更新也会被撤销，保证数据一致性
- 示例流程：
  ```typescript
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
      // 计算所有上级奖励
      const rewards = calculateDifferentialRewards(stakeAmount, userAddress);
      
      // 逐个更新上级余额（带行锁）
      for (const reward of rewards) {
          await connection.query(
              'UPDATE users SET usdt_rewards = usdt_rewards + ? WHERE address = ? FOR UPDATE',
              [reward.amount, reward.beneficiary]
          );
      }
      
      // 记录奖励明细
      await connection.query('INSERT INTO rewards ...');
      
      // 提交事务
      await connection.commit();
  } catch (error) {
      // 任何错误都回滚整个事务
      await connection.rollback();
      throw error;
  } finally {
      connection.release();
  }
  ```

### 13. 事件监听的幂等性保证

- 由于网络波动或节点切换，同一个交易事件可能被监听到多次
- **必须实现幂等性检查**，防止重复处理导致的双倍奖励
- 使用 `tx_hash` 作为唯一标识，处理前先检查是否已存在
- 在 `stakes` 表中，`tx_hash` 字段设置为 UNIQUE 约束
- **合约层增加 `stakeId` 唯一性校验**：`processedStakes` 映射记录已处理的质押 ID
- 处理流程：
  ```typescript
  async function handleStakeEvent(event) {
      const txHash = event.transactionHash;
      const stakeId = event.args.stakeId;  // 从事件中获取质押 ID
      
      // 幂等性检查：查询是否已处理
      const existing = await db.query(
          'SELECT id FROM stakes WHERE tx_hash = ?',
          [txHash]
      );
      
      if (existing.length > 0) {
          console.log(`Event ${txHash} already processed, skipping`);
          return;  // 已处理，直接返回
      }
      
      // 调用合约前检查 stakeId 是否已处理
      const isProcessed = await stakingContract.processedStakes(stakeId);
      if (isProcessed) {
          console.log(`StakeId ${stakeId} already processed on-chain, skipping`);
          return;
      }
      
      // 未处理，继续处理逻辑
      await processStake(event);
  }
  ```
- 或使用数据库的 `INSERT IGNORE` 或 `ON DUPLICATE KEY UPDATE` 机制
- 定期审计 `stakes` 表，确保每个 `tx_hash` 只有一条记录

### 14. 奖励发放的双重锁死机制

- **stakeId 唯一性校验**：后端调用 `updateUserRewards` 时必须传入 `stakeId`
- 合约在 `updateUserRewards` 函数中检查 `processedStakes[stakeId]`
- 如果已处理，直接 revert，防止重复计奖
- 处理完成后，设置 `processedStakes[stakeId] = true`
- 示例代码：
  ```solidity
  function updateUserRewards(
      address user,
      uint256 rwAmount,
      uint256 usdtAmount,
      uint256 stakeId
  ) external onlyBackend {
      require(!processedStakes[stakeId], "Stake already processed");
      
      // 更新用户余额
      users[user].rwaPending += rwAmount;
      users[user].usdtRewards += usdtAmount;
      
      // 更新全局统计
      totalDynamicRewardsPaid += usdtAmount;
      
      // 硬性校验：已发动态奖金总额不超过总入金 * 50%
      require(
          totalDynamicRewardsPaid <= totalStaked * 50 / 100,
          "Dynamic rewards exceed 50% limit"
      );
      
      // 标记为已处理
      processedStakes[stakeId] = true;
      
      emit RewardsUpdated(user, rwAmount, usdtAmount, stakeId);
  }
  ```

### 15. 动态奖励 50% 上限的硬性校验

- 合约维护两个全局变量：`totalStaked` 和 `totalDynamicRewardsPaid`
- 每次质押时，`totalStaked` 增加
- 每次发放动态奖励时，`totalDynamicRewardsPaid` 增加
- 在 `updateUserRewards` 函数中，**硬性校验**：
  ```solidity
  require(
      totalDynamicRewardsPaid <= totalStaked * 50 / 100,
      "Dynamic rewards exceed 50% limit"
  );
  ```
- 如果超过 50%，交易回滚，防止过度发放
- 后端在调用合约前也应预先验证，避免无效交易

### 16. Treasury 多签合约和时间锁

- **Treasury 地址必须部署为 Gnosis Safe 多签合约**
- **TimeLock 合约的 Owner 也必须是 Gnosis Safe 多签地址**
- 建议配置：3 个签名者，至少 2 个签名才能执行交易（3/2 多签）
- 所有敏感参数修改（如 Treasury 地址、手续费率）必须挂载 **48 小时时间锁（TimeLock）**
- **安全逻辑：**
  - TimeLock Owner = Gnosis Safe 多签（防止单点私钥泄露）
  - 提交交易需要 2/3 多签授权
  - 执行交易需要等待 48 小时 + 2/3 多签授权
  - 双重保护：时间延迟 + 多签验证
- 时间锁实现：
  ```solidity
  contract TimeLockController {
      struct QueuedTransaction {
          address target;
          bytes data;
          uint256 executeTime;
      }
      
      mapping(bytes32 => QueuedTransaction) public queuedTransactions;
      uint256 public constant DELAY = 48 hours;
      address public owner;  // 必须是 Gnosis Safe 多签地址
      
      modifier onlyOwner() {
          require(msg.sender == owner, "Not owner");
          _;
      }
      
      constructor(address _owner) {
          require(_owner != address(0), "Invalid owner");
          owner = _owner;
      }
      
      function queueTransaction(
          address target,
          bytes memory data
      ) external onlyOwner returns (bytes32) {
          uint256 executeTime = block.timestamp + DELAY;
          bytes32 txHash = keccak256(abi.encode(target, data, executeTime));
          
          queuedTransactions[txHash] = QueuedTransaction({
              target: target,
              data: data,
              executeTime: executeTime
          });
          
          emit TransactionQueued(txHash, target, data, executeTime);
          return txHash;
      }
      
      function executeTransaction(bytes32 txHash) external onlyOwner {
          QueuedTransaction memory txn = queuedTransactions[txHash];
          require(txn.executeTime != 0, "Transaction not queued");
          require(block.timestamp >= txn.executeTime, "Time lock not expired");
          
          (bool success, ) = txn.target.call(txn.data);
          require(success, "Transaction execution failed");
          
          delete queuedTransactions[txHash];
          emit TransactionExecuted(txHash, txn.target, txn.data);
      }
  }
  ```
- 防止单点私钥被盗导致的系统崩溃

### 17. API 接口精度约束

- **所有涉及 USDT 和 RWA 的 API 接口，严禁使用 number 类型**
- 必须统一改为 **string 类型**传输，避免 JavaScript 浮点数精度丢失
- 示例：
  ```typescript
  // 错误：使用 number 类型
  interface UserInfo {
      totalStaked: number;
      rwaPending: number;
  }
  
  // 正确：使用 string 类型
  interface UserInfo {
      totalStaked: string;  // "1000000000000000000" (18 decimals)
      rwaPending: string;   // "800000000000000000" (18 decimals)
  }
  ```
- 前端接收后使用 `ethers.utils.formatUnits` 转换为可读格式
- 后端内部使用 `ethers.BigNumber` 进行所有计算

