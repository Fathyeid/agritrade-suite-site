/* ===== dispute profile & sections ===== */
const sha256 = async buf => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
const safeName = n => n.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80) || 'file';
async function custody(doc, action, details) { await sb.from('dc_custody').insert({document_id: doc.id, dispute_id: doc.dispute_id, action, user_id: S.me.id, user_email: S.me.email, details}); }
const ACCEPT = '.pdf,.docx,.xlsx,.eml,.msg,.jpg,.jpeg,.png,.mp4';
const OKEXT = ['pdf', 'docx', 'xlsx', 'eml', 'msg', 'jpg', 'jpeg', 'png', 'mp4'];

function uploadForm(d, after, prev, pre) {
  formModal({title: prev ? T('Add new version (original is kept)', 'إضافة إصدار جديد (الأصل يبقى محفوظاً)') : T('Upload evidence / document', 'رفع دليل / مستند'), big: true,
    values: prev ? {name: prev.name, doc_type: prev.doc_type, issuing_party: prev.issuing_party, receiving_party: prev.receiving_party, source: prev.source, confidentiality: prev.confidentiality, doc_date: prev.doc_date} : (pre || {confidentiality: 'confidential'}),
    note: T('Allowed: PDF, DOCX, XLSX, EML, MSG, JPG, PNG, MP4 (max 50 MB). A SHA-256 fingerprint is computed in your browser and stored with the original file. Originals are never replaced.', 'المسموح: PDF وDOCX وXLSX وEML وMSG وJPG وPNG وMP4 (حتى 50 ميجا). تُحسب بصمة SHA-256 في متصفحك وتُحفظ مع الملف الأصلي. الأصول لا تُستبدل أبداً.'),
    fields: [{k: 'file', l: ['File', 'الملف'], t: 'file', accept: ACCEPT, req: true, wide: true}, {k: 'name', l: ['Document name', 'اسم المستند'], req: true}, {k: 'doc_type', l: ['Document type', 'نوع المستند'], t: 'select', o: opts('doctype'), req: true, nullable: false},
      {k: 'doc_date', l: ['Document date', 'تاريخ المستند'], t: 'date'}, {k: 'issuing_party', l: ['Issuing party', 'الجهة المصدرة']}, {k: 'receiving_party', l: ['Receiving party', 'الجهة المستلمة']}, {k: 'source', l: ['Source', 'المصدر']},
      {k: 'confidentiality', l: ['Confidentiality', 'السرية'], t: 'select', o: opts('conf'), nullable: false}, {k: 'verification', l: ['Verification', 'حالة التحقق'], t: 'select', o: opts('verif'), nullable: false}, {k: 'importance', l: ['Importance', 'الأهمية'], t: 'select', o: opts('importance'), nullable: false}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => {
      const f = v.file; const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!OKEXT.includes(ext)) throw new Error(T('File type not allowed', 'نوع الملف غير مسموح'));
      if (f.size > 52428800) throw new Error(T('File is larger than 50 MB', 'الملف أكبر من 50 ميجا'));
      const buf = await f.arrayBuffer(); const hash = await sha256(buf);
      const dup = await Q(sb.from('dc_documents').select('id,name,dispute_id').eq('sha256', hash).limit(1));
      if (dup.length && !confirm(T('A file with the same SHA-256 already exists: "', 'يوجد ملف بنفس البصمة: "') + dup[0].name + T('". Upload anyway?', '". هل ترفع على أي حال؟'))) throw new Error(T('Cancelled: duplicate file', 'ألغي: ملف مكرر'));
      const id = crypto.randomUUID(); const path = `${d.id}/${id}/${safeName(f.name)}`;
      const up = await sb.storage.from('dc-evidence').upload(path, f, {contentType: f.type || 'application/octet-stream', upsert: false}); if (up.error) throw up.error;
      const row = {id, dispute_id: d.id, name: v.name, doc_type: v.doc_type, doc_date: v.doc_date, issuing_party: v.issuing_party, receiving_party: v.receiving_party, source: v.source, confidentiality: v.confidentiality, verification: v.verification, importance: v.importance, notes: v.notes, storage_path: path, file_name: f.name, mime: f.type, size_bytes: f.size, sha256: hash, uploaded_by: S.me.id, version: prev ? prev.version + 1 : 1, supersedes_id: prev ? prev.id : null};
      const r = await sb.from('dc_documents').insert(row).select().single(); if (r.error) { await sb.storage.from('dc-evidence').remove([path]); throw r.error; }
      M.close(); toast(T('Uploaded. SHA-256: ', 'تم الرفع. SHA-256: ') + hash.slice(0, 12) + '…'); after && after(r.data);
    }});
}
async function fetchDoc(doc) { const {data, error} = await sb.storage.from('dc-evidence').createSignedUrl(doc.storage_path, 120); if (error) throw error; const r = await fetch(data.signedUrl); const b = await r.blob(); return b; }
async function docView(doc) {
  const b = await fetchDoc(doc); const hash = await sha256(await b.arrayBuffer()); const okh = hash === doc.sha256;
  await custody(doc, 'view', 'hash_match=' + okh);
  const url = URL.createObjectURL(new Blob([b], {type: doc.mime || b.type}));
  const m = (doc.mime || '').startsWith('image') ? h('img', {src: url, style: 'max-width:100%'}) : (doc.mime || '').startsWith('video') ? h('video', {src: url, controls: true, style: 'max-width:100%'}) : doc.mime === 'application/pdf' ? h('iframe', {src: url, style: 'width:100%;height:560px;border:0'}) : h('div', {class: 'note'}, T('No inline preview for this file type. Use Download.', 'لا توجد معاينة لهذا النوع. استخدم التنزيل.'));
  const M = modal(doc.name, h('div', null, h('div', {class: okh ? 'ok' : 'err'}, (okh ? '✔ ' : '✘ ') + T('Integrity check ', 'فحص السلامة ') + (okh ? T('passed: file matches stored SHA-256', 'سليم: الملف يطابق البصمة المحفوظة') : T('FAILED: file differs from stored SHA-256', 'فشل: الملف يختلف عن البصمة المحفوظة'))), m, h('div', {class: 'act'}, h('button', {class: 'btn', onclick: () => M.close()}, T('Close', 'إغلاق')))), {big: true});
}
async function docDownload(doc) {
  const b = await fetchDoc(doc); const hash = await sha256(await b.arrayBuffer()); const okh = hash === doc.sha256;
  await custody(doc, 'download', 'hash_match=' + okh);
  const a = h('a', {href: URL.createObjectURL(b), download: doc.file_name}); document.body.append(a); a.click(); a.remove();
  toast(okh ? T('Downloaded. Integrity verified.', 'تم التنزيل. تم التحقق من السلامة.') : T('Downloaded but HASH MISMATCH', 'تم التنزيل لكن البصمة لا تطابق'), !okh);
}
async function docCustody(doc) {
  const rows = await Q(sb.from('dc_custody').select('*').eq('document_id', doc.id).order('at', {ascending: false}));
  const M = modal(T('Chain of custody', 'سلسلة الحيازة') + ' · ' + doc.name, h('div', null, h('div', {class: 'sm mut'}, 'SHA-256: ', h('code', null, doc.sha256)), tbl([[T('When', 'الوقت'), r => fmtDT(r.at)], [T('Who', 'من'), r => r.user_email], [T('Action', 'الإجراء'), r => r.action], [T('Details', 'تفاصيل'), r => r.details || '']], rows), h('div', {class: 'act'}, h('button', {class: 'btn', onclick: () => M.close()}, T('Close', 'إغلاق')))), {big: true});
}
function docsTable(docs, disputes, reload) {
  const wr = can.write() && !can.readonly();
  return tbl([[T('ID', 'الرقم'), r => 'D-' + r.doc_no], [T('Document', 'المستند'), r => h('div', null, h('b', null, r.name), h('div', {class: 'sm mut'}, r.file_name))], [T('Type', 'النوع'), r => lab('doctype', r.doc_type)],
    [T('Dispute', 'النزاع'), r => disputes ? (disputes.find(d => d.id === r.dispute_id)?.ref_no || '') : null], [T('Doc date', 'تاريخ المستند'), r => fmtD(r.doc_date)], [T('Source', 'المصدر'), r => r.issuing_party || r.source || '-'], [T('Ver', 'إصدار'), r => 'v' + r.version],
    [T('Status', 'التحقق'), r => chip(lab('verif', r.verification), r.verification === 'verified' ? 'green' : r.verification === 'disputed' ? 'red' : '')], [T('Importance', 'الأهمية'), r => chip(lab('importance', r.importance), r.importance === 'key' ? 'gold' : '')], [T('SHA-256', 'البصمة'), r => h('code', {title: r.sha256}, r.sha256.slice(0, 10) + '…')], [T('Uploaded', 'الرفع'), r => fmtDT(r.uploaded_at)],
    ['', r => h('div', {class: 'row'}, h('button', {class: 'btn ghost sm', onclick: () => docView(r).catch(e => toast(e.message, true))}, T('View', 'معاينة')), h('button', {class: 'btn ghost sm', onclick: () => docDownload(r).catch(e => toast(e.message, true))}, '⭳'), h('button', {class: 'btn ghost sm', onclick: () => docCustody(r)}, T('Custody', 'الحيازة')),
      wr ? h('button', {class: 'btn ghost sm', onclick: () => uploadForm({id: r.dispute_id}, reload, r)}, T('New ver.', 'إصدار')) : null)]], docs);
}
async function evidenceSection(d, disputes) {
  let q = sb.from('dc_documents').select('*').order('uploaded_at', {ascending: false}); if (d) q = q.eq('dispute_id', d.id);
  const docs = await Q(q); const box = h('div');
  const st = {t: '', ty: '', sort: 'uploaded_at'};
  const draw = () => { box.innerHTML = ''; let r = docs.filter(x => (!st.t || (x.name + x.file_name + (x.notes || '')).toLowerCase().includes(st.t.toLowerCase())) && (!st.ty || x.doc_type === st.ty)); r = [...r].sort((a, b) => st.sort === 'doc_date' ? String(b.doc_date).localeCompare(String(a.doc_date)) : st.sort === 'doc_type' ? a.doc_type.localeCompare(b.doc_type) : st.sort === 'importance' ? String(b.importance).localeCompare(String(a.importance)) : String(b.uploaded_at).localeCompare(String(a.uploaded_at))); box.append(docsTable(r, d ? null : disputes, () => renderRoute())); };
  draw();
  const csv = () => csvDownload('evidence-register.csv', [['ID', 'Dispute', 'Name', 'Type', 'Doc date', 'Issuing', 'Receiving', 'Source', 'Version', 'Confidentiality', 'Verification', 'Importance', 'SHA-256', 'Uploaded at'], ...docs.map(x => ['D-' + x.doc_no, disputes?.find(y => y.id === x.dispute_id)?.ref_no || d?.ref_no, x.name, x.doc_type, x.doc_date, x.issuing_party, x.receiving_party, x.source, x.version, x.confidentiality, x.verification, x.importance, x.sha256, x.uploaded_at])]);
  return h('div', {class: 'card'}, h('h3', null, T('Evidence Register', 'سجل الأدلة'), h('span', {class: 'sp'}), d && can.write() && !can.readonly() ? h('button', {class: 'btn sm', onclick: () => uploadForm(d, () => renderRoute())}, '⭱ ' + T('Upload', 'رفع')) : null, h('button', {class: 'btn ghost sm', onclick: csv}, 'CSV')),
    h('div', {class: 'toolbar'}, h('input', {placeholder: T('Search name / notes…', 'بحث بالاسم/الملاحظات…'), oninput: e => { st.t = e.target.value; draw(); }}), sel('ty', [['', T('All types', 'كل الأنواع')], ...opts('doctype')], '', e => { st.ty = e.target.value; draw(); }), sel('so', [['uploaded_at', T('Sort: upload date', 'ترتيب: تاريخ الرفع')], ['doc_date', T('Sort: document date', 'ترتيب: تاريخ المستند')], ['doc_type', T('Sort: type', 'ترتيب: النوع')], ['importance', T('Sort: importance', 'ترتيب: الأهمية')]], 'uploaded_at', e => { st.sort = e.target.value; draw(); })), box);
}

