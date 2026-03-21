# ⚡ 快速参考

## 🎯 核心功能

### 1. 交易持久化
```typescript
import { TransactionStore } from '@/lib/transaction-store'

TransactionStore.save({ hash, type: 'stake', status: 'pending', ... })
TransactionStore.update(hash, { status: 'success' })
const pending = TransactionStore.getPending()
```

### 2. 错误解析
```typescript
import { parseError } from '@/lib/error-parser'

const message = parseError(error, locale) // 自动中英文
```

### 3. 奖励发放
```typescript
await rewardService.processStakeWithLogging(user, amount, stakeId, 'USDT')
```

### 4. 国库补充
```typescript
await treasuryManager.checkAndTopUp('USDT')
```

## 📡 API端点

```
GET /api/monitoring/stats/rewards?hours=24
GET /api/monitoring/logs/rewards?limit=50
GET /api/monitoring/logs/treasury?limit=50
```

## 🗄️ 数据库表

- `reward_distribution_logs` - 奖励发放记录
- `treasury_topup_logs` - 国库补充记录

## 🔑 环境变量

```env
BACKEND_PRIVATE_KEY=0x...
TREASURY_PRIVATE_KEY=0x...
STAKING_CONTRACT_ADDRESS=0x...
TREASURY_ADDRESS=0x...
```

## ✅ 完成清单

- [x] 前端交易持久化
- [x] 详细错误提示
- [x] 后端奖励发放
- [x] 国库补充机制
- [x] 监控API
- [x] 数据库表
- [x] 部署文档

所有代码已完成，可直接使用！
