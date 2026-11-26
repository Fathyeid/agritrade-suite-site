// M1 leftovers: trading-session shading + keyboard shortcut editor
const SESS_DEF=()=>({on:false,labels:true,list:[
 {n:'Asia (Tokyo/HK)',f:'00:00',t:'08:00',c:'#7e57c2',on:true,tz:'utc'},
 {n:'London',f:'07:00',t:'16:00',c:'#26a69a',on:true,tz:'utc'},
 {n:'New York',f:'13:30',t:'20:00',c:'#ff9800',on:true,tz:'utc'},
 {n:'Exchange regular day',f:'09:30',t:'16:00',c:'#42a5f5',on:false,tz:'exch'}]});
const SESS={get(){const d=Store.get('sess',null);return d||SESS_DEF()},set(d){Store.set('sess',d)},
 mins(s){const [h,m]=String(s).split(':').map(Number);return (h||0)*60+(m||0)}};
// draw before structure/drawings
const _ds=Pane.prototype.drawStructure;
Pane.prototype.drawStructure=function(cx,dl){
 try{const S=SESS.get();if(S.on&&INTRA(this.tf)&&this.view.length>2)this.drawSessions(cx,dl,S)}catch(e){}
 return _ds.call(this,cx,dl)};
Pane.prototype.drawSessions=function(cx,dl,S){
 const v=this.view,off=(this.meta&&this.meta.gmtoffset)||0,H=dl.H,ts=this.chart.timeScale();
 const lr=ts.getVisibleLogicalRange();if(!lr)return;const i0=Math.max(0,Math.floor(lr.from)-1),i1=Math.min(v.length-1,Math.ceil(lr.to)+1);
 const co=i=>ts.logicalToCoordinate(i);
 S.list.filter(s=>s.on).forEach(s=>{const a=SESS.mins(s.f),b=SESS.mins(s.t);cx.save();cx.fillStyle=s.c+'22';let runStart=null,lastX=null;
  const flush=(xEnd,lab)=>{if(runStart!=null){cx.fillRect(runStart,0,Math.max(1,xEnd-runStart),H);if(S.labels&&lab&&xEnd-runStart>46){cx.fillStyle=s.c+'cc';cx.font='10px sans-serif';cx.fillText(s.n,runStart+3,11);cx.fillStyle=s.c+'22'}}runStart=null};
  for(let i=i0;i<=i1;i++){const tt=v[i].time-(s.tz==='utc'?off:0);const m=((Math.floor(tt/60)%1440)+1440)%1440;
   const inn=a<=b?(m>=a&&m<b):(m>=a||m<b);const x=co(i),xn=co(i+1);if(x==null)continue;const half=xn!=null?(xn-x)/2:3;
   if(inn){if(runStart==null)runStart=x-half;lastX=x+half}else flush(lastX,true)}
  flush(lastX,true);cx.restore()});
 };
// ---------- shortcuts ----------
const SC_ACTIONS=[['search','Symbol search'],['indicators','Indicators'],['undo','Undo drawing'],['tool_trend','Tool: Trend line'],['tool_hline','Tool: Horizontal line'],['tool_vline','Tool: Vertical line'],['tool_fibret','Tool: Fib retracement'],['tool_rect','Tool: Rectangle'],['tool_long','Tool: Long position'],['sessions','Toggle session shading'],['log','Toggle log scale'],['vol','Toggle volume'],['pct','Toggle % scale'],['patterns','Toggle patterns'],['cancel','Cancel tool / deselect'],['tf1','Timeframe 1 (1st in list)'],['tf2','Timeframe 2'],['tf3','Timeframe 3'],['tf4','Timeframe 4'],['tf5','Timeframe 5'],['tf6','Timeframe 6'],['tf7','Timeframe 7'],['tf8','Timeframe 8'],['tf9','Timeframe 9']];
const SC_DEF={search:'/',indicators:'I',undo:'Ctrl+Z',tool_trend:'Alt+T',tool_hline:'Alt+H',tool_vline:'Alt+V',tool_fibret:'Alt+F',tool_rect:'Alt+R',tool_long:'Alt+L',sessions:'Alt+S',log:'Alt+G',vol:'',pct:'',patterns:'',cancel:'Escape',tf1:'1',tf2:'2',tf3:'3',tf4:'4',tf5:'5',tf6:'6',tf7:'7',tf8:'8',tf9:'9'};
const SC={get(){return {...SC_DEF,...Store.get('shortcuts',{})}},
 combo(e){const k=e.key;if(['Control','Shift','Alt','Meta'].includes(k))return null;const p=[];if(e.ctrlKey||e.metaKey)p.push('Ctrl');if(e.altKey)p.push('Alt');if(e.shiftKey&&k.length>1)p.push('Shift');p.push(k.length===1?k.toUpperCase():k);return p.join('+')},
 conflicts(m){const seen={},c=[];Object.entries(m).forEach(([a,k])=>{if(!k)return;if(seen[k])c.push([seen[k],a,k]);else seen[k]=a});return c}};
