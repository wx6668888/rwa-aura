# stRWA 在用户提现时的销毁与铸造逻辑

## 两条设计约定（结论）

1. **只要是质押产生的 stRWA，都必须锁仓；用户提现时，对应的 stRWA 必须全部销毁。**  
   - 质押时铸造的 stRWA：锁仓期与质押锁仓期一致，不得在锁仓期内转出或通过 Swap 换 RWA。  
   - 用户提现（选 USDT/RWA 或选 stRWA）时：先按规则 burn 对应数量，再打款或再铸 120% 锁仓 stRWA；锁仓到期时 processMaturedStake 同样 burn 对应 stRWA。  
   - 即：**质押来源的 stRWA 只存在「锁仓 → 被 burn」两条路，不提供「先换 RWA 再提本金」的套利路径。**

2. **只有一种情况下 stRWA 可以「转化成 RWA」：用户选择提现时「提取 stRWA」**，此时先 burn 对应 stRWA，再铸造 120% 的 stRWA，**该部分仍锁仓 30 天**；30 天解锁后用户可持有、转账或在 Swap 中换 RWA。  
   - 除此以外，质押产生的 stRWA 不允许通过 Swap 提前换成 RWA（锁仓期内不能换，提现/到期时直接 burn）。

---

## stRWA 的作用（简要）

- **凭证 / 记账单位**：代表用户对「国库 50% 份额」的权益。质押时 50% 进国库，同时给用户铸造等额（50% 本金）的 stRWA，表示「你有一份对应的权益」。
- **防止双花**：提现真实资产（USDT/RWA）或锁仓到期时，必须销毁对应 stRWA，保证「一份真实资产不会既被提走又被拿去换 RWA」。
- **持币激励**：提现时若选择「拿 stRWA 不拿 USDT/RWA」，会先销毁对应 stRWA，再铸造 120% 的 30 天锁仓 stRWA，鼓励用户继续留在协议内。
- **可流通**：见下节「何时销毁、何时流通」。

---

## 何时销毁、何时流通（回答「如何流通」）

**不是「一铸造就立刻销毁」**，而是：

| 时间点 | 事件 | stRWA 状态 |
|--------|------|------------|
| 质押时 | 铸造 stRWA（50% 本金）给用户 | **锁仓**（与质押锁仓期一致），不可转、不可换 RWA |
| 质押期内 / 到期前 | 用户不提现、不点「到期处理」 | **保持锁仓**，仍不可通过 Swap 换 RWA |
| 用户提现（选 USDT/RWA） | 先 burn 再打款 | 该次提现对应的 stRWA **全部销毁** |
| 用户提现（选 stRWA） | 先 burn 再铸 120% 锁仓 | 旧凭证销毁；**新 120% stRWA 锁仓 30 天**，30 天后可转/可换 RWA |
| 锁仓到期 | 有人调用 processMaturedStake | 该笔对应的 stRWA **销毁**，之后用户可只提本金 |

**设计约定下的锁仓与流通：**

- **质押时铸造的 stRWA**：必须**锁仓**（锁仓期 = 该笔质押锁仓期）。锁仓期内不可转账、不可在 Swap 换 RWA；提现或到期时**全部销毁**，不提供「先换 RWA 再提本金」。
- **提现时选「拿 stRWA」铸造的**：**锁仓 30 天**；30 天解锁后用户可持有、转账或在 Swap 中换 RWA。这是**唯一**一种「stRWA 可转化为 RWA」的路径（先拿 120% 锁仓 stRWA，解锁后再换 RWA）。

**流通仅发生在：**

1. **提现时选「拿 stRWA」铸的 120% 部分**：锁仓 30 天后解锁，可转、可换 RWA。  
2. **质押来源的 stRWA**：仅锁仓至到期/提现，到期或提现时**一律销毁**，不进入「换 RWA」的流通。

**为何必须锁「质押时铸的 stRWA」——避免凭空多出一份收益**

当前是**全额提现**（仅扣 8% 手续费），即用户拿回的是「几乎全部本金」。若质押时铸的 stRWA **不锁**：

