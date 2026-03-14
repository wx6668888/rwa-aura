const stakes = [
  {type: 'RWA', amount: 135, lock: 0, ts: 1773397200},
  {type: 'USDT', amount: 100, lock: 90, ts: 1773397500},
  {type: 'USDT', amount: 100, lock: 0, ts: 1773397800},
  {type: 'RWA', amount: 135, lock: 30, ts: 1773398724},
  {type: 'USDT', amount: 200, lock: 0, ts: 1773399250},
  {type: 'USDT', amount: 150, lock: 30, ts: 1773407208},
  {type: 'RWA', amount: 154, lock: 180, ts: 1773407473},
  {type: 'USDT', amount: 100, lock: 0, ts: 1773413704},
  {type: 'USDT', amount: 1000, lock: 0, ts: 1773415248},
  {type: 'USDT', amount: 500, lock: 0, ts: 1773415666},
  {type: 'USDT', amount: 1000, lock: 0, ts: 1773416121},
  {type: 'USDT', amount: 1000, lock: 0, ts: 1773416136},
  {type: 'RWA', amount: 120, lock: 90, ts: 1773417124},
  {type: 'USDT', amount: 874, lock: 0, ts: 1773472887},
  {type: 'USDT', amount: 323, lock: 0, ts: 1773473698},
  {type: 'USDT', amount: 177, lock: 0, ts: 1773478051}
];

const settlementTime = 1773532800; // 明天早上8点(北京时间 2026-03-15 08:00)
const rates = {0: 0.008, 30: 0.0104, 90: 0.0128, 180: 0.016};

let totalYield = 0;

console.log('质押明细和收益计算:\n');

stakes.forEach((s, i) => {
  const duration = settlementTime - s.ts;
  const hours = (duration / 3600).toFixed(1);
  const rate = rates[s.lock];
  
  let yield;
  if (s.type === 'USDT') {
    const rwaEquiv = s.amount / 0.85;
    yield = rwaEquiv * rate * (duration / 86400);
  } else {
    yield = s.amount * rate * (duration / 86400);
  }
  
  totalYield += yield;
  
  console.log(`${i+1}. ${s.type} ${s.amount} (${s.lock}天锁仓)`);
  console.log(`   持有: ${hours}小时 | 收益率: ${(rate*100).toFixed(2)}% | 收益: ${yield.toFixed(4)} RWA\n`);
});

console.log(`总收益: ${totalYield.toFixed(2)} RWA`);
