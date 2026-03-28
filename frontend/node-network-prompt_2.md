# RWA Protocol — 节点网络页面 Cursor 开发提示词
# Node Network Page — Full Cursor Prompt (Bilingual)

---

## 项目背景 / Project Context

```
RWA Protocol 是一个部署在 BSC 链上的 DeFi 质押平台。
用户质押 USDT 获得 RWA 代币收益。
节点系统是核心激励机制之一。

RWA Protocol is a BSC-based DeFi staking platform.
Users stake USDT to earn RWA token rewards.
The node system is one of the core incentive mechanisms.
```

---

## 节点等级规则 / Node Level Rules

```
等级从 L1 到 L9，升级需同时满足三个维度：
Levels L1 to L9, upgrade requires meeting ALL THREE dimensions:

L1: 个人质押 ≥ 100 USDT  | 团队质押 ≥ 0      | 总留存 ≥ 0
L2: 个人质押 ≥ 500 USDT  | 团队质押 ≥ 1,000  | 总留存 ≥ 800
L3: 个人质押 ≥ 1,000     | 团队质押 ≥ 5,000  | 总留存 ≥ 4,000
L4: 个人质押 ≥ 3,000     | 团队质押 ≥ 20,000 | 总留存 ≥ 16,000
L5: 个人质押 ≥ 5,000     | 团队质押 ≥ 50,000 | 总留存 ≥ 40,000
L6: 个人质押 ≥ 10,000    | 团队质押 ≥ 150,000| 总留存 ≥ 120,000
L7: 个人质押 ≥ 20,000    | 团队质押 ≥ 400,000| 总留存 ≥ 320,000
L8: 个人质押 ≥ 50,000    | 团队质押 ≥ 1,000,000 | 总留存 ≥ 800,000
L9: 个人质押 ≥ 100,000   | 团队质押 ≥ 3,000,000 | 总留存 ≥ 2,400,000

总留存 = 团队总质押 - 团队总提现
Net Retention = Team Total Staked - Team Total Withdrawn

推荐奖励：仅1层直推，直推人首次质押时一次性奖励
Referral Reward: 1st level only, one-time bonus when direct referral stakes

团队分红：无限层，按团队总留存为基数，每日分红
Team Dividend: Unlimited levels, based on total net retention, paid daily
```

---

# ══════════════════════════════════════
# 中文完整提示词
# ══════════════════════════════════════

请为 RWA Protocol 开发「我的网络」完整页面（点击节点页「查看完整网络」后进入）。

## 设计系统（严格遵守）

```css
:root {
  --bg: #05050a;        /* void black 主背景 */
  --s1: #0d0d14;        /* 卡片背景 */
  --s2: #13131e;        /* 次级卡片 */
  --s3: #1a1a2a;        /* 输入框/按钮背景 */
  --s4: #20202e;        /* 深色元素 */
  --cyan: #00f5d4;      /* plasma cyan 主色 */
  --cdim: rgba(0,245,212,0.10);
  --cglow: rgba(0,245,212,0.22);
  --purple: #8b5cf6;
  --gold: #f59e0b;
  --green: #22c55e;
  --danger: #f43f5e;
  --t1: #f1f5f9;        /* 主文字 */
  --t2: #94a3b8;        /* 副文字 */
  --t3: #475569;        /* 弱文字 */
  --br: rgba(255,255,255,0.05);
  --brc: rgba(0,245,212,0.18);
}

/* 全局字体 */
正文/UI: Space Grotesk
数字/地址/金额/倍数: JetBrains Mono

/* 全局效果 */
扫描线: body::after，repeating-linear-gradient，4px 间距，透明度 6-8%
背景光晕球: position:fixed，filter:blur(90px)，radial-gradient，z-index:0
毛玻璃导航: backdrop-filter:blur(20px) + rgba 背景
```

---

## 一、顶部导航栏（Sticky）

