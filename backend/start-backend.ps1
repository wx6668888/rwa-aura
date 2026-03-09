# Backend Service Startup Script
# Usage: .\start-backend.ps1

Write-Host "========================================"
Write-Host "RWA Backend Service Startup"
Write-Host "========================================"
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!"
    Write-Host "Please create .env file first."
    exit 1
}

Write-Host "1. Checking database connection..."
try {
    # Try to connect to MySQL (requires mysql client)
    $result = mysql -h localhost -P 3306 -u rwa_user -prwa_password -e "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK: Database connection successful"
    } else {
        Write-Host "   WARNING: Database connection failed"
        Write-Host "   Please ensure MySQL is running and configured"
    }
} catch {
    Write-Host "   WARNING: Cannot test database connection (mysql client not found)"
    Write-Host "   Please ensure MySQL is running on localhost:3306"
}

Write-Host ""
Write-Host "2. Starting backend service..."
Write-Host ""

# Start the service
npm run dev
