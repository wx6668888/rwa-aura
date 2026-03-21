# RWA管理后台使用指南

## 访问地址
http://localhost:3000/dashboard-admin

## 登录信息
密码：admin123

## 功能页面

### 1. 登录页 (/dashboard-admin)
- 输入密码登录

### 2. 概览页 (/dashboard-admin/overview)
- 显示用户总数、质押总数、收益总数、提现总数
- 快速导航到各个功能模块

### 3. 钱包余额 (/dashboard-admin/wallets)
- 显示所有用户的USDT、RWA余额
- 支持按总余额、USDT、RWA排序
- PC端显示表格，手机端显示卡片

### 4. 数据库表 (/dashboard-admin/tables)
- 查看所有数据库表的数据
- 支持切换不同表格
- 显示JSON格式数据

## 特点
- 响应式设计（PC/手机自适应）
- 深色主题
- 实时数据
- 简单认证

## 测试步骤
1. 访问 http://localhost:3000/dashboard-admin
2. 输入密码：admin123
3. 点击Login
4. 查看概览页面
5. 点击Wallets查看钱包余额
6. 测试排序功能
7. 返回点击Tables查看数据库表

## 已完成
✅ 登录页面
✅ 概览仪表板
✅ 钱包余额管理（支持排序）
✅ 数据库表查看器
✅ 响应式设计
✅ 手机端适配