```
position: sticky; top: 0; z-index: 100
background: rgba(5,5,10,0.88) + backdrop-filter:blur(20px)
border-bottom: 1px solid rgba(255,255,255,0.06)
padding: 16px 20px
高度: 约 56px

布局（三列）:
  左: 返回按钮（← 箭头 + "Node"）
      颜色: #94a3b8，hover 变 #f1f5f9
      
  中: 页面标题「My Network」
      font-size: 15px，font-weight: 700
      
  右: 刷新按钮
      样式: background rgba(0,245,212,0.10)，border rgba(0,245,212,0.18)
      color: #00f5d4，padding: 6px 12px，border-radius: 8px
      内容: 旋转箭头 SVG 图标 + 「Refresh」
      点击时: 图标旋转动画 @keyframes spin，持续 1.5s 后停止
      
状态: 数据加载中时右侧刷新按钮显示 spinner
```

---

## 二、实时状态横幅（Auto-refresh Bar）

```
紧贴导航栏下方
background: rgba(0,245,212,0.04)
border-bottom: 1px solid rgba(0,245,212,0.08)
padding: 7px 20px
display: flex; justify-content: space-between

左侧:
  绿色脉冲点（6px，animation: blink 2s infinite）
  + 「Auto-refresh every 5 min」(11px #475569)

右侧:
  「Last updated: X min ago」(11px)
  X 用 JetBrains Mono，颜色 #00f5d4
  实时倒计时（JS setInterval，每秒更新）
  格式: "just now" → "30s ago" → "1m 30s ago" → "5m ago"（触发自动刷新）

自动刷新逻辑:
  每 300 秒（5分钟）触发一次 fetchNetworkData()
  刷新时导航栏右侧刷新按钮自动进入 spinning 状态
  刷新完成后时间重置为 "just now"
```

---

## 三、我的节点卡片（My Node Card）

```
margin: 16px 20px
background: linear-gradient(135deg, #13131e 0%, #0d0d14 100%)
border: 1px solid rgba(0,245,212,0.20)
border-radius: 20px; padding: 20px
box-shadow:
  0 0 40px rgba(0,245,212,0.07),
  0 20px 50px rgba(0,0,0,0.5),
  inset 0 1px 0 rgba(255,255,255,0.05)

右上装饰光效:
  ::before 伪元素，position:absolute
  top:-60px; right:-60px; width:180px; height:180px
  border-radius:50%
  background: radial-gradient(circle, rgba(0,245,212,0.08), transparent 70%)
```

### 3.1 卡片顶部（等级徽章 + 基本信息）

```
display: flex; justify-content: space-between; align-items: flex-start
margin-bottom: 18px

左侧 - 等级徽章:
  background: rgba(0,245,212,0.10)
  border: 1px solid rgba(0,245,212,0.18)
  border-radius: 14px; padding: 10px 16px; text-align: center
  
  内容（从上到下）:
    标签: 「LEVEL」(9px 大写 #475569)
    数值: 「L4」JetBrains Mono 28px 700 #00f5d4 line-height:1
    名称: 节点等级对应名称（见下方映射表）
    
  等级名称映射:
    L1: Newcomer      L2: Basic Node    L3: Active Node
    L4: Senior Node   L5: Super Node    L6: Elite Node
    L7: Master Node   L8: Grand Master  L9: Supreme Node 👑

右侧 - 基本信息:
  钱包地址: JetBrains Mono 11px #475569（缩写 0x1234…5678）
  加入时间: 10px #475569（"Joined: 2024-01-15"）
  本人质押: JetBrains Mono 13px，绿色（"My Stake: 5,000 USDT"）
```

### 3.2 升级进度条（三维进度）

```
整体 margin-bottom: 16px

顶部标题行:
  左: 「Upgrade Progress to L5」11px #475569
  右: 距离升级的差距提示（动态显示最难达到的维度）
      例: 「Need 30,000 more team stake」
      用 JetBrains Mono 11px，#94a3b8

三个维度进度条（垂直排列，间距 8px）:
  每条包含:
    维度标签（左）: 「Personal」/「Team Stake」/「Net Retention」
                    9px 大写 #475569
    当前值/目标值（右）: JetBrains Mono 10px
                        已达到: #22c55e
                        未达到: #94a3b8
    进度条（height: 5px，border-radius: 3px）:
      track: rgba(255,255,255,0.05)
      fill: 
        已完成 100%: background #22c55e + 绿色发光
        进行中:      background linear-gradient(90deg, #00f5d4, rgba(0,245,212,0.7))
                    fill 末端白色高光 ::after
      过渡: width transition 1s ease（组件挂载时动画展开）
      
  三条进度条下方的 L1-L9 节点点（同之前设计）:
    9个点，间距均等
    done: #00f5d4 + glow
    current: #00f5d4 + pulse animation
    locked: rgba(255,255,255,0.1) border

进度数据示例（L4 → L5）:
  Personal: 5,000 / 5,000 USDT ✓ (100%)
  Team Stake: 35,000 / 50,000 USDT (70%)
  Net Retention: 28,000 / 40,000 USDT (70%)
```

