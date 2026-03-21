# BSC 测试网部署指南

## 部署前准备

### 1. 获取测试网 BNB

你需要在 BSC 测试网上有一些 BNB 用于支付 Gas 费用。

**获取测试网 BNB 的方式：**
1. 访问 BSC 测试网水龙头：https://testnet.bnbchain.org/faucet-smart
2. 输入你的钱包地址
3. 完成验证码
4. 获取 0.5 BNB（每24小时可领取一次）

### 2. 配置环境变量

创建 `.env` 文件（基于 `.env.example`）：

```bash
# 复制示例文件
cp .env.example .env
```

然后编辑 `.env` 文件，填入以下必需信息：

```env
# 你的私钥（用于部署合约的钱包）
PRIVATE_KEY=your_private_key_here

# BSC 测试网 RPC（默认即可）
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# BSC 测试网 USDT 地址
USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# 可选：自定义地址（不填则使用部署者地址）
TREASURY_ADDRESS=
LIQUIDITY_FUND_ADDRESS=
BACKEND_ADDRESS=

# BSCScan API Key（用于验证合约，可选）
BSCSCAN_API_KEY=
```

**重要提示：**
- 永远不要提交包含真实私钥的 `.env` 文件到 Git
- 使用测试钱包，不要使用包含真实资金的钱包
- 确保 `.env` 文件在 `.gitignore` 中

### 3. 安装依赖

```bash
npm install
```

### 4. 编译合约

```bash
npx hardhat compile
```

## 部署步骤

### 方法 1: 使用部署脚本（推荐）

```bash
npx hardhat run scripts/deploy-all.ts --network bscTestnet
```

这个脚本会：
1. 部署 RWAToken 合约
2. 部署 StakingContract 合约
3. 配置白名单
4. 验证部署
5. 输出所有合约地址

### 方法 2: 分步部署

#### 步骤 1: 部署 RWA Token

```bash
npx hardhat run scripts/deploy-rwa-token.ts --network bscTestnet
```

记录输出的 RWA Token 地址。

#### 步骤 2: 部署 Staking Contract

编辑部署脚本，填入 RWA Token 地址，然后运行：

```bash
npx hardhat run scripts/deploy-staking.ts --network bscTestnet
```

## 部署后配置

### 1. 保存合约地址

将部署输出的地址保存到 `.env` 文件：

```env
RWA_TOKEN_ADDRESS=0x...
STAKING_CONTRACT_ADDRESS=0x...
```

### 2. 更新前端配置

将合约地址添加到 `frontend/.env.local`：

```env
# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# BSC 测试网合约地址
NEXT_PUBLIC_STAKING_CONTRACT_TESTNET=0x...
NEXT_PUBLIC_RWA_TOKEN_TESTNET=0x...
```

### 3. 验证合约（可选）

如果你有 BSCScan API Key，可以验证合约：

```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

例如：

```bash
# 验证 RWAToken
npx hardhat verify --network bscTestnet 0x... "0xTreasuryAddress" "0xLiquidityFundAddress"

# 验证 StakingContract
npx hardhat verify --network bscTestnet 0x... "0xUSDTAddress" "0xRWATokenAddress" "0xTreasuryAddress" "0xBackendAddress"
```

## 测试部署

### 1. 在 BSCScan 测试网查看合约

访问：https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS

### 2. 获取测试 USDT

BSC 测试网 USDT 地址：`0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`

你可以：
1. 使用水龙头获取测试 USDT
2. 或者部署自己的测试 USDT 合约

### 3. 测试质押流程

1. 在前端连接钱包（切换到 BSC 测试网）
2. 授权 USDT
3. 质押 USDT
4. 查看交易状态

## 常见问题

### Q: 部署失败，提示 "insufficient funds"
A: 确保你的钱包有足够的测试网 BNB。访问水龙头获取更多。

### Q: 部署失败，提示 "nonce too low"
A: 清除 Hardhat 缓存：`npx hardhat clean`

### Q: 如何查看部署的合约？
A: 访问 https://testnet.bscscan.com/address/YOUR_ADDRESS

### Q: 前端无法连接合约
A: 检查：
1. 环境变量是否正确配置
2. 钱包是否切换到 BSC 测试网
3. 合约地址是否正确

### Q: 交易失败
A: 检查：
1. Gas 费用是否足够
2. 合约是否正确部署
3. 授权是否成功
4. 余额是否足够

## 部署检查清单

- [ ] 获取测试网 BNB
- [ ] 配置 `.env` 文件
- [ ] 编译合约
- [ ] 部署 RWAToken
- [ ] 部署 StakingContract
- [ ] 配置白名单
- [ ] 保存合约地址
- [ ] 更新前端配置
- [ ] 验证合约（可选）
- [ ] 测试质押流程
- [ ] 测试提现流程

## 下一步

部署成功后：
1. 测试所有功能
2. 记录任何问题
3. 准备主网部署
4. 进行安全审计

## 有用的链接

- BSC 测试网浏览器：https://testnet.bscscan.com/
- BSC 测试网水龙头：https://testnet.bnbchain.org/faucet-smart
- BSC 测试网 RPC：https://data-seed-prebsc-1-s1.binance.org:8545
- BSC 测试网 Chain ID：97
- Hardhat 文档：https://hardhat.org/docs

