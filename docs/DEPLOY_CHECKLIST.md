# 发版检查清单（解决「改了像没改」）

## 1. 前端

- 在 **`frontend` 目录**执行：`npm run build`
- 重启 **`pm2` 里指向该目录的进程**（如 `rwa-frontend`），确认 `ecosystem.config.js` 的 `cwd` 就是当前仓库的 `frontend`
- 若前面有 **Nginx**：修改后需 `nginx -t && systemctl reload nginx`（或宝塔里重载）。仓库根目录 `nginx.conf` 仅为参考，**线上以实际站点配置为准**
- 浏览器验证：对 `/calculator` 等页面做一次 **强制刷新**（Ctrl+F5）或清站点数据；钱包 App 内置浏览器缓存更强，可换无痕或清除缓存

## 2. 后端（含每日 8 点结算）

- 在 **`backend` 目录**用当前代码重启进程（如 `pm2 restart rwa-backend`）
- **日结数据源（默认链上）**：`DAILY_SETTLEMENT_DATA_SOURCE=chain` 时，从链上 **StakeEvent / RWAStakeEvent** 收集地址，用合约 **view** 在结算窗口起点区块计算收益，**不依赖** `balance_snapshots`。请在 `backend/.env` 配置 **`STAKING_DEPLOY_BLOCK`**（质押合约部署块），否则会从 `latest-500000` 扫日志，RPC 较慢。
- 恢复旧逻辑（仅扫库表）：`DAILY_SETTLEMENT_DATA_SOURCE=db`
- 其它环境变量（可选）：
  - `CRON_TIMEZONE`：默认 `Asia/Shanghai`
  - `DAILY_YIELD_CRON`：默认 `0 8 * * *`
- 看日志是否出现：`定时任务已启动 (cron 时区: Asia/Shanghai)`、`开始每日收益结算...`、`Daily settlement dataSource=chain`

## 3. 常见误判

- **只改文件未 build / 未 restart**：Next 与 Node 都不会自动加载磁盘上新代码
- **Nginx 与仓库 `nginx.conf` 不一致**：实际生效的是面板里的站点配置
- **多台机或旧目录**：确认没有第二个进程在监听 3000/3001
