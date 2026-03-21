import { query } from './src/config/database.config';

(async () => {
  const users = await query(
    'SELECT address, node_level FROM users WHERE LOWER(address) != LOWER(?) LIMIT 5',
    ['0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638']
  ) as any[];
  
  console.log('Available referrer addresses:');
  users.forEach((u: any) => {
    console.log(`Address: ${u.address}, Level: L${u.node_level || 1}`);
  });
  
  process.exit(0);
})();
