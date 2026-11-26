/* ===== dispute profile + remaining pages ===== */
const dsel = async (cb, cur) => { const ds = await Q(sb.from('dc_disputes').select('id,ref_no,title').order('created_at', {ascending: false})); return {ds, el: sel('d', [['', T('All disputes', 'كل النزاعات')], ...ds.map(d => [d.id, d.ref_no + ' · ' + d.title])], cur || '', e => cb(e.target.value))}; };
async function globalPage(title, sub, sec) {
  const all = await Q(sb.from('dc_disputes').select('*').order('created_at', {ascending: false}));
  const cur = route.q.get('d') || ''; const d = all.find(x => x.id === cur) || null;
  const pick = sel('d', [['', T('All disputes', 'كل النزاعات')], ...all.map(x => [x.id, x.ref_no + ' · ' + x.title])], cur, e => { location.hash = '#/' + route.name + (e.target.value ? '?d=' + e.target.value : ''); });
  return h('div', null, head(title, sub, pick), await sec(d, all));
}
PAGES.evidence = () => globalPage(T('Evidence Management', 'إدارة الأدلة'), T('Evidence register across disputes. Upload inside a dispute file.', 'سجل الأدلة عبر النزاعات. الرفع من داخل ملف النزاع.'), (d, all) => evidenceSection(d, all));
PAGES.correspondence = () => globalPage(T('Correspondence Archive', 'أرشيف المراسلات'), '', (d, all) => corrSection(d, all));
PAGES.timeline = () => globalPage(T('Dispute Timeline', 'التسلسل الزمني'), '', (d, all) => timelineSection(d, all));
PAGES.claims = () => globalPage(T('Claims & Counterclaims', 'المطالبات والمطالبات المقابلة'), T('Add claims inside a dispute file.', 'تضاف المطالبات من داخل ملف النزاع.'), (d, all) => claimsSection(d, all));

