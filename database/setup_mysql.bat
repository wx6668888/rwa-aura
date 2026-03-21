@echo off
echo ========================================
echo MySQL 密码重置和表创建
echo ========================================
echo.

echo 步骤1: 停止MySQL
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2 >nul

echo 步骤2: 启动MySQL（跳过密码）
start /B E:\Bin\mysqld.exe --skip-grant-tables --datadir=E:\mysql-data
echo 等待MySQL启动...
timeout /t 5 >nul

echo 步骤3: 重置密码
E:\Bin\mysql.exe -u root --execute="FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'wuxi3211'; FLUSH PRIVILEGES;"
if %errorlevel% neq 0 (
    echo 密码重置失败，请手动操作
    pause
    exit /b 1
)

echo 步骤4: 重启MySQL（正常模式）
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2 >nul
start /B E:\Bin\mysqld.exe --datadir=E:\mysql-data
timeout /t 5 >nul

echo 步骤5: 创建表
E:\Bin\mysql.exe -u root -pwuxi3211 < "E:\MyRWA_Project\rwa aura\database\setup_referral_tables.sql"
if %errorlevel% neq 0 (
    echo 创建表失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 完成！表已创建
echo ========================================
pause
