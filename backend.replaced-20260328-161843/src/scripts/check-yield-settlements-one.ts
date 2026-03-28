import { query } from '../config/database.config';

function usage(): never {
  throw new Error('Usage: ts-node check-yield-settlements-one.ts <0xAddress> <settlementTime>');
}

async function main() {
  const addressArg = process.argv[2];
  const settlementTimeArg = process.argv[3];
  if (!addressArg || !settlementTimeArg) usage();

  const userAddress = addressArg.toLowerCase();
  const settlement_time = Number(settlementTimeArg);
  if (!/^0x[a-f0-9]{40}$/.test(userAddress)) throw new Error(`Invalid address: ${addressArg}`);
  if (!Number.isFinite(settlement_time)) throw new Error(`Invalid settlementTime: ${settlementTimeArg}`);

  const rows = await query<any[]>(
    `SELECT user_address, asset_type, settlement_time, from_time, to_time, total_yield, tx_hash
     FROM yield_settlements
     WHERE LOWER(user_address) = LOWER(?)
       AND settlement_time = ?`,
    [userAddress, settlement_time]
  );

  console.log(`yield_settlements rows for ${userAddress} @ settlement_time=${settlement_time}: ${rows.length}`);
  console.log(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

