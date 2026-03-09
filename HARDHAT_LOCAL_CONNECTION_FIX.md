# Hardhat Local 网络连接修复指南

## 🚀 快速修复（推荐）

### Windows 用户

**方法 1: 使用批处理文件（最简单）**

1. 双击运行 `start-hardhat-local.bat` 启动节点（保持窗口打开）
2. 双击运行 `deploy-and-fix.bat` 部署合约并自动修复配置
3. 完成！

**方法 2: 使用命令行**

```bash
# 终端 1: 启动 Hardhat 节点
npx hardhat node

# 终端 2: 运行快速修复脚本
npx hardhat run scripts/fix-hardhat-local.ts --network localhost
```

### 诊断工具

如果遇到问题，运行诊断脚本：

```bash
npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost
```

这个脚本会检查：
- ✅ 网络连接状态
- ✅ 合约部署状态
- ✅ 前端配置是否正确
- ✅ 测试账户余额

---

## 问题诊断

如果快速修复无法解决问题，请按照以下步骤手动检查和修复。

## 步骤 1: 确认 Hardhat 节点正在运行

### 1.1 启动 Hardhat 节点

在项目根目录打开一个终端，运行：

```bash
npx hardhat node
```

你应该看到类似这样的输出：

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

**重要**: 保持这个终端窗口运行！不要关闭它。

### 1.2 测试节点连接

在另一个终端运行：

```bash
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

如果返回类似 `{"jsonrpc":"2.0","id":1,"result":"0x0"}` 说明节点正常运行。

## 步骤 2: 部署合约到本地网络

### 2.1 编译合约

```bash
npx hardhat compile
```

### 2.2 部署所有合约

在新终端运行：

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

**记录输出的合约地址！** 你会看到类似：

```
Deploying contracts to Hardhat Local...

TestUSDT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
RWAToken deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
StakingContract deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

### 2.3 更新合约地址配置

编辑 `frontend/lib/contracts/addresses.ts`，更新 Hardhat 部分的地址：

```typescript
[HARDHAT_CHAIN_ID]: {
  stakingContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // 从部署输出复制
  usdtToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',       // 从部署输出复制
  rwaToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',       // 从部署输出复制
  lotteryContract: '0x0000000000000000000000000000000000000000',
},
```

## 步骤 3: 配置 MetaMask

### 3.1 添加 Hardhat Local 网络

1. 打开 MetaMask
2. 点击顶部的网络下拉菜单
3. 点击 "添加网络"
4. 点击 "手动添加网络"
5. 填入以下信息：

```
网络名称: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
货币符号: ETH
区块浏览器 URL: (留空)
```

6. 点击 "保存"

### 3.2 导入测试账户

从 `npx hardhat node` 的输出中复制 Account #0 的私钥：

