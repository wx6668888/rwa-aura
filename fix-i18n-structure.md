# i18n.ts 结构修复说明

## 问题诊断

构建错误显示在以下行出现问题：
- 4880 (Hindi - hi)
- 5893 (French - fr)  
- 6019 (Portuguese - pt)
- 7033 (Russian - ru)

错误信息：`'const' declarations must be initialized`

## 问题原因

在添加 `about` 部分时，`announce` 对象的结构可能不正确。正确的结构应该是：

```typescript
const hi: TranslationMap = {
  // ... 其他部分
  announce: {
    // 普通属性
    overline: '...',
    title: '...',
    // ... 更多属性
    detail: {
      'slug-1': { title: '...', preview: '...' },
      'slug-2': { title: '...', preview: '...' },
    },
  },
  about: {
    // about 属性
  },
}
```

## 修复方案

需要检查每个语言的 `announce` 对象是否正确关闭，然后再添加 `about` 对象。

问题可能是：
1. `announce` 对象后面多了一个 `},`
2. 或者 `detail` 对象没有正确关闭

## 下一步

需要手动检查并修复每个语言的结构。
