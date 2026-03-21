import { query } from '../config/database.config';

function usage(): never {
  throw new Error('Usage: ts-node check-user-stats-one.ts <0xAddress>');
}

async function main() {
  const addressArg = process.argv[2];
  if (!addressArg) usage();
  const userAddress = addressArg.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(userAddress)) throw new Error(`Invalid address: ${addressArg}`);

  const rows = await query<any[]>(
    `SELECT 
       user_address,
       usdt_rwa_pending,
       rwa_rwa_pending,
       rwa_pending_updated_at,
       referral_balance,
       dividend_balance,
       strwa_balance
     FROM user_stats
     WHERE LOWER(user_address) = LOWER(?)`,
    [userAddress]
  );

  console.log(`user_stats rows for ${userAddress}: ${rows.length}`);
  console.log(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

