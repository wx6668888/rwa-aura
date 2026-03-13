import { Router } from 'express';
import { ethers } from 'ethers';

const router = Router();

const RPC_URL = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
const provider = new ethers.JsonRpcProvider(RPC_URL);
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS || '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6';
const USDT_TOKEN = process.env.USDT_TOKEN_ADDRESS || '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';
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
