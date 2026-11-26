'use strict';
/* Stage 8: dashboard charts (Chart.js, MIT, bundled locally). All values come from D (live records). */
const CH_COL=['#1e63d6','#d4a017','#1f9d57','#ee7d17','#7a5af8','#0ea5b7','#d93636','#8a97aa'];
const CH_LV={green:'#1f9d57',yellow:'#e0a800',orange:'#ee7d17',red:'#d93636',gray:'#aab4c3'};
const chName=c=>c?(LANG==='ar'?c.name_ar:c.name_en):t('Unknown');
const chDemo=a=>DEMO&&a.some(x=>x&&x.is_demo);
function chCard(id,title,sub,hasData,demo,wide){
 return `<div class="card chc${wide?' chw':''}"><div class="chh"><b>${t(title)}</b>${demo?`<span class="badge b-purple" style="background:#ede1ff;color:#4b2290;border-radius:8px;padding:2px 8px;font-size:11px">${t('DEMO included')}</span>`:''}</div><div class="small">${t(sub)}</div>${hasData?`<div class="chb"><canvas data-ch="${id}"></canvas></div>`:`<div class="empty">${t('No data to chart yet')}</div>`}</div>`}
window._cf=window._cf||{fac:'',com:'',days:30};
function chF(){const f=window._cf,lim=Date.now()-f.days*864e5;
 const silos=D.silos.filter(s=>!f.fac||s.facility_id===f.fac),sid=new Set(silos.map(s=>s.id));
 const stock=D.stock.filter(x=>sid.has(x.silo_id)&&(!f.com||D.lotBy[x.lot_id]?.commodity_id===f.com));
 const keep=silos.filter(s=>!f.com||stock.some(x=>x.silo_id===s.id));
 const kid=new Set(keep.map(s=>s.id));
 return {silos:keep,stock,reads:D.reads.filter(r=>kid.has(r.silo_id)&&new Date(r.measured_at)>=lim),alerts:D.alerts.filter(a=>(!f.fac||a.facility_id===f.fac||kid.has(a.silo_id))&&(!f.com||kid.has(a.silo_id)||(a.lot_id&&D.lotBy[a.lot_id]?.commodity_id===f.com))&&new Date(a.detected_at)>=lim),pest:D.pest.filter(p=>kid.has(p.silo_id)&&new Date(p.observed_at)>=lim),qual:D.qual.filter(q=>kid.has(q.silo_id)&&new Date(q.sampled_at)>=lim)}}
function chDays(metric,n=30){
 const m={};F.reads.filter(r=>r.metric===metric&&r.source!=='ai_estimate').forEach(r=>{const d=r.measured_at.slice(0,10);(m[d]=m[d]||[]).push(+r.value)});
 const ds=Object.keys(m).sort().slice(-n);return {labels:ds.map(d=>d.slice(5)),vals:ds.map(d=>+(m[d].reduce((a,b)=>a+b,0)/m[d].length).toFixed(2)),cnt:ds.map(d=>m[d].length)}}
