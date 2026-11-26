/* ===== pages ===== */
const sel = (name, options, val, onch) => { const s = h('select', {name, onchange: onch}, options.map(o => h('option', {value: o[0]}, o[1]))); s.value = val ?? ''; return s; };
const tbl = (cols, rows, onrow) => {
  if (!rows.length) return h('div', {class: 'empty'}, T('No records yet', 'لا توجد سجلات بعد'));
  return h('div', {class: 'tw'}, h('table', null, h('thead', null, h('tr', null, cols.map(c => h('th', null, c[0])))),
    h('tbody', null, rows.map(r => h('tr', {class: onrow ? 'click' : '', onclick: onrow ? () => onrow(r) : null}, cols.map(c => h('td', null, c[1](r))))))));
};
const bars = (items, fmt) => { const max = Math.max(1, ...items.map(i => i[1])); return items.length ? h('div', {class: 'bars'}, items.map(i => h('div', {class: 'row'}, h('div', {class: 'n', title: i[0]}, i[0]), h('div', {class: 'b'}, h('i', {style: `width:${Math.max(3, i[1] / max * 100)}%`})), h('div', {class: 'c'}, fmt ? fmt(i[1]) : i[1])))) : h('div', {class: 'empty'}, T('No data', 'لا توجد بيانات')); };
const kpi = (l, v, c) => h('div', {class: 'kpi ' + (c || '')}, h('div', {class: 'l'}, l), h('div', {class: 'v'}, v));
const head = (title, sub, ...acts) => h('div', {class: 'ph'}, h('div', null, h('h1', null, title), sub ? h('div', {class: 'sub'}, sub) : null), h('div', {class: 'sp'}), acts);
const counterparty = d => d.our_side === 'respondent' ? d.claimant_id : d.respondent_id;

async function loadAll() {
  const [disputes, claims, items, dls] = await Promise.all([
    Q(sb.from('dc_disputes').select('*').order('created_at', {ascending: false})),
    Q(sb.from('dc_claims').select('*')), Q(sb.from('dc_claim_items').select('claim_id,amount')),
    Q(sb.from('dc_deadlines').select('*').order('due_at'))]);
  const tot = {}; items.forEach(i => tot[i.claim_id] = (tot[i.claim_id] || 0) + Number(i.amount));
  claims.forEach(c => { c.total = tot[c.id] || 0; c.usd = c.total * Number(c.fx_to_usd); c.settled_usd = Number(c.settled_amount || 0) * Number(c.fx_to_usd); });
  return {disputes, claims, dls};
}
function suggestRisk(d, claims, dls) {
  let s = 0; const f = [];
  const v = claims.filter(c => c.dispute_id === d.id).reduce((a, c) => a + c.usd, 0);
  if (v > 1e6) { s += 3; f.push('value>1M'); } else if (v > 2.5e5) { s += 2; f.push('value>250k'); } else if (v > 5e4) { s += 1; f.push('value>50k'); }
  if (['high', 'critical'].includes(d.priority)) { s += 1; f.push('priority'); }
  const od = dls.filter(x => x.dispute_id === d.id && x.status === 'open' && new Date(x.due_at) < new Date()).length;
  if (od) { s += 2; f.push('overdue deadline'); }
  return {level: s >= 5 ? 'critical' : s >= 3 ? 'high' : s >= 1 ? 'medium' : 'low', factors: f};
}

