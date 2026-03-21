# RWA Protocol 前端集成计划

**创建时间**: 2026-02-26  
**状态**: 进行中

---

## 📊 当前状态

### 已完成
- ✅ 7 个页面 UI 组件（v0 生成）
  1. 首页（营销页面）
  2. Dashboard（仪表板 + 收益）
  3. Stake（质押）
  4. Withdraw（提现）
  5. Emergency（紧急提现）
  6. Nodes（节点等级）
  7. Governance（治理公示栏）
- ✅ Market（行情页面）- 已创建完成
  - 实时价格显示头部
  - 数据源切换器（实时/模拟）
  - 4 种图表类型（K线、折线、深度、成交量）
  - 统计面板（代币信息、价格区间、交易税、相关链接）
  - 最新成交记录表（自动滚动）
  - 完整的 i18n 支持（中英文）

### 待完成
- ❌ 后端 API 集成
- ❌ 钱包连接（wagmi + RainbowKit）
- ❌ 智能合约接口
- ❌ i18n 多语言（剩余 7 种语言翻译）
- ❌ 部署配置

---

## 🎯 集成任务清单

### 任务 1: 创建 Market 行情页面 ✅

**优先级**: 高  
**状态**: 已完成

**已创建文件**:
- ✅ `frontend/app/market/page.tsx` - 主页面
- ✅ `frontend/components/market/price-header.tsx` - 价格头部
- ✅ `frontend/components/market/data-source-switcher.tsx` - 数据源切换
- ✅ `frontend/components/market/chart-panel.tsx` - 图表面板
- ✅ `frontend/components/market/charts/candlestick-chart.tsx` - K线图
- ✅ `frontend/components/market/charts/line-chart.tsx` - 折线图
- ✅ `frontend/components/market/charts/depth-chart.tsx` - 深度图
- ✅ `frontend/components/market/charts/volume-chart.tsx` - 成交量图
- ✅ `frontend/components/market/stats-panel.tsx` - 统计面板
- ✅ `frontend/components/market/recent-trades-table.tsx` - 成交记录表
- ✅ `frontend/hooks/useMarketData.ts` - 市场数据 hooks

**已实现功能**:
- ✅ 实时价格显示（支持模拟数据）
- ✅ 4 种图表类型切换
- ✅ 数据源切换（实时/模拟）
- ✅ 最新成交记录（自动滚动）
- ✅ 代币统计信息
- ✅ 移动端适配
- ✅ 中英文 i18n 支持
- ✅ Navbar 添加"行情"链接

**已安装依赖**:
- ✅ lightweight-charts (图表库)
- ✅ graphql-request (PancakeSwap 数据)
- ✅ zustand (状态管理)

**待优化**:
- ⏳ PancakeSwap V3 Subgraph 实时数据集成（当前使用模拟数据）
- ⏳ BSCScan API 持币地址数查询

---

### 任务 2: i18n 多语言实现 ⏳

**优先级**: 高

**文件**:
- `frontend/messages/zh.json`（默认，已有）
- `frontend/messages/en.json`
- `frontend/messages/es.json`
- `frontend/messages/ar.json`（需 RTL 支持）
- `frontend/messages/hi.json`
- `frontend/messages/fr.json`
- `frontend/messages/pt.json`
- `frontend/messages/ru.json`
- `frontend/messages/ja.json`
- `frontend/middleware.ts`（locale 路由处理）

**功能要求**:
- 从现有代码提取所有 i18n key
- 9 种语言翻译
- 阿拉伯语 RTL 布局支持
- localStorage 持久化（key: 'rwa-locale'）
- 默认语言: zh

---

### 任务 3: 钱包连接 ⏳

**优先级**: 高

**文件**:
- `frontend/lib/wagmi-config.ts`
- `frontend/components/wallet-connect-button.tsx`
- `frontend/hooks/useWallet.ts`

**支持钱包**:
- MetaMask
- OKX Wallet
- Binance Web3 Wallet
- WalletConnect v2
- 任意 injected wallet

**网络配置**:
- 默认: BSC Mainnet (chainId: 56)
- RPC: https://bsc-dataseed.binance.org/
- 自动切换网络提示

**依赖**:
- wagmi v2
- viem
- @rainbow-me/rainbowkit

---

### 任务 4: 智能合约接口 ⏳

**优先级**: 高

**文件**:
- `frontend/contracts/abis/StakingContract.json`
- `frontend/contracts/abis/RWAToken.json`
- `frontend/hooks/useStaking.ts`
- `frontend/hooks/useRWAToken.ts`
- `frontend/hooks/useNodeLevel.ts`

**合约函数**:

**StakingContract**:
- `stake(amount, referrer)` - 质押
- `withdraw(amount)` - 提现
- `emergencyWithdraw()` - 紧急提现
- `getUserInfo(address)` - 获取用户信息
- `getUserStakeInfo(address)` - 获取质押信息
- `getUserRewards(address)` - 获取收益信息

**RWAToken**:
- `balanceOf(address)` - 查询余额
- `approve(spender, amount)` - 授权
- `allowance(owner, spender)` - 查询授权额度

**环境变量** (`.env.local`):
```
NEXT_PUBLIC_STAKING_CONTRACT=0x...
NEXT_PUBLIC_RWA_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_USDT_CONTRACT=0x...
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/
```

