# BSC 主网合约部署对齐清单

每次**重新部署 / 更换合约地址**后，按下列项逐一核对。代码层「单一事实来源」为：

| 位置 | 说明 |
|------|------|
| `backend/src/config/bsc-mainnet-addresses.ts` | TypeScript 常量，后端缺省 fallback |
| `frontend/lib/contracts/addresses.ts` | 前端 `CONTRACT_ADDRESSES`（build 时注入 `NEXT_PUBLIC_*`） |
| `backend/.env` | 生产运行时优先（`database.config` 使用 `override: true` 覆盖 PM2 脏变量） |
| `frontend/.env.local` | 前端 `NEXT_PUBLIC_*`（与上表一致） |
| 仓库根目录 `.env` | Hardhat / 部署脚本引用，**应与主网 Staking/RWA 一致** |

---

## 1. 合约地址（必须一致）

| 角色 | 环境变量（后端示例） | 前端 `NEXT_PUBLIC_*` |
|------|----------------------|----------------------|
| Staking | `STAKING_CONTRACT` / `STAKING_CONTRACT_ADDRESS` | `NEXT_PUBLIC_STAKING_CONTRACT_BSC` |
| RWA Token | `RWA_TOKEN` / `RWA_TOKEN_ADDRESS` | `NEXT_PUBLIC_RWA_TOKEN_BSC` |
| USDT | `USDT_TOKEN` / `USDT_TOKEN_ADDRESS` | `NEXT_PUBLIC_USDT_TOKEN_BSC` |
| 推荐池 | `REFERRAL_REWARD_POOL` / `REFERRAL_REWARD_POOL_ADDRESS` | `NEXT_PUBLIC_REFERRAL_REWARD_POOL_BSC` |
| 团队分红池 | `TEAM_DIVIDEND_POOL_ADDRESS` | `NEXT_PUBLIC_TEAM_DIVIDEND_POOL_BSC` |
| 抽奖 | `LOTTERY_CONTRACT` | `NEXT_PUBLIC_LOTTERY_CONTRACT_BSC` |
| USDT↔RWA Swap | `USDT_RWA_SWAP` | `NEXT_PUBLIC_USDT_RWA_SWAP_BSC` |
| Swap | `SWAP_CONTRACT_ADDRESS` | `NEXT_PUBLIC_SWAP_CONTRACT_BSC` |
| 国库合约 | `TREASURY_CONTRACT_ADDRESS` | `NEXT_PUBLIC_TREASURY_CONTRACT_BSC` |
| stRWA | `STRWA_ADDRESS`（或项目内统一命名） | `NEXT_PUBLIC_ST_RWA_BSC` |
| Pancake Router | `PANCAKE_ROUTER_ADDRESS` | （前端按需，多在脚本/后端） |

**老 RWA（仅迁移提示）**：`NEXT_PUBLIC_LEGACY_RWA_TOKEN_BSC`，勿与新版 RWA 混用。

---

## 2. 链与 RPC

- [ ] `backend/.env`：`CHAIN_ID=56`，`BSC_RPC_URL` 可访问
- [ ] `frontend/.env.local`：`NEXT_PUBLIC_BSC_RPC_URL`（公共节点易限流，生产可换付费 RPC）
- [ ] 中继 / meta-relayer 与主站 **同源 `/api`** 或 `CORS_ORIGIN` 包含前端域名

---

## 3. 索引与区块起点（部署新 Staking 必改）

- [ ] `EVENT_MONITOR_START_BLOCK` / `STAKING_DEPLOY_BLOCK`：**新合约在 BscScan 上的创建块**，过早会扫太多日志，过晚会漏事件
- [ ] 数据库 `stake_events` 等：新合约事件需 **ingest / EventMonitor / TxIngest** 写入，否则前端会退化为 `eth_getLogs`（易触发节点 `limit exceeded`）

---

## 4. 密钥与权限（勿提交 Git）

- [ ] `RELAYER_PRIVATE_KEY`：对应钱包有足够 BNB 付 gas
- [ ] Staking / Token **owner** 与业务预期一致
- [ ] PM2 **勿**在 `dump.pm2` 里残留带 `\r` 的 `DB_HOST`；改 DB 后 `pm2 restart rwa-backend --update-env`

---

## 5. 发布动作

- [ ] 改 `bsc-mainnet-addresses.ts` 与 `addresses.ts` 默认值（若不用 env 覆盖）
- [ ] 同步 `backend/.env`、`frontend/.env.local`、根目录 `.env`
- [ ] `cd frontend && npm run build` → `pm2 restart rwa-frontend`
- [ ] `pm2 restart rwa-backend`（必要时 `--update-env`）

---

## 6. 自动校验命令

在 **`backend` 目录**执行：

```bash
npm run verify-bsc-addresses
# 或: npx ts-node --transpile-only src/scripts/verify-bsc-address-alignment.ts
```

应输出全部 `OK`；若有 `MISMATCH`，按提示改 `.env` 或 canonical 文件。

---

## 7. 刻意保留旧地址的位置（勿当「当前主网」改错）

- `scripts/migration/**`、`LEGACY_STAKING`：历史迁移数据
- `*.backup*`、`.json` 归档：仅作记录
