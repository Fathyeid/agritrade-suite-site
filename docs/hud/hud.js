/* Command Center HUD. Two modes: ?mode=suite (all 8 programs) and ?mode=trading (the chart platform).
   Real data: suite -> Hub.load (portal hub.js, same Supabase session) + a few extra reads; trading -> the chart's saved workspace
   (localStorage gct_v1: watchlist, alerts, paper account, journal) + prices from /chart/api/chart.
   Demo: "TEST data" generates a realistic year in the browser only. Nothing is written anywhere. */
(()=>{
const Q=new URLSearchParams(location.search),$=s=>document.querySelector(s);
let MODE=Q.get('mode')==='trading'?'trading':'suite',LANG=(localStorage.getItem('lang')==='en'?'en':'ar'),DEMO=sessionStorage.getItem('hud_demo')==='1';
const TX={ar:{suiteT:'Agritrade Pro',suiteS:'مركز القيادة',trT:'Agritrade Pro',trS:'مركز البورصة',mode:'⇄ مركز البورصة',mode2:'⇄ مركز المنصة',demo:'بيانات تجريبية TEST',demoOn:'✓ بيانات تجريبية TEST',lang:'EN',back:'↩ رجوع',
  loading:'جارٍ قراءة البيانات…',signin:'سجّل الدخول للمنصة أولاً لقراءة بياناتك',noData:'لا توجد بيانات كافية بعد',tryDemo:'اعرض ببيانات تجريبية (TEST)',open:'افتح',events:'الأحداث',testNote:'بيانات تجريبية TEST مولّدة على جهازك فقط، لا تُحفظ في أي مكان'},
 en:{suiteT:'Agritrade Pro',suiteS:'Command center',trT:'Agritrade Pro',trS:'Trading center',mode:'⇄ Trading center',mode2:'⇄ Suite center',demo:'TEST data',demoOn:'✓ TEST data',lang:'ع',back:'↩ Back',
  loading:'Reading data…',signin:'Sign in to the portal first to read your data',noData:'Not enough data yet',tryDemo:'Show with TEST data',open:'Open',events:'events',testNote:'TEST data generated in this browser only, saved nowhere'}};
const t=k=>TX[LANG][k];const AR=()=>LANG==='ar';const L=(a,e)=>AR()?a:e;
const MON={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']};
const DAY=864e5,NOW=Date.now(),START=NOW-365*DAY;
const fmtN=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1e6?(v/1e6).toFixed(1)+'M':Math.abs(v)>=1e4?(v/1e3).toFixed(1)+'K':Math.round(v).toLocaleString('en-US');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const go=link=>{if(!link)return;const url=link.startsWith('/')?link:'/#/'+link;try{if(window.top!==window)window.top.location.href=url;else location.href=url}catch(e){location.href=url}};
const PROG={iom:['IOM','العمليات'],team:['Team','فريق العمل'],grain:['Grain','الحبوب'],dispute:['Dispute','النزاعات'],inst:['Institutions','المؤسسات'],feed:['Feed','الأعلاف'],poultry:['Poultry','الدواجن'],chart:['Chart','الشارت']};
const pn=k=>(PROG[k]||[k,k])[AR()?1:0];

/* =============================== DEMO DATA (TEST, browser only) =============================== */
function demoSuite(){const r=rng(20261127),ev=[],progs=Object.keys(PROG),w={iom:.2,team:.22,grain:.12,dispute:.05,inst:.04,feed:.12,poultry:.2,chart:.05};
 const pick=()=>{let x=r(),a=0;for(const k of progs){a+=w[k];if(x<=a)return k}return 'team'};
 const act={iom:[L('استلام شحنة صويا','Soybean cargo received'),L('أمر بيع كسب','Meal sales order'),L('فاتورة عميل','Customer invoice')],team:[L('مهمة جديدة','New task'),L('موافقة','Approval'),L('تسليم عمل','Handover')],grain:[L('قراءة حرارة صومعة','Silo temperature reading'),L('دفعة مخزنة','Lot stored'),L('تنبيه رطوبة','Moisture alert')],
  dispute:[L('نزاع جودة','Quality dispute'),L('مطالبة','Claim filed')],inst:[L('مراجعة قاعدة','Rule reviewed')],feed:[L('دفعة علف FB','Feed batch FB'),L('تركيبة بادئ','Starter formula')],poultry:[L('سجل يومي','Daily record'),L('بيع طيور','Bird sale'),L('تحصين','Vaccination')],chart:[L('تنبيه سعر','Price alert')]};
 for(let i=0;i<950;i++){const k=pick(),day=Math.floor(Math.pow(r(),.75)*365),hh=r()<.6?8+Math.floor(r()*4):6+Math.floor(r()*14),dd=new Date(NOW-day*DAY);dd.setHours(hh,Math.floor(r()*60),0,0);let tm=dd.getTime();if(tm>NOW)tm-=DAY;
  const v=Math.min(1,.08+Math.pow(r(),2.6)*(k==='iom'?1:.75)),lab=act[k][Math.floor(r()*act[k].length)];ev.push({t:tm,v,c:k,label:'TEST · '+lab+' · '+pn(k),go:k,red:k==='grain'&&r()<.08||k==='dispute'&&r()<.3})}
 return suiteModel(ev,{demo:true,counts:{receipts:182,sales:96,flocks:3,disputes:5,tasks:23,approvals:7,drafts:4,openBatches:2,stale:2},clients:[['TEST Cairo Feed',38],['TEST Delta Poultry',27],['TEST Misr Mills',19],['TEST Nile Agro',11]],
  files:[[L('استلام RCV-0184 مسودة','RCV-0184 draft receipt'),L('منذ ٣ أيام','3 days')],[L('دفعة علف FB-1121 مفتوحة','FB-1121 open batch'),L('منذ يومين','2 days')],[L('نزاع DC-007 بدون تحديث','DC-007 no update'),L('منذ ١٤ يوم','14 days')],[L('٧ موافقات معلّقة','7 pending approvals'),L('اليوم','today')]],
  stock:[[L('قمح','Wheat'),12400],[L('ذرة','Corn'),9800],[L('صويا','Soybeans'),6100],[L('كسب','Meal'),2300]]})}
function demoTrading(){const r=rng(777),syms=[['GC=F',L('الذهب','Gold')],['SI=F',L('الفضة','Silver')],['CL=F',L('البترول','Crude')],['ZS=F',L('الصويا','Soybeans')],['ZC=F',L('الذرة','Corn')],['ZW=F',L('القمح','Wheat')],['ES=F','S&P 500'],['EURUSD=X','EUR/USD'],['BTC-USD','Bitcoin'],['NG=F',L('الغاز','Nat gas')]];
 const mk={};syms.forEach(([s,n],j)=>{let p=100;const b=[];const dr=(r()-.45)*.0012,vol=.008+r()*.02;for(let i=0;i<260;i++){const z=(r()+r()+r()-1.5)*1.6;p*=1+dr+vol*z*(r()<.04?2.6:1);b.push({t:NOW-(259-i)*DAY*1.4,c:p})}mk[s]={n,b}});
 const alerts=[['GC=F',L('السعر فوق ٢٧٠٠','price above 2700')],['ZS=F',L('RSI تحت ٣٠','RSI below 30')],['BTC-USD',L('اختراق ٢٠ يوم','20-day breakout')],['CL=F',L('تقاطع متوسطات','MA cross')]];
 const paper={start:100000,closed:[...Array(14)].map((_,i)=>({sym:syms[i%syms.length][0],dir:r()<.6?'Long':'Short',qty:1,entry:100,exit:100*(1+(r()-.42)*.08),mult:1000,fees:5,d1:new Date(NOW-(14-i)*9*DAY).toISOString().slice(0,10)}))};
 return tradingModel(mk,{demo:true,alerts,alertLog:alerts.slice(0,3).map((a,i)=>new Date(NOW-i*5*DAY).toLocaleDateString()+' · TEST '+a[0]+' '+a[1]),paper,journal:paper.closed.slice(-6)})}

/* =============================== REAL DATA =============================== */
let SB=null;function sb(){if(!SB&&window.supabase&&window.PORTAL_CFG)SB=supabase.createClient(PORTAL_CFG.url,PORTAL_CFG.anon,{auth:{persistSession:true,autoRefreshToken:true}});return SB}
const dt=x=>{const v=Date.parse(x);return isFinite(v)?v:null};
async function realSuite(){const c=sb();if(!c||!window.Hub)return {err:'noData'};const {data:{session}}=await c.auth.getSession();if(!session)return {err:'signin'};
 const d=await Hub.load(c),ev=[],i=d.iom||{},push=(tm,v,k,label,go,red)=>{if(tm&&tm>=START&&tm<=NOW+DAY)ev.push({t:tm,v,c:k,label,go:go||k,red:!!red})};
 const mxR=Math.max(1,...(i.receipts||[]).map(x=>+x.rec||+x.dis||0)),mxS=Math.max(1,...(i.sales||[]).map(x=>(+x.qty||0)*(+x.price||0)));
 (i.receipts||[]).forEach(x=>push(dt(x.date),.2+.8*(+x.rec||+x.dis||0)/mxR,'iom',(x.ref||'')+' · '+(x.supplier||'')+' · '+fmtN(+x.rec||+x.dis)+' MT','iom',x.status==='draft'));
 (i.sales||[]).forEach(x=>push(dt(x.date),.2+.8*((+x.qty||0)*(+x.price||0))/mxS,'iom',(x.ref||'')+' · '+fmtN(x.qty)+' MT','iom',x.status==='draft'));
 (i.invoices||[]).forEach(x=>push(dt(x.date),.25,'iom',(x.no||'')+' · '+fmtN(x.total)+' '+(x.cur||'')));
 ((d.feed&&d.feed.batches)||[]).forEach(b=>push(dt(b.finalAt||b.at),.2+Math.min(.8,(+b.produced||0)/50000),'feed',(b.id||'')+' · '+(b.name||''),'feed',b.status==='open'));
 (d.tasks||[]).forEach(x=>push(dt(x.due_date),.25,'team',L('مهمة','Task')+' · '+(x.status||''),'team',x.status!=='done'&&dt(x.due_date)<NOW));
 (d.gal||[]).forEach(x=>push(dt(x.detected_at),.5,'grain',L('تنبيه ','Alert ')+(x.category||'')+' · '+(x.severity||''),'grain',true));
 const modOf=m=>{m=String(m||'').toLowerCase();return /iom|oper/.test(m)?'iom':/grain|silo/.test(m)?'grain':/disp/.test(m)?'dispute':/feed/.test(m)?'feed':/poul/.test(m)?'poultry':/inst/.test(m)?'inst':/chart/.test(m)?'chart':'team'};
 (d.act||[]).forEach(x=>push(dt(x.created_at),.18+Math.random()*.12,modOf(x.module),(x.actor_name||'')+' · '+(x.action||'')+' '+(x.ref||''),modOf(x.module)));
 try{const r=await c.from('poultry_daily').select('rec_date,feed_kg,mortality').gte('rec_date',new Date(START).toISOString().slice(0,10)).limit(3000);const mx=Math.max(1,...(r.data||[]).map(x=>+x.feed_kg||0));(r.data||[]).forEach(x=>push(dt(x.rec_date)+9*3600e3,.15+.6*(+x.feed_kg||0)/mx,'poultry',L('سجل يومي · علف ','Daily record · feed ')+fmtN(x.feed_kg)+' kg','poultry',(+x.mortality||0)>50))}catch(e){}
 try{const r=await c.from('dc_disputes').select('*').limit(500);(r.data||[]).forEach(x=>push(dt(x.registration_date||x.created_at),.55,'dispute',(x.ref_no||'')+' · '+(x.title||''),'dispute',!/closed|settled|resolved/i.test(x.status||'')))}catch(e){}
 const open=(a,f)=>a?a.filter(f).length:0,drafts=(i.receipts||[]).filter(x=>x.status==='draft').length+(i.sales||[]).filter(x=>x.status==='draft').length;
 const cl={};(i.sales||[]).forEach(s=>{const n=((i.customers||[]).find(c=>c.id===s.cust)||{}).name||'?';cl[n]=(cl[n]||0)+1});
 const stockBy={};(d.stock||[]).forEach(s=>{const lot=(d.lots||[]).find(l=>l.id===s.lot_id),gc=lot&&(d.gcom||[]).find(g=>g.id===lot.commodity_id);const n=gc?(AR()?gc.name_ar||gc.name_en:gc.name_en):'?';stockBy[n]=(stockBy[n]||0)+(+s.qty_mt||0)});
 const files=[];(i.receipts||[]).filter(x=>x.status==='draft').slice(0,2).forEach(x=>files.push([x.ref+' · '+L('استلام مسودة','draft receipt'),x.date||'']));((d.feed&&d.feed.batches)||[]).filter(b=>b.status==='open').slice(0,2).forEach(b=>files.push([b.id+' · '+L('دفعة مفتوحة','open batch'),String(b.at||'').slice(0,10)]));
 if(open(d.appr,x=>x.status==='pending'))files.push([open(d.appr,x=>x.status==='pending')+' '+L('موافقات معلّقة','pending approvals'),L('اليوم','today')]);
 return suiteModel(ev,{counts:{receipts:(i.receipts||[]).length,sales:(i.sales||[]).length,flocks:open(d.pfl,x=>!/closed/i.test(x.status||'')),disputes:open(d.disp,x=>!/closed|resolved|settled/i.test(x.status||'')),tasks:open(d.tasks,x=>!/done|completed|cancel/i.test(x.status||'')),approvals:open(d.appr,x=>x.status==='pending'),drafts,openBatches:((d.feed&&d.feed.batches)||[]).filter(b=>b.status==='open').length,stale:0},
  clients:Object.entries(cl).sort((a,b)=>b[1]-a[1]).slice(0,4),files,stock:Object.entries(stockBy).sort((a,b)=>b[1]-a[1]).slice(0,4)})}
const SYMN={ZS:['الصويا','Soybeans'],ZC:['الذرة','Corn'],ZW:['القمح','Wheat'],KE:['قمح كانساس','KC wheat'],MWE:['قمح مينيابوليس','Spring wheat'],ZM:['كسب الصويا','Soybean meal'],ZL:['زيت الصويا','Soybean oil'],ZO:['الشوفان','Oats'],ZR:['الأرز','Rough rice'],RS:['الكانولا','Canola'],CT:['القطن','Cotton'],SB:['السكر','Sugar'],KC:['البن','Coffee'],CC:['الكاكاو','Cocoa'],OJ:['عصير البرتقال','Orange juice'],LE:['الماشية الحية','Live cattle'],GF:['عجول التسمين','Feeder cattle'],HE:['الخنازير','Lean hogs'],DC:['الحليب','Milk'],LBS:['الأخشاب','Lumber'],GC:['الذهب','Gold'],SI:['الفضة','Silver'],PL:['البلاتين','Platinum'],PA:['البلاديوم','Palladium'],HG:['النحاس','Copper'],CL:['البترول','Crude oil'],BZ:['برنت','Brent'],NG:['الغاز الطبيعي','Natural gas'],HO:['الديزل','Heating oil'],RB:['البنزين','Gasoline'],ES:['S&P 500','S&P 500'],NQ:['ناسداك','Nasdaq'],YM:['داو جونز','Dow'],RTY:['راسل 2000','Russell 2000'],DX:['مؤشر الدولار','Dollar index'],ZN:['سندات 10 سنوات','10Y note'],ZB:['سندات 30 سنة','30Y bond'],'EURUSD':['اليورو/دولار','EUR/USD'],'GBPUSD':['الإسترليني/دولار','GBP/USD'],'USDJPY':['دولار/ين','USD/JPY'],'EGP':['دولار/جنيه','USD/EGP'],BTC:['بيتكوين','Bitcoin'],ETH:['إيثريوم','Ethereum'],SOL:['سولانا','Solana'],'^CASE30':['EGX 30','EGX 30'],'^GSPC':['S&P 500','S&P 500']};
function symAr(s,name){const k=s.replace(/=F$|=X$|-USD$/,'');const e=SYMN[s]||SYMN[k];if(e)return AR()?e[0]:e[1];if(name){const n=String(name).replace(/\s*Futures?.*$/i,'').replace(/,.*$/,'').trim();if(n&&n.length<24&&!AR())return n}return s.replace(/=F$|=X$/,'')}
async function realTrading(){let S={};try{S=JSON.parse(localStorage.getItem('gct_v1')||'{}')}catch(e){}
 const wl=S.wl&&S.wl.lists?(S.wl.lists[S.wl.cur]||Object.values(S.wl.lists)[0]||[]):['GC=F','SI=F','CL=F','ZS=F','ZC=F','ZW=F','ES=F','EURUSD=X','BTC-USD'];
 const syms=wl.filter(s=>typeof s==='string').slice(0,12);if(!syms.length)return {err:'noData'};const mk={};let k=0;
 await Promise.all(Array.from({length:4},async()=>{while(k<syms.length){const s=syms[k++];try{const j=await (await fetch('/chart/api/chart?symbol='+encodeURIComponent(s)+'&range=1y&interval=1d')).json();if(j.bars&&j.bars.length>30)mk[s]={n:symAr(s,j.name),b:j.bars.map(x=>({t:x.t*1000,c:x.c}))}}catch(e){}}}));
 if(!Object.keys(mk).length)return {err:'noData'};
 return tradingModel(mk,{alerts:(S.alerts||[]).filter(a=>a.on).map(a=>[a.sym||a.name||'',a.type||'']),alertLog:(S.alertLog||[]).slice(-8).reverse(),paper:S.paper||null,journal:(S.journal||[]).slice(-6)})}

/* =============================== MODELS =============================== */
function hours(ev){const h=Array(24).fill(0);ev.forEach(e=>h[new Date(e.t).getHours()]++);let best=0,bi=9;for(let i=0;i<24;i++){const s=h[i]+h[(i+1)%24]+h[(i+2)%24];if(s>best){best=s;bi=i}}return {h,from:bi,to:(bi+3)%24}}
function weekly(ev){const w=Array(52).fill(0);ev.forEach(e=>{const k=Math.floor((e.t-START)/(7*DAY));if(k>=0&&k<52)w[k]++});return w}
function heat7(ev){const g=Array.from({length:7},()=>Array(12).fill(0));ev.forEach(e=>{const d=new Date(e.t);g[d.getDay()][Math.floor(d.getHours()/2)]++});return g}
const hh=h=>AR()?(h<12?(h||12)+' ص':(h===12?12:h-12)+' م'):String(h).padStart(2,'0')+':00';
function suiteModel(ev,x){ev.sort((a,b)=>a.t-b.t);const c=x.counts,H=hours(ev),W=weekly(ev),per={};ev.forEach(e=>per[e.c]=(per[e.c]||0)+1);
 const last30={};ev.filter(e=>e.t>NOW-30*DAY).forEach(e=>last30[e.c]=(last30[e.c]||0)+1);const progs=Object.keys(PROG);const alive=progs.filter(k=>last30[k]).length;
 const months=Array(12).fill(0);ev.forEach(e=>{const m=Math.floor((e.t-START)/(365*DAY/12));if(m>=0&&m<12)months[m]++});const pk=months.indexOf(Math.max(...months)),pkM=new Date(START+pk*365*DAY/12+15*DAY).getMonth();
 const decisions=c.approvals+c.drafts+c.openBatches+(c.disputes||0),cm=new Date().getMonth();
 const verdict=[];if(c.approvals)verdict.push(L(`${c.approvals} موافقة معلّقة تنتظرك في فريق العمل.`,`${c.approvals} approvals are waiting for you in Team.`));if(c.drafts)verdict.push(L(`${c.drafts} مستند مسودة في العمليات لم يُعتمد.`,`${c.drafts} draft documents in Operations are not approved.`));if(c.openBatches)verdict.push(L(`${c.openBatches} دفعة علف مفتوحة لم تُعتمد.`,`${c.openBatches} feed batches are still open.`));if(c.disputes)verdict.push(L(`${c.disputes} نزاع مفتوح.`,`${c.disputes} disputes are open.`));
 if(!verdict.length)verdict.push(L('لا يوجد ما ينتظر قرارك الآن.','Nothing is waiting for your decision right now.'));
 return {title:t('suiteT'),sub:t('suiteS'),line:L('كل برامجك في نظرة واحدة: ما الذي يتحرك وما الذي ينتظرك','Every program at a glance: what moves and what waits for you'),lineSub:`${fmtN(ev.length)} ${L('حدث','events')} · ${L('١٢ شهراً','12 months')} · ${alive}/8 ${L('برامج نشطة','programs active')}${x.demo?' · TEST':''}`,
  stats:[[L('استلامات','RECEIPTS'),c.receipts],[L('أوامر بيع','SALES'),c.sales],[L('قطعان','FLOCKS'),c.flocks],[L('نزاعات','DISPUTES'),c.disputes],[L('قرارات','DECISIONS'),decisions]],
  stageTitle:L('Agritrade Pro · قراءة كاملة للمنصة · من ','Agritrade Pro · full-suite read · ')+MON[LANG][new Date(START).getMonth()]+' → '+MON[LANG][cm]+L(' · حلقة لكل شهر',' · one ring per month'),stageRight:`${fmtN(ev.length)} ${L('حدث','EVENTS')} · 8 ${L('برامج','PROGRAMS')} · ${decisions} ${L('قرار','DECISIONS')} ★`,
  events:ev,list:progs.map(k=>[k,pn(k),fmtN(per[k]||0),!!last30[k]]),listCap:L('كل رقم يأتي من سجل حقيقي في برنامجه','every number comes from a real record'),
  radar:{alive,dead:8-alive,dots:progs.map((k,j)=>({a:j/8*Math.PI*2,r:.35+.55*Math.min(1,(per[k]||0)/(Math.max(...Object.values(per))||1)),on:!!last30[k],n:pn(k)}))},
  focus:[[L('التركيز','FOCUS'),pn(Object.entries(last30).sort((a,b)=>b[1]-a[1])[0]?.[0]||'team')],[L('العمق','DEPTH'),(alive/8).toFixed(3)],[L('القراءة','READ'),fmtN(ev.length)+' / '+fmtN(ev.length)],[L('الوضع','MODE'),x.demo?'TEST':L('حي','live')]],
  center:{bars:progs.map(k=>({v:(last30[k]||0),n:pn(k)})),layers:Math.max(8,Math.min(40,ev.filter(e=>e.t>NOW-30*DAY).length/6|0))},
  callouts:[{t:null,pos:[.62,.42],title:L('أنشط ساعات','Sharpest hours')+' · '+hh(H.from)+'–'+hh(H.to),sub:L('أكثر وقت تُسجَّل فيه الأعمال','when most work gets recorded')},{t:null,pos:[.67,.55],title:L('متوقف هنا','Stalled here'),sub:L(`${decisions} قرار لا يتخذه غيرك`,`${decisions} decisions only you can make`),red:decisions>0,go:'team'},{t:START+pk*365*DAY/12+15*DAY,title:L('ذروة النشاط · ','Peak · ')+MON[LANG][pkM],sub:fmtN(months[pk])+' '+L('حدث','events')},ev.length?{t:ev[ev.length-1].t,title:L('آخر حدث','Latest'),sub:ev[ev.length-1].label.slice(0,40),go:ev[ev.length-1].go}:null].filter(Boolean),
  panels:[{tag:'01',title:L('البرامج · نشاط آخر ٣٠ يوم','PROGRAMS · last 30 days'),right:alive+'/8',type:'bars',data:progs.map(k=>[pn(k),(last30[k]||0),!!last30[k]]),foot:L('✓ نشط · ✕ لا نشاط خلال ٣٠ يوم','✓ active · ✕ idle for 30 days')},
   {tag:'02',title:L('نبض الأسبوع','WEEKLY PULSE'),right:'LIVE',type:'line',data:W,foot:L('أحداث كل أسبوع خلال سنة · المجموع ','events per week over a year · total ')+fmtN(ev.length)},
   {tag:'03',title:L('أنشط الساعات','SHARPEST HOURS'),right:hh(H.from)+'–'+hh(H.to),type:'heat',data:heat7(ev),foot:L('الأيام × الساعات','days × hours'),hot:true},
   {tag:'04',title:L('قرارات معلّقة','PENDING DECISIONS'),right:'DIFF',type:'big',data:[String(decisions),L('موافقات + مسودات + دفعات + نزاعات','approvals + drafts + batches + disputes')],foot:L('أصغر رقم = أفضل','smaller is better')},
   {tag:'05',title:L('أكبر العملاء','TOP CUSTOMERS'),right:(x.clients||[]).length+' '+L('عميل','HITS'),type:'list',data:(x.clients||[]).map(([n,v])=>'> '+n+' · '+v+L(' أمر',' orders')),foot:L('حسب عدد أوامر البيع','by number of sales orders')},
   {tag:'06',title:L('حكم المنصة','SUITE VERDICT'),right:'',type:'text',data:verdict.slice(0,3).join(' '),foot:L('يتحدث مع بياناتك','updates with your data'),hot:true},
   {tag:'07',title:L('في الانتظار','WAITING'),right:(x.files||[]).length?L('مفتوح','UNOPENED'):'',type:'files',data:x.files||[],foot:L('أقدم ما ينتظر إجراء','oldest items waiting')},
   {tag:'08',title:L('المخزون في الصوامع','SILO STOCK'),right:'MT',type:'bars',data:(x.stock||[]).map(([n,v])=>[n,v,true]),foot:L('طن متري حسب الصنف','metric tons by commodity')}],
  ticker:[L('أحداث','EVENTS'),...ev.slice(-6).reverse().map(e=>'› '+e.label)],foot:`${fmtN(ev.length)} ${L('عقدة','nodes')}`,demo:!!x.demo}}
function tradingModel(mk,x){const ev=[],rows=[];const names={};
 Object.entries(mk).forEach(([s,m])=>{names[s]=m.n;const b=m.b,r=b.slice(1).map((p,i)=>Math.log(p.c/b[i].c)),mu=r.reduce((a,v)=>a+v,0)/r.length,sd=Math.sqrt(r.reduce((a,v)=>a+(v-mu)**2,0)/r.length)||1e-9;
  r.forEach((v,i)=>{const z=(v-mu)/sd;if(Math.abs(z)>=1.7)ev.push({t:b[i+1].t,v:Math.min(1,Math.abs(z)/5),c:v>0?'up':'down',label:`${m.n} ${(v*100>0?'+':'')}${(v*100).toFixed(2)}% · ${new Date(b[i+1].t).toISOString().slice(0,10)}`,go:'/chart/',red:Math.abs(z)>=4,sym:s})});
  const last=b[b.length-1].c,y=b[0].c,m30=b[Math.max(0,b.length-22)].c,ma50=b.slice(-50).reduce((a,p)=>a+p.c,0)/Math.min(50,b.length);rows.push({s,n:m.n,y:(last/y-1)*100,m:(last/m30-1)*100,above:last>ma50,last})});
 ev.sort((a,b)=>a.t-b.t);rows.sort((a,b)=>b.y-a.y);const best=rows[0],worst=rows[rows.length-1];
 const P=x.paper,cl=(P&&P.closed)||[],pnl=cl.reduce((a,c)=>a+((c.dir==='Short'?-1:1)*(c.exit-c.entry)*(c.qty||1)*(c.mult||1)-(c.fees||0)),0),wins=cl.filter(c=>(c.dir==='Short'?-1:1)*(c.exit-c.entry)>0).length,pnlPct=P&&P.start?pnl/P.start*100:null;
 const big=ev.slice().sort((a,b)=>b.v-a.v)[0],W=weekly(ev),live=Object.keys(mk).filter(s=>/-USD$/.test(s)).length;
 const dow=Array.from({length:7},()=>Array(12).fill(0));Object.values(mk).forEach(m=>m.b.forEach((p,i)=>{if(!i)return;const d=new Date(p.t),mo=Math.floor(((p.t-START)/(365*DAY))*12);if(mo>=0&&mo<12)dow[d.getDay()][mo]+=Math.abs(Math.log(p.c/m.b[i-1].c))}));
 const verdict=[];if(best)verdict.push(L(`الأقوى خلال سنة: ${best.n} (${best.y>0?'+':''}${best.y.toFixed(1)}%).`,`Strongest over a year: ${best.n} (${best.y>0?'+':''}${best.y.toFixed(1)}%).`));if(worst&&worst!==best)verdict.push(L(`الأضعف: ${worst.n} (${worst.y.toFixed(1)}%).`,`Weakest: ${worst.n} (${worst.y.toFixed(1)}%).`));
 const ab=rows.filter(r=>r.above).length;verdict.push(L(`${ab} من ${rows.length} أسواق فوق متوسط ٥٠ يوم.`,`${ab} of ${rows.length} markets are above their 50-day average.`));if(cl.length)verdict.push(L(`محفظتك التجريبية ${pnl>=0?'رابحة':'خاسرة'} ${pnlPct==null?'':pnlPct.toFixed(1)+'%'} بنسبة نجاح ${(wins/cl.length*100).toFixed(0)}%.`,`Your paper account is ${pnl>=0?'up':'down'} ${pnlPct==null?'':pnlPct.toFixed(1)+'%'}, win rate ${(wins/cl.length*100).toFixed(0)}%.`));
 return {title:t('trT'),sub:t('trS'),line:L('كل أسواقك في نظرة واحدة: أين تحرك السعر بعنف وماذا تفعل الآن','All your markets at a glance: where price moved hard and what to do now'),lineSub:`${rows.length} ${L('سوق','markets')} · ${fmtN(ev.length)} ${L('حركة قوية','big moves')} · ${L('١٢ شهراً','12 months')}${x.demo?' · TEST':''}`,
  stats:[[L('أسواق','MARKETS'),rows.length],[L('حركات قوية','BIG MOVES'),ev.length],[L('تنبيهات','ALERTS'),(x.alerts||[]).length],[L('صفقات','TRADES'),cl.length],[L('ربح/خسارة','P&L'),pnlPct==null?'-':(pnlPct>0?'+':'')+pnlPct.toFixed(1)+'%']],
  stageTitle:L('قراءة كاملة لقائمتك · كل حركة أكبر من المعتاد = خط · حلقة لكل شهر','Full read of your watchlist · every unusual move = one spike · one ring per month'),stageRight:`${rows.length} ${L('سوق','MARKETS')} · ${ev.length} ${L('حركة','MOVES')} · ${live} ${L('لحظي','LIVE')} ★`,
  events:ev,list:rows.slice(0,7).map(r=>[r.y>=0?'up':'down',r.n,(r.y>0?'+':'')+r.y.toFixed(1)+'%',r.y>=0]),listCap:L('أداء سنة · من الأقوى للأضعف','1-year performance · strongest first'),
  radar:{alive:ab,dead:rows.length-ab,dots:rows.map((r,j)=>({a:j/rows.length*Math.PI*2,r:.3+.6*Math.min(1,Math.abs(r.m)/10),on:r.above,n:r.n}))},
  focus:[[L('الأقوى','LEADER'),best?best.n:'-'],[L('الأضعف','LAGGARD'),worst?worst.n:'-'],[L('حركات','MOVES'),String(ev.length)],[L('الوضع','MODE'),x.demo?'TEST':L('حي','live')]],
  center:{bars:rows.map(r=>({v:Math.max(0,r.m+10),n:r.n})),layers:Math.max(8,Math.min(40,ev.filter(e=>e.t>NOW-60*DAY).length*2))},
  callouts:[best?{t:null,pos:[.62,.42],title:L('الأقوى · ','Leader · ')+best.n,sub:(best.y>0?'+':'')+best.y.toFixed(1)+'% '+L('خلال سنة','over a year'),go:'/chart/'}:null,big?{t:big.t,title:L('أعنف حركة','Biggest move'),sub:big.label,red:true,go:'/chart/'}:null,{t:null,pos:[.67,.56],title:L('تنبيهات نشطة','Active alerts'),sub:(x.alerts||[]).length+' '+L('تنبيه يراقب السوق','alerts watching'),go:'/chart/'}].filter(Boolean),
  panels:[{tag:'01',title:L('الأسواق · أداء سنة','MARKETS · 1 year'),right:ab+'/'+rows.length,type:'bars',data:rows.map(r=>[r.n,Math.abs(r.y),r.y>=0]),foot:L('✓ صاعد · ✕ هابط خلال سنة','✓ up · ✕ down over a year')},
   {tag:'02',title:L('نبض الحركات القوية','BIG-MOVE PULSE'),right:'LIVE',type:'line',data:W,foot:L('عدد الحركات القوية كل أسبوع','big moves per week')},
   {tag:'03',title:L('خريطة التقلب','VOLATILITY MAP'),right:L('أيام × شهور','DAYS × MONTHS'),type:'heat',data:dow,foot:L('أغمق = تحرك أقل','darker = calmer'),hot:true},
   {tag:'04',title:L('المحفظة التجريبية','PAPER ACCOUNT'),right:'P&L',type:'big',data:[pnlPct==null?'—':(pnlPct>0?'+':'')+pnlPct.toFixed(1)+'%',cl.length+' '+L('صفقة · نجاح ','trades · win ')+(cl.length?(wins/cl.length*100).toFixed(0):0)+'%'],foot:L('من تبويب التداول التجريبي','from the Paper tab')},
   {tag:'05',title:L('سجل التنبيهات','ALERT LOG'),right:(x.alertLog||[]).length+' '+L('تنفيذ','HITS'),type:'list',data:(x.alertLog||[]).map(s=>'> '+s),foot:L('آخر التنبيهات المنفذة','latest fired alerts')},
   {tag:'06',title:L('حكم السوق','MARKET VERDICT'),right:'',type:'text',data:verdict.slice(0,3).join(' '),foot:L('للمعلومة فقط وليس توصية','information only, not advice'),hot:true},
   {tag:'07',title:L('آخر الصفقات','LATEST TRADES'),right:'JOURNAL',type:'files',data:(x.journal||[]).slice().reverse().map(j=>[(j.sym||'')+' · '+(j.dir||'')+' '+(j.entry!=null?(+j.entry).toFixed(2):'')+'→'+(j.exit!=null?(+j.exit).toFixed(2):'…'),j.d1||'']),foot:L('من اليوميات والتداول التجريبي','from journal and paper trading')},
   {tag:'08',title:L('فوق متوسط ٥٠','ABOVE 50-DAY MA'),right:ab+'/'+rows.length,type:'grid',data:rows.map(r=>r.above?'on':''),foot:L('أبيض = فوق المتوسط','white = above the average')}],
  ticker:[L('حركات','MOVES'),...ev.slice(-6).reverse().map(e=>'› '+e.label)],foot:`${fmtN(ev.length)} ${L('عقدة','nodes')}`,demo:!!x.demo}}

/* =============================== RENDER: header, boxes, panels =============================== */
let M=null;
function header(){document.documentElement.lang=LANG;document.documentElement.dir=AR()?'rtl':'ltr';$('#tTitle').textContent=M?M.title:'';$('#tSub').textContent=M?M.sub:'';$('#hLine').textContent=M?M.line:'';$('#hSub').textContent=M?M.lineSub:'';
 $('#hStats').innerHTML=M?M.stats.map(([k,v])=>`<div class="hs"><small>${esc(k)}</small><b>${esc(fmtN2(v))}</b></div>`).join(''):'';
 $('#bMode').textContent=MODE==='suite'?t('mode'):t('mode2');$('#bDemo').textContent=DEMO?t('demoOn'):t('demo');$('#bDemo').classList.toggle('on',DEMO);$('#bLang').textContent=t('lang');$('#bBack').textContent=t('back');$('#bBack').href=MODE==='trading'?'/#/chart':'/';
 $('#tkL').textContent=DEMO?'TEST':(M&&M.ticker?M.ticker[0]:'');$('#tk').textContent=M&&M.ticker?M.ticker.slice(1).join('   '):'';}
const fmtN2=v=>typeof v==='number'?fmtN(v):v;
function boxes(){if(!M)return;$('#sTitle').innerHTML='<i>01</i>'+esc(M.stageTitle);$('#sRight').textContent=M.stageRight;$('#sFoot').textContent=M.foot;
 $('#boxList').innerHTML=M.list.map(([k,n,v,on])=>`<div class="row"><span><i class="${on?'':'w'}"></i>${esc(n)}</span><b>${esc(v)}</b></div>`).join('')+`<div class="cap">${esc(M.listCap)}</div>`;
 const R=M.radar;$('#boxRadar').innerHTML=`<div class="rt"><span>${MODE==='suite'?'ORBIT':'RADAR'}</span><span>${R.alive}/${R.alive+R.dead}</span></div><svg viewBox="-50 -50 100 100" width="110" height="110"><circle r="46" fill="none" stroke="#3a2a1a"/><circle r="30" fill="none" stroke="#2a1f14" stroke-dasharray="2 3"/><circle r="14" fill="none" stroke="#2a1f14"/>
  ${[...Array(12)].map((_,i)=>{const a=i/12*Math.PI*2;return `<line x1="${Math.cos(a)*42}" y1="${Math.sin(a)*42}" x2="${Math.cos(a)*46}" y2="${Math.sin(a)*46}" stroke="#ff7a1a"/>`}).join('')}
  <g class="sweep"><line x1="0" y1="0" x2="0" y2="-46" stroke="#ff7a1a" stroke-width="1.2"/><path d="M0 0 L0 -46 A46 46 0 0 1 20 -41 Z" fill="rgba(255,122,26,.18)"/></g>
  ${R.dots.map(d=>`<circle cx="${Math.cos(d.a)*d.r*44}" cy="${Math.sin(d.a)*d.r*44}" r="2.4" fill="${d.on?'#ff7a1a':'#ff4040'}"><title>${esc(d.n)}</title></circle>`).join('')}</svg><div class="rt"><span>${R.alive} ${L('نشط','alive')}</span><span>${R.dead} ${L('خامل','idle')}</span></div>`;
 $('#boxFocus').innerHTML=M.focus.map(([k,v])=>`<div class="row"><span style="color:#8b8378">${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
 const P=$('#panels');P.innerHTML='';M.panels.forEach(p=>{const d=document.createElement('div');d.className='pn'+(p.hot?' hot':'');d.innerHTML=`<div class="ph"><b><i>${p.tag}</i>${esc(p.title)}</b><span>${esc(p.right||'')}</span></div><div class="pb">${panelBody(p)}</div><div class="pf">${esc(p.foot||'')}</div>`;P.appendChild(d)})}
function panelBody(p){const D=p.data||[];
 if(p.type==='bars'){if(!D.length)return `<div class="lst"><div>—</div></div>`;const mx=Math.max(...D.map(r=>r[1]))||1;return '<div class="bars">'+D.slice(0,6).map(([n,v,ok],i)=>`<div class="br"><em>${esc(n)}</em><div class="tr"><i class="${i===0?'w':''}" style="width:${Math.max(2,v/mx*100)}%"></i></div><span class="${ok?'ok':'x'}">${ok?'✓':'✕'}</span></div>`).join('')+'</div>'}
 if(p.type==='line'){const w=260,h=60,mx=Math.max(...D,1),pts=D.map((v,i)=>(i/(D.length-1||1)*w).toFixed(1)+','+(h-4-v/mx*(h-10)).toFixed(1)).join(' ');const li=D.length-1;return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="64" preserveAspectRatio="none"><polyline fill="none" stroke="#ff7a1a" stroke-width="1.6" points="${pts}"/><circle cx="${w}" cy="${h-4-D[li]/mx*(h-10)}" r="3" fill="#f3efe8"/></svg>`}
 if(p.type==='heat'){const rows=D.length,cols=(D[0]||[]).length,mx=Math.max(...D.flat(),1);return `<div class="heat" style="grid-template-columns:repeat(${cols},1fr)">`+D.flat().map(v=>{const a=v/mx;return `<i style="background:${a>.75?'#ff7a1a':a>.45?'#b8561a':a>.2?'#5a3214':'#1a140e'}"></i>`}).join('')+'</div>'}
 if(p.type==='big')return `<div class="big">${esc(D[0])}<small>${esc(D[1]||'')}</small></div>`;
 if(p.type==='list')return '<div class="lst">'+(D.length?D.slice(0,6).map((s,i)=>`<div class="${i===0?'hl':''}"><b>${esc(s)}</b></div>`).join(''):'<div>—</div>')+'</div>';
 if(p.type==='text')return `<div class="txt">${esc(D)}</div>`;
 if(p.type==='files')return '<div class="lst">'+(D.length?D.slice(0,6).map(([a,b],i)=>`<div class="${i===0?'hl':''}">${i===0?'▸ ':''}<b>${esc(a)}</b> <span>${esc(b)}</span></div>`).join(''):'<div>—</div>')+'</div>';
 if(p.type==='grid')return '<div class="grid8">'+D.map(c=>`<i class="${c}"></i>`).join('')+Array(Math.max(0,16-D.length)).fill('<i></i>').join('')+'</div>';
 return ''}

/* =============================== RENDER: the ring (canvas) =============================== */
const cv=$('#cv'),cx2=cv.getContext('2d');let W=0,H=0,DPR=1,rot=0,born=0,stars=[],hits=[],labs=[];
function size(){const r=$('#stage').getBoundingClientRect();DPR=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;cx2.setTransform(DPR,0,0,DPR,0,0);
 const rr=rng(9);stars=[...Array(Math.round(W*H/900))].map(()=>({a:rr()*Math.PI*2,r:Math.sqrt(rr())*.95,z:rr(),s:rr()*1.2+.3}))}
function geo(){const narrow=W<700;const cx=W*.5,cy=H*(narrow?.56:.55),R=Math.min(W*(narrow?.46:.4),H*(narrow?.9:1.05)),k=narrow?.36:.32,Hmax=H*(narrow?.22:.26);return {cx,cy,R,k,Hmax}}
const ang=tm=>((tm-START)/(NOW-START))*Math.PI*2-Math.PI/2;
function P(g,a,r,h){return {x:g.cx+Math.cos(a+rot)*r*g.R,y:g.cy+Math.sin(a+rot)*r*g.R*g.k-(h||0),d:Math.sin(a+rot)}}
function ellipse(g,r,col,lw,dash,a0,a1){cx2.beginPath();cx2.setLineDash(dash||[]);cx2.strokeStyle=col;cx2.lineWidth=lw||1;cx2.ellipse(g.cx,g.cy,r*g.R,r*g.R*g.k,0,a0==null?0:a0+rot,a1==null?Math.PI*2:a1+rot);cx2.stroke();cx2.setLineDash([])}
function frame(ts){if(!M){requestAnimationFrame(frame);return}if(!born)born=ts;const age=(ts-born)/1000,g=geo();rot+=0.0007;
 cx2.clearRect(0,0,W,H);
 // stars
 stars.forEach(s=>{const p=P(g,s.a,s.r,0);const tw=.35+.65*Math.abs(Math.sin(ts/1400+s.a*7));cx2.fillStyle=`rgba(243,239,232,${(.15+.35*s.z)*tw})`;cx2.fillRect(p.x,p.y-s.z*g.Hmax*.25,s.s,s.s)});
 // back rings
 ellipse(g,1.0,'rgba(255,122,26,.55)',1.2,null,Math.PI,Math.PI*2);ellipse(g,1.08,'rgba(255,122,26,.25)',1,[2,4],Math.PI,Math.PI*2);ellipse(g,.72,'rgba(243,239,232,.18)',1,[3,5]);ellipse(g,.46,'rgba(243,239,232,.14)',1);
 // month ticks + labels
 cx2.font=(W<700?'9px':'10px')+' "JetBrains Mono",monospace';for(let m=0;m<12;m++){const a=m/12*Math.PI*2-Math.PI/2,p0=P(g,a,1.0,0),p1=P(g,a,1.06,0),p2=P(g,a,1.16,0);cx2.strokeStyle='rgba(255,122,26,.6)';cx2.beginPath();cx2.moveTo(p0.x,p0.y);cx2.lineTo(p1.x,p1.y);cx2.stroke();
  const mo=new Date(START+(m+.5)*(NOW-START)/12).getMonth();cx2.fillStyle=`rgba(243,239,232,${.35+.4*(p2.d+1)/2})`;cx2.fillText(MON[LANG][mo],p2.x-10,p2.y+3)}
 // spikes: back half first
 hits=[];const ev=M.events,n=ev.length,reveal=Math.min(1,age/2.2);
 const drawSpike=(e,i)=>{if(i/n>reveal)return;const a=ang(e.t),jr=.94+((i*7919)%100)/100*.12,p=P(g,a,jr,0),h=e.v*g.Hmax*.85*(.94+.06*Math.sin(ts/900+i));const alpha=(.2+.55*(p.d+1)/2)*(.55+.45*e.v);
  const col=MODE==='trading'?(e.c==='up'?`rgba(243,239,232,${alpha})`:`rgba(255,122,26,${alpha})`):(e.v>.85?`rgba(243,239,232,${alpha})`:`rgba(255,122,26,${alpha})`);
  cx2.strokeStyle=col;cx2.lineWidth=e.v>.6?1.5:.8;cx2.beginPath();cx2.moveTo(p.x,p.y);cx2.lineTo(p.x,p.y-h);cx2.stroke();
  if(e.red){cx2.strokeStyle='rgba(255,64,64,.9)';cx2.lineWidth=1.2;const y=p.y-h-4;cx2.beginPath();cx2.moveTo(p.x-3,y-3);cx2.lineTo(p.x+3,y+3);cx2.moveTo(p.x+3,y-3);cx2.lineTo(p.x-3,y+3);cx2.stroke()}
  hits.push({x:p.x,y:p.y-h,e})};
 const order=ev.map((e,i)=>[e,i,Math.sin(ang(e.t)+rot)]);order.filter(o=>o[2]<0).forEach(o=>drawSpike(o[0],o[1]));
 // center disc + layered tower + orange blocks
 centerPiece(g,ts);
 order.filter(o=>o[2]>=0).forEach(o=>drawSpike(o[0],o[1]));
 // front rings
 ellipse(g,1.0,'rgba(255,122,26,.8)',1.4,null,0,Math.PI);ellipse(g,1.08,'rgba(255,122,26,.35)',1,[2,4],0,Math.PI);
 // big white arcs with end nodes (slower)
 [[1.22,.2,.95,.55],[1.32,1.15,2.05,.4]].forEach(([r,a0,a1,al],j)=>{const rr=rot*(j?-.6:.4);cx2.strokeStyle=`rgba(243,239,232,${al})`;cx2.lineWidth=2;cx2.beginPath();cx2.ellipse(g.cx,g.cy-g.Hmax*(.5+j*.25),r*g.R,r*g.R*g.k,0,a0+rr-Math.PI,a1+rr-Math.PI);cx2.stroke();
  [a0,a1].forEach(a=>{const x=g.cx+Math.cos(a+rr-Math.PI)*r*g.R,y=g.cy-g.Hmax*(.5+j*.25)+Math.sin(a+rr-Math.PI)*r*g.R*g.k;cx2.fillStyle='#07080a';cx2.strokeStyle='rgba(243,239,232,.9)';cx2.lineWidth=1.4;cx2.beginPath();cx2.arc(x,y,4,0,Math.PI*2);cx2.fill();cx2.stroke()})});
 // callout leader lines + label positions
 placeLabels(g);
 requestAnimationFrame(frame)}
function centerPiece(g,ts){const r0=.2;cx2.fillStyle='rgba(120,128,140,.25)';cx2.beginPath();cx2.ellipse(g.cx,g.cy,r0*g.R,r0*g.R*g.k,0,0,Math.PI*2);cx2.fill();
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2+rot*2;cx2.strokeStyle='rgba(200,206,214,.18)';cx2.beginPath();cx2.moveTo(g.cx,g.cy);cx2.lineTo(g.cx+Math.cos(a)*r0*g.R,g.cy+Math.sin(a)*r0*g.R*g.k);cx2.stroke()}
 // tower of layers
 const L0=M.center.layers,tw=g.R*.14,top=g.cy-g.Hmax*1.55,bot=g.cy-g.Hmax*.25;cx2.strokeStyle='rgba(243,239,232,.5)';for(let i=0;i<L0;i++){const y=bot-(bot-top)*i/L0;cx2.globalAlpha=.25+.6*(i/L0);cx2.beginPath();cx2.moveTo(g.cx-tw/2,y);cx2.lineTo(g.cx+tw/2,y);cx2.stroke()}cx2.globalAlpha=1;
 cx2.font='9px "JetBrains Mono",monospace';cx2.fillStyle='rgba(243,239,232,.7)';cx2.fillText(L0+' '+L('طبقة','layers'),g.cx-tw/2,top-6);
 // orange 3D blocks
 const B=M.center.bars.filter(b=>b.v>0),mx=Math.max(...B.map(b=>b.v),1),bw=g.R*.042,dep=bw*.55;B.slice(0,8).forEach((b,i)=>{const off=(i-(Math.min(8,B.length)-1)/2)*bw*.95,hgt=g.Hmax*(.12+.5*b.v/mx)*(.95+.05*Math.sin(ts/700+i)),x=g.cx+off-bw/2,y=g.cy-dep*.2;
  cx2.fillStyle='#c4560f';cx2.beginPath();cx2.moveTo(x+bw,y);cx2.lineTo(x+bw+dep*.6,y-dep*.5);cx2.lineTo(x+bw+dep*.6,y-dep*.5-hgt);cx2.lineTo(x+bw,y-hgt);cx2.closePath();cx2.fill();
  cx2.fillStyle='#ff8a2a';cx2.fillRect(x,y-hgt,bw,hgt);cx2.strokeStyle='rgba(60,20,0,.5)';for(let s=y-hgt+6;s<y;s+=6){cx2.beginPath();cx2.moveTo(x,s);cx2.lineTo(x+bw,s);cx2.stroke()}
  cx2.fillStyle='#ffb066';cx2.beginPath();cx2.moveTo(x,y-hgt);cx2.lineTo(x+dep*.6,y-hgt-dep*.5);cx2.lineTo(x+bw+dep*.6,y-hgt-dep*.5);cx2.lineTo(x+bw,y-hgt);cx2.closePath();cx2.fill()});
 // crosshair box
 const s=14;cx2.strokeStyle='rgba(243,239,232,.8)';cx2.lineWidth=1;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const x=g.cx+a*s*2.2,y=g.cy-g.Hmax*.95+b*s;cx2.beginPath();cx2.moveTo(x,y);cx2.lineTo(x-a*6,y);cx2.moveTo(x,y);cx2.lineTo(x,y-b*6);cx2.stroke()})}
