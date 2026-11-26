// core: utils, catalog, data engine (provider-agnostic client side), storage
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(t,a={},...k)=>{const e=document.createElement(t);for(const x in a){if(a[x]===false||a[x]==null)continue;if(a[x]===true){e.setAttribute(x,'');continue}if(x==='class')e.className=a[x];else if(x==='html')e.innerHTML=a[x];else if(x.startsWith('on'))e[x]=a[x];else e.setAttribute(x,a[x])}k.flat().forEach(c=>c!=null&&e.append(c.nodeType?c:document.createTextNode(c)));return e};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d)=>v==null||isNaN(v)?'-':Math.abs(v)>=1000?v.toLocaleString('en',{maximumFractionDigits:d??1}):Math.abs(v)>=10?v.toFixed(d??2):v.toFixed(d??4);
const uid=()=>Math.random().toString(36).slice(2,9);

const CATALOG=[
 ['Agriculture',[['ZS=F','Soybeans (CBOT)'],['ZM=F','Soybean Meal (CBOT)'],['ZL=F','Soybean Oil (CBOT)'],['ZC=F','Corn (CBOT)'],['ZW=F','Chicago Wheat (CBOT)'],['KE=F','KC HRW Wheat'],['ZO=F','Oats'],['ZR=F','Rough Rice'],['SB=F','Sugar #11'],['KC=F','Coffee'],['CC=F','Cocoa'],['CT=F','Cotton'],['LE=F','Live Cattle'],['HE=F','Lean Hogs']]],
 ['Energy',[['CL=F','Crude Oil WTI'],['BZ=F','Brent Crude'],['NG=F','Natural Gas'],['RB=F','Gasoline RBOB'],['HO=F','Heating Oil']]],
 ['Metals',[['GC=F','Gold'],['SI=F','Silver'],['HG=F','Copper'],['PL=F','Platinum'],['PA=F','Palladium']]],
 ['Indices',[['^GSPC','S&P 500'],['^DJI','Dow Jones'],['^IXIC','NASDAQ Composite'],['^NYA','NYSE Composite'],['^GDAXI','DAX'],['^FTSE','FTSE 100'],['^N225','Nikkei 225'],['^CASE30','EGX30'],['^EGX30CAPPED.CA','EGX30 Capped'],['^VIX','VIX'],['DX-Y.NYB','US Dollar Index']]],
 ['Forex',[['EURUSD=X','EUR/USD'],['GBPUSD=X','GBP/USD'],['USDJPY=X','USD/JPY'],['USDEGP=X','USD/EGP'],['AUDUSD=X','AUD/USD'],['USDCAD=X','USD/CAD'],['USDCHF=X','USD/CHF'],['NZDUSD=X','NZD/USD'],['EURGBP=X','EUR/GBP'],['EURJPY=X','EUR/JPY'],['GBPJPY=X','GBP/JPY'],['USDSAR=X','USD/SAR'],['USDTRY=X','USD/TRY']]],
 ['Crypto',[['BTC-USD','Bitcoin'],['ETH-USD','Ethereum'],['BNB-USD','BNB'],['SOL-USD','Solana'],['XRP-USD','XRP'],['ADA-USD','Cardano'],['DOGE-USD','Dogecoin'],['AVAX-USD','Avalanche'],['DOT-USD','Polkadot'],['LINK-USD','Chainlink'],['LTC-USD','Litecoin'],['TRX-USD','TRON']]],
 ['US Stocks',[['AAPL','Apple'],['MSFT','Microsoft'],['NVDA','NVIDIA'],['AMZN','Amazon'],['TSLA','Tesla'],['ADM','Archer-Daniels-Midland'],['BG','Bunge'],['DE','Deere']]],
];
const NAMES={};CATALOG.forEach(([g,a])=>a.forEach(([s,n])=>NAMES[s]=n));
const SYN_PRESETS=[
 {id:'crush',name:'Soy Crush Margin (c/bu) = 2.2*Meal + 0.11*Oil - Soy',op:'sum',legs:[{s:'ZM=F',k:2.2},{s:'ZL=F',k:0.11},{s:'ZS=F',k:-1}]},
 {id:'oilshare',name:'Oil Share = Oil*0.11 / (Oil*0.11 + Meal*2.2)',op:'oilshare',legs:[{s:'ZL=F',k:1},{s:'ZM=F',k:1}]},
 {id:'zszm',name:'Soy / Meal ratio',op:'ratio',legs:[{s:'ZS=F',k:1},{s:'ZM=F',k:1}]},
 {id:'zszl',name:'Soy / Oil ratio',op:'ratio',legs:[{s:'ZS=F',k:1},{s:'ZL=F',k:1}]},
 {id:'zcsw',name:'Corn / Wheat ratio',op:'ratio',legs:[{s:'ZC=F',k:1},{s:'ZW=F',k:1}]},
 {id:'gs',name:'Gold / Silver ratio',op:'ratio',legs:[{s:'GC=F',k:1},{s:'SI=F',k:1}]},
 {id:'wb',name:'WTI - Brent spread',op:'sum',legs:[{s:'CL=F',k:1},{s:'BZ=F',k:-1}]},
 {id:'zsjh',name:'Soy Jan27 - Mar27 calendar spread (c/bu)',op:'sum',legs:[{s:'ZSF27.CBT',k:1},{s:'ZSH27.CBT',k:-1}]},
];

