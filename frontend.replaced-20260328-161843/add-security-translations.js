// 临时脚本：为其他语言添加 security 翻译骨架
// 运行后删除此文件

const fs = require('fs');
const path = require('path');

const securityKeysTemplate = `  security: {
    overline: '',
    title: '',
    subtitle: '',
    auditReports: '',
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
  },`;

console.log('Security translation skeleton:');
console.log(securityKeysTemplate);
console.log('\n请手动将此内容添加到每个语言的 emergency 部分之前');
