# RWA Protocol 前端与后端业务逻辑检查报告

> 从 DeFi 从业者视角对前端页面、后端 API、业务逻辑与数据一致性的全面检查与改进建议。

---

## 一、已修复的问题（本次修改）

### 1. 后端 API 与数据库字段不一致

| 位置 | 问题 | 修复 |
|------|------|------|
| `GET /api/rewards/:address` | 返回 `fromAddress` 时使用了不存在的 `reward.from_address` | 改为 `reward.from_user ?? null`（与 `rewards` 表字段一致） |
| `GET /api/level-history/:address` | 使用了表中不存在的 `direct_referrals_count`、`max_department_volume`、`tx_hash` | 使用 `direct_v_count` 映射为 `directReferralsCount`；`maxDepartmentVolume`/`txHash` 做兼容处理（无列则返回 0/null） |
| `GET /api/referrals/:address` | 团队统计 SQL 使用错误列名 `rr.descendant`、`rr.ancestor` | 改为 `rr.user_address`、`rr.ancestor_address`，并修正 `SUM(total_staked)` 为 `SUM(u.total_staked)` |

以上修改保证后端与当前 `database.sql` 表结构一致，避免 500 或错误数据。

---

## 二、前端页面与路由梳理

### 2.1 导航栏中的页面（均有对应路由）

| 分组 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 落地页 |
| 我的资产 | `/dashboard` | 仪表板（组合、收益、活动、节点） |
| | `/stake` | 质押（USDT/RWA、锁仓期、推荐人） |
| | `/withdraw` | 提现（RWA 收益、本金、stRWA 解锁、USDT 收益、投资份额） |
| 交易市场 | `/market` | 行情（价格、K 线、深度、成交） |
| | `/swap` | USDT/RWA 兑换 |
| | `/emergency` | 紧急赎回（锁仓期内 USDT 本金） |
| 抽奖 | `/lucky` | 彩票/奖池 |
| 更多 | `/analytics` | 数据分析 |
| | `/calculator` | 收益计算器 |
| | `/nodes` | 节点/推荐网络 |
| | `/governance` | 治理 |
| | `/security` | 安全/审计 |
| | `/announcements` | 公告列表 |
| | `/knowledge` | 知识库 |
| | `/about` | 关于 |

### 2.2 未在主导航中但存在的页面

- `/terms`、`/privacy`、`/help`：建议在页脚或「关于/帮助」中保留入口，便于合规与用户支持。
- `/admin/*`：管理后台（数据库、节点、交易、用户、设置、链上等），不应暴露在主导航，当前处理合理。

---

## 三、业务逻辑与数据流检查

### 3.1 质押流程（Stake）

- **逻辑**：支持 USDT 与 RWA 双资产质押、锁仓期（灵活/30/90/180/365 天）、推荐人绑定、有效用户门槛（100 USDT 等值）。
- **前后端**：前端通过 `useStakingContract` 与合约交互；后端 `EventMonitor` 监听 `StakeEvent`/`RWAStakeEvent` 写入 `stakes` 表并更新 `users`/`rwa_stakes` 等。
- **建议**：
  - 锁仓期与收益率倍数（如 1.0/1.3/1.6/2.0/2.5）需与合约及后端配置一致，建议从后端或合约读取一份“权威配置”，前端仅展示。
  - 有效用户阈值（如 100 USDT）若会调整，建议走配置或合约，避免前端硬编码。

### 3.2 提现流程（Withdraw）

- **逻辑**：RWA 收益领取、USDT/RWA 本金领取（含锁仓/灵活）、stRWA 解锁、USDT 动态收益、投资份额相关操作。
- **前后端**：多张卡片对应不同合约/后端逻辑，结构清晰；交易状态通过 `TxOverlay` 统一展示。
- **建议**：各卡片依赖的“可提数量”若部分来自后端（如历史收益汇总），需与链上可领取额做一致性校验或明确标注数据来源（链上/链下）。

### 3.3 紧急赎回（Emergency）

- **逻辑**：仅针对**未到期**的 USDT 锁仓本金，扣除部分收益后赎回；需勾选风险提示并输入确认词。
- **建议**：确认词与多语言一致（当前使用 `t('emergency.confirmWord')` 合理）；若合约支持，可考虑在 UI 展示“扣除收益/手续费”的试算，与 `getEmergencyWithdrawPreview` 一致。

### 3.4 兑换（Swap）

- **逻辑**：USDT ⇄ RWA，依赖报价（`useSwapQuote`）与 RWA 价格（`useRwaPrice`）；报价失败时使用本地 mock（基于价格估算）。
- **建议**：
  - 滑点、最小输出等与合约/路由一致；Settings 按钮若未实现，可先隐藏或标注“即将推出”。
  - RWA 价格建议统一从后端 `/api/price/rwa` 或合约获取，避免多处写死 0.85。

### 3.5 价格与行情（Price / Market）

- **现状**：
  - 后端 `PriceOracleService` 从 PancakeSwap 取价并写入 **Redis**；`GET /api/price/rwa` 当前从 **system_config.last_rwa_price** 读取，该键若未由其他服务写入，则接口可能 404 或长期不更新。
  - 行情页的 K 线、深度、成交等由 `MarketDataService` **模拟数据** 生成，非真实链上/交易所数据。
