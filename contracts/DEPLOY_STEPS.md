# BSC主网部署详细步骤说明

## 第一步：准备部署账户

### 1.1 确认部署地址
- **地址**：0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
- **用途**：这个地址将成为所有合约的owner（拥有者）
- **为什么**：owner拥有合约的管理权限，可以配置参数、暂停合约等

### 1.2 充值BNB
- **需要金额**：至少 0.001 BNB（建议 0.002 BNB）
- **用途**：支付部署合约的gas费
- **如何充值**：
  1. 从交易所提现BNB到这个地址
  2. 或从其他钱包转账BNB
- **注意**：主网BNB是真实资金，请确认地址正确

### 1.3 检查余额
```bash
# 可以在BSCScan查看余额
https://bscscan.com/address/0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
```

---

## 第二步：安装依赖

### 2.1 进入项目目录
```bash
cd "E:\MyRWA_Project\rwa aura"
```

### 2.2 安装Hardhat和相关工具
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
```

**为什么需要这些**：
- `hardhat`：以太坊开发环境，用于编译和部署合约
- `@nomicfoundation/hardhat-toolbox`：Hardhat工具集
- `ethers`：与区块链交互的JavaScript库

### 2.3 验证安装
```bash
npx hardhat --version
```
应该显示Hardhat版本号

---

## 第三步：配置环境变量

### 3.1 创建.env.deploy文件
```bash
# 复制模板文件
copy .env.deploy.example .env.deploy
```

### 3.2 编辑.env.deploy
用文本编辑器打开 `.env.deploy`，填入：

```
DEPLOY_PRIVATE_KEY=你的私钥（不要加0x前缀）
BACKEND_ADDRESS=0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
```

**重要安全提醒**：
- 私钥是控制账户的唯一凭证
- 私钥泄露 = 资金被盗
- 不要将.env.deploy提交到git
- 不要通过聊天工具发送私钥

### 3.3 如何获取私钥
- **MetaMask**：设置 → 安全与隐私 → 显示私钥
- **其他钱包**：查看钱包的导出私钥功能
- **格式**：64位十六进制字符串，不要加0x前缀

---

## 第四步：编译合约

### 4.1 编译所有合约
```bash
npx hardhat compile
```

**这一步做什么**：
- 将Solidity代码编译成字节码
- 生成ABI（应用程序二进制接口）
- 检查代码是否有语法错误

### 4.2 预期输出
```
Compiled 15 Solidity files successfully
```

### 4.3 如果出错
- 检查Solidity版本是否匹配（0.8.24）
- 查看错误信息，修复代码问题

---

## 第五步：执行部署

### 5.1 运行部署脚本
```bash
npx hardhat run contracts/deploy-mainnet.js --network bscMainnet
```

**这一步做什么**：
1. 连接到BSC主网
2. 使用您的私钥签名交易
3. 依次部署3个合约：
   - RWAToken（代币合约）
   - ReferralRewardPool（推荐奖励池）
   - StakingContract（质押合约）
4. 配置合约之间的关联

### 5.2 部署过程（约2-5分钟）
```
=== BSC主网合约部署 ===

配置信息：
  Owner地址: 0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
  ...

部署账户: 0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
账户余额: 0.002 BNB

1. 部署RWAToken...
✅ RWAToken部署成功: 0x...

2. 部署ReferralRewardPool...
✅ ReferralRewardPool部署成功: 0x...

3. 部署StakingContract...
✅ StakingContract部署成功: 0x...

4. 配置ReferralRewardPool...
✅ ReferralRewardPool配置完成

5. 配置StakingContract...
✅ StakingContract配置完成

