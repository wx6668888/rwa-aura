# MySQL 5.7 兼容性说明

## ✅ 完全兼容

你的项目**完全兼容 MySQL 5.7**,无需升级到 MySQL 8.0!

## 📁 使用正确的数据库文件

项目提供了两个数据库文件:

### 1. MySQL 5.7 用户 (推荐你使用)

```bash
backend/src/config/database-mysql57.sql
```

**特点:**
- ✅ 完全兼容 MySQL 5.7
- ✅ 移除了 `CREATE OR REPLACE VIEW` 语法
- ✅ 使用 `DROP VIEW IF EXISTS` + `CREATE VIEW`
- ✅ 所有功能完整保留

### 2. MySQL 8.0+ 用户

```bash
backend/src/config/database.sql
```

**特点:**
- 使用 MySQL 8.0 新特性
- `CREATE OR REPLACE VIEW` 语法

## 🚀 部署步骤

### 在宝塔面板中

1. **创建数据库**
   - 数据库名: `rwa_staking`
   - 用户名: `rwa_user`
   - 密码: (自动生成)

2. **导入数据库结构**

   在宝塔面板 → 数据库 → 导入:
   - 选择文件: `backend/src/config/database-mysql57.sql`
   - 点击"导入"

### 使用命令行

```bash
# SSH 登录服务器后
cd /www/wwwroot/api.vekus.qzz.io/backend

# 导入数据库
mysql -u rwa_user -p rwa_staking < src/config/database-mysql57.sql
```

## 🔍 主要差异

### MySQL 5.7 vs MySQL 8.0

| 功能 | MySQL 5.7 | MySQL 8.0 |
|------|-----------|-----------|
| 视图创建 | `DROP VIEW IF EXISTS` + `CREATE VIEW` | `CREATE OR REPLACE VIEW` |
| 存储过程 | `DROP PROCEDURE IF EXISTS` + `CREATE PROCEDURE` | 相同 |
| 其他功能 | 完全相同 | 完全相同 |

## ✨ 功能完整性

使用 MySQL 5.7 版本,你将获得:

- ✅ 所有数据表 (users, stakes, rewards, etc.)
- ✅ 所有索引和外键
- ✅ 所有视图 (v_user_summary, v_department_summary)
- ✅ 所有存储过程 (sp_build_referral_relations, sp_update_team_volume)
- ✅ 完整的性能优化
- ✅ 完整的事务支持

## 🎯 性能说明

MySQL 5.7 的性能对于本项目来说**完全足够**:

- 支持 InnoDB 引擎
- 支持事务和外键
- 支持复杂查询和索引
- 支持存储过程和视图
- 支持 JSON 数据类型 (如需要)

## 📊 测试建议

部署后,可以运行以下 SQL 验证:

```sql
-- 检查所有表是否创建成功
SHOW TABLES;

-- 检查视图
SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW';

-- 检查存储过程
SHOW PROCEDURE STATUS WHERE Db = 'rwa_staking';

-- 检查系统配置
SELECT * FROM system_config;
```

## 🔧 如果遇到问题

### 问题 1: 导入失败

**解决方案:**
1. 确认使用的是 `database-mysql57.sql` 文件
2. 检查 MySQL 版本: `SELECT VERSION();`
3. 确认数据库字符集: `utf8mb4`

### 问题 2: 视图创建失败

**解决方案:**
```sql
-- 手动删除视图
DROP VIEW IF EXISTS v_user_summary;
DROP VIEW IF EXISTS v_department_summary;

-- 重新导入
SOURCE /path/to/database-mysql57.sql;
```

### 问题 3: 存储过程失败

**解决方案:**
```sql
-- 手动删除存储过程
DROP PROCEDURE IF EXISTS sp_build_referral_relations;
DROP PROCEDURE IF EXISTS sp_update_team_volume;

-- 重新导入
SOURCE /path/to/database-mysql57.sql;
```

## 💡 总结

**你的 MySQL 5.7 完全可以使用!**

只需要:
1. 使用 `database-mysql57.sql` 文件
2. 按照正常流程部署
3. 享受完整功能

没有任何功能限制,性能完全足够!
