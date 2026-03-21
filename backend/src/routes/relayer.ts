import { Router } from 'express';
import { ethers } from 'ethers';
import { TxIngestService } from '../services/TxIngestService';
import { txIngestJobService } from '../services/txIngestJobSingleton';
import logger from '../utils/logger';

const router = Router();

// 固定使用 BSC 主网，彻底禁用测试网回退
const RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || process.env.STAKING_CONTRACT_ADDRESS ||
  '0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175';
const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN ||
  '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812';
const USDT_TOKEN = process.env.USDT_TOKEN_ADDRESS || process.env.USDT_ADDRESS ||
  '0x55d398326f99059fF775485246999027B3197955';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY || '';
const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

const stakingAbi = [
    'function nonces(address) view returns (uint256)',
    'function metaStakeWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external',
    'function metaStakeRWAWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external'
];
const tokenAbi = ['function nonces(address) view returns (uint256)'];
const txIngestService = new TxIngestService();

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

        await txIngestJobService.enqueue(receipt.hash, 'relayer');

        // 无论前端是否触发 ingest，都在后端直接补账，避免钱包插件异常导致不同卡片数据不一致
        let ingest: any = null;
        try {
            ingest = await txIngestService.ingestTx(receipt.hash);
        } catch (ingestErr: any) {
            logger.error('[relayer] ingest failed for meta-stake-permit tx=%s error=%s', receipt.hash, ingestErr?.message || ingestErr);
        }

        res.json({ success: true, txHash: receipt.hash, ingest });
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

        await txIngestJobService.enqueue(receipt.hash, 'relayer');

        // 无论前端是否触发 ingest，都在后端直接补账，避免钱包插件异常导致不同卡片数据不一致
        let ingest: any = null;
        try {
            ingest = await txIngestService.ingestTx(receipt.hash);
        } catch (ingestErr: any) {
            logger.error('[relayer] ingest failed for meta-stake-rwa-permit tx=%s error=%s', receipt.hash, ingestErr?.message || ingestErr);
        }

        res.json({ success: true, txHash: receipt.hash, ingest });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
