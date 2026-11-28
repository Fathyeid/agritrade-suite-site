/* IOM "Operations Overview" in the owner's first mockup layout. Injected by the suite portal into the IOM frame.
   Uses IOM's own data and helpers (S, PAGE, render, go, stockMap, whStock, batch, com, cust, wh, f2, today) and the
   suite Chart API for CBOT prices. Read-only: buttons call IOM's own functions (newRcv, newSO, go). The original
   overview stays one click away ("Full overview"), nothing is removed. */
(function () {
  if (window.__idash) return; window.__idash = 1;
  var L = {
    ar: { h1sub: 'قرارات أذكى. فرص أكبر.', explore: 'استكشف الأسواق', full: 'العرض التفصيلي الكامل', back: 'العودة للوحة', rev: 'إيرادات هذا الشهر', exp: 'مصروفات هذا الشهر', stockV: 'قيمة المخزون', util: 'استغلال السعة', vsM: 'عن الشهر الماضي', prices: 'أسعار السلع', soy: 'فول الصويا', wheat: 'القمح', corn: 'الذرة', oil: 'زيت الصويا', r1: 'شهر', r3: '٣ أشهر', r6: '٦ أشهر', r12: 'سنة', mkt: 'معلومات السوق', all: 'عرض الكل', open: 'الافتتاح', high: 'الأعلى', low: 'الأدنى', prev: 'الإغلاق السابق', whs: 'المخازن والصوامع', wh: 'المخزن', type: 'النوع', stock: 'المخزون (طن)', quick: 'إجراءات سريعة', qRcv: 'استلام شحنة', qSO: 'أمر بيع', qRep: 'التقارير', qWb: 'الميزان', plan: 'الاستلام والتسليم', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', rcvd: 'مستلم', dlv: 'مُسلَّم', sp: 'المبيعات والمشتريات', recSale: 'أمر بيع', sales: 'المبيعات', purch: 'المشتريات', date: 'التاريخ', custH: 'العميل', supH: 'المورد', prod: 'الصنف', qty: 'الكمية (طن)', amt: 'المبلغ', repA: 'التقارير والتحليلات', viewRep: 'عرض التقارير', totS: 'إجمالي المبيعات', farm: 'إدارة المخازن', manage: 'إدارة المخازن', active: 'نشط', nWh: 'مخازن وصوامع', cap: 'سعة إجمالية (طن)', used: 'نسبة الاستغلال', loading: 'جارٍ تحميل الأسعار…', noMk: 'تعذر تحميل الأسعار الآن', none: 'لا توجد بيانات بعد', src: 'المصدر: Yahoo Finance (متأخر)', test: 'تجريبي', ft: ['بيانات السوق', 'التحليلات والتقارير', 'تركيب الأعلاف', 'المزارع والمخزون', 'الشحن والتسليم', 'العقود والعمليات', 'التتبع الكامل', 'سجل التدقيق'], W: 'أ' },
    en: { h1sub: 'Smarter Decisions. Greater Opportunities.', explore: 'Explore Markets', full: 'Full overview', back: 'Back to dashboard', rev: 'Revenue This Month', exp: 'Expenses This Month', stockV: 'Stock Value', util: 'Capacity Utilization', vsM: 'vs last month', prices: 'Commodity Prices', soy: 'Soybeans', wheat: 'Wheat', corn: 'Corn', oil: 'Soy Oil', r1: '1 Month', r3: '3 Months', r6: '6 Months', r12: '1 Year', mkt: 'Market Intelligence', all: 'See All', open: 'Open', high: 'High', low: 'Low', prev: 'Prev close', whs: 'Warehouses & Silos', wh: 'Warehouse', type: 'Type', stock: 'Stock (MT)', quick: 'Quick Actions', qRcv: 'Receive Cargo', qSO: 'Sales Order', qRep: 'View Reports', qWb: 'Weighbridge', plan: 'Receiving & Delivery', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', rcvd: 'Received', dlv: 'Delivered', sp: 'Sales & Purchase', recSale: 'Sales Order', sales: 'Sales', purch: 'Purchases', date: 'Date', custH: 'Customer', supH: 'Supplier', prod: 'Product', qty: 'Qty (MT)', amt: 'Amount', repA: 'Reports & Analytics', viewRep: 'View Reports', totS: 'Total Sales', farm: 'Storage Management', manage: 'Manage Storage', active: 'Active', nWh: 'Warehouses & silos', cap: 'Total capacity (MT)', used: 'Utilization', loading: 'Loading prices…', noMk: 'Prices could not be loaded right now', none: 'No data yet', src: 'Source: Yahoo Finance (delayed)', test: 'TEST', ft: ['Live Market Data', 'Analytics & Reports', 'Feed Formulation', 'Farm & Stock', 'Logistics & Delivery', 'Contracts & Operations', 'Complete Traceability', 'Audit Trail'], W: 'W' }
  };
  function lg() { var v = localStorage.getItem('iom.lang'); return v === 'en' ? 'en' : 'ar'; }
  function T(k) { return L[lg()][k]; }
  function AR() { return lg() === 'ar'; }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function N(v, d) { return typeof f2 === 'function' ? f2(v, d == null ? 0 : d) : String(v); }
  function arrow(v, goodUp) { if (v == null || !isFinite(v)) return ''; var up = v >= 0, good = goodUp ? up : !up; return '<span class="pd-d ' + (good ? 'up' : 'dn') + '" dir="ltr">' + (up ? '▲ +' : '▼ ') + N(v, 1) + '%</span>'; }
  function mon(k) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + k); return d.toISOString().slice(0, 7); }
  function dAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
  var SYM = { soy: ['ZS=F', 100, '/bu'], wheat: ['ZW=F', 100, '/bu'], corn: ['ZC=F', 100, '/bu'], oil: ['ZL=F', 100, '/lb'] };
  var ST = { c: 'soy', r: '1mo', plan: 'weekly', sp: 'sales', full: false }, MK = {};

  function mainCur() { var m = {}; (S.invoices || []).concat(S.sales || []).forEach(function (x) { if (x.cur) m[x.cur] = (m[x.cur] || 0) + 1; }); var b = 'USD', n = 0; for (var k in m) if (m[k] > n) { n = m[k]; b = k; } return b; }
  function money(v, cur) { return (v >= 1e6 ? N(v / 1e6, 2) + 'M' : v >= 1e4 ? N(v / 1e3, 1) + 'K' : N(v, 0)) + ' <small>' + E(cur) + '</small>'; }
  function soVal(s) { return Number(s.qty || 0) * Number(s.price || 0); }
  function stockValue() { var m = stockMap(), v = 0; for (var k in m) { var b = batch(k.split('|')[1]) || {}; v += m[k] * Number(b.cost || 0); } return v; }

  function ring(p) { var r = 22, c = 2 * Math.PI * r, l = c * Math.max(0, Math.min(100, p || 0)) / 100; return '<svg viewBox="0 0 56 56" width="56" height="56" class="id-ring"><circle r="' + r + '" cx="28" cy="28" fill="none" stroke="#e7eefb" stroke-width="7"/><circle r="' + r + '" cx="28" cy="28" fill="none" stroke="url(#idr)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + l + ' ' + (c - l) + '" transform="rotate(-90 28 28)"/><defs><linearGradient id="idr"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs></svg>'; }
  function lineChart(bars, div) {
    if (!bars || bars.length < 2) return '<div class="pd-empty">' + T('noMk') + '</div>';
    var w = 560, h = 220, pl = 40, pr = 12, pt = 18, pb = 28, v = bars.map(function (b) { return b.c / div; }), mx = Math.max.apply(null, v), mn = Math.min.apply(null, v), pad = (mx - mn) * .12 || 1; mx += pad; mn -= pad;
    var X = function (i) { return pl + (w - pl - pr) * i / (v.length - 1); }, Y = function (x) { return h - pb - (h - pt - pb) * (x - mn) / (mx - mn); };
    var g = ''; for (var k = 0; k <= 4; k++) { var y = pt + (h - pt - pb) * k / 4; g += '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y + '" y2="' + y + '" stroke="#eef3fb"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" font-size="10" text-anchor="end" fill="#6b7f99">' + N(mx - (mx - mn) * k / 4, 2) + '</text>'; }
    var pts = v.map(function (x, i) { return X(i).toFixed(1) + ',' + Y(x).toFixed(1); }), last = v.length - 1;
    var lab = bars.map(function (b, i) { return i % Math.ceil(v.length / 5) ? '' : '<text x="' + X(i) + '" y="' + (h - 8) + '" font-size="10" text-anchor="middle" fill="#6b7f99">' + new Date(b.t * 1000).toISOString().slice(5, 10) + '</text>'; }).join('');
    var ch = (v[last] - v[0]) / v[0] * 100;
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="pd-svg"><defs><linearGradient id="idl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d6ff2" stop-opacity=".22"/><stop offset="1" stop-color="#1d6ff2" stop-opacity="0"/></linearGradient></defs>' + g + '<path d="M' + X(0) + ',' + (h - pb) + ' L' + pts.join(' L') + ' L' + X(last) + ',' + (h - pb) + 'Z" fill="url(#idl)"/><polyline points="' + pts.join(' ') + '" fill="none" stroke="#1d6ff2" stroke-width="2.4" stroke-linejoin="round"/>' + v.map(function (x, i) { return i % Math.ceil(v.length / 12) ? '' : '<circle cx="' + X(i) + '" cy="' + Y(x) + '" r="3" fill="#fff" stroke="#1d6ff2" stroke-width="2"/>'; }).join('') + '<line x1="' + X(last) + '" x2="' + X(last) + '" y1="' + pt + '" y2="' + (h - pb) + '" stroke="#1d6ff2" stroke-dasharray="3 3"/><circle cx="' + X(last) + '" cy="' + Y(v[last]) + '" r="6" fill="#f5b301" stroke="#fff" stroke-width="2"/>' + lab + '</svg><div class="id-tip" dir="ltr"><b>' + new Date(bars[last].t * 1000).toISOString().slice(0, 10) + '</b> ' + N(v[last], 2) + ' <span class="' + (ch >= 0 ? 'up' : 'dn') + '">' + (ch >= 0 ? '▲ +' : '▼ ') + N(ch, 2) + '%</span></div>';
  }
  function spark(bars, div) {
    if (!bars || bars.length < 2) return ''; var w = 300, h = 110, v = bars.map(function (b) { return b.c / div; }), mx = Math.max.apply(null, v), mn = Math.min.apply(null, v), rg = (mx - mn) || 1;
    var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (h - 8 - (x - mn) / rg * (h - 18)).toFixed(1); });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="pd-spark" preserveAspectRatio="none"><defs><linearGradient id="ids" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d6ff2" stop-opacity=".25"/><stop offset="1" stop-color="#1d6ff2" stop-opacity="0"/></linearGradient></defs><path d="M0,' + h + ' L' + pts.join(' L') + ' L' + w + ',' + h + 'Z" fill="url(#ids)"/><polyline points="' + pts.join(' ') + '" fill="none" stroke="#1d6ff2" stroke-width="2.4"/>' + pts.filter(function (p, i) { return i % Math.ceil(v.length / 8) === 0; }).map(function (p) { var q = p.split(','); return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3" fill="#1d6ff2"/>'; }).join('') + '</svg>';
  }
  function load(c, r, cb) {
    var k = c + '|' + r; if (MK[k] && !MK[k].loading) return cb && cb(); if (MK[k] && MK[k].loading) return; MK[k] = { loading: true };
    fetch('/chart/api/chart?symbol=' + encodeURIComponent(SYM[c][0]) + '&range=' + r + '&interval=' + (r === '1y' ? '1wk' : '1d')).then(function (x) { return x.json(); })
      .then(function (d) { if (!d || d.price == null) throw 0; MK[k] = d; }).catch(function () { MK[k] = { err: 1 }; }).then(function () { refreshMk(); });
  }
  function tabs(key, items) { return '<div class="pd-tabs id-tabs">' + items.map(function (x) { return '<button class="pd-tab ' + (ST[key] === x[0] ? 'on' : '') + '" data-id="' + key + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; }
  function pricesBody() { var d = MK[ST.c + '|' + ST.r]; if (!d) { load(ST.c, ST.r); return '<div class="pd-empty">' + T('loading') + '</div>'; } if (d.loading) return '<div class="pd-empty">' + T('loading') + '</div>'; if (d.err) return '<div class="pd-empty">' + T('noMk') + '</div>'; return lineChart(d.bars, SYM[ST.c][1]); }
  function mktBody() {
    var d = MK[ST.c + '|1mo']; if (!d) { load(ST.c, '1mo'); return '<div class="pd-empty">' + T('loading') + '</div>'; } if (d.loading) return '<div class="pd-empty">' + T('loading') + '</div>'; if (d.err) return '<div class="pd-empty">' + T('noMk') + '</div>';
    var div = SYM[ST.c][1], p = d.price / div, pc = d.prevClose ? (d.price - d.prevClose) / d.prevClose * 100 : null, lb = d.bars && d.bars[d.bars.length - 1];
    var img = { soy: 'c_soy', wheat: 'c_wheat', corn: 'c_wheat', oil: 'c_soy' }[ST.c];
    return '<div class="id-mtop"><div class="id-mimg" style="background-image:url(/ds/img/' + img + '.jpg)"></div><div><div class="id-mp" dir="ltr">' + N(p, 3) + '</div><div class="id-mu" dir="ltr">USD' + SYM[ST.c][2] + '</div></div>' + (pc == null ? '' : '<span class="id-chip ' + (pc >= 0 ? 'up' : 'dn') + '" dir="ltr">' + (pc >= 0 ? '▲ +' : '▼ ') + N(pc, 2) + '%</span>') + '</div>' + spark(d.bars, div) + '<div class="id-ct">CBOT · ' + E(d.name || SYM[ST.c][0]) + '</div><table class="id-ohl noenh"><tr><td>' + T('open') + '</td><td dir="ltr">' + (lb ? N(lb.o / div, 3) : '—') + '</td><td>' + T('high') + '</td><td dir="ltr">' + (d.dayHigh != null ? N(d.dayHigh / div, 3) : '—') + '</td></tr><tr><td>' + T('low') + '</td><td dir="ltr">' + (d.dayLow != null ? N(d.dayLow / div, 3) : '—') + '</td><td>' + T('prev') + '</td><td dir="ltr">' + (d.prevClose != null ? N(d.prevClose / div, 3) : '—') + '</td></tr></table><div class="pd-src">' + T('src') + '</div>';
  }
  function refreshMk() { var a = document.getElementById('id-prb'); if (a) a.innerHTML = pricesBody(); var b = document.getElementById('id-mkb'); if (b) b.innerHTML = mktBody(); }

  function planBody() {
    var buckets = [], lab = [];
    if (ST.plan === 'daily') for (var i = 6; i >= 0; i--) { var d = dAgo(i); buckets.push([d, d]); lab.push(d.slice(8)); }
    else if (ST.plan === 'weekly') for (var j = 3; j >= 0; j--) { buckets.push([dAgo(j * 7 + 6), dAgo(j * 7)]); lab.push(T('W') + (4 - j)); }
    else for (var m = 5; m >= 0; m--) { var mm = mon(-m); buckets.push([mm + '-01', mm + '-31']); lab.push(mm.slice(5)); }
    var rc = buckets.map(function (b) { return (S.receipts || []).filter(function (r) { return r.status === 'approved' && r.date >= b[0] && r.date <= b[1]; }).reduce(function (s, r) { return s + Number(r.rec || 0); }, 0); });
    var dl = buckets.map(function (b) { return (S.deliveries || []).filter(function (r) { return r.status === 'approved' && r.date >= b[0] && r.date <= b[1]; }).reduce(function (s, r) { return s + Number(r.delivered || 0); }, 0); });
    var mx = Math.max.apply(null, rc.concat(dl)) || 1, w = 320, h = 170, pl = 38, pb = 24, bw = (w - pl - 8) / buckets.length;
    var g = ''; for (var k = 0; k <= 3; k++) { var y = 10 + (h - pb - 10) * k / 3; g += '<line x1="' + pl + '" x2="' + w + '" y1="' + y + '" y2="' + y + '" stroke="#eef3fb"/><text x="' + (pl - 5) + '" y="' + (y + 4) + '" font-size="9" text-anchor="end" fill="#6b7f99">' + N(mx * (1 - k / 3), 0) + '</text>'; }
    var bars = buckets.map(function (b, i) { var x = pl + bw * i + bw * .18, hh = function (v) { return (h - pb - 10) * v / mx; }; return '<rect x="' + x + '" y="' + (h - pb - hh(rc[i])) + '" width="' + bw * .3 + '" height="' + hh(rc[i]) + '" rx="3" fill="#9cc2ff"><title>' + T('rcvd') + ': ' + N(rc[i]) + '</title></rect><rect x="' + (x + bw * .33) + '" y="' + (h - pb - hh(dl[i])) + '" width="' + bw * .3 + '" height="' + hh(dl[i]) + '" rx="3" fill="#1d63e8"><title>' + T('dlv') + ': ' + N(dl[i]) + '</title></rect><text x="' + (pl + bw * (i + .5)) + '" y="' + (h - 7) + '" font-size="10" text-anchor="middle" fill="#0b1f4b" font-weight="700">' + lab[i] + '</text>'; }).join('');
    return tabs('plan', [['daily', T('daily')], ['weekly', T('weekly')], ['monthly', T('monthly')]]) + '<div class="pd-lg"><span><i style="background:#9cc2ff"></i>' + T('rcvd') + '</span><span><i style="background:#1d63e8"></i>' + T('dlv') + '</span></div><svg viewBox="0 0 ' + w + ' ' + h + '" class="pd-svg">' + g + bars + '</svg>';
  }
  function spBody() {
    var rows;
    if (ST.sp === 'sales') rows = (S.sales || []).filter(function (s) { return s.status !== 'draft'; }).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 4).map(function (s) { return [s.date, (cust(s.cust) || {}).name || '', (com(s.c) || {}).name || '', N(s.qty, 0), N(soVal(s), 0) + ' ' + E(s.cur || '')]; });
    else rows = (S.receipts || []).filter(function (r) { return r.status !== 'draft'; }).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 4).map(function (r) { return [r.date, r.supplier || '', (com(r.c) || {}).name || '', N(r.rec || r.dis, 0), r.cost != null ? N(Number(r.cost) * Number(r.rec || 0), 0) : '—']; });
    return tabs('sp', [['sales', T('sales')], ['purch', T('purch')]]) + (rows.length ? '<div class="id-tw"><table class="id-t noenh"><thead><tr><th>' + T('date') + '</th><th>' + (ST.sp === 'sales' ? T('custH') : T('supH')) + '</th><th>' + T('prod') + '</th><th>' + T('qty') + '</th><th>' + T('amt') + '</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i >= 3 ? ' dir="ltr" class="n"' : '') + '>' + E(c).replace(/&lt;small&gt;|&lt;\/small&gt;/g, '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="pd-empty">' + T('none') + '</div>');
  }
  function donut(parts, center, sub) {
    var tot = parts.reduce(function (s, p) { return s + p[1]; }, 0) || 1, r = 52, c = 2 * Math.PI * r, off = 0;
    return '<svg viewBox="0 0 140 140" class="pd-donut"><circle r="' + r + '" cx="70" cy="70" fill="none" stroke="#eef3fb" stroke-width="18"/>' + parts.map(function (p) { var len = c * p[1] / tot, a = '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + p[2] + '" stroke-width="18" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 70 70)"/>'; off += len; return a; }).join('') + '<text x="70" y="68" text-anchor="middle" font-size="17" font-weight="900" fill="#0b1f4b">' + E(center) + '</text><text x="70" y="88" text-anchor="middle" font-size="11" fill="#0b1f4b">' + E(sub) + '</text></svg>';
  }

  function dash() {
    var cur = mainCur(), m0 = mon(0), m1 = mon(-1);
    var inv = function (mm) { return (S.invoices || []).filter(function (i) { return i.cur === cur && String(i.date || '').slice(0, 7) === mm; }).reduce(function (s, i) { return s + Number(i.total || 0); }, 0); };
    var ex = function (mm) { return (S.expenses || []).filter(function (x) { return x.status !== 'reversed' && x.cur === cur && String(x.date || '').slice(0, 7) === mm; }).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0); };
    var r0 = inv(m0), r1 = inv(m1), e0 = ex(m0), e1 = ex(m1), sv = stockValue(), m = stockMap();
    var cap = (S.warehouses || []).reduce(function (s, w) { return s + Number(w.cap || 0); }, 0), used = Object.keys(m).reduce(function (s, k) { return s + Math.max(0, m[k]); }, 0), up = cap ? used / cap * 100 : null;
    var kp = '<div class="id-kg">'
      + '<div class="pd-k"><span class="id-ki">🌾</span><div><div class="pd-kv">' + money(r0, cur) + '</div><div class="pd-kl">' + T('rev') + '</div>' + (r1 ? arrow((r0 - r1) / r1 * 100, true) : '') + '</div></div>'
      + '<div class="pd-k"><span class="id-ki">🚢</span><div><div class="pd-kv">' + money(e0, cur) + '</div><div class="pd-kl">' + T('exp') + '</div>' + (e1 ? arrow((e0 - e1) / e1 * 100, false) : '') + '</div></div>'
      + '<div class="pd-k"><span class="id-ki">🪙</span><div><div class="pd-kv">' + money(sv, cur) + '</div><div class="pd-kl">' + T('stockV') + '</div><span class="pd-d mu" dir="ltr">' + N(used) + ' MT</span></div></div>'
      + '<div class="pd-k"><span class="id-ki">📊</span><div><div class="pd-kv" dir="ltr">' + (up == null ? '—' : N(up, 1) + '%') + '</div><div class="pd-kl">' + T('util') + '</div></div>' + ring(up) + '</div></div>';
    var hero = '<div class="pd-hero id-hero"><div class="pd-ht"><h1>Agritrade <span>Pro</span></h1><p class="pd-hsub id-h2">' + T('h1sub') + '</p><button class="id-cta" data-id="explore">' + T('explore') + ' ' + (AR() ? '←' : '→') + '</button></div><button class="id-full" data-id="full">' + T('full') + '</button></div>';
    var prices = '<div class="pd-card"><div class="pd-wh"><h3>' + T('prices') + '</h3>' + tabs('c', [['soy', T('soy')], ['wheat', T('wheat')], ['corn', T('corn')], ['oil', T('oil')]]) + '<select class="pd-sel id-sel" data-id="r">' + [['1mo', T('r1')], ['3mo', T('r3')], ['6mo', T('r6')], ['1y', T('r12')]].map(function (o) { return '<option value="' + o[0] + '"' + (ST.r === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div><div class="pd-bd" id="id-prb">' + pricesBody() + '</div></div>';
    var whs = (S.warehouses || []).map(function (w) { return { w: w, v: whStock(w.id, m) }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
    var whT = '<div class="pd-card"><div class="pd-wh"><h3>' + T('whs') + '</h3><button class="id-btn" data-go="warehouses">' + T('all') + ' ' + (AR() ? '←' : '→') + '</button></div><div class="pd-bd">' + (whs.length ? '<div class="id-tw"><table class="id-t noenh"><thead><tr><th>' + T('wh') + '</th><th>' + T('type') + '</th><th>' + T('stock') + '</th></tr></thead><tbody>' + whs.map(function (x) { return '<tr><td><b>' + E(x.w.code) + '</b></td><td>' + (x.w.demo ? '<span class="id-test">' + T('test') + '</span> ' : '') + E(x.w.type) + '</td><td class="n" dir="ltr">' + N(x.v, 0) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="pd-empty">' + T('none') + '</div>') + '</div></div>';
    var mkt = '<div class="pd-card id-mk"><div class="pd-wh"><h3>' + T('mkt') + '</h3><button class="id-btn" data-id="explore">' + T('all') + ' ' + (AR() ? '←' : '→') + '</button></div>' + tabs('c', [['soy', T('soy')], ['wheat', T('wheat')], ['corn', T('corn')], ['oil', T('oil')]]) + '<div class="pd-bd" id="id-mkb">' + mktBody() + '</div></div>';
    var quick = '<div class="pd-card"><div class="pd-wh"><h3>' + T('quick') + '</h3></div><div class="pd-bd id-qg">' + [['newRcv', '🚛', T('qRcv')], ['newSO', '🛒', T('qSO')], ['go:reports', '📊', T('qRep')], ['go:weighbridge', '⚖️', T('qWb')]].filter(function (q) { return q[0].indexOf('go:') === 0 || typeof window[q[0]] === 'function'; }).map(function (q) { return '<button class="pd-qa" data-act="' + q[0] + '"><span>' + q[1] + '</span>' + q[2] + '</button>'; }).join('') + '</div></div>';
    var plan = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">🗓️</span>' + T('plan') + '</h3><button class="id-btn" data-go="receiving">' + T('all') + ' ' + (AR() ? '←' : '→') + '</button></div><div class="pd-bd" id="id-plb">' + planBody() + '</div></div>';
    var sp = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">🤝</span>' + T('sp') + '</h3>' + (typeof window.newSO === 'function' ? '<button class="id-btn" data-act="newSO">' + T('recSale') + ' ' + (AR() ? '←' : '→') + '</button>' : '') + '</div><div class="pd-bd" id="id-spb">' + spBody() + '</div></div>';
    var byC = {}; (S.sales || []).filter(function (s) { return s.status !== 'draft' && s.cur === cur; }).forEach(function (s) { var n = (com(s.c) || {}).name || '?'; byC[n] = (byC[n] || 0) + soVal(s); });
    var arr = Object.keys(byC).map(function (k) { return [k, byC[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), tot = arr.reduce(function (s, x) { return s + x[1]; }, 0), cols = ['#1d6ff2', '#f5b301', '#22c55e', '#94a3b8'];
    var parts = arr.slice(0, 3).map(function (x, i) { return [x[0], x[1], cols[i]]; }); if (arr.length > 3) parts.push([AR() ? 'أخرى' : 'Other', arr.slice(3).reduce(function (s, x) { return s + x[1]; }, 0), cols[3]]);
    var ms = []; for (var q = 11; q >= 0; q--) { var mm = mon(-q); ms.push((S.sales || []).filter(function (s) { return s.status !== 'draft' && s.cur === cur && String(s.date || '').slice(0, 7) === mm; }).reduce(function (s, x) { return s + soVal(x); }, 0)); }
    var mmx = Math.max.apply(null, ms) || 1;
    var rep = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">📈</span>' + T('repA') + '</h3><button class="id-btn" data-go="reports">' + T('viewRep') + ' ' + (AR() ? '←' : '→') + '</button></div><div class="pd-bd">' + (tot ? '<div class="pd-don">' + donut(parts, (tot >= 1e6 ? N(tot / 1e6, 2) + 'M' : tot >= 1e3 ? N(tot / 1e3, 0) + 'K' : N(tot)) + ' ' + cur, T('totS')) + '<ul class="pd-leg">' + parts.map(function (p) { return '<li><i style="background:' + p[2] + '"></i>' + E(p[0]) + '<b dir="ltr">' + N(p[1] / tot * 100, 0) + '%</b></li>'; }).join('') + '</ul></div>' : '<div class="pd-empty">' + T('none') + '</div>') + '<div class="id-mb">' + ms.map(function (v) { return '<i style="height:' + Math.max(3, v / mmx * 100) + '%"></i>'; }).join('') + '</div></div></div>';
    var farm = '<div class="pd-card"><div class="pd-wh"><h3><span class="pd-hi">🏭</span>' + T('farm') + '</h3><button class="id-btn" data-go="warehouses">' + T('manage') + ' ' + (AR() ? '←' : '→') + '</button></div><div class="pd-bd id-farm"><div class="id-fimg"></div><div><b class="id-fn">' + E(((S.warehouses || [])[0] || {}).factory || T('farm')) + '</b><span class="id-act">● ' + T('active') + '</span><ul class="id-fl"><li>🏬 <b dir="ltr">' + N((S.warehouses || []).length) + '</b> ' + T('nWh') + '</li><li>📦 <b dir="ltr">' + N(cap) + '</b> ' + T('cap') + '</li><li>⏱️ <b dir="ltr">' + (up == null ? '—' : N(up, 1) + '%') + '</b> ' + T('used') + '</li></ul></div></div></div>';
    var FT = [['🌐', 'p:chart'], ['📈', 'reports'], ['🧮', 'p:feed'], ['🏠', 'inventory'], ['🚚', 'dispatch'], ['📄', 'p:dispute'], ['🔎', 'trace'], ['🛡️', 'audit']];
    var ft = '<div class="id-ft">' + FT.map(function (f, i) { return '<button class="ftb" data-ft="' + f[1] + '"><span class="fti">' + f[0] + '</span><span>' + T('ft')[i] + '</span></button>'; }).join('') + '</div>';
    return '<div class="pd id">' + '<div class="id-top"><div class="id-left">' + hero + kp + '<div class="id-r2">' + prices + whT + '</div></div><div class="id-right">' + mkt + quick + '</div></div><div class="pd-r4">' + plan + sp + rep + farm + '</div>' + ft + '</div>';
  }

  function css() { if (document.getElementById('pd-css')) return; var l = document.createElement('link'); l.id = 'pd-css'; l.rel = 'stylesheet'; l.href = '/ds/dash.css?v=202611281518'; document.head.appendChild(l); }
  function ready() { try { return typeof S === 'object' && typeof render === 'function' && typeof stockMap === 'function' && typeof PAGE !== 'undefined'; } catch (e) { return false; } }
  function paint() {
    try { if (PAGE !== 'overview' || ST.full) return; var v = document.getElementById('view'); if (!v) return; css(); var demo = v.querySelector('.demo'); v.innerHTML = (demo ? demo.outerHTML : '') + dash(); }
    catch (e) { console.error('iom-dash', e); }
  }
  function init() {
    var orig = render;
    render = function () { orig.apply(this, arguments); paint(); if (PAGE === 'overview' && ST.full) { var v = document.getElementById('view'); if (v && !v.querySelector('.id-back')) { var b = document.createElement('button'); b.className = 'id-full id-back'; b.textContent = T('back'); b.onclick = function () { ST.full = false; render(); }; v.insertBefore(b, v.firstChild); } } };
    document.addEventListener('change', function (e) { var s = e.target.closest && e.target.closest('[data-id=r]'); if (s) { ST.r = s.value; var a = document.getElementById('id-prb'); if (a) a.innerHTML = pricesBody(); } });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-id],[data-act],[data-go],[data-ft]'); if (!b || !b.closest('.id')) return;
      if (b.dataset.go) { go(b.dataset.go); return; }
      if (b.dataset.ft) { var f = b.dataset.ft; if (f.indexOf('p:') === 0) { try { window.parent.location.hash = '#/' + f.slice(2); } catch (er) { } } else go(f); return; }
      if (b.dataset.act) { var a = b.dataset.act; if (a.indexOf('go:') === 0) go(a.slice(3)); else if (typeof window[a] === 'function') window[a](); return; }
      var k = b.dataset.id;
      if (k === 'explore') { try { window.parent.location.hash = '#/chart'; } catch (er) { } }
      else if (k === 'full') { ST.full = true; render(); }
      else if (k === 'c') { ST.c = b.dataset.v; document.querySelectorAll('.id [data-id=c]').forEach(function (x) { x.classList.toggle('on', x.dataset.v === ST.c); }); refreshMk(); }
      else if (k === 'plan') { ST.plan = b.dataset.v; document.getElementById('id-plb').innerHTML = planBody(); }
      else if (k === 'sp') { ST.sp = b.dataset.v; document.getElementById('id-spb').innerHTML = spBody(); }
    });
    if (PAGE === 'overview') render();
  }
  var tries = 0;
  (function wait() { if (ready()) init(); else if (++tries < 80) setTimeout(wait, 250); })();
})();
