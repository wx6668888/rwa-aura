# Swap 页面架构说明

## 🎯 核心概念

Swap 页面是一个**纯前端 DApp**，不需要专门的后端服务。

## 🏗️ 架构设计

### 传统中心化交易所
```
用户 → 前端 → 后端API → 数据库
                    ↓
                订单撮合引擎
                    ↓
                执行交易
```

### 我们的去中心化 Swap
```
用户 → 前端 → 区块链
         ↓
    用户钱包签名
         ↓
    PancakeSwap Router 合约
         ↓
    RWA/USDT 流动性池
         ↓
    自动做市商(AMM)算法
```

## 🔗 链上交互流程

### 1. 获取报价
```typescript
用户输入金额
    ↓
前端调用 PancakeSwap Quoter 合约
    ↓
Quoter 计算输出金额和价格影响
    ↓
返回报价给前端显示
```

### 2. 执行兑换
```typescript
用户点击"兑换"
    ↓
检查 USDT 授权状态
    ↓
如果未授权 → 调用 USDT.approve(Router)
    ↓
用户在钱包确认授权
    ↓
调用 Router.exactInputSingle()
    ↓
用户在钱包确认兑换
    ↓
交易上链执行
    ↓
代币自动转入用户钱包
```

## 📦 需要的合约

### 1. PancakeSwap V3 Router
- **地址**: `0x13f4EA83D0bd40E75C8222255bc855a974568Dd4` (BSC 主网)
- **功能**: 执行代币兑换
- **方法**: 
  - `exactInputSingle()` - 精确输入兑换
  - `exactOutputSingle()` - 精确输出兑换

### 2. PancakeSwap V3 Quoter
- **地址**: `0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997` (BSC 主网)
- **功能**: 获取兑换报价
- **方法**:
  - `quoteExactInputSingle()` - 计算输出金额

### 3. RWA/USDT 流动性池
- **地址**: 需要在 PancakeSwap 上创建
- **功能**: 提供流动性
- **费率**: 0.25% (标准费率)

### 4. 代币合约
- **USDT**: BSC 上的 USDT 合约
- **RWA**: 我们的 RWA Token 合约

## 🛠️ 前端集成步骤

### 步骤 1: 安装依赖
```bash
npm install @pancakeswap/sdk
npm install @pancakeswap/v3-sdk
npm install @uniswap/v3-sdk  # PancakeSwap V3 基于 Uniswap V3
```

### 步骤 2: 配置合约地址
```typescript
// frontend/lib/contracts/pancakeswap.ts
export const PANCAKE_ROUTER_V3 = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';
export const PANCAKE_QUOTER_V3 = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
export const RWA_USDT_POOL = '0x...'; // 创建后填写
```

### 步骤 3: 创建 Hooks
- ✅ `useSwap.ts` - 已创建（模板）
- ⏳ `useTokenBalance.ts` - 获取代币余额
- ⏳ `useSwapQuote.ts` - 实时报价更新

### 步骤 4: 实现合约调用
```typescript
// 使用 wagmi 或 ethers.js
import { useContractWrite } from 'wagmi';

// 授权代币
const { write: approve } = useContractWrite({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [PANCAKE_ROUTER_V3, MAX_UINT256],
});

// 执行兑换
const { write: swap } = useContractWrite({
  address: PANCAKE_ROUTER_V3,
  abi: ROUTER_ABI,
  functionName: 'exactInputSingle',
  args: [swapParams],
});
```

## 💰 流动性池创建

### 在 PancakeSwap 上创建 RWA/USDT 池

1. **访问 PancakeSwap V3**
   - https://pancakeswap.finance/liquidity

2. **创建新池**
   - 选择 RWA 和 USDT
   - 设置费率：0.25%
   - 设置初始价格：1 RWA = 0.85 USDT

3. **添加流动性**
   - 提供初始流动性（例如 10,000 USDT + 11,765 RWA）
   - 设置价格区间

4. **获取池地址**
   - 记录池合约地址
   - 更新到前端配置

## 🔐 安全考虑

### 1. 授权管理
- 只授权必要的额度
- 或使用无限授权（用户体验更好）

### 2. 滑点保护
- 默认 0.5% 滑点
- 高价格影响时警告用户
- 用户可自定义滑点

### 3. 交易截止时间
- 默认 20 分钟
- 防止交易长时间挂起

### 4. 前端验证
- 检查余额是否足够
- 检查输入金额是否有效
- 检查网络是否正确（BSC）

## 📊 数据来源

### 实时价格
- **来源**: PancakeSwap Quoter 合约
- **更新频率**: 每 15 秒
- **无需后端**: 直接读取链上数据

### 代币余额
- **来源**: 代币合约
- **更新频率**: 每次交易后
- **无需后端**: 直接读取链上数据

### 交易历史
- **来源**: BSC 区块链浏览器 API
- **可选**: 可以添加后端缓存
- **不影响核心功能**: 只是展示用

## 🎨 用户体验流程

### 正常流程
```
1. 用户连接钱包 ✓
2. 选择代币对 (USDT → RWA) ✓
3. 输入金额 ✓
4. 查看报价（自动更新）✓
5. 点击"授权 USDT"
6. 在 MetaMask 确认授权
7. 等待授权交易确认
8. 点击"立即兑换"
9. 在 MetaMask 确认兑换
10. 等待兑换交易确认
11. 显示成功，余额更新 ✓
```

### 错误处理
- 用户取消交易 → 显示"已取消"
- 余额不足 → 禁用按钮
- 网络错误 → 显示错误信息
- Gas 不足 → 提示充值 BNB

## 🚀 部署清单

### 前端部署
- ✅ Swap 页面组件已创建
- ⏳ 实现 PancakeSwap SDK 集成
- ⏳ 添加实时报价功能
- ⏳ 添加交易确认覆盖层

### 链上准备
- ⏳ 在 PancakeSwap 创建 RWA/USDT 池
- ⏳ 添加初始流动性
- ⏳ 测试兑换功能
- ⏳ 更新合约地址到前端

### 测试
- ⏳ 测试网测试（BSC Testnet）
- ⏳ 小额主网测试
- ⏳ 完整功能测试

## 📝 总结

### 为什么不需要后端？

1. **去中心化原则**
   - 用户直接与区块链交互
   - 无需信任中心化服务器

2. **PancakeSwap 提供基础设施**
   - Router 合约处理兑换逻辑
   - 流动性池提供流动性
   - Quoter 合约提供报价

3. **用户钱包管理资产**
   - 代币在用户钱包中
   - 用户控制私钥
   - 交易需要用户签名

4. **降低运营成本**
   - 无需维护后端服务器
   - 无需数据库
   - 无需订单撮合引擎

### 什么时候需要后端？

可选的后端功能（不影响核心功能）：

1. **交易历史缓存**
   - 加快历史记录加载
   - 提供统计数据

2. **价格图表数据**
   - 历史价格数据
   - K线图数据

3. **通知服务**
   - 交易完成通知
   - 价格提醒

4. **分析统计**
   - 交易量统计
   - 用户行为分析

---

**结论**: Swap 页面是纯前端 DApp，核心功能完全在链上实现，不需要专门的后端服务。这是 DeFi 应用的标准架构。
