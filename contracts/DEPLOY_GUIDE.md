# BSC主网部署指南

## ⚠️ 安全警告
**绝对不要通过任何聊天工具、邮件或其他方式分享私钥！**
私钥泄露会导致资金被盗，无法追回。

## 部署前准备

### 1. 准备部署账户
- 地址：0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
- 需要BNB余额：至少 0.001 BNB（建议 0.002 BNB）
- 用途：支付部署gas费

### 2. 配置Hardhat
在项目根目录创建或修改 `hardhat.config.js`：

```javascript
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env.DEPLOY_PRIVATE_KEY]
    }
  }
};
```

### 3. 配置环境变量
在项目根目录创建 `.env.deploy` 文件（不要提交到git）：

```
DEPLOY_PRIVATE_KEY=你的私钥（不要加0x前缀）
BACKEND_ADDRESS=0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
```

## 部署步骤

### 1. 安装依赖
```bash
cd "E:\MyRWA_Project\rwa aura\contracts"
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### 2. 执行部署
```bash
npx hardhat run deploy-mainnet.js --network bscMainnet
```

### 3. 记录合约地址
部署完成后，脚本会输出所有合约地址，请妥善保存。

## 部署后配置

### 1. 更新后端.env配置
```bash
# BSC主网配置
BSC_RPC_URL=https://bsc-dataseed.binance.org/
CHAIN_ID=56

# 合约地址（替换为实际部署的地址）
RWA_TOKEN_ADDRESS=<RWAToken地址>
STAKING_CONTRACT_ADDRESS=<StakingContract地址>
USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
REFERRAL_REWARD_POOL_ADDRESS=<ReferralRewardPool地址>

# 后端私钥（用于调用合约）
BACKEND_PRIVATE_KEY=<后端账户私钥>
```

### 2. 转入初始代币
```bash
# 向StakingContract转入RWA代币（用于奖励）
# 建议：至少100,000 RWA

# 向ReferralRewardPool转入RWA代币（用于推荐奖励）
# 建议：至少50,000 RWA
```

### 3. 验证合约
在BSCScan上验证合约源码：
- 访问：https://bscscan.com/verifyContract
- 上传合约源码和构造函数参数

### 4. 设置多签钱包
```bash
# 使用Gnosis Safe创建多签钱包
# 然后将合约owner转移到多签地址
```

## 部署后检查清单

- [ ] 所有合约部署成功
- [ ] 合约地址已记录
- [ ] 后端.env已更新
- [ ] StakingContract有足够的RWA余额
- [ ] ReferralRewardPool有足够的RWA余额
- [ ] 后端服务已重启
- [ ] 前端配置已更新
- [ ] 合约已在BSCScan验证
- [ ] Owner已转移到多签钱包
- [ ] 测试质押功能正常
- [ ] 测试提现功能正常
- [ ] 测试推荐功能正常

## 需要修改的文件

### 后端
1. `backend/.env` - 更新合约地址和RPC URL
2. 重启后端服务

### 前端
1. `frontend/.env` 或配置文件 - 更新合约地址
2. 重启前端服务

## 紧急回滚方案

如果部署后发现问题：
1. 立即暂停合约（调用pause()）
2. 不要向合约转入大量资金
3. 重新部署并测试
4. 确认无误后再正式启用

## 联系方式

如有问题，请联系技术支持。

