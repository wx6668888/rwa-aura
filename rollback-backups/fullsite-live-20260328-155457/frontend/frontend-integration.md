# 前端集成任务规格

## 背景
v0 已生成所有 8 个页面的 UI 组件（Next.js 14 + Tailwind）。
Kiro 负责接入真实功能。

## 任务 1：i18n 完整实现
依赖：next-intl

- 创建 /messages/ 目录
- 9 个语言文件：
  zh.json（默认，已有内容）
  en.json es.json ar.json hi.json 
  fr.json pt.json ru.json ja.json
- 从 v0 代码的 lib/i18n.ts 提取所有 key
- ar.json 需同时配置 RTL 支持
- middleware.ts 处理 locale 路由
- 语言选择持久化 localStorage key: 'rwa-locale'
- 默认 locale: zh

## 任务 2：钱包连接
依赖：wagmi v2 + viem + @rainbow-me/rainbowkit

支持钱包：
- MetaMask
- OKX Wallet（window.okxwallet）
- Binance Web3 Wallet（window.BinanceChain）
- WalletConnect v2
- 任意 injected wallet

网络配置：
- 默认：BSC Mainnet chainId 56
- RPC: https://bsc-dataseed.binance.org
- 网络不对：自动弹出切换网络提示
- 移动端钱包浏览器：自动识别注入钱包

## 任务 3：合约接口占位
创建以下文件（返回 mock 数据，等合约部署后替换）：

/contracts/abis/StakingContract.json
/contracts/abis/RWAToken.json
/hooks/useStaking.ts
  - stake(amount, referrer)
  - withdraw(amount)
  - emergencyWithdraw()
  - getUserInfo(address)
/hooks/useRWAToken.ts
  - getBalance(address)
  - approve(spender, amount)
/hooks/useNodeLevel.ts
  - getNodeLevel(address)
  - getLevelRequirements(level)

环境变量（.env.local）：
NEXT_PUBLIC_STAKING_CONTRACT=
NEXT_PUBLIC_RWA_TOKEN_CONTRACT=
NEXT_PUBLIC_CHAIN_ID=56

## 任务 4：部署配置

Vercel 部署：
- vercel.json 配置
- 环境变量模板 .env.example
- HTTPS 强制（钱包连接必须）
- 所有路由 rewrites 配置

## 验收标准
- [ ] 语言切换后所有页面文字变为对应语言
- [ ] 阿拉伯语切换后整页 RTL 布局
- [ ] 语言选择刷新页面后保留
- [ ] OKX/币安钱包内置浏览器可正常连接
- [ ] BSC 网络不对时有切换提示
- [ ] 所有合约函数有 mock 返回值
- [ ] Vercel 一键部署成功

## 任务 5：行情页数据接入

### PancakeSwap 实时数据
依赖：graphql-request

subgraph endpoint:
https://api.thegraph.com/subgraphs/name/
pancakeswap/exchange-v3-bsc

所需查询：
1. 实时价格 (token price from pool)
2. 24小时 OHLCV (poolDayDatas)
3. 分时数据 (poolHourDatas)  
4. 最新成交 (swaps, last 50)
5. 持币地址数 (从BSCScan API获取)

环境变量追加：
NEXT_PUBLIC_RWA_POOL_ADDRESS=
NEXT_PUBLIC_BSCSCAN_API_KEY=

刷新策略：
- 实时价格：15秒轮询
- 成交记录：10秒轮询
- K线数据：60秒轮询
- 持币地址：10分钟轮询

### 数据切换逻辑
useMarketData(source: 'live' | 'mock') hook:
- source='live': 调用PancakeSwap subgraph
- source='mock': 返回本地mock数据
- 切换时图表平滑过渡，不闪烁

### 验收标准
- [ ] 实时价格15秒自动刷新
- [ ] K线/折线/深度/成交量4图正常切换
- [ ] 时间周期切换正常
- [ ] PancakeSwap数据失败时优雅降级到缓存
- [ ] 成交记录实时滚动
- [ ] 移动端图表可正常交互（pinch zoom）