PAGES.dispute = async (id, tab) => {
  tab = tab || 'overview';
  const d = (await Q(sb.from('dc_disputes').select('*').eq('id', id).limit(1)))[0];
  if (!d) return h('div', {class: 'err'}, T('Dispute not found or no access', 'النزاع غير موجود أو لا تملك صلاحية'));
  const [dps, claims, dls, docs, hist, acc] = await Promise.all([Q(sb.from('dc_dispute_parties').select('*').eq('dispute_id', id)), Q(sb.from('dc_claims').select('*').eq('dispute_id', id)), Q(sb.from('dc_deadlines').select('*').eq('dispute_id', id)), Q(sb.from('dc_documents').select('id').eq('dispute_id', id)), Q(sb.from('dc_status_history').select('*').eq('dispute_id', id).order('at')), Q(sb.from('dc_dispute_access').select('*').eq('dispute_id', id))]);
  const items = claims.length ? await Q(sb.from('dc_claim_items').select('claim_id,amount').in('claim_id', claims.map(c => c.id))) : [];
  claims.forEach(c => { c.usd = items.filter(i => i.claim_id === c.id).reduce((a, i) => a + Number(i.amount), 0) * Number(c.fx_to_usd); });
  const sug = suggestRisk(d, claims, dls); const contract = S.contracts.find(c => c.id === d.contract_id);
  const tabs = [['overview', 'Overview', 'نظرة عامة'], ['claims', 'Claims & Financial', 'المطالبات والمالية'], ['evidence', 'Evidence', 'الأدلة'], ['correspondence', 'Correspondence', 'المراسلات'], ['timeline', 'Chronology', 'التسلسل الزمني'], ['deadlines', 'Deadlines', 'المواعيد'], ['arbitration', 'Arbitration', 'التحكيم'], ['settlements', 'Settlements', 'التسويات'], ['team', 'Team & Experts', 'الفريق والخبراء'], ['activity', 'Activity Log', 'سجل النشاط']];
  const dw = can.dispute();
  const statusSel = dw ? sel('st', opts('status'), d.status, async e => { await Q(sb.from('dc_disputes').update({status: e.target.value}).eq('id', id)); toast(T('Status updated', 'تم تحديث الحالة')); renderRoute(); }) : statusChip(d.status);
  const riskSel = dw ? sel('rk', opts('risk'), d.risk_level, async e => { await Q(sb.from('dc_disputes').update({risk_level: e.target.value, risk_assessed_by: S.me.id}).eq('id', id)); toast(T('Risk updated', 'تم تحديث الخطورة')); renderRoute(); }) : riskChip(d.risk_level);
  let body;
  if (tab === 'overview') {
    const kv = a => h('dl', {class: 'kv'}, a.filter(x => x[1] != null && x[1] !== '').map(x => [h('dt', null, x[0]), h('dd', null, x[1])]));
    const total = claims.filter(c => c.kind === 'claim').reduce((a, c) => a + c.usd, 0), cct = claims.filter(c => c.kind === 'counterclaim').reduce((a, c) => a + c.usd, 0);
    body = h('div', null, h('div', {class: 'kpis'}, kpi(T('Claims (USD)', 'المطالبات'), usd(total)), kpi(T('Counterclaims (USD)', 'المقابلة'), usd(cct), 'r'), kpi(T('Documents', 'المستندات'), docs.length), kpi(T('Open deadlines', 'مواعيد مفتوحة'), dls.filter(x => x.status === 'open').length, 'g')),
      h('div', {class: 'grid2'},
        h('div', {class: 'card'}, h('h3', null, T('Dispute overview', 'بيانات النزاع')), kv([[T('Reference', 'المرجع'), d.ref_no], [T('Category', 'التصنيف'), catName(d.category_id)], [T('Registered', 'التسجيل'), fmtD(d.registration_date)], [T('Discovered', 'الاكتشاف'), fmtD(d.discovery_date)], [T('Priority', 'الأولوية'), lab('priority', d.priority)], [T('Department', 'الإدارة'), d.department], [T('Commodity', 'السلعة'), d.commodity ? lab('commodity', d.commodity) : null], [T('Restricted', 'وصول مقيد'), d.restricted ? T('Yes', 'نعم') : T('No', 'لا')]]), d.description ? h('p', {style: 'white-space:pre-wrap'}, d.description) : null),
        h('div', {class: 'card'}, h('h3', null, T('Parties involved', 'الأطراف')), kv([[T('Claimant', 'المدّعي'), partyName(d.claimant_id) + (d.our_side === 'claimant' ? ' ★' : '')], [T('Respondent', 'المدّعى عليه'), partyName(d.respondent_id) + (d.our_side === 'respondent' ? ' ★' : '')], ...dps.map(p => [lab('prole', p.role), partyName(p.party_id)])]), h('div', {class: 'sm mut'}, '★ ' + T('our company', 'شركتنا')),
          h('h3', {style: 'margin-top:14px'}, T('Assigned team', 'الفريق')), kv([[T('Legal officer', 'المسؤول القانوني'), d.legal_officer ? userName(d.legal_officer) : null], [T('Commercial manager', 'المدير التجاري'), d.commercial_manager ? userName(d.commercial_manager) : null]])),
        h('div', {class: 'card'}, h('h3', null, T('Contract', 'العقد')), contract ? kv([[T('Contract no.', 'رقم العقد'), contract.contract_no], [T('Date', 'التاريخ'), fmtD(contract.contract_date)], [T('Commodity', 'السلعة'), contract.commodity ? lab('commodity', contract.commodity) : null], [T('Quantity', 'الكمية'), contract.quantity ? fmtN(contract.quantity) + ' ' + (contract.qty_unit || '') : null], [T('Price', 'السعر'), contract.price ? fmtN(contract.price, 2) + ' ' + (contract.price_currency || '') : null], [T('Total value', 'القيمة الكلية'), contract.total_value ? fmtN(contract.total_value) : null], [T('Origin', 'المنشأ'), contract.origin], [T('Loading → Discharge', 'التحميل → التفريغ'), [contract.loading_port, contract.discharge_port].filter(Boolean).join(' → ')], ['Incoterms', contract.incoterms], [T('Delivery', 'التسليم'), contract.delivery_period], [T('Payment', 'الدفع'), contract.payment_terms], [T('Applicable law', 'القانون المنطبق'), contract.applicable_law], [T('Version', 'الإصدار'), contract.version]]) : h('div', {class: 'empty'}, T('No contract linked', 'لا يوجد عقد مرتبط')),
          contract && contract.arbitration_clause ? h('div', {class: 'note'}, h('b', null, T('Arbitration clause as recorded (needs legal review; does not itself establish jurisdiction): ', 'شرط التحكيم كما سُجل (يحتاج مراجعة قانونية ولا يثبت الاختصاص بذاته): ')), h('div', {style: 'white-space:pre-wrap;margin-top:4px'}, contract.arbitration_clause)) : null, contract ? h('button', {class: 'btn ghost sm', onclick: () => go('contracts')}, T('Open contracts registry', 'فتح سجل العقود')) : null),
        h('div', {class: 'card'}, h('h3', null, T('Status history', 'سجل الحالات')), tbl([[T('When', 'الوقت'), r => fmtDT(r.at)], [T('From', 'من'), r => r.from_status ? lab('status', r.from_status) : '-'], [T('To', 'إلى'), r => lab('status', r.to_status)]], [...hist].reverse()))),
      can.legalHead() ? accessCard(d, acc) : null);
  } else if (tab === 'claims') body = await claimsSection(d);
  else if (tab === 'evidence') body = await evidenceSection(d);
  else if (tab === 'correspondence') body = await corrSection(d);
  else if (tab === 'timeline') body = await timelineSection(d);
  else if (tab === 'deadlines') body = await deadlinesSection(d);
  else if (tab === 'arbitration') body = await arbSection(d);
  else if (tab === 'settlements') body = await settleSection(d);
  else if (tab === 'team') body = await teamSection(d);
  else body = await activitySection(d);
  return h('div', null,
    h('div', {class: 'ph'}, h('div', null, h('div', {class: 'sub'}, d.ref_no), h('h1', null, d.title)), h('div', {class: 'sp'}),
      h('div', {class: 'row'}, h('span', {class: 'sm mut'}, T('Status', 'الحالة')), statusSel, h('span', {class: 'sm mut'}, T('Risk', 'الخطورة')), riskSel, h('span', {title: sug.factors.join(', ') || '-'}, chip(T('Suggested: ', 'مقترح: ') + lab('risk', sug.level), 'gold')))),
    h('div', {class: 'tabs'}, tabs.map(t => h('a', {class: t[0] === tab ? 'on' : '', href: `#/dispute/${id}/${t[0]}`}, T(t[1], t[2])))), body);
};
function accessCard(d, acc) {
  const ext = S.users.filter(u => u.active);
  return h('div', {class: 'card'}, h('h3', null, T('Restricted & external counsel access', 'الوصول المقيد والمستشار الخارجي'), h('span', {class: 'sp'}), h('button', {class: 'btn sm', onclick: () => formModal({title: T('Grant access to this dispute', 'منح وصول لهذا النزاع'), fields: [{k: 'user_id', l: ['User', 'المستخدم'], t: 'select', o: ext.map(u => [u.id, (u.full_name || u.email) + ' · ' + lab('role', u.role)]), req: true, nullable: false}, {k: 'access_level', l: ['Access', 'الصلاحية'], t: 'select', o: [['read', T('Read only', 'قراءة فقط')], ['write', T('Read & contribute', 'قراءة ومساهمة')]], nullable: false}, {k: 'expires_at', l: ['Expires (empty = no expiry)', 'ينتهي في (فارغ = دائم)'], t: 'datetime-local'}],
    onSave: async (v, M) => { v.dispute_id = d.id; v.granted_by = S.me.id; v.expires_at = v.expires_at ? new Date(v.expires_at).toISOString() : null; await Q(sb.from('dc_dispute_access').upsert(v, {onConflict: 'dispute_id,user_id'})); M.close(); renderRoute(); }})}, '＋ ' + T('Grant', 'منح')),
    h('button', {class: 'btn ghost sm', onclick: async () => { await Q(sb.from('dc_disputes').update({restricted: !d.restricted}).eq('id', d.id)); renderRoute(); }}, d.restricted ? T('Remove restriction', 'إلغاء التقييد') : T('Restrict this dispute', 'تقييد النزاع'))),
    tbl([[T('User', 'المستخدم'), r => userName(r.user_id)], [T('Access', 'الصلاحية'), r => r.access_level], [T('Expires', 'ينتهي'), r => r.expires_at ? fmtDT(r.expires_at) : T('never', 'لا ينتهي')], ['', r => h('button', {class: 'btn ghost sm', onclick: async () => { await Q(sb.from('dc_dispute_access').delete().eq('id', r.id)); renderRoute(); }}, T('Revoke', 'سحب'))]], acc));
}
async function activitySection(d) {
  const [au, cu] = await Promise.all([Q(sb.from('dc_audit').select('*').eq('dispute_id', d.id).order('at', {ascending: false}).limit(200)), Q(sb.from('dc_custody').select('*').eq('dispute_id', d.id).order('at', {ascending: false}).limit(200))]);
  return h('div', null, h('div', {class: 'card'}, h('h3', null, T('Audit trail', 'سجل التدقيق')), auditTable(au)), h('div', {class: 'card'}, h('h3', null, T('Evidence chain of custody', 'سلسلة حيازة الأدلة')), tbl([[T('When', 'الوقت'), r => fmtDT(r.at)], [T('Who', 'من'), r => r.user_email], [T('Action', 'الإجراء'), r => r.action], [T('Details', 'تفاصيل'), r => r.details]], cu)));
}
const auditTable = rows => tbl([[T('When', 'الوقت'), r => fmtDT(r.at)], [T('User', 'المستخدم'), r => r.user_email || '-'], [T('Action', 'الإجراء'), r => chip(r.action)], [T('Record', 'السجل'), r => r.entity.replace('dc_', '')], [T('Details', 'تفاصيل'), r => h('code', {class: 'sm'}, JSON.stringify(r.details || {}).slice(0, 160))]], rows);

