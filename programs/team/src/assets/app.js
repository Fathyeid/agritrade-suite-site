(function(){const o=Element.prototype.append;Element.prototype.append=function(...a){return o.apply(this,a.filter(x=>x!=null&&x!==false));};})();

function actTxt(x){ if(!x||localStorage.getItem('tw_lang')==='en')return x;
 const m=[['Logged in','سجّل الدخول'],['Created group chat ','أنشأ مجموعة '],['Updated profile of ','حدّث ملف '],['Comment on ','علّق على '],['Task ','مهمة '],['Due ','الاستحقاق ']];
 for(const [a,b] of m){ if(x.startsWith(a)) return b+x.slice(a.length);} return x;}
(function(){
'use strict';
const sb=supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true}});
const S={lang:localStorage.getItem('tw_lang')||'ar',me:null,profiles:new Map(),depts:[],convs:[],tasks:[],notifs:[],online:new Set(),route:'',openConv:null,msgs:[],typing:{},unreadTotal:0,sigCache:{}};
const ROLES=['super_admin','general_manager','department_manager','team_leader','employee','finance_user','auditor'];
const STATUSES=['not_started','in_progress','pending_review','waiting_info','blocked','completed','rejected'];
const PRIOS=['low','medium','high','urgent'];
const t=(k)=>S.lang==='ar'?(window.AR[k]||k):(window.EN[k]||k);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function h(tag,props,...kids){const e=document.createElement(tag);props=props||{};for(const k in props){const v=props[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='style'&&typeof v==='object')Object.assign(e.style,v);else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='html')e.innerHTML=v;else if(k==='value')e.value=v;else e.setAttribute(k,v===true?'':v);}
 const add=(c)=>{if(c==null||c===false)return;if(Array.isArray(c))c.forEach(add);else e.append(c.nodeType?c:document.createTextNode(c));};kids.forEach(add);return e;}
