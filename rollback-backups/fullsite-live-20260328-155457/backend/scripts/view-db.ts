import Database from 'better-sqlite3';

const dbPath = 'E:\\MyRWA_Project\\rwa aura\\backend\\database\\events.db';
const db = new Database(dbPath, { readonly: true });

console.log('\n=== 质押事件记录 ===\n');
const events = db.prepare('SELECT * FROM stake_events ORDER BY block_number DESC LIMIT 10').all();

if (events.length === 0) {
  console.log('暂无数据');
} else {
  events.forEach((e: any) => {
    console.log(`类型: ${e.event_type}`);
    console.log(`用户: ${e.user_address}`);
    console.log(`数量: ${e.amount}`);
    console.log(`推荐人: ${e.referrer}`);
    console.log(`质押ID: ${e.stake_id}`);
    console.log(`区块: ${e.block_number}`);
    console.log(`时间: ${new Date(e.timestamp * 1000).toLocaleString()}`);
    console.log('---');
  });
}

console.log(`\n总记录数: ${(db.prepare('SELECT COUNT(*) as count FROM stake_events').get() as any).count}`);

const syncStatus = db.prepare('SELECT * FROM sync_status WHERE id = 1').get() as any;
console.log(`最后同步区块: ${syncStatus.last_synced_block}\n`);

db.close();
