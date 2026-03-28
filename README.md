# RWA Tokenization Protocol

## 🚀 快速开始 - Hardhat Local 测试

### Windows 用户（推荐）

1. **启动 Hardhat 节点**
   ```bash
   双击运行: start-hardhat-local.bat
   ```
   保持这个窗口打开！

2. **部署合约**
   ```bash
   双击运行: deploy-and-fix.bat
   ```

3. **配置 MetaMask**
   - 添加 Hardhat Local 网络 (Chain ID: 31337, RPC: http://127.0.0.1:8545)
   - 导入测试账户私钥: ``

4. **启动前端**
   ```bash
   cd frontend
   npm run dev
   ```

5. **访问应用**
   ```
   http://localhost:3000
   ```

### 命令行方式

```bash
# 终端 1: 启动节点
npx hardhat node

# 终端 2: 部署合约
npx hardhat run scripts/fix-hardhat-local.ts --network localhost

# 终端 3: 启动前端
cd frontend && npm run dev
```

### 遇到问题？

运行诊断工具:
```bash
npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost
```

### 📚 完整文档

- [Hardhat本地测试完整指南.md](./Hardhat本地测试完整指南.md) - 详细教程
- [Hardhat快速参考.md](./Hardhat快速参考.md) - 命令速查
- [HARDHAT_LOCAL_CONNECTION_FIX.md](./HARDHAT_LOCAL_CONNECTION_FIX.md) - 问题修复

---

# RWA Tokenization Protocol

A decentralized RWA (Real World Asset) tokenization protocol on Binance Smart Chain (BSC).

## Features

- **50/50 Asset Allocation Model**: 50% to Treasury, 50% to Community Incentive Pool
- **Unlimited Tier Referral System**: Multi-level referral rewards with tier-based percentages
- **Transaction Tax Mechanism**: Dynamic sell tax on DEX sells (default 10% when no staking info; typically 8%–30% for stakers; Treasury/Burn/Liquidity split 50%/25%/25%)
- **Daily Static Yield**: 0.8% daily yield in RWA tokens
- **Five-Tier Node System**: V1-V5 with different reward percentages (5%-50%)
- **Automated Market Making**: Bot to maintain price stability

## Project Structure

```
rwa-tokenization-protocol/
├── contracts/          # Solidity smart contracts
├── backend/           # Backend services (Node.js/TypeScript)
│   └── src/
│       ├── services/  # Business logic services
│       ├── models/    # Data models
│       ├── utils/     # Utility functions
│       └── config/    # Configuration files
├── scripts/           # Deployment and utility scripts
├── test/             # Smart contract tests
├── frontend/         # Frontend application (React/Next.js)
└── .kiro/specs/      # Specification documents
```

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MySQL >= 8.0
- Redis >= 6.0
- Python >= 3.9 (for market maker bot)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rwa-tokenization-protocol
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with appropriate values.

## Development

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Check Coverage
```bash
npm run coverage
```

### Deploy to BSC Testnet
```bash
npm run deploy:testnet
```

### Deploy to BSC Mainnet
```bash
npm run deploy:mainnet
```

## Documentation

- [Requirements](/.kiro/specs/rwa-tokenization-protocol/requirements.md)
- [Design Document](/.kiro/specs/rwa-tokenization-protocol/design.md)
- [Implementation Tasks](/.kiro/specs/rwa-tokenization-protocol/tasks.md)
- [Implementation Guide](/.kiro/specs/rwa-tokenization-protocol/READY_TO_IMPLEMENT.md)

## Security

This project includes comprehensive security measures:
- ReentrancyGuard for all state-changing functions
- SafeERC20 for token transfers
- Multi-signature Treasury (Gnosis Safe)
- 48-hour TimeLock for sensitive parameter changes
- Comprehensive property-based testing

See [Security Audit Fixes](/.kiro/specs/rwa-tokenization-protocol/SECURITY_AUDIT_FIXES.md) for details.

## License

MIT

## Contact

For questions and support, please open an issue in the repository.
