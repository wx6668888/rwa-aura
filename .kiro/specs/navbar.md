# 导航栏重构规格文件
# 适用工具: Kiro（直接粘贴到对话框 或 存入 .kiro/specs/navbar.md）
# 目标文件: components/Navbar.tsx

---

## 任务说明

重构现有的 Navbar 组件，将平铺式全屏列表菜单升级为以下两套并行方案：

- **手机端（< 1024px）**：顶部导航栏 + 右侧分组抽屉 + 底部固定 Tab 栏
- **桌面端（≥ 1024px）**：顶部导航栏 + 悬停二级超级菜单

两端共用同一个组件文件，用 Tailwind 响应式类区分渲染逻辑。

---

## 设计令牌（严格使用，不可修改）

```typescript
// 颜色
const colors = {
  bg:         '#05050a',
  surface1:   '#0d0d14',
  surface2:   '#13131e',
  surface3:   '#1a1a2a',
  cyan:       '#00f5d4',
  cyanDim:    'rgba(0,245,212,0.12)',
  cyanGlow:   'rgba(0,245,212,0.25)',
  purple:     '#8b5cf6',
  purpleDim:  'rgba(139,92,246,0.12)',
  gold:       '#f59e0b',
  danger:     '#f43f5e',
  dangerDim:  'rgba(244,63,94,0.10)',
  text:       '#f1f5f9',
  text2:      '#94a3b8',
  text3:      '#475569',
  border:     'rgba(255,255,255,0.05)',
  borderA:    'rgba(255,255,255,0.10)',
}

// 字体
// Space Grotesk  → 所有界面文字、标题、标签
// JetBrains Mono → 数字、钱包地址、代码
```

---

## 第一部分：顶部导航栏（手机 + 桌面共用）

### 基础样式
```
高度:     手机 60px / 桌面 64px
定位:     fixed top-0 left-0 right-0 z-[100]
背景:     rgba(5,5,10,0.90) + backdrop-blur-xl
下边框:   1px solid rgba(255,255,255,0.05)
```

### 滚动渐显效果
```
scrollY === 0:  背景完全透明，无下边框
scrollY > 10px: 背景渐入 rgba(5,5,10,0.90) + 下边框显示
过渡时间:       300ms ease
实现方式:       useEffect 监听 window.scroll 事件
```

### 左侧 Logo
```
布局:  flex items-center gap-1
链接:  href="/"

"RWA"      颜色 #00f5d4  Space Grotesk 700  18px
"|"        颜色 #475569  font-weight 300
"PROTOCOL" 颜色 #475569  Space Grotesk 400  13px  letter-spacing: 0.08em
```

### 右侧控件（手机 + 桌面共有）
```
布局: flex items-center gap-2

① 语言切换器
   触发按钮: Globe2图标(16px) + 当前语言代码(13px #94a3b8)
   背景: #13131e  边框: 1px rgba(255,255,255,0.05)  rounded-lg
   点击展开下拉（详见第四部分）

② 钱包状态
   未连接状态:
     文字: "连接钱包"
     样式: border 1px #00f5d4  color #00f5d4  rounded-full  px-4 py-2  13px font-600
     悬停: background rgba(0,245,212,0.12)
   已连接状态:
     布局: flex items-center gap-2  background #13131e  border rgba(255,255,255,0.10)  rounded-full  px-3 py-1.5
     内容: 绿色圆点(6px glow #22c55e) + 地址截断(JetBrains Mono 12px #00f5d4)

③ 汉堡按钮（仅 lg:hidden）
   尺寸: 36×36px  background #13131e  border rgba(255,255,255,0.05)  rounded-[10px]
   三根线: 宽18px/14px/18px  高1.5px  颜色 #94a3b8  gap 5px
   开启状态: 变形为 X，线条颜色变为 #00f5d4，动画 250ms ease
```

### 中间导航链接（仅桌面 hidden lg:flex）
```
布局: flex items-center gap-1  高度 64px

每个导航项:
  padding:     px-4  高度 64px  flex items-center
  字体:        14px font-500 #94a3b8
  悬停:        color #f1f5f9  transition 150ms
  当前页面:    color #f1f5f9 + 底部 2px border-bottom #00f5d4
               box-shadow: 0 0 8px rgba(0,245,212,0.5)
  有下拉的项:  右侧 ChevronDown 12px ml-1，下拉打开时 rotate-180，transition 200ms

导航项列表（顺序固定）:
  1. 首页      路由: /         无下拉
  2. 交易      路由: 无        有下拉 ▾
  3. 节点      路由: 无        有下拉 ▾
  4. 探索      路由: 无        有下拉 ▾
  5. 关于      路由: 无        有下拉 ▾
```

