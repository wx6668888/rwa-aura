# 前端页面测试指南

**测试时间**: 2026-02-26  
**开发服务器**: http://localhost:3000

---

## 🚀 快速测试步骤

### 1. 清除缓存并重启
```bash
# 已完成：
# - 停止开发服务器
# - 删除 .next 缓存目录
# - 重新启动服务器
```

### 2. 测试所有页面

#### ✅ 首页 (Home)
**URL**: http://localhost:3000/
**预期**: 
- 营销页面
- Hero 区域
- 功能介绍
- 如何运作
- 页脚

#### ✅ Dashboard
**URL**: http://localhost:3000/dashboard
**预期**:
- 钱包栏
- 质押总额卡片
- 收益卡片
- 统计卡片
- 近期活动表

#### ✅ Stake (质押)
**URL**: http://localhost:3000/stake
**预期**:
- 质押金额输入
- 资金分配预览
- 推荐人地址输入
- 授权按钮

#### ✅ Withdraw (提现)
**URL**: http://localhost:3000/withdraw
**预期**:
- RWA 提现表单
- 冷却时间显示
- USDT 奖励领取
- 近期奖励列表

#### ✅ Emergency (紧急提现)
**URL**: http://localhost:3000/emergency
**预期**:
- 警告说明
- 预计到账计算
- 确认步骤
- FAQ

#### ✅ Nodes (节点)
**URL**: http://localhost:3000/nodes
**预期**:
- 节点等级显示
- 升级条件
- 奖励比例表
- 推荐网络

#### ✅ Governance (治理)
**URL**: http://localhost:3000/governance
**预期**:
- 协议参数
- 资金状况
- 多签信息
- 链上活动

#### ⚠️ Market (行情)
**URL**: http://localhost:3000/market
**预期**:
- 价格头部
- 数据源切换
- 4 种图表
- 统计面板
- 成交记录

**已知问题**:
- Hydration 错误 - 已修复
- 图表导入错误 - 正在修复
- 缓存问题 - 已清除

---

## 🔍 如果 Market 页面仍有问题

### 检查浏览器控制台
按 F12 打开开发者工具，查看：
1. Console 标签 - 查看 JavaScript 错误
2. Network 标签 - 查看资源加载
3. 具体错误信息

### 常见错误及解决方案

#### 错误 1: Module not found
```
Cannot find module './charts/line-chart'
```
**解决**: 已清除缓存并重启服务器

#### 错误 2: Hydration error
```
Hydration failed because...
```
**解决**: 已添加客户端挂载检测

#### 错误 3: Chart rendering error
```
Error in chart component
```
**解决**: 检查 lightweight-charts 是否正确安装

---

## 🛠️ 故障排除

### 方案 1: 强制刷新浏览器
```
Windows: Ctrl + F5
Mac: Cmd + Shift + R
```

### 方案 2: 清除浏览器缓存
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方案 3: 重启开发服务器
```bash
# 在终端按 Ctrl + C 停止
cd frontend
npm run dev
```

### 方案 4: 重新安装依赖
```bash
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

---

## 📊 测试清单

### 功能测试
- [ ] 所有页面可以访问
- [ ] 导航栏链接正常
- [ ] 语言切换正常
- [ ] 响应式布局正常
- [ ] 无控制台错误

### Market 页面特定测试
- [ ] 价格头部显示
- [ ] 数据源切换按钮
- [ ] K线图显示
- [ ] 折线图显示
- [ ] 深度图显示
- [ ] 成交量图显示
- [ ] 统计面板显示
- [ ] 成交记录表显示
- [ ] 图表类型切换
- [ ] 时间范围切换

### 性能测试
- [ ] 页面加载 < 3秒
- [ ] 图表渲染流畅
- [ ] 无卡顿
- [ ] 动画流畅

---

## 📝 报告问题

如果遇到问题，请提供：

1. **错误信息**: 浏览器控制台的完整错误
2. **页面 URL**: 出错的具体页面
3. **浏览器**: Chrome/Firefox/Safari 版本
4. **操作系统**: Windows/Mac/Linux
5. **重现步骤**: 如何触发错误

---

## ✅ 预期结果

所有 8 个页面都应该：
- ✅ 正常加载
- ✅ 无控制台错误
- ✅ 响应式布局正确
- ✅ 交互功能正常
- ✅ 动画流畅

---

**当前状态**: 
- 开发服务器: ✅ 运行中
- 缓存: ✅ 已清除
- Hydration 修复: ✅ 已完成
- 等待测试结果...
