/**
 * 日结防重与地址规范化自检（无链、无库）
 * 运行: cd backend && npm run test:settlement-invariants
 */
import assert from 'assert';
import { normalizeSettlementUserAddress } from '../src/utils/settlementAddress';
import { isMysqlDuplicateKey } from '../src/utils/mysqlErrors';
import { DailySettlementService } from '../src/services/DailySettlementService';

assert.strictEqual(
  normalizeSettlementUserAddress('0x8927e74e0fCaED1D4C87116C805464800651f222'),
  '0x8927e74e0fcaed1d4c87116c805464800651f222'
);
assert.strictEqual(normalizeSettlementUserAddress('  0xABCDEFabcdef1234567890123456789012345678  ').length, 42);

assert.strictEqual(isMysqlDuplicateKey({ errno: 1062 }), true);
assert.strictEqual(isMysqlDuplicateKey({ code: 'ER_DUP_ENTRY' }), true);
assert.strictEqual(isMysqlDuplicateKey(new Error('other')), false);

// 北京日界 toTime = 该日 UTC 00:00（即上海当日 08:00）
assert.strictEqual(
  DailySettlementService.shanghaiDateToToTime(2026, 3, 28),
  Math.floor(Date.UTC(2026, 2, 28, 0, 0, 0) / 1000)
);
assert.strictEqual(
  DailySettlementService.shanghaiDateToToTime(2024, 1, 1),
  Math.floor(Date.UTC(2024, 0, 1, 0, 0, 0) / 1000)
);

console.log('✅ test-daily-settlement-invariants: all passed');
