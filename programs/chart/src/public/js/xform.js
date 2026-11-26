// chart-type transforms (all computed from loaded OHLCV bars; Renko/Range/Kagi are approximated from bars, not ticks)
const XF={
 ha(d){const o=[];d.forEach((b,i)=>{const c=(b.open+b.high+b.low+b.close)/4,op=i?(o[i-1].open+o[i-1].close)/2:(b.open+b.close)/2;o.push({time:b.time,open:op,close:c,high:Math.max(b.high,op,c),low:Math.min(b.low,op,c),volume:b.volume})});return o},
 brick(d){const a=M.atr(d,14),v=a.filter(x=>x!=null);return v.length?v[v.length-1]:(d.length?(d[d.length-1].high-d[d.length-1].low)||1:1)},
 renko(d,size){size=size||XF.brick(d);const o=[];if(!d.length)return o;let last=Math.round(d[0].close/size)*size,t0=-1;
  const push=(b,op,cl)=>{let t=b.time;if(t<=t0)t=t0+1;t0=t;o.push({time:t,open:op,close:cl,high:Math.max(op,cl),low:Math.min(op,cl),volume:0})};
  let dir=0;for(const b of d){let guard=0;while(guard++<500){const up=b.close>=last+size*(dir===-1?2:1),dn=b.close<=last-size*(dir===1?2:1);
   if(up){const nl=last+size*(dir===-1?2:1);push(b,dir===-1?last+size:last,nl);last=nl;dir=1}else if(dn){const nl=last-size*(dir===1?2:1);push(b,dir===1?last-size:last,nl);last=nl;dir=-1}else break}}return o},
 range(d,size){size=size||XF.brick(d)*0.5;const o=[];if(!d.length)return o;let last=d[0].open,t0=-1;
  const emit=(b,c)=>{const t=Math.max(b.time,t0+1);t0=t;o.push({time:t,open:last,close:c,high:Math.max(last,c),low:Math.min(last,c),volume:0});last=c};
  for(const b of d){const path=b.close>=b.open?[b.open,b.low,b.high,b.close]:[b.open,b.high,b.low,b.close];
   for(const px of path){let g=0;while(g++<2000){if(px>=last+size)emit(b,last+size);else if(px<=last-size)emit(b,last-size);else break}}}
  return o},
 linebreak(d,n=3){const o=[];let t0=-1;for(const b of d){const c=b.close;if(!o.length){if(c===b.open)continue;o.push({time:b.time,open:b.open,close:c,high:Math.max(b.open,c),low:Math.min(b.open,c),volume:0});t0=b.time;continue}
  const l=o[o.length-1],up=l.close>l.open,t=Math.max(b.time,t0+1);
  if(up&&c>l.close){o.push({time:t,open:l.close,close:c,high:c,low:l.close,volume:0});t0=t}else if(!up&&c<l.close){o.push({time:t,open:l.close,close:c,high:l.close,low:c,volume:0});t0=t}
  else{const ref=o.slice(-n);const hi=Math.max(...ref.map(x=>x.high)),lo=Math.min(...ref.map(x=>x.low));if(up&&c<lo){o.push({time:t,open:l.open,close:c,high:l.open,low:c,volume:0});t0=t}else if(!up&&c>hi){o.push({time:t,open:l.open,close:c,high:c,low:l.open,volume:0});t0=t}}}return o},
 kagi(d,pct=0.04){const pts=[];if(!d.length)return pts;let dir=0,ext=d[0].close,start=d[0].close,t0=-1,yang=false,prevHigh=d[0].close,prevLow=d[0].close;
  const add=(t,v,y)=>{t=Math.max(t,t0+1);t0=t;pts.push({time:t,value:v,yang:y})};add(d[0].time,start,false);
  for(const b of d){const c=b.close,rev=ext*pct;
   if(dir>=0&&c>ext){ext=c;dir=1;if(c>prevHigh)yang=true;pts[pts.length-1]={...pts[pts.length-1],time:b.time>t0?b.time:t0+1,value:c,yang};t0=pts[pts.length-1].time}
   else if(dir<=0&&c<ext){ext=c;dir=-1;if(c<prevLow)yang=false;pts[pts.length-1]={...pts[pts.length-1],time:b.time>t0?b.time:t0+1,value:c,yang};t0=pts[pts.length-1].time}
   else if(dir===1&&c<=ext-rev){prevHigh=ext;dir=-1;ext=c;add(b.time,c,yang)}
   else if(dir===-1&&c>=ext+rev){prevLow=ext;dir=1;ext=c;add(b.time,c,yang)}}
  return pts},
};
