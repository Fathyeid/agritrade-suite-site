// M11: data-quality panel (source, freshness label, gap/outlier/OHLC checks per symbol) and an in-browser self-test of the maths against known values.
const DQ={
 label(meta,last){const age=(Date.now()/1000-last)/60;return age<30?'DELAYED (about 15 min, Yahoo, unofficial): last bar under 30 min old':age<60*30?'DELAYED / market closed: last bar '+(age/60).toFixed(1)+' h old':'STALE: last bar '+(age/1440).toFixed(1)+' days old'},
 check(d){const iss=[];let gaps=0,big=0,bad=0,zero=0,dup=0,maxGap=0;for(let i=0;i<d.length;i++){const b=d[i];if(!(b.high>=Math.max(b.open,b.close)-1e-9&&b.low<=Math.min(b.open,b.close)+1e-9&&b.high>=b.low))bad++;if(!b.volume)zero++;if(i){const p=d[i-1];if(b.time===p.time)dup++;if(Math.abs(b.close/p.close-1)>0.1)big++;const dd=(b.time-p.time)/86400;if(dd>4){gaps++;maxGap=Math.max(maxGap,dd)}}}
  return {n:d.length,bad,zero,dup,big,gaps,maxGap}},
 tests(){const T=[],ok=(n,c,info)=>T.push({n,c:!!c,info}),near=(a,b,e=1e-6)=>Math.abs(a-b)<=e,r=[1,2,3,4,5,6,7,8,9,10];
  ok('SMA(3) of 1..10 last = 9',near(M.sma(r,3)[9],9));
  ok('SMA first n-1 values are null',M.sma(r,3)[1]==null&&M.sma(r,3)[2]===2);
  const e=M.ema(r,3);let ex=2;for(let i=3;i<10;i++)ex=0.5*r[i]+0.5*ex;ok('EMA(3) of 1..10 matches hand calc (alpha 0.5, SMA seed) = '+ex.toFixed(4),near(e[9],ex,1e-6),e[9]);
  ok('RSI(14) of strictly rising series = 100',near(M.rsi([...Array(30).keys()].map(x=>x+1),14)[29],100,1e-6));
  ok('RSI(14) of strictly falling series = 0',near(M.rsi([...Array(30).keys()].map(x=>30-x),14)[29],0,1e-6));
  ok('Std of 1..10 (n=10) is population or sample (2.872 / 3.028)',near(M.std(r,10)[9],2.8723,0.01)||near(M.std(r,10)[9],3.0277,0.01),M.std(r,10)[9]);
  const bars=[...Array(40)].map((_,i)=>({time:i*86400,open:100+i,high:101+i,low:99+i,close:100+i,volume:10}));
  ok('ATR(14) of constant-range rising bars = 2',near(M.atr(bars,14)[39],2,0.05),M.atr(bars,14)[39]);
  ok('GCT-script parse: precedence 2+3*4 = 14',(()=>{const v=BT.ev(BT.parse('2+3*4'),bars,new Map());return (typeof v==='number'?v:v[5])===14})());
  ok('GCT-script crossover detects a known cross',(()=>{const b=[1,2,3,2,1,2,3,4].map((c,i)=>({time:i,open:c,high:c,low:c,close:c,volume:1}));const v=BT.ev(BT.parse('crossover(close, 2.5)'),b,new Map());return v[2]===true&&v[1]===false&&v[6]===true})());
  ok('GCT-script rejects unknown function',(()=>{try{BT.ev(BT.parse('foo(close)'),bars,new Map());return false}catch(x){return true}})());
  ok('Black-Scholes call S=100 K=100 T=1 r=5% vol=20% = 10.4506',near(OPT.price(100,100,1,0.05,0,0.2,'c'),10.4506,0.001),OPT.price(100,100,1,0.05,0,0.2,'c'));
  ok('Put-call parity C-P = S - K*exp(-rT)',near(OPT.price(100,95,0.5,0.03,0,0.25,'c')-OPT.price(100,95,0.5,0.03,0,0.25,'p'),100-95*Math.exp(-0.015),1e-4));
  ok('Implied vol round-trip recovers 27%',near(OPT.iv(100,105,0.75,0.02,0,'p',OPT.price(100,105,0.75,0.02,0,0.27,'p')),0.27,1e-4));
  ok('Normal CDF N(1.96) = 0.975',near(OPT.N(1.96),0.975,0.0005));
  const x=[1,2,3,4,5,6],y=x.map(v=>2*v+1);const o=QNT.ols(x,y);ok('OLS recovers y=2x+1',near(o.b,2,1e-9)&&near(o.a,1,1e-9));
  const rw=[];let s=0;const rnd=(()=>{let a=12345;return()=>{a=(a*1664525+1013904223)%4294967296;return a/4294967296-0.5}})();for(let i=0;i<400;i++){s+=rnd();rw.push(s)}const ou=[];let u=0;for(let i=0;i<400;i++){u=0.7*u+rnd();ou.push(u)}
  ok('ADF: mean-reverting series is more negative than a random walk',QNT.adf(ou).t<QNT.adf(rw).t-2,`OU t=${QNT.adf(ou).t.toFixed(1)}, RW t=${QNT.adf(rw).t.toFixed(1)}`);
  ok('Half-life of AR(0.7) series near 1.9 bars',(()=>{const h=QNT.halfLife(ou);return h>1.2&&h<3})(),QNT.halfLife(ou));
  ok('Backtest: buy-and-hold style rule on rising bars makes money',(()=>{const rs=BT.run(bars.map(b=>({...b})),{entry:'close > 0',exit:'',entryS:'',exitS:'',capital:1000,size:100,fee:0,slip:0,comm:0,risk:0,sl:0,tp:0,trail:0,mode:'long'});return rs.stats.net>0})());
  ok('Contract multiplier table has ZS=F = 50',MULT['ZS=F']===50||MULT['ZS=F']==50,MULT['ZS=F']);
  return T}
};
App.prototype.tQuality=function(){const c=this.tabc,out=el('div'),s=Store.get('dqsyms','ZS=F, ZC=F, ZW=F, GC=F, CL=F'),inp=el('input',{value:s,style:'width:95%'});
 const run=async()=>{Store.set('dqsyms',inp.value);out.innerHTML='<p class="mut">Checking...</p>';const L=inp.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,15);const R=await Promise.all(L.map(async s=>{try{const r=await Data.get(s,'1D');return {s,r}}catch(e){return {s,err:e.message}}}));out.innerHTML='';
  const t=el('table',{},el('tr',{},...['Symbol','Source','Status label','Last bar (UTC)','Bars','OHLC errors','Zero volume','Gaps >4d','Moves >10%','Dups'].map(h=>el('th',{},h))));
  R.forEach(x=>{if(x.err)return t.append(el('tr',{},el('td',{},x.s),el('td',{class:'dn',colSpan:9},'UNAVAILABLE: '+x.err)));const d=x.r.bars,q=DQ.check(d),last=d[d.length-1].time;t.append(el('tr',{},el('td',{},x.s),el('td',{},'Yahoo Finance (unofficial)'),el('td',{class:(Date.now()/1000-last)/60<30?'up':'mut'},DQ.label(x.r.meta,last)),el('td',{},new Date(last*1e3).toISOString().slice(0,16).replace('T',' ')),el('td',{},q.n),el('td',{class:q.bad?'dn':''},q.bad),el('td',{},q.zero),el('td',{class:q.gaps?'dn':''},q.gaps+(q.gaps?` (max ${q.maxGap.toFixed(0)}d)`:'')),el('td',{},q.big),el('td',{class:q.dup?'dn':''},q.dup)))});
  out.append(t,el('p',{class:'mut'},'Labels: DELAYED = Yahoo quote about 15 min behind (unofficial, not exchange data). HISTORICAL = daily bars. INDICATIVE = continuous/front-month series and model values. UNAVAILABLE = no data returned. Gaps over 4 days usually mean holidays or missing data. OHLC errors = bars where high/low do not contain open/close (common in old Yahoo futures history; the platform does not repair them). Nothing here is real-time or licensed exchange data.'))};
 const tst=el('div'),runT=()=>{tst.innerHTML='';let T;try{T=DQ.tests()}catch(e){return tst.append(el('p',{class:'dn'},'Test harness error: '+e.message))}const pass=T.filter(x=>x.c).length;tst.append(el('p',{class:pass===T.length?'up':'dn'},`${pass}/${T.length} checks passed`),...T.map(x=>el('div',{class:x.c?'up':'dn'},(x.c?'PASS ':'FAIL ')+x.n+(x.info!=null?' ['+(typeof x.info==='number'?x.info.toFixed(4):x.info)+']':''))))};
 c.append(el('div',{class:'card'},el('b',{},'Data quality and source panel'),el('p',{class:'mut'},'Comma-separated symbols (max 15).')),inp,el('div',{class:'row2'},el('button',{onclick:run},'Check data')),out,el('h4',{},'Self-test: indicators, backtest, options, statistics vs known values'),el('div',{class:'row2'},el('button',{onclick:runT},'Run self-test')),tst);runT()};
