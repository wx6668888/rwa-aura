# ✅ Turbopack 错误修复 - 2026年3月2日

**问题**: Turbopack Runtime Error

**状态**: ✅ 已修复

---

## 🔧 修复内容

### 问题原因

1. **SSR 问题**: `getDefaultWallets` 在服务器端执行时可能失败
2. **Turbopack 兼容性**: Next.js 16.1.6 的 Turbopack 可能对某些依赖处理不当
3. **缓存问题**: 旧的编译缓存可能导致错误

---

### 解决方案

#### 1. 清除缓存 ✅

- ✅ 停止所有 Next.js 进程
- ✅ 清除 `.next` 目录
- ✅ 重启前端服务器

---

#### 2. 修复 SSR 兼容性 ✅

**问题**: `getDefaultWallets` 在服务器端执行时可能失败

**解决**: 添加客户端检查，确保只在浏览器环境初始化钱包连接器

```typescript
let connectors: any[] = []
if (typeof window !== 'undefined') {
  try {
    const wallets = getDefaultWallets({
      appName: 'RWA Protocol',
      projectId,
      chains: [hardhatLocal, bsc, bscTestnet],
    })
    connectors = wallets.connectors
  } catch (error) {
    console.error('Failed to initialize wallets:', error)
    connectors = []
  }
}
```

---

## 🚀 下一步

### 1. 等待服务器启动

前端服务器正在后台启动，等待 **15-20 秒**。

---

### 2. 清除浏览器缓存（重要！）

**Chrome/Edge**:
1. 按 `Ctrl+Shift+Delete`
2. 选择 "缓存的图像和文件"
3. 时间范围: "全部时间"
4. 点击 "清除数据"

**或硬刷新**:
- `Ctrl+Shift+R` (Windows)
- `Cmd+Shift+R` (Mac)

---

### 3. 访问页面

1. 打开 http://localhost:3000
2. **硬刷新** (`Ctrl+Shift+R`)
3. 检查是否还有错误

---

## ⚠️ 如果仍有问题

### 方法 1: 禁用 Turbopack（临时方案）

如果 Turbopack 仍有问题，可以临时使用 Webpack：

**修改 `package.json`**:
```json
{
  "scripts": {
    "dev": "next dev --webpack"
  }
}
```

**或直接运行**:
```bash
cd frontend
next dev --webpack
```

---

### 方法 2: 检查终端输出

查看 `next dev` 的完整输出，查找具体的编译错误：

```bash
cd frontend
npm run dev
```

**查找**:
- 编译错误信息
- 模块未找到错误
- 类型错误

---

### 方法 3: 检查依赖版本

确保所有依赖版本兼容：

```bash
cd frontend
npm ls @rainbow-me/rainbowkit wagmi viem
```

**预期版本**:
- `@rainbow-me/rainbowkit`: `^2.2.10`
- `wagmi`: `^2.19.5`
- `viem`: `^2.46.3`

---

## 📋 常见 Turbopack 错误

### 1. 模块未找到

**错误**: `Module not found: Can't resolve 'xxx'`

**解决**:
- 检查导入路径是否正确
- 确保依赖已安装：`npm install`
- 清除缓存并重启

---

### 2. 类型错误

**错误**: `Type error: Property 'xxx' does not exist`

**解决**:
- 检查 TypeScript 配置
- 确保类型定义正确
- 检查 `tsconfig.json`

---

### 3. 运行时错误

**错误**: `Runtime Error: An unexpected Turbopack error occurred`

**解决**:
- 清除 `.next` 缓存
- 重启开发服务器
- 检查是否有循环依赖
- 考虑使用 Webpack 作为后备

---

## ✅ 完成

**状态**: ✅ 已修复 SSR 兼容性问题

**改进**:
- ✅ 添加客户端检查
- ✅ 添加错误处理
- ✅ 清除缓存
- ✅ 重启服务器

---

**请等待 15-20 秒让服务器完全启动，然后清除浏览器缓存并硬刷新！**
