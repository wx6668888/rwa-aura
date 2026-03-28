import { Router } from 'express';
import logger from '../utils/logger';
import { TxIngestService } from '../services/TxIngestService';
import { txIngestJobService } from '../services/txIngestJobSingleton';

const router = Router();
const ingestService = new TxIngestService();

router.post('/ingest/tx/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ success: false, error: 'Invalid txHash' });
    }

    const result = await ingestService.ingestTx(txHash);
    return res.json(result);
  } catch (err: any) {
    logger.error('[ingest] failed:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
});

router.post('/ingest/enqueue/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ success: false, error: 'Invalid txHash' });
    }
    await txIngestJobService.enqueue(txHash, 'api');
    return res.json({ success: true, txHash: txHash.toLowerCase(), queued: true });
  } catch (err: any) {
    logger.error('[ingest enqueue] failed:', err);
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

router.get('/ingest/status/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ success: false, error: 'Invalid txHash' });
    }
    const status = await txIngestJobService.getStatus(txHash);
    return res.json({ success: true, txHash: txHash.toLowerCase(), data: status });
  } catch (err: any) {
    logger.error('[ingest status] failed:', err);
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

export default router;

