// Dashboard mode: one 12x12 grid of movable/resizable widgets (charts, scanner tables, quote, news). Free delayed data only.
// Linked symbol: click a scanner row, type in the dashboard box, or change a linked chart; every linked widget follows.
const DASH={open:false,w:[],sym:'NVDA',panes:new Map(),timers:[],menu:null};
const DCH=(sym,tf)=>({type:'chart',opt:{sym,tf,link:true}});
const DPRESETS={
 'Day-trade (scanners + quote/news + 4 charts)':()=>[
  {type:'scr',x:0,y:0,w:3,h:6,opt:{scr:'stocks',sort:['c1',-1]}},{type:'scr',x:0,y:6,w:3,h:6,opt:{scr:'commod',sort:['c1',-1]}},
  {type:'quote',x:3,y:0,w:3,h:4,opt:{}},{type:'news',x:3,y:4,w:3,h:8,opt:{}},
  {...DCH('NVDA','5m'),x:6,y:0,w:3,h:6},{...DCH('NVDA','1m'),x:9,y:0,w:3,h:6},{...DCH('NVDA','1D'),x:6,y:6,w:3,h:6},{...DCH('NVDA','15m'),x:9,y:6,w:3,h:6}],
 'Research (big chart + quote + news)':()=>[{...DCH('NVDA','1D'),x:0,y:0,w:8,h:12},{type:'quote',x:8,y:0,w:4,h:4,opt:{}},{type:'news',x:8,y:4,w:4,h:8,opt:{}}],
 'Scanner + 2 charts':()=>[{type:'scr',x:0,y:0,w:5,h:12,opt:{scr:'stocks',sort:['c1',-1]}},{...DCH('NVDA','1D'),x:5,y:0,w:7,h:6},{...DCH('NVDA','15m'),x:5,y:6,w:7,h:6}],
 'Futures desk (6 charts)':()=>['ZS=F','ZC=F','ZW=F','ZM=F','ZL=F','KC=F'].map((s,i)=>({type:'chart',opt:{sym:s,tf:'1D',link:false},x:(i%3)*4,y:Math.floor(i/3)*6,w:4,h:6}))};
const DSTYLE=w=>`grid-column:${w.x+1}/span ${w.w};grid-row:${w.y+1}/span ${w.h}`;
DASH.save=()=>{DASH.w.forEach(w=>{if(w.type==='chart'&&w.pane){w.opt={...w.pane.state(),link:w.opt.link,inds:undefined,sym:w.pane.sym,tf:w.pane.tf}}});
 Store.set('dash',{sym:DASH.sym,w:DASH.w.map(({pane,el,...r})=>r)})};
DASH.setSym=(sym,from)=>{sym=String(sym).trim().toUpperCase();if(!sym)return;DASH.sym=sym;if(DASH.input)DASH.input.placeholder='Linked: '+sym;
 DASH.w.forEach(w=>{if(w===from)return;if(w.type==='chart'&&w.opt.link&&w.pane&&w.pane.sym!==sym){w.pane.sym=sym;w.pane.load(true)}if(w.type==='quote'||w.type==='news')DASH.fillW(w)});DASH.save()};
DASH.fillW=w=>{if(w.type==='quote')qpFill(w.body,DASH.sym,'quote');else if(w.type==='news')qpFill(w.body,DASH.sym,'news')};
DASH.mkChart=w=>{const o=w.opt,st={sym:o.link?DASH.sym:(o.sym||DASH.sym),tf:o.tf||'1D',type:o.type,log:o.log,inds:(o.inds&&o.inds.length)?o.inds:[{id:uid(),key:'ema',p:{n:20},colors:['#ffeb3b']},{id:uid(),key:'ema',p:{n:50},colors:['#ff9800']}],rng:null};
 const p=new Pane(app,st);w.pane=p;p.dwLink=()=>w.opt.link;p.closeBtn.style.display='none';w.body.append(p.el);p.load(true);return p};
