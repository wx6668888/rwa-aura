# MySQL密码重置指南

## 方法1：跳过密码验证启动

1. 停止当前MySQL进程
2. 以跳过授权方式启动：
```bash
E:\Bin\mysqld.exe --skip-grant-tables --datadir=E:\mysql-data
```

3. 新开命令行，无密码登录：
```bash
E:\Bin\mysql.exe -u root
```

4. 重置密码：
```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'wuxi3211';
```

5. 重启MySQL正常模式

## 方法2：使用现有数据库（推荐）

如果你不记得密码，我们可以：
1. 先测试代码编译
2. 等需要时再配置MySQL

要我帮你重置密码吗？还是先测试代码？