```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

然后在 MetaMask 中：

1. 点击右上角的账户图标
2. 点击 "导入账户"
3. 粘贴私钥
4. 点击 "导入"

现在你有一个充值了 10000 ETH 的测试账户！

### 3.3 切换到 Hardhat Local 网络

在 MetaMask 中，点击顶部网络下拉菜单，选择 "Hardhat Local"。

## 步骤 4: 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000

## 步骤 5: 测试连接

1. 在浏览器中打开 http://localhost:3000
2. 点击 "Connect Wallet" 按钮
3. 选择 MetaMask
4. 确认连接
5. 确保 MetaMask 显示的是 "Hardhat Local" 网络

## 常见问题和解决方案

### ❌ 问题 1: "Cannot connect to network"

**原因**: Hardhat 节点没有运行

**解决方案**:
```bash
# 在项目根目录运行
npx hardhat node
```

保持终端窗口打开！

---

### ❌ 问题 2: "Invalid contract address"

**原因**: 合约地址配置错误或合约未部署

**解决方案**:
1. 确认 Hardhat 节点正在运行
2. 重新部署合约：
   ```bash
   npx hardhat run scripts/deploy-local.ts --network localhost
   ```
3. 更新 `frontend/lib/contracts/addresses.ts` 中的地址

---

### ❌ 问题 3: "Nonce too high" 错误

**原因**: MetaMask 的 nonce 与本地链不同步

**解决方案**:
1. 打开 MetaMask
2. 点击右上角的账户图标
3. 设置 → 高级 → 重置账户
4. 确认重置

---

### ❌ 问题 4: 重启后合约地址变了

**原因**: 每次重启 Hardhat 节点，合约地址会改变

**解决方案**:
每次重启 Hardhat 节点后：
1. 重新部署合约
2. 更新前端配置中的地址
3. 在 MetaMask 中重置账户

---

### ❌ 问题 5: "Chain ID mismatch"

**原因**: MetaMask 配置的 Chain ID 不正确

**解决方案**:
确保 MetaMask 中 Hardhat Local 网络的 Chain ID 是 `31337`

---

### ❌ 问题 6: 交易一直 pending

**原因**: Gas 设置问题或网络连接问题

**解决方案**:
1. 检查 Hardhat 节点是否正在运行
2. 在 MetaMask 中重置账户
3. 刷新页面重试

---

### ❌ 问题 7: "Insufficient funds"

**原因**: 账户没有足够的 ETH

**解决方案**:
确保你导入的是 Hardhat 提供的测试账户（每个有 10000 ETH）

---

## 完整的测试流程

### 终端 1: Hardhat 节点
```bash
npx hardhat node
```
保持运行！

### 终端 2: 部署合约
```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

### 终端 3: 启动前端
```bash
cd frontend
npm run dev
```

### 浏览器:
1. 访问 http://localhost:3000
2. 连接 MetaMask (Hardhat Local 网络)
3. 测试功能

## 验证清单

在开始测试前，确认以下所有项：

- [ ] Hardhat 节点正在运行 (`npx hardhat node`)
- [ ] 合约已部署到本地网络
- [ ] 合约地址已更新到 `frontend/lib/contracts/addresses.ts`
- [ ] MetaMask 已添加 Hardhat Local 网络 (Chain ID: 31337)
- [ ] MetaMask 已导入测试账户
- [ ] MetaMask 已切换到 Hardhat Local 网络
- [ ] 前端正在运行 (`npm run dev`)
- [ ] 浏览器已打开 http://localhost:3000

## 快速重启流程

如果你关闭了 Hardhat 节点并想重新开始：

```bash
# 1. 启动 Hardhat 节点
npx hardhat node

# 2. 在新终端部署合约
npx hardhat run scripts/deploy-local.ts --network localhost

# 3. 更新合约地址（如果地址变了）
# 编辑 frontend/lib/contracts/addresses.ts

# 4. 在 MetaMask 中重置账户
# 设置 → 高级 → 重置账户

# 5. 刷新浏览器页面
```

## 调试技巧

### 查看 Hardhat 节点日志

Hardhat 节点会显示所有交易和调用，这对调试很有帮助。

### 使用 Hardhat Console

```bash
npx hardhat console --network localhost
```

然后你可以直接与合约交互：

```javascript
const StakingContract = await ethers.getContractAt("StakingContract", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0")
const balance = await StakingContract.getUserStake("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
console.log(balance.toString())
```

### 检查合约部署

```bash
npx hardhat run scripts/check-balances.ts --network localhost
```

## 优势

✅ 即时交易确认（无需等待）
✅ 无限测试代币（10000 ETH per account）
✅ 完全离线测试
✅ 零成本
✅ 快速迭代

## 下一步

本地测试完成后，可以部署到：
1. BSC Testnet（测试网）
2. BSC Mainnet（主网）

## 需要帮助？

如果以上步骤都无法解决问题，请检查：

1. Node.js 版本（建议 v18 或更高）
2. 防火墙设置（确保 8545 端口未被阻止）
3. 其他程序是否占用 8545 端口
4. Hardhat 和依赖是否正确安装

运行以下命令检查：

```bash
# 检查 Node.js 版本
node --version

# 检查端口占用
netstat -ano | findstr :8545

# 重新安装依赖
npm install
```

---

**最后更新**: 2026-02-28
**状态**: ✅ 已测试并验证
