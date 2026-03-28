# RWA 协议 — 面向用户的详细说明（基于当前仓库源码）

> **文档性质**：本文档依据仓库内智能合约（以 `contracts/StakingContract.sol` 为主）、`ReferralRewardPool.sol`、`TeamDividendPool.sol`、前端 `frontend/` 与后端 `backend/src/routes/relayer.ts`、`unified-data.ts` 等实现整理，用于帮助终端用户理解产品逻辑与参数。  
> **地址与部署**：链上合约地址随部署变更，**以下不写死具体 0x 地址**；请您始终以 **官网公示**、钱包内展示及 **BscScan** 核验为准。若代码注释与前端文案不一致，**以链上合约实际行为为准**。  
> **风险与合规**：数字资产存在价格波动与智能合约风险；本文不构成投资建议或收益保证。

---

## 一、运行环境与您需要准备什么

本协议的前端与合约部署在 **BNB Smart Chain（BSC）主网**（链 ID 一般为 **56**）。您需要：

1. **支持 BSC 的 Web3 钱包**（如 MetaMask 等），并自行妥善备份 **助记词或私钥**。协议不会在链下向您索要私钥。  
2. **网络切换至 BSC 主网**，否则无法与合约交互。  
3. **Gas（BNB）**：多数链上操作仍需某一方支付 BNB。产品提供 **「免 Gas / 代付」** 能力时，由**中继服务**替您支付 BNB，但您仍需 **连接钱包并对消息签名**（见后文「Gasless 流程」）。  
4. **代币**：  
   - **USDT** 在 BSC 上一般为 **6 位小数**。  
   - **RWA** 在本协议内按 **18 位小数** 与合约内部记账一致。  
5. **代币授权（Approve / Permit）**：首次使用或提高额度时，合约或路由合约可能要求您对 USDT、RWA 进行授权；这是链上标准流程。

---

## 二、核心合约角色（用户需要知道的概念层面）

在 `StakingContract` 中，与资金流向相关的角色包括：

- **国库地址（`treasuryAddress`）**：在构造函数中写入且 **不可更改**。用户质押时，**有一半资金会划入国库**（详见下节「50/50」）；提现时部分费用也会进入国库；部分 RWA 提现路径亦会向国库划转。  
- **后端地址（`backendAddress`）**：可由合约 **Owner** 更换。只有该地址可调用部分合约函数（例如 `updateNodeLevel`），与网站后端的「运维钱包」对应，**不等同于您的个人钱包**。  
- **回购地址（`buybackAddress`）**：Owner 可配置。对 **USDT** 的「即时分配」类支出中，有一部分 USDT 会转入该地址（详见费用拆分）。  
- **推荐奖励池（`referralRewardPool`）**：由 Owner 配置地址。质押成功时，会向该池 **记录** 推荐奖励相关数据，**不是当场把 USDT 打进您钱包**；提取规则见「推荐奖励」章节。  
- **合约自身（`address(this)`）**：承接用户质押中 **另一半资金**（50/50 中的合约部分），用于记账与兑付逻辑。  
- **白名单（`whitelist`）**：国库、后端、部署者等系统地址可被加入白名单，用于费用等逻辑中的豁免（具体以合约为准）。

**暂停**：合约 Owner 可执行 `pause()`。暂停期间，`whenNotPaused` 修饰的质押与多数提现入口会不可用，直至 `unpause()`。

---

## 三、统一推荐人（非常重要）

源码中通过 `_bindUnifiedReferrer` 与 `_getUnifiedReferrer` 实现 **「USDT 质押与 RWA 质押共用一个推荐人」**：

- 系统分别为 `users[user]`（USDT 侧）与 `rwaStakes[user]`（RWA 侧）存储 `referrer`。  
- **若任一侧已存在推荐人**，则另一侧会被 **同步为同一地址**，且 **不会再被新传入的推荐人覆盖**。  
- **有效推荐人**必须非零地址，且 **不能推荐自己**。  
- 首次成功绑定时会发出 `ReferralBound` 事件。

**对用户的含义**：您第一次建立有效推荐关系时要慎重填写；之后若链上已绑定，后续质押即使传入别的地址，**也会以链上已有关系为准**（与上述逻辑一致）。

---

## 四、USDT 质押（普通调用与内部记账）

### 4.1 最低金额与锁仓选项

- 合约函数 `stake(uint256 amount, address referrer, uint256 lockPeriod)` 要求：  
  - `amount > 0` 且 **`amount >= 100 * 10^6`**（即 **至少 100 USDT**，按 6 位小数）。  