const $=(s,r)=> (r||document).querySelector(s);
function toast(m){const x=h('div',{class:'toast'},m);document.body.append(x);setTimeout(()=>x.remove(),2800);}
function setLang(l){S.lang=l;localStorage.setItem('tw_lang',l);document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}
const loc=()=>S.lang==='ar'?'ar-EG':'en-GB';
const fmtTime=d=>new Date(d).toLocaleTimeString(loc(),{hour:'2-digit',minute:'2-digit'});
const fmtDay=d=>{const x=new Date(d),n=new Date();const same=(a,b)=>a.toDateString()===b.toDateString();const y=new Date(n-864e5);if(same(x,n))return t('Today');if(same(x,y))return t('Yesterday');return x.toLocaleDateString(loc(),{weekday:'long',day:'numeric',month:'long',year:'numeric'});};
const fmtDT=d=>new Date(d).toLocaleString(loc(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const ago=d=>{if(!d)return t('Never');const s=(Date.now()-new Date(d))/1000;if(s<90)return t('Just now');if(s<3600)return Math.round(s/60)+' '+t('min ago');if(s<86400)return Math.round(s/3600)+' '+t('h ago');return fmtDT(d);};
const todayStr=()=>new Date().toISOString().slice(0,10);
const initials=n=>(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const P=id=>S.profiles.get(id)||{full_name:'?',id};
const deptName=id=>{const d=S.depts.find(x=>x.id===id);return d?(S.lang==='ar'&&d.name_ar?d.name_ar:d.name):'-';};
const roleName=r=>t('role_'+r);
const isTop=()=>['super_admin','general_manager'].includes(S.me.role);
const isMgr=()=>['super_admin','general_manager','department_manager','team_leader'].includes(S.me.role);
const COLORS=['#1d63d8','#16a34a','#e0a82e','#7c5cd6','#e5484d','#0891b2','#c2410c','#be185d'];
function avatar(p,size,dot){p=p||{};const c=COLORS[(p.full_name||'?').charCodeAt(0)%COLORS.length];const st={background:p.avatar_url?`url(${p.avatar_url}) center/cover`:c};
 return h('div',{class:'av '+(size||''),style:st},p.avatar_url?'':initials(p.full_name),dot===false?null:h('i',{class:'dot'+(S.online.has(p.id)?' on':''),'data-u':p.id}));}
function updateDots(){document.querySelectorAll('.dot[data-u]').forEach(d=>d.classList.toggle('on',S.online.has(d.dataset.u)));}
function err(e){console.error(e);toast((e&&e.message)||String(e));}
async function q(p){const r=await p;if(r.error)throw r.error;return r.data;}
function pill(txt,cls){return h('span',{class:'pill '+(cls||'')},txt);}
function modal(content,wide){const ov=h('div',{class:'ov',onmousedown:e=>{if(e.target===ov)close();}});const m=h('div',{class:'modal'+(wide?' wide':'')},content);ov.append(m);document.body.append(ov);const close=()=>ov.remove();m.close=close;return m;}
function confirmBox(msg,yes){const m=modal([h('h2',{},msg),h('div',{class:'row'},h('button',{class:'btn danger',onclick:()=>{m.close();yes();}},t('Confirm')),h('button',{class:'btn ghost',onclick:()=>m.close()},t('Cancel')))]);}

/* ------------ AUTH ------------ */
function renderAuth(){
 const root=$('#app');root.innerHTML='';let mode='in';
 const msg=h('div',{class:'err'});
 const nameF=h('input',{placeholder:t('Full name'),autocomplete:'name'}),email=h('input',{type:'email',placeholder:'name@company.com',autocomplete:'email'}),pass=h('input',{type:'password',placeholder:'••••••••',autocomplete:'current-password'}),code=h('input',{placeholder:t('Company join code')});
 const nameW=h('label',{class:'field hidden'},h('span',{},t('Full name')),nameF),codeW=h('label',{class:'field hidden'},h('span',{},t('Company join code')),code);
 const tabIn=h('button',{class:'on',onclick:()=>sw('in')},t('Sign in')),tabUp=h('button',{onclick:()=>sw('up')},t('Create account'));
 const go=h('button',{class:'btn wide',onclick:submit},t('Sign in'));
 function sw(m){mode=m;tabIn.classList.toggle('on',m==='in');tabUp.classList.toggle('on',m==='up');nameW.classList.toggle('hidden',m==='in');codeW.classList.toggle('hidden',m==='in');go.textContent=m==='in'?t('Sign in'):t('Create account');msg.textContent='';}
 async function forgot(){msg.textContent='';msg.style.color='';const em=email.value.trim();if(!em){msg.textContent=(S.lang==='ar'?'اكتب بريدك الإلكتروني أولاً ثم اضغط نسيت كلمة المرور':'Enter your email first, then press Forgot password');return;}
  const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+'/'});
  if(error){msg.textContent=error.message;return;}
  msg.style.color='#16a34a';msg.textContent=(S.lang==='ar'?'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك. افتحه من نفس الجهاز.':'A password reset link was sent to your email.');}
 async function submit(){msg.textContent='';go.disabled=true;try{
  if(mode==='in'){const {error}=await sb.auth.signInWithPassword({email:email.value.trim(),password:pass.value});if(error)throw error;}
  else{if(pass.value.length<8)throw new Error(t('Password must be at least 8 characters'));const {error,data}=await sb.auth.signUp({email:email.value.trim(),password:pass.value,options:{data:{full_name:nameF.value.trim(),join_code:code.value.trim(),locale:S.lang}}});if(error)throw error;if(!data.session){const r=await sb.auth.signInWithPassword({email:email.value.trim(),password:pass.value});if(r.error)throw r.error;}}
  await sb.rpc('log_event',{p_action:'Logged in',p_module:'Auth'});
  await start();
 }catch(e){msg.textContent=(e.message||'').includes('Database error')?t('Invalid company join code'):(e.message||String(e));}go.disabled=false;}
 {const jp=new URLSearchParams(location.search).get('join');if(jp){code.value=jp;sw('up');}}
 [email,pass,code,nameF].forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')submit();}));
 const feats=[['👥','Company Team Directory','Organize your team and departments'],['💬','Internal Messaging & Team Chat','Instant & secure communication'],['✅','Task Management','Assign, track and complete tasks'],['🔗','Contextual Conversations','Chat linked to every transaction'],['📈','Employee Activity Timeline','Full activity log & transparency'],['📊','Manager Command Center','Full visibility and control']];
 root.append(h('div',{class:'auth'},
  h('div',{class:'auth-hero'},
   h('div',{class:'brand'},h('img',{src:'assets/logo.png',alt:''}),h('div',{},h('b',{},'AgriTrade ',h('i',{},'Pro')),h('small',{},'Trade • Intelligence • Collaboration'))),
   h('h1',{class:'hero-title'},'Team Workspace',h('br'),h('span',{},S.lang==='ar'?'ومنظومة التعاون الذكي':'& Intelligent Collaboration')),
   h('div',{class:'gold-pill'},t('Work Together • Achieve More')),
   h('p',{class:'hero-sub'},t('A complete team management and communication system for grain trading companies.')),
   h('div',{class:'feat-grid'},feats.map(f=>h('div',{class:'feat'},h('div',{class:'ic'},f[0]),h('div',{},h('b',{},t(f[1])),h('span',{},t(f[2]))))))),
  h('div',{class:'auth-side'},
   h('button',{class:'btn ghost sm langbtn',onclick:()=>{setLang(S.lang==='ar'?'en':'ar');renderAuth();}},S.lang==='ar'?'English':'العربية'),
   h('div',{class:'auth-card'},h('h2',{},t('Welcome')),h('div',{class:'mut'},t('Sign in to your team workspace')),
    h('div',{class:'tabs2'},tabIn,tabUp),nameW,h('label',{class:'field'},h('span',{},t('Email')),email),h('label',{class:'field'},h('span',{},t('Password')),pass),codeW,msg,go,h('button',{class:'btn ghost wide',type:'button',style:{marginTop:'8px'},onclick:async()=>{const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/'}});if(error)msg.textContent=error.message;}},(S.lang==='ar'?'المتابعة عبر Google':'Continue with Google')),h('button',{class:'linkbtn',type:'button',onclick:forgot},(S.lang==='ar'?'نسيت كلمة المرور؟':'Forgot password?')),
    h('p',{class:'mut sm',style:{marginTop:'14px'}},t('New employees need the company join code from the manager.'))))));
}


function renderReset(){
 const root=$('#app');root.innerHTML='';
 const p1=h('input',{type:'password',autocomplete:'new-password',placeholder:'••••••••'}),p2=h('input',{type:'password',autocomplete:'new-password',placeholder:'••••••••'}),msg=h('div',{class:'err'});
 const go=h('button',{class:'btn wide',onclick:async()=>{msg.textContent='';
  if(p1.value.length<8){msg.textContent=(S.lang==='ar'?'كلمة المرور 8 أحرف على الأقل':'Password must be at least 8 characters');return;}
  if(p1.value!==p2.value){msg.textContent=(S.lang==='ar'?'كلمتا المرور غير متطابقتين':'Passwords do not match');return;}
  go.disabled=true;const {data:{session}}=await sb.auth.getSession();
  if(!session){msg.textContent=(S.lang==='ar'?'الرابط منتهي أو غير صالح. اطلب رابطاً جديداً من صفحة الدخول.':'Link expired or invalid. Request a new one from the sign-in page.');go.disabled=false;return;}
  const {error}=await sb.auth.updateUser({password:p1.value});
  if(error){msg.textContent=error.message;go.disabled=false;return;}
  history.replaceState(null,'',location.pathname);
  try{await sb.rpc('log_event',{p_action:'Password reset',p_module:'Auth'});}catch(e){}
  await start();}},(S.lang==='ar'?'حفظ كلمة المرور الجديدة':'Save new password'));
 root.append(h('div',{class:'auth'},h('div',{class:'auth-hero'},h('div',{class:'brand'},h('img',{src:'assets/logo.png',alt:''}),h('div',{},h('b',{},'AgriTrade ',h('i',{},'Pro')),h('small',{},'Trade • Intelligence • Collaboration'))),h('h1',{class:'hero-title'},'Team Workspace')),
  h('div',{class:'auth-side'},h('div',{class:'auth-card'},h('h2',{},(S.lang==='ar'?'تعيين كلمة مرور جديدة':'Set a new password')),
   h('label',{class:'field'},h('span',{},(S.lang==='ar'?'كلمة المرور الجديدة':'New password')),p1),h('label',{class:'field'},h('span',{},(S.lang==='ar'?'تأكيد كلمة المرور':'Confirm password')),p2),msg,go))));
}
/* ------------ LOAD ------------ */
async function loadBase(){
 const [pr,dp]=await Promise.all([q(sb.from('profiles').select('*').order('full_name')),q(sb.from('departments').select('*').order('sort'))]);
 S.profiles=new Map(pr.map(p=>[p.id,p]));S.depts=dp;
}
async function loadConvs(){
 const cms=await q(sb.from('conversation_members').select('last_read_at,conversations(*)').eq('user_id',S.me.id));
 const sums=await q(sb.rpc('conv_summaries'));const sm=new Map(sums.map(s=>[s.conversation_id,s]));
 const ids=cms.map(c=>c.conversations.id);
 const mem=ids.length?await q(sb.from('conversation_members').select('conversation_id,user_id,last_read_at').in('conversation_id',ids)):[];
 const mm={};mem.forEach(m=>{(mm[m.conversation_id]=mm[m.conversation_id]||[]).push(m);});
 S.convs=cms.map(c=>({...c.conversations,last_read_at:c.last_read_at,members:mm[c.conversations.id]||[],sum:sm.get(c.conversations.id)||{}}));
 S.unreadTotal=S.convs.reduce((a,c)=>a+Number(c.sum.unread||0),0);
}
async function loadTasks(){S.tasks=await q(sb.from('tasks').select('*,task_assignees(user_id)').order('created_at',{ascending:false}).limit(1000));}
async function loadNotifs(){S.notifs=await q(sb.from('notifications').select('*').eq('user_id',S.me.id).order('created_at',{ascending:false}).limit(40));}
const convTitle=c=>{if(c.kind==='dm'){const o=c.members.find(m=>m.user_id!==S.me.id);return o?P(o.user_id).full_name:'DM';}return (S.lang==='ar'&&c.name_ar)?c.name_ar:(c.name||'-');};
const convIcon=c=>c.kind==='dm'?null:(c.scope==='company'?'🏢':c.scope==='management'?'🏛️':c.kind==='channel'?'#':c.kind==='context'?'🔗':'👥');

/* ------------ START ------------ */
let rtStarted=false;
async function start(){
 const {data:{session}}=await sb.auth.getSession();if(!session)return renderAuth();
 await loadBase();S.me=S.profiles.get(session.user.id);
 if(!S.me){await new Promise(r=>setTimeout(r,800));await loadBase();S.me=S.profiles.get(session.user.id);}
 if(!S.me){await sb.auth.signOut();return renderAuth();}
 if(S.me.status==='suspended'||S.me.status==='terminated'){await sb.auth.signOut();toast(t('Account is disabled'));return renderAuth();}
 await Promise.all([loadConvs(),loadTasks(),loadNotifs()]);
 setLang(S.me.locale||S.lang);
 renderShell();if(!rtStarted){rtStarted=true;startRealtime();setInterval(()=>sb.rpc('touch_presence'),60000);}
 sb.rpc('touch_presence');
 route();
}

/* ------------ SHELL ------------ */
const NAV=[['dashboard','ico:layout-dashboard','Team Dashboard'],['chat','ico:message-square','Team Chat'],['transactions','ico:link','Transactions'],['tasks/my','ico:square-check-big','My Tasks'],['tasks/team','ico:list-checks','Team Tasks'],['activity','ico:clock','Activity Timeline'],['directory','ico:users','Employee Directory'],['feed','ico:newspaper','Management Feed'],['reports','ico:file-text','Reports & Reviews'],['approvals','ico:shield-check','Approvals Center'],['standup','ico:calendar-check','Daily Standup'],['handover','ico:repeat','Work Handover'],['announce','ico:megaphone','Announcements'],['analytics','ico:chart-column','Performance Analytics'],['ai','ico:bot','AI Team Assistant']];
function renderShell(){
 const root=$('#app');root.innerHTML='';
 const side=h('aside',{class:'side',id:'side'},
  h('div',{class:'brand'},h('img',{src:'assets/logo.png',alt:''}),h('div',{},h('b',{},'AgriTrade ',h('i',{style:{color:'var(--gold)',fontStyle:'normal'}},'Pro')))),
  h('div',{class:'navlabel'},'TEAM WORKSPACE'),
  NAV.map(n=>h('button',{class:'nav'+(n[3]?' dis':''),'data-r':n[0],onclick:()=>{if(n[3]){toast(t('Coming in the next stage'));return;}location.hash='#/'+n[0];$('#side').classList.remove('open');}},h('span',{class:'i'},n[1].startsWith('ico:')?ico(n[1].slice(4),20):n[1]),t(n[2]),n[3]?h('span',{class:'soon'},t('Soon')):(n[0]==='chat'?h('span',{class:'bdg hidden',id:'chatBdg'}):null))),
  h('div',{class:'credits'},L('الصور: Unsplash (ترخيص Unsplash). الأيقونات: Lucide.','Photos: Unsplash (Unsplash License). Icons: Lucide (ISC).')),h('div',{class:'me-card'},avatar(S.me,'md'),h('div',{style:{minWidth:0}},h('div',{class:'b',style:{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},S.me.full_name),h('div',{class:'sm mut'},roleName(S.me.role))),
   h('button',{class:'iconbtn',style:{marginInlineStart:'auto'},title:t('Profile'),onclick:profileModal},ico('settings',18))));
 const srch=h('input',{placeholder:t('Search messages, tasks, people...'),oninput:e=>globalSearch(e.target.value)});
 const top=h('div',{class:'top'},h('button',{class:'iconbtn menubtn',onclick:()=>$('#side').classList.toggle('open')},ico('menu',22)),h('h1',{id:'pageTitle'}),
  h('div',{class:'search'},srch,h('div',{id:'sres',class:'sres hidden'})),
  h('button',{class:'btn ghost sm',onclick:()=>{setLang(S.lang==='ar'?'en':'ar');sb.from('profiles').update({locale:S.lang}).eq('id',S.me.id).then(()=>{});renderShell();route();}},S.lang==='ar'?'EN':'ع'),
  h('button',{class:'iconbtn',title:L('إشعارات الهاتف','Phone notifications'),onclick:pushModal},ico('smartphone',19)),h('button',{class:'iconbtn',id:'bell',onclick:toggleNotifs},ico('bell',19),h('span',{class:'n hidden',id:'bellN'})),
  h('button',{class:'btn ghost sm signout',title:t('Sign out'),onclick:async()=>{await sb.auth.signOut();location.reload();}},ico('log-out',16),h('span',{},' '+t('Sign out'))));
 root.append(h('div',{class:'shell'},side,h('div',{class:'main'},top,h('div',{id:'banner'}),h('div',{class:'content',id:'view'}))));
 updateBadges();
}
function updateBadges(){
 const b=$('#chatBdg');if(b){b.textContent=S.unreadTotal;b.classList.toggle('hidden',!S.unreadTotal);}
 const n=S.notifs.filter(x=>!x.read).length;const bn=$('#bellN');if(bn){bn.textContent=n;bn.classList.toggle('hidden',!n);}
 document.title=(S.unreadTotal+n?`(${S.unreadTotal+n}) `:'')+'AgriTrade Pro | Team Workspace';
}
function toggleNotifs(){
 const ex=$('.notif-pan');if(ex){ex.remove();return;}
 const pan=h('div',{class:'notif-pan'},h('div',{class:'row',style:{padding:'12px 14px',borderBottom:'1px solid var(--line)'}},h('b',{},t('Notifications')),h('span',{class:'sp'}),h('button',{class:'btn ghost sm',onclick:async()=>{await sb.from('notifications').update({read:true}).eq('user_id',S.me.id).eq('read',false);S.notifs.forEach(n=>n.read=true);updateBadges();pan.remove();}},t('Mark all read'))),
  S.notifs.length?S.notifs.map(n=>h('div',{class:'it'+(n.read?'':' un'),onclick:async()=>{pan.remove();if(!n.read){n.read=true;sb.from('notifications').update({read:true}).eq('id',n.id).then(()=>{});updateBadges();}go(n.link);}},h('div',{class:'b'},n.title),n.body?h('div',{class:'sm mut'},n.body):null,h('div',{class:'sm mut'},ago(n.created_at)))):h('div',{class:'empty'},t('No notifications')));
 $('.main').append(pan);
}
function go(link){if(!link)return;const [k,id]=link.split(':');if(k==='chat'){location.hash='#/chat/'+id;}else if(k==='apr'){location.hash='#/approvals';}else if(k==='tx'){location.hash='#/tx/'+id;}else if(k==='feed'){location.hash='#/feed';}else if(k==='announce'){location.hash='#/announce';}else if(k==='handover'){location.hash='#/handover';}else if(k==='task'){location.hash='#/tasks/my';setTimeout(()=>openTask(id),200);}}

/* ------------ ROUTER ------------ */
window.addEventListener('hashchange',()=>{if(S.me)route();});

const BAN={dashboard:['port','لمحة عن عمل الفريق اليوم','Your team at a glance today'],transactions:['ship','عمليات الاستيراد والتصدير وسير العمل','Import and export operations, tracked end to end'],tasks:['wheat','وزّع المهام وتابع الإنجاز','Assign work and track what gets done'],activity:['corn','سجل منظم لكل ما حدث','A clear record of what happened and who did it'],directory:['silo','فريق الشركة والإدارات','Your company team and departments'],feed:['port','ما يهم الإدارة الآن','What management needs to know now'],reports:['wheat','تقارير الإنجاز والمراجعة','Progress reports and reviews'],approvals:['ship','موافقات متعددة المستويات','Multi-level approvals with a full history'],standup:['corn','تحديث يومي سريع','A quick daily update'],handover:['ship','تسليم العمل بين الورديات','Hand work over between shifts'],announce:['silo','إعلانات وتعليمات الشركة','Company announcements and instructions'],analytics:['wheat','أداء الفريق بالأرقام','Team performance in numbers'],ai:['port','مساعد ذكي من بيانات مساحة العمل','An assistant that reads your workspace data'],tx:['ship','تفاصيل العملية ومحادثتها','Operation details and its conversation']};
function renderBanner(a){const bn=$('#banner');if(!bn)return;bn.innerHTML='';const d=BAN[a];if(!d||a==='chat'){bn.className='';return;}bn.className='banner';bn.style.backgroundImage=`linear-gradient(90deg,rgba(14,48,110,.78),rgba(14,48,110,.25)),url(assets/img/${d[0]}.jpg)`;bn.append(h('div',{class:'bn-t'},h('b',{},$('#pageTitle')?$('#pageTitle').textContent:''),h('span',{},S.lang==='ar'?d[1]:d[2])));}
function route(){
 const hash=location.hash.replace(/^#\//,'')||'dashboard';S.route=hash;
 const [a,b]=hash.split('/');if(a==='open'){location.hash='#/dashboard';setTimeout(()=>go(decodeURIComponent(b||'')),300);return;}
 document.querySelectorAll('.nav[data-r]').forEach(n=>n.classList.toggle('on',n.dataset.r===(a==='tasks'?'tasks/'+(b||'my'):(a==='tx'?'transactions':a))));
 const v=$('#view');v.className='content';v.innerHTML='';
 const title=NAV.find(n=>n[0]===(a==='tasks'?'tasks/'+(b||'my'):(a==='tx'?'transactions':a)));$('#pageTitle').textContent=title?t(title[2]):'';renderBanner(a);
 try{
  if(a==='dashboard')viewDashboard(v).then(()=>dashCharts(v).catch(e=>console.warn('charts',e))).catch(err);else if(a==='chat'){v.className='content flush';viewChat(v,b).catch(err);}
  else if(a==='transactions')viewTransactions(v).catch(err);else if(a==='tx'){viewTx(v,b,S.txTab||'chat').catch(err);}else if(a==='approvals'){const _ap=S.pre&&S.pre.apr;S.pre=null;viewApprovals(v,_ap&&(isMgr()||S.me.role==='auditor')?'all':undefined).catch(err);}else if(a==='tasks')viewTasks(v,b||'my');else if(a==='activity')viewActivity(v).catch(err);else if(a==='directory')viewDirectory(v);else if(a==='ai')viewAI(v).catch(err);else if(a==='feed')viewFeed(v).catch(err);else if(a==='announce')viewAnnounce(v).catch(err);else if(a==='standup')viewStandup(v).catch(err);else if(a==='handover')viewHandover(v).catch(err);else if(a==='reports')viewReports(v).catch(err);else if(a==='analytics')viewAnalytics(v).catch(err);
  else viewDashboard(v).catch(err);
 }catch(e){err(e);}
}

/* ------------ DASHBOARD ------------ */
async function viewDashboard(v){
 const tasks=S.tasks.filter(x=>!x.parent_id);
 const today=todayStr();
 const kp=(cls,ic,n,l)=>h('div',{class:'card kpi '+cls},h('div',{class:'ic'},ic),h('b',{},n),h('span',{},t(l)));
 const active=[...S.profiles.values()].filter(p=>p.status==='active').length;
 const created=tasks.filter(x=>x.created_at.slice(0,10)===today).length;
 const done=tasks.filter(x=>x.status==='completed'&&x.completed_at&&x.completed_at.slice(0,10)===today).length;
 const overdue=tasks.filter(x=>x.due_date&&x.due_date<today&&!['completed','rejected'].includes(x.status)).length;
 const pending=tasks.filter(x=>x.status==='pending_review').length;
 const blocked=tasks.filter(x=>x.status==='blocked').length;
 const mine=tasks.filter(x=>x.task_assignees.some(a=>a.user_id===S.me.id)&&!['completed','rejected'].includes(x.status)).slice(0,6);
 const acts=await q(sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(8));
 // 7-day completion chart
 const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5);return d.toISOString().slice(0,10);});
 const cnt=days.map(d=>tasks.filter(x=>x.completed_at&&x.completed_at.slice(0,10)===d).length);const mx=Math.max(1,...cnt);
 const chart=h('div',{class:'row',style:{alignItems:'flex-end',height:'110px',gap:'10px'}},days.map((d,i)=>h('div',{style:{flex:1,textAlign:'center'}},h('div',{class:'sm b'},cnt[i]),h('div',{style:{height:Math.max(4,cnt[i]/mx*70)+'px',background:'linear-gradient(180deg,#3b82f6,#1d63d8)',borderRadius:'8px 8px 3px 3px'}}),h('div',{class:'sm mut'},new Date(d).toLocaleDateString(loc(),{weekday:'short'})))));
 const recentConvs=[...S.convs].sort((a,b)=>new Date(b.sum.last_at||0)-new Date(a.sum.last_at||0)).slice(0,5);
 v.append(
  h('div',{class:'row',style:{marginBottom:'16px'}},h('div',{},h('h2',{style:{margin:0,color:'var(--navy)'}},(S.lang==='ar'?'أهلاً، ':'Welcome, ')+S.me.full_name.split(' ')[0]),h('div',{class:'mut'},new Date().toLocaleDateString(loc(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' • '+roleName(S.me.role)))),
  h('div',{class:'grid g4'},kp('k-blue','👥',active,'Active Employees'),kp('k-green','✔️',done,'Tasks Completed Today'),kp('k-orange','⏰',overdue,'Overdue Tasks'),kp('k-purple','✉️',S.unreadTotal,'Unread Messages')),
  h('div',{class:'grid g4',style:{marginTop:'16px'}},kp('k-blue','📝',created,'Tasks Created Today'),kp('k-purple','🛡️',pending,'Pending Review'),kp('k-red','⛔',blocked,'Blocked'),kp('k-green','📋',tasks.filter(x=>!['completed','rejected'].includes(x.status)).length,'Open Tasks')),
  h('div',{class:'grid g2',style:{marginTop:'16px'}},
   h('div',{class:'col',style:{gap:'16px'}},
    h('div',{class:'card'},h('h3',{},'🕒 '+t('Recent Activity')),acts.length?h('div',{class:'list'},acts.map(a=>h('div',{class:'li'},avatar(P(a.actor_id),'sm',false),h('div',{class:'sp'},h('div',{},h('b',{},a.actor_name||'System'),' ',actTxt(a.action)),h('div',{class:'sm mut'},[a.module,a.ref].filter(Boolean).join(' • '))),h('span',{class:'sm mut'},ago(a.created_at))))):h('div',{class:'empty'},t('No activity yet'))),
    h('div',{class:'card'},h('h3',{},'📈 '+t('Tasks completed (last 7 days)')),chart)),
   h('div',{class:'col',style:{gap:'16px'}},
    h('div',{class:'card'},h('h3',{},'✅ '+t('My open tasks'),h('span',{class:'sp'}),h('button',{class:'btn sm',onclick:()=>newTaskModal()},'+ '+t('New Task'))),mine.length?mine.map(tk=>taskCard(tk)):h('div',{class:'empty'},t('No open tasks'))),
    h('div',{class:'card'},h('h3',{},'💬 '+t('Recent conversations')),recentConvs.length?h('div',{class:'list'},recentConvs.map(c=>h('div',{class:'li',style:{cursor:'pointer'},onclick:()=>location.hash='#/chat/'+c.id},convIcon(c)?h('div',{class:'chicon'},convIcon(c)):avatar(P((c.members.find(m=>m.user_id!==S.me.id)||{}).user_id),'',true),h('div',{class:'sp',style:{minWidth:0}},h('b',{},convTitle(c)),h('div',{class:'sm mut',style:{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},c.sum.last_body||'')),Number(c.sum.unread)?h('span',{class:'bdg',style:{background:'var(--blue)',color:'#fff',borderRadius:'10px',padding:'1px 7px',fontSize:'11px'}},c.sum.unread):null))):h('div',{class:'empty'},t('No conversations yet'))))));
}

/* ------------ CHAT ------------ */
const EMOJI=['👍','❤️','😂','🎉','🙏','✅','👀','🔥','😮','😢','👏','💯','📌','⚠️','🚢','🌾'];
async function viewChat(v,convId){
 await loadConvs();updateBadges();
 const wrap=h('div',{class:'chat'+(convId?' in-conv':'')});v.append(wrap);S.chatWrap=wrap;
 const list=h('div',{class:'chat-list'}),main=h('div',{class:'chat-main'});wrap.append(list,main);
 let filter='';
 function renderList(){
  list.innerHTML='';
  const fi=h('input',{class:'inp',placeholder:t('Search conversations'),value:filter,oninput:e=>{filter=e.target.value;renderList();setTimeout(()=>{const i=list.querySelector('input');i.focus();i.setSelectionRange(filter.length,filter.length);},0);}});
  list.append(h('div',{class:'hd'},h('div',{class:'row',style:{marginBottom:'8px'}},h('b',{style:{fontSize:'16px'}},t('Chats')),h('span',{class:'sp'}),h('button',{class:'btn sm',onclick:newChatModal},'+ '+t('New'))),fi));
  const sec=(label,items)=>{items=items.filter(c=>!filter||convTitle(c).toLowerCase().includes(filter.toLowerCase()));if(!items.length)return;list.append(h('div',{class:'cl-sec'},label));items.forEach(c=>list.append(item(c)));};
  const byLast=(a,b)=>new Date(b.sum.last_at||b.created_at)-new Date(a.sum.last_at||a.created_at);
  sec(t('CHANNELS'),S.convs.filter(c=>c.kind==='channel').sort((a,b)=>(a.scope?0:1)-(b.scope?0:1)||byLast(a,b)));
  sec(t('GROUPS & PROJECTS'),S.convs.filter(c=>c.kind==='group'||c.kind==='context').sort(byLast));
  sec(t('DIRECT MESSAGES'),S.convs.filter(c=>c.kind==='dm').sort(byLast));
 }
 function item(c){
  const o=c.kind==='dm'?c.members.find(m=>m.user_id!==S.me.id):null;const u=Number(c.sum.unread||0);
  return h('button',{class:'cl-item'+(S.openConv&&S.openConv.id===c.id?' on':''),'data-c':c.id,onclick:()=>{location.hash='#/chat/'+c.id;}},
   o?avatar(P(o.user_id),'',true):h('div',{class:'chicon'},convIcon(c)),
   h('div',{class:'t'},h('b',{},convTitle(c)),h('span',{},c.sum.last_body?((c.sum.last_sender===S.me.id?t('You')+': ':(c.kind!=='dm'&&c.sum.last_sender?P(c.sum.last_sender).full_name.split(' ')[0]+': ':''))+c.sum.last_body):t('No messages yet'))),
   h('div',{class:'col',style:{alignItems:'flex-end',gap:'3px'}},c.sum.last_at?h('span',{class:'sm mut'},fmtTime(c.sum.last_at)):null,u?h('span',{class:'ub'},u>99?'99+':u):null));
 }
 S.renderChatList=renderList;renderList();
 if(!convId){main.append(h('div',{class:'empty',style:{margin:'auto'}},h('div',{style:{fontSize:'48px'}},'💬'),h('h3',{},t('Select a conversation')),h('div',{},t('Pick a channel or a colleague from the list to start chatting.'))));S.openConv=null;return;}
 const conv=S.convs.find(c=>c.id===convId);
 if(!conv){main.append(h('div',{class:'empty',style:{margin:'auto'}},t('Conversation not found or no access.')));return;}
 S.openConv=conv;renderList();
 await openConversation(main,conv);
}
async function openConversation(main,conv){
 main.innerHTML='';
 const rows=await q(sb.from('messages').select('*,message_reactions(user_id,emoji)').eq('conversation_id',conv.id).order('created_at',{ascending:false}).limit(150));
 S.msgs=rows.reverse();
 const o=conv.kind==='dm'?conv.members.find(m=>m.user_id!==S.me.id):null;
 const back=h('button',{class:'iconbtn menubtn',style:{display:'none'},onclick:()=>{location.hash='#/chat';}},S.lang==='ar'?'→':'←');
 const sub=conv.kind==='dm'?h('span',{class:'sm mut',id:'hdSub'},S.online.has(o.user_id)?t('Online'):t('Last active')+' '+ago(P(o.user_id).last_active)):h('span',{class:'sm mut'},conv.members.length+' '+t('members'));
 const hd=h('div',{class:'chat-hd'},back,o?avatar(P(o.user_id),'md',true):h('div',{class:'chicon'},convIcon(conv)),h('div',{style:{minWidth:0}},h('b',{style:{fontSize:'16px'}},convTitle(conv)),h('div',{},sub)),h('span',{class:'sp'}),
  h('button',{class:'iconbtn',title:t('Search in conversation'),onclick:()=>searchInConv(conv)},'🔍'),
  conv.kind==='group'||conv.kind==='context'?h('button',{class:'iconbtn',title:t('Members'),onclick:()=>membersModal(conv)},'👥'):(conv.kind==='channel'?h('button',{class:'iconbtn',title:t('Members'),onclick:()=>membersModal(conv)},'👥'):null));
 const pinbar=h('div',{class:'pinbar hidden',id:'pinbar'});
 const box=h('div',{class:'msgs',id:'msgBox'});
 const typing=h('div',{class:'typing',id:'typingBar'});
 main.append(hd,pinbar,box,typing,composer(conv));
 renderMsgs();await sb.rpc('mark_read',{p_conv:conv.id});conv.sum.unread=0;S.unreadTotal=S.convs.reduce((a,c)=>a+Number(c.sum.unread||0),0);updateBadges();S.renderChatList&&S.renderChatList();
}
function mentionHTML(body,mentions){let out=esc(body);const names=(mentions||[]).map(id=>P(id).full_name).filter(Boolean);names.forEach(n=>{const e=esc('@'+n);out=out.split(e).join('<span class="mention">'+e+'</span>');});return out;}
async function signed(path){if(S.sigCache[path]&&S.sigCache[path].exp>Date.now())return S.sigCache[path].url;const {data}=await sb.storage.from('attachments').createSignedUrl(path,3600);if(data){S.sigCache[path]={url:data.signedUrl,exp:Date.now()+3300000};return data.signedUrl;}return '';}
function attachNode(a){
 const isImg=/^image\//.test(a.type||'');const isAud=/^audio\//.test(a.type||'');
 if(isImg){const im=h('img',{class:'imgPrev',alt:a.name});signed(a.path).then(u=>{im.src=u;im.onclick=()=>window.open(u,'_blank');});return im;}
 if(isAud){const au=h('audio',{controls:true,preload:'none'});signed(a.path).then(u=>au.src=u);return h('div',{class:'voice'},'🎤',au);}
 const ic=/pdf/i.test(a.type||a.name)?'📕':/sheet|excel|csv|xls/i.test(a.type||a.name)?'📗':/word|doc/i.test(a.type||a.name)?'📘':'📎';
 const lk=h('a',{class:'fileCard',target:'_blank',rel:'noopener'},h('span',{class:'fi'},ic),h('div',{},h('div',{class:'b'},a.name),h('div',{class:'sm mut'},a.size?(a.size/1024).toFixed(0)+' KB':'')));
 signed(a.path).then(u=>lk.href=u);return lk;}
function readByCount(m){const c=S.openConv;if(!c)return 0;return c.members.filter(x=>x.user_id!==S.me.id&&new Date(x.last_read_at)>=new Date(m.created_at)).length;}
function msgNode(m,prev){
 if(m.kind==='event')return sysMsg(m);
 const mine=m.sender_id===S.me.id;const conv=S.openConv;const s=P(m.sender_id);
 const rep=m.reply_to?S.msgs.find(x=>x.id===m.reply_to):null;
 const rc={};(m.message_reactions||[]).forEach(r=>{(rc[r.emoji]=rc[r.emoji]||[]).push(r.user_id);});
 const bub=h('div',{class:'bub'+(m.pinned?' pin':''),id:'m-'+m.id});
 if(m.deleted_at){bub.append(h('div',{class:'tx mut'},'🚫 '+t('This message was deleted')));}
 else{
  if(!mine&&conv.kind!=='dm')bub.append(h('div',{class:'nm'},s.full_name));
  if(rep)bub.append(h('div',{class:'rep',onclick:()=>{const e=document.getElementById('m-'+rep.id);if(e){e.scrollIntoView({block:'center'});e.style.outline='2px solid var(--blue2)';setTimeout(()=>e.style.outline='',1200);}}},h('b',{},P(rep.sender_id).full_name+': '),(rep.deleted_at?'…':rep.body||'📎').slice(0,80)));
  (m.attachments||[]).forEach(a=>bub.append(attachNode(a)));
  if(m.body)bub.append(h('div',{class:'tx',html:mentionHTML(m.body,m.mentions)}));
  const rdy=mine?(conv.kind==='dm'?(readByCount(m)?h('span',{style:{color:'var(--blue2)'},title:t('Seen')},'✓✓'):h('span',{},'✓')):(readByCount(m)?h('span',{style:{color:'var(--blue2)'},title:t('Seen by')+' '+readByCount(m)},'✓✓ '+readByCount(m)):h('span',{},'✓'))):null;
  bub.append(h('div',{class:'meta'},m.pinned?'📌':null,m.edited_at?h('a',{href:'#',onclick:e=>{e.preventDefault();editHistory(m);}},t('edited')):null,h('span',{title:new Date(m.created_at).toISOString().replace('T',' ').slice(0,19)+' UTC'},fmtTime(m.created_at)),rdy));
  if(Object.keys(rc).length)bub.append(h('div',{class:'reacts'},Object.entries(rc).map(([e,u])=>h('button',{class:u.includes(S.me.id)?'mine':'',title:u.map(x=>P(x).full_name).join(', '),onclick:()=>react(m,e)},e+' '+u.length))));
  const acts=h('div',{class:'acts'},h('button',{title:t('React'),onclick:ev=>emojiPicker(ev.currentTarget,e=>react(m,e))},'😊'),h('button',{title:t('Reply'),onclick:()=>setReply(m)},'↩️'),h('button',{title:t('Pin'),onclick:()=>sb.rpc('toggle_pin',{p_msg:m.id}).then(r=>r.error&&err(r.error))},'📌'),
   mine?h('button',{title:t('Edit'),onclick:()=>editMsg(m)},'✏️'):null,mine?h('button',{title:t('Delete'),onclick:()=>confirmBox(t('Delete this message?'),()=>sb.from('messages').update({deleted_at:new Date().toISOString()}).eq('id',m.id).then(r=>r.error&&err(r.error)))},'🗑️'):null);
  bub.append(acts);
 }
 return h('div',{class:'msg'+(mine?' mine':''),'data-mid':m.id},(!mine&&!m.deleted_at)?avatar(s,'sm',false):null,bub);
}
function renderMsgs(){
 const box=$('#msgBox');if(!box)return;const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;box.innerHTML='';
 let lastDay='';S.msgs.forEach((m,i)=>{const d=new Date(m.created_at).toDateString();if(d!==lastDay){lastDay=d;box.append(h('div',{class:'day'},fmtDay(m.created_at)));}box.append(msgNode(m,S.msgs[i-1]));});
 if(!S.msgs.length)box.append(h('div',{class:'empty',style:{margin:'auto'}},t('No messages yet. Say hello!')));
 const pins=S.msgs.filter(m=>m.pinned&&!m.deleted_at);const pb=$('#pinbar');
 if(pb){pb.classList.toggle('hidden',!pins.length);if(pins.length){const l=pins[pins.length-1];pb.innerHTML='';pb.append('📌 ',h('b',{},pins.length>1?pins.length+' '+t('pinned')+' • ':''),(l.body||'📎').slice(0,90));pb.onclick=()=>{const e=document.getElementById('m-'+l.id);e&&e.scrollIntoView({block:'center'});};}}
 if(atBottom||!S._scrolled){box.scrollTop=box.scrollHeight;S._scrolled=true;}
}
let replyTo=null,pendingFiles=[],pendingMentions=[];
function setReply(m){replyTo=m;const rb=$('#replybar');rb.classList.remove('hidden');rb.innerHTML='';rb.append(h('div',{class:'sp'},h('b',{},P(m.sender_id).full_name+': '),(m.body||'📎').slice(0,100)),h('button',{class:'iconbtn',style:{width:'26px',height:'26px'},onclick:clearReply},'✕'));$('#msgInput').focus();}
function clearReply(){replyTo=null;const rb=$('#replybar');if(rb){rb.classList.add('hidden');rb.innerHTML='';}}
function emojiPicker(anchor,cb){document.querySelectorAll('.pop.emo').forEach(x=>x.remove());const r=anchor.getBoundingClientRect();const p=h('div',{class:'pop emo',style:{position:'fixed',top:Math.max(10,r.top-110)+'px',insetInlineStart:'auto',left:Math.min(window.innerWidth-260,Math.max(8,r.left-100))+'px',minWidth:'240px'}},h('div',{class:'emojis'},EMOJI.map(e=>h('button',{onclick:()=>{p.remove();cb(e);}},e))));document.body.append(p);setTimeout(()=>document.addEventListener('click',function f(ev){if(!p.contains(ev.target)){p.remove();document.removeEventListener('click',f);}}),0);}
async function react(m,emoji){const mine=(m.message_reactions||[]).some(r=>r.user_id===S.me.id&&r.emoji===emoji);try{if(mine)await q(sb.from('message_reactions').delete().eq('message_id',m.id).eq('user_id',S.me.id).eq('emoji',emoji));else await q(sb.from('message_reactions').insert({message_id:m.id,user_id:S.me.id,emoji}));}catch(e){err(e);}}
function editMsg(m){const ta=h('textarea',{rows:4,class:'inp'});ta.value=m.body;const mo=modal([h('h2',{},t('Edit message')),ta,h('div',{class:'row',style:{marginTop:'12px'}},h('button',{class:'btn',onclick:async()=>{const v=ta.value.trim();if(!v)return;const r=await sb.from('messages').update({body:v}).eq('id',m.id);if(r.error)return err(r.error);mo.close();}},t('Save')),h('button',{class:'btn ghost',onclick:()=>mo.close()},t('Cancel'))),h('p',{class:'mut sm'},t('The previous version is kept in the edit history.'))]);}
async function editHistory(m){const rows=await q(sb.from('message_edits').select('*').eq('message_id',m.id).order('edited_at'));modal([h('h2',{},t('Edit history')),rows.map(r=>h('div',{class:'card',style:{marginBottom:'8px'}},h('div',{class:'sm mut'},fmtDT(r.edited_at)),h('div',{},r.old_body))),h('div',{class:'card',style:{background:'var(--blue-soft)'}},h('div',{class:'sm mut'},t('Current')),h('div',{},m.body))]);}
function composer(conv){
 const ta=h('textarea',{rows:1,id:'msgInput',placeholder:t('Type a message...'),oninput:onType,onkeydown:e=>{if(e.key==='Enter'&&!e.shiftKey&&!ta._pop){e.preventDefault();send(conv);}if(ta._pop&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();ta._pop.querySelector('button.on')?.click();}if(ta._pop&&e.key==='Escape'){closePop();}}});
 const fileIn=h('input',{type:'file',multiple:true,class:'hidden',onchange:e=>{[...e.target.files].forEach(f=>pendingFiles.push(f));e.target.value='';renderPending();}});
 const pend=h('div',{class:'chips',id:'pend',style:{marginBottom:'8px'}});
 const wrap=h('div',{class:'composer'},h('div',{id:'replybar',class:'replybar hidden'}),pend,
  h('div',{class:'box'},fileIn,h('button',{class:'iconbtn',title:t('Attach file'),onclick:()=>fileIn.click()},'📎'),h('button',{class:'iconbtn',title:t('Emoji'),onclick:e=>emojiPicker(e.currentTarget,em=>{ta.value+=em;ta.focus();})},'😊'),ta,
   h('button',{class:'iconbtn',id:'micBtn',title:t('Voice message'),onclick:()=>toggleRec(conv)},'🎤'),h('button',{class:'send',onclick:()=>send(conv)},S.lang==='ar'?'➤':'➤')));
 function closePop(){if(ta._pop){ta._pop.remove();ta._pop=null;}}
 function onType(){ta.style.height='auto';ta.style.height=Math.min(140,ta.scrollHeight)+'px';sendTyping(conv.id);
  const pos=ta.selectionStart;const m=/(^|\s)@([^\s@]{0,20})$/.exec(ta.value.slice(0,pos));closePop();
  if(m){const qs=m[2].toLowerCase();const cands=conv.members.map(x=>P(x.user_id)).filter(p=>p.id!==S.me.id&&p.full_name.toLowerCase().includes(qs)).slice(0,6);
   if(cands.length){const pop=h('div',{class:'pop'},cands.map((p,i)=>h('button',{class:i?'':'on',onmousedown:e=>{e.preventDefault();const before=ta.value.slice(0,pos).replace(/@([^\s@]*)$/,'@'+p.full_name+' ');ta.value=before+ta.value.slice(pos);pendingMentions.push(p.id);closePop();ta.focus();}},avatar(p,'sm',false),p.full_name)));wrap.append(pop);ta._pop=pop;}}}
 return wrap;
}
function renderPending(){const p=$('#pend');if(!p)return;p.innerHTML='';pendingFiles.forEach((f,i)=>p.append(h('span',{class:'chip'},'📎 '+f.name,h('a',{href:'#',onclick:e=>{e.preventDefault();pendingFiles.splice(i,1);renderPending();}},'✕'))));}
async function uploadFile(conv,f,nameOverride){
 const safe=(nameOverride||f.name).replace(/[^\w.\-]+/g,'_');const path=`${conv.id}/${crypto.randomUUID()}-${safe}`;
 const {error}=await sb.storage.from('attachments').upload(path,f,{contentType:f.type||'application/octet-stream'});if(error)throw error;
 return {path,name:nameOverride||f.name,size:f.size,type:f.type};}
let sending=false;
async function send(conv,extra){
 if(sending)return;const ta=$('#msgInput');const body=ta.value.trim();if(!body&&!pendingFiles.length&&!extra)return;sending=true;
 try{
  let atts=[];for(const f of pendingFiles)atts.push(await uploadFile(conv,f));if(extra)atts.push(extra);
  const names=pendingMentions.filter(id=>body.includes('@'+P(id).full_name));
  const kind=extra&&/^audio/.test(extra.type)?'voice':atts.length?'file':'text';
  const r=await sb.from('messages').insert({conversation_id:conv.id,sender_id:S.me.id,body,reply_to:replyTo?replyTo.id:null,attachments:atts,mentions:[...new Set(names)],kind});
  if(r.error)throw r.error;
  ta.value='';ta.style.height='auto';pendingFiles=[];pendingMentions=[];renderPending();clearReply();
 }catch(e){err(e);}sending=false;}
let rec=null;
async function toggleRec(conv){
 const b=$('#micBtn');
 if(rec){rec.mr.stop();return;}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const mr=new MediaRecorder(st);const chunks=[];rec={mr};b.innerHTML='';b.append(h('span',{class:'recdot'}));
  mr.ondataavailable=e=>chunks.push(e.data);
  mr.onstop=async()=>{st.getTracks().forEach(t=>t.stop());b.textContent='🎤';rec=null;const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'});try{const a=await uploadFile(conv,blob,'voice-'+Date.now()+'.webm');a.type=blob.type;await send(conv,a);}catch(e){err(e);}};
  mr.start();}catch(e){toast(t('Microphone not available'));}}
let typingCh=null,lastTypingSent=0;
function sendTyping(cid){if(!typingCh||Date.now()-lastTypingSent<2000)return;lastTypingSent=Date.now();typingCh.send({type:'broadcast',event:'typing',payload:{c:cid,u:S.me.id}});}
function showTyping(){const bar=$('#typingBar');if(!bar||!S.openConv)return;const now=Date.now();const who=Object.entries(S.typing).filter(([k,v])=>k.startsWith(S.openConv.id+':')&&now-v<3500).map(([k])=>P(k.split(':')[1]).full_name.split(' ')[0]);bar.textContent=who.length?who.join(', ')+' '+t('is typing...'):'';}
setInterval(showTyping,1000);
function newChatModal(){
 const sel=new Set();const nm=h('input',{class:'inp',placeholder:t('Group name')});const priv=h('input',{type:'checkbox'});
 const people=[...S.profiles.values()].filter(p=>p.id!==S.me.id&&p.status==='active');
 const lst=h('div',{class:'list',style:{maxHeight:'300px',overflow:'auto'}},people.map(p=>h('div',{class:'li',style:{cursor:'pointer'},onclick:async e=>{if(e.target.type==='checkbox')return;if(!isGroup()){const id=await q(sb.rpc('get_or_create_dm',{other:p.id}));m.close();await loadConvs();location.hash='#/chat/'+id;}}},avatar(p,'',false),h('div',{class:'sp'},h('b',{},p.full_name),h('div',{class:'sm mut'},[p.job_title,deptName(p.department_id)].filter(x=>x&&x!=='-').join(' • '))),h('input',{type:'checkbox',class:'gchk hidden',onchange:e=>{e.target.checked?sel.add(p.id):sel.delete(p.id);}}))));
 let grp=false;const isGroup=()=>grp;
 const tabs=h('div',{class:'tabs2'},h('button',{class:'on',onclick:e=>{grp=false;set(e)}},t('Direct message')),h('button',{onclick:e=>{grp=true;set(e)}},t('New group')));
 const gbox=h('div',{class:'hidden'},h('label',{class:'field'},h('span',{},t('Group name')),nm));
 function set(e){[...tabs.children].forEach(b=>b.classList.remove('on'));e.target.classList.add('on');gbox.classList.toggle('hidden',!grp);lst.querySelectorAll('.gchk').forEach(c=>c.classList.toggle('hidden',!grp));cr.classList.toggle('hidden',!grp);}
 const cr=h('button',{class:'btn hidden',onclick:async()=>{if(!nm.value.trim())return toast(t('Enter a group name'));if(!sel.size)return toast(t('Pick at least one member'));try{const id=await q(sb.rpc('create_group',{p_name:nm.value.trim(),p_members:[...sel],p_private:false}));m.close();await loadConvs();location.hash='#/chat/'+id;}catch(e){err(e);}}},t('Create group'));
 const m=modal([h('h2',{},t('New conversation')),tabs,gbox,lst,h('div',{style:{marginTop:'12px'}},cr)]);
}
async function membersModal(conv){
 const canAdd=(conv.kind==='group'||conv.kind==='context')&&(conv.created_by===S.me.id||isTop());
 const m=modal([h('h2',{},convTitle(conv)),h('div',{class:'list'},conv.members.map(x=>{const p=P(x.user_id);return h('div',{class:'li'},avatar(p,'',true),h('div',{class:'sp'},h('b',{},p.full_name),h('div',{class:'sm mut'},[p.job_title,deptName(p.department_id)].filter(z=>z&&z!=='-').join(' • '))),pill(roleName(p.role)));})),
  canAdd?h('div',{class:'row',style:{marginTop:'12px'}},(()=>{const s=h('select',{class:'inp'},h('option',{value:''},t('Add member...')),[...S.profiles.values()].filter(p=>!conv.members.some(x=>x.user_id===p.id)).map(p=>h('option',{value:p.id},p.full_name)));s.onchange=async()=>{if(!s.value)return;try{await q(sb.rpc('add_group_member',{p_conv:conv.id,p_user:s.value}));m.close();await loadConvs();location.hash='#/chat/'+conv.id;route();}catch(e){err(e);}};return s;})()):null]);
}
async function searchInConv(conv){
 const inp=h('input',{class:'inp',placeholder:t('Search in conversation')});const out=h('div',{class:'list',style:{marginTop:'10px'}});
 inp.oninput=async()=>{const s=inp.value.trim();out.innerHTML='';if(s.length<2)return;const rows=await q(sb.from('messages').select('id,body,created_at,sender_id').eq('conversation_id',conv.id).is('deleted_at',null).ilike('body','%'+s.replace(/[%_]/g,'')+'%').order('created_at',{ascending:false}).limit(30));
  rows.forEach(r=>out.append(h('div',{class:'li',style:{cursor:'pointer'},onclick:()=>{m.close();const e=document.getElementById('m-'+r.id);if(e){e.scrollIntoView({block:'center'});e.style.outline='2px solid var(--blue2)';setTimeout(()=>e.style.outline='',1500);}else toast(t('Older message: scroll up'));}},h('div',{class:'sp'},h('b',{},P(r.sender_id).full_name),h('div',{},r.body.slice(0,120))),h('span',{class:'sm mut'},fmtDT(r.created_at)))));if(!rows.length)out.append(h('div',{class:'empty'},t('No results')));};
 const m=modal([h('h2',{},t('Search in conversation')),inp,out]);inp.focus();
}

/* ------------ GLOBAL SEARCH ------------ */
let gsT=null;
function globalSearch(s){clearTimeout(gsT);const box=$('#sres');s=s.trim();if(s.length<2){box.classList.add('hidden');return;}
 gsT=setTimeout(async()=>{
  const like='%'+s.replace(/[%_]/g,'')+'%';
  const people=[...S.profiles.values()].filter(p=>(p.full_name+' '+(p.email||'')+' '+(p.job_title||'')+' '+(p.employee_id||'')).toLowerCase().includes(s.toLowerCase())).slice(0,5);
  const tasks=S.tasks.filter(x=>(x.title+' '+(x.related_ref||'')+' '+x.code).toLowerCase().includes(s.toLowerCase())).slice(0,5);
  let msgs=[];try{msgs=await q(sb.from('messages').select('id,body,conversation_id,sender_id,created_at').is('deleted_at',null).ilike('body',like).order('created_at',{ascending:false}).limit(6));}catch(e){}
  box.innerHTML='';box.classList.remove('hidden');
  const hide=()=>box.classList.add('hidden');
  if(people.length){box.append(h('div',{class:'hdr'},t('People')));people.forEach(p=>box.append(h('div',{class:'it',onclick:()=>{hide();location.hash='#/directory';setTimeout(()=>profileView(p.id),150);}},avatar(p,'sm',false),h('div',{},h('b',{},p.full_name),h('div',{class:'sm mut'},p.job_title||'')))));}
  if(tasks.length){box.append(h('div',{class:'hdr'},t('Tasks')));tasks.forEach(x=>box.append(h('div',{class:'it',onclick:()=>{hide();location.hash='#/tasks/team';setTimeout(()=>openTask(x.id),200);}},'✅',h('div',{},h('b',{},x.title),h('div',{class:'sm mut'},x.code+(x.related_ref?' • '+x.related_ref:''))))));}
  if(msgs.length){box.append(h('div',{class:'hdr'},t('Messages')));msgs.forEach(x=>{const c=S.convs.find(c=>c.id===x.conversation_id);box.append(h('div',{class:'it',onclick:()=>{hide();location.hash='#/chat/'+x.conversation_id;}},'💬',h('div',{},h('b',{},c?convTitle(c):'…'),h('div',{class:'sm mut'},P(x.sender_id).full_name+': '+x.body.slice(0,80)))));});}
  if(!people.length&&!tasks.length&&!msgs.length)box.append(h('div',{class:'empty'},t('No results')));
 },250);}
document.addEventListener('click',e=>{const b=$('#sres');if(b&&!e.target.closest('.search'))b.classList.add('hidden');});

/* ------------ TASKS ------------ */
const stLabel=s=>t('st_'+s),prLabel=p=>t('pr_'+p);
function isOverdue(tk){return tk.due_date&&tk.due_date<todayStr()&&!['completed','rejected'].includes(tk.status);}
function assignStack(tk){return h('div',{class:'stack'},tk.task_assignees.slice(0,4).map(a=>avatar(P(a.user_id),'sm',false)),tk.task_assignees.length>4?h('div',{class:'av sm',style:{background:'#94a3b8'}},'+'+(tk.task_assignees.length-4)):null);}
function taskCard(tk){
 const subs=S.tasks.filter(x=>x.parent_id===tk.id);
 return h('div',{class:'tcard',onclick:()=>openTask(tk.id)},
  h('div',{class:'row',style:{marginBottom:'6px'}},pill(prLabel(tk.priority),'pr-'+tk.priority),h('span',{class:'sp'}),h('span',{class:'sm mut'},tk.code)),
  h('div',{class:'ti'},tk.title),
  tk.related_ref?h('div',{class:'sm mut'},'🔗 '+tk.related_ref):null,
  h('div',{class:'bar',style:{margin:'8px 0'}},h('i',{style:{width:tk.progress+'%'}})),
  h('div',{class:'row'},assignStack(tk),h('span',{class:'sp'}),subs.length?h('span',{class:'sm mut'},'☑ '+subs.filter(x=>x.status==='completed').length+'/'+subs.length):null,
   tk.due_date?h('span',{class:'sm '+(isOverdue(tk)?'overdue':'mut')},'📅 '+tk.due_date):null));
}
function viewTasks(v,which){
 const f={q:'',pri:'',dept:'',who:'',st:'',view:localStorage.getItem('tw_tv')||'board',...((S.pre&&S.pre.tasks)||{})};const _pt=S.pre&&S.pre.tasks;S.pre=null;
 const body=h('div');
 function draw(){
  body.innerHTML='';
  let rows=S.tasks.filter(x=>!x.parent_id);
  if(which==='my')rows=rows.filter(x=>x.task_assignees.some(a=>a.user_id===S.me.id)||(x.created_by===S.me.id&&!x.task_assignees.length));
  if(f.q)rows=rows.filter(x=>(x.title+x.code+(x.related_ref||'')).toLowerCase().includes(f.q.toLowerCase()));
  if(f.pri)rows=rows.filter(x=>x.priority===f.pri);if(f.dept)rows=rows.filter(x=>x.department_id===f.dept);
  if(f.who)rows=rows.filter(x=>x.task_assignees.some(a=>a.user_id===f.who));
  if(f.st==='overdue')rows=rows.filter(isOverdue);else if(f.st)rows=rows.filter(x=>x.status===f.st);
  if(!rows.length){body.append(h('div',{class:'card empty'},h('div',{style:{fontSize:'40px'}},'📋'),h('div',{},t('No tasks here yet.')),S.me.role!=='auditor'?h('button',{class:'btn',style:{marginTop:'12px'},onclick:()=>newTaskModal()},'+ '+t('New Task')):null));return;}
  if(f.view==='board'){
   const groups=[['not_started',['not_started']],['in_progress',['in_progress']],['pending_review',['pending_review','waiting_info','blocked']],['completed',['completed','rejected']]];
   body.append(h('div',{class:'board'},groups.map(([k,sts])=>{const items=rows.filter(x=>sts.includes(x.status));return h('div',{class:'col-b'},h('h4',{},pill(k==='pending_review'?t('Review / Waiting / Blocked'):k==='completed'?t('Done / Rejected'):stLabel(k),'p-'+k),h('span',{class:'mut'},items.length)),items.map(taskCard));})));
  }else{
   body.append(h('div',{class:'card',style:{padding:0,overflow:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse'}},h('thead',{},h('tr',{},['Code','Task','Assignees','Priority','Status','Due','Progress'].map(c=>h('th',{style:{textAlign:'start',padding:'12px',color:'var(--mut)',fontSize:'12px',borderBottom:'1px solid var(--line)'}},t(c))))),
    h('tbody',{},rows.map(tk=>h('tr',{style:{cursor:'pointer'},onclick:()=>openTask(tk.id)},h('td',{style:{padding:'12px'}},tk.code),h('td',{style:{padding:'12px'}},h('b',{},tk.title),tk.related_ref?h('div',{class:'sm mut'},tk.related_ref):null),h('td',{style:{padding:'12px'}},assignStack(tk)),h('td',{style:{padding:'12px'}},pill(prLabel(tk.priority),'pr-'+tk.priority)),h('td',{style:{padding:'12px'}},pill(stLabel(tk.status),'p-'+tk.status)),h('td',{style:{padding:'12px'},class:isOverdue(tk)?'overdue':''},tk.due_date||'-'),h('td',{style:{padding:'12px',minWidth:'110px'}},h('div',{class:'bar'},h('i',{style:{width:tk.progress+'%'}})))))))));
  }
 }
 S.redrawTasks=draw;
 const sel=(opts,key,ph)=>h('select',{onchange:e=>{f[key]=e.target.value;draw();}},h('option',{value:''},ph),opts);
 v.append(h('div',{class:'toolbar'},
  h('input',{placeholder:t('Filter tasks...'),oninput:e=>{f.q=e.target.value;draw();}}),
  sel(PRIOS.map(p=>h('option',{value:p},prLabel(p))),'pri',t('All priorities')),
  sel([h('option',{value:'overdue'},t('Overdue')),...STATUSES.map(s=>h('option',{value:s},stLabel(s)))],'st',t('All statuses')),
  which==='team'?sel(S.depts.map(d=>h('option',{value:d.id},deptName(d.id))),'dept',t('All departments')):null,
  which==='team'?sel([...S.profiles.values()].map(p=>h('option',{value:p.id},p.full_name)),'who',t('All employees')):null,
  h('span',{class:'sp'}),
  h('button',{class:'btn ghost sm',onclick:()=>{f.view=f.view==='board'?'list':'board';localStorage.setItem('tw_tv',f.view);draw();}},f.view==='board'?'☰ '+t('List'):'▦ '+t('Board')),
  S.me.role!=='auditor'?h('button',{class:'btn',onclick:()=>newTaskModal()},'+ '+t('New Task')):null),body);
 if(_pt){const ss=v.querySelectorAll('.toolbar select');const keys=which==='team'?['pri','st','dept','who']:['pri','st'];keys.forEach((k,i)=>{if(ss[i]&&f[k])ss[i].value=f[k];});}
 draw();
}
function personPicker(selected,onchange,exclude){
 const wrap=h('div',{class:'chips'});
 const people=[...S.profiles.values()].filter(p=>p.status==='active'&&(!exclude||!exclude.includes(p.id)));
 const canOthers=isMgr();
 people.filter(p=>canOthers||p.id===S.me.id).forEach(p=>{const c=h('span',{class:'chip'+(selected.has(p.id)?' on':''),style:{cursor:'pointer'},onclick:()=>{selected.has(p.id)?selected.delete(p.id):selected.add(p.id);c.classList.toggle('on');onchange&&onchange();}},p.full_name);wrap.append(c);});
 return wrap;
}
function newTaskModal(pre){
 pre=pre||{};const sel=new Set(pre.assignees||(isMgr()?[]:[S.me.id]));
 const title=h('input',{value:pre.title||''}),desc=h('textarea',{rows:3}),due=h('input',{type:'date'}),ref=h('input',{placeholder:'IMP-2026-105',value:pre.related_ref||''});
 desc.value=pre.description||'';
 const dept=h('select',{},h('option',{value:''},'-'),S.depts.map(d=>h('option',{value:d.id,selected:d.id===(pre.department_id||S.me.department_id)},deptName(d.id))));
 const pr=h('select',{},PRIOS.map(p=>h('option',{value:p,selected:p==='medium'},prLabel(p))));
 const wt=h('select',{},[1,2,3,5,8].map(w=>h('option',{value:w},w)));
 const m=modal([h('h2',{},t('New Task')),
  h('label',{class:'field'},h('span',{},t('Title')),title),
  h('div',{class:'f2'},h('label',{class:'field'},h('span',{},t('Priority')),pr),h('label',{class:'field'},h('span',{},t('Due date')),due)),
  h('div',{class:'f2'},h('label',{class:'field'},h('span',{},t('Department')),dept),h('label',{class:'field'},h('span',{},t('Related transaction / reference')),ref)),
  h('label',{class:'field'},h('span',{},t('Assigned to')),personPicker(sel)),
  h('div',{class:'f2'},h('label',{class:'field'},h('span',{},t('Weight (effort/complexity 1-8)')),wt),h('div')),
  h('label',{class:'field'},h('span',{},t('Description')),desc),
  h('div',{class:'row'},h('button',{class:'btn',onclick:async e=>{if(!title.value.trim())return toast(t('Enter a title'));e.target.disabled=true;try{
   const tk=(await q(sb.from('tasks').insert({title:title.value.trim(),description:desc.value,priority:pr.value,due_date:due.value||null,department_id:dept.value||null,related_ref:ref.value.trim()||null,created_by:S.me.id,weight:Number(wt.value),parent_id:pre.parent_id||null}).select().single()));
   const ids=[...sel];if(!ids.length&&!pre.parent_id)ids.push(S.me.id);
   if(ids.length)await q(sb.from('task_assignees').insert(ids.map(u=>({task_id:tk.id,user_id:u}))));
   m.close();await loadTasks();S.redrawTasks&&S.redrawTasks();toast(t('Task created'));if(pre.onDone)pre.onDone();else route();}catch(x){err(x);e.target.disabled=false;}}},t('Create task')),h('button',{class:'btn ghost',onclick:()=>m.close()},t('Cancel'))),
 ]);
}
async function openTask(id){
 document.querySelectorAll('.drawer').forEach(x=>x.remove());
 await loadTasks();const tk=S.tasks.find(x=>x.id===id);if(!tk)return toast(t('Task not found or no access'));
 const dr=h('div',{class:'drawer'});document.body.append(dr);
 const isAssignee=tk.task_assignees.some(a=>a.user_id===S.me.id);
 const canEdit=S.me.role!=='auditor'&&(isMgr()||isAssignee||tk.created_by===S.me.id);
 const canFinal=isMgr()||tk.created_by===S.me.id;
 const [cm,deps,hist]=await Promise.all([q(sb.from('task_comments').select('*').eq('task_id',id).order('created_at')),q(sb.from('task_dependencies').select('depends_on').eq('task_id',id)),q(sb.from('activity_log').select('*').eq('entity_id',id).order('created_at',{ascending:false}).limit(30))]);
 const subs=S.tasks.filter(x=>x.parent_id===id);
 const depTasks=deps.map(d=>S.tasks.find(x=>x.id===d.depends_on)).filter(Boolean);
 const blockedBy=depTasks.filter(d=>d.status!=='completed');
 const upd=async(patch)=>{try{await q(sb.from('tasks').update(patch).eq('id',id));await loadTasks();S.redrawTasks&&S.redrawTasks();openTask(id);}catch(e){err(e);}};
 const stSel=h('select',{class:'inp',disabled:!canEdit,onchange:e=>{const v=e.target.value;if(v==='completed'&&blockedBy.length){toast(t('Blocked by unfinished dependencies'));e.target.value=tk.status;return;}upd({status:v});}},STATUSES.filter(s=>canFinal||!['completed','rejected'].includes(s)||s===tk.status).map(s=>h('option',{value:s,selected:s===tk.status},stLabel(s))));
 const prog=h('input',{type:'range',min:0,max:100,step:5,value:tk.progress,disabled:!canEdit,style:{width:'100%'},onchange:e=>upd({progress:Number(e.target.value)})});
 const cin=h('textarea',{rows:2,class:'inp',placeholder:t('Write a comment...')});const cfile=h('input',{type:'file',class:'hidden'});let cfiles=[];
 cfile.onchange=()=>{cfiles=[...cfile.files];cbtn.textContent='📎 '+cfiles.length;};
 const cbtn=h('button',{class:'iconbtn',onclick:()=>cfile.click()},'📎');
 dr.append(
  h('div',{class:'row'},h('span',{class:'mut'},tk.code),h('span',{class:'sp'}),h('button',{class:'iconbtn',onclick:()=>dr.remove()},'✕')),
  h('h2',{style:{margin:'8px 0',color:'var(--navy)'}},tk.title),
  h('div',{class:'chips',style:{marginBottom:'12px'}},pill(prLabel(tk.priority),'pr-'+tk.priority),pill(stLabel(tk.status),'p-'+tk.status),tk.related_ref?pill('🔗 '+tk.related_ref):null,tk.department_id?pill(deptName(tk.department_id)):null,isOverdue(tk)?pill(t('Overdue'),'pr-urgent'):null,tk.reopen_count?pill('↻ '+tk.reopen_count+' '+t('reopened')):null),
  blockedBy.length?h('div',{class:'card',style:{background:'#fff1e0',marginBottom:'12px'}},'⛔ '+t('Waiting for:')+' '+blockedBy.map(b=>b.code+' '+b.title).join(', ')):null,
  h('div',{class:'f2'},h('label',{class:'field'},h('span',{},t('Status')),stSel),h('label',{class:'field'},h('span',{},t('Due date')),h('input',{type:'date',value:tk.due_date||'',disabled:!canEdit,onchange:e=>upd({due_date:e.target.value||null})}))),
  h('label',{class:'field'},h('span',{},t('Progress')+' '+tk.progress+'%'),prog),
  h('div',{class:'field'},h('span',{},t('Assigned to')),h('div',{class:'chips'},tk.task_assignees.map(a=>h('span',{class:'chip'},avatar(P(a.user_id),'sm',false),P(a.user_id).full_name,isMgr()&&canEdit?h('a',{href:'#',onclick:async e=>{e.preventDefault();await q(sb.from('task_assignees').delete().eq('task_id',id).eq('user_id',a.user_id));await loadTasks();openTask(id);}},'✕'):null)),
   isMgr()&&canEdit?(()=>{const s=h('select',{class:'inp',style:{width:'auto'}},h('option',{value:''},'+ '+t('Add')),[...S.profiles.values()].filter(p=>p.status==='active'&&!tk.task_assignees.some(a=>a.user_id===p.id)).map(p=>h('option',{value:p.id},p.full_name)));s.onchange=async()=>{if(!s.value)return;try{await q(sb.from('task_assignees').insert({task_id:id,user_id:s.value}));await loadTasks();openTask(id);}catch(e){err(e);}};return s;})():null)),
  tk.description?h('div',{class:'card',style:{background:'#f6faff',whiteSpace:'pre-wrap',marginBottom:'12px'}},tk.description):null,
  canEdit&&tk.status!=='pending_review'&&tk.status!=='completed'?h('div',{class:'row',style:{marginBottom:'12px'}},h('button',{class:'btn',onclick:()=>upd({status:'pending_review'})},'📤 '+t('Submit for review'))):null,
  canFinal&&tk.status==='pending_review'?h('div',{class:'row',style:{marginBottom:'12px'}},h('button',{class:'btn',style:{background:'var(--green)'},onclick:()=>upd({status:'completed'})},'✔ '+t('Approve & complete')),h('button',{class:'btn danger',onclick:()=>upd({status:'rejected'})},'✖ '+t('Reject')),h('button',{class:'btn ghost',onclick:()=>upd({status:'in_progress'})},'↩ '+t('Send back'))):null,
  canFinal&&['completed','rejected'].includes(tk.status)?h('div',{style:{marginBottom:'12px'}},h('button',{class:'btn ghost',onclick:()=>upd({status:'in_progress'})},'↻ '+t('Reopen task'))):null,
  h('h3',{},'☑ '+t('Subtasks')),
  h('div',{class:'list'},subs.map(s=>h('div',{class:'li'},h('input',{type:'checkbox',checked:s.status==='completed',disabled:!canEdit,onchange:async e=>{try{await q(sb.from('tasks').update({status:e.target.checked?'completed':'in_progress'}).eq('id',s.id));await loadTasks();const done=S.tasks.filter(x=>x.parent_id===id&&x.status==='completed').length;const all=S.tasks.filter(x=>x.parent_id===id).length;await q(sb.from('tasks').update({progress:Math.round(done/all*100)}).eq('id',id));await loadTasks();openTask(id);}catch(x){err(x);}}}),h('span',{class:'sp',style:{textDecoration:s.status==='completed'?'line-through':'none'}},s.title)))),
  canEdit?(()=>{const i=h('input',{class:'inp',placeholder:'+ '+t('Add subtask'),onkeydown:async e=>{if(e.key==='Enter'&&i.value.trim()){try{const st=await q(sb.from('tasks').insert({title:i.value.trim(),created_by:S.me.id,parent_id:id,department_id:tk.department_id,related_ref:tk.related_ref,status:'not_started'}).select().single());await q(sb.from('task_assignees').insert(tk.task_assignees.map(a=>({task_id:st.id,user_id:a.user_id}))));await loadTasks();openTask(id);}catch(x){err(x);}}}});return i;})():null,
  h('h3',{style:{marginTop:'16px'}},'⛓ '+t('Dependencies')),
  h('div',{class:'chips'},depTasks.map(d=>h('span',{class:'chip'},d.code+' '+d.title,pill(stLabel(d.status),'p-'+d.status),canEdit?h('a',{href:'#',onclick:async e=>{e.preventDefault();await q(sb.from('task_dependencies').delete().eq('task_id',id).eq('depends_on',d.id));openTask(id);}},'✕'):null)),
   canEdit?(()=>{const s=h('select',{class:'inp',style:{width:'auto'}},h('option',{value:''},'+ '+t('Depends on...')),S.tasks.filter(x=>!x.parent_id&&x.id!==id&&!depTasks.some(d=>d.id===x.id)).slice(0,100).map(x=>h('option',{value:x.id},x.code+' '+x.title)));s.onchange=async()=>{if(!s.value)return;try{await q(sb.from('task_dependencies').insert({task_id:id,depends_on:s.value}));openTask(id);}catch(e){err(e);}};return s;})():null),
  h('h3',{style:{marginTop:'16px'}},'💬 '+t('Comments & attachments')),
  h('div',{class:'col'},cm.map(c=>h('div',{class:'card',style:{padding:'10px 12px',background:'#f6faff'}},h('div',{class:'row'},avatar(P(c.author_id),'sm',false),h('b',{},P(c.author_id).full_name),h('span',{class:'sp'}),h('span',{class:'sm mut'},fmtDT(c.created_at))),h('div',{style:{whiteSpace:'pre-wrap',margin:'6px 0'}},c.body),(c.attachments||[]).map(attachNode)))),
  S.me.role!=='auditor'?h('div',{class:'row',style:{marginTop:'8px',alignItems:'flex-end'}},cin,cfile,cbtn,h('button',{class:'btn',onclick:async()=>{if(!cin.value.trim()&&!cfiles.length)return;try{const atts=[];for(const f of cfiles)atts.push(await uploadFile({id:'tasks/'+id},f));await q(sb.from('task_comments').insert({task_id:id,author_id:S.me.id,body:cin.value.trim(),attachments:atts}));openTask(id);}catch(e){err(e);}}},t('Send'))):null,
  h('h3',{style:{marginTop:'16px'}},'🕒 '+t('History')),
  h('div',{class:'tl'},hist.map(a=>h('div',{class:'ev k-'+a.kind},h('div',{},h('b',{},a.actor_name||'System'),' ',actTxt(a.action)),h('div',{class:'t'},fmtDT(a.created_at),' ',pill(t('kind_'+a.kind),'k-'+a.kind)),diffNode(a)))),
  isTop()||(tk.created_by===S.me.id&&isMgr())?h('div',{style:{marginTop:'18px'}},h('button',{class:'btn danger sm',onclick:()=>confirmBox(t('Delete this task?'),async()=>{try{await q(sb.from('tasks').delete().eq('id',id));dr.remove();await loadTasks();route();}catch(e){err(e);}})},'🗑 '+t('Delete task'))):null
 );
}
function diffNode(a){if(!a.old_value&&!a.new_value)return null;const o=a.old_value||{},n=a.new_value||{};const keys=[...new Set([...Object.keys(o),...Object.keys(n)])].filter(k=>JSON.stringify(o[k])!==JSON.stringify(n[k]));if(!keys.length)return null;
 const val=(k,v)=>v==null?'∅':(k==='status'?stLabel(v):(k==='role'?roleName(v):(k.endsWith('department_id')?deptName(v):(k.endsWith('manager_id')||k==='assignee'?P(v).full_name:String(v)))));
 return h('div',{class:'diff'},keys.map(k=>k+': '+val(k,o[k])+' → '+val(k,n[k])).join('  |  '));}

/* ------------ ACTIVITY ------------ */
async function viewActivity(v){
 const f={who:isMgr()?'':S.me.id,dept:'',kind:'',from:'',to:''};
 const out=h('div');
 async function draw(){
  out.innerHTML='';let qy=sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(300);
  if(f.who)qy=qy.eq('actor_id',f.who);if(f.dept)qy=qy.eq('department_id',f.dept);if(f.kind)qy=qy.eq('kind',f.kind);
  if(f.from)qy=qy.gte('created_at',new Date(f.from+'T00:00:00').toISOString());if(f.to)qy=qy.lte('created_at',new Date(f.to+'T23:59:59').toISOString());
  let rows;try{rows=await q(qy);}catch(e){return err(e);}
  if(f.who&&P(f.who)){const p=P(f.who);const mine=S.tasks.filter(x=>!x.parent_id&&x.task_assignees.some(a=>a.user_id===p.id));
   out.append(h('div',{class:'card row',style:{marginBottom:'16px'}},avatar(p,'lg'),h('div',{class:'sp'},h('h3',{style:{margin:0}},p.full_name),h('div',{class:'mut'},[p.job_title,deptName(p.department_id),p.employee_id].filter(x=>x&&x!=='-').join(' • ')),h('div',{class:'sm mut'},S.online.has(p.id)?'🟢 '+t('Online'):t('Last active')+' '+ago(p.last_active))),
    h('div',{class:'row'},[['Open',mine.filter(x=>!['completed','rejected'].includes(x.status)).length],['Completed',mine.filter(x=>x.status==='completed').length],['Overdue',mine.filter(isOverdue).length]].map(([l,n])=>h('div',{style:{textAlign:'center',padding:'0 10px'}},h('b',{style:{fontSize:'22px'}},n),h('div',{class:'sm mut'},t(l)))))));}
  if(!rows.length){out.append(h('div',{class:'card empty'},t('No activity found for these filters.')));return;}
  let day='',cur=null;const tl=h('div',{class:'card'});
  rows.forEach(a=>{const d=new Date(a.created_at).toDateString();if(d!==day){day=d;tl.append(h('h3',{style:{marginTop:'14px'}},fmtDay(a.created_at)));cur=h('div',{class:'tl'});tl.append(cur);}
   cur.append(h('div',{class:'ev k-'+a.kind},h('div',{class:'row'},avatar(P(a.actor_id),'sm',false),h('div',{class:'sp'},h('b',{},a.actor_name||'System'),' ',actTxt(a.action)),pill(t('kind_'+a.kind),'k-'+a.kind)),h('div',{class:'t'},fmtTime(a.created_at)+(a.module?' • '+a.module:'')+(a.ref?' • '+a.ref:'')+(a.status?' • '+a.status:'')),diffNode(a)));});
  out.append(tl);
  out.append(h('p',{class:'mut sm'},t('Messages and employee updates are not proof that an operation was executed unless linked to an approved action in the system.')));
 }
 S.redrawActivity=draw;
 const sel=(opts,key,ph,val)=>h('select',{onchange:e=>{f[key]=e.target.value;draw();}},h('option',{value:''},ph),opts);
 v.append(h('div',{class:'toolbar'},
  isMgr()?(()=>{const s=sel([...S.profiles.values()].map(p=>h('option',{value:p.id},p.full_name)),'who',t('All employees'));return s;})():null,
  isMgr()?sel(S.depts.map(d=>h('option',{value:d.id},deptName(d.id))),'dept',t('All departments')):null,
  sel(['system','employee_update','manager_review'].map(k=>h('option',{value:k},t('kind_'+k))),'kind',t('All types')),
  h('input',{type:'date',onchange:e=>{f.from=e.target.value;draw();}}),h('input',{type:'date',onchange:e=>{f.to=e.target.value;draw();}})),out);
 draw();
}

/* ------------ DIRECTORY ------------ */
function viewDirectory(v){
 let dept=(S.pre&&S.pre.dir)||'';S.pre=null;let qs='';
 const grid=h('div',{class:'emp-grid'}),dl=h('div',{class:'card deptlist',style:{padding:'10px',height:'fit-content'}});
 function draw(){
  dl.innerHTML='';dl.append(h('button',{class:'nav'+(dept===''?' on':''),onclick:()=>{dept='';draw();}},'👥 '+t('All employees'),h('span',{class:'soon'},[...S.profiles.values()].length)));
  S.depts.forEach(d=>dl.append(h('button',{class:'nav'+(dept===d.id?' on':''),onclick:()=>{dept=d.id;draw();}},'🏢 '+deptName(d.id),h('span',{class:'soon'},[...S.profiles.values()].filter(p=>p.department_id===d.id).length))));
  if(isTop())dl.append(h('button',{class:'nav',style:{color:'var(--blue)'},onclick:addDeptModal},'+ '+t('Add department')));
  if(S.me.role==='super_admin')dl.append(h('button',{class:'nav',style:{color:'var(--blue)'},onclick:settingsModal},'🔑 '+t('Join code')));
  grid.innerHTML='';
  let ps=[...S.profiles.values()];if(dept)ps=ps.filter(p=>p.department_id===dept);if(qs)ps=ps.filter(p=>(p.full_name+(p.email||'')+(p.job_title||'')+p.employee_id).toLowerCase().includes(qs.toLowerCase()));
  if(!ps.length)grid.append(h('div',{class:'card empty',style:{gridColumn:'1/-1'}},t('No employees in this view.')));
  ps.forEach(p=>grid.append(h('div',{class:'card emp',onclick:()=>profileView(p.id)},avatar(p,'lg'),h('b',{style:{fontSize:'16px'}},p.full_name),h('div',{class:'mut'},p.job_title||'-'),h('div',{class:'sm'},deptName(p.department_id)),h('div',{class:'chips',style:{justifyContent:'center'}},pill(roleName(p.role)),p.status!=='active'?pill(t('st2_'+p.status),'p-blocked'):null),h('div',{class:'sm mut'},p.employee_id),p.is_demo&&p.avatar_url?h('div',{class:'sample'},L('صورة تجريبية','Sample photo')):null))); 
 }
 S.redrawDir=draw;
 v.append(h('div',{class:'toolbar'},h('input',{placeholder:t('Search employees...'),oninput:e=>{qs=e.target.value;draw();},style:{minWidth:'260px'}}),h('span',{class:'sp'}),isTop()?h('button',{class:'btn sm',onclick:inviteModal},ico('users',16),' ',L('دعوة موظف','Invite employee')):h('span',{class:'mut sm'},t('New employees join using the company code from Settings.'))),h('div',{class:'dir'},dl,grid));
 draw();
}
function profileView(id){
 const p=P(id);const canEdit=isTop()||(S.me.role==='department_manager'&&p.department_id===S.me.department_id&&p.role!=='super_admin')||p.id===S.me.id;
 const mine=S.tasks.filter(x=>!x.parent_id&&x.task_assignees.some(a=>a.user_id===p.id));
 const mgr=p.manager_id?P(p.manager_id):null;
 const m=modal([h('div',{class:'row',style:{alignItems:'flex-start'}},avatar(p,'lg'),h('div',{class:'sp'},h('h2',{style:{margin:'0 0 4px'}},p.full_name),h('div',{class:'mut'},p.job_title||'-'),h('div',{class:'chips',style:{marginTop:'6px'}},pill(roleName(p.role)),pill(deptName(p.department_id)),pill(t('st2_'+p.status),p.status==='active'?'p-completed':'p-blocked'))),h('button',{class:'iconbtn',onclick:()=>m.close()},'✕')),
  h('div',{class:'grid g2',style:{gridTemplateColumns:'1fr 1fr',marginTop:'14px'}},
   [['Employee ID',p.employee_id],['Email',p.email],['Phone',p.phone||'-'],['Direct Manager',mgr?mgr.full_name:'-'],['Status',S.online.has(p.id)?'🟢 '+t('Online'):'⚪ '+t('Last active')+' '+ago(p.last_active)],['Joined',new Date(p.created_at).toLocaleDateString(loc())]].map(([k,v])=>h('div',{},h('div',{class:'sm mut'},t(k)),h('b',{},v)))),
  h('div',{class:'row',style:{marginTop:'16px',gap:'18px'}},[['Open',mine.filter(x=>!['completed','rejected'].includes(x.status)).length],['Completed',mine.filter(x=>x.status==='completed').length],['Overdue',mine.filter(isOverdue).length]].map(([l,n])=>h('div',{},h('b',{style:{fontSize:'22px'}},n),h('div',{class:'sm mut'},t(l))))),
  h('div',{class:'row',style:{marginTop:'18px',flexWrap:'wrap'}},
   p.id!==S.me.id?h('button',{class:'btn',onclick:async()=>{try{const cid=await q(sb.rpc('get_or_create_dm',{other:p.id}));m.close();location.hash='#/chat/'+cid;}catch(e){err(e);}}},'💬 '+t('Message')):null,
   isMgr()?h('button',{class:'btn ghost',onclick:()=>{m.close();location.hash='#/activity';setTimeout(()=>{const s=document.querySelector('.toolbar select');if(s){s.value=p.id;s.dispatchEvent(new Event('change'));}},300);}},'🕒 '+t('Activity Timeline')):null,
   canEdit?h('button',{class:'btn ghost',onclick:()=>{m.close();p.id===S.me.id?profileModal():editEmployee(p);}},'✏️ '+t('Edit')):null)]);
}
function editEmployee(p){
 const title=h('input',{value:p.job_title||''}),phone=h('input',{value:p.phone||''});
 const dept=h('select',{},h('option',{value:''},'-'),S.depts.map(d=>h('option',{value:d.id,selected:d.id===p.department_id},deptName(d.id))));
 const role=h('select',{},ROLES.filter(r=>S.me.role==='super_admin'||r!=='super_admin').map(r=>h('option',{value:r,selected:r===p.role},roleName(r))));
 const st=h('select',{},['active','on_leave','suspended','terminated'].map(s=>h('option',{value:s,selected:s===p.status},t('st2_'+s))));
 const mg=h('select',{},h('option',{value:''},'-'),[...S.profiles.values()].filter(x=>x.id!==p.id&&['super_admin','general_manager','department_manager','team_leader'].includes(x.role)).map(x=>h('option',{value:x.id,selected:x.id===p.manager_id},x.full_name)));
 const full=isTop();
 const m=modal([h('h2',{},t('Edit employee')+': '+p.full_name),h('div',{class:'f2'},h('label',{class:'field'},h('span',{},t('Job Title')),title),h('label',{class:'field'},h('span',{},t('Department')),dept),h('label',{class:'field'},h('span',{},t('Role / Permissions')),role),h('label',{class:'field'},h('span',{},t('Employment status')),st),h('label',{class:'field'},h('span',{},t('Direct Manager')),mg),h('label',{class:'field'},h('span',{},t('Phone')),phone)),
  h('div',{class:'row'},h('button',{class:'btn',onclick:async()=>{try{const patch={job_title:title.value,phone:phone.value};if(full||S.me.role==='department_manager'){patch.department_id=dept.value||null;patch.status=st.value;patch.manager_id=mg.value||null;}if(full)patch.role=role.value;await q(sb.from('profiles').update(patch).eq('id',p.id));await loadBase();m.close();S.redrawDir&&S.redrawDir();toast(t('Saved'));}catch(e){err(e);}}},t('Save')),h('button',{class:'btn ghost',onclick:()=>m.close()},t('Cancel'))),
  h('p',{class:'mut sm'},t('Role, department and status changes are written to the activity log.'))]);
}

async function inviteModal(){
 const jc=(await q(sb.rpc('get_join_code')))||'';
 const link=location.origin+'/?join='+encodeURIComponent(jc);
 const msg=L('مرحباً، تمت دعوتك للانضمام إلى مساحة عمل الفريق في AgriTrade. افتح الرابط وأنشئ حسابك: ','You are invited to join the AgriTrade Team Workspace. Open this link and create your account: ')+link;
 const inp=h('input',{value:link,readonly:true,onclick:e=>e.target.select()});
 const m=modal([h('h2',{},L('دعوة موظف جديد','Invite a new employee')),h('p',{class:'mut'},L('أرسل هذا الرابط للموظف. يفتح صفحة إنشاء الحساب وكود الشركة مكتوب مسبقاً. بعد التسجيل يظهر في دليل الموظفين مباشرة وتحدد له الإدارة والصلاحية.','Send this link to the employee. It opens the sign-up page with the company code already filled in. After signing up he appears in the directory straight away, and you set his department and role.')),
  h('label',{class:'field'},h('span',{},L('رابط الدعوة','Invite link')),inp),
  h('div',{class:'row',style:{gap:'10px',flexWrap:'wrap'}},
   h('button',{class:'btn',onclick:async()=>{try{await navigator.clipboard.writeText(msg);}catch(e){inp.select();document.execCommand('copy');}toast(L('تم النسخ','Copied'));}},L('نسخ رسالة الدعوة','Copy invite message')),
   h('a',{class:'btn ghost',target:'_blank',rel:'noopener',href:'https://wa.me/?text='+encodeURIComponent(msg)},L('إرسال عبر واتساب','Send via WhatsApp')),
   h('a',{class:'btn ghost',href:'mailto:?subject='+encodeURIComponent(L('دعوة للانضمام إلى مساحة عمل الفريق','Invitation to the Team Workspace'))+'&body='+encodeURIComponent(msg)},L('إرسال بالبريد','Send by email'))),
  h('p',{class:'mut sm',style:{marginTop:'12px'}},L('كود الشركة: ','Company code: ')+jc+L(' (يمكن تغييره من الإعدادات؛ الروابط القديمة تتوقف عند تغييره).',' (change it in Settings; old links stop working when it changes).'))]);
}
function addDeptModal(){const n=h('input'),a=h('input');const m=modal([h('h2',{},t('Add department')),h('label',{class:'field'},h('span',{},t('Name (English)')),n),h('label',{class:'field'},h('span',{},t('Name (Arabic)')),a),h('button',{class:'btn',onclick:async()=>{if(!n.value.trim())return;try{await q(sb.from('departments').insert({name:n.value.trim(),name_ar:a.value.trim()||null,sort:200}));await loadBase();await loadConvs();m.close();S.redrawDir&&S.redrawDir();}catch(e){err(e);}}},t('Add'))]);}
async function settingsModal(){
 const rows=await q(sb.from('app_settings').select('*'));const jc=(rows.find(r=>r.key==='join_code')||{}).value||'';const i=h('input',{value:jc});
 const m=modal([h('h2',{},t('Company join code')),h('p',{class:'mut'},t('New employees must enter this code when creating their account. Change it any time.')),h('label',{class:'field'},h('span',{},t('Join code')),i),h('button',{class:'btn',onclick:async()=>{if(i.value.trim().length<6)return toast(t('At least 6 characters'));try{await q(sb.from('app_settings').update({value:i.value.trim()}).eq('key','join_code'));m.close();toast(t('Saved'));}catch(e){err(e);}}},t('Save'))]);
}
function profileModal(){
 const p=S.me;const name=h('input',{value:p.full_name}),title=h('input',{value:p.job_title||''}),phone=h('input',{value:p.phone||''});
 const lang=h('select',{},h('option',{value:'ar',selected:p.locale==='ar'},'العربية'),h('option',{value:'en',selected:p.locale==='en'},'English'));
 const prefs=p.notif_prefs||{};const kinds=['dm','mention','task_assigned','task_status','task_comment'];const chk={};
 const av=h('input',{type:'file',accept:'image/*',class:'hidden'});
 const m=modal([h('h2',{},t('My profile')),h('div',{class:'row',style:{marginBottom:'14px'}},avatar(p,'lg',false),av,h('button',{class:'btn ghost sm',onclick:()=>av.click()},t('Change photo'))),
  h('div',{class:'f2'},h('label',{class:'field'},h('span',{},t('Full name')),name),h('label',{class:'field'},h('span',{},t('Job Title')),title),h('label',{class:'field'},h('span',{},t('Phone')),phone),h('label',{class:'field'},h('span',{},t('Language')),lang)),
  h('h3',{},t('Notification types')),h('div',{class:'col'},kinds.map(k=>{const c=h('input',{type:'checkbox',checked:prefs[k]!==false});chk[k]=c;return h('label',{class:'row'},c,t('notif_'+k));})),
  h('div',{class:'row',style:{marginTop:'14px'}},h('button',{class:'btn',onclick:async()=>{try{const np={};kinds.forEach(k=>np[k]=chk[k].checked);const patch={full_name:name.value.trim()||p.full_name,job_title:title.value,phone:phone.value,locale:lang.value,notif_prefs:np};
   if(av.files[0]){const f=av.files[0];const path=`${S.me.id}/avatar-${Date.now()}.${(f.name.split('.').pop()||'png')}`;const up=await sb.storage.from('avatars').upload(path,f,{upsert:false,contentType:f.type});if(up.error)throw up.error;patch.avatar_url=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;}
   await q(sb.from('profiles').update(patch).eq('id',p.id));await loadBase();S.me=S.profiles.get(p.id);setLang(patch.locale);m.close();renderShell();route();toast(t('Saved'));}catch(e){err(e);}}},t('Save')),h('button',{class:'btn ghost',onclick:()=>m.close()},t('Cancel')))]);
}

/* ------------ REALTIME ------------ */
function startRealtime(){
 const ch=sb.channel('db-changes');
 ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async p=>{
   const m=p.new;const c=S.convs.find(x=>x.id===m.conversation_id);
   if(!c){await loadConvs();S.renderChatList&&S.renderChatList();updateBadges();return;}
   m.message_reactions=[];
   if(S.openConv&&S.openConv.id===m.conversation_id&&(location.hash.startsWith('#/chat')||location.hash.startsWith('#/tx/'))){if(!S.msgs.some(x=>x.id===m.id)){S.msgs.push(m);renderMsgs();}if(m.sender_id!==S.me.id)sb.rpc('mark_read',{p_conv:c.id});c.sum={...c.sum,last_body:m.body,last_sender:m.sender_id,last_at:m.created_at,unread:0};}
   else{c.sum={...c.sum,last_body:m.body||'📎',last_sender:m.sender_id,last_at:m.created_at,unread:Number(c.sum.unread||0)+(m.sender_id===S.me.id?0:1)};if(m.sender_id!==S.me.id){S.unreadTotal++;toast('💬 '+P(m.sender_id).full_name+': '+(m.body||'📎').slice(0,60));}}
   S.unreadTotal=S.convs.reduce((a,x)=>a+Number(x.sum.unread||0),0);updateBadges();S.renderChatList&&location.hash.startsWith('#/chat')&&S.renderChatList();
 })
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},p=>{const i=S.msgs.findIndex(x=>x.id===p.new.id);if(i>=0){S.msgs[i]={...S.msgs[i],...p.new};renderMsgs();}})
 .on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},async()=>{if(S.openConv&&location.hash.startsWith('#/chat')){const ids=S.msgs.map(m=>m.id);if(!ids.length)return;const r=await sb.from('message_reactions').select('*').in('message_id',ids);if(!r.error){S.msgs.forEach(m=>m.message_reactions=r.data.filter(x=>x.message_id===m.id));renderMsgs();}}})
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'conversation_members'},p=>{const c=S.convs.find(x=>x.id===p.new.conversation_id);if(c){const m=c.members.find(x=>x.user_id===p.new.user_id);if(m){m.last_read_at=p.new.last_read_at;if(S.openConv&&S.openConv.id===c.id&&location.hash.startsWith('#/chat'))renderMsgs();}}})
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'conversation_members'},async p=>{if(p.new.user_id===S.me.id){await loadConvs();S.renderChatList&&location.hash.startsWith('#/chat')&&S.renderChatList();updateBadges();}})
 .on('postgres_changes',{event:'*',schema:'public',table:'tasks'},debounce(async()=>{await loadTasks();const a=S.route.split('/')[0];if(a==='tasks'&&S.redrawTasks)S.redrawTasks();if(a==='dashboard')route();},500))
 .on('postgres_changes',{event:'*',schema:'public',table:'task_assignees'},debounce(async()=>{await loadTasks();if(S.route.startsWith('tasks')&&S.redrawTasks)S.redrawTasks();},500))
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>{if(p.new.user_id!==S.me.id)return;S.notifs.unshift(p.new);updateBadges();toast('🔔 '+p.new.title);})
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'activity_log'},debounce(()=>{if(S.route==='activity'&&S.redrawActivity)S.redrawActivity();},800))
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},p=>{S.profiles.set(p.new.id,{...S.profiles.get(p.new.id),...p.new});if(p.new.id===S.me.id)S.me=S.profiles.get(p.new.id);})
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'profiles'},p=>{S.profiles.set(p.new.id,p.new);if(S.route==='directory'&&S.redrawDir)S.redrawDir();})
 .subscribe();
 typingCh=sb.channel('typing',{config:{broadcast:{self:false}}});
 typingCh.on('broadcast',{event:'typing'},({payload})=>{S.typing[payload.c+':'+payload.u]=Date.now();showTyping();}).subscribe();
 const pc=sb.channel('presence',{config:{presence:{key:S.me.id}}});
 pc.on('presence',{event:'sync'},()=>{S.online=new Set(Object.keys(pc.presenceState()));updateDots();}).subscribe(async st=>{if(st==='SUBSCRIBED')await pc.track({at:Date.now()});});
}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

