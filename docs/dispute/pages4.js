/* ---- stage 2: institutions, arbitration cases, settlements ---- */
const ARB_STAGES = [['notice', 'Notice of dispute', 'إخطار النزاع'], ['request', 'Request for arbitration filed', 'تقديم طلب التحكيم'], ['tribunal', 'Tribunal constituted', 'تشكيل هيئة التحكيم'], ['pleadings', 'Written pleadings', 'المذكرات المكتوبة'], ['hearing', 'Hearing', 'الجلسات'], ['award', 'Award', 'الحكم'], ['enforcement', 'Enforcement / closure', 'التنفيذ / الإغلاق']];
const stageLab = k => { const r = ARB_STAGES.find(x => x[0] === k); return r ? T(r[1], r[2]) : k; };
const SET_KINDS = [['offer', 'Offer', 'عرض'], ['counteroffer', 'Counteroffer', 'عرض مقابل'], ['meeting', 'Meeting / call', 'اجتماع / مكالمة'], ['mediation', 'Mediation', 'وساطة'], ['agreement', 'Settlement agreement', 'اتفاق تسوية'], ['note', 'Note', 'ملاحظة']];
const SET_STATUS = [['open', 'Open', 'مفتوح'], ['accepted', 'Accepted', 'مقبول'], ['rejected', 'Rejected', 'مرفوض'], ['expired', 'Expired', 'منتهي'], ['withdrawn', 'Withdrawn', 'مسحوب']];
const kl = (arr, k) => { const r = arr.find(x => x[0] === k); return r ? T(r[1], r[2]) : (k || '-'); };
const ko = arr => arr.map(r => [r[0], T(r[1], r[2])]);
const canInst = () => ['super_admin', 'legal_director', 'legal_counsel', 'arbitration_manager'].includes(S.me?.role);
const instName = id => (S.insts || []).find(i => i.id === id)?.name || '-';