- **`lockPeriod` 只能**为：`0`（灵活）、`30`、`90`、`180`、`365`（单位：**天**）。其他数值交易会失败。

### 4.2 50/50 资金划分（与注释一致）

当您质押 USDT 时：

- 合约把您授权的 USDT 分成两半（在 **18 位内部精度**下精确计算）：  
  - **一半**转入 **国库地址** `treasuryAddress`；  
  - **另一半**转入 **质押合约地址** `address(this)`。  
- 源码注释说明：**灵活质押与锁仓质押均适用该 50/50**；用户后续提现时按规则「全额本金」等逻辑处理，若合约侧资金不足，需由管理方从国库等渠道处理（此为协议层设计说明，**实际到账以链上执行结果与池子余额为准**）。

### 4.3 锁仓与灵活质押的本金记账

- **若 `lockPeriod > 0`（锁仓）**：  
  在 `usdtLockedPrincipals[msg.sender]` 增加一条记录，包含 `stakeId`、`totalAmount`（全额内部值）、`principalAmount`（进入合约的那一半内部值）、`lockStartTime`、`lockEndTime = 当前时间 + lockPeriod 天`、`isWithdrawn`、`lockPeriod`。  
  同时 `stakeLockPeriods[stakeId] = lockPeriod`。  
- **若 `lockPeriod == 0`（灵活）**：  
  增加 `usdtFlexiblePrincipal` 与 `usdtFlexibleTotalStaked`（源码中灵活本金累计的是 **合约池那一半** 对应的内部记账）。

### 4.4 用户状态与节点等级

- 每次有效质押会更新 `users[msg.sender].totalStaked`（**内部 18 位精度**下的 USDT 质押额）。  
- 若 `firstStakeTime == 0`，会写入首次质押时间，并把 **`nodeLevel` 初始化为 1（L1）**。  
- `stakeHistory` 会追加一条 `StakeRecord`，用于后续 **加权平均持仓时间** 等计算（例如税务视图函数 `getRWAStakeInfoForTax` 中对历史的遍历）。

### 4.5 与推荐池的交互（记录，非即时发放）

当存在有效推荐人且 `referralRewardPool` 已配置时，合约会调用：

`IReferralRewardPool.recordReferralReward(effectiveReferrer, msg.sender, stakeAmount, 0, refLevel)`

其中 **USDT 质押**传入的第三项为 **`internalAmount / 10^12`**，即把内部 18 位记账还原为 **与 USDT 人类习惯一致的 6 位小数数量级**供奖池计算。  
`refLevel` 为 **推荐人在质押当时的 `users[推荐人].nodeLevel`**，若小于 1 则按 1 处理。

**含义**：这里写入的是「待结算队列 / 快照」逻辑；**实际每周结算与可提余额**由 `ReferralRewardPool` 合约规则与 Owner 触发的结算流程决定（见后文）。

---

## 五、RWA 质押

### 5.1 与 USDT 的差异

- 函数 `stakeRWA(uint256 amount, address referrer, uint256 lockPeriod)`：**RWA 为 18 位小数**。  
- **合约层面未强制最低质押额**；源码明确写明：**「最低 100 USDT 等值仅在前端执行」**。换言之，若有人绕过前端调用合约，可能小额也可质押（不推荐）。  
- 锁仓选项与 USDT **相同**：`0 / 30 / 90 / 180 / 365` 天。

### 5.2 50/50 与账本

- 用户授权转出的 **全部 RWA** 先进入合约，再：  
  - **一半** `rwaToken.safeTransfer(treasuryAddress, treasuryAmount)` 进国库；  
  - **另一半**留在合约内作为 `contractAmount`，记入 `rwaLockedPrincipals` 或灵活池 `rwaFlexiblePrincipal` / `rwaFlexibleTotalStaked`（逻辑与 USDT 对称）。  
- `totalStakedRWA`、`totalStakedRWA` 全局变量会累加 **完整 amount**（18 位）。

### 5.3 推荐记录时的「USDT 等值」

记录推荐奖励时，合约计算：

`uint256 usdtEquivalent = (amount * 85) / 100`

即 **按 RWA 数量 × 0.85** 折成内部比例，再经 `PRECISION_MULTIPLIER` 换算后写入奖池的 `stakeAmount` 字段。  

**这一条与后端 `unified-data.ts` 文件头注释「1 RWA = 0.85 USDT」及团队统计 `stakeToUsdtEq` 使用 `(rwa * 85) / 100` 相一致**。网站上的 **团队总量、留存等展示**若基于该换算，应与链上奖池折算逻辑对齐理解。

### 5.4 RWA 侧独立结构 `rwaStakes`

