# Swap 页面快速开始指南

## 🚀 5 分钟快速部署

### 步骤 1: 安装依赖（1 分钟）
```bash
cd frontend
npm install @pancakeswap/sdk @pancakeswap/v3-sdk @pancakeswap/swap-sdk-core @uniswap/v3-sdk @uniswap/sdk-core
```

### 步骤 2: 部署 RWA Token（1 分钟）
```bash
# 设置环境变量
export PRIVATE_KEY=你的私钥

# 部署到 BSC 主网
npx hardhat run scripts/deploy-rwa-token.ts --network bsc

# 记录输出的 RWA Token 地址
# 例如: 0x1234567890abcdef...
```

### 步骤 3: 创建流动性池（2 分钟）

#### 方法 A: 使用脚本（推荐）
```bash
# 设置 RWA Token 地址
export RWA_TOKEN_ADDRESS=0x你的RWA地址

# 运行脚本
npx hardhat run scripts/create-pancakeswap-pool.ts --network bsc

# 记录输出的池子地址
```

#### 方法 B: 使用 PancakeSwap UI
1. 访问 https://pancakeswap.finance/liquidity
2. 连接钱包（确保在 BSC 主网）
3. 点击 "Add Liquidity" → "Create Pool"
4. 选择代币：
   - Token A: USDT (`0x55d398326f99059fF775485246999027B3197955`)
   - Token B: RWA (你的 RWA Token 地址)
5. 设置费率：0.25%
6. 设置初始价格：1 RWA = 0.85 USDT
7. 确认创建

### 步骤 4: 添加流动性（1 分钟）
在 PancakeSwap 上添加初始流动性：
- 推荐：10,000 USDT + 11,765 RWA
- 最少：1,000 USDT + 1,176 RWA

### 步骤 5: 更新配置（30 秒）
编辑 `frontend/lib/contracts/pancakeswap.ts`：
```typescript
export const RWA_USDT_POOL = '0x你的池子地址';
```

编辑 `frontend/lib/contracts/addresses.ts`：
```typescript
[bsc.id]: {
  rwaToken: '0x你的RWA地址',
  // ...
}
```

### 步骤 6: 测试（30 秒）
```bash
cd frontend
npm run dev

# 访问 http://localhost:3000/swap
# 连接钱包
# 输入金额
# 查看报价
# 执行兑换
```

## ✅ 完成！

现在你的 Swap 页面已经完全可用了！

## 🔍 验证清单

- [ ] 依赖已安装
- [ ] RWA Token 已部署
- [ ] 流动性池已创建
- [ ] 流动性已添加
- [ ] 配置已更新
- [ ] 前端可以访问
- [ ] 可以连接钱包
- [ ] 可以查看报价
- [ ] 可以执行兑换

## 📞 遇到问题？

### 问题 1: 无法获取报价
**原因**: 流动性池未创建或未添加流动性  
**解决**: 检查池子地址是否正确，确保已添加流动性

### 问题 2: 授权失败
**原因**: Gas 不足或用户取消  
**解决**: 确保钱包有足够的 BNB 支付 Gas

### 问题 3: 兑换失败
**原因**: 滑点过低或流动性不足  
**解决**: 增加滑点容忍度或添加更多流动性

### 问题 4: 报价不更新
**原因**: 网络连接问题  
**解决**: 检查网络连接，手动刷新报价

## 📚 详细文档

- `PANCAKESWAP_INTEGRATION_GUIDE.md` - 完整集成指南
- `SWAP_FULL_INTEGRATION_SUMMARY.md` - 完整总结
- `SWAP_ARCHITECTURE_EXPLANATION.md` - 架构说明

## 🎉 恭喜！

你已经成功部署了一个完整的去中心化代币兑换功能！
