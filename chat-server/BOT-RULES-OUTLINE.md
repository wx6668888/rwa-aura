# RWA Aura Chat — 机器人与聊天服务规则大纲

> 本文档汇总 `chat-server` 内与**机器人发言、LLM、调度、安全**相关的逻辑与环境变量，便于运维与调参。  
> 代码主入口：`src/services/bot-service.ts`、`src/services/bot-llm.ts`、`src/services/bot-human-sim.ts`、`src/utils/shanghai-calendar.ts`。

---

## 一、核心原则

| 规则 | 说明 |
|------|------|
| **接真人（triggeredBy 有值）** | 回复**必须**走多路 LLM（`tryLlmChatCompletion`）；**禁止**用语料库 `pickFallbackLineUnique`。失败时回滚时间锁并 `return null`。 |
| **环境音 / 主动发言（无 triggeredBy）** | LLM 失败时**可以**使用内置中文话术池 + 日历扩展句。 |
| **跨房间去重** | 机器人文本经 `normalizeUtteranceKey` 后与「当日已有机器人发言」比对，过像则要求模型换说法；接真人时若仍撞车可保留最后一次模型输出。 |
| **上海时间** | 作息、收益窗口、日历策略均以 `Asia/Shanghai` 为准。 |

---

## 二、LLM 路由与密钥（`bot-llm.ts`）

| 环境变量 | 默认 / 说明 |
|----------|-------------|
| `LLM_PROVIDER_ORDER` | `groq,siliconflow,openrouter,xfyun`（按顺序尝试） |
| `GROQ_API_KEY` / `GROQ_API_KEYS` | Groq，可多 Key |
| `SILICONFLOW_API_KEY` / `SILICONFLOW_API_KEYS` | SiliconFlow |
| `OPENROUTER_API_KEY` / `OPENROUTER_API_KEYS` | OpenRouter（可与 `CLAUDE_API_KEY` 合并） |
| `XFYUN_*` | 讯飞星火（见 `xfyun-spark-ws.ts`：`XFYUN_APP_ID`、`XFYUN_API_KEY`、`XFYUN_API_SECRET` 等） |
| `GROQ_MODEL`、`SILICONFLOW_MODEL`、`OPENROUTER_MODEL`、`SILICONFLOW_BASE_URL`、`OPENROUTER_BASE_URL` | 模型与基址 |
| `LLM_BOTS_PER_GROQ_KEY` | 每个 Groq Key 映射的 bot 槽位规模（默认 `10`，范围在代码中 clamp） |

---

## 三、机器人调度与频率（`bot-service.ts` + `bot-human-sim.ts`）

| 环境变量 | 默认 | 含义 |
|----------|------|------|
| `BOT_SCHEDULE_SCALE` | `0.52` | 缩放每个 bot 的 `min/maxIntervalMs`（bootstrap 人设里带来） |
| `BOT_SPEAK_CHANCE_MULT` | `1.22` | 定时器触发时发言概率上限放大 |
| `BOT_HUMAN_QUIET_MS` | `90000` | 主动发言前，房间须已安静（无真人消息）至少此毫秒 |
| `BOT_ROOM_AMBIENT_GAP_MS` | `11000` | 同房间两次**主动**机器人发言最小间隔 |
| `BOT_COLD_ROOM_QUIET_MS` | `900000` | 超过此时长无真人发言视为「冷场」 |
| `BOT_COLD_ROOM_CHANCE_MULT` | `1.42` | 冷场时提高本次定时器抽签的发言概率 |
| `BOT_AMBIENT_QUEUE_ENABLED` | `1` | `0` 关闭主动发言**全局串行队列** |
| `BOT_AMBIENT_QUEUE_MIN_MS` | `1800` | 队列两次任务之间的随机间隔下限 |
| `BOT_AMBIENT_QUEUE_MAX_MS` | `6500` | 队列间隔上限 |
| `BOT_PRE_LLM_DELAY_CAP_MS` | `12000` | 调用 LLM 前「阅读/打字」模拟延迟上限 |
| `BOT_CHUNKY_FOLLOWUP_P` | `0.09` | 主动发完一条后，再跟一条**超短跟进**的概率 |
| `BOT_TYPO_AMBIENT_P` | `0.012` | 仅**非接真人**最终文案上极低概率闲聊错字（敏感词跳过） |

**时段（上海）：** `scheduleNext` 使用 `getAmbientScheduleDelayMultiplier`（高峰更密、深夜拉长；约 12% 为夜猫子）。主动发言在深夜低谷对非夜猫子跳过（**接真人除外**）。

---

## 四、接真人逻辑

- 每名真人每条消息触发一次 bot 回复调度；可带 `sourceMessageId` → 机器人消息 `replyTo` 引用。
- 夜间不按作息过滤全池，避免无人接话。

---

## 五、Prompt 与内容策略

- SYSTEM：`PERSONA`、标点习惯、`LIVE_STATE`、日历政策、房间信息。
- 禁止 **「查看详情」「点击查看」「点我查看」** 等按钮腔；输出层 `sanitizeLlmStockPhrases` 做替换。
- `isShallowRoboticAckLine` 触发 `antiShallowHint` 重试。
- `humanizeCasualChinese` 做人设化标点/emoji。

---

## 六、收益窗口（`shanghai-calendar.ts`）

- 上海 **8:00–8:30**：可注入「今日到账约 X RWA」类彩蛋（9–300）；窗外禁止乱编到账数字。

---

## 七、兜底话术（仅非接真人）

- `FALLBACK_*`、`RW_TOPIC_*`、`DAILY_CHITCHAT`、`MICRO_REPLIES`、日历扩展句等。

---

## 八、其它（`index.ts` / `chat-service`）

| 变量 | 说明 |
|------|------|
| `PORT` | 默认 `3002` |
| `CORS_ORIGIN` | 跨域 |
| `BOT_STARTUP_BURST_COUNT` | 启动 burst 条数（默认 `6`） |
| `CHAT_DATA_FILE`、`CHAT_ADMIN_ADDRESSES` | 数据与管理员 |
| `CHAT_RED_PACKET_*`、Token 地址 | 红包与链上校验 |
| `CHAT_IMAGE_HOSTS` | 贴图域名白名单 |

---

*文档随代码迭代；以仓库内实现为准。*

---

## 十、管理员机器人（admin_support）

| 项 | 说明 |
|----|------|
| **创建** | `ensureAdminSupportBot()` 在 `bootstrapDefaultBots` 末尾或「已有 bot 池」时调用；确定性地址 `rwa-admin-support-bot:v1`。 |
| **关闭** | `ADMIN_SUPPORT_BOT_ENABLED=0` |
| **昵称** | `ADMIN_BOT_NAME`（默认 `Aura助手`）；用于路由匹配「消息含该昵称则走管理员」。 |
| **头像** | `ADMIN_BOT_AVATAR`（默认 `/chat-bot-icons/01.svg`） |
| **路由** | `BOT_ADMIN_ROUTING`：`support`（默认，仅产品/规则类关键词或 @ 官方/客服）\|`questions`（含一般提问/身份/在吗）\|`always`（每条真人消息均由管理员接话）。 |
| **行为** | 不参与 `scheduleNext`、不参与启动 `triggerBotBurst`、不发环境音；仅响应真人 `triggeredBy`。 |
| **知识** | `src/data/admin-support-knowledge.ts` 注入 PROJECT_FACTS + ADMIN_SUPPORT_INSTRUCTIONS；接真人首包 token 约 420/340，紧急通道 320。 |
| **类型** | `Bot.role === \"admin_support\"`；普通氛围组为 `community` 或未设置。 |
