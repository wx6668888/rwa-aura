# 公告页面翻译待完成清单

## 当前状态

✅ 已完成：
- 中文第一条公告完整内容
- 页面基础翻译键（中英韩）
- 数据结构和组件

⏳ 待完成：
- 其他11条公告的完整内容（中英韩）
- 其他7种语言的翻译

## 翻译结构

每条公告需要3个翻译键：

```typescript
announce.detail.{slug}.title      // 标题
announce.detail.{slug}.preview    // 预览（150-200字）
announce.detail.{slug}.content    // 完整内容（HTML格式，500-1000字）
```

## 12条公告列表

### 1. rwa-protocol-v1-launch ✅
- 状态：中文完成
- 待完成：英文、韩文

### 2. v1-1-withdrawal-fee-optimization
- 标题：V1.1版本更新：优化提现手续费计算逻辑
- 内容要点：
  - 修复手续费计算bug
  - 优化Gas消耗
  - 提升用户体验
  - 技术细节说明

### 3. first-monthly-draw-48200
- 标题：第一期月度大奖即将开奖：奖池已达$48,200
- 内容要点：
  - 奖池金额和来源
  - 开奖时间和规则
  - 如何参与
  - 奖金分配方案
  - 公平性保证

### 4. slowmist-security-partnership
- 标题：RWA Protocol 正式与 SlowMist 慢雾达成安全合作
- 内容要点：
  - 合作背景
  - SlowMist简介
  - 审计范围
  - 审计结果
  - 未来合作计划

### 5. v5-diamond-node-reward-increase
- 标题：节点等级体系升级：V5钻石节点奖励提升至50%
- 内容要点：
  - 升级原因
  - 新旧对比
  - 影响分析
  - 生效时间
  - 社区投票结果

### 6. phishing-security-alert
- 标题：重要安全提示：谨防假冒RWA Protocol钓鱼网站
- 内容要点：
  - 钓鱼网站特征
  - 官方网址确认
  - 安全建议
  - 如何举报
  - 受害者处理方式

### 7. anniversary-airdrop-event
- 标题：周年庆活动预告：持仓用户专属空投计划
- 内容要点：
  - 活动时间
  - 参与条件
  - 空投数量
  - 快照时间
  - 领取方式

### 8. maintenance-feb-7-withdrawal-pause
- 标题：计划维护通知：2月7日凌晨0-2点暂停提现服务
- 内容要点：
  - 维护时间
  - 影响范围
  - 维护内容
  - 注意事项
  - 紧急联系方式

### 9. pancakeswap-listing-announcement
- 标题：PancakeSwap 上线公告
- 内容要点：
  - 上线时间
  - 交易对信息
  - 初始流动性
  - 交易教程
  - 风险提示

### 10. certik-audit-completion
- 标题：CertiK 审计完成
- 内容要点：
  - 审计范围
  - 审计结果
  - 发现的问题
  - 修复情况
  - 审计报告链接

### 11. referral-system-upgrade
- 标题：推荐系统升级
- 内容要点：
  - 升级内容
  - 新功能介绍
  - 奖励优化
  - 使用教程
  - FAQ

### 12. community-ama-recap
- 标题：社区 AMA 回顾
- 内容要点：
  - AMA时间和参与人数
  - 热门问题汇总
  - 团队回答
  - 未来规划
  - 下次AMA预告

## 内容编写指南

### 标题 (title)
- 简洁明了，30字以内
- 包含关键信息
- 吸引眼球

### 预览 (preview)
- 150-200字
- 概括核心内容
- 引导用户点击

### 完整内容 (content)
- 500-1000字
- HTML格式
- 包含以下元素：
  - 标题 (h2, h3)
  - 段落 (p)
  - 列表 (ul, ol)
  - 表格 (table)
  - 链接 (a)
  - 信息框 (div.info-box)
  - 警告框 (div.warning-box)
  - 成功框 (div.success-box)

### HTML 示例

```html
<h2>主标题</h2>
<p>段落文本...</p>

<h3>副标题</h3>
<ul>
  <li><strong>重点</strong>：说明文字</li>
  <li>普通列表项</li>
</ul>

<div class="info-box">
  <p><strong>💡 提示</strong>：重要信息</p>
</div>

<div class="warning-box">
  <p><strong>⚠️ 警告</strong>：注意事项</p>
</div>

<div class="success-box">
  <p><strong>✅ 成功</strong>：好消息</p>
</div>

<table>
  <tr>
    <th>列标题1</th>
    <th>列标题2</th>
  </tr>
  <tr>
    <td>数据1</td>
    <td>数据2</td>
  </tr>
</table>

<p>包含<a href="https://example.com" target="_blank">链接</a>的段落。</p>
```

## 翻译优先级

### 第一优先级（必须）
- 中文、英文、韩文的完整内容

### 第二优先级（重要）
- 西班牙语、日语、俄语的完整内容

### 第三优先级（可选）
- 法语、葡萄牙语、印地语、阿拉伯语的完整内容

## 自动化建议

可以考虑：
1. 使用 AI 翻译工具批量翻译
2. 创建翻译模板
3. 使用脚本批量插入翻译
4. 建立翻译审核流程

## 测试清单

完成翻译后需要测试：
- [ ] 所有公告标题正确显示
- [ ] 预览文本正确显示
- [ ] 详情页内容完整
- [ ] HTML 格式正确渲染
- [ ] 链接可以点击
- [ ] 表格样式正确
- [ ] 信息框样式正确
- [ ] 多语言切换正常
- [ ] 移动端显示正常

## 注意事项

1. 保持专业性和准确性
2. 使用行业标准术语
3. 注意不同语言的文化差异
4. 确保HTML标签正确闭合
5. 特殊字符需要转义
6. 链接使用绝对路径
7. 图片路径需要配置
8. 保持格式一致性
