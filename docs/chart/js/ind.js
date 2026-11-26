// indicator engine: pure functions over arrays (null = undefined value)
const N=null;
const M={
 fill:(n,v=N)=>Array(n).fill(v),
 sma(a,n){const o=M.fill(a.length);let s=0,c=0;for(let i=0;i<a.length;i++){if(a[i]!=null){s+=a[i];c++}if(i>=n&&a[i-n]!=null){s-=a[i-n];c--}if(c===n&&i>=n-1)o[i]=s/n}return o},
 ema(a,n){const o=M.fill(a.length),k=2/(n+1);let e=N,c=0,s=0;for(let i=0;i<a.length;i++){const x=a[i];if(x==null)continue;if(e==null){s+=x;c++;if(c===n){e=s/n;o[i]=e}}else{e=x*k+e*(1-k);o[i]=e}}return o},
 rma(a,n){const o=M.fill(a.length);let e=N,c=0,s=0;for(let i=0;i<a.length;i++){const x=a[i];if(x==null)continue;if(e==null){s+=x;c++;if(c===n){e=s/n;o[i]=e}}else{e=(e*(n-1)+x)/n;o[i]=e}}return o},
 wma(a,n){const o=M.fill(a.length),w=n*(n+1)/2;for(let i=n-1;i<a.length;i++){let s=0,ok=true;for(let j=0;j<n;j++){const x=a[i-n+1+j];if(x==null){ok=false;break}s+=x*(j+1)}if(ok)o[i]=s/w}return o},
 hma(a,n){const h=M.wma(a,Math.max(1,Math.floor(n/2))),f=M.wma(a,n);return M.wma(a.map((_,i)=>h[i]==null||f[i]==null?N:2*h[i]-f[i]),Math.max(1,Math.round(Math.sqrt(n))))},
 std(a,n){const m=M.sma(a,n),o=M.fill(a.length);for(let i=n-1;i<a.length;i++){if(m[i]==null)continue;let s=0;for(let j=0;j<n;j++)s+=(a[i-j]-m[i])**2;o[i]=Math.sqrt(s/n)}return o},
 hh(a,n){const o=M.fill(a.length);for(let i=n-1;i<a.length;i++){let m=-Infinity;for(let j=0;j<n;j++)m=Math.max(m,a[i-j]);o[i]=m}return o},
 ll(a,n){const o=M.fill(a.length);for(let i=n-1;i<a.length;i++){let m=Infinity;for(let j=0;j<n;j++)m=Math.min(m,a[i-j]);o[i]=m}return o},
 sum(a,n){const o=M.fill(a.length);for(let i=n-1;i<a.length;i++){let s=0;for(let j=0;j<n;j++)s+=a[i-j];o[i]=s}return o},
 tr(d){return d.map((b,i)=>i?Math.max(b.high-b.low,Math.abs(b.high-d[i-1].close),Math.abs(b.low-d[i-1].close)):b.high-b.low)},
 atr(d,n){return M.rma(M.tr(d),n)},
 src(d,k){if(k==='hl2')return d.map(b=>(b.high+b.low)/2);if(k==='hlc3')return d.map(b=>(b.high+b.low+b.close)/3);if(k==='ohlc4')return d.map(b=>(b.open+b.high+b.low+b.close)/4);return d.map(b=>b[k||'close'])},
 rsi(a,n){const g=a.map((x,i)=>i?Math.max(0,x-a[i-1]):N),l=a.map((x,i)=>i?Math.max(0,a[i-1]-x):N),ag=M.rma(g,n),al=M.rma(l,n);return a.map((_,i)=>ag[i]==null?N:al[i]===0?100:100-100/(1+ag[i]/al[i]))},
 sub:(a,b)=>a.map((x,i)=>x==null||b[i]==null?N:x-b[i]),
 add:(a,b)=>a.map((x,i)=>x==null||b[i]==null?N:x+b[i]),
 mul:(a,k)=>a.map(x=>x==null?N:x*k),
 macd(a,f,s,g){const m=M.sub(M.ema(a,f),M.ema(a,s)),sig=M.ema(m,g);return {m,s:sig,h:M.sub(m,sig)}},
 stoch(d,n,sk,sd){const hh=M.hh(d.map(b=>b.high),n),ll=M.ll(d.map(b=>b.low),n),raw=d.map((b,i)=>hh[i]==null?N:hh[i]===ll[i]?50:100*(b.close-ll[i])/(hh[i]-ll[i])),k=sk>1?M.sma(raw,sk):raw;return {k,d:M.sma(k,sd)}},
 // wilder DM
 dmi(d,n){const pdm=[N],mdm=[N];for(let i=1;i<d.length;i++){const u=d[i].high-d[i-1].high,dn=d[i-1].low-d[i].low;pdm.push(u>dn&&u>0?u:0);mdm.push(dn>u&&dn>0?dn:0)}
  const a=M.atr(d,n),sp=M.rma(pdm,n),sm=M.rma(mdm,n),pdi=d.map((_,i)=>a[i]&&sp[i]!=null?100*sp[i]/a[i]:N),mdi=d.map((_,i)=>a[i]&&sm[i]!=null?100*sm[i]/a[i]:N);
  const dx=d.map((_,i)=>pdi[i]==null?N:(pdi[i]+mdi[i]===0?0:100*Math.abs(pdi[i]-mdi[i])/(pdi[i]+mdi[i])));return {pdi,mdi,adx:M.rma(dx,n)}},
};

