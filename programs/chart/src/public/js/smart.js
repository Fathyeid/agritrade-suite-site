// Smart tools: SMC (order blocks, fair value gaps, BOS/CHoCH, liquidity sweeps), auto Fibonacci, harmonic patterns,
// pivot points; trading plan checklist + daily limits; prop-style challenge; Arabic/English voice and typed commands;
// spoken alerts; Academy (lessons + buy/sell practice on replay); news sentiment. Everything client-side, free.
(()=>{
const LWX=LightweightCharts,AR=()=>localStorage.getItem('suite_lang')==='ar',L=(a,e)=>AR()?a:e;
const f2=(v,d)=>v==null||!isFinite(v)?'-':fmt(v,d==null?2:d);
const nm=s=>{const n=symName(s);return AR()&&window.I18N_AR&&I18N_AR[n]||n};
const today=()=>new Date().toISOString().slice(0,10);
const piv=(d,k)=>{const H=[],Lo=[];for(let i=k;i<d.length-k;i++){let h=true,l=true;for(let j=i-k;j<=i+k;j++){if(d[j].high>d[i].high)h=false;if(d[j].low<d[i].low)l=false}if(h)H.push(i);if(l)Lo.push(i)}return {H,L:Lo}};

/* ---------------- per-pane settings ---------------- */
const _save=App.prototype.saveState;App.prototype.saveState=function(){_save.call(this);try{Store.set('smartPanes',this.panes.map(p=>p.smart||{}))}catch(e){}};
const _lay=App.prototype.setLayout;App.prototype.setLayout=function(n,st){_lay.call(this,n,st);const s=Store.get('smartPanes',[]);this.panes.forEach((p,i)=>{if(!p.smart)p.smart=s[i]||{}})};

/* =============================== 1. SMC =============================== */
function smc(d){const n=d.length,off=Math.max(0,n-450),b=d.slice(off),{H,L:Lo}=piv(b,3),out={zones:[],lines:[],marks:[]};if(b.length<40)return out;
 const isH=new Set(H),isL=new Set(Lo);let lastH=null,lastL=null,trend=0;
 for(let i=0;i<b.length;i++){
  if(lastH&&!lastH.br&&b[i].close>b[lastH.i].high){lastH.br=1;const kind=trend<0?'CHoCH':'BOS';out.lines.push({t1:b[lastH.i].time,t2:b[i].time,p:b[lastH.i].high,label:kind,up:true});trend=1;
   for(let j=i-1;j>=Math.max(0,lastH.i-15);j--)if(b[j].close<b[j].open){out.zones.push({k:'ob',up:true,t1:b[j].time,i:j,p1:b[j].low,p2:b[j].high});break}}
  if(lastL&&!lastL.br&&b[i].close<b[lastL.i].low){lastL.br=1;const kind=trend>0?'CHoCH':'BOS';out.lines.push({t1:b[lastL.i].time,t2:b[i].time,p:b[lastL.i].low,label:kind,up:false});trend=-1;
   for(let j=i-1;j>=Math.max(0,lastL.i-15);j--)if(b[j].close>b[j].open){out.zones.push({k:'ob',up:false,t1:b[j].time,i:j,p1:b[j].low,p2:b[j].high});break}}
  if(i>=3&&isH.has(i-3))lastH={i:i-3};if(i>=3&&isL.has(i-3))lastL={i:i-3};
  if(i>=2){if(b[i].low>b[i-2].high)out.zones.push({k:'fvg',up:true,t1:b[i-1].time,i:i-1,p1:b[i-2].high,p2:b[i].low});if(b[i].high<b[i-2].low)out.zones.push({k:'fvg',up:false,t1:b[i-1].time,i:i-1,p1:b[i].high,p2:b[i-2].low})}}
 // mitigation: a zone ends when price trades through it
 out.zones.forEach(z=>{for(let j=z.i+2;j<b.length;j++){if(z.up?b[j].low<z.p1:b[j].high>z.p2){z.t2=b[j].time;break}}});
 const atr=b.slice(-100).reduce((t,x)=>t+(x.high-x.low),0)/Math.min(100,b.length),live=out.zones.filter(z=>!z.t2&&(z.k==='ob'||z.p2-z.p1>=atr*.35));
 const pick=(k,up,n)=>live.filter(z=>z.k===k&&z.up===up).slice(-n);out.zones=[...pick('ob',true,3),...pick('ob',false,3),...pick('fvg',true,3),...pick('fvg',false,3),...out.zones.filter(z=>z.t2&&z.k==='ob').slice(-2)];
 // liquidity sweeps: wick beyond a swing, close back inside
 H.forEach(h=>{for(let j=h+1;j<Math.min(b.length,h+40);j++){if(b[j].high>b[h].high){if(b[j].close<b[h].high)out.marks.push({t:b[j].time,p:b[j].high,up:false});break}}});
 Lo.forEach(l=>{for(let j=l+1;j<Math.min(b.length,l+40);j++){if(b[j].low<b[l].low){if(b[j].close>b[l].low)out.marks.push({t:b[j].time,p:b[j].low,up:true});break}}});
 out.marks=out.marks.slice(-6);out.lines=out.lines.slice(-8);out.trend=trend;return out}
const _ds=Pane.prototype.drawStructure;
Pane.prototype.drawStructure=function(cx,dl){_ds.call(this,cx,dl);const S=this._smc;if(!S||!this.smart||!this.smart.smc)return;const rt=dl.W-62;cx.save();cx.font='10px system-ui';
 S.zones.forEach(z=>{const x1=dl.X(z.t1),x2=z.t2?dl.X(z.t2):rt,y1=dl.Y(z.p1),y2=dl.Y(z.p2);if(x1==null||y1==null||y2==null)return;const xa=Math.max(-5,x1),xb=Math.min(rt,x2==null?rt:x2);if(xb<=xa)return;
  const col=z.k==='ob'?(z.up?'38,166,154':'239,83,80'):(z.up?'41,98,255':'255,152,0');cx.fillStyle=`rgba(${col},${z.t2?.07:.17})`;cx.fillRect(xa,Math.min(y1,y2),xb-xa,Math.max(1,Math.abs(y1-y2)));cx.strokeStyle=`rgba(${col},${z.t2?.3:.7})`;cx.strokeRect(xa,Math.min(y1,y2),xb-xa,Math.max(1,Math.abs(y1-y2)));
  if(Math.abs(y1-y2)>=9){cx.fillStyle=`rgba(${col},.95)`;cx.fillText((z.k==='ob'?'OB':'FVG')+(z.up?' ▲':' ▼'),xa+3,Math.min(y1,y2)+Math.min(10,Math.abs(y1-y2)))}});
 S.lines.forEach(l=>{const x1=dl.X(l.t1),x2=dl.X(l.t2),y=dl.Y(l.p);if(x1==null||x2==null||y==null)return;cx.strokeStyle=l.up?'#26a69a':'#ef5350';cx.setLineDash([4,3]);cx.beginPath();cx.moveTo(x1,y);cx.lineTo(x2,y);cx.stroke();cx.setLineDash([]);cx.fillStyle=cx.strokeStyle;cx.fillText(l.label,(x1+x2)/2-12,l.up?y-4:y+12)});
 S.marks.forEach(m=>{const x=dl.X(m.t),y=dl.Y(m.p);if(x==null||y==null)return;cx.fillStyle='#ffb300';cx.fillText(L('سحب سيولة','sweep')+(m.up?' ▲':' ▼'),x-18,m.up?y+16:y-8);cx.beginPath();cx.arc(x,y,3,0,Math.PI*2);cx.fill()});
 cx.restore()};

/* =============================== 2. auto Fibonacci, 3. harmonics, 4. pivots =============================== */
const FIBS=[0,.236,.382,.5,.618,.786,1,1.272,1.618];
function autoFib(p){const d=p.view.slice(-160);if(d.length<30)return;let hi=0,lo=0;d.forEach((b,i)=>{if(b.high>d[hi].high)hi=i;if(b.low<d[lo].low)lo=i});const H=d[hi].high,Lw=d[lo].low,up=lo<hi,R=H-Lw;
 FIBS.forEach(r=>{const pr=up?H-R*r:Lw+R*r;try{p.main.createPriceLine({price:pr,color:r===.618||r===.5?'#ffb300':'rgba(255,179,0,.55)',lineWidth:1,lineStyle:r>1?3:2,axisLabelVisible:r===.618||r===.5||r===0||r===1,title:'Fib '+(r*100).toFixed(1)+'%'})}catch(e){}})}
const HARM=[['Gartley',[.568,.668],[.382,.886],[1.13,1.618],[.746,.826]],['Bat',[.382,.5],[.382,.886],[1.618,2.618],[.846,.926]],['Butterfly',[.746,.826],[.382,.886],[1.618,2.24],[1.27,1.618]],['Crab',[.382,.618],[.382,.886],[2.24,3.618],[1.558,1.678]]];
const inR=(v,[a,b])=>v>=a&&v<=b;
function harmonic(p){const d=p.view;if(d.length<80)return null;const {H,L:Lo}=piv(d,4);const pts=[...H.map(i=>({i,p:d[i].high,h:1})),...Lo.map(i=>({i,p:d[i].low,h:0}))].sort((a,b)=>a.i-b.i);
 const alt=[];pts.forEach(q=>{const l=alt[alt.length-1];if(l&&l.h===q.h){if(q.h?q.p>l.p:q.p<l.p)alt[alt.length-1]=q}else alt.push(q)});
 const res=[];const test=(X,A,B,C,D,complete)=>{const XA=Math.abs(A.p-X.p);if(!XA)return;const ab=Math.abs(B.p-A.p)/XA,bc=Math.abs(C.p-B.p)/Math.abs(B.p-A.p);
  HARM.forEach(([n,AB,BC,CD,XD])=>{if(!inR(ab,AB)||!inR(bc,BC))return;const bull=X.p<A.p;if(complete){const cd=Math.abs(D.p-C.p)/Math.abs(C.p-B.p),xd=Math.abs(A.p-D.p)/XA;if(inR(cd,CD)&&inR(xd,XD))res.push({n,bull,pts:[X,A,B,C,D],complete:true})}
   else{const xdT=(XD[0]+XD[1])/2,prz=bull?A.p-XA*xdT:A.p+XA*xdT;res.push({n,bull,pts:[X,A,B,C],prz,complete:false})}})};
 if(alt.length>=4){const [X,A,B,C]=alt.slice(-4);test(X,A,B,C,null,false)}for(let e=alt.length;e>=Math.max(5,alt.length-8)&&!res.length;e--){const [X,A,B,C,D]=alt.slice(e-5,e);test(X,A,B,C,D,true)}
 if(!res.length)return null;const r=res[0];const th=p.app.theme,col=r.bull?th.up:th.down;
 const s=p.chart.addSeries(LWX.LineSeries,{color:col,lineWidth:2,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false},0);p.series.push(s);s.setData(r.pts.map(q=>({time:d[q.i].time,value:q.p})));
 try{createSeriesMarkers(s,r.pts.map((q,k)=>({time:d[q.i].time,position:q.h?'aboveBar':'belowBar',color:col,shape:'circle',text:'XABCD'[k]+(k===r.pts.length-1?' · '+r.n+(r.complete?'':' (PRZ)'):'')})))}catch(e){}
 if(r.prz!=null)try{p.main.createPriceLine({price:r.prz,color:col,lineWidth:2,lineStyle:2,axisLabelVisible:true,title:r.n+' PRZ'})}catch(e){}
 return r}
async function pivots(p,ver){const kind=p.smart.piv,src=INTRA(p.tf)?'1D':p.tf==='1D'?'1W':'1M';let b;try{b=(await Data.get(p.sym,src)).bars}catch(e){return}if(!b||b.length<2||p._smv!==ver)return;
 const q=b[b.length-2],H=q.high,Lw=q.low,C=q.close,P=(H+Lw+C)/3,R=H-Lw;let lv;
 if(kind==='camarilla')lv=[['H4',C+R*1.1/2],['H3',C+R*1.1/4],['L3',C-R*1.1/4],['L4',C-R*1.1/2]];
 else if(kind==='fib')lv=[['R3',P+R],['R2',P+.618*R],['R1',P+.382*R],['P',P],['S1',P-.382*R],['S2',P-.618*R],['S3',P-R]];
 else lv=[['R3',H+2*(P-Lw)],['R2',P+R],['R1',2*P-Lw],['P',P],['S1',2*P-H],['S2',P-R],['S3',Lw-2*(H-P)]];
 const th=p.app.theme;lv.forEach(([n,v])=>{try{p.main.createPriceLine({price:v,color:/^[RH]/.test(n)?th.down:/^[SL]/.test(n)?th.up:'#9e9e9e',lineWidth:1,lineStyle:1,axisLabelVisible:true,title:n+' ('+(src==='1D'?L('يومي','D'):src==='1W'?L('أسبوعي','W'):L('شهري','M'))+')'})}catch(e){}})}
const _build=Pane.prototype.build;
Pane.prototype.build=function(reset){_build.call(this,reset);const s=this.smart||{};if(!this.view||!this.view.length||!this.main)return;const ver=this._smv=(this._smv||0)+1;
 try{this._smc=s.smc?smc(this.view):null}catch(e){this._smc=null}try{if(s.fib)autoFib(this)}catch(e){}try{this._harm=s.harm?harmonic(this):null}catch(e){}if(s.piv)pivots(this,ver);setTimeout(()=>{try{this.dl.redraw()}catch(e){}},0)};
App.prototype.smartDialog=function(){const p=this.active;if(!p)return;p.smart=p.smart||{};const s=p.smart;
 const cb=(k,l)=>{const i=el('input',{type:'checkbox',checked:!!s[k],onchange:()=>{s[k]=i.checked;p.build(false);this.saveState();info()}});return el('label',{class:'row2'},i,el('span',{},l))};
 const pv=el('select',{onchange:()=>{s.piv=pv.value||null;p.build(false);this.saveState()}},...[['',L('بدون','Off')],['classic',L('كلاسيك','Classic')],['camarilla','Camarilla'],['fib',L('فيبوناتشي','Fibonacci')]].map(([v,l])=>el('option',{value:v,selected:(s.piv||'')===v},l)));
 const out=el('div',{class:'mut'});const info=()=>{const S=p._smc,h=p._harm;out.textContent=(S?L(`الهيكل: ${S.trend>0?'صاعد':S.trend<0?'هابط':'غير محدد'} · مناطق نشطة: ${S.zones.filter(z=>!z.t2).length}`,`Structure: ${S.trend>0?'bullish':S.trend<0?'bearish':'undecided'} · active zones: ${S.zones.filter(z=>!z.t2).length}`):'')+(h?' · '+h.n+(h.complete?L(' مكتمل',' complete'):L(' محتمل',' forming')):'')};
 modal(L('أدوات السمارت موني والمستويات','Smart money & levels'),el('div',{},cb('smc',L('مناطق الطلب والعرض (OB) · الفجوات (FVG) · كسر الهيكل (BOS/CHoCH) · سحب السيولة','Order blocks · fair value gaps · BOS/CHoCH · liquidity sweeps')),cb('fib',L('فيبوناتشي تلقائي من آخر موجة','Auto Fibonacci from the last swing')),cb('harm',L('أنماط توافقية تلقائية (جارتلي، بات، بترفلاي، كراب)','Auto harmonics (Gartley, Bat, Butterfly, Crab)')),
  el('div',{class:'row2'},el('label',{},L('نقاط الارتكاز','Pivot points')),pv),out,el('p',{class:'mut'},L('رسوم آلية من الشموع نفسها، للمعلومة وليست إشارات تداول.','Automatic drawings from the bars themselves; information, not trade signals.'))));setTimeout(info,50)};

/* =============================== 5. trading plan + daily limits =============================== */
const PLAN={get(){return Store.get('plan',{on:false,rules:[L('الاتجاه على الإطار الأكبر في صالح الصفقة','Higher-timeframe trend agrees'),L('حددت وقف الخسارة قبل الدخول','Stop loss decided before entry'),L('العائد للمخاطرة ٢ أو أكثر','Reward/risk is 2 or more'),L('المخاطرة ١٪ أو أقل من الحساب','Risk is 1% of the account or less'),L('لا أتداول بسبب الغضب أو الرغبة في التعويض','Not trading out of anger or revenge')],maxLoss:500,maxTrades:5})},set(v){Store.set('plan',v)},
 todayStats(){const A=PAPER.get(),cl=(A.closed||[]).filter(c=>c.d1===today());const pnl=cl.reduce((s,c)=>s+((c.dir==='Short'?-1:1)*(c.exit-c.entry)*(c.qty||1)*(c.mult||1)-(c.fees||0)),0);const log=Store.get('planLog',{});return {pnl,trades:(log[today()]||0)}},
 locked(){const P=PLAN.get();if(!P.on)return null;const s=PLAN.todayStats();if(P.maxLoss>0&&-s.pnl>=P.maxLoss)return L(`وصلت لحد الخسارة اليومي ($${P.maxLoss}). التداول متوقف حتى الغد.`,`Daily loss limit reached ($${P.maxLoss}). Trading is locked until tomorrow.`);if(P.maxTrades>0&&s.trades>=P.maxTrades)return L(`وصلت لأقصى عدد صفقات اليوم (${P.maxTrades}).`,`Maximum trades for today reached (${P.maxTrades}).`);return null}};
function checklist(go){const P=PLAN.get(),lock=PLAN.locked();if(lock){modal(L('خطة التداول','Trading plan'),el('p',{class:'cot-dn'},lock));return}
 const boxes=P.rules.map(r=>el('input',{type:'checkbox'}));const btn=el('button',{disabled:true,onclick:()=>{const log=Store.get('planLog',{});log[today()]=(log[today()]||0)+1;Store.set('planLog',log);m.close();go()}},L('كل الشروط متحققة · نفّذ','All checked · place order'));
 boxes.forEach(b=>b.onchange=()=>{btn.disabled=!boxes.every(x=>x.checked)});
 const m=modal(L('قائمة الفحص قبل الصفقة','Pre-trade checklist'),el('div',{},...P.rules.map((r,i)=>el('label',{class:'row2'},boxes[i],el('span',{},r))),el('p',{class:'mut'},L(`اليوم: ${PLAN.todayStats().trades} صفقة · ربح/خسارة $${f2(PLAN.todayStats().pnl,0)}`,`Today: ${PLAN.todayStats().trades} trades · P&L $${f2(PLAN.todayStats().pnl,0)}`)),btn))}
let passing=false;
const _paper=App.prototype.tPaper;
App.prototype.tPaper=function(){_paper.call(this);const c=this.tabc;let n=0;const iv=setInterval(()=>{const b=[...c.querySelectorAll('button')].find(x=>x.onclick&&x.onclick.name==='place');if(b||++n>40)clearInterval(iv);if(!b||b._plan)return;b._plan=1;
 b.addEventListener('click',e=>{if(passing||!PLAN.get().on)return;e.stopImmediatePropagation();e.preventDefault();checklist(()=>{passing=true;try{b.click()}finally{passing=false}})},true)},75)};
/* =============================== 6. prop-style challenge =============================== */
async function equity(){try{const r=await PAPER.tick();return r.eq}catch(e){const A=PAPER.get();return A.cash}}
App.prototype.tPlan=function(){const c=this.tabc,P=PLAN.get();
 const on=el('input',{type:'checkbox',checked:P.on}),rules=el('textarea',{rows:5},P.rules.join('\n')),ml=el('input',{value:P.maxLoss,style:'width:80px'}),mt=el('input',{value:P.maxTrades,style:'width:60px'});
 const saveP=()=>{PLAN.set({on:on.checked,rules:rules.value.split('\n').map(x=>x.trim()).filter(Boolean),maxLoss:+ml.value||0,maxTrades:+mt.value||0});toast(L('تم حفظ الخطة','Plan saved'));this.showTab('Plan')};
 const st=PLAN.todayStats(),lock=PLAN.locked();
 c.append(el('div',{class:'card'},el('h4',{},L('خطة التداول','Trading plan')),el('label',{class:'row2'},on,el('span',{},L('فعّل قائمة الفحص وحدود اليوم على التداول التجريبي','Use the checklist and daily limits on paper trading'))),
  el('label',{class:'mut'},L('شروط الدخول (سطر لكل شرط)','Entry rules (one per line)')),rules,el('div',{class:'row2'},el('label',{},L('حد الخسارة اليومي $','Daily loss limit $')),ml,el('label',{},L('أقصى صفقات/يوم','Max trades/day')),mt),el('button',{onclick:saveP},L('حفظ','Save')),
  el('p',{class:lock?'cot-dn':'mut'},lock||L(`اليوم: ${st.trades} صفقة · ربح/خسارة $${f2(st.pnl,0)}`,`Today: ${st.trades} trades · P&L $${f2(st.pnl,0)}`))));
 const ch=Store.get('challenge',null),box=el('div',{class:'card'},el('h4',{},L('تحدي التداول','Trading challenge')));c.append(box);
 if(!ch){const tg=el('input',{value:'10',style:'width:50px'}),dd=el('input',{value:'10',style:'width:50px'}),dl=el('input',{value:'5',style:'width:50px'}),days=el('input',{value:'30',style:'width:50px'});
  box.append(el('p',{class:'mut'},L('تحدٍّ على حسابك التجريبي بقواعد شركات التمويل: حقق الهدف بدون كسر حدود التراجع خلال المدة.','A prop-firm style challenge on your paper account: hit the target without breaking the drawdown limits within the period.')),
   el('div',{class:'row2'},el('label',{},L('الهدف %','Target %')),tg,el('label',{},L('أقصى تراجع %','Max drawdown %')),dd),el('div',{class:'row2'},el('label',{},L('تراجع يومي %','Daily drawdown %')),dl,el('label',{},L('الأيام','Days')),days),
   el('button',{onclick:async()=>{const e=await equity();Store.set('challenge',{start:Date.now(),eq0:e,peak:e,day:today(),dayEq:e,tg:+tg.value,dd:+dd.value,dl:+dl.value,days:+days.value,status:'running'});this.showTab('Plan')}},L('ابدأ التحدي','Start challenge')));return}
 box.append(el('p',{class:'mut'},L('جارٍ الحساب…','Calculating…')));
 equity().then(e=>{const C=Store.get('challenge');if(C.day!==today()){C.day=today();C.dayEq=e}C.peak=Math.max(C.peak,e);const ret=(e/C.eq0-1)*100,ddT=(C.peak-e)/C.eq0*100,ddD=(C.dayEq-e)/C.eq0*100,left=Math.max(0,C.days-Math.floor((Date.now()-C.start)/864e5));
  if(C.status==='running'){if(ddT>=C.dd||ddD>=C.dl)C.status='failed';else if(ret>=C.tg)C.status='passed';else if(left<=0)C.status='expired'}Store.set('challenge',C);
  const bar=(v,max,col)=>el('div',{class:'cot-bar',style:'background:#2a2f36'},el('i',{style:`width:${Math.max(0,Math.min(100,v/max*100))}%;background:${col}`}));
  box.lastChild.remove();box.append(el('div',{class:'cot-dh'},el('div',{class:'cot-kpi'},el('small',{},L('العائد','Return')),el('b',{class:ret>=0?'cot-up':'cot-dn'},ret.toFixed(2)+'%'),bar(ret,C.tg,'#26a69a'),el('span',{class:'mut'},L('الهدف ','target ')+C.tg+'%')),
   el('div',{class:'cot-kpi'},el('small',{},L('أقصى تراجع','Max drawdown')),el('b',{},ddT.toFixed(2)+'%'),bar(ddT,C.dd,'#ef5350'),el('span',{class:'mut'},L('الحد ','limit ')+C.dd+'%')),
   el('div',{class:'cot-kpi'},el('small',{},L('تراجع اليوم','Today drawdown')),el('b',{},ddD.toFixed(2)+'%'),bar(ddD,C.dl,'#ff9800'),el('span',{class:'mut'},L('الحد ','limit ')+C.dl+'%')),
   el('div',{class:'cot-kpi'},el('small',{},L('الحالة','Status')),el('b',{class:C.status==='passed'?'cot-up':C.status==='running'?'':'cot-dn'},{running:L('جارٍ','running'),passed:L('نجحت 🏆','passed 🏆'),failed:L('فشل','failed'),expired:L('انتهت المدة','expired')}[C.status]),el('span',{class:'mut'},left+L(' يوم متبقٍ',' days left')))),
   el('button',{onclick:()=>{if(confirm(L('إنهاء التحدي الحالي؟','End the current challenge?'))){const h=Store.get('challengeLog',[]);h.push({...C,end:Date.now(),ret});Store.set('challengeLog',h);Store.set('challenge',null);this.showTab('Plan')}}},L('إنهاء وبدء جديد','End and start a new one')))})};

/* =============================== 7. voice + typed commands, 8. spoken alerts =============================== */
const NORM=s=>String(s||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/٫/g,'.');
const SYMS=[[/ذهب|جولد|gold/,'GC=F'],[/فضه|silver/,'SI=F'],[/بترول|نفط|خام|crude|oil(?! صويا)/,'CL=F'],[/غاز|natural gas|gas/,'NG=F'],[/زيت الصويا|soy ?oil/,'ZL=F'],[/كسب|soy ?meal|meal/,'ZM=F'],[/صويا|soy/,'ZS=F'],[/ذره|corn/,'ZC=F'],[/قمح|wheat/,'ZW=F'],[/نحاس|copper/,'HG=F'],
 [/بيتكوين|بتكوين|bitcoin|btc/,'BTC-USD'],[/ايثر|ايثيريوم|ethereum|eth/,'ETH-USD'],[/سولانا|solana/,'SOL-USD'],[/يورو|euro/,'EURUSD=X'],[/استرليني|باوند|pound|gbp/,'GBPUSD=X'],[/ين|yen/,'USDJPY=X'],[/جنيه|egp/,'EGP=X'],[/ناسداك|nasdaq/,'NQ=F'],[/اس اند بي|اس آند بي|s ?& ?p|sp500|spx/,'ES=F'],[/داو|dow/,'YM=F'],[/سكر|sugar/,'SB=F'],[/بن|قهوه|coffee/,'KC=F'],[/كاكاو|cocoa/,'CC=F'],[/قطن|cotton/,'CT=F'],[/مصر|egx|البورصه المصريه/,'^CASE30'],[/ابل|apple/,'AAPL'],[/انفيديا|nvidia/,'NVDA'],[/تسلا|tesla/,'TSLA']];
const TFS=[[/دقيقه واحده|1 ?min|one minute|^دقيقه/,'1m'],[/خمس دقايق|5 دقايق|5 دقائق|خمس دقائق|5 ?min/,'5m'],[/ربع ساعه|15 ?min|15 دقيقه/,'15m'],[/نص ساعه|نصف ساعه|30 ?min/,'30m'],[/اربع ساعات|4 ساعات|4 ?h/,'4H'],[/ساعه|hour|1 ?h/,'1H'],[/يومي|daily|يوم/,'1D'],[/اسبوعي|weekly|اسبوع/,'1W'],[/شهري|monthly|شهر/,'1M']];
function say(t){try{if(!Store.get('speakOn',true))return;const u=new SpeechSynthesisUtterance(t);u.lang=AR()?'ar-EG':'en-US';speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
App.prototype.runCommand=function(raw){const q=NORM(raw),p=this.active;if(!q.trim())return L('لم أسمع أمراً','No command heard');
 const sym=(SYMS.find(([r])=>r.test(q))||[])[1],tf=(TFS.find(([r])=>r.test(q))||[])[1],num=(q.match(/(\d+(?:[.,]\d+)?)/)||[])[1];const n=num?parseFloat(num.replace(',','.')):null;
 if(/تنبيه|نبهني|alert|notify/.test(q)){if(n==null)return L('قل السعر، مثل: نبهني لو الذهب فوق 2700','Say a price, e.g. alert me if gold is above 2700');const s=sym||p.sym,type=/تحت|نزل|اقل|below|under/.test(q)?'below':'above';
  this.alerts.push({id:uid(),type,sym:s,v1:n,tf:'1D',on:true,once:true,name:'voice'});Store.set('alerts',this.alerts);return L(`تم: تنبيه لو ${nm(s)} ${type==='above'?'فوق':'تحت'} ${n}`,`Done: alert when ${nm(s)} is ${type} ${n}`)}
 if(/امسح|شيل|احذف|clear|remove/.test(q)&&/مؤشر|indicator/.test(q)){p.inds=[];p.build(false);this.saveState();return L('تم مسح المؤشرات','Indicators cleared')}
 const ind=/(متوسط|sma|moving average)/.test(q)?(/اسي|ema|exponential/.test(q)?'ema':'sma'):/ema/.test(q)?'ema':/rsi|القوه النسبيه/.test(q)?'rsi':/macd|ماكد/.test(q)?'macd':/بولينجر|bollinger|bb\b/.test(q)?'bb':/vwap|فواب/.test(q)?'vwap':/atr/.test(q)?'atr':null;
 if(ind&&/اضف|ضيف|حط|زود|add|show/.test(q+' add')&&IND[ind]){const pr={};if(n&&(ind==='sma'||ind==='ema'||ind==='rsi'||ind==='atr'))pr.n=Math.round(n);p.inds.push({id:uid(),key:ind,p:pr,colors:[]});p.build(false);this.saveState();return L(`تمت إضافة ${IND[ind].n}${pr.n?' '+pr.n:''}`,`Added ${IND[ind].n}${pr.n?' '+pr.n:''}`)}
 if(/تحليل|حلل|analysis|analy[sz]e/.test(q)){this.writeAnalysis&&this.writeAnalysis();return L('جارٍ التحليل','Analysing')}
 if(/اعاده|replay|اعد تشغيل/.test(q)){this.replayStart&&this.replayStart();return L('اضغط شمعة لبدء إعادة التشغيل','Click a bar to start the replay')}
 if(/سمارت|smc|اوردر بلوك|order block/.test(q)){p.smart=p.smart||{};p.smart.smc=!p.smart.smc;p.build(false);this.saveState();return p.smart.smc?L('تم تشغيل السمارت موني','Smart money on'):L('تم إيقاف السمارت موني','Smart money off')}
 if(/فيبو|fib/.test(q)){p.smart=p.smart||{};p.smart.fib=!p.smart.fib;p.build(false);this.saveState();return L('فيبوناتشي تلقائي ','Auto Fibonacci ')+(p.smart.fib?L('شغال','on'):L('متوقف','off'))}
 if(/انماط|نمط|pattern/.test(q)){this.autoPatterns&&this.autoPatterns();return L('الأنماط التلقائية','Auto patterns')}
 if(/حجم المركز|position/.test(q)){this.positionTool&&this.positionTool();return L('اضغط الدخول ثم الوقف ثم الهدف','Click entry, stop, then target')}
 if(/مركز القياده|hud|command center/.test(q)){const u='/hud/index.html?mode=trading';try{(window.top||window).location.href=u}catch(e){location.href=u}return ''}
 if((/السعر|بكام|كام|price|how much/.test(q))&&!/افتح|open/.test(q)){const s=sym||p.sym;if(s!==p.sym){this.setSymbol(s,symName(s))}const last=p.raw.length?p.raw[p.raw.length-1].close:null;return s===p.sym&&last!=null?L(`${nm(s)} الآن ${f2(last)}`,`${nm(s)} is ${f2(last)}`):L('جارٍ فتح ','Opening ')+nm(s)}
 if(sym||tf){if(sym&&sym!==p.sym)this.setSymbol(sym,symName(sym));if(tf&&tf!==p.tf){p.tf=tf;p.rng=null;p.load(true);this.saveState();this.syncTfUi&&this.syncTfUi()}return L('تم فتح ','Opened ')+(sym?nm(sym):p.sym)+(tf?' · '+tf:'')}
 return L('لم أفهم الأمر. جرّب: افتح الذهب على الساعة · ضيف متوسط 50 · نبهني لو الصويا فوق 1250 · تحليل','Not understood. Try: open gold on 1 hour · add SMA 50 · alert if soybeans above 1250 · analysis')};
App.prototype.commandBox=function(){const inp=el('input',{placeholder:L('اكتب أو اضغط الميكروفون… مثال: افتح الذهب على الساعة','Type or press the mic… e.g. open gold on 1 hour'),style:'width:100%'}),out=el('div',{class:'mut',style:'min-height:20px;margin-top:6px'});
 const run=t=>{const r=this.runCommand(t);out.textContent=r;if(r)say(r)};inp.onkeydown=e=>{if(e.key==='Enter'){run(inp.value);inp.value=''}};
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const mic=el('button',{class:'cmd-mic',onclick:()=>{if(!SR){out.textContent=L('المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو اكتب الأمر.','This browser has no speech recognition. Use Chrome or type the command.');return}
  const r=new SR();r.lang=AR()?'ar-EG':'en-US';r.interimResults=false;r.maxAlternatives=1;mic.classList.add('on');out.textContent=L('أسمعك…','Listening…');r.onresult=e=>{const t=e.results[0][0].transcript;inp.value=t;run(t)};r.onerror=e=>{out.textContent=L('تعذر السماع: ','Could not hear: ')+e.error};r.onend=()=>mic.classList.remove('on');try{r.start()}catch(e){}}},'🎤');
 const spk=el('input',{type:'checkbox',checked:Store.get('speakOn',true),onchange:()=>Store.set('speakOn',spk.checked)});
 modal(L('أوامر صوتية','Voice commands'),el('div',{},el('div',{class:'row2'},mic,inp),out,el('label',{class:'row2'},spk,el('span',{},L('الرد بالصوت وقراءة التنبيهات بصوت عالٍ','Answer aloud and read alerts aloud'))),
  el('p',{class:'mut'},L('أمثلة: «افتح البيتكوين على ربع ساعة» · «ضيف متوسط 200» · «ضيف RSI» · «امسح المؤشرات» · «نبهني لو الذهب فوق 2700» · «سعر الفضة» · «تحليل» · «سمارت موني» · «فيبو» · «إعادة تشغيل»','Examples: “open bitcoin on 15 minutes” · “add SMA 200” · “add RSI” · “clear indicators” · “alert me if gold is above 2700” · “silver price” · “analysis” · “smart money” · “fib” · “replay”'))));setTimeout(()=>inp.focus(),50)};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&window.app){e.preventDefault();app.commandBox()}});
const _fire=App.prototype.fireAlert;App.prototype.fireAlert=function(a,msg){_fire.call(this,a,msg);say((AR()?'تنبيه: ':'Alert: ')+String(window.I18N_TR?I18N_TR(String(msg)):msg).replace(/=F|=X|-USD/g,''))};

/* =============================== 9. Academy =============================== */
const LESSONS=[[L('الاتجاه','Trend'),L('السوق الصاعد يصنع قمماً وقيعاناً أعلى. ابحث عن الاتجاه على الإطار الأكبر أولاً ثم ادخل مع الاتجاه وليس ضده.','An uptrend makes higher highs and higher lows. Read the higher timeframe first and trade with the trend, not against it.')],
 [L('الدعم والمقاومة','Support & resistance'),L('المستويات التي ارتد منها السعر أكثر من مرة تتصرف كأرضية وسقف. الكسر الحقيقي يكون بإغلاق واضح وحجم أعلى.','Levels where price turned several times act as floor and ceiling. A real break comes with a clear close and higher volume.')],
 [L('مؤشر القوة النسبية','RSI'),L('فوق ٧٠ تشبع شراء وتحت ٣٠ تشبع بيع، لكن في الاتجاه القوي قد يبقى المؤشر متشبعاً طويلاً. استخدمه مع الاتجاه.','Above 70 is overbought, below 30 oversold, but in strong trends it can stay there. Use it with the trend.')],
 [L('السمارت موني','Smart money'),L('منطقة الطلب (OB) هي آخر شمعة عكسية قبل حركة قوية كسرت الهيكل. الفجوة (FVG) منطقة لم يتداول فيها السعر جيداً وغالباً يعود لملئها.','An order block is the last opposite candle before a move that broke structure. A fair value gap is an area price skipped and often revisits.')],
 [L('إدارة المخاطر','Risk management'),L('لا تخاطر بأكثر من ١٪ من حسابك في الصفقة. حدد الوقف قبل الدخول، واطلب عائداً ضعف المخاطرة على الأقل.','Risk no more than 1% per trade. Decide the stop before entering and aim for at least twice the risk.')],
 [L('سيكولوجية التداول','Trading psychology'),L('أخطر الصفقات صفقة التعويض بعد خسارة. حد الخسارة اليومي يحميك من نفسك.','The most dangerous trade is the revenge trade after a loss. A daily loss limit protects you from yourself.')]];
const GAME=['GC=F','SI=F','CL=F','ZS=F','ZC=F','ZW=F','ES=F','EURUSD=X','BTC-USD','NG=F','HG=F'];
App.prototype.tAcademy=function(){const c=this.tabc,sc=Store.get('acad',{played:0,correct:0,best:0,streak:0});
 c.append(el('div',{class:'card'},el('h4',{},L('أكاديمية التداول','Trading academy')),el('p',{class:'mut'},L('دروس قصيرة، ثم تدريب: نعرض لك السوق في لحظة من الماضي، تختار شراء أو بيع، ثم نكشف ما حدث في الشموع العشر التالية.','Short lessons, then practice: we show you the market at a moment in the past, you choose buy or sell, then we reveal the next 10 bars.')),
  el('div',{class:'cot-dh'},el('div',{class:'cot-kpi'},el('small',{},L('الجولات','Rounds')),el('b',{},String(sc.played))),el('div',{class:'cot-kpi'},el('small',{},L('الدقة','Accuracy')),el('b',{},sc.played?(sc.correct/sc.played*100).toFixed(0)+'%':'-')),el('div',{class:'cot-kpi'},el('small',{},L('أفضل سلسلة','Best streak')),el('b',{},String(sc.best))),el('div',{class:'cot-kpi'},el('small',{},L('السلسلة الحالية','Streak')),el('b',{},String(sc.streak)))),
  el('button',{onclick:()=>this.practice()},L('▶ ابدأ تدريباً','▶ Start practice'))));
 LESSONS.forEach(([t,b],i)=>c.append(el('div',{class:'card'},el('b',{},(i+1)+'. '+t),el('p',{},b))))};
App.prototype.practice=async function(){const p=this.active;if(p.rp)p.exitReplay(true);const s=GAME[Math.floor(Math.random()*GAME.length)];if(p.tf!=='1D'){p.tf='1D';p.rng=null}
 toast(L('جارٍ تجهيز سوق عشوائي… الرمز مخفي حتى النهاية','Preparing a random market… the symbol stays hidden until the end'));this.setSymbol(s,symName(s));
 let n=0;await new Promise(r=>{const iv=setInterval(()=>{if((p.sym===s&&p.raw.length>200&&!p.msgEl.textContent)||++n>60){clearInterval(iv);r()}},200)});if(p.raw.length<200){toast(L('تعذر تحميل البيانات','Could not load data'),'err');return}
 const idx=120+Math.floor(Math.random()*(p.raw.length-160));p.startReplay(idx);document.body.classList.add('acad-on');
 const bar=el('div',{class:'acad-bar'},el('b',{},L('ماذا تفعل الآن؟','What do you do now?')),el('button',{class:'b-buy',onclick:()=>pick(1)},L('شراء','Buy')),el('button',{class:'b-sell',onclick:()=>pick(-1)},L('بيع','Sell')),el('button',{onclick:()=>pick(0)},L('انتظار','Wait')));p.cwrap.append(bar);
 const pick=dir=>{const r=p.rp,a=r.full[r.i].close;p.rpStep(10);const b=r.full[r.i].close,ret=(b/a-1)*100,ok=dir===0?Math.abs(ret)<1:Math.sign(ret)===dir&&Math.abs(ret)>=.2;const sc=Store.get('acad',{played:0,correct:0,best:0,streak:0});sc.played++;if(ok){sc.correct++;sc.streak++;sc.best=Math.max(sc.best,sc.streak)}else sc.streak=0;Store.set('acad',sc);
  bar.innerHTML='';document.body.classList.remove('acad-on');bar.append(el('b',{class:ok?'cot-up':'cot-dn'},(ok?L('✓ صحيح','✓ Right'):L('✕ خطأ','✕ Wrong'))+' · '+nm(s)+' '+(ret>0?'+':'')+ret.toFixed(2)+'%'),el('button',{onclick:()=>{bar.remove();this.practice()}},L('جولة أخرى','Next round')),el('button',{onclick:()=>{bar.remove();p.exitReplay();if(this.tab==='Academy')this.showTab('Academy')}},L('إنهاء','Finish')));say(ok?L('صحيح','Right'):L('خطأ','Wrong'))}};

/* =============================== 10. news sentiment =============================== */
const POS=/\b(surge|soar|rall(y|ies)|gain|rise|rising|jump|climb|record high|beat|strong|bullish|boost|rebound|recover|higher|upgrade|tight supply|shortage|demand rises|optimis)/i,NEG=/\b(fall|falls|drop|plunge|slump|declin|loss|weak|bearish|cut|lower|fear|crash|tumble|slide|concern|glut|surplus|downgrade|recession|sell-?off|pressure|worr)/i;
const POSA=/ارتفاع|صعود|قفز|مكاسب|قوي|انتعاش|تعافي|اعلي مستوي|طلب قوي|نقص/,NEGA=/انخفاض|هبوط|تراجع|خسائر|ضعيف|ركود|فائض|مخاوف|انهيار|ضغوط/;
const senti=t=>{const s=NORM(t);let v=0;if(POS.test(t)||POSA.test(s))v++;if(NEG.test(t)||NEGA.test(s))v--;return v};
App.prototype.tNewsS=function(){this.tNews();const c=this.tabc;const mood=el('div',{class:'card news-mood'});c.prepend(mood);
 const scan=()=>{const cards=[...c.querySelectorAll('.card')].filter(x=>x!==mood&&x.querySelector('a,span'));let pos=0,neg=0,neu=0;
  cards.forEach(cd=>{let v=cd._sent;if(v==null){const t=(cd.querySelector('a,span')||{}).textContent||'';v=cd._sent=senti(t);cd.prepend(el('span',{class:'sent '+(v>0?'cot-up':v<0?'cot-dn':'mut')},v>0?L('▲ إيجابي ','▲ positive '):v<0?L('▼ سلبي ','▼ negative '):L('● محايد ','● neutral ')))}v>0?pos++:v<0?neg++:neu++});
  const tot=pos+neg+neu;if(!tot){mood.innerHTML='';return}const sc=(pos-neg)/tot;mood.innerHTML='';mood.append(el('b',{},L('مزاج الأخبار: ','News mood: ')+(sc>.15?L('إيجابي','positive'):sc<-.15?L('سلبي','negative'):L('محايد','neutral'))),
   el('div',{class:'cot-bar',style:'margin:6px 0'},el('i',{style:`width:${(pos/tot*100).toFixed(0)}%`})),el('span',{class:'mut'},`▲ ${pos} · ▼ ${neg} · ● ${neu} · `+L('تصنيف آلي بالكلمات المفتاحية في العناوين فقط.','keyword-based reading of headlines only.')))};
 const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(scan,150)});mo.observe(c,{childList:true,subtree:true});scan()};

window.SMART={smc,harmonic,autoFib,PLAN,senti};
/* =============================== wiring =============================== */
const _right=App.prototype.buildRight;
App.prototype.buildRight=function(){_right.call(this);this.tabDefs.Plan=()=>this.tPlan();if(this.tabDefs.News)this.tabDefs.News=()=>this.tNewsS();this.tabDefs.Academy=()=>this.tAcademy();
 const mk=k=>el('button',{'data-tab':k,onclick:()=>this.showTab(k)},k);const pp=this.tabs.querySelector('[data-tab=Paper]');const b1=mk('Plan'),b2=mk('Academy');pp?(pp.after(b1),b1.after(b2)):(this.tabs.append(b1,b2))};
const _top=App.prototype.buildTop;
App.prototype.buildTop=function(){_top.call(this);const box=document.querySelector('#top .pro-tools')||$('#top');
 box.append(el('button',{title:'Smart money, auto Fibonacci, harmonics, pivots',onclick:()=>this.smartDialog()},'🧩 SMC+'),el('button',{title:'Voice and typed commands (Ctrl+K)',onclick:()=>this.commandBox()},'🎤 Voice'))};
})();