1. 用户质押 1000 → 立刻获得 500 stRWA（无锁）。
2. 用户**马上**把 500 stRWA 在 Swap 里换成 RWA，拿到一笔 RWA。
3. 合约里仍记着用户 1000 本金，到期/灵活后可提现，扣 8% 后拿回 920。
4. 结果：用户得到 **920 USDT + 换来的 RWA**，相当于在「本金几乎全拿回」之外，又多拿了一份「50% 国库份额」的变现（stRWA→RWA），即**凭空多出一份收益**。

因此：**质押时铸造的 stRWA 也必须锁仓**，锁仓期与**该笔质押的锁仓期一致**（灵活质押可用 0 或较短锁仓，由产品定）。这样在质押期内用户无法把 stRWA 转出或换 RWA；到期时由 processMaturedStake 销毁，或用户提现时先 burn 再打款，就不会出现「先换 RWA、再全额提本金」的套利。

**建议实现**：  
质押时改为 `_mintStRWA(msg.sender, treasuryAmount, lockPeriod * 1 days)`（灵活质押若 lockPeriod==0 可用 0 或最小锁仓，例如 0 则仅依赖「提现时必 burn」）。这样「铸造到被 burn 之前」与「质押锁仓期」对齐，避免无锁 stRWA 被提前换 RWA 导致的双份收益。

**总结**：  
- **质押产生的 stRWA**：一律锁仓（与质押锁仓期一致），提现或到期时**全部销毁**，不通过 Swap 换 RWA。  
- **唯一可「转化成 RWA」的路径**：用户提现时选择「提取 stRWA」→ 先 burn 对应 stRWA，再铸造 120% stRWA **锁仓 30 天**；30 天解锁后可转、可换 RWA。

---

## 一、背景与目标

- 用户**质押**时：合约会按「50% 国库份额」给用户**铸造** stRWA（实体资产凭证）。
- 用户**提现**时若选择直接拿 USDT/RWA，应**销毁**对应的 stRWA，保证「凭证与资产一一对应」。
- 用户**提现**时若选择拿 stRWA，应先**销毁**原有对应 stRWA，再**铸造** 120% 的 30 天锁仓 stRWA。

本文档梳理该逻辑是否自洽、如何实现，以及「到期是否自动销毁」的处理方式。

---

## 二、约定：何谓「对应这笔提现的 stRWA」

- 质押时：铸造的 stRWA = **treasuryAmount = 本金 × 50%**（18 位精度）。
- 不按「某一笔质押」逐笔绑定，而是按**总量规则**处理：
  - **应销毁量** = 本次提现金额（本金或收益，18 位）× 50%。
  - 即：提现 1000（本金或收益）→ 应销毁 500 stRWA。

这样实现简单，且与「50% 进国库并铸造 stRWA」的规则一致。

---

## 三、你提出的三条逻辑（梳理与结论）

### 1. 正常提现且选择「直接提取 USDT 或 RWA」→ 应销毁对应 stRWA

- **逻辑**：用户拿回的是真实资产（USDT/RWA），不再持有该部分的「凭证」，因此要销毁当初铸造的 stRWA。
- **实现**：在以下所有「直接到账 USDT/RWA」的路径中，先计算应销毁量，再扣减用户 stRWA：
  - **应销毁量** = 本次提现的**本金或收益金额**（18 位）× 50%。
  - 调用 `StRWA.burn(msg.sender, burnAmount)`。
- **细节**：
  - 若用户当前 stRWA 不足 `burnAmount`，可选两种策略：
    - **严格**：`require(balance >= burnAmount)`，不足则 revert，保证「提现必伴随足额销毁」。
    - **宽松**：`burnAmount = min(userStRWA, 应销毁量)`，能烧多少烧多少（可能留下「未销毁的凭证」，需产品决定是否接受）。
- **结论**：这条逻辑**行得通**，且与「凭证代表 50% 国库份额」一致。

---

### 2. 正常提现且选择「提取 stRWA」→ 先销毁原有 stRWA，再铸造 120% 锁仓 stRWA