function instForm(r) {
  formModal({title: r ? T('Edit institution', 'تعديل المؤسسة') : T('New arbitration institution', 'مؤسسة تحكيم جديدة'), values: r || {}, big: true,
    note: T('Enter what you have verified yourself. The system holds no rules text and does not assume which institution has jurisdiction.', 'أدخل ما تحققت منه بنفسك. النظام لا يحتفظ بنصوص القواعد ولا يفترض أي مؤسسة مختصة.'),
    fields: [{k: 'name', l: ['Name', 'الاسم'], req: true}, {k: 'short_name', l: ['Short name', 'الاسم المختصر']}, {k: 'country', l: ['Country', 'الدولة']}, {k: 'city', l: ['City', 'المدينة']}, {k: 'website', l: ['Official website', 'الموقع الرسمي']}, {k: 'contact_email', l: ['Contact email', 'بريد التواصل'], t: 'email'},
      {k: 'rules_reference', l: ['Rules reference (edition / link, as you verified it)', 'مرجع القواعد (الإصدار / الرابط كما تحققت منه)'], wide: true}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (r) await Q(sb.from('dc_institutions').update(v).eq('id', r.id)); else { v.created_by = S.me.id; await Q(sb.from('dc_institutions').insert(v)); } await loadLookups(); M.close(); toast(T('Saved', 'تم الحفظ')); renderRoute(); }});
}
PAGES.institutions = async () => {
  await loadLookups();
  return h('div', null, head(T('Arbitration Institutions', 'مؤسسات التحكيم'), T('A registry you maintain. No institution or rules data is pre-loaded.', 'سجل تحتفظ به أنت. لا توجد بيانات مؤسسات أو قواعد محمّلة مسبقاً.'), canInst() ? h('button', {class: 'btn gold', onclick: () => instForm()}, '＋ ' + T('Add institution', 'إضافة مؤسسة')) : null),
    h('div', {class: 'card'}, tbl([[T('Name', 'الاسم'), r => h('b', null, r.name)], [T('Short', 'مختصر'), r => r.short_name || '-'], [T('Country', 'الدولة'), r => r.country || '-'], [T('City', 'المدينة'), r => r.city || '-'], [T('Rules reference', 'مرجع القواعد'), r => r.rules_reference || '-'], ['', r => canInst() ? h('button', {class: 'btn ghost sm', onclick: () => instForm(r)}, T('Edit', 'تعديل')) : '']], S.insts || [])));
};
function arbForm(d, r, after) {
  formModal({title: r ? T('Edit arbitration case', 'تعديل قضية التحكيم') : T('Open arbitration case file', 'فتح ملف قضية تحكيم'), values: r || {stage: 'notice'}, big: true,
    note: T('Governing law, seat and institution are recorded as entered by your legal team and need legal review. They are not derived from the contract clause.', 'القانون الحاكم والمقر والمؤسسة تُسجَّل كما يدخلها فريقك القانوني وتحتاج مراجعة قانونية. لا تُستنتج من شرط العقد.'),
    fields: [{k: 'institution_id', l: ['Institution', 'المؤسسة'], t: 'select', o: (S.insts || []).map(i => [i.id, i.name])}, {k: 'case_no', l: ['Case number (assigned by the institution)', 'رقم القضية (من المؤسسة)']}, {k: 'stage', l: ['Stage', 'المرحلة'], t: 'select', nullable: false, o: ko(ARB_STAGES)}, {k: 'filed_date', l: ['Filing date', 'تاريخ التقديم'], t: 'date'},
      {k: 'seat', l: ['Seat of arbitration', 'مقر التحكيم']}, {k: 'governing_law', l: ['Governing law (as recorded)', 'القانون الحاكم (كما سُجل)']}, {k: 'language', l: ['Language', 'لغة التحكيم']}, {k: 'tribunal', l: ['Tribunal composition', 'تشكيل الهيئة']}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (r) await Q(sb.from('dc_arb_cases').update(v).eq('id', r.id)); else { v.dispute_id = d.id; v.created_by = S.me.id; await Q(sb.from('dc_arb_cases').insert(v)); } M.close(); toast(T('Saved', 'تم الحفظ')); after(); }});
}
async function arbSection(d) {
  await loadLookups();
  const rows = await Q(sb.from('dc_arb_cases').select('*').eq('dispute_id', d.id).order('created_at'));
  const w = can.dispute();
  return h('div', null, h('div', {class: 'card'}, h('h3', null, T('Arbitration case file', 'ملف قضية التحكيم'), h('span', {class: 'sp'}), w ? h('button', {class: 'btn sm', onclick: () => arbForm(d, null, renderRoute)}, '＋ ' + T('Open case file', 'فتح ملف')) : null),
    rows.length ? rows.map(r => h('div', {class: 'card', style: 'box-shadow:none'},
      h('div', {class: 'row'}, chip(stageLab(r.stage), 'gold'), h('b', null, instName(r.institution_id)), h('span', {class: 'mut sm'}, r.case_no || ''), h('span', {class: 'sp'}), w ? h('button', {class: 'btn ghost sm', onclick: () => arbForm(d, r, renderRoute)}, T('Edit', 'تعديل')) : null),
      h('div', {class: 'stages', style: 'display:flex;gap:6px;flex-wrap:wrap;margin:10px 0'}, ARB_STAGES.map((s, i) => h('span', {class: 'chip ' + (i <= ARB_STAGES.findIndex(x => x[0] === r.stage) ? 'green' : ''), style: 'font-size:12px'}, (i + 1) + '. ' + T(s[1], s[2])))),
      h('dl', {class: 'kv'}, [[T('Filed', 'التقديم'), r.filed_date ? fmtD(r.filed_date) : null], [T('Seat', 'المقر'), r.seat], [T('Governing law (as recorded)', 'القانون الحاكم (كما سُجل)'), r.governing_law], [T('Language', 'اللغة'), r.language], [T('Tribunal', 'الهيئة'), r.tribunal], [T('Notes', 'ملاحظات'), r.notes]].filter(x => x[1]).map(x => [h('dt', null, x[0]), h('dd', null, x[1])])))) :
      h('div', {class: 'note'}, T('No arbitration case file yet. Open one only when arbitration has actually been started or decided by your legal team. The system does not assume an institution from the contract clause.', 'لا يوجد ملف تحكيم بعد. افتح ملفاً فقط عند بدء التحكيم فعلياً أو قراره من فريقك القانوني. النظام لا يفترض مؤسسة من شرط العقد.'))),
    h('div', {class: 'note'}, T('Stage changes are recorded in the audit log. Stage 1 to 7 is a generic outline, not any institution\'s official procedure.', 'تُسجَّل تغييرات المرحلة في سجل التدقيق. المراحل من 1 إلى 7 هيكل عام وليست إجراءات أي مؤسسة رسمية.')));
}
PAGES.arbcases = async () => {
  await loadLookups();
  const [rows, ds] = await Promise.all([Q(sb.from('dc_arb_cases').select('*').order('created_at', {ascending: false})), Q(sb.from('dc_disputes').select('id,ref_no,title'))]);
  return h('div', null, head(T('Arbitration Case Management', 'إدارة قضايا التحكيم'), T('Open a case file inside a dispute (Arbitration tab).', 'يُفتح ملف القضية من داخل النزاع (تبويب التحكيم).')),
    h('div', {class: 'card'}, tbl([[T('Dispute', 'النزاع'), r => { const x = ds.find(q => q.id === r.dispute_id); return x ? x.ref_no + ' ' + x.title : '-'; }], [T('Institution', 'المؤسسة'), r => instName(r.institution_id)], [T('Case no.', 'رقم القضية'), r => r.case_no || '-'], [T('Stage', 'المرحلة'), r => chip(stageLab(r.stage), 'gold')], [T('Filed', 'التقديم'), r => r.filed_date ? fmtD(r.filed_date) : '-']], rows, r => go('dispute/' + r.dispute_id + '/arbitration'))));
};
function setForm(d, r, after) {
  formModal({title: r ? T('Edit entry', 'تعديل السجل') : T('New negotiation / settlement entry', 'سجل تفاوض / تسوية جديد'), values: r || {entry_date: today(), status: 'open', currency: 'USD'}, big: true,
    fields: [{k: 'kind', l: ['Type', 'النوع'], t: 'select', nullable: false, req: true, o: ko(SET_KINDS)}, {k: 'direction', l: ['Direction', 'الاتجاه'], t: 'select', o: [['from_us', T('From us', 'منّا')], ['from_them', T('From the other side', 'من الطرف الآخر')]]}, {k: 'entry_date', l: ['Date', 'التاريخ'], t: 'date', req: true}, {k: 'status', l: ['Status', 'الحالة'], t: 'select', nullable: false, o: ko(SET_STATUS)},
      {k: 'amount', l: ['Amount', 'المبلغ'], t: 'number'}, {k: 'currency', l: ['Currency', 'العملة']}, {k: 'summary', l: ['Summary', 'الملخص'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (r) await Q(sb.from('dc_settlements').update(v).eq('id', r.id)); else { v.dispute_id = d.id; v.created_by = S.me.id; await Q(sb.from('dc_settlements').insert(v)); } M.close(); toast(T('Saved', 'تم الحفظ')); after(); }});
}
async function settleSection(d) {
  const rows = await Q(sb.from('dc_settlements').select('*').eq('dispute_id', d.id).order('entry_date', {ascending: false}));
  const w = can.claims();
  return h('div', {class: 'card'}, h('h3', null, T('Settlement & Negotiation Log', 'سجل التفاوض والتسوية'), h('span', {class: 'sp'}), w ? h('button', {class: 'btn sm', onclick: () => setForm(d, null, renderRoute)}, '＋ ' + T('Entry', 'سجل')) : null),
    tbl([[T('Date', 'التاريخ'), r => fmtD(r.entry_date)], [T('Type', 'النوع'), r => chip(kl(SET_KINDS, r.kind))], [T('Direction', 'الاتجاه'), r => r.direction === 'from_us' ? T('From us', 'منّا') : r.direction === 'from_them' ? T('From the other side', 'من الطرف الآخر') : '-'], [T('Amount', 'المبلغ'), r => r.amount != null ? money(r.amount, r.currency) : '-'], [T('Status', 'الحالة'), r => kl(SET_STATUS, r.status)], [T('Summary', 'الملخص'), r => r.summary || '-'], ['', r => w ? h('button', {class: 'btn ghost sm', onclick: () => setForm(d, r, renderRoute)}, T('Edit', 'تعديل')) : '']], rows));
}
PAGES.settlements = async () => {
  const [rows, ds] = await Promise.all([Q(sb.from('dc_settlements').select('*').order('entry_date', {ascending: false})), Q(sb.from('dc_disputes').select('id,ref_no,title'))]);
  return h('div', null, head(T('Settlement & Negotiations', 'التسويات والمفاوضات'), T('Add entries inside a dispute (Settlements tab).', 'تضاف السجلات من داخل النزاع (تبويب التسويات).')),
    h('div', {class: 'card'}, tbl([[T('Date', 'التاريخ'), r => fmtD(r.entry_date)], [T('Dispute', 'النزاع'), r => { const x = ds.find(q => q.id === r.dispute_id); return x ? x.ref_no : '-'; }], [T('Type', 'النوع'), r => chip(kl(SET_KINDS, r.kind))], [T('Amount', 'المبلغ'), r => r.amount != null ? money(r.amount, r.currency) : '-'], [T('Status', 'الحالة'), r => kl(SET_STATUS, r.status)]], rows, r => go('dispute/' + r.dispute_id + '/settlements'))));
};
