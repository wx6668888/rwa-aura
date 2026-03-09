# Start MySQL from E: drive (E:\Bin\mysqld.exe, data: E:\mysql-data)
# Run: .\start-mysql-e-drive.ps1

$mysqld = "E:\Bin\mysqld.exe"
$datadir = "E:\mysql-data"
$port = 3306

if (-not (Test-Path $mysqld)) {
    Write-Host "Not found: $mysqld" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $datadir)) {
    Write-Host "Data dir not found: $datadir" -ForegroundColor Red
    exit 1
}

# Check if already running (port 3306)
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Host "MySQL already listening on port $port." -ForegroundColor Green
    exit 0
}

Write-Host "Starting MySQL: datadir=$datadir port=$port" -ForegroundColor Cyan
$prevDir = Get-Location
Set-Location "E:\Bin"
Start-Process -FilePath $mysqld -ArgumentList "--datadir=$datadir","--port=$port" -WindowStyle Hidden
Set-Location $prevDir
Start-Sleep -Seconds 3
$again = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($again) {
    Write-Host "MySQL started successfully on port $port." -ForegroundColor Green
} else {
    Write-Host "MySQL may still be starting. Check E:\mysql-data\*.err for errors." -ForegroundColor Yellow
}
