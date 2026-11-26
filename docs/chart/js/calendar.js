// Calendar tab modelled on TradingView's Calendar: week strip with counts, Economic / Earnings / Dividends / IPO tabs, category filter, Today / prev / next.
// REAL: earnings, dividends, IPO (Nasdaq public API, US listings only). Economic: free weekly feed, CURRENT WEEK ONLY, Forecast + Prior, NO Actual. Nothing is invented; missing cells show a dash.
(()=>{
App.prototype.tCalendarMine=App.prototype.tCalendar;
const CUR={USD:['US','United States'],EUR:['EU','Euro area'],GBP:['GB','United Kingdom'],JPY:['JP','Japan'],AUD:['AU','Australia'],NZD:['NZ','New Zealand'],CAD:['CA','Canada'],CHF:['CH','Switzerland'],CNY:['CN','China']};
const flag=c=>{const x=CUR[c];return x?String.fromCodePoint(...[...x[0]].map(ch=>127397+ch.charCodeAt(0))):''};
const CATS=[['Bonds',/auction|bond|treasury|yield/i],['Prices',/cpi|ppi|pce|inflation|price index|deflator/i],['Labor',/employ|payroll|jobless|unemploy|claims|jolts|wage|earnings/i],['GDP',/gdp/i],['Housing',/housing|home|building|mortgage|construction|permits/i],['Consumer',/retail|consumer|confidence|sentiment|spending|income/i],['Business',/pmi|ism|industrial|factory|manufactur|business|orders|inventor|production|capacity/i],['Trade',/trade|export|import|current account/i],['Money',/rate|fomc|fed |boe|ecb|boj|monetary|m2|money|minutes|speaks|speech/i],['Government',/budget|govern|debt/i],['Health',/health|hospital/i],['Taxes',/tax/i]];
const catOf=t=>{const c=CATS.find(([,re])=>re.test(t));return c?c[0]:'Other'};
const iso=d=>d.toISOString().slice(0,10);
const monday=d=>{const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const w=(x.getUTCDay()+6)%7;return new Date(x.getTime()-w*864e5)};
const fmtD=s=>new Date(s+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const money=n=>n==null?'-':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(1)+'M':'$'+n.toLocaleString();
const eps=n=>n==null?'-':(n<0?'-':'')+'$'+Math.abs(n).toFixed(2);
const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
const bars=i=>{const n=i==='High'?3:i==='Medium'?2:i==='Low'?1:0;return '▮'.repeat(n)+'▯'.repeat(3-n)};
const cache={};
App.prototype.tCalendar=function(){
 const c=this.tabc,self=this;const st=Store.get('cal',{tab:'Economic',off:0,day:null,cat:'All categories',imp:'All'});
 const sv=()=>Store.set('cal',st);
 const wk=monday(new Date());wk.setTime(wk.getTime()+st.off*7*864e5);const start=iso(wk),today=iso(new Date());
 const head=el('div',{class:'card'});c.append(head);const body=el('div');c.append(body);
 const render=d=>{
  head.innerHTML='';body.innerHTML='';
  const day=st.day&&d.days.some(x=>x.date===st.day)?st.day:(d.days.some(x=>x.date===today)?today:d.days[0].date);
  const ecoBy=dt=>(d.economic||[]).filter(e=>new Date(e.t).toLocaleDateString('en-CA')===dt);
  const ipoBy=dt=>d.ipo.priced.filter(x=>x.date===dt);
  const cnt=x=>({Economic:d.economic?ecoBy(x.date).length:null,Earnings:x.earnings.length,Dividends:x.dividends.length,IPO:ipoBy(x.date).length});
  const nav=el('div',{class:'row2'},el('button',{onclick:()=>{st.off=0;st.day=null;sv();self.showTab('Calendar')}},'Today'),el('button',{onclick:()=>{st.off--;st.day=null;sv();self.showTab('Calendar')}},'‹'),el('button',{onclick:()=>{st.off++;st.day=null;sv();self.showTab('Calendar')}},'›'),el('b',{},fmtD(d.days[0].date)+' - '+fmtD(d.days[6].date)+', '+d.days[6].date.slice(0,4)),el('span',{class:'mut'},'Times shown in '+tz));
  head.append(nav);
  const strip=el('div',{style:'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:6px 0'});
  d.days.forEach(x=>{const k=cnt(x),on=x.date===day;strip.append(el('div',{style:'border:1px solid '+(on?'#6ea8ff':'#2a2f3a')+';border-radius:6px;padding:4px;cursor:pointer;font-size:10px;background:'+(on?'#1b2230':'transparent'),onclick:()=>{st.day=x.date;sv();render(d)}},el('b',{},new Date(x.date+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'short',day:'numeric',timeZone:'UTC'})+(x.date===today?' •':'')),...['Economic','Earnings','Dividends','IPO'].map(t=>k[t]?el('div',{class:'mut'},t+' '+k[t]):null).filter(Boolean),!Object.values(k).some(v=>v)?el('div',{class:'mut'},'No events'):null))});
  head.append(strip);
  const tabs=el('div',{class:'row2'});['Economic','Earnings','Dividends','IPO'].forEach(t=>tabs.append(el('button',{class:st.tab===t?'on':'',onclick:()=>{st.tab=t;sv();render(d)}},t)));
  if(st.tab==='Economic'){const cs=el('select',{onchange:()=>{st.cat=cs.value;sv();render(d)}},...['All categories',...CATS.map(x=>x[0]),'Other'].map(x=>el('option',{value:x,selected:x===st.cat},x)));const im=el('select',{onchange:()=>{st.imp=im.value;sv();render(d)}},...['All','Medium+','High'].map(x=>el('option',{value:x,selected:x===st.imp},'Importance: '+x)));tabs.append(cs,im)}
  head.append(tabs);
  const rec=d.days.find(x=>x.date===day);
  const tbl=(cols,rows,empty)=>{if(!rows.length){body.append(el('p',{class:'mut'},empty));return}const t=el('table');t.append(el('tr',{},...cols.map(x=>el('th',{style:x[2]||''},x[0]))));rows.forEach(r=>t.append(el('tr',{},...cols.map(x=>{const v=x[1](r);return v instanceof Node?v:el('td',{style:x[2]||''},v==null||v===''?'-':String(v))}))));body.append(t)};
  const sym=r=>el('td',{},el('a',{href:'#',style:'color:#6ea8ff',onclick:e=>{e.preventDefault();app.setSymbol&&app.setSymbol(r.sym)}},r.sym));
  body.append(el('h4',{},new Date(day+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'})));
  if(st.tab==='Economic'){
   if(!d.economic)body.append(el('p',{class:'mut'},(d.economicNote||'The free economic feed is unavailable right now (rate limited).')+' Economic events outside the current week are not available from a free source.'));
   else{let rows=ecoBy(day);rows=rows.filter(e=>(st.cat==='All categories'||catOf(e.title)===st.cat)&&(st.imp==='All'||(st.imp==='High'?e.impact==='High':e.impact==='High'||e.impact==='Medium')));
    tbl([['Time',r=>new Date(r.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})],['Cur',r=>(CUR[r.cur]?CUR[r.cur][1]+' ('+r.cur+')':r.cur)],['Event',r=>r.title,'white-space:normal'],['Cat',r=>catOf(r.title)],['Imp.',r=>bars(r.impact)+' '+r.impact],['Actual',r=>'n/a','text-align:right'],['Forecast',r=>r.forecast,'text-align:right'],['Prior',r=>r.prior,'text-align:right']],rows,'No events match on this day.');
    body.append(el('p',{class:'mut'},'Source: Faireconomy/ForexFactory public weekly feed (unofficial, covers currencies: USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF, CNY; not every country). Actual values are NOT available from a free source. Category is guessed from the event title. Calendar for other weeks: unavailable.'))}}
  if(st.tab==='Earnings'){const rows=[...rec.earnings].sort((a,b)=>(b.mcap||0)-(a.mcap||0));tbl([['Symbol',sym],['Company',r=>r.name,'white-space:normal'],['When',r=>r.time==='BMO'?'Before open':r.time==='AMC'?'After close':'-'],['Fiscal Q',r=>r.fq],['EPS estimate',r=>eps(r.epsF),'text-align:right'],['# ests',r=>r.n,'text-align:right'],['EPS last year',r=>eps(r.epsLast),'text-align:right'],['Mkt cap',r=>money(r.mcap),'text-align:right']],rows,'No earnings listed for this day.');body.append(el('p',{class:'mut'},'Source: Nasdaq earnings calendar, US-listed companies only, consensus EPS as published. Reported (actual) EPS is NOT provided by this free feed. Sorted by market cap.'))}
  if(st.tab==='Dividends'){const rows=[...rec.dividends].sort((a,b)=>(b.annual||0)-(a.annual||0));tbl([['Symbol',sym],['Company',r=>r.name,'white-space:normal'],['Ex-date',r=>r.ex],['Record',r=>r.rec],['Payment',r=>r.pay],['Dividend',r=>r.rate==null?null:'$'+r.rate,'text-align:right'],['Annual',r=>r.annual==null?null:'$'+r.annual,'text-align:right']],rows,'No ex-dividend dates listed for this day.');body.append(el('p',{class:'mut'},'Source: Nasdaq dividends calendar, US-listed only (by ex-dividend date).'))}
  if(st.tab==='IPO'){const pr=ipoBy(day),fl=d.ipo.filed.filter(x=>x.date===day),up=d.ipo.upcoming.filter(x=>x.date===day);
   tbl([['Symbol',sym],['Company',r=>r.name,'white-space:normal'],['Exchange',r=>r.exch],['Offer price',r=>r.price,'text-align:right'],['Shares',r=>r.shares==null?null:r.shares.toLocaleString(),'text-align:right'],['Offer amount',r=>money(r.amount),'text-align:right'],['Status',r=>r.st]],[...up.map(x=>({...x,st:'Expected'})),...pr.map(x=>({...x,st:'Priced'}))],'No priced or expected IPOs on this day.');
   if(fl.length){body.append(el('h4',{},'Filed this day (not yet priced)'));tbl([['Symbol',sym],['Company',r=>r.name,'white-space:normal'],['Proposed amount',r=>money(r.amount),'text-align:right']],fl,'')}
   body.append(el('p',{class:'mut'},'Source: Nasdaq IPO calendar, US only. The "upcoming" list is often empty on the free feed, so future IPOs may be missing.'))}
  if(d.errors&&d.errors.length)body.append(el('p',{class:'mut',style:'color:#f0b429'},'Partial data: '+d.errors.slice(0,3).join('; ')));
  body.append(el('h4',{},'Official sources & my events'));
  const old=document.createElement('div');const keep=self.tabc;self.tabc=old;try{self.tCalendarMine()}finally{self.tabc=keep}body.append(old);
 };
 head.append(el('p',{class:'mut'},'Loading calendar...'));
 const k=start;(cache[k]&&Date.now()-cache[k].t<10*60000?Promise.resolve(cache[k].d):fetch('api/calendar?start='+start).then(r=>r.json()).then(d=>{if(!d.days)throw new Error(d.error||'bad response');cache[k]={t:Date.now(),d};return d})).then(render).catch(e=>{head.innerHTML='';head.append(el('p',{class:'mut'},'Calendar feed unavailable: '+e.message+'. Nothing is shown rather than guessed values.'))});
};
})();
