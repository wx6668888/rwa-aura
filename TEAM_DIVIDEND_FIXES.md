# TeamDividendPool 修复说明

## ✅ 已创建文件

1. `useTeamDividendExtended.ts` - 扩展 Hook
2. `team-dividend-error-parser.ts` - 错误解析
3. `TeamDividendCard.tsx` - 提现组件

## 🔧 修复的问题

### 1. 限额查询 ✅
- 单笔限额: 100,000 USDT
- 每日次数: 10次

### 2. 池子状态 ✅
- 总余额、已结算、预留、可用余额

### 3. 手续费计算 ✅
- 显示实际到账（扣除 8%）

### 4. 错误处理 ✅
- 每日次数限制
- 单笔金额限制

## 📝 使用方法

```tsx
import { useTeamDividendExtended } from '@/hooks/useTeamDividendExtended'
import { TeamDividendCard } from '@/components/dividend/TeamDividendCard'

const { balance, dailyCount, maxPerDay, withdraw } = useTeamDividendExtended()

// 提现
await withdraw('1000')

// UI 组件
<TeamDividendCard locale="zh" />
```

## ✅ TeamDividendPool 修复完成！
