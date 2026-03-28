# 团队数据计算规则

## 总留存（team_retained_usdt）

**定义：**
总留存是指自己+团队所有还留在合约内的金额。

**计算公式：**
```
总留存 = 团队总质押 - 团队总提现
team_retained_usdt = team_volume_usdt - team_withdrawn_usdt
```

**说明：**
1. **团队总质押（team_volume_usdt）**：包含自己和所有下级的质押金额（USDT + RWA换算）
2. **团队总提现（team_withdrawn_usdt）**：包含自己和所有下级的提现金额（USDT + RWA换算）
3. **RWA换算规则**：1 RWA = 0.85 USDT

**示例：**
- 团队总质押：9150.104 USDT
- 提现：232.76 RWA × 0.85 = 197.846 USDT
- **总留存：9150.104 - 197.846 = 8952.258 USDT**

## 团队总质押（team_volume_usdt）

**定义：**
团队总质押是指自己和所有下级的累计质押金额（不扣除提现）。

**计算规则：**
1. 包含自己的所有质押（USDT + RWA）
2. 包含所有下级的质押（USDT + RWA）
3. RWA按0.85汇率换算为USDT
4. 只增不减（提现不影响此值）

## 数据库字段

**user_stats 表：**
- `team_volume_usdt`：团队总质押（累计，不扣除提现）
- `team_retained_usdt`：总留存（扣除提现后的实际留存）
- `personal_total_usdt`：个人累计质押（USDT等值）

**更新时机：**
- 质押事件：增加 `team_volume_usdt`
- 提现事件：减少 `team_retained_usdt`
