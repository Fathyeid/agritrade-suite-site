const C = window.PORTAL_CFG;
{const j=new URLSearchParams(location.search).get('join');if(j){location.replace('/team/?join='+encodeURIComponent(j))}}
const sb = supabase.createClient(C.url, C.anon, {auth:{persistSession:true,detectSessionInUrl:true,flowType:'implicit'}});
const MODS = [
 {id:'iom',ic:'⚙️',url:'/iom/',embed:true,
  n:{ar:'إدارة العمليات المتكاملة',en:'Integrated Operations'},d:{ar:'العمليات والشحنات والعقود والمخزون في مكان واحد.',en:'Operations, shipments, contracts and inventory in one place.'}},
 {id:'team',ic:'👥',url:'/team/',embed:true,everyone:true,
  n:{ar:'فريق العمل',en:'Team Workspace'},d:{ar:'المهام والموظفين والموافقات والمحادثات.',en:'Tasks, employees, approvals and team chat.'}},
 {id:'grain',ic:'🌾',url:'/grain/',embed:true,
  n:{ar:'تخزين الحبوب',en:'Grain Storage'},d:{ar:'الصوامع والمخزون والتنبيهات والآفات والقراءات.',en:'Silos, stock, alerts, pests and sensor readings.'}},
 {id:'dispute',ic:'⚖️',url:'/dispute/',embed:true,
  n:{ar:'مركز النزاعات والتحكيم',en:'Dispute & Arbitration Center'},d:{ar:'متابعة النزاعات والتحكيم والمطالبات المالية.',en:'Disputes, arbitration stages and claims.'}},
 {id:'inst',ic:'🏛️',url:'/inst/',embed:true,
  n:{ar:'مؤسسات التجارة العالمية',en:'Trade Institutions'},d:{ar:'دليل الهيئات والمؤسسات التجارية الدولية.',en:'Directory of global trade bodies and authorities.'}},
 {id:'feed',ic:'🧪',url:'/feed/',embed:true,
  n:{ar:'تركيب الأعلاف',en:'Feed Formulation'},d:{ar:'حساب تركيبة الأعلاف وأقل تكلفة وتحليل العناصر الغذائية.',en:'Feed formulation, least-cost mixes and nutrient analysis.'}},
 {id:'poultry',ic:'🐔',url:'/poultry/',embed:true,
  n:{ar:'منصة الدواجن الذكية',en:'Poultry Intelligence'},d:{ar:'القطعان والأعلاف والبيطري والمبيعات والمالية لشركات الدواجن.',en:'Flocks, feed, veterinary, sales and finance for poultry companies.'}},
 {id:'chart',ic:'📈',url:'/chart/',embed:true,
  n:{ar:'شارت العقود الآجلة',en:'Futures Charts'},d:{ar:'رسوم العقود الآجلة للسلع.',en:'Commodity futures charts.'}}
];
const T = {
 ar:{title:'Agritrade Pro',loginSub:'سجّل الدخول بحساب جوجل للوصول لكل البرامج من مكان واحد.',google:'الدخول بحساب جوجل',logout:'خروج',home:'الرئيسية',
  admin:'مدير',user:'مستخدم',welcome:'أهلاً بك',sub:'كل برامجك في منصة واحدة. اختر برنامجاً للبدء.',open:'فتح',openFull:'فتح في صفحة كاملة',
  tagEmb:'داخل المنصة',tagLink:'رابط خارجي',blockedT:'هذا البرنامج لا يسمح بالعرض داخل المنصة',blockedD:'لأسباب أمان يفتح في صفحة كاملة. اضغط الزر وارجع لهذه المنصة من المتصفح.',
  fnote:'لو طلب البرنامج تسجيل دخول بجوجل وما اشتغلش داخل المنصة، افتحه في صفحة كاملة.',
  sso:'دخول واحد بحساب جوجل يفتح كل البرامج. الأقسام الفرعية لكل برنامج تظهر تحت اسمه في القائمة.',
  notadmin:'حسابك مسجّل كمستخدم عادي، ويظهر لك فريق العمل فقط.',cantSign:'تعذر تسجيل الدخول: ',lang:'English'},
 en:{title:'Agritrade Pro',loginSub:'Sign in with Google to reach all your programs from one place.',google:'Continue with Google',logout:'Sign out',home:'Home',
  admin:'Admin',user:'User',welcome:'Welcome',sub:'All your programs in one portal. Pick one to start.',open:'Open',openFull:'Open full page',
  tagEmb:'Inside portal',tagLink:'External link',blockedT:'This program does not allow embedding',blockedD:'For security it opens as a full page. Use the browser back button to return to this portal.',
  fnote:'If a program asks for Google sign-in and it fails inside the portal, open it as a full page.',
  sso:'One Google sign-in opens every program. Each program\'s sections are listed under its name in the menu.',
  notadmin:'Your account is a regular user, so only Team Workspace is shown.',cantSign:'Sign-in failed: ',lang:'العربية'}
};
let lang = localStorage.getItem('lang') || 'ar';
let session=null, isAdmin=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const t=k=>T[lang][k];
const LKEY={iom:'iom.lang',team:'tw_lang',dispute:'dc_lang',grain:'gs_lang',inst:'ti_lang',chart:'suite_lang',feed:'suite_lang',poultry:'suite_lang'};
function syncKeys(){Object.values(LKEY).forEach(k=>localStorage.setItem(k,lang))}
function applyLang(){
  syncKeys();
  document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  $$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
  $$('[data-lang-toggle]').forEach(e=>e.textContent=t('lang'));
  document.title=t('title');
  if(session){ $('#ubadge').textContent=isAdmin?t('admin'):t('user'); renderSide(); route(); }
}
const HUBV=[{id:'directory',ic:'📇',n:{ar:'دليل الأطراف',en:'Parties Directory'}},{id:'commodities',ic:'🌐',n:{ar:'السلع عبر البرامج',en:'Commodities'}},{id:'links',ic:'🔗',n:{ar:'الربط بين البرامج',en:'Cross-program links'}}];
window.HUBSB=sb;const HUBAPI={sb,lang:()=>lang,jump:(id,rx)=>jumpTo(id,rx)};
function jumpTo(id,rx){go(id);let n=0;const iv=setInterval(()=>{if(++n>60){clearInterval(iv);return}if($('#frame').dataset.mod!==id)return;const r=readSubs();if(!r||!r.length)return;clearInterval(iv);const k=r.findIndex(x=>rx.test(x.label));if(k>=0){r[k].e.click();setTimeout(renderSubs,150)}},250)}
function visible(){return MODS.filter(m=>isAdmin||m.everyone)}
function renderSide(){
  const cur=(location.hash.match(/#\/(\w+)/)||[])[1]||'';
  $('#side').innerHTML = `<a data-go="" class="${cur===''?'on':''}">🏠 ${t('home')}</a>`+HUBV.map(h=>`<a data-go="${h.id}" class="${cur===h.id?'on':''}">${h.ic} ${h.n[lang]}</a>`).join('')+`<div class="sep"></div>`+
   visible().map(m=>`<a data-go="${m.id}" class="${cur===m.id?'on':''}">${m.ic} ${m.n[lang]}${m.link?'<span class="ext">↗</span>':''}</a>`).join('');
  $$('#side a').forEach(a=>a.onclick=()=>{go(a.dataset.go);closeMenu()});
}
function renderHome(){
  const u=(session.user.user_metadata&&(session.user.user_metadata.full_name||session.user.user_metadata.name))||session.user.email;
  $('#home').innerHTML = `<h2>${t('welcome')}، ${esc(u)}</h2><p class="sub">${t('sub')}</p><div class="grid">`+
   visible().map(m=>`<div class="card" data-go="${m.id}"><div class="ic">${m.ic}</div><h3>${m.n[lang]}</h3><p>${m.d[lang]}</p><span class="tag">${m.link?t('tagLink'):(m.embed?t('tagEmb'):t('tagLink'))}</span></div>`).join('')+
   `</div><div class="note">${t('sso')}${isAdmin?'':'<br>'+t('notadmin')}</div>`;
  $$('#home .card').forEach(c=>c.onclick=()=>go(c.dataset.go));
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function seedSso(id){try{if(!session)return;const k={feed:'ffi_sb_session',poultry:'pl_sb_session'}[id];if(k)localStorage.setItem(k,JSON.stringify({access_token:session.access_token,refresh_token:'portal-managed'}))}catch{}}
function go(id){location.hash=id?'#/'+id:'#/'}
function closeMenu(){$('#side').classList.remove('open');$('#shade').classList.remove('on')}
function route(){
  if(!session) return;
  const id=(location.hash.match(/#\/(\w+)/)||[])[1]||'';
  const m=visible().find(x=>x.id===id);
  renderSide();
  const fw=$('#frameWrap'), home=$('#home');
  if(!m){ fw.classList.add('hidden'); home.classList.remove('hidden'); $('#openfull').classList.add('hidden'); $('#frame').src='about:blank'; $('#frame').dataset.mod=''; if(window.Hub&&HUBV.some(h=>h.id===id)){home.innerHTML='<div id="hubv"></div>';Hub.views[id]($('#hubv'),HUBAPI)} else {renderHome(); if(window.Hub&&isAdmin){const b=document.createElement('div');b.id='hubr';home.appendChild(b);Hub.rollup(b,HUBAPI)}} return; }
  home.classList.add('hidden'); fw.classList.remove('hidden');
  $('#openfull').classList.remove('hidden'); $('#openfull').onclick=()=>{location.href=m.url};
  const bl=$('#blocked'), fr=$('#frame'), fn=$('#fnote');
  if(m.embed){
    bl.classList.add('hidden'); fr.classList.remove('hidden'); fn.classList.add('hidden');
    fn.innerHTML=`<span>${t('fnote')}</span><button class="pill" style="background:#1d4ed8;color:#fff" id="fn2">${t('openFull')}</button>`;
    $('#fn2').onclick=()=>{location.href=m.url};
    if(fr.dataset.mod!==m.id){seedSso(m.id);fr.dataset.mod=m.id;fr.src=m.url}
  } else {
    fr.classList.add('hidden'); fr.src='about:blank'; fr.dataset.mod=''; fn.classList.add('hidden'); bl.classList.remove('hidden');
    bl.innerHTML=`<div style="font-size:50px">${m.ic}</div><h3>${m.n[lang]}</h3>${m.link?'':`<p><b>${t('blockedT')}</b></p><p>${t('blockedD')}</p>`}<a class="btn" href="${m.url}">${t('open')} ↗</a>`;
  }
}
async function boot(){
  const {data}=await sb.auth.getSession(); session=data.session;
  sb.auth.onAuthStateChange((_e,s)=>{const had=!!session;session=s;if(!!s!==had)show()});
  show();
}
function show(){
  if(!session){ $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); applyLang(); return; }
  isAdmin=(session.user.email||'').toLowerCase()===C.admin;
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#uemail').textContent=session.user.email; applyLang();
}
$('#gbtn').onclick=async()=>{
  $('#lerr').textContent='';
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/',queryParams:{prompt:'select_account'}}});
  if(error) $('#lerr').textContent=t('cantSign')+error.message;
};
$('#logout').onclick=async()=>{await sb.auth.signOut();session=null;location.hash='';show()};
$('#menu').onclick=()=>{$('#side').classList.toggle('open');$('#shade').classList.toggle('on')};
$('#shade').onclick=closeMenu; $('#brand').onclick=()=>go('');
$$('[data-lang-toggle]').forEach(b=>b.onclick=()=>{lang=lang==='ar'?'en':'ar';localStorage.setItem('lang',lang);Object.values(LKEY).forEach(k=>{try{localStorage.setItem(k,lang)}catch{}});applyLang();subSig='';try{if($('#frame').dataset.mod==='chart'){try{$('#frame').contentWindow.dispatchEvent(new CustomEvent('suite-lang',{detail:lang}))}catch{}}else if($('#frame').dataset.mod){setLive(false);const fr=$('#frame');const cur=fr.contentWindow.location.href;fr.contentWindow.location.replace('about:blank');setTimeout(()=>{syncKeys();fr.contentWindow.location.replace(cur)},150)}}catch{}});
window.addEventListener('hashchange',route);
const q=new URLSearchParams(location.hash.replace('#','?')); 
if(location.hash.includes('error_description')){ setTimeout(()=>{$('#lerr').textContent=t('cantSign')+(q.get('error_description')||'')},200) }
boot();

/* ---- sub-sections: mirror each program's own navigation into the portal sidebar ---- */
const SUBS={
 iom:{sel:'#nav a',hide:'#nav'},
 team:{sel:'#side button.nav',hide:'#side'},
 grain:{sel:'#side nav.nav a',hide:'#side'},
 dispute:{sel:'#side a',hide:'#side'},
 inst:{sel:'#side a.ni',hide:'#side'},
 feed:{sel:'nav.side a.nv:not(.dis)',hide:'nav.side'},
 poultry:{sel:'aside.side a[data-a=go]',hide:'aside.side'},
 chart:{fn:d=>{const b=[...d.querySelectorAll('button')].find(x=>['Markets','الأسواق'].includes(x.textContent.trim()));return b?[...b.parentElement.children].filter(x=>x.tagName==='BUTTON'&&!['»','Quote','السعر'].includes(x.textContent.trim())):[]}}
};
let subSig='',subEls=[];
function frameDoc(){try{return $('#frame').contentDocument}catch{return null}}

const ICONS=[
 [/facilit/i,'🏭'],[/silos? manag/i,'🗄️'],[/readings|monitoring/i,'📈'],[/storage inventory|^inventory/i,'📦'],[/pest/i,'🐛'],[/aeration/i,'🌀'],[/fumigation/i,'☁️'],[/sensors/i,'📡'],[/equipment/i,'🔧'],[/costs/i,'💲'],[/thresholds/i,'🚨'],[/register new/i,'➕'],[/all disputes/i,'📋'],[/evidence/i,'🗂️'],[/correspondence/i,'✉️'],[/claims/i,'⚖️'],[/contracts & parties/i,'📄'],[/institutions$/i,'🏛️'],[/settlement/i,'🤝'],[/document generator/i,'📝'],[/experts/i,'👤'],[/legal library/i,'📖'],[/collaboration/i,'💬'],[/case management/i,'🧭'],[/financial exposure/i,'💰'],[/settings/i,'⚙️'],[/visual monitoring/i,'👁️'],[/users & roles|roles/i,'👥'],[/records assistant/i,'🤖'],[/case law|rules library/i,'📚'],
 [/^planning$|^التخطيط$/i,'🗓️'],[/^ledger$|دفتر الحسابات/i,'📒'],
 [/^control tower$|مركز القيادة/i,'🗼'],[/^flocks$|القطعان/i,'🐥'],[/stock & feed mill|المخزون ومصنع/i,'🏭'],[/^veterinary$|الطب البيطري/i,'💉'],[/sales & slaughter|المبيعات والمجزر/i,'🧾'],[/^finance$|^المالية$/i,'💰'],
 [/parent stock|الأمهات/i,'🥚'],[/fleet & dist|النقل والتوزيع/i,'🚚'],[/traceability|^التتبع$/i,'🔎'],[/^layers$|البياض/i,'🥚'],[/cold storage|التبريد/i,'❄️'],[/^assistant$|^المساعد$/i,'🤖'],[/sites & houses|المواقع والعنابر/i,'🏠'],[/^modules$|^الوحدات$/i,'🧩'],[/^members$|^الأعضاء$/i,'👥'],[/audit log|سجل التدقيق/i,'🛡️'],[/^settings$|^الإعدادات$/i,'⚙️'],
 [/formulation workspace|ورشة تركيب/i,'🧮'],[/raw materials|المواد الخام/i,'🌽'],[/animal nutrition|تغذية الحيوان/i,'🐄'],[/market prices|الأسعار وتكلفة/i,'💹'],[/substitution|استبدال/i,'🔁'],[/^inventory$|^المخزون$/i,'📦'],[/supplier|الموردين/i,'🏪'],[/batches|الدفعات/i,'🧪'],[/feed assistant|مساعد الأعلاف/i,'🤖'],[/additives|الإضافات/i,'💊'],[/scenario|السيناريوهات/i,'🎲'],[/history & reports|السجل والتقارير/i,'📑'],[/sources & assump|المصادر والافتراضات/i,'🔗'],[/^dashboard$|لوحة التحكم/i,'📊'],
 [/dashboard|overview|لوحة|الرئيسية/i,'📊'],[/chat|محادث/i,'💬'],[/transaction|العمليات$/i,'🔄'],[/my tasks/i,'✅'],[/team tasks|tasks/i,'👥'],
 [/activity|timeline|التسلسل/i,'🕒'],[/directory|دليل الموظف|country authorities/i,'📇'],[/feed/i,'📣'],[/approval/i,'🛡️'],[/standup/i,'🗓️'],[/handover/i,'🤝'],
 [/announce/i,'📢'],[/analytics|analysis|التحليل المالي|تحليل/i,'📈'],[/\bai\b|assistant|مساعد/i,'🤖'],
 [/تسجيل نزاع/,'➕'],[/كل النزاعات/,'📋'],[/الأدلة/,'🗂️'],[/المراسلات/,'✉️'],[/المطالبات/,'⚖️'],[/العقود/,'📄'],[/التقويم|calendar/i,'📅'],
 [/مؤسسات التحكيم/,'🏛️'],[/قضايا التحكيم/,'🧭'],[/التسويات/,'🤝'],[/مولد المستندات/,'📝'],[/الخبراء/,'👤'],[/مكتبتي/,'📖'],[/التعاون/,'💬'],
 [/المالي/,'💰'],[/التقارير|reports/i,'📑'],[/التدقيق|audit/i,'🛡️'],[/المستخدمون|users/i,'👥'],[/تصنيفات/,'🏷️'],[/تجريبية/,'🧪'],
 [/منشآت/,'🏭'],[/الصوامع/,'🗄️'],[/القراءات/,'📈'],[/التنبيهات|alerts/i,'🔔'],[/مخزون/,'📦'],[/جودة|quality/i,'🧪'],[/الآفات/,'🐛'],[/التهوية/,'🌀'],
 [/التبخير/,'☁️'],[/الفحوصات/,'📅'],[/المراقبة المرئية/,'👁️'],[/المخاطر|risk/i,'⚠️'],[/تتبع/,'🔗'],[/التكاليف/,'💲'],[/المعدات/,'🔧'],[/الحساسات/,'📡'],[/حدود الإنذار/,'🚨'],
 [/^search|scanner|screener/i,'🔎'],[/grain|commodity associations/i,'🌾'],[/arbitration/i,'⚖️'],[/international trade org/i,'🌐'],[/customs/i,'🛃'],[/food safety/i,'🧪'],
 [/maritime/i,'🚢'],[/banking/i,'🏦'],[/inspection/i,'✅'],[/government/i,'🏛️'],[/egyptian/i,'🇪🇬'],[/rules/i,'📚'],[/matrix/i,'🧮'],[/dispute guide/i,'🧭'],[/news/i,'📰'],
 [/relationship/i,'🕸️'],[/tools/i,'🛠️'],[/sources/i,'🔗'],
 [/markets/i,'🌍'],[/watchlist/i,'⭐'],[/correlation/i,'🔗'],[/journal/i,'📓'],[/paper/i,'🧾'],[/portfolio/i,'💼'],[/hedge/i,'🛡️'],[/futures/i,'📅'],[/contracts/i,'📃'],
 [/quant/i,'🧮'],[/options/i,'🎯'],[/bots/i,'🤖'],[/script/i,'💻'],[/analyst/i,'🧠'],[/workspace/i,'🗂️'],[/providers/i,'🔌'],[/backtest/i,'⏪']
];
function iconFor(e,label){
  const own=$('#frame').dataset.mod==='iom'&&e.querySelector&&e.querySelector('.ic');
  if(own){const t=own.textContent.trim();if(t&&t.length<=4&&!/^[\x00-\x7f]+$/.test(t))return t}
  for(const [r,i] of ICONS) if(r.test(label)) return i;
  return '📄';
}
function readSubs(){
  const id=$('#frame').dataset.mod, c=SUBS[id], d=frameDoc();
  if(!c||!d||!d.body) return null;
  const els=c.fn?c.fn(d):[...d.querySelectorAll(c.sel)];
  return els.map(e=>{
    let label=e.textContent.replace(/\s+/g,' ').trim();
    const ar=e.querySelector&&e.querySelector('.tx .ar');
    if(ar){const tx=e.querySelector('.tx');const en=[...tx.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();label=lang==='ar'?ar.textContent.trim():en}
    const on=/(^|\s)(on|active|sel|current)(\s|$)/.test(e.className||'')||e.getAttribute('aria-current')==='page'||e.getAttribute('aria-selected')==='true';
    const lb=label.replace(/^[^\p{L}\p{N}]+/u,'').replace(/\d+$/,'').trim();return {e,label:lb,icon:iconFor(e,lb),on};
  }).filter(x=>x.label);
}
function injectHide(){
  const id=$('#frame').dataset.mod, c=SUBS[id], d=frameDoc();
  if(!c||!c.hide||!d||!d.head||d.getElementById('portal-hide')) return;
  if(!d.getElementById('ds-css')){const l=d.createElement('link');l.id='ds-css';l.rel='stylesheet';l.href='/ds/ds.css';d.head.appendChild(l);const j=d.createElement('script');j.src='/ds/ds.js';d.head.appendChild(j)}
  const s=d.createElement('style');s.id='portal-hide';
  s.textContent=c.hide+'{display:none!important}'+(PORTAL_FIX[id]||'');
  d.head.appendChild(s);
}
const GREEN='--navy:#1e40af;--blue:#1d4ed8;--pri:#1d4ed8;--pri2:#e0f2fe;--gold:#d4a017;--bg:#f5f8fd;--bd:#e3eaf4;--line:#e3eaf4;';
const PORTAL_FIX={feed:':root{'+GREEN+'}.layout{display:block!important}.top .btn.ghost{display:none!important}.top{background:#fff!important}',poultry:':root{'+GREEN+'}.shell{grid-template-columns:1fr!important}header{background:#fff!important;color:#0b2a5b!important;border-bottom:3px solid #d4a017!important}header h1,header span{color:#0b2a5b!important}header .btn.ghost{color:#1d4ed8!important}[data-a=lang]{display:none!important}',iom:'#burger{display:none!important}',dispute:'.burger{display:none!important}',team:'.shell{grid-template-columns:1fr!important}.menubtn{display:none!important}',inst:'#menu{display:none!important}.app{grid-template-columns:1fr!important;display:block!important}',grain:'.main{width:100%!important}.menu-btn{display:none!important}'};
function collapseOld(o){ if(!o) return; o.style.maxHeight=o.scrollHeight+'px'; o.classList.add('closing'); o.removeAttribute('id'); void o.offsetHeight; o.style.maxHeight='0px'; setTimeout(()=>o.remove(),260); }

let previewId=null,liveReady=true,pending=null,hoverT=null,leaveT=null,readyT=null;
const SEED={};
function cacheGet(id){try{const c=JSON.parse(localStorage.getItem('sc4')||'{}');return (c[lang+'|'+id])||(SEED[lang+'|'+id])||null}catch{return SEED[lang+'|'+id]||null}}
function cachePut(id,items){try{const c=JSON.parse(localStorage.getItem('sc4')||'{}');c[lang+'|'+id]=items.map(x=>({label:x.label,icon:x.icon}));localStorage.setItem('sc4',JSON.stringify(c))}catch{}}
function setLive(v){liveReady=v;clearTimeout(readyT);if(!v)readyT=setTimeout(()=>{liveReady=true},5000)}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('#side a[data-go]'); if(!a) return; const id=a.dataset.go; if(id!==$('#frame').dataset.mod){setLive(false);subSig=''} previewId=id; pending=null; renderSubs()},true);
function mountSubs(id,items,live){
  const old=$('#side .subs:not(.closing)');
  const a=$(`#side a[data-go="${id}"]`); if(!a){collapseOld(old);return}
  if(old&&old.previousElementSibling===a&&old.dataset.live==='1'&&live===false){ return }
  const keep=old&&old.previousElementSibling===a;
  const box=document.createElement('div'); box.className='subs'; box.dataset.live=live?'1':'0';
  box.innerHTML=items.map((x,i)=>`<a data-k="${i}" class="${x.on?'on':''}"><span class="si">${x.icon}</span><span>${esc(x.label)}</span></a>`).join('');
  if(keep){old.replaceWith(box);box.style.maxHeight='none';}
  else{collapseOld(old);a.after(box); box.style.maxHeight='0px'; requestAnimationFrame(()=>requestAnimationFrame(()=>{box.style.maxHeight=box.scrollHeight+'px';setTimeout(()=>{box.style.maxHeight='none'},300)}));}
  box.querySelectorAll('a').forEach(b=>b.onclick=ev=>{ev.stopPropagation();ev.preventDefault();const k=+b.dataset.k;
    if(id===$('#frame').dataset.mod&&liveReady&&subEls[k]){const fr=readSubs();((fr&&fr[k]&&fr[k].label===items[k].label)?fr[k].e:subEls[k]).click();setTimeout(renderSubs,150)}
    else{pending={id,k,label:items[k].label};previewId=id;if(id!==$('#frame').dataset.mod){setLive(false);go(id)}}
    closeMenu()});
}
function renderSubs(){
  const mod=$('#frame').dataset.mod||'';
  const target=previewId||mod;
  if(!target){ collapseOld($('#side .subs:not(.closing)')); subSig=''; return; }
  let items=null;
  if(target===mod&&liveReady&&!$('#frameWrap').classList.contains('hidden')){ const r=readSubs(); if(r&&r.length) items=r; }
  if(items){
    const sig='L|'+mod+'|'+items.map(x=>x.label+(x.on?'*':'')).join('|');
    subEls=items.map(x=>x.e);
    if(sig!==subSig||!$('#side .subs:not(.closing)')){ subSig=sig; cachePut(mod,items); mountSubs(mod,items,true); }
    if(previewId===mod&&!hoverT&&!$('#side:hover')) previewId=null;
    if(pending&&pending.id===mod){const k=pending.k; if(subEls[k]&&items[k].label===pending.label){subEls[k].click();pending=null;setTimeout(renderSubs,150)}else pending=null}
    return;
  }
  const c=cacheGet(target);
  if(c&&c.length){ const sig='C|'+target; if(sig!==subSig||!$('#side .subs:not(.closing)')){subSig=sig;mountSubs(target,c,false)} }
  else if(target!==mod){ collapseOld($('#side .subs:not(.closing)')); subSig=''; }
}
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  const side=$('#side');
  side.addEventListener('mouseover',e=>{const a=e.target.closest('a[data-go]'); if(!a) return; clearTimeout(leaveT); const id=a.dataset.go; if(previewId===id) return; clearTimeout(hoverT); hoverT=setTimeout(()=>{hoverT=null;previewId=id;renderSubs()},120)});
  side.addEventListener('mouseleave',()=>{clearTimeout(hoverT);hoverT=null;clearTimeout(leaveT);leaveT=setTimeout(()=>{previewId=null;subSig='';renderSubs()},350)});
}
$('#frame').addEventListener('load',()=>{ if($('#frame').dataset.mod){setLive(true);injectHide();subSig='';renderSubs()}});
setInterval(()=>{ const mm=$('#frame').dataset.mod,kk=LKEY[mm],v=kk&&localStorage.getItem(kk); if(session&&kk&&(v==='ar'||v==='en')&&v!==lang){lang=v;localStorage.setItem('lang',lang);applyLang();subSig=''} if(session&&$('#frame').dataset.mod){injectHide();renderSubs()} },700);

/* ---- Arabic mode: translate leftover English UI phrases inside embedded programs (proper names stay as written) ---- */
const TR_EXACT={'admin':'مدير','view':'عرض','edit':'تعديل','create':'إنشاء','approve':'اعتماد','assign':'تعيين','export':'تصدير','close_alerts':'إغلاق التنبيهات','users':'المستخدمون','readings':'القراءات','alerts':'التنبيهات','costs':'التكاليف','equipment':'المعدات','sensors':'الحساسات','aeration':'التهوية','fumigations':'التبخير','inspections':'الفحوصات','calibrations':'المعايرة','lab_files':'ملفات المختبر','maint_logs':'سجلات الصيانة','pest_obs':'ملاحظات الآفات','quality_tests':'فحوص الجودة','Email':'البريد الإلكتروني','No data for this filter':'لا توجد بيانات لهذا الفلتر','تجريبي data cleared':'تم مسح البيانات التجريبية','Africa':'أفريقيا','Americas':'الأميركتان','Asia & Pacific':'آسيا والمحيط الهادئ','Europe':'أوروبا','Middle East':'الشرق الأوسط','Black Sea & Central Asia':'البحر الأسود وآسيا الوسطى','Blocs':'التكتلات','Periodic':'دوري','Amended regularly':'تُعدَّل بانتظام','Not in force':'غير نافذة','Pending verification':'بانتظار التحقق','Information Not Verified':'معلومات غير مؤكدة','Multiple forms':'نماذج متعددة','Multiple forms and editions':'نماذج وإصدارات متعددة','Standing watch item':'بند مراقبة دائم','Carriage of goods by sea':'نقل البضائع بحراً','Letters of credit':'الاعتمادات المستندية','Disputes under ICC clauses':'نزاعات بموجب بنود غرفة التجارة الدولية','Check current':'راجع الإصدار الحالي','Check each amendment':'راجع كل تعديل','Revised 1999':'منقّحة 1999','Rule milestone (last known)':'محطة قاعدية (آخر ما هو معروف)'};
const TR_MON={Jan:'يناير',Feb:'فبراير',Mar:'مارس',Apr:'أبريل',May:'مايو',Jun:'يونيو',Jul:'يوليو',Aug:'أغسطس',Sep:'سبتمبر',Oct:'أكتوبر',Nov:'نوفمبر',Dec:'ديسمبر'};
const TR_RE=[[/\(last known\)/g,'(آخر ما هو معروف)'],[/last known/g,'آخر ما هو معروف'],[/entered into force/g,'دخلت حيز النفاذ'],[/entry into force/g,'دخول حيز النفاذ'],[/mandatory/g,'إلزامي'],[/as amended/g,'بصيغتها المعدّلة'],[/phased in/g,'تطبيق تدريجي'],[/\(and (\d{4}) edition, check which applies\)/g,'(وإصدار $1، راجع أيهما ينطبق)'],[/(\d{4}) edition/g,'إصدار $1'],[/(\d{4}) Rules/g,'قواعد $1'],[/\bper SOLAS\b/g,'وفق سولاس'],[/Check current Rules number/g,'راجع رقم القواعد الحالي'],[/Check current Rules/g,'راجع القواعد الحالية'],[/Check current edition/g,'راجع الإصدار الحالي'],[/Check current/g,'راجع الإصدار الحالي'],[/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})/g,(m,d,mo,y)=>d+' '+TR_MON[mo]+' '+y],[/HS 2022/g,'النظام المنسق 2022']];
const trSeen=new WeakMap();
function translateFrame(){
  if(lang!=='ar') return; const mod=$('#frame').dataset.mod; if(!mod||mod==='team'||mod==='dispute'||mod==='chart') return;
  const d=frameDoc(); if(!d||!d.body) return;
  const w=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT); let n;
  while(n=w.nextNode()){
    const p=n.parentElement; if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.tagName)) continue;
    const v=n.nodeValue; if(trSeen.get(n)===v) continue;
    let o=v; const tx=v.trim();
    if(mod==='inst'&&!/[\u0600-\u06FF]/.test(tx.replace(/^\(.*\)$/,''))||mod==='inst'){ if(TR_EXACT[tx]) o=v.replace(tx,TR_EXACT[tx]); else TR_RE.forEach(([r,x])=>{o=o.replace(r,x)}); }
    else if(TR_EXACT[tx]) o=v.replace(tx,TR_EXACT[tx]);
    if(o!==v) n.nodeValue=o; trSeen.set(n,n.nodeValue);
  }
}
setInterval(()=>{try{if(session)translateFrame()}catch{}},900);