/* ------------ BOOT ------------ */
setLang(S.lang);
/* ------------ STAGE 2: TRANSACTIONS + APPROVALS ------------ */
const L=(ar,en)=>S.lang==='ar'?ar:en;
const TXT={import:['استيراد','Import'],export:['تصدير','Export'],trading:['تداول','Trading'],procurement:['مشتريات','Procurement'],logistics:['لوجستيات','Logistics'],other:['أخرى','Other']};
const TXS={draft:['مسودة','Draft'],open:['مفتوحة','Open'],in_progress:['قيد التنفيذ','In progress'],awaiting_approval:['بانتظار الموافقة','Awaiting approval'],on_hold:['معلقة','On hold'],completed:['مكتملة','Completed'],cancelled:['ملغاة','Cancelled']};
const APT={payment:['دفعة','Payment'],contract:['عقد','Contract'],shipment_release:['الإفراج عن شحنة','Shipment release'],document:['مستند','Document'],expense:['مصروف','Expense'],other:['أخرى','Other']};
const APS={pending:['قيد الانتظار','Pending'],approved:['تمت الموافقة','Approved'],rejected:['مرفوض','Rejected'],returned:['معاد للتعديل','Returned'],cancelled:['ملغى','Cancelled'],waiting:['في الانتظار','Waiting'],skipped:['متخطى','Skipped']};
const lab=(m,k)=>m[k]?L(m[k][0],m[k][1]):k;
const money=(a,c)=>a==null?'-':Number(a).toLocaleString(S.lang==='ar'?'ar-EG':'en-US')+' '+(c||'USD');
const stCls={draft:'p-not_started',open:'p-not_started',in_progress:'p-in_progress',awaiting_approval:'p-pending_review',on_hold:'p-blocked',completed:'p-completed',cancelled:'p-rejected',pending:'p-pending_review',approved:'p-completed',rejected:'p-rejected',returned:'p-waiting_info',waiting:'p-not_started',skipped:'p-not_started'};
function evtTxt(b){
 if(S.lang!=='ar')return b;let m;
 if((m=b.match(/^Transaction (.+) created by (.+)$/)))return `تم إنشاء العملية ${m[1]} بواسطة ${m[2]}`;
 if((m=b.match(/^(.+) changed status: (\w+) -> (\w+)$/)))return `${m[1]} غيّر الحالة: ${lab(TXS,m[2])} ← ${lab(TXS,m[3])}`;
 if((m=b.match(/^(.+) requested approval (APR-\d+): (.+)$/)))return `${m[1]} طلب موافقة ${m[2]}: ${m[3]}`;
 if((m=b.match(/^(.+) (approved|rejected|returned) (APR-\d+) \((.+?)\)(?:: (.+))?$/)))return `${m[1]} ${{approved:'وافق على',rejected:'رفض',returned:'أعاد للتعديل'}[m[2]]} ${m[3]}${m[5]?': '+m[5]:''}`;
 if((m=b.match(/^Cancelled approval (APR-\d+)$/)))return `أُلغي طلب الموافقة ${m[1]}`;
 if((m=b.match(/^Resubmitted (APR-\d+) after return$/)))return `أُعيد إرسال ${m[1]} بعد التعديل`;
 return b;}
