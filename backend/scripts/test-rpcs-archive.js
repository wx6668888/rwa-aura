
const axios = require('axios');

const rpcs = [
  'https://bsc-dataseed.binance.org/',
  'https://binance.llamarpc.com',
  'https://bsc.meowrpc.com',
  'https://bsc-rpc.publicnode.com',
  'https://1rpc.io/bnb',
  'https://binance.llamarpc.com'
];

const blockHex = '0x552e458'; // 89318488
const data = '0x4992faa200000000000000000000000077ee3f51f9e0c5c99db8ef9451eee1a382f7a340';
const to = '0xed24c652266674bef1514a671263b78628ec766e';

async function test() {
  for (const rpc of rpcs) {
    try {
      const res = await axios.post(rpc, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, blockHex]
      }, { timeout: 5000 });
      
      if (res.data.error) {
        console.log(`RPC: ${rpc} | Error: ${res.data.error.message}`);
      } else {
        console.log(`RPC: ${rpc} | Success: ${res.data.result}`);
      }
    } catch (e) {
      console.log(`RPC: ${rpc} | Failed: ${e.message}`);
    }
  }
}

test();
