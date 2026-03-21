# MySQL 安装指南（Windows）

## 方法1：使用 MySQL Installer（推荐）

1. **下载 MySQL Installer**
   - 访问：https://dev.mysql.com/downloads/installer/
   - 下载：mysql-installer-community-8.x.x.msi

2. **安装步骤**
   - 运行安装程序
   - 选择 "Developer Default" 或 "Server only"
   - 设置 root 密码（记住这个密码！）
   - 端口：3306（默认）

3. **验证安装**
   ```bash
   mysql --version
   ```

## 方法2：使用 Chocolatey

```bash
choco install mysql
```

## 安装后配置

1. **启动 MySQL 服务**
   ```bash
   net start MySQL80
   ```

2. **登录 MySQL**
   ```bash
   mysql -u root -p
   ```

3. **创建数据库和用户**
   ```sql
   CREATE DATABASE rwa_protocol;
   CREATE USER 'rwa_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON rwa_protocol.* TO 'rwa_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **执行推荐奖励表创建脚本**
   ```sql
   USE rwa_protocol;
   source E:/MyRWA_Project/rwa aura/database/create_referral_tables.sql
   ```

## 更新 .env 文件

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=rwa_user
DB_PASSWORD=your_password
DB_NAME=rwa_protocol
```

安装完成后告诉我，我们继续下一步！