RWA 只使用 `rwaStakes[user]` 中的总量、pending、推荐人、节点等级等；但其 **`referrer` 与 USDT 侧 `users[user].referrer` 会被统一绑定**，见第三节。

---

## 六、Gasless（免 Gas）质押 — 前端与后端的实际实现

### 6.1 链上入口

后端 `relayer.ts` 调用的合约为：

- `metaStakeWithPermit(...)` — 对应 **USDT** 路径（带 EIP-2612 Permit）；  
- `metaStakeRWAWithPermit(...)` — 对应 **RWA** 路径。

这两类函数在用户签名验证通过后，执行逻辑与普通的 `stake` / `stakeRWA` **等价约束**（含 **100 USDT 最低**、**锁仓天数枚举** 等）。

### 6.2 EIP-712 域名与类型（与链上扩展一致）

`MetaStakingExtension` 中 EIP-712：

- `name = "RWAStaking"`，`version = "1"`；  
- `Stake` 与 `StakeRWA` 类型包含：`user, amount, referrer, lockPeriod, nonce, deadline`。  
- **nonce** 使用合约 `nonces(user)`，**每次成功验证签名后会递增**，与用户理解常见 replay 保护一致。

后端校验签名时，会尝试 **当前 RPC 返回的 chainId** 以及 **固定并入 56（BSC 主网）** 进行验证（防止钱包网络与校验不一致造成的误报）。

### 6.3 前端 USDT Gasless（`useGaslessStake.ts`）

1. 从后端拉取 **USDT Permit 的 nonce**（项目里接口为 `/api/usdt-nonce/:address`；源码注释中 USDT 的 Permit `domain.name` 写为 `'Test USDT'`，**若与主网 USDT 实际 domain 不一致会导致 Permit 失败**，以您部署时前后端配置为准）。  
2. 用户对 **Permit** 类型数据签名。  
3. 再拉取质押合约 `nonces(user)`。  
4. 用户对 **`Stake`** 类型数据签名。  
5. POST 到后端中继路由（如 `meta-stake-permit`），由 **中继钱包**广播交易并支付 BNB。

**对用户的含义**：您可能 **不支付 BNB**，但必须完成 **两次签名**（或更多，取决于实现）；交易哈希由中继返回，最终仍以链上确认结果为准。

### 6.4 中继异常与用户体验

后端注释说明：为避免 HTTP 长时间 `wait` 导致网关 504，中继在广播成功后会 **尽快返回 `txHash`**，由 **前端 `waitForTransactionReceipt`** 等待确认；同时后台仍会尝试 ingest 交易数据入库。若中继 BNB 不足，交易会失败，后端会返回可区分的错误码（如 `RELAYER_INSUFFICIENT_BNB`）。

---

## 七、提现与费用（质押合约内）

以下常量来自 `StakingContract`：

- **内部精度 `INTERNAL_DECIMALS = 18`**；USDT 进系统时 `× 10^12` 转为内部 18 位。  
- **`MIN_WITHDRAWAL_AMOUNT = 100 * 10^18`**：注释写明为 **100 个代币单位**（在内部精度下），对 **RWA 类数量**直观为 **100 RWA**；对 **按 USDT 内部记账的本金/收益**也按同一尺度比较（用户界面通常会换算显示）。  
- **`WITHDRAWAL_COOLDOWN = 24 hours`**：部分提现要求距离上次提现满 24 小时。  
- **`ST_RWA_LOCK_DURATION = 30 days`**：选择「转为 stRWA」路径时，铸造的 stRWA **锁定 30 天**（见下文）。

### 7.1 「即时兑付」费用拆分 `_splitImmediateFee`

对 grossAmount 的扣减比例为：

- **3%** → `BUYBACK_FEE_RATE`  
- **3%** → `TREASURY_FEE_RATE`  
- **2%** → `POOL_FEE_RATE`  
- **合计 8%**，剩余 **92%** 为 `netAmount` 走向用户（再经 USDT/RWA 不同路径转账）。

**USDT 路径** `_payoutUsdtImmediate`：给用户转 `net / 10^12`（回到 6 位 USDT）；buyback、treasury 按同样精度转走。  
**RWA 路径** `_payoutRwaImmediate`：给用户转 `netAmount`（18 位）；buyback 部分转入 **燃烧地址 `0x…dEaD`**；treasury 转 RWA。

### 7.2 USDT 动态奖励侧 `users[msg.sender].rwaPending` 的提现

函数 `withdraw(uint256 amount, bool chooseStRWA)`：

