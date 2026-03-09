@echo off
echo ========================================
echo Hardhat Local 部署和修复
echo ========================================
echo.

echo 检查 Hardhat 节点是否运行...
curl -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}" >nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo [错误] Hardhat 节点未运行！
    echo.
    echo 请先在另一个终端运行:
    echo   start-hardhat-local.bat
    echo.
    echo 或者手动运行:
    echo   npx hardhat node
    echo.
    pause
    exit /b 1
)

echo [成功] Hardhat 节点正在运行
echo.

echo 正在部署合约并修复配置...
echo.

npx hardhat run scripts/fix-hardhat-local.ts --network localhost

echo.
echo ========================================
echo 完成！
echo ========================================
echo.
pause
