// Headlines via Google News RSS search (free, unofficial, no key). Returns title, source, time and link only. No sentiment, no article text.
export default async function handler(req, res) {
  const q = String(req.query.q || '').slice(0, 80);
  if (!/^[\w\s\-.,&'"()+/%$]{2,80}$/.test(q)) return res.status(400).json({ error: 'bad query' });
  try {
    const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return res.status(502).json({ error: 'upstream error', status: r.status });
    const xml = await r.text();
    const dec = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 30).map(m => {
      const g = t => { const x = m[1].match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return x ? dec(x[1]).trim() : null; };
      const link = g('link');
      return { title: g('title'), source: g('source'), time: g('pubDate') ? new Date(g('pubDate')).getTime() : null, link: /^https?:\/\//.test(link || '') ? link : null };
    }).filter(i => i.title);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({ source: 'Google News RSS (unofficial)', fetched: Date.now(), items });
  } catch (e) { res.status(502).json({ error: 'fetch failed' }); }
}
