// Market calendars. Earnings, dividends and IPO: Nasdaq public calendar API (US listings only, unofficial). Economic: Faireconomy / ForexFactory public weekly JSON (this week only, forecast + previous, NO actual values).
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const C = (globalThis.__calc = globalThis.__calc || {});
async function cached(key, ttl, fn) { const c = C[key]; if (c && Date.now() - c.t < ttl) return c.v; try { const v = await fn(); C[key] = { t: Date.now(), v }; return v; } catch (e) { if (c) return c.v; throw e; } }
async function nq(path) { const r = await fetch('https://api.nasdaq.com/api/' + path, { headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' } }); if (!r.ok) throw new Error('nasdaq ' + r.status); const j = await r.json(); return j && j.data; }
const mdy = s => { const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(s || ''); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };
const num = s => { if (s == null || s === '') return null; const n = parseFloat(String(s).replace(/[$,()]/g, '')); if (!isFinite(n)) return null; return /^\(.*\)$/.test(String(s).trim()) || /^\(?-/.test(String(s)) ? -Math.abs(n) : n; };
export default async function handler(req, res) {
  const start = String(req.query.start || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return res.status(400).json({ error: 'bad start' });
  const d0 = new Date(start + 'T00:00:00Z'); if (isNaN(d0)) return res.status(400).json({ error: 'bad start' });
  const days = [...Array(7)].map((_, i) => new Date(d0.getTime() + i * 864e5).toISOString().slice(0, 10));
  const errors = [];
  const out = { source: { earnings: 'Nasdaq earnings calendar (US listings, unofficial). EPS forecast = consensus as published; reported EPS is not provided.', dividends: 'Nasdaq dividends calendar (US listings, unofficial)', ipo: 'Nasdaq IPO calendar (US, unofficial): priced and filed deals; upcoming list is often empty', economic: 'Faireconomy / ForexFactory public weekly JSON (unofficial): current week only, Forecast and Previous only, no Actual' }, days: days.map(d => ({ date: d, earnings: [], dividends: [] })), ipo: { priced: [], filed: [], upcoming: [] }, economic: null, errors };
  await Promise.all(days.flatMap((d, i) => ['earnings', 'dividends'].map(async k => {
    if (new Date(d + 'T00:00:00Z').getUTCDay() % 6 === 0 && k === 'earnings' && false) return;
    try {
      const data = await cached(k + d, 20 * 60000, () => nq(`calendar/${k}?date=${d}`));
      if (k === 'earnings') out.days[i].earnings = ((data && data.rows) || []).map(r => ({ sym: r.symbol, name: r.name, time: /pre/.test(r.time || '') ? 'BMO' : /after/.test(r.time || '') ? 'AMC' : null, mcap: num(r.marketCap), fq: r.fiscalQuarterEnding || null, epsF: num(r.epsForecast), n: num(r.noOfEsts), epsLast: num(r.lastYearEPS) }));
      else out.days[i].dividends = ((data && data.calendar && data.calendar.rows) || []).map(r => ({ sym: r.symbol, name: r.companyName, ex: mdy(r.dividend_Ex_Date), pay: mdy(r.payment_Date), rec: mdy(r.record_Date), rate: typeof r.dividend_Rate === 'number' ? r.dividend_Rate : null, annual: typeof r.indicated_Annual_Dividend === 'number' ? r.indicated_Annual_Dividend : null }));
    } catch (e) { errors.push(k + ' ' + d + ': ' + String(e.message).slice(0, 50)); }
  })));
  const months = [...new Set([days[0].slice(0, 7), days[6].slice(0, 7)])];
  await Promise.all(months.map(async m => {
    try {
      const data = await cached('ipo' + m, 20 * 60000, () => nq('ipo/calendar?date=' + m));
      const pr = (data && data.priced && data.priced.rows) || [], fl = (data && data.filed && data.filed.rows) || [], up = (data && data.upcoming && data.upcoming.upcomingTable && data.upcoming.upcomingTable.rows) || [];
      pr.forEach(r => out.ipo.priced.push({ sym: r.proposedTickerSymbol, name: r.companyName, exch: r.proposedExchange, price: r.proposedSharePrice, shares: num(r.sharesOffered), date: mdy(r.pricedDate), amount: num(r.dollarValueOfSharesOffered) }));
      fl.forEach(r => out.ipo.filed.push({ sym: r.proposedTickerSymbol, name: r.companyName, date: mdy(r.filedDate), amount: num(r.dollarValueOfSharesOffered) }));
      up.forEach(r => out.ipo.upcoming.push({ sym: r.proposedTickerSymbol, name: r.companyName, exch: r.proposedExchange, price: r.proposedSharePrice, shares: num(r.sharesOffered), date: mdy(r.expectedPriceDate), amount: num(r.dollarValueOfSharesOffered) }));
    } catch (e) { errors.push('ipo ' + m + ': ' + String(e.message).slice(0, 50)); }
  }));
  try {
    const ev = await cached('ff', 30 * 60000, async () => { const r = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('ff ' + r.status); return r.json(); });
    const lo = d0.getTime() - 864e5, hi = d0.getTime() + 8 * 864e5;
    const rows = (Array.isArray(ev) ? ev : []).map(e => ({ t: Date.parse(e.date), title: e.title, cur: e.country, impact: e.impact, forecast: e.forecast || null, prior: e.previous || null })).filter(e => e.t >= lo && e.t <= hi);
    out.economic = rows.length ? rows : null;
    if (!rows.length) out.economicNote = 'The free economic feed only covers the current week; no events for this week.';
  } catch (e) { errors.push('economic: ' + String(e.message).slice(0, 50)); }
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).json(out);
}