let F=null;
function chData(){
 F=chF();const S=F.silos.map(siloState),out={};
 const byCom={};F.stock.forEach(x=>{const l=D.lotBy[x.lot_id],c=l&&D.comBy[l.commodity_id];const k=chName(c);byCom[k]=(byCom[k]||0)+Number(x.qty_mt)});
 out.com={go:'#/lots',type:'doughnut',labels:Object.keys(byCom),vals:Object.values(byCom)};
 const byFac={};F.stock.forEach(x=>{const s=D.siloBy[x.silo_id],f=s&&D.facBy[s.facility_id];const k=f?(LANG==='ar'&&f.name_ar?f.name_ar:f.name):'?';byFac[k]=(byFac[k]||0)+Number(x.qty_mt)});
 out.fac={type:'bar',labels:Object.keys(byFac),vals:Object.values(byFac),go:Object.keys(byFac).map(k=>{const f=D.fac.find(f=>(LANG==='ar'&&f.name_ar?f.name_ar:f.name)===k);return f?'#/facility/'+f.id:'#/facilities'})};
 const fill=S.map(x=>({c:x.s.code,p:+(100*x.q/x.s.capacity_mt).toFixed(1)}));
 out.fill={type:'bar',labels:fill.map(f=>f.c),vals:fill.map(f=>f.p),go:S.map(x=>'#/silo/'+x.s.id)};
 const lv={excellent:0,good:0,monitor:0,warning:0,critical:0,nodata:0,empty:0};S.forEach(x=>lv[x.level]=(lv[x.level]||0)+1);
 const LK=[['excellent','Excellent','#1f9d57'],['good','Good','#6cc58a'],['monitor','Monitor','#e0a800'],['warning','Warning','#ee7d17'],['critical','Critical','#d93636'],['nodata','No fresh data','#aab4c3'],['empty','Empty','#dfe8f5']].filter(k=>lv[k[0]]);
 out.lvl={go:'#/silos',type:'doughnut',labels:LK.map(k=>t(k[1])),vals:LK.map(k=>lv[k[0]]),colors:LK.map(k=>k[2])};
 out.temp={go:'#/readings',type:'line',...chDays('temperature')};out.moist={go:'#/readings',type:'line',...chDays('moisture')};out.rh={go:'#/readings',type:'line',...chDays('rh')};
 const al=F.alerts.filter(a=>!['resolved','closed'].includes(a.status)),sv={critical:0,warning:0,info:0};al.forEach(a=>sv[a.severity]++);
 out.alr={go:'#/alerts',type:'bar',labels:[t('Critical'),t('Warning'),t('Info')],vals:[sv.critical,sv.warning,sv.info],colors:['#d93636','#ee7d17','#1e63d6']};
 const ps={heavy:0,moderate:0,light:0,none:0};F.pest.filter(p=>p.status!=='resolved').forEach(p=>ps[p.severity]++);
 out.pest={go:'#/pests',type:'doughnut',labels:[t('Heavy'),t('Moderate'),t('Light'),t('None found')],vals:[ps.heavy,ps.moderate,ps.light,ps.none],colors:['#d93636','#ee7d17','#e0a800','#1f9d57']};
 const lq={};F.qual.filter(q=>q.moisture_pct!=null).forEach(q=>{if(!lq[q.silo_id])lq[q.silo_id]=q});
 const qs=Object.values(lq).map(q=>({c:D.siloBy[q.silo_id]?.code||'?',v:+q.moisture_pct,id:q.silo_id}));
 out.qual={type:'bar',labels:qs.map(q=>q.c),vals:qs.map(q=>q.v),go:qs.map(q=>'#/silo/'+q.id)};
 return out}
function chDash(){
 const o=chData(),has=k=>o[k].vals.some(v=>v!=null&&(o[k].type==='line'?true:v>0));
 const dm=chDemo(F.silos)||chDemo(F.stock.map(x=>D.lotBy[x.lot_id])),dr=chDemo(F.reads),da=chDemo(F.alerts),dp=chDemo(F.pest),dq=chDemo(F.qual);
 window._ch=o;
 return chBar()+`<div id="chbody">${chBody(o,has,dm,dr,da,dp,dq)}</div>`}
function chBar(){const f=window._cf;const op=(a,v,l)=>`<option value="${v}" ${String(f[a])===String(v)?'selected':''}>${l}</option>`;
 return `<h3 class="chtitle">${t('Charts')}</h3><div class="chf"><label>${t('Facility')}<select onchange="chSet('fac',this.value)">${op('fac','',t('All facilities'))}${D.fac.map(x=>op('fac',x.id,esc(LANG==='ar'&&x.name_ar?x.name_ar:x.name))).join('')}</select></label><label>${t('Commodity')}<select onchange="chSet('com',this.value)">${op('com','',t('All commodities'))}${D.com.map(x=>op('com',x.id,esc(chName(x)))).join('')}</select></label><label>${t('Period')}<select onchange="chSet('days',+this.value)">${[7,14,30].map(d=>op('days',d,t('Last')+' '+d+' '+t('days'))).join('')}</select></label><button class="pill" onclick="chReset()">${t('Reset filters')}</button></div><div class="small" style="margin-bottom:8px">${t('Click a bar, slice or point to open the related page. Click a legend item to hide or show it.')}</div>`}
