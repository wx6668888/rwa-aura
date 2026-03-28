# 全量重新部署 + 链上迁移 — 任务清单（保存版）

> 与新域名 **rwa.lat** 上线可配合使用：先完成本清单中的部署与迁移，再切换 `NEXT_PUBLIC_APP_URL` 等配置。

## 一、四个地址分工（备忘）

| 角色 | 地址 | 用途 |
|------|------|------|
| **Owner** | `0xE31CDaE32c783B9e3acF8e1C166617D5D005f844` | 合约 owner：参数、迁移窗口、`pause`、`setBackendAddress` / `setBuybackAddress` 等。**私钥不进服务器、不进 Git。** |
| **Backend + Relayer** | `0x36d6181f294f60EE9b94Ce58F28A4F769048C8be` | `StakingContract` 构造函数 `_backendAddress`；服务端 `RELAYER_PRIVATE_KEY` / `BACKEND_PRIVATE_KEY`（PM2/systemd 注入）。**少量 BNB。** |
| **Treasury** | `0xAC5F213c24E9dFa044D0eb82BD95Ae63A09a1F28` | `_treasuryAddress`（不可变）；费用与流动性相关。建议冷钱包/多签。 |
| **Buyback** | `0xEf2095a41Abeb6B09840DE780aDA42d4a2E02013` | `setBuybackAddress`；提现等费用中 buyback 部分 USDT 收款地址。 |

## 二、部署前准备

- [ ] Owner / Treasury：硬件钱包或离线签名；Relayer：仅运行环境注入私钥。
- [ ] BNB：部署 + relayer gas；按模型准备 USDT/RWA 转入新合约/国库。
- [ ] 记录**当前生产**合约地址（迁移源），例如质押 `0xED24C652266674beF1514a671263b78628ec766e` 及 `frontend/.env.local`、`backend/.env` 中全部合约变量。
- [ ] 数据库全量备份（`stake_events`、`withdrawal_events`、`referral_bindings` 等）。
- [ ] 主网 RPC 稳定（归档节点更利于对账与扫块）。

## 三、部署新套合约

按仓库脚本执行（如 `scripts/deploy-full-protocol-bscmainnet.ts` / `contracts/deploy-mainnet.js`），顺序以脚本为准，通常包括：

- [ ] RWA（及 Permit 版如需）
- [ ] stRWA
- [ ] ReferralRewardPool、TeamDividendPool、Lottery、TreasuryContract、Swap、USDTRWASwap 等
- [ ] **StakingContract** 构造：`treasury` = `0xAC5F...`，`backend` = `0x36d6...`
- [ ] Owner 配置：`setReferralRewardPool`、`setStRWAToken`、`setBuybackAddress(0xEf20...)` 等
- [ ] （可选）BSCScan 验证

## 四、链上迁移（旧 → 新）

**源**：`LEGACY_STAKING`（当前线上质押合约）。  
**目标**：`NEW_STAKING`（新部署地址）。

- [ ] `npx ts-node scripts/migration/01b-list-stakers-from-db.ts` → `out/stakers.json`
- [ ] `npx ts-node scripts/migration/02-export-all-bundles.ts`（设 `LEGACY_STAKING`）→ `out/bundles/*.json`
- [ ] `npx ts-node scripts/migration/02b-merge-referrers-from-db.ts`（DB `referral_bindings` 覆盖 referrer）
- [ ] 对账：抽样 + 关键指标（锁仓、到期时间、flex、referrer）
- [ ] `npx ts-node scripts/migration/00-prep-new-staking-migration.ts`（`NEW_STAKING` + owner 私钥）：`migrationEnabled` + `migrationSetStakesCounter`
- [ ] `npx ts-node scripts/migration/03-import-bundles.ts`（分批、`SLEEP_MS`）
- [ ] 再次对账；确认新合约 USDT/RWA 余额与负债一致
- [ ] `npx ts-node scripts/migration/04-close-migration.ts`

## 五、应用切换

- [ ] `backend/.env`：所有 `STAKING_*`、`RWA_*`、池子、Swap 等改为新地址；私钥仅运行环境。
- [ ] `frontend/.env.local` / 构建变量：全部 `NEXT_PUBLIC_*` 对齐；`NEXT_PUBLIC_APP_URL=https://rwa.lat`（或正式子域）。
- [ ] 前端 `npm run build` 部署；`pm2 restart rwa-backend`（及 relayer 如有独立进程）。
- [ ] 烟雾测试：gasless 质押、dashboard、ingest、提现入口抽样。

## 六、收尾

- [ ] 旧合约：暂停新质押或公告迁移完成。
- [ ] 轮换曾泄露渠道中的私钥；Owner ≠ Relayer。
- [ ] 内网存档新地址表（不含私钥）。

---

脚本与字段说明见 `scripts/migration/README`（若存在）或各 `scripts/migration/0*.ts` 文件头注释。
