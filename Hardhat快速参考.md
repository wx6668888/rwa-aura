# Hardhat Local 快速参考卡

## 🚀 一键启动（Windows）

```bash
# 1. 启动节点（保持运行）
start-hardhat-local.bat

# 2. 部署合约（新终端）
deploy-and-fix.bat

# 3. 启动前端
cd frontend && npm run dev
```

## 📋 命令速查

### 基础命令

```bash
# 启动节点
npx hardhat node

# 编译合约
npx hardhat compile

# 部署合约
npx hardhat run scripts/deploy-local.ts --network localhost

# 快速修复
npx hardhat run scripts/fix-hardhat-local.ts --network localhost

# 诊断问题
npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost

# 检查余额
npx hardhat run scripts/check-balances.ts --network localhost

# 打开控制台
npx hardhat console --network localhost
```

### 测试命令

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试
npx hardhat test test/StakingContract.test.ts

# 查看测试覆盖率
npx hardhat coverage
```

## 🔧 MetaMask 配置

### 网络设置

```
网络名称: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
货币符号: ETH
```

### 测试账户

```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
余额: 10000 ETH
```

## 📍 默认合约地址

```
TestUSDT:        0x5FbDB2315678afecb367f032d93F642f64180aa3
RWAToken:        0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
StakingContract: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**注意**: 每次重启节点后地址会改变！

## ❌ 常见错误速查

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| Cannot connect | 节点未运行 | `npx hardhat node` |
| Invalid address | 合约未部署 | 运行部署脚本 |
| Nonce too high | MetaMask 不同步 | 重置 MetaMask 账户 |
| Transaction pending | 网络问题 | 检查节点，重置账户 |
| Insufficient funds | 余额不足 | 确认使用测试账户 |

## 🔄 完全重置流程

```bash
# 1. 停止所有服务 (Ctrl+C)
# 2. 清理
npx hardhat clean
# 3. 编译
npx hardhat compile
# 4. 启动节点
npx hardhat node
# 5. 部署（新终端）
npx hardhat run scripts/fix-hardhat-local.ts --network localhost
# 6. 重置 MetaMask
# 7. 刷新浏览器
```

## 🧪 快速测试流程

```bash
# 1. 连接钱包
# 2. 质押 USDT
#    - 授权 → 质押
# 3. 查看仪表板
#    - 确认质押成功
#    - 查看收益
# 4. 提现 RWA
#    - 输入金额 → 提现
# 5. 测试推荐
#    - 切换账户
#    - 使用推荐人质押
```

## 📞 获取帮助

```bash
# 运行诊断
npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost

# 查看完整文档
# - Hardhat本地测试完整指南.md
# - HARDHAT_LOCAL_CONNECTION_FIX.md
```

## 💡 专业提示

- ✅ 保持 Hardhat 节点终端打开
- ✅ 每次重启后重新部署
- ✅ 使用批处理文件自动化
- ✅ 定期重置 MetaMask
- ✅ 记录合约地址

---

**快速链接**:
- 前端: http://localhost:3000
- RPC: http://127.0.0.1:8545
- Chain ID: 31337
