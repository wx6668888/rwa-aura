# Hardhat Local 使用说明

## 🎯 目标

本文档帮助你快速上手 Hardhat Local 本地测试环境。

## ⚡ 5 分钟快速开始

### 第一步: 启动节点

**Windows 用户:**
```bash
双击运行: start-hardhat-local.bat
```

**命令行:**
```bash
npx hardhat node
```

**重要**: 保持这个终端窗口打开！

### 第二步: 部署合约

**Windows 用户:**
```bash
双击运行: deploy-and-fix.bat
```

**命令行:**
```bash
npx hardhat run scripts/fix-hardhat-local.ts --network localhost
```

### 第三步: 配置 MetaMask

1. 添加网络:
   - 网络名称: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - 货币符号: `ETH`

2. 导入账户:
   - 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

3. 添加代币（从部署输出复制地址）

### 第四步: 启动前端

```bash
cd frontend
npm run dev
```

### 第五步: 开始测试

访问 http://localhost:3000

---

## 🔧 工具和脚本

### 批处理文件（Windows）

| 文件 | 功能 | 使用方法 |
|------|------|---------|
| `start-hardhat-local.bat` | 启动节点 | 双击运行 |
| `deploy-and-fix.bat` | 部署和修复 | 双击运行 |

### 脚本文件

| 脚本 | 功能 | 命令 |
|------|------|------|
| `fix-hardhat-local.ts` | 快速修复 | `npx hardhat run scripts/fix-hardhat-local.ts --network localhost` |
| `diagnose-hardhat-local.ts` | 诊断问题 | `npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost` |
| `deploy-local.ts` | 完整部署 | `npx hardhat run scripts/deploy-local.ts --network localhost` |
| `check-balances.ts` | 检查余额 | `npx hardhat run scripts/check-balances.ts --network localhost` |

---

## 📖 文档导航

### 新手入门

1. **开始阅读**: [Hardhat本地测试完整指南.md](./Hardhat本地测试完整指南.md)
   - 详细的步骤说明
   - 完整的测试场景
   - 常见问题解答

### 快速查询

2. **命令速查**: [Hardhat快速参考.md](./Hardhat快速参考.md)
   - 常用命令
   - 配置信息
   - 错误速查表

### 问题解决

3. **遇到问题**: [HARDHAT_LOCAL_CONNECTION_FIX.md](./HARDHAT_LOCAL_CONNECTION_FIX.md)
   - 连接问题修复
   - 详细的故障排除
   - 完全重置流程

### 了解更多

4. **修复报告**: [Hardhat_Local_修复完成报告.md](./Hardhat_Local_修复完成报告.md)
   - 修复内容详情
   - 技术实现细节
   - 改进效果分析

---

## ❓ 常见问题

### Q: 如何知道节点是否正在运行？

**A**: 查看终端输出，应该显示:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

或者运行测试命令:
```bash
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}"
```

### Q: 重启后需要做什么？

**A**: 每次重启 Hardhat 节点后:
1. 重新部署合约
2. 在 MetaMask 中重置账户
3. 刷新浏览器

### Q: 如何诊断问题？

**A**: 运行诊断脚本:
```bash
npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost
```

### Q: 合约地址在哪里？

**A**: 
- 部署脚本输出中
- `frontend/lib/contracts/addresses.ts` 文件中
- 诊断脚本输出中

---

## 🎓 学习路径

### 初级（第 1 天）

1. ✅ 启动 Hardhat 节点
2. ✅ 部署合约
3. ✅ 配置 MetaMask
4. ✅ 连接前端
5. ✅ 完成第一笔质押

### 中级（第 2-3 天）

1. ✅ 测试推荐关系
2. ✅ 查看收益明细
3. ✅ 测试提现功能
4. ✅ 使用多个账户
5. ✅ 理解级差奖励

### 高级（第 4-7 天）

1. ✅ 使用 Hardhat Console
2. ✅ 编写自动化测试
3. ✅ 调试合约代码
4. ✅ 优化 Gas 费用
5. ✅ 准备主网部署

---

## 🚨 重要提示

### ⚠️ 数据不持久

Hardhat Local 的数据在重启后会丢失。如果需要持久化数据，请使用 BSC Testnet。

### ⚠️ 仅用于测试

Hardhat Local 仅用于开发和测试，不要用于生产环境。

### ⚠️ 私钥安全

测试私钥是公开的，不要在主网使用！

---

## 💡 专业提示

### 提示 1: 使用别名

在 `.bashrc` 或 `.zshrc` 中添加:
```bash
alias hh-start="npx hardhat node"
alias hh-deploy="npx hardhat run scripts/fix-hardhat-local.ts --network localhost"
alias hh-diagnose="npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost"
```

### 提示 2: 自动化脚本

创建一个启动脚本 `start-all.sh`:
```bash
#!/bin/bash
# 启动所有服务

# 启动 Hardhat 节点（后台）
npx hardhat node &
sleep 5

# 部署合约
npx hardhat run scripts/fix-hardhat-local.ts --network localhost

# 启动前端
cd frontend && npm run dev
```

### 提示 3: 使用 tmux

使用 tmux 管理多个终端:
```bash
# 创建会话
tmux new -s hardhat

# 分割窗口
Ctrl+B %  # 垂直分割
Ctrl+B "  # 水平分割

# 切换窗口
Ctrl+B 方向键
```

---

## 📊 性能优化

### 加快编译速度

在 `hardhat.config.ts` 中:
```typescript
solidity: {
  version: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
```

### 加快测试速度

使用 `--parallel` 标志:
```bash
npx hardhat test --parallel
```

### 减少日志输出

在 `hardhat.config.ts` 中:
```typescript
networks: {
  hardhat: {
    loggingEnabled: false,
  },
}
```

---

## 🔗 相关链接

### 官方文档

- [Hardhat 官方文档](https://hardhat.org/docs)
- [Ethers.js 文档](https://docs.ethers.org/)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/)

### 社区资源

- [Hardhat Discord](https://discord.gg/hardhat)
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- [GitHub Discussions](https://github.com/NomicFoundation/hardhat/discussions)

---

## 📞 获取帮助

### 自助服务

1. 查看文档
2. 运行诊断脚本
3. 搜索常见问题

### 技术支持

1. 提交 Issue
2. 联系开发团队
3. 加入社区讨论

---

## 🎉 开始使用

现在你已经了解了所有必要的信息，可以开始使用 Hardhat Local 进行测试了！

**记住三个关键步骤:**
1. 启动节点
2. 部署合约
3. 开始测试

祝你测试愉快！🚀

---

**最后更新**: 2026-02-28  
**版本**: 1.0  
**维护者**: RWA Protocol Team
