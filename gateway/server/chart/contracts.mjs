// Futures contracts table (all listed months of a root) from Yahoo per-contract symbols, e.g. ZSF27.CBT. Free, delayed, unofficial.
// Open interest, official settlement, cash price, bid/ask: NOT available from Yahoo's free chart feed, returned as null and labelled in the UI.
// Specs (size, tick, months, hours, last trading day) are compiled from the exchanges' published contract specifications; margin and daily limits are intentionally omitted (they change and have no free API).
const CBTH = '7:00 p.m. - 7:45 a.m. and 8:30 a.m. - 1:20 p.m. CT (Sun-Fri)', GLX = 'Sun-Fri 6:00 p.m. - 5:00 p.m. ET with a 60-minute daily break', LIV = '8:30 a.m. - 1:05 p.m. CT (Mon-Fri)';
const LTD_CBT = 'The business day prior to the 15th calendar day of the contract month';
const R = {
 ZS: { n: 'Soybeans', ex: 'CBOT', sfx: 'CBT', m: 'FHKNQUX', size: '5,000 bushels', tick: '1/4 cent per bushel', tv: 12.5, unit: 50, q: 'cents/bu', hours: CBTH, ltd: LTD_CBT },
 ZC: { n: 'Corn', ex: 'CBOT', sfx: 'CBT', m: 'HKNUZ', size: '5,000 bushels', tick: '1/4 cent per bushel', tv: 12.5, unit: 50, q: 'cents/bu', hours: CBTH, ltd: LTD_CBT },
 ZW: { n: 'Chicago SRW wheat', ex: 'CBOT', sfx: 'CBT', m: 'HKNUZ', size: '5,000 bushels', tick: '1/4 cent per bushel', tv: 12.5, unit: 50, q: 'cents/bu', hours: CBTH, ltd: LTD_CBT },
 KE: { n: 'KC HRW wheat', ex: 'CBOT', sfx: 'CBT', m: 'HKNUZ', size: '5,000 bushels', tick: '1/4 cent per bushel', tv: 12.5, unit: 50, q: 'cents/bu', hours: CBTH, ltd: LTD_CBT },
 ZM: { n: 'Soybean meal', ex: 'CBOT', sfx: 'CBT', m: 'FHKNQUVZ', size: '100 short tons', tick: '$0.10 per short ton', tv: 10, unit: 100, q: '$/short ton', hours: CBTH, ltd: LTD_CBT },
 ZL: { n: 'Soybean oil', ex: 'CBOT', sfx: 'CBT', m: 'FHKNQUVZ', size: '60,000 pounds', tick: '0.01 cent per pound', tv: 6, unit: 600, q: 'cents/lb', hours: CBTH, ltd: LTD_CBT },
 ZO: { n: 'Oats', ex: 'CBOT', sfx: 'CBT', m: 'HKNUZ', size: '5,000 bushels', tick: '1/4 cent per bushel', tv: 12.5, unit: 50, q: 'cents/bu', hours: CBTH, ltd: LTD_CBT },
 ZR: { n: 'Rough rice', ex: 'CBOT', sfx: 'CBT', m: 'FHKNQUX', size: '2,000 hundredweight', tick: '0.5 cent per cwt', tv: 10, unit: 20, q: '$/cwt', hours: CBTH, ltd: LTD_CBT },
 ZN: { n: '10-Year T-Note', ex: 'CBOT', sfx: 'CBT', m: 'HMUZ', size: '$100,000 face value', tick: '1/2 of 1/32 point', tv: 15.625, unit: 1000, q: 'points', hours: GLX, ltd: 'Seventh business day preceding the last business day of the delivery month' },
 ZB: { n: 'U.S. Treasury Bond', ex: 'CBOT', sfx: 'CBT', m: 'HMUZ', size: '$100,000 face value', tick: '1/32 point', tv: 31.25, unit: 1000, q: 'points', hours: GLX, ltd: 'Seventh business day preceding the last business day of the delivery month' },
 LE: { n: 'Live cattle', ex: 'CME', sfx: 'CME', m: 'GJMQVZ', size: '40,000 pounds', tick: '0.025 cent per pound', tv: 10, unit: 400, q: 'cents/lb', hours: LIV, ltd: 'Last business day of the contract month' },
 GF: { n: 'Feeder cattle', ex: 'CME', sfx: 'CME', m: 'FHJKQUVX', size: '50,000 pounds', tick: '0.025 cent per pound', tv: 12.5, unit: 500, q: 'cents/lb', hours: LIV, ltd: 'Last Thursday of the contract month' },
 HE: { n: 'Lean hogs', ex: 'CME', sfx: 'CME', m: 'GJKMNQVZ', size: '40,000 pounds', tick: '0.025 cent per pound', tv: 10, unit: 400, q: 'cents/lb', hours: LIV, ltd: '10th business day of the contract month' },
 ES: { n: 'E-mini S&P 500', ex: 'CME', sfx: 'CME', m: 'HMUZ', size: '$50 x S&P 500 index', tick: '0.25 index point', tv: 12.5, unit: 50, q: 'index points', hours: GLX, ltd: 'Third Friday of the contract month' },
 NQ: { n: 'E-mini Nasdaq-100', ex: 'CME', sfx: 'CME', m: 'HMUZ', size: '$20 x Nasdaq-100 index', tick: '0.25 index point', tv: 5, unit: 20, q: 'index points', hours: GLX, ltd: 'Third Friday of the contract month' },
 CL: { n: 'WTI crude oil', ex: 'NYMEX', sfx: 'NYM', m: 'FGHJKMNQUVXZ', size: '1,000 barrels', tick: '$0.01 per barrel', tv: 10, unit: 1000, q: '$/bbl', hours: GLX, ltd: 'Trading terminates 3 business days before the 25th calendar day of the month prior to the contract month (if the 25th is not a business day, 3 business days before the business day preceding it)' },
 BZ: { n: 'Brent crude (NYMEX, financially settled)', ex: 'NYMEX', sfx: 'NYM', m: 'FGHJKMNQUVXZ', size: '1,000 barrels', tick: '$0.01 per barrel', tv: 10, unit: 1000, q: '$/bbl', hours: GLX, ltd: 'Last business day of the second month preceding the contract month' },
 NG: { n: 'Natural gas (Henry Hub)', ex: 'NYMEX', sfx: 'NYM', m: 'FGHJKMNQUVXZ', size: '10,000 MMBtu', tick: '$0.001 per MMBtu', tv: 10, unit: 10000, q: '$/MMBtu', hours: GLX, ltd: '3 business days prior to the first calendar day of the delivery month' },
 HO: { n: 'NY Harbor ULSD (heating oil)', ex: 'NYMEX', sfx: 'NYM', m: 'FGHJKMNQUVXZ', size: '42,000 gallons', tick: '$0.0001 per gallon', tv: 4.2, unit: 42000, q: '$/gal', hours: GLX, ltd: 'Last business day of the month preceding the delivery month' },
 RB: { n: 'RBOB gasoline', ex: 'NYMEX', sfx: 'NYM', m: 'FGHJKMNQUVXZ', size: '42,000 gallons', tick: '$0.0001 per gallon', tv: 4.2, unit: 42000, q: '$/gal', hours: GLX, ltd: 'Last business day of the month preceding the delivery month' },
 PL: { n: 'Platinum', ex: 'NYMEX', sfx: 'NYM', m: 'FJNV', size: '50 troy ounces', tick: '$0.10 per troy ounce', tv: 5, unit: 50, q: '$/oz', hours: GLX, ltd: 'Third last business day of the delivery month' },
 GC: { n: 'Gold', ex: 'COMEX', sfx: 'CMX', m: 'FGHJKMNQUVXZ', size: '100 troy ounces', tick: '$0.10 per troy ounce', tv: 10, unit: 100, q: '$/oz', hours: GLX, ltd: 'Third last business day of the delivery month' },
 SI: { n: 'Silver', ex: 'COMEX', sfx: 'CMX', m: 'FGHJKMNQUVXZ', size: '5,000 troy ounces', tick: '$0.005 per troy ounce', tv: 25, unit: 5000, q: '$/oz', hours: GLX, ltd: 'Third last business day of the delivery month' },
 HG: { n: 'Copper', ex: 'COMEX', sfx: 'CMX', m: 'FGHJKMNQUVXZ', size: '25,000 pounds', tick: '$0.0005 per pound', tv: 12.5, unit: 25000, q: '$/lb', hours: GLX, ltd: 'Third last business day of the delivery month' },
 SB: { n: 'Sugar No. 11', ex: 'ICE US', sfx: 'NYB', m: 'HKNV', size: '112,000 pounds', tick: '0.01 cent per pound', tv: 11.2, unit: 1120, q: 'cents/lb', hours: null, ltd: 'Last business day of the month preceding the delivery month' },
 KC: { n: 'Coffee C', ex: 'ICE US', sfx: 'NYB', m: 'HKNUZ', size: '37,500 pounds', tick: '0.05 cent per pound', tv: 18.75, unit: 375, q: 'cents/lb', hours: null, ltd: 'One business day prior to the last notice day' },
 CT: { n: 'Cotton No. 2', ex: 'ICE US', sfx: 'NYB', m: 'HKNVZ', size: '50,000 pounds', tick: '0.01 cent per pound', tv: 5, unit: 500, q: 'cents/lb', hours: null, ltd: '17th business day from the end of the contract month' },
 CC: { n: 'Cocoa', ex: 'ICE US', sfx: 'NYB', m: 'HKNUZ', size: '10 metric tons', tick: '$1 per metric ton', tv: 10, unit: 10, q: '$/tonne', hours: null, ltd: 'One business day prior to the last notice day' },
 OJ: { n: 'Orange juice (FCOJ-A)', ex: 'ICE US', sfx: 'NYB', m: 'FHKNUX', size: '15,000 pounds', tick: '0.05 cent per pound', tv: 7.5, unit: 150, q: 'cents/lb', hours: null, ltd: '14th business day prior to the last business day of the contract month' },
 DX: { cont: 'DX-Y.NYB', n: 'U.S. Dollar Index', ex: 'ICE US', sfx: 'NYB', m: 'HMUZ', size: '$1,000 x index', tick: '0.005 index point', tv: 5, unit: 1000, q: 'index points', hours: null, ltd: 'Two business days before the third Wednesday of the contract month' }
};
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], CODE = 'FGHJKMNQUVXZ';
const C = (globalThis.__contr = globalThis.__contr || {});
async function bars(sym) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d&includePrePost=false`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null), c = j && j.chart && j.chart.result && j.chart.result[0];
  if (!c || !c.timestamp) return null;
  const q = c.indicators.quote[0], b = [];
  c.timestamp.forEach((t, i) => { if (q.close[i] != null && q.high[i] != null && q.low[i] != null && q.open[i] != null) b.push({ t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 }); });
  return b.length ? { b, m: c.meta } : null;
}
export const ROOTS = R;
export default async function handler(req, res) {
  const root = String(req.query.root || 'ZS').toUpperCase();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (root === 'LIST') return res.status(200).json({ roots: Object.entries(R).map(([k, v]) => ({ root: k, name: v.n, ex: v.ex })) });
  const S = R[root]; if (!S) return res.status(400).json({ error: 'unknown root' });
  const n = Math.max(2, Math.min(36, +req.query.n || 24));
  const hit = C[root + n]; if (hit && Date.now() - hit.t < 45000) return res.status(200).json(hit.v);
  try {
    const now = new Date(), list = [];
    for (let k = 0; k < 40 && list.length < n; k++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + k, 1)), code = CODE[d.getUTCMonth()];
      if (!S.m.includes(code)) continue;
      const yy = String(d.getUTCFullYear()).slice(2);
      list.push({ code, y: d.getUTCFullYear(), sym: `${root}${code}${yy}.${S.sfx}`, label: `${MN[d.getUTCMonth()]} '${yy}`, tick: `${root}${code}${yy}` });
    }
    const res1 = await Promise.all([...list.map(x => bars(x.sym).catch(() => null)), bars(S.cont || root + '=F').catch(() => null)]);
    const front = res1.pop();
    const mk = (x, d) => {
      if (!d) return null;
      const { b, m } = d, off = m.gmtoffset || 0, day = t => Math.floor((t + off) / 86400);
      const lb = b[b.length - 1], live = m.regularMarketPrice != null ? m.regularMarketPrice : lb.c;
      const sameDay = m.regularMarketTime && day(m.regularMarketTime) === day(lb.t);
      const prevBar = sameDay ? b[b.length - 2] : lb, prev = prevBar ? prevBar.c : null;
      const at = days => { const t = lb.t - days * 86400; let r = null; for (const y of b) if (y.t <= t) r = y; return r ? r.c : null; };
      const ytd = (() => { const y0 = new Date(lb.t * 1000).getUTCFullYear(); let r = null; for (const y of b) if (new Date(y.t * 1000).getUTCFullYear() < y0) r = y; return r ? r.c : null; })();
      const pc = base => base ? (live - base) / base * 100 : null;
      const dailyPrev = b.length > 1 ? b[b.length - 2] : null;
      return {
        label: x.label, sym: x.sym, tick: x.tick, last: live, prev, chg: prev != null ? live - prev : null, pct: prev ? (live - prev) / prev * 100 : null,
        open: sameDay ? lb.o : null, high: m.regularMarketDayHigh != null && sameDay ? m.regularMarketDayHigh : lb.h, low: m.regularMarketDayLow != null && sameDay ? m.regularMarketDayLow : lb.l, vol: m.regularMarketVolume != null && sameDay ? m.regularMarketVolume : lb.v,
        time: m.regularMarketTime || lb.t, cur: m.currency,
        daily: { date: lb.t, o: lb.o, h: lb.h, l: lb.l, c: lb.c, v: lb.v, prev: dailyPrev ? dailyPrev.c : null },
        perf: { d5: pc(at(7)), m1: pc(at(30)), m3: pc(at(91)), m6: pc(at(182)), ytd: pc(ytd), y1: pc(b[0].c) }, hi52: Math.max(...b.map(y => y.h)), lo52: Math.min(...b.map(y => y.l)),
        c1m: at(30), c3m: at(91), c1y: b[0].c, spark: b.slice(-30).map(y => y.c)
      };
    };
    let rows = list.map((x, i) => mk(x, res1[i])).filter(Boolean);
    const newest = Math.max(...rows.map(r => r.time));
    rows = rows.filter(r => newest - r.time < 3 * 86400);
    const fr = front ? mk({ label: 'Front (continuous ' + root + '=F)', sym: S.cont || root + '=F', tick: S.cont || root + '=F' }, front) : null;
    const v = { root, name: S.n, exchange: S.ex, specs: { size: S.size, tick: S.tick, tickValue: S.tv, valuePerPoint: S.unit, quote: S.q, months: S.m.split('').map(c => MN[CODE.indexOf(c)]).join(', '), hours: S.hours, lastTradingDay: S.ltd, marginDailyLimit: null }, front: fr, rows, requested: list.length, missing: list.length - rows.length, source: 'Yahoo Finance per-contract symbols (unofficial, delayed ~10-15 min). Open interest, official settlement, cash price: not available from a free source.' };
    C[root + n] = { t: Date.now(), v };
    return res.status(200).json(v);
  } catch (e) { return res.status(502).json({ error: 'upstream: ' + String(e.message).slice(0, 60) }); }
}
