import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';
import { TxIngestService } from './TxIngestService';

type JobStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TxIngestJobService {
  private running = false;
  private workerTimer: NodeJS.Timeout | null = null;
  private scanTimer: NodeJS.Timeout | null = null;

  private readonly workerIntervalMs: number;
  private readonly scanIntervalMs: number;
  private readonly batchSize: number;
  private readonly confirmations: number;

  private providers: ethers.JsonRpcProvider[] = [];
  private providerIndex = 0;
  private txIngestService: TxIngestService;
  private readonly stakingContractAddress: string;

  constructor() {
    this.workerIntervalMs = parseInt(process.env.INGEST_WORKER_INTERVAL_MS || '3000', 10);
    this.scanIntervalMs = parseInt(process.env.INGEST_SCAN_INTERVAL_MS || '15000', 10);
    this.batchSize = parseInt(process.env.INGEST_SCAN_BATCH_BLOCKS || '200', 10);
    this.confirmations = parseInt(process.env.INGEST_CONFIRMATIONS || '6', 10);
    this.stakingContractAddress = (process.env.STAKING_CONTRACT_ADDRESS || '').toLowerCase();

    const urls = this.buildRpcUrls();
    this.providers = urls.map((u) => new ethers.JsonRpcProvider(u));
    this.txIngestService = new TxIngestService();
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.ensureTables();
    this.running = true;

    // 立即跑一次，后续定时
    await this.processPendingJobs().catch((e) => logger.error('[TxIngestJob] initial worker failed:', e));
    await this.scanAndEnqueue().catch((e) => logger.error('[TxIngestJob] initial scan failed:', e));

    this.workerTimer = setInterval(() => {
      this.processPendingJobs().catch((e) => logger.error('[TxIngestJob] worker error:', e));
    }, this.workerIntervalMs);

    this.scanTimer = setInterval(() => {
      this.scanAndEnqueue().catch((e) => logger.error('[TxIngestJob] scan error:', e));
    }, this.scanIntervalMs);

    logger.info(
      `[TxIngestJob] started worker=${this.workerIntervalMs}ms scan=${this.scanIntervalMs}ms ` +
      `batch=${this.batchSize} conf=${this.confirmations}`
    );
  }

  stop(): void {
    this.running = false;
    if (this.workerTimer) clearInterval(this.workerTimer);
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.workerTimer = null;
    this.scanTimer = null;
    logger.info('[TxIngestJob] stopped');
  }

  async enqueue(txHash: string, source = 'unknown'): Promise<void> {
    const hash = txHash.toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(hash)) return;
    await query(
      `INSERT INTO tx_ingest_jobs (tx_hash, source, status, retry_count, next_retry_at)
       VALUES (?, ?, 'PENDING', 0, NOW())
       ON DUPLICATE KEY UPDATE
         source = IF(source = 'unknown' OR source IS NULL, VALUES(source), source),
         status = IF(status IN ('SUCCESS', 'PROCESSING'), status, 'PENDING'),
         next_retry_at = IF(status = 'SUCCESS', next_retry_at, NOW())`,
      [hash, source]
    );
  }

  async getStatus(txHash: string): Promise<any> {
    const hash = txHash.toLowerCase();
    const rows = await query<any[]>(
      `SELECT tx_hash, source, status, retry_count, last_error, created_at, updated_at
       FROM tx_ingest_jobs WHERE tx_hash = ? LIMIT 1`,
      [hash]
    );
    return rows[0] || null;
  }

  private async ensureTables(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS tx_ingest_jobs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tx_hash VARCHAR(66) NOT NULL,
        source VARCHAR(64) NULL,
        status ENUM('PENDING','PROCESSING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
        retry_count INT NOT NULL DEFAULT 0,
        last_error VARCHAR(1024) NULL,
        next_retry_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_tx_hash (tx_hash),
        KEY idx_status_next_retry (status, next_retry_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tx_ingest_scan_state (
        id TINYINT NOT NULL PRIMARY KEY,
        last_scanned_block BIGINT NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await query(
      `INSERT IGNORE INTO tx_ingest_scan_state (id, last_scanned_block) VALUES (1, 0)`
    );
  }

  private async processPendingJobs(): Promise<void> {
    if (!this.running) return;

    const jobs = await query<any[]>(
      `SELECT id, tx_hash, retry_count
       FROM tx_ingest_jobs
       WHERE status IN ('PENDING','FAILED')
         AND next_retry_at <= NOW()
       ORDER BY id ASC
       LIMIT 10`
    );

    for (const job of jobs) {
      const id = Number(job.id);
      const txHash = String(job.tx_hash);
      const retryCount = Number(job.retry_count || 0);

      await query(`UPDATE tx_ingest_jobs SET status='PROCESSING' WHERE id=?`, [id]);

      try {
        const result = await this.txIngestService.ingestTx(txHash);
        if (!result.receiptFound) {
          const nextDelaySec = Math.min(300, Math.max(8, 2 ** Math.min(6, retryCount + 1)));
          await query(
            `UPDATE tx_ingest_jobs
             SET status='FAILED', retry_count=retry_count+1, last_error=?, next_retry_at=DATE_ADD(NOW(), INTERVAL ? SECOND)
             WHERE id=?`,
            ['receipt_not_found_yet', nextDelaySec, id]
          );
          continue;
        }

        await query(
          `UPDATE tx_ingest_jobs
           SET status='SUCCESS', last_error=NULL, next_retry_at=NOW()
           WHERE id=?`,
          [id]
        );
      } catch (e: any) {
        const errMsg = String(e?.message || e || 'unknown_error').slice(0, 1000);
        const nextDelaySec = Math.min(300, Math.max(10, 2 ** Math.min(6, retryCount + 1)));
        await query(
          `UPDATE tx_ingest_jobs
           SET status='FAILED', retry_count=retry_count+1, last_error=?, next_retry_at=DATE_ADD(NOW(), INTERVAL ? SECOND)
           WHERE id=?`,
          [errMsg, nextDelaySec, id]
        );
      }
    }
  }

  private async scanAndEnqueue(): Promise<void> {
    if (!this.running) return;
    if (!this.stakingContractAddress) return;

    const provider = this.getProvider();
    const latest = await provider.getBlockNumber();
    const safeTo = latest - this.confirmations;
    if (safeTo <= 0) return;

    const stateRows = await query<any[]>(
      `SELECT last_scanned_block FROM tx_ingest_scan_state WHERE id=1 LIMIT 1`
    );
    let last = Number(stateRows[0]?.last_scanned_block || 0);
    if (last <= 0) last = Math.max(1, safeTo - 500); // 初始只回看最近 500 块，避免大范围扫链

    if (last >= safeTo) return;

    const fromBlock = last + 1;
    const toBlock = Math.min(safeTo, fromBlock + this.batchSize - 1);

    try {
      const logs = await provider.getLogs({
        address: this.stakingContractAddress,
        fromBlock,
        toBlock,
      });
      const txSet = new Set<string>();
      for (const log of logs) {
        if (log.transactionHash) txSet.add(log.transactionHash.toLowerCase());
      }

      for (const txHash of txSet) {
        await this.enqueue(txHash, 'scan');
      }

      await query(
        `UPDATE tx_ingest_scan_state SET last_scanned_block=? WHERE id=1`,
        [toBlock]
      );

      if (txSet.size > 0) {
        logger.info(`[TxIngestJob] scan ${fromBlock}-${toBlock} enqueued tx=${txSet.size}`);
      }
    } catch (e: any) {
      this.rotateProvider();
      logger.warn(`[TxIngestJob] scan failed ${fromBlock}-${toBlock}: ${e?.message || e}`);
      await sleep(500);
    }
  }

  private buildRpcUrls(): string[] {
    const fromEnv = (process.env.BSC_RPC_URLS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const primary = (process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL || '').trim();
    const urls = Array.from(new Set([primary, ...fromEnv].filter(Boolean)));
    if (urls.length === 0) urls.push('https://bsc.publicnode.com');
    return urls;
  }

  private getProvider(): ethers.JsonRpcProvider {
    return this.providers[this.providerIndex];
  }

  private rotateProvider(): void {
    if (this.providers.length <= 1) return;
    this.providerIndex = (this.providerIndex + 1) % this.providers.length;
  }
}

