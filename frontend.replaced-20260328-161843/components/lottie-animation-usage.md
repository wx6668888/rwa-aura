# Lottie 动画使用指南

## 推荐格式：dotLottie（无需会员）

### 为什么选择 dotLottie？
- ✅ **无需会员**（不带皇冠标志）
- ✅ **文件小**：31.31 KB（比 Lottie JSON 小 94%）
- ✅ **性能好**：压缩格式，加载快
- ✅ **功能全**：支持主题和状态机

### 格式对比

| 格式 | 文件大小 | 需要会员 | 推荐度 |
|------|---------|---------|--------|
| **dotLottie** | 31.31 KB | ❌ 否 | ⭐⭐⭐⭐⭐ |
| Optimized dotLottie | 26.96 KB | ✅ 是 | ⭐⭐⭐ |
| Lottie JSON | 538.28 KB | ❌ 否 | ⭐⭐ |
| Optimized Lottie JSON | 410.59 KB | ✅ 是 | ⭐⭐⭐ |

## 使用方法

### 1. 下载动画文件
- 选择 **dotLottie** 格式（不带皇冠）
- 保存到 `frontend/public/动画/` 目录

### 2. 在组件中使用

```tsx
import { DotLottieAnimation } from '@/components/lottie-animation'

export function MyComponent() {
  return (
    <DotLottieAnimation
      src="/动画/your-animation.lottie"
      width={200}
      height={200}
      autoplay={true}
      loop={true}
      speed={1}
    />
  )
}
```

### 3. 示例：在首页添加动画

```tsx
import { DotLottieAnimation } from '@/components/lottie-animation'

export function HeroSection() {
  return (
    <div className="flex items-center gap-8">
      <div className="flex-1">
        <h1>RWA Protocol</h1>
        <p>真实资产 真实收益</p>
      </div>
      <div className="w-64 h-64">
        <DotLottieAnimation
          src="/动画/blockchain.lottie"
          autoplay={true}
          loop={true}
        />
      </div>
    </div>
  )
}
```

## 注意事项

1. **文件路径**：使用 `/动画/filename.lottie`（public 目录下的相对路径）
2. **性能优化**：dotLottie 文件已经压缩，无需额外优化
3. **浏览器兼容性**：现代浏览器都支持
4. **SSR**：组件已处理 SSR 问题，无需担心

## 已安装的动画文件

- `/动画/blockchain.lottie` - 区块链动画
- `/动画/Falling coins.lottie` - 掉落金币动画

可以直接使用这些文件！
