@echo off
echo ========================================
echo BSC Mainnet Deployment
echo ========================================
echo.

if not exist .env.deploy if not exist .env (
  echo [错误] 未找到 .env 或 .env.deploy（需含 DEPLOY_PRIVATE_KEY 或 PRIVATE_KEY）
  pause
  exit /b 1
)

echo Step 1: Compiling contracts...
call npx hardhat compile
if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)
echo Compilation successful.
echo.

echo Step 2: Deploying contracts...
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
pause