### 3.3 快速统计三格

```
display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px

每格:
  background: rgba(255,255,255,0.03)
  border: 1px solid rgba(255,255,255,0.05)
  border-radius: 10px; padding: 10px; text-align: center
  
  标签: 9px 大写 #475569
  数值: JetBrains Mono 15px 600

三格数据:
  「Direct Refs」: 数量，颜色 #00f5d4
  「Team Size」:   总人数（含所有层级），颜色 #8b5cf6
  「My Stake」:    本人质押 USDT，颜色 #22c55e
```

---

## 四、团队总览卡片（2×2 Grid）

```
padding: 0 20px
display: grid; grid-template-columns: 1fr 1fr; gap: 10px

每张卡片:
  background: #0d0d14
  border: 1px solid rgba(255,255,255,0.06)
  border-radius: 16px; padding: 16px
  box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)
  transition: .3s
  hover: transform translateY(-2px)，border-color rgba(255,255,255,0.10)
  
  图标（32px，border-radius:9px，带对应色系背景）
  标签（10px #475569）
  数值（JetBrains Mono 20px 700）
  副标（10px #475569）
  趋势（10px，绿色，↑ 图标，显示近期增长）

四张数据:
  1. 💰 Team Total Stake  → 所有层级质押总和 USDT（cyan）
  2. 👥 Total Members     → 所有层级成员总数（purple）
  3. ✨ Total Dividends   → 历史累计分红 RWA（gold）
  4. 📈 Daily Dividend    → 今日分红收益 RWA（green）

数值加载时显示 skeleton shimmer 动画
```

---

## 五、团队分红模块（Dividend）

```
margin: 10px 20px
background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))
border: 1px solid rgba(245,158,11,0.18)
border-radius: 16px; padding: 16px
box-shadow: 0 8px 24px rgba(245,158,11,0.06), inset 0 1px 0 rgba(245,158,11,0.10)
```

### 5.1 标题行

```
display: flex; justify-content: space-between; align-items: center
margin-bottom: 14px

左: 「✨ Team Dividend」11px 大写 rgba(245,158,11,0.7) 600
右: 「∞ Levels」徽章
    background rgba(245,158,11,0.12)，border rgba(245,158,11,0.2)，color #f59e0b
    font-size 10px 700，padding 3px 10px，border-radius 6px
```

### 5.2 三格核心数据

```
display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px
margin-bottom: 14px

三格:
  Base（团队总留存）: JetBrains Mono 16px，#f59e0b
  Rate（我的等级对应分红比率）: JetBrains Mono 16px，#f59e0b
  Today（今日分红）: JetBrains Mono 16px，#f59e0b

标签: 9px 大写 rgba(245,158,11,0.5)
```

### 5.3 分红规则说明

```
background: rgba(245,158,11,0.06)
border: 1px solid rgba(245,158,11,0.10)
border-radius: 10px; padding: 10px 12px

每行（标签/值，flex space-between）:
  Calculation base    → Team net retention (all levels)
  Covered levels      → Unlimited (∞ generations)
  My daily rate (L4)  → 0.31% of base
  Settlement          → Daily at UTC 00:00
  Base formula        → Total Staked - Total Withdrawn

标签: 11px #94a3b8
值: JetBrains Mono 11px #f59e0b 600

底部说明段落（小字）:
  「Net Retention = Team Total Staked − Team Total Withdrawn
    The more your team stakes and the less they withdraw,
    the higher your dividend base.」
  font-size: 11px; color: #475569; line-height: 1.6; margin-top: 10px
```

---

## 六、直推奖励模块（Referral Reward）

```
margin: 10px 20px
background: linear-gradient(135deg, rgba(0,245,212,0.08), rgba(0,245,212,0.03))
border: 1px solid rgba(0,245,212,0.15)
border-radius: 16px; padding: 16px
```

