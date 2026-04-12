# 知识库与全站页面对照审核报告

**执行日期**：2026-04-13  
**范围**：[`frontend/app`](../../frontend/app) 路由、主要 Client 组件引用的 API、[`frontend/lib/knowledge-data.ts`](../../frontend/lib/knowledge-data.ts) 与 [`frontend/lib/knowledge-content*.ts`](../../frontend/lib/knowledge-content.ts) 多语言正文、与站内统一文案（[`frontend/lib/i18n.ts`](../../frontend/lib/i18n.ts)）及内部机制文档的交叉核对。

---

## 1. 页面—数据源—知识库对照表

| 路由 | 主要组件 / 数据源 | 后端或链上依赖（摘要） | 知识库覆盖（分类 / 备注） |
|------|-------------------|------------------------|---------------------------|
| `/` | `HeroSection`, `HomeBelowFold` | 首页统计可能经 BFF | `getStarted`, `tokenomics`（概念层）；无「首页指标释义」专文 |
| `/stake` | `StakePageClient` | 合约 + 可能 `GET /api/stats/analytics`（池子展示） | `staking`, `deposit` |
| `/swap` | `UnifiedSwapCard` | 合约 DEX | `swap` |
| `/withdraw` | `WithdrawPageV3` | 合约；`POST /api/ingest/tx/:hash` 同步 | `withdraw` |
| `/withdraw-preview` | `WithdrawPageCyber` | 同提现 | `withdraw` |
| `/emergency` | `EmergencyPageClient` | 合约紧急退出 | `withdraw`：`what-is-emergency-withdraw` |
| `/dashboard` | `PortfolioCard`, `EarningsCard`, `FundActivityCard` 等 | `GET /api/v2/portfolio/:addr`, `/api/v2/earnings/:addr`, `/api/data/:addr/stakes`, `/api/history/:addr`, `/api/referral-rewards-detail/:addr` | 无仪表盘专文；散见 `security`（记录/不到账） |
| `/analytics` | `useAnalyticsStats` → `GET /api/stats/analytics` | [`backend` 统计聚合](../../backend/src/routes/analytics-stats.ts)（与路由实现一致） | **无** TVL/曲线/健康度释义；[`tvl-data-verify`](../../frontend/lib/knowledge-data.ts) 偏链上验证非本页 |
| `/market` | `ChartPanel`, `StatsPanel`, `RecentTradesTable` | 图表组件内数据（未见 `/api/` 直连，多为链上/第三方） | **无** K 线、深度、成交量专文 |
| `/nodes` | `NodesPageClient` | 合约 + 展示 | `nodes` |
| `/node/network` | `MyNetworkPageClient` | `GET /api/data/:addr/stake-list`, `withdraw-list` | `nodes`（无「我的网络页」逐步说明） |
| `/referral-network` | `ReferralNetworkPageClient` | 团队视图相关 API | `nodes`, `compare.referral-link-where` |
| `/leaderboard` | 内联 `fetch` | `GET /api/stats/leaderboard?limit=100` | **无** 排行规则、口径说明 |
| `/calculator` | `CalculatorProvider` 等 | 多为前端公式 | `compare.calculator-where` |
| `/lucky` | 多卡片组件 | 链上抽奖 + 站内文案 | `lottery`, `tokenomics.lottery-5-percent-treasury` |
| `/dividend` | `DividendPageClient` | `GET {API_BASE}/api/dividend/user/:addr`, `/api/dividend/pool/status` 等 | `nodes.project-dividend-mechanism`（正文 EN 缺，见 §2） |
| `/governance` | `GovernancePageClient`（静态展示为主） | 无统一 `/api/governance` 聚合 | **无**「治理页各区块含义」；与 `gov.*` 文案需与知识库卖出税一致（见 §3） |
| `/security` | `AuditReports`, `ContractAddresses` 等 | 静态 + 外链 | `security.audit-where`, `fund-safety` |
| `/help` | `HelpPageClient` | 跳转知识库/客服 | 间接 |
| `/knowledge` | `KnowledgePageClient` | `getArticleContent` | 全量 |
| `/chat` | `ChatAppShell` | 独立 chat 服务 + `chatHttpUrl` | **无** 群聊、红包、签名说明 |
| `/chat/admin` | Admin UI | `chatHttpUrl('admin/...')` | 无（运营向，可不进用户知识库） |
| `/crash` | `CrashGameClient` | **前端模拟**（无后端 API） | **无**；与 `/lucky` 非同产品 |
| `/slots` | `SlotMachineClient` | 组件内未见 `fetch`/`/api/`（前端演示向） | **无** |
| `/announcements` | 公告列表 | CMS/静态 | 无专文 |
| `/about`, `/terms`, `/privacy` | 静态/法务 | — | 无专文 |
| `/xxxxxxx` | 占位 | — | 无 |

