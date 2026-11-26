// strategy rules: small expression language ("GCT-script"). Not Pine Script compatible.
const BT={
 tok(s){const t=[],re=/\s*(?:(\d+\.?\d*)|([A-Za-z_][A-Za-z_0-9]*)|(>=|<=|==|!=|[-+*\/(),<>]))/y;let m;re.lastIndex=0;s=s.trim();while(re.lastIndex<s.length){m=re.exec(s);if(!m)throw new Error('Unexpected text near: '+s.slice(re.lastIndex,re.lastIndex+10));t.push(m[1]!==undefined?{n:+m[1]}:m[2]!==undefined?{id:m[2]}:{op:m[3]})}return t},
 parse(s){const t=BT.tok(s);let p=0;const pk=()=>t[p],nx=()=>t[p++],isOp=o=>pk()&&pk().op===o,isId=o=>pk()&&pk().id===o;
  const prim=()=>{const x=nx();if(!x)throw new Error('Unexpected end');if(x.n!==undefined)return {n:x.n};if(x.op==='('){const e=or();if(!isOp(')'))throw new Error('Missing )');nx();return e}
   if(x.id){if(isOp('(')){nx();const a=[];if(!isOp(')')){a.push(or());while(isOp(',')){nx();a.push(or())}}if(!isOp(')'))throw new Error('Missing ) after '+x.id);nx();return {f:x.id,a}}return {v:x.id}}throw new Error('Unexpected '+(x.op||''))};
  const un=()=>{if(isOp('-')){nx();return {f:'neg',a:[un()]}}if(isId('not')){nx();return {f:'not',a:[un()]}}return prim()};
  const mul=()=>{let l=un();while(isOp('*')||isOp('/')){const o=nx().op;l={b:o,l,r:un()}}return l};
  const add=()=>{let l=mul();while(isOp('+')||isOp('-')){const o=nx().op;l={b:o,l,r:mul()}}return l};
  const cmp=()=>{let l=add();while(pk()&&pk().op&&['>','<','>=','<=','==','!='].includes(pk().op)){const o=nx().op;l={b:o,l,r:add()}}return l};
  const and=()=>{let l=cmp();while(isId('and')){nx();l={b:'and',l,r:cmp()}}return l};
  function or(){let l=and();while(isId('or')){nx();l={b:'or',l,r:and()}}return l}
  const e=or();if(p<t.length)throw new Error('Unexpected token');return e},
 ev(node,d,cache){
  const n=d.length,S=x=>typeof x==='number'?Array(n).fill(x):x,C=(x)=>typeof x==='number'?x:(x.find(v=>v!=null)??0);
  const key=JSON.stringify(node);if(cache.has(key))return cache.get(key);let out;
  if(node.n!==undefined)out=node.n;
  else if(node.v){const v=node.v;if(['open','high','low','close','volume'].includes(v))out=d.map(b=>b[v]);else if(['hl2','hlc3','ohlc4'].includes(v))out=M.src(d,v);else throw new Error('Unknown name: '+v)}
  else if(node.b){const l=S(BT.ev(node.l,d,cache)),r=S(BT.ev(node.r,d,cache)),f={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>b?a/b:null,'>':(a,b)=>a>b,'<':(a,b)=>a<b,'>=':(a,b)=>a>=b,'<=':(a,b)=>a<=b,'==':(a,b)=>a===b,'!=':(a,b)=>a!==b,and:(a,b)=>!!a&&!!b,or:(a,b)=>!!a||!!b}[node.b];out=l.map((a,i)=>a==null||r[i]==null?(['and','or'].includes(node.b)?false:null):f(a,r[i]))}
  else{const a=node.a.map(x=>BT.ev(x,d,cache)),f=node.f,s0=()=>S(a[0]),k=i=>Math.max(1,Math.round(C(a[i])));
   const F={sma:()=>M.sma(s0(),k(1)),ema:()=>M.ema(s0(),k(1)),wma:()=>M.wma(s0(),k(1)),rsi:()=>M.rsi(s0(),k(1)),stdev:()=>M.std(s0(),k(1)),highest:()=>M.hh(s0(),k(1)),lowest:()=>M.ll(s0(),k(1)),
    atr:()=>M.atr(d,k(0)),adx:()=>M.dmi(d,k(0)).adx,pdi:()=>M.dmi(d,k(0)).pdi,mdi:()=>M.dmi(d,k(0)).mdi,roc:()=>d.map((b,i)=>i<k(0)?null:100*(b.close/d[i-k(0)].close-1)),
    macd:()=>M.macd(d.map(b=>b.close),k(0),k(1),9).m,macdsig:()=>M.macd(d.map(b=>b.close),k(0),k(1),k(2)).s,macdhist:()=>M.macd(d.map(b=>b.close),k(0),k(1),k(2)).h,
    stochk:()=>M.stoch(d,k(0),3,3).k,stochd:()=>M.stoch(d,k(0),3,3).d,bbup:()=>{const c=d.map(b=>b.close),m=M.sma(c,k(0)),s=M.std(c,k(0));return m.map((x,i)=>x==null?null:x+C(a[1])*s[i])},bblo:()=>{const c=d.map(b=>b.close),m=M.sma(c,k(0)),s=M.std(c,k(0));return m.map((x,i)=>x==null?null:x-C(a[1])*s[i])},
    ref:()=>{const x=s0(),m=k(1);return x.map((_,i)=>i>=m?x[i-m]:null)},abs:()=>s0().map(x=>x==null?null:Math.abs(x)),neg:()=>s0().map(x=>x==null?null:-x),not:()=>s0().map(x=>!x),
    crossover:()=>{const x=S(a[0]),y=S(a[1]);return x.map((v,i)=>i>0&&v!=null&&y[i]!=null&&x[i-1]!=null&&y[i-1]!=null&&v>y[i]&&x[i-1]<=y[i-1])},
    crossunder:()=>{const x=S(a[0]),y=S(a[1]);return x.map((v,i)=>i>0&&v!=null&&y[i]!=null&&x[i-1]!=null&&y[i-1]!=null&&v<y[i]&&x[i-1]>=y[i-1])},
    max:()=>{const x=S(a[0]),y=S(a[1]);return x.map((v,i)=>Math.max(v,y[i]))},min:()=>{const x=S(a[0]),y=S(a[1]);return x.map((v,i)=>Math.min(v,y[i]))}};
   if(!F[f])throw new Error('Unknown function: '+f);out=F[f]()}
  cache.set(key,out);return out},
 sig(src,d,cache){if(!src||!src.trim())return null;const r=BT.ev(BT.parse(src),d,cache);return typeof r==='number'?Array(d.length).fill(!!r):r.map(x=>!!x)},
 run(d,c){
  const cache=new Map(),eL=BT.sig(c.entry,d,cache),xL=BT.sig(c.exit,d,cache),eS=BT.sig(c.entryS,d,cache),xS=BT.sig(c.exitS,d,cache);
  if(!eL&&!eS)throw new Error('Add an entry rule');
  const slip=(c.slip||0)/100,comm=c.comm||0;const entPx=(px,dir)=>px*(1+dir*slip),sizeCost=eq0=>c.risk>0&&c.sl>0?Math.min(eq0,eq0*c.risk/c.sl):eq0*c.size/100;let cash=c.capital,pos=null;const trades=[],eq=[],fee=c.fee/100;
  const close=(i,px0,why)=>{const px=px0*(1-pos.dir*slip);const g=pos.dir*(px-pos.px)*pos.qty,f=(pos.px+px)*pos.qty*fee+2*comm,net=g-f;cash+=net+pos.cost;trades.push({dir:pos.dir>0?'Long':'Short',t0:pos.t,t1:d[i].time,p0:pos.px,p1:px,qty:pos.qty,pnl:net,pct:net/pos.cost*100,why});pos=null};
  for(let i=0;i<d.length;i++){
   // intrabar SL/TP on open position (entered earlier)
   if(pos&&pos.i<i){const trl=c.trail>0?pos.ext*(1-pos.dir*c.trail/100):null;let sl0=c.sl>0?pos.px*(1-pos.dir*c.sl/100):null;if(trl!=null)sl0=sl0==null?trl:(pos.dir>0?Math.max(sl0,trl):Math.min(sl0,trl));const sl=sl0,tp=c.tp>0?pos.px*(1+pos.dir*c.tp/100):null;
    if(sl!=null&&(pos.dir>0?d[i].low<=sl:d[i].high>=sl))close(i,pos.dir>0?Math.min(sl,d[i].open):Math.max(sl,d[i].open),trl!=null&&sl===trl?'Trailing stop':'Stop loss');
    else if(tp!=null&&(pos.dir>0?d[i].high>=tp:d[i].low<=tp))close(i,pos.dir>0?Math.max(tp,d[i].open):Math.min(tp,d[i].open),'Take profit');
    if(pos)pos.ext=pos.dir>0?Math.max(pos.ext,d[i].high):Math.min(pos.ext,d[i].low)}
   // execute prior-bar signals at this bar's open
   if(i>0){const j=i-1,px=d[i].open;
    if(pos&&pos.dir>0&&xL&&xL[j])close(i,px,'Exit rule');
    else if(pos&&pos.dir<0&&xS&&xS[j])close(i,px,'Exit rule');
    if(!pos){const wantL=eL&&eL[j]&&c.mode!=='short',wantS=eS&&eS[j]&&c.mode!=='long';
     if(wantL||wantS){const dir=wantL?1:-1,eqNow=cash,cost=sizeCost(eqNow),px1=entPx(px,dir),qty=cost/px1;if(cost>0){cash-=cost;pos={dir,px:px1,qty,cost,t:d[i].time,i,ext:px1}}}}
    else if(pos.dir>0&&eS&&eS[j]&&c.mode==='both'){close(i,px,'Reverse');const cost=sizeCost(cash),p1=entPx(px,-1);pos={dir:-1,px:p1,qty:cost/p1,cost,t:d[i].time,i,ext:p1};cash-=cost}
    else if(pos.dir<0&&eL&&eL[j]&&c.mode==='both'){close(i,px,'Reverse');const cost=sizeCost(cash),p1=entPx(px,1);pos={dir:1,px:p1,qty:cost/p1,cost,t:d[i].time,i,ext:p1};cash-=cost}}
   eq.push({time:d[i].time,v:cash+(pos?pos.cost+pos.dir*(d[i].close-pos.px)*pos.qty:0)})}
  if(pos)close(d.length-1,d[d.length-1].close,'Open at end');
  const wins=trades.filter(t=>t.pnl>0),loss=trades.filter(t=>t.pnl<=0),gw=wins.reduce((s,t)=>s+t.pnl,0),gl=-loss.reduce((s,t)=>s+t.pnl,0);
  let pk=eq[0]?eq[0].v:0,dd=0;eq.forEach(e=>{pk=Math.max(pk,e.v);dd=Math.max(dd,(pk-e.v)/pk*100)});
  const aw=wins.length?gw/wins.length:0,al=loss.length?gl/loss.length:0,final=eq.length?eq[eq.length-1].v:c.capital;
  const ex=BT.extra(trades,eq,d,c);return {trades,eq,ex,stats:{net:final-c.capital,ret:(final/c.capital-1)*100,n:trades.length,win:trades.length?100*wins.length/trades.length:0,pf:gl?gw/gl:(gw?Infinity:0),dd,rr:al?aw/al:null,aw,al,bh:(d[d.length-1].close/d[0].close-1)*100,final}}},
 extra(trades,eq,d,c){const n=eq.length,yrs=n>1?(eq[n-1].time-eq[0].time)/31557600:0,bpy=yrs>0?n/yrs:252;const r=[];for(let i=1;i<n;i++)r.push(eq[i].v/eq[i-1].v-1);const m=r.length?r.reduce((a,x)=>a+x,0)/r.length:0,sd=Math.sqrt(r.reduce((a,x)=>a+(x-m)**2,0)/(r.length||1)),dsd=Math.sqrt(r.reduce((a,x)=>a+(x<0?x*x:0),0)/(r.length||1));
  const by=(f)=>{const o={};let prev=c.capital,pk=null;eq.forEach(e=>{const k=f(new Date(e.time*1000));o[k]=e.v});const out=[];Object.keys(o).sort().forEach(k=>{out.push([k,(o[k]/prev-1)*100]);prev=o[k]});return out};
  const side=dir=>{const t=trades.filter(x=>x.dir===dir),w=t.filter(x=>x.pnl>0);return {n:t.length,net:t.reduce((a,x)=>a+x.pnl,0),win:t.length?100*w.length/t.length:0}};
  const pn=trades.map(t=>t.pnl);return {sharpe:sd?m/sd*Math.sqrt(bpy):null,sortino:dsd?m/dsd*Math.sqrt(bpy):null,gp:trades.filter(t=>t.pnl>0).reduce((a,t)=>a+t.pnl,0),gl:-trades.filter(t=>t.pnl<=0).reduce((a,t)=>a+t.pnl,0),avg:pn.length?pn.reduce((a,x)=>a+x,0)/pn.length:0,best:pn.length?Math.max(...pn):0,worst:pn.length?Math.min(...pn):0,monthly:by(d=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')),yearly:by(d=>String(d.getUTCFullYear())),long:side('Long'),short:side('Short'),bpy}},
 // out-of-sample: first part in-sample, rest out-of-sample, same fixed rules (no fitting is done by this tool). walk-forward: k independent consecutive folds.
 split(d,c,pct){const k=Math.max(50,Math.floor(d.length*pct/100));const a=BT.run(d.slice(0,k),c),b=BT.run(d.slice(k),c);return {is:a.stats,oos:b.stats,isBars:k,oosBars:d.length-k}},
 walk(d,c,folds){const L=Math.floor(d.length/folds),out=[];for(let i=0;i<folds;i++){const s=d.slice(i*L,i===folds-1?d.length:(i+1)*L);if(s.length<60)continue;try{const r=BT.run(s,c);out.push({from:s[0].time,to:s[s.length-1].time,ret:r.stats.ret,n:r.stats.n,dd:r.stats.dd,bh:r.stats.bh})}catch(e){}}return out}
};
const BT_TEMPLATES={
 'SMA 20/50 cross':{entry:'crossover(sma(close,20), sma(close,50))',exit:'crossunder(sma(close,20), sma(close,50))'},
 'EMA 12/26 cross':{entry:'crossover(ema(close,12), ema(close,26))',exit:'crossunder(ema(close,12), ema(close,26))'},
 'RSI 30/70 mean reversion':{entry:'crossover(rsi(close,14), 30)',exit:'crossover(rsi(close,14), 70)'},
 'MACD signal cross':{entry:'crossover(macd(12,26), macdsig(12,26,9))',exit:'crossunder(macd(12,26), macdsig(12,26,9))'},
 'Donchian 20 breakout':{entry:'close > ref(highest(high,20),1)',exit:'close < ref(lowest(low,10),1)'},
 'Bollinger mean reversion':{entry:'close < bblo(20,2)',exit:'close > sma(close,20)'},
 'Trend + pullback (EMA200 & RSI)':{entry:'close > ema(close,200) and crossover(rsi(close,14), 40)',exit:'close < ema(close,50)'},
};