### 6.1 布局结构

```
顶部标题行:
  左: 「Direct Referral Reward」11px 大写 rgba(0,245,212,0.6)
  右: 「Layer 1 Only」徽章（cyan 色系）

2×1 数据格（网格）:
  Total Earned（历史累计）: JetBrains Mono 18px #00f5d4
  This Month（本月）: JetBrains Mono 18px #00f5d4

规则说明（圆角框）:
  内容: 「When your direct referral stakes for the first time,
         you receive a ONE-TIME bonus (10% of their staked amount).
         This applies ONLY to your 1st-level direct invitees.
         No further levels are included.」
  
  关键词高亮: ONE-TIME / ONLY / 1st-level → color #00f5d4
  font-size: 12px; color: #94a3b8; line-height: 1.7
```

---

## 七、Tab 切换（4个视图）

```
padding: 0 20px; margin: 16px 0 0
display: flex; gap: 6px

Tab 列表: [Direct(N)] [Tree] [Levels] [Ranking]

样式:
  flex: 1; padding: 9px 0; border-radius: 10px
  font-size: 12px; font-weight: 500; text-align: center
  transition: .2s
  
Active:
  background: rgba(0,245,212,0.10)
  border: 1px solid rgba(0,245,212,0.18)
  color: #00f5d4
  
Inactive:
  background: transparent; border: 1px solid transparent
  color: #475569; hover → #94a3b8

括号内数字（N）实时显示对应数量
```

---

## 八、Tab1：直推列表（Direct Referrals）

```
列表容器: padding: 0 20px

每条记录（direct-item）:
  display: flex; align-items: center; gap: 12px
  background: #0d0d14
  border: 1px solid rgba(255,255,255,0.06)
  border-radius: 14px; padding: 13px 14px
  margin-bottom: 8px
  transition: .2s; cursor: pointer
  hover: border-color rgba(255,255,255,0.12)，translateX(3px)
  active（展开详情）: border-color var(--brc)
```

### 每条记录内容

```
左：头像（40×40px，border-radius:12px）
  active 用户: background rgba(0,245,212,0.10)，cyan 边框，文字 #00f5d4
  inactive:    background #1a1a2a，灰色边框，#94a3b8
  内容: 地址前两字符（JetBrains Mono 13px 700）

中：信息区
  第一行: 钱包地址（JetBrains Mono 12px #94a3b8）
  第二行（flex，gap:8px）:
    等级徽章（颜色按等级）:
      L1: gray   L2: green  L3: cyan
      L4: cyan   L5: purple L6: purple
      L7: gold   L8: gold   L9: gold + 👑
    本人质押额（10px #475569，数字用 JetBrains Mono #94a3b8）
    加入时间（10px #475569）
  第三行（展开状态才显示）:
    团队质押/团队总留存/今日分红（三格小数据）

右：团队数据
  在线状态点（绿色/灰色）
  团队人数（JetBrains Mono 13px 600 #f1f5f9）
  「team size」(9px #475569)
  今日分红贡献（10px #22c55e）

右侧箭头（>），展开/折叠切换
```

### 展开详情（点击记录后展开）

```
展开动画: max-height 0 → auto，transition .3s ease
内容区域（border-top 1px solid rgba(255,255,255,0.05)，padding-top: 12px）:

三格小统计（grid 3列）:
  Team Stake / Net Retention / Daily Contribution
  标签: 9px #475569
  值: JetBrains Mono 13px 600

下级预览（前3个直推）:
  小型列表，地址 + 等级 + 质押额
  末尾显示「+N more members」

「View Sub-tree」按钮:
  background transparent，border 1px solid rgba(0,245,212,0.2)
  color #00f5d4，font-size: 12px，padding: 6px 16px，border-radius: 8px
```

---

## 九、Tab2：树形网络图（Tree View）

