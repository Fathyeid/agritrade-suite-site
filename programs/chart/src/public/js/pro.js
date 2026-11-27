// Pro tools: Bar Replay, Share chart link, Auto trendlines & chart patterns, Multi-timeframe (MTF) indicators,
// Strategy optimizer (parameter grid + out-of-sample + multi-symbol), watchlist scan alerts fix.
// Everything runs in the browser on the same free data feed; nothing here is a trading signal.
(()=>{
const LWX=LightweightCharts, NS=s=>String(s);
const ts=t=>new Date(t*1000).toISOString().slice(0,10);

/* ---------------- persistence of per-pane pro settings (MTF lines, auto patterns) ---------------- */
const _save=App.prototype.saveState;
App.prototype.saveState=function(){_save.call(this);try{Store.set('proPanes',this.panes.map(p=>({mtf:p.mtf||[],ap:!!p.autoPat})))}catch(e){}};
const _setLayout=App.prototype.setLayout;
App.prototype.setLayout=function(n,states){_setLayout.call(this,n,states);const pp=Store.get('proPanes',[]);this.panes.forEach((p,i)=>{if(p.mtf===undefined){p.mtf=(pp[i]&&pp[i].mtf)||[];p.autoPat=!!(pp[i]&&pp[i].ap)}})};

/* ---------------- build hook: redraw pro layers after every chart build ---------------- */
const _build=Pane.prototype.build;
Pane.prototype.build=function(reset){_build.call(this,reset);if(!this.view||!this.view.length)return;try{if(this.autoPat)drawAuto(this)}catch(e){console.warn('auto',e)}try{if(this.mtf&&this.mtf.length)drawMtf(this)}catch(e){console.warn('mtf',e)}};

/* =============================== 1. BAR REPLAY =============================== */
const _load=Pane.prototype.load;
Pane.prototype.load=function(reset){if(this.rp){if(this.rp.sym===this.sym&&this.rp.tf===this.tf)return Promise.resolve();this.exitReplay(true)}return _load.call(this,reset)};
Pane.prototype.startReplay=function(i){const full=this.raw.slice();if(full.length<30){toast('Not enough bars for replay','err');return}
 i=Math.max(20,Math.min(full.length-2,i));this.rp={full,i,sym:this.sym,tf:this.tf,play:false,speed:1,pos:null,closed:[]};this.raw=full.slice(0,i+1);this.build(true);this.rpUi();this.rpShow()};
Pane.prototype.rpStep=function(n){const r=this.rp;if(!r)return;if(r.i>=r.full.length-1){this.rpPause();toast('Replay reached the last bar');return}r.i=Math.min(r.full.length-1,r.i+(n||1));this.raw=r.full.slice(0,r.i+1);this.build(false);this.rpShow()};
Pane.prototype.rpPlay=function(){const r=this.rp;if(!r)return;r.play=true;clearInterval(r.t);r.t=setInterval(()=>this.rpStep(1),Math.max(60,1000/r.speed));this.rpShow()};
Pane.prototype.rpPause=function(){const r=this.rp;if(!r)return;r.play=false;clearInterval(r.t);this.rpShow()};
Pane.prototype.exitReplay=function(silent){const r=this.rp;if(!r)return;clearInterval(r.t);this.raw=r.full;this.rp=null;if(this.rpBar)this.rpBar.remove();this.rpBar=null;if(!silent)this.build(true)};
Pane.prototype.rpTrade=function(dir){const r=this.rp,px=r.full[r.i].close;if(r.pos){const pnl=(px-r.pos.px)*r.pos.dir/r.pos.px*100;r.closed.push({dir:r.pos.dir,in:r.pos.px,out:px,pnl,t0:r.pos.t,t1:r.full[r.i].time});r.pos=null}if(dir)r.pos={dir,px,t:r.full[r.i].time};this.rpShow()};
Pane.prototype.rpUi=function(){if(this.rpBar)this.rpBar.remove();const r=this.rp;
 const B=(t,ti,f)=>el('button',{title:ti,onclick:f},t);
 this.rpPlayBtn=B('▶','Play / pause (space)',()=>r.play?this.rpPause():this.rpPlay());
 const sp=el('select',{title:'Speed',onchange:e=>{r.speed=+e.target.value;if(r.play)this.rpPlay()}},...[1,2,5,10,20].map(x=>el('option',{value:x},x+'x')));
 const di=el('input',{type:'date',title:'Jump to date',style:'width:130px'});
 this.rpInfo=el('span',{class:'rp-info'});this.rpPnl=el('span',{class:'rp-pnl'});
 this.rpBar=el('div',{class:'rp-bar'},el('b',{},'Replay'),B('⏮','Back 10 bars',()=>{r.i=Math.max(20,r.i-10);this.raw=r.full.slice(0,r.i+1);this.build(false);this.rpShow()}),this.rpPlayBtn,B('⏭','Next bar',()=>this.rpStep(1)),sp,di,
  B('Go','Restart replay from this date',()=>{if(!di.value)return;const t=Date.parse(di.value+'T00:00:00Z')/1000;let k=r.full.findIndex(b=>b.time>=t);if(k<0)k=r.full.length-2;r.i=Math.max(20,k);r.pos=null;r.closed=[];this.raw=r.full.slice(0,r.i+1);this.build(true);this.rpShow()}),
  this.rpInfo,B('Buy','Open long at this bar close',()=>this.rpTrade(1)),B('Sell','Open short at this bar close',()=>this.rpTrade(-1)),B('Flat','Close position',()=>this.rpTrade(0)),this.rpPnl,B('✕','Exit replay',()=>this.exitReplay()));
 this.cwrap.append(this.rpBar)};
Pane.prototype.rpShow=function(){const r=this.rp;if(!r||!this.rpBar)return;const b=r.full[r.i];this.rpPlayBtn.textContent=r.play?'⏸':'▶';
 this.rpInfo.textContent=ts(b.time)+'  '+fmt(b.close)+'  ('+(r.i+1)+'/'+r.full.length+')';
 const real=r.closed.reduce((s,x)=>s+x.pnl,0),open=r.pos?(b.close-r.pos.px)*r.pos.dir/r.pos.px*100:0;
 const AR=localStorage.getItem('suite_lang')==='ar';this.rpPnl.textContent=(r.pos?(r.pos.dir>0?(AR?'شراء ':'Long '):(AR?'بيع ':'Short '))+(open>=0?'+':'')+open.toFixed(2)+'% · ':'')+(AR?'الربح/الخسارة ':'P&L ')+(real>=0?'+':'')+real.toFixed(2)+'% · '+r.closed.length+(AR?' صفقة':' trades');
 this.rpPnl.className='rp-pnl '+(real+open>=0?'cot-up':'cot-dn')};
App.prototype.replayStart=function(){const p=this.active;if(!p||!p.raw.length)return;if(p.rp){p.exitReplay();return}
 toast('Click a bar on the chart to start the replay from there (Esc = last 100 bars)');
 const h=param=>{p.chart.unsubscribeClick(h);document.removeEventListener('keydown',kh);let i=p.raw.length-100;if(param&&param.time!=null){const k=p.raw.findIndex(b=>b.time>=param.time);if(k>=0)i=k}p.startReplay(i)};
 const kh=e=>{if(e.key==='Escape'){p.chart.unsubscribeClick(h);document.removeEventListener('keydown',kh);p.startReplay(p.raw.length-100)}};
 p.chart.subscribeClick(h);document.addEventListener('keydown',kh)};
document.addEventListener('keydown',e=>{const p=window.app&&window.app.active;if(!p||!p.rp||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;if(e.code==='Space'){e.preventDefault();p.rp.play?p.rpPause():p.rpPlay()}else if(e.key==='ArrowRight'&&e.shiftKey){e.preventDefault();p.rpStep(1)}});

/* =============================== 2. SHARE CHART LINK =============================== */
const b64u=bytes=>{let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const ub64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0))};
async function pack(obj){const raw=new TextEncoder().encode(JSON.stringify(obj));if(window.CompressionStream){const cs=new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));return 'z'+b64u(new Uint8Array(await new Response(cs).arrayBuffer()))}return 'j'+b64u(raw)}
async function unpack(s){const k=s[0],b=ub64u(s.slice(1));if(k==='z'){const ds=new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return JSON.parse(await new Response(ds).text())}return JSON.parse(new TextDecoder().decode(b))}
App.prototype.shareChart=async function(){const draws=Store.get('draws',{});
 const obj={v:1,n:this.n,p:this.panes.map(p=>({...p.state(),mtf:p.mtf||[],ap:!!p.autoPat,dr:(draws[p.sym]||[]).map(d=>{const c={...d};delete c._segs;delete c._box;return c})}))};
 const url=location.origin+location.pathname+'#share='+await pack(obj);
 const inp=el('input',{value:url,style:'width:100%',readonly:true});
 const m=modal('Share this chart',el('div',{},el('p',{class:'mut'},'Anyone with this link opens the same layout: symbols, timeframes, chart type, indicators, multi-timeframe lines and drawings. Prices load live when it is opened.'),inp,
  el('div',{class:'row2',style:'margin-top:8px'},el('button',{onclick:async()=>{try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(e){inp.select();document.execCommand('copy');toast('Link copied')}}},'Copy link'),
   navigator.share?el('button',{onclick:()=>navigator.share({title:'Chart',url}).catch(()=>{})},'Share…'):null)));inp.focus();inp.select()};
