/* ===== core: labels, helpers, auth, shell ===== */
const sb = supabase.createClient(DC_CFG.url, DC_CFG.key, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'dc-center-auth'}});
let LANG = localStorage.getItem('dc_lang') || 'ar';
const T = (en, ar) => LANG === 'ar' ? (ar || en) : en;
const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg, bad) { const t = h('div', {class: 'toast' + (bad ? ' bad' : '')}, msg); document.body.append(t); setTimeout(() => t.remove(), 3800); }
async function Q(p) { const r = await p; if (r.error) { console.error(r.error); toast((r.error.message || 'Error'), true); throw r.error; } return r.data; }

/* ---- label dictionaries [key,en,ar] ---- */
const LBL = {
  status: [['new','Newly Registered','تم التسجيل'],['investigation','Under Investigation','قيد التحقيق'],['evidence','Evidence Collection','جمع الأدلة'],['legal_review','Legal Review','المراجعة القانونية'],['notice','Notice of Claim','إخطار بالمطالبة'],['negotiation','Negotiation','التفاوض'],['mediation','Mediation','الوساطة'],['arb_filed','Arbitration Filed','رفع دعوى تحكيم'],['arb_proceedings','Arbitration Proceedings','إجراءات التحكيم'],['award','Award Issued','صدور حكم التحكيم'],['enforcement','Enforcement','التنفيذ'],['settled','Settled','تمت التسوية'],['closed','Closed','مغلق']],
  risk: [['low','Low Risk','خطورة منخفضة'],['medium','Medium Risk','خطورة متوسطة'],['high','High Risk','خطورة عالية'],['critical','Critical Risk','خطورة حرجة']],
  priority: [['low','Low','منخفضة'],['medium','Medium','متوسطة'],['high','High','عالية'],['critical','Critical','حرجة']],
  role: [['super_admin','Super Administrator','مدير النظام'],['legal_director','Legal Director','المدير القانوني'],['legal_counsel','Legal Counsel','مستشار قانوني'],['arbitration_manager','Arbitration Manager','مدير التحكيم'],['commercial_manager','Commercial Manager','المدير التجاري'],['trade_ops_manager','Trade Operations Manager','مدير عمليات التجارة'],['claims_officer','Claims Officer','مسؤول المطالبات'],['document_controller','Document Controller','مراقب المستندات'],['financial_controller','Financial Controller','المراقب المالي'],['quality_manager','Quality Manager','مدير الجودة'],['external_counsel','External Legal Counsel','مستشار قانوني خارجي'],['auditor','Auditor (read-only)','مراجع (قراءة فقط)']],
  prole: [['seller','Seller','البائع'],['buyer','Buyer','المشتري'],['broker','Broker','الوسيط'],['shipping_company','Shipping Company','شركة الشحن'],['charterer','Charterer','المستأجر'],['vessel_owner','Vessel Owner','مالك السفينة'],['inspection_company','Inspection Company','شركة الفحص'],['insurance_company','Insurance Company','شركة التأمين'],['other','Other Party','طرف آخر']],
  ptype: [['company','Company','شركة'],['individual','Individual','فرد'],['bank','Bank','بنك'],['shipping','Shipping','شحن'],['inspection','Inspection','فحص'],['insurance','Insurance','تأمين'],['law_firm','Law firm','مكتب محاماة'],['other','Other','أخرى']],
  grp: [['contractual','Contractual Disputes','نزاعات تعاقدية'],['quality','Commodity Quality','جودة السلعة'],['shipping','Shipping & Maritime','الشحن والنقل البحري'],['payment','Payment & Financial','المدفوعات والمالية'],['inspection','Inspection & Certification','الفحص والشهادات']],
  doctype: [['contract','Commercial Contract','عقد تجاري'],['amendment','Contract Amendment','ملحق عقد'],['po','Purchase Order','أمر شراء'],['proforma','Proforma Invoice','فاتورة مبدئية'],['invoice','Commercial Invoice','فاتورة تجارية'],['bl','Bill of Lading','بوليصة شحن'],['coo','Certificate of Origin','شهادة منشأ'],['coa','Certificate of Analysis','شهادة تحليل'],['phyto','Phytosanitary Certificate','شهادة صحة نباتية'],['fumigation','Fumigation Certificate','شهادة تبخير'],['inspection','Inspection Report','تقرير فحص'],['weight','Weight Certificate','شهادة وزن'],['draft_survey','Draft Survey Report','تقرير الغاطس'],['sof','Statement of Facts','بيان الوقائع'],['nor','NOR Document','إخطار الجاهزية'],['laytime','Laytime Calculation','حساب مدة التحميل'],['demurrage_inv','Demurrage Invoice','فاتورة ديمرج'],['shipping_docs','Shipping Documents','مستندات الشحن'],['bank','Bank Correspondence','مراسلات بنكية'],['payment_conf','Payment Confirmation','تأكيد سداد'],['email','Email Correspondence','مراسلات بريد'],['whatsapp','WhatsApp Correspondence','مراسلات واتساب'],['minutes','Meeting Minutes','محضر اجتماع'],['media','Photographs and Videos','صور وفيديو'],['expert','Expert Report','تقرير خبير'],['legal_notice','Legal Notice','إخطار قانوني'],['arb_submission','Arbitration Submission','مذكرة تحكيم'],['award','Arbitration Award','حكم تحكيم'],['other','Other','أخرى']],
  conf: [['public','Internal','داخلي'],['confidential','Confidential','سري'],['highly','Highly Confidential','سري للغاية'],['privileged','Legally Privileged','محمي بسرية قانونية']],
  verif: [['unverified','Unverified','لم يتم التحقق'],['verified','Verified','تم التحقق'],['disputed','Disputed','محل نزاع'],['claimed','Claimed by a party','مدّعى به']],
  importance: [['low','Low','منخفضة'],['normal','Normal','عادية'],['high','High','عالية'],['key','Key evidence','دليل أساسي']],
  evcat: [['contractual','Contractual','تعاقدية','#1f63d6'],['shipping','Shipping','شحن','#0e8f9c'],['financial','Financial','مالية','#d9a21b'],['quality','Quality','جودة','#1f9d63'],['communication','Communication','مراسلات','#8a5cd6'],['legal','Legal','قانونية','#d64545']],
  evtype: [['Contract Signing','Contract Signing','توقيع العقد','contractual'],['Advance Payment','Advance Payment','دفعة مقدمة','financial'],['Loading Commencement','Loading Commencement','بدء التحميل','shipping'],['Loading Completion','Loading Completion','اكتمال التحميل','shipping'],['Vessel Departure','Vessel Departure','إبحار السفينة','shipping'],['ETA Update','ETA Updates','تحديث الوصول المتوقع','shipping'],['NOR Tendered','NOR Tendered','تقديم إخطار الجاهزية','shipping'],['NOR Accepted','NOR Accepted','قبول إخطار الجاهزية','shipping'],['Discharge Commencement','Discharge Commencement','بدء التفريغ','shipping'],['Discharge Completion','Discharge Completion','اكتمال التفريغ','shipping'],['Quality Inspection','Quality Inspection','فحص الجودة','quality'],['Quality Rejection','Quality Rejection','رفض الجودة','quality'],['Payment Due Date','Payment Due Date','تاريخ استحقاق الدفع','financial'],['Payment Default','Payment Default','التخلف عن الدفع','financial'],['Claim Notification','Claim Notification','إخطار بالمطالبة','legal'],['Contractual Notice','Contractual Notice','إخطار تعاقدي','contractual'],['Negotiation Meeting','Negotiation Meeting','اجتماع تفاوض','communication'],['Arbitration Filing','Arbitration Filing','رفع التحكيم','legal'],['Hearing Date','Hearing Date','جلسة','legal'],['Arbitration Award','Arbitration Award','حكم التحكيم','legal'],['Other','Other','حدث آخر','contractual']],
  claimtype: [['principal','Principal / price','أصل المبلغ'],['quality','Quality claim','مطالبة جودة'],['quantity','Quantity claim','مطالبة كمية'],['demurrage','Demurrage','ديمرج'],['despatch','Despatch','ديسباتش'],['freight','Freight','شحن'],['cargo_loss','Cargo loss/damage','فقد/تلف'],['penalty','Contractual penalty','غرامة تعاقدية'],['other','Other','أخرى']],
  claimstatus: [['open','Open','مفتوحة'],['partially_settled','Partially settled','مسددة جزئياً'],['settled','Settled','مسددة'],['withdrawn','Withdrawn','مسحوبة'],['awarded','Awarded','صدر بها حكم']],
  component: [['Principal Amount','Principal Amount','أصل المبلغ'],['Contractual Penalties','Contractual Penalties','غرامات تعاقدية'],['Demurrage','Demurrage','ديمرج'],['Despatch','Despatch','ديسباتش'],['Freight','Freight','شحن'],['Cargo Loss','Cargo Loss','فقد الشحنة'],['Quality Discount','Quality Discount','خصم جودة'],['Replacement Cost','Replacement Cost','تكلفة بديلة'],['Storage Cost','Storage Cost','تكلفة تخزين'],['Inspection Cost','Inspection Cost','تكلفة فحص'],['Interest','Interest','فوائد'],['Legal Fees','Legal Fees','أتعاب قانونية'],['Arbitration Fees','Arbitration Fees','رسوم تحكيم'],['Other Recoverable Costs','Other Recoverable Costs','تكاليف أخرى قابلة للاسترداد']],
  dlcat: [['Claim Notification Deadline','Claim Notification Deadline','موعد إخطار المطالبة'],['Contractual Notice Deadline','Contractual Notice Deadline','موعد الإخطار التعاقدي'],['Arbitration Filing Deadline','Arbitration Filing Deadline','موعد رفع التحكيم'],['Response Deadline','Response Deadline','موعد الرد'],['Document Submission Deadline','Document Submission Deadline','موعد تقديم المستندات'],['Arbitrator Appointment Deadline','Arbitrator Appointment Deadline','موعد تعيين المحكم'],['Hearing Date','Hearing Date','موعد الجلسة'],['Expert Report Deadline','Expert Report Deadline','موعد تقرير الخبير'],['Payment Deadline','Payment Deadline','موعد السداد'],['Award Compliance Deadline','Award Compliance Deadline','موعد الالتزام بالحكم']],
  corr: [['email','Email','بريد إلكتروني'],['supplier','Supplier communication','مراسلة مورد'],['buyer','Buyer communication','مراسلة مشتري'],['broker','Broker communication','مراسلة وسيط'],['agent','Shipping agent communication','مراسلة وكيل ملاحي'],['inspection','Inspection company communication','مراسلة شركة فحص'],['bank','Bank correspondence','مراسلة بنكية'],['legal','Legal correspondence','مراسلة قانونية'],['meeting','Meeting record','سجل اجتماع'],['negotiation','Negotiation record','سجل تفاوض']],
  commodity: [['Wheat','Wheat','قمح'],['Corn','Corn','ذرة'],['Soybeans','Soybeans','فول صويا'],['Soybean meal','Soybean meal','كسب فول الصويا'],['Sunflower oil','Sunflower oil','زيت عباد الشمس'],['Soybean oil','Soybean oil','زيت فول الصويا'],['Barley','Barley','شعير'],['Sugar','Sugar','سكر'],['Rice','Rice','أرز'],['Other','Other','أخرى']],
  incoterm: ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].map(x => [x, x, x]),
  currency: ['USD','EUR','EGP','GBP','AED','SAR','RUB','UAH','CNY','JPY'].map(x => [x, x, x])
};
function lab(g, k) { const r = (LBL[g] || []).find(x => x[0] === k); if (!r) return k ?? ''; return LANG === 'ar' ? r[2] : r[1]; }
function opts(g) { return LBL[g].map(r => [r[0], LANG === 'ar' ? r[2] : r[1]]); }
const STATUS_ORDER = LBL.status.map(x => x[0]);
const ROLE_WRITE = ['super_admin','legal_director','legal_counsel','arbitration_manager','commercial_manager','trade_ops_manager','claims_officer','document_controller','quality_manager','financial_controller'];