const P=(k,l,v,o)=>({k,l,v,...o}); // param
const COL=['#2962ff','#ff9800','#e91e63','#26a69a','#ab47bc','#ffeb3b','#00bcd4','#8bc34a'];
const L=(name,v,extra)=>({name,v,...extra});

// registry: key -> {n,g,ov,p:[params],lines:[default names], calc(d,p)->{lines:[{name,v,t?,w?,dash?,pm?}],levels?:[..],colors?:fn}}
const IND={};
function reg(key,n,g,ov,p,calc){IND[key]={n,g,ov,p,calc}}
const per=(v=14,l='Period')=>P('n',l,v);
const srcP=P('src','Source','close',{opts:['close','open','high','low','hl2','hlc3','ohlc4']});
// ---- trend ----
reg('sma','SMA','Trend',true,[per(20),srcP],(d,p)=>({lines:[L('SMA '+p.n,M.sma(M.src(d,p.src),p.n))]}));
reg('ema','EMA','Trend',true,[per(20),srcP],(d,p)=>({lines:[L('EMA '+p.n,M.ema(M.src(d,p.src),p.n))]}));
reg('wma','WMA','Trend',true,[per(20),srcP],(d,p)=>({lines:[L('WMA '+p.n,M.wma(M.src(d,p.src),p.n))]}));
reg('vwma','VWMA','Trend',true,[per(20)],(d,p)=>{const pv=M.sum(d.map(b=>b.close*b.volume),p.n),v=M.sum(d.map(b=>b.volume),p.n);return {lines:[L('VWMA '+p.n,pv.map((x,i)=>x==null||!v[i]?N:x/v[i]))]}});
reg('hma','Hull MA','Trend',true,[per(21),srcP],(d,p)=>({lines:[L('HMA '+p.n,M.hma(M.src(d,p.src),p.n))]}));
reg('dema','DEMA','Trend',true,[per(20)],(d,p)=>{const c=M.src(d,'close'),e=M.ema(c,p.n),e2=M.ema(e,p.n);return {lines:[L('DEMA '+p.n,e.map((x,i)=>x==null||e2[i]==null?N:2*x-e2[i]))]}});
reg('tema','TEMA','Trend',true,[per(20)],(d,p)=>{const c=M.src(d,'close'),e=M.ema(c,p.n),e2=M.ema(e,p.n),e3=M.ema(e2,p.n);return {lines:[L('TEMA '+p.n,e.map((x,i)=>e3[i]==null?N:3*x-3*e2[i]+e3[i]))]}});
reg('env','MA Envelope','Trend',true,[per(20),P('pct','Percent',2.5)],(d,p)=>{const m=M.sma(M.src(d,'close'),p.n);return {lines:[L('Upper',M.mul(m,1+p.pct/100)),L('Basis',m),L('Lower',M.mul(m,1-p.pct/100))]}});
reg('ichi','Ichimoku Cloud','Trend',true,[P('a','Tenkan',9),P('b','Kijun',26),P('c','Senkou B',52),P('s','Displacement',26)],(d,p)=>{
 const H=d.map(b=>b.high),Lw=d.map(b=>b.low),mid=n=>{const h=M.hh(H,n),l=M.ll(Lw,n);return h.map((x,i)=>x==null?N:(x+l[i])/2)};
 const t=mid(p.a),k=mid(p.b),sa=t.map((x,i)=>x==null||k[i]==null?N:(x+k[i])/2),sb=mid(p.c);
 const sh=(a,s)=>a.map((_,i)=>i-s>=0?a[i-s]:N),ch=d.map((b,i)=>i+p.s<d.length?d[i+p.s].close:N);
 return {lines:[L('Tenkan',t),L('Kijun',k),L('Senkou A',sh(sa,p.s)),L('Senkou B',sh(sb,p.s)),L('Chikou',ch,{dash:true})]}});
