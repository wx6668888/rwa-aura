# Analytics 数据看板页面 - 实现计划

## 已完成的文件

### 1. 主页面
- ✅ `frontend/app/analytics/page.tsx` - 主页面布局

### 2. 核心组件
- ✅ `frontend/components/analytics/live-bar.tsx` - 实时数据栏
- ✅ `frontend/components/analytics/time-range-selector.tsx` - 时间范围选择器
- ✅ `frontend/components/analytics/key-metrics-row.tsx` - 关键指标卡片行
- ✅ `frontend/components/analytics/tvl-history-chart.tsx` - TVL 历史走势图

## 需要创建的组件

### 3. 图表组件
- ⏳ `frontend/components/analytics/daily-staking-chart.tsx` - 每日质押量图表
- ⏳ `frontend/components/analytics/daily-rewards-chart.tsx` - 每日奖励发放图表
- ⏳ `frontend/components/analytics/node-distribution.tsx` - 节点等级分布
- ⏳ `frontend/components/analytics/referral-growth-chart.tsx` - 推荐网络增长图表
- ⏳ `frontend/components/analytics/fund-flow-sankey.tsx` - 资金流向分析
- ⏳ `frontend/components/analytics/top-stakers-table.tsx` - 质押排行榜
- ⏳ `frontend/components/analytics/protocol-health-indicators.tsx` - 协议健康度指标
- ⏳ `frontend/components/analytics/export-share-buttons.tsx` - 导出分享按钮

## i18n 翻译键（需要添加到 frontend/lib/i18n.ts）

```typescript
analytics: {
  // 页面标题
  overline: '协议数据看板',
  title: '完全透明的链上数据',
  subtitle: '所有数据直接来源于BSC区块链，实时更新，任何人均可独立验证。',
  
  // 实时栏
  live: '实时',
  liveSource: '数据来自BSC区块链',
  lastUpdate: '上次更新',
  secondsAgo: '秒前',
  
  // 时间范围
  '7d': '7天',
  '30d': '30天',
  '90d': '90天',
  '180d': '180天',
  all: '全部',
  
  // 关键指标
  tvl: '总锁仓量',
  totalStakers': '质押用户总数',
  totalRewarded: '累计发放奖励',
  rewardRatio: '奖励池使用率',
  thisPeriod: '本期',
  remainingToLimit: '距上限还有 $1,558,000',
  
  // TVL 历史
  tvlHistory: 'TVL历史走势',
  areaChart: '面积图',
  barChart: '柱状图',
  ath: '历史最高',
  
  // 每日质押
  dailyStaking: '每日质押量',
  totalStaked: '总计',
  newStakes: '新增质押',
  restakes: '复投质押',
  
  // 每日奖励
  dailyRewards: '每日奖励发放',
  staticRewards: '静态收益',
  referralRewards: '推荐奖励',
  
  // 节点分布
  nodeDistribution: '节点等级分布',
  totalUsers: '总用户',
  users: '用户',
  
  // 推荐网络
  referralGrowth: '推荐网络增长',
  totalReferrals: '总推荐关系',
  avgReferrals: '平均每人直推',
  maxDepth: '最深推荐层级',
  registeredUsers: '注册用户',
  activeStakers: '活跃质押',
  
  // 资金流向
  fundFlow: '资金流向分析',
  periodTotal: '本期总流入',
  userStaking: '用户质押',
  treasury: '国库储备金',
  communityPool: '社区激励池',
  gnosisSafe: 'Gnosis Safe',
  staticYield: '静态收益',
  referralBonus: '推荐奖励',
  toStakers: '质押用户',
  toReferrers: '推荐人',
  
  // 排行榜
  topStakers: '质押排行榜 TOP 10',
  viewLeaderboard: '查看完整排行榜',
  rank: '排名',
  address: '地址',
  level: '等级',
  stakeAmount: '质押金额',
  totalRewards: '累计收益',
  share: '占比',
  
  // 健康度指标
  health: '协议健康度指标',
  secure: '安全',
  auditCompleted: '审计已完成',
  auditsPassed: '已通过2项第三方审计',
  liquidity: '流动性',
  availableRewards: '可用奖励池余额',
  growth: '增长',
  tvlGrowth: 'TVL月增长率',
  continuousGrowth: '持续正增长',
  activity: '活跃度',
  activeRate: '30日活跃质押率',
  activeUserRatio: '活跃用户占比',
  
  // 导出分享
  exportNote: '所有数据均可独立在BSCScan上验证',
  exportCsv: '导出CSV',
  bscscan: '在BSCScan验证',
  shareReport: '分享报告',
}
```

