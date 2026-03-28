# 一键清除缓存

## 命令（服务器上）

```bash
cd /www/wwwroot/rwaprotocol.dpdns.org/frontend
npm run purge:cache
```

作用：

1. 清空宝塔常见路径 **`/www/server/nginx/proxy_cache_dir`**（需 sudo 时自动使用）
2. 若存在 **`frontend/.env.cf`** 且包含 `CF_ZONE_ID`、`CF_API_TOKEN`，则调用 Cloudflare **Purge Everything**

## 配置 Cloudflare（可选）

在 `frontend` 目录创建文件 **`.env.cf`**（已被 `.gitignore` 忽略，勿提交）：

```
CF_ZONE_ID=你的区域ID
CF_API_TOKEN=含 Zone.Cache Purge 权限的 Token
```

Token 在 Cloudflare：我的个人资料 → API 令牌 → 创建令牌 → 模板选「清除缓存」或自定义权限包含 **Cache Purge**。

## 本地浏览器

仍建议 **硬刷新**：`Ctrl+Shift+R`（Mac：`Cmd+Shift+R`）或用 **无痕窗口** 打开 https://rwaprotocol.dpdns.org
