// Country economy + bond data. World Bank open data API (annual, latest available) and US Treasury XML (yield curve), ECB (EU 10Y), DBnomics OECD (stale fallback).
const C = (globalThis.__econc = globalThis.__econc || {});
async function cached(k, ttl, fn) { const c = C[k]; if (c && Date.now() - c.t < ttl) return c.v; try { const v = await fn(); C[k] = { t: Date.now(), v }; return v; } catch (e) { if (c) return c.v; throw e; } }
const WB = [['NY.GDP.MKTP.CD', 'GDP', 'usd'], ['NY.GDP.MKTP.KD.ZG', 'GDP growth (annual %)', 'pct'], ['NY.GDP.PCAP.CD', 'GDP per capita', 'usd'], ['NY.GDP.PCAP.PP.CD', 'GDP per capita PPP', 'usd'], ['FP.CPI.TOTL.ZG', 'Inflation, consumer prices (annual %)', 'pct'], ['SL.UEM.TOTL.ZS', 'Unemployment rate', 'pct'], ['GC.DOD.TOTL.GD.ZS', 'Central government debt (% of GDP)', 'pct'], ['GC.REV.XGRT.GD.ZS', 'Government revenue (% of GDP)', 'pct'], ['GC.XPN.TOTL.GD.ZS', 'Government expense (% of GDP)', 'pct'], ['BN.CAB.XOKA.GD.ZS', 'Current account balance (% of GDP)', 'pct'], ['FR.INR.RINR', 'Real interest rate (%)', 'pct'], ['FR.INR.LEND', 'Lending interest rate (%)', 'pct'], ['NE.TRD.GNFS.ZS', 'Trade (% of GDP)', 'pct'], ['SP.POP.TOTL', 'Population', 'num'], ['SL.TLF.CACT.ZS', 'Labor force participation (%)', 'pct']];
const FRED_US = [['DGS1MO', '1 month'], ['DGS3MO', '3 months'], ['DGS6MO', '6 months'], ['DGS1', '1 year'], ['DGS2', '2 years'], ['DGS3', '3 years'], ['DGS5', '5 years'], ['DGS7', '7 years'], ['DGS10', '10 years'], ['DGS20', '20 years'], ['DGS30', '30 years']];
async function csv(id) { const r = await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + id, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error('fred ' + r.status); return (await r.text()).trim().split('\n').slice(1).map(l => l.split(',')).filter(x => x[1] && x[1] !== '.' && isFinite(+x[1])).map(x => [x[0], +x[1]]); }
export default async function handler(req, res) {
  const kind = String(req.query.kind || 'econ'), cc = String(req.query.c || '').toUpperCase();
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  try {
    if (kind === 'econ') {
      if (!/^[A-Z]{2}$/.test(cc)) return res.status(400).json({ error: 'bad country' });
      const out = await Promise.all(WB.map(async ([id, label, unit]) => {
        try { const j = await cached('wb' + cc + id, 6 * 3600e3, async () => { const r = await fetch(`https://api.worldbank.org/v2/country/${cc}/indicator/${id}?format=json&per_page=30&mrv=12`); if (!r.ok) throw new Error('wb ' + r.status); return r.json(); }); const rows = ((j && j[1]) || []).filter(x => x.value != null).map(x => [x.date, x.value]); return { id, label, unit, last: rows[0] ? { y: rows[0][0], v: rows[0][1] } : null, series: rows.slice(0, 12).reverse() }; }
        catch (e) { return { id, label, unit, last: null, series: [] }; }
      }));
      return res.status(200).json({ source: 'World Bank Open Data (annual, latest year available; usually 1-2 years behind)', country: cc, items: out });
    }
    if (kind === 'countries') {
      const j = await cached('wbc', 24 * 3600e3, async () => { const r = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=400'); if (!r.ok) throw new Error('wb ' + r.status); return r.json(); });
      const rows = ((j && j[1]) || []).filter(x => x.region && x.region.value !== 'Aggregates' && /^[A-Z]{2}$/.test(x.iso2Code)).map(x => ({ c: x.iso2Code, n: x.name, region: x.region.value, cap: x.capitalCity }));
      return res.status(200).json({ source: 'World Bank country list', rows });
    }
    if (kind === 'ust') {
      const yr = new Date().getUTCFullYear();
      const get = y => cached('ust' + y, 30 * 60e3, async () => { const r = await fetch('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=' + y, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error('treasury ' + r.status); const t = await r.text(); return t.split('<m:properties>').slice(1).map(blk => { const o = { date: (blk.match(/<d:NEW_DATE[^>]*>([^<]+)</) || [])[1] }; for (const m of blk.matchAll(/<d:(BC_[0-9A-Z_]+)[^>]*>([^<]+)</g)) o[m[1]] = +m[2]; o.date = (o.date || '').slice(0, 10); return o; }).filter(o => o.date).sort((x, y) => x.date < y.date ? -1 : 1); });
      const [A, B] = await Promise.all([get(yr), get(yr - 1).catch(() => [])]);
      const all = [...B, ...A], L = all[all.length - 1], P = all[all.length - 2];
      const at = d => { const t = new Date(Date.parse(L.date) - d * 864e5).toISOString().slice(0, 10); return [...all].reverse().find(x => x.date <= t) || null; };
      const M = at(30), Y = at(365);
      const T = [['BC_1MONTH', '1 month'], ['BC_3MONTH', '3 months'], ['BC_6MONTH', '6 months'], ['BC_1YEAR', '1 year'], ['BC_2YEAR', '2 years'], ['BC_3YEAR', '3 years'], ['BC_5YEAR', '5 years'], ['BC_7YEAR', '7 years'], ['BC_10YEAR', '10 years'], ['BC_20YEAR', '20 years'], ['BC_30YEAR', '30 years']];
      const rows = T.map(([id, label]) => ({ id, label, date: L.date, y: L[id] ?? null, prev: P ? P[id] ?? null : null, m1: M ? M[id] ?? null : null, y1: Y ? Y[id] ?? null : null }));
      return res.status(200).json({ source: 'US Treasury (home.treasury.gov) daily par yield curve rates, end of day', rows });
    }
    if (kind === 'oecd') {
      if (!/^[A-Z]{2,3}$/.test(cc)) return res.status(400).json({ error: 'bad country' });
      const i2 = String(req.query.i || '').toUpperCase();
      const ECB = 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ');
      if (i2 === 'GB') {
        const d = await cached('boe', 3 * 3600e3, async () => { const f = new Date(Date.now() - 800 * 864e5), M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const r = await fetch(`https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/${M[f.getUTCMonth()]}/${f.getUTCFullYear()}&Dateto=now&SeriesCodes=IUDMNPY&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error('boe ' + r.status); return (await r.text()).trim().split('\n').slice(1).map(l => l.split(',')).map(x => { const m = x[0].trim().split(' '); const mi = M.indexOf(m[1]); return [m[2] + '-' + String(mi + 1).padStart(2, '0') + '-' + m[0].padStart(2, '0'), +x[1]]; }).filter(x => isFinite(x[1])); });
        if (!d.length) throw new Error('boe empty');
        const mo = {}; d.forEach(x => { (mo[x[0].slice(0, 7)] = mo[x[0].slice(0, 7)] || []).push(x[1]); });
        const series = Object.keys(mo).sort().map(k => [k, mo[k].reduce((a, b) => a + b, 0) / mo[k].length]);
        const La = d[d.length - 1], Pa = d[d.length - 2];
        return res.status(200).json({ source: 'Bank of England IADB, 10Y nominal par yield (series IUDMNPY): latest daily value; chart is monthly average of daily values', date: La[0], y: La[1], prev: Pa ? Pa[1] : null, series: series.slice(-24) });
      }
      if (ECB.includes(i2)) {
        const rows = await cached('ecb' + i2, 6 * 3600e3, async () => { const r = await fetch(`https://data-api.ecb.europa.eu/service/data/IRS/M.${i2}.L.L40.CI.0000.EUR.N.Z?lastNObservations=36&format=csvdata`); if (!r.ok) throw new Error('ecb ' + r.status); const L = (await r.text()).trim().split('\n'); const h = L[0].split(','), ti = h.indexOf('TIME_PERIOD'), vi = h.indexOf('OBS_VALUE'); return L.slice(1).map(l => l.split(',')).map(x => [x[ti], +x[vi]]).filter(x => isFinite(x[1])); });
        if (!rows.length) throw new Error('ecb empty');
        const La = rows[rows.length - 1], Pa = rows[rows.length - 2];
        return res.status(200).json({ source: 'European Central Bank, 10Y government bond yield (Maastricht convergence criterion), monthly average', date: La[0], y: La[1], prev: Pa ? Pa[1] : null, series: rows.slice(-24) });
      }
      const j = await cached('dn' + cc, 12 * 3600e3, async () => { const r = await fetch(`https://api.db.nomics.world/v22/series/OECD/MEI/${cc}.IRLTLT01.ST.M?observations=1`); if (!r.ok) throw new Error('dbnomics ' + r.status); return r.json(); });
      const d = j && j.series && j.series.docs && j.series.docs[0];
      if (!d) throw new Error('no series');
      const s = d.period.map((p, k) => [p, d.value[k]]).filter(x => x[1] != null && isFinite(x[1]));
      if (!s.length) throw new Error('no data');
      const La = s[s.length - 1], Pa = s[s.length - 2];
      if (Date.now() - Date.parse(La[0] + '-01') > 400 * 864e5) throw new Error('no current free 10Y feed (OECD mirror ends ' + La[0] + ')');
      return res.status(200).json({ source: 'OECD Main Economic Indicators via DBnomics, 10Y government bond yield, monthly. STALE: the free mirror stops at ' + La[0] + '; not current', stale: true, date: La[0], y: La[1], prev: Pa ? Pa[1] : null, series: s.slice(-24) });
    }
    return res.status(400).json({ error: 'bad kind' });
  } catch (e) { return res.status(502).json({ error: 'upstream: ' + String(e.message).slice(0, 60) }); }
}
