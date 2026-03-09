# 团队头像添加指南

## 当前状态

代码已更新，支持真实图片头像。如果图片不存在或加载失败，会自动显示渐变圆圈+字母的后备方案。

## 方案1：使用AI生成头像（推荐）

### 免费在线工具

#### 1. This Person Does Not Exist
- 网址：https://thispersondoesnotexist.com/
- 特点：完全免费，刷新即可获得新头像
- 质量：高质量，1024x1024像素
- 使用方法：
  1. 访问网站
  2. 刷新页面直到找到合适的头像
  3. 右键保存图片
  4. 重命名并放入项目

#### 2. Generated Photos
- 网址：https://generated.photos/
- 特点：可自定义年龄、性别、种族、表情
- 质量：专业级，适合商用
- 免费额度：有限
- 使用方法：
  1. 注册账号
  2. 使用过滤器选择特征
  3. 下载喜欢的头像

#### 3. Artbreeder
- 网址：https://www.artbreeder.com/
- 特点：可调整面部特征，创建独特头像
- 质量：高质量，可自定义
- 使用方法：
  1. 注册账号
  2. 选择"Portraits"类别
  3. 调整滑块创建理想头像
  4. 下载图片

#### 4. Fotor AI头像生成器
- 网址：https://www.fotor.com/features/ai-headshot-generator/
- 特点：专业商务头像
- 质量：商业级

### AI工具推荐配置

为了保持团队一致性，建议：

**Alex Chen (CEO)**
- 年龄：35-45岁
- 性别：男性
- 风格：专业、自信
- 服装：西装或商务休闲

**Sarah Kim (CTO)**
- 年龄：30-40岁
- 性别：女性
- 风格：专业、技术感
- 服装：商务休闲

**Marcus Liu (CMO)**
- 年龄：30-40岁
- 性别：男性
- 风格：亲和、专业
- 服装：商务休闲

**Ryan Park (CSO)**
- 年龄：35-45岁
- 性别：男性
- 风格：严谨、专业
- 服装：西装或商务装

## 方案2：使用占位符服务

### UI Avatars
```
https://ui-avatars.com/api/?name=Alex+Chen&size=256&background=00f5d4&color=05050a
```

### DiceBear Avatars
```
https://api.dicebear.com/7.x/avataaars/svg?seed=AlexChen
```

## 文件结构

### 创建图片目录
```bash
mkdir -p frontend/public/images/team
```

### 文件命名规范
```
frontend/public/images/team/
├── alex-chen.jpg      (CEO)
├── sarah-kim.jpg      (CTO)
├── marcus-liu.jpg     (CMO)
└── ryan-park.jpg      (CSO)
```

### 图片规格要求
- 格式：JPG 或 PNG
- 尺寸：至少 256x256px（推荐 512x512px）
- 宽高比：1:1（正方形）
- 文件大小：< 200KB
- 背景：纯色或专业背景

## 图片优化

### 使用工具压缩
1. **TinyPNG** (https://tinypng.com/)
   - 在线压缩，保持质量
   - 支持批量处理

2. **Squoosh** (https://squoosh.app/)
   - Google开发的图片优化工具
   - 可调整压缩参数

### 命令行优化（可选）
```bash
# 使用 ImageMagick
convert input.jpg -resize 512x512^ -gravity center -extent 512x512 -quality 85 output.jpg

# 使用 sharp (Node.js)
npm install sharp
node -e "require('sharp')('input.jpg').resize(512,512).jpeg({quality:85}).toFile('output.jpg')"
```

## 添加步骤

### 步骤1：生成或下载头像
使用上述任一工具生成4张头像

### 步骤2：优化图片
- 裁剪为正方形
- 调整大小为512x512px
- 压缩文件大小

### 步骤3：重命名文件
按照命名规范重命名：
- alex-chen.jpg
- sarah-kim.jpg
- marcus-liu.jpg
- ryan-park.jpg

### 步骤4：放入项目
将文件复制到：
```
frontend/public/images/team/
```

### 步骤5：验证
访问页面，检查头像是否正确显示

## 代码说明

### 当前实现
```typescript
const team = [
  {
    initial: 'A',
    name: 'Alex Chen',
    image: '/images/team/alex-chen.jpg', // 图片路径
    gradient: 'from-[#00f5d4] to-[#8b5cf6]', // 后备渐变色
    // ...
  },
  // ...
]
```

### 后备机制
如果图片加载失败，会自动显示：
- 渐变色圆圈
- 名字首字母
- 保持视觉一致性

### 修改图片路径
如果您想使用不同的路径或文件名，只需修改 `image` 属性：
```typescript
image: '/your/custom/path/image.jpg'
```

## 快速开始（推荐流程）

### 最快方案：This Person Does Not Exist

1. **生成头像**（5分钟）
   ```
   访问 https://thispersondoesnotexist.com/
   刷新4次，每次保存一张合适的头像
   ```

2. **重命名文件**（1分钟）
   ```
   image1.jpg → alex-chen.jpg
   image2.jpg → sarah-kim.jpg
   image3.jpg → marcus-liu.jpg
   image4.jpg → ryan-park.jpg
   ```

3. **优化图片**（3分钟）
   ```
   访问 https://tinypng.com/
   批量上传4张图片
   下载压缩后的文件
   ```

4. **放入项目**（1分钟）
   ```
   复制到 frontend/public/images/team/
   ```

5. **验证**（1分钟）
   ```
   访问 /about 页面
   检查头像显示
   ```

总计：约10分钟完成

## 替代方案：使用Unsplash专业照片

如果您想使用真实的专业照片：

```
https://unsplash.com/s/photos/professional-headshot
```

搜索关键词：
- "professional headshot"
- "business portrait"
- "corporate headshot"
- "executive portrait"

注意：
- 检查许可证
- 选择高质量图片
- 保持风格一致

## 测试清单

- [ ] 所有4张头像文件已创建
- [ ] 文件命名正确
- [ ] 文件大小 < 200KB
- [ ] 图片尺寸为正方形
- [ ] 桌面端显示正常
- [ ] 移动端显示正常
- [ ] 图片加载速度快
- [ ] 后备方案工作正常（可以临时删除图片测试）

## 常见问题

### Q: 图片不显示怎么办？
A: 检查：
1. 文件路径是否正确
2. 文件名是否匹配
3. 文件是否在 `public` 目录下
4. 浏览器控制台是否有错误

### Q: 可以使用外部URL吗？
A: 可以，直接使用完整URL：
```typescript
image: 'https://example.com/avatar.jpg'
```

### Q: 如何更换图片？
A: 直接替换 `frontend/public/images/team/` 下的文件即可

### Q: 需要重启服务器吗？
A: 不需要，刷新页面即可看到新图片

## 技术细节

### 图片加载逻辑
```typescript
<img
  src={member.image}
  alt={member.name}
  onError={(e) => {
    // 图片加载失败时的处理
    e.currentTarget.style.display = 'none'
    // 显示后备字母
  }}
/>
```

### 性能优化
- 使用 WebP 格式可进一步减小文件大小
- 考虑使用 Next.js Image 组件进行自动优化
- 实现懒加载提升页面性能

## 下一步

1. 生成或下载4张头像
2. 按照指南优化和命名
3. 放入项目目录
4. 刷新页面验证

如有问题，请检查浏览器控制台的错误信息。

---

**创建时间**: 2025-02-28
**状态**: 待执行
**预计时间**: 10-15分钟