function chSet(k,v){window._cf[k]=v;chRefresh()}
function chReset(){window._cf={fac:'',com:'',days:30};document.getElementById('chbar')?.remove();render()}
function chRefresh(){const o=chData(),has=k=>o[k].vals.some(v=>v!=null&&(o[k].type==='line'?true:v>0));window._ch=o;document.querySelectorAll('canvas[data-ch]').forEach(c=>Chart.getChart(c)?.destroy());const dm=chDemo(F.silos)||chDemo(F.stock.map(x=>D.lotBy[x.lot_id])),dr=chDemo(F.reads),da=chDemo(F.alerts),dp=chDemo(F.pest),dq=chDemo(F.qual);document.getElementById('chbody').innerHTML=chBody(o,has,dm,dr,da,dp,dq);chDraw()}
function chBody(o,has,dm,dr,da,dp,dq){
 return `<div class="small" style="display:none"></div><div class="small" style="margin-bottom:8px">${t('Charts use recorded data only. Days or silos with no readings are left out, never drawn as zero.')}</div><div class="grid g2 chg">
 ${chCard('com','Stored quantity by commodity','Metric tons, from stock records',has('com'),dm)}
 ${chCard('fac','Stored quantity by facility','Metric tons',has('fac'),dm)}
 ${chCard('fill','Silo fill level','Percent of capacity',o.fill.vals.length>0,dm)}
 ${chCard('lvl','Silo condition','Number of silos by status',o.lvl.vals.length>0,dm)}
 ${chCard('temp','Average grain temperature, for the selected period','°C, daily average of measured readings (not AI estimates)',o.temp.vals.length>0,dr)}
 ${chCard('moist','Average moisture, for the selected period','%, daily average of measured readings',o.moist.vals.length>0,dr)}
 ${chCard('rh','Average relative humidity, for the selected period','%, daily average of measured readings',o.rh.vals.length>0,dr)}
 ${chCard('alr','Active alerts by severity','Not resolved or closed',has('alr'),da)}
 ${chCard('pest','Open pest records by severity','Records not yet resolved',has('pest'),dp)}
 ${chCard('qual','Latest moisture test per silo','% from quality tests',o.qual.vals.length>0,dq)}
 </div>`}
const _pgD8=pgDashboard;pgDashboard=function(){return _pgD8()+chDash()};
function chDraw(){
 if(!window.Chart||!window._ch)return;
 Chart.defaults.font.family='Cairo,"Segoe UI",Tahoma,sans-serif';Chart.defaults.color='#62758f';
 document.querySelectorAll('canvas[data-ch]:not([data-done])').forEach(cv=>{
  cv.dataset.done=1;const d=window._ch[cv.dataset.ch];if(!d)return;
  const rtl=LANG==='ar',tp=d.type,isD=tp==='doughnut';
  const cols=d.colors||(isD?CH_COL:CH_COL[0]);
  const ds=tp==='line'?{data:d.vals,borderColor:'#1e63d6',backgroundColor:'rgba(30,99,214,.12)',fill:true,tension:.3,pointRadius:3,spanGaps:false}:{data:d.vals,backgroundColor:cols,borderRadius:6,borderWidth:isD?2:0,borderColor:'#fff'};
  const horiz=cv.dataset.ch==='fill';
  new Chart(cv,{type:tp,data:{labels:d.labels,datasets:[ds]},options:{indexAxis:horiz?'y':'x',responsive:true,maintainAspectRatio:false,animation:{duration:700,easing:'easeOutQuart'},interaction:{mode:tp==='line'?'index':'nearest',intersect:tp!=='line'},onHover:(e,a)=>{e.native.target.style.cursor=a.length&&d.go?'pointer':'default'},onClick:(e,a)=>{if(!a.length||!d.go)return;const i=a[0].index;const h=Array.isArray(d.go)?d.go[i]:d.go;if(h)location.hash=h},plugins:{legend:{display:isD,rtl,position:'bottom',labels:{boxWidth:12}},tooltip:{rtl,textDirection:rtl?'rtl':'ltr',callbacks:isD?{label:c=>{const tot=c.dataset.data.reduce((a,b)=>a+b,0)||1;return ' '+c.label+': '+c.parsed.toLocaleString('en-US')+' ('+(100*c.parsed/tot).toFixed(1)+'%)'}}:tp==='line'?{afterLabel:c=>t('readings')+': '+d.cnt[c.dataIndex]}:{label:c=>{const v=c.parsed[horiz?'x':'y'],tot=d.vals.reduce((a,b)=>a+b,0);return ' '+Number(v).toLocaleString('en-US')+(cv.dataset.ch==='fill'||cv.dataset.ch==='qual'?' %':cv.dataset.ch==='fac'?' MT ('+(100*v/tot).toFixed(1)+'%)':'')}}}},scales:isD?{}:{x:{reverse:rtl&&!horiz,grid:{display:false},max:horiz?100:undefined},y:{ticks:cv.dataset.ch==='alr'?{precision:0}:{},position:rtl&&!horiz?'right':'left',beginAtZero:!(tp==='line'),max:horiz?undefined:undefined,grid:{color:'#eef2f8'}}}}})})}
