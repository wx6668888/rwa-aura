const ethers = require('ethers');
(async () => {
  const p = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const r = await p.getTransactionReceipt('0x054cee5eed7f40d05e045eb5a61f8cb2a0ec10d263a00d49b4e41939660cdec9');
  console.log('Logs数量:', r.logs.length);
  for (let i = 0; i < r.logs.length; i++) {
    console.log('Log', i, ':', r.logs[i].address);
  }
})();
