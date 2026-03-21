# RWA 彩票智能合约 - 完整技术文档

## 📋 目录

1. [合约概述](#合约概述)
2. [核心功能](#核心功能)
3. [彩票规则](#彩票规则)
4. [技术架构](#技术架构)
5. [合约接口](#合约接口)
6. [部署指南](#部署指南)
7. [使用示例](#使用示例)
8. [安全机制](#安全机制)

---

## 合约概述

### 基本信息

- **合约名称**: `LotteryContract`
- **Solidity 版本**: ^0.8.19
- **许可证**: MIT
- **主要依赖**:
  - OpenZeppelin Contracts (Ownable, ReentrancyGuard, IERC20)
  - Chainlink VRF v2 (VRFConsumerBaseV2)

### 功能特性

✅ 支持周奖池和月奖池双系统  
✅ 使用 Chainlink VRF 确保公平性  
✅ 6 位数字彩票号码系统 (100000-999999)  
✅ 4 个奖项等级（一等奖 50%、二等奖 25%、三等奖 15%、四等奖 10%）  
✅ 从右往左匹配位数规则  
✅ 批量购买和批量领奖功能  
✅ 完整的防重入保护  
✅ 透明的开奖历史记录

---

## 核心功能

### 1. 购买彩票

用户可以使用 RWA 代币购买彩票：

- **周奖池**: 10 RWA/张
- **月奖池**: 50 RWA/张
- **单次购买限制**: 1-100 张
- **票号生成**: 自动生成 6 位唯一号码

### 2. 开奖机制


使用 Chainlink VRF 生成真随机数：

- **周奖池**: 每 7 天开奖一次
- **月奖池**: 每 30 天开奖一次
- **随机性来源**: Chainlink VRF v2
- **确认区块数**: 3 个区块
- **Gas 限制**: 200,000

### 3. 奖金分配

根据匹配位数自动分配奖金：

| 奖项等级 | 匹配位数 | 奖金比例 | 示例 |
|---------|---------|---------|------|
| 一等奖 | 6 位全中 | 50% | 中奖号 123456，持票 123456 |
| 二等奖 | 右 5 位 | 25% | 中奖号 123456，持票 X23456 |
| 三等奖 | 右 4 位 | 15% | 中奖号 123456，持票 XX3456 |
| 四等奖 | 右 3 位 | 10% | 中奖号 123456，持票 XXX456 |

### 4. 领取奖金

- 支持单张彩票领奖
- 支持批量领奖（节省 Gas）
- 防止重复领取
- 自动转账 RWA 代币

---

## 彩票规则

### 票号生成规则

1. **范围**: 100000 - 999999（6 位数字）
2. **生成方式**: 链上伪随机 + nonce
3. **唯一性**: 每张彩票号码独立生成
4. **不可预测**: 使用 block.timestamp + block.prevrandao + msg.sender + nonce

### 中奖判定规则

**从右往左匹配位数**：

```
中奖号码: 123456
持票号码: 654321 → 未中奖（右1位不匹配）
持票号码: 123456 → 一等奖（6位全中）
持票号码: 023456 → 二等奖（右5位匹配）
持票号码: 003456 → 三等奖（右4位匹配）
持票号码: 000456 → 四等奖（右3位匹配）
```


### 奖金计算公式

```
单注奖金 = (奖池总额 × 奖项比例) ÷ 该等级中奖人数

示例：
奖池总额 = 10,000 RWA
一等奖中奖人数 = 2 人
一等奖单注奖金 = (10,000 × 50%) ÷ 2 = 2,500 RWA
```

---

## 技术架构

### 数据结构

#### Ticket（彩票）

```solidity
struct Ticket {
    address owner;           // 持有者地址
    uint256 number;          // 6位票号 (100000-999999)
    PoolType poolType;       // 奖池类型 (0=周, 1=月)
    uint256 round;           // 期数
    uint256 purchaseTime;    // 购买时间
    bool isWinner;           // 是否中奖
    uint8 prizeLevel;        // 奖项等级 (1-4, 0=未中奖)
    uint256 prizeAmount;     // 奖金金额
    bool claimed;            // 是否已领取
}
```

#### Draw（开奖记录）

```solidity
struct Draw {
    uint256 winningNumber;   // 中奖号码
    uint256 drawTime;        // 开奖时间
    uint256 vrfRequestId;    // VRF 请求 ID
    uint256 totalPrize;      // 总奖池金额
    uint256[4] winnersCount; // 各等级中奖数量
    uint256[4] prizePerWinner; // 各等级单注奖金
    bool completed;          // 是否已完成
}
```

#### VRFRequest（VRF 请求）

```solidity
struct VRFRequest {
    PoolType poolType;       // 奖池类型
    uint256 round;           // 期数
    uint256 timestamp;       // 请求时间
    bool fulfilled;          // 是否已完成
}
```

### 状态变量

```solidity
// 代币和 VRF
IERC20 public immutable rwaToken;
VRFCoordinatorV2Interface public immutable vrfCoordinator;
bytes32 public immutable keyHash;
uint64 public subscriptionId;

// 彩票配置
uint256 public constant WEEKLY_TICKET_PRICE = 10 * 10**18;
uint256 public constant MONTHLY_TICKET_PRICE = 50 * 10**18;
uint8[4] public prizePercentages = [50, 25, 15, 10];

// 当前状态
uint256 public weeklyRound = 1;
uint256 public monthlyRound = 1;
uint256 public nextWeeklyDraw;
uint256 public nextMonthlyDraw;
uint256 public weeklyPrizePool;
uint256 public monthlyPrizePool;
```


---

## 合约接口

### 用户函数

#### buyTickets

购买彩票

```solidity
function buyTickets(uint256 quantity, PoolType poolType) 
    external 
    nonReentrant 
    returns (uint256[] memory ticketIds)
```

**参数**:
- `quantity`: 购买数量 (1-100)
- `poolType`: 奖池类型 (0=周奖池, 1=月奖池)

**返回**: 彩票 ID 数组

**事件**: `TicketsPurchased`

**示例**:
```javascript
// 购买 10 张周奖池彩票
const tx = await lotteryContract.buyTickets(10, 0);
const receipt = await tx.wait();
```

#### claimPrize

领取单张彩票奖金

```solidity
function claimPrize(uint256 ticketId) external nonReentrant
```

**参数**:
- `ticketId`: 彩票 ID

**事件**: `PrizeClaimed`

#### claimMultiplePrizes

批量领取奖金

```solidity
function claimMultiplePrizes(uint256[] calldata ticketIds) external nonReentrant
```

**参数**:
- `ticketIds`: 彩票 ID 数组

**事件**: 多个 `PrizeClaimed`

### 查询函数

#### getUserTickets

获取用户的所有彩票

```solidity
function getUserTickets(address user) external view returns (uint256[] memory)
```

#### getCurrentPoolInfo

获取当前奖池信息

```solidity
function getCurrentPoolInfo(PoolType poolType) 
    external 
    view 
    returns (
        uint256 currentRound,
        uint256 prizePool,
        uint256 nextDrawTime,
        uint256 ticketsSold,
        uint256 ticketPrice
    )
```


#### getRoundTickets

获取某期的所有彩票

```solidity
function getRoundTickets(PoolType poolType, uint256 round) 
    external 
    view 
    returns (uint256[] memory)
```

### 管理员函数

#### requestDraw

请求开奖（仅管理员）

```solidity
function requestDraw(PoolType poolType) external onlyOwner returns (uint256 requestId)
```

**要求**:
- 必须到达开奖时间
- 必须有彩票售出

**流程**:
1. 验证开奖条件
2. 请求 Chainlink VRF 随机数
3. 等待 VRF 回调
4. 自动执行开奖

#### updateSubscriptionId

更新 VRF 订阅 ID

```solidity
function updateSubscriptionId(uint64 _subscriptionId) external onlyOwner
```

#### emergencyWithdraw

紧急提取（仅在合约升级时使用）

```solidity
function emergencyWithdraw() external onlyOwner
```

---

## 部署指南

### 前置要求

1. **RWA 代币合约地址**
2. **Chainlink VRF 配置**:
   - VRF Coordinator 地址
   - Key Hash
   - Subscription ID

### BSC Testnet 配置

```javascript
// Chainlink VRF BSC Testnet
const VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
const KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
```

### 部署脚本

创建 `scripts/deploy-lottery.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", (await deployer.getBalance()).toString());
  
  // 配置参数
  const RWA_TOKEN = "0x..."; // RWA 代币地址
  const VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
  const KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
  const SUBSCRIPTION_ID = 123; // 你的订阅 ID
  
  // 部署合约
  const LotteryContract = await ethers.getContractFactory("LotteryContract");
  const lottery = await LotteryContract.deploy(
    RWA_TOKEN,
    VRF_COORDINATOR,
    KEY_HASH,
    SUBSCRIPTION_ID
  );
  
  await lottery.deployed();
  
  console.log("彩票合约地址:", lottery.address);
  
  // 验证部署
  const weeklyPrice = await lottery.WEEKLY_TICKET_PRICE();
  console.log("周奖池票价:", ethers.utils.formatEther(weeklyPrice), "RWA");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```


### Chainlink VRF 订阅设置

1. **访问 Chainlink VRF 控制台**:
   - BSC Testnet: https://vrf.chain.link/bsc-testnet

2. **创建订阅**:
   - 点击 "Create Subscription"
   - 获取 Subscription ID

3. **充值 LINK**:
   - 向订阅充值 LINK 代币
   - 建议至少 5 LINK

4. **添加消费者**:
   - 将部署的合约地址添加为消费者

### 部署命令

```bash
# 编译合约
npx hardhat compile

# 部署到 BSC Testnet
npx hardhat run scripts/deploy-lottery.ts --network bscTestnet

# 验证合约
npx hardhat verify --network bscTestnet <合约地址> <构造参数>
```

---

## 使用示例

### 前端集成

#### 1. 创建合约实例

```typescript
// lib/contracts/lotteryABI.ts
export const LOTTERY_ABI = [
  "function buyTickets(uint256 quantity, uint8 poolType) external returns (uint256[])",
  "function claimPrize(uint256 ticketId) external",
  "function getUserTickets(address user) external view returns (uint256[])",
  "function getCurrentPoolInfo(uint8 poolType) external view returns (uint256, uint256, uint256, uint256, uint256)",
  "function tickets(uint256) external view returns (address, uint256, uint8, uint256, uint256, bool, uint8, uint256, bool)"
];

// hooks/useLottery.ts
import { useContract } from 'wagmi';
import { LOTTERY_ABI } from '@/lib/contracts/lotteryABI';

export function useLottery() {
  const contract = useContract({
    address: process.env.NEXT_PUBLIC_LOTTERY_CONTRACT,
    abi: LOTTERY_ABI,
  });
  
  return contract;
}
```

#### 2. 购买彩票

```typescript
async function buyTickets(quantity: number, poolType: 0 | 1) {
  try {
    // 1. 授权 RWA 代币
    const ticketPrice = poolType === 0 ? 10 : 50;
    const totalCost = ethers.utils.parseEther((quantity * ticketPrice).toString());
    
    const approveTx = await rwaContract.approve(lotteryAddress, totalCost);
    await approveTx.wait();
    
    // 2. 购买彩票
    const buyTx = await lotteryContract.buyTickets(quantity, poolType);
    const receipt = await buyTx.wait();
    
    // 3. 解析事件获取票号
    const event = receipt.events?.find(e => e.event === 'TicketsPurchased');
    const ticketIds = event?.args?.ticketIds;
    
    return ticketIds;
  } catch (error) {
    console.error('购买失败:', error);
    throw error;
  }
}
```


#### 3. 查询我的彩票

```typescript
async function getMyTickets(address: string) {
  try {
    // 获取彩票 ID 列表
    const ticketIds = await lotteryContract.getUserTickets(address);
    
    // 获取每张彩票的详细信息
    const tickets = await Promise.all(
      ticketIds.map(async (id) => {
        const ticket = await lotteryContract.tickets(id);
        return {
          id: id.toString(),
          owner: ticket[0],
          number: ticket[1].toString(),
          poolType: ticket[2] === 0 ? 'weekly' : 'monthly',
          round: ticket[3].toString(),
          purchaseTime: ticket[4].toNumber(),
          isWinner: ticket[5],
          prizeLevel: ticket[6],
          prizeAmount: ethers.utils.formatEther(ticket[7]),
          claimed: ticket[8]
        };
      })
    );
    
    return tickets;
  } catch (error) {
    console.error('查询失败:', error);
    throw error;
  }
}
```

#### 4. 领取奖金

```typescript
async function claimPrize(ticketId: number) {
  try {
    const tx = await lotteryContract.claimPrize(ticketId);
    const receipt = await tx.wait();
    
    // 解析事件
    const event = receipt.events?.find(e => e.event === 'PrizeClaimed');
    const prizeAmount = ethers.utils.formatEther(event?.args?.amount);
    
    return prizeAmount;
  } catch (error) {
    console.error('领奖失败:', error);
    throw error;
  }
}

// 批量领奖
async function claimMultiplePrizes(ticketIds: number[]) {
  try {
    const tx = await lotteryContract.claimMultiplePrizes(ticketIds);
    await tx.wait();
  } catch (error) {
    console.error('批量领奖失败:', error);
    throw error;
  }
}
```

#### 5. 查询奖池信息

```typescript
async function getPoolInfo(poolType: 0 | 1) {
  try {
    const [currentRound, prizePool, nextDrawTime, ticketsSold, ticketPrice] = 
      await lotteryContract.getCurrentPoolInfo(poolType);
    
    return {
      currentRound: currentRound.toString(),
      prizePool: ethers.utils.formatEther(prizePool),
      nextDrawTime: nextDrawTime.toNumber(),
      ticketsSold: ticketsSold.toNumber(),
      ticketPrice: ethers.utils.formatEther(ticketPrice)
    };
  } catch (error) {
    console.error('查询失败:', error);
    throw error;
  }
}
```


---

## 安全机制

### 1. 防重入攻击

使用 OpenZeppelin 的 `ReentrancyGuard`:

```solidity
function buyTickets(...) external nonReentrant { }
function claimPrize(...) external nonReentrant { }
function claimMultiplePrizes(...) external nonReentrant { }
```

### 2. 访问控制

使用 OpenZeppelin 的 `Ownable`:

```solidity
function requestDraw(...) external onlyOwner { }
function updateSubscriptionId(...) external onlyOwner { }
function emergencyWithdraw() external onlyOwner { }
```

### 3. 输入验证

```solidity
require(quantity > 0 && quantity <= 100, "Invalid quantity");
require(ticket.owner == msg.sender, "Not ticket owner");
require(!ticket.claimed, "Already claimed");
```

### 4. 防止重复领奖

```solidity
ticket.claimed = true; // 标记为已领取
require(!ticket.claimed, "Already claimed"); // 检查是否已领取
```

### 5. 随机数安全

使用 Chainlink VRF 而非链上伪随机:

- ✅ 真随机数生成
- ✅ 可验证的随机性
- ✅ 防止操纵
- ✅ 透明可审计

### 6. 整数溢出保护

Solidity 0.8+ 自动检查整数溢出

### 7. 紧急暂停

管理员可以通过 `emergencyWithdraw` 在紧急情况下提取资金

---

## 事件日志

### TicketsPurchased

```solidity
event TicketsPurchased(
    address indexed buyer,
    uint256[] ticketIds,
    uint256[] ticketNumbers,
    PoolType poolType,
    uint256 round,
    uint256 totalCost
);
```

### DrawRequested

```solidity
event DrawRequested(
    PoolType poolType,
    uint256 round,
    uint256 vrfRequestId,
    uint256 timestamp
);
```

### DrawCompleted

```solidity
event DrawCompleted(
    PoolType poolType,
    uint256 round,
    uint256 winningNumber,
    uint256 totalPrize,
    uint256[4] winnersCount
);
```

### PrizeClaimed

```solidity
event PrizeClaimed(
    address indexed winner,
    uint256 ticketId,
    uint256 amount,
    uint8 prizeLevel
);
```


---

## 测试用例

### 单元测试

创建 `test/Lottery.test.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("LotteryContract", function () {
  let lottery: any;
  let rwaToken: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // 部署 RWA 代币
    const RWAToken = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWAToken.deploy();
    
    // 部署彩票合约
    const LotteryContract = await ethers.getContractFactory("LotteryContract");
    lottery = await LotteryContract.deploy(
      rwaToken.address,
      "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f", // VRF Coordinator
      "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314", // Key Hash
      123 // Subscription ID
    );
    
    // 给用户分配代币
    await rwaToken.transfer(user1.address, ethers.utils.parseEther("1000"));
    await rwaToken.transfer(user2.address, ethers.utils.parseEther("1000"));
  });

  describe("购买彩票", function () {
    it("应该允许用户购买周奖池彩票", async function () {
      const quantity = 5;
      const cost = ethers.utils.parseEther("50"); // 5 * 10 RWA
      
      // 授权
      await rwaToken.connect(user1).approve(lottery.address, cost);
      
      // 购买
      const tx = await lottery.connect(user1).buyTickets(quantity, 0);
      const receipt = await tx.wait();
      
      // 验证事件
      const event = receipt.events?.find((e: any) => e.event === 'TicketsPurchased');
      expect(event?.args?.buyer).to.equal(user1.address);
      expect(event?.args?.ticketIds.length).to.equal(quantity);
    });

    it("应该拒绝超过100张的购买", async function () {
      await expect(
        lottery.connect(user1).buyTickets(101, 0)
      ).to.be.revertedWith("Invalid quantity");
    });

    it("应该正确累积奖池金额", async function () {
      const cost = ethers.utils.parseEther("100");
      await rwaToken.connect(user1).approve(lottery.address, cost);
      await lottery.connect(user1).buyTickets(10, 0);
      
      const poolInfo = await lottery.getCurrentPoolInfo(0);
      expect(poolInfo.prizePool).to.equal(cost);
    });
  });

  describe("彩票号码生成", function () {
    it("应该生成6位数字票号", async function () {
      const cost = ethers.utils.parseEther("10");
      await rwaToken.connect(user1).approve(lottery.address, cost);
      
      const tx = await lottery.connect(user1).buyTickets(1, 0);
      const receipt = await tx.wait();
      
      const event = receipt.events?.find((e: any) => e.event === 'TicketsPurchased');
      const ticketNumber = event?.args?.ticketNumbers[0];
      
      expect(ticketNumber).to.be.gte(100000);
      expect(ticketNumber).to.be.lte(999999);
    });
  });

  describe("查询功能", function () {
    it("应该返回用户的彩票列表", async function () {
      const cost = ethers.utils.parseEther("30");
      await rwaToken.connect(user1).approve(lottery.address, cost);
      await lottery.connect(user1).buyTickets(3, 0);
      
      const userTickets = await lottery.getUserTickets(user1.address);
      expect(userTickets.length).to.equal(3);
    });

    it("应该返回正确的奖池信息", async function () {
      const poolInfo = await lottery.getCurrentPoolInfo(0);
      
      expect(poolInfo.currentRound).to.equal(1);
      expect(poolInfo.ticketPrice).to.equal(ethers.utils.parseEther("10"));
    });
  });
});
```


### 运行测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/Lottery.test.ts

# 查看 Gas 使用情况
REPORT_GAS=true npx hardhat test

# 查看测试覆盖率
npx hardhat coverage
```

---

## Gas 优化

### 1. 批量操作

使用 `claimMultiplePrizes` 而非多次调用 `claimPrize`:

```solidity
// ❌ 低效：多次调用
for (let ticketId of ticketIds) {
  await lottery.claimPrize(ticketId);
}

// ✅ 高效：批量调用
await lottery.claimMultiplePrizes(ticketIds);
```

### 2. 使用 immutable

```solidity
IERC20 public immutable rwaToken; // 节省 Gas
```

### 3. 打包存储

```solidity
struct Ticket {
    address owner;      // 20 bytes
    uint256 number;     // 32 bytes
    PoolType poolType;  // 1 byte
    uint8 prizeLevel;   // 1 byte
    bool isWinner;      // 1 byte
    bool claimed;       // 1 byte
    // 优化存储布局
}
```

---

## 常见问题 (FAQ)

### Q1: 如何确保彩票号码的随机性？

A: 使用 Chainlink VRF 生成真随机数，而非链上伪随机。VRF 提供可验证的随机性，防止操纵。

### Q2: 如果没有人中奖怎么办？

A: 奖池会累积到下一期，直到有人中奖。

### Q3: 可以购买指定号码的彩票吗？

A: 不可以。为了确保公平性，所有彩票号码由合约自动生成。

### Q4: 开奖时间可以修改吗？

A: 可以。管理员可以通过修改 `weeklyDrawInterval` 和 `monthlyDrawInterval` 来调整。

### Q5: 如何验证开奖的公平性？

A: 每次开奖都会记录 VRF Request ID，可以在 Chainlink 浏览器上验证随机数的生成过程。

### Q6: 奖金会自动发放吗？

A: 不会。用户需要主动调用 `claimPrize` 或 `claimMultiplePrizes` 来领取奖金。

### Q7: 彩票有有效期吗？

A: 没有。中奖彩票可以随时领取，没有时间限制。

### Q8: 合约升级后旧彩票还有效吗？

A: 有效。所有彩票数据都存储在链上，永久有效。

---

## 升级计划

### 未来功能

1. **自动复投**: 中奖后自动购买下一期彩票
2. **团购功能**: 多人合买彩票，自动分配奖金
3. **幸运号码**: 用户可以保存喜欢的号码模式
4. **推荐奖励**: 推荐好友购买彩票获得奖励
5. **NFT 彩票**: 将彩票铸造为 NFT，可交易

### 合约升级方案

使用透明代理模式（Transparent Proxy Pattern）:

```solidity
// 1. 部署新的实现合约
LotteryContractV2 newImplementation = new LotteryContractV2();

// 2. 升级代理
proxy.upgradeTo(address(newImplementation));
```

---

## 联系方式

- **项目文档**: [GitHub Repository]
- **技术支持**: [Discord/Telegram]
- **安全报告**: security@rwa-protocol.com

---

## 许可证

MIT License - 详见 LICENSE 文件

---

**最后更新**: 2026-02-28  
**合约版本**: v1.0.0  
**文档版本**: v1.0.0
