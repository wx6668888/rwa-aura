# 计算器翻译添加指南

需要在以下位置的 `emergency: {` 之前添加 `calc:` 部分：

## 阿拉伯语 (ar) - 约第 1859 行
## 印地语 (hi) - 约第 2345 行  
## 法语 (fr) - 约第 2831 行
## 葡萄牙语 (pt) - 约第 3317 行
## 俄语 (ru) - 约第 3803 行
## 日语 (ja) - 约第 4289 行

对于这些语言，添加以下骨架结构（空字符串值）：

```typescript
  calc: {
    overline: '',
    title: '',
    subtitle: '',
    amountLabel: '',
    periodLabel: '',
    days: '',
    day30: '',
    day60: '',
    day90: '',
    day180: '',
    day365: '',
    levelLabel: '',
    referralLabel: '',
    directRefs: '',
    avgStake: '',
    referralNote: '',
    compareLabel: '',
    bankDeposit: '',
    stableFarm: '',
    ethStaking: '',
    projectedReturn: '',
    staticYield: '',
    referralIncome: '',
    totalStaked: '',
    totalValue: '',
    dailyBreakdown: '',
    perDay: '',
    perWeek: '',
    perMonth: '',
    stakeCta: '',
    disclaimer: '',
    growthChart: '',
    linear: '',
    compound: '',
    principal: '',
    paramsRef: '',
    dailyRate: '',
    maxPeriod: '',
    minStake: '',
    liveParams: '',
    paramsNote: '',
    shareTitle: '',
    copyLink: '',
    shareText: '',
  },
```

注意：这些语言的翻译可以后续补充，目前先保持键结构完整以避免运行时错误。
