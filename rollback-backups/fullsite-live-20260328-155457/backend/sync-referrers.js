const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  console.log("同步推荐关系到users表...\n");
  
  const [bindings] = await connection.execute(
    'SELECT user_address, referrer_address FROM referral_bindings'
  );
  
  let count = 0;
  
  for (const { user_address, referrer_address } of bindings) {
    await connection.execute(
      'UPDATE users SET referrer = ? WHERE LOWER(address) = LOWER(?)',
      [referrer_address, user_address]
    );
    count++;
    console.log(`✅ ${user_address.substring(0,10)}... -> ${referrer_address.substring(0,10)}...`);
  }
  
  await connection.end();
  console.log(`\n完成！更新 ${count} 条记录`);
}

main().catch(console.error);
