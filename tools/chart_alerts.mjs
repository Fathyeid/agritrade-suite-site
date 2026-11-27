// Scheduled checker for Chart price alerts (runs in GitHub Actions, free for public repos).
// Reads active rows from public.chart_alerts, gets the latest price from the free Yahoo feed,
// sends a Telegram message when the condition is met and switches the alert off (never deletes it).
// Secrets (GitHub > Settings > Secrets and variables > Actions): SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN.
const U = process.env.SUPABASE_URL || 'https://nimfkykshfijxbgwgkrg.supabase.co';
const K = process.env.SUPABASE_SERVICE_ROLE_KEY, T = process.env.TELEGRAM_BOT_TOKEN;
if (!K || !T) { console.log('Chart alerts: not configured (add SUPABASE_SERVICE_ROLE_KEY and TELEGRAM_BOT_TOKEN secrets).'); process.exit(0); }
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const r = await fetch(`${U}/rest/v1/chart_alerts?active=eq.true&select=*&limit=500`, { headers: H });
if (!r.ok) { console.log('Chart alerts: cannot read table', r.status, (await r.text()).slice(0, 200)); process.exit(0); }
const alerts = await r.json();
console.log('active alerts:', alerts.length);
const price = {};
for (const sym of [...new Set(alerts.map(a => a.sym))]) {
  try {
    const q = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await q.json(); const m = j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
    if (m && m.regularMarketPrice != null) price[sym] = m.regularMarketPrice;
  } catch (e) { console.log('price failed', sym); }
}
for (const a of alerts) {
  const p = price[a.sym]; if (p == null) continue;
  const hit = a.type === 'above' ? p >= Number(a.level) : p <= Number(a.level);
  if (!hit) continue;
  const word = a.type === 'above' ? 'above / فوق' : 'below / تحت';
  const text = `🔔 ${a.sym}: ${p} — ${word} ${a.level}${a.note ? '\n' + a.note : ''}\n(Agritrade Pro chart alert · Yahoo, delayed)`;
  let sent = false;
  if (a.tg_chat) { const s = await fetch(`https://api.telegram.org/bot${T}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: a.tg_chat, text }) }); sent = s.ok; if (!s.ok) console.log('telegram failed', a.id, s.status); }
  await fetch(`${U}/rest/v1/chart_alerts?id=eq.${encodeURIComponent(a.id)}`, { method: 'PATCH', headers: H, body: JSON.stringify({ active: false, fired_at: new Date().toISOString(), fired_price: p, note: (a.note || '') + (sent ? '' : (a.tg_chat ? ' [telegram failed]' : ' [no telegram chat id]')) }) });
  console.log('fired', a.id, a.sym, p, sent ? 'sent' : 'not sent');
}
