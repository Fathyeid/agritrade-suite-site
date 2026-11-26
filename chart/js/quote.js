// Stock Quote + News Headlines panel (right-panel tab "Quote", also pop-out floating window). Follows the active chart's symbol.
// Free delayed data: Yahoo Finance (quote and news), SEC EDGAR (filing headlines, US filers). Real timestamps from the sources; nothing is invented.
const QP={floatEl:null,timer:null,seq:0};
const qtime=ms=>ms?new Date(ms).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const qago=ms=>{if(!ms)return '';const m=Math.round((Date.now()-ms)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
async function qpFill(box,sym,mode){const my=(box._seq=(box._seq||0)+1);box.innerHTML='';
 if(!sym||sym.startsWith('SYN:')){box.append(NA('A synthetic spread has no quote or news of its own.'));return}
 const head=el('div',{class:'qhead'}),list=el('div',{class:'qnews'});if(mode!=='news')box.append(head);if(mode!=='quote')box.append(list);head.append(el('span',{class:'mut'},'Loading '+sym+'...'));
 const [s,n,f]=await Promise.allSettled([dget(sym,'summary'),dget(sym,'news'),dget(sym,'filings')]);if(my!==box._seq)return;
 head.innerHTML='';
 if(s.status==='fulfilled'){const v=s.value,pr=v.price||{},pf=v.profile||{},up=(pr.chg||0)>=0,col=up?'var(--g)':'#ef5350';
  head.append(el('div',{style:'font-size:15px'},el('b',{},sym),'  ',el('span',{},pr.name||symName(sym))),
   el('div',{class:'mut',style:'font-size:11px'},[pr.exchange,pf.sector,pf.industry,v.quoteType].filter(Boolean).join(' | ')),
   el('div',{style:'margin:4px 0'},el('b',{style:'font-size:24px;color:'+col},dn(pr.last)||'n/a'),el('span',{style:'margin-left:8px;font-size:14px;color:'+col},(pr.chg!=null?(pr.chg>=0?'+':'')+dn(pr.chg):'')+(pr.chgPct!=null?' ('+(pr.chgPct*100).toFixed(2)+'%)':'')),el('span',{class:'mut',style:'margin-left:6px'},pr.currency||'')),
   el('div',{class:'mut',style:'font-size:10.5px'},'Last trade '+(pr.time?qtime(pr.time*1000)+' (your local time), '+pr.marketState:'time not provided')+' | delayed, Yahoo'+(pr.preMarket?' | pre-market '+dn(pr.preMarket):'')+(pr.postMarket?' | after-hours '+dn(pr.postMarket):'')));
 }else head.append(NA('No quote from Yahoo for '+sym+': '+(s.reason&&s.reason.message||'error')));
 const items=[];
 let ny=n.status==='fulfilled'?n.value.items:[],nsrc='';
 if(!ny.length){try{const nm=((s.status==='fulfilled'&&s.value.price&&s.value.price.name)||symName(sym)).replace(/,?\s*[A-Z][a-z]{2}-\d{4}$/,'').replace(/[^\w\s\-.,&'()+/%$]/g,' ').trim().slice(0,70),r=await fetch('api/news?q='+encodeURIComponent(nm+(s.status==='fulfilled'&&s.value.quoteType==='EQUITY'?' stock':'')));const j=await r.json();if(r.ok&&j.items)ny=j.items.slice(0,20).map(i=>({t:i.time,title:i.title,publisher:i.source,link:i.link,tickers:[]}));nsrc=' (Yahoo had none for this symbol, so Google News search of "'+nm+'")'}catch(e){}}
 if(my!==box._seq)return;
 ny.forEach(i=>items.push({t:i.t,title:i.title,src:i.publisher||'Yahoo Finance',link:i.link,tag:'News',tk:(i.tickers||[]).filter(x=>x!==sym).slice(0,3).join(', ')}));
 if(f.status==='fulfilled')f.value.items.slice(0,12).forEach(i=>items.push({t:i.at||(i.date?Date.parse(i.date+'T00:00:00Z'):null),title:i.form+(i.desc&&i.desc!==i.form?' - '+i.desc:''),src:'SEC EDGAR',link:i.url,tag:'Filing',day:!i.at}));
 items.sort((a,b)=>(b.t||0)-(a.t||0));
 list.append(el('div',{class:'mut',style:'margin:6px 0 2px;font-weight:700'},'News headlines'+(f.status==='fulfilled'?' + SEC filings':'')));
 if(!items.length)list.append(NA('No headlines returned for '+sym+'.'));
 items.slice(0,30).forEach(i=>list.append(el('div',{class:'dnews'},el('span',{class:'qtag '+(i.tag==='Filing'?'f':'')},i.tag),' ',el('a',{href:i.link||'#',target:'_blank',rel:'noopener noreferrer'},i.title),el('div',{class:'mut',style:'font-size:10.5px'},i.src+' | '+(i.day?new Date(i.t).toISOString().slice(0,10)+' (date only)':qtime(i.t)+' ('+qago(i.t)+')')+(i.tk?' | also mentions '+i.tk:'')))));
 list.append(srcNote('Yahoo Finance news search'+nsrc+', SEC EDGAR and Yahoo quote. Delayed and unofficial. Yahoo news matches the symbol and can mention other companies. Headlines and links only'))}
function qpBuild(app,floating){const w=el('div',{class:'qp'}),inp=el('input',{placeholder:'Symbol + Enter',style:'width:130px',title:'Type a symbol and press Enter to load it in the active chart',onkeydown:e=>{if(e.key==='Enter'){const v=e.target.value.trim().toUpperCase();if(v){app.active.sym=v;app.active.load(true);app.syncTopUi();app.saveState();e.target.value=''}}}}),body=el('div',{class:'qbody'});
 const bar=el('div',{class:'row2'},inp,el('button',{title:'Refresh now',onclick:()=>qpFill(body,app.active.sym)},'↻'),floating?el('button',{onclick:()=>{QP.floatEl.remove();QP.floatEl=null}},'Close'):el('button',{title:'Pop out as a floating window you can drag and resize',onclick:()=>qpFloat(app)},'Pop out'));
 w.append(bar,body);w.fill=()=>qpFill(body,app.active.sym);return w}
function qpFloat(app){if(QP.floatEl)return;const w=qpBuild(app,true),box=el('div',{class:'qfloat'},el('div',{class:'qdrag'},'Stock Quote + News'),w);document.body.append(box);QP.floatEl=box;box.w=w;w.fill();
 const d=box.firstChild;let ox,oy,drag=false;d.onmousedown=e=>{drag=true;ox=e.clientX-box.offsetLeft;oy=e.clientY-box.offsetTop;e.preventDefault()};document.addEventListener('mousemove',e=>{if(drag){box.style.left=Math.max(0,e.clientX-ox)+'px';box.style.top=Math.max(0,e.clientY-oy)+'px';box.style.right='auto'}});document.addEventListener('mouseup',()=>drag=false)}
App.prototype.tQuote=function(){const w=qpBuild(this,false);this.tabc.append(w);this._qpTab=w;w.fill()};
const _br=App.prototype.buildRight;App.prototype.buildRight=function(){_br.apply(this,arguments);this.tabDefs.Quote=()=>this.tQuote();this.tabs.append(el('button',{'data-tab':'Quote',onclick:()=>this.showTab('Quote')},'Quote'))};
// follow the active symbol; refresh every 60 s while visible
let _qs=null;const _dr=App.prototype.detRefresh;App.prototype.detRefresh=function(){_dr.apply(this,arguments);const s=this.active&&this.active.sym;if(s&&s!==_qs){_qs=s;if(this.tab==='Quote'&&this._qpTab&&document.body.contains(this._qpTab))this._qpTab.fill();if(QP.floatEl)QP.floatEl.w.fill()}};
setInterval(()=>{if(document.hidden||typeof app==='undefined')return;if(app.tab==='Quote'&&app._qpTab&&document.body.contains(app._qpTab))app._qpTab.fill();if(QP.floatEl)QP.floatEl.w.fill()},60000);
