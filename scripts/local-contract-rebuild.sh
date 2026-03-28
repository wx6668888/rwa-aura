#!/usr/bin/env bash
# 本地：编译合约 + 提示如何起节点/部署（不启动长驻进程）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> hardhat compile"
npx hardhat compile

echo ""
echo "=== 编译完成 ==="
echo ""
echo "【全套本地测试链】（代币+质押+交换等一次部署）"
echo "  终端 A: npx hardhat node"
echo "  终端 B: npx hardhat run scripts/deploy-local-test.ts --network localhost"
echo ""
echo "【只部署新版 StakingContract】（你已有所需 USDT/RWA/国库/后端地址）"
echo "  终端 A: npx hardhat node"
echo "  终端 B:"
echo "    export USDT_TOKEN_ADDRESS=0x..."
echo "    export RWA_TOKEN_ADDRESS=0x..."
echo "    export TREASURY_ADDRESS=0x..."
echo "    export BACKEND_ADDRESS=0x..."
echo "    npx hardhat run scripts/deploy-staking-from-env.ts --network localhost"
echo ""
echo "【单元测试】"
echo "  npx hardhat test"
echo ""
