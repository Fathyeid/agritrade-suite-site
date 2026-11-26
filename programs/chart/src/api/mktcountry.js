// Top stocks by market cap for a country, from the Yahoo screener (free, unofficial, delayed). Primary exchange is auto-detected from the region unless known. Dropped: rows without a market cap, depositary receipts of foreign stocks where detectable.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
let session = null; const MC = (globalThis.__mkc = globalThis.__mkc || {});
const PRIMARY = { DE: 'GER', BR: 'SAO', IN: 'NSI', CN: 'SHH', GB: 'LSE', US: 'NMS,NYQ', CA: 'TOR' };
const XL = new Set('AT CH MX CL CZ HU AR TH PT PL BE'.split(' '));
const DR = { BR: /3[2-9]\.SA$/, DE: /^$/ };
async function getSession(force) {
  if (session && !force && Date.now() - session.t < 30 * 60 * 1000) return session;
  const r = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  const c = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
  const crumb = await c.text();
  if (!c.ok || !crumb || crumb.length > 40) throw new Error('crumb failed');
  session = { cookie, crumb, t: Date.now() };
  return session;
}
async function yget(path, params) {
  for (let i = 0; i < 2; i++) {
    const s = await getSession(i === 1);
    const r = await fetch(`https://query2.finance.yahoo.com${path}?${params}&crumb=${encodeURIComponent(s.crumb)}`, { headers: { 'User-Agent': UA, Cookie: s.cookie } });
    if (r.status === 401 || r.status === 403) continue;
    return { status: r.status, json: await r.json().catch(() => null) };
  }
  throw new Error('Yahoo auth failed');
}

const US_EX = new Set('AAPL MSFT NVDA AMZN GOOGL GOOG META TSLA AVGO JPM V UNH XOM WMT MA LLY COST HD PG NFLX AMD BAC KO PEP CRM ORCL CSCO INTC DIS NKE BA CAT BABA CYBR SHELL TSM BRKB'.split(' '));
const US_PRE = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOG', 'META', 'TSLA', 'AVGO', 'NFLX', 'BABA', 'CYBR'];
function isDR(x, cc) { const b = String(x.symbol).split('.')[0].replace(/-/g, ''); const nm = String(x.shortName || x.longName || ''); if (/(_DR\b|\bDR\b|\bCDR\b|\bADR\b|\bBDR\b|CEDEAR|DEPOSITARY|\bCERT\b)/i.test(nm)) return true; if (/\d{2}\.BK$/.test(x.symbol)) return true; if (cc !== 'US' && (US_EX.has(b) || US_PRE.some(t => b.startsWith(t) && b.length > t.length && b.length <= t.length + 4))) return true; if (cc !== 'DE' && b === 'SAP') return true; return false; }
export default async function handler(req, res) {
  const cc = String(req.query.c || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return res.status(400).json({ error: 'bad country' });
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  const hit = MC[cc]; if (hit && Date.now() - hit.t < 10 * 60000) return res.status(200).json(hit.v);
  try {
    const run = async operands => { for (let i = 0; i < 2; i++) { const s = await getSession(i === 1); const body = { size: 60, offset: 0, sortField: 'intradaymarketcap', sortType: 'DESC', quoteType: 'EQUITY', query: { operator: 'AND', operands }, userId: '', userIdType: 'guid' }; const r = await fetch('https://query2.finance.yahoo.com/v1/finance/screener?crumb=' + encodeURIComponent(s.crumb) + '&lang=en-US&region=US', { method: 'POST', headers: { 'User-Agent': UA, Cookie: s.cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.status === 401 || r.status === 403) continue; const j = await r.json().catch(() => null); return (j && j.finance && j.finance.result && j.finance.result[0] && j.finance.result[0].quotes) || []; } return []; };
    let ex = PRIMARY[cc];
    if (!ex) { const a = await run([{ operator: 'eq', operands: ['region', cc.toLowerCase()] }]); const cnt = {}; a.forEach(q => { cnt[q.exchange] = (cnt[q.exchange] || 0) + 1 }); const top = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0]; ex = top && top[0]; }
    if (!ex) { const v = { country: cc, rows: [], note: 'Yahoo has no listed stocks for this country in its screener.' }; MC[cc] = { t: Date.now(), v }; return res.status(200).json(v); }
    const ops = ex.includes(',') ? [{ operator: 'or', operands: ex.split(',').map(e => ({ operator: 'eq', operands: ['exchange', e] })) }] : [{ operator: 'eq', operands: ['exchange', ex] }];
    let q = await run(ops.concat([{ operator: 'eq', operands: ['region', cc.toLowerCase()] }])); if (q.length < 8) q = await run(ops);
    const rows = q.filter(x => isFinite(x.marketCap) && x.marketCap > 0 && x.regularMarketPrice != null && !(DR[cc] && DR[cc].test(x.symbol)) && !isDR(x, cc)).slice(0, 40).map(x => ({ symbol: x.symbol, name: x.shortName || x.longName || null, price: x.regularMarketPrice, chg: typeof x.regularMarketChangePercent === 'number' ? x.regularMarketChangePercent : null, volume: x.regularMarketVolume || 0, mcap: x.marketCap, hi52: x.fiftyTwoWeekHigh ?? null, lo52: x.fiftyTwoWeekLow ?? null, dayHigh: x.regularMarketDayHigh ?? null, dayLow: x.regularMarketDayLow ?? null, cur: x.currency || null, mc: x.exchange }));
    const v = { country: cc, exchange: ex, rows, source: 'Yahoo Finance screener (unofficial, delayed), top by market cap on ' + ex, note: XL.has(cc) ? 'WARNING: this exchange also lists many foreign cross-listings / depositary receipts (e.g. US or German large caps); Yahoo gives no flag to separate them, so some rows are not local companies.' : undefined };
    MC[cc] = { t: Date.now(), v }; return res.status(200).json(v);
  } catch (e) { return res.status(502).json({ error: 'upstream: ' + String(e.message).slice(0, 60) }); }
}