- 从 `user.rwaPending` 扣减；  
- 须 `amount >= MIN_WITHDRAWAL_AMOUNT`；  
- 须满足 **24h 冷却**；  
- **先销毁用户持有的 `amount / 2` 数量的 stRWA**（若 stRWA 未配置则由内部 `_burnStRWA` 短路）。  
- **`chooseStRWA == true`**：铸造 **`amount * 120 / 100`** 的 stRWA，并带 **30 天锁**；  
- **`chooseStRWA == false`**：走 `_payoutRwaImmediate`，即 **上述 8% 费用结构从 gross 中扣**。

### 7.3 RWA 质押收益侧 `withdrawRWARewards`

`withdrawRWARewards(uint256 amount, bool chooseStRWA)`：

- 从 **`rwaStakes[msg.sender].rwaPending`** 扣减；  
- 同样最低额、24h 冷却；  
- 源码注释：**不再在奖励提现路径销毁 stRWA**（与上一条「USDT 侧 pending 提现」区分）。  
- `chooseStRWA` 分支逻辑类似：**120% 铸造 stRWA 锁定 30 天** 或 **即时 RWA 转出并套用费用拆分**。

### 7.4 USDT 灵活本金与锁仓本金

- **`withdrawFlexibleUSDTPrincipal(uint256 amount)`**：从 **灵活池 + 已到期锁仓** 合并可用额度中提现；内部减少对 `usdtFlexible*` 与到期锁仓条目的冲减；最终 **`_payoutUsdtImmediate`**，即 USDT **8% 费用模型**适用于该 gross。  
- **`withdrawUSDTPrincipal(uint256 lockIndex)`**：指定 **未提现且已到期的 USDT 锁仓记录**；本金以 `principalAmount` 计；**不再销毁 stRWA**（注释：质押时未铸造）；支付走 `_payoutUsdtImmediate`。

### 7.5 RWA 灵活本金与锁仓本金

- `withdrawFlexibleRWAPrincipal` / `withdrawRWALockedPrincipal` 与 USDT 对称；锁仓提现可选择 **`chooseStRWA`**：  
  - **true**：按 **本金 × 120%** 铸造 stRWA，30 天锁；  
  - **false**：`_payoutRwaImmediate`，含 **回购销毁 + 国库 RWA** 的路径。

### 7.6 USDT 锁仓「紧急退出」`emergencyWithdraw`

**仅适用于未到期的 USDT 锁仓** `usdtLockedPrincipals[lockIndex]`：

- 按 **已过完整天数 / 总锁仓天数** 比例计算可退 **`grossRefund`**（基于 `principalAmount`）；  
- 须 **`elapsedDays > 0`** 且 `grossRefund >= MIN_WITHDRAWAL_AMOUNT`；  
- **先销毁用户 `grossRefund / 2` 的 stRWA**；  
- 再对 **`grossRefund`** 执行 `_payoutUsdtImmediate`（即同样在 gross 上套用 **8%** 拆分）。  
- 标记该锁仓 `isWithdrawn` 并减少总质押统计。

合约还提供 **`getEmergencyWithdrawPreview`** 供前端预览可退金额与是否满足条件。

---

## 八、推荐奖励池 `ReferralRewardPool`（链上规则摘要）

- **记录入口**：仅 **`stakingContract`** 可调用 `recordReferralReward`。  
- **结算**：`settleWeeklyRewards` 为 **onlyOwner**，按每个 `PendingReward` 内 **`levelSnapshot`**（质押当时推荐人等级）在 **`_getReferralRewardRate`** 中换算比例，**万分比** 计算：`totalReward += stakeAmount * rate / 10000`。  
  - 等级 1–9 对应 rate 为：`300, 500, 800, 1200, 1700, 2300, 3000, 3500, 4000`（即 **3%–40%** 区间，**以 stakeAmount 为基数**）。  
- **提现**：  
  - **`MIN_WITHDRAWAL = 100 * 10^6` USDT（6 位）**；  
  - 普通用户：扣 **8%** 手续费，**净额给用户**，** fee 转给 Owner**；  
  - **若提现人是 Owner**：注释写明 **转全额**（无 8% 扣费分支）。  

**对用户的含义**：推荐奖励以 **USDT** 形式沉淀在池合约的 `withdrawableBalance`；**有最低 100 USDT 提现门槛**；页面若写「每周结算」，须与 **Owner 实际触发结算** 及运营公告一致。

---

## 九、团队分红池 `TeamDividendPool`（链上能力与界面常识）

