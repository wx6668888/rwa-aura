# 快速执行指南

## 步骤1：执行SQL创建表

打开命令行，执行：

```bash
E:\Bin\mysql.exe -u root -p < "E:\MyRWA_Project\rwa aura\database\setup_referral_tables.sql"
```

输入MySQL密码后，表会自动创建。

## 步骤2：验证表是否创建成功

```bash
E:\Bin\mysql.exe -u root -p -e "USE rwa_protocol; SHOW TABLES LIKE '%referral%';"
```

应该看到：
- direct_referral_rewards
- referral_settlement_batches

## 步骤3：启动后端服务

```bash
cd "E:\MyRWA_Project\rwa aura\backend"
npm run dev
```

## 预期日志

```
✅ Database connected
✅ Event monitor started
✅ Scheduler started
✅ Referral reward listener started
✅ Referral reward system started
🚀 Backend service is running
```

完成！系统已就绪。
