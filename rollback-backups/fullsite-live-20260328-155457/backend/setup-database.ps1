# RWA Protocol 数据库快速配置脚本
# 使用方法: .\setup-database.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RWA Protocol 数据库配置脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 MySQL 是否安装
Write-Host "检查 MySQL 安装..." -ForegroundColor Yellow
try {
    $mysqlVersion = mysql --version 2>&1
    Write-Host "✅ MySQL 已安装: $mysqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL 未安装或未添加到 PATH" -ForegroundColor Red
    Write-Host "请先安装 MySQL 并添加到系统 PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "请输入 MySQL root 密码:" -ForegroundColor Yellow
$rootPassword = Read-Host -AsSecureString
$rootPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword))

Write-Host ""
Write-Host "请输入数据库用户密码 (将创建 rwa_user 用户):" -ForegroundColor Yellow
$userPassword = Read-Host -AsSecureString
$userPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($userPassword))

Write-Host ""
Write-Host "正在创建数据库和用户..." -ForegroundColor Yellow

# 创建 SQL 脚本
$sqlScript = @"
CREATE DATABASE IF NOT EXISTS rwa_protocol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'rwa_user'@'localhost' IDENTIFIED BY '$userPasswordPlain';
GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';
FLUSH PRIVILEGES;
"@

# 执行 SQL
$sqlScript | mysql -u root -p"$rootPasswordPlain" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 数据库和用户创建成功" -ForegroundColor Green
} else {
    Write-Host "❌ 数据库创建失败，请检查 MySQL root 密码" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "正在初始化数据库表结构..." -ForegroundColor Yellow

# 执行数据库初始化脚本
$schemaFile = Join-Path $PSScriptRoot "src\config\database.sql"
if (Test-Path $schemaFile) {
    mysql -u rwa_user -p"$userPasswordPlain" rwa_protocol < $schemaFile 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库表结构初始化成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 数据库表结构初始化失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 找不到数据库初始化文件: $schemaFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "正在创建 .env 文件..." -ForegroundColor Yellow

# 创建 .env 文件
$envContent = @"
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=rwa_user
DB_PASSWORD=$userPasswordPlain
DB_NAME=rwa_protocol

# Server Configuration
PORT=3001

# BSC Network Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Contract Addresses (请根据实际部署修改)
STAKING_CONTRACT_ADDRESS=0xYourStakingContractAddress
RWA_TOKEN_ADDRESS=0xYourRWATokenAddress
USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955

# Backend Configuration (可选)
BACKEND_PRIVATE_KEY=0xYourPrivateKeyHere
CONFIRMATION_BLOCKS=12
POLL_INTERVAL=5000

# Redis Configuration (可选)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
"@

$envFile = Join-Path $PSScriptRoot ".env"
$envContent | Out-File -FilePath $envFile -Encoding UTF8 -NoNewline

Write-Host "✅ .env 文件已创建: $envFile" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 数据库配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 检查并编辑 .env 文件中的合约地址" -ForegroundColor White
Write-Host "2. 运行 'npm run dev' 启动后端服务" -ForegroundColor White
Write-Host "3. 访问 http://localhost:3000/admin 查看后台管理" -ForegroundColor White
Write-Host ""
