# 将质押合约 Owner 交给 Gnosis Safe（多签）

> **说明**：链上交易必须由**当前 Owner 私钥对应的钱包**签名；服务器与 AI 无法代签。完成后用本文末尾命令或脚本核验。

## 地址（主网 BSC）

| 角色 | 地址 |
|------|------|
| StakingContract | `0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99` |
| 你的 Safe（新 Owner） | `0x6Edcc03b3cB13cEfCb518aF01cA5fF38E77fAAdC` |
| 当前链上 Owner（亦为 `backendAddress`） | `0x8927e74e0fCaED1D4C87116C805464800651f222` |

## Gas

- 必须用 **当前 Owner 地址 `0x08ea…`** 持有少量 **BNB** 支付两笔（或一笔）交易的 gas。  
- Safe 地址里的 BNB **不能**替 EOA 付这两笔（除非你用别的代付方案）。

## 顺序怎么选

### 方案 A（先止血，业务会短暂停）

1. `pause()` — 合约进入暂停后，用户质押/提现及 `updateUserRewards`（日结）在合约层会受 `whenNotPaused` 限制而无法进行。  
2. `transferOwnership(0x6Edcc03b3cB13cEfCb518aF01cA5fF38E77fAAdC)` — Owner 变为 Safe。  
3. 多签成员在 Safe 里对合约再发 `unpause()`，恢复业务。

适合：担心迁移窗口内被滥用时。

### 方案 B（尽量不中断日结）

1. 仅 `transferOwnership(Safe 地址)`，**先不 pause**。  
2. 上链确认 Owner 已是 Safe 后，如需再用 Safe 执行 `pause` / `unpause`。

适合：优先保证日结连续，且你能接受极短窗口内 Owner 仍是旧 EOA 的风险（旧私钥已泄露则仍更推荐方案 A）。

## 用 Remix 操作（合约未验证源码时也可用）

1. 打开 [Remix](https://remix.ethereum.org)，新建文件 `IStakingOwner.sol`，粘贴：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStakingOwner {
    function pause() external;
    function unpause() external;
    function transferOwnership(address newOwner) external;
}
```

2. **Solidity Compiler** 选 `0.8.24`（或 ≥0.8.24），编译该文件。  
3. **Deploy & Run** → Environment：**Injected Provider**，网络选 **BSC Mainnet**。  
4. 用当前 **Owner 钱包**连接（地址应为 `0x08ea…`）。  
5. **At Address** 填：`0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99` → 点 **At Address**。  
6. 按所选方案依次点击：  
   - `pause`（若用方案 A）  
   - `transferOwnership`，参数填：`0x6Edcc03b3cB13cEfCb518aF01cA5fF38E77fAAdC`  
7. 在钱包中确认交易，等待 BscScan 成功。

## 用 MetaMask「十六进制数据」发交易（可选）

在服务器上生成 calldata：

```bash
cd /www/wwwroot/rwaprotocol.dpdns.org/backend && npx ts-node scripts/encode-staking-owner-calldata.ts
```

将输出的 `to` 与 `data` 用于 MetaMask → 发送 → 高级选项（或与硬件钱包兼容的同类流程）。

## 完成后核验

```bash
cd /www/wwwroot/rwaprotocol.dpdns.org/backend && npx ts-node scripts/verify-staking-owner-onchain.ts
```

期望：**Owner 等于 Safe 地址** `0x6Edc…AAdC`。`paused` 是否 `true` 取决于你是否执行过 `pause`。

## 重要提醒

- **`backendAddress` 在已部署合约里为 immutable**，本次操作**不会**改变日结签名地址；仍为 `0x08ea…`。彻底换 backend 需要**部署新合约**并迁移（另见迁移方案）。  
- Owner 转到 Safe 后，**所有 `onlyOwner` 操作**（含 `unpause`）需经 Safe 多签，请保管好 signer 与阈值。  
- 若曾泄露 GitHub PAT / 私钥，请尽快**轮换**并不再在聊天中粘贴密钥。