---

## 第二部分：手机端右侧抽屉（lg:hidden）

### 遮罩层
```
定位:   fixed inset-0 z-[90]
背景:   rgba(0,0,0,0.5)
动画:   opacity 0→1  200ms ease（打开时）
交互:   点击遮罩关闭抽屉
```

### 抽屉面板
```
定位:   fixed  top: 60px  right: 0
尺寸:   width: min(84vw, 320px)  height: calc(100vh - 60px)
z-index: 95
背景:   rgba(10,10,18,0.97) + backdrop-filter: blur(32px)
左边框: 1px solid rgba(255,255,255,0.10)
滚动:   overflow-y: auto  padding-bottom: 80px
滚动条: 4px宽  thumb颜色 #1a1a2a

打开动画: transform translateX(100%) → translateX(0)
          duration 280ms  cubic-bezier(0.32, 0.72, 0, 1)
关闭动画: transform translateX(0) → translateX(100%)
          duration 220ms  ease-in
```

### 抽屉内部 — 钱包状态行
```
位置:   抽屉最顶部
margin: 16px 12px
样式:   background #13131e  border rgba(255,255,255,0.10)  rounded-[14px]  padding 16px

左侧:   绿色圆点(8px glow) + 钱包地址(JetBrains Mono 13px #f1f5f9)
右侧:   BSC 徽章
         文字: #22c55e  背景: rgba(34,197,94,0.12)
         边框: rgba(34,197,94,0.25)  rounded-[6px]  px-2 py-0.5  10px JetBrains Mono font-600
```

### 抽屉内部 — 导航分组

**分组容器通用样式**
```
padding: 8px 12px 4px
```

**分组标签通用样式**
```
字体:    10px  font-600  text-transform: uppercase  letter-spacing: 0.1em  颜色 #475569
布局:    flex items-center gap-2  padding: 10px 4px 6px
右侧线:  ::after { flex:1; height:1px; background: rgba(255,255,255,0.05) }
```

**导航条目通用样式**
```
布局:    flex items-center gap-3  px-3 py-[11px]  rounded-[12px]  margin-bottom: 2px
过渡:    background 150ms ease
点击:    transform scale(0.98)
悬停:    background #13131e
当前页:  background rgba(0,245,212,0.12)  border 1px rgba(0,245,212,0.15)

图标盒:
  尺寸:    36×36px  rounded-[10px]  flex items-center justify-center
  背景:    #1a1a2a（默认）→ rgba(0,245,212,0.12)（当前页）
  图标:    17px  lucide-react 图标

文字区（flex-1）:
  标题:    14px  font-500  #f1f5f9
           当前页 → #00f5d4 font-600
           危险项 → #f43f5e
  描述:    11px  #475569  margin-top: 2px  line-height: 1.4

右侧区:
  默认:    ChevronRight 14px  #475569  opacity: 0.5
  当前页:  ChevronRight → #00f5d4  opacity: 0.7
  数字徽章: JetBrains Mono 10px font-700  背景 #f43f5e  白色文字  rounded-[6px]  px-1.5 py-0.5
```

---

### 分组1 — 「交易 TRADING」

| 路由 | 图标(lucide) | 颜色 | 标题 | 描述 |
|------|-------------|------|------|------|
| /stake | TrendingUp | #00f5d4 | 质押 USDT | 存入USDT获得每日RWA收益 |
| /withdraw | ArrowDownCircle | #00f5d4 | 提现 RWA | 提取累积的RWA代币收益 |
| /swap | ArrowLeftRight | #8b5cf6 | Swap 兑换 | RWA ↔ USDT 即时兑换 |
| /dashboard | LayoutDashboard | #00f5d4 | 我的仪表盘 | 资产总览和收益记录 |
| /calculator | Calculator | #f59e0b | 收益计算器 | 预估质押收益和ROI |
| /emergency | AlertTriangle | #f43f5e | 紧急提取 ⚠️ | 取回50%本金（不可逆） |

