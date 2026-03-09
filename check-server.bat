@echo off
echo ========================================
echo 检查 Next.js 开发服务器状态
echo ========================================
echo.

echo 1. 检查端口 3000 是否被占用...
netstat -ano | findstr :3000
echo.

echo 2. 尝试访问本地服务器...
curl http://localhost:3000 -I
echo.

echo 3. 检查 Node.js 进程...
tasklist | findstr node.exe
echo.

echo ========================================
echo 如果看到 "HTTP/1.1 200 OK" 说明服务器正常
echo 请在浏览器中访问: http://localhost:3000
echo ========================================
pause
