// Chart settings panel above the chart (Barchart Interactive Chart style). Every control drives the active pane's real options; nothing here is simulated.
// Not available on free data: Open Interest volume type (no free feed), Barchart Trend Seeker. Intraday depth is limited by Yahoo (1m = 7 days, other intraday = 60 days, 1H/4H = 2 years).
(()=>{
const SFX={};'ZS ZC ZW KE ZM ZL ZO ZR ZN ZB'.split(' ').forEach(r=>SFX[r]='CBT');'LE GF HE ES NQ'.split(' ').forEach(r=>SFX[r]='CME');'CL BZ NG HO RB PL'.split(' ').forEach(r=>SFX[r]='NYM');'GC SI HG'.split(' ').forEach(r=>SFX[r]='CMX');'SB KC CT CC OJ DX'.split(' ').forEach(r=>SFX[r]='NYB');
// Barchart-style symbols: ZS*0 = nearby continuous, ZSF27 = a specific contract. Anything else is passed through as a Yahoo symbol.
function mapSym(s){s=s.trim().toUpperCase();if(!s)return null;let m=s.match(/^([A-Z]{1,2})\*[01]$/);if(m)return m[1]==='DX'?'DX-Y.NYB':m[1]+'=F';
 m=s.match(/^([A-Z]{1,2})([FGHJKMNQUVXZ])(\d{2})$/);if(m&&SFX[m[1]])return m[1]+m[2]+m[3]+'.'+SFX[m[1]];return s}
const PERIOD=[['Daily','1D'],['Weekly','1W'],['Monthly','1M'],['Quarterly','3M'],['Yearly','12M'],['Intraday (minutes)','MIN']];
const MINS={1:'1m',5:'5m',15:'15m',30:'30m',60:'1H',240:'4H'};
const RANGES=[['1 Day','1D'],['5 Days','5D'],['1 Month','1M'],['3 Months','3M'],['6 Months','6M'],['Year to date','YTD'],['1 Year','1Y'],['5 Years','5Y'],['All available','All']];
const SIZES={Small:'360px',Medium:'480px',Large:'',XL:'max(700px,calc(100vh - 60px))'};
const DEF={type:'candle',vol:true,box:true,log:false,pct:false,period:'1D',rng:'1Y',size:'Large',ssz:'Small'};
let P=Object.assign({},DEF,Store.get('cpanel',{}));
function build(){
 const app=window.app;if(!app||!app.active||document.getElementById('cpanel'))return;
 const c=document.getElementById('center'),g=document.getElementById('grid');if(!c||!g)return;
 const S=(opts,val)=>{const s=el('select',{});opts.forEach(o=>{const [l,v]=Array.isArray(o)?o:[o,o];s.append(el('option',{value:v},l))});s.value=val;return s};
 const sym=el('input',{type:'text',size:10,placeholder:'ZS*0, ZSF27, CL=F',title:'Barchart style (ZS*0, ZSF27) or any Yahoo symbol'});
 const type=S(Object.entries(CTYPES).filter(([k])=>!['footprint','pnf'].includes(k)).map(([k,v])=>[v,k]),P.type);
 const vol=S([['Contract Volume','1'],['No volume','0'],['Open Interest (not available on free data)','oi']],P.vol?'1':'0');
 const box=el('input',{type:'checkbox'});box.checked=P.box;
 const sc=['Linear','Logarithmic'].map((l,i)=>el('input',{type:'radio',name:'cpsc'}));const pr=['Price','% Change'].map(()=>el('input',{type:'radio',name:'cppr'}));
 sc[P.log?1:0].checked=true;pr[P.pct?1:0].checked=true;
 const size=S(Object.keys(SIZES),P.size);
 const per=S(PERIOD,P.period),mins=el('input',{type:'number',min:1,max:240,placeholder:'Mins',style:'width:60px'}),rng=S(RANGES,P.rng);
 const d1=el('input',{type:'date'}),d2=el('input',{type:'date'});
 const study=S([['--- Add Technical Study ---','']].concat(INDKEYS.filter(k=>!IND[k].pre).map(k=>[IND[k].n,k])),'');
 const ssz=S(['Small','Medium','Large'],P.ssz);
 const L=t=>el('label',{class:'cpl'},t);
 const row=(...k)=>el('div',{class:'cprow'},...k);
 const note=el('div',{class:'mut',style:'font-size:11px;padding:2px 6px'},'Data: Yahoo Finance, delayed. Volume is contract volume where Yahoo provides it; Open Interest is not available free. Intraday depth is limited by the free feed (1m: 7 days, 5-30m: 60 days, 1H/4H: 2 years).');
 const body=el('div',{class:'cpbody'},
  row(L('Enter Symbol:'),sym,el('span',{class:'sp'}),L('Chart Type:'),S(['Basic Chart'],'Basic Chart')),
  row(L('Settings:'),type,vol,el('label',{},box,' Price Box'),el('span',{class:'sp'}),L('Chart Size:'),size),
  row(el('label',{},sc[0],' Linear Scale'),el('label',{},sc[1],' Logarithmic Scale'),el('span',{class:'sep'}),el('label',{},pr[0],' Price Scale'),el('label',{},pr[1],' % Change Scale')),
  row(L('Period:'),per,mins,L('Mins.'),rng,L('or'),d1,el('span',{},'-'),d2),
  row(L('Study:'),study,el('button',{type:'button',onclick:()=>{const p=app.active;if(!study.value)return toast('Pick a study first');p.inds.push({id:uid(),key:study.value,p:{},colors:[]});p.build(false);app.saveState();toast(IND[study.value].n+' added');study.value=''}},'Add Study'),el('span',{class:'sp'}),L('Study Size:'),ssz),
  row(el('button',{type:'button',onclick:()=>{Store.set('cptpl',snap());toast('Template saved')}},'Save As Template'),el('button',{type:'button',onclick:()=>{const t=Store.get('cptpl',null);if(!t)return toast('No template saved yet');apply(t);fill(t);toast('Template applied')}},'Load Template'),el('button',{type:'button',onclick:reset},'Reset'),el('span',{class:'sp'}),el('button',{type:'button',class:'cpdraw',onclick:()=>draw()},'DRAW CHART')),
  note);
 const hd=el('div',{class:'cphd',onclick:()=>{body.style.display=body.style.display==='none'?'':'none';Store.set('cpopen',body.style.display!=='none')}},'Chart settings (Barchart-style panel) \u25BE');
 const wrap=el('div',{id:'cpanel'},hd,body);c.insertBefore(wrap,g);
 const open=Store.get('cpopen',innerWidth>850);body.style.display=open?'':'none';
 const snap=()=>({sym:sym.value,type:type.value,vol:vol.value==='1',box:box.checked,log:sc[1].checked,pct:pr[1].checked,size:size.value,period:per.value,mins:mins.value,rng:rng.value,d1:d1.value,d2:d2.value,ssz:ssz.value});
 function fill(t){if(t.sym!=null)sym.value=t.sym;type.value=t.type;vol.value=t.vol?'1':'0';box.checked=!!t.box;sc[t.log?1:0].checked=true;pr[t.pct?1:0].checked=true;size.value=t.size;per.value=t.period;mins.value=t.mins||'';rng.value=t.rng;d1.value=t.d1||'';d2.value=t.d2||'';ssz.value=t.ssz}
 function apply(t){const p=app.active;if(!p)return;
  if(t.sym){const s=mapSym(t.sym);if(s&&s!==p.sym){app.setSymbol(s);}}
  let tf=t.period;if(tf==='MIN'){const m=+t.mins||5;const ks=Object.keys(MINS).map(Number),best=ks.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a);tf=MINS[best];if(best!==m)toast('Intraday bars available: 1,5,15,30,60,240 min. Using '+best+' min.')}
  p.tf=tf;p.type=t.type;p.vol=!!t.vol;p.log=!!t.log&&!t.pct;p.pct=!!t.pct;p.rng=t.rng;p._cpbox=!!t.box;p._cpssz=t.ssz;
  const gr=document.getElementById('grid');if(gr)gr.style.height=SIZES[t.size]||'';
  Store.set('cpanel',{type:t.type,vol:t.vol,box:t.box,log:t.log,pct:t.pct,period:t.period,rng:t.rng,size:t.size,ssz:t.ssz});
  const custom=t.d1&&t.d2;p._cpdates=custom?[Date.parse(t.d1)/1000,Date.parse(t.d2)/1000]:null;
  p.load(true);app.syncTopUi();app.saveState()}
 function draw(){if(d1.value&&d2.value&&d1.value>d2.value)return toast('Start date is after the end date','err');apply(snap())}
 function reset(){fill(Object.assign({sym:app.active.sym},DEF,{mins:''}));const p=app.active;p.inds=[];p.cmp=[];apply(Object.assign({sym:''},DEF,{mins:'',d1:'',d2:''}))}
 // keep the panel in sync with the active pane
 const sync=()=>{const p=app.active;if(!p)return;sym.value=p.sym.replace('=F','*0');type.value=p.type;vol.value=p.vol?'1':'0';sc[p.log?1:0].checked=true;pr[p.pct?1:0].checked=true;
  if(INTRA(p.tf)){per.value='MIN';const e=Object.entries(MINS).find(([,v])=>v===p.tf);mins.value=e?e[0]:''}else{per.value=p.tf;mins.value=''}if(p.rng)rng.value=p.rng};
 const os=app.syncTopUi.bind(app);app.syncTopUi=function(){os();try{sync()}catch(e){}};
 sym.addEventListener('keydown',e=>{if(e.key==='Enter')draw()});
 sync();
}
// after every chart build: Price Box (last price label/line), custom date range, study pane sizes
const ob=Pane.prototype.build;
Pane.prototype.build=function(reset){ob.call(this,reset);try{
  if(this.main&&this._cpbox!==undefined)this.main.applyOptions({lastValueVisible:this._cpbox,priceLineVisible:this._cpbox});
  if(this._cpdates&&reset&&this.view.length){const [a,b]=this._cpdates;this.chart.timeScale().setVisibleRange({from:a,to:b})}
  if(this._cpssz){const pn=this.chart.panes?this.chart.panes():[];const f={Small:.25,Medium:.4,Large:.6}[this._cpssz]||.25;pn.forEach((x,i)=>{if(i>0&&x.setStretchFactor)x.setStretchFactor(f)});if(pn[0]&&pn[0].setStretchFactor)pn[0].setStretchFactor(1)}
 }catch(e){}};
window.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{build();if(document.getElementById('cpanel')||++n>40)clearInterval(t)},250)});
})();