---

## 2. 知识库键与多语言完整性（机检 + 抽样）

- **文章总数**：[`knowledge-data.ts`](../../frontend/lib/knowledge-data.ts) 中 **79** 条 `article.id`（唯一）。
- **中文完整版**：[`knowledge-content-zh-full.ts`](../../frontend/lib/knowledge-content-zh-full.ts) 覆盖 **全部 79** id。
- **英文合并口径**（`contentEn` 短版 + `knowledge-content-en-full`）：相对 79 篇 id **缺 3 篇**：`yield-calculation`、`referral-quality-score`、`project-dividend-mechanism`（短版与 en-full 均无）。`binance-builtin-browser-issues`、`app-vs-system-browser-diff` 仅在短版 `contentEn` 中已有，合并后无缺口。
- **运行时行为**：[`getArticleContent`](../../frontend/lib/knowledge-content.ts) 在英文缺失时会 **回退到中文** `byLocale.zh[articleId]`。因此 **英文用户打开上述 3 篇文章时会看到中文正文**（严重体验/SEO 问题）。
- **短版英文已覆盖**：`binance-builtin-browser-issues`、`app-vs-system-browser-diff` 在 `contentEn` 中已有，与 en-full「缺 key」机检一致（合并后英文可用）。
- **孤儿条目**：`knowledge-content-zh-full.ts` 中存在 **`yield-calculation-precise`**，**未**出现在 `knowledge-data.ts`，用户界面**永不展示**，属死数据；建议删除或并入 `yield-calculation`。
- **其它语言**（ko/ja/es/fr/pt/ru/ar/hi）：与 en-full 类似，依赖 `withCriticalEnglishFallback` 与 `fallbackEn`；上述 3 篇对非中英用户仍可能落到 **英文或中文** 混合链路，建议统一补全各 `*-full` 或至少在 en-full 补全三篇以统一回退链。

`knowledge.article.*.title/content` 在 [`knowledge-data.ts`](../../frontend/lib/knowledge-data.ts) 中仍为每条文章声明，但 [`KnowledgePageClient`](../../frontend/components/knowledge/knowledge-page-client.tsx) 实际标题/正文来自 **`getArticleContent`**，i18n 键若未与 `knowledge-content` 同步则易形成「双源」；长期建议以 `knowledge-content` 为唯一正文源或生成器校验。

---

## 3. 事实与站内文案冲突（需产品/合约最终确认）

| 主题 | 知识库或某语言表述 | 站内其它来源 | 建议 |
|------|-------------------|--------------|------|
| **RWA 卖出税** | [`rwa-dynamic-sell-tax`](../../frontend/lib/knowledge-content-zh-full.ts)：24h 一次、按持有天数基础税 **最高 4%**、超额 30% 部分附加等 | 治理页 [`protocol-params.tsx`](../../frontend/components/governance/protocol-params.tsx) 展示 **20%**；`i18n` 中英文 `sellTaxWarning` 仍写 **20%**；中文 `gov.sellTax` 写 **动态 8%–30% 默认 10%** | **三方不一致**。需以合约与 `swap`/安全页计算器为准，统一治理卡、警告文案与知识库 |
| **收益结算时刻** | `yield-calculation`（zh-full）：**北京时间 08:00**（等价 **UTC 00:00**） | `i18n`：`UTC 00:00` 多处 | 表述可并存，但需在英文版 `yield-calculation` 中写清 **UTC**，避免仅中文详述 |
| **抽奖随机数** | `lottery-rules`：**如 Chainlink VRF** | [`fairness-proof.tsx`](../../frontend/components/lucky/fairness-proof.tsx) 含 VRF/验证文案 | 若主网实际非 VRF，应改为「以合约与幸运抽奖页公示为准」，避免绝对化 |
| **推荐层级** | `direct-vs-indirect-referral`：**仅一级直推** | 节点体系统计含团队多代 volume；**级差**与 **直推绑定一级** 需区分 | 建议在文首明确：「绑定关系一级」与「团队业绩多级」并存，减少误解 |
| **法语入门教程** | [`knowledge-content-fr-full.ts`](../../frontend/lib/knowledge-content-fr-full.ts) 含 **交易所 KYC** 逐步说明 | 其它语言侧重链上自管钱包 | 属**本地化漂移**；若产品无 KYC 流程，应删改与其它语言对齐 |

