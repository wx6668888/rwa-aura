# 直推奖励系统部署指南

## 步骤1：创建数据库表

```bash
# 连接到MySQL
mysql -u root -p

# 执行SQL文件
source E:/MyRWA_Project/rwa aura/database/create_referral_tables.sql
```

或者手动执行：
```sql
USE rwa_protocol;
-- 然后复制 create_referral_tables.sql 的内容执行
```

## 步骤2：安装依赖

```bash
cd "E:\MyRWA_Project\rwa aura\backend"
npm install node-cron
npm install --save-dev @types/node-cron
```

## 步骤3：配置环境变量

在 `.env` 文件中添加数据库配置：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=rwa_user
DB_PASSWORD=your_password
DB_NAME=rwa_protocol
```

## 步骤4：集成到主服务

在 `src/index.ts` 或主入口文件中添加：
```typescript
import { initReferralRewardSystem } from './initReferralSystem';

// 在服务启动后调用
initReferralRewardSystem(
    process.env.BSC_TESTNET_RPC_URL!,
    process.env.STAKING_CONTRACT!,
    stakingContractABI
);
```

## 步骤5：启动服务

```bash
npm run dev
```

## 验证

查看日志应该看到：
- ✅ Referral reward listener started
- ✅ Referral reward scheduler started
- ✅ Referral reward system initialized successfully

## 测试

手动触发结算：
```typescript
const scheduler = new ReferralRewardScheduler();
await scheduler.triggerManually();
```
