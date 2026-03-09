# 🔧 MetaMask 测试账户配置指南

**问题**: "The account you are trying to import is a duplicate"  
**说明**: 这个提示表示账户已经存在于 MetaMask 中，可以直接使用！

---

## ✅ 解决方案

### 情况 1: 账户已存在（您的情况）

**提示 "duplicate" 是正常的**，说明：
- ✅ 账户已经在 MetaMask 中
- ✅ 可以直接使用，无需重新导入

**操作步骤**:
1. 在 MetaMask 中切换到该账户（如果还没选中）
2. 确保切换到 **Hardhat Local** 网络
3. 检查 USDT 余额（应该显示 1,100,000 USDT）

---

## 🔍 检查账户状态

### 1. 确认账户地址

在 MetaMask 中确认账户地址是：
```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### 2. 检查网络

确保已切换到 **Hardhat Local** 网络：
- 网络名称: `Hardhat Local`
- Chain ID: `31337`
- RPC URL: `http://127.0.0.1:8545`

### 3. 检查余额

- **ETH 余额**: 应该有 ~9999 ETH（Hardhat 默认）
- **USDT 余额**: 应该有 1,100,000 USDT

---

## 🚀 如果 USDT 余额仍为 0

### 方法 1: 手动添加 USDT Token

1. 在 MetaMask 中点击 "导入代币"
2. 选择 "自定义代币"
3. 输入以下信息：
   - **代币合约地址**: `0x9E545E3C0baAB3E08CdfD552C960A1050f373042`
   - **代币符号**: `USDT`
   - **小数精度**: `6`
4. 点击 "添加自定义代币"
5. 确认添加

### 方法 2: 重新 Mint USDT

如果余额仍为 0，可以重新运行 mint 脚本：

```bash
npx hardhat run scripts/mint-test-usdt.ts --network localhost
```

---

## 📝 完整测试流程

### 步骤 1: 确认 MetaMask 配置

- [x] 账户已存在（无需重新导入）
- [ ] 切换到 Hardhat Local 网络
- [ ] 检查 ETH 余额（应该有 ~9999 ETH）
- [ ] 添加 USDT Token（如果看不到余额）

### 步骤 2: 更新前端配置

需要更新前端合约地址，我可以帮您完成。

### 步骤 3: 启动前端

```bash
cd frontend
npm run dev
```

访问: http://localhost:3000

### 步骤 4: 连接钱包

1. 点击 "连接钱包"
2. 选择 MetaMask
3. 确认连接
4. 应该能看到 USDT 余额

---

## 🔧 常见问题

### Q1: 看不到 USDT 余额

**解决**:
1. 手动添加 USDT Token（见上方方法 1）
2. 或重新运行 mint 脚本

### Q2: 网络连接失败

**解决**:
1. 确认 Hardhat 节点正在运行
2. 检查 RPC URL: `http://127.0.0.1:8545`
3. 尝试重启 Hardhat 节点

### Q3: 交易失败

**解决**:
1. 确认网络是 Hardhat Local (Chain ID: 31337)
2. 确认账户有足够的 ETH（Gas 费用）
3. 检查合约地址是否正确

---

## ✅ 快速检查清单

- [ ] MetaMask 账户地址正确: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- [ ] 网络是 Hardhat Local (Chain ID: 31337)
- [ ] ETH 余额 > 0
- [ ] USDT Token 已添加
- [ ] USDT 余额 > 0
- [ ] 前端已启动
- [ ] 钱包已连接

---

**账户已存在，可以直接使用！** ✅

**下一步**: 检查 USDT 余额，如果看不到，请手动添加 USDT Token。
