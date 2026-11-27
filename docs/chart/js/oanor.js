// Commodities (oanor board + futures curve) and Positioning (COT Index + Managed Money) tabs. Data comes from our own server function api/egx (ops board, curves, curve, cotscreen, cotindex, mmscreen, mmpos);
// the oanor key lives only on the server. Free-plan quotas are small (curve 715/mo, COT index 750/mo, managed money 720/mo, commodities 10,000/mo), so the server caches hard: board 15 min, curves 24 h, COT/MM screeners 24 h, per-market details 3 days (CFTC data is weekly).
(()=>{
const f2=(n,d=2)=>n==null||!isFinite(n)?'n/a':Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const f0=n=>n==null||!isFinite(n)?'n/a':Number(n).toLocaleString('en-US',{maximumFractionDigits:0});
const sg=n=>n==null||!isFinite(n)?'n/a':(n>=0?'+':'')+f0(n);
const pc=n=>n==null||!isFinite(n)?'n/a':(n>=0?'+':'')+Number(n).toFixed(2)+'%';
const cls=n=>n==null?'':n>=0?'tup':'tdn';
async function api(q){const r=await fetch('api/egx?'+q);const j=await r.json().catch(()=>({error:'bad response'}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
const err=e=>el('div',{class:'mut',style:'padding:6px'},'Unavailable: '+e.message);
const note=t=>el('p',{class:'mut',style:'font-size:10.5px;padding:6px'},t);
const sect=(t,node)=>el('div',{style:'margin:8px 0'},el('b',{style:'padding:0 6px'},t),node);
const tbl=(heads,rows)=>{const t=el('table',{class:'ctbl',style:'width:100%'},el('tr',{},...heads.map(h=>el('th',{},h))));rows.forEach(r=>t.append(r));return t};
const row=(cells,onclick,title)=>el('tr',{style:onclick?'cursor:pointer':'',title:title||'',onclick:onclick||null},...cells);
const td=(t,c,st)=>el('td',{class:c||'',style:st||''},t);
function curveSvg(pts){const W=330,H=130,P=26;const ys=pts.map(p=>p.price),lo=Math.min(...ys),hi=Math.max(...ys),sp=(hi-lo)||1;
 const X=i=>P+i*(W-P-6)/Math.max(1,pts.length-1),Y=v=>H-18-(v-lo)/sp*(H-34);
 const d=pts.map((p,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(p.price).toFixed(1)).join(' ');
 const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');s.setAttribute('viewBox',`0 0 ${W} ${H}`);s.setAttribute('width','100%');s.style.maxWidth='420px';
 const add=(tag,a,t)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);if(t)e.textContent=t;s.append(e);return e};
 add('path',{d,fill:'none',stroke:'#6ea8ff','stroke-width':2});
 pts.forEach((p,i)=>add('circle',{cx:X(i),cy:Y(p.price),r:2.5,fill:'#6ea8ff'}));
 add('text',{x:2,y:12,fill:'#888','font-size':9},f2(hi,4));add('text',{x:2,y:H-20,fill:'#888','font-size':9},f2(lo,4));
 [0,Math.floor((pts.length-1)/2),pts.length-1].forEach(i=>add('text',{x:Math.min(X(i),W-30),y:H-4,fill:'#888','font-size':9},pts[i].expiry||''));
 return s}
App.prototype.tCOMM=async function(){const c=this.tabc;const boardBox=el('div',{}),curvesBox=el('div',{}),detail=el('div',{});
 c.append(el('div',{class:'row2',style:'padding:4px 6px'},el('b',{},'Commodities: board and futures curve')),sect('Commodity board (front-month futures)',boardBox),sect('Term structure: contango vs backwardation',curvesBox),detail,
  note('Sources: oanor Commodities API (front-month futures from Yahoo Finance, delayed, not real time) and oanor Commodity Curve API (dated futures contracts from Yahoo Finance, delayed). Free plans; the server caches the board for 15 minutes and the curves for 24 hours to protect the small monthly quotas. Roll yield = front vs second month, annualised: positive = backwardation (a long roll earns it), negative = contango (a long roll pays it). Click a board row to open its chart; click a curve row to see its dated contracts.'));
 boardBox.append(el('span',{class:'mut',style:'padding:6px'},'Loading...'));curvesBox.append(el('span',{class:'mut',style:'padding:6px'},'Loading...'));
 try{const j=await api('op=board');const L=(j.data.commodities||[]).slice().sort((a,b)=>String(a.category).localeCompare(String(b.category)));
  boardBox.innerHTML='';boardBox.append(tbl(['Commodity','Price','Unit','Change %','52w low','52w high'],L.map(r=>row([td(r.name,'','text-align:left'),td(f2(r.price,r.price<10?3:2)),td(r.quote||r.unit||'','','font-size:10px;text-align:left'),td(pc(r.change_pct),cls(r.change_pct)),td(f2(r.week52_low)),td(f2(r.week52_high))],r.symbol?()=>app.setSymbol(r.symbol,r.name):null,r.symbol?'Open the chart ('+r.symbol+')':''))));
  boardBox.append(el('div',{class:'mut',style:'font-size:10px;padding:2px 6px'},'Fetched '+(j.fetched||'')+(j.cached?' (cached)':'')))}catch(e){boardBox.innerHTML='';boardBox.append(err(e))}
 try{const j=await api('op=curves');const R=(j.data.results||[]).filter(r=>r.available!==false);
  curvesBox.innerHTML='';curvesBox.append(tbl(['Commodity','Front','Shape','Roll yield /yr','Front vs back'],R.map(r=>row([td(r.name,'','text-align:left'),td(f2(r.front_price,r.front_price<10?4:2)+' '+(r.unit||''),'','font-size:10px'),td(r.shape||'n/a'),td(pc(r.roll_yield_annualized_pct),cls(r.roll_yield_annualized_pct)),td(pc(r.front_vs_back_pct),cls(r.front_vs_back_pct))],()=>show(r.commodity),'Show the dated contracts'))));
  curvesBox.append(el('div',{class:'mut',style:'font-size:10px;padding:2px 6px'},'Fetched '+(j.fetched||'')+(j.cached?' (cached)':'')))}catch(e){curvesBox.innerHTML='';curvesBox.append(err(e))}
 async function show(k){detail.innerHTML='';detail.append(el('span',{class:'mut',style:'padding:6px'},'Loading curve...'));
  try{const j=await api('op=curve&commodity='+encodeURIComponent(k));const d=j.data,pts=(d.curve||[]).filter(p=>p.price!=null);detail.innerHTML='';
   detail.append(sect((d.name||k)+': dated futures curve',el('div',{style:'padding:4px 6px'},pts.length>1?curveSvg(pts):el('span',{class:'mut'},'Not enough contracts for a curve'),el('div',{style:'font-size:11px;margin:4px 0'},d.read||''),
    tbl(['Contract','Expiry','Price'],pts.map(p=>row([td(p.contract||'','','text-align:left'),td(p.expiry||''),td(f2(p.price,p.price<10?4:2))]))))))}catch(e){detail.innerHTML='';detail.append(err(e))}}};
App.prototype.tPOS=async function(){const c=this.tabc;const st=Store.get('pos',{group:'noncomm',cls:'all'});const cotBox=el('div',{}),mmBox=el('div',{}),detail=el('div',{});
 const sel=(opts,val,on)=>{const s=el('select',{onchange:()=>on(s.value)},...opts.map(([v,t])=>el('option',{value:v,selected:v===val},t)));return s};
 const mmMarkets=new Set();
 const bar=v=>el('div',{style:'background:#222;height:6px;width:70px;display:inline-block;border-radius:3px;vertical-align:middle'},el('div',{style:`height:6px;border-radius:3px;width:${Math.max(0,Math.min(100,v||0))}%;background:${v>=80?'#e0524d':v<=20?'#2fb36b':'#6ea8ff'}`}));
 async function loadCot(){cotBox.innerHTML='';cotBox.append(el('span',{class:'mut',style:'padding:6px'},'Loading...'));
  try{const j=await api('op=cotscreen&group='+st.group+'&class='+st.cls);const R=(j.data.results||[]).filter(r=>r.available!==false);cotBox.innerHTML='';
   cotBox.append(tbl(['Market','Class','COT Index','','Net','Wk chg','Signal'],R.map(r=>row([td(r.name,'','text-align:left'),td(r.class||'','','font-size:10px'),td(f2(r.cot_index,1)),el('td',{},bar(r.cot_index)),td(sg(r.net_position),cls(r.net_position)),td(sg(r.net_change_week),cls(r.net_change_week)),td(/bullish-extreme/.test(r.extreme||'')?'crowded long':/bearish-extreme/.test(r.extreme||'')?'crowded short':'neutral','','font-size:10px')],()=>cotDetail(r.market,r.name),'Show both trader groups'))));
   cotBox.append(el('div',{class:'mut',style:'font-size:10px;padding:2px 6px'},'Report date '+(R[0]&&R[0].report_date||'n/a')+'. Fetched '+(j.fetched||'')+(j.cached?' (cached)':'')))}catch(e){cotBox.innerHTML='';cotBox.append(err(e))}}
 async function loadMM(){mmBox.innerHTML='';mmBox.append(el('span',{class:'mut',style:'padding:6px'},'Loading...'));
  try{const j=await api('op=mmscreen&class=all');const R=(j.data.results||[]).filter(r=>r.available!==false);mmBox.innerHTML='';R.forEach(r=>mmMarkets.add(r.market));
   mmBox.append(tbl(['Market','Class','MM net','Net % OI','Wk chg','Bias'],R.map(r=>row([td(r.name,'','text-align:left'),td(r.class||'','','font-size:10px'),td(f0(r.net),cls(r.net)),td(pc(r.net_pct_oi),cls(r.net_pct_oi)),td(sg(r.net_change_week),cls(r.net_change_week)),td((r.bias||'').replace(/^hedge funds /,''),'','font-size:10px;white-space:normal;text-align:left')],()=>mmDetail(r.market,r.name),'Show the four trader groups'))));
   mmBox.append(el('div',{class:'mut',style:'font-size:10px;padding:2px 6px'},'Report date '+(R[0]&&R[0].report_date||'n/a')+'. Fetched '+(j.fetched||'')+(j.cached?' (cached)':'')))}catch(e){mmBox.innerHTML='';mmBox.append(err(e))}}
 async function cotDetail(m,name){detail.innerHTML='';detail.append(el('span',{class:'mut',style:'padding:6px'},'Loading...'));
  try{const j=await api('op=cotindex&market='+encodeURIComponent(m));const d=j.data;detail.innerHTML='';
   const g=(k,t)=>{const x=d[k]||{};return row([td(t,'','text-align:left'),td(f2(x.cot_index,1)),el('td',{},bar(x.cot_index)),td(sg(x.net_position),cls(x.net_position)),td(f0(x.window_min_net)+' to '+f0(x.window_max_net),'','font-size:10px'),td(sg(x.net_change_week),cls(x.net_change_week))])};
   detail.append(sect((d.name||name)+': COT Index ('+(d.window_weeks||156)+' weeks), report '+(d.report_date||'n/a'),el('div',{},tbl(['Group','Index','','Net','Window range','Wk chg'],[g('noncomm','Large speculators'),g('comm','Commercial hedgers')]),el('div',{class:'mut',style:'font-size:10.5px;padding:4px 6px'},'Open interest '+f0(d.open_interest)+', traders '+f0(d.traders)+'. Above 80 = crowded long, below 20 = crowded short (contrarian reading).'),mmMarkets.has(m)?el('button',{style:'margin:4px 6px',onclick:()=>mmDetail(m,name)},'Also show hedge-fund (Managed Money) breakdown'):null)))}catch(e){detail.innerHTML='';detail.append(err(e))}}
 async function mmDetail(m,name){detail.innerHTML='';detail.append(el('span',{class:'mut',style:'padding:6px'},'Loading...'));
  try{const j=await api('op=mmpos&market='+encodeURIComponent(m));const d=j.data;detail.innerHTML='';
   const g=(k,t)=>{const x=d[k]||{};return row([td(t,'','text-align:left'),td(f0(x.long)),td(f0(x.short)),td(f0(x.net),cls(x.net)),td(pc(x.net_pct_oi),cls(x.net_pct_oi)),td(sg(x.net_change_week),cls(x.net_change_week))])};
   detail.append(sect((d.name||name)+': four trader groups, report '+(d.report_date||'n/a'),el('div',{},tbl(['Group','Long','Short','Net','Net % OI','Wk chg'],[g('managed_money','Managed Money (funds)'),g('producer_merchant','Producer/Merchant'),g('swap_dealers','Swap Dealers'),g('other_reportables','Other reportables')]),el('div',{class:'mut',style:'font-size:10.5px;padding:4px 6px'},(d.managed_money&&d.managed_money.bias||'')+'. Open interest '+f0(d.open_interest)+'.'))))}catch(e){detail.innerHTML='';detail.append(err(e))}}
 c.append(el('div',{class:'row2',style:'padding:4px 6px'},el('b',{},'Positioning: COT Index and Managed Money')),
  el('div',{style:'padding:4px 6px;display:flex;gap:6px;flex-wrap:wrap'},sel([['noncomm','Large speculators'],['comm','Commercial hedgers']],st.group,v=>{st.group=v;Store.set('pos',st);loadCot()}),sel([['all','All'],['fx','FX'],['index','Indices'],['metal','Metals'],['energy','Energy'],['grain','Grains']],st.cls,v=>{st.cls=v;Store.set('pos',st);loadCot()})),
  sect('COT Index (0-100, 156-week window)',cotBox),sect('Hedge-fund positioning (Managed Money, CFTC Disaggregated)',mmBox),detail,
  note('Sources: oanor COT Index API (CFTC legacy futures-only report) and oanor Managed Money API (CFTC Disaggregated report). Weekly data published with a delay (Friday for Tuesday positions), not real time. Free plans with small monthly quotas: the server caches screeners 24 hours and per-market details 3 days. These complement the COT tab (raw report): the index turns net positions into a 0-100 percentile. Click a row for details.'));
 await loadCot();await loadMM()};
const _br=App.prototype.buildRight;App.prototype.buildRight=function(){_br.apply(this,arguments);this.tabDefs.Commodities=()=>this.tCOMM();this.tabDefs.Positioning=()=>this.tPOS();for(const t of ['Commodities','Positioning'])this.tabs.append(el('button',{'data-tab':t,onclick:()=>this.showTab(t)},t))};
})();
