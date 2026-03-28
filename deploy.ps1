# 勿在此文件写私钥。Hardhat 会加载根目录 .env.deploy / .env；也可先在会话中导出 DEPLOY_PRIVATE_KEY
if (-not (Test-Path .env.deploy) -and -not (Test-Path .env) -and -not $env:DEPLOY_PRIVATE_KEY -and -not $env:PRIVATE_KEY) {
    Write-Host "[错误] 未找到 .env / .env.deploy，且未设置 DEPLOY_PRIVATE_KEY / PRIVATE_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BSC Mainnet Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Compiling contracts..." -ForegroundColor Yellow
npx hardhat compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Compilation successful." -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Deploying contracts..." -ForegroundColor Yellow
npx hardhat run contracts/deploy-mainnet.js --network bscMainnet
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
pause