/* ---- dashboard ---- */
PAGES.dashboard = async () => {
  const {disputes, claims, dls} = await loadAll();
  const hist = await Q(sb.from('dc_status_history').select('dispute_id,to_status,at'));
  const act = disputes.filter(d => !['settled', 'closed'].includes(d.status));
  const cnt = st => disputes.filter(d => st.includes(d.status)).length;
  const open = dls.filter(x => x.status === 'open'), now = new Date();
  const overdue = open.filter(x => new Date(x.due_at) < now), upcoming = open.filter(x => { const t = new Date(x.due_at); return t >= now && t - now <= 30 * 864e5; });
  const sum = (arr) => arr.reduce((a, c) => a + c.usd, 0);
  const cl = claims.filter(c => c.kind === 'claim'), cc = claims.filter(c => c.kind === 'counterclaim');
  const actIds = new Set(act.map(d => d.id));
  const exposure = cc.filter(c => actIds.has(c.dispute_id)).reduce((a, c) => a + Math.max(0, c.usd - c.settled_usd), 0);
  const closed = disputes.filter(d => d.closed_at);
  const avg = closed.length ? Math.round(closed.reduce((a, d) => a + daysBetween(d.registration_date, d.closed_at), 0) / closed.length) : null;
  const by = (fn) => { const m = {}; disputes.forEach(d => { const k = fn(d) || '-'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8); };
  const byMonth = {}; claims.filter(c => c.kind === 'claim').forEach(c => { const k = (c.claim_date || '').slice(0, 7); if (k) byMonth[k] = (byMonth[k] || 0) + c.usd; });
  const exp = {}; claims.forEach(c => { exp[c.currency] = (exp[c.currency] || 0) + c.total; });
  const riskCnt = r => act.filter(d => d.risk_level === r).length;
  return h('div', null,
    head(T('Dispute Dashboard', 'لوحة النزاعات'), T('Legal and commercial position of all registered disputes', 'الوضع القانوني والتجاري لجميع النزاعات المسجلة'), can.dispute() ? h('a', {class: 'btn gold', href: '#/new'}, '＋ ' + T('Register New Dispute', 'تسجيل نزاع جديد')) : null),
    h('div', {class: 'kpis'},
      kpi(T('Total Disputes', 'إجمالي النزاعات'), disputes.length), kpi(T('Active Disputes', 'النزاعات النشطة'), act.length, 'g'),
      kpi(T('Pending Disputes', 'نزاعات معلقة'), cnt(['new', 'investigation'])), kpi(T('Under Arbitration', 'تحت التحكيم'), cnt(['arb_filed', 'arb_proceedings'])),
      kpi(T('Under Negotiation', 'تحت التفاوض'), cnt(['negotiation'])), kpi(T('Settled', 'تمت التسوية'), cnt(['settled']), 'ok'), kpi(T('Closed', 'مغلقة'), cnt(['closed']), 'ok'),
      kpi(T('Pending Legal Actions', 'إجراءات قانونية معلقة'), open.length), kpi(T('Upcoming Deadlines (30d)', 'مواعيد قادمة (30 يوم)'), upcoming.length, 'g'), kpi(T('Overdue Legal Deadlines', 'مواعيد متأخرة'), overdue.length, 'r'),
      kpi(T('Total Claims (USD)', 'قيمة المطالبات (USD)'), usd(sum(cl))), kpi(T('Total Counterclaims (USD)', 'المطالبات المقابلة (USD)'), usd(sum(cc))),
      kpi(T('Potential Financial Exposure', 'التعرض المالي المحتمل'), usd(exposure), 'r')),
    h('div', {class: 'note'}, T('Exposure = open counterclaims on active disputes minus amounts settled, in USD at the exchange rate recorded on each claim. Pending = newly registered or under investigation.', 'التعرض = المطالبات المقابلة المفتوحة على النزاعات النشطة بعد خصم المبالغ المسددة، بالدولار بسعر الصرف المسجل على كل مطالبة. المعلق = تم التسجيل أو قيد التحقيق.')),
    dcCharts({disputes, claims, dls, act}),
    h('div', {class: 'grid2'},
      h('div', {class: 'card'}, h('h3', null, T('Dispute Status Overview', 'المراحل')), bars(LBL.status.map(s => [lab('status', s[0]), disputes.filter(d => d.status === s[0]).length]).filter(x => x[1] > 0))),
      h('div', {class: 'card'}, h('h3', null, T('Risk Monitoring (active)', 'مراقبة الخطورة (النشطة)')), h('div', {class: 'kpis', style: 'margin:0'}, LBL.risk.map(r => kpi(lab('risk', r[0]), riskCnt(r[0]), r[0] === 'low' ? 'ok' : r[0] === 'medium' ? 'g' : 'r'))),
        h('div', {class: 'sm mut', style: 'margin-top:8px'}, T('Risk level is set by the legal team. A suggested level (value, priority, overdue deadlines) is shown on each dispute.', 'مستوى الخطورة يحدده الفريق القانوني. يظهر مستوى مقترح (القيمة والأولوية والمواعيد المتأخرة) في كل نزاع.'))),
      h('div', {class: 'card'}, h('h3', null, T('Disputes by Country (counterparty)', 'النزاعات حسب الدولة (الطرف الآخر)')), bars(by(d => S.parties.find(p => p.id === counterparty(d))?.country))),
      h('div', {class: 'card'}, h('h3', null, T('Disputes by Commodity', 'النزاعات حسب السلعة')), bars(by(d => d.commodity ? lab('commodity', d.commodity) : null))),
      h('div', {class: 'card'}, h('h3', null, T('Disputes by Supplier / Counterparty', 'النزاعات حسب المورد / الطرف الآخر')), bars(by(d => partyName(counterparty(d))))),
      h('div', {class: 'card'}, h('h3', null, T('Disputes by Type', 'النزاعات حسب النوع')), bars(by(d => d.category_id ? catName(d.category_id) : null))),
      h('div', {class: 'card'}, h('h3', null, T('Claims Value by Month (USD)', 'قيمة المطالبات بالشهر (USD)')), bars(Object.entries(byMonth).sort().map(x => [x[0], x[1]]), usd)),
      h('div', {class: 'card'}, h('h3', null, T('Arbitration Status Distribution', 'توزيع حالات التحكيم')), bars(['arb_filed', 'arb_proceedings', 'award', 'enforcement'].map(s => [lab('status', s), cnt([s])]).filter(x => x[1] > 0))),
      h('div', {class: 'card'}, h('h3', null, T('Average Resolution Time', 'متوسط مدة الحسم')), h('div', {class: 'kpi ok'}, h('div', {class: 'v'}, avg == null ? '-' : avg + ' ' + T('days', 'يوم')), h('div', {class: 'l'}, T('Registration to settled/closed, ', 'من التسجيل إلى التسوية/الإغلاق، ') + closed.length + T(' disputes', ' نزاع')))),
      h('div', {class: 'card'}, h('h3', null, T('Currency Exposure (original amounts)', 'التعرض بالعملات (المبالغ الأصلية)')), bars(Object.entries(exp).map(x => [x[0], x[1]]), v => fmtN(v)))),
    h('div', {class: 'card'}, h('h3', null, T('Next deadlines', 'أقرب المواعيد')), tbl([[T('Due', 'الموعد'), r => fmtDT(r.due_at)], [T('Deadline', 'الموعد النهائي'), r => r.title], [T('Dispute', 'النزاع'), r => disputes.find(d => d.id === r.dispute_id)?.ref_no || '-']], open.slice(0, 6), r => go('calendar'))));
};

/* ---- all disputes ---- */
PAGES.disputes = async () => {
  const {disputes, claims, dls} = await loadAll();
  const Qp = k => route.q.get(k) || '';
  let f = {q: Qp('q'), st: Qp('st'), risk: Qp('risk'), cat: Qp('cat'), com: Qp('com'), ctry: Qp('ctry'), ym: Qp('ym'), cm: Qp('cm'), dm: Qp('dm'), cur: Qp('cur'), from: Qp('from'), to: Qp('to'), act: Qp('act')};
  const xf = d => (!f.com || d.commodity === f.com || (f.com === '-' && !d.commodity)) && (!f.ctry || ((S.parties.find(p => p.id === counterparty(d))?.country) || '-') === f.ctry) && (!f.ym || (d.registration_date || '').slice(0, 7) === f.ym) && (!f.cm || claims.some(c => c.dispute_id === d.id && (c.claim_date || '').slice(0, 7) === f.cm)) && (!f.dm || dls.some(x => x.dispute_id === d.id && x.status === 'open' && (x.due_at || '').slice(0, 7) === f.dm)) && (!f.cur || claims.some(c => c.dispute_id === d.id && c.currency === f.cur)) && (!f.from || d.registration_date >= f.from) && (!f.to || d.registration_date <= f.to) && (!f.act || !['settled', 'closed'].includes(d.status));
  const box = h('div');
  const draw = () => {
    const rows = disputes.filter(d => (!f.q || (d.ref_no + d.title + (d.description || '')).toLowerCase().includes(f.q.toLowerCase())) && (!f.st || d.status === f.st) && (!f.risk || d.risk_level === f.risk) && (!f.cat || d.category_id === f.cat) && xf(d));
    box.innerHTML = ''; box.append(tbl([[T('Ref', 'المرجع'), r => r.ref_no], [T('Title', 'العنوان'), r => h('b', null, r.title)], [T('Type', 'النوع'), r => catName(r.category_id)], [T('Counterparty', 'الطرف الآخر'), r => partyName(counterparty(r))], [T('Status', 'الحالة'), r => statusChip(r.status)], [T('Risk', 'الخطورة'), r => riskChip(r.risk_level)], [T('Value (USD)', 'القيمة'), r => usd(claims.filter(c => c.dispute_id === r.id && c.kind === 'claim').reduce((a, c) => a + c.usd, 0))], [T('Registered', 'التسجيل'), r => fmtD(r.registration_date)], [T('Restricted', 'مقيد'), r => r.restricted ? '🔒' : '']], rows, r => go('dispute/' + r.id)));
  };
  const inp = h('input', {value: f.q, placeholder: T('Filter…', 'تصفية…'), oninput: e => { f.q = e.target.value; draw(); }});
  const toolbar = h('div', {class: 'toolbar'}, inp, sel('st', [['', T('All statuses', 'كل الحالات')], ...opts('status')], f.st, e => { f.st = e.target.value; draw(); }), sel('risk', [['', T('All risk', 'كل الخطورة')], ...opts('risk')], f.risk, e => { f.risk = e.target.value; draw(); }), sel('cat', [['', T('All types', 'كل الأنواع')], ...catOpts()], f.cat, e => { f.cat = e.target.value; draw(); }),
    h('button', {class: 'btn ghost', onclick: () => csvDownload('disputes.csv', [['Ref', 'Title', 'Type', 'Status', 'Risk', 'Priority', 'Registered'], ...disputes.map(d => [d.ref_no, d.title, catName(d.category_id), lab('status', d.status), d.risk_level, d.priority, d.registration_date])])}, 'CSV'));
  const chips = () => { const ex = [['com', T('Commodity', 'السلعة')], ['ctry', T('Country', 'الدولة')], ['ym', T('Registered month', 'شهر التسجيل')], ['cm', T('Claims month', 'شهر المطالبة')], ['dm', T('Deadline month', 'شهر الموعد')], ['cur', T('Currency', 'العملة')], ['from', T('From', 'من')], ['to', T('To', 'إلى')], ['act', T('Active only', 'النشطة فقط')]].filter(x => f[x[0]]); if (!ex.length) return null; return h('div', {class: 'chips'}, ex.map(x => h('span', {class: 'chip blue'}, x[1] + ': ' + (x[0] === 'act' ? '✓' : f[x[0]]))), h('a', {class: 'btn ghost', href: '#/disputes'}, T('Clear filters', 'مسح التصفية'))); };
  draw();
  return h('div', null, head(T('All Disputes', 'كل النزاعات'), disputes.length + ' ' + T('disputes visible to you', 'نزاع ظاهر لك'), can.dispute() ? h('a', {class: 'btn gold', href: '#/new'}, '＋ ' + T('Register New Dispute', 'تسجيل نزاع جديد')) : null), h('div', {class: 'card'}, chips(), toolbar, box));
};

/* ---- parties & contracts ---- */
function partyForm(after) {
  formModal({title: T('New party', 'طرف جديد'), fields: [
    {k: 'name', l: ['Name', 'الاسم'], req: true}, {k: 'party_type', l: ['Type', 'النوع'], t: 'select', o: opts('ptype')}, {k: 'country', l: ['Legal country', 'الدولة القانونية']}, {k: 'address', l: ['Address', 'العنوان'], wide: true},
    {k: 'contact_name', l: ['Contact person', 'شخص التواصل']}, {k: 'contact_email', l: ['Contact email', 'بريد التواصل'], t: 'email'}, {k: 'contact_phone', l: ['Contact phone', 'هاتف التواصل']}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { v.created_by = S.me.id; const r = await Q(sb.from('dc_parties').insert(v).select().single()); await loadLookups(); M.close(); toast(T('Party saved', 'تم حفظ الطرف')); after && after(r); }});
}
function contractForm(after, c) {
  formModal({title: c ? T('Edit contract', 'تعديل العقد') : T('New contract', 'عقد جديد'), big: true, values: c || {}, fields: [
    {k: 'contract_no', l: ['Contract number', 'رقم العقد'], req: true}, {k: 'contract_date', l: ['Contract date', 'تاريخ العقد'], t: 'date'}, {k: 'version', l: ['Contract version', 'إصدار العقد']},
    {k: 'seller_id', l: ['Seller', 'البائع'], t: 'select', o: partyOpts()}, {k: 'buyer_id', l: ['Buyer', 'المشتري'], t: 'select', o: partyOpts()}, {k: 'commodity', l: ['Commodity', 'السلعة'], t: 'select', o: opts('commodity')},
    {k: 'quantity', l: ['Quantity', 'الكمية'], t: 'number'}, {k: 'qty_unit', l: ['Unit', 'الوحدة']}, {k: 'price', l: ['Unit price', 'السعر'], t: 'number'}, {k: 'price_currency', l: ['Currency', 'العملة'], t: 'select', o: opts('currency'), nullable: false},
    {k: 'total_value', l: ['Total contract value', 'إجمالي قيمة العقد'], t: 'number'}, {k: 'origin', l: ['Origin', 'المنشأ']}, {k: 'loading_port', l: ['Loading port', 'ميناء التحميل']}, {k: 'discharge_port', l: ['Discharge port', 'ميناء التفريغ']},
    {k: 'incoterms', l: ['Incoterms', 'شروط التسليم'], t: 'select', o: opts('incoterm')}, {k: 'delivery_period', l: ['Delivery period', 'فترة التسليم']}, {k: 'payment_terms', l: ['Payment terms', 'شروط الدفع']}, {k: 'applicable_law', l: ['Applicable law', 'القانون المنطبق']},
    {k: 'arbitration_clause', l: ['Arbitration clause (as written in the contract, pending legal review)', 'شرط التحكيم (كما ورد في العقد، بانتظار المراجعة القانونية)'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (c) await Q(sb.from('dc_contracts').update(v).eq('id', c.id)); else { v.created_by = S.me.id; await Q(sb.from('dc_contracts').insert(v)); } await loadLookups(); M.close(); toast(T('Saved', 'تم الحفظ')); after && after(); }});
}
/* void, never delete: sets voided_at; a contract posted from IOM also voids its Suite link so it can be re-posted */
function voidContract(c, after) {
  confirmBox(T('Void contract ' + c.contract_no + '? It stays in the record as voided and is hidden from dispute forms.', 'إلغاء العقد ' + c.contract_no + '؟ سيبقى في السجل كعقد ملغى ولن يظهر في نماذج النزاعات.'), async () => {
    try {
      const now = new Date().toISOString();
      const r = await sb.from('dc_contracts').update({voided_at: now}).eq('id', c.id).select('id');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error(T('Your account cannot change this contract.', 'حسابك لا يملك صلاحية تعديل هذا العقد.'));
      if (c.source_ref) { try { await sb.from('suite_links').update({status: 'voided', voided_at: now, note: 'voided in Dispute Center'}).eq('dst_prog', 'dispute').eq('dst_id', c.id).eq('status', 'posted'); } catch (e) {} }
      await loadLookups(); toast(T('Contract voided', 'تم إلغاء العقد')); after && after();
    } catch (e) { toast(T('Could not void: ', 'تعذر الإلغاء: ') + (e.message || e), true); }
  });
}
PAGES.contracts = async () => {
  await loadLookups();
  const wr = ROLE_WRITE.includes(S.me.role);
  const draw = () => renderRoute();
  return h('div', null, head(T('Contracts & Parties', 'العقود والأطراف'), T('Contracts here are the registry the disputes link to.', 'سجل العقود الذي تُربط به النزاعات.'), wr ? h('button', {class: 'btn ghost', onclick: () => partyForm(draw)}, '＋ ' + T('Party', 'طرف')) : null, wr ? h('button', {class: 'btn gold', onclick: () => contractForm(draw)}, '＋ ' + T('Contract', 'عقد')) : null),
    h('div', {class: 'card'}, h('h3', null, T('Contracts', 'العقود')), tbl([[T('No.', 'الرقم'), r => h('b', null, r.contract_no)], [T('Date', 'التاريخ'), r => fmtD(r.contract_date)], [T('Seller', 'البائع'), r => partyName(r.seller_id)], [T('Buyer', 'المشتري'), r => partyName(r.buyer_id)], [T('Commodity', 'السلعة'), r => r.commodity ? lab('commodity', r.commodity) : '-'], [T('Qty', 'الكمية'), r => fmtN(r.quantity) + ' ' + (r.qty_unit || '')], [T('Value', 'القيمة'), r => fmtN(r.total_value) + ' ' + (r.price_currency || '')], [T('Incoterms', 'التسليم'), r => r.incoterms || '-'], [T('Source', 'المصدر'), r => r.source_ref ? h('span', {class: 'chip-src'}, r.source_ref) : '-'], [T('Status', 'الحالة'), r => h('span', null, h('span', {class: 'st-ok'}, T('Active', 'ساري')), wr ? h('button', {class: 'btn ghost sm', style: 'margin-inline-start:8px', onclick: ev => { ev.stopPropagation(); voidContract(r, draw); }}, T('Void', 'إلغاء')) : null)]], S.contracts, wr ? r => contractForm(draw, r) : null)),
    (S.voidedContracts || []).length ? h('div', {class: 'card'}, h('h3', null, T('Voided contracts', 'العقود الملغاة')), h('p', {class: 'sub'}, T('Voided contracts are kept for the record (never deleted) and are hidden from dispute forms.', 'العقود الملغاة محفوظة في السجل (لا تُحذف أبداً) ولا تظهر في نماذج النزاعات.')), tbl([[T('No.', 'الرقم'), r => h('b', null, r.contract_no)], [T('Date', 'التاريخ'), r => fmtD(r.contract_date)], [T('Commodity', 'السلعة'), r => r.commodity ? lab('commodity', r.commodity) : '-'], [T('Value', 'القيمة'), r => fmtN(r.total_value) + ' ' + (r.price_currency || '')], [T('Source', 'المصدر'), r => r.source_ref || '-'], [T('Status', 'الحالة'), r => h('span', {class: 'st-void'}, T('Voided', 'ملغى') + ' · ' + fmtD(r.voided_at))]], S.voidedContracts)) : null,
    h('div', {class: 'card'}, h('h3', null, T('Parties', 'الأطراف')), tbl([[T('Name', 'الاسم'), r => h('b', null, r.name)], [T('Type', 'النوع'), r => lab('ptype', r.party_type)], [T('Country', 'الدولة'), r => r.country || '-'], [T('Contact', 'التواصل'), r => [r.contact_name, r.contact_email, r.contact_phone].filter(Boolean).join(' · ')]], S.parties)));
};

/* ---- new dispute ---- */
PAGES.new = async () => {
  await loadLookups();
  if (!can.dispute()) return h('div', {class: 'err'}, T('Your role cannot register disputes.', 'دورك لا يسمح بتسجيل النزاعات.'));
  const fields = [
    {k: 'ref_no', l: ['Dispute reference (auto if empty)', 'رقم المرجع (تلقائي إن ترك فارغاً)']}, {k: 'title', l: ['Dispute title', 'عنوان النزاع'], req: true, wide: true}, {k: 'category_id', l: ['Dispute category', 'تصنيف النزاع'], t: 'select', o: catOpts(), req: true},
    {k: 'registration_date', l: ['Registration date', 'تاريخ التسجيل'], t: 'date'}, {k: 'discovery_date', l: ['Discovery date', 'تاريخ اكتشاف النزاع'], t: 'date'}, {k: 'priority', l: ['Priority', 'الأولوية'], t: 'select', o: opts('priority'), nullable: false},
    {k: 'risk_level', l: ['Risk level (legal assessment)', 'مستوى الخطورة (التقييم القانوني)'], t: 'select', o: opts('risk'), nullable: false}, {k: 'department', l: ['Responsible department', 'الإدارة المسؤولة']}, {k: 'commodity', l: ['Commodity', 'السلعة'], t: 'select', o: opts('commodity')},
    {k: 'legal_officer', l: ['Assigned legal officer', 'المسؤول القانوني'], t: 'select', o: userOpts()}, {k: 'commercial_manager', l: ['Assigned commercial manager', 'المدير التجاري'], t: 'select', o: userOpts()},
    {k: 'our_side', l: ['Our company is the', 'شركتنا هي'], t: 'select', o: [['claimant', T('Claimant', 'المدّعي')], ['respondent', T('Respondent', 'المدّعى عليه')]], nullable: false},
    {k: 'claimant_id', l: ['Claimant', 'المدّعي'], t: 'select', o: partyOpts(), req: true}, {k: 'respondent_id', l: ['Respondent', 'المدّعى عليه'], t: 'select', o: partyOpts(), req: true},
    {k: 'contract_id', l: ['Linked contract', 'العقد المرتبط'], t: 'select', o: S.contracts.map(c => [c.id, c.contract_no + ' · ' + partyName(c.seller_id) + ' → ' + partyName(c.buyer_id)])},
    {k: 'restricted', l: ['Restricted access (only assigned users)', 'وصول مقيد (للمصرح لهم فقط)'], t: 'checkbox'},
    {k: 'description', l: ['Dispute description', 'وصف النزاع'], t: 'textarea', wide: true}];
  const form = h('form', {class: 'formgrid'}); const v0 = {registration_date: today(), priority: 'medium', risk_level: 'medium', our_side: 'claimant'};
  fields.forEach(f => form.append(field(f, v0[f.k])));
  const extra = h('div', {class: 'wide'}); const eps = [];
  const addP = () => { const r = h('div', {class: 'row', style: 'margin:4px 0'}, sel('prole', opts('prole'), 'broker'), sel('pid', [['', '—'], ...partyOpts()], ''), h('button', {type: 'button', class: 'btn ghost sm', onclick: () => { r.remove(); eps.splice(eps.indexOf(r), 1); }}, '✕')); eps.push(r); extra.append(r); };
  form.append(h('div', {class: 'wide'}, h('label', {class: 'f'}, T('Other involved parties (seller, buyer, broker, shipping, inspection, insurance…)', 'الأطراف الأخرى (بائع، مشتري، وسيط، شحن، فحص، تأمين…)')), extra, h('div', null, h('button', {type: 'button', class: 'btn ghost sm', onclick: addP}, '＋ ' + T('Add party', 'إضافة طرف')), ' ', h('button', {type: 'button', class: 'btn ghost sm', onclick: () => partyForm(() => renderRoute())}, '＋ ' + T('New party', 'طرف جديد')))));
  const err = h('div', {class: 'err hidden'});
  const save = h('button', {class: 'btn gold', type: 'button', onclick: () => form.requestSubmit()}, T('Register dispute', 'تسجيل النزاع'));
  form.onsubmit = async e => {
    e.preventDefault(); err.classList.add('hidden'); const v = {};
    for (const f of fields) { const el = form.elements[f.k]; let x = f.t === 'checkbox' ? el.checked : el.value.trim(); if (x === '') x = null; v[f.k] = x; }
    if (!v.title || !v.category_id || !v.claimant_id || !v.respondent_id) { err.textContent = T('Title, category, claimant and respondent are required', 'العنوان والتصنيف والمدّعي والمدّعى عليه مطلوبة'); err.classList.remove('hidden'); return; }
    if (v.claimant_id === v.respondent_id) { err.textContent = T('Claimant and respondent must differ', 'المدّعي والمدّعى عليه يجب أن يختلفا'); err.classList.remove('hidden'); return; }
    if (!v.ref_no) delete v.ref_no; v.created_by = S.me.id; save.disabled = true;
    try {
      v.id = crypto.randomUUID(); await Q(sb.from('dc_disputes').insert(v)); const d = await Q(sb.from('dc_disputes').select('*').eq('id', v.id).single());
      const ps = eps.map(r => ({dispute_id: d.id, role: r.querySelector('[name=prole]').value, party_id: r.querySelector('[name=pid]').value})).filter(x => x.party_id);
      if (ps.length) await Q(sb.from('dc_dispute_parties').insert(ps));
      toast(T('Dispute registered: ', 'تم تسجيل النزاع: ') + d.ref_no); go('dispute/' + d.id);
    } catch (er) { err.textContent = er.message; err.classList.remove('hidden'); save.disabled = false; }
  };
  return h('div', null, head(T('Register New Dispute', 'تسجيل نزاع تجاري جديد')), h('div', {class: 'card'}, form, err, h('div', {class: 'act', style: 'display:flex;justify-content:flex-end;margin-top:14px'}, save)));
  // save button appended below
};