async function openShared(){const m=location.hash.match(/share=([A-Za-z0-9_-]+)/);if(!m||!window.app)return;let o;try{o=await unpack(m[1])}catch(e){toast('This share link is damaged','err');return}
 history.replaceState(null,'',location.pathname+location.search);
 if(!confirm('Open the shared chart? It replaces your current layout. Your own drawings are kept; the shared drawings are added.'))return;
 const draws=Store.get('draws',{});(o.p||[]).forEach(p=>{if(p.dr&&p.dr.length){const mine=draws[p.sym]||[],ids=new Set(mine.map(d=>d.id));draws[p.sym]=mine.concat(p.dr.filter(d=>!ids.has(d.id)))}});Store.set('draws',draws);
 Store.set('proPanes',(o.p||[]).map(p=>({mtf:p.mtf||[],ap:!!p.ap})));
 app.rebuildLayout(o.n||1,(o.p||[]).map(p=>{const s={...p};delete s.dr;delete s.mtf;delete s.ap;return s}));
 app.panes.forEach((p,i)=>{p.mtf=(o.p[i]&&o.p[i].mtf)||[];p.autoPat=!!(o.p[i]&&o.p[i].ap)});app.saveState();app.activate(app.panes[0])}

/* =============================== 3. AUTO TRENDLINES & CHART PATTERNS =============================== */
function pivots(d,k){const H=[],L=[];for(let i=k;i<d.length-k;i++){let hi=true,lo=true;for(let j=i-k;j<=i+k;j++){if(d[j].high>d[i].high)hi=false;if(d[j].low<d[i].low)lo=false}if(hi)H.push(i);if(lo)L.push(i)}return {H,L}}
function atr(d,n){let s=0,c=0;for(let i=Math.max(1,d.length-n);i<d.length;i++){s+=Math.max(d[i].high-d[i].low,Math.abs(d[i].high-d[i-1].close),Math.abs(d[i].low-d[i-1].close));c++}return c?s/c:0}
function bestLine(d,idx,isLow,tol){const cand=idx.slice(-8);let best=null;
 for(let a=0;a<cand.length;a++)for(let b=a+1;b<cand.length;b++){const i1=cand[a],i2=cand[b],y1=isLow?d[i1].low:d[i1].high,y2=isLow?d[i2].low:d[i2].high,sl=(y2-y1)/(i2-i1);
  if(isLow&&sl<0&&d.length-i2>40)continue;let ok=true,touch=0;
  for(let i=i1;i<d.length;i++){const y=y1+sl*(i-i1),px=isLow?d[i].close:d[i].close;if(isLow?px<y-tol:px>y+tol){ok=false;break}const ex=isLow?d[i].low:d[i].high;if(Math.abs(ex-y)<=tol)touch++}
  if(!ok)continue;const sc=touch*10+i2/d.length*5;if(!best||sc>best.sc)best={i1,i2,y1,sl,touch,sc}}
 return best}
