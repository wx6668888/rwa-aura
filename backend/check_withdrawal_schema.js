const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  const [r] = await c.query("DESCRIBE withdrawal_events");
  console.log(JSON.stringify(r, null, 2));
  await c.end();
})();