App.prototype.runAction=function(a){const p=this.active,dl=p.dl;
 if(a==='search')return this.symbolSearch();if(a==='indicators')return this.indicators();if(a==='undo')return dl.undo();
 if(a==='cancel'){dl.setTool(null);dl.sel=null;dl.redraw();return this.selChanged()}
 if(a.startsWith('tool_'))return dl.setTool(a.slice(5));
 if(a==='sessions'){const S=SESS.get();S.on=!S.on;SESS.set(S);this.panes.forEach(x=>x.dl.redraw());if(S.on&&!INTRA(p.tf))toast('Session shading only shows on intraday timeframes (1m to 4H)');return}
 if(a==='log'||a==='vol'||a==='pct'||a==='patterns'){const k={log:'log',vol:'vol',pct:'pct',patterns:'pat'}[a];p[k]=!p[k];p.build(false);this.syncTopUi();this.saveState();return}
 if(/^tf[1-9]$/.test(a)){const k=Object.keys(TF)[+a[2]-1];if(k){p.tf=k;p.rng=null;p.load(true);this.syncTopUi();this.saveState()}}};
const _key=App.prototype.key;
App.prototype.key=function(e){const tg=e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||document.querySelector('.mbg'))return;
 const c=SC.combo(e);if(c){const m=SC.get();const a=Object.keys(m).find(x=>m[x]&&m[x].toLowerCase()===c.toLowerCase());if(a){e.preventDefault();this.runAction(a);return}}
 // fixed keys: Delete/Backspace
 if(e.key==='Delete'||e.key==='Backspace'){const dl=this.active.dl;if(dl.selected()){e.preventDefault();dl.delSel()}}};
App.prototype.shortcutEditor=function(){const f=el('div'),m=SC.get(),inputs={};
 f.append(el('p',{class:'mut'},'Click a box and press the key combination you want. Backspace in the box clears it. Delete/Backspace on a chart always deletes the selected drawing. Saved in this browser only.'));
 const t=el('table',{});SC_ACTIONS.forEach(([a,l])=>{const i=el('input',{readonly:true,value:m[a]||'',style:'width:130px;text-align:center',placeholder:'none'});inputs[a]=i;
  i.addEventListener('keydown',e=>{e.preventDefault();e.stopPropagation();if(e.key==='Backspace'||e.key==='Delete'){i.value='';return}const c=SC.combo(e);if(c)i.value=c});
  t.append(el('tr',{},el('td',{style:'text-align:left'},l),el('td',{},i),el('td',{class:'mut'},'default: '+(SC_DEF[a]||'none'))))});
 const warn=el('p',{style:'color:#ffb300;font-weight:600'});
 const save=el('button',{onclick:()=>{const n={};SC_ACTIONS.forEach(([a])=>n[a]=inputs[a].value);const cf=SC.conflicts(n);if(cf.length){warn.textContent='Conflict: '+cf.map(x=>x[2]+' is used twice ('+x[0]+', '+x[1]+')').join('; ')+'. Not saved. Fix it first.';warn.scrollIntoView({block:'nearest'});return}Store.set('shortcuts',n);toast('Shortcuts saved');document.querySelector('.mbg')&&document.querySelector('.mbg').remove()}},'Save');
 const rst=el('button',{onclick:()=>{Store.set('shortcuts',{});SC_ACTIONS.forEach(([a])=>inputs[a].value=SC_DEF[a]);warn.textContent='Defaults restored and saved.'}},'Reset to defaults');
 f.insertBefore(warn,f.firstChild);f.append(t,el('div',{class:'row2'},save,rst));modal('Keyboard shortcuts',f,{wide:true})};
App.prototype.sessionMenu=function(){const f=el('div'),S=SESS.get();
 f.append(el('p',{class:'mut'},'Shades the chart background for each trading window on intraday timeframes (1m to 4H). "UTC" windows are fixed UTC clock times and do not follow daylight saving. "Exchange" windows use the exchange local clock of the symbol. Windows are editable. Bars come from Yahoo, which usually returns regular-session bars only, so a window outside them shows nothing.'));
 const on=el('input',{type:'checkbox',checked:S.on}),lb=el('input',{type:'checkbox',checked:S.labels});
 f.append(el('label',{},on,' Show session shading '),el('label',{style:'margin-left:12px'},lb,' labels'));
 const t=el('table',{});t.append(el('tr',{},...['On','Name','From','To','Clock','Colour'].map(h=>el('th',{},h))));const rows=[];
 S.list.forEach(s=>{const r={on:el('input',{type:'checkbox',checked:s.on}),n:el('input',{value:s.n,style:'width:140px'}),f:el('input',{type:'time',value:s.f}),t:el('input',{type:'time',value:s.t}),tz:el('select',{},el('option',{value:'utc'},'UTC'),el('option',{value:'exch'},'Exchange')),c:el('input',{type:'color',value:s.c})};r.tz.value=s.tz;rows.push(r);t.append(el('tr',{},...['on','n','f','t','tz','c'].map(k=>el('td',{},r[k]))))});
 const ap=el('button',{onclick:()=>{const n={on:on.checked,labels:lb.checked,list:rows.map(r=>({n:r.n.value,f:r.f.value||'00:00',t:r.t.value||'00:00',c:r.c.value,on:r.on.checked,tz:r.tz.value}))};SESS.set(n);this.panes.forEach(p=>p.dl.redraw());this.active&&!INTRA(this.active.tf)&&n.on&&toast('Switch to an intraday timeframe to see the shading');document.querySelector('.mbg')&&document.querySelector('.mbg').remove()}},'Apply');
 f.append(t,el('div',{class:'row2'},ap));modal('Trading sessions',f,{wide:true})};
const _bt=App.prototype.buildTop;
App.prototype.buildTop=function(){_bt.call(this);const t=$('#top'),ref=this.btnPat;
 ref.before(el('button',{title:'Trading-session shading',onclick:()=>this.sessionMenu()},'Sessions'),el('button',{title:'Keyboard shortcuts',onclick:()=>this.shortcutEditor()},'⌨ Keys'))};