- 使用 **USDT（6 位）** 记账 **`dividendBalances[user]`**。  
- **入账**：`receiveStakeFunds` / `receiveFeeFunds` 由外部合约 `transferFrom` 转入；注释提到与质押相关的资金划转公式（具体以部署时是否启用为准）。  
- **批量记账**：`batchRecordDividend` 类流程需 **后端签名者与管理员签名者双方**（1-of-2 方案在注释中描述），用于月度等结算写入用户余额。  
- **用户提现**：前端 `useTeamDividend` 调用 `withdrawDividend`；链上对用户侧有 **单笔上限、每日次数上限** 等常量（如单笔 **100,000 USDT**、每日 **10 次**等，以合约为准）。

**对用户的含义**：分红往往 **按月或按公告周期入账**；能否提出、额度多少，以 **链上 `dividendBalances` 与页面展示** 为准。

---

## 十、节点等级 `updateNodeLevel`

- 仅 **`msg.sender == backendAddress`** 可调用 `updateNodeLevel(user, level)`。  
- **level** 必须在 **1–9**。  
- 若用户 **仅有 RWA 质押**（`rwaStakes[user].totalStakedRWA > 0`），会 **同步** `rwaStakes[user].nodeLevel`。

网站 `i18n` 中 **L1–L9** 的「个人质押、团队业绩」等文字，属于 **产品与运营配置说明**；**链上等级实际值以后端调用结果为准**，若文案数字与当时链上规则不一致，以合约及后台逻辑为准。

---

## 十一、每日收益与 `updateUserRewards`（概要）

合约存在 **`updateUserRewards`**（由 `backendAddress` 调用）及 **`maxRewardPerCall`、单日报酬上限、日化 Soft landing** 等参数（`SINGLE_CAP_MULTIPLIER`、`DAILY_CAP_MULTIPLIER` 等）。  

**对用户的含义**：动态收益并 **不是**简单「手动转账」；由后端在规则内批量触发更新。具体日化是否与首页展示完全一致，**以当时 `maxRewardPerCall`、暂停状态与执行成功为准**。

---

## 十二、前端主要页面与后端数据（用户可见部分）

下列路径来自 `frontend/app`：

- **`/`** 首页、`/stake` 质押、`/swap` 兑换、`/withdraw` 提现、`/dashboard` 仪表盘。  
- **`/node/network`、`/referral-network`** 等与团队、推荐树相关。  
- **`/knowledge`、`/help`、`/security`、`/terms`、`/privacy`** 等说明与合规页。  

后端 **`unified-data.ts`** 中：  

- **团队统计**可将 **RWA 按 0.85 折算为 USDT 等值** 后与 USDT 相加（`stakeToUsdtEq`）；  
- **无限代下级**在 MySQL 支持时在 `referral_bindings` 上做递归/回退查询。  

**对用户的含义**：仪表盘上的「团队总质押、总留存」等，是 **网站统计口径**；若与区块链浏览器上.raw 转账不一致，通常是因为 **折算是 0.85** 或 **统计延迟**。

---

## 十三、兑换与其他合约（简要）

- **`frontend/lib/contracts/addresses.ts`** 中同时配置 **Pancake 路由兑换** 与 **`usdtRwaSwap`（项目内 USDT↔RWA 互换合约）** 等；实际页面走哪条路由由 UI 决定。  
- **`stRWA`** 为独立代币地址，由 Owner `setStRWAToken` 绑定；质押时 **不一定铸造**，多数 **在提现选择 stRWA 时铸造**（见上文 120% + 30 天锁等逻辑）。

---

## 十四、迁移与维护（一般用户只需了解）

合约包含 **`migrationEnabled`、`migrationImportUserBundle` 等仅 Owner 可调函数**，用于 **新版本部署后一次性导入老用户仓位**。  

**对用户的含义**：若官方公告「迁移到新合约」，您应 **只信任官网链接与合约地址**；迁移期间可能出现短暂服务调整，以公告为准。

---

## 十五、请您务必阅读的风险提示（结合技术事实）

1. **智能合约风险**：漏洞、攻击、参数错误可能导致资金损失。  
2. **市场风险**：RWA、USDT 与其它代币价格波动。  
3. **费用与规则变更**：Owner 可调部分参数（如 buyback 地址、`maxRewardPerCall`）、可暂停合约；**以链上为准**。  
4. **前端与链上不一致**：若 UI 未更新或缓存，可能显示旧数据；**以交易回执与浏览器为准**。  
5. **钓鱼**：任何让您交出助记词、私钥的均为诈骗；**域名请仅使用官方公示（例如 rwa.lat 上线后）**。

---

**文档生成说明**：以上内容逐条对照当前仓库源码整理；若您更新合约或前端后本文未同步，请以 **最新 `contracts/` 与部署地址** 为准。需要 PDF 时，可将本文件用浏览器「打印为 PDF」导出。
