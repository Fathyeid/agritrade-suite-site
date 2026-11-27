// Builds data/macro.json: latest US macro actuals from FRED (St. Louis Fed) public CSV downloads (no API key).
// Run by .github/workflows/macro-data.yml twice a day; the Chart's Insights tab reads the file from raw.githubusercontent.com.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
const S = [
  ['CPIAUCSL', 'yoy', 'US inflation (CPI, y/y)', 'التضخم الأمريكي (CPI سنوي)', '%', 1],
  ['CPILFESL', 'yoy', 'Core inflation (core CPI, y/y)', 'التضخم الأساسي (سنوي)', '%', 1],
  ['PCEPILFE', 'yoy', 'Core PCE (Fed target, y/y)', 'مؤشر PCE الأساسي (هدف الفيدرالي، سنوي)', '%', 1],
  ['UNRATE', 'lvl', 'Unemployment rate', 'معدل البطالة', '%', 1],
  ['PAYEMS', 'diff', 'Nonfarm payrolls (monthly change, thousands)', 'الوظائف غير الزراعية (التغير الشهري، بالآلاف)', 'K', 0],
  ['ICSA', 'lvl', 'Initial jobless claims (weekly)', 'طلبات إعانة البطالة الأسبوعية', '', 0],
  ['A191RL1Q225SBEA', 'lvl', 'Real GDP growth (q/q annualized)', 'نمو الناتج المحلي الحقيقي (ربع سنوي سنوي)', '%', 1],
  ['RSAFS', 'mom', 'Retail sales (m/m)', 'مبيعات التجزئة (شهري)', '%', 1],
  ['INDPRO', 'mom', 'Industrial production (m/m)', 'الإنتاج الصناعي (شهري)', '%', 1],
  ['HOUST', 'lvl', 'Housing starts (thousands, annualized)', 'بدء بناء المساكن (بالآلاف، سنوي)', 'K', 0],
  ['UMCSENT', 'lvl', 'Consumer sentiment (U. Michigan)', 'ثقة المستهلك (جامعة ميشيغان)', '', 1],
  ['DFEDTARU', 'lvl', 'Fed funds target (upper)', 'سعر الفائدة الأمريكي (الحد الأعلى)', '%', 2],
  ['DGS10', 'lvl', '10-year Treasury yield', 'عائد السندات الأمريكية ١٠ سنوات', '%', 2],
  ['DGS2', 'lvl', '2-year Treasury yield', 'عائد السندات الأمريكية سنتين', '%', 2],
  ['T10Y2Y', 'lvl', '10y minus 2y spread', 'الفرق بين عائد ١٠ سنوات وسنتين', '%', 2],
  ['DTWEXBGS', 'lvl', 'US dollar index (broad, Fed)', 'مؤشر الدولار الواسع (الفيدرالي)', '', 2]
];
const out = { updated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', source: 'FRED, Federal Reserve Bank of St. Louis', series: [] };
for (const [id, tr, en, ar, unit, dec] of S) {
  try {
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (macro data job)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = (await r.text()).trim().split('\n').slice(1).map(l => l.split(',')).filter(x => x[1] && x[1] !== '.').map(x => ({ d: x[0], v: +x[1] })).filter(x => isFinite(x.v));
    let o = rows;
    if (tr === 'yoy') o = rows.map((x, i) => i >= 12 ? { d: x.d, v: (x.v / rows[i - 12].v - 1) * 100 } : null).filter(Boolean);
    if (tr === 'mom') o = rows.map((x, i) => i ? { d: x.d, v: (x.v / rows[i - 1].v - 1) * 100 } : null).filter(Boolean);
    if (tr === 'diff') o = rows.map((x, i) => i ? { d: x.d, v: x.v - rows[i - 1].v } : null).filter(Boolean);
    o = o.slice(-36).map(x => ({ d: x.d, v: +x.v.toFixed(4) }));
    out.series.push({ id, en, ar, unit, dec, obs: o });
    console.log(id, o.length, o.length ? o[o.length - 1] : '');
  } catch (e) { console.log('failed', id, e.message); }
}
if (!out.series.length) { console.log('nothing fetched, keeping the old file'); process.exit(0); }
if (!existsSync('data')) mkdirSync('data');
const prev = existsSync('data/macro.json') ? JSON.parse(readFileSync('data/macro.json', 'utf8')) : null;
if (prev && JSON.stringify(prev.series) === JSON.stringify(out.series)) { console.log('no change'); process.exit(0); }
writeFileSync('data/macro.json', JSON.stringify(out));
console.log('written');
