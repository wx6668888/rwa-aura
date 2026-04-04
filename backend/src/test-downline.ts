import { getPool } from './config/database.config';

async function testBFS(address: string) {
  const pool = getPool();
  const MAX_DOWNLINE_DEPTH = 64;
  const r = address.toLowerCase();
  
  console.log('🚀 开始测试地址:', r);
  
  const seen = new Set<string>();
  const result: string[] = [];
  let frontier: string[] = [r];
  let depth = 0;

  try {
    while (frontier.length > 0 && depth < MAX_DOWNLINE_DEPTH) {
      const placeholders = frontier.map(() => '?').join(',');
      const [rows]: any = await pool.query(
        "SELECT DISTINCT LOWER(user_address) AS ua FROM referral_bindings WHERE LOWER(referrer_address) IN (" + placeholders + ")",
        frontier
      );

      const next: string[] = [];
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const ua = String(row.ua || '').toLowerCase();
          if (!ua || ua === r || seen.has(ua)) continue;
          seen.add(ua);
          result.push(ua);
          next.push(ua);
        }
      }
      frontier = next;
      depth += 1;
      console.log('层级 ' + depth + ': 发现 ' + next.length + ' 人');
    }
    console.log('✅ 测试完成！总下级人数:', result.length);
    process.exit(0);
  } catch (e) {
    console.error('❌ 测试报错:', e);
    process.exit(1);
  }
}

// 这里填入一个你想测试的钱包地址
testBFS('0x你的测试地址'); 