---

### 任务 5: 后端 API 集成 ⏳

**优先级**: 高

**API 端点**:
1. `GET /health` - 健康检查
2. `GET /api/user/:address` - 用户信息
3. `GET /api/stakes/:address` - 质押历史
4. `GET /api/rewards/:address` - 收益明细
5. `GET /api/referrals/:address` - 推荐关系
6. `GET /api/level-history/:address` - 节点等级历史
7. `GET /api/stats/global` - 全局统计
8. `GET /api/price/rwa` - 价格查询

**文件**:
- `frontend/lib/api-client.ts` - API 客户端
- `frontend/hooks/useUserData.ts` - 用户数据
- `frontend/hooks/useStakeHistory.ts` - 质押历史
- `frontend/hooks/useRewards.ts` - 收益数据
- `frontend/hooks/useReferrals.ts` - 推荐关系
- `frontend/hooks/useGlobalStats.ts` - 全局统计

**环境变量**:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

### 任务 6: PancakeSwap 数据集成 ⏳

**优先级**: 中

**Subgraph Endpoint**:
```
https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc
```

**查询数据**:
1. 实时价格（token price from pool）
2. 24小时 OHLCV（poolDayDatas）
3. 分时数据（poolHourDatas）
4. 最新成交（swaps, last 50）
5. 持币地址数（BSCScan API）

**刷新策略**:
- 实时价格: 15秒轮询
- 成交记录: 10秒轮询
- K线数据: 60秒轮询
- 持币地址: 10分钟轮询

**环境变量**:
```
NEXT_PUBLIC_RWA_POOL_ADDRESS=0x...
NEXT_PUBLIC_BSCSCAN_API_KEY=...
```

---

### 任务 7: 部署配置 ⏳

**优先级**: 中

**文件**:
- `frontend/vercel.json` - Vercel 配置
- `frontend/.env.example` - 环境变量模板
- `frontend/README.md` - 部署说明

**Vercel 配置**:
- HTTPS 强制
- 路由 rewrites
- 环境变量设置

---

## 📋 验收标准

### 功能验收
- [ ] 所有 8 个页面正常显示
- [ ] 语言切换后所有文字变为对应语言
- [ ] 阿拉伯语切换后整页 RTL 布局
- [ ] 语言选择刷新页面后保留
- [ ] 钱包连接成功（MetaMask/OKX/Binance）
- [ ] BSC 网络不对时有切换提示
- [ ] 质押功能正常（需要合约部署）
- [ ] 提现功能正常（需要合约部署）
- [ ] 收益数据正确显示
- [ ] 推荐关系正确显示
- [ ] 节点等级正确显示
- [ ] 行情数据实时更新
- [ ] 图表交互正常
- [ ] 移动端适配完美

### 性能验收
- [ ] 首屏加载 < 3秒
- [ ] 页面切换流畅
- [ ] 图表渲染流畅（60fps）
- [ ] API 请求有缓存
- [ ] 图片懒加载

### 代码质量
- [ ] TypeScript 无错误
- [ ] ESLint 无警告
- [ ] 所有组件有类型定义
- [ ] 所有 API 调用有错误处理
- [ ] 所有用户操作有加载状态

---

## 🚀 实施顺序

### Phase 1: 基础设施（1-2天）
1. ✅ 创建集成计划文档
2. ⏳ 设置环境变量
3. ⏳ 配置 wagmi + RainbowKit
4. ⏳ 创建 API 客户端
5. ⏳ 创建合约 ABI 文件

### Phase 2: 核心功能（2-3天）
1. ⏳ 实现钱包连接
2. ⏳ 集成智能合约接口
3. ⏳ 集成后端 API
4. ⏳ 实现 i18n 多语言

### Phase 3: 页面集成（2-3天）
1. ⏳ Dashboard 页面集成
2. ⏳ Stake 页面集成
3. ⏳ Withdraw 页面集成
4. ⏳ Emergency 页面集成
5. ⏳ Nodes 页面集成
6. ⏳ Governance 页面集成

### Phase 4: Market 页面（2-3天）
1. ⏳ 创建 Market 页面结构
2. ⏳ 实现图表组件
3. ⏳ 集成 PancakeSwap 数据
4. ⏳ 实现数据切换逻辑

### Phase 5: 测试和优化（1-2天）
1. ⏳ 功能测试
2. ⏳ 性能优化
3. ⏳ 移动端测试
4. ⏳ 浏览器兼容性测试

### Phase 6: 部署（1天）
1. ⏳ Vercel 配置
2. ⏳ 环境变量设置
3. ⏳ 部署测试
4. ⏳ 生产部署

---

## 📝 注意事项

1. **金额精度**: 所有金额使用 18 位精度，需要用 `ethers.utils.formatUnits(amount, 18)` 转换
2. **错误处理**: 所有 API 和合约调用都需要 try-catch
3. **加载状态**: 所有异步操作都需要显示加载状态
4. **移动端**: 所有触摸目标最小 44px
5. **RTL 支持**: 阿拉伯语需要完整的 RTL 布局
6. **性能**: 图表组件需要优化，避免重复渲染

---

**下一步**: 开始 Phase 1 - 基础设施搭建