const near=(a,b,tol)=>Math.abs(a-b)<=tol;
function findPatterns(d,H,L,A){const out=[],last=d.length-1;
 const ph=H.slice(-4),pl=L.slice(-4);
 // double top / bottom
 if(ph.length>=2){const [a,b]=ph.slice(-2),tr=L.filter(i=>i>a&&i<b);if(tr.length&&near(d[a].high,d[b].high,0.8*A)){const t=Math.min(...tr.map(i=>d[i].low));if(Math.max(d[a].high,d[b].high)-t>=2*A)out.push({k:'Double top',i:b,up:false,neck:t,conf:d[last].close<t})}}
 if(pl.length>=2){const [a,b]=pl.slice(-2),pk=H.filter(i=>i>a&&i<b);if(pk.length&&near(d[a].low,d[b].low,0.8*A)){const t=Math.max(...pk.map(i=>d[i].high));if(t-Math.min(d[a].low,d[b].low)>=2*A)out.push({k:'Double bottom',i:b,up:true,neck:t,conf:d[last].close>t})}}
 // head and shoulders (and inverse)
 if(ph.length>=3){const [l,h,r]=ph.slice(-3);if(d[h].high>d[l].high+A&&d[h].high>d[r].high+A&&near(d[l].high,d[r].high,1.2*A)){const tr=L.filter(i=>i>l&&i<r);if(tr.length>=1){const neck=Math.min(...tr.map(i=>d[i].low));out.push({k:'Head and shoulders',i:r,up:false,neck,conf:d[last].close<neck})}}}
 if(pl.length>=3){const [l,h,r]=pl.slice(-3);if(d[h].low<d[l].low-A&&d[h].low<d[r].low-A&&near(d[l].low,d[r].low,1.2*A)){const pk=H.filter(i=>i>l&&i<r);if(pk.length>=1){const neck=Math.max(...pk.map(i=>d[i].high));out.push({k:'Inverse head and shoulders',i:r,up:true,neck,conf:d[last].close>neck})}}}
 // triangles from the last two swing highs and lows
 if(ph.length>=2&&pl.length>=2){const h1=d[ph[ph.length-2]].high,h2=d[ph[ph.length-1]].high,l1=d[pl[pl.length-2]].low,l2=d[pl[pl.length-1]].low,fh=near(h1,h2,0.5*A),fl=near(l1,l2,0.5*A),dh=h2<h1-0.5*A,ul=l2>l1+0.5*A;
  const i=Math.max(ph[ph.length-1],pl[pl.length-1]);
  if(dh&&ul)out.push({k:'Symmetrical triangle',i,up:null});else if(fh&&ul)out.push({k:'Ascending triangle',i,up:true});else if(dh&&fl)out.push({k:'Descending triangle',i,up:false})}
 return out}
