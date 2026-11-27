// EGX tab: EGX 30, top gainers / losers / most active and ticker search (oanor EGX API through our own server function api/egx; the key never reaches the browser).
// Charts for EGX stocks use Yahoo (TICKER.CA, delayed) where Yahoo has the symbol; the EGX tab itself shows only what the oanor source returns.
(()=>{
const f2=(n,d=2)=>n==null||!isFinite(n)?'n/a':Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const pc=n=>n==null||!isFinite(n)?'n/a':(n>=0?'+':'')+Number(n).toFixed(2)+'%';
const cls=n=>n==null?'':n>=0?'tup':'tdn';
const big=n=>n==null?'n/a':n>=1e9?f2(n/1e9)+'B':n>=1e6?f2(n/1e6)+'M':n>=1e3?f2(n/1e3)+'K':String(n);
async function egx(q){const r=await fetch('api/egx?'+q);const j=await r.json().catch(()=>({error:'bad response'}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
const chartSym=t=>/^[A-Z0-9]{2,6}$/.test(t)?t+'.CA':null;
function table(rows){const t=el('table',{class:'ctbl',style:'width:100%'},el('tr',{},...['Ticker','Company','Price (EGP)','Change %','Volume'].map(h=>el('th',{},h))));
 rows.forEach(r=>{const cs=chartSym(r.ticker);t.append(el('tr',{style:cs?'cursor:pointer':'',title:cs?'Open the chart ('+cs+', Yahoo, delayed)':'No chart symbol for this code',onclick:()=>{if(cs)app.setSymbol(cs,r.company||r.ticker)}},
  el('td',{},el('b',{},r.ticker)),el('td',{style:'text-align:left;white-space:normal;font-size:10px'},r.company||''),el('td',{},f2(r.price)),el('td',{class:cls(r.change_percent)},pc(r.change_percent)),el('td',{},big(r.volume))))});return t}
App.prototype.tEGX=function(){const c=this.tabc;const st=Store.get('egx',{codes:'COMI,TMGH'});
 const head=el('div',{class:'tpaper'}),lists=el('div',{}),srch=el('div',{});
 const sect=(t,node)=>el('div',{style:'margin:8px 0'},el('b',{style:'padding:0 6px'},t),node);
 const inp=el('input',{value:st.codes,placeholder:'COMI,TMGH',style:'width:160px',onkeydown:e=>{if(e.key==='Enter')go()}});
 const go=async()=>{st.codes=inp.value;Store.set('egx',st);srch.innerHTML='';srch.append(el('span',{class:'mut'},'Loading...'));
  try{const j=await egx('op=quote&codes='+encodeURIComponent(inp.value));srch.innerHTML='';srch.append(table(j.data.quotes||[]))}catch(e){srch.innerHTML='';srch.append(el('div',{class:'mut',style:'padding:6px'},'Unavailable: '+e.message))}};
 async function load(){head.innerHTML='';head.append(el('span',{class:'mut'},'Loading...'));lists.innerHTML='';let meta='';
  try{const j=await egx('op=index');const d=j.data;meta=j.fetched;head.innerHTML='';head.append(el('div',{class:'ts'},d.name||'EGX 30'),el('div',{style:'font-size:20px;font-weight:600'},f2(d.value)),el('div',{class:cls(d.change_percent)},(d.change>=0?'+':'')+f2(d.change)+'  '+pc(d.change_percent)),el('div',{class:'mut',style:'font-size:11px'},'Day open '+f2(d.open)+'  high '+f2(d.high)+'  low '+f2(d.low)),
   el('div',{style:'margin-top:4px'},el('a',{href:'#',style:'color:#6ea8ff',onclick:e=>{e.preventDefault();app.setSymbol('^CASE30','EGX 30')}},'Open EGX 30 chart (Yahoo, delayed)')))}
  catch(e){head.innerHTML='';head.append(el('div',{class:'mut',style:'padding:6px'},'EGX 30 unavailable: '+e.message))}
  for(const [by,t] of [['gainers','Top gainers'],['losers','Top losers'],['active','Most active']]){const box=el('div',{},el('span',{class:'mut',style:'padding:6px'},'Loading...'));lists.append(sect(t,box));
   egx('op=screener&by='+by+'&limit=10').then(j=>{box.innerHTML='';box.append(table(j.data.results||[]));if(j.fetched)meta=j.fetched}).catch(e=>{box.innerHTML='';box.append(el('div',{class:'mut',style:'padding:6px'},'Unavailable: '+e.message))})}
 }
 c.append(el('div',{class:'row2',style:'padding:4px 6px'},el('b',{},'Egyptian Exchange (EGX)'),el('button',{onclick:load,title:'Reload (the server caches data: 10 min while the market is open)'},'Refresh')),head,
  el('div',{class:'row2',style:'padding:4px 6px;display:flex;gap:4px'},el('span',{},'Ticker search'),inp,el('button',{onclick:go},'Search')),srch,lists,
  el('p',{class:'mut',style:'font-size:10.5px;padding:6px'},'Source: oanor EGX API (The Egyptian Exchange data via TradingView screener), free plan, unofficial. Updated by a server cache every 10 minutes during trading (Sun-Thu, Cairo time) and every 3 hours otherwise. Prices in EGP. Click a row to open a Yahoo chart (TICKER.CA, delayed): a few codes may have no Yahoo chart. No intraday history, bid/ask or order book from this source.'));
 load();go()};
const _br=App.prototype.buildRight;App.prototype.buildRight=function(){_br.apply(this,arguments);this.tabDefs.EGX=()=>this.tEGX();this.tabs.append(el('button',{'data-tab':'EGX',onclick:()=>this.showTab('EGX')},'EGX'))};
})();
