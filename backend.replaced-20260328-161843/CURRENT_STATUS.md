## SQLite → MySQL 迁移完成报告 (2026-03-12 20:00-21:00)

### 已完成的工作

1. **数据库表结构对齐**
   - 添加 `event_type` 字段到 `stake_events`
   - 修改 `amount` 为 VARCHAR(78)
   - 创建 `user_stats` 表

2. **数据迁移**
   - 13条 `stake_events` ✅
   - 2条 `user_stats` ✅
   - 1条 `withdrawal_events` ✅
   - 2条 `referral_bindings` ✅

3. **后端API修复**
   - `/api/data/${address}/team` - 返回字符串格式 ✅
   - `/api/user/${address}/level-info` - 返回字符串格式 ✅
   - 消除科学计数法，使用 BigInt ✅

4. **API测试通过**
   ```json
   {
     "teamVolume": "9150103999999999213568",
     "teamRetained": "9150103999999999213568"
   }
   ```

### 当前问题

**前端仍显示0的原因：**
- 前端使用 `useTeamStats` hook
- 但后端日志显示前端**没有调用** `/api/data/${address}/team`
- 前端只调用了 `/api/user/${address}/level-info?chainId=97`

**可能原因：**
1. 前端有浏览器缓存
2. `useTeamStats` hook 的 `useEffect` 依赖项问题导致没有触发
3. 前端实际使用的是另一个hook（`useTeamData`）

### 建议下一步

1. 检查前端浏览器控制台网络请求
2. 确认前端实际使用的是哪个hook
3. 清除浏览器缓存并硬刷新
4. 检查 `useTeamStats` 的依赖项是否正确