> `/emergency` 特殊样式：标题颜色 `#f43f5e`，悬停背景 `rgba(244,63,94,0.10)`，右侧显示红色 `!` 徽章

---

### 分组2 — 「节点 NODES」

| 路由 | 图标(lucide) | 颜色 | 标题 | 描述 |
|------|-------------|------|------|------|
| /nodes | Hexagon | #f59e0b | 我的节点等级 | V2 Silver · 42% to V3（动态显示） |
| /nodes#referral | Users | #00f5d4 | 推荐关系树 | 管理下级和查看团队业绩 |
| /leaderboard | Trophy | #f59e0b | 节点排行榜 | 全球质押者排名 |

---

### 分组3 — 「探索 EXPLORE」

| 路由 | 图标(lucide) | 颜色 | 标题 | 描述 |
|------|-------------|------|------|------|
| /market | BarChart2 | #00f5d4 | RWA 行情 | 实时价格和K线图 |
| /analytics | PieChart | #8b5cf6 | 数据看板 | 协议TVL和链上数据 |
| /lucky | Star | #f59e0b | 抽奖活动 | 用RWA代币参与每周抽奖 |
| /announcements | Bell | #94a3b8 | 公告 | 最新协议更新和通知 |
| /help | HelpCircle | #94a3b8 | 帮助中心 | 常见问题和使用指南 |

> `/announcements` 右侧：当 `unreadCount > 0` 时显示红色数字徽章

---

### 分组4 — 「关于 ABOUT」

| 路由 | 图标(lucide) | 颜色 | 标题 | 描述 |
|------|-------------|------|------|------|
| /about | Info | #00f5d4 | 关于我们 | 团队、路线图、合作伙伴 |
| /security | Shield | #00f5d4 | 安全与审计 | SlowMist · CertiK 审计报告 |
| /governance | Scale | #8b5cf6 | 治理公示 | 参数变更和DAO提案记录 |

---

### 抽屉底部外部链接
```
布局:   flex flex-wrap gap-2  padding: 10px 16px 16px

每个链接:
  11px  颜色 #475569  ExternalLink图标 10px
  border 1px rgba(255,255,255,0.05)  rounded-full  px-3 py-1.5
  悬停: 颜色 #94a3b8  border rgba(255,255,255,0.10)  背景 #13131e

链接列表:
  "白皮书 ↗"   "GitHub ↗"   "BSCScan ↗"
```

---

## 第三部分：手机端底部 Tab 栏（lg:hidden）

### 容器样式
```
定位:   fixed  bottom: 0  left: 0  right: 0  z-[80]
高度:   64px + env(safe-area-inset-bottom, 0px)（iOS 安全区适配）
背景:   rgba(5,5,10,0.94) + backdrop-filter: blur(24px)
上边框: 1px solid rgba(255,255,255,0.05)
布局:   flex  5个子项等分

⚠️ 重要: 所有页面的 <main> 内容区需加 class="pb-16 lg:pb-0"
   防止页面内容被 Tab 栏遮挡
```

### 单个 Tab 结构
```
布局:    flex-1 flex flex-col items-center justify-center gap-1
position: relative
最小触控区: 44×44px

① 顶部指示条（激活时显示）
   position: absolute  top: 0  left: 50%  transform: translateX(-50%)
   尺寸: 24px × 2px
   背景: #00f5d4  border-radius: 2px
   发光: box-shadow: 0 0 8px rgba(0,245,212,0.6)
   动画: scaleX(0) → scaleX(1)
         200ms  cubic-bezier(0.34, 1.56, 0.64, 1)（弹性效果）

② 图标容器
   尺寸: 32×32px  rounded-[10px]  flex items-center justify-center
   图标: 20px  lucide-react
   默认: 背景 transparent  图标颜色 #475569
   激活: 背景 rgba(0,245,212,0.12)  图标颜色 #00f5d4
         box-shadow: 0 0 12px rgba(0,245,212,0.25)
   点击动画: scale(0.88) → scale(1.1) → scale(1.0)  弹性缩放

③ 通知红点（按需显示）
   position: absolute  top: 2px  right: calc(50% - 22px)
   尺寸: 8×8px  background #f43f5e  border-radius: 50%
   border: 2px solid #05050a
   发光: box-shadow: 0 0 6px rgba(244,63,94,0.8)

④ 标签文字
   10px  font-500  letter-spacing: 0.02em
   默认: #475569
   激活: #00f5d4  font-600
```

