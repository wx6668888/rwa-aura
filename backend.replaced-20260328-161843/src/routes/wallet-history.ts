import express from 'express';

const router = express.Router();

function isHexAddress(v: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(s: string): string {
  return unescapeHtml(s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decimalToRaw(v: string): { valueRaw: string; decimals: number } {
  const t = v.replace(/,/g, '').trim();
  if (!t || t === '-') return { valueRaw: '0', decimals: 18 };
  const parts = t.split('.');
  const intPart = (parts[0] || '0').replace(/\D/g, '') || '0';
  const frac = (parts[1] || '').replace(/\D/g, '');
  return { valueRaw: `${intPart}${frac}`.replace(/^0+(?=\d)/, '') || '0', decimals: frac.length };
}

router.get('/wallet/token-transfers', async (req, res) => {
  try {
    const address = String(req.query.address || '').trim();
    const tokenAddress = String(req.query.tokenAddress || '').trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '40'), 10) || 40, 1), 100);

    if (!isHexAddress(address) || !isHexAddress(tokenAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid address or tokenAddress' });
    }

    const doFetch = (globalThis as any).fetch as
      | ((input: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>)
      | undefined;
    if (!doFetch) throw new Error('fetch is not available in current Node runtime');

    const targetToken = tokenAddress.toLowerCase();
    const targetAddr = address.toLowerCase();
    const collected: Array<{
      txHash: string;
      from: string;
      to: string;
      valueRaw: string;
      tokenDecimal: number;
      tokenSymbol: string;
      timestampMs: number;
      blockNumber: number;
      logIndex: number;
      isError: boolean;
    }> = [];

    const maxPages = 6;
    for (let p = 1; p <= maxPages && collected.length < limit; p++) {
      const pageUrl = `https://bscscan.com/tokentxns?a=${encodeURIComponent(address)}&p=${p}`;
      const r = await doFetch(pageUrl, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
        },
      });
      if (!r.ok) continue;
      const html = await r.text();
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

      for (const row of rows) {
        const txM = row.match(/\/tx\/(0x[a-fA-F0-9]{64})/);
        if (!txM) continue;
        const tokenM = row.match(/\/token\/(0x[a-fA-F0-9]{40})\?a=/i);
        if (!tokenM || tokenM[1].toLowerCase() !== targetToken) continue;

        const dirM = row.match(/>\s*(IN|OUT)\s*</i);
        const direction = (dirM?.[1] || '').toUpperCase();
        const allAddr = [...row.matchAll(/data-highlight-target='(0x[a-fA-F0-9]{40})'/g)].map((m) => m[1].toLowerCase());
        const peer = allAddr.find((a) => a !== targetAddr && a !== targetToken) || targetAddr;
        const from = direction === 'IN' ? peer : targetAddr;
        const to = direction === 'IN' ? targetAddr : peer;

        const blockM = row.match(/\/block\/(\d+)/);
        const tmM = row.match(/data-bs-title='(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'/);
        const amtM = row.match(/class="td_showAmount"[^>]*>([\s\S]*?)<\/span>/i);
        const symbolM = row.match(/\(([A-Z0-9._-]{2,20})\)\s*<\/span>/);
        const tooltipAmtM = row.match(/data-bs-title="([0-9,]+\.[0-9]+)\s*\|/);

        const amountText = tooltipAmtM?.[1] || (amtM ? stripTags(amtM[1]) : '0');
        const { valueRaw, decimals } = decimalToRaw(amountText);
        const timestampMs = tmM ? Date.parse(`${tmM[1]} UTC`) : 0;

        collected.push({
          txHash: txM[1],
          from,
          to,
          valueRaw,
          tokenDecimal: Number.isFinite(decimals) ? decimals : 18,
          tokenSymbol: symbolM?.[1] || '',
          timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
          blockNumber: Number(blockM?.[1] || 0),
          logIndex: 0,
          isError: false,
        });
        if (collected.length >= limit) break;
      }
    }

    return res.json({ success: true, data: { rows: collected.slice(0, limit), source: 'bscscan-html' } });
  } catch (error) {
    console.error('wallet/token-transfers error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch token transfers' });
  }
});

export default router;