---

## 4. 建议新增 / 强化的知识主题（优先级）

**高（客服高频 / 与现有页强相关）**

1. **stRWA**：转账、与 RWA 互换、120% 与 30 天锁、是否可提前解锁（与 [`KNOWLEDGE_BASE_SUGGESTIONS.md`](../../KNOWLEDGE_BASE_SUGGESTIONS.md) 一致；部分已分散在 `staking`/`withdraw`，可收束成 1～2 篇 FAQ）。
2. **数据分析页 `/analytics`**：TVL 定义、`/api/stats/analytics` 口径、健康度与节点分布只读含义。
3. **市场页 `/market`**：K 线/深度/成交量模块说明、价格来源（DEX/预言机）。
4. **费用总览**：Gas、立即退出 8%、stRWA 0%、卖出税（待数值统一后写死一版）。

**中**

5. **治理页 `/governance`**：Timelock、国库卡片、多签与链上核验入口说明（与 `security` 互补）。
6. **项目分红页 `/dividend`**：与 `GET /api/dividend/...` 行为一致的用户说明（claim、周期、链切换）。
7. **排行榜 `/leaderboard`**：`/api/stats/leaderboard` 排序字段、是否含历史、隐私提示。

**低 / 视产品路线**

8. **群聊 `/chat`**：Web3 签名、只读/发言、红包与托管授权（BSC）提示。
9. **`/crash`、`/slots`**：若为正式链上游戏再写规则；当前 crash 为前端演示则应避免在知识库写成真实资金游戏。

---

## 5. 与后端一致性结论

- 用户可见知识库**不调用**后端 API；声称「某页展示某数据」时，应与实际上下文一致（见 §1）。
- **节点 / 团队计算** 内部文档已在 [`knowledge-base-check-report.md`](./knowledge-base-check-report.md) 与 `REWARD_MECHANISM_*.md` 对齐；**前端知识库**需在「推荐一级 vs 团队多级业绩」等处避免过度简化（§3）。
- **analytics / leaderboard / dividend** 等已存在 Express 路由；知识库缺文不会造成 API 矛盾，但会造成**用户预期与页面能力脱节**。

---

## 6. 建议的后续工程动作（非本次提交范围）

1. 在 [`knowledge-content-en-full.ts`](../../frontend/lib/knowledge-content-en-full.ts)（及需支持的 locale）**补全** `yield-calculation`、`referral-quality-score`、`project-dividend-mechanism` 的英文全文，或从 zh-full 翻译并校对数字。  
2. 删除或合并 **`yield-calculation-precise`**。  
3. 由合约/产品负责人裁定 **卖出税** 展示数字后，批量更新：治理页、`i18n` `gov.*` / `sellTaxWarning`、`rwa-dynamic-sell-tax` 全文。  
4. 修订 **法语** 入门长文与其它语言对齐。  
5. 按 §4 新增文章并在 [`knowledge-data.ts`](../../frontend/lib/knowledge-data.ts) 注册 id。

---

## 7. 已对齐项（摘要）

- 最低质押 **100 USDT**、静态 **0.8%/日**、50/50 模型、立即退出 **8%** 及拆分、stRWA **120%** + **30 天**锁、抽奖 **5%** 国库与 **48/24/14/9** 奖级等，在 `i18n` 帮助问答与中文知识库多篇中**一致**。  
- **BSC Chain ID 56**、钱包连接流程、Gas 需 BNB 等与 `getStarted` 类文章一致。  
- **节点升级条件表**与内部奖励机制文档方向一致（具体数值以页面/合约为准）。

---

*本报告由对照计划自动生成核查清单后整理；链上参数以部署合约为最终依据。*
