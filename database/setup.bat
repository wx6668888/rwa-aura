@echo off
chcp 65001 >nul
echo ========================================
echo MySQL Password Reset and Table Creation
echo ========================================
echo.

echo Step 1: Stop MySQL
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Start MySQL (skip password)
start /B E:\Bin\mysqld.exe --skip-grant-tables --datadir=E:\mysql-data
echo Waiting for MySQL to start...
timeout /t 5 /nobreak >nul

echo Step 3: Reset password
E:\Bin\mysql.exe -u root --execute="FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'wuxi3211'; FLUSH PRIVILEGES;"
if %errorlevel% neq 0 (
    echo Password reset failed
    pause
    exit /b 1
)

echo Step 4: Restart MySQL (normal mode)
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2 /nobreak >nul
start /B E:\Bin\mysqld.exe --datadir=E:\mysql-data
timeout /t 5 /nobreak >nul

echo Step 5: Create tables
E:\Bin\mysql.exe -u root -pwuxi3211 < "E:\MyRWA_Project\rwa aura\database\setup_referral_tables.sql"
if %errorlevel% neq 0 (
    echo Table creation failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Done! Tables created successfully
echo ========================================
pause
