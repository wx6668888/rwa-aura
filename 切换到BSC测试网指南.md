# 🌐 切换到 BSC Testnet 完整指南

**日期**: 2026年3月2日  
**目标**: 从 Hardhat Local 切换到 BSC Testnet，实现数据持久化

---

## 📋 为什么切换到 BSC Testnet？

### ✅ 优势

1. **数据永久保存** - 重启后数据不会丢失
2. **真实环境** - 模拟真实区块链环境
3. **团队协作** - 团队成员可以访问同一网络
4. **公开透明** - 所有交易可在 BSCScan 查看

### ⚠️ 注意事项

- 需要测试网 BNB（Gas 费）
- 部署需要一些时间（5-10分钟）
- 合约地址会改变

---

## 🚀 快速开始（5步完成）

### Step 1: 获取测试网 BNB

1. **访问 BSC 测试网水龙头**:
   - https://testnet.bnbchain.org/faucet-smart
   - 或 https://www.bnbchain.org/en/testnet-faucet

2. **输入你的钱包地址**（MetaMask 中的地址）

3. **完成验证码**

4. **获取 0.1-0.5 BNB**（足够部署和测试）

**需要数量**: 至少 0.1 BNB（建议 0.2 BNB）

---

### Step 2: 配置环境变量

在项目根目录创建或更新 `.env` 文件：

```env
# ============================================
# 网络配置
# ============================================
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# ============================================
# 账户配置（⚠️ 使用测试网专用账户）
# ============================================
PRIVATE_KEY=你的测试网私钥（不要包含0x前缀，或包含也可以）

# ============================================
# 系统地址（可选，不填则使用部署者地址）
# ============================================
TREASURY_ADDRESS=
BACKEND_ADDRESS=
LIQUIDITY_FUND_ADDRESS=

# ============================================
# 代币地址（测试网 USDT）
# ============================================
USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# ============================================
# BSCScan API（可选，用于合约验证）
# ============================================
BSCSCAN_API_KEY=
```

**重要提示**:
- ⚠️ **不要使用主网私钥**
- ⚠️ **使用专门的测试网账户**
- ⚠️ **确保 `.env` 在 `.gitignore` 中**

---

### Step 3: 部署合约到 BSC Testnet

运行部署脚本：

```bash
npx hardhat run scripts/deploy-all.ts --network bscTestnet
```

**预期时间**: 5-10分钟

**预期输出**:
```
============================================================
🚀 RWA Protocol - Complete Deployment Script
============================================================

Deploying contracts with account: 0x...
Account balance: 0.2 BNB

📦 Step 0: Deploying TestUSDT (for localhost)...
✅ TestUSDT deployed to: 0x...

📦 Step 1: Deploying RWAToken...
✅ RWAToken deployed to: 0x...

📦 Step 2: Deploying StRWA...
✅ StRWA deployed to: 0x...

📦 Step 3: Deploying StakingContract...
✅ StakingContract deployed to: 0x...

📦 Step 4: Deploying SwapContract...
✅ SwapContract deployed to: 0x...

📦 Step 5: Deploying LotteryContract...
✅ LotteryContract deployed to: 0x...

============================================================
✅ 部署完成！
============================================================
```

**保存输出的合约地址！**

---

### Step 4: 更新前端配置

将部署的合约地址添加到 `frontend/.env.local`（如果不存在则创建）：

