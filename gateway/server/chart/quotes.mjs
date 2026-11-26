import { fetchYahoo } from './chart.mjs';
export default async function handler(req, res) {
  const list = String(req.query.symbols || '').split(',').filter(s => /^[A-Za-z0-9=\^\.\-]{1,20}$/.test(s)).slice(0, 40);
  if (!list.length) return res.status(400).json({ error: 'no symbols' });
  const out = await Promise.all(list.map(async s => {
    try { const d = await fetchYahoo(s, '1d', '1d'); if (!d) return { symbol: s, error: 'no data' }; delete d.bars; return d; }
    catch (e) { return { symbol: s, error: 'upstream' }; }
  }));
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
  res.status(200).json({ quotes: out });
}
