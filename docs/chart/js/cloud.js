// Cloud sync of the chart workspace + server-side Telegram price alerts.
// Uses the suite's Google sign-in (same-origin Supabase session written by the portal) and the public anon key.
// Needs the tables in database/07_chart_cloud.sql; until they exist everything stays local and nothing breaks.
(()=>{
const SB='https://nimfkykshfijxbgwgkrg.supabase.co',ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbWZreWtzaGZpanhiZ3dna3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2ODY4NzgsImV4cCI6MjExMTI2Mjg3OH0.ubwLjgwwTGkbIHdYHGJ6oyZ7F_-rkhvuEtN-eun1dT0';
const LOCAL_ONLY=['alertLog','_cloudTs'];
function sess(){try{const s=JSON.parse(localStorage.getItem('sb-nimfkykshfijxbgwgkrg-auth-token')||'null');if(s&&s.access_token&&s.user&&(!s.expires_at||s.expires_at*1000>Date.now()+30000))return s}catch(e){}return null}
const H=s=>({apikey:ANON,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'});
const CLOUD=window.CLOUD={state:'off',msg:'',noTable:false};
const missing=t=>/PGRST205|42P01|does not exist|Could not find the table/i.test(t);
function snapshot(){const d={...(Store.d||Store.load())};LOCAL_ONLY.forEach(k=>delete d[k]);return d}
let applying=false,pushT=null;
async function pull(){const s=sess();if(!s){CLOUD.state='signed-out';return}
 try{const r=await fetch(SB+'/rest/v1/chart_state?select=data,updated_at&user_id=eq.'+s.user.id,{headers:H(s)});const t=await r.text();
  if(!r.ok){if(missing(t)){CLOUD.noTable=true;CLOUD.state='not-enabled'}else CLOUD.state='error';return}
  const rows=JSON.parse(t);CLOUD.state='on';if(!rows.length){schedule(1500);return}
  const remoteTs=Date.parse(rows[0].updated_at)||0,localTs=Store.get('_cloudTs',0);
  if(remoteTs>localTs+2000){applying=true;const keep={};LOCAL_ONLY.forEach(k=>{const v=Store.get(k);if(v!==undefined)keep[k]=v});Store.d={...rows[0].data,...keep,_cloudTs:remoteTs};localStorage.setItem(Store.k,JSON.stringify(Store.d));applying=false;
   if(window.app&&!sessionStorage.getItem('gct_cloud_reload')){sessionStorage.setItem('gct_cloud_reload','1');location.reload()}}
 }catch(e){CLOUD.state='error'}}
async function push(){const s=sess();if(!s||CLOUD.noTable||CLOUD.state==='error')return;const now=new Date().toISOString();
 try{const r=await fetch(SB+'/rest/v1/chart_state?on_conflict=user_id',{method:'POST',headers:{...H(s),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:s.user.id,data:snapshot(),updated_at:now})});
  if(r.ok){Store.d._cloudTs=Date.parse(now);try{localStorage.setItem(Store.k,JSON.stringify(Store.d))}catch(e){}CLOUD.state='on';CLOUD.last=Date.now()}else{const t=await r.text();if(missing(t)){CLOUD.noTable=true;CLOUD.state='not-enabled'}}}catch(e){}}
function schedule(ms){clearTimeout(pushT);pushT=setTimeout(push,ms||5000)}
const _set=Store.set.bind(Store);Store.set=function(n,v){_set(n,v);if(!applying&&!LOCAL_ONLY.includes(n)&&CLOUD.state==='on')schedule()};
pull();setInterval(()=>{if(document.visibilityState==='visible'&&CLOUD.state==='on')pull()},300000);
window.addEventListener('pagehide',()=>{if(pushT){clearTimeout(pushT);push()}});

/* ---- Telegram alerts card in the Alerts tab ---- */
async function api(path,opt){const s=sess();if(!s)throw new Error('signin');const r=await fetch(SB+'/rest/v1/'+path,{...opt,headers:{...H(s),Prefer:'return=representation',...(opt&&opt.headers||{})}});const t=await r.text();if(!r.ok){if(missing(t)){CLOUD.noTable=true;throw new Error('table')}throw new Error(t.slice(0,140))}return t?JSON.parse(t):null}
const _alerts=App.prototype.tAlerts;
App.prototype.tAlerts=function(){_alerts.call(this);const c=this.tabc,p=this.active,s=sess();
 const box=el('div',{class:'card cloud-card'});c.prepend(box);
 const st=el('div',{class:'mut'});const stTxt=()=>{st.textContent=!s?'Sign in to the suite (Google) to sync this workspace across devices and to get Telegram alerts.':CLOUD.noTable?'Cloud sync and Telegram alerts are not switched on yet: the owner runs database/07_chart_cloud.sql in Supabase once.':CLOUD.state==='on'?'Cloud sync is on: watchlists, layouts, drawings, indicators and alerts follow you on every device.':'Cloud sync: connecting…'};stTxt();
 box.append(el('h4',{},'Cloud sync & Telegram alerts'),st);
 if(!s||CLOUD.noTable)return;
 const chat=el('input',{value:Store.get('tgChat',''),placeholder:'Telegram chat ID',style:'width:140px',onchange:e=>Store.set('tgChat',e.target.value.trim())});
 const sym=el('input',{value:p?p.sym:'GC=F',style:'width:90px'}),typ=el('select',{},el('option',{value:'above'},'Price above'),el('option',{value:'below'},'Price below')),lvl=el('input',{placeholder:'level',style:'width:90px'}),note=el('input',{placeholder:'note (optional)',style:'width:140px'});
 const list=el('div');
 const load=async()=>{list.innerHTML='';try{const rows=await api('chart_alerts?select=*&order=created_at.desc&limit=50');if(!rows.length){list.append(el('div',{class:'mut'},'No Telegram alerts yet.'));return}
  const t=el('table',{class:'cot-t'},el('thead',{},el('tr',{},...['Symbol','Condition','Status',''].map(h=>el('th',{},h)))));const tb=el('tbody');
  rows.forEach(a=>tb.append(el('tr',{},el('td',{},a.sym),el('td',{},el('span',{},a.type==='above'?'Price above':'Price below'),' '+a.level),el('td',{class:a.active?'cot-up':''},a.active?el('span',{},'Active'):a.fired_at?el('span',{},el('span',{},'Fired'),' '+String(a.fired_at).slice(0,16).replace('T',' ')+' @ '+a.fired_price):el('span',{},'Off')),
   el('td',{},a.active?el('button',{onclick:async()=>{try{await api('chart_alerts?id=eq.'+encodeURIComponent(a.id),{method:'PATCH',body:JSON.stringify({active:false})});load()}catch(e){toast(e.message,'err')}}},'Turn off'):''))));t.append(tb);list.append(t)}catch(e){list.append(el('div',{class:'mut'},e.message==='table'?'Not switched on yet.':'Could not load: '+e.message))}};
 box.append(el('p',{class:'mut'},'These alerts are checked on the server every 10 minutes, even when this page and your phone are closed, and arrive as a Telegram message. Your chat ID: open the suite bot in Telegram and press Start, then send any message to @userinfobot and copy the number it shows.'),
  el('div',{class:'row2'},el('label',{},'Telegram chat ID'),chat),el('div',{class:'row2'},sym,typ,lvl),el('div',{class:'row2'},note,el('button',{onclick:async()=>{const v=parseFloat(lvl.value);if(!isFinite(v)){toast('Enter a price level','err');return}if(!chat.value.trim()){toast('Enter your Telegram chat ID','err');return}
   try{await api('chart_alerts',{method:'POST',body:JSON.stringify({id:uid()+uid(),sym:sym.value.trim().toUpperCase(),type:typ.value,level:v,note:note.value.trim()||null,tg_chat:chat.value.trim()})});lvl.value='';note.value='';toast('Telegram alert saved');load()}catch(e){toast(e.message==='table'?'Not switched on yet':e.message,'err')}}},'Add Telegram alert')),list);
 load()};
})();
