# Lucky Draw 抽奖页面实现报告

## 已完成

✅ 主页面结构 (`frontend/app/lucky/page.tsx`)
✅ 页面头部组件 (`frontend/components/lucky/lucky-header.tsx`)
✅ 增强的节日背景效果（金色光球 + 80个浮动粒子）

## 需要创建的组件

由于这是一个大型页面，包含20+个组件，建议分阶段实现：

### 第一阶段：核心组件（必需）

1. `pool-switcher.tsx` - 周奖池/月奖池切换器
2. `prize-pool-card.tsx` - 奖池展示卡片（倒计时、奖金分配）
3. `ticket-purchase-card.tsx` - 购票卡片（数量选择、支付）
4. `my-tickets-card.tsx` - 我的彩票卡片
5. `odds-calculator.tsx` - 中奖概率计算器
6. `recent-winners.tsx` - 最近中奖者

### 第二阶段：信息展示

7. `prize-breakdown-table.tsx` - 奖项设置表格
8. `draw-history.tsx` - 开奖历史
9. `how-it-works.tsx` - 抽奖规则（4步时间线）
10. `fairness-proof.tsx` - Chainlink VRF 公平性证明

### 第三阶段：交互功能

11. `confetti-effect.tsx` - 购票成功彩带动画
12. `swap-mini-widget.tsx` - 浮动快速兑换组件
13. `hooks/useLottery.ts` - 抽奖合约交互 Hook

### 第四阶段：翻译

14. 在 `lib/i18n.ts` 中添加所有 `lucky.*` 翻译键
   - 中文（zh）完整翻译
   - 英文（en）完整翻译
   - 韩语（ko）完整翻译
   - 其他7种语言骨架

### 第五阶段：导航集成

15. 在 `components/navbar.tsx` 中添加"抽奖"链接

## 设计特点

### 背景增强
- 更大的青色光球（800px，15%透明度）
- 更大的紫色光球（900px，12%透明度）
- 新增金色光球（600px，8%透明度）
- 80个浮动粒子（青色、紫色、金色混合）
- 增强的颗粒纹理（5%透明度）

### 视觉风格
- 节日感但保持高级：不是廉价赌场风格
- 金色作为主要强调色（奖金、中奖）
- 青色作为交互色（按钮、链接）
- 紫色作为辅助色（背景、装饰）

### 交互设计
- 实时倒计时（每秒更新）
- 数字滚动动画（奖池金额）
- 购票成功彩带效果
- 浮动快速兑换组件（桌面端）

## 技术栈

- Next.js 14 App Router
- TypeScript strict mode
- Tailwind CSS only
- Wagmi + Viem (钱包连接)
- Chainlink VRF (公平随机数)

## 数据流

```
用户 → 连接钱包 → 查看RWA余额
    ↓
选择奖池类型（周/月）
    ↓
选择购票数量 → 计算成本
    ↓
授权RWA（如需要）→ 购买彩票
    ↓
获得票号 → 等待开奖
    ↓
Chainlink VRF 开奖 → 自动发放奖励
```

## 合约集成

需要的合约方法：
- `getCurrentPool(type)` - 获取当前奖池信息
- `buyTickets(type, quantity)` - 购买彩票
- `getMyTickets(address, type)` - 获取我的彩票
- `getDrawHistory(type)` - 获取开奖历史
- `getPrizeStructure(type)` - 获取奖项设置

## 下一步

建议按以下顺序实现：

1. **先创建静态UI** - 所有组件的UI和布局
2. **添加翻译** - 完整的10语言支持
3. **集成钱包** - 连接状态、余额显示
4. **合约交互** - 购票、查询等功能
5. **测试优化** - 响应式、动画、性能

## 预估工作量

- 组件开发：2-3小时
- 翻译工作：30分钟
- 合约集成：1-2小时
- 测试优化：1小时

**总计：约5-7小时完整实现**

## 当前状态

📍 **第一阶段开始** - 正在创建核心组件

需要继续吗？我可以：
1. 继续创建所有组件（一次性完成）
2. 分批创建（每次5-6个组件）
3. 只创建最小可用版本（MVP）

请告诉我你的偏好！
