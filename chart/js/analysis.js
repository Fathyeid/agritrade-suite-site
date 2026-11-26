// analysis engine: rule-based (no external AI). Every number comes from the loaded market data.
const An={
 last:a=>a[a.length-1],
 trend(d){const c=d.map(b=>b.close),e20=M.ema(c,20),e50=M.ema(c,50),e200=M.ema(c,200),adx=M.dmi(d,14).adx,i=d.length-1,px=c[i];
  let score=0;const why=[];
  if(e20[i]!=null){const s=px>e20[i]?1:-1;score+=s;why.push(`price ${s>0?'above':'below'} EMA20`)}
  if(e50[i]!=null){const s=px>e50[i]?1:-1;score+=s;why.push(`price ${s>0?'above':'below'} EMA50`)}
  if(e200[i]!=null){const s=px>e200[i]?1:-1;score+=s;why.push(`price ${s>0?'above':'below'} EMA200`)}
  if(e20[i]!=null&&e50[i]!=null){const s=e20[i]>e50[i]?1:-1;score+=s;why.push(`EMA20 ${s>0?'above':'below'} EMA50`)}
  const a=adx[i],strong=a!=null&&a>25;const dir=score>=3?'Uptrend':score<=-3?'Downtrend':'Sideways / mixed';
  return {dir,score,adx:a,strong,why,e20:e20[i],e50:e50[i],e200:e200[i],px}},
 rsiNow(d){const r=M.rsi(d.map(b=>b.close),14);return r[r.length-1]},
 breakout(d){const n=20,i=d.length-1;if(i<n+1)return null;const hi=Math.max(...d.slice(i-n,i).map(b=>b.high)),lo=Math.min(...d.slice(i-n,i).map(b=>b.low));const c=d[i].close;return c>hi?{dir:'up',level:hi,n}:c<lo?{dir:'down',level:lo,n}:{dir:'none',hi,lo,n}},
 divergence(d){const r=M.rsi(d.map(b=>b.close),14),s=swings(d,3),out=[];const lo=s.lo.filter(x=>r[x.i]!=null).slice(-2),hi=s.hi.filter(x=>r[x.i]!=null).slice(-2);
  if(lo.length===2&&d.length-lo[1].i<40){if(lo[1].p<lo[0].p&&r[lo[1].i]>r[lo[0].i])out.push({dir:'bull',text:`Regular bullish divergence: price made a lower low (${fmt(lo[0].p)} to ${fmt(lo[1].p)}) while RSI made a higher low (${r[lo[0].i].toFixed(1)} to ${r[lo[1].i].toFixed(1)}).`});
   if(lo[1].p>lo[0].p&&r[lo[1].i]<r[lo[0].i])out.push({dir:'bull',text:`Hidden bullish divergence: price higher low while RSI lower low (trend continuation hint).`})}
  if(hi.length===2&&d.length-hi[1].i<40){if(hi[1].p>hi[0].p&&r[hi[1].i]<r[hi[0].i])out.push({dir:'bear',text:`Regular bearish divergence: price made a higher high (${fmt(hi[0].p)} to ${fmt(hi[1].p)}) while RSI made a lower high (${r[hi[0].i].toFixed(1)} to ${r[hi[1].i].toFixed(1)}).`});
   if(hi[1].p<hi[0].p&&r[hi[1].i]>r[hi[0].i])out.push({dir:'bear',text:`Hidden bearish divergence: price lower high while RSI higher high (trend continuation hint).`})}
  return out},
 volume(d){const v=d.map(b=>b.volume);if(!v.some(x=>x>0))return null;const m=M.sma(v,20),i=d.length-1;return {last:v[i],avg:m[i],ratio:m[i]?v[i]/m[i]:null}},
 vola(d){const a=M.atr(d,14),i=d.length-1,r=d.map((b,k)=>k?Math.log(b.close/d[k-1].close):N),hv=M.std(r.map(x=>x??0),20).map((x,k)=>k<20?N:x*Math.sqrt(252)*100),vals=hv.filter(x=>x!=null),cur=vals[vals.length-1],pct=vals.length?100*vals.filter(x=>x<=cur).length/vals.length:null;return {atr:a[i],atrPct:a[i]/d[i].close*100,hv:cur,hvPct:pct}},
 sr(d){const f=STRUCT.sr.f(d),px=d[d.length-1].close;const up=f.filter(x=>x.p>px).sort((a,b)=>a.p-b.p),dn=f.filter(x=>x.p<px).sort((a,b)=>b.p-a.p);return {res:up.map(x=>x.p),sup:dn.map(x=>x.p)}},
 corr(a,b){const n=Math.min(a.length,b.length);if(n<10)return null;const x=a.slice(-n),y=b.slice(-n),mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return sx&&sy?sxy/Math.sqrt(sx*sy):null},
 returnsMap(bars){const m=new Map();bars.forEach((b,i)=>{if(i)m.set(b.time,Math.log(b.close/bars[i-1].close))});return m},
 async corrMatrix(syms,n=120){const sets=await Promise.all(syms.map(s=>Data.get(s,'1D').then(r=>An.returnsMap(r.bars)).catch(()=>null)));
  const mat=syms.map((_,i)=>syms.map((_,j)=>{if(!sets[i]||!sets[j])return null;const t=[...sets[i].keys()].filter(k=>sets[j].has(k)).sort((a,b)=>a-b).slice(-n);return i===j?1:An.corr(t.map(k=>sets[i].get(k)),t.map(k=>sets[j].get(k)))}));return mat},
 async seasonality(sym){const r=await Data.get(sym,'1M'),by=Array.from({length:12},()=>[]);r.bars.forEach((b,i)=>{if(i&&b.open){const m=new Date(b.time*1000).getUTCMonth();by[m].push(b.close/r.bars[i-1].close-1)}});
  return by.map((a,m)=>({m,n:a.length,avg:a.length?a.reduce((s,v)=>s+v,0)/a.length*100:null,win:a.length?100*a.filter(v=>v>0).length/a.length:null}))},
 async mtf(sym){const tfs=['1H','1D','1W','1M'],res=[];for(const tf of tfs){try{const r=await Data.get(sym,tf);if(r.bars.length<30)continue;const t=An.trend(r.bars);res.push({tf,dir:t.dir,rsi:An.rsiNow(r.bars),adx:t.adx,score:t.score,n:r.bars.length})}catch(e){}}return res},
 related(sym){const m={'ZS=F':['ZM=F','ZL=F','ZC=F','ZW=F','CL=F','DX-Y.NYB','GC=F'],'ZM=F':['ZS=F','ZL=F','ZC=F','DX-Y.NYB'],'ZL=F':['ZS=F','ZM=F','CL=F','BZ=F','DX-Y.NYB'],'ZC=F':['ZW=F','ZS=F','CL=F','DX-Y.NYB'],'ZW=F':['ZC=F','KE=F','ZS=F','DX-Y.NYB'],'CL=F':['BZ=F','NG=F','DX-Y.NYB','ZL=F','^GSPC'],'BZ=F':['CL=F','DX-Y.NYB','ZL=F'],'GC=F':['SI=F','DX-Y.NYB','^GSPC','BTC-USD'],'BTC-USD':['ETH-USD','^IXIC','GC=F','DX-Y.NYB']};return m[sym]||['^GSPC','DX-Y.NYB','GC=F','CL=F','ZS=F']},
 // plain-language report from computed facts only
 report(sym,tf,d,meta,mtf){
  const t=An.trend(d),px=d[d.length-1].close,sr=An.sr(d),A=M.atr(d,14),atr=A[A.length-1],rsi=An.rsiNow(d),bo=An.breakout(d),dv=An.divergence(d),vol=An.volume(d),vo=An.vola(d),pat=detectPatterns(d).slice(-3);
  const L=[];const nm=symName(sym);
  L.push(`<h4>${esc(nm)} (${esc(sym)}), ${tf}</h4>`);
  L.push(`<p><b>Data:</b> ${esc(meta.source||'')}, last bar ${new Date(d[d.length-1].time*1000).toISOString().slice(0,16).replace('T',' ')} (exchange time), last close ${fmt(px,2)}. Delayed or unofficial data: do not use for live execution.</p>`);
  L.push(`<p><b>Trend:</b> ${t.dir}${t.strong?' (ADX '+t.adx.toFixed(0)+', trending)':t.adx!=null?' (ADX '+t.adx.toFixed(0)+', weak trend)':''}. ${t.why.join('; ')}.</p>`);
  if(mtf&&mtf.length)L.push(`<p><b>Multi-timeframe:</b> ${mtf.map(x=>`${x.tf}: ${x.dir}`).join(' | ')}. ${new Set(mtf.map(x=>x.dir)).size===1?'All timeframes agree.':'Timeframes disagree, so the higher timeframe usually sets the bias and the lower one the timing.'}</p>`);
  L.push(`<p><b>Momentum:</b> RSI(14) is ${rsi.toFixed(1)}${rsi>70?' (overbought zone)':rsi<30?' (oversold zone)':' (neutral zone)'}.${dv.length?' '+dv.map(x=>x.text).join(' '):' No RSI divergence found on the last two swings.'}</p>`);
  if(bo)L.push(`<p><b>Breakout check (${bo.n}-bar channel):</b> ${bo.dir==='up'?'close is above the prior '+bo.n+'-bar high ('+fmt(bo.level,2)+'): upside breakout.':bo.dir==='down'?'close is below the prior '+bo.n+'-bar low ('+fmt(bo.level,2)+'): downside breakout.':'price is inside the range '+fmt(bo.lo,2)+' to '+fmt(bo.hi,2)+', no breakout.'}</p>`);
  if(vol&&vol.ratio!=null)L.push(`<p><b>Volume:</b> last bar volume is ${vol.ratio.toFixed(2)}x its 20-bar average${vol.ratio>1.5?' (elevated, confirms the move)':vol.ratio<0.6?' (thin, weak participation)':''}.</p>`);
  L.push(`<p><b>Volatility:</b> ATR(14) ${fmt(atr,2)} (${vo.atrPct.toFixed(2)}% of price)${vo.hv!=null?', 20-bar historical volatility '+vo.hv.toFixed(1)+'% annualized, at the '+vo.hvPct.toFixed(0)+'th percentile of the loaded history':''}.</p>`);
  if(pat.length)L.push(`<p><b>Recent candle patterns:</b> ${pat.map(p=>`${p.name} (${new Date(p.time*1000).toISOString().slice(0,10)}, ${p.dir})`).join('; ')}. Patterns are context, not signals.</p>`);
  const r1=sr.res[0],r2=sr.res[1],s1=sr.sup[0],s2=sr.sup[1];
  L.push(`<p><b>Key levels (from swing clustering):</b> resistance ${sr.res.slice(0,3).map(x=>fmt(x,2)).join(', ')||'none found above'}; support ${sr.sup.slice(0,3).map(x=>fmt(x,2)).join(', ')||'none found below'}.</p>`);
  const bullInv=s1!=null?s1:px-1.5*atr,bearInv=r1!=null?r1:px+1.5*atr;
  L.push(`<p><b>Bullish scenario:</b> a close above ${fmt(r1!=null?r1:px+atr,2)}${r2!=null?' opens room toward '+fmt(r2,2):''}. The scenario is invalidated by a close below ${fmt(bullInv,2)}.</p>`);
  L.push(`<p><b>Bearish scenario:</b> a close below ${fmt(s1!=null?s1:px-atr,2)}${s2!=null?' opens room toward '+fmt(s2,2):''}. The scenario is invalidated by a close above ${fmt(bearInv,2)}.</p>`);
  L.push(`<p class="mut">Rule-based technical read built only from the loaded price data. It does not know fundamentals or news, so it cannot explain why price moved, and it is not a forecast or trading advice.</p>`);
  return L.join('')}
};