### 5 个 Tab 定义

| 位置 | 图标 | 标签 | 跳转/动作 | 激活条件 |
|------|------|------|-----------|---------|
| 1 | Home | 首页 | href="/" | pathname === "/" |
| 2 | TrendingUp | 交易 | href="/stake" | pathname 包含 /stake \| /withdraw \| /swap \| /dashboard \| /emergency \| /calculator |
| 3 | LayoutGrid | 仪表盘 | href="/dashboard" | pathname === "/dashboard" |
| 4 | Hexagon | 节点 | href="/nodes" | pathname 包含 /nodes \| /leaderboard |
| 5 | Grid3X3 | 更多 | 切换抽屉开关（非路由） | 抽屉打开时 |

> **仪表盘 Tab 特殊逻辑**：未连接钱包时，图标上叠加 Lock 图标，点击触发钱包连接弹窗而非路由跳转

---

## 第四部分：语言切换器下拉

### 触发按钮
```
内容:  Globe2图标(16px) + 当前语言代码(13px #94a3b8)
间距:  gap-1.5  px-2 py-1.5  rounded-lg
悬停:  background #13131e
```

### 下拉面板
```
定位:    absolute  右对齐  top: 100%  margin-top: 8px
尺寸:    width: 200px
背景:    rgba(13,13,20,0.96) + backdrop-filter: blur(32px)
边框:    1px solid rgba(255,255,255,0.10)  rounded-[12px]  padding: 4px
阴影:    0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)
最大高度: 320px  overflow-y: auto
入场动画: translateY(-6px) opacity(0) → translateY(0) opacity(1)  180ms ease-out
```

### 语言选项行
```
布局:    flex items-center gap-3  px-3 py-2.5  rounded-[8px]
悬停:    background #13131e  transition 120ms

内容（从左到右）:
  国旗 emoji 18px
  语言本名  14px  #f1f5f9
  语言代码  12px  #475569  JetBrains Mono  margin-left: auto
  勾选图标  14px  #00f5d4  （仅当前激活语言显示）
```

### 9种语言列表

| 国旗 | 本名 | 代码 | 特殊处理 |
|------|------|------|---------|
| 🇺🇸 | English | EN | — |
| 🇨🇳 | 中文 | ZH | **默认选中** |
| 🇪🇸 | Español | ES | — |
| 🇸🇦 | العربية | AR | 选中后设置 `document.dir="rtl"` |
| 🇮🇳 | हिन्दी | HI | — |
| 🇫🇷 | Français | FR | — |
| 🇧🇷 | Português | PT | — |
| 🇷🇺 | Русский | RU | — |
| 🇯🇵 | 日本語 | JA | — |

### 选择语言后执行
```typescript
// 伪代码逻辑
setCurrentLang(langCode)
if (langCode === 'AR') {
  document.documentElement.setAttribute('dir', 'rtl')
} else {
  document.documentElement.setAttribute('dir', 'ltr')
}
document.documentElement.lang = langCode.toLowerCase()
localStorage.setItem('rwa-lang', langCode)
setLangDropdownOpen(false)
```

---

## 第五部分：桌面端超级下拉菜单（hidden lg:block）

### 触发逻辑
```
打开: 鼠标悬停在主导航项上，延迟 200ms 打开（防抖）
关闭: 鼠标离开菜单区域，延迟 150ms 关闭（防抖）
键盘: Enter/Space 切换，Escape 关闭
```

### 下拉容器通用样式
```
定位:    absolute  top: 64px（紧贴导航栏底部）
背景:    rgba(13,13,20,0.96) + backdrop-filter: blur(32px)
边框:    1px solid rgba(255,255,255,0.10)  border-top: none
         border-radius: 0 0 16px 16px（仅底部圆角）
阴影:    0 24px 48px rgba(0,0,0,0.6)
         inset 0 1px 0 rgba(255,255,255,0.06)
内边距:  12px
入场:    translateY(-6px) opacity(0) → translateY(0) opacity(1)  180ms ease-out
离场:    translateY(0) opacity(1) → translateY(-4px) opacity(0)  120ms ease-in
```

