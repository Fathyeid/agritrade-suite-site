// USDA data proxy (free, official). The key is the user's own free key (sent as ?key=) or the server env var.
// GET /api/usda?src=nass&commodity=CORN&stat=PROGRESS&year=2026[&key=...]   -> NASS Quick Stats national crop progress / condition rows
// GET /api/usda?src=esr&code=401&my=2026[&key=...]                          -> FAS Export Sales, weekly totals over all countries
// Keys: NASS https://quickstats.nass.usda.gov/api (USDA_NASS_KEY), FAS https://apps.fas.usda.gov/opendatawebV2 (USDA_FAS_KEY). Nothing is stored.
export default async function handler(req, res) {
  const q = req.query || {}, src = String(q.src || '');
  try {
    if (src === 'nass') {
      const key = String(q.key || process.env.USDA_NASS_KEY || ''), com = String(q.commodity || 'CORN').toUpperCase(), stat = String(q.stat || 'PROGRESS').toUpperCase(), y = parseInt(q.year, 10) || new Date().getFullYear();
      if (!key) return res.status(400).json({ error: 'no key' });
      if (!/^[A-Z ,]{3,30}$/.test(com) || !/^(PROGRESS|CONDITION)$/.test(stat)) return res.status(400).json({ error: 'bad query' });
      const u = 'https://quickstats.nass.usda.gov/api/api_GET/?' + new URLSearchParams({ key, source_desc: 'SURVEY', commodity_desc: com, statisticcat_desc: stat, agg_level_desc: 'NATIONAL', year__GE: String(y - 1), format: 'JSON' });
      const r = await fetch(u), j = await r.json();
      if (!r.ok || j.error) return res.status(502).json({ error: String(j.error || r.status) });
      const rows = (j.data || []).map(d => ({ year: +d.year, week: d.week_ending, unit: d.unit_desc, value: +String(d.Value).replace(/,/g, ''), period: d.reference_period_desc, item: d.short_desc }));
      res.setHeader('Cache-Control', 's-maxage=3600');
      return res.status(200).json({ source: 'USDA NASS Quick Stats', rows });
    }
    if (src === 'esr') {
      const key = String(q.key || process.env.USDA_FAS_KEY || ''), code = String(q.code || '401'), my = parseInt(q.my, 10) || new Date().getFullYear();
      if (!key) return res.status(400).json({ error: 'no key' });
      if (!/^\d{3,4}$/.test(code)) return res.status(400).json({ error: 'bad query' });
      const r = await fetch(`https://apps.fas.usda.gov/OpenData/api/esr/exports/commodityCode/${code}/allCountries/marketYear/${my}`, { headers: { API_KEY: key, Accept: 'application/json' } });
      if (!r.ok) return res.status(502).json({ error: 'FAS ' + r.status });
      const j = await r.json(), W = {};
      (Array.isArray(j) ? j : []).forEach(d => { const w = String(d.weekEndingDate || '').slice(0, 10); if (!w) return; const o = W[w] = W[w] || { week: w, net: 0, exp: 0, acc: 0, out: 0 }; o.net += +d.currentMYNetSales || 0; o.exp += +d.weeklyExports || 0; o.acc += +d.accumulatedExports || 0; o.out += +d.outstandingSales || 0; });
      res.setHeader('Cache-Control', 's-maxage=3600');
      return res.status(200).json({ source: 'USDA FAS Export Sales', unit: 'metric tons', weeks: Object.values(W).sort((a, b) => a.week < b.week ? -1 : 1) });
    }
    return res.status(400).json({ error: 'bad src' });
  } catch (e) { return res.status(502).json({ error: 'fetch failed' }); }
}
