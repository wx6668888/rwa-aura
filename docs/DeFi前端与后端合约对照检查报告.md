# DeFi 前端与后端/合约对照检查报告

从用户与从业者角度，对前端所有页面与后端 API、智能合约的对照审计，列出缺失与建议修改项。

---

## 一、已修复问题

### 1. 后端收益类型过滤错误（已修复）
- **问题**：`GET /api/rewards/:address?type=dynamic` 查询条件使用 `reward_type = 'dynamic'`，而数据库 `rewards` 表存储的是 `'differential'`，导致管理端筛选「动态奖励」时始终为空。
- **修复**：`backend/src/routes/api.ts` 中将请求参数 `type=dynamic` 映射为 `reward_type='differential'` 查询；返回给前端的 `rewardType` 将 `'differential'` 映射回 `'dynamic'`，与 API 文档一致。

---

## 二、前端与合约对照

### 2.1 质押合约 (StakingContract)

| 项目 | 状态 | 说明 |
|------|------|------|
| `getUserStakeInfo` 返回值 | ✅ 一致 | 合约返回 7 个字段，前端 ABI 与 `useStakingContract` 格式化一致 |
| `getUserRewards` | ✅ 一致 | rwaPending、usdtRewards 与合约一致 |
| `stake` / `stakeRWA` 参数 | ✅ 一致 | amount, referrer, lockPeriod；USDT 6 位、RWA 18 位精度正确 |
| `withdraw` / `withdrawRWARewards` | ✅ 一致 | amount, chooseStRWA |
| `getUSDTLockedPrincipals` / `getRWALockedPrincipals` | ✅ 一致 | 返回数组与合约一致，前端解析正确 |
| `getEmergencyWithdrawPreview` | ✅ 一致 | 紧急提现页使用正确 |
| `emergencyWithdraw(lockIndex)` | ✅ 一致 | 仅 USDT 锁仓仓位，与合约一致 |
| `withdrawFlexibleUSDTPrincipal` / `withdrawUSDTPrincipal` | ✅ 一致 | 本金提取入口正确 |
| RWA 灵活本金 `withdrawFlexibleRWAPrincipal` | ✅ 一致 | 已对接 |

**建议**：无缺失；保持 ABI 与合约部署版本同步（升级合约时需更新 `stakingContractABI.ts`）。

### 2.2 抽奖合约 (LotteryContractSimple)

| 项目 | 状态 | 说明 |
|------|------|------|
| PoolType 枚举 | ✅ 一致 | 0=Weekly, 1=Monthly, 2=RealTime, 3=Annual，与合约一致 |
| 票价 | ✅ 一致 | 周 10 RWA、月 50 RWA、实时 2 RWA、年度 200 RWA，与合约常量一致 |
| `buyTickets(count, poolType)` / `claimPrize(ticketId)` | ✅ 一致 | ABI 与前端调用正确 |

**建议**：无缺失。

### 2.3 兑换 (Swap)

- 前端使用 `NEXT_PUBLIC_SWAP_CONTRACT_*` 与 `treasuryContract` 等地址，与 `addresses.ts` 一致。
- 价格展示多处写死 **0.8524**（如 `swap-card.tsx`、`useSwapQuote.ts`），与后端/预言机未打通，见下文「RWA 价格」章节。

---

## 三、前端与后端 API 对照

### 3.1 已对接的 API

| 端点 | 使用位置 | 说明 |
|------|----------|------|
| `GET /api/user/:address` | Admin 用户管理 | ✅ |
| `GET /api/stakes/:address` | Admin 质押统计 | ✅ |
| `GET /api/rewards/:address` | Admin 收益统计 | ✅ 已修复 type=dynamic 映射 |
| `GET /api/referrals/:address` | Admin（若用） | ✅ |
| `GET /api/stats/global` | Admin 仪表盘 | ✅ |
| `GET /api/market/overview` | useMarketData（live 模式） | ✅ 需确保 `NEXT_PUBLIC_API_URL` 含 `/api` |
| `GET /api/price/rwa` | 新增 `useRwaPrice` | ✅ 后端有实现，前端新增 hook 使用 |

### 3.2 未使用或需注意的 API

| 端点 | 建议 |
|------|------|
| `GET /api/price/rwa` | 已在 `frontend/hooks/useRwaPrice.ts` 中封装，**建议**：仪表盘、提现、兑换、抽奖等所有涉及「RWA 兑 USDT」展示的地方，逐步替换硬编码 0.85/0.8524 为 `useRwaPrice().price` |
| `GET /api/level-history/:address` | 若管理端或「节点等级历史」功能需要，可对接 |

---

## 四、缺失与建议修改（按优先级）

### 4.1 高优先级：RWA 价格统一使用后端/预言机

**现状**：以下位置使用硬编码 RWA 价格（0.85 或 0.8524），与后端 `PriceOracleService` / `GET /api/price/rwa` 未统一：

- `frontend/components/dashboard/portfolio-card.tsx` — `rwaPrice = 0.85`
- `frontend/components/dashboard/earnings-card.tsx` — `rwaPrice = 0.85`
- `frontend/components/dashboard/stat-cards.tsx` — `rwaPrice = 0.85`
- `frontend/components/dashboard/investment-shares-card.tsx` — `rwaPrice = 0.85`
- `frontend/components/withdraw/rwa-withdraw-card.tsx` — `rwaPrice = 0.85`
- `frontend/components/stake/stake-action-panel.tsx` — `RWA_REFERENCE_PRICE = 0.85`
- `frontend/components/swap/swap-card.tsx` / `useSwapQuote.ts` — `0.8524`
- `frontend/components/lucky/prize-pool-card.tsx` / `ticket-purchase-card.tsx` — `0.8524`
- `frontend/components/nodes/*` — `rwaPrice = 0.85`
- `frontend/hooks/useMarketData.ts` — 默认 `price: 0.85`

