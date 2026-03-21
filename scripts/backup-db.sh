#!/bin/bash

# RWA Protocol 数据库备份脚本
# 
# 使用方法:
# 1. 修改数据库配置
# 2. chmod +x backup-db.sh
# 3. ./backup-db.sh
# 
# 定时任务:
# crontab -e
# 0 2 * * * /path/to/backup-db.sh

# 配置
DB_USER="rwa_user"
DB_PASSWORD="your_password"
DB_NAME="rwa_protocol"
BACKUP_DIR="/var/backups/rwa-protocol"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
echo "开始备份数据库: $DB_NAME"
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/rwa_protocol_$DATE.sql.gz

if [ $? -eq 0 ]; then
    echo "✅ 备份成功: $BACKUP_DIR/rwa_protocol_$DATE.sql.gz"
    
    # 删除旧备份
    find $BACKUP_DIR -name "rwa_protocol_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "✅ 已删除 $RETENTION_DAYS 天前的备份"
else
    echo "❌ 备份失败"
    exit 1
fi

# 显示备份列表
echo ""
echo "当前备份列表:"
ls -lh $BACKUP_DIR/rwa_protocol_*.sql.gz