function buildLabels(){const box=$('#labels');box.innerHTML='';labs=M.callouts.map(c=>{const d=document.createElement('div');d.className='lab'+(c.red?' red':'');d.innerHTML=`<b>${esc(c.title)}</b><small>${esc(c.sub||'')}</small>`;if(c.go)d.onclick=()=>go(c.go);box.appendChild(d);return {c,d}})}
function placeLabels(g){labs.forEach(({c,d},i)=>{let ax,ay,lx,ly;if(c.t){const p=P(g,ang(c.t),1.0,g.Hmax*.45);ax=p.x;ay=p.y;lx=ax+(ax<g.cx?-70:70);ly=ay-28-i*6}else{ax=g.cx+g.R*.08;ay=g.cy-g.Hmax*(.55-i*.12);lx=W*c.pos[0];ly=H*c.pos[1]}
  lx=Math.max(90,Math.min(W-90,lx));ly=Math.max(40,Math.min(H-30,ly));d.style.left=lx+'px';d.style.top=ly+'px';
  cx2.strokeStyle='rgba(255,122,26,.75)';cx2.lineWidth=1;cx2.beginPath();cx2.moveTo(ax,ay);cx2.lineTo(lx,ly);cx2.stroke();cx2.fillStyle='#ff7a1a';cx2.beginPath();cx2.arc(ax,ay,2.5,0,Math.PI*2);cx2.fill()})}
