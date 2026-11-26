// Per-symbol detail data. Free, unofficial, delayed sources only: Yahoo Finance (quoteSummary, fundamentals-timeseries, options) and SEC EDGAR (filings).
// kind=summary | fin | opt | filings. Nothing is invented: missing fields are simply absent.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
let session = null; const KS = {};
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
const raw = o => (o && typeof o === 'object' && 'raw' in o) ? o.raw : (o && typeof o === 'object' && !Object.keys(o).length ? null : o);
function flat(o) { if (!o || typeof o !== 'object') return o; const out = {}; for (const k in o) { let v = o[k]; if (v && typeof v === 'object' && !Array.isArray(v)) v = 'raw' in v ? v.raw : (Object.keys(v).length ? v : null); out[k] = v; } return out; }
const FIN = ['TotalRevenue', 'GrossProfit', 'OperatingIncome', 'EBITDA', 'NetIncome', 'DilutedEPS', 'TotalAssets', 'TotalLiabilitiesNetMinorityInterest', 'StockholdersEquity', 'CashAndCashEquivalents', 'TotalDebt', 'OperatingCashFlow', 'CapitalExpenditure', 'FreeCashFlow'];
export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').slice(0, 24), kind = String(req.query.kind || 'summary');
  if (kind !== 'keystats' && !/^[\w.^=\-]{1,24}$/.test(symbol)) return res.status(400).json({ error: 'bad symbol' });
  try {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    if (kind === 'summary') {
      const mods = 'price,quoteType,summaryDetail,assetProfile,defaultKeyStatistics,financialData,recommendationTrend,earningsTrend,calendarEvents,topHoldings,fundProfile,majorHoldersBreakdown,upgradeDowngradeHistory';
      const { status, json } = await yget('/v10/finance/quoteSummary/' + encodeURIComponent(symbol), 'modules=' + mods);
      let r = json && json.quoteSummary && json.quoteSummary.result && json.quoteSummary.result[0];
      if (!r) { // retry with a smaller set; some symbol types reject unknown modules
        const b = await yget('/v10/finance/quoteSummary/' + encodeURIComponent(symbol), 'modules=price,quoteType,summaryDetail');
        r = b.json && b.json.quoteSummary && b.json.quoteSummary.result && b.json.quoteSummary.result[0];
      }
      if (!r) return res.status(404).json({ error: 'no detail data from Yahoo for this symbol', status });
      const p = flat(r.price) || {};
      const out = {
        source: 'Yahoo Finance quoteSummary (unofficial, delayed)', fetched: Date.now(),
        quoteType: (r.quoteType && r.quoteType.quoteType) || p.quoteType || null,
        price: { name: p.longName || p.shortName, exchange: p.exchangeName, currency: p.currency, marketState: p.marketState, time: p.regularMarketTime, last: p.regularMarketPrice, chg: p.regularMarketChange, chgPct: p.regularMarketChangePercent, marketCap: p.marketCap, preMarket: p.preMarketPrice, postMarket: p.postMarketPrice },
        stats: flat(r.summaryDetail) || {}, keystats: flat(r.defaultKeyStatistics) || {}, fin: flat(r.financialData) || {},
        profile: r.assetProfile ? (({ companyOfficers, ...rest }) => ({ ...rest, officers: (companyOfficers || []).slice(0, 6).map(o => ({ name: o.name, title: o.title }))}))(r.assetProfile) : null,
        reco: r.recommendationTrend ? r.recommendationTrend.trend : null,
        estimates: r.earningsTrend ? (r.earningsTrend.trend || []).map(t => ({ period: t.period, endDate: t.endDate, epsAvg: raw(t.earningsEstimate && t.earningsEstimate.avg), epsLow: raw(t.earningsEstimate && t.earningsEstimate.low), epsHigh: raw(t.earningsEstimate && t.earningsEstimate.high), epsAnalysts: raw(t.earningsEstimate && t.earningsEstimate.numberOfAnalysts), revAvg: raw(t.revenueEstimate && t.revenueEstimate.avg), revLow: raw(t.revenueEstimate && t.revenueEstimate.low), revHigh: raw(t.revenueEstimate && t.revenueEstimate.high), growth: raw(t.growth) })) : null,
        calendar: r.calendarEvents ? { earnings: ((r.calendarEvents.earnings || {}).earningsDate || []).map(raw), exDividend: raw(r.calendarEvents.exDividendDate), dividendDate: raw(r.calendarEvents.dividendDate) } : null,
        holders: flat(r.majorHoldersBreakdown) || null,
        upgrades: r.upgradeDowngradeHistory ? (r.upgradeDowngradeHistory.history || []).slice(0, 12).map(h => ({ t: h.epochGradeDate, firm: h.firm, to: h.toGrade, from: h.fromGrade, action: h.action })) : null,
        fund: r.fundProfile ? flat(r.fundProfile) : null,
        topHoldings: r.topHoldings ? { holdings: (r.topHoldings.holdings || []).map(h => ({ symbol: h.symbol, name: h.holdingName, pct: raw(h.holdingPercent) })), sectors: (r.topHoldings.sectorWeightings || []).map(o => { const k = Object.keys(o)[0]; return { sector: k, pct: raw(o[k]) }; }), stock: raw(r.topHoldings.stockPosition), bond: raw(r.topHoldings.bondPosition), cash: raw(r.topHoldings.cashPosition) } : null,
      };
      return res.status(200).json(out);
    }
    if (kind === 'fin') {
      const per = req.query.period === 'quarterly' ? 'quarterly' : 'annual';
      const types = FIN.map(t => per + t).join(',');
      const { status, json } = await yget('/ws/fundamentals-timeseries/v1/finance/timeseries/' + encodeURIComponent(symbol), `type=${types}&period1=1400000000&period2=${Math.floor(Date.now() / 1000) + 86400}`);
      const rs = json && json.timeseries && json.timeseries.result;
      if (!rs) return res.status(404).json({ error: 'no financial statements from Yahoo for this symbol', status });
      const series = {};
      rs.forEach(x => { const t = x.meta && x.meta.type && x.meta.type[0]; if (!t || !x[t]) return; series[t.replace(per, '')] = x[t].filter(a => a && a.reportedValue).map(a => ({ d: a.asOfDate, v: a.reportedValue.raw })); });
      if (!Object.keys(series).length) return res.status(404).json({ error: 'no financial statements for this symbol type (stocks only)' });
      return res.status(200).json({ source: 'Yahoo Finance fundamentals-timeseries (unofficial)', period: per, currency: rs[0] && rs[0].meta && rs[0].meta.currency, series });
    }
    if (kind === 'opt') {
      const d = req.query.date ? '&date=' + (parseInt(req.query.date, 10) || 0) : '';
      const { status, json } = await yget('/v7/finance/options/' + encodeURIComponent(symbol), (d ? d.slice(1) : 'x=1'));
      const o = json && json.optionChain && json.optionChain.result && json.optionChain.result[0];
      if (!o || !o.expirationDates || !o.expirationDates.length) return res.status(404).json({ error: 'Yahoo has no listed options for this symbol', status });
      const slim = c => ({ k: c.strike, last: c.lastPrice, bid: c.bid, ask: c.ask, chg: c.percentChange, vol: c.volume, oi: c.openInterest, iv: c.impliedVolatility, itm: c.inTheMoney, sym: c.contractSymbol });
      const opt = (o.options || [])[0] || {};
      return res.status(200).json({ source: 'Yahoo Finance options (unofficial, delayed)', underlying: o.quote && o.quote.regularMarketPrice, expirations: o.expirationDates, expiry: opt.expirationDate, calls: (opt.calls || []).map(slim), puts: (opt.puts || []).map(slim) });
    }
    if (kind === 'keystats') {
      const syms = String(req.query.symbols || '').split(',').filter(x => /^[\w.^=\-]{1,24}$/.test(x)).slice(0, 30);
      if (!syms.length) return res.status(400).json({ error: 'no symbols' });
      KS.c = KS.c || {};
      const out = {}; const todo = syms.filter(x => { const c = KS.c[x]; if (c && Date.now() - c.t < 30 * 60000) { out[x] = c.v; return false; } return true; });
      let i = 0;
      await Promise.all([0, 1, 2, 3, 4, 5].map(async () => { while (i < todo.length) { const x = todo[i++]; try { const { json } = await yget('/v10/finance/quoteSummary/' + encodeURIComponent(x), 'modules=defaultKeyStatistics'); const k = flat(json && json.quoteSummary && json.quoteSummary.result && json.quoteSummary.result[0] && json.quoteSummary.result[0].defaultKeyStatistics) || {}; const v = { float: typeof k.floatShares === 'number' ? k.floatShares : null, short: typeof k.shortPercentOfFloat === 'number' ? k.shortPercentOfFloat * 100 : null, sharesShort: typeof k.sharesShort === 'number' ? k.sharesShort : null, shares: typeof k.sharesOutstanding === 'number' ? k.sharesOutstanding : null, asOf: typeof k.dateShortInterest === 'number' ? k.dateShortInterest : null }; KS.c[x] = { t: Date.now(), v }; out[x] = v; } catch (e) { out[x] = null; } } }));
      return res.status(200).json({ source: 'Yahoo Finance defaultKeyStatistics (unofficial)', stats: out });
    }
    if (kind === 'news') {
      const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=20&quotesCount=0`, { headers: { 'User-Agent': UA } });
      const j = await r.json().catch(() => null);
      if (!j) return res.status(502).json({ error: 'Yahoo news unavailable' });
      return res.status(200).json({ source: 'Yahoo Finance news search (unofficial)', fetched: Date.now(), items: (j.news || []).map(n => ({ t: n.providerPublishTime ? n.providerPublishTime * 1000 : null, title: n.title, publisher: n.publisher, link: /^https?:\/\//.test(n.link || '') ? n.link : null, tickers: n.relatedTickers || [] })).filter(n => n.title) });
    }
    if (kind === 'filings') {
      const H = { headers: { 'User-Agent': 'GlobalChartTerminal contact@example.com' } };
      const m = await (await fetch('https://www.sec.gov/files/company_tickers.json', H)).json();
      const base = symbol.toUpperCase().replace('.', '-');
      const v = Object.values(m).find(x => x.ticker === base);
      if (!v) return res.status(404).json({ error: 'not an SEC-registered US ticker (SEC EDGAR covers US filers only)' });
      const cik = String(v.cik_str).padStart(10, '0');
      const s = await (await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, H)).json();
      const f = s.filings.recent, items = [];
      for (let i = 0; i < Math.min(40, f.form.length); i++) items.push({ form: f.form[i], date: f.filingDate[i], at: f.acceptanceDateTime && f.acceptanceDateTime[i] ? Date.parse(f.acceptanceDateTime[i]) : null, desc: f.primaryDocDescription[i] || '', url: `https://www.sec.gov/Archives/edgar/data/${v.cik_str}/${f.accessionNumber[i].replace(/-/g, '')}/${f.primaryDocument[i].replace(/^xsl[^/]*\//, '')}` });
      return res.status(200).json({ source: 'SEC EDGAR (official, free)', company: s.name, cik: v.cik_str, items });
    }
    return res.status(400).json({ error: 'bad kind' });
  } catch (e) { return res.status(502).json({ error: 'fetch failed: ' + String(e.message || e).slice(0, 80) }); }
}