new MutationObserver(()=>chDraw()).observe(document.documentElement,{childList:true,subtree:true});
Object.assign(AR,{'Facility':'المنشأة','Commodity':'السلعة','Period':'الفترة','All facilities':'كل المنشآت','All commodities':'كل السلع','Last':'آخر','days':'يوماً','Reset filters':'إعادة ضبط المرشحات','Click a bar, slice or point to open the related page. Click a legend item to hide or show it.':'انقر على عمود أو شريحة أو نقطة لفتح الصفحة المرتبطة. انقر على عنصر في المفتاح لإخفائه أو إظهاره.','Charts':'الرسوم البيانية','DEMO included':'تتضمن بيانات تجريبية','No data to chart yet':'لا توجد بيانات للرسم بعد','Unknown':'غير معروف','Charts use recorded data only. Days or silos with no readings are left out, never drawn as zero.':'الرسوم تستخدم البيانات المسجلة فقط. الأيام أو الصوامع بلا قراءات تُحذف ولا تُرسم كصفر.',
'Stored quantity by commodity':'الكمية المخزنة حسب السلعة','Metric tons, from stock records':'طن متري، من سجلات المخزون','Stored quantity by facility':'الكمية المخزنة حسب المنشأة','Metric tons':'طن متري','Silo fill level':'مستوى امتلاء الصوامع','Percent of capacity':'نسبة من السعة','Silo condition':'حالة الصوامع','Number of silos by status':'عدد الصوامع حسب الحالة',
'Average grain temperature, for the selected period':'متوسط حرارة الحبوب خلال الفترة المحددة','°C, daily average of measured readings (not AI estimates)':'°م، المتوسط اليومي للقراءات المقاسة (ليست تقديرات ذكاء اصطناعي)','Average moisture, for the selected period':'متوسط الرطوبة خلال الفترة المحددة','%, daily average of measured readings':'%، المتوسط اليومي للقراءات المقاسة','Average relative humidity, for the selected period':'متوسط الرطوبة النسبية خلال الفترة المحددة',
'Active alerts by severity':'التنبيهات النشطة حسب الخطورة','Not resolved or closed':'غير محلولة أو مغلقة','Open pest records by severity':'سجلات الآفات المفتوحة حسب الشدة','Records not yet resolved':'سجلات لم تُحل بعد','Latest moisture test per silo':'آخر اختبار رطوبة لكل صومعة','% from quality tests':'% من اختبارات الجودة',
'Excellent':'ممتازة','Good':'جيدة','Monitor':'مراقبة','Warning':'تحذير','Critical':'حرجة','No fresh data':'لا بيانات حديثة','Empty':'فارغة','Info':'معلومة','Heavy':'شديدة','Moderate':'متوسطة','Light':'خفيفة','None found':'لا يوجد','readings':'قراءات'});
