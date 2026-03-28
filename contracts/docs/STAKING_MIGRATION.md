# StakingContract：老用户状态迁移到新部署

## 设计说明

- **未**整份重写业务逻辑（避免一次改动 1700+ 行引入未知风险）；在现有 `StakingContract.sol` 上增加 **仅 owner、且需 `migrationEnabled`** 的导入函数，把老合约上的用户态 **按字节级结构** 写入新合约。
- **用户无感**依赖运营侧：**新合约先部署并导入全部用户 → 前端/后端改地址 → 老合约 `pause`**；用户仍用同一钱包与同一套 UI。
- **资金**：新合约地址需持有足够 **USDT / RWA** 以覆盖已导入的「合约侧负债」；老合约中的代币需通过 **国库/多签** 划转到新合约（本流程不自动转币）。

## 链上函数

| 函数 | 作用 |
|------|------|
| `setMigrationEnabled(bool)` | 打开/关闭迁移窗口；**关闭后**无法再 `import`（建议导入完成后关掉）。 |
| `migrationSetStakesCounter(uint256 minNext)` | 将 `stakesCounter` 提升到 **不小于** 老合约当前值，避免新质押 `stakeId` 与迁移数据冲突。 |
| `migrationImportUserBundle(...)` | 写入单个用户的 `users`、`rwaStakes`、灵活仓、锁仓数组、`stakeHistory`、`stakeLockPeriods`，并累加全局 `totalStaked` / `totalStakedRWA`。 |
| `migrationSetGlobalTotals` | 若逐用户累加后与老合约全局总锁仓不一致，**一次性校准**（慎用）。 |
| `migrationSetDynamicRewardsPaid` | 与老的 `totalDynamicRewardsPaid` 对齐（可选）。 |

## 推荐顺序

1. 部署 **新** `StakingContract`（`treasury` / `backend` 在 constructor 一次写死；**`owner` = 部署交易 `msg.sender`**。若治理地址为指定 EOA，须用该私钥部署，或部署后 `transferOwnership`）。
2. `setMigrationEnabled(true)` + `migrationSetStakesCounter(老合约 stakesCounter)`：可用脚本 `scripts/migration/00-prep-new-staking-migration.ts`（`NEW_STAKING` + `PRIVATE_KEY` + `LEGACY_STAKING` 或 `MIGRATION_MIN_STAKES_COUNTER`）。
3. 链下列表 → 批量导出 → 批量导入：
   - `01-list-legacy-stakers.ts`：日志扫出曾质押地址 → `out/stakers.json`
   - `02-export-all-bundles.ts`：按地址从老合约只读拉 bundle → `out/bundles/<user>.json`
   - `03-import-bundles.ts`：owner 私钥对新合约逐笔 `migrationImportUserBundle`（可用 `IMPORT_START` / `IMPORT_LIMIT` 分批）
4. 核对新合约 `totalStaked`、`totalStakedRWA` 与老合约（或 `migrationSetGlobalTotals` 校准）；可选 `migrationSetDynamicRewardsPaid`。
5. `setMigrationEnabled(false)`。
6. 将 **USDT/RWA** 从老池/国库划入新合约；更新 **后端 `.env`、前端 `addresses`、STAKING_DEPLOY_BLOCK**；老合约 `pause()`。

## globalDelta 参数（重要）

- `globalDeltaTotalStaked`：该用户在老合约中对 **`totalStaked` 全局变量**的贡献。对当前代码路径，通常取老合约 `users(user).totalStaked`（USDT 侧内部 18 位累加）。若历史上存在特殊入口把 RWA 计入 `totalStaked`，需由脚本按老链实际修正（见导出脚本注释）。
- `globalDeltaTotalStakedRWA`：通常 = 老合约 `rwaStakes(user).totalStakedRWA`。

## 脚本

| 路径 | 作用 |
|------|------|
| `scripts/migration/00-prep-new-staking-migration.ts` | 新合约上 `setMigrationEnabled(true)` + `migrationSetStakesCounter` |
| `scripts/migration/01-list-legacy-stakers.ts` | 从事件收集地址列表 |
| `scripts/migration/02-export-all-bundles.ts` | 批量导出 `out/bundles/*.json` |
| `scripts/migration/03-import-bundles.ts` | owner 批量链上导入 |
| `scripts/export-legacy-user-migration-bundle.ts` | **单用户** 导出 JSON（调试 / 手工多签） |

## 审计与安全

- 迁移期 **owner** 权限极高；建议 **owner = Safe**，迁移交易多签执行。
- 导入完成后务必 **关闭 `migrationEnabled`**。
- 新合约 `backendAddress` / `treasuryAddress` 仍为 **immutable**，部署时一次定死。
