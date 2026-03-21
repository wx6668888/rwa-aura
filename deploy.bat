@echo off
chcp 65001 >nul
echo ========================================
echo BSC Mainnet Deployment Script
echo ========================================
echo.

set DEPLOY_PRIVATE_KEY=72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200
set BACKEND_ADDRESS=0x08Ea66321c4dd47468c3aDc55d06c5De7129A292

echo Step 1: Creating .env.deploy file...
echo DEPLOY_PRIVATE_KEY=%DEPLOY_PRIVATE_KEY%> .env.deploy
echo BACKEND_ADDRESS=%BACKEND_ADDRESS%>> .env.deploy
echo Done.
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