/* ---- audit page ---- */
PAGES.audit = async () => {
  const rows = await Q(sb.from('dc_audit').select('*').order('at', {ascending: false}).limit(500));
  return h('div', null, head(T('Audit Trail & Security', 'سجل التدقيق والأمان'), T('Append-only: entries cannot be edited or deleted by any user.', 'للإضافة فقط: لا يمكن تعديل السجلات أو حذفها بواسطة أي مستخدم.'), h('button', {class: 'btn ghost', onclick: () => csvDownload('audit.csv', [['At', 'User', 'Action', 'Entity', 'Entity ID', 'Dispute', 'Details'], ...rows.map(r => [r.at, r.user_email, r.action, r.entity, r.entity_id, r.dispute_id, JSON.stringify(r.details)])])}, 'CSV')),
    h('div', {class: 'note'}, T('Integrity measures (SHA-256, custody log, audit trail) support traceability. They do not by themselves give a document legal force.', 'إجراءات السلامة (SHA-256 وسجل الحيازة وسجل التدقيق) تدعم التتبع، ولا تمنح المستند حجية قانونية بذاتها.')),
    h('div', {class: 'card'}, auditTable(rows)));
};

/* ---- users ---- */
PAGES.users = async () => {
  await loadLookups(); const inv = can.admin() ? await Q(sb.from('dc_invites').select('*').order('created_at', {ascending: false})) : [];
  const adm = can.admin();
  return h('div', null, head(T('Users & Access', 'المستخدمون والصلاحيات'), '', adm ? h('button', {class: 'btn gold', onclick: () => formModal({title: T('Invite user', 'دعوة مستخدم'), note: T('The person creates an account on the login page using this email and the invitation code shown after saving. Share the code privately.', 'ينشئ الشخص حسابه من صفحة الدخول بنفس البريد وكود الدعوة الذي يظهر بعد الحفظ. شارك الكود بشكل خاص.'), fields: [{k: 'email', l: ['Email', 'البريد'], t: 'email', req: true}, {k: 'full_name', l: ['Full name', 'الاسم']}, {k: 'role', l: ['Role', 'الدور'], t: 'select', o: opts('role'), req: true, nullable: false}],
    onSave: async (v, M) => { v.email = v.email.toLowerCase(); v.code = Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join(''); await Q(sb.from('dc_invites').upsert(v)); M.close(); modal(T('Invitation created', 'تم إنشاء الدعوة'), h('div', null, h('p', null, v.email), h('div', {class: 'ok', style: 'font-size:24px;text-align:center;letter-spacing:4px'}, v.code), h('div', {class: 'act'}, h('button', {class: 'btn', onclick: () => { document.querySelector('.modalbg').remove(); renderRoute(); }}, 'OK')))); }})}, '＋ ' + T('Invite', 'دعوة')) : null),
    h('div', {class: 'card'}, h('h3', null, T('Users', 'المستخدمون')), tbl([[T('Name', 'الاسم'), r => h('b', null, r.full_name || '-')], [T('Email', 'البريد'), r => r.email], [T('Role', 'الدور'), r => adm ? sel('r', opts('role'), r.role, async e => { await Q(sb.from('dc_users').update({role: e.target.value}).eq('id', r.id)); toast(T('Role updated', 'تم تحديث الدور')); }) : lab('role', r.role)], [T('Active', 'نشط'), r => adm ? h('input', {type: 'checkbox', checked: r.active, onchange: async e => { await Q(sb.from('dc_users').update({active: e.target.checked}).eq('id', r.id)); toast(T('Updated', 'تم')); }}) : (r.active ? '✔' : '✘')]], S.users)),
    adm ? h('div', {class: 'card'}, h('h3', null, T('Pending invitations', 'الدعوات المعلقة')), tbl([[T('Email', 'البريد'), r => r.email], [T('Role', 'الدور'), r => lab('role', r.role)], [T('Status', 'الحالة'), r => S.users.some(u => u.email === r.email.toLowerCase()) ? chip(T('Accepted', 'مقبولة'), 'green') : chip(T('Pending', 'معلقة'), 'amber')], ['', r => h('button', {class: 'btn ghost sm', onclick: async () => { await Q(sb.from('dc_invites').delete().eq('email', r.email)); renderRoute(); }}, '✕')]], inv)) : null);
};
PAGES.categories = async () => {
  await loadLookups();
  return h('div', null, head(T('Dispute Categories', 'تصنيفات النزاعات'), '', can.legalHead() ? h('button', {class: 'btn gold', onclick: () => formModal({title: T('New category', 'تصنيف جديد'), fields: [{k: 'grp', l: ['Group', 'المجموعة'], t: 'select', o: opts('grp'), req: true, nullable: false}, {k: 'name_en', l: ['Name (English)', 'الاسم (إنجليزي)'], req: true}, {k: 'name_ar', l: ['Name (Arabic)', 'الاسم (عربي)']}], onSave: async (v, M) => { await Q(sb.from('dc_categories').insert(v)); await loadLookups(); M.close(); renderRoute(); }})}, '＋ ' + T('Add', 'إضافة')) : null),
    LBL.grp.map(g => h('div', {class: 'card'}, h('h3', null, lab('grp', g[0])), h('div', {class: 'row'}, S.cats.filter(c => c.grp === g[0]).map(c => chip(LANG === 'ar' ? (c.name_ar || c.name_en) : c.name_en, 'blue'))))));
};
PAGES.notifications = async () => {
  const rows = await Q(sb.from('dc_notifications').select('*').order('created_at', {ascending: false}).limit(100));
  if (rows.some(r => !r.read)) { await sb.from('dc_notifications').update({read: true}).eq('read', false); S.unread = 0; }
  return h('div', null, head(T('Notifications', 'الإشعارات'), T('In-app reminders. They are generated hourly and when you open the app.', 'تذكيرات داخل التطبيق، تُنشأ كل ساعة وعند فتح التطبيق.')), h('div', {class: 'card'}, tbl([[T('When', 'الوقت'), r => fmtDT(r.created_at)], [T('Message', 'الرسالة'), r => LANG === 'ar' ? r.message_ar : r.message_en], ['', r => r.dispute_id ? h('a', {href: '#/dispute/' + r.dispute_id + '/deadlines'}, T('Open', 'فتح')) : '']], rows)));
};
PAGES.search = async () => {
  const q = route.q.get('q') || ''; const rows = q ? await Q(sb.rpc('dc_search', {q})) : [];
  const names = {dispute: T('Dispute', 'نزاع'), document: T('Document', 'مستند'), correspondence: T('Correspondence', 'مراسلة'), event: T('Event', 'حدث'), claim: T('Claim', 'مطالبة')};
  return h('div', null, head(T('Search results', 'نتائج البحث'), '"' + q + '" · ' + rows.length), h('div', {class: 'card'}, tbl([[T('Type', 'النوع'), r => chip(names[r.kind] || r.kind, 'blue')], [T('Title', 'العنوان'), r => h('b', null, r.title)], [T('Excerpt', 'مقتطف'), r => r.snippet]], rows, r => go('dispute/' + r.dispute_id + '/' + ({document: 'evidence', correspondence: 'correspondence', event: 'timeline', claim: 'claims'}[r.kind] || 'overview')))));
};