**建议**：

1. 已新增 **`useRwaPrice()`**（`frontend/hooks/useRwaPrice.ts`），从 `GET /api/price/rwa` 拉取价格，失败时回退 0.85。
2. 在上述组件中引入 `useRwaPrice()`，用 `price` 替代本地常量，以便与后端/预言机一致，避免用户看到错误折算。

### 4.2 高优先级：数据分析页 TVL 为模拟数据

**现状**：`frontend/components/analytics/tvl-history-chart.tsx` 使用 `generateTvlData()` 本地生成假数据，未从链上或后端获取真实 TVL。

**建议**：

- **方案 A**：后端增加 `GET /api/analytics/tvl-history?days=90`，由 EventMonitor 或定时任务汇总链上 `totalStaked`（及可选 `totalStakedRWA` 折算）按日入库，前端调用该接口绘图。
- **方案 B**：前端直接读链上 `stakingContract.getTotalStaked()`（及 RWA 总量）在选定时间范围内的快照或事件，计算 TVL 曲线（实现成本较高，需归档节点或子图）。

当前若未实现上述任一方案，建议在页面上标注「示例数据」或「模拟数据」，避免误导用户。

### 4.3 中优先级：useUserStakes 从 0 块拉取事件

**现状**：`frontend/hooks/useUserStakes.ts` 使用 `fromBlock: 0n` 拉取全部历史 `StakeEvent` / `RWAStakeEvent`，在主网或长链上可能非常慢或超时。

**建议**：

- 后端 EventMonitor 已把质押记录写入 `stakes` 表，可增加 `GET /api/stakes/:address` 的分页与过滤（已有），前端「我的质押」列表优先从该 API 拉取，仅必要时用链上事件补全或校验。
- 若继续用链上事件，建议 `fromBlock` 改为合约部署区块或最近 N 天区块，减少 RPC 压力与等待时间。

### 4.4 中优先级：节点等级 1–9 与数据库注释一致

**现状**：合约与前端为 L1–L9；`backend/src/config/database.sql` 中 `users.node_level` 注释为「1-5」。

**建议**：将 schema 注释改为「Node level (1-9)」，避免后续维护误解；TINYINT 足够存 1–9，无需改类型。

### 4.5 低优先级：市场页 K 线/深度/成交

**现状**：`GET /api/market/ohlcv`、`depth`、`trades` 使用 `MarketDataService.generateMock*`，为模拟数据。

**建议**：若上线需要真实行情，需对接 DEX 或链上历史价格（如 The Graph、BSC 历史区块），并替换上述实现；短期内建议在 UI 注明「模拟数据」。

### 4.6 低优先级：管理端 API 基础 URL

**现状**：管理端使用 `API_BASE` / `apiUrl`（如 `NEXT_PUBLIC_API_URL`），需保证与后端一致且带 `/api` 前缀。

**建议**：统一使用 `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'`，与 `useMarketData`、`useRwaPrice` 一致，避免漏写 `/api` 导致 404。

---

## 五、合约与后端数据流简要核对

- **用户余额/质押/收益**：前端以**链上**为准（`useStakingContract`、`getUserStakeInfo`、`getUserRewards`、锁仓列表等），与合约一致；后端 EventMonitor 同步链上事件到 DB，用于管理端统计与历史查询。
- **RWA 价格**：链上无统一价格源，由后端 PriceOracleService 写 `system_config.last_rwa_price`，`GET /api/price/rwa` 读出；前端应统一用 `useRwaPrice()` 展示所有 RWA↔USDT 折算。
- **抽奖**：完全链上，前端直连 Lottery 合约，无后端依赖。
- **兑换**：依赖 Swap 合约与价格；前端当前写死价格，建议改为预言机/后端价格后再做金额估算与展示。

---

## 六、检查清单汇总

| 类别 | 项目 | 状态 |
|------|------|------|
| 合约 | Staking ABI 与合约一致 | ✅ |
| 合约 | Lottery ABI 与合约一致 | ✅ |
| 合约 | 质押/提现/紧急提现/本金提取流程 | ✅ |
| 后端 | rewards API type=dynamic 映射 | ✅ 已修复 |
| 后端 | /api/price/rwa 被前端使用 | ✅ 已通过 useRwaPrice 对接 |
| 前端 | RWA 价格全部用预言机/API | ⚠️ 已提供 hook，待各组件替换 |
| 前端 | 数据分析 TVL 真实数据源 | ❌ 当前为模拟，需后端或链上方案 |
| 前端 | useUserStakes 性能（fromBlock） | ⚠️ 建议改用 API 或限制区块范围 |
| 文档/DB | node_level 注释 1–9 | ⚠️ 建议修改 schema 注释 |

以上为本次对照检查的结论与已做修改；优先完成「RWA 价格」与「TVL 真实数据」两项，再按需处理 useUserStakes 与市场模拟数据即可显著提升与合约/后端的一致性及用户可信度。