=== 部署完成！===
```

### 5.3 记录合约地址
**非常重要**：复制并保存所有合约地址！

```
RWAToken: 0x...
ReferralRewardPool: 0x...
StakingContract: 0x...
```

---

## 第六步：验证部署

### 6.1 运行验证脚本
```bash
npx hardhat run contracts/verify-deployment.js --network bscMainnet <RWA地址> <Staking地址> <ReferralPool地址>
```

**替换为实际地址**，例如：
```bash
npx hardhat run contracts/verify-deployment.js --network bscMainnet 0x123... 0x456... 0x789...
```

### 6.2 验证内容
脚本会检查：
- ✅ 合约owner是否正确
- ✅ 合约之间的关联是否正确
- ✅ 代币信息是否正确
- ⚠️ 合约余额是否充足

### 6.3 预期输出
```
=== 合约部署验证 ===
...
✅ 所有配置验证通过
```

---

## 第七步：转入初始代币

### 7.1 为什么需要转入代币
- **StakingContract**：需要RWA代币来支付用户的质押奖励
- **ReferralRewardPool**：需要RWA代币来支付推荐奖励

### 7.2 建议金额
- StakingContract：至少 100,000 RWA
- ReferralRewardPool：至少 50,000 RWA

### 7.3 如何转账
使用MetaMask或其他钱包：
1. 添加RWA代币（使用部署的RWA合约地址）
2. 转账到StakingContract地址
3. 转账到ReferralRewardPool地址

### 7.4 验证余额
再次运行验证脚本，确认余额充足

---

## 第八步：更新后端配置

### 8.1 编辑backend/.env
```bash
# 更新为主网配置
BSC_RPC_URL=https://bsc-dataseed.binance.org/
CHAIN_ID=56

# 更新合约地址（替换为实际部署的地址）
RWA_TOKEN_ADDRESS=0x...
STAKING_CONTRACT_ADDRESS=0x...
USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
REFERRAL_REWARD_POOL_ADDRESS=0x...

# 后端私钥（用于调用合约）
BACKEND_PRIVATE_KEY=<后端账户私钥>
```

### 8.2 重启后端服务
```bash
# 停止当前后端
# 然后重新启动
cd "E:\MyRWA_Project\rwa aura\backend"
npm run server
```

---

## 第九步：更新前端配置

### 9.1 编辑前端配置文件
找到前端的配置文件（可能是 `.env` 或 `config.ts`），更新：
```
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/
NEXT_PUBLIC_RWA_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
```

### 9.2 重启前端服务
```bash
cd "E:\MyRWA_Project\rwa aura\frontend"
npm run dev
```

---

## 第十步：功能测试

### 10.1 测试质押功能
1. 连接MetaMask到BSC主网
2. 添加RWA和USDT代币
3. 尝试质押小额USDT（如10 USDT）
4. 检查是否成功

### 10.2 测试提现功能
1. 等待一段时间（或手动触发结算）
2. 尝试提现
3. 检查是否收到代币

### 10.3 测试推荐功能
1. 使用推荐链接注册新账户
2. 新账户质押
3. 检查推荐奖励是否正确

---

## 第十一步：设置多签钱包（重要！）

### 11.1 为什么需要多签
- 单一私钥风险太大
- 多签需要多个签名才能执行操作
- 提高安全性

### 11.2 使用Gnosis Safe
1. 访问：https://app.safe.global/
2. 创建新的Safe钱包
3. 添加多个签名者
4. 设置签名阈值（如3/5）

### 11.3 转移合约ownership
```bash
# 在每个合约上调用transferOwnership
# 将owner转移到Safe钱包地址
```

---

## 常见问题

### Q1: 部署失败，提示gas不足
**解决**：增加BNB余额，至少0.002 BNB

### Q2: 合约验证失败
**解决**：检查合约地址是否正确，重新运行验证脚本

### Q3: 后端连接不上合约
**解决**：检查.env配置，确认合约地址和RPC URL正确

### Q4: 前端显示余额为0
**解决**：
1. 检查前端配置是否更新
2. 确认MetaMask连接到BSC主网
3. 检查合约是否有足够的RWA余额

---

## 紧急情况处理

### 如果发现合约有问题
1. 立即调用 `pause()` 暂停合约
2. 不要向合约转入更多资金
3. 分析问题原因
4. 如需要，重新部署

### 如果私钥泄露
1. 立即转移所有资金到新地址
2. 暂停所有合约
3. 更换所有相关私钥
4. 重新部署（如果必要）

---

## 部署完成检查清单

- [ ] 所有合约部署成功
- [ ] 合约地址已记录并备份
- [ ] 验证脚本通过
- [ ] StakingContract有足够RWA余额
- [ ] ReferralRewardPool有足够RWA余额
- [ ] 后端.env已更新
- [ ] 后端服务已重启并正常运行
- [ ] 前端配置已更新
- [ ] 前端服务已重启
- [ ] 质押功能测试通过
- [ ] 提现功能测试通过
- [ ] 推荐功能测试通过
- [ ] Owner已转移到多签钱包
- [ ] 所有私钥已安全保存

---

**恭喜！部署完成！** 🎉

如有任何问题，请参考DEPLOY_GUIDE.md或联系技术支持。
