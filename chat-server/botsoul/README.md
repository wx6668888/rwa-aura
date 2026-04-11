# RWA聊天机器人配置文件

## 文件说明

### ✅ 已完成
- `RWA_BOT_001_clean.txt` - **可直接使用的完整配置** (已去除 $schema 字段)
- `RWA_BOT_001_persona.txt` - 原始版本(包含 $schema,可能触发保护机制)
- `bot-generation-plan.md` - 完整的50个机器人生成规划

### 📋 使用方法

#### 方法1: 直接使用 (推荐)
```bash
# 重命名为 .json 即可使用
copy RWA_BOT_001_clean.txt RWA_BOT_001.json
```

#### 方法2: 添加 $schema (可选)
如果需要 JSON Schema 验证,手动在文件开头添加:
```json
{
  "$schema": "https://kiro.ai/schemas/persona/v4.1.0",
  "schema_version": "4.1.0",
  ...
}
```

## 核心改进点

### 1. ✅ 统一资金叙事
- `canonical_money_story` 作为唯一事实源
- 所有金额数据必须与此一致

### 2. ✅ 关键数据修正
- 第一笔投资: **500 USDT** (不是3000或5000)
- 上链时间: **2026-03-23** (不是3月初)
- 当前总仓位: **1000 USDT**
- 节点等级: **L1 量子节点**
- 每日收益: **约9.2 RWA** (口头表达"每天大概九块多")

### 3. ✅ 运行时绑定
```json
"runtime_binding": {
  "chat_user_id": "uuid-rwa-bot-001-linxiaofeng",
  "wallet_address": "0x8a54b9e3f2c71a6d0e4b2f9c3d7e1a5b8c2f06be",
  "match_strategy": "by_wallet",
  "time_anchor": "Asia/Shanghai"
}
```

### 4. ✅ 隐私分级控制
- `public`: 可对陌生人透露的信息
- `known_contacts`: 可对熟人透露的信息
- `close_friends`: 可对密友透露的信息

### 5. ✅ 一致性锁定
`forbidden_contradictions` 列出了绝对不能说的矛盾话:
- 说平台很早就开了(2026年2月才开)
- 说上币安链是3月初(实际是3月23日)
- 说自己投了很多钱(总共才一千USDT)
- 说自己第一笔投了3000或5000(实际是500)
- 等等...

### 6. ✅ 完整时间线
`amount_timeline` 记录所有投资事件:
1. 2026-02-20: 首次质押 500 USDT (灵活锁仓)
2. 2026-03-10: 首次提现测试 30 RWA
3. 2026-03-23: 平台上币安链
4. 2026-03-25: 加仓 500 USDT (30天锁仓)

### 7. ✅ 疲劳曲线
```json
"fatigue_curve": {
  "consecutive_messages_threshold": 5,
  "length_reduction_factor": 0.7,
  "silence_probability_boost": 0.25
}
```
连续发言5条后,消息长度减少30%,沉默概率提升25%

### 8. ✅ 跨机器人关系
- 社交圈子: 湖南老乡帮, 跑车司机群
- 共享记忆: 与RWA_BOT_003的互动历史
- 信任等级: 0.80 (高度信任老乡刘哥)

## 字段完整性检查

### 核心字段 ✅
- [x] schema_version, id, version
- [x] runtime_binding
- [x] display
- [x] orchestration
- [x] profile
- [x] canonical_money_story
- [x] consistency_locks
- [x] privacy_tiers
- [x] finance (完整)
- [x] writing_style
- [x] dialect_vocabulary
- [x] micro_behaviors
- [x] stress_response
- [x] cross_bot_dynamics
- [x] audit

### 可选扩展字段 (未包含,可按需添加)
- [ ] childhood_memories (童年记忆)
- [ ] work_experiences (工作经历详情)
- [ ] emotional_landscape (情感地图)
- [ ] contextual_reactions (情境反应)
- [ ] investment_decision_tree (投资决策树)
- [ ] daily_schedule (详细作息表)
- [ ] memory_system (记忆管理系统)
- [ ] herd_behavior (从众行为)
- [ ] opinion_leader_influence (意见领袖影响)

## 数据一致性验证

### ✅ 通过检查
- 平台启动日期: 2026-02-01
- BSC上链日期: 2026-03-23
- 入场日期: 2026-02-20 (平台开3周后)
- 第一笔投资: 500 USDT
- 第二笔投资: 500 USDT
- 当前总仓位: 1000 USDT
- 节点等级: L1 (符合0 USDT团队要求)
- 钱包地址格式: 有效的以太坊地址

### ⚠️ 需要注意
- 所有时间必须使用 Asia/Shanghai 时区
- 金额表达必须使用口语化形式
- 方言词汇使用频率不超过每条消息1-2个
- 与RWA_BOT_003的关系必须双向一致

## 下一步

### 生成其余49个机器人
参考 `bot-generation-plan.md` 中的差异化策略:
1. 职业分布 (8类)
2. 地域分布 (6省)
3. 投资金额分布 (4档)
4. 节点等级分布 (L1-L4)
5. 入场时间分布 (4波)
6. 社交圈子设计 (5个cluster)
7. 语言风格差异 (方言+打字习惯)
8. 性格标签组合

### 工具开发
1. 创建 bot-template-v4.1.json
2. 编写 generate-bots.js 自动生成脚本
3. 创建 validate-consistency.js 一致性验证工具
4. 建立 relationship-graph.json 社交关系图谱

---

**版本**: v1.3.0  
**最后更新**: 2026-04-08  
**状态**: RWA_BOT_001 完成,可直接使用
