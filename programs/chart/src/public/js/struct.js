// candlestick patterns + market-structure heuristics (algorithmic approximations, not signals)
const PAT_INFO={
 'Doji':['neutral','Open and close almost equal: indecision. Matters most after a strong move.'],
 'Hammer':['bull','Long lower shadow after a decline: sellers pushed down but buyers recovered. Possible bottoming, needs confirmation.'],
 'Inverted Hammer':['bull','Long upper shadow after a decline: buyers tested higher. Possible reversal, needs confirmation by the next candle.'],
 'Hanging Man':['bear','Hammer shape after an advance: warns of weakening demand. Needs a bearish confirmation candle.'],
 'Shooting Star':['bear','Long upper shadow after an advance: buyers were rejected. Possible top, needs confirmation.'],
 'Bullish Engulfing':['bull','A large up candle engulfs the prior down candle: buying pressure took control.'],
 'Bearish Engulfing':['bear','A large down candle engulfs the prior up candle: selling pressure took control.'],
 'Bullish Harami':['bull','Small up candle inside a prior large down candle: downside momentum is slowing.'],
 'Bearish Harami':['bear','Small down candle inside a prior large up candle: upside momentum is slowing.'],
 'Piercing Line':['bull','Up candle opens lower and closes above the midpoint of the prior down candle.'],
 'Dark Cloud Cover':['bear','Down candle opens higher and closes below the midpoint of the prior up candle.'],
 'Morning Star':['bull','Three-candle bottoming pattern: big down, small indecision, big up.'],
 'Evening Star':['bear','Three-candle topping pattern: big up, small indecision, big down.'],
 'Three White Soldiers':['bull','Three consecutive strong up candles each closing near its high: sustained buying.'],
 'Three Black Crows':['bear','Three consecutive strong down candles each closing near its low: sustained selling.'],
};
function detectPatterns(d){
 const out=[],body=b=>Math.abs(b.close-b.open),rng=b=>b.high-b.low||1e-9,up=b=>b.close>b.open,dn=b=>b.close<b.open;
 const avgBody=i=>{let s=0,c=0;for(let j=Math.max(0,i-10);j<i;j++){s+=body(d[j]);c++}return c?s/c:body(d[i])};
 const trend=i=>{if(i<6)return 0;const a=d[i-1].close,b=d[i-6].close;return a>b*1.003?1:a<b*0.997?-1:0};
 const add=(i,n)=>out.push({i,name:n,dir:PAT_INFO[n][0],desc:PAT_INFO[n][1],time:d[i].time});
 for(let i=2;i<d.length;i++){const b=d[i],p=d[i-1],q=d[i-2],ab=avgBody(i),t=trend(i),r=rng(b),bd=body(b),lo=Math.min(b.open,b.close)-b.low,hi=b.high-Math.max(b.open,b.close);
  if(bd<=0.1*r&&r>0)add(i,'Doji');
  if(lo>=2*bd&&hi<=0.15*r&&bd>0.05*r){if(t<0)add(i,'Hammer');else if(t>0)add(i,'Hanging Man')}
  if(hi>=2*bd&&lo<=0.15*r&&bd>0.05*r){if(t<0)add(i,'Inverted Hammer');else if(t>0)add(i,'Shooting Star')}
  if(dn(p)&&up(b)&&b.open<=p.close&&b.close>=p.open&&bd>body(p))add(i,'Bullish Engulfing');
  if(up(p)&&dn(b)&&b.open>=p.close&&b.close<=p.open&&bd>body(p))add(i,'Bearish Engulfing');
  if(dn(p)&&up(b)&&body(p)>1.2*ab&&b.open>p.close&&b.close<p.open&&bd<body(p)*0.6)add(i,'Bullish Harami');
  if(up(p)&&dn(b)&&body(p)>1.2*ab&&b.open<p.close&&b.close>p.open&&bd<body(p)*0.6)add(i,'Bearish Harami');
  if(dn(p)&&up(b)&&t<0&&b.open<p.close&&b.close>(p.open+p.close)/2&&b.close<p.open)add(i,'Piercing Line');
  if(up(p)&&dn(b)&&t>0&&b.open>p.close&&b.close<(p.open+p.close)/2&&b.close>p.open)add(i,'Dark Cloud Cover');
  if(dn(q)&&body(q)>1.2*ab&&body(p)<0.5*body(q)&&Math.max(p.open,p.close)<q.close+0.0001*q.close&&up(b)&&b.close>(q.open+q.close)/2)add(i,'Morning Star');
  if(up(q)&&body(q)>1.2*ab&&body(p)<0.5*body(q)&&Math.min(p.open,p.close)>q.close-0.0001*q.close&&dn(b)&&b.close<(q.open+q.close)/2)add(i,'Evening Star');
  if(i>=3){const [a,c2,e]=[d[i-2],d[i-1],d[i]];
   if([a,c2,e].every(up)&&c2.close>a.close&&e.close>c2.close&&c2.open>a.open&&c2.open<a.close&&e.open>c2.open&&e.open<c2.close&&[a,c2,e].every(x=>body(x)>0.6*rng(x)))add(i,'Three White Soldiers');
   if([a,c2,e].every(dn)&&c2.close<a.close&&e.close<c2.close&&c2.open<a.open&&c2.open>a.close&&e.open<c2.open&&e.open>c2.close&&[a,c2,e].every(x=>body(x)>0.6*rng(x)))add(i,'Three Black Crows')}}
 return out}