### 下拉菜单条目通用样式
```
布局:    flex items-start gap-3  padding: 12px  rounded-[10px]
悬停:    background #13131e  transition 120ms
当前页:  background #13131e（持续显示）  标题颜色 #00f5d4

图标盒:
  尺寸: 40×40px  background #13131e  rounded-[8px]  flex-center
  图标: 18px  颜色按下方各菜单定义
  悬停: background #1a1a2a
  当前页: background rgba(0,245,212,0.12)  图标颜色 #00f5d4

文字区:
  标题: 14px font-600 #f1f5f9  当前页→#00f5d4
  描述: 12px #475569  margin-top: 2px  line-height: 1.5  max-width: 160px
```

---

### 「交易」下拉菜单
```
宽度:   520px
对齐:   左对齐到"交易"导航项
布局:   2列网格  gap: 4px
```

**区块标题行**
```
文字: "TRADING"  10px  small-caps  #475569  tracking-widest
位置: px-3 pb-2
```

**左列**
| 路由 | 图标 | 图标色 | 标题 | 描述 |
|------|------|--------|------|------|
| /stake | TrendingUp | #00f5d4 | 质押 USDT | 存入USDT获得每日RWA收益 |
| /withdraw | ArrowDownCircle | #00f5d4 | 提现 RWA | 提取累积的RWA代币收益 |
| /swap | ArrowLeftRight | #8b5cf6 | Swap 兑换 | RWA ↔ USDT 即时兑换 |

**右列**
| 路由 | 图标 | 图标色 | 标题 | 描述 | 特殊 |
|------|------|--------|------|------|------|
| /dashboard | LayoutDashboard | #00f5d4 | 我的仪表盘 | 查看资产总览和收益 | — |
| /emergency | AlertTriangle | #f43f5e | 紧急提取 | 取回50%本金（不可逆） | 整条加 rgba(244,63,94,0.10) 边框 |
| /calculator | Calculator | #f59e0b | 收益计算器 | 预估质押收益和ROI | — |

**底部数据条**
```
位置:  border-top 1px rgba(255,255,255,0.05)  margin-top: 8px  px-3 py-2.5
布局:  flex justify-between items-center

左侧: "当前年化" 12px #475569 + "292%" #00f5d4 JetBrains Mono font-700 ml-2
右侧: "立即质押 →" 12px #00f5d4 font-600  悬停 underline  href="/stake"
```

---

### 「节点」下拉菜单
```
宽度: 360px
布局: 单列
```

**条目列表**
| 路由 | 图标 | 图标色 | 标题 | 描述 |
|------|------|--------|------|------|
| /nodes | Hexagon | #f59e0b | 我的节点等级 | 查看V1-V5等级和升级进度 |
| /nodes#referral | Users | #00f5d4 | 推荐关系树 | 管理下级和查看团队业绩 |
| /leaderboard | Trophy | #f59e0b | 节点排行榜 | 全球质押者排名 |

**底部等级预览条**
```
位置:  border-top 1px rgba(255,255,255,0.05)  px-3 py-3
内容:
  标签: "您的等级" 11px #475569
  5个六边形徽章 (flex gap-1.5 mt-2):
    V1: background #1a1a2a  颜色 #475569  border rgba(255,255,255,0.05)
    V2: background rgba(0,245,212,0.12)  颜色 #00f5d4  border rgba(0,245,212,0.3)  glow（当前激活）
    V3-V5: 同V1（未解锁样式）
    每个: 28×28px  rounded-[6px]  flex-center  font-700  12px
  等级文字: "V2 Silver · 42% to V3"  11px  #475569  JetBrains Mono  margin-top: 6px
```

---

### 「探索」下拉菜单
```
宽度: 540px
布局: 2列网格  gap: 4px
```

**左列**
| 路由 | 图标 | 图标色 | 标题 | 描述 |
|------|------|--------|------|------|
| /market | BarChart2 | #00f5d4 | RWA 行情 | 实时价格和K线图 |
| /analytics | PieChart | #8b5cf6 | 数据看板 | 协议TVL和链上数据 |
| /lucky | Star | #f59e0b | 抽奖活动 | 用RWA代币参与每周抽奖 |

