// Free US listing directories published by Nasdaq Trader (nasdaqlisted.txt covers Nasdaq, otherlisted.txt covers NYSE, NYSE American, NYSE Arca, Cboe, IEX).
// Returns compact rows [symbol, name, exchange, isETF]. Test issues are dropped. This is the US universe only.
const EX = { N: 'NYSE', A: 'NYSE American', P: 'NYSE Arca', Z: 'Cboe BZX', V: 'IEX' };
export default async function handler(req, res) {
  try {
    const [a, b] = await Promise.all(['nasdaqlisted', 'otherlisted'].map(async f => {
      const r = await fetch(`https://www.nasdaqtrader.com/dynamic/SymDir/${f}.txt`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error(f + ' HTTP ' + r.status);
      return (await r.text()).split(/\r?\n/);
    }));
    const rows = [];
    a.slice(1).forEach(l => { const p = l.split('|'); if (p.length < 7 || p[3] === 'Y') return; rows.push([p[0], p[1], 'Nasdaq', p[6] === 'Y' ? 1 : 0]); });
    b.slice(1).forEach(l => { const p = l.split('|'); if (p.length < 7 || p[6] === 'Y') return; rows.push([p[0], p[1], EX[p[2]] || p[2], p[4] === 'Y' ? 1 : 0]); });
    const out = rows.filter(r => /^[A-Z]{1,5}(\.[A-Z])?$/.test(r[0]) && !/File Creation Time/.test(r[0]));
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({ source: 'Nasdaq Trader symbol directories (nasdaqtrader.com)', fetched: Date.now(), count: out.length, rows: out });
  } catch (e) { res.status(502).json({ error: 'universe fetch failed: ' + e.message }); }
}