// hover / tap on spikes
function near(x,y){let b=null,bd=12*12;hits.forEach(h=>{const d=(h.x-x)**2+(h.y-y)**2;if(d<bd){bd=d;b=h}});return b}
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect(),h=near(e.clientX-r.left,e.clientY-r.top);const tip=$('#tip');if(!h){tip.classList.add('hidden');cv.style.cursor='';return}cv.style.cursor='pointer';tip.innerHTML=`<b>${esc(h.e.label)}</b>${esc(new Date(h.e.t).toISOString().slice(0,10))}`;tip.style.left=Math.min(W-290,h.x+12)+'px';tip.style.top=Math.max(4,h.y-40)+'px';tip.classList.remove('hidden')});
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),h=near(e.clientX-r.left,e.clientY-r.top);const tip=$('#tip');if(!h){tip.classList.add('hidden');return}tip.innerHTML=`<b>${esc(h.e.label)}</b>${esc(new Date(h.e.t).toISOString().slice(0,10))}<br><button>${t('open')}</button>`;tip.querySelector('button').onclick=()=>go(h.e.go);tip.style.left=Math.min(W-290,h.x+12)+'px';tip.style.top=Math.max(4,h.y-50)+'px';tip.classList.remove('hidden')});

/* =============================== boot =============================== */
async function load(){header();const em=$('#empty');em.classList.remove('hidden');em.innerHTML=`<div><b>${t('loading')}</b></div>`;M=null;labs=[];$('#labels').innerHTML='';
 let m;try{m=DEMO?(MODE==='suite'?demoSuite():demoTrading()):(MODE==='suite'?await realSuite():await realTrading())}catch(e){m={err:'noData'}}
 if(m.err||!m.events||m.events.length<3){em.innerHTML=`<div><b>${t(m.err==='signin'?'signin':'noData')}</b><span>${L('يمكنك رؤية الشكل كاملاً ببيانات تجريبية تُولَّد على جهازك فقط.','You can see the full layout with TEST data generated in this browser only.')}</span><br><button id="eDemo">${t('tryDemo')}</button></div>`;$('#eDemo').onclick=()=>{DEMO=true;sessionStorage.setItem('hud_demo','1');load()};if(m.err){M=null;header();return}}
 else em.classList.add('hidden');
 M=m;born=0;header();boxes();buildLabels()}
$('#bMode').onclick=()=>{MODE=MODE==='suite'?'trading':'suite';history.replaceState(null,'','?mode='+MODE);load()};
$('#bDemo').onclick=()=>{DEMO=!DEMO;sessionStorage.setItem('hud_demo',DEMO?'1':'0');load()};
$('#bLang').onclick=()=>{LANG=AR()?'en':'ar';try{localStorage.setItem('lang',LANG)}catch(e){}load()};
window.addEventListener('resize',()=>{size()});
size();requestAnimationFrame(frame);load();
})();