**右列**
| 路由 | 图标 | 图标色 | 标题 | 描述 | 特殊 |
|------|------|--------|------|------|------|
| /calculator | Calculator | #00f5d4 | 收益计算器 | 模拟不同质押方案 | — |
| /announcements | Bell | #94a3b8 | 公告 | 最新协议更新和通知 | 图标右上角红点（有未读时） |
| /help | HelpCircle | #94a3b8 | 帮助中心 | 常见问题和使用指南 | — |

---

### 「关于」下拉菜单
```
宽度: 320px
布局: 单列
```

**条目列表**
| 路由 | 图标 | 图标色 | 标题 | 描述 |
|------|------|--------|------|------|
| /about | Info | #00f5d4 | 关于我们 | 团队、路线图、合作伙伴 |
| /security | Shield | #00f5d4 | 安全与审计 | SlowMist · CertiK 审计报告 |
| /governance | Scale | #8b5cf6 | 治理公示 | 参数变更和DAO提案记录 |

**底部外部链接行**
```
位置:  border-top 1px rgba(255,255,255,0.05)  px-3 py-2.5
布局:  flex gap-4

每个链接: flex items-center gap-1.5  12px #475569  ExternalLink图标 11px
          悬停: #94a3b8  transition 150ms

链接: "白皮书" | "GitHub" | "审计报告"  （均为外部链接，target="_blank"）
```

---

## 第六部分：动画规格汇总

```
抽屉打开:      translateX(100%)→(0)  280ms  cubic-bezier(0.32, 0.72, 0, 1)
抽屉关闭:      translateX(0)→(100%)  220ms  ease-in
遮罩淡入:      opacity 0→1           200ms  ease
超级菜单打开:  translateY(-6px) opacity(0) → (0) opacity(1)  180ms  ease-out
超级菜单关闭:  translateY(0) → (-4px) opacity(0)             120ms  ease-in
语言下拉:      同超级菜单
汉堡→X变形:   250ms  ease（三线变X，颜色变青色）
Tab指示条:     scaleX(0)→(1)  200ms  cubic-bezier(0.34, 1.56, 0.64, 1)
Tab图标点击:   弹性缩放 scale(0.88)→(1.1)→(1.0)
导航栏背景:    300ms  ease（滚动触发）
所有悬停:      120–150ms  ease

prefers-reduced-motion:
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```

---

## 第七部分：无障碍与交互规格

```
role="navigation" aria-label="主导航" 加在 <nav> 上
aria-expanded="true/false" 加在所有下拉触发按钮上
aria-current="page" 加在当前页面对应的链接上
role="dialog" aria-modal="true" 加在手机抽屉上
焦点陷阱: 抽屉打开时，Tab 键焦点限制在抽屉内部
键盘关闭: Escape 键关闭抽屉和所有下拉菜单
最小触控区: 所有可点击元素 min 44×44px
```

---

## 第八部分：i18n 翻译 Key 定义

所有 JSX 中的文字必须通过 `t('key')` 取值，**不允许硬编码任何中文/英文字符串**。

