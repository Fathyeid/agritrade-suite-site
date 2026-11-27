// Mobile layout: compact header (menu), bottom navigation, tab sheet. Desktop is untouched (display:contents wrapper, no listeners).
(()=>{const mq=matchMedia('(max-width:850px)');
const MAIN=[['Chart','▤'],['Watchlist','★'],['Contracts','☰'],['Script','{ }'],['More','⋯']];
let ready=false;
function init(){if(!window.app||!app.tfBox||ready)return false;ready=true;
 const top=document.getElementById('top'),tf=app.tfBox;tf.id='tfbox';
 const more=document.createElement('div');more.id='topmore';let n=tf.nextSibling;const mv=[];while(n){mv.push(n);n=n.nextSibling}
 // keep first separator after the timeframe row on desktop order
 mv.forEach(x=>more.append(x));top.append(more);
 const mm=document.createElement('button');mm.id='mmenu';mm.style.display='none';mm.textContent='☰ Menu';mm.onclick=()=>{top.classList.toggle('mopen');hdr()};top.insertBefore(mm,tf);
 const R=document.getElementById('right'),mt=document.createElement('div');mt.id='mtitle';R.insertBefore(mt,R.firstChild);
 const sheet=document.createElement('div');sheet.id='msheet';document.getElementById('app').after(sheet);
 const nav=document.createElement('div');nav.id='mnav';document.body.append(nav);
 const btns={};MAIN.forEach(([k,ic])=>{const b=document.createElement('button');b.innerHTML='<i>'+ic+'</i>'+k;b.onclick=()=>go(k);nav.append(b);btns[k]=b});
 const closeAll=()=>{R.classList.remove('open');sheet.classList.remove('open');top.classList.remove('mopen')};
 function mark(k){Object.entries(btns).forEach(([n,b])=>b.classList.toggle('on',n===k))}
 function go(k){if(!mq.matches)return;closeAll();if(typeof DASH!=='undefined'&&DASH.open)DASH.hide();document.getElementById('left').classList.remove('open');
  if(k==='Chart'){mark('Chart');document.getElementById('center').scrollTop=0;requestAnimationFrame(()=>app.panes.forEach(p=>p.dl&&p.dl.redraw()));return}
  if(k==='More'){mark('More');buildSheet();sheet.classList.add('open');return}
  openTab(k)}
 function openTab(k){mark(['Watchlist','Contracts','Script'].includes(k)?k:'More');R.classList.remove('hide');R.classList.add('open');sheet.classList.remove('open');app.showTab(k);mt.textContent=k;hdr()}
 function buildSheet(){sheet.innerHTML='';const h=t=>{const e=document.createElement('h4');e.textContent=t;sheet.append(e)};
  const g=(items)=>{const d=document.createElement('div');d.className='mg';items.forEach(([t,f])=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;d.append(b)});sheet.append(d)};
  h('Terminal');g([['Terminal workspace',()=>{closeAll();mark('Chart');if(typeof DASH!=='undefined'&&DASH.tbtn&&!document.body.classList.contains('term'))DASH.tbtn.click()}]]);
  h('Language');g([['عربي / English',()=>{closeAll();window.I18N&&I18N.toggle()}]]);
  const tools=[...document.querySelectorAll('#top .pro-tools button')].filter(b=>b.textContent.trim());
  if(tools.length){h('Smart tools');g(tools.map(b=>[b.textContent.trim(),()=>{closeAll();mark('Chart');b.click()}]))}
  h('Tabs');g(Object.keys(app.tabDefs).map(k=>[k,()=>openTab(k)]));
  h('Chart');g([['Drawing tools',()=>{closeAll();mark('Chart');document.getElementById('left').classList.add('open')}],['Chart settings',()=>{document.body.classList.toggle('cpon');closeAll();mark('Chart')}],['Details panel',()=>{closeAll();mark('Chart');const d=document.getElementById('detail');d&&d.scrollIntoView()}],['Dashboard',()=>{closeAll();typeof DASH!=='undefined'&&DASH.show()}],['Settings',()=>{closeAll();app.settings()}],['Theme',()=>app.toggleTheme()]].concat(/android/i.test(navigator.userAgent)&&!/wv\)|; wv/i.test(navigator.userAgent)?[['Android app (APK download)',()=>{location.href='GlobalChart.apk'}]]:[]))}
 window.MOB={go,openTab};
 // programmatic tab opens (tabShow from other modules) also use the sheet
 const _ts=app.tabShow.bind(app);app.tabShow=function(k){if(mq.matches){openTab(k);return}return _ts(k)};
 // symbol search / Contracts: left drawer closes when tapping chart
 document.getElementById('center').addEventListener('click',()=>document.getElementById('left').classList.remove('open'));
 mark('Chart');return true}
function hdr(){const t=document.getElementById('top');document.documentElement.style.setProperty('--hdr',(t?Math.ceil(t.getBoundingClientRect().height):92)+'px')}
function apply(){document.body.classList.toggle('mob',mq.matches);const R=document.getElementById('right');if(mq.matches){if(R&&!R.dataset.mobinit){R.dataset.mobinit=1;R.classList.remove('open')}}hdr();setTimeout(()=>window.app&&app.panes&&app.panes.forEach(p=>p.dl&&p.dl.redraw()),150)}
mq.addEventListener('change',apply);addEventListener('resize',hdr);
let tries=0;const t=setInterval(()=>{if(init()||++tries>60){clearInterval(t);apply()}},200);
})();
