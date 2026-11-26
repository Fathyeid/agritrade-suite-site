export default async function handler(req, res) {
  const q = String(req.query.q || '').slice(0, 40);
  if (!q) return res.status(200).json({ results: [] });
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(200).json({ results: (j.quotes || []).filter(x => x.symbol).map(x => ({ s: x.symbol, n: x.longname || x.shortname || x.symbol, t: x.quoteType, x: x.exchDisp })) });
  } catch (e) { res.status(502).json({ error: 'upstream' }); }
}
