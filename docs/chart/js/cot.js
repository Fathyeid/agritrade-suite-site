// COT tab: CFTC Commitments of Traders for every market (metals, energy, currencies, indices, rates, crypto, grains, softs, livestock).
// List = latest week (legacy report, every market). Detail = up to 3 years of weekly history, with the funds' categories:
// commodities -> disaggregated report (managed money / producers / swap dealers), financials -> TFF (asset managers / leveraged funds / dealers),
// falling back to the legacy report (large speculators / commercials / small traders). Price overlay from the existing chart feed.
(()=>{
const MK={ // CFTC contract code -> [chart symbol, short name]
 '088691':['GC=F','Gold'],'084691':['SI=F','Silver'],'085692':['HG=F','Copper'],'076651':['PL=F','Platinum'],'075651':['PA=F','Palladium'],
 '067651':['CL=F','Crude Oil WTI'],'023651':['NG=F','Natural Gas'],'111659':['RB=F','Gasoline RBOB'],'022651':['HO=F','Heating Oil'],
 '13874A':['ES=F','S&P 500 E-mini'],'209742':['NQ=F','Nasdaq-100 E-mini'],'124603':['YM=F','Dow Jones E-mini'],'239742':['RTY=F','Russell 2000 E-mini'],'1170E1':['^VIX','VIX'],
 '099741':['6E=F','Euro FX'],'097741':['6J=F','Japanese Yen'],'096742':['6B=F','British Pound'],'092741':['6S=F','Swiss Franc'],'090741':['6C=F','Canadian Dollar'],'232741':['6A=F','Australian Dollar'],'095741':['6M=F','Mexican Peso'],'098662':['DX-Y.NYB','US Dollar Index'],
 '043602':['ZN=F','10-Year T-Note'],'044601':['ZF=F','5-Year T-Note'],'042601':['ZT=F','2-Year T-Note'],'020601':['ZB=F','US T-Bond'],
 '133741':['BTC-USD','Bitcoin (CME)'],'146021':['ETH-USD','Ether (CME)'],
 '005602':['ZS=F','Soybeans'],'002602':['ZC=F','Corn'],'001602':['ZW=F','Wheat (SRW)'],'001612':['KE=F','Wheat (HRW)'],'026603':['ZM=F','Soybean Meal'],'007601':['ZL=F','Soybean Oil'],
 '080732':['SB=F','Sugar #11'],'083731':['KC=F','Coffee'],'073732':['CC=F','Cocoa'],'033661':['CT=F','Cotton'],'057642':['LE=F','Live Cattle'],'054642':['HE=F','Lean Hogs']};
const GROUPS=[['Metals',/gold|silver|copper|platinum|palladium|aluminum|aluminium|steel|cobalt|lithium/i],['Energy',/crude|brent|wti|gasoline|heating oil|natural gas|ulsd|diesel|propane|ethanol|coal|electric|fuel oil|gasoil/i],
 ['Crypto',/bitcoin|ether|btc|eth\b|solana|xrp/i],['Currencies',/euro fx|yen|pound|franc|canadian dollar|australian dollar|new zealand|peso|real|rand|ruble|usd index|dollar index|currency/i],
 ['Indices',/s&p|nasdaq|dow jones|djia|russell|nikkei|vix|msci|stock index|e-mini|micro e/i],['Rates',/treasury|t-note|t-bond|note|bond|sofr|eurodollar|fed fund|interest rate|ultra|yield/i],
 ['Grains',/soybean|corn|wheat|oats|rough rice|canola|meal|soy oil|soybean oil/i],['Softs',/sugar|coffee|cocoa|cotton|orange juice|lumber/i],['Livestock',/cattle|hog|feeder|milk|cheese|butter|dairy|whey/i]];
const grpOf=r=>{const n=r.name||'';const g=GROUPS.find(([,re])=>re.test(n));return g?g[0]:'Other'};
const COMMOD=['Metals','Energy','Grains','Softs','Livestock'];
const LBL={spec:'Large speculators (funds)',comm:'Commercials (hedgers)',small:'Small traders',mm:'Managed money (funds)',prod:'Producers & merchants',swap:'Swap dealers',other:'Other reportables',am:'Asset managers (investment funds)',lev:'Leveraged funds (hedge funds)',dealer:'Dealers (banks)'};
const COL={spec:'#2962ff',comm:'#ef5350',small:'#9e9e9e',mm:'#2962ff',prod:'#ef5350',swap:'#00bcd4',other:'#8e24aa',am:'#2962ff',lev:'#26a69a',dealer:'#ef5350'};
const FUND={legacy:'spec',disagg:'mm',tff:'lev'};
const net=x=>x&&x[0]!=null&&x[1]!=null?x[0]-x[1]:null;
const k=v=>v==null?'-':Math.abs(v)>=1e6?(v/1e6).toFixed(2)+'M':Math.abs(v)>=1e3?(v/1e3).toFixed(1)+'K':String(Math.round(v));
const sg=v=>v==null?'':(v>0?'+':'')+k(v);
const clean=n=>String(n||'').replace(/\s+-\s+.*$/,'').replace(/\s+/g,' ').trim();
let LIST=null,LISTP=null;
async function getList(){if(LIST)return LIST;if(!LISTP)LISTP=fetch('/chart/api/cot').then(r=>r.json()).then(j=>{if(!j.rows)throw new Error(j.error||'no data');LIST=j.rows.map(r=>Object.assign(r,{grp:grpOf(r)}));return LIST}).catch(e=>{LISTP=null;throw e});return LISTP}
const HIST={};
async function getHist(code,rep){const kk=rep+'|'+code;if(HIST[kk])return HIST[kk];const j=await (await fetch('/chart/api/cot?code='+encodeURIComponent(code)+'&rep='+rep+'&weeks=156')).json();if(!j.rows)throw new Error(j.error||'no data');HIST[kk]=j.rows;return j.rows}

App.prototype.tCOT=function(){
 const c=this.tabc,st=Store.get('cotcfg',{g:'All',q:''});
 const q=el('input',{placeholder:'Search market…',value:st.q||'',style:'width:100%'});
 const pills=el('div',{class:'cot-pills'}),out=el('div',{class:'cot-list'},el('div',{class:'mut'},'Loading CFTC data…'));
 c.append(el('div',{class:'card'},el('h4',{},'Commitments of Traders (COT)'),el('p',{class:'mut'},'Who holds what in every futures market: funds, hedgers and small traders. Official CFTC data, weekly (positions as of Tuesday, published Friday).'),q,pills),out);
 const draw=()=>{if(!LIST)return;const g=st.g,qq=(st.q||'').toLowerCase();
  pills.innerHTML='';['All','Metals','Energy','Currencies','Indices','Rates','Crypto','Grains','Softs','Livestock','Other'].forEach(x=>pills.append(el('button',{class:x===g?'on':'',onclick:()=>{st.g=x;Store.set('cotcfg',st);draw()}},x)));
  let rows=LIST.filter(r=>(g==='All'||r.grp===g)&&(!qq||(r.name+' '+(MK[r.code]||[,''])[1]).toLowerCase().includes(qq)));
  rows.sort((a,b)=>(MK[b.code]?1:0)-(MK[a.code]?1:0)||(b.oi||0)-(a.oi||0));
  out.innerHTML='';
  if(!rows.length){out.append(el('div',{class:'mut'},'No markets match.'));return}
  out.append(el('div',{class:'mut',style:'margin:4px 0'},el('span',{},'Week of'),' '+(LIST[0]&&LIST[0].date||'')+' · '+rows.length+' ',el('span',{},'markets'),' · ',el('span',{},'net = long − short of large speculators (funds)')));
  const t=el('table',{class:'cot-t'},el('thead',{},el('tr',{},el('th',{},'Market'),el('th',{},'Funds net'),el('th',{},'Week Δ'),el('th',{},'Long / Short'))));
  const tb=el('tbody');rows.slice(0,250).forEach(r=>{const s=r.g.spec||[],n=net(s),dn=r.ch?net(r.ch):null,tot=(s[0]||0)+(s[1]||0),lp=tot?s[0]/tot*100:50;
   tb.append(el('tr',{onclick:()=>this.cotDetail(r)},el('td',{},el('b',{},(MK[r.code]||[,clean(r.name)])[1]),el('div',{class:'mut cot-ex'},clean(r.name))),el('td',{class:n>=0?'cot-up':'cot-dn'},sg(n)),el('td',{class:dn==null?'':dn>=0?'cot-up':'cot-dn'},dn==null?'-':sg(dn)),
    el('td',{},el('div',{class:'cot-bar',title:lp.toFixed(0)+'% long'},el('i',{style:'width:'+lp.toFixed(1)+'%'})))))});
  t.append(tb);out.append(t)};
 q.oninput=()=>{st.q=q.value;Store.set('cotcfg',st);draw()};
 getList().then(draw).catch(e=>{out.innerHTML='';out.append(el('div',{class:'mut'},'Could not load CFTC data: '+e.message))});
};

App.prototype.cotDetail=async function(r){
 const name=(MK[r.code]||[,clean(r.name)])[1],sym=(MK[r.code]||[])[0],isCom=COMMOD.includes(r.grp),pref=isCom?'disagg':(r.grp==='Other'?'legacy':'tff');
 const st={rep:pref},body=el('div',{class:'cot-d'}),head=el('div',{class:'cot-dh'}),chartBox=el('div',{class:'cot-cb'},el('div',{class:'mut'},'Loading history…')),side=el('div',{class:'cot-side'});
 const repSel=el('div',{class:'cot-pills'});
 body.append(el('div',{class:'mut'},clean(r.name)+' · CFTC '+r.code),repSel,head,chartBox,side);
 const m=modal('COT · '+name,body,{wide:true});
 if(sym)body.prepend(el('button',{class:'cot-open',onclick:()=>{try{this.setSymbol(sym,name);m.close()}catch(e){}}},el('span',{},'Open chart'),' '+sym));
 let price=null;if(sym){fetch('/chart/api/chart?symbol='+encodeURIComponent(sym)+'&range=5y&interval=1wk').then(x=>x.json()).then(d=>{price=d&&d.bars||null;render()}).catch(()=>{})}
 const load=async rep=>{try{let h=await getHist(r.code,rep);if(!h.length&&rep!=='legacy'){st.rep='legacy';h=await getHist(r.code,'legacy')}return h}catch(e){if(rep!=='legacy'){st.rep='legacy';return getHist(r.code,'legacy')}throw e}};
 let H=null;
 const render=()=>{repSel.innerHTML='';[['legacy','Classic (speculators / hedgers)'],[isCom?'disagg':'tff',isCom?'Funds detail (managed money)':'Funds detail (asset managers / hedge funds)']].forEach(([v,l])=>repSel.append(el('button',{class:st.rep===v?'on':'',onclick:async()=>{st.rep=v;chartBox.innerHTML='<div class="mut">Loading history…</div>';H=await load(v).catch(()=>[]);render()}},l)));
  if(!H)return;if(!H.length){chartBox.innerHTML='';chartBox.append(el('div',{class:'mut'},'No history for this market in this report.'));return}
  const cats=Object.keys(H[H.length-1].g),fk=FUND[st.rep]&&cats.includes(FUND[st.rep])?FUND[st.rep]:cats[0];
  const fn=H.map(x=>net(x.g[fk])),last=H[H.length-1],prev=H[H.length-2],win=fn.slice(-156).filter(v=>v!=null),mn=Math.min(...win),mx=Math.max(...win),cur=fn[fn.length-1],idx=mx>mn?(cur-mn)/(mx-mn)*100:50;
  const ch=prev?cur-net(prev.g[fk]):null,oi=last.oi,pct=oi?cur/oi*100:null;
  head.innerHTML='';head.append(
   el('div',{class:'cot-kpi'},el('small',{},LBL[fk]),el('b',{class:cur>=0?'cot-up':'cot-dn'},sg(cur)),el('span',{class:ch==null?'':ch>=0?'cot-up':'cot-dn'},ch==null?'':el('span',{},el('span',{},'week'),' '+sg(ch)))),
   el('div',{class:'cot-kpi'},el('small',{},'COT Index (3 years)'),el('b',{},idx.toFixed(0)),el('span',{class:'mut'},idx>=90?'extreme long':idx<=10?'extreme short':idx>=70?'crowded long':idx<=30?'crowded short':'neutral')),
   el('div',{class:'cot-kpi'},el('small',{},'Share of open interest'),el('b',{},pct==null?'-':pct.toFixed(1)+'%'),el('span',{class:'mut'},el('span',{},'OI'),' '+k(oi))),
   el('div',{class:'cot-kpi'},el('small',{},'Report date'),el('b',{},last.date),el('span',{class:'mut'},H.length+' ',el('span',{},'weeks'))));
  chartBox.innerHTML='';chartBox.append(svg(H,cats,price));
  const lg=el('div',{class:'cot-lg'});cats.forEach(c=>lg.append(el('span',{},el('i',{style:'background:'+COL[c]}),LBL[c])));if(price)lg.append(el('span',{},el('i',{style:'background:#f5b301'}),'Price (right axis)'));chartBox.append(lg);
  const t=el('table',{class:'cot-t'},el('thead',{},el('tr',{},el('th',{},'Week'),...cats.map(c=>el('th',{},LBL[c].replace(/\s*\(.*\)/,''))),el('th',{},'Open interest'))));
  const tb=el('tbody');H.slice(-8).reverse().forEach(x=>tb.append(el('tr',{},el('td',{},x.date),...cats.map(c=>{const v=net(x.g[c]);return el('td',{class:v>=0?'cot-up':'cot-dn'},sg(v))}),el('td',{},k(x.oi)))));
  t.append(tb);side.innerHTML='';side.append(el('h4',{},'Last 8 weeks (net positions)'),t,el('p',{class:'mut'},'Net = long − short contracts. COT Index = where the current funds net sits between its 3-year low (0) and high (100). Positioning is context, not a trading signal. Source: CFTC.'))};
 render();
 try{H=await load(st.rep)}catch(e){chartBox.innerHTML='';chartBox.append(el('div',{class:'mut'},'Could not load: '+e.message));return}
 render();
};
function svg(H,cats,price){
 const w=900,h=330,pl=56,pr=60,pt=14,pb=26,NS='http://www.w3.org/2000/svg',n=H.length;
 const all=[];cats.forEach(c=>H.forEach(x=>{const v=net(x.g[c]);if(v!=null)all.push(v)}));let mn=Math.min(0,...all),mx=Math.max(0,...all);const pad=(mx-mn)*.08||1;mn-=pad;mx+=pad;
 const t0=new Date(H[0].date).getTime(),t1=new Date(H[n-1].date).getTime()||t0+1,X=t=>pl+(w-pl-pr)*(t-t0)/((t1-t0)||1),Y=v=>pt+(h-pt-pb)*(mx-v)/(mx-mn);
 let s=`<svg viewBox="0 0 ${w} ${h}" class="cot-svg" xmlns="${NS}">`;
 for(let i=0;i<=4;i++){const v=mx-(mx-mn)*i/4,y=Y(v);s+=`<line x1="${pl}" x2="${w-pr}" y1="${y}" y2="${y}" stroke="rgba(128,128,128,.18)"/><text x="${pl-6}" y="${y+4}" font-size="11" text-anchor="end" fill="#888">${k(v)}</text>`}
 s+=`<line x1="${pl}" x2="${w-pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(128,128,128,.5)" stroke-dasharray="4 4"/>`;
 if(price&&price.length){const pb2=price.filter(b=>b.t*1000>=t0-7*864e5);if(pb2.length>1){const pv=pb2.map(b=>b.c),pmn=Math.min(...pv),pmx=Math.max(...pv),PY=v=>pt+(h-pt-pb)*(pmx-v)/((pmx-pmn)||1);
  s+=`<polyline fill="none" stroke="#f5b301" stroke-width="1.6" opacity=".9" points="${pb2.map(b=>X(b.t*1000).toFixed(1)+','+PY(b.c).toFixed(1)).join(' ')}"/>`;for(let i=0;i<=4;i++){const v=pmx-(pmx-pmn)*i/4;s+=`<text x="${w-pr+6}" y="${PY(v)+4}" font-size="11" fill="#c99700">${fmt(v)}</text>`}}}
 cats.forEach(c=>{const pts=H.map(x=>{const v=net(x.g[c]);return v==null?null:X(new Date(x.date).getTime()).toFixed(1)+','+Y(v).toFixed(1)}).filter(Boolean);s+=`<polyline fill="none" stroke="${COL[c]}" stroke-width="${c==='spec'||c==='mm'||c==='lev'||c==='am'?2.4:1.6}" points="${pts.join(' ')}"/>`});
 const yrs={};H.forEach(x=>{const y=x.date.slice(0,4);if(!yrs[y])yrs[y]=x.date});Object.values(yrs).forEach(d=>{const x=X(new Date(d).getTime());s+=`<text x="${x}" y="${h-6}" font-size="11" fill="#888">${d.slice(0,4)}</text>`});
 s+='</svg>';const d=document.createElement('div');d.innerHTML=s;return d.firstChild}
})();
