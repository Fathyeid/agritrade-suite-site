// Terminal workspace: an additional Bloomberg-style multi-panel view built on the dashboard grid. The normal layout is untouched.
// Real free delayed data only (Yahoo). Order ticket and chat panels are NOT included: the paper panel is a simulation and the calculator only computes.
(function(){
const TN='Terminal workspace (Bloomberg-style)';
const f2=(v,d=2)=>v==null||!isFinite(v)?'n/a':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const pc=v=>v==null||!isFinite(v)?'n/a':(v>=0?'+':'')+v.toFixed(2)+'%';
const cl=v=>v==null||!isFinite(v)?'':v>=0?'tup':'tdn';
const sma=(a,n)=>a.length<n?null:a.slice(-n).reduce((x,y)=>x+y,0)/n;
function rsi(c,n=14){if(c.length<n+1)return null;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];d>=0?g+=d:l-=d}g/=n;l/=n;for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n}return l===0?100:100-100/(1+g/l)}
function atr(b,n=14){if(b.length<n+1)return null;let t=[];for(let i=1;i<b.length;i++)t.push(Math.max(b[i].high-b[i].low,Math.abs(b[i].high-b[i-1].close),Math.abs(b[i].low-b[i-1].close)));let a=t.slice(0,n).reduce((x,y)=>x+y,0)/n;for(let i=n;i<t.length;i++)a=(a*(n-1)+t[i])/n;return a}
const tile=(k,v,c,sub)=>el('div',{class:'ttile'},el('div',{class:'tk'},k),el('div',{class:'tv '+(c||'')},v),sub?el('div',{class:'ts'},sub):'');
async function fillStats(w){const my=w._s=(w._s||0)+1,sym=DASH.sym;let r;
 try{r=await Data.get(sym,'1D')}catch(e){if(my===w._s){w.body.innerHTML='';w.body.append(el('div',{class:'mut',style:'padding:8px'},'Unavailable: '+e.message))}return}
 if(my!==w._s)return;const b=r.bars,n=b.length,L=b[n-1],P=b[n-2]||L,px=r.meta.price??L.close,ch=px-P.close,cp=ch/P.close*100,c=b.map(x=>x.close);
 const y=b.slice(-252),hi=Math.max(...y.map(x=>x.high)),lo=Math.min(...y.map(x=>x.low)),v20=sma(b.slice(0,-1).map(x=>x.volume),20),a=atr(b),s200=sma(c,200),R=k=>n>k?(px/c[n-1-k]-1)*100:null;
 const yr=new Date(L.time*1000).getUTCFullYear(),yb=b.filter(x=>new Date(x.time*1000).getUTCFullYear()<yr),ytd=yb.length?(px/yb[yb.length-1].close-1)*100:null;
 w.body.innerHTML='';const g=el('div',{class:'tgrid'});
 g.append(el('div',{class:'tsym'},el('b',{},sym.replace('=F','')),el('span',{class:'mut'},' '+symName(sym))),
  tile('Last',f2(px),cl(ch),'delayed, '+(r.meta.source||'Yahoo')),tile('Change',(ch>=0?'+':'')+f2(ch),cl(ch),pc(cp)),
  tile('Open / Prev',f2(L.open)+' / '+f2(P.close)),tile('Day high / low',f2(L.high)+' / '+f2(L.low)),
  tile('52w high',f2(hi),'',pc((px/hi-1)*100)+' from high'),tile('52w low',f2(lo),'',pc((px/lo-1)*100)+' from low'),
  tile('Volume',L.volume?Math.round(L.volume).toLocaleString('en-US'):'n/a'),tile('Rel. volume (vs 20d)',v20&&L.volume?f2(L.volume/v20)+'x':'n/a'),
  tile('ATR(14)',f2(a),'',a?f2(a/px*100)+'% of price':''),tile('RSI(14)',f2(rsi(c),1)),
  tile('vs SMA200',s200?pc((px/s200-1)*100):'n/a',cl(s200?px-s200:null)),tile('1M / 3M',pc(R(21))+' / '+pc(R(63))),tile('YTD',pc(ytd),cl(ytd)),
  tile('Open interest','n/a','','not free'));w.body.append(g,el('div',{class:'mut',style:'font-size:9.5px;padding:3px 6px'},'Yahoo daily bars, delayed. Open interest, settlement and bid/ask are not available from a free source.'))}