function drawAuto(p){const d=p.view;if(d.length<60)return;const th=p.app.theme,ch=p.chart;
 const k=d.length>600?8:d.length>200?5:3,{H,L}=pivots(d,k),A=atr(d,14)||((d[d.length-1].close)*0.01),tol=A*0.35,last=d.length-1;
 const line=(seg,col,dash)=>{const s=ch.addSeries(LWX.LineSeries,{color:col,lineWidth:2,lineStyle:dash?2:0,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false},0);p.series.push(s);s.setData(seg);return s};
 const tl=(b,isLow)=>{if(!b)return;const y=i=>b.y1+b.sl*(i-b.i1);line([{time:d[b.i1].time,value:b.y1},{time:d[last].time,value:y(last)}],isLow?th.up:th.down,false)};
 tl(bestLine(d,L,true,tol),true);tl(bestLine(d,H,false,tol),false);
 // horizontal support / resistance: clusters of 3+ swing points
 const lv=[];H.concat(L).forEach(i=>{const v=H.includes(i)?d[i].high:d[i].low;const c=lv.find(x=>Math.abs(x.v-v)<=0.6*A);if(c){c.v=(c.v*c.n+v)/(c.n+1);c.n++}else lv.push({v,n:1})});
 const px=d[last].close;lv.filter(x=>x.n>=3).sort((a,b)=>b.n-a.n).slice(0,4).forEach(x=>{try{p.main.createPriceLine({price:x.v,color:x.v<px?th.up:th.down,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:(x.v<px?'S':'R')+x.n})}catch(e){}});
 // patterns, labelled with markers on an invisible helper series
 const pats=findPatterns(d,H,L,A);p.autoFound=pats;
 if(pats.length){const s=ch.addSeries(LWX.LineSeries,{color:'rgba(0,0,0,0)',lineVisible:false,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false},0);p.series.push(s);
  s.setData(d.map(b=>({time:b.time,value:b.close})));
  const mk=pats.map(x=>({time:d[x.i].time,position:x.up===false?'aboveBar':'belowBar',color:x.up===false?th.down:x.up?th.up:'#ff9800',shape:x.up===false?'arrowDown':x.up?'arrowUp':'circle',text:x.k+(x.conf===true?' ✓':'')})).sort((a,b)=>a.time-b.time);
  try{createSeriesMarkers(s,mk)}catch(e){}
  pats.filter(x=>x.neck!=null).forEach(x=>line([{time:d[Math.max(0,x.i-20)].time,value:x.neck},{time:d[last].time,value:x.neck}],'#ff9800',true))}}