function sysMsg(m){return h('div',{class:'sysmsg'},h('span',{},'⚙️ '+evtTxt(m.body)),h('small',{},fmtDT(m.created_at)));}
async function txList(){return await q(sb.from('transactions').select('*').order('created_at',{ascending:false}));}
const userOpts=(roles)=>[...S.profiles.values()].filter(p=>p.status==='active'&&(!roles||roles.includes(p.role))&&p.id!==S.me.id);
function multiPick(users,sel){
 const box=h('div',{class:'chips',style:{maxHeight:'140px',overflow:'auto'}});
 const draw=()=>{box.innerHTML='';users.forEach(u=>box.append(h('button',{type:'button',class:'chip'+(sel.has(u.id)?' on':''),style:sel.has(u.id)?{background:'var(--blue-soft)',borderColor:'var(--blue)'}:{},onclick:()=>{sel.has(u.id)?sel.delete(u.id):sel.add(u.id);draw();}},avatar(u,'sm',false),u.full_name)));};draw();return box;}
function field(label,el){return h('label',{class:'field'},h('span',{},label),el);}
function selOf(map,val){const s=h('select',{class:'inp'});Object.keys(map).forEach(k=>s.append(h('option',{value:k,selected:k===val},lab(map,k))));return s;}

async function viewTransactions(v){
 const rows=await txList();const apr=await q(sb.from('approvals').select('transaction_id,status'));v.innerHTML='';
 const pend={};apr.filter(a=>a.status==='pending').forEach(a=>pend[a.transaction_id]=(pend[a.transaction_id]||0)+1);
 const f={q:'',st:'',ty:'',...((S.pre&&S.pre.tx)||{})};const _px=S.pre&&S.pre.tx;S.pre=null;const out=h('div');
 const bar=h('div',{class:'row',style:{marginBottom:'16px',flexWrap:'wrap',gap:'10px'}},
  h('input',{class:'inp',style:{maxWidth:'260px'},placeholder:L('بحث بالكود أو العنوان...','Search code or title...'),oninput:e=>{f.q=e.target.value;draw();}}),
  (()=>{const s=selOf(TXS,'');s.prepend(h('option',{value:''},L('كل الحالات','All statuses')));s.value='';s.onchange=()=>{f.st=s.value;draw();};return s;})(),
  (()=>{const s=selOf(TXT,'');s.prepend(h('option',{value:''},L('كل الأنواع','All types')));s.value='';s.onchange=()=>{f.ty=s.value;draw();};return s;})(),
  h('span',{class:'sp'}),S.me.role!=='auditor'?h('button',{class:'btn',onclick:newTxModal},'+ '+L('عملية جديدة','New transaction')):null);
 function draw(){out.innerHTML='';
  const r=rows.filter(x=>(!f.q||(x.code+' '+x.title+' '+(x.counterparty||'')).toLowerCase().includes(f.q.toLowerCase()))&&(!f.st||x.status===f.st)&&(!f.ty||x.type===f.ty));
  if(!r.length){out.append(h('div',{class:'empty card'},h('div',{style:{fontSize:'44px'}},'🔗'),h('h3',{},L('لا توجد عمليات','No transactions yet')),h('div',{},L('أنشئ عملية لتبدأ محادثة ومهام وموافقات مرتبطة بها.','Create a transaction to get a linked chat, tasks and approvals.'))));return;}
  out.append(h('div',{class:'txgrid'},r.map(x=>h('div',{class:'card txcard',onclick:()=>{location.hash='#/tx/'+x.id;}},
   h('div',{class:'row'},h('b',{class:'txcode'},x.code),pill(lab(TXT,x.type)),h('span',{class:'sp'}),pill(lab(TXS,x.status),stCls[x.status])),
   h('h3',{style:{margin:'10px 0 4px'}},x.title),
   h('div',{class:'sm mut'},[x.commodity,x.counterparty].filter(Boolean).join(' • ')),
   h('div',{class:'txfacts'},h('div',{},h('small',{},L('الكمية','Quantity')),h('b',{},x.quantity_mt?Number(x.quantity_mt).toLocaleString()+' MT':'-')),h('div',{},h('small',{},L('القيمة','Value')),h('b',{},money(x.amount,x.currency)))),
   h('div',{class:'row',style:{marginTop:'10px'}},avatar(P(x.owner_id),'sm',false),h('span',{class:'sm'},P(x.owner_id).full_name),h('span',{class:'sp'}),pend[x.id]?pill('🛡️ '+pend[x.id]+' '+L('موافقة معلقة','pending approval'),'p-pending_review'):null)))));}
 v.append(bar,out);if(_px){const ss=bar.querySelectorAll('select');if(ss[0]&&f.st)ss[0].value=f.st;if(ss[1]&&f.ty)ss[1].value=f.ty;}draw();}

