// Extra indicator library (distinct algorithms). Every entry is computed from the loaded bars only; null = undefined value.
// Uses the engine in ind.js (M, reg, IND, L, P, per, srcP, clv). Presets (same algorithm, fixed parameters) live in ind3.js.
const X={
 // rolling linear regression over n bars (x = 0..n-1, newest = n-1). Returns arrays: end (fitted value at newest bar), slope, icpt, r2, se
 lin(a,n){const len=a.length,end=M.fill(len),sl=M.fill(len),ic=M.fill(len),r2=M.fill(len),se=M.fill(len);if(n<2)return {end,sl,ic,r2,se};
  const sx=n*(n-1)/2,sxx=(n-1)*n*(2*n-1)/6,den=n*sxx-sx*sx;
  for(let i=n-1;i<len;i++){let sy=0,sxy=0,syy=0,ok=true;for(let j=0;j<n;j++){const y=a[i-n+1+j];if(y==null){ok=false;break}sy+=y;sxy+=j*y;syy+=y*y}if(!ok)continue;
   const b=(n*sxy-sx*sy)/den,c=(sy-b*sx)/n;sl[i]=b;ic[i]=c;end[i]=c+b*(n-1);
   const sst=syy-sy*sy/n;let sse=0;for(let j=0;j<n;j++){const e=a[i-n+1+j]-(c+b*j);sse+=e*e}r2[i]=sst>0?1-sse/sst:0;se[i]=n>2?Math.sqrt(sse/(n-2)):0}
  return {end,sl,ic,r2,se}},
 med(a,n){const o=M.fill(a.length);for(let i=n-1;i<a.length;i++){const w=[];let ok=true;for(let j=0;j<n;j++){const x=a[i-j];if(x==null){ok=false;break}w.push(x)}if(!ok)continue;w.sort((x,y)=>x-y);o[i]=n%2?w[(n-1)/2]:(w[n/2-1]+w[n/2])/2}return o},
 lag:(a,k)=>a.map((_,i)=>i-k>=0?a[i-k]:null),
 shift:(a,k)=>a.map((_,i)=>i-k>=0?a[i-k]:null),
 map2:(a,b,f)=>a.map((x,i)=>x==null||b[i]==null?null:f(x,b[i],i)),
 cum(a){let s=0;return a.map(x=>{if(x==null)return null;s+=x;return s})},
 roc:(a,n)=>a.map((x,i)=>i>=n&&x!=null&&a[i-n]!=null&&a[i-n]!==0?100*(x/a[i-n]-1):null),
 mean(a,n){return M.sma(a,n)},
 abs:a=>a.map(x=>x==null?null:Math.abs(x)),
 // Wilder-smoothed sum helper for volume-style averages
 ef(d,n){const c=d.map(b=>b.close),o=M.fill(d.length),ch=c.map((x,i)=>i?Math.abs(x-c[i-1]):0),s=M.sum(ch,n);for(let i=n;i<d.length;i++)o[i]=s[i]?Math.abs(c[i]-c[i-n])/s[i]:0;return o},
 hl2:d=>d.map(b=>(b.high+b.low)/2),
 ln:Math.log
};
const mk=(name,v,e)=>L(name,v,e);
const SRC=(d,p)=>M.src(d,p.src);
const MA_G='Moving Averages';
// ---------- moving averages ----------
reg('smma','SMMA (Wilder MA)',MA_G,true,[per(14),srcP],(d,p)=>({lines:[mk('SMMA '+p.n,M.rma(SRC(d,p),p.n))]}));
reg('tma','Triangular MA',MA_G,true,[per(20),srcP],(d,p)=>({lines:[mk('TMA '+p.n,M.sma(M.sma(SRC(d,p),Math.ceil((p.n+1)/2)),Math.floor(p.n/2)+1))]}));
reg('zlema','Zero-Lag EMA',MA_G,true,[per(20),srcP],(d,p)=>{const s=SRC(d,p),lag=Math.floor((p.n-1)/2);return {lines:[mk('ZLEMA '+p.n,M.ema(s.map((x,i)=>i>=lag?2*x-s[i-lag]:null),p.n))]}});
reg('kama','Kaufman Adaptive MA (KAMA)',MA_G,true,[per(10,'Efficiency period'),P('f','Fast',2),P('s','Slow',30),srcP],(d,p)=>{const s=SRC(d,p),o=M.fill(s.length),f=2/(p.f+1),sl=2/(p.s+1);let k=null;
 for(let i=p.n;i<s.length;i++){let v=0;for(let j=i-p.n+1;j<=i;j++)v+=Math.abs(s[j]-s[j-1]);const er=v?Math.abs(s[i]-s[i-p.n])/v:0,sc=(er*(f-sl)+sl)**2;if(k==null)k=s[i-1];k=k+sc*(s[i]-k);o[i]=k}return {lines:[mk('KAMA '+p.n,o)]}});
reg('alma','Arnaud Legoux MA (ALMA)',MA_G,true,[per(9),P('o','Offset',0.85),P('sg','Sigma',6),srcP],(d,p)=>{const s=SRC(d,p),m=Math.floor(p.o*(p.n-1)),sd=p.n/p.sg,w=[];let ws=0;for(let j=0;j<p.n;j++){const x=Math.exp(-((j-m)**2)/(2*sd*sd));w.push(x);ws+=x}
 return {lines:[mk('ALMA '+p.n,s.map((_,i)=>{if(i<p.n-1)return null;let t=0;for(let j=0;j<p.n;j++){const y=s[i-p.n+1+j];if(y==null)return null;t+=y*w[j]}return t/ws}))]}});
reg('t3','Tillson T3',MA_G,true,[per(5),P('v','Volume factor',0.7),srcP],(d,p)=>{const s=SRC(d,p),gd=x=>{const a=M.ema(x,p.n),b=M.ema(a,p.n);return a.map((v,i)=>v==null||b[i]==null?null:v*(1+p.v)-b[i]*p.v)};return {lines:[mk('T3 '+p.n,gd(gd(gd(s))))]}});
reg('vidya','VIDYA (CMO-adaptive EMA)',MA_G,true,[per(14),P('c','CMO period',9),srcP],(d,p)=>{const s=SRC(d,p),o=M.fill(s.length),k=2/(p.n+1);let v=null;
 for(let i=p.c;i<s.length;i++){let u=0,dn=0;for(let j=i-p.c+1;j<=i;j++){const ch=s[j]-s[j-1];if(ch>0)u+=ch;else dn-=ch}const cmo=u+dn?Math.abs((u-dn)/(u+dn)):0;if(v==null)v=s[i];v=k*cmo*s[i]+(1-k*cmo)*v;o[i]=v}return {lines:[mk('VIDYA '+p.n,o)]}});
