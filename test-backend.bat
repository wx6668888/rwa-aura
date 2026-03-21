@echo off
echo ============================================================
echo RWA Protocol - 后端环境测试
echo ============================================================
echo.

echo 步骤 1: 检查 Node.js 安装...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Node.js 未安装
    echo 请从 https://nodejs.org/ 下载并安装 Node.js
    pause
    exit /b 1
)
echo [成功] Node.js 已安装
echo.

echo 步骤 2: 检查 MySQL 安装...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] MySQL 命令行工具未找到
    echo 请确保 MySQL 已安装并添加到 PATH
    echo 下载地址: https://dev.mysql.com/downloads/mysql/
) else (
    echo [成功] MySQL 已安装
)
echo.

echo 步骤 3: 检查 Redis 安装...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] Redis 未运行
    echo 请启动 Redis 服务或从以下地址下载:
    echo https://github.com/microsoftarchive/redis/releases
) else (
    echo [成功] Redis 正在运行
)
echo.

echo 步骤 4: 检查 .env 文件...
if not exist .env (
    echo [警告] .env 文件不存在
    echo 正在从 .env.example 创建...
    copy .env.example .env >nul
    echo [成功] 已创建 .env 文件
    echo 请编辑 .env 文件配置数据库密码
    pause
) else (
    echo [成功] .env 文件存在
)
echo.

echo 步骤 5: 安装后端依赖...
cd backend
if not exist node_modules (
    echo 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        cd ..
        pause
        exit /b 1
    )
    echo [成功] 依赖安装完成
) else (
    echo [成功] 依赖已安装
)
echo.

echo 步骤 6: 运行环境测试...
node test-setup.js
if %errorlevel% neq 0 (
    echo.
    echo [错误] 环境测试失败
    echo 请根据上面的提示解决问题后重试
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ============================================================
echo 测试完成！
echo ============================================================
pause
