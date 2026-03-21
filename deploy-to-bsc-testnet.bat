@echo off
echo ========================================
echo 部署到 BSC Testnet
echo ========================================
echo.
echo 此脚本将：
echo 1. 检查环境变量配置
echo 2. 编译合约
echo 3. 部署所有合约到 BSC Testnet
echo.
echo ⚠️  重要提示：
echo - 确保已配置 .env 文件（PRIVATE_KEY 等）
echo - 确保钱包有足够的测试网 BNB（至少 0.1 BNB）
echo - 部署需要 5-10 分钟
echo.
echo ========================================
echo.

REM 检查 .env 文件
if not exist .env (
    echo ❌ 错误：未找到 .env 文件
    echo.
    echo 请先创建 .env 文件并配置以下内容：
    echo   - PRIVATE_KEY=你的测试网私钥
    echo   - BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
    echo   - USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
    echo.
    pause
    exit /b 1
)

echo [1/3] 正在编译合约...
call npx hardhat compile
if errorlevel 1 (
    echo ❌ 编译失败
    pause
    exit /b 1
)
echo ✅ 编译完成
echo.

echo [2/3] 检查账户余额...
echo 正在检查部署账户余额...
echo.

echo [3/3] 正在部署合约到 BSC Testnet...
echo 这可能需要 5-10 分钟，请耐心等待...
echo.
call npx hardhat run scripts/deploy-all.ts --network bscTestnet
if errorlevel 1 (
    echo.
    echo ❌ 部署失败
    echo.
    echo 可能的原因：
    echo - 账户余额不足（需要至少 0.1 BNB）
    echo - 网络连接问题
    echo - 环境变量配置错误
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 部署完成！
echo ========================================
echo.
echo 下一步：
echo 1. 保存上面输出的合约地址
echo 2. 更新 frontend/.env.local 或 frontend/lib/contracts/addresses.ts
echo 3. 在 MetaMask 中添加 BSC Testnet 网络
echo 4. 重启前端服务器
echo 5. 测试功能
echo.
echo 详细说明请查看：切换到BSC测试网指南.md
echo.
pause
