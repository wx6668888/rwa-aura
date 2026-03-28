#!/usr/bin/env node
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('batch-stake-log.json', 'utf8'));

console.log('='.repeat(80));
console.log('                   🎉 自动质押任务完成报告');
console.log('='.repeat(80));
console.log();

const successful = data.filter(d => d.stakeSuccess);
const failed = data.filter(d => !d.stakeSuccess);

console.log('📊 总体统计');
console.log('-'.repeat(80));
console.log(`总执行次数: ${data.length}`);
console.log(`✅ 成功质押: ${successful.length}`);
console.log(`❌ 失败质押: ${failed.length}`);
console.log();

const totalAmount = successful.reduce((sum, d) => sum + d.amount, 0);
console.log(`💰 总质押金额: ${totalAmount.toLocaleString()} RWA`);
console.log(`📈 平均金额: ${Math.round(totalAmount / successful.length).toLocaleString()} RWA`);
console.log();

console.log('✅ 成功质押列表');
console.log('-'.repeat(80));
successful.forEach((s, i) => {
  const time = new Date(s.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  console.log(`${i + 1}. ${s.address}`);
  console.log(`   金额: ${s.amount} RWA | 时间: ${time}`);
  console.log(`   转账TX: ${s.transferTxHash}`);
  console.log(`   质押TX: ${s.stakeTxHash}`);
  console.log();
});

if (failed.length > 0) {
  console.log('❌ 失败列表');
  console.log('-'.repeat(80));
  failed.forEach((f, i) => {
    console.log(`${i + 1}. ${f.address}`);
    console.log(`   金额: ${f.amount} RWA`);
    console.log(`   转账TX: ${f.transferTxHash}`);
    console.log(`   失败原因: ${f.stakeError}`);
    console.log();
  });
}

console.log('='.repeat(80));
console.log('                        📋 完整记录已保存');
console.log('                  batch-stake-log.json');
console.log('='.repeat(80));

// 导出CSV格式
const csv = [
  'No,地址,私钥,金额(RWA),转账交易,质押交易,状态,执行时间'
];

successful.forEach((s, i) => {
  const time = new Date(s.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  csv.push(`${i + 1},${s.address},${s.privateKey},${s.amount},${s.transferTxHash},${s.stakeTxHash},成功,${time}`);
});

fs.writeFileSync('batch-stake-report.csv', csv.join('\n'), 'utf8');
console.log('\n📁 CSV报告已导出: batch-stake-report.csv\n');
