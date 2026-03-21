# SwapContract 修复说明

## ✅ 已创建文件

1. `useSwapContractFixed.ts` - 修复的 Swap Hook
2. `swap-error-parser.ts` - Swap 错误解析
3. `SwapWarnings.tsx` - Swap 警告组件
4. `test-swap.ts` - 测试脚本

## 🔧 修复的问题

### 1. ABI 匹配 ✅
- 使用正确的 `getSwapRate(amount, isStRWAToRWA)` 
- 返回 `(outputAmount, swapRate)`

### 2. 新增查询 ✅
- `getPoolStatus()` - 池子状态
- `getUserDailySwapAmount()` - 用户今日额度
- `swapEnabled` - 互换开关

### 3. 限额检查 ✅
- 前端提前检查避免交易失败

### 4. 错误处理 ✅
- 处理所有 Swap 相关错误

## 📝 使用方法

```tsx
import { useSwapContractFixed } from '@/hooks/useSwapContractFixed'
import { SwapLimitWarning } from '@/components/swap/SwapWarnings'

const { poolStatus, checkLimit, getQuote, swap } = useSwapContractFixed()

// 检查限额
const check = checkLimit('100')
if (!check.ok) alert(check.reason)

// 获取报价
const quote = await getQuote('100', true)

// 执行互换
await swap('100', true)

// UI 组件
<SwapLimitWarning />
```

## ✅ SwapContract 修复完成！