```
容器:
  margin: 12px 20px 0
  background: #0d0d14
  border: 1px solid rgba(255,255,255,0.06)
  border-radius: 16px; overflow: hidden

顶部工具栏（padding: 12px 16px，border-bottom）:
  左: 「Network Tree」11px 大写 #475569
  右: [Expand All] [Collapse All] 两个小按钮

树形区域:
  overflow-x: auto; padding: 20px
  min-height: 300px

节点样式:

  根节点（我）:
    background: rgba(0,245,212,0.10)
    border: 1px solid rgba(0,245,212,0.25)
    border-radius: 12px; padding: 10px 16px; text-align: center
    min-width: 130px
    内容: 「You」标签 + 地址 + 等级 + 质押额
    box-shadow: 0 0 20px rgba(0,245,212,0.12)

  一级节点:
    background: #13131e
    border: 1px solid rgba(255,255,255,0.08)
    border-radius: 10px; padding: 8px 12px
    min-width: 100px; text-align: center
    hover: border-color rgba(0,245,212,0.2)，cursor pointer
    click: 展开/折叠子树

  二级节点:
    background: rgba(255,255,255,0.02)
    border: 1px solid rgba(255,255,255,0.04)
    border-radius: 8px; padding: 6px 10px
    min-width: 80px; font-size: 11px

  更深层节点:
    继续缩小，最多展示 4 层
    超过4层显示「+N deeper levels」省略节点

连接线:
  竖线: width 1px，rgba(0,245,212,0.15)
  横线（兄弟节点之间）: height 1px，rgba(255,255,255,0.06)
  
  展开/折叠动画:
    子树出现: fadeIn + translateY(-10px → 0)，0.25s
    子树隐藏: fadeOut + translateY(0 → -10px)，0.2s

无限滚动: 层级较多时支持横向滚动
手势: 移动端支持 pinch-to-zoom（CSS transform scale）
```

---

## 十、Tab3：节点等级表（Level System）

```
容器:
  margin: 12px 20px 0
  background: #0d0d14
  border: 1px solid rgba(255,255,255,0.06)
  border-radius: 16px; overflow: hidden

表头（5列）:
  Level | Personal | Team Stake | Net Retention | Rate
  background: rgba(255,255,255,0.02)
  padding: 10px 14px
  font-size: 9px 大写 #475569 600

每行数据（L1-L9）:
  padding: 12px 14px
  border-bottom: 1px solid rgba(255,255,255,0.03)
  display: grid; grid-template-columns: 50px 1fr 1fr 1fr 60px
  gap: 6px; align-items: center

等级列颜色:
  L1-L2: #94a3b8  L3-L4: #00f5d4  L5-L6: #8b5cf6  L7-L8: #f59e0b
  L9: #f59e0b + text-shadow glow + 👑

数值列: JetBrains Mono 11px #94a3b8（简写: 1K/10K/1M）

分红比率列: JetBrains Mono 11px #f59e0b 600

最右列状态:
  已完成: 「✓ DONE」绿色小徽章
  当前:   「★ NOW」cyan 徽章 + pulse glow animation
          整行 background: rgba(0,245,212,0.04)
          border-left: 2px solid #00f5d4
  未解锁: 「🔒」灰色

  当前行额外显示升级差距提示（行下方展开区）:
    「To reach L5: Need +15,000 team stake, +12,000 net retention」
    font-size: 11px; color: #94a3b8; padding: 8px 14px
    background: rgba(0,245,212,0.03)

L9 行特殊处理:
  背景微金色渐变
  等级数字带金色 glow
  右侧显示「👑 SUPREME」
```

---

## 十一、Tab4：平台排行榜（Ranking）

```
容器: padding: 0 20px

排行榜说明（顶部）:
  「Ranking based on team net retention across all platform users」
  11px #475569; padding: 12px 0 8px

每条排名记录:
  display: flex; align-items: center; gap: 12px
  background: #0d0d14
  border: 1px solid rgba(255,255,255,0.06)
  border-radius: 13px; padding: 12px 14px
  margin-bottom: 8px

排名数字（28px 宽）:
  #1: 🥇（或金色数字）
  #2: 🥈
  #3: 🥉
  #4-10: JetBrains Mono 13px 700 #475569
  「我」的排名: #00f5d4

头像（34×34px，border-radius:10px）:
  内容: 地址前两字符，JetBrains Mono 11px

信息区:
  地址（JetBrains Mono 11px #94a3b8）
  等级 + 团队人数（10px #475569）

右侧数值:
  团队净留存（JetBrains Mono 13px 600）
  「net retention」(9px #475569)

「我的排名」特殊样式:
  整行 background: rgba(0,245,212,0.08)
  border-color: rgba(0,245,212,0.2)
  地址后显示「YOU」小徽章（cyan）

榜单与我的排名之间:
  中间省略用 「· · ·」分隔
  我的排名始终显示在可见区域（固定在列表底部或滚动到可见位置）

「Load More」按钮:
  border: 1px solid rgba(255,255,255,0.06)
  color: #475569; border-radius: 10px; padding: 10px
  text-align: center; cursor: pointer; margin-top: 8px
  hover: color #94a3b8
```

