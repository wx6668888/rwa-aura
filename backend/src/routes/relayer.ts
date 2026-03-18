import { Router } from 'express';
import { ethers } from 'ethers';

const router = Router();

// 主网优先：若配置了 BSC_RPC_URL 或主网合约地址则用主网，否则用测试网（与之前测试网行为一致）
const useMainnet = !!(process.env.BSC_RPC_URL || process.env.STAKING_CONTRACT || process.env.STAKING_CONTRACT_ADDRESS);
const RPC_URL = useMainnet
  ? (process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/')
  : (process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com');
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || process.env.STAKING_CONTRACT_ADDRESS ||
  (useMainnet ? '0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175' : '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE');
const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN ||
  (useMainnet ? '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812' : '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6');
const USDT_TOKEN = process.env.USDT_TOKEN_ADDRESS || process.env.USDT_ADDRESS ||
  (useMainnet ? '0x55d398326f99059fF775485246999027B3197955' : '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2');

const provider = new ethers.JsonRpcProvider(RPC_URL);
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY || '';
const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

const stakingAbi = [
    'function nonces(address) view returns (uint256)',
    'function metaStakeWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external',
    'function metaStakeRWAWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external'
];
const tokenAbi = ['function nonces(address) view returns (uint256)'];

router.get('/nonce/:address', async (req, res) => {
    try {
        const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
        const nonce = await staking.nonces(req.params.address);
        res.json({ nonce: nonce.toString() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/rwa-nonce/:address', async (req, res) => {
    try {
        const rwa = new ethers.Contract(RWA_TOKEN, tokenAbi, provider);
        const nonce = await rwa.nonces(req.params.address);
        res.json({ nonce: nonce.toString() });
    } catch (error: any) {
        // RWA代币可能不支持permit，返回默认值0
        res.json({ nonce: "0" });
    }
});

router.get('/usdt-nonce/:address', async (req, res) => {
    try {
        const usdt = new ethers.Contract(USDT_TOKEN, tokenAbi, provider);
        const nonce = await usdt.nonces(req.params.address);
        res.json({ nonce: nonce.toString() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/meta-stake-permit', async (req, res) => {
    try {
        const { user, amount, referrer, lockPeriod, deadline, v, r, s, signature } = req.body;
        const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
        const tx = await staking.metaStakeWithPermit(user, amount, referrer, lockPeriod, deadline, v, r, s, signature);
        const receipt = await tx.wait();
        res.json({ success: true, txHash: receipt.hash });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/meta-stake-rwa-permit', async (req, res) => {
    try {
        const { user, amount, referrer, lockPeriod, deadline, v, r, s, signature } = req.body;
        const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
        const tx = await staking.metaStakeRWAWithPermit(user, amount, referrer, lockPeriod, deadline, v, r, s, signature);
        const receipt = await tx.wait();
        res.json({ success: true, txHash: receipt.hash });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
