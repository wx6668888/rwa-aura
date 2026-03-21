@echo off
echo ========================================
echo BSC主网一键部署脚本
echo ========================================
echo.

REM 设置私钥（仅在本地使用）
set DEPLOY_PRIVATE_KEY=72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200
set BACKEND_ADDRESS=0x08Ea66321c4dd47468c3aDc55d06c5De7129A292

echo 1. 创建环境变量文件...
echo DEPLOY_PRIVATE_KEY=%DEPLOY_PRIVATE_KEY%> .env.deploy
echo BACKEND_ADDRESS=%BACKEND_ADDRESS%>> .env.deploy
echo ✓ 环境变量文件已创建
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