---

## 十二、邀请模块（Invite）

```
margin: 16px 20px 0
background: #0d0d14
border: 1px solid rgba(255,255,255,0.06)
border-radius: 16px; padding: 18px

标题: 「Invite Friends & Earn」11px 大写 #475569 600

邀请链接框:
  background: #1a1a2a; border: 1px solid rgba(255,255,255,0.06)
  border-radius: 10px; padding: 10px 12px
  display: flex; align-items: center; gap: 10px
  
  链接文字: JetBrains Mono 11px #94a3b8，overflow:hidden，text-overflow:ellipsis
  复制按钮: background rgba(0,245,212,0.10)，color #00f5d4
            点击后变为「✓ Copied!」绿色，1.5s后恢复

两个按钮（2列 grid）:
  「Share Link」: background #00f5d4，color #05050a（主要操作）
  「QR Code」:   background #1a1a2a，border rgba(255,255,255,.06)（次要）
  height: 42px; border-radius: 10px; font-size: 13px; font-weight: 600

邀请统计小条（底部）:
  显示「You've invited X people · Earned X RWA in referral rewards」
  11px #475569
```

---

## 十三、数据加载与状态

### Loading Skeleton

```
所有数值区域在数据加载期间显示 skeleton：
  background: linear-gradient(90deg, #13131e 25%, #1a1a2a 50%, #13131e 75%)
  background-size: 200% 100%
  animation: shimmer 1.5s infinite
  border-radius: 4-6px

不同宽度:
  大数值: width 80px, height 20px
  小数值: width 50px, height 14px
  地址: width 120px, height 14px
```

### 错误状态

```
数据获取失败时:
  toast 提示（顶部滑入）: 「Failed to load data · Tap to retry」
  背景: rgba(244,63,94,0.12)，border rgba(244,63,94,0.2)
  重试按钮内联
```

### 空状态（无下级）

```
直推列表为空时:
  居中图示（SVG 网络图标，30% opacity）
  标题: 「No referrals yet」14px #94a3b8
  副标: 「Share your link to start building your network」11px #475569
  「Get Referral Link」按钮
```

---

## 十四、技术实现规范

```
框架: Next.js 14 App Router（'use client'）
样式: Tailwind CSS + CSS Custom Properties
动画: Framer Motion（树形展开/折叠）+ CSS Animation
状态管理: Zustand（networkStore）
数据获取: SWR（5分钟 revalidation interval）
合约读取: wagmi useReadContract / useReadContracts（批量读取）

文件结构:
  app/node/network/page.tsx                主页面
  components/node/network/
    NetworkHeader.tsx                      顶部导航 + 刷新
    MyNodeCard.tsx                         我的节点 + 进度
    TeamOverview.tsx                       团队总览 4格
    DividendModule.tsx                     分红模块
    ReferralModule.tsx                     直推奖励模块
    NetworkTabs.tsx                        Tab 切换
    DirectList.tsx                         直推列表
    DirectItem.tsx                         单条直推（可展开）
    TreeView.tsx                           树形图
    LevelTable.tsx                         等级表
    RankingList.tsx                        排行榜
    InviteSection.tsx                      邀请模块
    LoadingSkeleton.tsx                    骨架屏
  hooks/
    useNetworkData.ts                      SWR + 合约读取
    useAutoRefresh.ts                      5分钟自动刷新
  store/networkStore.ts                    Zustand 状态

链上数据读取（合约函数）:
  getUserInfo(address) → 用户基本信息
  getNodeLevel(address) → 当前节点等级
  getDirectReferrals(address) → 直推列表
  getTeamStats(address) → 团队统计（质押/提现/留存/人数）
  getDividendInfo(address) → 分红信息
  getPlatformRanking(address) → 我在平台的排名
  getUpgradeProgress(address) → 升级进度（三个维度）

SWR 配置:
  refreshInterval: 300000  // 5分钟
  revalidateOnFocus: false
  onSuccess: () => updateLastRefreshTime()

移动端:
  viewport: width=device-width, initial-scale=1.0, maximum-scale=1.0
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  safe-area: env(safe-area-inset-*)
  树形图支持横向滑动（overflow-x: auto + touch scrolling）
```

