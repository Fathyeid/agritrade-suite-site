/* ---- stage 4: experts registry, team collaboration, own legal library, sample data ---- */
const EXP_KINDS = [['expert', 'Expert', 'خبير'], ['counsel', 'Legal counsel', 'مستشار قانوني'], ['arbitrator', 'Arbitrator candidate', 'محكّم مرشح'], ['other', 'Other', 'آخر']];
const canExp = () => ['super_admin', 'legal_director', 'legal_counsel', 'arbitration_manager'].includes(S.me?.role);
function expForm(r) {
  formModal({title: r ? T('Edit contact', 'تعديل جهة') : T('New expert / counsel', 'خبير / مستشار جديد'), values: r || {kind: 'expert'}, big: true,
    note: T('Record only what you have verified. Conflict notes are your own, the system does not check conflicts.', 'سجّل ما تحققت منه فقط. ملاحظات تعارض المصالح من عندك، النظام لا يفحص التعارض.'),
    fields: [{k: 'name', l: ['Name', 'الاسم'], req: true}, {k: 'kind', l: ['Type', 'النوع'], t: 'select', nullable: false, o: ko(EXP_KINDS)}, {k: 'specialty', l: ['Specialty', 'التخصص']}, {k: 'firm', l: ['Firm / organisation', 'الجهة']}, {k: 'country', l: ['Country', 'الدولة']}, {k: 'email', l: ['Email', 'البريد'], t: 'email'}, {k: 'phone', l: ['Phone', 'الهاتف']},
      {k: 'conflict_note', l: ['Conflict-of-interest note', 'ملاحظة تعارض المصالح'], t: 'textarea', wide: true}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (r) await Q(sb.from('dc_experts').update(v).eq('id', r.id)); else { v.created_by = S.me.id; await Q(sb.from('dc_experts').insert(v)); } M.close(); toast(T('Saved', 'تم الحفظ')); renderRoute(); }});
}
PAGES.experts = async () => {
  const rows = await Q(sb.from('dc_experts').select('*').order('name'));
  return h('div', null, head(T('Experts & Legal Counsel', 'الخبراء والمستشارون'), T('A registry you maintain. Nothing is pre-loaded.', 'سجل تحتفظ به أنت. لا شيء محمّل مسبقاً.'), canExp() ? h('button', {class: 'btn gold', onclick: () => expForm()}, '＋ ' + T('Add', 'إضافة')) : null),
    h('div', {class: 'card'}, tbl([[T('Name', 'الاسم'), r => h('b', null, r.name)], [T('Type', 'النوع'), r => kl(EXP_KINDS, r.kind)], [T('Specialty', 'التخصص'), r => r.specialty || '-'], [T('Firm', 'الجهة'), r => r.firm || '-'], [T('Country', 'الدولة'), r => r.country || '-'], [T('Conflict note', 'تعارض'), r => r.conflict_note ? chip(T('See note', 'يوجد'), 'gold') : '-'], ['', r => canExp() ? h('button', {class: 'btn ghost sm', onclick: () => expForm(r)}, T('Edit', 'تعديل')) : '']], rows)));
};
async function teamSection(d) {
  await loadLookups();
  const [de, ex, cm] = await Promise.all([Q(sb.from('dc_dispute_experts').select('*').eq('dispute_id', d.id)), Q(sb.from('dc_experts').select('id,name,kind')), Q(sb.from('dc_comments').select('*').eq('dispute_id', d.id).order('created_at', {ascending: false}))]);
  const w = can.dispute();
  const link = () => formModal({title: T('Link expert / counsel', 'ربط خبير / مستشار'), values: {}, fields: [{k: 'expert_id', l: ['Person', 'الشخص'], t: 'select', req: true, o: ex.map(e => [e.id, e.name])}, {k: 'role', l: ['Role in this dispute', 'الدور في النزاع']}, {k: 'note', l: ['Note', 'ملاحظة'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { v.dispute_id = d.id; v.created_by = S.me.id; await Q(sb.from('dc_dispute_experts').insert(v)); M.close(); renderRoute(); }});
  const add = (task) => formModal({title: task ? T('New task', 'مهمة جديدة') : T('New comment', 'تعليق جديد'), values: {is_task: task}, fields: task ? [{k: 'body', l: ['Task', 'المهمة'], t: 'textarea', req: true, wide: true}, {k: 'assignee', l: ['Assign to', 'إسناد إلى'], t: 'select', o: userOpts()}, {k: 'due_date', l: ['Due date', 'الموعد'], t: 'date'}] : [{k: 'body', l: ['Comment', 'التعليق'], t: 'textarea', req: true, wide: true}],
    onSave: async (v, M) => { v.dispute_id = d.id; v.is_task = task; v.created_by = S.me.id; await Q(sb.from('dc_comments').insert(v)); M.close(); renderRoute(); }});
  return h('div', null,
    h('div', {class: 'card'}, h('h3', null, T('Experts & counsel on this dispute', 'الخبراء والمستشارون في هذا النزاع'), h('span', {class: 'sp'}), w && ex.length ? h('button', {class: 'btn sm', onclick: link}, '＋ ' + T('Link', 'ربط')) : null),
      tbl([[T('Name', 'الاسم'), r => ex.find(e => e.id === r.expert_id)?.name || '-'], [T('Role', 'الدور'), r => r.role || '-'], [T('Note', 'ملاحظة'), r => r.note || '-'], ['', r => w ? h('button', {class: 'btn ghost sm', onclick: async () => { await Q(sb.from('dc_dispute_experts').delete().eq('id', r.id)); renderRoute(); }}, T('Unlink', 'فك الربط')) : '']], de)),
    h('div', {class: 'card'}, h('h3', null, T('Comments & tasks', 'التعليقات والمهام'), h('span', {class: 'sp'}), w ? [h('button', {class: 'btn sm', onclick: () => add(false)}, '＋ ' + T('Comment', 'تعليق')), ' ', h('button', {class: 'btn sm', onclick: () => add(true)}, '＋ ' + T('Task', 'مهمة'))] : null),
      cm.length ? tbl([[T('When', 'متى'), r => fmtDT(r.created_at)], [T('By', 'بواسطة'), r => userName(r.created_by)], [T('Type', 'النوع'), r => r.is_task ? chip(T('Task', 'مهمة'), r.done ? 'green' : 'gold') : chip(T('Comment', 'تعليق'))], [T('Text', 'النص'), r => r.body], [T('Assignee / due', 'المسؤول / الموعد'), r => r.is_task ? (r.assignee ? userName(r.assignee) : '-') + (r.due_date ? ' · ' + fmtD(r.due_date) : '') : ''], ['', r => r.is_task && w ? h('button', {class: 'btn ghost sm', onclick: async () => { await Q(sb.from('dc_comments').update({done: !r.done}).eq('id', r.id)); renderRoute(); }}, r.done ? T('Reopen', 'إعادة فتح') : T('Done', 'تم')) : '']], cm) : h('div', {class: 'mut'}, T('No comments yet.', 'لا توجد تعليقات.'))),
    h('div', {class: 'note'}, T('Comments and tasks cannot be edited or deleted by users; every change is in the audit log.', 'لا يمكن تعديل التعليقات أو حذفها من المستخدمين؛ كل تغيير مسجل في سجل التدقيق.')));
}
PAGES.collab = async () => {
  await loadLookups();
  const [cm, ds] = await Promise.all([Q(sb.from('dc_comments').select('*').eq('is_task', true).eq('done', false).order('due_date', {nullsFirst: false})), Q(sb.from('dc_disputes').select('id,ref_no'))]);
  return h('div', null, head(T('Team Collaboration', 'التعاون الداخلي'), T('Open tasks across all disputes you can see.', 'المهام المفتوحة في كل النزاعات التي تراها.')),
    h('div', {class: 'card'}, tbl([[T('Dispute', 'النزاع'), r => ds.find(d => d.id === r.dispute_id)?.ref_no || '-'], [T('Task', 'المهمة'), r => r.body], [T('Assignee', 'المسؤول'), r => r.assignee ? userName(r.assignee) : '-'], [T('Due', 'الموعد'), r => r.due_date ? fmtD(r.due_date) : '-']], cm, r => go('dispute/' + r.dispute_id + '/team'))));
};
/* own legal documents library: files the team uploads itself. No third-party text is bundled. */
function libForm() {
  formModal({title: T('Add document to library', 'إضافة مستند للمكتبة'), values: {}, big: true,
    note: T('Upload only documents you are entitled to keep (your own contracts, templates, internal memos, or material you hold a licence for). The system provides no legal texts.', 'ارفع فقط ما يحق لك الاحتفاظ به (عقودك وقوالبك ومذكراتك أو مواد مرخّصة لك). النظام لا يوفر أي نصوص قانونية.'),
    fields: [{k: 'file', l: ['File', 'الملف'], t: 'file', accept: ACCEPT + ',.txt', req: true, wide: true}, {k: 'title', l: ['Title', 'العنوان'], req: true}, {k: 'doc_type', l: ['Type', 'النوع']}, {k: 'jurisdiction', l: ['Jurisdiction (as you record it)', 'الاختصاص (كما تسجله)']}, {k: 'tags', l: ['Tags (comma separated)', 'وسوم (مفصولة بفواصل)']}, {k: 'source_note', l: ['Source / licence note', 'المصدر / ملاحظة الترخيص'], t: 'textarea', wide: true}],
    onSave: async (v, M) => {
      const f = v.file; if (f.size > 52428800) throw new Error(T('File is larger than 50 MB', 'الملف أكبر من 50 ميجا'));
      const hash = await sha256(await f.arrayBuffer()); const id = crypto.randomUUID(); const path = `${id}/${safeName(f.name)}`;
      const up = await sb.storage.from('dc-library').upload(path, f, {contentType: f.type || 'application/octet-stream', upsert: false}); if (up.error) throw up.error;
      const row = {id, title: v.title, doc_type: v.doc_type, jurisdiction: v.jurisdiction, tags: (v.tags || '').split(',').map(x => x.trim()).filter(Boolean), source_note: v.source_note, file_name: f.name, mime: f.type, size: f.size, sha256: hash, storage_path: path, created_by: S.me.id};
      const r = await sb.from('dc_library').insert(row); if (r.error) { await sb.storage.from('dc-library').remove([path]); throw r.error; }
      M.close(); toast(T('Saved', 'تم الحفظ')); renderRoute(); }});
}
PAGES.library = async () => {
  const rows = await Q(sb.from('dc_library').select('*').order('created_at', {ascending: false}));
  const inp = h('input', {placeholder: T('Search title, tag, type, jurisdiction', 'ابحث بالعنوان أو الوسم أو النوع أو الاختصاص')});
  const box = h('div', {class: 'card'});
  const draw = () => { const q = inp.value.trim().toLowerCase(); const list = rows.filter(r => !q || [r.title, r.doc_type, r.jurisdiction, (r.tags || []).join(' '), r.file_name].join(' ').toLowerCase().includes(q)); box.innerHTML = '';
    box.append(tbl([[T('Title', 'العنوان'), r => h('b', null, r.title)], [T('Type', 'النوع'), r => r.doc_type || '-'], [T('Jurisdiction', 'الاختصاص'), r => r.jurisdiction || '-'], [T('Tags', 'الوسوم'), r => (r.tags || []).map(t => chip(t)) ], ['SHA-256', r => h('span', {class: 'mut sm'}, (r.sha256 || '').slice(0, 12) + '…')], ['', r => h('button', {class: 'btn ghost sm', onclick: async () => { const {data, error} = await sb.storage.from('dc-library').createSignedUrl(r.storage_path, 120); if (error) return toast(error.message, true); window.open(data.signedUrl, '_blank'); }}, T('Open', 'فتح'))]], list)); };
  inp.oninput = draw; draw();
  return h('div', null, head(T('My Legal Library', 'مكتبتي القانونية'), T('Your own documents only. No third-party legal texts are included.', 'مستنداتك أنت فقط. لا تتضمن نصوصاً قانونية من طرف ثالث.'), canExp() ? h('button', {class: 'btn gold', onclick: libForm}, '＋ ' + T('Add document', 'إضافة مستند')) : null), h('div', {class: 'card'}, inp), box);
};
PAGES.sample = async () => {
  if (!can.admin()) return h('div', {class: 'note'}, T('Super administrator only.', 'للمدير الأعلى فقط.'));
  const ex = await Q(sb.from('dc_disputes').select('id').eq('ref_no', 'SAMPLE-0001'));
  return h('div', null, head(T('Sample Data', 'بيانات تجريبية')),
    h('div', {class: 'card'}, h('p', null, T('Creates one clearly labelled sample dispute (SAMPLE-0001, "not real") so you can see how the system looks. It never mixes with real data and can be deleted with one click. Only records whose reference starts with SAMPLE- are deleted.', 'ينشئ نزاعاً تجريبياً واحداً مكتوباً عليه بوضوح أنه غير حقيقي (SAMPLE-0001) لتشاهد شكل النظام. لا يختلط بالبيانات الحقيقية ويُحذف بضغطة واحدة. تُحذف فقط السجلات التي رقمها يبدأ بـ SAMPLE-.')),
      h('div', {class: 'row', style: 'gap:8px'}, h('button', {class: 'btn gold', disabled: ex.length ? true : null, onclick: async () => { const r = await sb.rpc('dc_sample_load'); if (r.error) return toast(r.error.message, true); toast(T('Sample loaded', 'تم تحميل العينة')); renderRoute(); }}, T('Load sample case', 'تحميل حالة تجريبية')),
        h('button', {class: 'btn ghost', disabled: ex.length ? null : true, onclick: async () => { if (!confirm(T('Delete all sample data?', 'حذف كل البيانات التجريبية؟'))) return; const r = await sb.rpc('dc_sample_delete'); if (r.error) return toast(r.error.message, true); toast(T('Sample data deleted', 'تم حذف العينة')); renderRoute(); }}, T('Delete sample data', 'حذف البيانات التجريبية')))));
};
boot();
