# Lucky Draw 抽奖页面 - 完整创建计划

## 已创建的文件 ✅

1. `frontend/app/lucky/page.tsx` - 主页面
2. `frontend/components/lucky/lucky-header.tsx` - 页面头部
3. `frontend/components/lucky/prize-pool-card.tsx` - 奖池卡片（含倒计时）
4. `frontend/components/lucky/pool-switcher.tsx` - 周/月奖池切换器

## 待创建的组件（按优先级）

### 高优先级（核心功能）

5. `ticket-purchase-card.tsx` - 购票卡片
   - RWA余额显示
   - 数量选择器（+/-按钮、快速选择）
   - 成本计算
   - 票号预览
   - 购买按钮（多状态）

6. `my-tickets-card.tsx` - 我的彩票
   - 周/月奖池标签切换
   - 彩票网格显示
   - 中奖彩票高亮
   - 空状态

7. `odds-calculator.tsx` - 中奖概率计算器
   - 持票数统计
   - 概率计算
   - 可视化概率条

8. `recent-winners.tsx` - 最近中奖者
   - 5个中奖记录
   - 地址截断
   - 奖金显示

### 中优先级（信息展示）

9. `prize-breakdown-table.tsx` - 奖项设置表格
   - 周/月奖池表格
   - 4个奖项等级
   - 响应式布局

10. `draw-history.tsx` - 开奖历史
    - 历史记录表格
    - Chainlink VRF验证链接
    - 分页

11. `how-it-works.tsx` - 抽奖规则
    - 4步时间线
    - 图标 + 说明

12. `fairness-proof.tsx` - 公平性证明
    - Chainlink VRF说明
    - VRF证明展示
    - 文档链接

### 低优先级（增强功能）

13. `confetti-effect.tsx` - 彩带动画
    - CSS动画
    - 购票成功触发

14. `swap-mini-widget.tsx` - 浮动兑换组件
    - 桌面端右下角
    - 快速USDT→RWA
    - 可展开/收起

### Hook 和工具

15. `hooks/useLottery.ts` - 抽奖合约交互
    - getCurrentPool()
    - buyTickets()
    - getMyTickets()
    - getDrawHistory()

16. `lib/contracts/lotteryABI.ts` - 合约ABI
    - 周奖池合约ABI
    - 月奖池合约ABI

### 智能合约

17. `contracts/LotteryWeekly.sol` - 周奖池合约
    - 购票功能
    - Chainlink VRF集成
    - 奖金分配

18. `contracts/LotteryMonthly.sol` - 月奖池合约
    - 同周奖池结构
    - 不同参数

### 翻译

19. 在 `lib/i18n.ts` 添加所有 `lucky.*` 键
    - 中文（zh）完整
    - 英文（en）完整
    - 韩语（ko）完整
    - 其他7种骨架

### 导航集成

20. 更新 `components/navbar.tsx`
    - 添加"抽奖"链接

## 智能合约架构

### LotteryWeekly.sol 核心功能

```solidity
// 状态变量
uint256 public ticketPrice = 10 * 10**18; // 10 RWA
uint256 public currentRound;
uint256 public prizePool;
mapping(uint256 => Round) public rounds;
mapping(address => uint256[]) public userTickets;

// 核心函数
function buyTickets(uint256 quantity) external
function requestRandomWords() external // Chainlink VRF
function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override
function distributePrizes() external
function claimPrize(uint256 ticketId) external

// 查询函数
function getCurrentPool() external view returns (PoolInfo)
function getMyTickets(address user) external view returns (Ticket[])
function getDrawHistory(uint256 page) external view returns (Draw[])
```

### Chainlink VRF 集成

```solidity
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract LotteryWeekly is VRFConsumerBaseV2 {
    // VRF配置
    bytes32 keyHash;
    uint64 subscriptionId;
    uint32 callbackGasLimit = 200000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    
    // 请求随机数
    function requestRandomWords() external onlyOwner {
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        // 存储requestId
    }
    
    // 接收随机数
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        // 使用随机数选择中奖票号
        // 分配奖金
    }
}
```

## 数据结构

### 前端类型定义

```typescript
// types/lottery.ts
export interface PoolInfo {
  poolAmount: string;
  ticketsSold: number;
  participants: number;
  nextDrawTime: number;
  ticketPrice: string;
  userTicketCount: number;
}

export interface Ticket {
  id: string;
  number: string;
  poolType: 'weekly' | 'monthly';
  purchaseTime: number;
  isWinning: boolean;
  prizeAmount?: string;
}

export interface Draw {
  round: number;
  drawTime: number;
  poolAmount: string;
  participants: number;
  winners: Winner[];
  vrfRequestId: string;
  txHash: string;
}

export interface Winner {
  address: string;
  ticketNumber: string;
  prize: string;
  rank: number;
}
```

## 环境变量

需要添加到 `.env.local`:

```bash
# Lottery Contracts
NEXT_PUBLIC_LOTTERY_WEEKLY_CONTRACT=0x...
NEXT_PUBLIC_LOTTERY_MONTHLY_CONTRACT=0x...

# Chainlink VRF
NEXT_PUBLIC_CHAINLINK_VRF_COORDINATOR=0x...
NEXT_PUBLIC_CHAINLINK_KEY_HASH=0x...
NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID=123
```

## 部署脚本

```typescript
// scripts/deploy-lottery.ts
async function main() {
  // 1. 部署周奖池合约
  const LotteryWeekly = await ethers.getContractFactory("LotteryWeekly");
  const weeklyLottery = await LotteryWeekly.deploy(
    rwaTokenAddress,
    vrfCoordinator,
    keyHash,
    subscriptionId
  );
  
  // 2. 部署月奖池合约
  const LotteryMonthly = await ethers.getContractFactory("LotteryMonthly");
  const monthlyLottery = await LotteryMonthly.deploy(
    rwaTokenAddress,
    vrfCoordinator,
    keyHash,
    subscriptionId
  );
  
  // 3. 配置Chainlink VRF订阅
  // 4. 初始化奖池
}
```

## 测试计划

### 单元测试

```typescript
// test/Lottery.test.ts
describe("LotteryWeekly", () => {
  it("Should allow buying tickets with RWA");
  it("Should generate unique ticket numbers");
  it("Should request random words from Chainlink VRF");
  it("Should distribute prizes correctly");
  it("Should prevent double claiming");
});
```

### 集成测试

1. 购票流程测试
2. 开奖流程测试
3. 奖金领取测试
4. VRF验证测试

## 下一步行动

你希望我：

**选项 A**：继续创建所有剩余的前端组件（5-14号）
**选项 B**：先创建智能合约（17-18号）
**选项 C**：先完成核心功能（5-8号），测试后再继续

请告诉我你的选择，我会继续执行！