---
---

# ══════════════════════════════════════
# English Full Prompt
# ══════════════════════════════════════

Build the "My Network" page for RWA Protocol — a BSC DeFi staking platform.
This page is accessed by tapping "View Full Network" on the Node page.

## Design System (Strictly Required)

Same CSS variables as defined above. All numbers/addresses use JetBrains Mono.
All UI text uses Space Grotesk.
Global scanlines effect via body::after.
Fixed ambient orb decorations (filter:blur).

---

## Page Structure (Mobile-First, max-width: 520px)

Top to bottom:
1. Sticky navigation bar
2. Auto-refresh status bar
3. My Node Card (level badge + 3-dimension upgrade progress + quick stats)
4. Team Overview (2×2 cards grid)
5. Team Dividend module (gold theme, unlimited levels)
6. Direct Referral Reward module (cyan theme, 1 level only)
7. 4-tab switcher: [Direct] [Tree] [Levels] [Ranking]
8. Tab content area
9. Invite module

---

## 1. Sticky Navigation

```
Left:   Back button (← arrow + "Node" text), color #94a3b8
Center: "My Network" title (15px 700)
Right:  Refresh button with rotating SVG arrow icon
        Style: cyan dim bg + cyan border, 6px 12px padding, 8px radius
        Click: icon spins for 1.5s, data re-fetches, timer resets to "just now"
```

---

## 2. Auto-Refresh Bar

```
Below nav, thin bar
Left:  Green pulse dot + "Auto-refresh every 5 min"
Right: "Last updated: X" — X counts up in real-time using JS setInterval
       Format: "just now" → "30s ago" → "2m 30s ago" → triggers refresh at 5m
Auto-refresh: calls fetchNetworkData() every 300 seconds via SWR refreshInterval
```

---

## 3. My Node Card

```
Gradient background card with cyan border glow
Top section: Level badge (left) + wallet address + join date + my stake (right)
  Level badge: big "L4" JetBrains Mono 28px + level name below

Three-Dimension Upgrade Progress:
  Three separate progress bars (Personal Stake / Team Stake / Net Retention)
  Each bar: label (left) + current/target values (right) + colored progress fill
  Green (100% met) vs Cyan gradient (in progress)
  Width animates from 0 on mount (1s ease transition)
  Below all bars: 9 dots for L1-L9 (done/current/locked states)
  Above bars: "Upgrade to L5" + what's needed shown dynamically

Bottom: 3-column mini stats grid
  Direct Refs (cyan) | Team Size (purple) | My Stake (green)
```

---

## 4. Team Overview (2×2 Cards)

```
Each card: dark bg, subtle border, hover lifts 2px
4 metrics: Team Total Stake / Total Members / Total Dividends / Daily Dividend
Each shows: icon badge + label + big JetBrains Mono value + sub-text + trend (+X this week)
Show skeleton shimmer while loading
```

---

## 5. Team Dividend Module (Gold Theme)

```
Gold gradient card (rgba(245,158,11,...) color family)
Header: "✨ Team Dividend" + "∞ Levels" badge

3 data cells: Base (net retention) | Rate (my level rate) | Today (daily income)

Rules table (4 rows):
  Calculation base  → Team net retention (all levels)
  Covered levels    → Unlimited (∞ generations)
  My rate (L4)      → 0.31% of base per day
  Settlement        → Daily at UTC 00:00

Formula note at bottom:
  "Net Retention = Total Staked − Total Withdrawn
   Higher retention = higher dividend base"
```

---

## 6. Referral Reward Module (Cyan Theme)