App.prototype.autoPatterns=function(){const p=this.active;if(!p)return;p.autoPat=!p.autoPat;p.build(false);this.saveState();
 if(p.autoPat){const f=p.autoFound||[];toast(f.length?'Found: '+f.map(x=>x.k+(x.conf?' (confirmed)':'')).join(', '):'Auto trendlines and support/resistance drawn. No complete chart pattern right now.')}else toast('Auto patterns off')};

/* =============================== 4. MULTI-TIMEFRAME INDICATORS =============================== */
const MTF_COL=['#ff9800','#e040fb','#00bcd4','#ffeb3b','#8bc34a'];
async function htfData(p,tf){p._htf=p._htf||{};const k=p.sym+'|'+tf;if(!p._htf[k])p._htf[k]=Data.get(p.sym,tf).then(r=>r.bars);return p._htf[k]}
function calcMtf(m,bars){const c=bars.map(b=>b.close);if(m.k==='ema')return M.ema(c,m.n);if(m.k==='sma')return M.sma(c,m.n);if(m.k==='hi')return bars.map((b,i)=>i?bars[i-1].high:null);if(m.k==='lo')return bars.map((b,i)=>i?bars[i-1].low:null);return M.sma(c,m.n)}
function drawMtf(p){const d=p.view,sym=p.sym,ver=(p._mtfv=(p._mtfv||0)+1);
 p.mtf.forEach((m,mi)=>{htfData(p,m.tf).then(hb=>{if(p.sym!==sym||p._mtfv!==ver||!p.view.length)return;const v=calcMtf(m,hb),out=[];let j=0;
  for(const b of p.view){while(j+1<hb.length&&hb[j+1].time<=b.time)j++;if(hb[j].time<=b.time&&v[j]!=null&&isFinite(v[j]))out.push({time:b.time,value:v[j]})}
  if(!out.length)return;const s=p.chart.addSeries(LWX.LineSeries,{color:m.c||MTF_COL[mi%MTF_COL.length],lineWidth:2,lineType:1,priceLineVisible:false,lastValueVisible:true,title:mtfName(m),crosshairMarkerVisible:false},0);p.series.push(s);s.setData(out)}).catch(()=>{})})}
const mtfName=m=>(m.k==='hi'?'Prev '+m.tf+' high':m.k==='lo'?'Prev '+m.tf+' low':m.k.toUpperCase()+' '+m.n)+' ['+m.tf+']';
App.prototype.mtfDialog=function(){const p=this.active;if(!p)return;p.mtf=p.mtf||[];
 const kind=el('select',{},...[['ema','EMA'],['sma','SMA'],['hi','Previous period high'],['lo','Previous period low']].map(([v,l])=>el('option',{value:v},l)));
 const len=el('input',{value:'50',style:'width:60px'}),tf=el('select',{},...['1H','4H','1D','1W','1M'].map(k=>el('option',{value:k,selected:k==='1D'},k)));
 const list=el('div');const draw=()=>{list.innerHTML='';if(!p.mtf.length)list.append(el('p',{class:'mut'},'No multi-timeframe lines yet.'));p.mtf.forEach((m,i)=>list.append(el('div',{class:'row2'},el('span',{style:'color:'+(m.c||MTF_COL[i%MTF_COL.length])},'━ '),el('span',{},mtfName(m)),el('button',{onclick:()=>{p.mtf.splice(i,1);p.build(false);this.saveState();draw()}},'Remove'))))};
 modal('Multi-timeframe indicators',el('div',{},el('p',{class:'mut'},'Show an indicator from a higher timeframe on this chart, e.g. the daily EMA 50 on an hourly chart. Each value is the one of the higher-timeframe bar that contains the current bar.'),
  el('div',{class:'row2'},kind,len,el('label',{},'from'),tf,el('button',{onclick:()=>{p.mtf.push({k:kind.value,n:Math.max(1,+len.value||50),tf:tf.value,c:MTF_COL[p.mtf.length%MTF_COL.length]});p.build(false);this.saveState();draw()}},'Add')),list));draw()};

