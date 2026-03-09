# Hardhat 本地测试完整指南

## 📋 目录

1. [快速开始](#快速开始)
2. [详细步骤](#详细步骤)
3. [常见问题](#常见问题)
4. [测试场景](#测试场景)
5. [故障排除](#故障排除)

---

## 🚀 快速开始

### 前置要求

- ✅ Node.js v18 或更高版本
- ✅ 已安装项目依赖 (`npm install`)
- ✅ MetaMask 浏览器扩展

### 三步启动

#### 步骤 1: 启动 Hardhat 节点

**Windows 用户:**
```bash
# 双击运行
start-hardhat-local.bat
```

**或使用命令行:**
```bash
npx hardhat node
```

**重要:** 保持这个终端窗口打开！

你会看到类似输出:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

#### 步骤 2: 部署合约

**Windows 用户:**
```bash
# 双击运行
deploy-and-fix.bat
```

**或使用命令行:**
```bash
npx hardhat run scripts/fix-hardhat-local.ts --network localhost
```

这个脚本会:
- ✅ 部署所有合约 (TestUSDT, RWAToken, StakingContract)
- ✅ 配置白名单
- ✅ 分配测试代币
- ✅ 自动更新前端配置

#### 步骤 3: 配置 MetaMask

1. **添加 Hardhat Local 网络**
   - 打开 MetaMask
   - 点击网络下拉菜单 → "添加网络" → "手动添加网络"
   - 填入以下信息:
     ```
     网络名称: Hardhat Local
     RPC URL: http://127.0.0.1:8545
     Chain ID: 31337
     货币符号: ETH
     ```
   - 点击"保存"

2. **导入测试账户**
   - 点击 MetaMask 右上角账户图标
   - 选择"导入账户"
   - 粘贴私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - 点击"导入"

3. **切换到 Hardhat Local 网络**
   - 在 MetaMask 顶部选择 "Hardhat Local"

4. **添加代币**
   - 在 MetaMask 中点击"导入代币"
   - 粘贴合约地址（从部署输出中复制）
   - USDT 和 RWA 代币会自动显示

#### 步骤 4: 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000

---

## 📝 详细步骤

### 1. 环境准备

#### 1.1 检查 Node.js 版本

```bash
node --version
# 应该显示 v18.x.x 或更高
```

#### 1.2 安装依赖

```bash
# 项目根目录
npm install

# 前端目录
cd frontend
npm install
cd ..
```

#### 1.3 编译合约

```bash
npx hardhat compile
```

### 2. 启动本地区块链

#### 2.1 启动 Hardhat 节点

```bash
npx hardhat node
```

**关键信息记录:**
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Account #0 地址: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Account #0 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

#### 2.2 测试节点连接

在新终端运行:
```bash
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}"
```

应该返回: `{"jsonrpc":"2.0","id":1,"result":"0x0"}`

### 3. 部署合约

#### 3.1 运行部署脚本

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

#### 3.2 记录合约地址

从输出中复制以下地址:
```
TestUSDT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
RWAToken deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
StakingContract deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

#### 3.3 更新前端配置

编辑 `frontend/lib/contracts/addresses.ts`:

```typescript
[HARDHAT_CHAIN_ID]: {
  stakingContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // 从部署输出复制
  usdtToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  rwaToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  lotteryContract: '0x0000000000000000000000000000000000000000',
},
```

**注意:** 如果使用 `fix-hardhat-local.ts` 脚本，这一步会自动完成。

### 4. 配置 MetaMask

#### 4.1 添加 Hardhat Local 网络

详细步骤见[快速开始](#步骤-3-配置-metamask)

#### 4.2 导入测试账户

使用 Account #0 的私钥:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

#### 4.3 添加代币到 MetaMask

1. 在 MetaMask 中点击"导入代币"
2. 选择"自定义代币"
3. 粘贴 USDT 合约地址
4. 代币符号和精度会自动填充
5. 点击"添加"
6. 重复步骤添加 RWA 代币

### 5. 启动和测试前端

#### 5.1 启动开发服务器

```bash
cd frontend
npm run dev
```

#### 5.2 访问应用

打开浏览器访问: http://localhost:3000

#### 5.3 连接钱包

1. 点击页面右上角的 "Connect Wallet"
2. 选择 MetaMask
3. 确认连接
4. 确保 MetaMask 显示 "Hardhat Local" 网络

---

## 🧪 测试场景

### 场景 1: 质押 USDT

1. 进入质押页面
2. 输入质押金额（例如: 1000 USDT）
3. 可选：输入推荐人地址
4. 点击"授权 USDT"
5. 在 MetaMask 中确认授权交易
6. 点击"质押"
7. 在 MetaMask 中确认质押交易
8. 等待交易确认（应该是即时的）
9. 查看仪表板，确认质押成功

**预期结果:**
- ✅ USDT 余额减少
- ✅ 质押金额显示在仪表板
- ✅ 如果有推荐人，推荐关系已建立

### 场景 2: 查看收益

1. 进入仪表板页面
2. 查看"我的收益"卡片
3. 应该显示:
   - 静态收益（RWA Token）
   - 动态奖励（USDT）
   - 总收益

**预期结果:**
- ✅ 收益数据正确显示
- ✅ 实时更新

### 场景 3: 提现 RWA Token

1. 进入提现页面
2. 查看可提现余额
3. 输入提现金额
4. 点击"提现"
5. 在 MetaMask 中确认交易
6. 等待交易确认

**预期结果:**
- ✅ RWA Token 余额增加
- ✅ 可提现余额减少
- ✅ 扣除 5% 手续费

### 场景 4: 推荐奖励测试

**需要多个账户:**

1. 使用 Account #0 质押（作为推荐人）
2. 导入 Account #1 到 MetaMask
3. 切换到 Account #1
4. 使用 Account #0 的地址作为推荐人进行质押
5. 切换回 Account #0
6. 查看仪表板，应该看到推荐奖励

**预期结果:**
- ✅ Account #0 收到级差奖励（USDT）
- ✅ 推荐关系正确建立
- ✅ 团队业绩更新

---

## ❓ 常见问题

### Q1: 无法连接到 Hardhat 节点

**症状:** 前端显示 "Cannot connect to network"

**解决方案:**
1. 确认 Hardhat 节点正在运行
2. 检查端口 8545 是否被占用:
   ```bash
   netstat -ano | findstr :8545
   ```
3. 如果被占用，关闭占用的程序或更改 Hardhat 端口

### Q2: 合约地址无效

**症状:** 交易失败，显示 "Invalid contract address"

**解决方案:**
1. 运行诊断脚本:
   ```bash
   npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost
   ```
2. 如果合约未部署，重新运行部署脚本
3. 确认前端配置中的地址正确

### Q3: Nonce too high 错误

**症状:** MetaMask 显示 "Nonce too high"

**解决方案:**
1. 打开 MetaMask
2. 设置 → 高级 → 重置账户
3. 确认重置
4. 刷新页面

### Q4: 交易一直 pending

**症状:** 交易提交后一直显示 pending

**解决方案:**
1. 检查 Hardhat 节点是否正在运行
2. 查看 Hardhat 节点终端的日志
3. 在 MetaMask 中重置账户
4. 重试交易

### Q5: 余额为 0

**症状:** MetaMask 显示 USDT 或 RWA 余额为 0

**解决方案:**
1. 确认已添加正确的代币合约地址
2. 确认合约已部署
3. 运行余额检查脚本:
   ```bash
   npx hardhat run scripts/check-balances.ts --network localhost
   ```

### Q6: 重启后合约地址变了

**症状:** 重启 Hardhat 节点后，之前的合约地址无效

**原因:** Hardhat 节点每次重启都会重置状态

**解决方案:**
每次重启后:
1. 重新部署合约
2. 更新前端配置
3. 在 MetaMask 中重置账户
4. 刷新浏览器

---

## 🔧 故障排除

### 诊断工具

#### 1. 运行完整诊断

```bash
npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost
```

这会检查:
- 网络连接
- 合约部署状态
- 前端配置
- 账户余额

#### 2. 检查合约余额

```bash
npx hardhat run scripts/check-balances.ts --network localhost
```

#### 3. 使用 Hardhat Console

```bash
npx hardhat console --network localhost
```

然后可以直接与合约交互:
```javascript
const StakingContract = await ethers.getContractAt("StakingContract", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0")
const [deployer] = await ethers.getSigners()
const userInfo = await StakingContract.getUserStakeInfo(deployer.address)
console.log(userInfo)
```

### 完全重置流程

如果遇到无法解决的问题，执行完全重置:

```bash
# 1. 停止所有服务 (Ctrl+C)

# 2. 清理缓存
npx hardhat clean

# 3. 重新编译
npx hardhat compile

# 4. 启动 Hardhat 节点
npx hardhat node

# 5. 在新终端部署合约
npx hardhat run scripts/fix-hardhat-local.ts --network localhost

# 6. 在 MetaMask 中重置账户

# 7. 重启前端
cd frontend
npm run dev
```

### 日志和调试

#### 查看 Hardhat 节点日志

Hardhat 节点会显示所有交易和调用，这对调试很有帮助。

#### 启用详细日志

在 `hardhat.config.ts` 中添加:
```typescript
networks: {
  hardhat: {
    chainId: 31337,
    loggingEnabled: true,
  },
}
```

---

## 📊 性能和限制

### 优势

- ✅ **即时确认**: 交易立即确认，无需等待
- ✅ **无限代币**: 每个账户有 10000 ETH
- ✅ **零成本**: 完全免费测试
- ✅ **快速迭代**: 可以快速重置和重新部署
- ✅ **离线测试**: 不需要网络连接

### 限制

- ⚠️ **状态不持久**: 重启节点会丢失所有数据
- ⚠️ **单机运行**: 只能在本地访问
- ⚠️ **无区块浏览器**: 无法在 BSCScan 查看交易

---

## 🎯 最佳实践

### 1. 保持 Hardhat 节点运行

在测试期间，始终保持 Hardhat 节点终端窗口打开。

### 2. 使用脚本自动化

使用提供的批处理文件或脚本，避免手动操作错误。

### 3. 定期重置

如果遇到奇怪的问题，尝试:
1. 重启 Hardhat 节点
2. 重新部署合约
3. 重置 MetaMask 账户

### 4. 记录合约地址

每次部署后，记录合约地址，方便后续调试。

### 5. 使用多个账户测试

导入多个测试账户，测试推荐关系和多用户场景。

---

## 🚀 下一步

本地测试完成后，可以部署到:

1. **BSC Testnet** - 公开测试网
   - 参考: `BSC_TESTNET_DEPLOYMENT_GUIDE.md`
   - 需要测试网 BNB

2. **BSC Mainnet** - 主网
   - 参考: `DEPLOYMENT_GUIDE.md`
   - 需要真实 BNB
   - 需要安全审计

---

## 📚 相关文档

- [HARDHAT_LOCAL_CONNECTION_FIX.md](./HARDHAT_LOCAL_CONNECTION_FIX.md) - 连接问题修复
- [LOCAL_TEST_SETUP.md](./LOCAL_TEST_SETUP.md) - 本地测试设置
- [QUICK_LOCAL_TEST.md](./QUICK_LOCAL_TEST.md) - 快速测试指南
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南

---

## 💡 提示和技巧

### 快捷键

- `Ctrl+C` - 停止 Hardhat 节点
- `Ctrl+Shift+R` - 强制刷新浏览器（清除缓存）

### MetaMask 技巧

- 使用不同的浏览器配置文件测试多账户
- 定期备份 MetaMask 助记词
- 使用 MetaMask 的"活动"标签查看交易历史

### 开发技巧

- 使用 `console.log` 在合约中调试
- 使用 Hardhat 的 `console.sol` 库
- 编写自动化测试脚本

---

**最后更新**: 2026-02-28  
**版本**: 2.0  
**状态**: ✅ 已测试并验证
