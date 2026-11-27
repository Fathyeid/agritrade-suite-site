/* Poultry dashboard in the owner's mockup layout. Injected by the suite portal into the Poultry frame only
   (the original poultry repo is untouched). It replaces Poultry's global vDash() and uses Poultry's own data and
   calculations (S, calc, lcalc, bal, avgCost, activity, nf, t). Market prices come from the suite Chart API (free Yahoo feed).
   Nothing here writes data; action buttons call Poultry's own actions (data-a). */
(function () {
  if (window.__pdash) return; window.__pdash = 1;
  function ready() { try { return typeof S === 'object' && typeof vDash === 'function' && typeof calc === 'function'; } catch (e) { return false; } }

  var L = {
    ar: { tag: 'أدِر · حلّل · انمُ', sub: 'منصة الدواجن الذكية: القطعان والبياض والمخزون والمبيعات في لوحة واحدة', hello: 'أهلاً', openF: 'القطعان المفتوحة', liveB: 'الطيور الحية', fcr: 'متوسط معامل التحويل', mort: 'النفوق التراكمي', feedT: 'العلف حتى الآن', vsW: 'عن الأسبوع الماضي', livab: 'نسبة الحيوية', newW: 'جديدة هذا الأسبوع', t: 'طن', perf: 'أداء الدواجن', lastN: 'آخر {0} يوم', liveL: 'الطيور الحية', mortL: 'النفوق ٪', layers: 'أداء البياض', ga: 'الدرجة الأولى', gb: 'الدرجة الثانية', cr: 'مكسور', last7: 'آخر ٧ أيام', stock: 'المخزون ومصنع العلف', details: 'التفاصيل', market: 'معلومات السوق', more: 'المزيد', soy: 'فول الصويا CBOT', bu: '/بوشل', key: 'بيانات رئيسية', corn: 'الذرة CBOT', wheat: 'القمح CBOT', meal: 'كسب الصويا CBOT', oil: 'زيت الصويا CBOT', loading: 'جارٍ تحميل الأسعار…', noMk: 'تعذر تحميل الأسعار الآن', port: 'قيمة المخزون', total: 'القيمة الإجمالية', vsM: 'عن الشهر الماضي', acts: 'آخر الأنشطة', all: 'عرض الكل', quick: 'إجراءات سريعة', qRec: 'سجل يومي', qSale: 'تسجيل بيع', qPrices: 'متابعة الأسعار', qRep: 'التقارير', qFlocks: 'إدارة القطعان', qVet: 'بند بيطري', strip: 'إدارة أذكى .. إنتاجية أعلى', noLay: 'لا توجد سجلات بياض في آخر ٧ أيام', noStock: 'لا يوجد مخزون مسجل بعد', noAct: 'لا توجد أنشطة بعد', other: 'أخرى', src: 'المصدر: Yahoo Finance (متأخر)', days: 'يوم' },
    en: { tag: 'Manage · Analyze · Grow', sub: 'Poultry Intelligence: flocks, layers, stock and sales in one dashboard', hello: 'Welcome', openF: 'Open Flocks', liveB: 'Live Birds', fcr: 'Avg FCR', mort: 'Cumulative Mortality', feedT: 'Feed to Date', vsW: 'vs last week', livab: 'livability', newW: 'new this week', t: 't', perf: 'Poultry Performance', lastN: 'Last {0} Days', liveL: 'Live Birds', mortL: 'Mortality %', layers: 'Layers Performance', ga: 'Grade A', gb: 'Grade B', cr: 'Cracked', last7: 'Last 7 days', stock: 'Stock & Feed Mill', details: 'View Details', market: 'Market Intelligence', more: 'View More', soy: 'CBOT Soybeans', bu: '/bu', key: 'Key Data', corn: 'CBOT Corn', wheat: 'CBOT Wheat', meal: 'CBOT Soybean Meal', oil: 'CBOT Soybean Oil', loading: 'Loading prices…', noMk: 'Prices could not be loaded right now', port: 'Stock Value', total: 'Total Value', vsM: 'vs last month', acts: 'Recent Activities', all: 'View All', quick: 'Quick Actions', qRec: 'Daily Record', qSale: 'Record Sale', qPrices: 'Check Prices', qRep: 'View Reports', qFlocks: 'Manage Flocks', qVet: 'Vet Item', strip: 'Smarter Management .. Higher Productivity', noLay: 'No layer records in the last 7 days', noStock: 'No stock recorded yet', noAct: 'No activity yet', other: 'Other', src: 'Source: Yahoo Finance (delayed)', days: 'days' }
  };
  function T(k) { var l = (typeof LANG !== 'undefined' && LANG === 'ar') ? 'ar' : 'en'; var s = L[l][k]; for (var i = 1; i < arguments.length; i++) s = s.replace('{' + (i - 1) + '}', arguments[i]); return s; }
  function AR() { return typeof LANG !== 'undefined' && LANG === 'ar'; }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function N(v, d) { return typeof nf === 'function' ? nf(v, d || 0) : (v == null ? '—' : Number(v).toFixed(d || 0)); }
  function day(n) { return addDays(today(), n); }
  function arrow(v, goodUp) { if (v == null || !isFinite(v)) return ''; var up = v >= 0, good = goodUp ? up : !up; return '<span class="pd-d ' + (good ? 'up' : 'dn') + '" dir="ltr">' + (up ? '↑' : '↓') + ' ' + (up ? '+' : '') + N(v, 1) + '%</span>'; }
  var PER = 30, MKR = '1mo', MK = {};

  function series(days) {
    var d = S.data, out = [];
    for (var i = days - 1; i >= 0; i--) {
      var D = day(-i), live = 0, mort = 0;
      d.flocks.forEach(function (f) {
        if (!f.placed_on || f.placed_on > D) return;
        var recs = d.daily.filter(function (r) { return r.flock_id === f.id && r.rec_date <= D; });
        if (f.status !== 'open' && !recs.some(function (r) { return r.rec_date >= D; })) return;
        var gone = recs.reduce(function (s, r) { return s + Number(r.mortality || 0) + Number(r.culls || 0); }, 0);
        var sold = d.sales.filter(function (s) { return s.flock_id === f.id && s.kind === 'live' && s.sale_date <= D; }).reduce(function (s, x) { return s + Number(x.birds || 0); }, 0)
          + d.slaughter.filter(function (s) { return s.flock_id === f.id && s.slaughter_date <= D; }).reduce(function (s, x) { return s + Number(x.birds_in || 0); }, 0);
        var lv = Number(f.placed_count || 0) - gone - sold; if (lv <= 0) return;
        live += lv; recs.filter(function (r) { return r.rec_date === D; }).forEach(function (r) { mort += Number(r.mortality || 0); });
      });
      out.push([D, live, live ? mort / (live + mort) * 100 : 0]);
    }
    return out;
  }
  function perfChart(ser) {
    var w = 560, h = 230, pl = 44, pr = 44, pt = 26, pb = 30;
    if (!ser.some(function (x) { return x[1] > 0; })) return '<div class="pd-empty">📭 ' + E(typeof t === 'function' ? t('empty_p') : '') + '</div>';
    var mx = Math.max.apply(null, ser.map(function (x) { return x[1]; })) || 1, mm = Math.max(0.5, Math.max.apply(null, ser.map(function (x) { return x[2]; })));
    var n = ser.length, bw = (w - pl - pr) / n, X = function (i) { return pl + bw * (i + .5); }, Y = function (v) { return h - pb - (h - pt - pb) * v / mx; }, Y2 = function (v) { return h - pb - (h - pt - pb) * v / mm; };
    var g = '';
    for (var k = 0; k <= 4; k++) { var y = pt + (h - pt - pb) * k / 4; g += '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y + '" y2="' + y + '" stroke="#eef3fb"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" font-size="10" text-anchor="end" fill="#6b7f99">' + N(mx * (1 - k / 4) / (mx >= 10000 ? 1000 : 1), 0) + (mx >= 10000 ? 'K' : '') + '</text><text x="' + (w - pr + 6) + '" y="' + (y + 4) + '" font-size="10" fill="#6b7f99">' + N(mm * (1 - k / 4), 1) + '%</text>'; }
    var bars = ser.map(function (s, i) { return '<rect x="' + (X(i) - Math.max(1.5, bw * .32)) + '" y="' + Y(s[1]) + '" width="' + Math.max(3, bw * .64) + '" height="' + (h - pb - Y(s[1])) + '" rx="2.5" fill="url(#pdb)"><title>' + s[0] + ': ' + N(s[1]) + '</title></rect>'; }).join('');
    var line = ser.map(function (s, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y2(s[2]).toFixed(1); }).join(' ');
    var dots = ser.map(function (s, i) { return i % Math.ceil(n / 15) ? '' : '<circle cx="' + X(i) + '" cy="' + Y2(s[2]) + '" r="3" fill="#f5b301" stroke="#fff" stroke-width="1.5"/>'; }).join('');
    var lab = ser.map(function (s, i) { return i % Math.ceil(n / 4) ? '' : '<text x="' + X(i) + '" y="' + (h - 8) + '" font-size="10" text-anchor="middle" fill="#6b7f99">' + s[0].slice(5) + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="pd-svg" role="img"><defs><linearGradient id="pdb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b8bff"/><stop offset="1" stop-color="#1d63e8"/></linearGradient></defs>' + g + bars + '<path d="' + line + '" fill="none" stroke="#f5b301" stroke-width="2.5" stroke-linejoin="round"/>' + dots + lab + '</svg>';
  }
  function donut(parts, center, sub) {
    var tot = parts.reduce(function (s, p) { return s + p[1]; }, 0) || 1, r = 52, c = 2 * Math.PI * r, off = 0;
    var arcs = parts.map(function (p) { var len = c * p[1] / tot, a = '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + p[2] + '" stroke-width="18" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 70 70)"/>'; off += len; return a; }).join('');
    return '<svg viewBox="0 0 140 140" class="pd-donut"><circle r="' + r + '" cx="70" cy="70" fill="none" stroke="#eef3fb" stroke-width="18"/>' + arcs + '<text x="70" y="68" text-anchor="middle" font-size="19" font-weight="900" fill="#0b1f4b">' + E(center) + '</text><text x="70" y="88" text-anchor="middle" font-size="11" fill="#0b1f4b">' + E(sub) + '</text></svg>';
  }
  function spark(bars) {
    if (!bars || bars.length < 2) return '';
    var w = 300, h = 86, v = bars.map(function (b) { return b.c; }), mx = Math.max.apply(null, v), mn = Math.min.apply(null, v), rg = (mx - mn) || 1;
    var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (h - 6 - (x - mn) / rg * (h - 14)).toFixed(1); });
    var up = v[v.length - 1] >= v[0], col = up ? '#16a34a' : '#dc2626';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="pd-spark" preserveAspectRatio="none"><defs><linearGradient id="pds" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".25"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs><path d="M0,' + h + ' L' + pts.join(' L') + ' L' + w + ',' + h + 'Z" fill="url(#pds)"/><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.2"/></svg>';
  }
  function matIc(n) { n = String(n || '').toLowerCase(); return /corn|maize|ذرة/.test(n) ? '🌽' : /meal|كسب/.test(n) ? '🟫' : /soy|صويا/.test(n) ? '🫘' : /wheat|قمح/.test(n) ? '🌾' : /oil|زيت/.test(n) ? '🛢️' : /vacc|med|دواء|لقاح/.test(n) ? '💊' : /feed|علف/.test(n) ? '🌾' : '📦'; }
  function balAt(mid, D) { return S.data.moves.filter(function (m) { return m.material_id === mid && m.move_date <= D; }).reduce(function (s, m) { return s + Number(m.qty); }, 0); }

  function marketHtml() {
    var m = MK[MKR];
    if (!m) { loadMk(); return '<div class="pd-empty">' + T('loading') + '</div>'; }
    if (m.err) return '<div class="pd-empty">' + T('noMk') + '</div>';
    var s = m.soy, p = s.price / 100, pc = s.prevClose ? s.price - s.prevClose : null, pp = s.prevClose ? pc / s.prevClose * 100 : null;
    var tabs = [['5d', '1D'], ['1mo', '1M'], ['3mo', '3M'], ['1y', '1Y']].map(function (r) { return '<button class="pd-tab ' + (MKR === r[0] ? 'on' : '') + '" data-pd="mk" data-r="' + r[0] + '">' + r[1] + '</button>'; }).join('');
    var key = (m.key || []).map(function (q) { if (!q || q.error || q.price == null) return ''; var ch = q.prevClose ? (q.price - q.prevClose) / q.prevClose * 100 : null; return '<tr><td>' + E(T(q._k)) + '</td><td class="n" dir="ltr">' + N(q.price, 2) + '</td><td class="n" dir="ltr">' + (ch == null ? '' : '<span class="' + (ch >= 0 ? 'up' : 'dn') + '">' + (ch >= 0 ? '+' : '') + N(ch, 2) + '%</span>') + '</td></tr>'; }).join('');
    return '<div class="pd-mk"><div><div class="pd-mt">' + T('soy') + '</div><div class="pd-mp">$' + N(p, 3) + ' <small>' + T('bu') + '</small></div>' + (pc == null ? '' : '<div class="' + (pc >= 0 ? 'up' : 'dn') + ' pd-mc" dir="ltr">' + (pc >= 0 ? '▲ +' : '▼ ') + N(pc / 100, 3) + ' &nbsp; ' + (pp >= 0 ? '+' : '') + N(pp, 2) + '%</div>') + '</div>' + spark(s.bars) + '</div><div class="pd-tabs">' + tabs + '</div><div class="pd-kt">' + T('key') + '</div><table class="pd-kd noenh">' + key + '</table><div class="pd-src">' + T('src') + '</div>';
  }
  function loadMk() {
    var r = MKR; if (MK[r] && MK[r].loading) return; MK[r] = { loading: true };
    var iv = r === '5d' ? '60m' : (r === '1y' ? '1wk' : '1d');
    Promise.all([fetch('/chart/api/chart?symbol=ZS%3DF&range=' + r + '&interval=' + iv).then(function (x) { return x.json(); }), fetch('/chart/api/quotes?symbols=ZC%3DF,ZW%3DF,ZM%3DF,ZL%3DF').then(function (x) { return x.json(); }).catch(function () { return { quotes: [] }; })])
      .then(function (a) { if (!a[0] || a[0].price == null) throw 0; var ks = ['corn', 'wheat', 'meal', 'oil']; var q = (a[1].quotes || []).map(function (x, i) { if (x) x._k = ks[i]; return x; }); MK[r] = { soy: a[0], key: q }; })
      .catch(function () { MK[r] = { err: 1 }; })
      .then(function () { var b = document.getElementById('pd-mkb'); if (b) b.innerHTML = marketHtml(); });
  }

  function dash() {
    var d = S.data; if (!d || !d.flocks.length) return null;
    var cs = d.flocks.map(calc), op = cs.filter(function (c) { return c.f.status === 'open'; });
    var placed = op.reduce(function (s, c) { return s + Number(c.f.placed_count || 0); }, 0), live = op.reduce(function (s, c) { return s + c.live; }, 0), dead = op.reduce(function (s, c) { return s + c.dead; }, 0);
    var livab = placed ? op.reduce(function (s, c) { return s + c.livab * c.f.placed_count; }, 0) / placed : null;
    var wc = op.filter(function (c) { return c.fcr != null; }), fcr = wc.length ? wc.reduce(function (s, c) { return s + c.fcr * c.live; }, 0) / (wc.reduce(function (s, c) { return s + c.live; }, 0) || 1) : null;
    var feed = op.reduce(function (s, c) { return s + c.feed; }, 0) / 1000;
    var ids = op.map(function (c) { return c.f.id; }), dl = d.daily.filter(function (r) { return ids.indexOf(r.flock_id) > -1; });
    var sum = function (k, a, b) { return dl.filter(function (r) { return r.rec_date > day(a) && r.rec_date <= day(b); }).reduce(function (s, r) { return s + Number(r[k] || 0); }, 0); };
    var f7 = sum('feed_kg', -7, 0), f14 = sum('feed_kg', -14, -7), m7 = sum('mortality', -7, 0), m14 = sum('mortality', -14, -7);
    var newW = op.filter(function (c) { return c.f.placed_on >= day(-7); }).length;
    var ser = series(PER), live7 = ser.length > 7 ? ser[ser.length - 8][1] : null;
    var kp = [
      ['🐔', 'blue', T('openF'), N(op.length), newW ? '<span class="pd-d up">↑ +' + newW + ' ' + T('newW') + '</span>' : '<span class="pd-d mu">' + T('newW') + ': 0</span>'],
      ['🐥', 'green', T('liveB'), N(live), live7 ? arrow((live - live7) / live7 * 100, true) : '<span class="pd-d mu">' + T('livab') + ' <bdi dir="ltr">' + N(livab, 1) + '%</bdi></span>'],
      ['📈', 'blue', T('fcr'), fcr == null ? '—' : N(fcr, 2), '<span class="pd-d mu">' + T('livab') + ' <bdi dir="ltr">' + N(livab, 1) + '%</bdi></span>'],
      ['❤️‍🩹', 'red', T('mort'), placed ? '<bdi dir="ltr">' + N(dead / placed * 100, 2) + '%</bdi>' : '—', m14 ? arrow((m7 - m14) / m14 * 100, false) : ''],
      ['📅', 'gold', T('feedT'), N(feed, 1) + ' <small>' + T('t') + '</small>', f14 ? arrow((f7 - f14) / f14 * 100, true) : '']
    ].map(function (k) { return '<div class="pd-k"><span class="pd-ki pd-' + k[1] + '">' + k[0] + '</span><div><div class="pd-kl">' + k[2] + '</div><div class="pd-kv">' + k[3] + '</div>' + k[4] + '</div></div>'; }).join('');

    var per = [7, 30, 90].map(function (n) { return '<option value="' + n + '"' + (PER === n ? ' selected' : '') + '>' + T('lastN', n) + '</option>'; }).join('');
    var perf = '<div class="pd-card"><div class="pd-hb"><h3>📊 ' + T('perf') + '</h3><select data-pd="per" class="pd-sel">' + per + '</select></div><div class="pd-bd"><div class="pd-lg"><span><i style="background:#1d6ff2"></i>' + T('liveL') + '</span><span><i style="background:#f5b301"></i>' + T('mortL') + '</span></div>' + perfChart(ser) + '</div></div>';

    var lw = d.ldaily ? d.ldaily.filter(function (r) { return r.rec_date > day(-7); }) : [], eg = lw.reduce(function (s, r) { return s + Number(r.eggs_total || 0); }, 0), ecr = lw.reduce(function (s, r) { return s + Number(r.eggs_cracked || 0); }, 0), egb = lw.reduce(function (s, r) { return s + Number(r.eggs_gradeb || 0); }, 0), ega = Math.max(0, eg - ecr - egb);
    var lay = '<div class="pd-card"><div class="pd-hb"><h3>🥚 ' + T('layers') + '</h3><span class="pd-hs">' + T('last7') + '</span></div><div class="pd-bd">' + (eg ? '<div class="pd-don">' + donut([[T('ga'), ega, '#1d6ff2'], [T('gb'), egb, '#f5b301'], [T('cr'), ecr, '#22c55e']], N(ega / eg * 100, 1) + '%', T('ga')) + '<ul class="pd-leg"><li><i style="background:#1d6ff2"></i>' + T('ga') + '<b>' + N(ega / eg * 100, 1) + '%</b></li><li><i style="background:#f5b301"></i>' + T('gb') + '<b>' + N(egb / eg * 100, 1) + '%</b></li><li><i style="background:#22c55e"></i>' + T('cr') + '<b>' + N(ecr / eg * 100, 1) + '%</b></li></ul></div>' : '<div class="pd-empty">🥚 ' + T('noLay') + '</div>') + '</div></div>';

    var mats = d.materials.map(function (m) { var b = bal(m.id); return { m: m, b: b, b7: balAt(m.id, day(-7)) }; }).filter(function (x) { return x.b > 0; }).sort(function (a, b) { return b.b - a.b; }).slice(0, 4);
    var stock = '<div class="pd-card pd-stock"><div class="pd-hb"><h3>🏭 ' + T('stock') + '</h3><a class="pd-lk" data-a="go" data-r="stock">' + T('details') + ' ' + (AR() ? '←' : '→') + '</a></div><div class="pd-bd pd-sb"><div class="pd-sl">' + (mats.length ? mats.map(function (x) { var u = (x.m.unit || 'kg').toLowerCase(), q = u === 'kg' ? x.b / 1000 : x.b, uu = u === 'kg' ? T('t') : E(x.m.unit); return '<div class="pd-si"><span class="pd-sic">' + matIc(x.m.name) + '</span><span class="pd-sn">' + E(x.m.name) + '</span><b>' + N(q, q < 10 ? 1 : 0) + ' ' + uu + '</b>' + (x.b7 > 0 ? arrow((x.b - x.b7) / x.b7 * 100, true) : '<span></span>') + '</div>'; }).join('') : '<div class="pd-empty">📦 ' + T('noStock') + '</div>') + '</div><div class="pd-silo"></div></div></div>';

    var vals = d.materials.map(function (m) { var b = bal(m.id), a = avgCost(m.id); return { n: m.name, v: b > 0 && a != null ? b * a : 0, v30: (function () { var b3 = balAt(m.id, day(-30)); return b3 > 0 && a != null ? b3 * a : 0; })() }; }).filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    var tv = vals.reduce(function (s, x) { return s + x.v; }, 0), tv30 = vals.reduce(function (s, x) { return s + x.v30; }, 0), cols = ['#1d6ff2', '#f5b301', '#22c55e', '#94a3b8'];
    var parts = vals.slice(0, 3).map(function (x, i) { return [x.n, x.v, cols[i]]; }); if (vals.length > 3) parts.push([T('other'), vals.slice(3).reduce(function (s, x) { return s + x.v; }, 0), cols[3]]);
    var big = tv >= 1e6 ? N(tv / 1e6, 2) + 'M' : tv >= 1e3 ? N(tv / 1e3, 1) + 'K' : N(tv, 0);
    var port = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">💰</span>' + T('port') + '</h3></div><div class="pd-bd">' + (tv ? '<div class="pd-don">' + donut(parts, big, T('total')) + '<ul class="pd-leg">' + parts.map(function (p) { return '<li><i style="background:' + p[2] + '"></i>' + E(p[0]) + '<b>' + N(p[1] / tv * 100, 0) + '%</b></li>'; }).join('') + '</ul></div>' + (tv30 ? '<div class="pd-pg"><svg viewBox="0 0 60 30" width="60" height="30"><rect x="2" y="20" width="8" height="8" rx="2" fill="#22c55e"/><rect x="14" y="14" width="8" height="14" rx="2" fill="#22c55e"/><rect x="26" y="9" width="8" height="19" rx="2" fill="#22c55e"/><rect x="38" y="3" width="8" height="25" rx="2" fill="#22c55e"/></svg>' + arrow((tv - tv30) / tv30 * 100, true) + ' <small>' + T('vsM') + '</small></div>' : '') : '<div class="pd-empty">💰 ' + T('noStock') + '</div>') + '</div></div>';

    var ac = (typeof activity === 'function' ? activity() : []).slice(0, 4);
    var acts = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">🕒</span>' + T('acts') + '</h3><a class="pd-lk" data-a="go" data-r="trace">' + T('all') + ' ' + (AR() ? '←' : '→') + '</a></div><div class="pd-bd"><ul class="pd-tl">' + (ac.length ? ac.map(function (a, i) { return '<li><i class="pd-dot" style="background:' + ['#22c55e', '#f5b301', '#1d6ff2', '#8b5cf6'][i % 4] + '"></i><small>' + E(a.dt) + '</small><div>' + a.ic + ' ' + a.tx + '</div></li>'; }).join('') : '<li class="pd-empty">' + T('noAct') + '</li>') + '</ul></div></div>';

    var w = typeof canW === 'function' && canW();
    var qa = (w ? [['m_rec', '📝', T('qRec')], ['m_sale', '🛒', T('qSale')]] : []).map(function (q) { return '<button class="pd-qa" data-a="' + q[0] + '"><span>' + q[1] + '</span>' + q[2] + '</button>'; }).join('')
      + '<button class="pd-qa" data-pd="prices"><span>📊</span>' + T('qPrices') + '</button><button class="pd-qa" data-a="go" data-r="reports"><span>📑</span>' + T('qRep') + '</button><button class="pd-qa" data-a="go" data-r="flocks"><span>🐔</span>' + T('qFlocks') + '</button>' + (w ? '<button class="pd-qa" data-a="m_vet"><span>💉</span>' + T('qVet') + '</button>' : '');
    var quick = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">⚡</span>' + T('quick') + '</h3></div><div class="pd-bd pd-qg">' + qa + '</div></div>';

    var al = typeof allAlerts === 'function' ? allAlerts().length : 0, now = new Date();
    var nm = (S.user && (S.user.name || S.user.email || '')).split('@')[0];
    var hero = '<div class="pd-hero"><div class="pd-ht"><h1>Agritrade <span>Pro</span></h1><p class="pd-hsub">' + T('sub') + '</p><p class="pd-htag">' + T('tag') + '</p><p class="pd-hw">' + T('hello') + '، ' + E(nm) + ' · ' + op.length + ' ' + (typeof t === 'function' ? t('n_flocks') : '') + ' · ' + al + ' ' + (typeof t === 'function' ? t('notif') : '') + '</p></div><div class="pd-date">📅 <b>' + now.toLocaleDateString(AR() ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</b><small>' + now.toLocaleTimeString(AR() ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) + '</small></div></div>';

    return '<div class="pd">' + hero + '<div class="pd-kg">' + kp + '</div><div class="pd-r3">' + perf + lay + stock + '</div><div class="pd-r4"><div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">🌐</span>' + T('market') + '</h3><a class="pd-lk" data-pd="prices">' + T('more') + ' ' + (AR() ? '←' : '→') + '</a></div><div class="pd-bd" id="pd-mkb">' + marketHtml() + '</div></div>' + port + acts + quick + '</div><div class="pd-strip">🏆 <b>' + T('strip') + '</b></div></div>';
  }

  function css() {
    if (document.getElementById('pd-css')) return; var l = document.createElement('link'); l.id = 'pd-css'; l.rel = 'stylesheet'; l.href = '/ds/dash.css?v=202611271740'; document.head.appendChild(l);
  }

  function init() {
    var orig = vDash;
    vDash = function () { try { var h = dash(); if (h) { css(); return h; } } catch (e) { console.error('poultry-dash', e); } return orig(); };
    document.addEventListener('change', function (e) { var s = e.target.closest && e.target.closest('[data-pd=per]'); if (s) { PER = +s.value; draw(); } });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-pd]'); if (!b) return;
      if (b.dataset.pd === 'mk') { MKR = b.dataset.r; var x = document.getElementById('pd-mkb'); if (x) x.innerHTML = marketHtml(); }
      if (b.dataset.pd === 'prices') { try { window.parent.location.hash = '#/chart'; } catch (er) { } }
    });
    try { if (S.route === 'dash' && S.data) draw(); } catch (e) { }
  }
  var tries = 0;
  (function wait() { if (ready()) init(); else if (++tries < 80) setTimeout(wait, 250); })();
})();
