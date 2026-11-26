// CFTC Commitments of Traders (free, official, weekly; positions as of Tuesday, published Friday).
// GET /api/cot                       -> latest week, every market (legacy report: large speculators, commercials, small traders)
// GET /api/cot?code=088691&rep=disagg&weeks=156 -> history of one market
//   rep = legacy (all markets) | disagg (commodities: managed money, producers, swap dealers) | tff (financials: asset managers, leveraged funds, dealers)
// Source: CFTC Public Reporting Environment (Socrata). Field names are matched by pattern so a renamed column does not break the feed.
// Fallback for the latest-week list: the CFTC weekly comma-delimited legacy file (deafut.txt).
const DS = { legacy: '6dca-aqww', disagg: '72hh-3qpy', tff: 'gpe5-46if' };
const CAT = {
  legacy: [['spec', /^noncomm_positions_long_all$/, /^noncomm_positions_short_all$/], ['comm', /^comm_positions_long_all$/, /^comm_positions_short_all$/], ['small', /^nonrept_positions_long_all$/, /^nonrept_positions_short_all$/]],
  disagg: [['mm', /^m_money_positions_long(_all)?$/, /^m_money_positions_short(_all)?$/], ['prod', /^prod_merc_positions_long(_all)?$/, /^prod_merc_positions_short(_all)?$/], ['swap', /^swap_+positions_long(_all)?$/, /^swap_+positions_short(_all)?$/], ['other', /^other_rept_positions_long(_all)?$/, /^other_rept_positions_short(_all)?$/], ['small', /^nonrept_positions_long_all$/, /^nonrept_positions_short_all$/]],
  tff: [['am', /^asset_mgr_positions_long(_all)?$/, /^asset_mgr_positions_short(_all)?$/], ['lev', /^lev_money_positions_long(_all)?$/, /^lev_money_positions_short(_all)?$/], ['dealer', /^dealer_positions_long(_all)?$/, /^dealer_positions_short(_all)?$/], ['other', /^other_rept_positions_long(_all)?$/, /^other_rept_positions_short(_all)?$/], ['small', /^nonrept_positions_long_all$/, /^nonrept_positions_short_all$/]]
};
const key = (r, re) => Object.keys(r).find(k => re.test(k));
const num = v => v == null || v === '' ? null : Number(String(v).replace(/,/g, ''));
function norm(r, rep) {
  const g = {};
  CAT[rep].forEach(([k, l, s]) => { const a = key(r, l), b = key(r, s); if (a || b) g[k] = [num(a && r[a]), num(b && r[b])]; });
  const ch = rep === 'legacy' ? [num(r[key(r, /^change_in_noncomm_long_all$/)]), num(r[key(r, /^change_in_noncomm_short_all$/)])] : null;
  return {
    date: String(r[key(r, /^report_date_as_yyyy_mm_dd$/) || key(r, /^report_date/)] || '').slice(0, 10),
    name: r[key(r, /^market_and_exchange_names?$/)] || '', code: String(r[key(r, /^cftc_contract_market_code$/)] || '').trim(),
    group: r[key(r, /^commodity_group_name$/)] || null, sub: r[key(r, /^commodity_subgroup_name$/)] || null,
    oi: num(r[key(r, /^open_interest_all$/)]), g, ch
  };
}
async function soc(rep, q) {
  const r = await fetch(`https://publicreporting.cftc.gov/resource/${DS[rep]}.json?${q}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('cftc ' + r.status);
  return r.json();
}
async function fallbackLatest() {
  const r = await fetch('https://www.cftc.gov/dea/newcot/deafut.txt'); if (!r.ok) throw new Error('cftc file ' + r.status);
  const txt = await r.text(), rows = [];
  txt.split(/\r?\n/).forEach(line => {
    if (!line.trim()) return; const f = []; let cur = '', q = false;
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { f.push(cur.trim()); cur = ''; } else cur += ch; } f.push(cur.trim());
    if (f.length < 17) return; const n = i => num(f[i]);
    rows.push({ date: f[2], name: f[0], code: f[3], group: null, sub: null, oi: n(7), g: { spec: [n(8), n(9)], comm: [n(11), n(12)], small: [n(15), n(16)] }, ch: null });
  });
  return rows;
}
export default async function handler(req, res) {
  const q = req.query || {}, rep = DS[q.rep] ? q.rep : 'legacy';
  try {
    let rows;
    if (q.code) {
      if (!/^[0-9A-Z]{4,8}$/i.test(String(q.code))) return res.status(400).json({ error: 'bad code' });
      const weeks = Math.max(8, Math.min(520, parseInt(q.weeks, 10) || 156));
      const data = await soc(rep, `$where=${encodeURIComponent(`cftc_contract_market_code='${String(q.code).toUpperCase()}'`)}&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=${weeks}`);
      rows = data.map(r => norm(r, rep)).filter(r => r.date).reverse();
    } else {
      try {
        const last = await soc('legacy', '$select=report_date_as_yyyy_mm_dd&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=1');
        const d = last[0] && String(last[0].report_date_as_yyyy_mm_dd || Object.values(last[0])[0]).slice(0, 10);
        const data = await soc('legacy', `$where=${encodeURIComponent(`report_date_as_yyyy_mm_dd='${d}T00:00:00.000'`)}&$limit=3000`);
        rows = data.map(r => norm(r, 'legacy'));
        if (!rows.length) throw new Error('empty');
      } catch (e) { rows = await fallbackLatest(); }
    }
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({ rep, source: 'CFTC Commitments of Traders', rows });
  } catch (e) { res.status(502).json({ error: 'upstream', detail: String(e.message || e).slice(0, 120) }); }
}