/* ---- correspondence ---- */
const dec2047 = s => (s || '').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (m, cs, e, t) => { try { if (e.toUpperCase() === 'B') { const bin = atob(t); return new TextDecoder(cs).decode(Uint8Array.from(bin, c => c.charCodeAt(0))); } const by = t.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (x, hx) => String.fromCharCode(parseInt(hx, 16))); return new TextDecoder(cs).decode(Uint8Array.from(by, c => c.charCodeAt(0))); } catch (e2) { return t; } });
function parseEml(txt) {
  const i = txt.search(/\r?\n\r?\n/); const hd = txt.slice(0, i < 0 ? txt.length : i).replace(/\r?\n[ \t]+/g, ' '); let body = i < 0 ? '' : txt.slice(i).replace(/^\s+/, '');
  const g = n => { const m = hd.match(new RegExp('^' + n + ':\\s*(.*)$', 'im')); return m ? dec2047(m[1].trim()) : null; };
  const ct = g('Content-Type') || ''; const bd = ct.match(/boundary="?([^";]+)"?/i);
  const decode = (b, enc, cs) => { if (/quoted-printable/i.test(enc || '')) { const s = b.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (x, hx) => String.fromCharCode(parseInt(hx, 16))); try { return new TextDecoder(cs || 'utf-8').decode(Uint8Array.from(s, c => c.charCodeAt(0))); } catch (e) { return s; } } if (/base64/i.test(enc || '')) { try { return new TextDecoder(cs || 'utf-8').decode(Uint8Array.from(atob(b.replace(/\s/g, '')), c => c.charCodeAt(0))); } catch (e) { return b; } } return b; };
  let atts = [];
  if (bd) { const parts = body.split('--' + bd[1]); for (const p of parts) { const pi = p.search(/\r?\n\r?\n/); if (pi < 0) continue; const ph = p.slice(0, pi); const pb = p.slice(pi).trim(); const fn = ph.match(/filename\*?="?([^";\r\n]+)"?/i); if (fn) atts.push(dec2047(fn[1])); else if (/text\/plain/i.test(ph) && !/attachment/i.test(ph)) { body = decode(pb, (ph.match(/Content-Transfer-Encoding:\s*(\S+)/i) || [])[1], (ph.match(/charset="?([^";\s]+)/i) || [])[1]); } } if (bd && body.startsWith('--')) body = ''; }
  else body = decode(body, g('Content-Transfer-Encoding'), (ct.match(/charset="?([^";\s]+)/i) || [])[1]);
  let dt = g('Date'); try { dt = dt ? new Date(dt).toISOString() : null; } catch (e) { dt = null; }
  return {sender: g('From'), recipients: g('To'), cc: g('Cc'), bcc: g('Bcc'), subject: g('Subject'), sent_at: dt, message_id: g('Message-ID'), thread_ref: g('In-Reply-To') || g('References'), body: body.slice(0, 200000), attachments_note: atts.join(', ') || null};
}
function corrForm(d, after, e) {
  formModal({title: e ? T('Correspondence record', 'سجل المراسلة') : T('Add correspondence', 'إضافة مراسلة'), big: true, values: e || {kind: 'email', direction: 'in'}, fields: [
    {k: 'kind', l: ['Type', 'النوع'], t: 'select', o: opts('corr'), nullable: false}, {k: 'direction', l: ['Direction', 'الاتجاه'], t: 'select', o: [['in', T('Received', 'وارد')], ['out', T('Sent', 'صادر')], ['internal', T('Internal', 'داخلي')]], nullable: false}, {k: 'sent_at', l: ['Original timestamp', 'التاريخ والوقت الأصلي'], t: 'datetime-local'},
    {k: 'sender', l: ['Sender', 'المرسل']}, {k: 'recipients', l: ['Recipient(s)', 'المستلم']}, {k: 'cc', l: ['CC', 'نسخة CC']}, {k: 'bcc', l: ['BCC', 'نسخة BCC']}, {k: 'subject', l: ['Subject', 'الموضوع'], wide: true}, {k: 'message_id', l: ['Message-ID', 'معرف الرسالة']}, {k: 'thread_ref', l: ['Thread reference', 'مرجع المحادثة']},
    {k: 'attachments_note', l: ['Attachments', 'المرفقات'], wide: true}, {k: 'relation_note', l: ['Relation to the dispute', 'علاقتها بالنزاع'], t: 'textarea', wide: true}, {k: 'body', l: ['Original message text', 'نص الرسالة الأصلي'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { v.sent_at = v.sent_at ? new Date(v.sent_at).toISOString() : null; if (e) await Q(sb.from('dc_correspondence').update(v).eq('id', e.id)); else { v.dispute_id = d.id; v.created_by = S.me.id; await Q(sb.from('dc_correspondence').insert(v)); } M.close(); toast(T('Saved', 'تم الحفظ')); after(); }});
}
function emlImport(d, after) {
  formModal({title: T('Import .eml email', 'استيراد رسالة .eml'), note: T('The original .eml is stored as evidence (with SHA-256) and the headers are saved as a correspondence record.', 'يُحفظ ملف .eml الأصلي كدليل (مع بصمة SHA-256) وتُحفظ بيانات الرأس كسجل مراسلة.'), fields: [{k: 'file', l: ['.eml file', 'ملف .eml'], t: 'file', accept: '.eml', req: true, wide: true}],
    onSave: async (v, M) => {
      const f = v.file; const buf = await f.arrayBuffer(); const txt = new TextDecoder('utf-8').decode(buf); const p = parseEml(txt); const hash = await sha256(buf);
      const id = crypto.randomUUID(); const path = `${d.id}/${id}/${safeName(f.name)}`;
      const up = await sb.storage.from('dc-evidence').upload(path, f, {contentType: 'message/rfc822'}); if (up.error) throw up.error;
      const dr = await sb.from('dc_documents').insert({id, dispute_id: d.id, name: p.subject || f.name, doc_type: 'email', doc_date: p.sent_at ? p.sent_at.slice(0, 10) : null, issuing_party: p.sender, receiving_party: p.recipients, source: 'EML import', storage_path: path, file_name: f.name, mime: 'message/rfc822', size_bytes: f.size, sha256: hash, uploaded_by: S.me.id}).select().single(); if (dr.error) throw dr.error;
      await Q(sb.from('dc_correspondence').insert({...p, dispute_id: d.id, kind: 'email', direction: 'in', document_id: id, created_by: S.me.id}));
      M.close(); toast(T('Email imported', 'تم استيراد الرسالة')); after();
    }});
}
async function corrSection(d, disputes) {
  let q = sb.from('dc_correspondence').select('*').order('sent_at', {ascending: true, nullsFirst: false}); if (d) q = q.eq('dispute_id', d.id);
  const rows = await Q(q);
  const wr = d && can.write() && !can.readonly();
  return h('div', {class: 'card'}, h('h3', null, T('Correspondence Timeline', 'المراسلات بترتيب زمني'), h('span', {class: 'sp'}), wr ? h('button', {class: 'btn sm', onclick: () => corrForm(d, () => renderRoute())}, '＋ ' + T('Add', 'إضافة')) : null, wr ? h('button', {class: 'btn ghost sm', onclick: () => emlImport(d, () => renderRoute())}, '⭱ .eml') : null, h('button', {class: 'btn ghost sm', onclick: () => csvDownload('correspondence.csv', [['Dispute', 'Type', 'Direction', 'Date', 'From', 'To', 'CC', 'Subject', 'Message-ID'], ...rows.map(r => [disputes?.find(x => x.id === r.dispute_id)?.ref_no || d?.ref_no, r.kind, r.direction, r.sent_at, r.sender, r.recipients, r.cc, r.subject, r.message_id])])}, 'CSV')),
    tbl([[T('Date', 'التاريخ'), r => fmtDT(r.sent_at)], [T('Dir', 'الاتجاه'), r => r.direction === 'in' ? '⬇' : r.direction === 'out' ? '⬆' : '↔'], [T('Type', 'النوع'), r => lab('corr', r.kind)], [T('From', 'من'), r => r.sender || '-'], [T('To', 'إلى'), r => r.recipients || '-'], [T('Subject', 'الموضوع'), r => h('b', null, r.subject || '-')], [T('Attachments', 'مرفقات'), r => r.attachments_note || ''], [T('Dispute', 'النزاع'), r => d ? null : disputes.find(x => x.id === r.dispute_id)?.ref_no]], rows, r => {
      const M = modal(r.subject || '-', h('div', null, h('dl', {class: 'kv'}, [[T('From', 'من'), r.sender], [T('To', 'إلى'), r.recipients], ['CC', r.cc], ['BCC', r.bcc], [T('Date', 'التاريخ'), fmtDT(r.sent_at)], ['Message-ID', r.message_id], [T('Thread', 'المحادثة'), r.thread_ref], [T('Relation', 'العلاقة'), r.relation_note]].filter(x => x[1]).map(x => [h('dt', null, x[0]), h('dd', null, x[1])])), h('pre', {style: 'white-space:pre-wrap;background:#f6f8fc;border-radius:10px;padding:12px;max-height:340px;overflow:auto'}, r.body || ''), h('div', {class: 'act'}, wr ? h('button', {class: 'btn ghost', onclick: () => { M.close(); corrForm(d, () => renderRoute(), r); }}, T('Edit', 'تعديل')) : null, h('button', {class: 'btn', onclick: () => M.close()}, T('Close', 'إغلاق')))), {big: true});
    }));
}

/* ---- timeline ---- */
function eventForm(d, after, e) {
  formModal({title: e ? T('Edit event', 'تعديل الحدث') : T('Add timeline event', 'إضافة حدث'), big: true, values: e || {verification: 'unverified'}, fields: [
    {k: 'event_type', l: ['Event type', 'نوع الحدث'], t: 'select', o: LBL.evtype.map(x => [x[0], LANG === 'ar' ? x[2] : x[1]]), req: true, nullable: false}, {k: 'event_date', l: ['Event date', 'تاريخ الحدث'], t: 'date', req: true}, {k: 'event_time', l: ['Event time', 'وقت الحدث'], t: 'time'},
    {k: 'category', l: ['Category', 'التصنيف'], t: 'select', o: LBL.evcat.map(x => [x[0], LANG === 'ar' ? x[2] : x[1]]), nullable: false}, {k: 'responsible_party', l: ['Responsible party', 'الطرف المسؤول']}, {k: 'verification', l: ['Verification', 'التحقق'], t: 'select', o: opts('verif'), nullable: false},
    {k: 'description', l: ['Description', 'الوصف'], t: 'textarea', req: true, wide: true}, {k: 'evidence_ref', l: ['Evidence reference', 'مرجع الدليل']}, {k: 'source', l: ['Source', 'المصدر']}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (e) await Q(sb.from('dc_events').update(v).eq('id', e.id)); else { v.dispute_id = d.id; v.created_by = S.me.id; await Q(sb.from('dc_events').insert(v)); } M.close(); toast(T('Saved', 'تم الحفظ')); after(); }});
}
async function timelineSection(d, disputes) {
  let q = sb.from('dc_events').select('*').order('event_date').order('event_time', {nullsFirst: true}); if (d) q = q.eq('dispute_id', d.id);
  const ev = await Q(q); let fc = '';
  const box = h('div'); const wr = d && can.write() && !can.readonly();
  const draw = () => { box.innerHTML = ''; const rows = ev.filter(x => !fc || x.category === fc); if (!rows.length) { box.append(h('div', {class: 'empty'}, T('No events yet', 'لا توجد أحداث بعد'))); return; }
    box.append(h('div', {class: 'tl'}, rows.map(x => { const c = LBL.evcat.find(k => k[0] === x.category); const el = h('div', {class: 'ev', style: `--c:${c ? c[3] : '#1f63d6'}`, onclick: () => el.classList.toggle('open')},
      h('div', {class: 'd'}, fmtD(x.event_date) + (x.event_time ? ' · ' + x.event_time.slice(0, 5) : ''), ' ', chip(c ? (LANG === 'ar' ? c[2] : c[1]) : x.category), ' ', chip(lab('verif', x.verification), x.verification === 'verified' ? 'green' : ''), d ? null : ' ' + (disputes.find(y => y.id === x.dispute_id)?.ref_no || '')),
      h('div', null, h('b', null, lab('evtype', x.event_type)), ' — ', x.description), h('div', {class: 'more'}, x.responsible_party ? h('div', null, T('Responsible: ', 'المسؤول: ') + x.responsible_party) : null, x.evidence_ref ? h('div', null, T('Evidence: ', 'الدليل: ') + x.evidence_ref) : null, x.source ? h('div', null, T('Source: ', 'المصدر: ') + x.source) : null, x.notes ? h('div', null, x.notes) : null, wr ? h('button', {class: 'btn ghost sm', style: 'margin-top:6px', onclick: e2 => { e2.stopPropagation(); eventForm(d, () => renderRoute(), x); }}, T('Edit', 'تعديل')) : null)); return el; }))); };
  draw();
  const csv = () => csvDownload('chronology.csv', [['Dispute', 'Date', 'Time', 'Type', 'Category', 'Description', 'Responsible', 'Evidence ref', 'Source', 'Verification', 'Notes'], ...ev.map(x => [disputes?.find(y => y.id === x.dispute_id)?.ref_no || d?.ref_no, x.event_date, x.event_time, x.event_type, x.category, x.description, x.responsible_party, x.evidence_ref, x.source, x.verification, x.notes])]);
  const pdf = () => printHTML(T('Chronology Report', 'تقرير التسلسل الزمني') + (d ? ' - ' + d.ref_no : ''), '<table><tr><th>Date</th><th>Type</th><th>Description</th><th>Responsible</th><th>Evidence</th><th>Verification</th></tr>' + ev.map(x => `<tr><td>${esc(x.event_date)} ${esc((x.event_time || '').slice(0, 5))}</td><td>${esc(x.event_type)}</td><td>${esc(x.description)}</td><td>${esc(x.responsible_party || '')}</td><td>${esc(x.evidence_ref || '')}</td><td>${esc(x.verification)}</td></tr>`).join('') + '</table>');
  return h('div', {class: 'card'}, h('h3', null, T('Chronology', 'التسلسل الزمني'), h('span', {class: 'sp'}), wr ? h('button', {class: 'btn sm', onclick: () => eventForm(d, () => renderRoute())}, '＋ ' + T('Event', 'حدث')) : null, h('button', {class: 'btn ghost sm', onclick: csv}, 'CSV'), h('button', {class: 'btn ghost sm', onclick: pdf}, 'PDF')),
    h('div', {class: 'toolbar'}, sel('c', [['', T('All categories', 'كل التصنيفات')], ...LBL.evcat.map(x => [x[0], LANG === 'ar' ? x[2] : x[1]])], '', e => { fc = e.target.value; draw(); })), box);
}

/* ---- claims ---- */
function claimForm(d, after, kind, c) {
  formModal({title: c ? T('Edit claim', 'تعديل المطالبة') : kind === 'counterclaim' ? T('New counterclaim', 'مطالبة مقابلة جديدة') : T('New claim', 'مطالبة جديدة'), big: true, values: c || {currency: 'USD', fx_to_usd: 1, claim_date: today(), status: 'open'}, fields: [
    {k: 'claimant_id', l: ['Claimant', 'المطالب'], t: 'select', o: partyOpts()}, {k: 'respondent_id', l: ['Respondent', 'المطالَب'], t: 'select', o: partyOpts()}, {k: 'claim_date', l: ['Claim date', 'تاريخ المطالبة'], t: 'date'}, {k: 'claim_type', l: ['Claim type', 'نوع المطالبة'], t: 'select', o: opts('claimtype')}, {k: 'contract_ref', l: ['Contract reference', 'مرجع العقد']}, {k: 'status', l: ['Status', 'الحالة'], t: 'select', o: opts('claimstatus'), nullable: false},
    {k: 'currency', l: ['Claim currency', 'عملة المطالبة'], t: 'select', o: opts('currency'), nullable: false}, {k: 'fx_to_usd', l: ['Rate to USD (1 unit = ? USD)', 'سعر الصرف للدولار (وحدة = ؟ دولار)'], t: 'number', req: true}, {k: 'fx_date', l: ['Rate date', 'تاريخ السعر'], t: 'date'}, {k: 'fx_source', l: ['Rate source', 'مصدر السعر']},
    {k: 'settled_amount', l: ['Settled amount (claim currency)', 'المبلغ المسدد (بعملة المطالبة)'], t: 'number'}, {k: 'legal_basis', l: ['Legal basis', 'الأساس القانوني'], wide: true}, {k: 'contractual_basis', l: ['Contractual basis (clause)', 'الأساس التعاقدي (البند)'], wide: true}, {k: 'description', l: ['Description', 'الوصف'], t: 'textarea', wide: true}, {k: 'evidence_note', l: ['Supporting evidence', 'الأدلة الداعمة'], t: 'textarea', wide: true}],
    onSave: async (v, M) => { if (v.currency !== 'USD' && (!v.fx_date || !v.fx_source)) throw new Error(T('Rate date and source are required for non-USD claims', 'تاريخ ومصدر السعر مطلوبان لغير الدولار')); if (c) await Q(sb.from('dc_claims').update(v).eq('id', c.id)); else { v.dispute_id = d.id; v.kind = kind; v.created_by = S.me.id; await Q(sb.from('dc_claims').insert(v)); } M.close(); toast(T('Saved', 'تم الحفظ')); after(); }});
}
function itemForm(c, after) {
  formModal({title: T('Add claim component', 'إضافة بند للمطالبة') + ' · ' + c.ref_no, values: {}, fields: [{k: 'component', l: ['Component', 'البند'], t: 'select', o: LBL.component.map(x => [x[0], LANG === 'ar' ? x[2] : x[1]]), req: true, nullable: false}, {k: 'amount', l: ['Amount (' + c.currency + ')', 'المبلغ (' + c.currency + ')'], t: 'number', req: true}, {k: 'note', l: ['Note / source', 'ملاحظة / مصدر'], wide: true}],
    onSave: async (v, M) => { v.claim_id = c.id; await Q(sb.from('dc_claim_items').insert(v)); M.close(); after(); }});
}
async function claimsSection(d, disputes) {
  let q = sb.from('dc_claims').select('*').order('created_at'); if (d) q = q.eq('dispute_id', d.id);
  const claims = await Q(q); const ids = claims.map(c => c.id);
  const items = ids.length ? await Q(sb.from('dc_claim_items').select('*').in('claim_id', ids).order('created_at')) : [];
  claims.forEach(c => { c.items = items.filter(i => i.claim_id === c.id); c.total = c.items.reduce((a, i) => a + Number(i.amount), 0); c.usd = c.total * Number(c.fx_to_usd); });
  const wr = d && can.claims();
  const cl = claims.filter(c => c.kind === 'claim'), cc = claims.filter(c => c.kind === 'counterclaim');
  const s = a => a.reduce((x, c) => x + c.usd, 0); const settled = claims.reduce((x, c) => x + Number(c.settled_amount || 0) * Number(c.fx_to_usd), 0);
  const upd = s(cl) - s(cc);
  const fin = h('div', {class: 'kpis'}, kpi(T('Original Claim Value', 'قيمة المطالبة الأصلية'), usd(s(cl))), kpi(T('Counterclaim Value', 'قيمة المطالبة المقابلة'), usd(s(cc)), 'r'), kpi(T('Net position (claims − counterclaims)', 'الصافي (مطالبات − مقابلة)'), usd(upd), upd >= 0 ? 'ok' : 'r'), kpi(T('Amount Under Dispute', 'المبلغ محل النزاع'), usd(s(claims) - settled)), kpi(T('Settled Amount', 'المبلغ المسدد'), usd(settled), 'ok'), kpi(T('Outstanding', 'المتبقي'), usd(Math.max(0, s(cl) - claims.filter(c => c.kind === 'claim').reduce((x, c) => x + Number(c.settled_amount || 0) * Number(c.fx_to_usd), 0))), 'g'));
  const card = c => h('div', {class: 'card'}, h('h3', null, c.ref_no, chip(c.kind === 'claim' ? T('Claim', 'مطالبة') : T('Counterclaim', 'مطالبة مقابلة'), c.kind === 'claim' ? 'blue' : 'red'), chip(lab('claimstatus', c.status)), d ? null : chip(disputes.find(x => x.id === c.dispute_id)?.ref_no || ''), h('span', {class: 'sp'}), wr ? h('button', {class: 'btn ghost sm', onclick: () => itemForm(c, () => renderRoute())}, '＋ ' + T('Component', 'بند')) : null, wr ? h('button', {class: 'btn ghost sm', onclick: () => claimForm(d, () => renderRoute(), c.kind, c)}, T('Edit', 'تعديل')) : null),
    h('div', {class: 'sm mut'}, partyName(c.claimant_id) + ' → ' + partyName(c.respondent_id) + ' · ' + fmtD(c.claim_date) + (c.claim_type ? ' · ' + lab('claimtype', c.claim_type) : '')), c.description ? h('p', null, c.description) : null,
    tbl([[T('Component', 'البند'), i => lab('component', i.component)], [T('Amount', 'المبلغ'), i => money(i.amount, c.currency)], [T('Note', 'ملاحظة'), i => i.note || '']], c.items),
    h('div', {style: 'margin-top:8px;font-weight:800;color:#0f2a5c'}, T('Total: ', 'الإجمالي: ') + money(c.total, c.currency) + (c.currency !== 'USD' ? ` ≈ ${usd(c.usd)} (${c.fx_to_usd} · ${fmtD(c.fx_date)} · ${c.fx_source || ''})` : '')));
  return h('div', null, fin, wr ? h('div', {class: 'toolbar'}, h('button', {class: 'btn', onclick: () => claimForm(d, () => renderRoute(), 'claim')}, '＋ ' + T('New claim', 'مطالبة جديدة')), h('button', {class: 'btn ghost', onclick: () => claimForm(d, () => renderRoute(), 'counterclaim')}, '＋ ' + T('New counterclaim', 'مطالبة مقابلة'))) : null, claims.length ? claims.map(card) : h('div', {class: 'card empty'}, T('No claims yet', 'لا توجد مطالبات بعد')));
}

/* ---- deadlines & calendar ---- */
function deadlineForm(d, after, e) {
  const tzs = ['Africa/Cairo', 'UTC', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Hong_Kong', 'America/New_York'];
  const disOpts = d ? null : null;
  formModal({title: e ? T('Edit deadline', 'تعديل الموعد') : T('New legal deadline', 'موعد قانوني جديد'), big: true, values: e ? {...e, due_local: e.due_at && new Date(new Date(e.due_at).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), remind_days: (e.remind_days || []).join(',')} : {tz: 'Africa/Cairo', remind_days: '30,14,7,2'},
    note: T('Enter the date computed from the contract, the institution rules and the applicable law. The system does not compute legal limitation periods and holidays; a default is not legal advice.', 'أدخل التاريخ المحسوب وفق العقد وقواعد المؤسسة والقانون المنطبق. النظام لا يحسب التقادم والعطلات تلقائياً، والتاريخ الافتراضي ليس رأياً قانونياً.'),
    fields: [{k: 'category', l: ['Category', 'الفئة'], t: 'select', o: LBL.dlcat.map(x => [x[0], LANG === 'ar' ? x[2] : x[1]]), req: true, nullable: false}, {k: 'title', l: ['Title', 'العنوان'], req: true}, {k: 'due_local', l: ['Due (date & time in the timezone below)', 'الموعد (التاريخ والوقت بالتوقيت أدناه)'], t: 'datetime-local', req: true}, {k: 'tz', l: ['Timezone', 'المنطقة الزمنية'], t: 'select', o: tzs.map(x => [x, x]), nullable: false},
      {k: 'responsible', l: ['Responsible employee', 'الموظف المسؤول'], t: 'select', o: userOpts()}, {k: 'clause_ref', l: ['Related contract clause', 'بند العقد المرتبط']}, {k: 'remind_days', l: ['Reminders (days before, comma separated)', 'التنبيهات (أيام قبل، مفصولة بفواصل)']}, {k: 'basis', l: ['Basis of calculation', 'أساس الحساب'], wide: true}, {k: 'notes', l: ['Notes', 'ملاحظات'], t: 'textarea', wide: true}],
    onSave: async (v, M) => {
      // interpret local datetime in the chosen timezone
      const loc = v.due_local; const guess = new Date(loc + ':00Z'); const fmt = new Intl.DateTimeFormat('en-US', {timeZone: v.tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
      const parts = Object.fromEntries(fmt.formatToParts(guess).map(p => [p.type, p.value])); const asTz = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
      v.due_at = new Date(guess.getTime() - (asTz - guess.getTime())).toISOString(); delete v.due_local;
      v.remind_days = (v.remind_days || '30,14,7,2').split(',').map(x => parseInt(x)).filter(x => x > 0);
      if (e) await Q(sb.from('dc_deadlines').update(v).eq('id', e.id)); else { v.dispute_id = d ? d.id : null; v.created_by = S.me.id; await Q(sb.from('dc_deadlines').insert(v)); }
      M.close(); toast(T('Saved', 'تم الحفظ')); after(); }});
}
function deadlineRow(r, disputes, d) {
  const od = r.status === 'open' && new Date(r.due_at) < new Date(); const wr = can.write() && !can.readonly();
  return [fmtDT(r.due_at), h('div', null, h('b', null, r.title), h('div', {class: 'sm mut'}, lab('dlcat', r.category))), r.status === 'done' ? chip(T('Done', 'منجز'), 'green') : r.status === 'cancelled' ? chip(T('Cancelled', 'ملغى')) : od ? chip(T('Overdue', 'متأخر'), 'red') : chip(T('Open', 'مفتوح'), 'blue'), userName(r.responsible), d ? null : disputes.find(x => x.id === r.dispute_id)?.ref_no || '-',
    wr && r.status === 'open' ? h('div', {class: 'row'}, h('button', {class: 'btn ghost sm', onclick: async () => { await Q(sb.from('dc_deadlines').update({status: 'done', completed_at: new Date().toISOString()}).eq('id', r.id)); renderRoute(); }}, '✔'), h('button', {class: 'btn ghost sm', onclick: () => deadlineForm(d, () => renderRoute(), r)}, T('Edit', 'تعديل')), h('button', {class: 'btn ghost sm', onclick: () => confirmBox(T('Cancel this deadline?', 'إلغاء هذا الموعد؟'), async () => { await Q(sb.from('dc_deadlines').update({status: 'cancelled'}).eq('id', r.id)); renderRoute(); })}, '✕')) : ''];
}
async function deadlinesSection(d, disputes) {
  let q = sb.from('dc_deadlines').select('*').order('due_at'); if (d) q = q.eq('dispute_id', d.id);
  const rows = await Q(q);
  return h('div', {class: 'card'}, h('h3', null, T('Legal Deadlines', 'المواعيد القانونية'), h('span', {class: 'sp'}), can.write() && !can.readonly() ? h('button', {class: 'btn sm', onclick: () => deadlineForm(d, () => renderRoute())}, '＋ ' + T('Deadline', 'موعد')) : null),
    rows.length ? h('div', {class: 'tw'}, h('table', null, h('thead', null, h('tr', null, [T('Due', 'الموعد'), T('Deadline', 'الموعد النهائي'), T('Status', 'الحالة'), T('Responsible', 'المسؤول'), T('Dispute', 'النزاع'), ''].map(x => h('th', null, x)))), h('tbody', null, rows.map(r => h('tr', null, deadlineRow(r, disputes, d).map(c => h('td', null, c))))))) : h('div', {class: 'empty'}, T('No deadlines yet', 'لا توجد مواعيد بعد')));
}
let calState = {y: new Date().getFullYear(), m: new Date().getMonth(), view: 'month'};
PAGES.calendar = async () => {
  const dls = await Q(sb.from('dc_deadlines').select('*').order('due_at')); const disputes = await Q(sb.from('dc_disputes').select('id,ref_no,title'));
  const box = h('div'); const dn = LANG === 'ar' ? ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dlChip = r => h('span', {class: 'dl ' + (r.status === 'done' ? 'dn2' : r.status === 'open' && new Date(r.due_at) < new Date() ? 'od' : ''), title: r.title, onclick: () => deadlineForm(null, () => renderRoute(), r)}, new Date(r.due_at).toTimeString().slice(0, 5) + ' ' + r.title);
  const draw = () => {
    box.innerHTML = '';
    if (calState.view === 'month') {
      const first = new Date(calState.y, calState.m, 1), start = new Date(first); start.setDate(1 - first.getDay()); const cells = [];
      dn.forEach(x => cells.push(h('div', {class: 'h'}, x)));
      for (let i = 0; i < 42; i++) { const dt = new Date(start); dt.setDate(start.getDate() + i); const key = dt.toLocaleDateString('en-CA'); const day = dls.filter(r => new Date(r.due_at).toLocaleDateString('en-CA') === key && r.status !== 'cancelled'); cells.push(h('div', {class: 'c' + (dt.getMonth() !== calState.m ? ' o' : '') + (key === today() ? ' t' : '')}, h('div', {class: 'dn'}, dt.getDate()), day.map(dlChip))); }
      box.append(h('div', {class: 'cal'}, cells));
    } else {
      const base = new Date(); const rng = calState.view === 'week' ? 7 : 1; const s0 = new Date(base.getFullYear(), base.getMonth(), base.getDate()); const e0 = new Date(s0); e0.setDate(s0.getDate() + rng);
      const rows = dls.filter(r => new Date(r.due_at) >= s0 && new Date(r.due_at) < e0 && r.status !== 'cancelled');
      box.append(rows.length ? h('div', null, rows.map(r => h('div', {class: 'card'}, h('b', null, fmtDT(r.due_at)), ' — ', r.title, ' ', chip(disputes.find(x => x.id === r.dispute_id)?.ref_no || '')))) : h('div', {class: 'empty'}, T('Nothing due in this range', 'لا مواعيد في هذه الفترة')));
    }
  };
  const mn = new Date(calState.y, calState.m, 1).toLocaleDateString(LANG === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {month: 'long', year: 'numeric'});
  const title = h('b', {style: 'min-width:150px;text-align:center'}, mn);
  const mv = n => { calState.m += n; if (calState.m < 0) { calState.m = 11; calState.y--; } if (calState.m > 11) { calState.m = 0; calState.y++; } renderRoute(); };
  const list = await deadlinesSection(null, disputes);
  return h('div', null, head(T('Legal Calendar', 'التقويم القانوني'), T('Reminders at 30 days, 14 days, 7 days and 48 hours appear in the notification bell (in-app).', 'تنبيهات 30 يوماً و14 و7 أيام و48 ساعة تظهر في جرس الإشعارات داخل التطبيق.')),
    h('div', {class: 'toolbar'}, h('button', {class: 'btn ghost sm', onclick: () => mv(-1)}, LANG === 'ar' ? '▶' : '◀'), title, h('button', {class: 'btn ghost sm', onclick: () => mv(1)}, LANG === 'ar' ? '◀' : '▶'), sel('v', [['month', T('Monthly', 'شهري')], ['week', T('Next 7 days', 'الأسبوع القادم')], ['day', T('Today', 'اليوم')]], calState.view, e => { calState.view = e.target.value; draw(); })), box, h('div', {style: 'height:16px'}), list) && (draw(), h('div', null, head(T('Legal Calendar', 'التقويم القانوني'), T('Reminders at 30 days, 14 days, 7 days and 48 hours appear in the notification bell (in-app only; no email or SMS yet).', 'تنبيهات 30 يوماً و14 و7 أيام و48 ساعة تظهر في جرس الإشعارات داخل التطبيق فقط (بدون بريد أو رسائل بعد).')),
    h('div', {class: 'toolbar'}, h('button', {class: 'btn ghost sm', onclick: () => mv(-1)}, LANG === 'ar' ? '▶' : '◀'), title, h('button', {class: 'btn ghost sm', onclick: () => mv(1)}, LANG === 'ar' ? '◀' : '▶'), sel('v', [['month', T('Monthly', 'شهري')], ['week', T('Next 7 days', 'الأسبوع القادم')], ['day', T('Today', 'اليوم')]], calState.view, e => { calState.view = e.target.value; draw(); })), box, h('div', {style: 'height:16px'}), list));
};
