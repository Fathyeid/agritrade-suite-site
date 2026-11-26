// Quant tab: spread / ratio z-score, hedge ratio (OLS), half-life, Engle-Granger cointegration test, crush spread. Data: delayed Yahoo daily closes. Statistics only, not advice.
const QNT={
 mean:a=>a.reduce((s,x)=>s+x,0)/a.length,
 sd(a){const m=QNT.mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,a.length-1))},
 ols(x,y){const n=x.length,mx=QNT.mean(x),my=QNT.mean(y);let sxy=0,sxx=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2}const b=sxy/sxx,a=my-b*mx;let sse=0;for(let i=0;i<n;i++)sse+=(y[i]-a-b*x[i])**2;const se=Math.sqrt(sse/Math.max(1,n-2)/sxx);return {a,b,se,t:b/se,n}},
 // ADF with 1 lag of the difference, no constant (residuals of a regression with intercept have mean ~0)
 adf(e){const d=[],y=[],x1=[],x2=[];for(let i=2;i<e.length;i++){y.push(e[i]-e[i-1]);x1.push(e[i-1]);x2.push(e[i-1]-e[i-2])}
  // 2-regressor OLS through normal equations
  let s11=0,s12=0,s22=0,s1y=0,s2y=0;for(let i=0;i<y.length;i++){s11+=x1[i]*x1[i];s12+=x1[i]*x2[i];s22+=x2[i]*x2[i];s1y+=x1[i]*y[i];s2y+=x2[i]*y[i]}
  const det=s11*s22-s12*s12,g=(s22*s1y-s12*s2y)/det,h=(s11*s2y-s12*s1y)/det;let sse=0;for(let i=0;i<y.length;i++)sse+=(y[i]-g*x1[i]-h*x2[i])**2;const s2=sse/(y.length-2),se=Math.sqrt(s2*s22/det);return {gamma:g,t:g/se,n:y.length}},
 halfLife(s){const y=[],x=[];for(let i=1;i<s.length;i++){x.push(s[i-1]);y.push(s[i]-s[i-1])}const r=QNT.ols(x,y);return r.b<0?-Math.log(2)/Math.log(1+r.b):null},
 rollz(s,w){return s.map((_,i)=>{if(i<w-1)return null;const a=s.slice(i-w+1,i+1),sd=QNT.sd(a);return sd?(s[i]-QNT.mean(a))/sd:null})},
 // Engle-Granger critical values for 2 variables (MacKinnon approx, with constant): 1% -3.90, 5% -3.34, 10% -3.04
 cv:{1:-3.90,5:-3.34,10:-3.04}
};
App.prototype.tQuant=function(){const c=this.tabc,s=Store.get('qntcfg',{}),out=el('div');
 const A=el('input',{value:s.a||'ZS=F',style:'width:80px'}),B=el('input',{value:s.b||'ZC=F',style:'width:80px'}),mode=el('select',{},...[['ols','Spread = A - beta*B (log prices, OLS)'],['ratio','Ratio A/B'],['diff','Difference A - B']].map(([v,t])=>el('option',{value:v},t))),W=el('input',{value:s.w||'60',style:'width:45px'}),Z=el('input',{value:s.z||'2',style:'width:40px'}),tf=el('select',{},...['1D','1W'].map(v=>el('option',{value:v},v)));mode.value=s.mode||'ols';
 const run=async()=>{Store.set('qntcfg',{a:A.value,b:B.value,mode:mode.value,w:W.value,z:Z.value});out.innerHTML='<p class="mut">Loading...</p>';const sa=A.value.trim(),sb=B.value.trim(),m=await CORR.load([sa,sb],tf.value),al=CORR.align(m,[sa,sb]);out.innerHTML='';
  if(al.ok.length<2||al.days.length<60)return out.append(el('p',{class:'dn'},`Not enough overlapping history (${al.days.length} common days; need 60+). A symbol may have no Yahoo data.`));
  const pa=al.days.map(d=>m[sa].get(d)),pb=al.days.map(d=>m[sb].get(d));if(pa.concat(pb).some(v=>!(v>0)))return out.append(el('p',{class:'dn'},'Prices must be positive for log-based statistics.'));
  const la=pa.map(Math.log),lb=pb.map(Math.log),r=QNT.ols(lb,la);let sp,label;
  if(mode.value==='ols'){sp=la.map((v,i)=>v-r.a-r.b*lb[i]);label=`ln(A) - ${r.a.toFixed(3)} - ${r.b.toFixed(3)}*ln(B)`}else if(mode.value==='ratio'){sp=pa.map((v,i)=>v/pb[i]);label='A / B'}else{sp=pa.map((v,i)=>v-pb[i]);label='A - B'}
  const w=Math.max(10,Math.min(250,+W.value||60)),zs=QNT.rollz(sp,w),zt=+Z.value||2,res=la.map((v,i)=>v-r.a-r.b*lb[i]),eg=QNT.adf(res),hl=QNT.halfLife(sp),last=zs[zs.length-1];
  const lev=eg.t<QNT.cv[1]?'cointegrated at 1%':eg.t<QNT.cv[5]?'cointegrated at 5%':eg.t<QNT.cv[10]?'weak evidence (10%)':'NO evidence of cointegration';
  const corr=(()=>{const ra=[],rb=[];for(let i=1;i<la.length;i++){ra.push(la[i]-la[i-1]);rb.push(lb[i]-lb[i-1])}const ma=QNT.mean(ra),mb=QNT.mean(rb);let n=0,da=0,db=0;for(let i=0;i<ra.length;i++){n+=(ra[i]-ma)*(rb[i]-mb);da+=(ra[i]-ma)**2;db+=(rb[i]-mb)**2}return n/Math.sqrt(da*db)})();
  const sig=last==null?'n/a':last>=zt?`z=${last.toFixed(2)} >= +${zt}: spread rich (A expensive vs B)`:last<=-zt?`z=${last.toFixed(2)} <= -${zt}: spread cheap (A cheap vs B)`:`z=${last.toFixed(2)}: inside +/-${zt}`;
  out.append(el('div',{class:'card'},el('b',{},`${sa} vs ${sb}, ${al.days.length} common ${tf.value==='1D'?'daily':'weekly'} bars`),el('p',{},'Spread: '+label),el('p',{},'Current: '+sig),
   el('p',{},`Return correlation ${corr.toFixed(2)}. Hedge ratio beta (log-log OLS) ${r.b.toFixed(3)}, std error ${r.se.toFixed(3)}.`),
   el('p',{},`Engle-Granger (ADF on residuals, 1 lag): t = ${eg.t.toFixed(2)} vs critical 1% ${QNT.cv[1]}, 5% ${QNT.cv[5]}, 10% ${QNT.cv[10]} => ${lev}.`),
   el('p',{},hl?`Mean-reversion half-life of the spread: ${hl.toFixed(1)} bars.`:'Spread does not mean-revert on this sample (no positive half-life).'),
   el('p',{class:'mut'},'Prices: delayed Yahoo closes, unofficial (front-month continuous series jump at contract rolls, which distorts spreads). The cointegration test uses approximate MacKinnon critical values and one in-sample fit: a pass is not proof, and relationships break. Statistics only, not trade advice.')));
  const cv=el('canvas',{width:640,height:220,style:'width:100%'}),cz=el('canvas',{width:640,height:200,style:'width:100%'});out.append(el('h4',{},'Spread'),cv,el('h4',{},`Rolling z-score (${w} bars), bands at +/-${zt}`),cz);
  lineChart(cv,[{v:sp,c:'#2962ff'}],'spread');const zz=zs.map(v=>v==null?null:v);lineChart(cz,[{v:zz,c:'#ff9800'},{v:zz.map(()=>zt),c:'#ef5350'},{v:zz.map(()=>-zt),c:'#26a69a'},{v:zz.map(()=>0),c:'#7d8793'}],'z-score');
  // simple signal log: enter at |z|>=zt, exit at |z|<0.5
  let pos=0,ent=0,ei=0;const tr=[];for(let i=0;i<zs.length;i++){const z=zs[i];if(z==null)continue;if(!pos&&Math.abs(z)>=zt){pos=z>0?-1:1;ent=sp[i];ei=i}else if(pos&&(Math.abs(z)<0.5||i===zs.length-1)){tr.push({d:new Date(al.days[ei]*864e5).toISOString().slice(0,10),x:new Date(al.days[i]*864e5).toISOString().slice(0,10),side:pos>0?'long spread':'short spread',pnl:pos*(sp[i]-ent),bars:i-ei,open:i===zs.length-1&&Math.abs(z)>=0.5});pos=0}}
  const t=el('table',{},el('tr',{},...['Entry','Exit','Side','P/L (spread units)','Bars'].map(h=>el('th',{},h))));tr.slice(-15).reverse().forEach(x=>t.append(el('tr',{},el('td',{},x.d),el('td',{},x.x+(x.open?' (open)':'')),el('td',{},x.side),el('td',{class:x.pnl>=0?'up':'dn'},x.pnl.toFixed(4)),el('td',{},x.bars))));
  const wins=tr.filter(x=>x.pnl>0).length;out.append(el('h4',{},`Z-score signal history (enter |z|>=${zt}, exit |z|<0.5): ${tr.length} trades, ${tr.length?(100*wins/tr.length).toFixed(0):0}% winners`),t,el('p',{class:'mut'},'No costs, no slippage, spread units not money. A research view, not a backtest of tradable contracts.'))};
 const pre=(a,b,m)=>el('button',{onclick:()=>{A.value=a;B.value=b;mode.value=m;run()}},`${a} / ${b}`);
 // crush spread
 const crush=async()=>{out.innerHTML='<p class="mut">Loading ZS, ZM, ZL...</p>';const S=['ZS=F','ZM=F','ZL=F'],m=await CORR.load(S,'1D'),al=CORR.align(m,S);out.innerHTML='';if(al.ok.length<3||al.days.length<30)return out.append(el('p',{class:'dn'},'Not enough data for the crush spread.'));
  // Board crush ($/bu) = 0.022*meal($/short ton) + 0.11*oil(c/lb) - soybeans($/bu); oil 11 lb/bu: 11*oil/100 $/bu
  const g=d=>{const s=m['ZS=F'].get(d)/100,mm=m['ZM=F'].get(d),o=m['ZL=F'].get(d);return 0.022*mm+0.11*o-s},cr=al.days.map(g),zs=QNT.rollz(cr,60),L=cr[cr.length-1],pctile=100*cr.filter(v=>v<=L).length/cr.length;
  const oilShare=(d=>{const o=0.11*m['ZL=F'].get(d),mm=0.022*m['ZM=F'].get(d);return 100*o/(o+mm)})(al.days[al.days.length-1]);
  const cv=el('canvas',{width:640,height:220,style:'width:100%'});out.append(el('div',{class:'card'},el('b',{},'Soybean board crush (front continuous futures)'),el('p',{},`Crush = 0.022 x meal ($/short ton) + 0.11 x oil (c/lb) - soybeans ($/bu) = ${L.toFixed(2)} $/bu. Percentile in sample: ${pctile.toFixed(0)}%. 60-bar z-score ${zs[zs.length-1]==null?'n/a':zs[zs.length-1].toFixed(2)}. Oil share of product value ${oilShare.toFixed(0)}%.`),el('p',{class:'mut'},'Uses Yahoo front-month series: values jump at contract rolls and months differ across legs, so treat as indicative. Standard board crush uses same-month contracts (use the Futures tab for exact months). Delayed, unofficial.')),cv);lineChart(cv,[{v:cr,c:'#26a69a'}],'board crush $/bu')};
 c.append(el('div',{class:'row2'},el('label',{},'A'),A,el('label',{},'B'),B,mode,el('label',{},'Z window'),W,el('label',{},'Z limit'),Z,tf,el('button',{onclick:run},'Analyze')),
  el('div',{class:'row2'},el('span',{class:'mut'},'Presets: '),pre('ZS=F','ZC=F','ols'),pre('ZW=F','KE=F','ols'),pre('ZC=F','ZW=F','ratio'),pre('GC=F','SI=F','ratio'),el('button',{onclick:crush},'Soy crush')),out)};
