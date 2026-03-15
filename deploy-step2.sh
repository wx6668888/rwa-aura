#!/bin/bash
# RWA Protocol 部署脚本 - 第二步
# 配置环境变量和安装依赖

set -e

PROJECT_DIR="/www/wwwroot/rwa-protocol"
cd $PROJECT_DIR

echo "=========================================="
echo "配置环境变量"
echo "=========================================="

# 读取数据库密码
echo "请输入数据库密码（从step1获取）："
read DB_PASS

# 创建后端.env
cat > backend/.env <<EOF
# 数据库配置
DB_HOST=localhost
DB_USER=rwa_user
DB_PASSWORD=$DB_PASS
DB_NAME=rwa_protocol
DB_PORT=3306

# Redis配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 服务器配置
PORT=3001
NODE_ENV=production

# 区块链配置（需要手动填写）
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
STAKING_CONTRACT_ADDRESS=你的质押合约地址
RWA_TOKEN_ADDRESS=你的RWA代币地址
USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
REFERRAL_REWARD_POOL=你的推荐奖励池地址
BACKEND_PRIVATE_KEY=你的后端钱包私钥

# 其他配置
CONFIRMATION_BLOCKS=12
POLL_INTERVAL=5000
EOF

echo "后端.env创建成功！"
echo "⚠️  请编辑 backend/.env 填写区块链配置"

# 创建前端.env
cat > frontend/.env.production <<EOF
NEXT_PUBLIC_API_URL=https://rwaprotocol.dpdns.org/api
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org
EOF

echo "前端.env创建成功！"

echo ""
echo "请继续执行 deploy-step3.sh"