reg('mcg','McGinley Dynamic',MA_G,true,[per(14),srcP],(d,p)=>{const s=SRC(d,p),o=M.fill(s.length);let m=null;for(let i=0;i<s.length;i++){if(m==null)m=s[i];else m=m+(s[i]-m)/(p.n*Math.pow(s[i]/m,4));o[i]=m}return {lines:[mk('McGinley '+p.n,o)]}});
reg('lsma','Least Squares MA (Linear Regression)',MA_G,true,[per(25),srcP],(d,p)=>({lines:[mk('LSMA '+p.n,X.lin(SRC(d,p),p.n).end)]}));
reg('gma','Geometric MA',MA_G,true,[per(20)],(d,p)=>({lines:[mk('GMA '+p.n,M.sma(d.map(b=>Math.log(b.close)),p.n).map(x=>x==null?null:Math.exp(x)))]}));
reg('hrm','Harmonic MA',MA_G,true,[per(20)],(d,p)=>({lines:[mk('HRM '+p.n,M.sma(d.map(b=>1/b.close),p.n).map(x=>x?1/x:null))]}));
reg('ehma','Exponential Hull MA',MA_G,true,[per(21),srcP],(d,p)=>{const s=SRC(d,p),a=M.ema(s,Math.max(1,Math.floor(p.n/2))),b=M.ema(s,p.n);return {lines:[mk('EHMA '+p.n,M.ema(M.sub(M.mul(a,2),b),Math.max(1,Math.round(Math.sqrt(p.n)))))]}});
reg('vwema','Volume-Weighted EMA',MA_G,true,[per(20)],(d,p)=>{const a=M.ema(d.map(b=>b.close*b.volume),p.n),v=M.ema(d.map(b=>b.volume),p.n);return {lines:[mk('VWEMA '+p.n,a.map((x,i)=>x==null||!v[i]?null:x/v[i]))]}});
reg('mmed','Moving Median',MA_G,true,[per(20),srcP],(d,p)=>({lines:[mk('Median '+p.n,X.med(SRC(d,p),p.n))]}));
reg('ssf','Ehlers Super Smoother',MA_G,true,[per(10,'Cutoff period'),srcP],(d,p)=>{const s=SRC(d,p),o=s.slice(),a=Math.exp(-1.414213562*Math.PI/p.n),b=2*a*Math.cos(1.414213562*Math.PI/p.n),c2=b,c3=-a*a,c1=1-c2-c3;for(let i=2;i<s.length;i++)o[i]=c1*(s[i]+s[i-1])/2+c2*o[i-1]+c3*o[i-2];return {lines:[mk('SuperSmoother '+p.n,o.map((x,i)=>i<2?null:x))]}});
reg('dsma','Double SMA',MA_G,true,[per(20),srcP],(d,p)=>({lines:[mk('DSMA '+p.n,M.sma(M.sma(SRC(d,p),p.n),p.n))]}));
reg('midpt','Midpoint (highest+lowest)/2',MA_G,true,[per(14),srcP],(d,p)=>{const s=SRC(d,p),h=M.hh(s,p.n),l=M.ll(s,p.n);return {lines:[mk('Midpoint '+p.n,h.map((x,i)=>x==null?null:(x+l[i])/2))]}});
reg('midprc','Midprice (high+low)/2',MA_G,true,[per(14)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('Midprice '+p.n,h.map((x,i)=>x==null?null:(x+l[i])/2))]}});
reg('ribbon','EMA Ribbon (8 EMAs)',MA_G,true,[P('a','First period',10),P('st','Step',10)],(d,p)=>{const c=M.src(d,'close');return {lines:Array.from({length:8},(_,k)=>{const n=p.a+k*p.st;return mk('EMA '+n,M.ema(c,n))})}});
reg('guppy','Guppy Multiple MA (12 EMAs)',MA_G,true,[],(d)=>{const c=M.src(d,'close');return {lines:[3,5,8,10,12,15,30,35,40,45,50,60].map(n=>mk('EMA '+n,M.ema(c,n),{w:n<30?1:2}))}});
reg('gator','Williams Alligator',MA_G,true,[],(d)=>{const h=X.hl2(d),sh=(a,k)=>X.shift(a,k);return {lines:[mk('Jaw 13/8',sh(M.rma(h,13),8)),mk('Teeth 8/5',sh(M.rma(h,8),5)),mk('Lips 5/3',sh(M.rma(h,5),3))]}});
reg('avgp','Average Price (OHLC/4)',MA_G,true,[],(d)=>({lines:[mk('OHLC4',M.src(d,'ohlc4'))]}));
reg('medp','Median Price (HL/2)',MA_G,true,[],(d)=>({lines:[mk('HL2',X.hl2(d))]}));
reg('typp','Typical Price (HLC/3)',MA_G,true,[],(d)=>({lines:[mk('HLC3',M.src(d,'hlc3'))]}));
reg('wcl','Weighted Close (H+L+2C)/4',MA_G,true,[],(d)=>({lines:[mk('WC',d.map(b=>(b.high+b.low+2*b.close)/4))]}));
// ---------- bands & channels ----------
const BC='Bands & Channels';
reg('bbpb','Bollinger %B',BC,false,[per(20),P('m','StdDev',2)],(d,p)=>{const s=M.src(d,'close'),m=M.sma(s,p.n),sd=M.std(s,p.n);return {lines:[mk('%B',s.map((x,i)=>m[i]==null||!sd[i]?null:(x-(m[i]-p.m*sd[i]))/(2*p.m*sd[i])))],levels:[0,0.5,1]}});
reg('bbw','Bollinger Bandwidth',BC,false,[per(20),P('m','StdDev',2)],(d,p)=>{const s=M.src(d,'close'),m=M.sma(s,p.n),sd=M.std(s,p.n);return {lines:[mk('BBW %',m.map((x,i)=>x==null?null:100*2*p.m*sd[i]/x))]}});
reg('starc','STARC Bands',BC,true,[per(6,'SMA'),P('an','ATR',15),P('m','Multiplier',2)],(d,p)=>{const m=M.sma(M.src(d,'close'),p.n),a=M.atr(d,p.an);return {lines:[mk('Upper',m.map((x,i)=>x==null||a[i]==null?null:x+p.m*a[i])),mk('Basis',m),mk('Lower',m.map((x,i)=>x==null||a[i]==null?null:x-p.m*a[i]))]}});
reg('accb','Acceleration Bands',BC,true,[per(20),P('f','Factor',4)],(d,p)=>{const r=d.map(b=>(b.high-b.low)/(b.high+b.low)*p.f);return {lines:[mk('Upper',M.sma(d.map((b,i)=>b.high*(1+r[i])),p.n)),mk('Basis',M.sma(M.src(d,'close'),p.n)),mk('Lower',M.sma(d.map((b,i)=>b.low*(1-r[i])),p.n))]}});
reg('chand','Chandelier Exit',BC,true,[per(22),P('m','ATR mult',3)],(d,p)=>{const a=M.atr(d,p.n),h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('Long exit',h.map((x,i)=>x==null||a[i]==null?null:x-p.m*a[i])),mk('Short exit',l.map((x,i)=>x==null||a[i]==null?null:x+p.m*a[i]))]}});
reg('mach','Moving Average Channel (SMA High/Low)',BC,true,[per(20)],(d,p)=>({lines:[mk('High MA',M.sma(d.map(b=>b.high),p.n)),mk('Low MA',M.sma(d.map(b=>b.low),p.n))]}));
reg('lrc','Linear Regression Channel',BC,true,[per(50),P('m','Std dev mult',2)],(d,p)=>{const r=X.lin(M.src(d,'close'),p.n);return {lines:[mk('Upper',r.end.map((x,i)=>x==null?null:x+p.m*r.se[i])),mk('Fit',r.end),mk('Lower',r.end.map((x,i)=>x==null?null:x-p.m*r.se[i]))]}});
reg('seb','Standard Error Bands',BC,true,[per(21,'Regression period'),P('s','Smoothing',3),P('m','Mult',2)],(d,p)=>{const r=X.lin(M.src(d,'close'),p.n),e=M.sma(r.end,p.s),se=M.sma(r.se,p.s);return {lines:[mk('Upper',e.map((x,i)=>x==null||se[i]==null?null:x+p.m*se[i])),mk('Basis',e),mk('Lower',e.map((x,i)=>x==null||se[i]==null?null:x-p.m*se[i]))]}});
reg('medch','Median Price Channel',BC,true,[per(20)],(d,p)=>({lines:[mk('Median High',X.med(d.map(b=>b.high),p.n)),mk('Median Low',X.med(d.map(b=>b.low),p.n))]}));
reg('kcw','Keltner Channel Width',BC,false,[per(20),P('m','ATR mult',2),P('an','ATR period',10)],(d,p)=>{const m=M.ema(M.src(d,'close'),p.n),a=M.atr(d,p.an);return {lines:[mk('KC width %',m.map((x,i)=>x==null||a[i]==null?null:100*2*p.m*a[i]/x))]}});
reg('dcw','Donchian Channel Width',BC,false,[per(20)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('DC width %',h.map((x,i)=>x==null?null:100*(x-l[i])/d[i].close))]}});
reg('pctrk','Price Position in Range (Stoch of close, %)',BC,false,[per(20)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('Position %',h.map((x,i)=>x==null||x===l[i]?null:100*(d[i].close-l[i])/(x-l[i])))],levels:[20,50,80]}});
reg('sqz','Squeeze Momentum (BB inside KC)',BC,false,[per(20),P('bm','BB mult',2),P('km','KC mult',1.5)],(d,p)=>{const c=M.src(d,'close'),m=M.sma(c,p.n),sd=M.std(c,p.n),a=M.sma(M.tr(d),p.n),hh=M.hh(d.map(b=>b.high),p.n),ll=M.ll(d.map(b=>b.low),p.n);
 const src=d.map((b,i)=>m[i]==null?null:b.close-((hh[i]+ll[i])/2+m[i])/2),mom=X.lin(src,p.n).end,on=d.map((_,i)=>m[i]==null||a[i]==null?null:(m[i]-p.bm*sd[i]>m[i]-p.km*a[i]&&m[i]+p.bm*sd[i]<m[i]+p.km*a[i])?1:0);
 return {lines:[mk('Momentum',mom,{t:'hist',colorFn:(i,v)=>on[i]?'#7d8793':(v>=0?'#26a69a':'#ef5350')})],levels:[0],note:'Grey bars: squeeze on (Bollinger bands inside Keltner channel).'}});