function newTxModal(){
 const sel=new Set();const ty=selOf(TXT,'import'),title=h('input'),com=h('input',{placeholder:L('قمح، ذرة...','Wheat, corn...')}),cp=h('input'),qty=h('input',{type:'number',min:0}),amt=h('input',{type:'number',min:0}),cur=h('input',{value:'USD'});
 const dept=h('select',{},h('option',{value:''},'-'),S.depts.map(d=>h('option',{value:d.id,selected:d.id===S.me.department_id},deptName(d.id))));
 const m=modal([h('h2',{},L('عملية جديدة','New transaction')),
  h('div',{class:'f2'},field(L('النوع','Type'),ty),field(L('الإدارة','Department'),dept)),field(L('العنوان','Title'),title),
  h('div',{class:'f2'},field(L('السلعة','Commodity'),com),field(L('الطرف الآخر','Counterparty'),cp)),
  h('div',{class:'f2'},field(L('الكمية (طن)','Quantity (MT)'),qty),h('div',{class:'f2'},field(L('القيمة','Value'),amt),field(L('العملة','Currency'),cur))),
  h('div',{class:'field'},h('span',{},L('أعضاء المحادثة (المديرون العامون يضافون تلقائياً)','Chat members (top managers are added automatically)')),multiPick(userOpts(),sel)),
  h('div',{class:'row'},h('button',{class:'btn',onclick:async e=>{if(!title.value.trim())return toast(L('اكتب العنوان','Enter a title'));e.target.disabled=true;
   try{const id=await q(sb.rpc('create_transaction',{p_type:ty.value,p_title:title.value.trim(),p_commodity:com.value.trim()||null,p_counterparty:cp.value.trim()||null,p_qty:qty.value?Number(qty.value):null,p_amount:amt.value?Number(amt.value):null,p_currency:cur.value.trim()||'USD',p_dept:dept.value||null,p_members:[...sel]}));await loadConvs();m.close();location.hash='#/tx/'+id;}catch(x){err(x);e.target.disabled=false;}}},L('إنشاء','Create')),h('button',{class:'btn ghost',onclick:()=>m.close()},L('إلغاء','Cancel')))],true);}

