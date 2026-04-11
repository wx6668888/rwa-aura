# 使用说明

## ✅ 文件已创建

### 主文件
- `RWA_BOT_001_clean.txt` - **完整配置文件** (已去除 $schema)
- `RWA_BOT_001_persona.txt` - 原始版本
- `bot-generation-plan.md` - 50个机器人生成规划
- `README.md` - 详细文档

## 📝 使用步骤

### 1. 重命名文件
```bash
# Windows PowerShell
Copy-Item bot/RWA_BOT_001_clean.txt bot/RWA_BOT_001.json

# 或者直接在文件管理器中重命名
RWA_BOT_001_clean.txt → RWA_BOT_001.json
```

### 2. 验证JSON格式
由于文件包含中文字符,建议使用:
- VS Code 打开并格式化
- 在线JSON验证工具: https://jsonlint.com/
- 或使用 Node.js: `node -e "JSON.parse(require('fs').readFileSync('bot/RWA_BOT_001.json'))"`

### 3. (可选) 添加 $schema
如果需要JSON Schema验证,在文件开头第2行添加:
```json
{
  "$schema": "https://kiro.ai/schemas/persona/v4.1.0",
  "schema_version": "4.1.0",
  ...
}
```

## ⚠️ 注意事项

### 编码问题
- 文件使用 UTF-8 编码
- 包含中文字符
- PowerShell 的 ConvertFrom-Json 可能显示乱码,但文件内容正确

### 验证方法
1. 用文本编辑器打开,检查中文显示是否正常
2. 用 VS Code 的 JSON 格式化功能验证语法
3. 确认关键字段存在:
   - id: "RWA_BOT_001"
   - canonical_money_story
   - consistency_locks
   - finance.amount_timeline

## 📊 关键数据确认

### 必须一致的数据
- 平台启动: 2026-02-01
- BSC上链: 2026-03-23
- 入场日期: 2026-02-20
- 第一笔: 500 USDT (灵活锁仓)
- 第二笔: 500 USDT (30天锁仓, 2026-04-24到期)
- 总仓位: 1000 USDT
- 节点等级: L1 量子节点
- 每日收益: 约9.2 RWA

### 禁止矛盾
- ❌ 说第一笔投了3000或5000
- ❌ 说上链是3月初
- ❌ 说自己是L2或以上
- ❌ 说老婆知道投资
- ❌ 向陌生人透露女儿全名

## 🚀 下一步

1. 验证 RWA_BOT_001.json 格式正确
2. 根据 bot-generation-plan.md 生成其余49个机器人
3. 建立社交关系网络
4. 部署到聊天系统测试

---

**状态**: 文件已创建,可直接使用  
**版本**: v1.3.0  
**日期**: 2026-04-08