reg('frac','Williams Fractals (5-bar)',BC,true,[],(d)=>{const up=M.fill(d.length),dn=M.fill(d.length);for(let i=2;i<d.length-2;i++){const h=d[i].high,l=d[i].low;if(h>d[i-1].high&&h>d[i-2].high&&h>d[i+1].high&&h>d[i+2].high)up[i]=h;if(l<d[i-1].low&&l<d[i-2].low&&l<d[i+1].low&&l<d[i+2].low)dn[i]=l}
 return {lines:[mk('Up fractal',up,{pm:true,w:0}),mk('Down fractal',dn,{pm:true,w:0})],note:'Fractals are confirmed 2 bars later, so the latest two bars never show one. Not usable as a live signal.'}});
// ---------- trend ----------
const TR='Trend';
reg('adxr','ADXR',TR,false,[per(14)],(d,p)=>{const a=M.dmi(d,p.n).adx;return {lines:[mk('ADXR',a.map((x,i)=>x==null||i<p.n||a[i-p.n]==null?null:(x+a[i-p.n])/2))]}});
reg('dx','DX (Directional Index)',TR,false,[per(14)],(d,p)=>{const r=M.dmi(d,p.n);return {lines:[mk('DX',r.pdi.map((x,i)=>x==null||r.mdi[i]==null?null:(x+r.mdi[i]===0?0:100*Math.abs(x-r.mdi[i])/(x+r.mdi[i]))))]}});
reg('aroonosc','Aroon Oscillator',TR,false,[per(25)],(d,p)=>{const o=M.fill(d.length);for(let i=p.n;i<d.length;i++){let hi=i,lo=i;for(let j=i-p.n;j<=i;j++){if(d[j].high>=d[hi].high)hi=j;if(d[j].low<=d[lo].low)lo=j}o[i]=100*((p.n-(i-hi))-(p.n-(i-lo)))/p.n}return {lines:[mk('Aroon Osc',o,{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}});
reg('chop','Choppiness Index',TR,false,[per(14)],(d,p)=>{const t=M.sum(M.tr(d),p.n),h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('CHOP',t.map((x,i)=>x==null||h[i]===l[i]?null:100*Math.log10(x/(h[i]-l[i]))/Math.log10(p.n)))],levels:[38.2,61.8]}});
reg('qstick','Qstick',TR,false,[per(8)],(d,p)=>({lines:[mk('Qstick',M.sma(d.map(b=>b.close-b.open),p.n),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}));
reg('lrs','Linear Regression Slope',TR,false,[per(25),srcP],(d,p)=>({lines:[mk('Slope',X.lin(SRC(d,p),p.n).sl)],levels:[0]}));
reg('lrr2','Linear Regression R-squared',TR,false,[per(25),srcP],(d,p)=>({lines:[mk('R2',X.lin(SRC(d,p),p.n).r2)],levels:[0.25,0.5,0.75]}));
reg('lra','Linear Regression Angle (degrees)',TR,false,[per(25),srcP],(d,p)=>({lines:[mk('Angle',X.lin(SRC(d,p),p.n).sl.map(x=>x==null?null:Math.atan(x)*180/Math.PI))],levels:[0],note:'Angle depends on the price scale of the instrument; compare only on the same symbol.'}));
reg('tsf','Time Series Forecast (1 bar ahead)',TR,true,[per(14),srcP],(d,p)=>{const r=X.lin(SRC(d,p),p.n);return {lines:[mk('TSF '+p.n,r.end.map((x,i)=>x==null?null:x+r.sl[i]))]}});
reg('fosc','Forecast Oscillator',TR,false,[per(14)],(d,p)=>{const r=X.lin(M.src(d,'close'),p.n);return {lines:[mk('FOSC %',d.map((b,i)=>r.end[i]==null||!b.close?null:100*(b.close-(r.end[i]+r.sl[i]))/b.close))],levels:[0]}});
reg('lrint','Linear Regression Intercept',TR,true,[per(25)],(d,p)=>({lines:[mk('Intercept',X.lin(M.src(d,'close'),p.n).ic)]}));
reg('coppock','Coppock Curve',TR,false,[P('a','ROC long',14),P('b','ROC short',11),P('w','WMA',10)],(d,p)=>{const c=M.src(d,'close'),a=X.roc(c,p.a),b=X.roc(c,p.b);return {lines:[mk('Coppock',M.wma(X.map2(a,b,(x,y)=>x+y),p.w),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}});
reg('kst','Know Sure Thing (KST)',TR,false,[P('sg','Signal',9)],(d,p)=>{const c=M.src(d,'close'),r=(n,s,w)=>M.mul(M.sma(X.roc(c,n),s),w),k=[r(10,10,1),r(15,10,2),r(20,10,3),r(30,15,4)].reduce((a,b)=>X.map2(a,b,(x,y)=>x+y));return {lines:[mk('KST',k),mk('Signal',M.sma(k,p.sg))],levels:[0]}});
reg('stc','Schaff Trend Cycle',TR,false,[P('f','Fast',23),P('s','Slow',50),P('c','Cycle',10)],(d,p)=>{const m=M.macd(M.src(d,'close'),p.f,p.s,9).m,sm=(x)=>{const hh=M.hh(x.map(v=>v==null?-1e12:v),p.c),ll=M.ll(x.map(v=>v==null?1e12:v),p.c),o=M.fill(x.length);let pf=null;for(let i=0;i<x.length;i++){if(x[i]==null||hh[i]==null||hh[i]<-1e11||ll[i]>1e11)continue;const f=hh[i]===ll[i]?(pf==null?0:pf):100*(x[i]-ll[i])/(hh[i]-ll[i]);pf=pf==null?f:pf+0.5*(f-pf);o[i]=pf}return o};return {lines:[mk('STC',sm(sm(m)))],levels:[25,75]}});
reg('ppo','Percentage Price Oscillator (PPO)',TR,false,[P('f','Fast',12),P('s','Slow',26),P('g','Signal',9)],(d,p)=>{const c=M.src(d,'close'),f=M.ema(c,p.f),s=M.ema(c,p.s),m=X.map2(f,s,(a,b)=>100*(a-b)/b),sg=M.ema(m,p.g);return {lines:[mk('Hist',M.sub(m,sg),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'}),mk('PPO',m),mk('Signal',sg)]}});
reg('apo','Absolute Price Oscillator (APO)',TR,false,[P('f','Fast',12),P('s','Slow',26)],(d,p)=>{const c=M.src(d,'close');return {lines:[mk('APO',M.sub(M.ema(c,p.f),M.ema(c,p.s)))],levels:[0]}});
reg('dpo2','Price Distance from MA (%)',TR,false,[per(50),P('t','MA type (sma/ema)','sma',{opts:['sma','ema']})],(d,p)=>{const c=M.src(d,'close'),m=p.t==='ema'?M.ema(c,p.n):M.sma(c,p.n);return {lines:[mk('Dist %',c.map((x,i)=>m[i]==null?null:100*(x/m[i]-1))) ],levels:[0]}});
reg('efr','Kaufman Efficiency Ratio',TR,false,[per(10)],(d,p)=>({lines:[mk('ER',X.ef(d,p.n))],levels:[0.3,0.6]}));
reg('vhf','Vertical Horizontal Filter',TR,false,[per(28)],(d,p)=>{const c=M.src(d,'close'),h=M.hh(c,p.n),l=M.ll(c,p.n),s=M.sum(c.map((x,i)=>i?Math.abs(x-c[i-1]):0),p.n);return {lines:[mk('VHF',h.map((x,i)=>x==null||!s[i]?null:(x-l[i])/s[i]))]}});
reg('rvgi','Relative Vigor Index',TR,false,[per(10)],(d,p)=>{const sw=a=>a.map((_,i)=>i>=3?(a[i]+2*a[i-1]+2*a[i-2]+a[i-3])/6:null),n=sw(d.map(b=>b.close-b.open)),dn=sw(d.map(b=>b.high-b.low)),a=M.sma(n,p.n),b=M.sma(dn,p.n),r=a.map((x,i)=>x==null||!b[i]?null:x/b[i]),sg=sw(r.map(x=>x==null?0:x)).map((x,i)=>r[i]==null||r[i-3]==null?null:x);return {lines:[mk('RVGI',r),mk('Signal',sg)],levels:[0]}});
// ---------- momentum / oscillators ----------
const MO='Momentum';
reg('crsi','Cutler\'s RSI (SMA based)',MO,false,[per(14)],(d,p)=>{const c=M.src(d,'close'),g=c.map((x,i)=>i?Math.max(0,x-c[i-1]):null),l=c.map((x,i)=>i?Math.max(0,c[i-1]-x):null),a=M.sma(g,p.n),b=M.sma(l,p.n);return {lines:[mk('Cutler RSI',a.map((x,i)=>x==null||b[i]==null?null:b[i]===0?100:100-100/(1+x/b[i])))],levels:[30,70]}});
reg('rmi','Relative Momentum Index',MO,false,[per(14),P('m','Momentum',5)],(d,p)=>{const c=M.src(d,'close'),g=c.map((x,i)=>i>=p.m?Math.max(0,x-c[i-p.m]):null),l=c.map((x,i)=>i>=p.m?Math.max(0,c[i-p.m]-x):null),a=M.rma(g,p.n),b=M.rma(l,p.n);return {lines:[mk('RMI',a.map((x,i)=>x==null||b[i]==null?null:b[i]===0?100:100-100/(1+x/b[i])))],levels:[30,70]}});
reg('connors','Connors RSI',MO,false,[P('r','RSI',3),P('s','Streak RSI',2),P('k','Rank period',100)],(d,p)=>{const c=M.src(d,'close');let st=0;const sk=c.map((x,i)=>{if(!i)return 0;st=x>c[i-1]?(st>0?st+1:1):x<c[i-1]?(st<0?st-1:-1):0;return st});
 const r1=M.rsi(c,p.r),r2=M.rsi(sk,p.s),roc=c.map((x,i)=>i?100*(x/c[i-1]-1):null),pr=roc.map((x,i)=>{if(i<p.k||x==null)return null;let n=0;for(let j=1;j<=p.k;j++)if(roc[i-j]!=null&&roc[i-j]<x)n++;return 100*n/p.k});
 return {lines:[mk('CRSI',c.map((_,i)=>r1[i]==null||r2[i]==null||pr[i]==null?null:(r1[i]+r2[i]+pr[i])/3))],levels:[10,90]}});
reg('lrsi','Laguerre RSI',MO,false,[P('g','Gamma',0.5)],(d,p)=>{const c=M.src(d,'close'),o=M.fill(c.length);let l0=0,l1=0,l2=0,l3=0;for(let i=0;i<c.length;i++){const p0=l0,p1=l1,p2=l2;l0=(1-p.g)*c[i]+p.g*p0;l1=-p.g*l0+p0+p.g*p1;l2=-p.g*l1+p1+p.g*p2;l3=-p.g*l2+p2+p.g*l3;let cu=0,cd=0;if(l0>=l1)cu=l0-l1;else cd=l1-l0;if(l1>=l2)cu+=l1-l2;else cd+=l2-l1;if(l2>=l3)cu+=l2-l3;else cd+=l3-l2;o[i]=i<4?null:(cu+cd?cu/(cu+cd):0)}return {lines:[mk('LRSI',o)],levels:[0.2,0.8]}});
reg('fish','Ehlers Fisher Transform',MO,false,[per(9)],(d,p)=>{const h=X.hl2(d),hh=M.hh(d.map(b=>b.high),p.n),ll=M.ll(d.map(b=>b.low),p.n),f=M.fill(d.length),t=M.fill(d.length);let v=0,pf=0;for(let i=p.n-1;i<d.length;i++){const r=hh[i]===ll[i]?0:(h[i]-ll[i])/(hh[i]-ll[i])-0.5;v=Math.max(-0.999,Math.min(0.999,0.66*r+0.67*v));const fi=0.5*Math.log((1+v)/(1-v))+0.5*pf;t[i]=pf;f[i]=fi;pf=fi}return {lines:[mk('Fisher',f),mk('Trigger',t)],levels:[0]}});
reg('ifrsi','Inverse Fisher RSI',MO,false,[per(5),P('w','WMA',9)],(d,p)=>{const r=M.rsi(M.src(d,'close'),p.n).map(x=>x==null?null:0.1*(x-50)),s=M.wma(r,p.w);return {lines:[mk('IFT RSI',s.map(x=>x==null?null:(Math.exp(2*x)-1)/(Math.exp(2*x)+1)))],levels:[-0.5,0.5]}});
reg('smi','Stochastic Momentum Index',MO,false,[per(10),P('k','Smooth 1',3),P('d','Smooth 2',3)],(d,p)=>{const hh=M.hh(d.map(b=>b.high),p.n),ll=M.ll(d.map(b=>b.low),p.n),rel=d.map((b,i)=>hh[i]==null?null:b.close-(hh[i]+ll[i])/2),rg=d.map((b,i)=>hh[i]==null?null:hh[i]-ll[i]),a=M.ema(M.ema(rel,p.k),p.d),b=M.ema(M.ema(rg,p.k),p.d),s=a.map((x,i)=>x==null||!b[i]?null:100*x/(b[i]/2));return {lines:[mk('SMI',s),mk('Signal',M.ema(s,p.d))],levels:[-40,40]}});
reg('bop','Balance of Power',MO,false,[per(14)],(d,p)=>({lines:[mk('BOP',M.sma(d.map(b=>b.high===b.low?0:(b.close-b.open)/(b.high-b.low)),p.n))],levels:[0]}));
reg('rvi2','Relative Volatility Index',MO,false,[per(14),P('s','StdDev period',10)],(d,p)=>{const c=M.src(d,'close'),sd=M.std(c,p.s),u=sd.map((x,i)=>x==null||!i?null:c[i]>c[i-1]?x:0),dn=sd.map((x,i)=>x==null||!i?null:c[i]<c[i-1]?x:0),a=M.rma(u,p.n),b=M.rma(dn,p.n);return {lines:[mk('RVI',a.map((x,i)=>x==null||b[i]==null?null:x+b[i]===0?50:100*x/(x+b[i])))],levels:[30,70]}});
reg('chgn','Absolute Momentum % (N-bar change)',MO,false,[per(20)],(d,p)=>({lines:[mk('Change %',X.roc(M.src(d,'close'),p.n),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}));
reg('pmom','Price Momentum Oscillator (DecisionPoint style)',MO,false,[P('a','Smooth 1',35),P('b','Smooth 2',20),P('s','Signal',10)],(d,p)=>{const c=M.src(d,'close'),r=c.map((x,i)=>i?100*(x/c[i-1]-1):null),f=(x,n)=>{const k=2/n,o=M.fill(x.length);let e=null;for(let i=0;i<x.length;i++){if(x[i]==null)continue;e=e==null?x[i]:(x[i]-e)*k+e;o[i]=e}return o},m=f(f(r,p.a).map(x=>x==null?null:x*10),p.b);return {lines:[mk('PMO',m),mk('Signal',f(m,p.s))],levels:[0]}});
reg('wad','Williams Accumulation/Distribution',MO,false,[],(d)=>{let s=0;return {lines:[mk('WAD',d.map((b,i)=>{if(!i)return 0;const h=Math.max(b.high,d[i-1].close),l=Math.min(b.low,d[i-1].close);if(b.close>d[i-1].close)s+=b.close-l;else if(b.close<d[i-1].close)s+=b.close-h;return s}))]}});
// ---------- volume ----------
const VO='Volume';
reg('chaosc','Chaikin Oscillator',VO,false,[P('f','Fast',3),P('s','Slow',10)],(d,p)=>{let s=0;const ad=d.map(b=>(s+=clv(b)*b.volume));return {lines:[mk('Chaikin Osc',M.sub(M.ema(ad,p.f),M.ema(ad,p.s)),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}});
reg('kvo','Klinger Volume Oscillator',VO,false,[P('f','Fast',34),P('s','Slow',55),P('g','Signal',13)],(d,p)=>{let tr=0,cm=0,dm0=0;const vf=d.map((b,i)=>{if(!i){dm0=b.high-b.low;return 0}const t=(b.high+b.low+b.close)>(d[i-1].high+d[i-1].low+d[i-1].close)?1:-1,dm=b.high-b.low;cm=t===tr?cm+dm:dm0+dm;tr=t;dm0=dm;return b.volume*Math.abs(cm?2*(dm/cm)-1:0)*t*100}),k=M.sub(M.ema(vf,p.f),M.ema(vf,p.s));return {lines:[mk('KVO',k),mk('Signal',M.ema(k,p.g))],levels:[0]}});
reg('vosc','Volume Oscillator',VO,false,[P('f','Fast',5),P('s','Slow',10)],(d,p)=>{const v=d.map(b=>b.volume),a=M.ema(v,p.f),b=M.ema(v,p.s);return {lines:[mk('VO %',a.map((x,i)=>x==null||!b[i]?null:100*(x-b[i])/b[i]),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}});
reg('pvt','Price Volume Trend',VO,false,[],(d)=>({lines:[mk('PVT',X.cum(d.map((b,i)=>i?b.volume*(b.close/d[i-1].close-1):0)))]}));
reg('nvi','Negative Volume Index',VO,false,[P('s','Signal EMA',255)],(d,p)=>{let v=1000;const o=d.map((b,i)=>{if(i&&b.volume<d[i-1].volume)v+=v*(b.close/d[i-1].close-1);return v});return {lines:[mk('NVI',o),mk('EMA',M.ema(o,p.s),{dash:true})]}});
reg('pvi','Positive Volume Index',VO,false,[P('s','Signal EMA',255)],(d,p)=>{let v=1000;const o=d.map((b,i)=>{if(i&&b.volume>d[i-1].volume)v+=v*(b.close/d[i-1].close-1);return v});return {lines:[mk('PVI',o),mk('EMA',M.ema(o,p.s),{dash:true})]}});
reg('vroc','Volume Rate of Change',VO,false,[per(14)],(d,p)=>({lines:[mk('VROC %',X.roc(d.map(b=>b.volume),p.n))],levels:[0]}));
reg('tmf','Twiggs Money Flow',VO,false,[per(21)],(d,p)=>{const adv=d.map((b,i)=>{if(!i)return null;const h=Math.max(b.high,d[i-1].close),l=Math.min(b.low,d[i-1].close);return h===l?0:b.volume*((b.close-l)-(h-b.close))/(h-l)}),a=M.rma(adv,p.n),v=M.rma(d.map(b=>b.volume),p.n);return {lines:[mk('TMF',a.map((x,i)=>x==null||!v[i]?null:x/v[i]))],levels:[0]}});
reg('iii','Intraday Intensity %',VO,false,[per(21)],(d,p)=>{const a=M.sum(d.map(b=>b.high===b.low||!b.volume?0:(2*b.close-b.high-b.low)/(b.high-b.low)*b.volume),p.n),v=M.sum(d.map(b=>b.volume),p.n);return {lines:[mk('II %',a.map((x,i)=>x==null||!v[i]?null:100*x/v[i]))],levels:[0]}});
reg('obvs','OBV with Signal EMA',VO,false,[per(20)],(d,p)=>{let s=0;const o=d.map((b,i)=>{if(i)s+=b.close>d[i-1].close?b.volume:b.close<d[i-1].close?-b.volume:0;return s});return {lines:[mk('OBV',o),mk('EMA',M.ema(o,p.n))]}});
reg('vwmom','Volume-Weighted Momentum',VO,false,[per(14)],(d,p)=>{const a=M.sum(d.map((b,i)=>i?(b.close-d[i-1].close)*b.volume:0),p.n),v=M.sum(d.map(b=>b.volume),p.n);return {lines:[mk('VW Mom',a.map((x,i)=>x==null||!v[i]?null:x/v[i]))],levels:[0]}});
reg('vma','Volume Moving Average',VO,false,[per(20)],(d,p)=>({lines:[mk('Volume',d.map(b=>b.volume),{t:'hist',colorFn:(i)=>d[i].close>=d[i].open?'#26a69a88':'#ef535088'}),mk('MA '+p.n,M.sma(d.map(b=>b.volume),p.n))]}));
reg('vpc','Volume Price Trend Ratio (close x volume MA)',VO,false,[per(20)],(d,p)=>({lines:[mk('Turnover MA',M.sma(d.map(b=>b.close*b.volume),p.n))],note:'Contract volume x price. Not dollar value (contract size not applied).'}));
// ---------- volatility ----------
const VL='Volatility';
reg('natr','Normalized ATR (%)',VL,false,[per(14)],(d,p)=>{const a=M.atr(d,p.n);return {lines:[mk('NATR %',a.map((x,i)=>x==null?null:100*x/d[i].close))]}});
reg('trng','True Range',VL,false,[],(d)=>({lines:[mk('TR',M.tr(d),{t:'hist',colorFn:()=>'#7d8793'})]}));
reg('hlr','High-Low Range',VL,false,[],(d)=>({lines:[mk('H-L',d.map(b=>b.high-b.low),{t:'hist',colorFn:()=>'#7d8793'})]}));
reg('ulcer','Ulcer Index',VL,false,[per(14)],(d,p)=>{const h=M.hh(d.map(b=>b.close),p.n),sq=d.map((b,i)=>h[i]?(100*(b.close-h[i])/h[i])**2:null).map(x=>isFinite(x)?x:null),s=M.sma(sq,p.n);return {lines:[mk('Ulcer',s.map(x=>x==null?null:Math.sqrt(Math.max(0,x))))]}});
const volEst=(name,f)=>(d,p)=>{const r=d.map(f),m=M.sma(r,p.n);return {lines:[mk(name+' %',m.map(x=>x==null?null:Math.sqrt(Math.max(0,x))*Math.sqrt(p.ann)*100))],note:'Annualised with the bars-per-year value you set.'}};
reg('park','Parkinson Volatility',VL,false,[per(20),P('ann','Bars per year',252)],volEst('Parkinson',b=>Math.log(b.high/b.low)**2/(4*Math.log(2))));
reg('gk','Garman-Klass Volatility',VL,false,[per(20),P('ann','Bars per year',252)],volEst('GK',b=>0.5*Math.log(b.high/b.low)**2-(2*Math.log(2)-1)*Math.log(b.close/b.open)**2));
reg('rsv','Rogers-Satchell Volatility',VL,false,[per(20),P('ann','Bars per year',252)],volEst('RS',b=>Math.log(b.high/b.close)*Math.log(b.high/b.open)+Math.log(b.low/b.close)*Math.log(b.low/b.open)));
reg('cvar','Close-to-Close Return Variance (%^2)',VL,false,[per(20)],(d,p)=>{const r=d.map((b,i)=>i?100*(b.close/d[i-1].close-1):null),sd=M.std(r.map(x=>x??0),p.n);return {lines:[mk('Var',sd.map((x,i)=>i<p.n?null:x*x))]}});
reg('atrp','ATR Percentile (rank over 100 bars)',VL,false,[per(14),P('k','Rank window',100)],(d,p)=>{const a=M.atr(d,p.n);return {lines:[mk('ATR rank %',a.map((x,i)=>{if(x==null||i<p.k)return null;let n=0,c=0;for(let j=1;j<=p.k;j++)if(a[i-j]!=null){c++;if(a[i-j]<x)n++}return c?100*n/c:null}))],levels:[20,80]}});
// ---------- statistics ----------
const ST='Statistics';
reg('zsc','Z-Score',ST,false,[per(20),srcP],(d,p)=>{const s=SRC(d,p),m=M.sma(s,p.n),sd=M.std(s,p.n);return {lines:[mk('Z',s.map((x,i)=>m[i]==null||!sd[i]?null:(x-m[i])/sd[i]))],levels:[-2,0,2]}});
reg('prk','Percent Rank',ST,false,[per(100),srcP],(d,p)=>{const s=SRC(d,p);return {lines:[mk('Rank %',s.map((x,i)=>{if(i<p.n)return null;let n=0;for(let j=1;j<=p.n;j++)if(s[i-j]<x)n++;return 100*n/p.n}))],levels:[20,50,80]}});
reg('skew','Skewness of Returns',ST,false,[per(30)],(d,p)=>{const r=d.map((b,i)=>i?Math.log(b.close/d[i-1].close):null),o=M.fill(d.length);for(let i=p.n;i<d.length;i++){let m=0;for(let j=0;j<p.n;j++)m+=r[i-j];m/=p.n;let a=0,b=0;for(let j=0;j<p.n;j++){const e=r[i-j]-m;a+=e*e;b+=e*e*e}a/=p.n;b/=p.n;o[i]=a?b/Math.pow(a,1.5):0}return {lines:[mk('Skew',o)],levels:[0]}});
reg('kurt','Excess Kurtosis of Returns',ST,false,[per(30)],(d,p)=>{const r=d.map((b,i)=>i?Math.log(b.close/d[i-1].close):null),o=M.fill(d.length);for(let i=p.n;i<d.length;i++){let m=0;for(let j=0;j<p.n;j++)m+=r[i-j];m/=p.n;let a=0,b=0;for(let j=0;j<p.n;j++){const e=r[i-j]-m;a+=e*e;b+=e*e*e*e}a/=p.n;b/=p.n;o[i]=a?b/(a*a)-3:0}return {lines:[mk('Kurtosis',o)],levels:[0]}});
reg('mad','Mean Absolute Deviation',ST,false,[per(20),srcP],(d,p)=>{const s=SRC(d,p),m=M.sma(s,p.n),o=M.fill(s.length);for(let i=p.n-1;i<s.length;i++){if(m[i]==null)continue;let t=0;for(let j=0;j<p.n;j++)t+=Math.abs(s[i-j]-m[i]);o[i]=t/p.n}return {lines:[mk('MAD',o)]}});
reg('acorr','Autocorrelation of Returns',ST,false,[per(30),P('lag','Lag',1)],(d,p)=>{const r=d.map((b,i)=>i?Math.log(b.close/d[i-1].close):null),o=M.fill(d.length);for(let i=p.n+p.lag;i<d.length;i++){let ma=0,mb=0;for(let j=0;j<p.n;j++){ma+=r[i-j];mb+=r[i-j-p.lag]}ma/=p.n;mb/=p.n;let c=0,va=0,vb=0;for(let j=0;j<p.n;j++){const x=r[i-j]-ma,y=r[i-j-p.lag]-mb;c+=x*y;va+=x*x;vb+=y*y}o[i]=va&&vb?c/Math.sqrt(va*vb):0}return {lines:[mk('AC',o)],levels:[0]}});
reg('retn','Return over N bars (%)',ST,false,[per(20)],(d,p)=>({lines:[mk('Return %',X.roc(M.src(d,'close'),p.n),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}));
reg('lret','Log Return per bar (%)',ST,false,[],(d)=>({lines:[mk('Log ret %',d.map((b,i)=>i?100*Math.log(b.close/d[i-1].close):null),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}));
reg('cumr','Cumulative Return since first bar (%)',ST,false,[],(d)=>({lines:[mk('Cum %',d.map(b=>100*(b.close/d[0].close-1)))],levels:[0]}));
reg('ddn','Drawdown from N-bar High (%)',ST,false,[per(250)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n);return {lines:[mk('DD %',h.map((x,i)=>x==null?null:100*(d[i].close/x-1)),{t:'hist',colorFn:()=>'#ef5350'})],levels:[0]}});
reg('rup','Rise from N-bar Low (%)',ST,false,[per(250)],(d,p)=>{const l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('Rise %',l.map((x,i)=>x==null?null:100*(d[i].close/x-1)),{t:'hist',colorFn:()=>'#26a69a'})],levels:[0]}});
reg('varn','Rolling Variance of Price',ST,false,[per(20),srcP],(d,p)=>{const sd=M.std(SRC(d,p),p.n);return {lines:[mk('Var',sd.map(x=>x==null?null:x*x))]}});
reg('medr','Rolling Median Absolute Return (%)',ST,false,[per(20)],(d,p)=>{const r=d.map((b,i)=>i?Math.abs(100*(b.close/d[i-1].close-1)):null);return {lines:[mk('MedAbs %',X.med(r.map(x=>x==null?0:x),p.n).map((x,i)=>i<p.n?null:x))]}});
reg('hlmid','Close Position within N-bar Range (-1..1)',ST,false,[per(50)],(d,p)=>{const h=M.hh(d.map(b=>b.high),p.n),l=M.ll(d.map(b=>b.low),p.n);return {lines:[mk('Pos',h.map((x,i)=>x==null||x===l[i]?null:2*(d[i].close-l[i])/(x-l[i])-1))],levels:[-0.5,0,0.5]}});
reg('slopev','Volume Linear Regression Slope',ST,false,[per(20)],(d,p)=>({lines:[mk('Vol slope',X.lin(d.map(b=>b.volume),p.n).sl,{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})]}));
// ---------- price action ----------
const PA='Price Action';
reg('bodyp','Candle Body % of Range',PA,false,[],(d)=>({lines:[mk('Body %',d.map(b=>b.high===b.low?0:100*Math.abs(b.close-b.open)/(b.high-b.low)),{t:'hist',colorFn:(i)=>d[i].close>=d[i].open?'#26a69a':'#ef5350'})]}));
reg('upwick','Upper Wick % of Range',PA,false,[],(d)=>({lines:[mk('Upper %',d.map(b=>b.high===b.low?0:100*(b.high-Math.max(b.open,b.close))/(b.high-b.low)),{t:'hist',colorFn:()=>'#ff9800'})]}));
reg('lowick','Lower Wick % of Range',PA,false,[],(d)=>({lines:[mk('Lower %',d.map(b=>b.high===b.low?0:100*(Math.min(b.open,b.close)-b.low)/(b.high-b.low)),{t:'hist',colorFn:()=>'#00bcd4'})]}));
reg('gapp','Gap % (open vs prior close)',PA,false,[],(d)=>({lines:[mk('Gap %',d.map((b,i)=>i?100*(b.open/d[i-1].close-1):null),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0],note:'On continuous futures data, contract rolls show up as gaps.'}));
reg('strk','Up/Down Streak (consecutive closes)',PA,false,[],(d)=>{let s=0;return {lines:[mk('Streak',d.map((b,i)=>{if(!i)return 0;s=b.close>d[i-1].close?(s>0?s+1:1):b.close<d[i-1].close?(s<0?s-1:-1):0;return s}),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}});
reg('nr','Narrow Range Bar (NR-n)',PA,false,[per(7)],(d,p)=>{const r=d.map(b=>b.high-b.low);return {lines:[mk('NR'+p.n,r.map((x,i)=>{if(i<p.n-1)return null;for(let j=1;j<p.n;j++)if(r[i-j]<=x)return 0;return 1}),{t:'hist',colorFn:()=>'#ffeb3b'})],note:'1 = this bar has the narrowest range of the last n bars.'}});
reg('wr7','Wide Range Bar (WR-n)',PA,false,[per(7)],(d,p)=>{const r=d.map(b=>b.high-b.low);return {lines:[mk('WR'+p.n,r.map((x,i)=>{if(i<p.n-1)return null;for(let j=1;j<p.n;j++)if(r[i-j]>=x)return 0;return 1}),{t:'hist',colorFn:()=>'#ab47bc'})]}});
reg('insb','Inside Bar',PA,false,[],(d)=>({lines:[mk('Inside',d.map((b,i)=>i&&b.high<=d[i-1].high&&b.low>=d[i-1].low?1:0),{t:'hist',colorFn:()=>'#2962ff'})]}));
reg('outb','Outside Bar',PA,false,[],(d)=>({lines:[mk('Outside',d.map((b,i)=>i&&b.high>d[i-1].high&&b.low<d[i-1].low?1:0),{t:'hist',colorFn:()=>'#e91e63'})]}));
reg('hhc','Higher Highs minus Lower Lows (N bars)',PA,false,[per(20)],(d,p)=>{const o=M.fill(d.length);for(let i=p.n;i<d.length;i++){let a=0;for(let j=i-p.n+1;j<=i;j++){if(d[j].high>d[j-1].high)a++;if(d[j].low<d[j-1].low)a--}o[i]=a}return {lines:[mk('HH-LL',o,{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}});
reg('uptp','Up Bars % (last N)',PA,false,[per(20)],(d,p)=>({lines:[mk('Up %',M.sma(d.map((b,i)=>i?(b.close>d[i-1].close?100:0):null),p.n))],levels:[50]}));
reg('clvp','Close Location Value',PA,false,[],(d)=>({lines:[mk('CLV',d.map(clv),{t:'hist',colorFn:(i,v)=>v>=0?'#26a69a':'#ef5350'})],levels:[0]}));
// ---------- pivot point systems (computed from the previous bar, so they match "daily pivots" on a daily chart) ----------
const PV='Pivot Points';
const pivSet=(d,f)=>{const names=[],ser=[];d.forEach((_,i)=>{if(!i){return}const r=f(d[i-1]);r.forEach(([n,v],k)=>{if(!ser[k]){ser[k]=M.fill(d.length);names[k]=n}ser[k][i]=v})});return {lines:ser.map((s,k)=>mk(names[k],s,{w:1}))}};
reg('pvfib','Fibonacci Pivots (prev bar)',PV,true,[],(d)=>pivSet(d,x=>{const p=(x.high+x.low+x.close)/3,r=x.high-x.low;return [['S3',p-r],['S2',p-0.618*r],['S1',p-0.382*r],['P',p],['R1',p+0.382*r],['R2',p+0.618*r],['R3',p+r]]}));
reg('pvcam','Camarilla Pivots (prev bar)',PV,true,[],(d)=>pivSet(d,x=>{const r=x.high-x.low,c=x.close;return [['S4',c-r*1.1/2],['S3',c-r*1.1/4],['S2',c-r*1.1/6],['S1',c-r*1.1/12],['R1',c+r*1.1/12],['R2',c+r*1.1/6],['R3',c+r*1.1/4],['R4',c+r*1.1/2]]}));
reg('pvwoo','Woodie Pivots (prev bar)',PV,true,[],(d)=>pivSet(d,x=>{const p=(x.high+x.low+2*x.close)/4;return [['S2',p-x.high+x.low],['S1',2*p-x.high],['P',p],['R1',2*p-x.low],['R2',p+x.high-x.low]]}));
reg('pvdem','DeMark Pivots (prev bar)',PV,true,[],(d)=>pivSet(d,x=>{const t=x.close<x.open?x.high+2*x.low+x.close:x.close>x.open?2*x.high+x.low+x.close:x.high+x.low+2*x.close;return [['S1',t/2-x.high],['P',t/4],['R1',t/2-x.low]]}));
reg('pvcls','Classic Pivots with R3/S3 (prev bar)',PV,true,[],(d)=>pivSet(d,x=>{const p=(x.high+x.low+x.close)/3,r=x.high-x.low;return [['S3',x.low-2*(x.high-p)],['S2',p-r],['S1',2*p-x.high],['P',p],['R1',2*p-x.low],['R2',p+r],['R3',x.high+2*(p-x.low)]]}));
reg('prevhl','Previous Bar High / Low / Close',PV,true,[],(d)=>({lines:[mk('Prev High',X.shift(d.map(b=>b.high),1)),mk('Prev Low',X.shift(d.map(b=>b.low),1)),mk('Prev Close',X.shift(d.map(b=>b.close),1),{dash:true})]}));
reg('openl','Bar Open Line',PV,true,[],(d)=>({lines:[mk('Open',d.map(b=>b.open),{dash:true})]}));
