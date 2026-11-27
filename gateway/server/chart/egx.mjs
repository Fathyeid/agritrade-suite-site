// EGX (Egyptian Exchange) data via the oanor gateway. The key lives ONLY in the server environment (OANOR_API_KEY); it is never sent to the browser.
// Free plan = 12,200 calls/month, so every response is cached (in memory + CDN): 10 min while the market is open, 3 h otherwise.
const BASE = 'https://api.oanor.com/egx-api/v1/';
const mem = new Map();
// Free plan allows 2 requests/second: space upstream calls at least 700 ms apart (per server instance) and retry a 429 once.
let chain = Promise.resolve(), lastAt = 0;
const gate = () => { const p = chain.then(async () => { const w = lastAt + 700 - Date.now(); if (w > 0) await new Promise(r => setTimeout(r, w)); lastAt = Date.now(); }); chain = p.catch(() => {}); return p; };
async function upstream(url, key) {
  for (let i = 0; i < 2; i++) { await gate(); const r = await fetch(url, { headers: { 'x-oanor-key': key } }); if (r.status !== 429 || i) return r; await new Promise(r2 => setTimeout(r2, 1500)); }
}
function cairoOpen() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const m = (+p.hour) * 60 + (+p.minute);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(p.weekday) && m >= 9 * 60 + 30 && m <= 15 * 60;
}
export default async function handler(req, res) {
  const key = process.env.OANOR_API_KEY;
  if (!key) return res.status(503).json({ error: 'EGX data source is not configured on the server yet (OANOR_API_KEY missing).' });
  const { op = 'index', by = 'gainers', limit = '15', codes = '' } = req.query;
  let path;
  if (op === 'index') path = 'index?name=EGX30';
  else if (op === 'screener') {
    if (!/^(gainers|losers|active|marketcap)$/.test(by)) return res.status(400).json({ error: 'bad ranking' });
    const n = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    path = `screener?by=${by}&limit=${n}`;
  } else if (op === 'quote') {
    const list = String(codes).toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
    if (!list.length || list.length > 20 || list.some(s => !/^[A-Z0-9\-\.]{1,24}$/.test(s))) return res.status(400).json({ error: 'codes: 1-20 EGX tickers, comma separated' });
    path = 'quote?codes=' + encodeURIComponent([...new Set(list)].sort().join(','));
  } else return res.status(400).json({ error: 'bad op' });
  const ttl = (cairoOpen() ? 600 : 10800) * 1000, now = Date.now(), hit = mem.get(path);
  res.setHeader('Cache-Control', `public, s-maxage=${ttl / 1000}, stale-while-revalidate=${ttl / 1000}`);
  if (hit && now - hit.at < ttl) return res.status(200).json({ ...hit.v, cached: true });
  try {
    const r = await upstream(BASE + path, key);
    const j = await r.json().catch(() => null);
    if (r.status === 429) throw new Error('rate limit reached (2 requests/second or monthly quota on the free plan), try again shortly');
    if (!r.ok || !j || !j.data) throw new Error('upstream ' + r.status);
    const v = { op, data: j.data, source: 'oanor EGX API (The Egyptian Exchange via TradingView screener). Free plan, not official, may be delayed.', fetched: new Date().toISOString() };
    mem.set(path, { at: now, v });
    return res.status(200).json(v);
  } catch (e) {
    if (hit) return res.status(200).json({ ...hit.v, cached: true, stale: true, note: 'Served from cache because the source failed: ' + e.message });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'EGX source unavailable: ' + e.message });
  }
}
