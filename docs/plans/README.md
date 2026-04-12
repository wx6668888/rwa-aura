# 计划文档备份

Cursor 里的计划默认在 **`~/.cursor/plans/`**（本机：`/home/ubuntu/.cursor/plans/`），**不在 Git 仓库里**，所以 IDE 重启后「待办列表」可能清空，但 **`.plan.md` 文件通常还在**。

本目录从上述路径复制了备份，便于团队与版本库留存：

| 文件 | 说明 |
|------|------|
| [群聊-底部弹窗实现-已完成.md](./群聊-底部弹窗实现-已完成.md) | 底部抽屉 + Provider 上提等，YAML 内 todos 均为 completed |
| [群聊-客服式浮层与产品路线图.md](./群聊-客服式浮层与产品路线图.md) | 更大范围路线图（DiceBear、群号、统一搜索、百 Bot 等）；YAML 里部分条目代码已推进但未改 status |

与 Cursor 源文件不同步时，可手动从 `~/.cursor/plans/` 再 `cp` 覆盖。
