# 官方客服机器人知识分类文档（现网代码扫描）

更新时间：2026-04-08  
范围：`frontend` + `chat-server` + `docs` 现有知识内容与机器人知识注入链路

## 1. 知识注入链路（当前实现）

- 官方客服机器人角色：`chat-server/src/services/bot-service.ts` 中 `ensureAdminSupportBot()`
- 官方知识主入口：`chat-server/src/data/admin-support-knowledge.ts`
  - `ADMIN_SUPPORT_KNOWLEDGE`
  - `ADMIN_SUPPORT_INSTRUCTIONS`
- 辅助上下文：
  - 最近聊天上下文：`chat-service.getMessages(...)`
  - 长期记忆：`chat-server/data/bot-memory.json`（由 `bot-memory-service.ts` 管理）

## 2. 现有知识源分层

### P0（权威、应优先回答依据）
- `chat-server/src/data/admin-support-knowledge.ts`
- `frontend/lib/knowledge-data.ts`（分类与文章索引）
- `frontend/lib/knowledge-content-zh-full.ts`（中文完整知识文案）
- `frontend/lib/announcements-data.ts` + `frontend/lib/announcements-content-zh.ts`

### P1（辅助解释与话术）
- `frontend/components/help/help-page-client.tsx`
- `frontend/components/emergency/faq-accordion.tsx`
- `frontend/lib/i18n.ts`（帮助/客服相关文案）

### P2（补充材料，不直接做“最新参数”依据）
- `docs/知识库完整文案-中文.md`
- `docs/RWA协议用户详细说明-基于完整源码.md`
- `docs/小白投资完整教程.md`

## 3. 分类体系（供客服回答检索）

1. 官方政策与回答边界（禁止编造、合规表述）
2. 产品机制总览（RWA 协议、BSC、Gas、站内功能）
3. 新手入门与钱包连接
4. 充值/入金与网络选择
5. 质押与收益规则
6. 提现/赎回/到账问题
7. 节点等级/推荐/团队奖励
8. 交易与兑换（Swap/价格/滑点）
9. 安全风控（钓鱼、私钥、假客服）
10. 公告与维护（版本更新、活动、停机）

## 4. 客服机器人回答优先级

- 优先级 1：站内当前页面与链上事实
- 优先级 2：`admin-support-knowledge.ts` 中明确规则
- 优先级 3：知识库文章与公告内容
- 若信息不确定：明确“不确定”，引导用户查看站内页面/公告/链上记录

## 5. 已执行的“灌输”方式

- 已将上述分类体系与执行规则，写入  
  `chat-server/src/data/admin-support-knowledge.ts` 的结构化知识段。
- 官方客服机器人在每次生成回复时会自动加载该知识段，无需额外开关。

