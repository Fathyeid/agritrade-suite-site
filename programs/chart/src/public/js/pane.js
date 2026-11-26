const LW=LightweightCharts;
const CTYPES={candle:'Candlestick',hollow:'Hollow Candles',ha:'Heikin Ashi',ohlc:'OHLC Bars',line:'Line',area:'Area',baseline:'Baseline',renko:'Renko',range:'Range Bars',linebreak:'Line Break (3)',kagi:'Kagi'};
const NO_DATA_TYPES={footprint:'Footprint, Order Flow, Market Profile / TPO and true Volume Delta need tick-by-tick or Level 2 data from a licensed provider (CME, dxFeed, Databento, Polygon, etc.). Not connected.',pnf:'Point & Figure is not built yet.'};
class Pane{
 constructor(app,st){
  this.app=app;st=st||{};this.id=uid();
  this.sym=st.sym||'ZS=F';this.tf=st.tf||'1D';this.type=st.type||'candle';this.log=!!st.log;this.pct=!!st.pct;this.inv=!!st.inv;this.vol=st.vol!==false;this.inds=st.inds||[];this.cmp=st.cmp||[];this.pat=!!st.pat;this.sx=st.sx||{};this.rng=st.rng||'1Y';
  this.raw=[];this.view=[];this.meta={};this.series=[];this.cmpData={};this.zones=[];this.idx=new Map();
  this.el=el('div',{class:'pane'});
  this.symBtn=el('button',{class:'psym',title:'Change symbol (/)',onclick:()=>{app.activate(this);app.symbolSearch()}});
  this.tfSel=el('select',{class:'ptf',onchange:e=>{this.tf=e.target.value;this.rng=null;this.load(true);app.saveState();app.syncTfUi()}},Object.keys(TF).map(k=>el('option',{value:k},k)));
  this.priceEl=el('span',{class:'pprice'});this.srcEl=el('span',{class:'psrc',onclick:()=>app.dataInfo()});
  this.closeBtn=el('button',{class:'x',title:'Remove this chart from layout',onclick:()=>app.removePane(this)},'×');
  const head=el('div',{class:'ph'},this.symBtn,this.tfSel,this.priceEl,el('span',{class:'sp'}),this.srcEl,this.closeBtn);
  this.cwrap=el('div',{class:'cw'});this.lg=el('div',{class:'lg'});this.chips=el('div',{class:'chips'});this.msgEl=el('div',{class:'pmsg'},'Loading...');
  this.cvs=el('canvas',{class:'ov'});
  this.cwrap.append(this.lg,this.chips,this.msgEl,this.cvs);this.el.append(head,this.cwrap);
  this.el.addEventListener('mousedown',()=>app.activate(this),true);
  const th=app.theme;
  this.chart=LW.createChart(this.cwrap,{autoSize:true,layout:{background:{color:th.bg},textColor:th.tx,panes:{separatorColor:th.border}},grid:{vertLines:{color:th.grid},horzLines:{color:th.grid}},crosshair:{mode:0},rightPriceScale:{borderColor:th.border},timeScale:{borderColor:th.border,timeVisible:true,rightOffset:8}});
  this.dl=new DrawLayer(this);
  this.chart.subscribeCrosshairMove(p=>this.onCross(p));
  this.chart.timeScale().subscribeVisibleLogicalRangeChange(()=>{this.dl.redraw();this.app.rangeSync(this)});
  this.tfSel.value=this.tf;this.updateHead();
 }
 destroy(){try{this.chart.remove()}catch(e){}this.el.remove();clearInterval(this.iv)}
 state(){return {sym:this.sym,tf:this.tf,type:this.type,log:this.log,pct:this.pct,inv:this.inv,vol:this.vol,inds:this.inds,cmp:this.cmp,pat:this.pat,sx:this.sx,rng:this.rng}}
 updateHead(){this.symBtn.textContent=this.sym.startsWith('SYN:')?symName(this.sym).split(' (')[0].slice(0,26):this.sym.replace('=F','');this.symBtn.title=symName(this.sym)+' - click to change';this.tfSel.value=this.tf}
 msg(t){this.msgEl.textContent=t||'';this.msgEl.style.display=t?'flex':'none'}
 async load(reset){
  this.updateHead();this.dl.load();if(reset)this.msg('Loading...');
  try{
   const r=await Data.get(this.sym,this.tf);this.raw=r.bars;this.meta=r.meta;rememberName(this.sym,r.meta.name&&!this.sym.startsWith('SYN:')?r.meta.name:symName(this.sym));
   this.cmpData={};await Promise.all(this.cmp.map(async c=>{try{this.cmpData[c.sym]=(await Data.get(c.sym,this.tf)).bars}catch(e){}}));
   this.msg('');this.build(reset);
  }catch(e){if(reset||!this.raw.length){this.raw=[];this.msg('Could not load '+this.sym+' ('+this.tf+'). '+(INTRA(this.tf)?'Intraday history is limited by the free feed. ':'')+'Try another timeframe.');this.clearSeries()}}
  this.dl.redraw();
 }
 clearSeries(){this.series.forEach(s=>{try{this.chart.removeSeries(s)}catch(e){}});this.series=[];this.main=null;this.mk=null}
 transform(){const d=this.raw;switch(this.type){case 'ha':return XF.ha(d);case 'renko':return XF.renko(d);case 'range':return XF.range(d);case 'linebreak':return XF.linebreak(d);case 'kagi':return XF.kagi(d).map(p=>({time:p.time,open:p.value,high:p.value,low:p.value,close:p.value,volume:0,yang:p.yang}));default:return d}}
 build(reset){
  const th=this.app.theme,ch=this.chart,keep=!reset&&ch.timeScale().getVisibleLogicalRange();
  this.clearSeries();const d=this.view=this.transform();this.idx=new Map(d.map((b,i)=>[b.time,i]));
  if(!d.length)return;
  ch.applyOptions({layout:{background:{color:th.bg},textColor:th.tx,panes:{separatorColor:th.border}},grid:{vertLines:{color:th.grid},horzLines:{color:th.grid}},rightPriceScale:{borderColor:th.border,mode:this.pct?2:this.log?1:0,invertScale:this.inv},timeScale:{borderColor:th.border,timeVisible:INTRA(this.tf)},localization:{timeFormatter:tzFmt},});
  const T=this.type,add=(k,o,p)=>{const s=ch.addSeries(k,o,p);this.series.push(s);return s};
  if(['candle','hollow','ha','renko','range','linebreak'].includes(T)){
   const hol=T==='hollow';this.main=add(LW.CandlestickSeries,{upColor:th.up,downColor:th.down,borderUpColor:th.up,borderDownColor:th.down,wickUpColor:th.up,wickDownColor:th.down,borderVisible:hol||undefined,priceFormat:{type:'price',precision:this.prec(),minMove:Math.pow(10,-this.prec())}},0);
   this.main.setData(hol?d.map(b=>b.close>=b.open?{...b,color:th.bg,borderColor:th.up,wickColor:th.up}:b):d)}
  else if(T==='ohlc'){this.main=add(LW.BarSeries,{upColor:th.up,downColor:th.down},0);this.main.setData(d)}
  else if(T==='area'){this.main=add(LW.AreaSeries,{lineColor:'#2962ff',topColor:'rgba(41,98,255,.35)',bottomColor:'rgba(41,98,255,.02)'},0);this.main.setData(d.map(b=>({time:b.time,value:b.close})))}
  else if(T==='baseline'){const base=d[Math.max(0,d.length-200)].close;this.main=add(LW.BaselineSeries,{baseValue:{type:'price',price:base},topLineColor:th.up,bottomLineColor:th.down,topFillColor1:th.up+'55',topFillColor2:th.up+'08',bottomFillColor1:th.down+'08',bottomFillColor2:th.down+'55'},0);this.main.setData(d.map(b=>({time:b.time,value:b.close})))}
  else if(T==='kagi'){this.main=add(LW.LineSeries,{lineWidth:2,lineType:1,color:th.up,priceLineVisible:true},0);this.main.setData(d.map(b=>({time:b.time,value:b.close,color:b.yang?th.up:th.down})))}
  else{this.main=add(LW.LineSeries,{color:'#2962ff',lineWidth:2},0);this.main.setData(d.map(b=>({time:b.time,value:b.close})))}
  if(this.vol&&!['renko','range','linebreak','kagi'].includes(T)&&d.some(b=>b.volume>0)){const v=add(LW.HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'vol',lastValueVisible:false,priceLineVisible:false},0);ch.priceScale('vol').applyOptions({scaleMargins:{top:.85,bottom:0}});v.setData(d.map(b=>({time:b.time,value:b.volume,color:(b.close>=b.open?th.up:th.down)+'55'})))}
  let pi=1;this.vals=[];
  this.inds.forEach(inst=>{if(inst.hide)return;let res;try{res=runInd(inst,d)}catch(e){return}const def=IND[inst.key],pane=def.ov?0:pi++;const row={inst,lines:[]};
   res.lines.forEach((ln,k)=>{const col=(inst.colors&&inst.colors[k])||COL[(k+(inst.ci||0))%COL.length],w=inst.w||1;let s;
    if(ln.t==='hist')s=add(LW.HistogramSeries,{priceLineVisible:false,lastValueVisible:false,color:col},pane);
    else s=add(LW.LineSeries,{color:col,lineWidth:w,lineStyle:ln.dash?2:0,priceLineVisible:false,lastValueVisible:!def.ov,crosshairMarkerVisible:false,pointMarkersVisible:!!ln.pm,pointMarkersRadius:2,lineVisible:!ln.pm},pane);
    s.setData(d.map((b,i)=>{const v=ln.v[i];if(v==null||isNaN(v))return {time:b.time};const o={time:b.time,value:v};if(ln.colorFn&&!(inst.colors&&inst.colors[k]))o.color=ln.colorFn(i,v);return o}));
    if(!def.ov&&k===0&&res.levels)res.levels.forEach(lv=>s.createPriceLine({price:lv,color:'#5d6b7a',lineStyle:2,lineWidth:1,axisLabelVisible:false}));
    row.lines.push({name:ln.name,v:ln.v,col})});
   this.vals.push(row)});
  // comparison
  this.cmp.forEach(c=>{const o=this.cmpData[c.sym];if(!o)return;const m=new Map(o.map(b=>[b.time,b.close])),com=d.filter(b=>m.has(b.time));if(com.length<2)return;
   if(c.mode==='overlay'){const s=add(LW.LineSeries,{color:c.col||'#ffb300',lineWidth:2,priceScaleId:'left',title:c.sym},0);ch.priceScale('left').applyOptions({visible:true,borderColor:th.border});s.setData(com.map(b=>({time:b.time,value:m.get(b.time)})))}
   else if(c.mode==='pct'){const p=pi++,b0=com[0].close,o0=m.get(com[0].time),s1=add(LW.LineSeries,{color:'#2962ff',lineWidth:2,title:this.sym.replace('=F','')+' %'},p),s2=add(LW.LineSeries,{color:c.col||'#ffb300',lineWidth:2,title:c.sym.replace('=F','')+' %'},p);s1.setData(com.map(b=>({time:b.time,value:b.close/b0*100})));s2.setData(com.map(b=>({time:b.time,value:m.get(b.time)/o0*100})));s1.createPriceLine({price:100,color:'#5d6b7a',lineStyle:2,axisLabelVisible:false})}
   else{const p=pi++,s=add(LW.LineSeries,{color:c.col||'#ffb300',lineWidth:2,title:(c.mode==='ratio'?'Ratio ':'Spread ')+this.sym.replace('=F','')+(c.mode==='ratio'?'/':'-')+c.sym.replace('=F','')},p);s.setData(com.map(b=>({time:b.time,value:c.mode==='ratio'?b.close/m.get(b.time):b.close-m.get(b.time)})))}});
  const ps=ch.panes();ps.forEach((p,i)=>{try{p.setStretchFactor(i===0?(this.app.n>4?2.5:3.2):1)}catch(e){}});
  // patterns
  this.patList=detectPatterns(d);
  {let mk=[];if(this.pat){mk=this.patList.slice(-60).map(p=>({time:p.time,position:p.dir==='bull'?'belowBar':'aboveBar',color:p.dir==='bull'?th.up:p.dir==='bear'?th.down:'#9aa4b0',shape:p.dir==='bull'?'arrowUp':p.dir==='bear'?'arrowDown':'circle',text:p.name.split(' ').map(w=>w[0]).join('')}))}
   if(this.btMk)mk=mk.concat(this.btMk.filter(m=>this.idx.has(m.time)));
   if(mk.length){mk.sort((x,y)=>x.time-y.time);try{createSeriesMarkers(this.main,mk)}catch(e){}}}
  // structure zones
  this.zones=[];Object.keys(this.sx).filter(k=>this.sx[k]&&STRUCT[k]&&STRUCT[k].f).forEach(k=>{try{this.zones.push(...STRUCT[k].f(d.slice(-500)))}catch(e){}});
  if(keep)ch.timeScale().setVisibleLogicalRange(keep);else this.applyRange(this.rng);
  this.upPrice();this.legend(null);this.dl.redraw();this.app.paneBuilt&&this.app.paneBuilt(this)}
 prec(){const p=this.raw.length?this.raw[this.raw.length-1].close:1;return p>=1000?1:p>=100?2:p>=10?3:p>=1?4:5}
 applyRange(k){this.rng=k;const d=this.view;if(!d.length)return;const ts=this.chart.timeScale();if(!k||k==='All'){ts.fitContent();return}
  const last=d[d.length-1].time,day=86400,span={'1D':day,'5D':5*day,'1M':31*day,'3M':92*day,'6M':183*day,'YTD':null,'1Y':366*day,'5Y':5*366*day}[k];
  let from=span?last-span:Date.UTC(new Date(last*1000).getUTCFullYear(),0,1)/1000;
  let i=d.findIndex(b=>b.time>=from);if(i<0)i=0;
  // if the range holds too few bars at this timeframe, show a sensible window instead
  if(d.length-i<20)i=Math.max(0,d.length-60);
  ts.setVisibleLogicalRange({from:i-1,to:d.length+6})}
 upPrice(){const m=this.meta,d=this.raw;if(!d.length){this.priceEl.textContent='';return}const l=d[d.length-1],p=d.length>1?d[d.length-2].close:l.open,ch=l.close-p,pc=ch/p*100;
  this.priceEl.innerHTML=`<b>${fmt(l.close,2)}</b> <span style="color:${ch>=0?this.app.theme.up:this.app.theme.down}">${ch>=0?'+':''}${fmt(ch,2)} (${pc.toFixed(2)}%)</span>`;
  const age=m.fetched?new Date(m.fetched).toTimeString().slice(0,8):'';
  this.srcEl.innerHTML=m.synthetic?`<i class="dot warn"></i>Synthetic`:`<i class="dot warn"></i>${esc(m.source||'')}, delayed`;
  this.srcEl.title=`Source: ${m.source}\nExchange: ${m.exchange||''}\nStatus: DELAYED / unofficial feed, not real-time, not a licensed redistribution feed.\nUpdated: ${age}\n${m.note||''}\nClick for data details.`;
  if(document.hidden){window._T0=window._T0||document.title;document.title=`${fmt(l.close,2)} ${this.sym.replace('=F','')} - GlobalChart`}else if(window._T0)document.title=window._T0}
 legend(i){const d=this.view;if(!d.length)return;const k=i==null?d.length-1:i,b=d[k],pv=k>0?d[k-1].close:b.open,ch=b.close-pv,pc=ch/pv*100,col=ch>=0?this.app.theme.up:this.app.theme.down,pr=this.prec();
  this.lg.innerHTML=`<div class="t">${esc(symName(this.sym))} <span class="mut">${esc(this.sym)} · ${this.tf} · ${CTYPES[this.type]} · ${esc(this.meta.exchange||'')}</span></div><div style="color:${col}"><span class="e">O ${fmt(b.open,pr)}</span><span class="e">H ${fmt(b.high,pr)}</span><span class="e">L ${fmt(b.low,pr)}</span><span class="e">C ${fmt(b.close,pr)}</span><span class="e">${ch>=0?'+':''}${fmt(ch,pr)} (${pc.toFixed(2)}%)</span>${b.volume?`<span class="e mut">Vol ${fmt(b.volume,0)}</span>`:''}</div>`;
  this.chips.innerHTML='';(this.vals||[]).forEach(row=>{const nm=IND[row.inst.key].n,ps=IND[row.inst.key].p.filter(p=>p.k==='n'||typeof p.v==='number').map(p=>row.inst.p&&row.inst.p[p.k]!==undefined?row.inst.p[p.k]:p.v).slice(0,3).join(',');
   const c=el('span',{class:'chip'},el('span',{class:'cn',onclick:()=>this.app.indSettings(this,row.inst)},nm+(ps?' ('+ps+')':'')),...row.lines.filter(l=>l.v[k]!=null).slice(0,4).map(l=>el('span',{style:'color:'+l.col},' '+fmt(l.v[k],Math.abs(l.v[k])<10?3:2))),el('span',{class:'cx',title:'Hide/show',onclick:()=>{row.inst.hide=!row.inst.hide;this.build(false);this.app.saveState()}},'👁'),el('span',{class:'cx',title:'Settings',onclick:()=>this.app.indSettings(this,row.inst)},'⚙'),el('span',{class:'cx',title:'Remove',onclick:()=>{this.inds=this.inds.filter(x=>x!==row.inst);this.build(false);this.app.saveState()}},'×'));this.chips.append(c)})}
 onCross(p){if(p.time===undefined||p.time==null){this.legend(null);this.app.crossSync(this,null);return}const i=this.idx.get(p.time);if(i!=null)this.legend(i);this.app.crossSync(this,p.time)}
 setCross(t){if(!this.main)return;const i=this.idx.get(t);if(i==null){try{this.chart.clearCrosshairPosition()}catch(e){}return}try{this.chart.setCrosshairPosition(this.view[i].close,t,this.main)}catch(e){}}
 clearCross(){try{this.chart.clearCrosshairPosition()}catch(e){}}
 // overlay drawing for structure zones + volume profile
 drawStructure(cx,dl){const W=dl.W,rt=W-62;
  this.zones.forEach(z=>{const x1=dl.X(z.t1),x2=dl.X(z.t2);if(x1==null)return;cx.save();
   if(z.k==='zone'){const y1=dl.Y(z.p1),y2=dl.Y(z.p2);if(y1==null||y2==null){cx.restore();return}const xa=Math.max(-5,x1),xb=Math.min(rt,x2==null?rt:x2);cx.fillStyle=z.c;cx.fillRect(xa,Math.min(y1,y2),Math.max(0,xb-xa),Math.abs(y1-y2)||1);cx.fillStyle='#9aa4b0';cx.font='10px system-ui';cx.fillText(z.label,Math.max(xa,2)+3,Math.min(y1,y2)+10)}
   else{const y=dl.Y(z.p);if(y==null){cx.restore();return}cx.strokeStyle=z.c;cx.lineWidth=1;if(z.dash)cx.setLineDash([5,4]);cx.beginPath();cx.moveTo(Math.max(0,x1),y);cx.lineTo(Math.min(rt,x2==null?rt:x2),y);cx.stroke();cx.fillStyle=z.c;cx.font='10px system-ui';cx.fillText(z.label,Math.max(0,x1)+3,y-3)}cx.restore()});
  if(this.sx.vp&&this.view.length){const lr=this.chart.timeScale().getVisibleLogicalRange();if(lr){const a=Math.max(0,Math.floor(lr.from)),b=Math.min(this.view.length-1,Math.ceil(lr.to)),vp=volProfile(this.view.slice(a,b+1));if(vp&&vp.mx>0){cx.save();vp.v.forEach((v,i)=>{const y1=dl.Y(vp.lo+(i+1)*vp.st),y2=dl.Y(vp.lo+i*vp.st);if(y1==null||y2==null)return;const w=v/vp.mx*Math.min(160,dl.W*.25);cx.fillStyle=i===vp.poc?'rgba(255,193,7,.55)':'rgba(120,144,200,.35)';cx.fillRect(rt-w,y1,w,Math.max(1,y2-y1-1))});cx.fillStyle='#ffc107';cx.font='10px system-ui';cx.fillText('VP (approx., from bar volume) POC '+fmt(vp.lo+(vp.poc+.5)*vp.st,2),rt-190,12);cx.restore()}}}}
}
