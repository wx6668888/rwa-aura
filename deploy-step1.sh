#!/bin/bash
# RWA Protocol 宝塔一键部署脚本
# 域名: rwaprotocol.dpdns.org

set -e

echo "=========================================="
echo "RWA Protocol 部署脚本"
echo "=========================================="

# 配置变量
DOMAIN="rwaprotocol.dpdns.org"
PROJECT_DIR="/www/wwwroot/rwa-protocol"
DB_NAME="rwa_protocol"
DB_USER="rwa_user"
DB_PASS=$(openssl rand -base64 12)

echo "1. 检查环境..."
command -v node >/dev/null 2>&1 || { echo "请先在宝塔安装Node.js"; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "请先在宝塔安装MySQL"; exit 1; }
command -v redis-cli >/dev/null 2>&1 || { echo "请先在宝塔安装Redis"; exit 1; }

echo "2. 创建项目目录..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

echo "3. 克隆代码..."
echo "请手动上传代码到 $PROJECT_DIR 或使用git clone"
echo "如果已上传，按回车继续..."
read

echo "4. 创建数据库..."
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "数据库创建成功！"
echo "数据库名: $DB_NAME"
echo "用户名: $DB_USER"
echo "密码: $DB_PASS"
echo "请保存这些信息！"

echo "5. 导入数据库结构..."
if [ -f "$PROJECT_DIR/database/schema.sql" ]; then
    mysql -u $DB_USER -p$DB_PASS $DB_NAME < $PROJECT_DIR/database/schema.sql
    echo "数据库导入成功"
else
    echo "警告: 未找到database/schema.sql，请手动导入"
fi

echo "=========================================="
echo "部署脚本第一部分完成！"
echo "=========================================="
echo ""
echo "数据库信息："
echo "  数据库名: $DB_NAME"
echo "  用户名: $DB_USER"
echo "  密码: $DB_PASS"
echo ""
echo "请继续执行 deploy-step2.sh"