## 英文翻译

```typescript
analytics: {
  overline: 'Protocol Analytics',
  title: 'Fully Transparent On-Chain Data',
  subtitle: 'All data sourced directly from BSC blockchain, updated in real time, independently verifiable.',
  
  live: 'Live',
  liveSource: 'Data from BSC Blockchain',
  lastUpdate: 'Last update',
  secondsAgo: 's ago',
  
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  '180d': '180D',
  all: 'All',
  
  tvl: 'Total Value Locked',
  totalStakers: 'Total Stakers',
  totalRewarded: 'Total Rewards Paid',
  rewardRatio: 'Reward Pool Usage',
  thisPeriod: 'this period',
  remainingToLimit: '$1,558,000 remaining to limit',
  
  tvlHistory: 'TVL History',
  areaChart: 'Area Chart',
  barChart: 'Bar Chart',
  ath: 'ATH',
  
  dailyStaking: 'Daily Staking Volume',
  totalStaked: 'Total',
  newStakes: 'New Stakes',
  restakes: 'Restakes',
  
  dailyRewards: 'Daily Rewards Distributed',
  staticRewards: 'Static Rewards',
  referralRewards: 'Referral Rewards',
  
  nodeDistribution: 'Node Level Distribution',
  totalUsers: 'Total Users',
  users: 'users',
  
  referralGrowth: 'Referral Network Growth',
  totalReferrals: 'Total Referrals',
  avgReferrals: 'Avg Referrals per User',
  maxDepth: 'Max Depth',
  registeredUsers: 'Registered Users',
  activeStakers: 'Active Stakers',
  
  fundFlow: 'Fund Flow Analysis',
  periodTotal: 'Period Total Inflow',
  userStaking: 'User Staking',
  treasury: 'Treasury Reserve',
  communityPool: 'Community Pool',
  gnosisSafe: 'Gnosis Safe',
  staticYield: 'Static Yield',
  referralBonus: 'Referral Bonus',
  toStakers: 'To Stakers',
  toReferrers: 'To Referrers',
  
  topStakers: 'Top 10 Stakers',
  viewLeaderboard: 'View Full Leaderboard',
  rank: 'Rank',
  address: 'Address',
  level: 'Level',
  stakeAmount: 'Stake Amount',
  totalRewards: 'Total Rewards',
  share: 'Share',
  
  health: 'Protocol Health Indicators',
  secure: 'Secure',
  auditCompleted: 'Audit Completed',
  auditsPassed: 'Passed 2 third-party audits',
  liquidity: 'Liquidity',
  availableRewards: 'Available Reward Pool',
  growth: 'Growth',
  tvlGrowth: 'TVL Monthly Growth',
  continuousGrowth: 'Continuous Growth',
  activity: 'Activity',
  activeRate: '30D Active Staking Rate',
  activeUserRatio: 'Active User Ratio',
  
  exportNote: 'All data can be independently verified on BSCScan',
  exportCsv: 'Export CSV',
  bscscan: 'Verify on BSCScan',
  shareReport: 'Share Report',
}
```

## 韩语翻译

