/* ---- stage 3: financial exposure, reports, document drafts, records assistant ---- */
async function finData() {
  await loadLookups();
  const [disputes, claims, items, sets] = await Promise.all([Q(sb.from('dc_disputes').select('id,ref_no,title,status,our_side,claimant_id,respondent_id')), Q(sb.from('dc_claims').select('*')), Q(sb.from('dc_claim_items').select('claim_id,amount')), Q(sb.from('dc_settlements').select('*'))]);
  const tot = {}; items.forEach(i => tot[i.claim_id] = (tot[i.claim_id] || 0) + Number(i.amount));
  claims.forEach(c => { c.total = tot[c.id] || 0; c.usd = c.total * Number(c.fx_to_usd || 1); c.settled_usd = Number(c.settled_amount || 0) * Number(c.fx_to_usd || 1); });
  return {disputes, claims, sets};
}
const sumBy = (a, f) => a.reduce((s, x) => s + f(x), 0);
PAGES.fin = async () => {
  const {disputes, claims, sets} = await finData();
  const rows = disputes.map(d => { const cs = claims.filter(c => c.dispute_id === d.id); const cl = cs.filter(c => c.kind === 'claim'), cc = cs.filter(c => c.kind !== 'claim'); const open = sets.filter(s => s.dispute_id === d.id && s.status === 'open' && s.amount != null);
    return {d, claim: sumBy(cl, c => c.usd), counter: sumBy(cc, c => c.usd), settled: sumBy(cs, c => c.settled_usd), n: cs.length, offers: open.length, nonusd: cs.filter(c => c.currency !== 'USD').length}; });
  const T1 = {claim: sumBy(rows, r => r.claim), counter: sumBy(rows, r => r.counter), settled: sumBy(rows, r => r.settled)};
  const csv = () => csvDownload('financial-exposure.csv', [['Dispute', 'Title', 'Claims (USD)', 'Counterclaims (USD)', 'Settled (USD)', 'Open offers'], ...rows.map(r => [r.d.ref_no, r.d.title, r.claim, r.counter, r.settled, r.offers])]);
  return h('div', null, head(T('Financial Exposure', 'التحليل المالي'), T('Computed only from claims you entered, converted with the rate and source you recorded. Not a valuation or a prediction.', 'محسوب فقط من المطالبات التي أدخلتها بسعر الصرف والمصدر المسجلين. ليس تقييماً ولا توقعاً.'), h('button', {class: 'btn ghost', onclick: csv}, 'CSV')),
    h('div', {class: 'kpis'}, [[T('Claims (USD)', 'المطالبات (دولار)'), T1.claim], [T('Counterclaims (USD)', 'المطالبات المقابلة (دولار)'), T1.counter], [T('Settled (USD)', 'المسوّى (دولار)'), T1.settled], [T('Net (claims - counterclaims)', 'الصافي (مطالبات - مقابلة)'), T1.claim - T1.counter]].map(x => h('div', {class: 'kpi'}, h('div', {class: 'mut sm'}, x[0]), h('h2', null, fmtN(x[1], 2))))),
    h('div', {class: 'card'}, tbl([[T('Dispute', 'النزاع'), r => r.d.ref_no + ' ' + r.d.title], [T('Claims', 'المطالبات'), r => fmtN(r.claim, 2)], [T('Counterclaims', 'المقابلة'), r => fmtN(r.counter, 2)], [T('Settled', 'المسوّى'), r => fmtN(r.settled, 2)], [T('Open offers', 'عروض مفتوحة'), r => r.offers]], rows, r => go('dispute/' + r.d.id + '/claims'))),
    h('div', {class: 'note'}, T('All figures in USD using each claim\'s recorded rate. Open settlement offers are listed as counts, not added to totals. Interest, costs and fees are not calculated.', 'كل الأرقام بالدولار بسعر كل مطالبة المسجل. عروض التسوية المفتوحة تُعرض كعدد ولا تُضاف للمجاميع. الفوائد والتكاليف والرسوم غير محسوبة.')));
};
PAGES.reports = async () => {
  const [ds, dls, ev] = await Promise.all([Q(sb.from('dc_disputes').select('*')), Q(sb.from('dc_deadlines').select('*')), Q(sb.from('dc_documents').select('id,dispute_id'))]);
  const {claims, sets} = await finData();
  const grp = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x) || '-'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m); };
  const now = new Date(); const overdue = dls.filter(x => x.status === 'open' && new Date(x.due_at) < now);
  const box = (title, pairs) => h('div', {class: 'card'}, h('h3', null, title), pairs.length ? tbl([[T('Item', 'البند'), r => r[0]], [T('Count', 'العدد'), r => r[1]]], pairs) : h('div', {class: 'mut'}, T('No data', 'لا توجد بيانات')));
  const exp = (name, rows) => h('button', {class: 'btn ghost sm', onclick: () => csvDownload(name, rows)}, 'CSV ' + name.replace('.csv', ''));
  return h('div', null, head(T('Reports & Analytics', 'التقارير والتحليلات'), T('Counts from your own records. Nothing is estimated.', 'أعداد من سجلاتك فقط. لا شيء مُقدَّر.')),
    h('div', {class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-bottom:12px'}, exp('disputes.csv', [['Ref', 'Title', 'Status', 'Priority', 'Risk', 'Registered'], ...ds.map(d => [d.ref_no, d.title, d.status, d.priority, d.risk_level, d.registration_date])]),
      exp('claims.csv', [['Dispute', 'Ref', 'Kind', 'Currency', 'Total', 'FX to USD', 'USD', 'Status'], ...claims.map(c => [ds.find(d => d.id === c.dispute_id)?.ref_no, c.ref_no, c.kind, c.currency, c.total, c.fx_to_usd, c.usd, c.status])]),
      exp('deadlines.csv', [['Dispute', 'Title', 'Due', 'Status'], ...dls.map(x => [ds.find(d => d.id === x.dispute_id)?.ref_no, x.title, x.due_at, x.status])]),
      exp('settlements.csv', [['Dispute', 'Date', 'Kind', 'Direction', 'Amount', 'Currency', 'Status', 'Summary'], ...sets.map(s => [ds.find(d => d.id === s.dispute_id)?.ref_no, s.entry_date, s.kind, s.direction, s.amount, s.currency, s.status, s.summary])])),
    h('div', {class: 'grid2'}, box(T('Disputes by status', 'النزاعات حسب الحالة'), grp(ds, d => lab('status', d.status))), box(T('Disputes by type', 'النزاعات حسب النوع'), grp(ds, d => catName(d.category_id))), box(T('Disputes by risk', 'النزاعات حسب الخطورة'), grp(ds, d => lab('risk', d.risk_level))), box(T('Deadlines', 'المواعيد'), [[T('Open', 'مفتوحة'), dls.filter(x => x.status === 'open').length], [T('Overdue', 'متأخرة'), overdue.length]]),
      box(T('Evidence files', 'ملفات الأدلة'), [[T('Total', 'الإجمالي'), ev.length], [T('Disputes with no evidence', 'نزاعات بلا أدلة'), ds.filter(d => !ev.some(e => e.dispute_id === d.id)).length]])));
};
/* ---- document drafts: fixed neutral templates, filled only from the records ---- */
const DOC_TPL = [
  ['notice', 'Notice of dispute (draft)', 'مسودة إخطار نزاع', (c) => `[Date: ${c.today}]\n\nTo: ${c.other}\nFrom: ${c.us}\nRe: ${c.ref} - ${c.title}\n\nWe write regarding the matter referenced above${c.contract ? ' under contract ' + c.contract : ''}.\n\n[Describe the facts as verified by your team]\n\n[State the position and requested action as decided by your legal team]\n\nPlease reply by: [date]\n\n[Signatory name and title]`],
  ['offer', 'Settlement offer cover note (draft)', 'مسودة خطاب عرض تسوية', (c) => `[Date: ${c.today}]\n\nTo: ${c.other}\nFrom: ${c.us}\nRe: ${c.ref} - ${c.title} - without prejudice [confirm with counsel whether this label applies in the relevant jurisdiction]\n\nWe propose the following terms to resolve the matter:\n\n[Terms approved by your team]\n${c.amount ? 'Amount recorded in the negotiation log: ' + c.amount + '\n' : ''}\nThis proposal remains open until: [date]\n\n[Signatory name and title]`],
  ['extension', 'Request for extension of time (draft)', 'مسودة طلب مهلة إضافية', (c) => `[Date: ${c.today}]\n\nTo: ${c.other}\nFrom: ${c.us}\nRe: ${c.ref} - ${c.title}\n\nWe request an extension of the following deadline: [deadline description]\nCurrent date: [date]\nRequested new date: [date]\nReason: [reason]\n\n[Signatory name and title]`],
  ['evidence', 'Evidence list cover (draft)', 'مسودة قائمة الأدلة', (c) => `Evidence list - ${c.ref} - ${c.title}\nPrepared: ${c.today}\n\n${c.evidence || '[No evidence files registered]'}\n\nSHA-256 values are copied from the evidence register at the time of generation.`]
];
PAGES.gen = async () => {
  const ds = await Q(sb.from('dc_disputes').select('*').order('created_at', {ascending: false}));
  const out = h('pre', {style: 'white-space:pre-wrap;background:#fff;border:1px dashed #c9a24b;padding:14px;border-radius:10px;min-height:120px;direction:ltr;text-align:left'}, '');
  const sd = h('select', null, ds.map(d => h('option', {value: d.id}, d.ref_no + ' ' + d.title))), st = h('select', null, DOC_TPL.map(t => h('option', {value: t[0]}, T(t[1], t[2]))));
  const gen = async () => {
    const d = ds.find(x => x.id === sd.value); if (!d) { toast(T('Register a dispute first', 'سجّل نزاعاً أولاً'), true); return; }
    const [parts, docs, sets] = await Promise.all([Q(sb.from('dc_parties').select('id,name').in('id', [d.claimant_id, d.respondent_id].filter(Boolean))), Q(sb.from('dc_documents').select('name,sha256').eq('dispute_id', d.id)), Q(sb.from('dc_settlements').select('amount,currency,status').eq('dispute_id', d.id).eq('status', 'open'))]);
    const pn = id => parts.find(p => p.id === id)?.name || '[party]'; const usClaimant = d.our_side !== 'respondent';
    const c = {today: today(), ref: d.ref_no, title: d.title, us: pn(usClaimant ? d.claimant_id : d.respondent_id), other: pn(usClaimant ? d.respondent_id : d.claimant_id), contract: '', amount: sets[0] ? sets[0].amount + ' ' + sets[0].currency : '', evidence: docs.map((x, i) => (i + 1) + '. ' + x.name + ' - SHA-256: ' + (x.sha256 || '[n/a]')).join('\n')};
    out.textContent = 'DRAFT - NOT LEGAL ADVICE - MUST BE REVIEWED BY A QUALIFIED LAWYER BEFORE USE\nمسودة - ليست استشارة قانونية - يجب مراجعتها من محامٍ مؤهل قبل الاستخدام\n' + '-'.repeat(60) + '\n\n' + DOC_TPL.find(t => t[0] === st.value)[3](c);
    out.dataset.name = d.ref_no + '-' + st.value + '-draft.txt';
  };
  return h('div', null, head(T('Legal Document Drafts', 'مسودات المستندات'), T('Fixed neutral templates filled only from your records. No legal wording is invented; bracketed parts are for your lawyer.', 'قوالب محايدة ثابتة تُملأ من سجلاتك فقط. لا تُختلق صياغة قانونية؛ الأجزاء بين أقواس لمحاميك.')),
    h('div', {class: 'card'}, h('div', {class: 'row', style: 'gap:8px;flex-wrap:wrap'}, sd, st, h('button', {class: 'btn gold', onclick: gen}, T('Generate draft', 'إنشاء مسودة')), h('button', {class: 'btn ghost', onclick: () => { if (!out.dataset.name) return; const a = h('a', {href: URL.createObjectURL(new Blob([out.textContent], {type: 'text/plain;charset=utf-8'})), download: out.dataset.name}); document.body.append(a); a.click(); a.remove(); }}, T('Download .txt', 'تنزيل .txt'))), out),
    h('div', {class: 'note'}, T('Generating a draft is not recorded as a sent document. Review and sign off outside the system.', 'إنشاء المسودة لا يُسجَّل كمستند مُرسل. المراجعة والاعتماد تتم خارج النظام.')));
};
/* ---- records assistant: answers only from the app's own records; no language model ---- */
PAGES.ai = async () => {
  const out = h('div', {class: 'card'}, h('div', {class: 'mut'}, T('Ask a question or tap one of the quick checks.', 'اكتب سؤالاً أو اختر فحصاً سريعاً.')));
  const inp = h('input', {placeholder: T('Search your records, e.g. a party, contract or word', 'ابحث في سجلاتك، مثل طرف أو عقد أو كلمة')});
  const show = (title, lines) => { out.innerHTML = ''; out.append(h('h3', null, title), lines.length ? h('ul', null, lines.map(l => h('li', null, l.href ? h('a', {href: l.href}, l.t) : l.t))) : h('div', {class: 'mut'}, T('Nothing found in your records.', 'لا شيء في سجلاتك.')), h('div', {class: 'note'}, T('Answers come only from records in this app, with links. This is not an AI model and gives no legal opinion.', 'الإجابات من سجلات هذا التطبيق فقط مع روابط. هذا ليس نموذج ذكاء اصطناعي ولا يعطي رأياً قانونياً.'))); };
  const dl = d => ({href: '#/dispute/' + d.id});
  const checks = [[T('Overdue deadlines', 'مواعيد متأخرة'), async () => { const [ds, dls] = await Promise.all([Q(sb.from('dc_disputes').select('id,ref_no')), Q(sb.from('dc_deadlines').select('*').eq('status', 'open'))]); return dls.filter(x => new Date(x.due_at) < new Date()).map(x => ({t: (ds.find(d => d.id === x.dispute_id)?.ref_no || '') + ' - ' + x.title + ' - ' + fmtDT(x.due_at), href: '#/dispute/' + x.dispute_id + '/deadlines'})); }],
    [T('Disputes without evidence', 'نزاعات بلا أدلة'), async () => { const [ds, ev] = await Promise.all([Q(sb.from('dc_disputes').select('id,ref_no,title')), Q(sb.from('dc_documents').select('dispute_id'))]); return ds.filter(d => !ev.some(e => e.dispute_id === d.id)).map(d => ({t: d.ref_no + ' ' + d.title, ...dl(d)})); }],
    [T('Open settlement offers', 'عروض تسوية مفتوحة'), async () => { const [ds, ss] = await Promise.all([Q(sb.from('dc_disputes').select('id,ref_no')), Q(sb.from('dc_settlements').select('*').eq('status', 'open'))]); return ss.map(s => ({t: (ds.find(d => d.id === s.dispute_id)?.ref_no || '') + ' - ' + kl(SET_KINDS, s.kind) + (s.amount != null ? ' - ' + money(s.amount, s.currency) : ''), href: '#/dispute/' + s.dispute_id + '/settlements'})); }],
    [T('Evidence not yet verified', 'أدلة غير موثقة بعد'), async () => { const [ds, ev] = await Promise.all([Q(sb.from('dc_disputes').select('id,ref_no')), Q(sb.from('dc_documents').select('dispute_id,name,verification'))]); return ev.filter(e => !e.verification || e.verification === 'unverified').map(e => ({t: (ds.find(d => d.id === e.dispute_id)?.ref_no || '') + ' - ' + e.name, href: '#/dispute/' + e.dispute_id + '/evidence'})); }]];
  const search = async () => { const q = inp.value.trim(); if (q.length < 2) return; const like = '%' + q.replace(/[%,]/g, ' ') + '%';
    const [a, b, c, d] = await Promise.all([Q(sb.from('dc_disputes').select('id,ref_no,title').or('title.ilike.' + like + ',description.ilike.' + like + ',ref_no.ilike.' + like)), Q(sb.from('dc_events').select('dispute_id,event_date,description').ilike('description', like)), Q(sb.from('dc_correspondence').select('dispute_id,subject').ilike('subject', like)), Q(sb.from('dc_documents').select('dispute_id,name').ilike('name', like))]);
    show(T('Results for', 'نتائج') + ' "' + q + '"', [...a.map(x => ({t: T('Dispute', 'نزاع') + ': ' + x.ref_no + ' ' + x.title, ...dl(x)})), ...b.map(x => ({t: T('Event', 'حدث') + ' ' + x.event_date + ': ' + x.description, href: '#/dispute/' + x.dispute_id + '/timeline'})), ...c.map(x => ({t: T('Correspondence', 'مراسلة') + ': ' + x.subject, href: '#/dispute/' + x.dispute_id + '/correspondence'})), ...d.map(x => ({t: T('Evidence', 'دليل') + ': ' + x.name, href: '#/dispute/' + x.dispute_id + '/evidence'}))]); };
  return h('div', null, head(T('Records Assistant', 'مساعد السجلات'), T('Answers from your own records only. No AI model, no invented facts, no legal advice.', 'يجيب من سجلاتك فقط. بلا نموذج ذكاء اصطناعي ولا وقائع مختلقة ولا استشارة قانونية.')),
    h('div', {class: 'card'}, h('div', {class: 'row', style: 'gap:8px;flex-wrap:wrap'}, checks.map(c => h('button', {class: 'btn ghost sm', onclick: async () => show(c[0], await c[1]())}, c[0]))), h('div', {class: 'row', style: 'gap:8px;margin-top:10px'}, inp, h('button', {class: 'btn gold', onclick: search}, T('Search', 'بحث')))), out);
};
