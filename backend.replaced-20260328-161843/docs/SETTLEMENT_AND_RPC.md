# 每日收益结算与 RPC 要求

## 手动补发（与线上定时任务逻辑一致）

```bash
cd backend
npx ts-node scripts/run-daily-settlement-once.ts
```

补发 **指定北京 8 点日界**（`toTime` = 该日北京时间 08:00，即同日 UTC 00:00；结算区间为 `[toTime-86400, toTime)`）：

```bash
# 按日历日（上海时区日期）
SETTLEMENT_DATE=2025-03-21 npx ts-node scripts/run-daily-settlement-once.ts

# 或显式 Unix 秒（须恰好为上述边界）
SETTLEMENT_TO_UNIX=1742515200 npx ts-node scripts/run-daily-settlement-once.ts
```

`yield_settlements` 里若已有同一 `settlement_time` 会跳过该用户该资产，可安全重跑补漏。**不要**为重复发奖而删除库记录：合约按每次新的 `stakeId` 记账，删库重跑可能导致同一窗口二次上链。

（可将 `package.json` 中 `npm run settlement` 指向上述脚本；若无法保存 `package.json`，直接运行上面命令即可。）

## 补发「缺很多人」时怎么排查

1. **审计人数**（`stake_events` vs `balance_snapshots` vs `users`）：

   ```bash
   npx ts-node scripts/audit-settlement-coverage.ts
   ```

2. **若 `balance_snapshots` 远少于 `stake_events`**：`db` 日结只会处理快照里出现过的地址。先回填再补发：

   ```bash
   npx ts-node scripts/backfill-balance-snapshots-from-stake-events.ts
   DAILY_SETTLEMENT_DATA_SOURCE=db SETTLEMENT_DATE=YYYY-MM-DD npx ts-node scripts/run-daily-settlement-once.ts
   ```

3. **链上还有人但库里完全没有其质押事件**（例如 EventMonitor 曾停机、或只有 USDT 质押未入库）：  
   - 治本：修好 **`BSC_RPC_URL`**（全节点/归档或商业 BSC）、配置 **`STAKING_DEPLOY_BLOCK`**，用 **`DAILY_SETTLEMENT_DATA_SOURCE=chain`** 跑同一 `SETTLEMENT_DATE`（已结过的会跳过）。  
   - 或恢复索引服务，把缺失的 `stake_events` / 快照补进库后再用 `db` 模式。

4. **`No yield` / 未写入 `yield_settlements`**：该用户在结算窗口内按快照积分结果为 0（例如质押时间晚于窗口、或窗口内无有效仓位），属正常；链上 `chain` 与 `db` 模型不一致时结果也可能不同。

## 定时任务「到了点却没跑」的排查

主进程里 `node-cron` 在 **单线程事件循环**上调度；若同一进程内有 **长时间阻塞**（大批量同步、RPC 卡住、重 CPU 同步循环），日志可能出现 **`missed execution`**，**8:00 日结会被跳过**。

缓解：

1. 用 **系统 crontab** 在 8:10 再跑一次 `scripts/run-daily-settlement-once.ts`（`flock` 防重入）；已写入库的同 `settlement_time` 会跳过，不会重复发链上。
2. `db` 模式日结前用 crontab 在 **7:50** 跑 `backfill-balance-snapshots-from-stake-events.ts`，减少「有 `stake_events` 无快照」导致的漏人。
3. 检查 `backend/logs` 目录及轮转文件属主应为运行后端的用户（如 `ubuntu`），否则 **winston 写文件失败**，文件日志会「突然断更」，误以为服务没跑。

## 公共节点限制（当前常见问题）

免费公共 RPC（如部分 `publicnode`）常见：

- **`eth_getLogs`**：`History has been pruned` — 历史日志被修剪
- **`eth_call` @ 历史区块**：`state histories haven't been fully indexed yet` — 历史状态不可用

因此 **链上日结（`DAILY_SETTLEMENT_DATA_SOURCE=chain`，默认）** 需要：

1. **`BSC_RPC_URL`**：尽量使用 **全节点/归档** 或商业 BSC JSON-RPC（支持历史日志与历史状态查询）。
2. **`STAKING_DEPLOY_BLOCK`**：质押合约 **部署区块号**（BscScan → 合约 → Contract Creation），缩小 `getLogs` 扫描范围，减轻限流与修剪问题。
3. 可选 **`STAKING_LOG_SCAN_LOOKBACK`**：未配置部署块时，用 `latest - N` 扫日志；默认逻辑已改为较小窗口（仍建议配置部署块）。

若日志扫描失败，后端会尝试用 **`users` 表地址** 回退，但仍需 RPC 能完成 **`eth_call`（历史区块）** 才能完成收益计算。

## 环境变量速查

| 变量 | 说明 |
|------|------|
| `BSC_RPC_URL` | 主网 JSON-RPC（生产务必可用且稳定） |
| `STAKING_CONTRACT_ADDRESS` | 质押合约 |
| `BACKEND_PRIVATE_KEY` | 调用 `updateUserRewards` 的钱包 |
| `STAKING_DEPLOY_BLOCK` | 合约部署块（强烈建议） |
| `DAILY_SETTLEMENT_DATA_SOURCE` | `chain`（默认）或 `db`（依赖 `balance_snapshots`） |
| `SETTLEMENT_DATE` | 仅手动脚本：补发日界，`YYYY-MM-DD`（上海日历日） |
| `SETTLEMENT_TO_UNIX` | 仅手动脚本：补发 `toTime` Unix 秒（须为北京 8 点边界） |