```
Cyan gradient card
Header: "Direct Referral Reward" + "Layer 1 Only" badge
2 stats: Total Earned | This Month (both JetBrains Mono 18px cyan)
Rule text (highlighted keywords in cyan):
  "When your direct referral stakes for the first time, you receive
   a ONE-TIME bonus (10% of their stake). ONLY 1st-level direct
   invitees qualify — no further levels."
```

---

## 7. Tab Switcher

```
4 equal-width tabs: Direct(N) | Tree | Levels | Ranking
Active: cyan dim bg + cyan border + cyan text
Inactive: transparent + muted text
N in "Direct(N)" shows real-time count
```

---

## 8. Tab: Direct Referrals

```
Each item is an expandable card:
  Collapsed: avatar + address + level badge + stake amount + team size + online dot
  Expanded (tap to toggle): 3 mini stats + sub-tree preview + "View Sub-tree" button

Avatar: 40px, rounded-12, shows first 2 chars of address
Level badges: color-coded (L1=gray, L2=green, L3-L4=cyan, L5-L6=purple, L7-L9=gold)
Hover: translateX(3px), border lightens
Empty state: SVG illustration + "No referrals yet" + invite CTA
```

---

## 9. Tab: Tree View

```
Horizontally scrollable canvas area
Toolbar: "Network Tree" + [Expand All] [Collapse All] buttons

Node styles:
  Root (me):    cyan dim bg, cyan border, glow shadow, 130px min-width
  Level 1:      dark surface, hover highlights, clickable to expand
  Level 2+:     progressively smaller, lighter styling
  Max display: 4 levels deep, then "+N deeper levels" placeholder

Connections: thin lines (cyan-tinted vertical, white-tinted horizontal)
Expand/collapse animation: Framer Motion (height + opacity)
Mobile: horizontal scroll + pinch-to-zoom support
```

---

## 10. Tab: Level System Table

```
5-column table: Level | Personal | Team Stake | Net Retention | Rate
Header row: 9px uppercase gray labels

Each row:
  Level color: gray→green→cyan→purple→gold (L1-L9)
  Values abbreviated: 1K / 10K / 1M
  Rate: JetBrains Mono gold 600
  Status badges: ✓ DONE (green) | ★ NOW (cyan + pulse) | 🔒 (gray)

Current level row (L4):
  Subtle cyan row background
  Left border: 2px solid #00f5d4
  Expanded section below row: shows exact gap to next level

L9 row special:
  Micro gold gradient background
  "👑 SUPREME" badge
```

---

## 11. Tab: Platform Ranking

```
Header note: "Ranked by team net retention across all platform users"

Each entry:
  Rank number (medals for top 3, cyan for my rank)
  Avatar (address initials, 34px)
  Address + level + team count
  Net retention value (right, JetBrains Mono)

My entry always visible:
  Cyan highlight row + "YOU" badge
  Separator "· · ·" between leaderboard and my entry
  
"Load More" button at bottom
```

---

## 12. Invite Module

```
Referral link box with copy button (changes to "✓ Copied!" for 1.5s)
Two action buttons: "Share Link" (cyan primary) | "QR Code" (ghost)
Bottom stat: "You've invited X people · Earned X RWA in referral rewards"
```

---

## 13. Loading & Error States

```
Skeleton: shimmer animation on all value placeholders
Error: top-slide toast "Failed to load · Tap to retry" (red tint)
Empty direct list: SVG illustration + "No referrals yet" + invite CTA
```

---

## 14. Tech Stack

```
Framework:   Next.js 14 App Router ('use client')
Styling:     Tailwind CSS + CSS Custom Properties
Animation:   Framer Motion (tree expand) + CSS (progress bars, skeleton)
State:       Zustand (networkStore)
Data:        SWR with refreshInterval: 300000 (5 min)
Contract:    wagmi useReadContracts (batch read)
On-chain:    getUserInfo / getNodeLevel / getDirectReferrals /
             getTeamStats / getDividendInfo / getPlatformRanking /
             getUpgradeProgress

Key SWR config:
  refreshInterval: 300000
  revalidateOnFocus: false
  onSuccess: updateLastRefreshTime()

Mobile:
  max-scale=1.0, touch-action:manipulation
  Tree view: overflow-x:auto with smooth touch scrolling
  All tap targets: min 44×44px
  env(safe-area-inset-*) respected
```
