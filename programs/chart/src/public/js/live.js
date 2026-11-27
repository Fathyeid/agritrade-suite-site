// Live prices where a free source allows it.
//  - Crypto (BTC-USD, ETH-USD, ... and PAXG-USD = tokenised gold ≈ spot gold): history AND live candles from Binance's public
//    market-data endpoints (no key): REST data-api.binance.vision, WebSocket data-stream.binance.vision. Tick-by-tick updates.
//  - Forex (=X), US stocks and ETFs (incl. commodity ETFs GLD, SLV, USO, UNG, SOYB, CORN, WEAT, DBA): last price polled every 10 s.
//  - Exchange futures (=F) stay delayed ~10 min (CME/ICE rule for free data); the badge on each chart says which is which.
(()=>{
const COINS='BTC ETH BNB SOL XRP ADA DOGE TRX DOT LINK LTC AVAX TON SHIB PAXG BCH ATOM UNI XLM NEAR APT ARB OP SUI PEPE FIL ETC HBAR ICP INJ RNDR AAVE MKR'.split(' ');
const binSym=s=>{const m=/^([A-Z0-9]+)-USD$/.exec(s||'');return m&&COINS.includes(m[1])?m[1]+'USDT':null};
const BIV={'1m':'1m','5m':'5m','15m':'15m','30m':'30m','1H':'1h','4H':'4h','1D':'1d','1W':'1w','1M':'1M'};
const REST='https://data-api.binance.vision/api/v3/klines',WS='wss://data-stream.binance.vision/ws/';
const kind=s=>binSym(s)?'live':/=X$/.test(s)?'near':/=F$/.test(s)?'delayed':/^\^/.test(s)||/\.[A-Z]{1,3}$/.test(s)||/^SYN:/.test(s)?'delayed':/^[A-Z][A-Z.\-]{0,6}$/.test(s)?'rt':'delayed';
window.LIVE={kind,binSym};
const AR=()=>localStorage.getItem('suite_lang')==='ar';
const LBL={live:['🟢 لحظي (Binance)','🟢 LIVE (Binance)'],near:['🟡 شبه لحظي (كل ١٠ ث)','🟡 Near real-time (10 s)'],rt:['🟢 لحظي أثناء جلسة أمريكا (كل ١٠ ث)','🟢 Real-time in US hours (10 s)'],delayed:['⏱ متأخر ~١٠ دقائق (شرط البورصة)','⏱ Delayed ~10 min (exchange rule)']};

/* ---- crypto history from Binance (same source as the live stream, so no jump between history and live) ---- */
const _raw=Data.raw.bind(Data);
Data.raw=async function(sym,tf){const b=binSym(sym),iv=BIV[tf];if(!b||!iv)return _raw(sym,tf);
 const key='BN|'+sym+'|'+tf,c=this.cache.get(key);if(c&&Date.now()-c.at<20000)return c.v;
 try{const r=await fetch(`${REST}?symbol=${b}&interval=${iv}&limit=1000`);if(!r.ok)throw new Error('binance '+r.status);const k=await r.json();if(!Array.isArray(k)||!k.length)throw new Error('empty');
  let bars=k.map(x=>({time:Math.floor(x[0]/1000),open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
  if(!INTRA(tf))bars=bars.map(x=>({...x,time:Math.floor(x.time/86400)*86400}));
  const last=bars[bars.length-1];const v={meta:{symbol:sym,name:symName(sym),price:last.close,prevClose:bars.length>1?bars[bars.length-2].close:last.open,currency:'USD',exchange:'Binance ('+b+')',source:'Binance',fetched:Date.now(),tf,live:true},bars};
  this.cache.set(key,{at:Date.now(),v});return v}catch(e){return _raw(sym,tf)}};

/* ---- badge on every chart ---- */
const _up=Pane.prototype.upPrice;
Pane.prototype.upPrice=function(){_up.call(this);try{const k=kind(this.sym),ok=k==='live'?this.meta&&this.meta.source==='Binance':true,kk=ok?k:'delayed';
 this.srcEl.innerHTML=`<i class="dot ${kk==='delayed'?'warn':'live'}"></i>${LBL[kk][AR()?0:1]}${this._lastTick&&this._tickSym===this.sym&&kk!=='delayed'?' · '+new Date(this._lastTick).toTimeString().slice(0,8):''}`;
 this.srcEl.title=kk==='delayed'?(AR()?'بيانات البورصة المجانية متأخرة حوالي ١٠ دقائق بشرط من البورصة نفسها.':'Free exchange data is delayed about 10 minutes by exchange rules.'):(AR()?'المصدر: ':'Source: ')+(this.meta.source||'');}catch(e){}};

/* ---- live updates of the last candle ---- */
const CANDLE=['candle','hollow','ohlc'],LINE=['line','area','baseline'];
function applyTick(p,t,o,h,l,c,v){if(p.rp||!p.main||!p.raw.length)return;const tf=p.tf;if(!INTRA(tf))t=Math.floor(t/86400)*86400;
 const last=p.raw[p.raw.length-1];if(t<last.time)return;
 if(t===last.time){last.high=Math.max(last.high,h);last.low=Math.min(last.low,l);last.close=c;if(v!=null)last.volume=v}else{p.raw.push({time:t,open:o,high:h,low:l,close:c,volume:v||0})}
 const b=p.raw[p.raw.length-1];try{if(CANDLE.includes(p.type))p.main.update({time:b.time,open:b.open,high:b.high,low:b.low,close:b.close});else if(LINE.includes(p.type))p.main.update({time:b.time,value:b.close});else return}catch(e){return}
 p._lastTick=Date.now();p._tickSym=p.sym;p.meta.price=c;try{p.upPrice()}catch(e){}}
const socks=new Map();
function wantWS(){const need=new Set();(window.app?app.panes:[]).forEach(p=>{const b=binSym(p.sym),iv=BIV[p.tf];if(b&&iv&&!p.rp)need.add(b.toLowerCase()+'@kline_'+iv)});
 socks.forEach((ws,k)=>{if(!need.has(k)){try{ws.close()}catch(e){}socks.delete(k)}});
 need.forEach(k=>{if(socks.has(k))return;let ws;try{ws=new WebSocket(WS+k)}catch(e){return}socks.set(k,ws);
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}const K=m.k;if(!K)return;const s=K.s.replace(/USDT$/,'-USD'),iv=Object.keys(BIV).find(x=>BIV[x]===K.i);
   app.panes.forEach(p=>{if(p.sym===s&&p.tf===iv)applyTick(p,Math.floor(K.t/1000),+K.o,+K.h,+K.l,+K.c,+K.v)})};
  ws.onclose=()=>{if(socks.get(k)===ws)socks.delete(k)};ws.onerror=()=>{try{ws.close()}catch(x){}}})}
let polling=false;
async function poll(){if(polling||document.hidden||!window.app)return;polling=true;try{const ps=app.panes.filter(p=>!p.rp&&['near','rt'].includes(kind(p.sym))&&p.raw.length);const syms=[...new Set(ps.map(p=>p.sym))];if(!syms.length)return;
  const r=await fetch('api/quotes?symbols='+encodeURIComponent(syms.join(',')));const j=await r.json();(j.quotes||[]).forEach(q=>{if(!q||q.price==null||q.error)return;
   ps.filter(p=>p.sym===q.symbol).forEach(p=>{const last=p.raw[p.raw.length-1];const nowT=Math.floor((q.marketTime||Date.now()/1000));const step=TFSEC[p.tf]||86400;let t=last.time;if(INTRA(p.tf)&&nowT>=last.time+step)t=last.time+Math.floor((nowT-last.time)/step)*step;
    applyTick(p,t,t===last.time?last.open:last.close,q.price,q.price,q.price,null)})})}catch(e){}finally{polling=false}}
setInterval(()=>{try{wantWS()}catch(e){}},1500);setInterval(poll,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});

/* ---- ready-made live watchlists ---- */
const LISTS={'Live: Crypto':['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','DOGE-USD','ADA-USD','PAXG-USD'],'Live: Forex':['EURUSD=X','GBPUSD=X','USDJPY=X','AUDUSD=X','USDCAD=X','USDCHF=X','NZDUSD=X','EURGBP=X','EURJPY=X','EGP=X'],
 'Live: Commodity ETFs':['GLD','SLV','USO','UNG','SOYB','CORN','WEAT','DBA','CPER','DBC'],'Live: US stocks':['SPY','QQQ','DIA','AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA']};
NAMES['PAXG-USD']=NAMES['PAXG-USD']||'PAX Gold (1 token = 1 oz gold)';
const _ctor=App.prototype.buildRight;
App.prototype.buildRight=function(){try{const w=this.wl;if(w&&w.lists){let ch=false;Object.entries(LISTS).forEach(([k,v])=>{if(!w.lists[k]){w.lists[k]=v;ch=true}});if(ch)Store.set('wl',w)}}catch(e){}return _ctor.call(this)};
})();
