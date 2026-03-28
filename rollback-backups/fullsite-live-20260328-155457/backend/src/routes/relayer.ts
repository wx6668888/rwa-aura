import { Router, type Response } from 'express';
import { ethers, JsonRpcProvider } from 'ethers';
import { TxIngestService } from '../services/TxIngestService';
import { txIngestJobService } from '../services/txIngestJobSingleton';
import logger from '../utils/logger';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';
import { bscRelayerProvider, getBscRelayerRpcUrlList } from '../config/bsc-relayer-provider';

const router = Router();

const STAKING_CONTRACT =
  process.env.STAKING_CONTRACT ||
  process.env.STAKING_CONTRACT_ADDRESS ||
  BSC_MAINNET_ADDRESSES.stakingContract;
const RWA_TOKEN =
  process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN || BSC_MAINNET_ADDRESSES.rwaToken;
const USDT_TOKEN =
  process.env.USDT_TOKEN_ADDRESS || process.env.USDT_ADDRESS || BSC_MAINNET_ADDRESSES.usdtToken;

/** 中继发交易 / 读 nonce：多 RPC Fallback，避免单点返回「幽灵 hash」 */
const provider = bscRelayerProvider;

function getRelayerWallet(): ethers.Wallet {
    const raw = process.env.RELAYER_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY || '';
    const pk = String(raw || '').trim();
    if (!pk) {
        throw new Error(
            'Missing RELAYER_PRIVATE_KEY. Gasless staking requires a relayer private key; configure it via runtime env (PM2/systemd), do not hardcode it in repo files.'
        );
    }
    const formatted = pk.startsWith('0x') ? pk : `0x${pk}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(formatted)) {
        throw new Error('Invalid RELAYER_PRIVATE_KEY format (expected 32-byte hex).');
    }
    return new ethers.Wallet(formatted, provider);
}

const stakingAbi = [
    'function nonces(address) view returns (uint256)',
    'function metaStakeWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external',
    'function metaStakeRWAWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external'
];
const tokenAbi = ['function nonces(address) view returns (uint256)'];
const txIngestService = new TxIngestService();

/** EIP-2612：部分钱包返回 v=0/1，链上 permit 需要 27/28 */
function normalizePermitV(v: unknown): number {
    let n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
    if (!Number.isFinite(n)) throw new Error('invalid permit v');
    if (n === 0 || n === 1) n += 27;
    return n;
}

const STAKING_R_SELECTOR = '0xc4235a4a';
const BSC_MAINNET_CHAIN_ID = 56n;

const STAKE_EIP712_TYPES: Record<string, Array<{ name: string; type: string }>> = {
    Stake: [
        { name: 'user', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'referrer', type: 'address' },
        { name: 'lockPeriod', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
    ],
};

const STAKE_RWA_EIP712_TYPES: Record<string, Array<{ name: string; type: string }>> = {
    StakeRWA: [
        { name: 'user', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'referrer', type: 'address' },
        { name: 'lockPeriod', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
    ],
};

function parseBodyUint256(label: string, v: unknown): bigint {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return BigInt(Math.trunc(v));
    if (typeof v === 'string' && /^[0-9]+$/.test(v.trim())) return BigInt(v.trim());
    throw new Error(`${label} 必须为无符号整数字符串或数字`);
}

function normalizeReferrerAddress(referrer: unknown): string {
    if (referrer == null) return ethers.ZeroAddress;
    const s = String(referrer).trim();
    if (s === '' || s === '0x' || s === '0x0') return ethers.ZeroAddress;
    if (!ethers.isAddress(s)) throw new Error('referrer 不是有效地址');
    return ethers.getAddress(s);
}

/**
 * 链上 _verifyStake* 使用当前 nonces[user]（递增前）参与 EIP-712。发交易前用同一 nonce 校验，避免 estimateGas 才报 Staking_R()。
 */
async function getVerificationChainIds(): Promise<bigint[]> {
    const ids: bigint[] = [];
    try {
        const network = await provider.getNetwork();
        const id = BigInt(network.chainId.toString());
        ids.push(id);
    } catch {
        // ignore and fallback below
    }
    if (!ids.includes(BSC_MAINNET_CHAIN_ID)) ids.push(BSC_MAINNET_CHAIN_ID);
    return ids;
}

function verifyMetaStakeTypedDataWithChainId(
    primaryType: 'Stake' | 'StakeRWA',
    user: string,
    amount: bigint,
    referrer: string,
    lockPeriod: bigint,
    deadline: bigint,
    chainNonce: bigint,
    chainId: bigint,
    signature: string
): { ok: true } | { ok: false; error: string } {
    if (!ethers.isAddress(user)) return { ok: false, error: 'user 不是有效地址' };
    const domain = {
        name: 'RWAStaking',
        version: '1',
        chainId,
        verifyingContract: STAKING_CONTRACT,
    };
    const types = primaryType === 'Stake' ? STAKE_EIP712_TYPES : STAKE_RWA_EIP712_TYPES;
    const message = {
        user: ethers.getAddress(user),
        amount,
        referrer,
        lockPeriod,
        nonce: chainNonce,
        deadline,
    };
    try {
        const recovered = ethers.verifyTypedData(domain, types, message, signature);
        if (recovered.toLowerCase() !== user.toLowerCase()) {
            return {
                ok: false,
                error: `质押 EIP-712 签名与参数不一致（恢复地址 ${recovered}）。`,
            };
        }
    } catch (e: any) {
        return {
            ok: false,
            error: `质押签名校验失败：${e?.message || e}。请重新发起质押并完成两次签名（Permit + StakeRWA）。`,
        };
    }
    return { ok: true };
}

/**
 * BSC 出块 + 拥堵时 tx.wait() 常超过 60s；若 HTTP 在 wait 期间才响应，Nginx/Cloudflare 会 504 且无 CORS 头，浏览器误报 CORS。
 * 广播成功后立即返回 txHash，由前端 waitForTransactionReceipt；后台再 wait + ingest。
 */
function relayStakeTxAsync(
    tx: ethers.ContractTransactionResponse,
    label: string
): void {
    const h = tx.hash;
    void (async () => {
        try {
            const receipt = await tx.wait();
            if (!receipt) {
                logger.warn('[relayer] %s tx.wait() returned null hash=%s', label, h);
                return;
            }
            await txIngestJobService.enqueue(receipt.hash, 'relayer');
            try {
                await txIngestService.ingestTx(receipt.hash);
            } catch (ingestErr: any) {
                logger.error('[relayer] ingest failed for %s tx=%s error=%s', label, receipt.hash, ingestErr?.message || ingestErr);
            }
        } catch (e: any) {
            logger.error('[relayer] %s wait/ingest failed hash=%s error=%s', label, h, e?.message || e);
        }
    })();
}

type MetaStakeMethod = 'metaStakeWithPermit' | 'metaStakeRWAWithPermit';

async function sendMetaStakeTx(
    stakingConnected: ethers.Contract,
    method: MetaStakeMethod,
    user: string,
    amountBn: bigint,
    ref: string,
    lockBn: bigint,
    deadlineBn: bigint,
    vv: number,
    r: string,
    s: string,
    signature: string
): Promise<ethers.ContractTransactionResponse> {
    const cap = 3_000_000n;
    let gasLimit: bigint;
    try {
        const fn = stakingConnected.getFunction(method);
        const est = await fn.estimateGas(
            user,
            amountBn,
            ref,
            lockBn,
            deadlineBn,
            vv,
            r,
            s,
            signature
        );
        gasLimit = (est * 140n) / 100n + 50_000n;
        if (gasLimit > cap) gasLimit = cap;
    } catch (e: any) {
        logger.warn('[relayer] estimateGas %s failed: %s — using 800000', method, e?.message || e);
        gasLimit = 800_000n;
    }
    const fn = stakingConnected.getFunction(method);
    return (await fn(user, amountBn, ref, lockBn, deadlineBn, vv, r, s, signature, {
        gasLimit,
    })) as ethers.ContractTransactionResponse;
}

/** 广播后短延迟多节点抽样；若仍不可见打日志（不 4xx/5xx，避免用户误以为失败而重复提交） */
function scheduleTxVisibilityWarn(txHash: string, label: string): void {
    void (async () => {
        await new Promise((r) => setTimeout(r, 2500));
        const urls = getBscRelayerRpcUrlList().slice(0, 10);
        for (const url of urls) {
            try {
                const t = await new JsonRpcProvider(url, 56).getTransaction(txHash);
                if (t != null) return;
            } catch {
                /* 单节点失败继续 */
            }
        }
        logger.warn('[relayer] %s tx not visible on sampled RPCs after 2.5s hash=%s', label, txHash);
    })();
}

function explainRelayerRevert(err: any): string {
    const msg = err?.message || String(err);
    const data = err?.data ?? err?.error?.data;
    if (typeof data === 'string' && data.toLowerCase().startsWith(STAKING_R_SELECTOR)) {
        return (
            `${msg} — 合约 Staking_R()：常见原因：签名与链上 nonce 不一致（请刷新页面重试）、未切换到 BSC 主网签名、` +
            `Permit 与代币域名不一致、或锁仓天数非 0/30/90/180/365。`
        );
    }
    return msg;
}

/** 广播失败时区分「中继没 BNB」与合约回滚，避免用户误以为是签名问题 */
function respondRelayerSendError(res: Response, err: any): void {
    const msg = err?.message || String(err);
    if (/INSUFFICIENT_FUNDS|insufficient funds for/i.test(msg)) {
        const safe = msg.replace(/transaction="0x[a-fA-F0-9]*"/gi, 'transaction=<omitted>');
        let relayerAddr = '';
        try {
            relayerAddr = getRelayerWallet().address;
        } catch {
            relayerAddr = '';
        }
        logger.error('[relayer] relayer wallet out of BNB relayer=%s %s', relayerAddr || '<unknown>', safe);
        res.status(503).json({
            success: false,
            code: 'RELAYER_INSUFFICIENT_BNB',
            error:
                'Gas 中继地址 BNB 余额不足，无法代付链上手续费（与您的签名、Permit、合约逻辑无关）。请向中继钱包充值少量 BNB 后重试。',
            relayerAddress: relayerAddr || undefined,
        });
        return;
    }
    res.status(500).json({ success: false, error: explainRelayerRevert(err) });
}

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
        // BSC USDT不支持EIP-2612 permit，直接返回0
        res.json({ nonce: '0' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/meta-stake-permit', async (req, res) => {
    try {
        const { user, amount, referrer, lockPeriod, deadline, v, r, s, signature } = req.body;
        const relayer = getRelayerWallet();
        const ref = normalizeReferrerAddress(referrer);
        const amountBn = parseBodyUint256('amount', amount);
        const lockBn = parseBodyUint256('lockPeriod', lockPeriod);
        const deadlineBn = parseBodyUint256('deadline', deadline);
        const stakingRead = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
        const chainNonce = await stakingRead.nonces(user);
        const chainIds = await getVerificationChainIds();
        let matched = false;
        let lastError = '';
        for (const cid of chainIds) {
            const check = verifyMetaStakeTypedDataWithChainId(
                'Stake',
                user,
                amountBn,
                ref,
                lockBn,
                deadlineBn,
                chainNonce,
                cid,
                signature
            );
            if (check.ok) {
                matched = true;
                break;
            }
            lastError = check.error;
        }
        if (!matched) {
            const cidText = chainIds.map((x) => x.toString()).join('/');
            res.status(400).json({
                success: false,
                error:
                    `${lastError} 请刷新页面后重新获取 nonce 并签名；` +
                    `确认钱包网络与签名链一致（当前校验链ID: ${cidText}），质押合约地址为 ${STAKING_CONTRACT}。`,
            });
            return;
        }
        const vv = normalizePermitV(v);
        const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
        const tx = await sendMetaStakeTx(
            staking,
            'metaStakeWithPermit',
            user,
            amountBn,
            ref,
            lockBn,
            deadlineBn,
            vv,
            r,
            s,
            signature
        );
        scheduleTxVisibilityWarn(tx.hash, 'meta-stake-permit');
        relayStakeTxAsync(tx, 'meta-stake-permit');
        res.json({ success: true, txHash: tx.hash, pending: true });
    } catch (error: any) {
        respondRelayerSendError(res, error);
    }
});

router.post('/meta-stake-rwa-permit', async (req, res) => {
    try {
        const { user, amount, referrer, lockPeriod, deadline, v, r, s, signature } = req.body;
        const relayer = getRelayerWallet();
        const ref = normalizeReferrerAddress(referrer);
        const amountBn = parseBodyUint256('amount', amount);
        const lockBn = parseBodyUint256('lockPeriod', lockPeriod);
        const deadlineBn = parseBodyUint256('deadline', deadline);
        const stakingRead = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
        const chainNonce = await stakingRead.nonces(user);
        const chainIds = await getVerificationChainIds();
        let matched = false;
        let lastError = '';
        for (const cid of chainIds) {
            const check = verifyMetaStakeTypedDataWithChainId(
                'StakeRWA',
                user,
                amountBn,
                ref,
                lockBn,
                deadlineBn,
                chainNonce,
                cid,
                signature
            );
            if (check.ok) {
                matched = true;
                break;
            }
            lastError = check.error;
        }
        if (!matched) {
            const cidText = chainIds.map((x) => x.toString()).join('/');
            res.status(400).json({
                success: false,
                error:
                    `${lastError} 请刷新页面后重新获取 nonce 并签名；` +
                    `确认钱包网络与签名链一致（当前校验链ID: ${cidText}），质押合约地址为 ${STAKING_CONTRACT}。`,
            });
            return;
        }
        const vv = normalizePermitV(v);
        const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
        const tx = await sendMetaStakeTx(
            staking,
            'metaStakeRWAWithPermit',
            user,
            amountBn,
            ref,
            lockBn,
            deadlineBn,
            vv,
            r,
            s,
            signature
        );
        scheduleTxVisibilityWarn(tx.hash, 'meta-stake-rwa-permit');
        relayStakeTxAsync(tx, 'meta-stake-rwa-permit');
        res.json({ success: true, txHash: tx.hash, pending: true });
    } catch (error: any) {
        respondRelayerSendError(res, error);
    }
});

export default router;
