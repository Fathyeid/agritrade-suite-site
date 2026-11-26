// Data provider adapter: "yahoo" is the only provider connected (free, unofficial, delayed).
// Licensed providers (CME, ICE, LSEG, dxFeed, Barchart, Twelve Data, Polygon) plug in here by adding a branch on `provider`.
export async function fetchYahoo(symbol, range, interval) {
  const now = Math.floor(Date.now() / 1000);
  // range=max silently downgrades daily/weekly to monthly on Yahoo, so ask for explicit period instead
  const span = (range === 'max' && (interval === '1d' || interval === '1wk')) ? `period1=${now - 35 * 365 * 86400}&period2=${now}` : `range=${range}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${span}&interval=${interval}&includePrePost=false`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  const c = j.chart && j.chart.result && j.chart.result[0];
  if (!c || !c.timestamp) return null;
  const q = c.indicators.quote[0], bars = [];
  c.timestamp.forEach((t, i) => {
    if (q.open[i] == null || q.close[i] == null || q.high[i] == null || q.low[i] == null) return;
    bars.push({ t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 });
  });
  const m = c.meta;
  return { symbol, provider: 'yahoo', name: m.longName || m.shortName || symbol, currency: m.currency, exchange: m.fullExchangeName || m.exchangeName, type: m.instrumentType,
    gmtoffset: m.gmtoffset || 0, tz: m.exchangeTimezoneName, price: m.regularMarketPrice, prevClose: m.chartPreviousClose, dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow,
    volume: m.regularMarketVolume, hi52: m.fiftyTwoWeekHigh, lo52: m.fiftyTwoWeekLow, marketTime: m.regularMarketTime,
    period: m.currentTradingPeriod && m.currentTradingPeriod.regular, bars };
}
export default async function handler(req, res) {
  const { symbol = 'ZS=F', range = '1y', interval = '1d' } = req.query;
  if (!/^[A-Za-z0-9=\^\.\-]{1,20}$/.test(symbol)) return res.status(400).json({ error: 'bad symbol' });
  if (!/^(1d|5d|7d|1mo|60d|3mo|6mo|1y|2y|5y|10y|ytd|max)$/.test(range)) return res.status(400).json({ error: 'bad range' });
  if (!/^(1m|2m|5m|15m|30m|60m|90m|1d|5d|1wk|1mo|3mo)$/.test(interval)) return res.status(400).json({ error: 'bad interval' });
  try {
    const d = await fetchYahoo(symbol, range, interval);
    if (!d) return res.status(502).json({ error: 'no data' });
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.status(200).json(d);
  } catch (e) { res.status(502).json({ error: 'upstream' }); }
}
