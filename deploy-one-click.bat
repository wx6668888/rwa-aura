@echo off
echo ========================================
echo BSC主网一键部署脚本
echo ========================================
echo.

if not exist .env.deploy if not exist .env (
  echo [错误] 未找到 .env 或 .env.deploy
  echo 请创建并配置 DEPLOY_PRIVATE_KEY 或 PRIVATE_KEY（勿提交到 Git）
  pause
  exit /b 1
)

echo 1. Hardhat 将从 .env / .env.deploy 加载配置（勿在 bat 中写私钥）
echo.

echo 2. 编译合约...
call npx hardhat compile
if errorlevel 1 (
    echo ✗ 编译失败
    pause
    exit /b 1
)
echo ✓ 编译成功
echo.

echo 3. 执行部署...
call npx hardhat run contracts/deploy-mainnet.js --network bscMainnet
if errorlevel 1 (
    echo ✗ 部署失败
    pause
    exit /b 1
)
echo.

echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 请查看上方输出的合约地址
echo 并按照提示完成后续配置
echo.
pause
