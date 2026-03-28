import dotenv from 'dotenv';
import { RwaPendingSyncService } from '../services/RwaPendingSyncService';

dotenv.config();

function usage(): never {
  throw new Error('Usage: ts-node sync-rwa-pending-one.ts <0xAddress>');
}

async function main() {
  const addressArg = process.argv[2];
  if (!addressArg) usage();

  const userAddress = addressArg.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(userAddress)) throw new Error(`Invalid address: ${addressArg}`);

  const svc = new RwaPendingSyncService();
  await svc.syncUser(userAddress);

  console.log(`✅ Synced rwaPending for ${userAddress} into user_stats (upsert).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

