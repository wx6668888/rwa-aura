@echo off
echo ========================================
echo Hardhat Local 自动启动和部署
echo ========================================
echo.
echo 此脚本将：
echo 1. 启动 Hardhat 节点
echo 2. 等待节点就绪
echo 3. 自动部署所有合约
echo.
echo 注意：Hardhat 节点重启后，所有链上数据会重置
echo 这是 Hardhat 本地节点的正常行为
echo.
echo ========================================
echo.

REM 启动 Hardhat 节点（后台）
echo [1/3] 正在启动 Hardhat 节点...
start "Hardhat Node" cmd /k "npx hardhat node"

REM 等待节点启动（15秒）
echo [2/3] 等待节点启动（15秒）...
timeout /t 15 /nobreak >nul

REM 部署合约
echo [3/3] 正在部署合约...
call npx hardhat run scripts/deploy-all.ts --network localhost

echo.
echo ========================================
echo ✅ 完成！
echo ========================================
echo.
echo Hardhat 节点正在运行（请保持窗口打开）
echo 合约已自动部署
echo.
echo 重要提示：
echo - 如果重启 Hardhat 节点，所有数据会重置
echo - 推荐人地址和质押记录需要重新设置
echo - 如需持久化数据，请使用 BSC Testnet
echo.
pause