/* =============================== 5. STRATEGY OPTIMIZER =============================== */
const OPT_TPL={'SMA cross {a}/{b}':['crossover(sma(close,{a}), sma(close,{b}))','crossunder(sma(close,{a}), sma(close,{b}))'],'EMA cross {a}/{b}':['crossover(ema(close,{a}), ema(close,{b}))','crossunder(ema(close,{a}), ema(close,{b}))'],
 'RSI {a} oversold {b}':['crossover(rsi(close,{a}), {b})','rsi(close,{a}) > 70'],'Breakout {a} bars, exit {b} bars':['close > ref(highest(high,{a}),1)','close < ref(lowest(low,{b}),1)']};
const rng=s=>{const m=String(s).match(/^\s*(-?[\d.]+)\s*(?:\.\.|-|to)\s*(-?[\d.]+)\s*(?:step\s*|:)?\s*([\d.]+)?\s*$/i);if(!m)return [+s].filter(isFinite);const a=+m[1],b=+m[2],st=+m[3]||Math.max(1,Math.round((b-a)/10));const o=[];for(let v=a;v<=b+1e-9&&o.length<60;v+=st)o.push(+v.toFixed(6));return o};
const fill=(t,a,b)=>t.replace(/\{a\}/g,a).replace(/\{b\}/g,b);
App.prototype.tOptimizer=function(){const c=this.tabc,s=Store.get('optcfg',{});
 const tpl=el('select',{onchange:e=>{const t=OPT_TPL[e.target.value];if(t){en.value=t[0];ex.value=t[1]}}},el('option',{value:''},'Template...'),...Object.keys(OPT_TPL).map(k=>el('option',{value:k},k)));
 const en=el('textarea',{rows:2},s.en||OPT_TPL['SMA cross {a}/{b}'][0]),ex=el('textarea',{rows:2},s.ex||OPT_TPL['SMA cross {a}/{b}'][1]);
 const ra=el('input',{value:s.ra||'5..50 step 5',style:'width:110px'}),rb=el('input',{value:s.rb||'20..200 step 10',style:'width:110px'}),lt=el('input',{type:'checkbox',checked:s.lt!==false});
 const met=el('select',{},...[['ret','Return %'],['sharpe','Sharpe'],['pf','Profit factor'],['calmar','Return / drawdown']].map(([v,l])=>el('option',{value:v,selected:v===(s.met||'ret')},l)));
 const oos=el('input',{value:s.oos||'30',style:'width:50px'}),syms=el('input',{value:s.syms||'GC=F, SI=F, CL=F, ES=F, EURUSD=X, BTC-USD',style:'width:100%'});
 const st=el('div',{class:'mut'}),out=el('div');let stop=false;
 const score=(r,k)=>{const x=r.stats,e=r.ex||{};return k==='sharpe'?(e.sharpe??-1e9):k==='pf'?(isFinite(x.pf)?x.pf:99):k==='calmar'?(x.dd?x.ret/Math.abs(x.dd):x.ret):x.ret};
 const run=async()=>{const p=this.active,d=p.raw;if(!d||d.length<100){st.textContent='Load a chart with at least 100 bars first.';return}
  Store.set('optcfg',{en:en.value,ex:ex.value,ra:ra.value,rb:rb.value,lt:lt.checked,met:met.value,oos:oos.value,syms:syms.value});
  const A=rng(ra.value),B=/\{b\}/.test(en.value+ex.value)?rng(rb.value):[0],cut=Math.floor(d.length*(1-Math.min(60,Math.max(0,+oos.value||0))/100)),ins=d.slice(0,cut),oo=d.slice(cut);
  const base=Store.get('btcfg',{}),cfg0={mode:'long',sl:0,tp:0,trail:0,risk:0,slip:0,comm:0,fee:0.05,size:100,capital:10000,...base,entryS:'',exitS:''};
  const combos=[];A.forEach(a=>B.forEach(b=>{if(lt.checked&&B.length>1&&!(a<b))return;combos.push([a,b])}));
  if(!combos.length){st.textContent='No combinations: check the ranges.';return}if(combos.length>2500){st.textContent='Too many combinations ('+combos.length+'). Narrow the ranges (max 2500).';return}
  stop=false;out.innerHTML='';const res=[];let done=0,errs=0;
  for(const [a,b] of combos){if(stop)break;const cfg={...cfg0,entry:fill(en.value,a,b),exit:fill(ex.value,a,b)};
   try{const r=BT.run(ins,cfg);let o=null;try{o=oo.length>60?BT.run(oo,cfg):null}catch(e){}res.push({a,b,r,o,sc:score(r,met.value)})}catch(e){errs++}
   if(++done%20===0){st.textContent='Testing '+done+' / '+combos.length+'…';await new Promise(z=>setTimeout(z,0))}}
  res.sort((x,y)=>y.sc-x.sc);st.textContent='Tested '+done+' combinations on '+p.sym+' ('+p.tf+')'+(errs?' · '+errs+' failed':'')+'. In-sample = first '+(100-(+oos.value||0))+'% of bars; out-of-sample = the rest.';
  if(!res.length){out.append(el('p',{class:'dn'},'No combination produced trades. Check the rules.'));return}
  const t=el('table',{class:'cot-t'},el('thead',{},el('tr',{},...['a','b','Return %','Trades','Win %','Max DD %','Sharpe','OOS return %',''].map(h=>el('th',{},h)))));const tb=el('tbody');
  res.slice(0,25).forEach(x=>{const S=x.r.stats;tb.append(el('tr',{},el('td',{},NS(x.a)),el('td',{},B.length>1?NS(x.b):'-'),el('td',{class:S.ret>=0?'cot-up':'cot-dn'},S.ret.toFixed(1)),el('td',{},NS(S.n)),el('td',{},S.win.toFixed(0)),el('td',{},Math.abs(S.dd||0).toFixed(1)),el('td',{},x.r.ex&&x.r.ex.sharpe!=null?x.r.ex.sharpe.toFixed(2):'-'),
   el('td',{class:x.o?(x.o.stats.ret>=0?'cot-up':'cot-dn'):''},x.o?x.o.stats.ret.toFixed(1):'-'),el('td',{},el('button',{onclick:()=>{Store.set('btcfg',{...Store.get('btcfg',{}),entry:fill(en.value,x.a,x.b),exit:fill(ex.value,x.a,x.b)});this.showTab('Backtest');toast('Rules copied to Backtest')}},'Use'))))});
  t.append(tb);out.append(el('h4',{},'Best 25 (sorted by '+met.options[met.selectedIndex].text+')'),t);
  const best=res[0],ov=res.slice(0,10).filter(x=>x.o&&x.o.stats.ret<0).length;
  out.append(el('p',{class:'mut'},ov>=5?'Warning: most of the top results lose money out-of-sample. These settings are probably over-fitted to the past.':'Check the out-of-sample column: a setting that only works in-sample is over-fitted.'));
  out.append(el('button',{onclick:()=>multi(best)},'Test the best setting on other symbols'),el('div',{id:'optmulti'}));
  async function multi(x){const box=$('#optmulti');box.innerHTML='';const list=syms.value.split(/[,\s]+/).filter(Boolean).map(z=>z.toUpperCase());const tt=el('table',{class:'cot-t'},el('thead',{},el('tr',{},...['Symbol','Return %','Buy & hold %','Trades','Max DD %'].map(h=>el('th',{},h)))));const tb2=el('tbody');tt.append(tb2);box.append(el('h4',{},'a='+x.a+(B.length>1?' b='+x.b:'')+' on other symbols ('+p.tf+')'),tt);
   for(const sy of list){try{const dd=(await Data.get(sy,p.tf)).bars;const r=BT.run(dd,{...cfg0,entry:fill(en.value,x.a,x.b),exit:fill(ex.value,x.a,x.b)});const S=r.stats;tb2.append(el('tr',{},el('td',{},sy),el('td',{class:S.ret>=0?'cot-up':'cot-dn'},S.ret.toFixed(1)),el('td',{},S.bh.toFixed(1)),el('td',{},NS(S.n)),el('td',{},Math.abs(S.dd||0).toFixed(1))))}catch(e){tb2.append(el('tr',{},el('td',{},sy),el('td',{colspan:4,class:'mut'},'no data')))}}}};
 c.append(el('div',{class:'card'},el('h4',{},'Strategy optimizer'),el('p',{class:'mut'},'Tries every combination of the parameters {a} and {b} in the rules on the active chart, ranks them, and checks each one on unseen bars (out-of-sample). Costs and position sizing come from the Backtest tab.')),
  el('div',{class:'row2'},tpl),el('label',{class:'mut'},'Entry rule (use {a} and {b})'),en,el('label',{class:'mut'},'Exit rule'),ex,
  el('div',{class:'row2'},el('label',{},'{a}'),ra,el('label',{},'{b}'),rb),el('div',{class:'row2'},el('label',{},'only a < b'),lt,el('label',{},'Rank by'),met),el('div',{class:'row2'},el('label',{},'Out-of-sample %'),oos),
  el('label',{class:'mut'},'Symbols for the cross-market test'),syms,el('div',{class:'row2'},el('button',{onclick:run},'Run optimizer'),el('button',{onclick:()=>{stop=true}},'Stop')),st,out)};

