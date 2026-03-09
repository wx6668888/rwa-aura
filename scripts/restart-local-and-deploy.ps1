# Restart Hardhat node and deploy (UTF-8)
# Run from project root: .\scripts\restart-local-and-deploy.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    $projectRoot = (Get-Location).Path
}
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hardhat local node + deploy + config" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kill process on 8545
$listeners = netstat -ano 2>$null | findstr ":8545"
if ($listeners) {
    Write-Host "[1/4] Stopping process on port 8545..." -ForegroundColor Yellow
    $pids = @()
    foreach ($line in $listeners) {
        if ($line -match "\s+(\d+)\s*$") { $pids += $Matches[1] }
    }
    $pids = $pids | Select-Object -Unique
    foreach ($p in $pids) {
        try {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped PID: $p"
        } catch {}
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/4] Port 8545 free, skip kill" -ForegroundColor Green
}

# 2. Start Hardhat node in new window (so it stays running)
Write-Host ""
$url8545 = "http://127.0.0.1:8545"
Write-Host "[2/4] Starting Hardhat node at $url8545 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$projectRoot`" && npx hardhat node" -WindowStyle Normal
Start-Sleep -Seconds 3

# Wait for 8545 to be listening (max 30s)
$maxWait = 30
$waited = 0
$ready = $false
while ($waited -lt $maxWait) {
    $conn = netstat -ano 2>$null | findstr "127.0.0.1:8545"
    if ($conn) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
}
if (-not $ready) {
    Write-Host "  Node did not start in time. Start manually: npx hardhat node" -ForegroundColor Red
    Write-Host "  Then run: npm run deploy:local" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Node is running" -ForegroundColor Green

# 3. Deploy
Write-Host ""
Write-Host "[3/4] Deploying and writing backend/.env, frontend/.env.local, addresses.ts ..." -ForegroundColor Yellow
& npx hardhat run scripts/deploy-local-test.ts --network localhost
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed. Ensure node is running then: npm run deploy:local" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/4] Done" -ForegroundColor Green
Write-Host "  Test account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" -ForegroundColor White
Write-Host "  Next: cd frontend; npm run dev   and   npm run backend:dev" -ForegroundColor Cyan
Write-Host "  Hardhat node is in its own window; close that window to stop the node." -ForegroundColor Gray
