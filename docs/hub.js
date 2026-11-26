/* Suite Hub: read-only links across the 8 programs (uses the signed-in user's own access; nothing is written) */
(function(){
const L={
ar:{roll:'نظرة شاملة على كل البرامج',dir:'دليل الأطراف الموحّد',com:'السلع في كل البرامج',feedT:'آخر النشاط والتنبيهات',loading:'جارٍ التحميل…',none:'لا يوجد',noacc:'لا توجد صلاحية قراءة',
 iom:'العمليات المتكاملة',grain:'تخزين الحبوب',disp:'النزاعات',poul:'الدواجن',team:'فريق العمل',feed:'الأعلاف',
 k_rec:'استلامات',k_wh:'مخازن',k_cust:'عملاء',k_lots:'دفعات مخزنة',k_mt:'طن مخزن',k_alerts:'تنبيهات جديدة',k_disp:'نزاعات مفتوحة',k_cont:'عقود',k_flocks:'قطعان مفتوحة',k_sales:'مبيعات دواجن',k_tasks:'مهام مفتوحة',k_appr:'موافقات معلّقة',k_txn:'صفقات مفتوحة',k_ing:'مواد أعلاف مفعّلة',
 party:'الطرف',where:'يظهر في',type:'النوع',dirNote:'يُدمج بالاسم بعد توحيد الكتابة. الأسماء المتشابهة لكن المختلفة تبقى منفصلة. للقراءة فقط.',search:'بحث بالاسم…',
 inprog:'يظهر في أكثر من برنامج',all:'الكل',multi:'أكثر من برنامج',
 comNote:'يُربط بالاسم والمفتاح. المخزون يعرض ما يظهر فعلاً في كل برنامج.',c_iom:'استلامات العمليات',c_grain:'دفعات الحبوب (طن)',c_txn:'صفقات',c_cont:'عقود النزاعات',c_feed:'سعر العلف (للطن)',open:'فتح',chart:'الشارت',
 act:'نشاط الفريق',alr:'تنبيهات الحبوب',not:'إشعاراتك',noact:'لا نشاط حديث',sev:'خطورة',cust:'عميل',supp:'مورد',cp:'طرف في صفقة',pp:'شريك دواجن',dp:'طرف نزاع',lotsup:'مورد دفعة'},
en:{roll:'All programs at a glance',dir:'Unified parties directory',com:'Commodities across programs',feedT:'Recent activity and alerts',loading:'Loading…',none:'None',noacc:'No read access',
 iom:'Integrated Operations',grain:'Grain Storage',disp:'Disputes',poul:'Poultry',team:'Team Workspace',feed:'Feed',
 k_rec:'Receipts',k_wh:'Warehouses',k_cust:'Customers',k_lots:'Lots in storage',k_mt:'MT stored',k_alerts:'New alerts',k_disp:'Open disputes',k_cont:'Contracts',k_flocks:'Open flocks',k_sales:'Poultry sales',k_tasks:'Open tasks',k_appr:'Pending approvals',k_txn:'Open transactions',k_ing:'Enabled feed ingredients',
 party:'Party',where:'Appears in',type:'Type',dirNote:'Merged by name after normalising spelling. Similar but different names stay separate. Read-only.',search:'Search by name…',
 inprog:'Appears in more than one program',all:'All',multi:'Multi-program',
 comNote:'Linked by name and key. Quantities show only what each program actually holds.',c_iom:'IOM receipts',c_grain:'Grain lots (MT)',c_txn:'Transactions',c_cont:'Dispute contracts',c_feed:'Feed price (per MT)',open:'Open',chart:'Chart',
 act:'Team activity',alr:'Grain alerts',not:'Your notifications',noact:'No recent activity',sev:'Severity',cust:'Customer',supp:'Supplier',cp:'Deal counterparty',pp:'Poultry partner',dp:'Dispute party',lotsup:'Lot supplier'}};
const MODN={iom:'iom',team:'team',grain:'grain',dispute:'dispute',inst:'inst',feed:'feed',poultry:'poultry',chart:'chart'};
function norm(s){s=String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
 s=s.replace(/\b(ltd|llc|inc|co|corp|corporation|company|limited|sa|gmbh|pte|fze|shipping|trading)\b/g,' ').replace(/(^|\s)(شركه|شركة|مؤسسه|مؤسسة)(\s|$)/g,' ');
 return s.replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
async function rdg(table,cols){try{const tok=localStorage.getItem('gs_tok');if(!tok)return null;const C=window.PORTAL_CFG;const r=await fetch(C.url+'/rest/v1/'+table+'?select='+cols+'&limit=2000',{headers:{apikey:C.anon,Authorization:'Bearer '+tok}});if(!r.ok)return null;return await r.json()}catch(e){return null}}
async function rd(sb,table,cols,filter){if(table.startsWith('gs_')){let r=await rdg(table,cols);if(r&&table==='gs_alerts')r=r.filter(x=>x.status==='new').sort((a,b)=>String(b.detected_at).localeCompare(String(a.detected_at)));return r}try{let q=sb.from(table).select(cols);if(filter)q=filter(q);const r=await q.limit(2000);return r.error?null:r.data}catch(e){return null}}
let cache=null,cacheAt=0;
async function load(sb){
 if(cache&&Date.now()-cacheAt<60000)return cache;
 const [iom,parties,cont,disp,lots,stock,gcom,gal,pp,pfl,psl,tasks,appr,txn,act,notif,feed]=await Promise.all([
  rd(sb,'iom_state','data'),rd(sb,'dc_parties','id,name,party_type'),rd(sb,'dc_contracts','id,contract_no,commodity,seller_id,buyer_id'),rd(sb,'dc_disputes','id,status'),
  rd(sb,'gs_lots','id,lot_code,commodity_id,supplier,initial_qty_mt,status'),rd(sb,'gs_stock','lot_id,qty_mt'),rd(sb,'gs_commodities','id,key,name_en,name_ar'),
  rd(sb,'gs_alerts','id,category,severity,status,detected_at',q=>q.eq('status','new').order('detected_at',{ascending:false})),
  rd(sb,'poultry_partners','id,name,kind'),rd(sb,'poultry_flocks','id,status'),rd(sb,'poultry_sales','id'),
  rd(sb,'tasks','id,status,due_date'),rd(sb,'approvals','id,status'),rd(sb,'transactions','id,code,type,title,commodity,counterparty,status'),
  rd(sb,'activity_log','id,actor_name,action,module,ref,created_at',q=>q.order('created_at',{ascending:false})),
  rd(sb,'notifications','id,title,body,link,read,created_at',q=>q.eq('read',false).order('created_at',{ascending:false})),
  rd(sb,'feed_state','data')]);
 cache={iom:iom&&iom[0]&&iom[0].data,parties,cont,disp,lots,stock,gcom,gal,pp,pfl,psl,tasks,appr,txn,act,notif,feed:feed&&feed[0]&&feed[0].data};cacheAt=Date.now();return cache;
}
const n=a=>a==null?null:a.length;
function kpis(d,l){const t=L[l],i=d.iom||{};const mt=d.stock?d.stock.reduce((s,r)=>s+Number(r.qty_mt||0),0):null;
 const ing=d.feed&&d.feed.ing?Object.values(d.feed.ing).filter(x=>x.enabled).length:null;
 const open=(a,f)=>a?a.filter(f).length:null;
 return [
 ['iom','📥',t.k_rec,i.receipts?i.receipts.length:null,/receiv|الاستلام/i],['iom','🏭',t.k_wh,i.warehouses?i.warehouses.length:null,/warehouse|المخازن|المستودعات/i],['iom','🧑‍💼',t.k_cust,i.customers?i.customers.length:null,/customer|العملاء/i],
 ['grain','🌾',t.k_lots,open(d.lots,x=>x.status==='stored'),/lot|الدفعات|مخزون/i],['grain','⚖️',t.k_mt,mt==null?null:Math.round(mt).toLocaleString(),/silo|الصوامع/i],['grain','🔔',t.k_alerts,n(d.gal),/alert|التنبيهات/i],
 ['dispute','⚖️',t.k_disp,open(d.disp,x=>!/closed|resolved|settled/i.test(x.status||'')),/dispute|النزاعات/i],['dispute','📄',t.k_cont,n(d.cont),/contract|العقود/i],
 ['poultry','🐥',t.k_flocks,open(d.pfl,x=>!/closed/i.test(x.status||'')),/flock|القطعان/i],['poultry','🧾',t.k_sales,n(d.psl),/sales|المبيعات/i],
 ['team','✅',t.k_tasks,open(d.tasks,x=>!/done|completed|cancel/i.test(x.status||'')),/task|المهام/i],['team','🛡️',t.k_appr,open(d.appr,x=>x.status==='pending'),/approval|الموافقات/i],['team','🔄',t.k_txn,open(d.txn,x=>/open|in_progress/.test(x.status||'')),/transaction|العمليات/i],
 ['feed','🧪',t.k_ing,ing,/raw|المواد الخام/i]];}
function card(k,l){return `<div class="hk" data-m="${k[0]}" data-rx="${esc(k[4].source)}"><div class="hki">${k[1]}</div><div class="hkv">${k[3]==null?'<span class="hkn" title="'+esc(L[l].noacc)+'">–</span>':esc(k[3])}</div><div class="hkl">${esc(k[2])}</div></div>`}
function wire(root,api){root.querySelectorAll('[data-m]').forEach(e=>e.onclick=()=>api.jump(e.dataset.m,new RegExp(e.dataset.rx,'i')))}
async function rollup(el,api){
 const l=api.lang(),t=L[l];el.innerHTML=`<h3 class="hh">${t.roll}</h3><div class="hgrid" id="hg"><div class="sub">${t.loading}</div></div><h3 class="hh">${t.feedT}</h3><div id="hact" class="hact"></div>`;
 const d=await load(api.sb);
 el.querySelector('#hg').innerHTML=kpis(d,l).map(k=>card(k,l)).join('');wire(el,api);
 const rows=[];
 (d.gal||[]).slice(0,4).forEach(a=>rows.push([a.detected_at,'🌾',`${t.alr}: ${esc(a.category)} (${t.sev} ${esc(a.severity)})`,'grain',/alert|التنبيهات/i]));
 (d.act||[]).slice(0,8).forEach(a=>rows.push([a.created_at,'👥',`${esc(a.actor_name||'')} · ${esc(a.action||'')} ${esc(a.ref||'')}`,'team',/activity|التسلسل|النشاط/i]));
 (d.notif||[]).slice(0,4).forEach(a=>rows.push([a.created_at,'🔔',esc(a.title||a.body||''),'team',/chat|محادث|activity/i]));
 rows.sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
 el.querySelector('#hact').innerHTML=rows.length?rows.slice(0,10).map(r=>`<div class="hr" data-m="${r[3]}" data-rx="${esc(r[4].source)}"><span>${r[1]}</span><span class="hrt">${r[2]}</span><span class="hrd">${esc(String(r[0]||'').slice(0,16).replace('T',' '))}</span></div>`).join(''):`<div class="sub">${t.noact}</div>`;
 wire(el,api);
}
function parties(d,l){const t=L[l],m=new Map();
 function add(name,prog,role,mod,rx){const k=norm(name);if(!k)return;let e=m.get(k);if(!e){e={name:String(name).trim(),at:new Map()};m.set(k,e)}const key=prog+'|'+role;if(!e.at.has(key))e.at.set(key,{prog,role,mod,rx})}
 const i=d.iom||{};
 (i.customers||[]).forEach(c=>add(c.name,t.iom,t.cust,'iom',/customer|العملاء/i));
 (i.receipts||[]).forEach(r=>add(r.supplier,t.iom,t.supp,'iom',/receiv|الاستلام/i));
 (d.parties||[]).forEach(p=>add(p.name,t.disp,t.dp,'dispute',/part|الأطراف/i));
 (d.pp||[]).forEach(p=>add(p.name,t.poul,t.pp,'poultry',/sales|المبيعات/i));
 (d.lots||[]).forEach(x=>add(x.supplier,t.grain,t.lotsup,'grain',/lot|الدفعات|مخزون/i));
 (d.txn||[]).forEach(x=>add(x.counterparty,t.team,t.cp,'team',/transaction|العمليات/i));
 return [...m.values()].sort((a,b)=>b.at.size-a.at.size||a.name.localeCompare(b.name));}
async function directory(el,api){
 const l=api.lang(),t=L[l];el.innerHTML=`<h3 class="hh">${t.dir}</h3><p class="sub">${t.dirNote}</p><div class="hbar"><input id="hq" placeholder="${esc(t.search)}"><label><input type="checkbox" id="hm"> ${t.multi}</label></div><div id="hl" class="sub">${t.loading}</div>`;
 const d=await load(api.sb),all=parties(d,l);
 const draw=()=>{const q=norm(el.querySelector('#hq').value),mu=el.querySelector('#hm').checked;
  const rows=all.filter(e=>(!q||norm(e.name).includes(q))&&(!mu||new Set([...e.at.values()].map(x=>x.prog)).size>1));
  el.querySelector('#hl').innerHTML=rows.length?`<table class="htb"><tr><th>${t.party}</th><th>${t.where}</th></tr>`+rows.map(e=>`<tr><td><b>${esc(e.name)}</b></td><td>${[...e.at.values()].map(x=>`<a class="chip" data-m="${x.mod}" data-rx="${esc(x.rx.source)}">${esc(x.prog)} · ${esc(x.role)}</a>`).join(' ')}</td></tr>`).join('')+'</table>':`<div class="sub">${t.none}</div>`;wire(el,api)};
 el.querySelector('#hq').oninput=draw;el.querySelector('#hm').onchange=draw;draw();
}
const ALIAS={soybeans:['sbm44','sbm48','soy'],corn:['corn'],wheat:['wheat'],sorghum:['sorghum'],barley:['barley'],rice:['rice']};
function commodities(d,l){const t=L[l],m=new Map();
 const i=d.iom||{},ck=s=>norm(s).replace(/s$/,'');
 function get(name){const k=ck(name);if(!k)return null;if(!m.has(k))m.set(k,{name:String(name).trim(),iom:0,grain:0,txn:0,cont:0,feed:null});return m.get(k)}
 const cn={};(i.commodities||[]).forEach(c=>{cn[c.id]=c.name;get(c.name)});
 (i.receipts||[]).forEach(r=>{const e=get(cn[r.c]);if(e)e.iom++});
 const gn={};(d.gcom||[]).forEach(c=>{gn[c.id]=c.name_en;get(c.name_en)});
 const lotMt={};(d.stock||[]).forEach(s=>{lotMt[s.lot_id]=(lotMt[s.lot_id]||0)+Number(s.qty_mt||0)});
 (d.lots||[]).forEach(x=>{const e=get(gn[x.commodity_id]);if(e)e.grain+=lotMt[x.id]!=null?lotMt[x.id]:Number(x.initial_qty_mt||0)});
 (d.txn||[]).forEach(x=>{const e=get(x.commodity);if(e)e.txn++});
 (d.cont||[]).forEach(x=>{const e=get(x.commodity);if(e)e.cont++});
 m.forEach((e,k)=>{const al=ALIAS[k]||ALIAS[k+'s']||[];if(d.feed&&d.feed.ing){const hit=al.map(a=>d.feed.ing[a]).filter(Boolean)[0];if(hit)e.feed=hit.price}});
 return [...m.values()];}
async function comm(el,api){
 const l=api.lang(),t=L[l];el.innerHTML=`<h3 class="hh">${t.com}</h3><p class="sub">${t.comNote}</p><div id="hl" class="sub">${t.loading}</div>`;
 const d=await load(api.sb),rows=commodities(d,l);
 el.querySelector('#hl').innerHTML=`<table class="htb"><tr><th></th><th>${t.c_iom}</th><th>${t.c_grain}</th><th>${t.c_txn}</th><th>${t.c_cont}</th><th>${t.c_feed}</th><th></th></tr>`+rows.map(e=>`<tr><td><b>${esc(e.name)}</b></td><td><a class="chip" data-m="iom" data-rx="receiv|الاستلام">${e.iom}</a></td><td><a class="chip" data-m="grain" data-rx="lot|الدفعات|مخزون">${Math.round(e.grain).toLocaleString()}</a></td><td><a class="chip" data-m="team" data-rx="transaction|العمليات">${e.txn}</a></td><td><a class="chip" data-m="dispute" data-rx="contract|العقود">${e.cont}</a></td><td>${e.feed==null?'–':'<a class="chip" data-m="feed" data-rx="market|الأسعار">'+esc(e.feed)+'</a>'}</td><td><a class="chip" data-m="chart" data-rx="markets|الأسواق">${t.chart}</a></td></tr>`).join('')+'</table>';wire(el,api);
}

/* ---- Links: traceable, idempotent, reversible posting between programs (no deletes) ---- */
const LT={ar:{t:'الربط بين البرامج',note:'ترحيل سجل من برنامج إلى آخر. كل ترحيل يُسجَّل بمصدره ووجهته، لا يتكرر، ويمكن عكسه (إلغاء) دون حذف أي شيء.',src:'استلام العمليات',post:'ترحيل لمخزن الحبوب',void:'إلغاء الترحيل',posted:'مرحَّل',voided:'مُلغى',nogr:'سجّل دخولك في برنامج تخزين الحبوب مرة واحدة ليسمح بالكتابة',nocom:'لا توجد سلعة مطابقة في الحبوب',ledger:'سجل الترحيل',none:'لا توجد استلامات مؤهلة (غير مسودة)',err:'تعذر التنفيذ: ',okp:'تم الترحيل',okv:'تم الإلغاء',qty:'الكمية (طن)',st:'الحالة',src3:'دفعات الأعلاف النهائية',post3:'ترحيل لمخزون علف الدواجن',none3:'لا توجد دفعات نهائية',mat:'صنف العلف',nomat:'لا يوجد صنف علف في الدواجن',kg:'الناتج (كجم)',src2:'أوامر البيع (IOM)',post2:'ترحيل كعقد لمركز النزاعات',none2:'لا توجد أوامر بيع مؤهلة (غير مسودة)',val:'القيمة'},
 en:{t:'Cross-program links',note:'Post a record from one program to another. Every post is logged with source and destination, cannot repeat, and can be reversed (voided) without deleting anything.',src:'IOM receipt',post:'Post to Grain Storage',void:'Void post',posted:'Posted',voided:'Voided',nogr:'Sign in to Grain Storage once so it allows writing',nocom:'No matching grain commodity',ledger:'Posting ledger',none:'No eligible receipts (non-draft)',err:'Failed: ',okp:'Posted',okv:'Voided',qty:'Qty (MT)',st:'Status',src3:'Finalized feed batches',post3:'Post to Poultry feed stock',none3:'No finalized batches',mat:'Feed material',nomat:'No feed material in Poultry',kg:'Output (kg)',src2:'IOM sales orders',post2:'Post as Dispute contract',none2:'No eligible sales orders (non-draft)',val:'Value'}};
function jwtSub(t){try{return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub}catch(e){return null}}
async function grest(method,path,body){const C=window.PORTAL_CFG,tok=localStorage.getItem('gs_tok');if(!tok)throw new Error('no grain login');
 const r=await fetch(C.url+'/rest/v1/'+path,{method,headers:{apikey:C.anon,Authorization:'Bearer '+tok,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>null);if(!r.ok)throw new Error((j&&(j.message||j.error))||r.status);return j}
async function postReceipt(sb,d,rc,opts){opts=opts||{};
 const i=d.iom||{},cn=(i.commodities||[]).find(c=>c.id===rc.c),gc=cn&&(d.gcom||[]).find(g=>{const f=x=>norm(x).replace(/s$/,'').replace(/^corn$/,'maize corn').replace(/^maize$/,'maize corn');return f(g.name_en)===f(cn.name)||f(g.name_en).startsWith(f(cn.name)+' ')});
 if(!gc)throw new Error('no matching grain commodity');
 const claim=await sb.from('suite_links').insert({src_prog:'iom',src_id:rc.ref,dst_prog:'grain',status:'posted',note:opts.test?'TEST':null}).select().single();
 if(claim.error)throw new Error(/duplicate|unique/i.test(claim.error.message)?'already posted':claim.error.message);
 try{const sub=jwtSub(localStorage.getItem('gs_tok')||'');
  const lot=await grest('POST','gs_lots',{lot_code:(opts.test?'TEST-':'')+rc.ref,commodity_id:gc.id,origin_country:rc.origin||null,supplier:rc.supplier||null,import_txn_ref:'IOM:'+rc.ref,vessel:rc.vessel||null,arrival_date:rc.date||null,initial_qty_mt:Number(rc.rec||rc.dis||0),initial_quality_note:'Posted from IOM receipt '+rc.ref+' via Suite link',status:'stored',is_demo:false,created_by:sub});
  const id=Array.isArray(lot)?lot[0].id:lot.id;await sb.from('suite_links').update({dst_id:id}).eq('id',claim.data.id);return {link:claim.data.id,lot:id};
 }catch(e){await sb.from('suite_links').update({status:'voided',voided_at:new Date().toISOString(),note:'failed: '+e.message}).eq('id',claim.data.id);throw e}}
async function postSale(sb,d,so,opts){opts=opts||{};
 const i=d.iom||{},cn=(i.commodities||[]).find(c=>c.id===so.c),cu=(i.customers||[]).find(c=>c.id===so.cust);
 const claim=await sb.from('suite_links').insert({src_prog:'iom-sale',src_id:so.ref,dst_prog:'dispute',status:'posted',note:opts.test?'TEST':null}).select().single();
 if(claim.error)throw new Error(/duplicate|unique/i.test(claim.error.message)?'already posted':claim.error.message);
 try{const q=Number(so.qty||0),p=Number(so.price||0);
  const r=await sb.from('dc_contracts').insert({contract_no:(opts.test?'TEST-':'')+so.ref,contract_date:so.date||null,commodity:cn?cn.name:null,quantity:q,qty_unit:'MT',price:p,price_currency:so.cur||null,total_value:q*p,discharge_port:so.loc||null,incoterms:so.terms||null,payment_terms:so.pay!=null?so.pay+'% advance':null,notes:'Posted from IOM sales order '+so.ref+(cu?' (customer: '+(cu.name||'')+')':'')+' via Suite link',source_ref:'IOM:'+so.ref}).select().single();
  if(r.error)throw new Error(r.error.message);
  await sb.from('suite_links').update({dst_id:r.data.id}).eq('id',claim.data.id);return {link:claim.data.id,contract:r.data.id};
 }catch(e){await sb.from('suite_links').update({status:'voided',voided_at:new Date().toISOString(),note:'failed: '+e.message}).eq('id',claim.data.id);throw e}}
async function postFeedBatch(sb,b,matId,opts){opts=opts||{};
 if(!b||b.status!=='final')throw new Error('batch not final');const kg=Number(b.produced||0);if(!(kg>0))throw new Error('no output');if(!matId)throw new Error('no feed material');
 const claim=await sb.from('suite_links').insert({src_prog:'feed-batch',src_id:b.id,dst_prog:'poultry',status:'posted',note:opts.test?'TEST':null}).select().single();
 if(claim.error)throw new Error(/duplicate|unique/i.test(claim.error.message)?'already posted':claim.error.message);
 try{const cost=Object.keys(b.actual||{}).reduce((a,k)=>a+Number(b.actual[k]||0)*Number((b.price||{})[k]||0)/1000,0);
  const r=await sb.from('poultry_stock_moves').insert({material_id:matId,move_date:new Date(b.finalAt||Date.now()).toISOString().slice(0,10),qty:kg,kind:'adjust',notes:(opts.test?'TEST ':'')+'Posted from Feed batch '+b.id+' via Suite link (ingredient cost about USD '+cost.toFixed(2)+')'}).select().single();
  if(r.error)throw new Error(r.error.message);
  await sb.from('suite_links').update({dst_id:r.data.id}).eq('id',claim.data.id);return {link:claim.data.id,move:r.data.id};
 }catch(e){await sb.from('suite_links').update({status:'voided',voided_at:new Date().toISOString(),note:'failed: '+e.message}).eq('id',claim.data.id);throw e}}
async function voidLink(sb,lk){if(lk.dst_prog==='poultry'&&lk.dst_id){const m=(await sb.from('poultry_stock_moves').select('*').eq('id',lk.dst_id).single()).data;if(m){const u=await sb.from('poultry_stock_moves').insert({material_id:m.material_id,move_date:new Date().toISOString().slice(0,10),qty:-Number(m.qty),kind:'adjust',notes:'VOID of '+(m.notes||'')+' (reversal, nothing deleted)'});if(u.error)throw new Error(u.error.message)}}
 if(lk.dst_prog==='dispute'&&lk.dst_id){const u=await sb.from('dc_contracts').update({voided_at:new Date().toISOString()}).eq('id',lk.dst_id);if(u.error)throw new Error(u.error.message)}
 if(lk.dst_prog==='grain'&&lk.dst_id)await grest('PATCH','gs_lots?id=eq.'+lk.dst_id,{status:'closed',initial_quality_note:'VOID: reversed from Suite link'});
 const r=await sb.from('suite_links').update({status:'voided',voided_at:new Date().toISOString()}).eq('id',lk.id);if(r.error)throw new Error(r.error.message)}
async function links(el,api){const l=api.lang(),t=LT[l];cache=null;
 el.innerHTML=`<h3 class="hh">${t.t}</h3><p class="sub">${t.note}</p><div id="hl" class="sub">${L[l].loading}</div>`;
 const d=await load(api.sb),lk=(await api.sb.from('suite_links').select('*').order('created_at',{ascending:false}).limit(200)).data||[];
 const posted=new Set(lk.filter(x=>x.status==='posted'&&x.src_prog==='iom').map(x=>x.src_id));
 const rcs=((d.iom&&d.iom.receipts)||[]).filter(r=>r.status&&r.status!=='draft');
 const hasG=!!localStorage.getItem('gs_tok');const postedF=new Set(lk.filter(x=>x.status==='posted'&&x.src_prog==='feed-batch').map(x=>x.src_id));const fs=((await api.sb.from('feed_state').select('data').limit(1)).data||[])[0];const fbs=((fs&&fs.data&&fs.data.batches)||[]).filter(b=>b.status==='final');const fmats=((await api.sb.from('poultry_materials').select('id,name').eq('kind','feed')).data)||[];const postedS=new Set(lk.filter(x=>x.status==='posted'&&x.src_prog==='iom-sale').map(x=>x.src_id));const sos=((d.iom&&d.iom.sales)||[]).filter(r=>r.status&&r.status!=='draft');
 el.querySelector('#hl').innerHTML=`<table class="htb"><tr><th>${t.src}</th><th>${t.qty}</th><th></th></tr>`+(rcs.length?rcs.map(r=>`<tr><td><b>${esc(r.ref)}</b> · ${esc(r.supplier||'')}</td><td>${esc(r.rec||r.dis||'')}</td><td>${posted.has(r.ref)?'<span class="chip">'+t.posted+'</span>':(hasG?`<a class="chip" data-p="${esc(r.ref)}">${t.post}</a>`:'<span class="sub">'+t.nogr+'</span>')}</td></tr>`).join(''):`<tr><td colspan=3 class="sub">${t.none}</td></tr>`)+`</table><h3 class="hh">${t.src2}</h3><table class="htb"><tr><th>${t.src2}</th><th>${t.val}</th><th></th></tr>`+(sos.length?sos.map(r=>`<tr><td><b>${esc(r.ref)}</b></td><td>${esc(((r.qty||0)*(r.price||0))+' '+(r.cur||''))}</td><td>${postedS.has(r.ref)?'<span class="chip">'+t.posted+'</span>':`<a class="chip" data-s="${esc(r.ref)}">${t.post2}</a>`}</td></tr>`).join(''):`<tr><td colspan=3 class="sub">${t.none2}</td></tr>`)+`</table><h3 class="hh">${t.src3}</h3><table class="htb"><tr><th>${t.src3}</th><th>${t.kg}</th><th></th></tr>`+(fbs.length?fbs.map(b=>`<tr><td><b>${esc(b.id)}</b> · ${esc(b.name||'')}</td><td>${esc(b.produced||'')}</td><td>${postedF.has(b.id)?'<span class="chip">'+t.posted+'</span>':(fmats.length?`<select data-fm="${esc(b.id)}">${fmats.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select> <a class="chip" data-f="${esc(b.id)}">${t.post3}</a>`:'<span class="sub">'+t.nomat+'</span>')}</td></tr>`).join(''):`<tr><td colspan=3 class="sub">${t.none3}</td></tr>`)+`</table><h3 class="hh">${t.ledger}</h3><table class="htb"><tr><th>${t.src}</th><th>→</th><th>${t.st}</th><th></th></tr>`+lk.map(x=>`<tr><td>${esc(x.src_prog)}:${esc(x.src_id)}</td><td>${esc(x.dst_prog)}:${esc(String(x.dst_id||'').slice(0,8))}</td><td>${t[x.status]}${x.note?' · '+esc(x.note):''}</td><td>${x.status==='posted'?`<a class="chip" data-v="${x.id}">${t.void}</a>`:''}</td></tr>`).join('')+'</table>';
 el.querySelectorAll('[data-p]').forEach(a=>a.onclick=async()=>{try{await postReceipt(api.sb,d,rcs.find(r=>r.ref===a.dataset.p));alert(t.okp)}catch(e){alert(t.err+e.message)}links(el,api)});
 el.querySelectorAll('[data-s]').forEach(a=>a.onclick=async()=>{try{await postSale(api.sb,d,sos.find(r=>r.ref===a.dataset.s));alert(t.okp)}catch(e){alert(t.err+e.message)}links(el,api)});
 el.querySelectorAll('[data-f]').forEach(a=>a.onclick=async()=>{try{const sel=el.querySelector('[data-fm="'+a.dataset.f+'"]');await postFeedBatch(api.sb,fbs.find(b=>b.id===a.dataset.f),sel&&sel.value);alert(t.okp)}catch(e){alert(t.err+e.message)}links(el,api)});
 el.querySelectorAll('[data-v]').forEach(a=>a.onclick=async()=>{try{await voidLink(api.sb,lk.find(x=>x.id===a.dataset.v));alert(t.okv)}catch(e){alert(t.err+e.message)}links(el,api)});}
window.Hub={postFeedBatch,postSale,postReceipt,voidLink,load,views:{directory:directory,commodities:comm,links:links},rollup:rollup,labels:L};
})();
