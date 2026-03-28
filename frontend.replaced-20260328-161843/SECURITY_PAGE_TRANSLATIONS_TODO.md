# Security Page Translations TODO

## 已完成
- ✅ 中文 (zh) - 完整翻译
- ✅ 英文 (en) - 完整翻译  
- ✅ 西班牙语 (es) - 完整翻译

## 待添加（在每个语言的 emergency 部分之前添加）

对于以下语言，需要在 `frontend/lib/i18n.ts` 中的 `emergency:` 之前添加 `security:` 部分：

### 需要添加的语言
1. 阿拉伯语 (ar) - 第 ~1570 行
2. 印地语 (hi) - 第 ~2004 行
3. 法语 (fr) - 第 ~2438 行
4. 葡萄牙语 (pt) - 第 ~2872 行
5. 俄语 (ru) - 第 ~3306 行
6. 日语 (ja) - 第 ~3740 行
7. 韩语 (ko) - 第 ~4174 行

### 翻译骨架模板

```typescript
  security: {
    overline: '',  // TODO: translate "安全与审计"
    title: '',  // TODO: translate "安全是我们的第一优先级"
    subtitle: '',  // TODO: translate subtitle
    auditReports: '',  // TODO: translate "审计报告"
    smartContractAudit: '',
    completed: '',
    inProgress: '',
    critical: '',
    high: '',
    medium: '',
    fixStatus: '',
    fixed: '',
    auditDate: '',
    viewReport: '',
    contractAddresses: '',
    openSource: '',
    viewSource: '',
    securityMeasures: '',
    measuresTitle: '',
    measure1Title: '',
    measure1Body: '',
    measure2Title: '',
    measure2Body: '',
    measure3Title: '',
    measure3Body: '',
    measure4Title: '',
    measure4Body: '',
    measure5Title: '',
    measure5Body: '',
    measure6Title: '',
    measure6Body: '',
    bugBounty: '',
    bugBountyTitle: '',
    bugBountyDescription: '',
    submitReport: '',
    orEmail: '',
    rewardLevels: '',
    severityCritical: '',
    severityHigh: '',
    severityMedium: '',
    severityLow: '',
    upTo: '',
    securityHistory: '',
    noIncidents: '',
    noIncidentsDescription: '',
    launchDate: '',
    incidentDisclosure: '',
    trustedBy: '',
  },
```

## 当前状态

安全页面已创建并可以正常工作，使用中文、英文和西班牙语。

其他语言会回退到英文翻译，直到添加相应的翻译。

## 如何测试

1. 启动前端：`cd frontend && npm run dev`
2. 访问：http://localhost:3000/security
3. 切换语言测试

## 文件位置

- 页面：`frontend/app/security/page.tsx`
- 组件：`frontend/components/security/*.tsx`
- 翻译：`frontend/lib/i18n.ts`
