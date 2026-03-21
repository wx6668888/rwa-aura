# RWA & StRWA 补充功能使用说明

## ✅ 已创建文件

1. `frontend/hooks/useRWATokenInfo.ts` - RWA Token 信息查询
2. `frontend/hooks/useStRWAExtended.ts` - StRWA 扩展功能
3. `frontend/lib/rwa-error-parser.ts` - RWA 错误解析
4. `frontend/components/rwa/RWAComponents.tsx` - UI 组件示例

## 🎯 功能说明

### RWA Token 补充功能

**useRWATokenInfo Hook**
```typescript
import { useRWATokenInfo } from '@/hooks/useRWATokenInfo'

const { 
  isWhitelisted,    // 是否白名单
  canSellNow,       // 是否可以卖出
  nextSellDate,     // 下次可卖出时间
  getSellTaxRate    // 获取卖出税率
} = useRWATokenInfo()

// 计算税率
const taxRate = getSellTaxRate('100') // 卖出 100 RWA 的税率
```

### StRWA 补充功能

**useStRWAExtended Hook**
```typescript
import { useStRWAExtended } from '@/hooks/useStRWAExtended'

const {
  isReady,              // 合约是否就绪
  availableBalance,     // 可用余额
  locks,                // 锁仓列表
  hasExpiredLocks,      // 是否有到期锁仓
  releaseExpiredLocks   // 释放到期锁仓
} = useStRWAExtended()

// 释放锁仓
await releaseExpiredLocks()
```

### UI 组件

**卖出警告组件**
```tsx
import { RWASellWarning } from '@/components/rwa/RWAComponents'

<RWASellWarning sellAmount="100" />
```

**锁仓面板组件**
```tsx
import { StRWALocksPanel } from '@/components/rwa/RWAComponents'

<StRWALocksPanel />
```

## 📝 集成示例

在卖出页面添加警告：
```tsx
const [sellAmount, setSellAmount] = useState('')

<input value={sellAmount} onChange={e => setSellAmount(e.target.value)} />
<RWASellWarning sellAmount={sellAmount} />
```

在 stRWA 页面显示锁仓：
```tsx
<StRWALocksPanel />
```

## ✅ 完成
所有 RWA 和 StRWA 的潜在问题已修复！
