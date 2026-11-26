/* ---- dashboard charts (Chart.js, free MIT library, bundled) ---- */
const PAL = ['#1f63d6', '#d9a21b', '#0f2a5c', '#1f9d63', '#d64545', '#2f7bf0', '#e08a1e', '#6b7893', '#8a5bd6', '#16a3a3'];

Chart.defaults.animation = {duration: 700, easing: 'easeOutQuart'};
function chartCard(title, build, hasData, hint) {
  const wrap = h('div', {class: 'chartbox'});
  const card = h('div', {class: 'card'}, h('h3', null, title, h('span', {class: 'sp'}), hint ? h('span', {class: 'sm mut', style: 'font-weight:400'}, T('click to drill down', 'اضغط للتفاصيل')) : null), wrap);
  if (!hasData) { wrap.append(h('div', {class: 'empty'}, T('No data yet', 'لا توجد بيانات'))); return card; }
  const cv = h('canvas'); wrap.append(cv);
  setTimeout(() => { try { build(cv); } catch (e) { console.error(e); wrap.innerHTML = ''; wrap.append(h('div', {class: 'empty'}, T('Chart unavailable', 'تعذر عرض الرسم'))); } }, 0);
  return card;
}
const cOpts = (extra) => Object.assign({responsive: true, maintainAspectRatio: false, plugins: {legend: {position: 'bottom', labels: {boxWidth: 12, font: {family: 'inherit'}}}}}, extra || {});
const pctTip = {callbacks: {label: c => { const t = c.dataset.data.reduce((a, b) => a + b, 0); const v = c.parsed; return ' ' + c.label + ': ' + fmtN(v) + (t ? ' (' + Math.round(v * 100 / t) + '%)' : ''); }}};
function dcCharts(d) {
  const root = h('div');
  const F = {from: '', to: '', st: '', risk: '', com: '', cat: ''};
  const bar0 = h('div', {class: 'cfilters'});
  const inp = (k, type, label) => h('div', null, h('label', null, label), h('input', {type, value: F[k], onchange: e => { F[k] = e.target.value; draw(); }}));
  const selF = (k, label, options) => h('div', null, h('label', null, label), sel(k, options, F[k], e => { F[k] = e.target.value; draw(); }));
  bar0.append(inp('from', 'date', T('Registered from', 'التسجيل من')), inp('to', 'date', T('to', 'إلى')), selF('st', T('Status', 'الحالة'), [['', T('All', 'الكل')], ...opts('status')]), selF('risk', T('Risk', 'الخطورة'), [['', T('All', 'الكل')], ...opts('risk')]), selF('com', T('Commodity', 'السلعة'), [['', T('All', 'الكل')], ...opts('commodity')]), selF('cat', T('Type', 'النوع'), [['', T('All', 'الكل')], ...catOpts()]),
    h('button', {class: 'btn ghost', onclick: () => renderRoute()}, T('Reset', 'إعادة ضبط')));
  const holder = h('div'); const count = h('div', {class: 'sm mut', style: 'margin:0 4px 10px'});
  const go2 = (q) => { location.hash = '#/disputes?' + new URLSearchParams(q).toString(); };
  function draw() {
    holder.querySelectorAll('canvas').forEach(c => { const ch = Chart.getChart(c); ch && ch.destroy(); });
    const disputes = d.disputes.filter(x => (!F.from || x.registration_date >= F.from) && (!F.to || x.registration_date <= F.to) && (!F.st || x.status === F.st) && (!F.risk || x.risk_level === F.risk) && (!F.com || x.commodity === F.com) && (!F.cat || x.category_id === F.cat));
    const ids = new Set(disputes.map(x => x.id)), claims = d.claims.filter(c => ids.has(c.dispute_id)), dls = d.dls.filter(c => ids.has(c.dispute_id));
    const act = disputes.filter(x => !['settled', 'closed'].includes(x.status));
    count.textContent = T('Showing ', 'يعرض ') + disputes.length + T(' of ', ' من ') + d.disputes.length + T(' disputes', ' نزاع');
    holder.innerHTML = ''; holder.append(grid(disputes, claims, dls, act));
  }
  const base = () => { const q = {}; ['from', 'to', 'st', 'risk', 'com', 'cat'].forEach(k => { if (F[k]) q[k] = F[k]; }); return q; };
  function grid(disputes, claims, dls, act) {
    const cnt = (arr, fn) => { const m = {}; arr.forEach(x => { const k = fn(x) || '-'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8); };
    const mon = s => (s || '').slice(0, 7);
    const lbls = e => e.map(x => x[0]), vals = e => e.map(x => x[1]);
    // entries: [label, value, key]
    const status = LBL.status.map(s => [lab('status', s[0]), disputes.filter(x => x.status === s[0]).length, s[0]]).filter(x => x[1] > 0);
    const risk = LBL.risk.map(r => [lab('risk', r[0]), act.filter(x => x.risk_level === r[0]).length, r[0]]).filter(x => x[1] > 0);
    const country = cnt(disputes, x => S.parties.find(p => p.id === counterparty(x))?.country).map(e => [e[0], e[1], e[0]]);
    const commRaw = cnt(disputes, x => x.commodity || null); const comm = commRaw.map(e => [e[0] === '-' ? '-' : lab('commodity', e[0]), e[1], e[0]]);
    const catIds = {}; disputes.forEach(x => { const k = x.category_id || '-'; catIds[k] = (catIds[k] || 0) + 1; });
    const type = Object.entries(catIds).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => [e[0] === '-' ? '-' : catName(e[0]), e[1], e[0]]);
    const arb = ['arb_filed', 'arb_proceedings', 'award', 'enforcement'].map(s => [lab('status', s), disputes.filter(x => x.status === s).length, s]).filter(x => x[1] > 0);
    const regM = {}; disputes.forEach(x => { const k = mon(x.registration_date); if (k) regM[k] = (regM[k] || 0) + 1; });
    const reg = Object.entries(regM).sort();
    const clM = {}, ccM = {}; claims.forEach(c => { const k = mon(c.claim_date); if (!k) return; const m = c.kind === 'claim' ? clM : ccM; m[k] = (m[k] || 0) + c.usd; });
    const months = [...new Set([...Object.keys(clM), ...Object.keys(ccM)])].sort();
    const cur = {}; claims.forEach(c => { cur[c.currency] = (cur[c.currency] || 0) + c.total; }); const curE = Object.entries(cur);
    const dlM = {}; dls.filter(x => x.status === 'open').forEach(x => { const k = mon(x.due_at); if (k) dlM[k] = (dlM[k] || 0) + 1; }); const dlE = Object.entries(dlM).sort();
    const cl = claims.filter(c => c.kind === 'claim'), open = cl.reduce((a, c) => a + Math.max(0, c.usd - c.settled_usd), 0), setl = cl.reduce((a, c) => a + c.settled_usd, 0);
    const clickTo = (e, key, fn) => (ev, els, chart) => { if (!els.length) return; const i = els[0].index; fn(e[i], i, els[0]); };
    const donut = (e, qk, type) => cv => new Chart(cv, {type: type || 'doughnut', data: {labels: lbls(e), datasets: [{data: vals(e), backgroundColor: PAL, hoverOffset: 10}]}, options: cOpts({cutout: type === 'pie' ? 0 : '60%', plugins: {legend: {position: 'bottom'}, tooltip: pctTip}, onClick: clickTo(e, qk, x => go2(Object.assign(base(), {[qk]: x[2]}, qk === 'risk' ? {act: 1} : {})) ), onHover: (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; }})});
    const bar = (e, qk, horiz, lblTxt) => cv => new Chart(cv, {type: 'bar', data: {labels: lbls(e), datasets: [{label: lblTxt || T('Disputes', 'النزاعات'), data: vals(e), backgroundColor: PAL[0], hoverBackgroundColor: PAL[1], borderRadius: 6, maxBarThickness: 48}]}, options: cOpts({indexAxis: horiz ? 'y' : 'x', plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => ' ' + fmtN(c.parsed[horiz ? 'x' : 'y']) + ' (' + Math.round(c.parsed[horiz ? 'x' : 'y'] * 100 / (vals(e).reduce((a, b) => a + b, 0) || 1)) + '%)'}}}, scales: {[horiz ? 'x' : 'y']: {beginAtZero: true, ticks: {precision: 0}}}, onClick: clickTo(e, qk, x => go2(Object.assign(base(), {[qk]: x[2]}))), onHover: (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; }})});
    const line = (e, qk, color, bg, lbl, stepped) => cv => new Chart(cv, {type: 'line', data: {labels: lbls(e), datasets: [{label: lbl, data: vals(e), borderColor: color, backgroundColor: bg, fill: true, tension: stepped ? 0 : .3, stepped: !!stepped, pointRadius: 5, pointHoverRadius: 8}]}, options: cOpts({plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true, ticks: {precision: 0}}}, onClick: clickTo(e, qk, x => go2(Object.assign(base(), {[qk]: x[0]}))), onHover: (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; }})});
    return h('div', {class: 'grid2 charts'},
      chartCard(T('Disputes by status', 'النزاعات حسب المرحلة'), donut(status, 'st'), status.length, 1),
      chartCard(T('Active disputes by risk', 'النزاعات النشطة حسب الخطورة'), donut(risk, 'risk'), risk.length, 1),
      chartCard(T('Disputes by country', 'النزاعات حسب الدولة'), bar(country, 'ctry', true), country.length, 1),
      chartCard(T('Disputes by commodity', 'النزاعات حسب السلعة'), donut(comm, 'com', 'pie'), comm.length, 1),
      chartCard(T('Disputes by type', 'النزاعات حسب النوع'), bar(type, 'cat', false), type.length, 1),
      chartCard(T('Arbitration stages', 'مراحل التحكيم'), bar(arb, 'st', false), arb.length, 1),
      chartCard(T('Disputes registered by month', 'النزاعات المسجلة بالشهر'), line(reg, 'ym', PAL[0], 'rgba(31,99,214,.15)', T('Disputes', 'النزاعات')), reg.length, 1),
      chartCard(T('Claims vs counterclaims by month (USD)', 'المطالبات والمقابلة بالشهر (USD)'), cv => new Chart(cv, {type: 'bar', data: {labels: months, datasets: [{label: T('Claims', 'مطالبات'), data: months.map(m => clM[m] || 0), backgroundColor: PAL[0], borderRadius: 6, maxBarThickness: 48}, {label: T('Counterclaims', 'مطالبات مقابلة'), data: months.map(m => ccM[m] || 0), backgroundColor: PAL[1], borderRadius: 6, maxBarThickness: 48}]}, options: cOpts({scales: {y: {beginAtZero: true}}, interaction: {mode: 'index'}, onClick: (ev, els) => { if (els.length) go2(Object.assign(base(), {cm: months[els[0].index]})); }, onHover: (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; }})}), months.length, 1),
      chartCard(T('Claims: settled vs outstanding (USD)', 'المطالبات: المسدد مقابل المتبقي (USD)'), cv => new Chart(cv, {type: 'doughnut', data: {labels: [T('Settled', 'مسدد'), T('Outstanding', 'متبقي')], datasets: [{data: [setl, open], backgroundColor: [PAL[3], PAL[1]], hoverOffset: 10}]}, options: cOpts({cutout: '60%', plugins: {legend: {position: 'bottom'}, tooltip: pctTip}, onClick: () => { location.hash = '#/fin'; }, onHover: (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; }})}), setl + open > 0, 1),
      chartCard(T('Amounts by currency (original)', 'المبالغ حسب العملة (الأصلية)'), cv => new Chart(cv, {type: 'bar', data: {labels: curE.map(x => x[0]), datasets: [{label: T('Amount', 'المبلغ'), data: curE.map(x => x[1]), backgroundColor: PAL[2], hoverBackgroundColor: PAL[1], borderRadius: 6, maxBarThickness: 60}]}, options: cOpts({plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}, onClick: (ev, els) => { if (els.length) go2(Object.assign(base(), {cur: curE[els[0].index][0]})); }, onHover: (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; }})}), curE.length, 1),
      chartCard(T('Open deadlines by month', 'المواعيد المفتوحة بالشهر'), line(dlE, 'dm', PAL[4], 'rgba(214,69,69,.12)', T('Deadlines', 'المواعيد'), true), dlE.length, 1));
  }
  function build() { draw(); return h('div', null, h('h3', {class: 'sechead'}, '📊 ' + T('Charts', 'الرسوم البيانية')), bar0, count, holder); }
  return (function () { const w = build(); return w; })();
}
