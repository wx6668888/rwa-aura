# ReferralRewardPool 修复说明

## ✅ 已创建文件

1. `useReferralRewardPoolExtended.ts` - 扩展 Hook
2. `referral-error-parser.ts` - 错误解析
3. `ReferralWithdrawCard.tsx` - 提现组件

## 🔧 修复的问题

### 1. 提现功能 ✅
- 实现 `withdraw(amount)` 调用
- 自动检查最低额度

### 2. 最低提现检查 ✅
- 查询 `MIN_WITHDRAWAL` (100 USDT)
- 前端提前验证

### 3. 结算时间 ✅
- 查询 `lastSettlementTime`
- 显示上次结算日期

### 4. 错误处理 ✅
- 处理最低额度错误
- 处理余额不足错误

## 📝 使用方法

```tsx
import { useReferralRewardPoolExtended } from '@/hooks/useReferralRewardPoolExtended'
import { ReferralWithdrawCard } from '@/components/referral/ReferralWithdrawCard'

const { pending, withdrawable, withdraw } = useReferralRewardPoolExtended()

// 提现
await withdraw('100')

// UI 组件
<ReferralWithdrawCard locale="zh" />
```

## ✅ ReferralRewardPool 修复完成！