- **建议**：
  1. **价格**：二选一或同时做——（A）定时任务在刷新 Redis 后同步写入 `system_config.last_rwa_price`；或（B）在 `/api/price/rwa` 中优先查 Redis，无则再查 `system_config`，保证前端 `useRwaPrice` 能拿到最新价。
  2. **行情**：在文档或 UI 上标明“模拟数据”；若后续接入真实 DEX/CEX，再替换 `MarketDataService` 实现。

### 3.6 抽奖（Lucky）

- **逻辑**：奖池、购票、我的票据、开奖时间与规则等；依赖彩票合约与后端（若有）开奖/结算。
- **建议**：奖池金额、中奖规则、开奖时间需与合约强一致；若有后台控制“开奖”的流程，需做权限与安全审计。

### 3.7 节点与推荐（Nodes）

- **逻辑**：推荐网络、等级、团队统计、部门业绩等；后端 `/api/referrals/:address`、`/api/level-history/:address` 提供数据。
- **建议**：团队统计已按 `referral_relations` 修正列名；等级历史中 `maxDepartmentVolume` 若需历史快照，可考虑在节点升级时写入 `node_level_history` 或单独表，当前 API 对缺失列做了兼容。

### 3.8 仪表板（Dashboard）

- **逻辑**：组合、收益、投资份额、复投、统计卡片、活动表、节点等级说明；部分数据来自链上，部分可来自后端 API（如 `/api/user/:address`、`/api/stats/global`）。
- **建议**：明确各卡片数据来源（链上 vs 后端），避免同一指标两处计算不一致；若后端为“缓存/汇总”，建议标注“约”或“截至某时”。

---

## 四、后端服务与数据一致性

### 4.1 已发现的设计点

| 项目 | 说明 |
|------|------|
| RewardEngine | 当前在 `index.ts` 中注释掉，未参与自动发奖；仅依赖 EventMonitor 与链上事件。若未来启用，需补全配置（ABI、钱包等）并做安全与额度限制审计。 |
| 价格来源 | 见 3.5：需统一价格出口（Redis 或 system_config），并让前端唯一依赖 `/api/price/rwa` 或明确回退逻辑。 |
| rewards 表 | 无 `tx_hash` 列；API 返回的 `txHash` 为 undefined/null，前端若仅展示可接受，若做链上跳转需考虑从关联的 stake 或事件取 tx_hash。 |

### 4.2 数据库与 API 对齐情况（修复后）

- `users`、`stakes`、`rewards`、`referral_ relations`、`node_level_history`、`department_volumes`、`rwa_stakes`、`rwa_locked_principals` 等与当前 API 使用字段已对齐或已做兼容处理。
- `GET /api/stats/global` 同时查 `users` 与 `rwa_stakes`，区分“USDT 体系统计”与“RWA 质押统计”，逻辑清晰。

---

## 五、模块与页面增删建议

### 5.1 建议保留并强化的模块

- **Stake / Withdraw / Emergency**：核心资金流，保持与合约、后端事件一致即可。
- **Dashboard**：用户总览入口，建议统一数据源与刷新策略。
- **Nodes / Referrals**：与推荐、等级、团队业绩强相关，已修复 API，可保留并加强“部门/等级”说明。
- **Swap**：若产品定位需要 USDT/RWA 兑换，保留；并建议报价与价格统一走后端或合约。
- **Knowledge / Announcements**：有利于合规与用户教育，建议保留并维护多语言与版本。

### 5.2 建议优化或明确定位的模块

- **Market**：当前为模拟数据，建议在页面上标注“演示/模拟”，或规划接入真实行情源。
- **Analytics / Calculator**：若与仪表板、质押收益重复，可考虑合并到 Dashboard 或 Calculator 单一入口，避免信息分散。
- **Governance / Security**：多为说明与审计报告展示，建议内容与路由一致，并定期更新。

### 5.3 可考虑的增强（非必须）

- **历史记录与导出**：在 Dashboard 或独立“历史”页提供质押/提现/收益记录，并支持导出 CSV，便于用户对账与税务。
- **通知与提醒**：锁仓到期、可领取收益超过阈值等，可通过邮件/站内/推送（若具备）提醒。
- **风控与限额**：单笔/单日提现限额、大额延迟到账等，需与合约与运营策略一致并在前端提示。

### 5.4 不建议删除的页面

- **Terms / Privacy / Help**：合规与用户支持需要，建议保留并在页脚或关于页提供入口。
- **Admin**：仅限内部使用，不放入主导航即可。

---

## 六、总结

1. **已修复**：后端 `/api/rewards`、`/api/level-history`、`/api/referrals` 与数据库字段及表结构不一致问题，避免报错与错误统计。
2. **价格与行情**：统一 RWA 价格出口（Redis ↔ system_config 或 API 回退）；行情页明确标注模拟数据或后续接入真实数据。
3. **业务逻辑**：质押/提现/紧急赎回/兑换与合约、后端事件、配置保持一致；仪表板与节点数据源明确，避免双源不一致。
4. **模块**：核心资金与推荐模块保留并强化；Market/Analytics/Calculator 等可优化定位或合并；Terms/Privacy/Help 保留并露出入口。

按上述建议逐步落实后，前后端逻辑会更清晰、数据一致性与可维护性会更好，更符合 DeFi 产品对准确性与透明度的要求。