/* =============================== 6. WATCHLIST SCAN ALERTS =============================== */
// the scan alert offered "Active watchlist" but evaluated the catalog lookup, which is empty for 'wl'
const _scan=App.prototype.evalScanAlert;
App.prototype.evalScanAlert=async function(a,init){if(a.uni!=='wl')return _scan.call(this,a,init);
 if(!init&&Date.now()-(a.ran||0)<15*60000)return;a.ran=Date.now();const w=this.wl||{},lst=(w.lists&&w.lists[w.cur])||[];const syms=lst.map(x=>typeof x==='string'?[x,symName(x)]:[x.s||x.sym||x[0],x.n||x.name||x[1]||'']).filter(x=>x[0]&&!/^#/.test(x[0]));
 const hits=[];await scanRun(a.expr,syms,r=>hits.push(r.s),()=>{},{v:false});const seen=a.seen||[],nw=hits.filter(h=>!seen.includes(h));a.seen=hits;Store.set('alerts',this.alerts);if(!init&&nw.length)this.fireAlert(a,`Watchlist alert "${a.name}": new match ${nw.join(', ')}`)};

/* =============================== UI: buttons + tab =============================== */
const _right=App.prototype.buildRight;
App.prototype.buildRight=function(){_right.call(this);this.tabDefs.Optimizer=()=>this.tOptimizer();
 const b=el('button',{'data-tab':'Optimizer',onclick:()=>this.showTab('Optimizer')},'Optimizer');const bt=this.tabs.querySelector('[data-tab=Backtest]');bt?bt.after(b):this.tabs.append(b)};
const _top=App.prototype.buildTop;
App.prototype.buildTop=function(){_top.call(this);const t=$('#top');
 t.append(el('span',{class:'pro-tools'},el('button',{title:'Bar replay: replay the market bar by bar from any date',onclick:()=>this.replayStart()},'⏪ Replay'),el('button',{title:'Auto trendlines, support/resistance and chart patterns',onclick:()=>this.autoPatterns()},'✨ Auto patterns'),
  el('button',{title:'Multi-timeframe indicators',onclick:()=>this.mtfDialog()},'⧉ MTF'),el('button',{title:'Share this chart by link',onclick:()=>this.shareChart()},'🔗 Share')))};
window.PRO={pivots,findPatterns,atr};
window.addEventListener('DOMContentLoaded',()=>setTimeout(openShared,300));
window.addEventListener('hashchange',()=>{if(/share=/.test(location.hash))openShared()});
})();
