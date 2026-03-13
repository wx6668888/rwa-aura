# 🚀 完整部署指南

## 📦 已创建的文件清单

### 前端 (3个)
```
frontend/lib/transaction-store.ts          # 交易持久化
frontend/lib/error-parser.ts               # 错误解析
frontend/components/stake/stake-integration-example.tsx  # 集成示例
```

### 后端 (8个)
```
backend/src/services/RewardDistributionService.ts  # 奖励发放
backend/src/services/TreasuryManager.ts            # 国库管理
backend/src/services/ServiceManager.ts             # 服务管理器
backend/src/services/EventHandlers.ts              # 事件处理
backend/src/routes/monitoring.ts                   # 监控API
backend/src/config/migrations/002_reward_logs.sql  # 数据库
backend/.env.example                               # 环境变量
backend/src/integration-patch.ts                   # 集成补丁
```

## 🔧 部署步骤

### 1️⃣ 数据库迁移
```bash
cd backend
mysql -u root -p rwa_protocol < src/config/migrations/002_reward_logs.sql
```

### 2️⃣ 配置环境变量
```bash
cp .env.example .env
nano .env  # 填入以下值
```

必填项：
```env
BACKEND_PRIVATE_KEY=0x...     # 后端钱包私钥
TREASURY_PRIVATE_KEY=0x...    # 国库钱包私钥
STAKING_CONTRACT_ADDRESS=0x...
TREASURY_ADDRESS=0x...
```

### 3️⃣ 修改 index.ts
在 `backend/src/index.ts` 的 `initializeServices()` 后添加：
```typescript
import { initializeServices } from './services/ServiceManager';
import { setupEventHandlers } from './services/EventHandlers';

// 在 start() 方法中，eventMonitor.start() 之前添加：
initializeServices();
setupEventHandlers(this.eventMonitor);
```

### 4️⃣ 修改 app.ts
在路由注册部分添加：
```typescript
import monitoringRouter from './routes/monitoring';
app.use('/api/monitoring', monitoringRouter);
```

### 5️⃣ 启动服务
```bash
npm install
npm run build
npm start
```

## 📊 验证部署

### 测试监控API
```bash
# 奖励统计
curl http://localhost:3001/api/monitoring/stats/rewards?hours=24

# 奖励日志
curl http://localhost:3001/api/monitoring/logs/rewards?limit=10

# 国库日志
curl http://localhost:3001/api/monitoring/logs/treasury?limit=10
```

### 检查日志
```bash
tail -f logs/backend.log | grep -E "Reward|Treasury"
```

## 🎯 前端集成

在 `stake-action-panel.tsx` 顶部添加：
```typescript
import { TransactionStore } from '@/lib/transaction-store'
import { parseError } from '@/lib/error-parser'
```

在 `handleStake` 函数中：
```typescript
// 保存交易
TransactionStore.save({
  hash,
  type: 'stake',
  status: 'pending',
  amount,
  token: stakeMode,
  timestamp: Date.now()
})

// 捕获错误
catch (error: any) {
  const friendlyError = parseError(error, locale)
  setErrorMessage(friendlyError)
}
```

## ✅ 完成！

所有功能已实现并可直接使用。