reg('st','Supertrend','Trend',true,[per(10,'ATR period'),P('m','Multiplier',3)],(d,p)=>{
 const a=M.atr(d,p.n),up=M.fill(d.length),dn=M.fill(d.length),v=M.fill(d.length),dir=M.fill(d.length);let tr=1,fu=N,fl=N;
 for(let i=0;i<d.length;i++){if(a[i]==null)continue;const hl=(d[i].high+d[i].low)/2,bu=hl+p.m*a[i],bl=hl-p.m*a[i];
  const pu=fu,pl=fl;fu=(pu==null||bu<pu||d[i-1].close>pu)?bu:pu;fl=(pl==null||bl>pl||d[i-1].close<pl)?bl:pl;
  if(pu==null){tr=1}else if(tr===1&&d[i].close<fl)tr=-1;else if(tr===-1&&d[i].close>fu)tr=1;
  v[i]=tr===1?fl:fu;dir[i]=tr}
 return {lines:[L('Supertrend',v,{colorFn:i=>dir[i]===1?'#26a69a':'#ef5350'})]}});
reg('psar','Parabolic SAR','Trend',true,[P('st','Start',0.02),P('inc','Increment',0.02),P('mx','Max',0.2)],(d,p)=>{
 const o=M.fill(d.length);if(d.length<3)return {lines:[L('PSAR',o,{pm:true})]};let up=d[1].close>d[0].close,af=p.st,ep=up?d[0].high:d[0].low,s=up?d[0].low:d[0].high;
 for(let i=1;i<d.length;i++){s=s+af*(ep-s);if(up){s=Math.min(s,d[i-1].low,i>1?d[i-2].low:d[i-1].low);if(d[i].low<s){up=false;s=ep;ep=d[i].low;af=p.st}else if(d[i].high>ep){ep=d[i].high;af=Math.min(af+p.inc,p.mx)}}
  else{s=Math.max(s,d[i-1].high,i>1?d[i-2].high:d[i-1].high);if(d[i].high>s){up=true;s=ep;ep=d[i].high;af=p.st}else if(d[i].low<ep){ep=d[i].low;af=Math.min(af+p.inc,p.mx)}}o[i]=s}
 return {lines:[L('PSAR',o,{pm:true})]}});
reg('bb','Bollinger Bands','Volatility',true,[per(20),P('m','StdDev',2),srcP],(d,p)=>{const s=M.src(d,p.src),m=M.sma(s,p.n),sd=M.std(s,p.n);return {lines:[L('Upper',m.map((x,i)=>x==null?N:x+p.m*sd[i])),L('Basis',m),L('Lower',m.map((x,i)=>x==null?N:x-p.m*sd[i]))]}});
reg('kc','Keltner Channels','Volatility',true,[per(20),P('m','ATR mult',2),P('an','ATR period',10)],(d,p)=>{const m=M.ema(M.src(d,'close'),p.n),a=M.atr(d,p.an);return {lines:[L('Upper',m.map((x,i)=>x==null||a[i]==null?N:x+p.m*a[i])),L('Basis',m),L('Lower',m.map((x,i)=>x==null||a[i]==null?N:x-p.m*a[i]))]}});
reg('dc','Donchian Channels','Volatility',true,[per(20)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[L('Upper',h),L('Middle',h.map((x,i)=>x==null?N:(x+l[i])/2)),L('Lower',l)]}});
reg('vwap','VWAP / Anchored VWAP','Volume',true,[P('anc','Anchor date (YYYY-MM-DD, optional)',''),P('rs','Reset (day/week/none)','auto')],(d,p)=>{
 let anc=p.anc?Date.parse(p.anc+'T00:00:00Z')/1000:null,pv=0,vv=0,lastKey=null;const o=M.fill(d.length);
 const intra=d.length>2&&d[1].time-d[0].time<86400;
 d.forEach((b,i)=>{const key=anc?null:(p.rs==='none'?null:(intra||p.rs==='day')?Math.floor(b.time/86400):p.rs==='week'?Math.floor(b.time/604800):new Date(b.time*1000).getUTCFullYear());
  if(key!==lastKey){pv=0;vv=0;lastKey=key}if(anc&&b.time<anc)return;const tp=(b.high+b.low+b.close)/3;pv+=tp*b.volume;vv+=b.volume;if(vv>0)o[i]=pv/vv});
 return {lines:[L(anc?'Anchored VWAP':'VWAP',o)]}});