async function viewTx(v,id,tab){
 const x=(await q(sb.from('transactions').select('*').eq('id',id)))[0];
 if(!x){v.append(h('div',{class:'empty card'},L('العملية غير موجودة أو لا تملك صلاحية.','Not found or no access.')));return;}
 tab=tab||'chat';v.innerHTML='';
 const canSet=isMgr()||x.owner_id===S.me.id||x.created_by===S.me.id;
 const st=selOf(TXS,x.status);st.disabled=!canSet;st.onchange=async()=>{try{await q(sb.rpc('set_transaction_status',{p_tx:id,p_status:st.value}));toast(L('تم تحديث الحالة','Status updated'));viewTxRefresh();}catch(e){err(e);st.value=x.status;}};
 const head=h('div',{class:'card txhead'},h('div',{class:'row',style:{flexWrap:'wrap',gap:'10px'}},
  h('button',{class:'iconbtn',onclick:()=>{location.hash='#/transactions';}},S.lang==='ar'?'→':'←'),h('b',{class:'txcode',style:{fontSize:'18px'}},x.code),pill(lab(TXT,x.type)),pill(lab(TXS,x.status),stCls[x.status]),h('span',{class:'sp'}),h('span',{class:'sm mut'},L('الحالة','Status')),st),
  h('h2',{style:{margin:'8px 0 6px'}},x.title),
  h('div',{class:'txfacts wide'},[[L('السلعة','Commodity'),x.commodity||'-'],[L('الطرف الآخر','Counterparty'),x.counterparty||'-'],[L('الكمية','Quantity'),x.quantity_mt?Number(x.quantity_mt).toLocaleString()+' MT':'-'],[L('القيمة','Value'),money(x.amount,x.currency)],[L('الإدارة','Department'),x.department_id?deptName(x.department_id):'-'],[L('المسؤول','Owner'),P(x.owner_id).full_name]].map(a=>h('div',{},h('small',{},a[0]),h('b',{},a[1])))));
 const tabs=h('div',{class:'tabs2 txtabs'},[['chat','💬',L('المحادثة','Chat')],['tasks','✅',L('المهام','Tasks')],['docs','📎',L('المستندات','Documents')],['apr','🛡️',L('الموافقات','Approvals')]].map(t2=>h('button',{class:tab===t2[0]?'on':'',onclick:()=>{S.txTab=t2[0];viewTxRefresh();}},t2[1]+' '+t2[2])));
 const body=h('div',{class:'txbody'});v.append(head,tabs,body);
 function viewTxRefresh(){const vv=$('#view');vv.innerHTML='';viewTx(vv,id,S.txTab);}
 if(tab==='chat'){
  const conv=S.convs.find(c=>c.id===x.conversation_id);
  if(!conv){body.append(h('div',{class:'empty card'},L('لا تملك عضوية في محادثة هذه العملية.','You are not a member of this transaction chat.')));}
  else{const main=h('div',{class:'chat-main txchat card'});body.append(main);S.openConv=conv;await openConversation(main,conv);}
 }
 if(tab==='tasks'){
  const ts=S.tasks.filter(k=>k.related_ref===x.code&&!k.parent_id);
  body.append(h('div',{class:'row',style:{marginBottom:'12px'}},h('b',{},ts.length+' '+L('مهمة','tasks')),h('span',{class:'sp'}),S.me.role!=='auditor'?h('button',{class:'btn sm',onclick:()=>newTaskModal({related_ref:x.code,department_id:x.department_id})},'+ '+L('مهمة جديدة','New task')):null),
   ts.length?h('div',{class:'list'},ts.map(k=>h('div',{class:'li card',style:{cursor:'pointer'},onclick:()=>openTask(k.id)},h('b',{},k.code),h('div',{class:'sp'},k.title),pill(stLabel(k.status),'p-'+k.status),h('span',{class:'sm mut'},k.due_date||'')))):h('div',{class:'empty card'},L('لا توجد مهام مرتبطة بهذه العملية بعد.','No tasks linked to this transaction yet.')));
 }
 if(tab==='docs'){
  const docs=await q(sb.from('transaction_docs').select('*').eq('transaction_id',id).order('created_at',{ascending:false}));
  const fi=h('input',{type:'file',style:{display:'none'},onchange:async e=>{const f=e.target.files[0];if(!f)return;try{const path=`${S.me.id}/tx/${x.code}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g,'_')}`;const up=await sb.storage.from('attachments').upload(path,f,{upsert:false,contentType:f.type||undefined});if(up.error)throw up.error;await q(sb.from('transaction_docs').insert({transaction_id:id,name:f.name,path,mime:f.type,size:f.size,uploaded_by:S.me.id}));await sb.rpc('log_event',{p_action:'Uploaded document to '+x.code+': '+f.name,p_module:'Transactions',p_ref:x.code});toast(L('تم رفع المستند','Document uploaded'));viewTxRefresh();}catch(er){err(er);}}});
  body.append(h('div',{class:'row',style:{marginBottom:'12px'}},h('b',{},docs.length+' '+L('مستند','documents')),h('span',{class:'sp'}),S.me.role!=='auditor'?h('button',{class:'btn sm',onclick:()=>fi.click()},'⬆️ '+L('رفع مستند','Upload document')):null,fi),
   docs.length?h('div',{class:'list'},docs.map(d=>{const a=h('a',{class:'fileCard',target:'_blank',rel:'noopener'},h('span',{class:'fi'},/pdf/i.test(d.mime||d.name)?'📕':/sheet|excel|csv|xls/i.test(d.mime||d.name)?'📗':/image/i.test(d.mime||'')?'🖼️':'📎'),h('div',{},h('div',{class:'b'},d.name),h('div',{class:'sm mut'},P(d.uploaded_by).full_name+' • '+fmtDT(d.created_at)+(d.size?' • '+(d.size/1024).toFixed(0)+' KB':''))));signed(d.path).then(u=>a.href=u);return a;})):h('div',{class:'empty card'},L('لا توجد مستندات بعد. المستندات المرفوعة هنا تظهر لكل أعضاء العملية.','No documents yet. Files uploaded here are visible to everyone on this transaction.')));
 }
 if(tab==='apr'){
  const ap=await aprRows(id);
  body.append(h('div',{class:'row',style:{marginBottom:'12px'}},h('b',{},ap.length+' '+L('طلب موافقة','approval requests')),h('span',{class:'sp'}),S.me.role!=='auditor'?h('button',{class:'btn sm',onclick:()=>newAprModal(x)},'+ '+L('طلب موافقة','Request approval')):null),
   ap.length?h('div',{class:'list'},ap.map(a=>aprCard(a,viewTxRefresh))):h('div',{class:'empty card'},L('لا توجد طلبات موافقة.','No approval requests.')));
 }
}
async function aprRows(txId){
 let qy=sb.from('approvals').select('*,approval_steps(*)').order('created_at',{ascending:false});if(txId)qy=qy.eq('transaction_id',txId);
 const r=await q(qy);r.forEach(a=>a.approval_steps.sort((p,c)=>p.step_no-c.step_no));return r;}
function reasonModal(title,needReason,cb){const ta=h('textarea',{rows:3,placeholder:L('السبب (مطلوب)','Reason (required)')});const m=modal([h('h2',{},title),needReason?ta:null,h('div',{class:'row'},h('button',{class:'btn',onclick:async e=>{if(needReason&&ta.value.trim().length<3)return toast(L('السبب مطلوب','A reason is required'));e.target.disabled=true;try{await cb(ta.value.trim());m.close();}catch(er){err(er);e.target.disabled=false;}}},L('تأكيد','Confirm')),h('button',{class:'btn ghost',onclick:()=>m.close()},L('إلغاء','Cancel')))]);}
function aprCard(a,refresh,txMap){
 const cur=a.approval_steps.find(s=>s.status==='pending');const mine=a.status==='pending'&&cur&&cur.approver_id===S.me.id;
 const act=async(d,reason)=>{await q(sb.rpc('decide_approval',{p_id:a.id,p_decision:d,p_reason:reason||null}));toast(L('تم تسجيل قرارك','Decision recorded'));refresh();};
 const tx=a.transaction_id&&txMap?txMap[a.transaction_id]:null;
 return h('div',{class:'card aprcard'},
  h('div',{class:'row',style:{flexWrap:'wrap',gap:'8px'}},h('b',{class:'txcode'},a.code),pill(lab(APT,a.type)),tx?h('a',{href:'#/tx/'+tx.id,style:{fontSize:'12px'}},'🔗 '+tx.code):null,h('span',{class:'sp'}),pill(lab(APS,a.status),stCls[a.status])),
  h('h3',{style:{margin:'8px 0 4px'}},a.title),a.details?h('div',{class:'sm mut',style:{whiteSpace:'pre-wrap'}},a.details):null,
  h('div',{class:'row sm',style:{margin:'8px 0'}},h('b',{},money(a.amount,a.currency)),h('span',{class:'mut'},'• '+L('طلب بواسطة','requested by')+' '+P(a.requested_by).full_name+' • '+fmtDT(a.created_at))),
  h('div',{class:'aprsteps'},a.approval_steps.map(s=>h('div',{class:'apstep '+s.status},avatar(P(s.approver_id),'sm',false),h('div',{},h('b',{},P(s.approver_id).full_name),h('div',{class:'sm mut'},lab(APS,s.status)+(s.acted_at?' • '+fmtDT(s.acted_at):'')),s.reason?h('div',{class:'sm',style:{color:'var(--red)'}},'“'+s.reason+'”'):null)))),
  mine?h('div',{class:'row',style:{marginTop:'10px',gap:'8px'}},h('button',{class:'btn',onclick:()=>reasonModal(L('تأكيد الموافقة على ','Approve ')+a.code+'؟',false,r=>act('approved'))},'✅ '+L('موافقة','Approve')),h('button',{class:'btn ghost',onclick:()=>reasonModal(L('إعادة للتعديل','Return for changes'),true,r=>act('returned',r))},'↩️ '+L('إعادة','Return')),h('button',{class:'btn danger',onclick:()=>reasonModal(L('رفض الطلب','Reject request'),true,r=>act('rejected',r))},'⛔ '+L('رفض','Reject'))):null,
  a.requested_by===S.me.id&&['pending','returned'].includes(a.status)?h('div',{class:'row',style:{marginTop:'10px',gap:'8px'}},a.status==='returned'?h('button',{class:'btn',onclick:()=>reasonModal(L('إعادة الإرسال للموافقة','Resubmit for approval'),false,async()=>{await q(sb.rpc('resubmit_approval',{p_id:a.id,p_details:null}));refresh();})},'🔁 '+L('إعادة إرسال','Resubmit')):null,h('button',{class:'btn ghost sm',onclick:()=>reasonModal(L('إلغاء الطلب','Cancel request'),false,async()=>{await q(sb.rpc('cancel_approval',{p_id:a.id}));refresh();})},L('إلغاء الطلب','Cancel request'))):null,
  a.status==='pending'&&cur&&(mine||a.requested_by===S.me.id)?h('div',{class:'row',style:{marginTop:'8px'}},h('button',{class:'btn ghost sm',onclick:()=>reasonModal(L('تصعيد إلى المدير','Escalate to manager'),false,async r=>{await q(sb.rpc('escalate_approval',{p_id:a.id,p_reason:r||null}));toast(L('تم التصعيد','Escalated'));refresh();})},'⬆️ '+L('تصعيد للمدير','Escalate to manager'))):null,
  a.status==='pending'&&!mine&&a.requested_by!==S.me.id&&cur?h('div',{class:'sm mut',style:{marginTop:'8px'}},L('بانتظار: ','Waiting for: ')+P(cur.approver_id).full_name):null);
}
async function newAprModal(tx){
 const txs=tx?[tx]:await txList();const sel=[];const txS=h('select',{},h('option',{value:''},L('بدون عملية','No transaction')),txs.map(t2=>h('option',{value:t2.id,selected:tx&&t2.id===tx.id},t2.code+' - '+t2.title)));
 const ty=selOf(APT,'payment'),title=h('input'),det=h('textarea',{rows:3}),amt=h('input',{type:'number',min:0}),cur=h('input',{value:tx&&tx.currency||'USD'});
 const cands=userOpts(['super_admin','general_manager','department_manager','team_leader','finance_user']);
 const list=h('div',{class:'chips'}),chain=h('ol',{class:'sm',style:{margin:'6px 0',paddingInlineStart:'20px'}});
 const draw=()=>{list.innerHTML='';cands.forEach(u=>list.append(h('button',{type:'button',class:'chip',style:sel.includes(u.id)?{opacity:.4}:{},onclick:()=>{if(!sel.includes(u.id))sel.push(u.id);draw();}},avatar(u,'sm',false),u.full_name,h('small',{class:'mut'},' '+roleName(u.role)))));chain.innerHTML='';sel.forEach((id,i)=>chain.append(h('li',{},P(id).full_name+' ',h('a',{href:'#',onclick:e=>{e.preventDefault();sel.splice(i,1);draw();}},'✕'))));};draw();
 const thr=50000;
 const m=modal([h('h2',{},L('طلب موافقة','Request approval')),field(L('العملية','Transaction'),txS),h('div',{class:'f2'},field(L('النوع','Type'),ty),h('div',{class:'f2'},field(L('المبلغ','Amount'),amt),field(L('العملة','Currency'),cur))),field(L('العنوان','Title'),title),field(L('التفاصيل','Details'),det),
  h('div',{class:'field'},h('span',{},L('سلسلة الموافقين (بالترتيب، اضغط لإضافة)','Approval chain (in order, tap to add)')),list,chain,h('div',{class:'sm mut'},L('المبالغ 50,000 فأكثر تتطلب المدير العام أو مدير النظام في السلسلة. لا يمكنك الموافقة على طلبك.','Amounts of 50,000 or more need a general manager or super admin in the chain. You cannot approve your own request.'))),
  h('div',{class:'row'},h('button',{class:'btn',onclick:async e=>{if(!title.value.trim()||!sel.length)return toast(L('أكمل العنوان واختر موافقاً','Enter a title and pick approvers'));e.target.disabled=true;
   try{await q(sb.rpc('request_approval',{p_tx:txS.value||null,p_type:ty.value,p_title:title.value.trim(),p_details:det.value,p_amount:amt.value?Number(amt.value):null,p_currency:cur.value.trim()||'USD',p_approvers:sel}));toast(L('تم إرسال الطلب','Request sent'));m.close();route();}catch(er){err(er);e.target.disabled=false;}}},L('إرسال للموافقة','Send for approval')),h('button',{class:'btn ghost',onclick:()=>m.close()},L('إلغاء','Cancel')))],true);}

