@echo off
echo ========================================
echo BSC Testnet 配置检查
echo ========================================
echo.
echo 正在检查配置...
echo.

call npx hardhat run scripts/check-bsc-testnet-config.ts --network bscTestnet

echo.
pause