DASH.mkScr=w=>{const d=SCR.dashDef(SCR.defs[w.opt.scr]||SCR.defs[SCR.order[0]]);w.body.innerHTML='';
 {const sv=Store.get('scr_'+d.id,{});if(!sv.dashSet2){const ks=d.fields.map(f=>f.k);Store.set('scr_'+d.id,{...sv,dashSet2:1,sort:sv.sort||w.opt.sort,cols:sv.cols||['sym','price','c1','gap','vol','rvol','float','short','flag'].filter(k=>ks.includes(k))})}}
 const box=el('div',{class:'dscr'});box._pick=id=>DASH.setSym(id,null);w.body.append(box);SCR.mount(box,d);
w.box=box;w.body.append(el('div',{class:'mut',style:'font-size:9.5px;padding:2px 6px;flex:none'},'Colours: fixed scales. Rel vol = daily volume vs 20-day avg (not intraday). Float/Short: top 30 rows, Yahoo, n/a if missing. Running Up needs a real-time feed: not computed.'))};
const dov=(a,b)=>a!==b&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
// push overlapping widgets down; returns false if something would fall off the 12-row grid
DASH.resolve=act=>{const q=[act];let guard=0;while(q.length&&guard++<500){const a=q.shift();for(const o of DASH.w){if(dov(a,o)){o.y=a.y+a.h;if(o.y+o.h>12)return false;q.push(o)}}}return true};
DASH.snap=()=>DASH.w.map(w=>[w,w.x,w.y,w.w,w.h]);DASH.restore=sn=>sn.forEach(([w,x,y,ww,h])=>{w.x=x;w.y=y;w.w=ww;w.h=h});
DASH.paint=()=>DASH.w.forEach(w=>w.el&&w.el.setAttribute('style',DSTYLE(w)));
DASH.free=(ww,hh)=>{for(let y=0;y+hh<=12;y++)for(let x=0;x+ww<=12;x++){const t={x,y,w:ww,h:hh};if(!DASH.w.some(o=>dov(t,o)))return [x,y]}return null};
DASH.addW=w=>{w={x:0,y:0,w:4,h:4,...w,id:uid()};w.opt=w.opt||{};if(w.auto){const f=DASH.free(w.w,w.h);if(f){w.x=f[0];w.y=f[1]}delete w.auto}DASH.w.push(w);const sn=DASH.snap();if(!DASH.resolve(w)){DASH.restore(sn);const f=DASH.free(Math.min(w.w,3),Math.min(w.h,3));if(!f){DASH.w.pop();toast('Dashboard is full: close or shrink a widget first','alert');return null}w.x=f[0];w.y=f[1];w.w=Math.min(w.w,3);w.h=Math.min(w.h,3)}DASH.build1(w);DASH.paint();DASH.save();return w};
DASH.build1=w=>{const g=DASH.grid,isC=w.type==='chart';
 const title={chart:'Chart',scr:'Scanner',quote:'Quote',news:'News & filings'}[w.type];
 w.body=el('div',{class:'dwb'});
 const hd=el('div',{class:'dwh'},el('span',{class:'dwt'},title));
 if(isC)hd.append(el('button',{class:w.opt.link?'on':'',title:'Linked: follows the dashboard symbol',onclick:e=>{w.opt.link=!w.opt.link;e.target.classList.toggle('on',w.opt.link);if(w.opt.link&&w.pane&&w.pane.sym!==DASH.sym){w.pane.sym=DASH.sym;w.pane.load(true)}DASH.save()}},'link'));
 if(w.type==='scr'){const sel=el('select',{onchange:e=>{w.opt.scr=e.target.value;DASH.mkScr(w);DASH.save()}},...SCR.order.map(id=>el('option',{value:id,selected:id===(w.opt.scr||SCR.order[0])},SCR.defs[id].short||id)));hd.append(sel,el('button',{title:'Show / hide filters, presets and columns',onclick:()=>w.box&&w.box.classList.toggle('dopen')},'filters'))}
 hd.append(el('span',{class:'sp'}),el('button',{title:'Remove widget',onclick:()=>DASH.rm(w)},'×'));
 const rz=el('div',{class:'dwr',title:'Drag to resize'});
 w.el=el('div',{class:'dw',style:DSTYLE(w)},hd,w.body,rz);g.append(w.el);
 const grab=(e,mode)=>{if(innerWidth<=850||e.target.closest('button,select,input'))return;e.preventDefault();const r=g.getBoundingClientRect(),cw=r.width/12,ch=r.height/12,sx=e.clientX,sy=e.clientY,o={x:w.x,y:w.y,w:w.w,h:w.h},sn=DASH.snap();w.el.classList.add('drag');
  const mv=ev=>{const dx=Math.round((ev.clientX-sx)/cw),dy=Math.round((ev.clientY-sy)/ch);const nx=mode==='m'?Math.max(0,Math.min(12-w.w,o.x+dx)):Math.max(2,Math.min(12-w.x,o.w+dx)),ny=mode==='m'?Math.max(0,Math.min(12-w.h,o.y+dy)):Math.max(2,Math.min(12-w.y,o.h+dy));DASH.restore(sn);if(mode==='m'){w.x=nx;w.y=ny}else{w.w=nx;w.h=ny}if(!DASH.resolve(w)){DASH.restore(sn)}DASH.paint()};
  const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);w.el.classList.remove('drag');DASH.save();setTimeout(()=>DASH.w.forEach(x=>x.pane&&x.pane.dl.redraw()),150)};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)};
 hd.addEventListener('mousedown',e=>grab(e,'m'));rz.addEventListener('mousedown',e=>grab(e,'r'));
 if(isC)DASH.mkChart(w);else if(w.type==='scr')DASH.mkScr(w);else DASH.fillW(w)};
