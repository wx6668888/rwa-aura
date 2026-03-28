const mysql = require('mysql2/promise');
require('dotenv').config();

// 将 YYYYMMDDHHMMSS 转换为 Unix 时间戳
function convertToUnixTimestamp(yyyymmddhhmmss) {
  const str = String(yyyymmddhhmmss);
  if (str.length !== 14) {
    console.error('Invalid format:', yyyymmddhhmmss);
    return null;
  }
  
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6)) - 1;
  const day = parseInt(str.substring(6, 8));
  const hour = parseInt(str.substring(8, 10));
  const minute = parseInt(str.substring(10, 12));
  const second = parseInt(str.substring(12, 14));
  
  const date = new Date(year, month, day, hour, minute, second);
  return Math.floor(date.getTime() / 1000);
}

async function fixTimestamps() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 检查 stake_events 表...');
    
    // 只获取错误格式的记录（timestamp > 10000000000）
    const [allStakes] = await conn.query('SELECT id, timestamp FROM stake_events WHERE timestamp > 10000000000');
    
    if (allStakes.length === 0) {
      console.log('✅ stake_events 表无需转换');
    } else {
      console.log(`⚠️  找到 ${allStakes.length} 条错误格式记录`);
      
      let success = 0;
      let failed = 0;
      
      for (const stake of allStakes) {
        const unixTimestamp = convertToUnixTimestamp(stake.timestamp);
        if (unixTimestamp) {
          await conn.query('UPDATE stake_events SET timestamp = ? WHERE id = ?', [unixTimestamp, stake.id]);
          success++;
          if (success % 10 === 0) {
            console.log(`  已转换 ${success}/${allStakes.length}`);
          }
        } else {
          console.error(`  ❌ 转换失败: id=${stake.id}, timestamp=${stake.timestamp}`);
          failed++;
        }
      }
      
      console.log(`✅ stake_events 转换完成: 成功=${success}, 失败=${failed}`);
    }
    
    console.log('\n🔍 检查 balance_snapshots 表...');
    
    const [allSnapshots] = await conn.query('SELECT id, timestamp FROM balance_snapshots WHERE timestamp > 10000000000');
    
    if (allSnapshots.length === 0) {
      console.log('✅ balance_snapshots 表无需转换');
    } else {
      console.log(`⚠️  找到 ${allSnapshots.length} 条错误格式记录`);
      
      let success = 0;
      let failed = 0;
      
      for (const snapshot of allSnapshots) {
        const unixTimestamp = convertToUnixTimestamp(snapshot.timestamp);
        if (unixTimestamp) {
          await conn.query('UPDATE balance_snapshots SET timestamp = ? WHERE id = ?', [unixTimestamp, snapshot.id]);
          success++;
          if (success % 50 === 0) {
            console.log(`  已转换 ${success}/${allSnapshots.length}`);
          }
        } else {
          console.error(`  ❌ 转换失败: id=${snapshot.id}, timestamp=${snapshot.timestamp}`);
          failed++;
        }
      }
      
      console.log(`✅ balance_snapshots 转换完成: 成功=${success}, 失败=${failed}`);
    }
    
    console.log('\n✅ 所有转换完成！');
    
  } catch (error) {
    console.error('❌ 转换失败:', error);
  } finally {
    await conn.end();
  }
}

fixTimestamps();
