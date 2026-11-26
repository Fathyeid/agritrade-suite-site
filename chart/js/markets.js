// Markets overview (TradingView "Markets > country" style). All data free + delayed: Yahoo (quotes/charts), FRED, World Bank. Stock lists are BUILT-IN per country, so breadth is "of N tracked stocks", not the whole market.
(()=>{
const K={
 US:{n:'United States',cc:'US',cur:'USD',idx:[['^GSPC','S&P 500'],['^IXIC','NASDAQ Composite'],['^DJI','Dow Jones'],['^RUT','Russell 2000'],['^VIX','VIX']],st:'AAPL MSFT NVDA AMZN GOOGL META TSLA AVGO JPM V UNH XOM WMT MA LLY COST HD PG NFLX AMD BAC KO PEP CRM ORCL CSCO INTC DIS NKE BA CAT'.split(' '),etf:['SPY','QQQ','IWM','DIA','VOO','GLD','TLT','XLK','XLF','XLE','SMH','SQQQ'],fx:null,bond:'ust'},
 EG:{n:'Egypt',cc:'EG',cur:'EGP',idx:[['^CASE30','EGX 30']],st:'COMI.CA TMGH.CA EAST.CA ETEL.CA SWDY.CA ABUK.CA HRHO.CA ORWE.CA EKHO.CA ESRS.CA CLHO.CA PHDC.CA FWRY.CA JUFO.CA EFIH.CA'.split(' '),etf:['EGPT'],fx:'EGP=X',bond:null},
 SA:{n:'Saudi Arabia',cc:'SA',cur:'SAR',idx:[['^TASI.SR','Tadawul All Share (TASI)']],st:'2222.SR 1120.SR 2010.SR 7010.SR 1180.SR 1150.SR 2380.SR 1211.SR 2350.SR 4300.SR 5110.SR 1010.SR 2020.SR 7203.SR 4030.SR'.split(' '),etf:['KSA'],fx:'SAR=X',bond:null},
 AE:{n:'United Arab Emirates',cc:'AE',cur:'AED',idx:[],st:'EMAAR.AE DEWA.AE AIRARABIA.AE'.split(' '),etf:['UAE'],fx:'AED=X',bond:null,note:'Yahoo has no usable ADX/DFM index history; only a few UAE stocks respond.'},
 GB:{n:'United Kingdom',cc:'GB',cur:'GBP',oecd:'GBR',idx:[['^FTSE','FTSE 100'],['^FTMC','FTSE 250']],st:'SHEL.L AZN.L HSBA.L ULVR.L BP.L GSK.L RIO.L DGE.L BATS.L LSEG.L BARC.L LLOY.L VOD.L TSCO.L NG.L'.split(' '),etf:['EWU'],fx:'GBPUSD=X',bond:'oecd'},
 PL:{n:'Poland',cc:'PL',cur:'PLN',idx:[['WIG20.WA','WIG20']],st:'PKO.WA PKN.WA PZU.WA KGH.WA PEO.WA DNP.WA ALE.WA CDR.WA LPP.WA SPL.WA OPL.WA PGE.WA KTY.WA MBK.WA'.split(' '),etf:['EPOL'],fx:'PLN=X',bond:null},
 DE:{n:'Germany',cc:'DE',cur:'EUR',oecd:'DEU',idx:[['^GDAXI','DAX'],['^MDAXI','MDAX']],st:'SAP.DE SIE.DE ALV.DE DTE.DE AIR.DE MUV2.DE BAS.DE BMW.DE VOW3.DE MBG.DE ADS.DE DBK.DE IFX.DE RWE.DE EOAN.DE'.split(' '),etf:['EWG'],fx:'EURUSD=X',bond:'oecd'},
 CN:{n:'China',cc:'CN',cur:'CNY',idx:[['000001.SS','Shanghai Composite'],['^HSI','Hang Seng'],['399001.SZ','Shenzhen Component']],st:'600519.SS 601318.SS 600036.SS 601398.SS 600900.SS 0700.HK 9988.HK 3690.HK 1299.HK 0939.HK 1810.HK 9618.HK'.split(' '),etf:['FXI','MCHI','KWEB'],fx:'CNY=X',bond:null},
 BR:{n:'Brazil',cc:'BR',cur:'BRL',idx:[['^BVSP','Ibovespa']],st:'PETR4.SA VALE3.SA ITUB4.SA BBDC4.SA ABEV3.SA B3SA3.SA WEGE3.SA BBAS3.SA RENT3.SA SUZB3.SA'.split(' '),etf:['EWZ'],fx:'BRL=X',bond:null},
 JP:{n:'Japan',cc:'JP',cur:'JPY',oecd:'JPN',idx:[['^N225','Nikkei 225']],st:'7203.T 6758.T 9984.T 8306.T 6861.T 9432.T 8035.T 7974.T 4063.T 6098.T'.split(' '),etf:['EWJ'],fx:'JPY=X',bond:'oecd'},
 IN:{n:'India',cc:'IN',cur:'INR',idx:[['^BSESN','BSE Sensex'],['^NSEI','Nifty 50']],st:'RELIANCE.NS TCS.NS HDFCBANK.NS INFY.NS ICICIBANK.NS SBIN.NS BHARTIARTL.NS ITC.NS LT.NS HINDUNILVR.NS'.split(' '),etf:['INDA'],fx:'INR=X',bond:null}
};

const CURS=(()=>{const m={};'AW:AWG AF:AFN AO:AOA AL:ALL AM:AMD AG:XCD AR:ARS AU:AUD AZ:AZN BI:BIF BD:BDT BG:BGN BH:BHD BS:BSD BA:BAM BY:BYN BZ:BZD BM:BMD BO:BOB BB:BBD BN:BND BT:BTN BW:BWP CA:CAD CH:CHF CL:CLP CO:COP CR:CRC CU:CUP CZ:CZK DJ:DJF DK:DKK DO:DOP DZ:DZD EC:USD ER:ERN ET:ETB FJ:FJD GE:GEL GH:GHS GM:GMD GN:GNF GT:GTQ GY:GYD HK:HKD HN:HNL HT:HTG HU:HUF ID:IDR IL:ILS IR:IRR IQ:IQD IS:ISK JM:JMD JO:JOD KZ:KZT KE:KES KG:KGS KH:KHR KR:KRW KW:KWD LA:LAK LB:LBP LR:LRD LY:LYD LK:LKR LS:LSL MA:MAD MD:MDL MG:MGA MV:MVR MK:MKD MM:MMK MN:MNT MO:MOP MU:MUR MW:MWK MX:MXN MY:MYR MZ:MZN NA:NAD NG:NGN NI:NIO NO:NOK NP:NPR NZ:NZD OM:OMR PE:PEN PG:PGK PK:PKR PH:PHP PY:PYG QA:QAR RO:RON RS:RSD RU:RUB RW:RWF SD:SDG SE:SEK SG:SGD SO:SOS SR:SRD SY:SYP SZ:SZL TH:THB TJ:TJS TM:TMT TN:TND TO:TOP TT:TTD TZ:TZS UA:UAH UG:UGX UY:UYU UZ:UZS VE:VES VN:VND VU:VUV WS:WST YE:YER ZA:ZAR ZM:ZMW ZW:ZWL AE:AED SA:SAR EG:EGP GB:GBP JP:JPY CN:CNY BR:BRL IN:INR TR:TRY PL:PLN AU:AUD'.split(' ').forEach(x=>{const [a,b]=x.split(':');m[a]=b});'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM ME XK'.split(' ').forEach(a=>m[a]='EUR');'SN BJ BF CI ML NE TG GW'.split(' ').forEach(a=>m[a]='XOF');'CM GA CF TD CG GQ'.split(' ').forEach(a=>m[a]='XAF');return m})();
const IDX={AR:[['^MERV','MERVAL']],AT:[['^ATX','ATX']],AU:[['^AXJO','S&P/ASX 200']],BE:[['^BFX','BEL 20']],CA:[['^GSPTSE','S&P/TSX']],CH:[['^SSMI','SMI']],CL:[['^IPSA','IPSA']],CO:[['^COLCAP','COLCAP']],DK:[['^OMXC25','OMX Copenhagen 25']],ES:[['^IBEX','IBEX 35']],FI:[['^OMXH25','OMX Helsinki 25']],FR:[['^FCHI','CAC 40']],GR:[['GD.AT','Athens General']],HK:[['^HSI','Hang Seng']],ID:[['^JKSE','Jakarta Composite']],IE:[['^ISEQ','ISEQ']],IL:[['^TA125.TA','TA-125']],IT:[['FTSEMIB.MI','FTSE MIB']],KR:[['^KS11','KOSPI']],MX:[['^MXX','IPC Mexico']],MY:[['^KLSE','FTSE Bursa KLCI']],NL:[['^AEX','AEX']],NO:[['OSEBX.OL','Oslo Bors All-Share']],NZ:[['^NZ50','NZX 50']],PH:[['PSEI.PS','PSEi']],PK:[['^KSE','KSE 100']],PT:[['PSI20.LS','PSI']],SE:[['^OMX','OMX Stockholm 30']],SG:[['^STI','Straits Times']],TH:[['^SET.BK','SET']],TR:[['XU100.IS','BIST 100'],['^XU100','BIST 100 (alt)']],TW:[['^TWII','TAIEX']],VN:[['^VNINDEX.VN','VN-Index']],ZA:[['^JN0U.JO','FTSE/JSE Top 40']],QA:[['^GNRI.QA','QE Index']],RU:[['IMOEX.ME','MOEX Russia']],HU:[['^BUX.BD','BUX']],CZ:[['^PX','PX Prague']],AT2:[]};
const ETFS={AU:'EWA',AT:'EWO',BE:'EWK',CA:'EWC',CL:'ECH',CO:'GXG',DK:'EDEN',FI:'EFNL',FR:'EWQ',GR:'GREK',HK:'EWH',ID:'EIDO',IL:'EIS',IT:'EWI',MY:'EWM',MX:'EWW',NL:'EWN',NZ:'ENZL',NO:'NORW',PE:'EPU',PH:'EPHE',PT:'PGAL',SG:'EWS',ZA:'EZA',KR:'EWY',ES:'EWP',SE:'EWD',CH:'EWL',TW:'EWT',TH:'THD',TR:'TUR',VN:'VNM',AR:'ARGT',QA:'QAT',NG:'NGE',PK:'PAK',KW:'KWT',IE:'EIRL'};
const OECD={BG:'BGR',HR:'HRV',RO:'ROU',MT:'MLT',CY:'CYP',AT:'AUT',AU:'AUS',BE:'BEL',CA:'CAN',CH:'CHE',CL:'CHL',CO:'COL',CZ:'CZE',DK:'DNK',EE:'EST',ES:'ESP',FI:'FIN',FR:'FRA',GR:'GRC',HU:'HUN',IE:'IRL',IL:'ISR',IS:'ISL',IT:'ITA',KR:'KOR',LT:'LTU',LU:'LUX',LV:'LVA',MX:'MEX',NL:'NLD',NO:'NOR',NZ:'NZL',PL:'POL',PT:'PRT',SE:'SWE',SI:'SVN',SK:'SVK',TR:'TUR',GB:'GBR',DE:'DEU',JP:'JPN',US:'USA'};
const genK=(cc,n)=>{const cur=CURS[cc]||null;return{n:n||cc,cc,cur:cur||'?',idx:IDX[cc]||[],st:null,etf:ETFS[cc]?[ETFS[cc]]:[],fx:cur&&cur!=='USD'?cur+'=X':null,bond:OECD[cc]?'oecd':null,oecd:OECD[cc],gen:true}};
const COM=[['GC=F','Gold'],['SI=F','Silver'],['HG=F','Copper'],['PL=F','Platinum'],['CL=F','Crude oil WTI'],['BZ=F','Brent'],['NG=F','Natural gas'],['ZW=F','Wheat'],['ZC=F','Corn'],['ZS=F','Soybeans'],['KC=F','Coffee'],['CC=F','Cocoa']];
const MAJ=[['EURUSD=X','EUR/USD'],['JPY=X','USD/JPY'],['GBPUSD=X','GBP/USD'],['CHF=X','USD/CHF'],['AUDUSD=X','AUD/USD'],['CNY=X','USD/CNY']];
const f2=(n,d=2)=>n==null||!isFinite(n)?'-':n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const pc=n=>n==null?'-':(n>=0?'+':'')+n.toFixed(2)+'%';
const col=n=>n==null?'':n>=0?'color:#26a69a':'color:#ef5350';
const bg=n=>{if(n==null)return '';const a=Math.min(1,Math.abs(n)/(Math.abs(n)>20?30:6));return `background:rgba(${n>=0?'38,166,154':'239,83,80'},${(.12+.7*a).toFixed(2)})`};
const big=n=>n==null?'-':Math.abs(n)>=1e12?(n/1e12).toFixed(2)+'T':Math.abs(n)>=1e9?(n/1e9).toFixed(2)+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(2)+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1)+'K':n.toFixed(2);
const jget=async u=>{const r=await fetch(u);const j=await r.json();if(!r.ok||j.error)throw new Error(j.error||r.status);return j};
async function quotes(list){const out={};for(let i=0;i<list.length;i+=40){try{const j=await jget('api/quotes?symbols='+list.slice(i,i+40).map(encodeURIComponent).join(','));j.quotes.forEach(q=>{if(!q.error&&q.price!=null&&q.prevClose)out[q.symbol]={...q,chg:100*(q.price/q.prevClose-1)}})}catch(e){}}
 const miss=list.filter(s=>!out[s]);let i=0;await Promise.all([0,1,2,3,4,5].map(async()=>{while(i<miss.length){const s=miss[i++];try{const j=await jget('api/chart?symbol='+encodeURIComponent(s)+'&interval=1d&range=1mo');const b=j.bars||[];if(b.length<2)continue;const L=b[b.length-1],P=b[b.length-2];out[s]={symbol:s,name:j.name,price:L.c,prevClose:P.c,volume:L.v,dayHigh:L.h,dayLow:L.l,hi52:null,lo52:null,chg:100*(L.c/P.c-1)}}catch(e){}}}));return out}
async function hist(sym){try{const j=await jget('api/chart?symbol='+encodeURIComponent(sym)+'&interval=1d&range=5y');const b=j.bars||[];if(b.length<30)return null;const L=b[b.length-1].c,at=d=>{const t=b[b.length-1].t-d*864e5/1000;let x=null;for(const k of b){if(k.t<=t)x=k;else break}return x?100*(L/x.c-1):null};return{price:j.price,d1:b.length>1?100*(L/b[b.length-2].c-1):null,w:at(7),m:at(30),m6:at(182),y:at(365),y5:at(1826)}}catch(e){return null}}
const cache={};

const spark=(vals,w=110,h=28)=>{const v=vals.filter(x=>x!=null);if(v.length<2)return el('span');const mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;const pts=v.map((y,i)=>(i*(w-2)/(v.length-1)+1).toFixed(1)+','+(h-2-(y-mn)/r*(h-4)).toFixed(1)).join(' ');const up=v[v.length-1]>=v[0];const d=document.createElementNS('http://www.w3.org/2000/svg','svg');d.setAttribute('width',w);d.setAttribute('height',h);d.innerHTML='<polyline fill="none" stroke="'+(up?'#26a69a':'#ef5350')+'" stroke-width="1.5" points="'+pts+'"/>';return d};
const lineChart=(series,w=620,h=220)=>{const all=series.flatMap(s=>s.pts.map(p=>p[1]).filter(x=>x!=null));if(!all.length)return el('span',{class:'mut'},'No data');const mn=Math.min(...all),mx=Math.max(...all),r=mx-mn||1,n=Math.max(...series.map(s=>s.pts.length));const X=i=>40+i*(w-60)/Math.max(1,n-1),Y=v=>h-24-(v-mn)/r*(h-44);let g='';for(let t=0;t<=4;t++){const v=mn+r*t/4;g+='<line x1="40" x2="'+(w-20)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#2a2f3a"/><text x="2" y="'+(Y(v)+4)+'" fill="#8a93a6" font-size="10">'+v.toFixed(2)+'</text>'}
 series.forEach(s=>{g+='<polyline fill="none" stroke="'+s.color+'" stroke-width="2" points="'+s.pts.map((p,i)=>p[1]==null?null:X(i)+','+Y(p[1])).filter(Boolean).join(' ')+'"/>'});
 const lab=series[0].pts;g+=lab.map((p,i)=>(i%Math.ceil(lab.length/8)===0||i===lab.length-1)?'<text x="'+X(i)+'" y="'+(h-6)+'" fill="#8a93a6" font-size="10" text-anchor="middle">'+p[0]+'</text>':'').join('');
 const d=document.createElementNS('http://www.w3.org/2000/svg','svg');d.setAttribute('width',w);d.setAttribute('height',h);d.innerHTML=g;const wrap=el('div',{style:'overflow:auto'},d);wrap.append(el('div',{class:'row2'},...series.map(s=>el('span',{style:'color:'+s.color},'● '+s.name))));return wrap};
let CL=null;
App.prototype.tMarkets=function(){
 const self=this,c=this.tabc,st=Store.get('mkt',{c:'US'});
 const top=el('div',{class:'card'});c.append(top);
 const draw=list=>{
  const k=K[st.c]||genK(st.c,(list.find(x=>x.c===st.c)||{}).n);
  const curated=Object.keys(K),sel=el('select',{onchange:()=>{st.c=sel.value;Store.set('mkt',st);self.showTab('Markets')}},...[...curated.map(x=>({c:x,n:K[x].n})),...list.filter(x=>!K[x.c]).sort((a,b)=>a.n<b.n?-1:1)].map(x=>el('option',{value:x.c,selected:x.c===st.c},x.n)));
  const nav=el('div',{class:'row2'},el('b',{style:'font-size:15px'},'Markets'),sel,...['Indices','Stocks','Commodities','Forex','ETFs','Bonds','Economy','Calendar'].map(t=>el('button',{onclick:()=>{const e=c.querySelector('[data-sec="'+t+'"]');e&&e.scrollIntoView({behavior:'smooth',block:'start'})}},t)));
  top.append(nav,el('p',{class:'mut'},'Free data, delayed (Yahoo Finance, US Treasury, ECB, Bank of England, World Bank), not real-time. '+(k.gen?'Stocks = the largest listed companies Yahoo\'s screener returns for this country (by market cap, up to 40), so breadth means "of those N".':'Stocks = a built-in list of '+k.st.length+' large stocks, so breadth means "of those '+k.st.length+'".')+' Community trends and corporate bond yields: not available from a free source. Countries with thin data show what exists and mark the rest unavailable.'+(k.note?' '+k.note:'')));
  const sec=(t,extra)=>{const d=el('div',{class:'card','data-sec':t},el('h4',{},t));if(extra)d.append(extra);c.append(d);return d};
  const tile=(s,n,q,sp)=>el('div',{style:'border:1px solid #2a2f3a;border-radius:6px;padding:5px 8px;min-width:130px;cursor:pointer',onclick:()=>self.setSymbol(s,n)},el('div',{},el('b',{},n)),q?el('div',{},f2(q.price,q.price<10?4:2)+' ',el('span',{style:col(q.chg)},pc(q.chg))):el('div',{class:'mut'},'n/a'),sp||'');
  const grid=()=>el('div',{style:'display:flex;flex-wrap:wrap;gap:6px'});
  const tbl=(cols,rows)=>{const t=el('table');t.append(el('tr',{},...cols.map(x=>el('th',{},x[0]))));rows.forEach(r=>t.append(el('tr',{},...cols.map(x=>x[1](r)))));return t};
  const dI=sec('Indices');const gI=grid();dI.append(gI);if(!k.idx.length)gI.append(el('span',{class:'mut'},'No index with usable Yahoo data for '+k.n+'.'));
  const dS=sec('Stocks');dS.append(el('p',{class:'mut'},'Loading...'));
  const dC=sec('Commodities');const gC=grid();dC.append(gC);
  const dF=sec('Forex');dF.append(el('p',{class:'mut'},'Loading...'));
  const dE=sec('ETFs');const gE=grid();dE.append(gE);
  const dB=sec('Bonds');dB.append(el('p',{class:'mut'},'Loading...'));
  const dY=sec('Economy');dY.append(el('p',{class:'mut'},'Loading...'));
  const dK=sec('Calendar');dK.append(el('p',{class:'mut'},'Earnings, dividends, IPO and economic events (US listings only; economic = current week, no actuals) are in the Calendar tab. No free calendar source for '+k.n+(st.c==='US'?'':' itself.')),el('button',{onclick:()=>self.showTab('Calendar')},'Open Calendar'));
  (async()=>{
   // indices with sparklines
   const IQ=await quotes(k.idx.map(x=>x[0]));
   await Promise.all(k.idx.map(async([s,n])=>{let sp='';try{const j=await jget('api/chart?symbol='+encodeURIComponent(s)+'&interval=1d&range=3mo');sp=spark((j.bars||[]).map(b=>b.c))}catch(e){}if(IQ[s]||k.idx.length===1)gI.append(tile(s,n,IQ[s],sp))}));
   if(k.idx.length&&!gI.querySelector('div')) {}
   const CQ=await quotes(COM.map(x=>x[0]));COM.forEach(([s,n])=>gC.append(tile(s,n,CQ[s])));
   const EQ=await quotes(k.etf);if(!k.etf.length)gE.append(el('span',{class:'mut'},'No US-listed single-country ETF known for '+k.n+'.'));k.etf.forEach(s=>gE.append(tile(s,s+(s==='SPY'?' (S&P 500)':''),EQ[s])));
  })();
  (async()=>{
   let rows=[],srcNote='';
   if(!k.gen){const Q=await quotes(k.st);rows=k.st.map(s=>Q[s]&&{...Q[s],mcap:null}).filter(r=>r&&r.volume>0);srcNote='Source: Yahoo Finance, delayed, from a built-in list of '+k.st.length+' stocks.'}
   else{try{const j=await jget('api/mktcountry?c='+st.c);rows=(j.rows||[]).filter(r=>r.volume>0).map(r=>({...r,symbol:r.symbol,name:r.name}));srcNote=(j.source||'')+(j.note?' '+j.note:'')}catch(e){srcNote='Unavailable right now: '+e.message}}
   rows=rows.map(r=>({...r,tv:(r.volume||0)*r.price,rng:r.dayHigh&&r.dayLow?100*(r.dayHigh-r.dayLow)/r.dayLow:null})).filter(r=>r.chg!=null);
   dS.innerHTML='';dS.append(el('h4',{},'Stocks ('+k.n+', '+rows.length+' traded today with data)'));
   if(!rows.length){dS.append(el('p',{class:'mut'},'No stock data available for '+k.n+' from free sources right now. '+srcNote));}
   else{const up=rows.filter(r=>r.chg>0),dn=rows.filter(r=>r.chg<0),uv=up.reduce((a,r)=>a+(r.volume||0),0),dv=dn.reduce((a,r)=>a+(r.volume||0),0);
    dS.append(el('div',{class:'row2'},el('span',{},'Advancing '+up.length+' ('+Math.round(100*up.length/rows.length)+'%)'),el('span',{},'Declining '+dn.length),el('span',{},'Net advances '+(up.length-dn.length)),el('span',{},'A/D ratio '+(dn.length?(up.length/dn.length).toFixed(2):'-')),el('span',{},'Up / down volume '+big(uv)+' / '+big(dv)),el('span',{},'Near 52w high (<2%): '+rows.filter(r=>r.hi52&&r.price>=r.hi52*.98).length+', near low: '+rows.filter(r=>r.lo52&&r.price<=r.lo52*1.02).length)));
    dS.append(el('div',{style:'display:flex;height:8px;border-radius:4px;overflow:hidden;margin:4px 0'},el('div',{style:'background:#26a69a;width:'+100*up.length/rows.length+'%'}),el('div',{style:'background:#ef5350;flex:1'})));
    const cols=[['Symbol',r=>el('td',{},el('a',{href:'#',style:'color:#6ea8ff',onclick:e=>{e.preventDefault();self.setSymbol(r.symbol)}},r.symbol))],['Price',r=>el('td',{},f2(r.price))],['1D %',r=>el('td',{style:bg(r.chg)},pc(r.chg))],['Volume',r=>el('td',{},big(r.volume))],['Range',r=>el('td',{},r.rng==null?'-':r.rng.toFixed(1)+'%')]];
    const blk=(t,arr)=>el('div',{style:'flex:1;min-width:330px;overflow:auto'},el('b',{},t),tbl(cols,arr.slice(0,5)));
    dS.append(el('div',{style:'display:flex;flex-wrap:wrap;gap:10px'},blk('Gainers',[...rows].sort((a,b)=>b.chg-a.chg)),blk('Losers',[...rows].sort((a,b)=>a.chg-b.chg)),blk('Highest value traded',[...rows].sort((a,b)=>b.tv-a.tv)),blk('Most volatile (day range)',[...rows].sort((a,b)=>(b.rng||0)-(a.rng||0)))));
    dS.append(el('p',{class:'mut'},srcNote+' Value traded = volume x price in local currency. Pre-market lists, above-moving-average breadth and new-high/low history need a full-market feed: not available.'))}
  })();
  (async()=>{
   if(!k.fx&&k.cur!=='USD'){}
   const pairs=[...(k.fx?[[k.fx,'USD / '+k.cur]]:[]),...MAJ.filter(m=>m[0]!==k.fx)];const H=await Promise.all(pairs.map(p=>hist(p[0])));
   dF.innerHTML='';dF.append(el('h4',{},'Forex vs USD'+(k.fx?' (incl. '+k.cur+')':'')));
   if(!k.fx)dF.append(el('p',{class:'mut'},k.cur==='USD'?k.n+' uses the US dollar.':'Local currency pair unavailable (no free Yahoo symbol known for '+k.n+'). Majors shown.'));
   const hc=v=>el('td',{style:bg(v)},pc(v));
   dF.append(tbl([['Pair',r=>el('td',{},r[0])],['Price',r=>el('td',{},r[1]?f2(r[1].price,4):'-')],['Today',r=>hc(r[1]&&r[1].d1)],['Week',r=>hc(r[1]&&r[1].w)],['Month',r=>hc(r[1]&&r[1].m)],['6 months',r=>hc(r[1]&&r[1].m6)],['Year',r=>hc(r[1]&&r[1].y)],['5 years',r=>hc(r[1]&&r[1].y5)]],pairs.map((p,i)=>[p[1],H[i]])));
   dF.append(el('p',{class:'mut'},'Source: Yahoo Finance daily closes, delayed. Direction as Yahoo lists the pair (USD/JPY up = dollar stronger). Missing history shows a dash.'));
  })();
  (async()=>{dB.innerHTML='';dB.append(el('h4',{},'Bonds'));
   try{if(st.c==='US'){const j=await jget('api/econ?kind=ust');
     const lab=j.rows.map(r=>r.label.replace(' months','M').replace(' month','M').replace(' years','Y').replace(' year','Y'));
     dB.append(lineChart([{name:'Current',color:'#2962ff',pts:j.rows.map((r,i)=>[lab[i],r.y])},{name:'1 month ago',color:'#26a69a',pts:j.rows.map((r,i)=>[lab[i],r.m1])},{name:'1 year ago',color:'#ff9800',pts:j.rows.map((r,i)=>[lab[i],r.y1])}]));
     dB.append(tbl([['Maturity',r=>el('td',{},r.label)],['Yield %',r=>el('td',{},f2(r.y,3))],['1D change (pp)',r=>el('td',{style:col(r.y!=null&&r.prev!=null?r.y-r.prev:null)},r.y!=null&&r.prev!=null?(r.y-r.prev>=0?'+':'')+(r.y-r.prev).toFixed(3):'-')],['1M ago',r=>el('td',{},f2(r.m1,3))],['1Y ago',r=>el('td',{},f2(r.y1,3))],['As of',r=>el('td',{},r.date||'-')],['Coupon / price / maturity date',r=>el('td',{class:'mut'},'n/a')]],j.rows));dB.append(el('p',{class:'mut'},j.source+'. Coupon, price and maturity date per bond are not in any free feed. Corporate bond yields: not available.'))}
    else if(k.bond==='oecd'){const j=await jget('api/econ?kind=oecd&c='+k.oecd+'&i='+k.cc);dB.append(lineChart([{name:'10Y yield, monthly avg (%)',color:'#2962ff',pts:j.series.map(x=>[x[0].slice(0,7),x[1]])}],620,200),el('p',{},'Latest ('+j.date.slice(0,7)+'): '+f2(j.y,2)+'%  (previous month '+f2(j.prev,2)+'%)'),el('p',{class:'mut'},j.source+'. No daily yield curve for this country from a free source.'+(j.stale?' DATA IS OLD.':'')))}
    else dB.append(el('p',{class:'mut'},'No free government bond yield source for '+k.n+'. Needs a paid feed (Bloomberg, Refinitiv) or the central bank site.'))}catch(e){dB.append(el('p',{class:'mut'},'Unavailable right now: '+e.message))}})();
  (async()=>{dY.innerHTML='';dY.append(el('h4',{},'Economy'));
   try{const j=await jget('api/econ?kind=econ&c='+k.cc);const fm=i=>i.last==null?'-':i.unit==='pct'?f2(i.last.v)+'%':i.unit==='usd'?'$'+big(i.last.v):big(i.last.v);
    const chart=el('div');let cur=null;
    const show=it=>{chart.innerHTML='';if(!it.series.length){chart.append(el('p',{class:'mut'},'No data'));return}chart.append(el('b',{},it.label),lineChart([{name:it.label,color:'#26a69a',pts:it.series.map(x=>[x[0],x[1]])}],620,200))};
    dY.append(tbl([['Indicator',r=>el('td',{style:'white-space:normal;cursor:pointer',onclick:()=>show(r)},r.label)],['Period',r=>el('td',{},r.last?r.last.y:'-')],['Last',r=>el('td',{style:'text-align:right'},fm(r))],['Trend',r=>el('td',{},spark(r.series.map(x=>x[1])))]],j.items),el('p',{class:'mut'},'Click an indicator to chart its history.'),chart);
    const first=j.items.find(i=>i.series.length);if(first)show(first);
    dY.append(el('p',{class:'mut'},j.source+'. Policy interest rate, monthly CPI, payrolls and PMI are not in this source (a dash = no value published).'))}catch(e){dY.append(el('p',{class:'mut'},'Unavailable right now: '+e.message))}})();
 };
 if(CL)draw(CL);else jget('api/econ?kind=countries').then(j=>{CL=j.rows;draw(CL)}).catch(()=>{CL=Object.keys(K).map(x=>({c:x,n:K[x].n}));draw(CL)});
};
const _br=App.prototype.buildRight;App.prototype.buildRight=function(){_br.apply(this,arguments);this.tabDefs.Markets=()=>this.tMarkets();const b=el('button',{'data-tab':'Markets',onclick:()=>this.showTab('Markets')},'Markets');this.tabs.insertBefore(b,this.tabs.firstChild)};
const o=App.prototype.showTab;App.prototype.showTab=function(t){const r=o.call(this,t);if(t==='Markets')SCR.wide(true);return r};
})();
