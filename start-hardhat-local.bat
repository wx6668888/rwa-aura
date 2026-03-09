@echo off
echo ========================================
echo Hardhat Local 一键启动
echo ========================================
echo.

echo 正在启动 Hardhat 节点...
echo.
echo ⚠️  重要提示：
echo - Hardhat 节点重启后，所有数据会重置
echo - 推荐人地址和质押记录需要重新设置
echo - 如需自动部署合约，请使用 start-hardhat-with-deploy.bat
echo.
echo 请保持此窗口打开！
echo.
echo 按 Ctrl+C 可以停止节点
echo.
echo ========================================
echo.

npx hardhat node