- **逻辑**：用户不拿 USDT/RWA，而是拿「新凭证」；旧凭证应先销毁，再按 120% 发 30 天锁仓 stRWA。
- **实现**：
  1. **应销毁量** = 本次提现金额（18 位）× 50%（与上一条一致）。
  2. 调用 `StRWA.burn(msg.sender, burnAmount)`（若采用严格策略，同样可要求余额 ≥ burnAmount）。
  3. 再调用 `_mintStRWA(msg.sender, 提现金额 × 120%, 30 天锁仓)`。
- **效果**：用户「交出」50% 凭证，获得 120% 锁仓凭证；净增 70% 锁仓 stRWA，与「选择持 stRWA 有激励」一致。
- **结论**：这条逻辑**行得通**，且与当前「选 stRWA 即铸 120% 锁仓」的设计兼容，只需在铸造前增加一步销毁。

---

### 3. 质押到期后的 stRWA 是否「自动销毁」？

- **风险（必须避免）**：若到期后**不**销毁对应 stRWA，会出现「凭空多出一笔资产」：
  1. 用户质押 1000 USDT（锁仓）→ 获得 500 stRWA（铸造）。
  2. 锁仓到期后，用户仍持有 500 stRWA。
  3. 用户可把 stRWA 在 Swap 合约中**换成 RWA**，同时仍可到 Staking 合约**提现本金**（1000 USDT，扣 8% 后到账 920）。
  4. 结果：用户同时拥有「换来的 RWA」+「提现得到的 USDT」= 同一笔本金被用了两次，**双花 / 凭空多出资产**。
- **结论**：**到期后必须把对应 stRWA 销毁**，不能仅依赖「提现时再销毁」且不约束顺序。否则用户可以先换 RWA 再提现，导致双花。

**实现方式（二选一或组合）：**

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| **A. 到期时主动销毁** | 锁仓到期后，由任何人（用户/前端/keeper）调用 `processMaturedStake(user, lockIndex)`，合约从该用户销毁「该笔本金×50%」的 stRWA，并标记该笔已处理。之后用户提现本金时不再要求持有 stRWA。 | 到期即销毁，用户无法先换 RWA 再提现，彻底避免双花。 | 需要有人调用（建议 keeper 或前端在展示「可提现」时自动调一次）。 |
| **B. 仅提现时销毁** | 提现本金时要求用户必须持有并销毁对应 stRWA，否则 revert。 | 无需额外「到期处理」逻辑。 | 若用户到期后先把 stRWA 换成 RWA，再回来提现会失败，相当于「凭证丢失则无法提现」，体验差且易引发纠纷。 |

**推荐**：采用 **方案 A**：增加「到期处理」函数，在锁仓到期后尽快执行一次销毁（keeper 或前端在用户点击「查看/提现」时先调），再允许用户随时提现本金，且不再要求其持有 stRWA。这样既防止双花，又不在「先换 RWA 再提现」时把用户卡死。

---

## 四、涉及提现的路径与是否销毁/铸造

| 提现类型 | 选择 | 当前行为 | 建议新增 |
|----------|------|----------|----------|
| RWA 收益 `withdraw(amount, chooseStRWA)` | 直接 RWA | 扣 8% 手续费，打 RWA | 先 burn 50%×amount 的 stRWA，再打 RWA |
| RWA 收益 `withdraw(amount, true)` | 持 stRWA | 铸 120% 锁仓 stRWA | 先 burn 50%×amount，再铸 120%×amount 锁仓 |
| RWA 锁仓本金 `withdrawRWALockedPrincipal(i, false)` | 直接 RWA | 扣 8%，打 RWA | 先 burn 50%×principal 的 stRWA，再打 RWA |
| RWA 锁仓本金 `withdrawRWALockedPrincipal(i, true)` | 持 stRWA | 铸 120% 锁仓 stRWA | 先 burn 50%×principal，再铸 120%×principal 锁仓 |
| USDT 锁仓本金 `withdrawUSDTPrincipal(i)` | 仅 USDT | 扣 8%，打 USDT | 先 burn 50%×principal（18 位）的 stRWA，再打 USDT |
| 灵活 USDT 本金 `withdrawFlexibleUSDTPrincipal()` | 仅 USDT | 扣 8%，打 USDT | 先 burn 50%×totalStake 的 stRWA，再打 USDT |
| 灵活 RWA 本金 `withdrawFlexibleRWAPrincipal()` | 仅 RWA | 扣 8%，打 RWA | 先 burn 50%×totalStake 的 stRWA，再打 RWA |
| 紧急提现 `emergencyWithdraw(i)` | 仅 USDT | 扣罚金，打 USDT | 是否销毁可单独约定（通常也建议 burn 50%×refund 以保持一致） |

