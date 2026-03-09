# Start MySQL database service (Windows)
# Usage: .\start-database.ps1

$names = 'MySQL80','MySQL57','MySQL','MYSQL80','MYSQL57','MYSQL'
$started = $false
foreach ($n in $names) {
    $s = Get-Service -Name $n -ErrorAction SilentlyContinue
    if ($s) {
        Write-Host "Found: $n Status=$($s.Status)"
        if ($s.Status -ne 'Running') {
            Start-Service -Name $n -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        $s2 = Get-Service -Name $n -ErrorAction SilentlyContinue
        if ($s2.Status -eq 'Running') {
            Write-Host "MySQL is running."
            $started = $true
        }
        break
    }
}
if (-not $started) {
    Write-Host "MySQL service not found. Install from: https://dev.mysql.com/downloads/installer/"
    Write-Host "Then run: Get-Service *mysql*  and  Start-Service <name>"
    exit 1
}
exit 0