reg('pivot','Pivot Points (prev bar)','Market Structure',true,[],(d)=>{const P_=[],R1=[],S1=[],R2=[],S2=[];d.forEach((b,i)=>{if(!i){[P_,R1,S1,R2,S2].forEach(a=>a.push(N));return}const x=d[i-1],pp=(x.high+x.low+x.close)/3;P_.push(pp);R1.push(2*pp-x.low);S1.push(2*pp-x.high);R2.push(pp+x.high-x.low);S2.push(pp-(x.high-x.low))});return {lines:[L('R2',R2),L('R1',R1),L('P',P_),L('S1',S1),L('S2',S2)]}});
// ---- oscillators ----
reg('rsi','RSI','Momentum',false,[per(14),srcP],(d,p)=>({lines:[L('RSI '+p.n,M.rsi(M.src(d,p.src),p.n))],levels:[30,70]}));
reg('macd','MACD','Momentum',false,[P('f','Fast',12),P('s','Slow',26),P('g','Signal',9)],(d,p)=>{const r=M.macd(M.src(d,'close'),p.f,p.s,p.g);return {lines:[L('Hist',r.h,{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'}),L('MACD',r.m),L('Signal',r.s)]}});
reg('stoch','Stochastic','Momentum',false,[per(14,'%K'),P('sk','Smooth K',3),P('sd','%D',3)],(d,p)=>{const r=M.stoch(d,p.n,p.sk,p.sd);return {lines:[L('%K',r.k),L('%D',r.d)],levels:[20,80]}});
reg('srsi','Stochastic RSI','Momentum',false,[per(14,'RSI'),P('s','Stoch',14),P('k','K',3),P('dd','D',3)],(d,p)=>{const r=M.rsi(M.src(d,'close'),p.n),hh=M.hh(r.map(x=>x==null?-1e9:x),p.s),ll=M.ll(r.map(x=>x==null?1e9:x),p.s),raw=r.map((x,i)=>x==null||hh[i]==null||hh[i]<-1e8||ll[i]>1e8?N:hh[i]===ll[i]?50:100*(x-ll[i])/(hh[i]-ll[i])),k=M.sma(raw,p.k);return {lines:[L('%K',k),L('%D',M.sma(k,p.dd))],levels:[20,80]}});
reg('cci','CCI','Momentum',false,[per(20)],(d,p)=>{const tp=M.src(d,'hlc3'),m=M.sma(tp,p.n),o=M.fill(d.length);for(let i=p.n-1;i<d.length;i++){if(m[i]==null)continue;let s=0;for(let j=0;j<p.n;j++)s+=Math.abs(tp[i-j]-m[i]);const md=s/p.n;o[i]=md?(tp[i]-m[i])/(0.015*md):0}return {lines:[L('CCI',o)],levels:[-100,100]}});
reg('wr','Williams %R','Momentum',false,[per(14)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[L('%R',d.map((b,i)=>h[i]==null?N:h[i]===l[i]?-50:-100*(h[i]-b.close)/(h[i]-l[i])))],levels:[-80,-20]}});
reg('roc','ROC','Momentum',false,[per(12)],(d,p)=>({lines:[L('ROC',d.map((b,i)=>i<p.n?N:100*(b.close/d[i-p.n].close-1)))],levels:[0]}));
reg('mom','Momentum','Momentum',false,[per(10)],(d,p)=>({lines:[L('MOM',d.map((b,i)=>i<p.n?N:b.close-d[i-p.n].close))],levels:[0]}));
reg('tsi','TSI','Momentum',false,[P('l','Long',25),P('s','Short',13),P('g','Signal',13)],(d,p)=>{const c=d.map(b=>b.close),m=c.map((x,i)=>i?x-c[i-1]:N),a=m.map(x=>x==null?N:Math.abs(x)),n=M.ema(M.ema(m,p.l),p.s),dd=M.ema(M.ema(a,p.l),p.s),t=n.map((x,i)=>x==null||!dd[i]?N:100*x/dd[i]);return {lines:[L('TSI',t),L('Signal',M.ema(t,p.g))],levels:[0]}});
reg('ao','Awesome Oscillator','Momentum',false,[],(d)=>{const h=M.src(d,'hl2'),a=M.sub(M.sma(h,5),M.sma(h,34));return {lines:[L('AO',a,{t:'hist',colorFn:(i,v)=>(i&&a[i-1]!=null&&v>=a[i-1])?'#26a69a':'#ef5350'})]}});
reg('uo','Ultimate Oscillator','Momentum',false,[],(d)=>{const bp=d.map((b,i)=>i?b.close-Math.min(b.low,d[i-1].close):N),tr=d.map((b,i)=>i?Math.max(b.high,d[i-1].close)-Math.min(b.low,d[i-1].close):N),r=n=>{const a=M.sum(bp.map(x=>x??0),n),t=M.sum(tr.map(x=>x??0),n);return a.map((x,i)=>x==null||!t[i]?N:x/t[i])},a=r(7),b=r(14),c=r(28);return {lines:[L('UO',a.map((x,i)=>x==null||b[i]==null||c[i]==null?N:100*(4*x+2*b[i]+c[i])/7))],levels:[30,70]}});
reg('cmo','Chande Momentum','Momentum',false,[per(14)],(d,p)=>{const c=d.map(b=>b.close),u=c.map((x,i)=>i?Math.max(0,x-c[i-1]):0),dn=c.map((x,i)=>i?Math.max(0,c[i-1]-x):0),su=M.sum(u,p.n),sd=M.sum(dn,p.n);return {lines:[L('CMO',su.map((x,i)=>x==null?N:(x+sd[i]?100*(x-sd[i])/(x+sd[i]):0)))],levels:[-50,50]}});
reg('trix','TRIX','Momentum',false,[per(15)],(d,p)=>{const e=M.ema(M.ema(M.ema(d.map(b=>Math.log(b.close)),p.n),p.n),p.n);return {lines:[L('TRIX',e.map((x,i)=>i&&x!=null&&e[i-1]!=null?10000*(x-e[i-1]):N))],levels:[0]}});
reg('dpo','Detrended Price Osc.','Momentum',false,[per(20)],(d,p)=>{const m=M.sma(d.map(b=>b.close),p.n),s=Math.floor(p.n/2)+1;return {lines:[L('DPO',d.map((b,i)=>i-s>=0&&m[i]!=null?d[i-s].close-m[i]:N))],levels:[0]}});
reg('bbp','Bull/Bear Power (Elder)','Momentum',false,[per(13)],(d,p)=>{const e=M.ema(d.map(b=>b.close),p.n);return {lines:[L('Bull',d.map((b,i)=>e[i]==null?N:b.high-e[i]),{t:'hist',colorFn:()=>'#26a69a'}),L('Bear',d.map((b,i)=>e[i]==null?N:b.low-e[i]),{t:'hist',colorFn:()=>'#ef5350'})]}});
reg('adx','ADX / DMI','Trend',false,[per(14)],(d,p)=>{const r=M.dmi(d,p.n);return {lines:[L('ADX',r.adx),L('+DI',r.pdi),L('-DI',r.mdi)]}});
reg('aroon','Aroon','Trend',false,[per(25)],(d,p)=>{const up=M.fill(d.length),dn=M.fill(d.length);for(let i=p.n;i<d.length;i++){let hi=i,lo=i;for(let j=i-p.n;j<=i;j++){if(d[j].high>=d[hi].high)hi=j;if(d[j].low<=d[lo].low)lo=j}up[i]=100*(p.n-(i-hi))/p.n;dn[i]=100*(p.n-(i-lo))/p.n}return {lines:[L('Up',up),L('Down',dn)]}});
reg('vortex','Vortex','Trend',false,[per(14)],(d,p)=>{const vp=d.map((b,i)=>i?Math.abs(b.high-d[i-1].low):0),vm=d.map((b,i)=>i?Math.abs(b.low-d[i-1].high):0),t=M.sum(M.tr(d),p.n),a=M.sum(vp,p.n),b=M.sum(vm,p.n);return {lines:[L('VI+',a.map((x,i)=>x==null?N:x/t[i])),L('VI-',b.map((x,i)=>x==null?N:x/t[i]))]}});
reg('massi','Mass Index','Volatility',false,[per(25)],(d,p)=>{const r=d.map(b=>b.high-b.low),e=M.ema(r,9),e2=M.ema(e,9);return {lines:[L('MI',M.sum(e.map((x,i)=>x==null||e2[i]==null?0:x/e2[i]),p.n).map((x,i)=>i<p.n+16?N:x))]}});
// ---- volatility ----
reg('atr','ATR','Volatility',false,[per(14)],(d,p)=>({lines:[L('ATR '+p.n,M.atr(d,p.n))]}));
reg('sd','Standard Deviation','Volatility',false,[per(20)],(d,p)=>({lines:[L('StdDev',M.std(M.src(d,'close'),p.n))]}));
reg('hv','Historical Volatility','Volatility',false,[per(20),P('ann','Annualize (bars/yr)',252)],(d,p)=>{const r=d.map((b,i)=>i?Math.log(b.close/d[i-1].close):N);return {lines:[L('HV %',M.std(r.map(x=>x??0),p.n).map((x,i)=>i<p.n?N:x*Math.sqrt(p.ann)*100))]}});
reg('cv','Chaikin Volatility','Volatility',false,[per(10),P('r','ROC',10)],(d,p)=>{const e=M.ema(d.map(b=>b.high-b.low),p.n);return {lines:[L('CV',e.map((x,i)=>i>=p.r&&x!=null&&e[i-p.r]?100*(x-e[i-p.r])/e[i-p.r]:N))],levels:[0]}});
// ---- volume ----
reg('obv','OBV','Volume',false,[],(d)=>{let s=0;return {lines:[L('OBV',d.map((b,i)=>{if(i)s+=b.close>d[i-1].close?b.volume:b.close<d[i-1].close?-b.volume:0;return s}))]}});
reg('mfi','Money Flow Index','Volume',false,[per(14)],(d,p)=>{const tp=M.src(d,'hlc3'),pos=tp.map((x,i)=>i&&x>tp[i-1]?x*d[i].volume:0),neg=tp.map((x,i)=>i&&x<tp[i-1]?x*d[i].volume:0),a=M.sum(pos,p.n),b=M.sum(neg,p.n);return {lines:[L('MFI',a.map((x,i)=>x==null?N:b[i]===0?100:100-100/(1+x/b[i])))],levels:[20,80]}});
const clv=b=>b.high===b.low?0:((b.close-b.low)-(b.high-b.close))/(b.high-b.low);
reg('cmf','Chaikin Money Flow','Volume',false,[per(20)],(d,p)=>{const a=M.sum(d.map(b=>clv(b)*b.volume),p.n),v=M.sum(d.map(b=>b.volume),p.n);return {lines:[L('CMF',a.map((x,i)=>x==null||!v[i]?N:x/v[i]))],levels:[0]}});
reg('ad','Accumulation/Distribution','Volume',false,[],(d)=>{let s=0;return {lines:[L('A/D',d.map(b=>(s+=clv(b)*b.volume)))]}});
reg('fi','Force Index','Volume',false,[per(13)],(d,p)=>({lines:[L('FI',M.ema(d.map((b,i)=>i?(b.close-d[i-1].close)*b.volume:N),p.n))],levels:[0]}));
reg('eom','Ease of Movement','Volume',false,[per(14)],(d,p)=>{const r=d.map((b,i)=>i&&b.volume?((b.high+b.low)/2-(d[i-1].high+d[i-1].low)/2)/(b.volume/1e4/((b.high-b.low)||1)):N);return {lines:[L('EOM',M.sma(r,p.n))],levels:[0]}});
reg('dvol','Volume Delta (estimated)','Volume',false,[],(d)=>({lines:[L('Delta~',d.map(b=>clv(b)*b.volume),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],note:'Estimated from candle close location. True volume delta needs tick/order-flow data (licensed).'}));
reg('cvd','Cumulative Volume Delta (estimated)','Volume',false,[],(d)=>{let s=0;return {lines:[L('CVD~',d.map(b=>(s+=clv(b)*b.volume)))],note:'Estimated from candle close location. True CVD needs tick/order-flow data (licensed).'}});
reg('rvol','Relative Volume','Volume',false,[per(20)],(d,p)=>{const m=M.sma(d.map(b=>b.volume),p.n);return {lines:[L('RVOL',d.map((b,i)=>m[i]?b.volume/m[i]:N),{t:'hist',colorFn:(i,v)=>v>2?'#ff9800':'#5d6b7a'})],levels:[1]}});
const INDKEYS=Object.keys(IND);
// compute for an instance; returns calc result
function runInd(inst,d){const def=IND[inst.key];const p={};def.p.forEach(x=>p[x.k]=inst.p&&inst.p[x.k]!==undefined?inst.p[x.k]:x.v);
 for(const k in p){const x=def.p.find(y=>y.k===k);if(typeof x.v==='number')p[k]=+p[k]}
 return def.calc(d,p)}