/* ---- formatters ---- */
const fmtN = (n, d = 0) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const usd = n => '$' + fmtN(n, 0);
const money = (n, c) => fmtN(n, 2) + ' ' + (c || '');
const fmtD = d => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(LANG === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {year: 'numeric', month: 'short', day: 'numeric'}) : '-';
const fmtDT = d => d ? new Date(d).toLocaleString(LANG === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-';
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
function csvDownload(name, rows) {
  const c = rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
  const a = h('a', {href: URL.createObjectURL(new Blob(['\ufeff' + c], {type: 'text/csv;charset=utf-8'})), download: name}); document.body.append(a); a.click(); a.remove();
}
function printHTML(title, body) {
  const w = window.open('', '_blank'); if (!w) { toast(T('Allow pop-ups to print', 'اسمح بالنوافذ المنبثقة للطباعة'), true); return; }
  w.document.write(`<html dir="${LANG === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Cairo,Arial,sans-serif;padding:28px;color:#111}h1{font-size:20px;color:#0f2a5c}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #ccd;padding:6px 8px;text-align:start;vertical-align:top}th{background:#eef2fb}.d{background:#fff3d1;border:1px solid #e0b84a;padding:6px 10px;font-size:12px;margin:10px 0}</style></head><body><h1>${esc(title)}</h1><div class="d">${esc(T('Draft record generated from the Trade Dispute & Arbitration Center. Requires review by an authorised person.', 'سجل مولّد من مركز النزاعات التجارية والتحكيم. يحتاج إلى مراجعة من شخص مخوّل.'))} ${esc(new Date().toLocaleString())}</div>${body}</body></html>`);
  w.document.close(); setTimeout(() => w.print(), 400);
}

/* ---- modal & forms ---- */
function modal(title, content, o = {}) {
  const bg = h('div', {class: 'modalbg', onmousedown: e => { if (e.target === bg && !o.sticky) bg.remove(); }});
  const m = h('div', {class: 'modal' + (o.big ? ' big' : '')}, h('h2', null, title), content);
  bg.append(m); document.body.append(bg); return {bg, close: () => bg.remove(), el: m};
}
function field(f, val) {
  let el;
  const lbl = typeof f.l === 'string' ? f.l : T(f.l[0], f.l[1]);
  if (f.t === 'select') {
    el = h('select', {name: f.k}, f.nullable !== false ? h('option', {value: ''}, '—') : null, (f.o || []).map(o => h('option', {value: o[0]}, o[1])));
  } else if (f.t === 'textarea') el = h('textarea', {name: f.k, placeholder: f.ph || ''});
  else if (f.t === 'checkbox') el = h('input', {type: 'checkbox', name: f.k});
  else if (f.t === 'file') el = h('input', {type: 'file', name: f.k, accept: f.accept || ''});
  else el = h('input', {type: f.t || 'text', name: f.k, placeholder: f.ph || '', step: f.t === 'number' ? 'any' : null, list: f.list || null});
  if (val != null && f.t !== 'file') { if (f.t === 'checkbox') el.checked = !!val; else el.value = val; }
  if (f.req) el.required = true;
  return h('div', {class: f.wide ? 'wide' : ''}, f.t === 'checkbox' ? h('label', {class: 'f row'}, el, lbl) : [h('label', {class: 'f'}, lbl + (f.req ? ' *' : '')), el]);
}
function formModal({title, fields, values = {}, onSave, big, saveLabel, note}) {
  const form = h('form', {class: 'formgrid', novalidate: true});
  fields.forEach(f => form.append(field(f, values[f.k])));
  const err = h('div', {class: 'err hidden'});
  const save = h('button', {class: 'btn', type: 'submit'}, saveLabel || T('Save', 'حفظ'));
  const cancel = h('button', {class: 'btn ghost', type: 'button'}, T('Cancel', 'إلغاء'));
  const wrap = h('div', null, note ? h('div', {class: 'note'}, note) : null, form, err, h('div', {class: 'act'}, cancel, save));
  const M = modal(title, wrap, {big, sticky: true});
  cancel.onclick = M.close;
  const submit = async () => {
    err.classList.add('hidden');
    const v = {};
    for (const f of fields) {
      const el = form.elements[f.k]; let x;
      if (f.t === 'checkbox') x = el.checked;
      else if (f.t === 'file') x = el.files[0] || null;
      else { x = el.value.trim(); if (x === '') x = null; else if (f.t === 'number') x = Number(x); }
      if (f.req && (x == null || x === false)) { err.textContent = T('Required: ', 'مطلوب: ') + (typeof f.l === 'string' ? f.l : T(f.l[0], f.l[1])); err.classList.remove('hidden'); return; }
      v[f.k] = x;
    }
    save.disabled = true;
    try { await onSave(v, M); } catch (e) { err.textContent = e.message || String(e); err.classList.remove('hidden'); save.disabled = false; return; }
    save.disabled = false;
  };
  form.onsubmit = e => { e.preventDefault(); submit(); };
  save.onclick = e => { e.preventDefault(); submit(); };
  return M;
}
function confirmBox(msg, fn) {
  const ok = h('button', {class: 'btn red'}, T('Confirm', 'تأكيد')), no = h('button', {class: 'btn ghost'}, T('Cancel', 'إلغاء'));
  const M = modal(T('Confirm', 'تأكيد'), h('div', null, h('p', null, msg), h('div', {class: 'act'}, no, ok)));
  no.onclick = M.close; ok.onclick = async () => { M.close(); await fn(); };
}

/* ---- state ---- */
const S = {user: null, me: null, cats: [], parties: [], users: [], contracts: [], notifs: []};
const can = {
  write: () => ROLE_WRITE.includes(S.me?.role) || S.me?.role === 'external_counsel',
  dispute: () => ['super_admin','legal_director','legal_counsel','arbitration_manager','commercial_manager','claims_officer'].includes(S.me?.role),
  claims: () => ['super_admin','legal_director','legal_counsel','arbitration_manager','commercial_manager','claims_officer','financial_controller'].includes(S.me?.role),
  admin: () => S.me?.role === 'super_admin',
  legalHead: () => ['super_admin','legal_director'].includes(S.me?.role),
  readonly: () => S.me?.role === 'auditor'
};
async function loadLookups() {
  const [c, p, u, k, ins] = await Promise.all([
    Q(sb.from('dc_categories').select('*').eq('active', true).order('grp').order('name_en')),
    Q(sb.from('dc_parties').select('*').order('name')),
    Q(sb.from('dc_users').select('id,email,full_name,role,active').order('full_name')),
    Q(sb.from('dc_contracts').select('*').is('voided_at', null).order('contract_date', {ascending: false})),
    sb.from('dc_institutions').select('*').order('name').then(r => r.data || [])
  ]);
  S.insts = ins; S.cats = c; S.parties = p; S.users = u; S.contracts = k;
  try { const vr = await sb.from('dc_contracts').select('*').not('voided_at', 'is', null).order('voided_at', {ascending: false}); S.voidedContracts = vr.error ? [] : (vr.data || []); } catch (e) { S.voidedContracts = []; }
}
const catName = id => { const c = S.cats.find(x => x.id === id); return c ? (LANG === 'ar' ? (c.name_ar || c.name_en) : c.name_en) : '-'; };
const partyName = id => S.parties.find(x => x.id === id)?.name || '-';
const userName = id => { const u = S.users.find(x => x.id === id); return u ? (u.full_name || u.email) : '-'; };
const partyOpts = () => S.parties.map(p => [p.id, p.name + (p.country ? ' (' + p.country + ')' : '')]);
const userOpts = () => S.users.filter(u => u.active && u.role !== 'external_counsel').map(u => [u.id, u.full_name || u.email]);
const catOpts = () => S.cats.map(c => [c.id, lab('grp', c.grp) + ' › ' + (LANG === 'ar' ? (c.name_ar || c.name_en) : c.name_en)]);
function chip(txt, cls) { return h('span', {class: 'chip ' + (cls || '')}, txt); }
const statusChip = s => chip(lab('status', s), ['settled', 'closed'].includes(s) ? 'green' : ['arb_filed', 'arb_proceedings', 'award', 'enforcement'].includes(s) ? 'dark' : ['negotiation', 'mediation'].includes(s) ? 'gold' : 'blue');
const riskChip = r => chip(lab('risk', r), {low: 'green', medium: 'amber', high: 'red', critical: 'dark'}[r]);

/* ---- app shell ---- */
const NAV = [
  ['MAIN', 'الرئيسية', [['dashboard','Dispute Dashboard','لوحة النزاعات','▦'], ['new','Register New Dispute','تسجيل نزاع جديد','＋'], ['disputes','All Disputes','كل النزاعات','☰']]],
  ['CASE FILE', 'ملف القضية', [['evidence','Evidence Management','إدارة الأدلة','🗂'], ['correspondence','Correspondence Archive','أرشيف المراسلات','✉'], ['timeline','Dispute Timeline','التسلسل الزمني','⏱'], ['claims','Claims & Counterclaims','المطالبات والمطالبات المقابلة','⚖'], ['contracts','Contracts & Parties','العقود والأطراف','📄'], ['calendar','Legal Calendar','التقويم القانوني','📅']]],
  ['ARBITRATION', 'التحكيم', [['institutions','Arbitration Institutions','مؤسسات التحكيم','🏛'], ['s:rules','Arbitration Rules Library','مكتبة القواعد','📚'], ['arbcases','Arbitration Case Management','إدارة قضايا التحكيم','🧭'], ['settlements','Settlement & Negotiations','التسويات والمفاوضات','🤝']]],
  ['TOOLS', 'الأدوات', [['gen','Legal Document Generator','مولد المستندات','📝'], ['experts','Experts & Legal Counsel','الخبراء والمستشارون','👤'], ['library','My Legal Library','مكتبتي القانونية','📖'], ['s:case-law','Case Law & Decisions','الأحكام والقرارات','🔎'], ['collab','Team Collaboration','التعاون الداخلي','💬'], ['fin','Financial Exposure','التحليل المالي','💰'], ['reports','Reports & Analytics','التقارير والتحليلات','📊'], ['ai','Records Assistant','مساعد السجلات','✦']]],
  ['ADMIN', 'الإدارة', [['audit','Audit Trail & Security','سجل التدقيق والأمان','🛡'], ['users','Users & Access','المستخدمون والصلاحيات','👥'], ['categories','Dispute Categories','تصنيفات النزاعات','🏷'], ['sample','Sample Data','بيانات تجريبية','🧪']]]
];
let route = {name: 'dashboard', args: []};
function parseHash() { const p = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0].split('/'); route = {name: p[0] || 'dashboard', args: p.slice(1), q: new URLSearchParams((location.hash.split('?')[1]) || '')}; }
function go(path) { location.hash = '#/' + path; }
async function renderShell() {
  const root = $('#root'); root.innerHTML = '';
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  const side = h('aside', {class: 'side', id: 'side'},
    h('div', {class: 'brand'}, h('img', {src: 'globe.png'}), h('div', null, 'AgriTrade ', h('b', null, 'Pro'), h('small', null, 'Dispute & Arbitration Center'))),
    h('div', {class: 'nav'}, NAV.map(g => [h('div', {class: 'ttl'}, LANG === 'ar' ? g[1] : g[0]), g[2].map(n => n[0].startsWith('s:')
      ? h('div', {class: 'soon'}, h('span', {class: 'ic'}, n[3]), T(n[1], n[2]), h('em', null, T('Soon', 'قريباً')))
      : ((n[0] === 'audit' || n[0] === 'users' || n[0] === 'categories') && !['super_admin', 'legal_director', 'auditor'].includes(S.me.role) ? null :
        h('a', {href: '#/' + n[0], 'data-r': n[0]}, h('span', {class: 'ic'}, n[3]), T(n[1], n[2]))))])));
  const bell = h('button', {class: 'iconbtn', onclick: () => go('notifications'), title: T('Notifications', 'الإشعارات')}, '🔔', S.unread ? h('b', null, S.unread) : null);
  const sInput = h('input', {placeholder: T('Search disputes, documents, emails, events…', 'ابحث في النزاعات والمستندات والمراسلات…'), onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) go('search?q=' + encodeURIComponent(e.target.value.trim())); }});
  const top = h('div', {class: 'top'},
    h('button', {class: 'iconbtn burger', onclick: () => $('#side').classList.toggle('open')}, '☰'),
    h('div', {class: 'search'}, h('span', null, '⌕'), sInput), h('div', {class: 'sp'}),
    h('button', {class: 'iconbtn', style: 'width:auto;padding:0 12px;font-weight:700;color:#1f63d6', onclick: () => { LANG = LANG === 'ar' ? 'en' : 'ar'; localStorage.setItem('dc_lang', LANG); renderShell(); }}, LANG === 'ar' ? 'English' : 'العربية'),
    bell,
    h('div', {class: 'me', onclick: () => confirmBox(T('Sign out?', 'تسجيل الخروج؟'), async () => { await sb.auth.signOut(); location.hash = ''; boot(); })},
      h('div', {class: 'av'}, (S.me.full_name || S.me.email || '?')[0].toUpperCase()), h('div', {class: 'sm'}, h('b', null, S.me.full_name || S.me.email), h('div', {class: 'mut'}, lab('role', S.me.role)))));
  root.append(h('div', {class: 'app'}, side, h('div', {class: 'main'}, top, h('div', {class: 'page', id: 'page'}))));
  await renderRoute();
}
const BIMG = {dashboard: '41151140', disputes: '41151140', new: '5669619', dispute: '5669602', evidence: '30115463', institutions: '5669602', arb: '30115463', settle: '5669619', fin: '41151140', reports: '41151140'};
function banner(r) {
  let it = null; NAV.forEach(g => g[2].forEach(x => { if (x[0] === r) it = x; }));
  const img = BIMG[r] || '5669619';
  const title = it ? T(it[1], it[2]) : T('Dispute File', 'ملف النزاع');
  return h('div', {class: 'banner', style: 'background-image:linear-gradient(90deg,rgba(15,42,92,.88),rgba(15,42,92,.35)),url(' + img + '.jpg)'}, h('i', null, it ? it[3] : '⚖'), h('div', null, h('b', null, title), h('span', null, T('Document · Prove · Resolve international trade disputes', 'وثّق · أثبت · احسم النزاعات التجارية الدولية'))));
}
async function renderRoute() {
  parseHash();
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route.name || (route.name === 'dispute' && a.dataset.r === 'disputes')));
  $('#side')?.classList.remove('open');
  const pg = $('#page'); if (!pg) return; pg.innerHTML = '';
  pg.append(h('div', {class: 'empty'}, T('Loading…', 'جاري التحميل…')));
  const fn = PAGES[route.name] || PAGES.dashboard;
  try { const out = await fn(...route.args); pg.innerHTML = ''; pg.append(banner(route.name)); if (out) pg.append(out); pg.append(h('div', {class: 'credit'}, T('Photos: Pexels (free licence)', 'الصور: Pexels (ترخيص مجاني)'))); } catch (e) { console.error(e); pg.innerHTML = ''; pg.append(h('div', {class: 'err'}, (e && e.message) || String(e))); }
}
window.addEventListener('hashchange', () => { if (S.me) renderRoute(); });
const PAGES = {};