async function viewApprovals(v,tab){
 tab=tab||'me';const rows=await aprRows();const txs=await txList();const txMap={};txs.forEach(x=>txMap[x.id]=x);v.innerHTML='';
 const waiting=rows.filter(a=>a.status==='pending'&&a.approval_steps.some(s=>s.status==='pending'&&s.approver_id===S.me.id));
 const mineR=rows.filter(a=>a.requested_by===S.me.id);
 const sets={me:waiting,req:mineR,all:rows};
 const showAll=isMgr()||S.me.role==='auditor';
 const kp=(n,l,c)=>h('div',{class:'card kpi '+c},h('div',{class:'n'},n),h('div',{class:'l'},l));
 const refresh=()=>{const vv=$('#view');vv.innerHTML='';viewApprovals(vv,tab);};
 v.append(h('div',{class:'kpis',style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'14px',marginBottom:'16px'}},
  kp(waiting.length,L('بانتظار قراري','Waiting for my decision'),'k1'),kp(rows.filter(a=>a.status==='pending').length,L('كل الطلبات المعلقة','All pending'),'k2'),kp(rows.filter(a=>a.status==='approved').length,L('تمت الموافقة','Approved'),'k3'),kp(rows.filter(a=>['rejected','returned'].includes(a.status)).length,L('مرفوضة / معادة','Rejected / returned'),'k4')),
  h('div',{class:'row',style:{marginBottom:'14px'}},h('div',{class:'tabs2'},[['me',L('بانتظاري','Waiting for me')],['req',L('طلباتي','My requests')],showAll?['all',L('الكل','All')]:null].filter(Boolean).map(t2=>h('button',{class:tab===t2[0]?'on':'',onclick:()=>{tab=t2[0];refresh();}},t2[1]))),h('span',{class:'sp'}),S.me.role!=='auditor'?h('button',{class:'btn',onclick:()=>newAprModal(null)},'+ '+L('طلب موافقة','Request approval')):null),
  sets[tab].length?h('div',{class:'txgrid'},sets[tab].map(a=>aprCard(a,refresh,txMap))):h('div',{class:'empty card'},h('div',{style:{fontSize:'44px'}},'🛡️'),h('h3',{},L('لا توجد طلبات هنا','Nothing here')),h('div',{},L('القرارات تُسجل في سجل نشاط لا يمكن تعديله.','Decisions are written to an activity log that cannot be edited.'))));
}
sb.channel('stage2').on('postgres_changes',{event:'*',schema:'public',table:'approvals'},()=>{if(/^#\/(approvals|transactions)/.test(location.hash)&&S.me&&$('#view'))route();loadNotifs&&loadNotifs();}).on('postgres_changes',{event:'*',schema:'public',table:'approval_steps'},()=>{if(/^#\/approvals/.test(location.hash)&&S.me&&$('#view'))route();}).subscribe();

/* ------------ STAGE 3 ------------ */
const dname=deptName;
const PRI={normal:['عادي','Normal'],important:['مهم','Important'],urgent:['عاجل','Urgent']};
const priCls={normal:'',important:'warn',urgent:'bad'};
function empty(ic,ar,en){return h('div',{class:'empty card'},h('div',{style:{fontSize:'44px'}},ic),h('h3',{},L(ar,en)));}
async function viewAnnounce(v){
 const [rows,reads]=await Promise.all([q(sb.from('announcements').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false})),q(sb.from('announcement_reads').select('*').eq('user_id',S.me.id))]);
 const seen=new Set(reads.map(r=>r.announcement_id));
 v.append(h('div',{class:'row',style:{marginBottom:'14px'}},h('h2',{style:{margin:0}},L('الإعلانات الرسمية','Official announcements')),h('span',{style:{flex:1}}),isMgr()?h('button',{class:'btn',onclick:newAnnModal},'＋ '+L('إعلان جديد','New announcement')):null));
 if(!rows.length){v.append(empty('📢','لا توجد إعلانات','No announcements'));return;}
 v.append(h('div',{class:'txgrid'},rows.map(a=>h('div',{class:'card',style:{borderInlineStart:'4px solid '+(a.priority==='urgent'?'#dc2626':a.priority==='important'?'#d4a017':'#3b82f6')}},
  h('div',{class:'row'},pill(L(...PRI[a.priority]),priCls[a.priority]),a.pinned?h('span',{},'📌'):null,!seen.has(a.id)?pill(L('جديد','New'),'ok'):null,h('span',{style:{flex:1}}),h('span',{class:'sm mut'},fmtDT(a.created_at))),
  h('h3',{style:{margin:'8px 0'}},a.title),h('div',{style:{whiteSpace:'pre-wrap'}},a.body),
  h('div',{class:'sm mut',style:{marginTop:'10px'}},L('من: ','From: ')+(P(a.created_by).full_name||'')+(a.department_id?' · '+dname(a.department_id):' · '+L('كل الشركة','Whole company'))),
  isMgr()?h('button',{class:'btn ghost sm',style:{marginTop:'8px'},onclick:async()=>{const r=await q(sb.from('announcement_reads').select('user_id').eq('announcement_id',a.id));toast(L('قرأها ','Read by ')+r.length+L(' موظف',' people'));}},'👁 '+L('من قرأ؟','Who read?')):null))));
 const fresh=rows.filter(a=>!seen.has(a.id));
 if(fresh.length){await sb.from('announcement_reads').insert(fresh.map(a=>({announcement_id:a.id,user_id:S.me.id})));}
}
function newAnnModal(){
 const ti=h('input',{class:'inp'}),bo=h('textarea',{rows:5,class:'inp'}),pr=selOf(PRI,'normal'),dp=h('select',{class:'inp'},h('option',{value:''},L('كل الشركة','Whole company')),S.depts.map(d=>h('option',{value:d.id},S.lang==='ar'&&d.name_ar?d.name_ar:d.name))),pin=h('input',{type:'checkbox'});
 const m=modal([h('h2',{},L('إعلان جديد','New announcement')),field(L('العنوان','Title'),ti),field(L('النص','Message'),bo),field(L('الأولوية','Priority'),pr),field(L('الجمهور','Audience'),dp),h('label',{class:'row'},pin,L('تثبيت في الأعلى','Pin to top')),
  h('div',{class:'row'},h('button',{class:'btn',onclick:async e=>{e.target.disabled=true;try{await q(sb.rpc('post_announcement',{p_title:ti.value,p_body:bo.value,p_priority:pr.value,p_dept:dp.value||null,p_pinned:pin.checked}));m.close();toast(L('تم النشر وإشعار الموظفين','Posted, staff notified'));route();}catch(x){err(x);e.target.disabled=false;}}},L('نشر','Post')),h('button',{class:'btn ghost',onclick:()=>m.close()},L('إلغاء','Cancel')))]);
}
async function viewStandup(v){
 const day=todayStr();
 const rows=await q(sb.from('standups').select('*').eq('day',day));
 const mine=rows.find(r=>r.user_id===S.me.id);
 const y=h('textarea',{rows:3,class:'inp'}),td=h('textarea',{rows:3,class:'inp'}),bl=h('textarea',{rows:2,class:'inp'});
 if(mine){y.value=mine.yesterday||'';td.value=mine.today||'';bl.value=mine.blockers||'';}
 v.append(h('div',{class:'card',style:{marginBottom:'16px'}},h('h3',{style:{marginTop:0}},'🗓️ '+L('تحديثي اليومي','My daily update')+' · '+day),
  field(L('ماذا أنجزت أمس؟','What did I finish yesterday?'),y),field(L('ماذا سأعمل اليوم؟','What will I do today?'),td),field(L('معوّقات؟','Blockers?'),bl),
  h('button',{class:'btn',onclick:async e=>{if(!td.value.trim())return toast(L('اكتب خطة اليوم','Write today\'s plan'));e.target.disabled=true;try{const b={yesterday:y.value.trim(),today:td.value.trim(),blockers:bl.value.trim()};if(mine)await q(sb.from('standups').update(b).eq('id',mine.id));else await q(sb.from('standups').insert({...b,user_id:S.me.id,day}));toast(L('تم الحفظ','Saved'));route();}catch(x){err(x);e.target.disabled=false;}}},mine?L('تحديث','Update'):L('إرسال','Submit')),
  h('p',{class:'sm mut'},L('التحديث اليومي ملاحظة عمل فقط، وليس دليلاً على إنجاز عملية.','A daily update is a work note, not proof that an operation happened.'))));
 if(isMgr()){
  const act=[...S.profiles.values()].filter(p=>p.status==='active');const done=new Set(rows.map(r=>r.user_id));const miss=act.filter(p=>!done.has(p.id));
  v.append(h('div',{class:'row',style:{marginBottom:'10px'}},h('h3',{style:{margin:0}},L('تحديثات الفريق اليوم','Team updates today')),pill(rows.length+'/'+act.length,'ok')));
  v.append(h('div',{class:'txgrid'},rows.map(r=>h('div',{class:'card'},h('div',{class:'row'},avatar(P(r.user_id),'sm'),h('b',{},P(r.user_id).full_name)),h('div',{class:'sm mut',style:{marginTop:'6px'}},L('أمس','Yesterday')),h('div',{},r.yesterday||'-'),h('div',{class:'sm mut',style:{marginTop:'6px'}},L('اليوم','Today')),h('div',{},r.today||'-'),r.blockers?h('div',{style:{marginTop:'6px',color:'#b91c1c'}},'⚠️ '+r.blockers):null))));
  if(miss.length)v.append(h('div',{class:'card',style:{marginTop:'14px'}},h('b',{},L('لم يرسلوا بعد: ','Not submitted yet: ')),miss.map(p=>p.full_name).join('، ')));
 }
}
async function viewHandover(v){
 const rows=await q(sb.from('handovers').select('*').order('created_at',{ascending:false}));
 const ST={pending:['بانتظار القبول','Pending','warn'],accepted:['تم القبول','Accepted','ok'],declined:['مرفوض','Declined','bad'],ended:['منتهي','Ended','']};
 const refresh=()=>route();
 v.append(h('div',{class:'row',style:{marginBottom:'14px'}},h('h2',{style:{margin:0}},L('تسليم العمل','Work handover')),h('span',{style:{flex:1}}),h('button',{class:'btn',onclick:newHoModal},'＋ '+L('طلب تسليم','New handover'))));
 if(!rows.length){v.append(empty('🔁','لا توجد طلبات تسليم','No handovers yet'));return;}
 const tmap=new Map(S.tasks.map(x=>[x.id,x]));
 v.append(h('div',{class:'txgrid'},rows.map(r=>{const s=ST[r.status];return h('div',{class:'card'},
  h('div',{class:'row'},h('b',{},r.code),pill(L(s[0],s[1]),s[2]),h('span',{style:{flex:1}}),h('span',{class:'sm mut'},fmtDT(r.created_at))),
  h('div',{class:'row',style:{margin:'8px 0'}},avatar(P(r.from_user),'sm'),P(r.from_user).full_name,'→',avatar(P(r.to_user),'sm'),P(r.to_user).full_name),
  h('div',{},r.reason),(r.start_date||r.end_date)?h('div',{class:'sm mut'},(r.start_date||'')+' → '+(r.end_date||'')):null,
  r.notes?h('div',{class:'sm',style:{margin:'6px 0'}},'📝 '+r.notes):null,
  h('div',{class:'sm mut'},L('المهام: ','Tasks: ')+(r.task_ids.length?r.task_ids.map(i=>(tmap.get(i)||{}).code||'•').join(', ')+' ('+r.task_ids.length+')':'-')),
  r.decline_reason?h('div',{style:{color:'#b91c1c'}},L('سبب الرفض: ','Declined: ')+r.decline_reason):null,
  r.status==='pending'&&r.to_user===S.me.id?h('div',{class:'row',style:{marginTop:'10px'}},h('button',{class:'btn',onclick:async()=>{try{await q(sb.rpc('respond_handover',{p_id:r.id,p_accept:true,p_reason:null}));await loadTasks();toast(L('تم قبول التسليم ونقل المهام','Accepted, tasks moved'));refresh();}catch(x){err(x);}}},L('قبول','Accept')),h('button',{class:'btn danger',onclick:()=>reasonModal(L('رفض التسليم','Decline handover'),true,async rs=>{await q(sb.rpc('respond_handover',{p_id:r.id,p_accept:false,p_reason:rs}));refresh();})},L('رفض','Decline'))):null);})));
}
function newHoModal(){
 const to=h('select',{class:'inp'},userOpts().map(p=>h('option',{value:p.id},p.full_name)));
 const rs=h('input',{class:'inp'}),s=h('input',{type:'date',class:'inp'}),e2=h('input',{type:'date',class:'inp'}),nt=h('textarea',{rows:3,class:'inp'});
 const mine=S.tasks.filter(x=>x.task_assignees.some(a=>a.user_id===S.me.id)&&!['completed','rejected'].includes(x.status));
 const checks=mine.map(x=>{const c=h('input',{type:'checkbox',value:x.id});return h('label',{class:'row sm'},c,(x.code||'')+' · '+x.title);});
 const m=modal([h('h2',{},L('طلب تسليم عمل','Request work handover')),field(L('إلى','To'),to),field(L('السبب (مثلاً إجازة)','Reason (e.g. leave)'),rs),h('div',{class:'row'},field(L('من','From'),s),field(L('إلى','Until'),e2)),field(L('ملاحظات التسليم','Handover notes'),nt),
  h('b',{},L('المهام المراد تسليمها','Tasks to hand over')),h('div',{style:{maxHeight:'180px',overflow:'auto',margin:'8px 0'}},checks.length?checks:h('div',{class:'mut sm'},L('لا توجد مهام مفتوحة','No open tasks'))),
  h('div',{class:'row'},h('button',{class:'btn',onclick:async ev=>{ev.target.disabled=true;try{await q(sb.rpc('create_handover',{p_to:to.value,p_reason:rs.value,p_start:s.value||null,p_end:e2.value||null,p_notes:nt.value,p_tasks:[...m.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value)}));m.close();toast(L('تم إرسال الطلب','Request sent'));route();}catch(x){err(x);ev.target.disabled=false;}}},L('إرسال','Send')),h('button',{class:'btn ghost',onclick:()=>m.close()},L('إلغاء','Cancel')))]);
}
function periodStart(p){const d=new Date();if(p==='week')d.setDate(d.getDate()-7);else if(p==='month')d.setDate(d.getDate()-30);d.setHours(0,0,0,0);return d;}
async function viewReports(v,period){
 period=period||'week';const from=periodStart(period);
 const [steps,sus]=await Promise.all([q(sb.from('approval_steps').select('approver_id,status,acted_at').neq('status','pending')),q(sb.from('standups').select('user_id,day').gte('day',from.toISOString().slice(0,10)))]);
 const users=[...S.profiles.values()].filter(p=>p.status==='active'&&(isMgr()||p.id===S.me.id));
 const data=users.map(p=>{const mt=S.tasks.filter(x=>x.task_assignees.some(a=>a.user_id===p.id));return{p,total:mt.length,open:mt.filter(x=>!['completed','rejected'].includes(x.status)).length,done:mt.filter(x=>x.status==='completed'&&x.completed_at&&new Date(x.completed_at)>=from).length,over:mt.filter(isOverdue).length,apr:steps.filter(s=>s.approver_id===p.id&&s.acted_at&&new Date(s.acted_at)>=from).length,su:sus.filter(s=>s.user_id===p.id).length};});
 const sel=h('select',{class:'inp',style:{width:'auto'},onchange:e=>{const vv=$('#view');vv.innerHTML='';viewReports(vv,e.target.value);}},[['today',L('اليوم','Today')],['week',L('آخر 7 أيام','Last 7 days')],['month',L('آخر 30 يوماً','Last 30 days')]].map(o=>h('option',{value:o[0],selected:o[0]===period},o[1])));
 const csv=()=>{const rows=[['name','open','completed_in_period','overdue','approvals_decided','standups'],...data.map(d=>[d.p.full_name,d.open,d.done,d.over,d.apr,d.su])];const b=new Blob(['\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});const a=h('a',{href:URL.createObjectURL(b),download:'team-report-'+period+'.csv'});document.body.append(a);a.click();a.remove();};
 const tot=data.reduce((a,d)=>({done:a.done+d.done,over:a.over+d.over,open:a.open+d.open}),{done:0,over:0,open:0});
 const kp=(n,l,c)=>h('div',{class:'card kpi '+c},h('div',{class:'n'},n),h('div',{class:'l'},l));
 v.append(h('div',{class:'row',style:{marginBottom:'14px'}},h('h2',{style:{margin:0}},L('التقارير والمراجعات','Reports & reviews')),h('span',{style:{flex:1}}),sel,h('button',{class:'btn ghost',onclick:csv},'⬇ CSV'),h('button',{class:'btn ghost',onclick:()=>window.print()},'🖨')));
 v.append(h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'14px',marginBottom:'16px'}},kp(tot.done,L('مهام أُنجزت','Tasks completed'),'k3'),kp(tot.open,L('مهام مفتوحة','Open tasks'),'k1'),kp(tot.over,L('متأخرة','Overdue'),'k2')));
 v.append(h('div',{class:'card',style:{overflowX:'auto'}},h('table',{class:'tbl',style:{width:'100%',borderCollapse:'collapse'}},h('thead',{},h('tr',{},[L('الموظف','Employee'),L('مفتوحة','Open'),L('أُنجزت','Done'),L('متأخرة','Overdue'),L('قرارات اعتماد','Approvals'),L('تحديثات يومية','Standups')].map(x=>h('th',{style:{textAlign:'start',padding:'8px'}},x)))),
  h('tbody',{},data.map(d=>h('tr',{style:{borderTop:'1px solid #e5eefb'}},h('td',{style:{padding:'8px'}},h('div',{class:'row'},avatar(d.p,'sm'),d.p.full_name)),[d.open,d.done,d.over,d.apr,d.su].map((x,i)=>h('td',{style:{padding:'8px',color:i===2&&x?'#b91c1c':''}},x)))))),
  h('p',{class:'sm mut'},L('الأرقام من سجلات النظام. إنجاز المهمة داخل التطبيق ليس إثباتاً لتنفيذ العملية الفعلية.','Figures come from system records. A task marked done is not proof the real-world operation happened.'))));
}
async function viewAnalytics(v){
 const steps=await q(sb.from('approvals').select('created_at,decided_at,status'));
 const T=S.tasks,done=T.filter(x=>x.status==='completed'),over=T.filter(isOverdue);
 const dec=steps.filter(a=>a.decided_at);const avgH=dec.length?(dec.reduce((s,a)=>s+(new Date(a.decided_at)-new Date(a.created_at)),0)/dec.length/3600000):0;
 const kp=(n,l,c)=>h('div',{class:'card kpi '+c},h('div',{class:'n'},n),h('div',{class:'l'},l));
 const bars=(title,items)=>{const mx=Math.max(1,...items.map(i=>i[1]));return h('div',{class:'card'},h('h3',{style:{marginTop:0}},title),items.length?items.map(i=>h('div',{style:{margin:'8px 0'}},h('div',{class:'row sm'},h('span',{},i[0]),h('span',{style:{flex:1}}),h('b',{},i[2]||i[1])),h('div',{style:{background:'#e8f0fb',borderRadius:'8px',height:'10px'}},h('div',{style:{width:Math.round(i[1]/mx*100)+'%',height:'10px',borderRadius:'8px',background:'linear-gradient(90deg,#3b82f6,#d4a017)'}})))):h('div',{class:'mut'},'-'));};
 const stat={};T.forEach(x=>stat[x.status]=(stat[x.status]||0)+1);
 const byDept=S.depts.map(d=>{const t=T.filter(x=>x.department_id===d.id);return[(S.lang==='ar'&&d.name_ar?d.name_ar:d.name),t.length?Math.round(t.filter(x=>x.status==='completed').length/t.length*100):0,t.length?Math.round(t.filter(x=>x.status==='completed').length/t.length*100)+'% ('+t.length+')':'-'];}).filter(x=>x[2]!=='-');
 const byEmp=[...S.profiles.values()].filter(p=>p.status==='active').map(p=>[p.full_name,T.filter(x=>x.status==='completed'&&x.task_assignees.some(a=>a.user_id===p.id)).length]).sort((a,b)=>b[1]-a[1]).slice(0,8);
 v.append(h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'14px',marginBottom:'16px'}},kp(T.length,L('إجمالي المهام','Total tasks'),'k1'),kp(T.length?Math.round(done.length/T.length*100)+'%':'-',L('نسبة الإنجاز','Completion rate'),'k3'),kp(over.length,L('متأخرة','Overdue'),'k2'),kp(dec.length?avgH.toFixed(1)+L(' س',' h'):'-',L('متوسط زمن الاعتماد','Avg approval time'),'k4')));
 v.append(h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'14px'}},bars(L('المهام حسب الحالة','Tasks by status'),Object.entries(stat).map(([k,n])=>[({not_started:L('لم تبدأ','Not started'),in_progress:L('قيد التنفيذ','In progress'),pending_review:L('بانتظار المراجعة','Pending review'),completed:L('مكتملة','Completed'),rejected:L('مرفوضة','Rejected')})[k]||k,n])),bars(L('نسبة الإنجاز حسب الإدارة','Completion by department'),byDept),bars(L('الأكثر إنجازاً','Top completers'),byEmp)));
}

