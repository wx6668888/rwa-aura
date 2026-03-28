@echo off
chcp 65001 >nul
echo ========================================
echo BSC Mainnet Deployment Script
echo ========================================
echo.

if not exist .env.deploy if not exist .env (
  echo [错误] 未找到 .env 或 .env.deploy
  echo 请在项目根目录创建其一，并配置 DEPLOY_PRIVATE_KEY 或 PRIVATE_KEY（勿写入本 bat）
  pause
  exit /b 1
)

echo Step 1: Hardhat 将从 .env.deploy / .env 加载私钥
echo.

echo Step 2: Compiling contracts...
call npx hardhat compile
if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)
echo Compilation successful.
echo.

echo Step 3: Deploying contracts...
call npx hardhat run contracts/deploy-mainnet.js --network bscMainnet
if errorlevel 1 (
    echo Deployment failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Please check the contract addresses above.
echo.
pause
