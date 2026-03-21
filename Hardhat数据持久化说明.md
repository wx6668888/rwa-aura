# ⚠️ Hardhat 本地节点数据持久化说明

## 📋 问题说明

### 为什么重启后数据会丢失？

**Hardhat 本地节点默认使用内存存储**，每次重启都会从创世区块重新开始。这是 Hardhat 的设计特性，用于快速开发和测试。

### 受影响的数据：

1. ✅ **合约部署** - 合约地址会改变
2. ✅ **推荐人绑定** - 需要重新绑定
3. ✅ **质押记录** - 所有质押数据会丢失
4. ✅ **代币余额** - 余额会重置
5. ✅ **交易历史** - 所有交易记录会消失

---

## 🔧 解决方案

### 方案 1：使用自动化部署脚本（推荐）

使用 `start-hardhat-with-deploy.bat` 脚本，它会：
- 自动启动 Hardhat 节点
- 等待节点就绪
- 自动部署所有合约

**使用方法：**
```bash
start-hardhat-with-deploy.bat
```

**优点：**
- 一键启动和部署
- 无需手动操作

**缺点：**
- 用户数据（推荐人、质押记录）仍需重新设置

---

### 方案 2：使用 BSC Testnet（数据永久保存）

**BSC Testnet 特点：**
- ✅ 数据永久保存
- ✅ 重启后数据不丢失
- ✅ 真实的区块链环境
- ✅ 可以测试真实场景

**配置方法：**
1. 在 MetaMask 中添加 BSC Testnet
2. 从水龙头获取测试币
3. 部署合约到 BSC Testnet
4. 所有数据会永久保存

**BSC Testnet 信息：**
- RPC URL: `https://data-seed-prebsc-1-s1.binance.org:8545`
- Chain ID: `97`
- 区块浏览器: `https://testnet.bscscan.com`

---

### 方案 3：使用 Hardhat Fork（高级）

从 BSC Testnet 分叉，保留测试网状态：

**配置 `hardhat.config.ts`：**
```typescript
networks: {
  hardhat: {
    forking: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      enabled: true,
    },
  },
}
```

**优点：**
- 保留测试网状态
- 可以测试真实场景

**缺点：**
- 需要网络连接
- 配置较复杂

---

## 🚀 快速开始

### 使用自动化脚本（最简单）

1. **双击运行：**
   ```
   start-hardhat-with-deploy.bat
   ```

2. **等待完成：**
   - 节点启动（约 15 秒）
   - 合约部署（约 30-60 秒）

3. **开始使用：**
   - 在 MetaMask 中连接到 Hardhat Local
   - 重新绑定推荐人地址
   - 重新进行质押

---

## 📝 工作流程建议

### 开发阶段（使用 Hardhat Local）

1. 启动 Hardhat 节点
2. 部署合约
3. 进行测试
4. **保存重要信息**（合约地址、交易哈希等）
5. 如需重启，使用自动化脚本重新部署

### 测试阶段（使用 BSC Testnet）

1. 部署到 BSC Testnet
2. 进行完整测试
3. 数据永久保存
4. 可以分享给团队测试

---

## ⚠️ 重要提示

### Hardhat Local 的限制

- ❌ **数据不持久** - 重启后丢失
- ❌ **仅本地访问** - 其他人无法访问
- ❌ **测试币无限** - 不反映真实情况

### 何时使用 Hardhat Local

- ✅ 快速开发和调试
- ✅ 本地测试合约逻辑
- ✅ 不需要持久化数据
- ✅ 快速迭代

### 何时使用 BSC Testnet

- ✅ 需要持久化数据
- ✅ 团队协作测试
- ✅ 模拟真实环境
- ✅ 长期测试

---

## 🔄 数据恢复建议

### 如果重启了 Hardhat 节点

1. **使用自动化脚本重新部署：**
   ```bash
   start-hardhat-with-deploy.bat
   ```

2. **重新绑定推荐人：**
   - 访问前端页面
   - 重新设置推荐人地址

3. **重新进行质押：**
   - 使用测试账户进行质押
   - 验证功能正常

### 保存重要信息

建议在测试时保存：
- 合约部署地址
- 重要交易哈希
- 测试账户地址
- 推荐人关系

---

## 📚 相关文件

- `start-hardhat-local.bat` - 仅启动节点
- `start-hardhat-with-deploy.bat` - 启动节点并自动部署
- `scripts/deploy-all.ts` - 部署脚本
- `hardhat.config.ts` - Hardhat 配置

---

**最后更新：** 2026年3月2日