DASH.rm=w=>{if(w.pane){w.pane.destroy()}w.el.remove();DASH.w=DASH.w.filter(x=>x!==w);DASH.save()};
DASH.clear=()=>{DASH.w.forEach(w=>{w.pane&&w.pane.destroy();w.el&&w.el.remove()});DASH.w=[]};
DASH.preset=name=>{DASH.clear();DPRESETS[name]().forEach(w=>DASH.addW(w))};
DASH.show=()=>{if(DASH.open)return;DASH.open=true;DASH.rightWas=$('#right').classList.contains('hide');$('#right').classList.add('hide');app._scrNoPick=false;$('#center').style.display='none';const D=$('#dash');D.style.display='flex';D.innerHTML='';
 DASH.input=el('input',{placeholder:'Linked: '+DASH.sym,style:'width:150px',title:'Type a symbol and press Enter: every linked widget follows',onkeydown:e=>{if(e.key==='Enter'&&e.target.value.trim()){DASH.setSym(e.target.value,null);e.target.value=''}}});
 const ps=el('select',{onchange:e=>{if(e.target.value){DASH.preset(e.target.value);e.target.value=''}}},el('option',{value:''},'Layout preset...'),...Object.keys(DPRESETS).map(k=>el('option',{value:k},k)));
 const add=el('select',{onchange:e=>{const t=e.target.value;e.target.value='';if(!t)return;const sz={chart:[4,6],scr:[4,6],quote:[3,3],news:[3,6],contracts:[5,6]}[t];DASH.addW({type:t,auto:1,w:sz[0],h:sz[1],opt:t==='chart'?{sym:DASH.sym,tf:'1D',link:true}:t==='scr'?{scr:'stocks'}:{}})}},el('option',{value:''},'+ Add widget'),el('option',{value:'chart'},'Chart'),el('option',{value:'scr'},'Scanner table'),el('option',{value:'quote'},'Quote'),el('option',{value:'news'},'News & filings'),el('option',{value:'contracts'},'Futures contracts'));
 const bar=el('div',{class:'dbar'},el('b',{},'Dashboard'),DASH.input,ps,add,el('button',{onclick:()=>{if(confirm('Remove all widgets and restore the default day-trade layout?'))DASH.preset(Object.keys(DPRESETS)[0])}},'Reset'),el('span',{class:'sp'}),el('span',{class:'mut',style:'font-size:10.5px'},'Drag a title bar to move, bottom-right corner to resize. Data delayed (Yahoo / SEC / Google), not real-time.'),el('button',{onclick:()=>DASH.hide()},'Close'));
 DASH.grid=el('div',{class:'dgrid'});D.append(bar,DASH.grid);
 const sv=Store.get('dash',null);if(sv&&sv.w&&sv.w.length){DASH.sym=sv.sym||DASH.sym;DASH.input.placeholder='Linked: '+DASH.sym;sv.w.forEach(w=>DASH.addW({...w}))}else DASH.preset(Object.keys(DPRESETS)[0]);
 DASH.timers=[setInterval(()=>{if(!document.hidden){DASH.w.forEach(w=>{if(w.type==='quote'||w.type==='news'||w.type==='contracts')DASH.fillW(w);if(w.pane)w.pane.load(false)});DASH.save()}},60000)];
 if(DASH.btn)DASH.btn.classList.add('on')};
DASH.hide=()=>{if(!DASH.open)return;DASH.save();DASH.open=false;DASH.timers.forEach(clearInterval);DASH.clear();$('#dash').style.display='none';$('#center').style.display='';if(!DASH.rightWas)$('#right').classList.remove('hide');if(DASH.btn)DASH.btn.classList.remove('on');if(app.panes[0])app.activate(app.panes[0]);setTimeout(()=>app.panes.forEach(p=>p.dl.redraw()),150)};
const _bt3=App.prototype.buildTop;App.prototype.buildTop=function(){_bt3.call(this);DASH.btn=el('button',{title:'Dashboard: scanner tables + quote + news + charts in one grid',onclick:()=>DASH.open?DASH.hide():DASH.show()},'Dashboard');this.btnPat.before(DASH.btn)};
const _bd=App.prototype.buildDetail;App.prototype.buildDetail=function(){const m=$('#mid'),c=$('#center');if(m&&!$('#dash')){const d=el('div',{id:'dash',style:'display:none'});c.after(d)}return _bd.apply(this,arguments)};
// a linked chart that changes symbol drives the dashboard
const _pb2=App.prototype.paneBuilt;App.prototype.paneBuilt=function(p){if(_pb2)_pb2.call(this,p);if(DASH.open){const w=DASH.w.find(x=>x.pane===p);if(w&&w.opt.link&&p.sym!==DASH.sym)DASH.setSym(p.sym,w);else if(w)DASH.save()}};
