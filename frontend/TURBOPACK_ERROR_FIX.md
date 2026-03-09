# Turbopack 运行时错误修复指南

## 问题描述

Next.js 16.1.6 在使用 Turbopack 时出现运行时错误，主要原因是：

1. **工作区根目录推断错误**：检测到多个 lockfiles（`E:\MyRWA_Project\rwa aura\package-lock.json` 和 `frontend\pnpm-lock.yaml`），导致 Next.js 无法正确推断工作区根目录。

2. **可能的模块解析问题**：Turbopack 对依赖解析比 Webpack 更严格。

## 已实施的修复

### 1. 更新 `next.config.mjs`

已在配置文件中添加 `turbopack.root` 配置，明确指定根目录为 `frontend` 目录：

```javascript
turbopack: {
  root: __dirname,
}
```

## 解决步骤

### 步骤 1：停止现有的 dev 服务器

如果已经有 `next dev` 进程在运行（PID 16336），需要先停止它：

**Windows PowerShell:**
```powershell
# 查找并停止进程
Stop-Process -Id 16336 -Force

# 或者查找所有 node 进程
Get-Process node | Where-Object {$_.Path -like "*next*"} | Stop-Process -Force
```

### 步骤 2：清除 Next.js 缓存和锁文件

```powershell
cd "E:\MyRWA_Project\rwa aura\frontend"
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force .next\dev\lock -ErrorAction SilentlyContinue
```

### 步骤 3：重新启动开发服务器

```powershell
npm run dev
```

## 如果问题仍然存在

### 方案 A：临时禁用 Turbopack（使用 Webpack）

如果 Turbopack 配置仍然有问题，可以临时使用 Webpack：

```powershell
# 在 package.json 的 dev 脚本中移除 --turbo 标志（如果有）
# 或者直接运行：
npx next dev
```

### 方案 B：检查依赖兼容性

某些第三方包可能与 Turbopack 不兼容。如果错误信息中提到了特定的包名，可以：

1. 检查该包是否有 Turbopack 兼容版本
2. 考虑使用替代包
3. 在 `next.config.mjs` 中添加排除规则

### 方案 C：统一包管理器

项目中有两个 lockfiles：
- `E:\MyRWA_Project\rwa aura\package-lock.json` (npm)
- `E:\MyRWA_Project\rwa aura\frontend\pnpm-lock.yaml` (pnpm)

建议：
- 如果使用 npm，删除 `pnpm-lock.yaml`
- 如果使用 pnpm，删除 `package-lock.json` 并确保在 frontend 目录中使用 pnpm

## 验证修复

修复后，运行 `npm run dev` 应该：
1. ✅ 不再显示工作区根目录警告
2. ✅ 成功启动开发服务器
3. ✅ 浏览器可以正常访问应用

## 注意事项

- 确保 Node.js 版本 >= 18.17.0（Next.js 16 的要求）
- 如果修改了配置文件，需要重启 dev 服务器才能生效
- 清除 `.next` 目录不会影响源代码，可以安全执行
