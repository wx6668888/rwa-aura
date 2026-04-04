require('dotenv').config();
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
app.get('/test', (req, res) => res.json({ ok: true }));
server.listen(3002, () => {
  console.log('Test server on 3002');
});