async function fillHist(w){const my=w._s=(w._s||0)+1,sym=DASH.sym;let r;try{r=await Data.get(sym,'1D')}catch(e){w.body.innerHTML='';w.body.append(el('div',{class:'mut',style:'padding:8px'},'Unavailable: '+e.message));return}
 if(my!==w._s)return;const c=r.bars.slice(-501).map(x=>x.close),rt=[];for(let i=1;i<c.length;i++)rt.push((c[i]/c[i-1]-1)*100);
 const m=rt.reduce((x,y)=>x+y,0)/rt.length,sd=Math.sqrt(rt.reduce((x,y)=>x+(y-m)**2,0)/rt.length),K=21,lim=Math.max(3*sd,.5),bins=Array(K).fill(0);
 rt.forEach(x=>{const i=Math.max(0,Math.min(K-1,Math.floor((x+lim)/(2*lim)*K)));bins[i]++});const mx=Math.max(...bins);
 w.body.innerHTML='';const box=el('div',{class:'thist'});bins.forEach((v,i)=>{const lo=-lim+i*2*lim/K;box.append(el('div',{class:'tbar'+(lo+lim/K>=0?' up':' dn'),style:`height:${v/mx*100}%`,title:f2(lo,1)+'% to '+f2(lo+2*lim/K,1)+'%: '+v+' days'}))});
 w.body.append(el('div',{class:'mut',style:'padding:3px 6px;font-size:10.5px'},sym.replace('=F','')+' daily returns, last '+rt.length+' days'),box,el('div',{class:'mut',style:'padding:3px 6px;font-size:10.5px'},'Mean '+f2(m,3)+'%  Std dev '+f2(sd,2)+'%  Worst '+f2(Math.min(...rt),1)+'%  Best '+f2(Math.max(...rt),1)+'%'))}
const SPEC={'ZS':'ZS=F','ZC':'ZC=F','ZW':'ZW=F','ZM':'ZM=F','ZL':'ZL=F','KC':'KC=F','CL':'CL=F','GC':'GC=F'};
function fillCalc(w){if(w._built)return;w._built=1;const o=w.opt;o.a=o.a||'ZS=F';o.b=o.b||'ZM=F';o.qa=o.qa||1;o.qb=o.qb||-1;
 const mk=(k,ph)=>el('input',{value:o[k],style:'width:70px',placeholder:ph,onchange:e=>{o[k]=k[0]==='q'?+e.target.value:e.target.value.trim().toUpperCase();DASH.save();run()}});
 const out=el('div',{style:'padding:4px 6px;font-size:12px'}),run=async()=>{out.textContent='Loading...';try{const [A,B]=await Promise.all([Data.get(o.a,'1D'),Data.get(o.b,'1D')]);
   const pa=A.meta.price??A.bars.at(-1).close,pb=B.meta.price??B.bars.at(-1).close,ma=MULT[o.a],mb=MULT[o.b];out.innerHTML='';
   out.append(el('div',{},'A '+o.a+' last '+f2(pa)+'   B '+o.b+' last '+f2(pb)),el('div',{},'A - B = '+f2(pa-pb)+'   A / B = '+f2(pa/pb,4)));
   out.append(el('div',{},ma&&mb?'Position value of A x qty + B x qty (USD, contract multiplier from our spec table): $'+f2(o.qa*pa*ma+o.qb*pb*mb,0):'Multiplier unknown for one leg: dollar value not computed.'));
   out.append(el('div',{class:'mut',style:'font-size:10px;margin-top:3px'},'Calculator only. Delayed Yahoo prices. Quantity: + long, - short. Margin is not available free.'))}catch(e){out.textContent='Unavailable: '+e.message}};
 w.body.innerHTML='';w.body.append(el('div',{class:'row2',style:'padding:4px 6px;display:flex;gap:4px;flex-wrap:wrap'},mk('a','Leg A'),mk('qa','qty'),mk('b','Leg B'),mk('qb','qty')),out);run()}