```env
# BSC 测试网合约地址
NEXT_PUBLIC_STAKING_CONTRACT_TESTNET=0x你的StakingContract地址
NEXT_PUBLIC_RWA_TOKEN_TESTNET=0x你的RWAToken地址
NEXT_PUBLIC_ST_RWA_TESTNET=0x你的StRWA地址
NEXT_PUBLIC_SWAP_CONTRACT_TESTNET=0x你的SwapContract地址
NEXT_PUBLIC_LOTTERY_CONTRACT_TESTNET=0x你的LotteryContract地址
NEXT_PUBLIC_TREASURY_CONTRACT_TESTNET=0x你的TreasuryContract地址（如果有）

# WalletConnect Project ID（如果使用）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

**或者直接更新 `frontend/lib/contracts/addresses.ts`**:

```typescript
[bscTestnet.id]: {
  stakingContract: '0x你的StakingContract地址',
  rwaToken: '0x你的RWAToken地址',
  stRWA: '0x你的StRWA地址',
  swapContract: '0x你的SwapContract地址',
  lotteryContract: '0x你的LotteryContract地址',
  treasuryContract: '0x你的TreasuryContract地址',
  usdtToken: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC Testnet USDT
}
```

---

### Step 5: 配置 MetaMask

#### 方法 1: 自动添加（推荐）

1. 访问你的前端应用（http://localhost:3000）
2. 点击"连接钱包"
3. 如果 MetaMask 提示添加网络，点击"批准"

#### 方法 2: 手动添加

1. **打开 MetaMask**
2. **点击网络下拉菜单** → **添加网络** → **手动添加网络**
3. **填写以下信息**:

   ```
   网络名称: BSC Testnet
   RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
   链 ID: 97
   货币符号: BNB
   区块浏览器 URL: https://testnet.bscscan.com
   ```

4. **保存**

---

## ✅ 验证部署

### 1. 在 BSCScan 查看合约

访问: https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS

应该能看到：
- 合约代码（如果已验证）
- 交易历史
- 合约状态

### 2. 在前端测试

1. **打开前端应用**: http://localhost:3000
2. **连接钱包**（确保切换到 BSC Testnet）
3. **测试功能**:
   - 查看余额
   - 绑定推荐人
   - 进行质押
   - 查看质押记录

### 3. 验证数据持久化

1. **进行一些操作**（绑定推荐人、质押等）
2. **关闭浏览器**
3. **重新打开**，数据应该还在！

---

## 🔄 切换回 Hardhat Local

如果需要切换回本地测试：

1. **在 MetaMask 中切换到 Hardhat Local 网络**
2. **重启 Hardhat 节点**:
   ```bash
   start-hardhat-local.bat
   ```
3. **重新部署合约**:
   ```bash
   npx hardhat run scripts/deploy-all.ts --network localhost
   ```

---

## 📝 常用命令

### 部署到 BSC Testnet
```bash
npx hardhat run scripts/deploy-all.ts --network bscTestnet
```

### 验证合约（需要 BSCScan API Key）
```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 查看账户余额
```bash
npx hardhat run scripts/check-balance.ts --network bscTestnet
```

### 编译合约
```bash
npx hardhat compile
```

---

## 🆘 常见问题

### Q: 部署失败，提示 "insufficient funds"
**A**: 确保你的钱包有足够的测试网 BNB。访问水龙头获取更多。

### Q: 部署失败，提示 "nonce too low"
**A**: 清除 Hardhat 缓存：
```bash
npx hardhat clean
```

### Q: 前端无法连接合约
**A**: 检查：
1. 环境变量是否正确配置
2. 钱包是否切换到 BSC Testnet
3. 合约地址是否正确
4. 前端是否重启（修改环境变量后需要重启）

### Q: 交易失败
**A**: 检查：
1. 钱包是否有足够的 BNB（Gas 费）
2. 合约地址是否正确
3. 网络是否连接正常

### Q: 如何获取测试 USDT？
**A**: 
- BSC Testnet USDT 地址: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- 可以使用水龙头或从其他测试账户转账

---

## 📚 相关资源

- **BSC Testnet 水龙头**: https://testnet.bnbchain.org/faucet-smart
- **BSCScan 测试网**: https://testnet.bscscan.com
- **BSC 测试网文档**: https://docs.bnbchain.org/docs/rpc

---

## ✅ 完成检查清单

- [ ] 获取测试网 BNB（至少 0.1 BNB）
- [ ] 配置 `.env` 文件（PRIVATE_KEY 等）
- [ ] 部署合约到 BSC Testnet
- [ ] 保存所有合约地址
- [ ] 更新前端配置（`.env.local` 或 `addresses.ts`）
- [ ] 在 MetaMask 中添加 BSC Testnet
- [ ] 重启前端服务器
- [ ] 测试连接和基本功能
- [ ] 验证数据持久化（重启后数据还在）

---

**完成时间**: ________  
**部署的合约地址**:
- StakingContract: `0x...`
- RWAToken: `0x...`
- StRWA: `0x...`
- SwapContract: `0x...`
- LotteryContract: `0x...`

---

**最后更新**: 2026年3月2日