// timeframes: key -> [yahoo interval, yahoo range (max history), bucket fn or null]
const TF={
 '1m':['1m','7d'],'5m':['5m','60d'],'15m':['15m','60d'],'30m':['30m','60d'],'1H':['60m','2y'],'4H':['60m','2y',4],
 '1D':['1d','max'],'1W':['1wk','max'],'1M':['1mo','max'],'3M':['1mo','max','q'],'12M':['1mo','max','y']};
const INTRA=k=>['1m','5m','15m','30m','1H','4H'].includes(k);
const TFSEC={'1m':60,'5m':300,'15m':900,'30m':1800,'1H':3600,'4H':14400,'1D':86400,'1W':604800,'1M':2592000,'3M':7776000,'12M':31536000};

const Store={
 k:'gct_v1',d:null,
 load(){try{this.d=JSON.parse(localStorage.getItem(this.k)||'{}')}catch(e){this.d={}}return this.d},
 get(n,def){const v=(this.d||this.load())[n];return v===undefined?def:v},
 set(n,v){(this.d||this.load())[n]=v;clearTimeout(this._t);this._t=setTimeout(()=>{try{localStorage.setItem(this.k,JSON.stringify(this.d))}catch(e){}},300)}
};

// ---- data engine ----
const Data={
 cache:new Map(),
 async raw(sym,tf){
  const key=sym+'|'+tf,c=this.cache.get(key);if(c&&Date.now()-c.at<45000)return c.v;
  const [iv,rg,agg]=TF[tf];
  const r=await fetch(`api/chart?symbol=${encodeURIComponent(sym)}&range=${rg}&interval=${iv}`);
  const j=await r.json();if(!j.bars)throw new Error(j.error||'no data');
  const off=j.gmtoffset||0;
  let b=j.bars.map(x=>({time:x.t+off,open:x.o,high:x.h,low:x.l,close:x.c,volume:x.v}));
  if(!INTRA(tf))b=b.map(x=>({...x,time:Math.floor(x.time/86400)*86400}));
  if(agg)b=this.bucket(b,agg,tf);
  const seen=new Set();b=b.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time);
  const v={meta:{...j,bars:undefined,fetched:Date.now(),source:'Yahoo Finance',tf},bars:b};
  this.cache.set(key,{at:Date.now(),v});return v;
 },
 bucket(b,agg,tf){
  const kf=agg==='q'?t=>{const d=new Date(t*1000);return d.getUTCFullYear()*10+Math.floor(d.getUTCMonth()/3)}:agg==='y'?t=>new Date(t*1000).getUTCFullYear():t=>Math.floor(t/(3600*agg));
  const out=[];let cur=null,ck=null;
  for(const x of b){const k=kf(x.time);if(k!==ck){cur={...x};out.push(cur);ck=k}else{cur.high=Math.max(cur.high,x.high);cur.low=Math.min(cur.low,x.low);cur.close=x.close;cur.volume+=x.volume}}
  return out;
 },
 async get(sym,tf){
  if(sym.startsWith('SYN:'))return this.synth(sym,tf);
  return this.raw(sym,tf);
 },
 synDef(sym){const id=sym.slice(4);return SYN_PRESETS.find(p=>p.id===id)||(Store.get('syn',[])).find(p=>p.id===id)},
 async synth(sym,tf){
  const def=this.synDef(sym);if(!def)throw new Error('unknown synthetic');
  const legs=await Promise.all(def.legs.map(l=>this.raw(l.s,tf)));
  const maps=legs.map(l=>new Map(l.bars.map(b=>[b.time,b])));
  const bars=[];
  for(const b of legs[0].bars){const bs=maps.map(m=>m.get(b.time));if(bs.some(x=>!x))continue;
   const f=fld=>{
    if(def.op==='ratio')return bs[0][fld]/bs[1][fld];
    if(def.op==='oilshare'){const o=bs[0][fld]*0.11,m=bs[1][fld]*2.2;return o/(o+m)*100}
    return bs.reduce((a,x,i)=>a+x[fld]*def.legs[i].k,0)};
   const o=f('open'),c=f('close'),h=f('high'),l=f('low');
   bars.push({time:b.time,open:o,close:c,high:Math.max(o,c,h,l),low:Math.min(o,c,h,l),volume:0})}
  return {meta:{symbol:sym,name:def.name,exchange:'Synthetic',currency:'',source:'Computed from '+def.legs.map(l=>l.s).join(', ')+' (Yahoo Finance)',synthetic:true,note:'High/Low of a synthetic spread are approximations built from leg highs/lows.',fetched:Date.now(),tf,price:bars.length?bars[bars.length-1].close:null},bars};
 },
 async quotes(syms){const r=await fetch('api/quotes?symbols='+encodeURIComponent(syms.join(',')));const j=await r.json();return j.quotes},
 async search(q){const r=await fetch('api/search?q='+encodeURIComponent(q));return (await r.json()).results||[]}
};
function symName(s){if(s.startsWith('SYN:')){const d=Data.synDef(s);return d?d.name:s}return NAMES[s]||(Store.get('names',{})[s])||s}
function rememberName(s,n){const m=Store.get('names',{});m[s]=n;Store.set('names',m)}

// ---- UI helpers ----
function toast(msg,kind){const t=el('div',{class:'toast '+(kind||'')},msg);$('#toasts').append(t);setTimeout(()=>t.remove(),kind==='alert'?12000:4500)}
function modal(title,body,opts={}){
 const bg=el('div',{class:'mbg'}),box=el('div',{class:'mbox'+(opts.wide?' wide':'')});
 const close=()=>{bg.remove();opts.onclose&&opts.onclose()};
 box.append(el('div',{class:'mh'},el('b',{},title),el('button',{class:'x',onclick:close},'×')),el('div',{class:'mb'},body));
 bg.append(box);bg.onmousedown=e=>{if(e.target===bg)close()};document.body.append(bg);return {close,box};
}

// display timezone for intraday charts (Yahoo returns UTC epoch; bars are shifted by exchange offset elsewhere, so this only changes labels)
function tzFmt(t){const tz=Store.get('tz','UTC');try{return new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'2-digit',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t*1000))}catch(e){return new Date(t*1000).toISOString()}}