/* ---- auth / boot ---- */
async function refreshUnread() {
  try { await sb.rpc('dc_run_reminders'); } catch (e) {}
  const {count} = await sb.from('dc_notifications').select('id', {count: 'exact', head: true}).eq('read', false);
  S.unread = count || 0;
}
async function afterLogin(code) {
  const {data, error} = await sb.rpc('dc_claim', {p_code: code || null});
  if (error || !data || !data.ok) { return {ok: false, reason: (data && data.reason) || (error && error.message) || 'no_access'}; }
  const {data: me} = await sb.from('dc_users').select('*').eq('id', (await sb.auth.getUser()).data.user.id).single();
  S.me = me; await loadLookups(); await refreshUnread();
  return {ok: true};
}
function loginView(opts = {}) {
  const root = $('#root'); root.innerHTML = '';
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  let mode = opts.recovery ? 'recovery' : 'in';
  const msg = h('div', {class: 'hidden'});
  const show = (t, ok) => { msg.className = ok ? 'ok' : 'err'; msg.textContent = t; };
  const em = h('input', {type: 'email', placeholder: 'name@company.com', autocomplete: 'username'});
  const pw = h('input', {type: 'password', placeholder: '••••••••', autocomplete: 'current-password'});
  const pw2 = h('input', {type: 'password', placeholder: '••••••••', autocomplete: 'new-password'});
  const code = h('input', {placeholder: T('Invitation code', 'كود الدعوة')});
  const nm = h('input', {placeholder: T('Full name', 'الاسم الكامل')});
  const btn = h('button', {class: 'btn full', type: 'submit'});
  const form = h('form', null);
  const gbtn = h('button', {type: 'button', class: 'btn full', style: 'background:#fff;color:#14233f;border:1px solid #d5deec;box-shadow:none', onclick: async () => {
    const {error} = await sb.auth.signInWithOAuth({provider: 'google', options: {redirectTo: location.origin + '/'}});
    if (error) show(error.message);
  }}, T('Continue with Google', 'المتابعة عبر Google'));
  const tabIn = h('button', {type: 'button', onclick: () => { mode = 'in'; draw(); }}, T('Sign in', 'تسجيل الدخول'));
  const tabUp = h('button', {type: 'button', onclick: () => { mode = 'up'; draw(); }}, T('Create account', 'إنشاء حساب'));
  const forgot = h('button', {type: 'button', class: 'link', style: 'margin-top:12px;display:block', onclick: async () => {
    if (!em.value.trim()) return show(T('Type your email first', 'اكتب بريدك الإلكتروني أولاً'));
    const {error} = await sb.auth.resetPasswordForEmail(em.value.trim(), {redirectTo: location.origin + '/'});
    error ? show(error.message) : show(T('Password reset email sent. Open the newest link on this device.', 'تم إرسال رابط إعادة تعيين كلمة المرور. افتح أحدث رابط على هذا الجهاز.'), true);
  }}, T('Forgot password?', 'نسيت كلمة المرور؟'));
  function draw() {
    form.innerHTML = ''; msg.className = 'hidden';
    tabIn.parentElement && [tabIn, tabUp].forEach(b => b.classList.remove('on'));
    if (mode === 'recovery') { form.append(h('label', {class: 'f'}, T('New password (8+ characters)', 'كلمة المرور الجديدة (8 أحرف أو أكثر)')), pw2, h('div', {style: 'height:16px'}), btn); btn.textContent = T('Save password', 'حفظ كلمة المرور'); }
    else if (mode === 'in') { tabIn.classList.add('on'); form.append(h('label', {class: 'f'}, T('Email', 'البريد الإلكتروني')), em, h('label', {class: 'f'}, T('Password', 'كلمة المرور')), pw, h('div', {style: 'height:18px'}), btn, h('div', {style: 'text-align:center;color:#8a97ad;margin:12px 0 8px;font-size:13px'}, T('or', 'أو')), gbtn, forgot); btn.textContent = T('Sign in', 'تسجيل الدخول'); }
    else { tabUp.classList.add('on'); form.append(h('label', {class: 'f'}, T('Full name', 'الاسم الكامل')), nm, h('label', {class: 'f'}, T('Email', 'البريد الإلكتروني')), em, h('label', {class: 'f'}, T('Password', 'كلمة المرور')), pw, h('label', {class: 'f'}, T('Invitation code', 'كود الدعوة')), code, h('div', {style: 'height:18px'}), btn); btn.textContent = T('Create account', 'إنشاء الحساب'); }
    form.append(msg);
  }
  form.onsubmit = async e => {
    e.preventDefault(); btn.disabled = true; msg.className = 'hidden';
    try {
      if (mode === 'recovery') {
        if (pw2.value.length < 8) throw new Error(T('At least 8 characters', '8 أحرف على الأقل'));
        const {error} = await sb.auth.updateUser({password: pw2.value}); if (error) throw error;
        history.replaceState(null, '', location.pathname); return boot();
      }
      if (mode === 'up') {
        if (!code.value.trim()) throw new Error(T('Invitation code is required', 'كود الدعوة مطلوب'));
        const {error} = await sb.auth.signUp({email: em.value.trim(), password: pw.value, options: {data: {full_name: nm.value.trim(), app: 'dc'}}});
        if (error && !/already/i.test(error.message)) throw error;
        const r = await sb.auth.signInWithPassword({email: em.value.trim(), password: pw.value}); if (r.error) throw r.error;
        const a = await afterLogin(code.value.trim()); if (!a.ok) { await sb.auth.signOut(); throw new Error(a.reason === 'code_required' ? T('Wrong invitation code', 'كود الدعوة غير صحيح') : T('This email has no invitation', 'هذا البريد غير مدعو')); }
        return boot();
      }
      const r = await sb.auth.signInWithPassword({email: em.value.trim(), password: pw.value}); if (r.error) throw r.error;
      const a = await afterLogin(); if (!a.ok) { await sb.auth.signOut(); throw new Error(a.reason === 'no_invite' ? T('This account has no access to the Dispute Center. Ask the administrator for an invitation.', 'هذا الحساب ليس له صلاحية على مركز النزاعات. اطلب دعوة من المدير.') : a.reason === 'code_required' ? T('Use "Create account" with your invitation code.', 'استخدم "إنشاء حساب" مع كود الدعوة.') : a.reason); }
      boot();
    } catch (er) { msg.className = 'err'; msg.textContent = er.message || String(er); }
    btn.disabled = false;
  };
  const feats = [['👥', 'Dispute files', 'ملفات النزاعات', 'One file per dispute', 'ملف قانوني واحد لكل نزاع'], ['🗂', 'Evidence vault', 'خزنة الأدلة', 'SHA-256 and chain of custody', 'بصمة SHA-256 وسلسلة حيازة'], ['⏱', 'Chronology', 'التسلسل الزمني', 'Verified timeline of events', 'تسلسل موثق للأحداث'], ['📅', 'Legal calendar', 'التقويم القانوني', 'Deadlines and reminders', 'مواعيد وتنبيهات']];
  root.append(h('div', {class: 'login'},
    h('div', {class: 'pane'}, h('button', {class: 'langbtn', onclick: () => { LANG = LANG === 'ar' ? 'en' : 'ar'; localStorage.setItem('dc_lang', LANG); loginView(opts); }}, LANG === 'ar' ? 'English' : 'العربية'),
      h('div', {class: 'lform'}, h('h2', null, T('Welcome', 'مرحباً')), h('div', {class: 'sub'}, T('Sign in to the Dispute & Arbitration Center', 'سجّل الدخول إلى مركز النزاعات والتحكيم')),
        mode === 'recovery' ? null : h('div', {class: 'tabs2'}, tabIn, tabUp), form)),
    h('div', {class: 'hero'},
      h('div', {class: 'brand'}, h('img', {src: 'globe.png'}), h('div', null, 'AgriTrade ', h('b', null, 'Pro'), h('small', null, 'Trade • Intelligence • Collaboration'))),
      h('div', null, h('h1', null, 'Trade Dispute & Arbitration Center', h('br'), h('span', null, T('Digital legal department', 'الإدارة القانونية الرقمية'))), h('span', {class: 'pill'}, T('Document · Prove · Resolve', 'وثّق · أثبت · احسم')), h('p', {style: 'margin-top:14px'}, T('One traceable legal file for every international trade dispute: contracts, evidence, correspondence, claims, deadlines and arbitration.', 'ملف قانوني واحد قابل للتتبع لكل نزاع تجاري دولي: العقود والأدلة والمراسلات والمطالبات والمواعيد والتحكيم.'))),
      h('div', {class: 'feat'}, feats.map(f => h('div', null, h('i', null, f[0]), h('div', null, h('b', null, T(f[1], f[2])), h('span', null, T(f[3], f[4])))))))));
  draw();
}
async function boot() {
  const {data: {session}} = await sb.auth.getSession();
  if (!session) return loginView();
  const a = await afterLogin();
  if (!a.ok) { await sb.auth.signOut(); return loginView(); }
  renderShell();
}
sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') loginView({recovery: true}); });
