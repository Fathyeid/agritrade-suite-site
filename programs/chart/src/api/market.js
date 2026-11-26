// Allow-listed public market-data proxy for the screeners. Only the fixed endpoints below can be called (no arbitrary URLs).
// Providers are free public APIs: some are rate-limited, some block certain regions (e.g. Binance/Bybit from the US). Errors are passed through honestly.
const ok = (v, re) => (re.test(String(v ?? '')) ? String(v) : null);
const SRC = {
  coingecko: q => { const p = Math.min(+q.page || 1, 5); return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${p}&sparkline=false&price_change_percentage=1h,24h,7d,30d`; },
  binance: () => 'https://api.binance.com/api/v3/ticker/24hr',
  bybit: () => 'https://api.bybit.com/v5/market/tickers?category=spot',
  okx: () => 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
  kucoin: () => 'https://api.kucoin.com/api/v1/market/allTickers',
  gate: () => 'https://api.gateio.ws/api/v4/spot/tickers',
  kraken: () => 'https://api.kraken.com/0/public/Ticker',
  coinbase: () => 'https://api.coinbase.com/api/v3/brokerage/market/products?limit=500&product_type=SPOT',
  dexsearch: q => { const s = ok(q.q, /^[\w\- .$]{1,40}$/); return s && `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(s)}`; },
  gtrending: q => { const n = ok(q.network, /^[a-z0-9_-]{1,30}$/); return n && `https://api.geckoterminal.com/api/v2/networks/${n}/trending_pools`; },
  gnew: q => { const n = ok(q.network, /^[a-z0-9_-]{1,30}$/); return n && `https://api.geckoterminal.com/api/v2/networks/${n}/new_pools`; },
  gtop: q => { const n = ok(q.network, /^[a-z0-9_-]{1,30}$/); return n && `https://api.geckoterminal.com/api/v2/networks/${n}/pools?page=1`; },
};
export default async function handler(req, res) {
  const f = SRC[String(req.query.src || '')];
  const url = f && f(req.query);
  if (!url) return res.status(400).json({ error: 'unknown source or bad parameter' });
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', accept: 'application/json' } });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch (e) { return res.status(502).json({ error: 'upstream returned non-JSON', status: r.status }); }
    if (!r.ok) return res.status(502).json({ error: 'upstream error', status: r.status, detail: String(j.msg || j.message || j.error || '').slice(0, 160) });
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ src: req.query.src, fetched: Date.now(), data: j });
  } catch (e) { res.status(502).json({ error: 'fetch failed' }); }
}
