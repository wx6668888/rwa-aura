// RWA质押收益计算
const rwaStaked = 409; // RWA
const firstStakeTime = 1773398724; // Unix timestamp
const targetTime = new Date('2026-03-14T00:00:00Z').getTime() / 1000; // UTC 00:00 = 北京08:00

const holdSeconds = targetTime - firstStakeTime;
const holdDays = holdSeconds / 86400;

const baseRate = 0.008; // 0.8%
const yieldRwa = rwaStaked * baseRate * holdSeconds / (365 * 86400);

console.log('=== RWA质押收益 ===');
console.log(`质押量: ${rwaStaked} RWA`);
console.log(`质押时间: ${new Date(firstStakeTime * 1000).toISOString()}`);
console.log(`持有: ${holdDays.toFixed(4)}天 (${holdSeconds}秒)`);
console.log(`收益率: 0.80%`);
console.log(`收益: ${yieldRwa.toFixed(8)} RWA`);

console.log('\n=== 总收益（到今早8点）===');
console.log(`USDT质押收益: 0.05154376 RWA`);
console.log(`RWA质押收益: ${yieldRwa.toFixed(8)} RWA`);
console.log(`总计: ${(0.05154376 + yieldRwa).toFixed(8)} RWA`);