function swings(d,l=3){const hi=[],lo=[];for(let i=l;i<d.length-l;i++){let h=true,w=true;for(let j=1;j<=l;j++){if(d[i-j].high>=d[i].high||d[i+j].high>d[i].high)h=false;if(d[i-j].low<=d[i].low||d[i+j].low<d[i].low)w=false}if(h)hi.push({i,p:d[i].high});if(w)lo.push({i,p:d[i].low})}return {hi,lo}}
// each returns draw items: zone {t1,t2,p1,p2,c,label} | line {t1,t2,p,c,label}
const STRUCT={
 sr:{n:'Support & Resistance',f(d){const s=swings(d,4),a=M.atr(d,14),A=a[a.length-1]||1,tol=A*0.6,lv=[];[...s.hi,...s.lo].forEach(x=>{const m=lv.find(l=>Math.abs(l.p-x.p)<tol);if(m){m.n++;m.p=(m.p*(m.n-1)+x.p)/m.n;m.i=Math.min(m.i,x.i)}else lv.push({p:x.p,n:1,i:x.i})});
  const last=d[d.length-1].close;return lv.filter(l=>l.n>=2).sort((x,y)=>y.n-x.n).slice(0,8).map(l=>({k:'line',t1:d[l.i].time,t2:d[d.length-1].time,p:l.p,c:l.p>last?'#ef5350':'#26a69a',label:(l.p>last?'R ':'S ')+fmt(l.p)+' x'+l.n}))}},
 fvg:{n:'Fair Value Gaps',f(d){const o=[];for(let i=2;i<d.length;i++){const a=d[i-2],c=d[i];let z=null;
  if(a.high<c.low)z={p1:c.low,p2:a.high,c:'rgba(38,166,154,.22)',label:'FVG+'};else if(a.low>c.high)z={p1:a.low,p2:c.high,c:'rgba(239,83,80,.22)',label:'FVG-'};
  if(!z)continue;let end=d.length-1,filled=false;for(let j=i+1;j<d.length;j++){if(z.label==='FVG+'?d[j].low<=z.p2:d[j].high>=z.p2){end=j;filled=true;break}}
  if(!filled)o.push({k:'zone',t1:d[i-1].time,t2:d[end].time,...z})}return o.slice(-12)}},
 bos:{n:'BOS / CHoCH',f(d){const s=swings(d,3),o=[];let trend=0,hi=null,lo=null,si=0,sj=0;
  for(let i=0;i<d.length;i++){while(si<s.hi.length&&s.hi[si].i+3<=i){hi=s.hi[si];si++}while(sj<s.lo.length&&s.lo[sj].i+3<=i){lo=s.lo[sj];sj++}
   if(hi&&d[i].close>hi.p&&hi.i>=0){o.push({k:'line',t1:d[hi.i].time,t2:d[i].time,p:hi.p,c:'#26a69a',label:trend===-1?'CHoCH':'BOS',dash:true});trend=1;hi={i:-1,p:1e18}}
   if(lo&&d[i].close<lo.p&&lo.i>=0){o.push({k:'line',t1:d[lo.i].time,t2:d[i].time,p:lo.p,c:'#ef5350',label:trend===1?'CHoCH':'BOS',dash:true});trend=-1;lo={i:-1,p:-1e18}}}
  return o.slice(-10)}},
 ob:{n:'Order Blocks',f(d){const a=M.atr(d,14),o=[];
  for(let i=5;i<d.length;i++){if(a[i]==null)continue;const imp=d[i].close-d[i].open;
   if(Math.abs(imp)>1.6*a[i]){const dirUp=imp>0;let j=i-1;while(j>i-4&&j>=0&&(dirUp?d[j].close>=d[j].open:d[j].close<=d[j].open))j--;if(j<0||j<i-3)continue;
    const z={k:'zone',t1:d[j].time,p1:d[j].high,p2:d[j].low,c:dirUp?'rgba(38,166,154,.25)':'rgba(239,83,80,.25)',label:dirUp?'OB+':'OB-'};
    let end=d.length-1;for(let m=i+1;m<d.length;m++){if(dirUp?d[m].close<d[j].low:d[m].close>d[j].high){end=m;break}}if(end===d.length-1)o.push({...z,t2:d[end].time})}}
  return o.slice(-8)}},
 liq:{n:'Liquidity Zones (equal highs/lows)',f(d){const s=swings(d,3),A=M.atr(d,14),a=A[A.length-1]||1,o=[];
  const eq=(arr,top)=>{for(let x=0;x<arr.length;x++)for(let y=x+1;y<arr.length;y++){if(Math.abs(arr[x].p-arr[y].p)<0.15*a&&arr[y].i-arr[x].i>3){const p=(arr[x].p+arr[y].p)/2;o.push({k:'line',t1:d[arr[x].i].time,t2:d[d.length-1].time,p,c:top?'#ffb74d':'#4dd0e1',label:top?'EQH liquidity':'EQL liquidity',dash:true})}}};
  eq(s.hi.slice(-10),true);eq(s.lo.slice(-10),false);return o.slice(-8)}},
 sd:{n:'Supply & Demand Zones',f(d){const a=M.atr(d,14),o=[];
  for(let i=3;i<d.length-1;i++){if(a[i]==null)continue;const base=d[i],mv=d[i+1];if(base.high-base.low>0.8*a[i])continue;const imp=mv.close-mv.open;
   if(Math.abs(imp)>1.5*a[i]){const dem=imp>0,z={k:'zone',t1:base.time,p1:base.high,p2:base.low,c:dem?'rgba(41,98,255,.2)':'rgba(255,152,0,.2)',label:dem?'Demand':'Supply'};
    let end=d.length-1,hit=false;for(let m=i+2;m<d.length;m++){if(dem?d[m].close<base.low:d[m].close>base.high){hit=true;break}}if(!hit)o.push({...z,t2:d[end].time})}}
  return o.slice(-8)}},
 vp:{n:'Volume Profile (visible range)',special:true},
};
// volume profile from bars (approximate: each bar's volume spread evenly across its high-low range)
function volProfile(d,bins=40){if(!d.length)return null;const hi=Math.max(...d.map(b=>b.high)),lo=Math.min(...d.map(b=>b.low)),st=(hi-lo)/bins||1,v=Array(bins).fill(0);
 d.forEach(b=>{const a=Math.max(0,Math.floor((b.low-lo)/st)),z=Math.min(bins-1,Math.floor((b.high-lo)/st)),n=z-a+1;for(let k=a;k<=z;k++)v[k]+=b.volume/n});
 let mx=0,poc=0;v.forEach((x,i)=>{if(x>mx){mx=x;poc=i}});return {lo,st,v,mx,poc}}
