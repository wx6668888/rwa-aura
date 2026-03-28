const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

// 表用途说明
const TABLE_PURPOSES = {
  'approval_events': '授权事件记录表 - 记录用户授权代币给合约的事件',
  'balance_snapshots': '余额快照表 - 记录用户不同类型资产的余额变化快照',
  'daily_settlements': '每日结算表 - 记录每日的质押和奖励结算数据',
  'direct_referral_rewards': '直推奖励表 - 记录推荐人的直接推荐奖励（需质押30天以上）',
  'emergency_withdrawals': '紧急提现表 - 记录紧急提现事件',
  'event_processing_state': '事件处理状态表 - 记录EventMonitor处理到的最新区块',
  'homepage_stats': '首页统计表 - 存储首页显示的TVL、用户数等统计数据',
  'lock_maturity_events': '锁仓到期事件表 - 记录锁仓到期的事件',
  'locked_stakes': '锁仓质押表 - 记录所有锁仓质押订单（30/90/180/365天）',
  'node_level_history': '节点等级历史表 - 记录用户节点等级的变化历史',
  'referral_bindings': '推荐关系绑定表 - 记录用户与推荐人的永久绑定关系',
  'referral_settlement_batches': '推荐奖励结算批次表 - 记录每周推荐奖励结算的批次信息',
  'rwa_locked_principals': 'RWA锁仓本金表 - 记录RWA代币的锁仓本金（已废弃，使用locked_stakes）',
  'rwa_stakes': 'RWA质押表 - 记录用户RWA质押的总体信息',
  'stake_events': '质押事件表 - 记录所有质押事件（USDT和RWA）',
  'team_stats': '团队统计表 - 记录用户的团队业绩数据（团队质押、团队提现等）',
  'user_rewards': '用户奖励表 - 记录用户的动态奖励数据',
  'user_stats': '用户统计表 - 记录用户的综合统计数据（质押、提现、锁仓等）',
  'users': '用户表 - 记录用户的基本信息和质押状态',
  'withdrawal_events': '提现事件表 - 记录所有提现事件'
};

// 字段用途说明（通用字段）
const FIELD_PURPOSES = {
  'id': '主键ID，自增',
  'user_address': '用户钱包地址',
  'referrer_address': '推荐人钱包地址',
  'tx_hash': '交易哈希',
  'transaction_hash': '交易哈希',
  'block_number': '区块号',
  'timestamp': 'Unix时间戳（秒）',
  'created_at': '记录创建时间',
  'updated_at': '记录更新时间',
  'amount': '金额（18位小数，字符串存储）',
  'stake_id': '质押订单ID',
  'lock_period': '锁仓期限（天）：0=灵活，30/90/180/365=锁仓',
  'is_withdrawn': '是否已提现：0=未提现，1=已提现',
  'event_type': '事件类型',
  'referrer': '推荐人地址',
  'node_level': '节点等级（L1-L9）'
};

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  
  const [tables] = await conn.query('SHOW TABLES');
  
  let output = '# RWA Protocol 数据库结构文档\n\n';
  output += '生成时间: ' + new Date().toLocaleString('zh-CN') + '\n\n';
  output += '---\n\n';
  
  for (const table of tables) {
    const tableName = Object.values(table)[0];
    const purpose = TABLE_PURPOSES[tableName] || '（待补充用途说明）';
    
    output += `## ${tableName}\n\n`;
    output += `**用途**: ${purpose}\n\n`;
    
    const [columns] = await conn.query(`SHOW FULL COLUMNS FROM ??`, [tableName]);
    
    output += '| 字段名 | 类型 | 允许NULL | 默认值 | 用途说明 |\n';
    output += '|--------|------|----------|--------|----------|\n';
    
    columns.forEach(col => {
      const name = col.Field;
      const type = col.Type;
      const nullable = col.Null === 'YES' ? '是' : '否';
      const defaultVal = col.Default === null ? 'NULL' : (col.Default === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : col.Default);
      const purpose = FIELD_PURPOSES[name] || col.Comment || '';
      
      output += `| ${name} | ${type} | ${nullable} | ${defaultVal} | ${purpose} |\n`;
    });
    
    output += '\n---\n\n';
  }
  
  fs.writeFileSync('数据库结构文档.md', output, 'utf8');
  console.log('✅ 数据库结构文档已生成: 数据库结构文档.md');
  
  await conn.end();
})();
