# RWA协议合约部署状态 - 2026-03-14

## 📋 已部署合约（BSC测试网）

### 核心合约
| 合约名称 | 地址 | 状态 | 说明 |
|---------|------|------|------|
| StakingContract | `0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE` | ✅ 已部署 | 主质押合约 |
| RWAToken | `0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6` | ✅ 已部署 | RWA代币 |
| TestUSDT | `0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2` | ✅ 已部署 | 测试USDT |

### 外部合约
| 合约名称 | 地址 | 说明 |
|---------|------|------|
| PancakeSwap Router | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | BSC测试网官方路由 |

## 📝 合约文件清单

### 已实现的合约（15个）
1. **StakingContract.sol** - 主质押合约 ✅
2. **RWAToken.sol** - RWA代币
3. **RWATokenWithPermit.sol** - 带Permit的RWA代币
4. **TestUSDT.sol** - 测试USDT
5. **TestUSDTWithPermit.sol** - 带Permit的测试USDT
6. **StRWA.sol** - 质押凭证代币
7. **MetaStakingExtension.sol** - Gasless交易扩展
8. **ReferralRewardPool.sol** - 推荐奖励池
9. **TeamDividendPool.sol** - 团队分红池
10. **TreasuryContract.sol** - 国库合约
11. **SwapContract.sol** - 兑换合约
12. **PriceStabilizer.sol** - 价格稳定器
13. **LiquidityManager.sol** - 流动性管理
14. **EmergencyPause.sol** - 紧急暂停
15. **LotteryContractSimple.sol** - 彩票合约

## ⏳ 待部署合约

### 高优先级
- [ ] **StRWA** - 质押凭证代币（需要先部署）
- [ ] **ReferralRewardPool** - 推荐奖励池（推荐系统核心）
- [ ] **TreasuryContract** - 国库合约（资金管理）

### 中优先级
- [ ] **SwapContract** - RWA/USDT兑换
- [ ] **TeamDividendPool** - 团队分红
- [ ] **PriceStabilizer** - 价格稳定机制

### 低优先级
- [ ] **LiquidityManager** - 流动性管理
- [ ] **EmergencyPause** - 紧急暂停功能
- [ ] **LotteryContractSimple** - 彩票功能

## 🔧 部署脚本

### 可用的部署脚本
```
scripts/
├── deploy-rwa-token.ts          # 部署RWA代币
├── deploy-test-usdt.ts          # 部署测试USDT
├── deploy-staking.ts            # 部署质押合约
├── deploy-meta-staking.ts       # 部署Gasless质押
├── deploy-referral-pool.ts      # 部署推荐池
├── deploy-lottery.ts            # 部署彩票
└── deploy-to-bsc-testnet.ts     # BSC测试网部署
```

## 📊 合约依赖关系

```
StakingContract (核心)
├── RWAToken (已部署)
├── TestUSDT (已部署)
├── StRWA (待部署) ⚠️
├── ReferralRewardPool (待部署) ⚠️
└── TreasuryContract (待部署) ⚠️

SwapContract
├── RWAToken (已部署)
├── TestUSDT (已部署)
└── PancakeSwap Router (外部)

ReferralRewardPool
└── StakingContract (已部署)
```

## ⚠️ 当前问题

1. **StRWA未部署**
   - StakingContract引用了StRWA地址
   - 需要部署并配置

2. **ReferralRewardPool未部署**
   - 推荐系统无法正常工作
   - 需要部署并在StakingContract中设置地址

3. **TreasuryContract未部署**
   - 50%的质押资金应该进入国库
   - 当前可能直接发送到owner地址

## 🎯 建议部署顺序

1. **StRWA** (最高优先级)
   ```bash
   npx hardhat run scripts/deploy-strwa.ts --network bscTestnet
   ```

2. **TreasuryContract**
   ```bash
   npx hardhat run scripts/deploy-treasury.ts --network bscTestnet
   ```

3. **ReferralRewardPool**
   ```bash
   npx hardhat run scripts/deploy-referral-pool.ts --network bscTestnet
   ```

4. **配置StakingContract**
   ```solidity
   staking.setStRwaToken(stRwaAddress);
   staking.setReferralRewardPool(referralPoolAddress);
   ```

## 📝 备注

- 所有合约部署在BSC测试网
- Owner地址: `0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638`
- 网络: BSC Testnet (ChainID: 97)
- RPC: https://bsc-testnet-rpc.publicnode.com

---
**更新时间**: 2026-03-14 02:16
**更新人**: Kiro AI Assistant