说明：

- 所有「本金/收益」均为合约内 18 位精度；USDT 相关金额在合约内已按 18 位处理时可直接用，否则需按精度换算后代入 50%。
- 若采用**严格策略**，任一路径在用户 stRWA 不足应销毁量时 revert，需在前端/文档中说明：**提现前需保留足够 stRWA 未被转出**。

---

## 五、实现要点（合约层）

1. **StakingContract 调用 StRWA.burn**
   - StRWA 已限制仅 `stakingContract` 可调 `burn(from, amount)`，只需在 StakingContract 中在对应提现分支里：
     - 计算 `burnAmount = (本次提现金额 × 50%)`（18 位）；
     - 若采用严格策略：`require(stRwaToken.balanceOf(msg.sender) >= burnAmount)`；
     - 调用 `IStRWA(address(stRwaToken)).burn(msg.sender, burnAmount)`（需在 StRWA 暴露 `burn(address,uint256)` 且 StakingContract 使用该接口）。
2. **顺序**
   - 「直接 USDT/RWA」：先 burn，再转 USDT/RWA。
   - 「选 stRWA」：先 burn，再 `_mintStRWA(..., 120% 金额, 30 天)`。
3. **StRWA 锁仓**
   - `burn` 会先 `_releaseExpiredLocks(from)`，再 `_burn`，因此只烧「可用余额」；若 50% 对应数量部分在锁仓中，需约定是否允许「用锁仓部分参与销毁」或只允许用已解锁部分（当前 StRWA 实现是 burn 时先释放过期锁再按总余额烧，若余额不足会 revert）。

4. **到期销毁：`processMaturedStake(user, lockIndex)`（方案 A）**
   - 仅当 `block.timestamp >= lockEndTime` 且该笔尚未标记「已处理」时可调用。
   - 应销毁量 = 该笔 `principalAmount × 50%`（18 位）；从 `user` 地址 burn 该数量 stRWA。
   - 合约内用 mapping 标记该笔已处理（如 `maturedStRwaBurned[user][lockIndex] = true`），后续 `withdrawUSDTPrincipal` / `withdrawRWALockedPrincipal` 检查该标记：若已 true 则提现时不再 burn，直接打款；若未 true 则仍按「提现时先 burn 再打款」（与方案 B 一致），避免重复 burn。
   - 谁可调用：建议设为任何人可调（permissionless），便于 keeper 或前端在到期后自动执行；调用后用户即可正常提现本金且无需再持有 stRWA。

---

## 六、结论

- **1）直接提 USDT/RWA → 销毁对应 stRWA**：行得通，建议按「应销毁 = 提现金额×50%」实现。
- **2）选提 stRWA → 先销毁再铸 120% 锁仓**：行得通，与现有「120% 锁仓」设计一致，仅需在铸造前增加销毁步骤。
- **3）到期 stRWA**：**必须销毁**，否则用户可先拿 stRWA 换 RWA 再提现本金，造成双花。推荐在**锁仓到期后**通过 `processMaturedStake(user, lockIndex)` 主动销毁该笔对应的 stRWA（本金×50%），由 keeper 或前端在到期后调用；之后用户提现本金时不再要求持有 stRWA。

整体逻辑：提现路径按第四节表格做「先 burn 再打款/再铸 120%」；到期通过 `processMaturedStake` 先烧掉对应 stRWA，再允许本金提现，避免凭空多出资产。