```typescript
analytics: {
  overline: '프로토콜 애널리틱스',
  title: '완전히 투명한 온체인 데이터',
  subtitle: '모든 데이터는 BSC 블록체인에서 직접 가져오며, 실시간으로 업데이트되고 누구나 독립적으로 검증할 수 있습니다.',
  
  live: '실시간',
  liveSource: 'BSC 블록체인 데이터',
  lastUpdate: '마지막 업데이트',
  secondsAgo: '초 전',
  
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
  '180d': '180일',
  all: '전체',
  
  tvl: '총 잠긴 가치',
  totalStakers: '총 스테이커',
  totalRewarded: '총 지급 보상',
  rewardRatio: '보상 풀 사용률',
  thisPeriod: '이번 기간',
  remainingToLimit: '한도까지 $1,558,000 남음',
  
  tvlHistory: 'TVL 히스토리',
  areaChart: '영역 차트',
  barChart: '막대 차트',
  ath: '최고치',
  
  dailyStaking: '일별 스테이킹 볼륨',
  totalStaked: '총계',
  newStakes: '신규 스테이킹',
  restakes: '재스테이킹',
  
  dailyRewards: '일별 보상 분배',
  staticRewards: '정적 보상',
  referralRewards: '추천 보상',
  
  nodeDistribution: '노드 등급 분포',
  totalUsers: '총 사용자',
  users: '사용자',
  
  referralGrowth: '추천 네트워크 성장',
  totalReferrals: '총 추천 관계',
  avgReferrals: '사용자당 평균 추천',
  maxDepth: '최대 깊이',
  registeredUsers: '등록된 사용자',
  activeStakers: '활성 스테이커',
  
  fundFlow: '자금 흐름 분석',
  periodTotal: '기간 총 유입',
  userStaking: '사용자 스테이킹',
  treasury: '재무 준비금',
  communityPool: '커뮤니티 풀',
  gnosisSafe: 'Gnosis Safe',
  staticYield: '정적 수익',
  referralBonus: '추천 보너스',
  toStakers: '스테이커에게',
  toReferrers: '추천인에게',
  
  topStakers: '스테이킹 상위 10',
  viewLeaderboard: '전체 리더보드 보기',
  rank: '순위',
  address: '주소',
  level: '등급',
  stakeAmount: '스테이킹 금액',
  totalRewards: '총 보상',
  share: '점유율',
  
  health: '프로토콜 건강 지표',
  secure: '안전',
  auditCompleted: '감사 완료',
  auditsPassed: '2개의 제3자 감사 통과',
  liquidity: '유동성',
  availableRewards: '사용 가능한 보상 풀',
  growth: '성장',
  tvlGrowth: 'TVL 월간 성장률',
  continuousGrowth: '지속적인 성장',
  activity: '활동',
  activeRate: '30일 활성 스테이킹 비율',
  activeUserRatio: '활성 사용자 비율',
  
  exportNote: '모든 데이터는 BSCScan에서 독립적으로 검증 가능합니다',
  exportCsv: 'CSV 내보내기',
  bscscan: 'BSCScan에서 검증',
  shareReport: '보고서 공유',
}
```

## 设计系统要点

### 颜色
- void-black: #05050a (页面背景)
- surface-1: #0d0d14 (卡片背景)
- surface-2: #13131e (提升层级)
- plasma-cyan: #00f5d4 (主要强调色)
- void-purple: #8b5cf6 (次要强调色)
- gold-node: #f59e0b (节点等级)
- success: #10b981 (成功/增长)
- danger: #f43f5e (危险/下降)

### 字体
- 标题: Space Grotesk 700-900
- 正文: Inter 400-500
- 数字: JetBrains Mono
- 韩语: Noto Sans KR
- 日语: Noto Sans JP

### 动画效果
- 扫描线动画 (8s linear infinite)
- 卡片悬停: translate-y -2px
- 数字计数动画
- 实时指示器脉冲

### 响应式布局
- 移动端: 单列布局
- 平板: 2列网格
- 桌面: 4列网格
- 最小触摸目标: 44px
- 底部填充: 100px

## 下一步

1. 创建剩余的图表组件
2. 添加所有翻译键到 i18n.ts
3. 在导航栏添加"数据"链接
4. 测试所有语言切换
5. 测试响应式布局
6. 优化性能和动画

## 技术栈

- Next.js 14 App Router
- TypeScript (strict mode)
- Tailwind CSS
- Recharts (图表库)
- Lucide React (图标)
- 零额外 CSS 文件
