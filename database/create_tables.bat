@echo off
echo 正在创建推荐奖励表...
echo.
echo 请输入MySQL root密码：
E:\Bin\mysql.exe -u root -p < "E:\MyRWA_Project\rwa aura\database\setup_referral_tables.sql"
echo.
echo 完成！按任意键退出...
pause
