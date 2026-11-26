// Correlation center: correlation matrix, rolling correlation, relative strength, ratios/spreads, custom formulas, seasonal correlation. Daily Yahoo closes (delayed).
const CORR={
 async load(syms,tf){const out={};await Promise.all(syms.map(async s=>{try{const r=await Data.get(s,tf||'1D');out[s]=new Map(r.bars.map(b=>[Math.floor(b.time/86400),b.close]))}catch(e){out[s]=null}}));return out},
 align(m,syms){const ok=syms.filter(s=>m[s]);if(!ok.length)return {days:[],ok};let days=[...m[ok[0]].keys()].filter(d=>ok.every(s=>m[s].has(d)));days.sort((a,b)=>a-b);return {days,ok}},
 rets(m,s,days){const o=[];for(let i=1;i<days.length;i++){const a=m[s].get(days[i-1]),b=m[s].get(days[i]);o.push(a&&b?Math.log(b/a):null)}return o},
 pearson(x,y){let n=0,sx=0,sy=0,sxx=0,syy=0,sxy=0;for(let i=0;i<x.length;i++){if(x[i]==null||y[i]==null)continue;n++;sx+=x[i];sy+=y[i];sxx+=x[i]*x[i];syy+=y[i]*y[i];sxy+=x[i]*y[i]}if(n<10)return null;const c=n*sxy-sx*sy,d=Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));return d?c/d:null},
 rolling(x,y,w){const o=[];for(let i=0;i<x.length;i++)o.push(i+1<w?null:CORR.pearson(x.slice(i+1-w,i+1),y.slice(i+1-w,i+1)));return o},
 formula(expr,m,syms,days){const toks=[];const re=/\[([^\]]+)\]/g;let e=expr.replace(re,(_,s)=>{s=s.trim().toUpperCase();if(!m[s])throw new Error('No data for '+s);let k=toks.indexOf(s);if(k<0){k=toks.length;toks.push(s)}return 'v['+k+']'});
  if(!/^[v\[\]0-9+\-*\/().\s]+$/.test(e))throw new Error('Only numbers, + - * / ( ) and [SYMBOL] are allowed');if(!toks.length)throw new Error('Use symbols like [ZS=F]');
  const f=new Function('v','return '+e);return {toks,vals:days.map(d=>{const v=toks.map(s=>m[s].get(d));return v.every(x=>x!=null)?f(v):null})}},
 seasonal(m,s,days){const by={};for(let i=1;i<days.length;i++){const a=m[s].get(days[i-1]),b=m[s].get(days[i]);if(!a||!b)continue;const mo=new Date(days[i]*86400000).getUTCMonth();(by[mo]=by[mo]||[]).push(Math.log(b/a))}return Array.from({length:12},(_,k)=>by[k]?by[k].reduce((a,x)=>a+x,0)/by[k].length:null)}
};
function corrColor(v){if(v==null)return '#222';const a=Math.min(1,Math.abs(v));return v>=0?`rgba(38,166,154,${.15+a*.7})`:`rgba(239,83,80,${.15+a*.7})`}
function lineChart(cv,series,title){const g=cv.getContext('2d'),W=cv.width,H=cv.height;g.fillStyle='#0b0e11';g.fillRect(0,0,W,H);const all=series.flatMap(s=>s.v.filter(x=>x!=null&&isFinite(x)));if(!all.length)return;const mn=Math.min(...all),mx=Math.max(...all);
 series.forEach(s=>{g.strokeStyle=s.c;g.lineWidth=2;g.beginPath();let st=false;s.v.forEach((y,i)=>{if(y==null||!isFinite(y)){st=false;return}const X=i/(s.v.length-1||1)*(W-8)+4,Y=H-8-(y-mn)/((mx-mn)||1)*(H-30);st?g.lineTo(X,Y):g.moveTo(X,Y);st=true});g.stroke()});
 g.fillStyle='#7d8793';g.font='16px sans-serif';g.fillText(title+'   min '+mn.toFixed(2)+'  max '+mx.toFixed(2),6,16)}
