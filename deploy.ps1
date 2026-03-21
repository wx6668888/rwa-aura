$env:DEPLOY_PRIVATE_KEY = "72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200"
$env:BACKEND_ADDRESS = "0x08Ea66321c4dd47468c3aDc55d06c5De7129A292"

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
