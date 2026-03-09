# 快速本地测试指南

## 当前状态 ✅

### 1. 本地 Hardhat 节点 - 运行中
- URL: http://127.0.0.1:8545
- Chain ID: 1337
- 状态: ✅ 运行中

### 2. 合约已部署
- **RWAToken**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **StakingContract**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **USDT**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` (测试地址)

### 3. 前端服务器 - 运行中
- URL: http://localhost:3000
- 状态: ✅ 运行中

### 4. 前端配置 - 已更新
- ✅ wagmi 配置已添加 Hardhat 链
- ✅ 合约地址已配置

## 测试步骤

### 步骤 1: 在 MetaMask 中添加本地网络

1. 打开 MetaMask
2. 点击网络下拉菜单
3. 点击"添加网络"
4. 点击"手动添加网络"
5. 填入以下信息：
   ```
   网络名称: Hardhat Local
   RPC URL: http://127.0.0.1:8545
   Chain ID: 1337
   货币符号: ETH
   ```
6. 点击"保存"

### 步骤 2: 导入测试账户

从 Hardhat 节点输出中选择一个账户（推荐使用 Account #0）：

**Account #0**:
- 地址: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- 余额: 10000 ETH

**导入步骤**:
1. 打开 MetaMask
2. 点击账户图标
3. 点击"导入账户"
4. 粘贴私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
5. 点击"导入"

⚠️ **警告**: 这是公开的测试私钥，永远不要在主网使用！

### 步骤 3: 访问前端

1. 打开浏览器访问: http://localhost:3000
2. 点击"连接钱包"
3. 选择 MetaMask
4. 确保选择了 "Hardhat Local" 网络
5. 授权连接

### 步骤 4: 测试质押功能

由于本地测试网没有真实的 USDT，你需要：

**选项 A: 部署测试 USDT 合约**（推荐）
```bash
# 创建并运行部署脚本
npx hardhat run scripts/deploy-test-usdt.ts --network localhost
```

**选项 B: 直接测试 RWA 功能**
- 查看 RWA 余额
- 测试 RWA 转账
- 测试白名单功能

### 步骤 5: 查看合约交互

在浏览器控制台中，你可以看到所有的合约调用和交易。

## 测试 USDT 合约部署

让我创建一个简单的测试 USDT 合约：

```solidity
// contracts/TestUSDT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDT is ERC20 {
    constructor() ERC20("Test USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**6); // 100万 USDT (6 decimals)
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

## 常见问题

### Q: MetaMask 显示 "nonce too high"
A: 在 MetaMask 中重置账户：
1. 设置 -> 高级 -> 重置账户

### Q: 无法连接到本地网络
A: 检查：
1. Hardhat 节点是否运行: `npx hardhat node`
2. 端口 8545 是否被占用
3. MetaMask 网络配置是否正确

### Q: 交易失败
A: 检查：
1. 账户余额是否足够
2. 合约地址是否正确
3. 查看浏览器控制台错误信息

### Q: 前端显示错误网络
A: 在 MetaMask 中切换到 "Hardhat Local" 网络

## 下一步

本地测试成功后：
1. 部署测试 USDT 合约
2. 测试完整的质押流程
3. 测试提现流程
4. 测试仪表板功能
5. 准备部署到 BSC 测试网

## 有用的命令

```bash
# 查看 Hardhat 节点日志
# (在运行 npx hardhat node 的终端窗口)

# 重新部署合约
npx hardhat run scripts/deploy-all.ts --network localhost

# 运行测试
npx hardhat test

# 编译合约
npx hardhat compile

# 清理缓存
npx hardhat clean
```

## 测试账户列表

Hardhat 提供了 20 个测试账户，每个都有 10000 ETH：

| 账户 | 地址 | 余额 |
|------|------|------|
| #0 | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | 10000 ETH |
| #1 | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | 10000 ETH |
| #2 | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | 10000 ETH |
| ... | ... | ... |

使用这些账户进行多用户测试！

## 成功标准

✅ MetaMask 连接成功
✅ 显示正确的网络（Hardhat Local）
✅ 显示账户余额（10000 ETH）
✅ 可以查看合约数据
✅ 可以发送交易

## 注意事项

⚠️ 每次重启 Hardhat 节点，所有数据都会重置
⚠️ 合约地址会改变，需要重新部署
⚠️ 需要在 MetaMask 中重置账户
⚠️ 这是测试环境，不要用于生产

## 支持

如果遇到问题：
1. 检查 Hardhat 节点是否运行
2. 检查前端服务器是否运行
3. 查看浏览器控制台错误
4. 查看 Hardhat 节点日志
5. 重置 MetaMask 账户
