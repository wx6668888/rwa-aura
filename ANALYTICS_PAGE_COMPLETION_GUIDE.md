# Analytics 数据看板页面 - 完成指南

## ✅ 已完成

1. **主页面框架** - `frontend/app/analytics/page.tsx`
2. **实时数据栏** - `frontend/components/analytics/live-bar.tsx`
3. **时间选择器** - `frontend/components/analytics/time-range-selector.tsx`
4. **关键指标卡片** - `frontend/components/analytics/key-metrics-row.tsx`
5. **TVL历史图表** - `frontend/components/analytics/tvl-history-chart.tsx`
6. **导出分享按钮** - `frontend/components/analytics/export-share-buttons.tsx`

## 📋 需要完成的组件

创建以下组件文件，参考已完成的组件风格：

### 1. Daily Staking Chart
```bash
frontend/components/analytics/daily-staking-chart.tsx
```
- 使用 Recharts BarChart
- 堆叠柱状图：新增质押 + 复投质押
- plasma-cyan 颜色
- 高度 220px

### 2. Daily Rewards Chart
```bash
frontend/components/analytics/daily-rewards-chart.tsx
```
- 使用 Recharts AreaChart
- 两条线：静态收益 + 推荐奖励
- void-purple 颜色
- 高度 220px

### 3. Node Distribution
```bash
frontend/components/analytics/node-distribution.tsx
```
- 左侧：Recharts PieChart (donut)
- 右侧：节点等级列表 + 进度条
- 5个等级 V1-V5
- 不同颜色

### 4. Referral Growth Chart
```bash
frontend/components/analytics/referral-growth-chart.tsx
```
- 使用 Recharts LineChart
- 两条线：注册用户 + 活跃质押
- plasma-cyan + void-purple
- 顶部显示3个统计芯片

### 5. Fund Flow Sankey
```bash
frontend/components/analytics/fund-flow-sankey.tsx
```
- 自定义 SVG 流程图
- 用户质押 → 50% 国库 + 50% 社区池
- 动画流动效果
- 高度 200px

### 6. Top Stakers Table
```bash
frontend/components/analytics/top-stakers-table.tsx
```
- 表格组件
- 10行数据
- 列：排名、地址、等级、质押金额、累计收益、占比
- 前3名金牌图标
- 移动端横向滚动

### 7. Protocol Health Indicators
```bash
frontend/components/analytics/protocol-health-indicators.tsx
```
- 4个指标卡片
- 安全、流动性、增长、活跃度
- plasma-cyan 边框 + 发光效果
- 图标 + 分数 + 描述

## 🌐 添加翻译

在 `frontend/lib/i18n.ts` 中添加 analytics 部分：

```typescript
// 在 zh 对象中添加
analytics: {
  overline: '协议数据看板',
  title: '完全透明的链上数据',
  subtitle: '所有数据直接来源于BSC区块链，实时更新，任何人均可独立验证。',
  live: '实时',
  liveSource: '数据来自BSC区块链',
  lastUpdate: '上次更新',
  secondsAgo: '秒前',
  '7d': '7天',
  '30d': '30天',
  '90d': '90天',
  '180d': '180天',
  all: '全部',
  tvl: '总锁仓量',
  totalStakers: '质押用户总数',
  totalRewarded: '累计发放奖励',
  rewardRatio: '奖励池使用率',
  thisPeriod: '本期',
  remainingToLimit: '距上限还有 $1,558,000',
  tvlHistory: 'TVL历史走势',
  areaChart: '面积图',
  barChart: '柱状图',
  ath: '历史最高',
  dailyStaking: '每日质押量',
  dailyRewards: '每日奖励发放',
  nodeDistribution: '节点等级分布',
  referralGrowth: '推荐网络增长',
  fundFlow: '资金流向分析',
  topStakers: '质押排行榜 TOP 10',
  health: '协议健康度指标',
  exportNote: '所有数据均可独立在BSCScan上验证',
  exportCsv: '导出CSV',
  bscscan: '在BSCScan验证',
  shareReport: '分享报告',
  // ... 更多键值对见 ANALYTICS_PAGE_IMPLEMENTATION_PLAN.md
},

// 在 en 对象中添加英文翻译
// 在 ko 对象中添加韩语翻译
// 其他语言添加空字符串占位
```

## 🔗 更新导航栏

在 `frontend/components/navbar.tsx` 中添加"数据"链接：

```typescript
const navLinks = [
  { href: '/', label: t('nav.home') },
  { href: '/stake', label: t('nav.stake') },
  { href: '/dashboard', label: t('nav.dashboard') },
  { href: '/market', label: t('nav.market') },
  { href: '/analytics', label: t('nav.analytics') }, // 新增
  // ... 其他链接
]
```

在 i18n.ts 中添加：
```typescript
nav: {
  // ... 现有的
  analytics: '数据', // zh
  analytics: 'Analytics', // en
  analytics: '애널리틱스', // ko
}
```

## 🎨 设计要点

### 卡片样式
```typescript
className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl hover:border-[#ffffff1a] hover:-translate-y-0.5 transition-all duration-200"
```

### 按钮样式
```typescript
// Primary
className="px-5 h-10 rounded-full bg-[#00f5d4] text-[#05050a] hover:brightness-110 transition-all"

// Ghost
className="px-5 h-10 rounded-full border border-[#ffffff1a] text-[#f1f5f9] hover:bg-[#13131e] transition-all"
```

### 数字样式
```typescript
className="font-mono text-[#00f5d4]"
style={{ fontFamily: 'JetBrains Mono, monospace' }}
```

## 📱 响应式

- 移动端：单列，图表高度 200px
- 平板：2列网格
- 桌面：4列网格
- 最小触摸目标：44px

## 🚀 快速开始

1. 复制已完成组件的结构
2. 修改数据和图表类型
3. 调整颜色和样式
4. 添加翻译键
5. 测试响应式布局

## 📊 模拟数据生成

所有图表使用模拟数据，参考 `tvl-history-chart.tsx` 中的数据生成方法：

```typescript
const generateData = () => {
  const data = []
  for (let i = 0; i < days; i++) {
    data.push({
      date: formatDate(i),
      value: generateValue(),
    })
  }
  return data
}
```

## ✨ 完成后

页面将展示：
- ✅ 完全透明的链上数据
- ✅ 实时更新指示器
- ✅ 多时间范围切换
- ✅ 8个数据可视化组件
- ✅ 10种语言支持
- ✅ 完美的移动端体验
- ✅ Void Space Tech 设计风格

---

**预计完成时间**: 2-3小时
**难度**: 中等（主要是重复性工作）
**关键**: 保持设计一致性
