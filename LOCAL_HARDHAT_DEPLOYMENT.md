# Hardhat 本地测试网部署指南

## 概述

使用 Hardhat 本地测试网可以快速测试合约，无需等待 BSC 测试网水龙头。本地测试网提供：
- 10 个预充值账户（每个 10000 ETH）
- 即时交易确认
- 完整的合约功能
- 零成本测试

## 步骤 1: 编译合约

```bash
npx hardhat compile
```

## 步骤 2: 启动本地区块链

在一个终端窗口运行：

```bash
npx hardhat node
```

这会启动一个本地区块链节点在 `http://127.0.0.1:8545`，并显示 10 个测试账户和私钥。

**重要**: 保持这个终端窗口运行！

## 步骤 3: 部署合约

在另一个终端窗口运行：

```bash
npx hardhat run scripts/deploy-all.ts --network localhost
```

这会部署所有合约并输出合约地址。

## 步骤 4: 配置前端

### 4.1 更新 wagmi 配置

编辑 `frontend/lib/wagmi.ts`，添加 localhost 链：

```typescript
import { hardhat } from 'wagmi/chains'

export const config = createConfig({
  chains: [bsc, bscTestnet, hardhat], // 添加 hardhat
  // ...
})
```

### 4.2 更新合约地址配置

编辑 `frontend/lib/contracts/addresses.ts`，添加本地地址：

```typescript
export const STAKING_CONTRACT_ADDRESS = {
  56: process.env.NEXT_PUBLIC_STAKING_CONTRACT_BSC || '',
  97: process.env.NEXT_PUBLIC_STAKING_CONTRACT_TESTNET || '',
  1337: '0x...', // 从部署输出复制
} as const

export const RWA_TOKEN_ADDRESS = {
  56: process.env.NEXT_PUBLIC_RWA_TOKEN_BSC || '',
  97: process.env.NEXT_PUBLIC_RWA_TOKEN_TESTNET || '',
  1337: '0x...', // 从部署输出复制
} as const

export const USDT_ADDRESS = {
  56: '0x55d398326f99059fF775485246999027B3197955',
  97: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  1337: '0x...', // 从部署输出复制（如果部署了测试 USDT）
} as const
```

### 4.3 创建环境变量文件

创建 `frontend/.env.local`：

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# 本地测试网合约地址（从部署输出复制）
NEXT_PUBLIC_STAKING_CONTRACT_LOCAL=0x...
NEXT_PUBLIC_RWA_TOKEN_LOCAL=0x...
```

## 步骤 5: 在 MetaMask 中添加本地网络

1. 打开 MetaMask
2. 点击网络下拉菜单
3. 点击"添加网络"
4. 点击"手动添加网络"
5. 填入以下信息：
   - 网络名称: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - 货币符号: `ETH`
6. 点击"保存"

## 步骤 6: 导入测试账户

从 `npx hardhat node` 的输出中复制一个账户的私钥，然后：

1. 打开 MetaMask
2. 点击账户图标
3. 点击"导入账户"
4. 粘贴私钥
5. 点击"导入"

现在你有一个充值了 10000 ETH 的测试账户！

## 步骤 7: 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000

## 步骤 8: 测试功能

1. 连接 MetaMask（确保选择 Hardhat Local 网络）
2. 测试质押功能
3. 测试提现功能
4. 测试仪表板功能

## 常见问题

### Q: 交易失败，提示 "nonce too high"
A: 在 MetaMask 中重置账户：
1. 设置 -> 高级 -> 重置账户

### Q: 合约地址无效
A: 确保：
1. 本地节点正在运行
2. 合约已部署
3. 地址配置正确

### Q: 无法连接到本地网络
A: 检查：
1. 本地节点是否运行在 8545 端口
2. MetaMask 网络配置是否正确
3. 防火墙是否阻止连接

### Q: 重启后合约地址变了
A: 每次重启 Hardhat 节点，合约地址会改变。需要：
1. 重新部署合约
2. 更新前端配置
3. 在 MetaMask 中重置账户

## 优势

✅ 无需等待水龙头
✅ 即时交易确认
✅ 无限测试代币
✅ 完全离线测试
✅ 零成本

## 劣势

❌ 每次重启需要重新部署
❌ 无法测试真实网络条件
❌ 无法在区块浏览器查看

## 下一步

本地测试完成后，可以：
1. 部署到 BSC 测试网
2. 部署到 BSC 主网
3. 进行安全审计
4. 正式上线

## 有用的命令

```bash
# 编译合约
npx hardhat compile

# 启动本地节点
npx hardhat node

# 部署到本地
npx hardhat run scripts/deploy-all.ts --network localhost

# 运行测试
npx hardhat test

# 清理缓存
npx hardhat clean
```

## 测试账户示例

Hardhat 本地节点会提供 10 个测试账户，例如：

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

...
```

使用这些账户进行测试，每个账户都有 10000 ETH！
