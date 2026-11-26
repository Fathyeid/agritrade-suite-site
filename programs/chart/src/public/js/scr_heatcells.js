// Heat-coloured scanner cells for the Dashboard (Day-Trade-Dash style). Every number is computed from Yahoo daily bars or read from Yahoo key statistics; nothing is invented.
// Colour scales are fixed (not relative to the other rows). Gap % = today's open vs previous close; Rel vol = today's volume / 20-day average (DAILY, not intraday).
// "Running Up"-style flags need intraday real-time scans and are NOT computed; the Flags column only uses daily data.
SCR.hs=(kind,v)=>{const A=(r,g,b,a,w)=>`background:rgba(${r},${g},${b},${a});${w?'color:#fff;font-weight:600':''}`;
 if(kind==='rg'){const a=Math.min(1,Math.abs(v)/10);return v>=0?A(38,166,154,(.12+.75*a).toFixed(2),a>.35):A(239,83,80,(.12+.75*a).toFixed(2),a>.35)}
 if(kind==='vol')return v<2e5?'':v<1e6?A(33,150,243,.28):v<5e6?A(0,188,212,.45):v<2e7?A(0,200,120,.5):A(0,230,118,.85,1);
 if(kind==='rv')return v<1?'':v<1.5?A(33,150,243,.28):v<3?A(0,188,212,.45):v<6?A(0,200,120,.55):A(0,230,118,.85,1);
 if(kind==='flt')return v<1e7?A(0,230,118,.75,1):v<5e7?A(0,188,212,.45):v<2e8?A(33,150,243,.25):'';
 if(kind==='sh')return v>=20?A(239,83,80,.75,1):v>=10?A(255,152,0,.6,1):v>=5?A(255,235,59,.4):'';return ''};
{const _c=SCR.cell;SCR.cell=function(f,v){const td=_c.call(SCR,f,v);if(f.heat&&v!=null&&v!==''){if(f.heat==='flag'){const g=String(v);td.setAttribute('style','text-align:left;white-space:normal;font-size:10px;'+(/Gap up/.test(g)?'background:rgba(38,166,154,.55);color:#fff':/Gap down/.test(g)?'background:rgba(239,83,80,.55);color:#fff':'background:rgba(0,188,212,.4)'));return td}
 if(typeof v==='number'&&isFinite(v)){const st=SCR.hs(f.heat,v);if(st)td.setAttribute('style',(td.getAttribute('style')||'')+';'+st)}}return td}}
SCR.flags=r=>{const f=[];if(r.gap!=null){if(r.gap>=4)f.push('Gap up '+r.gap.toFixed(1)+'%');else if(r.gap<=-4)f.push('Gap down '+r.gap.toFixed(1)+'%')}if(r.rvol!=null&&r.rvol>=2)f.push('RVOL '+r.rvol.toFixed(1)+'x');if(r.hi52!=null&&r.hi52>=-0.5)f.push('At 52w high');if(r.c1!=null&&Math.abs(r.c1)>=5&&!f.length)f.push(r.c1>0?'Up '+r.c1.toFixed(1)+'%':'Down '+Math.abs(r.c1).toFixed(1)+'%');return f.length?f.join(' | '):null};
// Dashboard copy of a screener definition with heat columns, flags and lazy float / short-interest for the top 30 rows.
SCR.dashDef=d=>{const has=k=>d.fields.some(f=>f.k===k),add=[],H={c1:'rg',c1w:'rg',c1m:'rg',gap:'rg',vol:'vol',rvol:'rv'};
 const fields=d.fields.map(f=>H[f.k]?{...f,heat:H[f.k],...(f.k==='rvol'?{l:'Rel vol (daily)'}:{})}:f);
 const tech=has('rvol')&&has('c1');
 if(!has('gap')&&tech)fields.push({k:'gap',l:'Gap %',t:'pct',heat:'rg',show:false});else if(has('gap')){const g=fields.find(f=>f.k==='gap');g.show=false}
 if(tech){fields.push({k:'flag',l:'Flags (daily data)',t:'str',heat:'flag',show:false},{k:'float',l:'Float',t:'num',heat:'flt',show:false},{k:'short',l:'Short % float',t:'num',heat:'sh',show:false})}
 const pre=tech?[{n:'Top gainers',f:[['c1','>','3']]},{n:'Gappers >4% & RVOL>1.5',f:[['gap','>','4'],['rvol','>','1.5']]},{n:'Momentum: +3%, RVOL>1.5, above SMA200',f:[['c1','>','3'],['rvol','>','1.5'],['v200','>','0']]}]:d.id==='universe'?[{n:'Small-cap momentum ($1-$20, +5%, vol>1M)',f:[['price','>=','1'],['price','<=','20'],['c1','>','5'],['vol','>','1M']]}]:[];
 const heatU=d.id==='universe'?fields.map(f=>H[f.k]?{...f,heat:H[f.k]}:f):fields;
 return {...d,fields:heatU,presets:[...pre,...(d.presets||[])],about:(d.about||'')+(tech?' DASHBOARD COLUMNS: Gap % = open vs previous close; Rel vol = daily volume / 20-day average (daily, not intraday); Float and Short % float come from Yahoo key statistics for the top 30 rows only and show n/a if Yahoo has none; Flags use daily data only. Running Up / intraday momentum alerts need a real-time feed and are not computed.':''),
  async load(o,prog){const r=await d.load(o,prog);if(!tech)return r;r.rows.forEach(x=>{x.flag=SCR.flags(x)});
   if(d.id==='commod')return r;try{const sv=Store.get('scr_'+d.id,{}),sk=(sv.sort&&sv.sort[0])||'c1',sd=(sv.sort&&sv.sort[1])||-1;const top=r.rows.filter(x=>x[sk]!=null).sort((a,b)=>sd*(a[sk]<b[sk]?-1:1)).slice(0,30);
    const j=await (await fetch('api/detail?kind=keystats&symbols='+top.map(x=>encodeURIComponent(x.sym)).join(','))).json();let n=0;
    top.forEach(x=>{const s=j.stats&&j.stats[x.sym];if(s){if(s.float!=null){x.float=s.float;n++}if(s.short!=null)x.short=s.short}});r.note=(r.note||'')+' Float / short interest loaded for the top '+top.length+' rows by '+sk+' ('+n+' had a float value from Yahoo).'}catch(e){r.note=(r.note||'')+' Float / short interest unavailable right now.'}
   return r}}};
// Table-view colouring for every screener: % columns red/green, volume blue/green (fixed scales).
Object.values(SCR.defs).forEach(d=>{d.fields&&d.fields.forEach(f=>{if(f.heat)return;if(f.t==='pct'&&!/^(hi52|lo52)$/.test(f.k))f.heat='rg';else if(f.k==='vol')f.heat='vol';else if(f.k==='rvol')f.heat='rv'})});