async function viewFeed(v){
 const rows=await q(sb.from('activity_log').select('*').in('kind',['employee_update','manager_review']).order('created_at',{ascending:false}).limit(100));
 const ta=h('textarea',{rows:3,class:'inp',placeholder:L('شارك تحديثاً عن عملك...','Share a work update...')});
 const kindSel=h('select',{class:'inp',style:{width:'auto'}},h('option',{value:'employee_update'},L('تحديث موظف','Employee update')),isMgr()?h('option',{value:'manager_review'},L('مراجعة مدير','Manager review')):null);
 const tgt=h('select',{class:'inp',style:{width:'auto'}},userOpts().map(p=>h('option',{value:p.id},p.full_name)));tgt.style.display='none';
 kindSel.onchange=()=>{tgt.style.display=kindSel.value==='manager_review'?'':'none';};
 v.append(h('div',{class:'card',style:{marginBottom:'16px'}},ta,h('div',{class:'row',style:{marginTop:'8px'}},kindSel,tgt,h('span',{style:{flex:1}}),h('button',{class:'btn',onclick:async e=>{e.target.disabled=true;try{await q(sb.rpc('post_feed',{p_kind:kindSel.value,p_body:ta.value,p_target:kindSel.value==='manager_review'?tgt.value:null}));toast(L('تم النشر','Posted'));route();}catch(x){err(x);e.target.disabled=false;}}},L('نشر','Post'))),
  h('p',{class:'sm mut'},L('منشورات الموظفين ليست دليلاً على تنفيذ العملية. الدليل هو سجل العملية والموافقات والمستندات.','Posts are not proof an operation happened. Proof is the transaction record, approvals and documents.'))));
 if(!rows.length){v.append(empty('📰','لا توجد منشورات','No posts yet'));return;}
 v.append(h('div',{style:{display:'grid',gap:'12px'}},rows.map(r=>{const rev=r.kind==='manager_review';const tg=r.new_value&&r.new_value.target;return h('div',{class:'card',style:{borderInlineStart:'4px solid '+(rev?'#d4a017':'#3b82f6')}},
  h('div',{class:'row'},avatar(P(r.actor_id),'sm'),h('b',{},r.actor_name||''),pill(rev?L('مراجعة مدير','Manager review'):L('تحديث موظف','Employee update'),rev?'warn':''),rev&&tg?h('span',{class:'sm'},'→ '+P(tg).full_name):null,h('span',{style:{flex:1}}),h('span',{class:'sm mut'},fmtDT(r.created_at))),
  h('div',{style:{marginTop:'8px',whiteSpace:'pre-wrap'}},r.action));})));
}

async function viewAI(v){
 const box=h('div',{class:'card',style:{minHeight:'320px',marginBottom:'12px',display:'flex',flexDirection:'column',gap:'10px'}});
 const inp=h('input',{class:'inp',placeholder:L('اسأل عن المهام، العمليات، الموافقات...','Ask about tasks, transactions, approvals...')});
 const add=(txt,me)=>{const b=h('div',{style:{alignSelf:me?'flex-end':'flex-start',maxWidth:'85%',padding:'10px 14px',borderRadius:'14px',background:me?'#2563eb':'#eef4ff',color:me?'#fff':'#0f2a5c',whiteSpace:'pre-wrap'}},txt);box.append(b);box.scrollTop=box.scrollHeight;return b;};
 add(L('أنا مساعد الفريق. أجيب فقط من بيانات مساحة العمل التي تراها أنت، ولا أنفذ أي إجراء.','I am the team assistant. I answer only from workspace data you can see, and I cannot take any action.'),false);
 const ask=async(qs)=>{qs=(qs||inp.value).trim();if(!qs)return;inp.value='';add(qs,true);const w=add('…',false);try{const {data:{session}}=await sb.auth.getSession();const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({question:qs,lang:S.lang})});const j=await r.json();w.textContent=r.ok?j.answer:(j.error||'Error');}catch(e){w.textContent=String(e.message||e);}};
 inp.addEventListener('keydown',e=>{if(e.key==='Enter')ask();});
 const sugg=[[L('لخّص حالة العمليات','Summarize transaction status'),0],[L('ما الموافقات المعلقة ومن المسؤول؟','Which approvals are pending and with whom?'),0],[L('ما المهام المتأخرة؟','Which tasks are overdue?'),0],[L('من لم يرسل تحديثه اليومي؟','Who has not sent a daily update?'),0]];
 v.append(box,h('div',{class:'row',style:{flexWrap:'wrap',marginBottom:'10px'}},sugg.map(s=>h('button',{class:'btn ghost sm',onclick:()=>ask(s[0])},s[0]))),h('div',{class:'row'},inp,h('button',{class:'btn',onclick:()=>ask()},L('إرسال','Send'))),h('p',{class:'sm mut'},L('المساعد للقراءة والتلخيص فقط. الرسائل والتحديثات ليست دليلاً على تنفيذ عملية.','Read and summarize only. Messages and updates are not proof an operation happened.')));
}


/* ------------ PUSH ------------ */
const b64u=s=>{const p='='.repeat((4-s.length%4)%4);const r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)));};
const pushOK=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='open')go(e.data.link);});}
async function pushState(){if(!pushOK())return 'unsupported';if(Notification.permission==='denied')return 'denied';const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();return s&&Notification.permission==='granted'?'on':'off';}
async function pushEnable(){
 const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error(L('لم يتم السماح بالإشعارات','Notification permission was not granted'));
 const reg=await navigator.serviceWorker.ready;let s=await reg.pushManager.getSubscription();
 if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(window.VAPID_PUBLIC)});
 const j=s.toJSON();await sb.from('push_subscriptions').delete().eq('endpoint',j.endpoint);
 await q(sb.from('push_subscriptions').insert({user_id:S.me.id,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,ua:navigator.userAgent.slice(0,200)}));
}
async function pushDisable(){const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();if(s){await sb.from('push_subscriptions').delete().eq('endpoint',s.endpoint);await s.unsubscribe();}}
function pushModal(){
 const body=h('div',{});const m=modal([h('h2',{},'📲 '+L('إشعارات الهاتف','Phone notifications')),body]);
 const draw=async()=>{body.innerHTML='';const st=await pushState();
  const ios=isIOS()&&!standalone();
  if(ios&&st==='unsupported'){body.append(h('p',{},L('على الآيفون: افتح الموقع في Safari، اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"، ثم افتح التطبيق من الأيقونة وفعّل الإشعارات من هنا. (يتطلب iOS 16.4 أو أحدث)','On iPhone: open this site in Safari, tap Share, then "Add to Home Screen", open the app from its icon, then enable notifications here. (Requires iOS 16.4 or later)')));return;}
  if(st==='unsupported'){body.append(h('p',{},L('هذا المتصفح لا يدعم الإشعارات الفورية.','This browser does not support push notifications.')));return;}
  if(st==='denied'){body.append(h('p',{},L('الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح.','Notifications are blocked for this site. Allow them in browser settings.')));return;}
  body.append(h('p',{},st==='on'?L('✅ الإشعارات مفعّلة على هذا الجهاز. تصلك حتى والتطبيق مغلق.','✅ Notifications are on for this device. They arrive even when the app is closed.'):L('فعّل الإشعارات لتصلك الرسائل المباشرة والإشارات والموافقات والمهام والإعلانات على هاتفك.','Turn on notifications for direct messages, mentions, approvals, tasks and announcements.')),
   h('p',{class:'sm mut'},L('تصلك فقط الإشعارات الخاصة بك حسب صلاحياتك.','You only get notifications addressed to you, within your permissions.')));
  if(st==='on')body.append(h('div',{class:'row'},h('button',{class:'btn',onclick:async()=>{try{await q(sb.rpc('push_test'));toast(L('أُرسل إشعار تجريبي','Test notification sent'));}catch(e){err(e);}}},L('إشعار تجريبي','Send test')),h('button',{class:'btn ghost',onclick:async()=>{await pushDisable();draw();}},L('إيقاف','Turn off'))));
  else body.append(h('button',{class:'btn',onclick:async()=>{try{await pushEnable();toast(L('تم التفعيل','Enabled'));draw();}catch(e){err(e);}}},L('تفعيل الإشعارات','Enable notifications')));
 };draw();
}

if(/type=recovery/.test(location.hash+location.search)){sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY')renderReset();});setTimeout(()=>{if(!document.querySelector('.auth'))renderReset();},1500);}else sb.auth.getSession().then(({data:{session}})=>{if(session)start().catch(e=>{console.error(e);renderAuth();});else renderAuth();});
window.TW={S,sb};

/* ------------ DASHBOARD CHARTS (Chart.js, MIT) ------------ */
let _cjP=null;function loadChartJs(){if(window.Chart)return Promise.resolve();return _cjP||(_cjP=new Promise((ok,no)=>{const s=document.createElement('script');s.src='assets/chart.umd.js';s.onload=ok;s.onerror=no;document.head.append(s);}));}
const CPAL=['#1d63d8','#3b82f6','#c9a227','#16a34a','#f97316','#8b5cf6','#ef4444','#06b6d4','#64748b'];
const TSL={not_started:['لم تبدأ','Not started'],in_progress:['قيد التنفيذ','In progress'],pending_review:['بانتظار المراجعة','Pending review'],waiting_info:['بانتظار معلومات','Waiting info'],blocked:['متوقفة','Blocked'],completed:['مكتملة','Completed'],rejected:['مرفوضة','Rejected']};
const TPL={low:['منخفضة','Low'],medium:['متوسطة','Medium'],high:['عالية','High'],urgent:['عاجلة','Urgent']};
const APL={pending:['معلقة','Pending'],approved:['موافق عليها','Approved'],rejected:['مرفوضة','Rejected'],cancelled:['ملغاة','Cancelled'],escalated:['مصعّدة','Escalated']};
async function dashCharts(v){
 await loadChartJs();const ar=S.lang==='ar';
 const F=S.dashF||(S.dashF={range:30,dept:'',pri:''});
 const allTasks=S.tasks.filter(x=>!x.parent_id);
 const since=new Date(Date.now()-F.range*864e5).toISOString();
 const [txsAll,aprAll,msgsAll]=await Promise.all([q(sb.from('transactions').select('status,type,created_at,created_by')).catch(()=>[]),q(sb.from('approvals').select('status,created_at')).catch(()=>[]),q(sb.from('messages').select('created_at,sender_id').is('deleted_at',null).gte('created_at',new Date(Date.now()-90*864e5).toISOString()).limit(5000)).catch(()=>[])]);
 const demoIds=new Set([...S.profiles.values()].filter(p=>p.is_demo).map(p=>p.id));
 const demoTag=(rows,f)=>{if(!demoIds.size||!rows.length)return null;const n=rows.filter(r=>demoIds.has(r[f])).length;return n===0?null:(n===rows.length?L('بيانات تجريبية','Demo data'):L('تتضمن بيانات تجريبية','Includes demo data'));};
 const dl=d=>new Date(d+'T12:00:00').toLocaleDateString(loc(),{day:'numeric',month:'short'});
 const grp=(rows,f)=>{const m={};rows.forEach(r=>{const k=r[f]||'-';m[k]=(m[k]||0)+1;});return m;};
 const lbl=(m,k)=>L(...(m[k]||[k,k]));
 const bar=(c)=>({backgroundColor:c,borderRadius:6,borderSkipped:false,maxBarThickness:38});
 const go=(hash,pre)=>{S.pre=pre||null;if(location.hash==='#/'+hash)route();else location.hash='#/'+hash;};
 const sec=h('div',{style:{marginTop:'16px'}});const grid=h('div',{class:'grid g3 charts'});const charts=[];
 const sel=(key,opts,ph)=>{const s=h('select',{onchange:e=>{F[key]=key==='range'?Number(e.target.value):e.target.value;draw();}},ph?h('option',{value:''},ph):null,opts.map(o=>h('option',{value:o[0],selected:String(o[0])===String(F[key])},o[1])));return s;};
 const bar2=h('div',{class:'toolbar chartfilters'},
  h('span',{class:'sechd2'},ico('chart-column',18),L('رسوم بيانية من بيانات مساحة العمل','Charts from your workspace data')),h('span',{class:'sp'}),
  sel('range',[[7,L('آخر 7 أيام','Last 7 days')],[14,L('آخر 14 يوم','Last 14 days')],[30,L('آخر 30 يوم','Last 30 days')],[90,L('آخر 90 يوم','Last 90 days')]]),
  sel('dept',S.depts.map(d=>[d.id,deptName(d.id)]),L('كل الإدارات','All departments')),
  sel('pri',PRIOS.map(p=>[p,lbl(TPL,p)]),L('كل الأولويات','All priorities')),
  h('button',{class:'btn ghost sm',onclick:()=>{F.range=30;F.dept='';F.pri='';bar2.querySelectorAll('select').forEach((x,i)=>{x.value=['30','',''][i];});draw();}},L('إعادة ضبط','Reset')));
 sec.append(bar2,h('div',{class:'mut sm',style:{margin:'-4px 0 10px'}},L('اضغط على أي شريحة أو عمود أو نقطة لفتح القائمة المطابقة. تؤثر المرشحات على كل الرسوم.','Click any slice, bar or point to open the matching list. Filters apply to every chart.')),grid);
 const mk=(title,type,labels,sets,tag,opt={})=>{const cv=h('canvas');const has=labels.length&&sets.some(x=>x.data.some(y=>y>0));
  const card=h('div',{class:'card chartcard'},h('h3',{},title,h('span',{class:'sp'}),tag?h('span',{class:'demotag'},tag):null),has?h('div',{class:'chartbox'},cv):h('div',{class:'empty'},L('لا توجد بيانات لهذه المرشحات','No data for these filters')));
  if(has)setTimeout(()=>{if(!cv.isConnected)return;const circ=['doughnut','pie','polarArea'].includes(type);const hz=opt.horizontal;
   const ch=new Chart(cv,{type,data:{labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,indexAxis:hz?'y':'x',animation:{duration:700,easing:'easeOutQuart'},interaction:{mode:circ?'nearest':'nearest',intersect:true},
    onHover:(e,els)=>{e.native.target.style.cursor=opt.click&&els.length?'pointer':'default';},
    onClick:(e,els)=>{if(opt.click&&els.length)opt.click(els[0].index,els[0].datasetIndex);},
    plugins:{legend:{display:circ||sets.length>1,position:'bottom',rtl:ar,textDirection:ar?'rtl':'ltr',labels:{boxWidth:12,usePointStyle:true,font:{family:'inherit'}}},
     tooltip:{rtl:ar,textDirection:ar?'rtl':'ltr',callbacks:{label:c=>{const v=c.parsed.r!==undefined?c.parsed.r:(c.parsed.y!==undefined&&!hz?c.parsed.y:(c.parsed.x!==undefined&&hz?c.parsed.x:c.parsed));if(circ){const tot=c.dataset.data.reduce((a,b)=>a+b,0);return ' '+c.label+': '+v+' ('+Math.round(v/tot*100)+'%)';}return ' '+(c.dataset.label?c.dataset.label+': ':'')+v;},footer:()=>opt.click?L('اضغط للتفاصيل','Click for details'):''}}},
    scales:circ?(type==='polarArea'?{r:{ticks:{precision:0,backdropColor:'transparent'}}}:{}):{x:{reverse:ar&&!hz,grid:{display:false},ticks:{font:{family:'inherit'},precision:0,maxRotation:0,autoSkip:true}},y:{position:ar&&!hz?'right':'left',beginAtZero:true,grid:{color:'#eef3fb'},ticks:{precision:0,font:{family:'inherit'}}}},
    cutout:type==='doughnut'?'62%':undefined}});charts.push(ch);},0);
  return card;};
 function draw(){
  charts.splice(0).forEach(c=>c.destroy());grid.innerHTML='';
  const inR=r=>r.created_at>=since;
  const tasks=allTasks.filter(x=>inR(x)&&(!F.dept||x.department_id===F.dept)&&(!F.pri||x.priority===F.pri));
  const txs=txsAll.filter(inR),apr=aprAll.filter(inR),msgs=msgsAll.filter(inR);
  const nd=n=>[...Array(n)].map((_,i)=>new Date(Date.now()-(n-1-i)*864e5).toISOString().slice(0,10));
  const dA=nd(Math.min(F.range,30)),dB=nd(Math.min(F.range,14)),dC=nd(Math.min(F.range,14));
  const st=grp(tasks,'status'),pr=grp(tasks,'priority');const stK=Object.keys(st);
  const dept=S.depts.map(d=>({id:d.id,n:(ar&&d.name_ar?d.name_ar:d.name),c:tasks.filter(x=>x.department_id===d.id).length})).filter(x=>x.c>0);
  const open=tasks.filter(x=>!['completed','rejected'].includes(x.status));
  const load=[...S.profiles.values()].map(p=>({id:p.id,n:p.full_name.split(' ')[0],c:open.filter(x=>x.task_assignees.some(a=>a.user_id===p.id)).length})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c).slice(0,8);
  const ed=S.depts.filter(d=>!F.dept||d.id===F.dept).map(d=>({id:d.id,n:(ar&&d.name_ar?d.name_ar:d.name),c:[...S.profiles.values()].filter(p=>p.department_id===d.id&&p.status==='active').length})).filter(x=>x.c>0);
  const ts=grp(txs,'status'),tt=grp(txs,'type'),as=grp(apr,'status');const tsK=Object.keys(ts),ttK=Object.keys(tt);
  const dayCnt=(rows,field,days)=>days.map(d=>rows.filter(x=>x[field]&&x[field].slice(0,10)===d).length);
  const toTasks=pre=>go('tasks/team',{tasks:pre});
  grid.append(
   mk(L('المهام حسب الحالة','Tasks by status'),'doughnut',stK.map(k=>lbl(TSL,k)),[{data:stK.map(k=>st[k]),backgroundColor:CPAL,borderWidth:2}],demoTag(tasks,'created_by'),{click:i=>toTasks({st:stK[i],dept:F.dept,pri:F.pri})}),
   mk(L('المهام حسب الأولوية','Tasks by priority'),'bar',PRIOS.map(k=>lbl(TPL,k)),[{label:L('المهام','Tasks'),data:PRIOS.map(k=>pr[k]||0),...bar(['#94a3b8','#3b82f6','#f97316','#ef4444'])}],demoTag(tasks,'created_by'),{click:i=>toTasks({pri:PRIOS[i],dept:F.dept})}),
   mk(L('المهام المنجزة','Tasks completed'),'line',dA.map(dl),[{label:L('منجزة','Completed'),data:dayCnt(tasks,'completed_at',dA),borderColor:'#1d63d8',backgroundColor:'rgba(29,99,216,.12)',fill:true,tension:.35,pointRadius:4,pointHoverRadius:7}],demoTag(tasks,'created_by'),{click:()=>toTasks({st:'completed',dept:F.dept,pri:F.pri})}),
   mk(L('المنشأة مقابل المنجزة','Created vs completed'),'bar',dB.map(dl),[{label:L('منشأة','Created'),data:dayCnt(tasks,'created_at',dB),...bar('#3b82f6')},{label:L('منجزة','Completed'),data:dayCnt(tasks,'completed_at',dB),...bar('#c9a227')}],demoTag(tasks,'created_by'),{click:(i,di)=>toTasks(di===1?{st:'completed',dept:F.dept,pri:F.pri}:{dept:F.dept,pri:F.pri})}),
   mk(L('المهام حسب الإدارة','Tasks by department'),'bar',dept.map(x=>x.n),[{label:L('المهام','Tasks'),data:dept.map(x=>x.c),...bar('#1d63d8')}],demoTag(tasks,'created_by'),{horizontal:true,click:i=>toTasks({dept:dept[i].id,pri:F.pri})}),
   mk(L('عبء العمل المفتوح لكل موظف','Open workload per employee'),'bar',load.map(x=>x.n),[{label:L('مهام مفتوحة','Open tasks'),data:load.map(x=>x.c),...bar('#8b5cf6')}],demoTag(open,'created_by'),{horizontal:true,click:i=>toTasks({who:load[i].id,dept:F.dept,pri:F.pri})}),
   mk(L('الموظفون حسب الإدارة','Employees by department'),'polarArea',ed.map(x=>x.n),[{data:ed.map(x=>x.c),backgroundColor:CPAL.map(c=>c+'cc')}],demoIds.size?L('تتضمن بيانات تجريبية','Includes demo data'):null,{click:i=>go('directory',{dir:ed[i].id})}),
   mk(L('العمليات حسب الحالة','Operations by status'),'pie',tsK.map(k=>lbl(TXS,k)),[{data:tsK.map(k=>ts[k]),backgroundColor:CPAL,borderWidth:2}],demoTag(txs,'created_by'),{click:i=>go('transactions',{tx:{st:tsK[i]}})}),
   mk(L('العمليات حسب النوع','Operations by type'),'bar',ttK.map(k=>lbl(TXT,k)),[{label:L('العمليات','Operations'),data:ttK.map(k=>tt[k]),...bar('#16a34a')}],demoTag(txs,'created_by'),{click:i=>go('transactions',{tx:{ty:ttK[i]}})}),
   mk(L('الموافقات حسب الحالة','Approvals by status'),'doughnut',Object.keys(as).map(k=>lbl(APL,k)),[{data:Object.values(as),backgroundColor:['#f97316','#16a34a','#ef4444','#94a3b8','#8b5cf6'],borderWidth:2}],null,{click:()=>go('approvals',{apr:1})}),
   mk(L('الرسائل','Messages'),'line',dC.map(dl),[{label:L('رسائل','Messages'),data:dayCnt(msgs,'created_at',dC),borderColor:'#c9a227',backgroundColor:'rgba(201,162,39,.15)',fill:true,tension:.35,pointRadius:4,pointHoverRadius:7}],demoTag(msgs,'sender_id'),{click:()=>go('chat')}));
 }
 draw();
 const ref=v.children[3];ref?v.insertBefore(sec,ref):v.append(sec);
}
})();