async function fillPaper(w){const A=PAPER.get(),ps=Object.entries(A.pos);w.body.innerHTML='';
 const rows=await Promise.all(ps.map(async([s,p])=>{let px=null;try{px=(await PAPER.price(s)).px}catch(e){}return [s,p,px]}));
 const u=rows.reduce((a,[s,p,px])=>a+(px!=null?(px-p.avg)*p.q*p.mult:0),0);
 w.body.append(el('div',{class:'tpaper'},el('div',{class:'ts'},'SIMULATED account, no broker'),el('div',{},'Cash $'+f2(A.cash,0)+'   Equity $'+f2(A.cash+u,0)),el('div',{class:cl(u)},'Open P&L $'+f2(u,0))));
 const t=el('table',{class:'ctbl',style:'width:100%'},el('tr',{},...['Symbol','Qty','Avg','Last','P&L'].map(h=>el('th',{},h))));
 rows.forEach(([s,p,px])=>t.append(el('tr',{},el('td',{},s),el('td',{},p.q),el('td',{},f2(p.avg)),el('td',{},px==null?'n/a':f2(px)),el('td',{class:cl(px==null?null:(px-p.avg)*p.q)},px==null?'n/a':f2((px-p.avg)*p.q*p.mult,0)))));
 w.body.append(rows.length?t:el('div',{class:'mut',style:'padding:6px'},'No open paper positions. Place paper trades in the Paper tab.'))}
const T={stats:['Key stats',fillStats],hist:['Return distribution',fillHist],calc:['Spread calculator',fillCalc],paper:['Paper account (simulation)',fillPaper]};
const ff=DASH.fillW;DASH.fillW=w=>{if(T[w.type])return T[w.type][1](w);return ff(w)};
const b1=DASH.build1;DASH.build1=w=>{const r=b1(w);if(T[w.type]){const t=w.el&&w.el.querySelector('.dwt');if(t)t.textContent=T[w.type][0]}return r};
const ss=DASH.setSym;DASH.setSym=(s,fr)=>{ss(s,fr);DASH.w.forEach(w=>{if(w!==fr&&(w.type==='stats'||w.type==='hist'))T[w.type][1](w)})};
DPRESETS[TN]=()=>[
 {type:'stats',x:0,y:0,w:3,h:6,opt:{}},{type:'scr',x:0,y:6,w:3,h:6,opt:{scr:'commod',sort:['c1',-1]}},
 {...DCH('ZS=F','1D'),x:3,y:0,w:5,h:6},{type:'chart',opt:{sym:'SYN:crush',tf:'1D',link:false},x:8,y:0,w:4,h:6},
 {type:'contracts',x:3,y:6,w:3,h:6,opt:{root:'ZS'}},{type:'news',x:6,y:6,w:3,h:3,opt:{}},{type:'paper',x:6,y:9,w:3,h:3,opt:{}},
 {type:'hist',x:9,y:6,w:3,h:3,opt:{}},{type:'calc',x:9,y:9,w:3,h:3,opt:{}}];
const hh=DASH.hide;DASH.hide=()=>{document.body.classList.remove('term');hh();if(DASH.tbtn)DASH.tbtn.classList.remove('on')};
setInterval(()=>{if(document.hidden||!DASH.open)return;DASH.w.forEach(w=>{if(T[w.type]&&w.type!=='calc')T[w.type][1](w)})},60000);
const bt=App.prototype.buildTop;App.prototype.buildTop=function(){bt.call(this);const b=el('button',{title:'Terminal workspace: dense multi-panel view (the normal layout stays as it is)',onclick:()=>{if(DASH.open&&DASH.w.some(x=>x.type==='stats')){DASH.hide();b.classList.remove('on');return}if(!DASH.open)DASH.show();document.body.classList.add('term');DASH.sym='ZS=F';DASH.preset(TN);DASH.save();b.classList.add('on')}},'Terminal');if(DASH.btn)DASH.btn.before(b);DASH.tbtn=b};
})();
