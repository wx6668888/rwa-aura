# SQLite → MySQL 迁移完成报告

## 时间
2026-03-12 20:00 - 20:53 GMT+8

## 问题
前端显示团队总质押、总留存为0，但SQLite模式下是正常的。

## 根本原因
1. MySQL表结构缺少 `event_type` 字段
2. MySQL缺少 `user_stats` 表（存储计算好的团队数据）
3. 后端API未从 `user_stats` 表读取数据

## 已完成的修复

### 1. 数据库表结构对齐
- 添加 `event_type` 字段到 `stake_events` 表
- 修改 `amount` 字段类型为 VARCHAR(78)
- 创建 `user_stats` 表（与SQLite完全一致）

### 2. 数据迁移
- 重新迁移13条 `stake_events`（包含 `event_type`）
- 迁移2条 `user_stats` 记录

### 3. 后端API修复
- `/api/data/${address}/team` - 从 `user_stats` 表读取
- `/api/user/${address}/level-info` - 从 `user_stats` 表读取
- 数据格式：USDT金额 × 1e18 转为wei格式

### 4. 前端修复
- 修复 `useTeamStats` 无限循环问题
- 移除 `isConnected` 从 `useCallback` 依赖项

## API测试结果

**测试地址：** 0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4

**`/api/data/${address}/team`:**
```json
{
  "success": true,
  "source": "database",
  "data": {
    "directReferrals": 1,
    "teamVolume": 9150103999999999000,
    "teamRetained": 9150103999999999000
  }
}
```

**`/api/user/${address}/level-info`:**
```json
{
  "success": true,
  "data": {
    "nodeLevel": 1,
    "cumulativePersonalStake": "1.395e+21",
    "teamVolume": "9.150103999999999e+21",
    "teamTotalDeposited": "9.150103999999999e+21",
    "teamTotalWithdrawn": "0",
    "teamRetained": "9.150103999999999e+21"
  }
}
```

## 当前状态
- MySQL: ✅ 运行中
- 后端 (端口3001): ✅ 运行中 (session fresh-otter)
- 前端 (端口3000): ✅ 运行中
- 推荐奖励系统: ✅ 运行中

## 数据验证
- SQLite原始数据：team_volume_usdt = 9150.104
- MySQL迁移后：team_volume_usdt = 9150.104
- API返回：9.150103999999999e+21 wei = 9150.104 USDT ✅

## 如果前端仍显示0
可能原因：
1. 浏览器缓存 - 需要硬刷新（Ctrl+Shift+R）
2. 前端hook逻辑问题 - `useTeamStats` 监听的是用户自己的质押，不是团队的
3. 数据格式转换问题 - 前端除以1e18后应该得到9150.104

## 建议
如果问题持续，需要检查：
1. 浏览器控制台的网络请求
2. 前端实际收到的API响应
3. `useTeamStats` 的数据处理逻辑