```typescript
// 所需翻译 key 结构（英文默认值）
const navKeys = {
  // 主导航
  'nav.home':     'Home',
  'nav.trade':    'Trade',
  'nav.nodes':    'Nodes',
  'nav.explore':  'Explore',
  'nav.about':    'About',

  // 交易菜单
  'nav.trade.stake':           'Stake USDT',
  'nav.trade.stakeDesc':       'Deposit USDT to earn daily RWA rewards',
  'nav.trade.withdraw':        'Withdraw RWA',
  'nav.trade.withdrawDesc':    'Withdraw accumulated RWA rewards',
  'nav.trade.swap':            'Swap',
  'nav.trade.swapDesc':        'Instant RWA ↔ USDT exchange',
  'nav.trade.dashboard':       'My Dashboard',
  'nav.trade.dashboardDesc':   'View portfolio and earnings',
  'nav.trade.calc':            'Yield Calculator',
  'nav.trade.calcDesc':        'Estimate returns and ROI',
  'nav.trade.emergency':       'Emergency Exit',
  'nav.trade.emergencyDesc':   'Recover 50% principal — irreversible',
  'nav.trade.currentApy':      'Current APY',
  'nav.trade.stakeNow':        'Stake Now →',

  // 节点菜单
  'nav.nodes.level':           'My Node Level',
  'nav.nodes.levelDesc':       'View V1–V5 level and upgrade progress',
  'nav.nodes.referral':        'Referral Tree',
  'nav.nodes.referralDesc':    'Manage downlines and team volume',
  'nav.nodes.leaderboard':     'Leaderboard',
  'nav.nodes.leaderboardDesc': 'Global staker rankings',
  'nav.nodes.yourLevel':       'Your Level',

  // 探索菜单
  'nav.explore.market':              'RWA Market',
  'nav.explore.marketDesc':          'Live price charts and market data',
  'nav.explore.analytics':           'Analytics',
  'nav.explore.analyticsDesc':       'Protocol TVL and on-chain data',
  'nav.explore.lucky':               'Lucky Draw',
  'nav.explore.luckyDesc':           'Weekly lottery with RWA tokens',
  'nav.explore.calc':                'Calculator',
  'nav.explore.calcDesc':            'Simulate staking scenarios',
  'nav.explore.announcements':       'Announcements',
  'nav.explore.announcementsDesc':   'Latest updates and notices',
  'nav.explore.help':                'Help Center',
  'nav.explore.helpDesc':            'FAQ and user guide',

  // 关于菜单
  'nav.about.about':          'About Us',
  'nav.about.aboutDesc':      'Team, roadmap, and partners',
  'nav.about.security':       'Security & Audit',
  'nav.about.securityDesc':   'SlowMist · CertiK audit reports',
  'nav.about.governance':     'Governance',
  'nav.about.governanceDesc': 'DAO proposals and parameter changes',

  // 钱包
  'nav.wallet.connect':      'Connect Wallet',
  'nav.wallet.disconnect':   'Disconnect',
  'nav.wallet.notConnected': 'Wallet not connected',

  // Tab 栏
  'nav.tab.home':      '首页',
  'nav.tab.trade':     '交易',
  'nav.tab.dashboard': '仪表盘',
  'nav.tab.nodes':     '节点',
  'nav.tab.more':      '更多',

  // 外部链接
  'nav.ext.whitepaper': '白皮书 ↗',
  'nav.ext.github':     'GitHub ↗',
  'nav.ext.bscscan':    'BSCScan ↗',
}
```

---

## 第九部分：技术实现要求

```
框架:       Next.js 14 App Router
语言:       TypeScript（strict 模式）
样式:       Tailwind CSS 仅此一项，不写任何独立 CSS 文件
图标:       lucide-react（生产环境全部用 lucide 图标，不用 emoji）
路由检测:   usePathname() from 'next/navigation'
字体:       Space Grotesk + JetBrains Mono（从 Google Fonts 引入）
状态管理:   全部在组件内部（useState + useEffect），不依赖外部 store
第三方UI:   禁止使用（Radix UI / shadcn / Headless UI 均不允许）
组件文件:   单一文件 components/Navbar.tsx
iOS适配:    padding-bottom: env(safe-area-inset-bottom, 0px)
响应式断点: 
  手机 < 1024px → 抽屉 + Tab 栏
  桌面 ≥ 1024px → 超级下拉菜单（Tailwind: lg:）
```

---

## 给 Kiro 的额外指令

```
完成 Navbar.tsx 后，还需要做以下配套工作：

1. 全局布局适配
   在 app/layout.tsx 中，给 <main> 元素加上:
   className="pt-[60px] pb-16 lg:pt-[64px] lg:pb-0"
   （pt 是顶部导航高度，pb-16 是底部 Tab 栏高度，桌面端不需要底部间距）

2. 替换所有页面的 Navbar 引用
   将项目中所有已有页面的 Navbar 引用替换为此新版组件
   保持 import 路径不变: import Navbar from '@/components/Navbar'

3. 翻译文件同步
   在现有的 i18n 翻译文件中，按照第八部分的 key 列表
   补充中文（ZH）翻译值

4. 验证清单
   □ 手机端: 汉堡按钮 → 抽屉打开 → 分组清晰 → 点击导航项 → 抽屉关闭
   □ 手机端: 底部 Tab 切换激活状态正确
   □ 手机端: iOS 底部安全区不被遮挡
   □ 桌面端: 悬停"交易"/"节点"/"探索"/"关于" → 二级菜单展开
   □ 桌面端: 当前页面对应导航项高亮
   □ 两端: 语言切换器展开并选择语言正常
   □ 两端: 选择阿拉伯语后页面切换为 RTL 布局
   □ 两端: 滚动页面时导航栏背景渐显
```
