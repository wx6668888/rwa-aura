const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  const [r] = await c.query("SELECT * FROM withdrawal_events WHERE user_address = '0xcd5b97505499b1575e481446384430bb159851b6' ORDER BY timestamp DESC LIMIT 5");
  console.log(JSON.stringify(r, null, 2));
  await c.end();
})();
