'use strict';
const CFG=window.GS_CFG, $=s=>document.querySelector(s);
let LANG=localStorage.gs_lang||'ar', TOKEN=localStorage.gs_tok||'', ME=null, DEMO=localStorage.gs_demo==='1', D={}, PERMS=[];
const t=k=>LANG==='ar'&&AR[k]?AR[k]:k;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L={
 role:{super_admin:'Super Admin',storage_manager:'Storage Manager',warehouse_manager:'Warehouse Manager',qc_manager:'Quality Control Manager',inspector:'Grain Inspector',lab_analyst:'Laboratory Analyst',maintenance:'Maintenance Engineer',pest_specialist:'Pest Control Specialist',operations:'Operations Employee',auditor:'Auditor'},
 ftype:{silo:'Grain Silos',flat_warehouse:'Flat Warehouse',horizontal:'Horizontal Storage',port:'Port Storage',industrial:'Industrial Grain Storage',temporary:'Temporary Storage'},
 fstatus:{operational:'Operational',limited:'Limited',maintenance:'Under maintenance',closed:'Closed'},
 sstatus:{active:'Active',empty:'Empty',maintenance:'Under maintenance',closed:'Closed'},
 metric:{temperature:'Grain temperature',moisture:'Grain moisture',rh:'Relative humidity',ambient_temp:'Ambient air temperature'},
 src:{manual:'Manual entry',sensor:'Sensor',ai_estimate:'AI estimate'},
 mov:{receive:'Receiving into silo',transfer:'Silo-to-silo transfer',processing:'Processing withdrawal',dispatch:'Sales dispatch',loss:'Recorded loss'},
 loss:{shrink_moisture:'Moisture shrink',scale_variance:'Scale variance',pest:'Pest damage',spoilage:'Spoilage',spillage:'Spillage',recording_error:'Recording error',unexplained:'Unexplained'},
 cat:{high_temperature:'High temperature',abnormal_temperature_variation:'Abnormal temperature variation',high_moisture:'High moisture',humidity_risk:'Humidity risk',missing_data:'Missing data'},
 sev:{info:'Info',warning:'Warning',critical:'Critical'},
 ast:{new:'New',acknowledged:'Acknowledged',assigned:'Assigned',investigating:'Under investigation',action_required:'Action required',resolved:'Resolved',closed:'Closed'},
 act:{inspect_now:'Inspect the silo now with a qualified person and review the condition of the grain.',inspect_soon:'Schedule an inspection soon and compare with the next readings.',record_reading:'Record a fresh temperature and moisture reading. Missing data is not treated as normal.'},
 health:{excellent:'Excellent',good:'Good',monitor:'Monitoring Required',warning:'Warning',critical:'Critical',nodata:'No data',empty:'Empty'},
 lot:{stored:'In storage',closed:'Closed'}
};
const lb=(g,v)=>t(L[g]?.[v]||v||'');
const HC={excellent:'green',good:'green',monitor:'yellow',warning:'orange',critical:'red',nodata:'gray',empty:'gray'};
const n=(v,d=1)=>v==null||v===''||isNaN(v)?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d});
const dt=(v,time)=>v?new Date(v).toLocaleString('en-GB',time?{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short',year:'numeric'}):'—';
const ago=v=>{if(!v)return '—';const m=(Date.now()-new Date(v))/60000;return m<60?Math.round(m)+t('m ago'):m<2880?Math.round(m/60)+t('h ago'):Math.round(m/1440)+t('d ago')};
const can=a=>PERMS.includes(a);
function toast(m,err){const e=document.createElement('div');e.className='toast'+(err?' err':'');e.textContent=m;$('#toast').append(e);setTimeout(()=>e.remove(),4500)}
const ERRM={invalid_credentials:'Wrong email or password.',too_many_attempts:'Too many attempts. Try again in 15 minutes.',invalid_claim:'Invitation code is invalid or already used.',weak_password:'Password must be at least 10 characters.',forbidden:'Your role does not allow this action.',reason_required:'A reason is required.',note_required:'A note is required.',assignee_required:'Choose who to assign this to.',value_out_of_range:'Value is outside the possible range.',measured_in_future:'Measurement time is in the future.',cannot_demote_self:'You cannot demote or disable yourself.'};
function errText(e){const m=String(e.message||e);for(const k in ERRM)if(m.includes(k))return t(ERRM[k]);
 if(m.includes('quantity_exceeds_available'))return t('Quantity exceeds what this lot holds in the source silo.')+' '+(m.match(/lot has ([\d.]+)/)?.[0]||'');
 if(m.includes('silo_capacity_exceeded'))return t('Silo capacity would be exceeded.')+' '+(m.match(/free space [\d.-]+/)?.[0]||'');
 if(m.includes('receive_exceeds_lot_quantity'))return t('Received quantity would exceed the declared lot quantity.');
 if(m.includes('movements_are_immutable'))return t('Movements cannot be edited. Add a correcting movement.');
 if(m.includes('duplicate key'))return t('This code already exists.');
 if(m.includes('permission denied')||m.includes('row-level security'))return t(ERRM.forbidden);return m.slice(0,200)}
async function api(path,o={}){const h={apikey:CFG.anon,'Content-Type':'application/json',Authorization:'Bearer '+(TOKEN||CFG.anon)};if(o.prefer)h.Prefer=o.prefer;
 const r=await fetch(CFG.url+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined});const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{}
 if(!r.ok){if(r.status===401&&TOKEN&&!path.includes('gs_login')){logout(true);throw new Error('session expired')}throw new Error(j?.message||txt||r.status)}return j}
const rpc=(f,b)=>api('/rest/v1/rpc/'+f,{method:'POST',body:b||{}});
const get=(tbl,q='')=>api('/rest/v1/'+tbl+(q?'?'+q:''));
const ins=(tbl,b)=>api('/rest/v1/'+tbl,{method:'POST',body:b,prefer:'return=representation'});
const upd=(tbl,id,b)=>api('/rest/v1/'+tbl+'?id=eq.'+id,{method:'PATCH',body:b,prefer:'return=representation'});
function logout(silent){TOKEN='';localStorage.removeItem('gs_tok');ME=null;if(!silent)toast(t('Signed out'));render()}
function setLang(l){LANG=l;localStorage.gs_lang=l;render()}
function setDemo(v){DEMO=v;localStorage.gs_demo=v?'1':'0';load().then(render)}
/* ---------- data ---------- */
async function load(){
 const dq=DEMO?'':'&is_demo=eq.false';
 const [fac,silos,lots,com,stock,reads,alerts,users]=await Promise.all([
  get('gs_facilities','select=*&order=code'+dq),get('gs_silos','select=*&order=code'+dq),get('gs_lots','select=*&order=created_at.desc'+dq),
  get('gs_commodities','select=*&order=name_en'),get('gs_stock','select=*'),
  get('gs_readings','select=*&voided_at=is.null&order=measured_at.desc&limit=4000&measured_at=gte.'+new Date(Date.now()-31*864e5).toISOString()+dq),
  get('gs_alerts','select=*&order=detected_at.desc&limit=500'+dq),get('gs_users','select=id,email,full_name,role,active,is_demo&order=full_name')]);
 const sid=new Set(silos.map(s=>s.id)),lid=new Set(lots.map(l=>l.id));
 D={fac,silos,lots,com,stock:stock.filter(s=>sid.has(s.silo_id)&&lid.has(s.lot_id)),reads,alerts,users};
 D.comBy=Object.fromEntries(com.map(c=>[c.id,c]));D.facBy=Object.fromEntries(fac.map(f=>[f.id,f]));D.siloBy=Object.fromEntries(silos.map(s=>[s.id,s]));D.lotBy=Object.fromEntries(lots.map(l=>[l.id,l]));D.userBy=Object.fromEntries(users.map(u=>[u.id,u]));await load2();
 PERMS=(await get('gs_role_perms','select=action&role=eq.'+ME.role)).map(x=>x.action);
}
function siloQty(s){return D.stock.filter(x=>x.silo_id===s.id).reduce((a,x)=>a+Number(x.qty_mt),0)}
function siloLots(s){return D.stock.filter(x=>x.silo_id===s.id&&x.qty_mt>0).map(x=>({lot:D.lotBy[x.lot_id],qty:Number(x.qty_mt)}))}
function latest(sid,metric){return D.reads.find(r=>r.silo_id===sid&&r.metric===metric&&r.source!=='ai_estimate')||null}
function siloState(s){
 const q=siloQty(s),sl=siloLots(s),lot=sl.sort((a,b)=>b.qty-a.qty)[0]?.lot,c=lot&&D.comBy[lot.commodity_id];
 const o={s,q,lot,c,lots:sl,temp:latest(s.id,'temperature'),moist:latest(s.id,'moisture'),rh:latest(s.id,'rh')};
 if(q<=0){o.level='empty';return o}
 const stale=(c?.stale_hours||48)*36e5,fresh=r=>r&&Date.now()-new Date(r.measured_at)<=stale;
 o.fresh={temp:fresh(o.temp),moist:fresh(o.moist),rh:fresh(o.rh)};
 if(!o.fresh.temp&&!o.fresh.moist&&!o.fresh.rh){o.level='nodata';return o}
 let lv=0;const chk=(r,w,k,ok)=>{if(!r||!ok||w==null)return;const v=Number(r.value);lv=Math.max(lv,k!=null&&v>=k?4:v>=w?3:v>=w*.92?2:v>=w*.85?1:0)};
 chk(o.temp,c?.temp_warn,c?.temp_crit,o.fresh.temp);chk(o.moist,c?.moist_warn,c?.moist_crit,o.fresh.moist);chk(o.rh,c?.rh_warn,c?.rh_crit,o.fresh.rh);
 const full=o.fresh.temp&&o.fresh.moist;
 o.partial=!full;o.level=lv>=4?'critical':lv===3?'warning':lv===2?'monitor':(lv===0&&full&&c?.temp_warn!=null&&c?.moist_warn!=null)?'excellent':'good';
 if(o.partial&&o.level==='excellent')o.level='good';
 return o}
const activeAlerts=()=>D.alerts.filter(a=>!['resolved','closed'].includes(a.status));
/* ---------- ui helpers ---------- */
const badge=(txt,cls='')=>`<span class="badge ${cls}">${esc(txt)}</span>`;
const hb=lv=>badge(lb('health',lv),'b-'+HC[lv]);
const srcb=s=>badge(lb('src',s),'src-'+s);
const demob=x=>x?.is_demo?badge(t('DEMO'),'b-demo'):'';
const field=(id,label,inner)=>`<div class="field"><label for="${id}">${t(label)}</label>${inner}</div>`;
const inp=(id,label,v='',type='text',extra='')=>field(id,label,`<input id="${id}" type="${type}" value="${esc(v)}" ${extra}>`);
const sel=(id,label,opts,v='',extra='')=>field(id,label,`<select id="${id}" ${extra}>${opts.map(([k,l])=>`<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`);
const val=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
const num=id=>{const v=val(id);return v===''?null:Number(v)};
function modal(title,body,onok,okLabel='Save'){const m=$('#modal');m.hidden=false;m.innerHTML=`<div class="modal"><h2>${t(title)}</h2>${body}<div class="act"><button class="btn sec" onclick="closeM()">${t('Cancel')}</button>${onok?`<button class="btn" id="mok">${t(okLabel)}</button>`:''}</div></div>`;
 if(onok)$('#mok').onclick=async()=>{const b=$('#mok');b.disabled=true;try{await onok();if($('#mok')===b)closeM()}catch(e){toast(errText(e),true);b.disabled=false}}}
window.closeM=()=>{$('#modal').hidden=true;$('#modal').innerHTML=''};
const csv=(name,rows)=>{const b=new Blob(['\ufeff'+rows.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click()};
function chart(points,o={}){ // points [{t,v,s}] ; thresholds warn/crit
 if(!points.length)return `<div class="empty">${t('No readings in this period')}</div>`;
 const W=640,H=190,P=34,xs=points.map(p=>+new Date(p.t)),vs=points.map(p=>+p.v);
 let mn=Math.min(...vs,o.warn??1e9),mx=Math.max(...vs,o.crit??-1e9,o.warn??-1e9);if(mn===mx){mn-=1;mx+=1}const pad=(mx-mn)*.1;mn-=pad;mx+=pad;
 const x0=Math.min(...xs),x1=Math.max(...xs)||x0+1,X=x=>P+(x1===x0?(W-2*P)/2:(x-x0)/(x1-x0)*(W-2*P)),Y=v=>H-P+8-(v-mn)/(mx-mn)*(H-2*P);
 const line=points.map((p,i)=>(i?'L':'M')+X(xs[i]).toFixed(1)+' '+Y(vs[i]).toFixed(1)).join('');
 const col={manual:'#1e63d6',sensor:'#1f9d57',ai_estimate:'#8a4fd8'};
 const th=(v,c,l)=>v==null?'':`<line x1="${P}" x2="${W-P}" y1="${Y(v)}" y2="${Y(v)}" stroke="${c}" stroke-dasharray="5 4"/><text x="${W-P}" y="${Y(v)-3}" font-size="10" fill="${c}" text-anchor="end">${l} ${v}</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;direction:ltr"><rect width="${W}" height="${H}" fill="#fff"/>
 ${[0,.5,1].map(f=>{const v=mn+(mx-mn)*f;return `<line x1="${P}" x2="${W-P}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e8eef7"/><text x="${P-4}" y="${Y(v)+3}" font-size="10" fill="#62758f" text-anchor="end">${v.toFixed(1)}</text>`}).join('')}
 ${th(o.warn,'#ee7d17',t('warn'))}${th(o.crit,'#d93636',t('crit'))}
 <path d="${line}" fill="none" stroke="#9db8e8" stroke-width="1.6"/>${points.map((p,i)=>`<circle cx="${X(xs[i])}" cy="${Y(vs[i])}" r="3.4" fill="${col[p.s]||'#1e63d6'}"><title>${esc(n(p.v,2))} ${esc(o.unit||'')} | ${esc(dt(p.t,1))} | ${esc(lb('src',p.s))}</title></circle>`).join('')}
 <text x="${P}" y="${H-6}" font-size="10" fill="#62758f">${esc(dt(x0))}</text><text x="${W-P}" y="${H-6}" font-size="10" fill="#62758f" text-anchor="end">${esc(dt(x1))}</text></svg>`}
/* ---------- shell ---------- */
const ICO={'dashboard': '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>', 'facilities': '<path d="M3 21V9l6 3V9l6 3V5h6v16z"/>', 'silos': '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14c0 1.4 3 2.5 7 2.5s7-1.1 7-2.5V5"/>', 'readings': '<path d="M3 17l5-6 4 4 8-9"/>', 'alerts': '<path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4"/>', 'lots': '<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7"/>', 'thresholds': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', 'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a3.5 3.5 0 010 7"/>', 'audit': '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7"/>', 'quality': '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/>', 'pests': '<circle cx="12" cy="13" r="4"/><path d="M12 9V5M8 11L4 8M16 11l4-3M8 15l-4 3M16 15l4 3M9 4l3 1 3-1"/>', 'inspections': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>', 'soon': '<circle cx="12" cy="12" r="8"/>'};const svg=k=>`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg>`;
const NAV=[['dashboard','dashboard','Storage Dashboard'],['facilities','facilities','Storage Facilities'],['silos','silos','Silos Management'],['readings','readings','Readings & Monitoring'],['alerts','alerts','Alerts Center'],['lots','lots','Storage Inventory'],['quality','quality','Grain Quality'],['pests','pests','Pest Monitoring'],['aeration','aeration','Aeration Management'],['fumigation','fumigation','Fumigation Management'],['inspections','inspections','Inspection Scheduler'],['visual','visual','Visual Monitoring'],['risk','risk','AI Risk Prediction'],['trace','trace','Grain Traceability'],['costs','costs','Costs & Losses'],['equipment','equipment','Equipment & Maintenance'],['sensors','sensors','Sensors & API'],['reports','reports','Reports & Analytics'],['assistant','assistant','AI Storage Assistant'],['thresholds','thresholds','Alert Thresholds']];
const SOON=[];
function shell(inner,title,actions=''){
 const r=route().p[0]||'dashboard',oa=activeAlerts().length;
 return `<div class="shell"><aside class="side" id="side"><div class="brand"><img src="logo.svg" alt=""><div><b>AGRI TRADE PRO</b><small>${t('Grain Storage Intelligence')}</small></div></div>
 <nav class="nav"><h6>${t('Operations')}</h6>${NAV.map(([k,i,l])=>`<a href="#/${k}" class="${r===k||(k==='silos'&&r==='silo')||(k==='lots'&&r==='lot')?'on':''}" onclick="document.getElementById('side').classList.remove('open')"><span class="ic">${svg(i)}</span>${t(l)}${k==='alerts'&&oa?`<span class="tag" style="background:#fde2e2;color:#a31f1f">${oa}</span>`:''}</a>`).join('')}
 ${can('admin')||can('export')?`<h6>${t('Administration')}</h6>${can('admin')?`<a href="#/users" class="${r==='users'?'on':''}"><span class="ic">${svg('users')}</span>${t('Users & Roles')}</a>`:''}<a href="#/audit" class="${r==='audit'?'on':''}"><span class="ic">${svg('audit')}</span>${t('Audit Log')}</a>`:''}
 ${SOON.length?`<h6>${t('Next stages')}</h6>`:''}${SOON.map(s=>`<a class="soon"><span class="ic">${svg('soon')}</span>${t(s)}<span class="tag">${t('Soon')}</span></a>`).join('')}</nav></aside>
 <main class="main"><div class="top"><button class="pill menu-btn" onclick="document.getElementById('side').classList.toggle('open')">☰</button><h1>${t(title)}</h1>${actions}
 <label class="pill flex" title="${t('Demo records are labeled and never counted as real data unless this is on')}"><input type="checkbox" style="width:auto" ${DEMO?'checked':''} onchange="setDemo(this.checked)"> ${t('Show demo data')}</label>
 <button class="pill" onclick="setLang('${LANG==='ar'?'en':'ar'}')">${LANG==='ar'?'English':'العربية'}</button>
 <span class="pill">${esc(ME.full_name)} · ${lb('role',ME.role)}</span><button class="pill" onclick="logout()">${t('Sign out')}</button></div>
 ${DEMO?`<div class="banner ban-demo">${t('Demo data is visible. Records marked DEMO are samples for preview only. They are not real readings.')}</div>`:''}${inner}</main></div>`}
function route(){const h=location.hash.replace(/^#\/?/,'').split('?')[0].split('/');return {p:h}}
/* ---------- login ---------- */
function loginView(mode='in'){
 const A=LANG==='ar',F=[['°C',A?'مراقبة الحرارة والرطوبة':'Temperature & humidity',A?'قراءات كل صومعة بمصدرها':'Every silo reading with its source'],['!',A?'تنبيهات قابلة للضبط':'Configurable alerts',A?'حدود لكل سلعة':'Thresholds per commodity'],['▣',A?'الدفعات والكميات':'Lots & quantities',A?'تتبع كل طن من الاستلام للصرف':'Every ton from receipt to dispatch'],['✓',A?'الجودة والآفات والفحوصات':'Quality, pests, inspections',A?'جدول فحص وسجل متابعة':'Inspection calendar and follow-up log'],['☰',A?'الصلاحيات وسجل التدقيق':'Roles & audit trail',A?'كل إجراء مسجل':'Every action recorded'],['◈',A?'تقديرات لا أوامر':'Estimates, not commands',A?'لا تشغيل تلقائي للمراوح أو التبخير':'No automatic fans or fumigation']];
 return `<div class="login"><div class="hero"><div class="brand"><div><b class="bn">Agri<span>Trade</span> <i>Pro</i></b><div class="bt">Trade • Intelligence • Collaboration</div></div><img src="logo.svg" width="46" height="46" alt=""></div>
 <h1 class="ht">${A?'ذكاء تخزين الحبوب<br><em>ومنظومة الحفاظ عليها</em>':'Grain Storage Intelligence<br><em>&amp; Preservation Platform</em>'}</h1>
 <span class="gold">${A?'إنذار مبكر للحبوب المخزنة':'Early warning for stored grain'}</span><p>${t('Monitor temperature, moisture and humidity in every silo, trace every ton from receipt to dispatch, and catch spoilage risks before the grain is damaged.')}</p>
 <div class="fcards">${F.map(f=>`<div class="fc"><span class="fi">${f[0]}</span><div><b>${f[1]}</b><small>${f[2]}</small></div></div>`).join('')}</div></div>
 <div class="lbox"><div class="card"><div class="flex" style="justify-content:space-between"><h3 style="margin:0">${mode==='in'?t('Sign in'):t('Activate your account')}</h3><button class="pill" onclick="setLang('${LANG==='ar'?'en':'ar'}')">${LANG==='ar'?'English':'العربية'}</button></div><br>
 ${inp('em','Email','','email','autocomplete="username"')}${mode==='claim'?inp('cd','Invitation code'):''}${mode==='claim'?inp('nm','Full name (optional)'):''}${inp('pw',mode==='in'?'Password':'New password (min 10 characters)','','password',`autocomplete="${mode==='in'?'current-password':'new-password'}"`)}
 <button class="btn" style="width:100%" id="go">${mode==='in'?t('Sign in'):t('Activate and sign in')}</button><p class="small" style="text-align:center"><a href="#" id="sw">${mode==='in'?t('I have an invitation code'):t('Back to sign in')}</a></p></div></div></div>`}
function bindLogin(mode){
 $('#sw').onclick=e=>{e.preventDefault();$('#app').innerHTML=loginView(mode==='in'?'claim':'in');bindLogin(mode==='in'?'claim':'in')};
 const go=async()=>{const b=$('#go');b.disabled=true;try{const r=mode==='in'?await rpc('gs_login',{p_email:val('em'),p_password:$('#pw').value}):await rpc('gs_claim',{p_email:val('em'),p_code:val('cd'),p_password:$('#pw').value,p_name:val('nm')});
  TOKEN=r.token;localStorage.gs_tok=TOKEN;ME=r.user;boot()}catch(e){toast(errText(e),true);b.disabled=false}};
 $('#go').onclick=go;$('#pw').onkeydown=e=>{if(e.key==='Enter')go()}}
/* ---------- pages ---------- */
function pgDashboard(){
 const S=D.silos.map(siloState),act=S.filter(x=>x.level!=='empty'),total=S.reduce((a,x)=>a+x.q,0);
 const avg=k=>{const v=act.filter(x=>x[k]&&x.fresh?.[k==='moist'?'moist':k]).map(x=>+x[k].value);return {v:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,n:v.length}};
 const at=avg('temp'),am=avg('moist'),ar=avg('rh'),hi=new Set(S.filter(x=>['warning','critical'].includes(x.level)&&x.lot).map(x=>x.lot.id)).size;
 const cnt=l=>S.filter(x=>x.level===l).length,dist={green:cnt('excellent')+cnt('good'),yellow:cnt('monitor'),orange:cnt('warning'),red:cnt('critical'),gray:cnt('nodata')};
 const tot=Object.values(dist).reduce((a,b)=>a+b,0)||1,cols={green:'#1f9d57',yellow:'#e0a800',orange:'#ee7d17',red:'#d93636',gray:'#aab4c3'};
 const K=(l,v,s='')=>`<div class="card kpi"><div class="l">${t(l)}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
 const rep=(a)=>a.n?`${a.n} ${t('of')} ${act.length} ${t('silos reporting')}`:t('No fresh readings');
 const alerts=activeAlerts();
 window._range=window._range||'7d';
 return `<div class="grid g4">${K('Total stored quantity',n(total,0)+' MT')}${K('Storage facilities',D.fac.length)}${K('Active silos',D.silos.filter(s=>s.status==='active').length,`${S.filter(x=>x.level==='empty').length} ${t('empty')}`)}${K('Storage lots',D.lots.filter(l=>l.status==='stored').length)}
 ${K('Average grain temperature',at.v==null?'—':n(at.v)+' °C',rep(at))}${K('Average moisture content',am.v==null?'—':n(am.v)+' %',rep(am))}${K('Average relative humidity',ar.v==null?'—':n(ar.v)+' %',rep(ar))}${K('High-risk storage lots',hi,t('Warning or critical'))}
 ${K('Active alerts',alerts.length,`${alerts.filter(a=>a.severity==='critical').length} ${t('critical')}`)}${K('Silos with no fresh data',cnt('nodata'),t('Not counted as normal'))}</div><br>${dash2()}
 <div class="grid g2"><div class="card"><h3>${t('Storage risk distribution')}</h3><div class="dist">${Object.entries(dist).map(([k,v])=>v?`<i style="width:${v/tot*100}%;background:${cols[k]}" title="${v}"></i>`:'').join('')}</div>
 <div class="leg"><span><b style="background:#1f9d57"></b>${t('Normal')} ${dist.green}</span><span><b style="background:#e0a800"></b>${t('Moderate')} ${dist.yellow}</span><span><b style="background:#ee7d17"></b>${t('High')} ${dist.orange}</span><span><b style="background:#d93636"></b>${t('Critical')} ${dist.red}</span><span><b style="background:#aab4c3"></b>${t('No data')} ${dist.gray}</span></div>
 <p class="small">${t('A silo with grain but no recent reading is shown as No data, never as normal.')}</p></div>
 <div class="card"><h3>${t('Storage health overview')}</h3>${['excellent','good','monitor','warning','critical','nodata'].map(l=>`<div class="flex" style="justify-content:space-between;padding:4px 0">${hb(l)}<b>${cnt(l)}</b></div>`).join('')}</div></div><br>
 <div class="card"><div class="flex"><h3 style="margin:0">${t('Average temperature trend (real readings only)')}</h3><div class="tabs right" style="margin:0">${[['24h',t('24 hours')],['7d',t('7 days')],['30d',t('30 days')]].map(([k,l])=>`<button class="${window._range===k?'on':''}" onclick="window._range='${k}';render()">${l}</button>`).join('')}</div></div>${trendAvg()}</div><br>
 <div class="grid g2"><div class="card"><h3>${t('Silos needing attention')}</h3>${attention(S)}</div><div class="card"><h3>${t('Latest active alerts')}</h3>${alertList(alerts.slice(0,6),true)}</div></div>`}
function trendAvg(){const ms={'24h':864e5,'7d':7*864e5,'30d':30*864e5}[window._range],since=Date.now()-ms,rs=D.reads.filter(r=>r.metric==='temperature'&&r.source!=='ai_estimate'&&+new Date(r.measured_at)>=since);
 if(!rs.length)return `<div class="empty">${t('No readings in this period')}</div>`;const step=window._range==='24h'?36e5:864e5,b={};rs.forEach(r=>{const k=Math.floor(+new Date(r.measured_at)/step)*step;(b[k]=b[k]||[]).push(+r.value)});
 return chart(Object.entries(b).sort((a,c)=>a[0]-c[0]).map(([k,v])=>({t:new Date(+k).toISOString(),v:v.reduce((a,c)=>a+c,0)/v.length,s:'manual'})),{unit:'°C'})}
function attention(S){const x=S.filter(s=>['critical','warning','monitor','nodata'].includes(s.level)).sort((a,b)=>['critical','warning','monitor','nodata'].indexOf(a.level)-['critical','warning','monitor','nodata'].indexOf(b.level)).slice(0,8);
 return x.length?`<div class="tw"><table>${x.map(s=>`<tr><td><a href="#/silo/${s.s.id}">${esc(s.s.code)}</a> ${demob(s.s)}<div class="small">${esc(D.facBy[s.s.facility_id]?.name||'')}</div></td><td>${esc(s.c?(LANG==='ar'?s.c.name_ar:s.c.name_en):'')}</td><td>${hb(s.level)}</td></tr>`).join('')}</table></div>`:`<div class="empty">${t('Nothing needs attention right now')}</div>`}
function pgFacilities(){
 const rows=D.fac.map(f=>{const ss=D.silos.filter(s=>s.facility_id===f.id),occ=ss.reduce((a,s)=>a+siloQty(s),0);return `<tr><td>${esc(f.code)} ${demob(f)}</td><td><a href="#/facility/${f.id}">${esc(LANG==='ar'&&f.name_ar?f.name_ar:f.name)}</a></td><td>${lb('ftype',f.type)}</td><td>${esc([f.city,f.country].filter(Boolean).join(', '))}</td><td>${n(f.capacity_mt,0)}</td><td>${n(occ,0)}</td><td>${n(f.capacity_mt-occ,0)}</td><td>${ss.length}</td><td>${dt(f.last_inspection)}</td><td>${badge(lb('fstatus',f.status),f.status==='operational'?'b-green':'b-orange')}</td>${can('edit')?`<td><button class="btn sec sm" onclick="A.facForm('${f.id}')">${t('Edit')}</button></td>`:''}</tr>`}).join('');
 return `<div class="card tw">${D.fac.length?`<table><tr><th>ID</th><th>${t('Name')}</th><th>${t('Type')}</th><th>${t('Location')}</th><th>${t('Capacity (MT)')}</th><th>${t('Occupied (MT)')}</th><th>${t('Available (MT)')}</th><th>${t('Silos')}</th><th>${t('Last inspection')}</th><th>${t('Status')}</th>${can('edit')?'<th></th>':''}</tr>${rows}</table>`:`<div class="empty">${t('No facilities yet. Add your first facility.')}</div>`}</div>`}
const FT=()=>Object.entries(L.ftype).map(([k,v])=>[k,t(v)]);
const A={
 facForm(id){const f=id?D.facBy[id]:{};modal(id?'Edit facility':'Add facility',`<div class="row2">${inp('f_code','Facility ID',f.code||'')}${inp('f_name','Name (English)',f.name||'')}</div><div class="row2">${inp('f_ar','Name (Arabic)',f.name_ar||'')}${sel('f_type','Type',FT(),f.type||'silo')}</div>
 <div class="row3">${inp('f_country','Country',f.country||'')}${inp('f_city','City',f.city||'')}${inp('f_cap','Total capacity (MT)',f.capacity_mt??'','number','min="0" step="any"')}</div><div class="row2">${inp('f_lat','GPS latitude',f.lat??'','number','step="any"')}${inp('f_lng','GPS longitude',f.lng??'','number','step="any"')}</div>
 <div class="row3">${inp('f_vent','Ventilation system',f.ventilation_system||'')}${inp('f_ts','Temperature monitoring system',f.temp_system||'')}${inp('f_hs','Humidity monitoring system',f.humidity_system||'')}</div>${inp('f_eq','Storage equipment',f.equipment||'')}
 <div class="row2">${sel('f_st','Status',Object.entries(L.fstatus).map(([k,v])=>[k,t(v)]),f.status||'operational')}${inp('f_li','Last inspection date',f.last_inspection||'','date')}</div>`,async()=>{
  const b={code:val('f_code'),name:val('f_name'),name_ar:val('f_ar')||null,type:val('f_type'),country:val('f_country')||null,city:val('f_city')||null,capacity_mt:num('f_cap'),lat:num('f_lat'),lng:num('f_lng'),ventilation_system:val('f_vent')||null,temp_system:val('f_ts')||null,humidity_system:val('f_hs')||null,equipment:val('f_eq')||null,status:val('f_st'),last_inspection:val('f_li')||null};
  if(!b.code||!b.name||b.capacity_mt==null)throw new Error(t('Fill the required fields'));id?await upd('gs_facilities',id,b):await ins('gs_facilities',b);await load();render()})},
 siloForm(id,fid){const s=id?D.siloBy[id]:{facility_id:fid};modal(id?'Edit silo':'Add silo',`${sel('s_fac','Facility',D.fac.map(f=>[f.id,f.code+' - '+f.name]),s.facility_id)}<div class="row2">${inp('s_code','Silo ID',s.code||'')}${inp('s_cap','Capacity (MT)',s.capacity_mt??'','number','min="0" step="any"')}</div><div class="row3">${inp('s_h','Height (m)',s.height_m??'','number','step="any"')}${inp('s_d','Diameter (m)',s.diameter_m??'','number','step="any"')}${sel('s_st','Status',Object.entries(L.sstatus).map(([k,v])=>[k,t(v)]),s.status||'active')}</div>`,async()=>{
  const b={facility_id:val('s_fac'),code:val('s_code'),capacity_mt:num('s_cap'),height_m:num('s_h'),diameter_m:num('s_d'),status:val('s_st')};if(!b.facility_id||!b.code||!b.capacity_mt)throw new Error(t('Fill the required fields'));
  id?await upd('gs_silos',id,b):await ins('gs_silos',b);await load();render()})},
 lotForm(){modal('New storage lot',`<div class="row2">${inp('l_code','Lot ID')}${sel('l_com','Commodity',D.com.map(c=>[c.id,LANG==='ar'?c.name_ar:c.name_en]))}</div><div class="row3">${inp('l_ct','Origin country')}${inp('l_sup','Supplier')}${inp('l_yr','Crop year','','number','min="1990" max="2100"')}</div>
 <div class="row3">${inp('l_imp','Import transaction ID')}${inp('l_bl','Bill of lading')}${inp('l_ves','Vessel name')}</div><div class="row3">${inp('l_arr','Arrival date','','date')}${inp('l_dis','Discharge date','','date')}${inp('l_qty','Declared quantity (MT)','','number','min="0" step="any"')}</div>${inp('l_q','Initial quality certificate / note')}
 <p class="small">${t('After creating the lot, record a Receiving movement to place the grain in a silo.')}</p>`,async()=>{
  const b={lot_code:val('l_code'),commodity_id:val('l_com'),origin_country:val('l_ct')||null,supplier:val('l_sup')||null,crop_year:num('l_yr'),import_txn_ref:val('l_imp')||null,bill_of_lading:val('l_bl')||null,vessel:val('l_ves')||null,arrival_date:val('l_arr')||null,discharge_date:val('l_dis')||null,initial_qty_mt:num('l_qty'),initial_quality_note:val('l_q')||null};
  if(!b.lot_code||!b.initial_qty_mt)throw new Error(t('Fill the required fields'));await ins('gs_lots',b);await load();render()})},
 movForm(lotId){const lots=D.lots.filter(l=>l.status==='stored');if(!lots.length)return toast(t('Create a lot first'),true);
  const silo=D.silos.map(s=>[s.id,s.code]);modal('Record grain movement',`${sel('m_lot','Lot',lots.map(l=>[l.id,l.lot_code]),lotId||lots[0].id)}${sel('m_type','Movement type',Object.entries(L.mov).map(([k,v])=>[k,t(v)]),'receive','onchange="A.movUI()"')}
  <div class="row2"><div id="m_fromw">${sel('m_from','From silo',silo)}</div><div id="m_tow">${sel('m_to','To silo',silo)}</div></div><div class="row2">${inp('m_qty','Quantity (MT)','','number','min="0" step="any"')}${inp('m_at','Date and time',new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16),'datetime-local')}</div>
  <div id="m_lossw">${sel('m_loss','Loss cause',Object.entries(L.loss).map(([k,v])=>[k,t(v)]),'unexplained')}</div>${inp('m_ref','Reference (weighbridge ticket, invoice...)')}${inp('m_note','Note')}<div id="m_hint" class="small"></div>`,async()=>{
  const ty=val('m_type'),b={lot_id:val('m_lot'),type:ty,qty_mt:num('m_qty'),moved_at:new Date(val('m_at')).toISOString(),ref:val('m_ref')||null,note:val('m_note')||null,from_silo:['transfer','processing','dispatch','loss'].includes(ty)?val('m_from'):null,to_silo:['receive','transfer'].includes(ty)?val('m_to'):null,loss_cause:ty==='loss'?val('m_loss'):null};
  if(!b.qty_mt||b.qty_mt<=0)throw new Error(t('Fill the required fields'));await ins('gs_movements',b);await load();render()});A.movUI()},
 movUI(){const ty=val('m_type');$('#m_fromw').hidden=ty==='receive';$('#m_tow').hidden=!['receive','transfer'].includes(ty);$('#m_lossw').hidden=ty!=='loss';
  const lot=val('m_lot');const h=D.stock.filter(x=>x.lot_id===lot).map(x=>`${D.siloBy[x.silo_id]?.code}: ${n(x.qty_mt,2)} MT`).join(' | ');$('#m_hint').textContent=h?t('Currently in:')+' '+h:''},
 readForm(siloId){const ss=D.silos;if(!ss.length)return toast(t('Add a silo first'),true);modal('Record a reading',`${sel('r_silo','Silo',ss.map(s=>[s.id,s.code]),siloId||ss[0].id)}<div class="row3">${sel('r_met','Measurement',['temperature','moisture','rh','ambient_temp'].map(k=>[k,t(L.metric[k])]))}${inp('r_val','Value','','number','step="any"')}${sel('r_unit','Unit',[['C','°C'],['F','°F'],['pct','%']],'C')}</div>
  <div class="row3">${inp('r_depth','Depth (m, optional)','','number','step="any" min="0"')}${inp('r_zone','Zone / probe point (optional)')}${inp('r_at','Measured at',new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16),'datetime-local')}</div>${inp('r_note','Note')}
  <p class="small">${t('Saved as Manual entry. Readings cannot be edited later; a wrong reading can only be voided with a reason.')}</p>`,async()=>{
  let v=num('r_val'),unit=val('r_unit'),met=val('r_met');if(v==null)throw new Error(t('Fill the required fields'));
  if(met==='moisture'||met==='rh'){if(unit!=='pct')throw new Error(t('Moisture and humidity use %'))}else{if(unit==='pct')throw new Error(t('Temperature uses °C or °F'));if(unit==='F')v=(v-32)*5/9}
  await ins('gs_readings',{silo_id:val('r_silo'),metric:met,value:Math.round(v*100)/100,unit:met==='moisture'||met==='rh'?'%':'C',depth_m:num('r_depth'),zone:val('r_zone')||null,source:'manual',measured_at:new Date(val('r_at')).toISOString(),note:val('r_note')||null});await load();render()})},
 voidR(id){modal('Void this reading',`<p class="small">${t('The reading stays in the history and audit log, but is excluded from calculations.')}</p>${inp('v_r','Reason')}`,async()=>{await rpc('gs_void_reading',{p_id:id,p_reason:val('v_r')});await load();render()},'Void')},
 alertStep(id,to){const needNote=['resolved','closed'].includes(to),asg=to==='assigned';modal('Update alert status',`<p><b>${esc(t(L.ast[to]))}</b></p>${asg?sel('a_u','Assign to',D.users.filter(u=>u.active).map(u=>[u.id,u.full_name+' ('+lb('role',u.role)+')'])):''}${inp('a_n',needNote?'Resolution note (required)':'Note (optional)')}`,async()=>{
  await rpc('gs_alert_step',{p_id:id,p_to:to,p_note:val('a_n')||null,p_assignee:asg?val('a_u'):null});await load();render()})},
 async scan(){const c=await rpc('gs_scan');await load();render();toast(c?`${c} ${t('silos have no fresh readings')}`:t('All silos with grain have fresh readings'))},
 thrForm(id){const c=D.comBy[id];const f=(k,l)=>inp('t_'+k,l,c[k]??'','number','step="any"');modal('Edit thresholds',`<p><b>${esc(LANG==='ar'?c.name_ar:c.name_en)}</b></p><p class="small">${t('Editing clears the approval. A QC or storage manager must approve the values again.')}</p><div class="row3">${f('moist_warn','Moisture warning %')}${f('moist_crit','Moisture critical %')}${f('rh_warn','RH warning %')}</div><div class="row3">${f('rh_crit','RH critical %')}${f('temp_warn','Temperature warning °C')}${f('temp_crit','Temperature critical °C')}</div><div class="row3">${f('rise_warn_24h','Rise per 24h warning °C')}${f('spread_warn','Zone spread warning °C')}${f('stale_hours','No-data window (hours)')}</div>${inp('t_basis','Basis / reference standard',c.basis_note==='starting_value'?'':c.basis_note||'')}`,async()=>{
  const b={};['moist_warn','moist_crit','rh_warn','rh_crit','temp_warn','temp_crit','rise_warn_24h','spread_warn','stale_hours'].forEach(k=>b[k]=num('t_'+k));b.basis_note=val('t_basis')||'starting_value';b.approved_by=null;b.approved_at=null;await upd('gs_commodities',id,b);await load();render()})},
 async approve(id){try{await upd('gs_commodities',id,{approved_by:ME.id,approved_at:new Date().toISOString()});await load();render();toast(t('Approved'))}catch(e){toast(errText(e),true)}},
 invite(){modal('Invite a user',`${inp('i_em','Email','','email')}${inp('i_nm','Full name')}${sel('i_ro','Role',Object.entries(L.role).map(([k,v])=>[k,t(v)]),'operations')}`,async()=>{const c=await rpc('gs_invite',{p_email:val('i_em'),p_name:val('i_nm'),p_role:val('i_ro')});await load();render();setTimeout(()=>modal('Invitation code',`<p>${t('Give this one-time code to the user. They open the app, choose "I have an invitation code" and set their own password.')}</p><h2 style="direction:ltr;text-align:center;letter-spacing:2px">${esc(c)}</h2>`,null),50)},'Create invitation')},
 async setUser(id){const u=D.userBy[id];modal('Edit user',`<p><b>${esc(u.full_name)}</b> <span class="small">${esc(u.email)}</span></p>${sel('u_r','Role',Object.entries(L.role).map(([k,v])=>[k,t(v)]),u.role)}${sel('u_a','Status',[['1',t('Active')],['0',t('Disabled')]],u.active?'1':'0')}`,async()=>{await rpc('gs_set_user',{p_id:id,p_role:val('u_r'),p_active:val('u_a')==='1'});await load();render()})}
};
window.A=A;
function alertList(arr,mini){
 if(!arr.length)return `<div class="empty">${t('No alerts')}</div>`;
 return `<div class="tw"><table>${mini?'':`<tr><th>#</th><th>${t('Severity')}</th><th>${t('Category')}</th><th>${t('Silo')}</th><th>${t('Triggering data')}</th><th>${t('Detected')}</th><th>${t('Status')}</th><th>${t('Assigned to')}</th><th></th></tr>`}${arr.map(a=>{const s=D.siloBy[a.silo_id],tr=a.triggering||{};
 const trig=tr.metric&&tr.value!=null?`${t(L.metric[tr.metric])}: <b>${n(tr.value,2)}</b> (${t('warn')} ${n(tr.warn)} / ${t('crit')} ${n(tr.crit)}) ${tr.source?srcb(tr.source):''}`:tr.spread!=null?`${t('Zone spread')}: <b>${n(tr.spread)} °C</b> (${t('limit')} ${n(tr.limit)})`:tr.rise!=null?`${t('Rise in 24h')}: <b>+${n(tr.rise)} °C</b> (${t('limit')} ${n(tr.limit)})`:a.category==='pest_activity'?`${t('Pest')}: <b>${esc(t(tr.pest))}</b> (${lb('psev',tr.pest_severity)})`:a.category==='quality_concern'?`${t('Odor')}: <b>${lb('odor',tr.odor)}</b>${tr.live_insects?' · '+t('Live insects'):''}${Number(tr.insect_damaged_pct)>0?' · '+t('Insect damaged %')+' '+n(tr.insect_damaged_pct,2):''}`:a.category==='inspection_failed'?t('An inspection failed'):a.category==='missing_data'?`${t('Last reading')}: ${tr.last_reading?dt(tr.last_reading,1):t('never')}`:'';
 const sevc={critical:'b-red',warning:'b-orange',info:'b-blue'}[a.severity];
 if(mini)return `<tr><td>${badge(lb('sev',a.severity),sevc)}</td><td>${lb('cat',a.category)}<div class="small">${trig}</div></td><td><a href="#/silo/${a.silo_id}">${esc(s?.code||'')}</a></td></tr>`;
 const steps=['acknowledged','assigned','investigating','action_required','resolved','closed'].filter(x=>x!==a.status&&!['resolved','closed'].includes(a.status));
 return `<tr><td>${a.seq}</td><td>${badge(lb('sev',a.severity),sevc)}</td><td>${lb('cat',a.category)} ${demob(a)}${tr.basis==='thresholds_unapproved'?`<div class="small">${t('Based on unapproved starting thresholds')}</div>`:''}</td><td><a href="#/silo/${a.silo_id}">${esc(s?.code||'')}</a><div class="small">${esc(D.facBy[a.facility_id]?.name||'')}</div></td><td>${trig}<div class="small">${t(L.act[a.recommended_action]||'')}</div></td><td>${dt(a.detected_at,1)}</td><td>${badge(lb('ast',a.status),'b-blue')}${a.resolution_note?`<div class="small">${esc(a.resolution_note)}</div>`:''}</td><td>${esc(D.userBy[a.assigned_to]?.full_name||'—')}</td><td class="flex">${can('create')?steps.filter(x=>can(x==='assigned'?'assign':['resolved','closed'].includes(x)?'close_alerts':'create')).map(x=>`<button class="btn sec sm" onclick="A.alertStep('${a.id}','${x}')">${t(L.ast[x])}</button>`).join(''):''}</td></tr>`}).join('')}</table></div>`}
function pgAlerts(){const f=window._af||'open',arr=f==='open'?activeAlerts():f==='all'?D.alerts:D.alerts.filter(a=>['resolved','closed'].includes(a.status));
 return `<div class="tabs">${[['open','Open'],['closed','Resolved / closed'],['all','All']].map(([k,l])=>`<button class="${f===k?'on':''}" onclick="window._af='${k}';render()">${t(l)}</button>`).join('')}</div><div class="card">${alertList(arr)}</div>`}
function pgSilos(){const S=D.silos.map(siloState);
 return `<div class="card tw">${S.length?`<table><tr><th>${t('Silo')}</th><th>${t('Facility')}</th><th>${t('Commodity')}</th><th>${t('Quantity (MT)')}</th><th>${t('Fill')}</th><th>${t('Temp °C')}</th><th>${t('Moisture %')}</th><th>${t('RH %')}</th><th>${t('Health')}</th></tr>${S.map(x=>`<tr><td><a href="#/silo/${x.s.id}">${esc(x.s.code)}</a> ${demob(x.s)}</td><td>${esc(D.facBy[x.s.facility_id]?.name||'')}</td><td>${x.c?esc(LANG==='ar'?x.c.name_ar:x.c.name_en):'—'}</td><td>${n(x.q,1)} / ${n(x.s.capacity_mt,0)}</td><td style="min-width:90px"><div class="bar"><i style="width:${Math.min(100,x.q/x.s.capacity_mt*100)}%"></i></div></td>${['temp','moist','rh'].map(k=>`<td>${x[k]?n(x[k].value)+(x.fresh&&x.fresh[k]===false?` <span class="badge b-gray">${t('stale')}</span>`:''):'—'}</td>`).join('')}<td>${hb(x.level)}</td></tr>`).join('')}</table>`:`<div class="empty">${t('No silos yet.')}</div>`}</div>`}
function cyl(s,x){const fill=Math.min(1,x.q/s.capacity_mt),col={excellent:'#2fb36a',good:'#2fb36a',monitor:'#e0a800',warning:'#ee7d17',critical:'#d93636',nodata:'#aab4c3',empty:'#dfe8f5'}[x.level];
 return `<svg viewBox="0 0 120 180" width="130" class="silo-cyl"><defs><clipPath id="cp"><path d="M10 30v120c0 10 22 16 50 16s50-6 50-16V30z"/></clipPath></defs><path d="M10 30v120c0 10 22 16 50 16s50-6 50-16V30z" fill="#f4f8ff" stroke="#9db8e8" stroke-width="2"/><g clip-path="url(#cp)"><rect x="0" y="${166-136*fill}" width="120" height="${136*fill+4}" fill="${col}" opacity=".85"/></g><ellipse cx="60" cy="30" rx="50" ry="14" fill="#e6efff" stroke="#9db8e8" stroke-width="2"/><text x="60" y="108" text-anchor="middle" font-size="18" font-weight="700" fill="#10223d">${Math.round(fill*100)}%</text></svg>`}
function pgSilo(id){const s=D.siloBy[id];if(!s)return `<div class="empty">${t('Not found')}</div>`;const x=siloState(s),f=D.facBy[s.facility_id],al=activeAlerts().filter(a=>a.silo_id===id);
 const m=window._m||'temperature',pts=D.reads.filter(r=>r.silo_id===id&&r.metric===m).sort((a,b)=>new Date(a.measured_at)-new Date(b.measured_at)).map(r=>({t:r.measured_at,v:r.value,s:r.source}));
 const th={temperature:[x.c?.temp_warn,x.c?.temp_crit,'°C'],moisture:[x.c?.moist_warn,x.c?.moist_crit,'%'],rh:[x.c?.rh_warn,x.c?.rh_crit,'%'],ambient_temp:[null,null,'°C']}[m];
 const R=(k,l,u)=>{const r=x[k];return `<tr><td>${t(l)}</td><td><b>${r?n(r.value,2)+' '+u:t('No reading')}</b></td><td>${r?srcb(r.source):''}</td><td>${r?`${dt(r.measured_at,1)} <span class="small">(${ago(r.measured_at)})</span>`:''}</td><td>${r&&x.fresh&&!x.fresh[k]?badge(t('Stale'),'b-gray'):''}</td></tr>`};
 const lots=x.lots.map(l=>`<a href="#/lot/${l.lot.id}">${esc(l.lot.lot_code)}</a> (${n(l.qty,2)} MT)`).join('، ')||'—';
 const hist=D.reads.filter(r=>r.silo_id===id).slice(0,25);
 return `<p><a href="#/silos">← ${t('Silos Management')}</a></p><div class="grid g3"><div class="card" style="text-align:center">${cyl(s,x)}<h3 style="margin-top:8px">${esc(s.code)} ${demob(s)}</h3><div>${hb(x.level)}</div>${x.partial&&x.level!=='empty'&&x.level!=='nodata'?`<p class="small">${t('Based on partial data: temperature and moisture are both needed for Excellent.')}</p>`:''}</div>
 <div class="card" style="grid-column:span 2"><h3>${t('Silo profile')}</h3><table><tr><td class="mut">${t('Facility')}</td><td>${esc(f?.name||'')} <span class="small">${esc(f?.code||'')}</span></td><td class="mut">${t('Capacity (MT)')}</td><td>${n(s.capacity_mt,0)}</td></tr>
 <tr><td class="mut">${t('Current quantity (MT)')}</td><td>${n(x.q,2)}</td><td class="mut">${t('Commodity')}</td><td>${x.c?esc(LANG==='ar'?x.c.name_ar:x.c.name_en):'—'}</td></tr>
 <tr><td class="mut">${t('Crop year')}</td><td>${x.lot?.crop_year||'—'}</td><td class="mut">${t('Loading date')}</td><td>${x.lot?dt(D.reads&&movFirst(x.lot.id,id)):'—'}</td></tr>
 <tr><td class="mut">${t('Storage duration')}</td><td>${x.lot&&movFirst(x.lot.id,id)?Math.round((Date.now()-new Date(movFirst(x.lot.id,id)))/864e5)+' '+t('days'):'—'}</td><td class="mut">${t('Supplier')}</td><td>${esc(x.lot?.supplier||'—')}</td></tr>
 <tr><td class="mut">${t('Origin')}</td><td>${esc(x.lot?.origin_country||'—')}</td><td class="mut">${t('Related import transaction')}</td><td>${esc(x.lot?.import_txn_ref||'—')}</td></tr>
 <tr><td class="mut">${t('Lots in silo')}</td><td colspan="3">${lots}</td></tr></table>${can('edit')?`<br><button class="btn sec sm" onclick="A.siloForm('${s.id}')">${t('Edit')}</button>`:''}</div></div><br>
 <div class="grid g2"><div class="card"><div class="flex"><h3 style="margin:0">${t('Latest readings')}</h3>${can('create')?`<button class="btn sm right" onclick="A.readForm('${s.id}')">+ ${t('Record a reading')}</button>`:''}</div><div class="tw"><table><tr><th>${t('Measurement')}</th><th>${t('Value')}</th><th>${t('Source')}</th><th>${t('Measured at')}</th><th></th></tr>${R('temp','Grain temperature','°C')}${R('moist','Grain moisture','%')}${R('rh','Relative humidity','%')}</table></div>${x.level==='nodata'?`<div class="banner ban-warn">${t('No fresh readings. This silo is not considered normal until a reading is recorded.')}</div>`:''}</div>
 <div class="card"><h3>${t('Active alerts')}</h3>${alertList(al,true)}</div></div><br>
 <div class="card"><div class="tabs">${['temperature','moisture','rh','ambient_temp'].map(k=>`<button class="${m===k?'on':''}" onclick="window._m='${k}';render()">${t(L.metric[k])}</button>`).join('')}</div>${chart(pts,{warn:th[0],crit:th[1],unit:th[2]})}<div class="leg"><span><b style="background:#1e63d6"></b>${t('Manual entry')}</span><span><b style="background:#1f9d57"></b>${t('Sensor')}</span><span><b style="background:#8a4fd8"></b>${t('AI estimate')}</span></div></div><br>
 ${silo2(id)}<div class="card"><h3>${t('Reading history')}</h3>${readTable(hist)}</div>`}
function movFirst(lot,silo){const m=D.movs&&D.movs.filter(x=>x.lot_id===lot&&x.to_silo===silo).sort((a,b)=>new Date(a.moved_at)-new Date(b.moved_at))[0];return m?.moved_at}
function readTable(rs){return rs.length?`<div class="tw"><table><tr><th>${t('Measured at')}</th><th>${t('Silo')}</th><th>${t('Measurement')}</th><th>${t('Value')}</th><th>${t('Depth')}/${t('Zone')}</th><th>${t('Source')}</th><th>${t('Recorded by')}</th><th></th></tr>${rs.map(r=>`<tr><td>${dt(r.measured_at,1)}</td><td><a href="#/silo/${r.silo_id}">${esc(D.siloBy[r.silo_id]?.code||'')}</a></td><td>${t(L.metric[r.metric])}</td><td><b>${n(r.value,2)}</b> ${r.unit==='C'?'°C':'%'}</td><td>${[r.depth_m!=null?r.depth_m+' m':'',r.zone].filter(Boolean).map(esc).join(' / ')||'—'}</td><td>${srcb(r.source)} ${demob(r)}</td><td>${esc(D.userBy[r.created_by]?.full_name||'—')}${r.note?`<div class="small">${esc(r.note)}</div>`:''}</td><td>${can('edit')?`<button class="btn sec sm" onclick="A.voidR('${r.id}')">${t('Void')}</button>`:''}</td></tr>`).join('')}</table></div>`:`<div class="empty">${t('No readings yet. Record the first one.')}</div>`}
function pgReadings(){const rs=D.reads.slice(0,200);return `<div class="banner ban-info">${t('Every reading shows its source: Manual entry, Sensor, or AI estimate. Sensor ingestion (REST/MQTT) arrives in a later stage, so today all readings are manual.')}</div><div class="card"><div class="flex"><h3 style="margin:0">${t('Latest readings')}</h3><span class="right flex">${can('export')?`<button class="btn sec sm" onclick="A.exportReads()">CSV</button>`:''}${can('create')?`<button class="btn sm" onclick="A.readForm()">+ ${t('Record a reading')}</button>`:''}</span></div>${readTable(rs)}</div>`}
A.exportReads=()=>csv('readings.csv',[['measured_at','silo','metric','value','unit','depth_m','zone','source','note','demo'],...D.reads.map(r=>[r.measured_at,D.siloBy[r.silo_id]?.code,r.metric,r.value,r.unit,r.depth_m,r.zone,r.source,r.note,r.is_demo])]);
function pgLots(){
 const rows=D.lots.map(l=>{const st=D.stock.filter(x=>x.lot_id===l.id),cur=st.reduce((a,x)=>a+Number(x.qty_mt),0),c=D.comBy[l.commodity_id];return `<tr><td><a href="#/lot/${l.id}">${esc(l.lot_code)}</a> ${demob(l)}</td><td>${esc(LANG==='ar'?c.name_ar:c.name_en)}</td><td>${esc(l.origin_country||'—')}</td><td>${esc(l.supplier||'—')}</td><td>${n(l.initial_qty_mt,1)}</td><td>${n(cur,1)}</td><td>${st.map(x=>esc(D.siloBy[x.silo_id]?.code)).join(', ')||'—'}</td><td>${badge(lb('lot',l.status),'b-blue')}</td></tr>`}).join('');
 return `<div class="card"><div class="flex"><h3 style="margin:0">${t('Storage lots')}</h3><span class="right flex">${can('create')?`<button class="btn sec sm" onclick="A.lotForm()">+ ${t('New storage lot')}</button><button class="btn sm" onclick="A.movForm()">+ ${t('Record grain movement')}</button>`:''}</span></div><div class="tw">${D.lots.length?`<table><tr><th>${t('Lot ID')}</th><th>${t('Commodity')}</th><th>${t('Origin')}</th><th>${t('Supplier')}</th><th>${t('Declared (MT)')}</th><th>${t('Current (MT)')}</th><th>${t('Silo allocation')}</th><th>${t('Status')}</th></tr>${rows}</table>`:`<div class="empty">${t('No lots yet.')}</div>`}</div></div>`}
function pgLot(id){const l=D.lotBy[id];if(!l)return `<div class="empty">${t('Not found')}</div>`;const c=D.comBy[l.commodity_id],mv=(D.movs||[]).filter(m=>m.lot_id===id).sort((a,b)=>new Date(a.moved_at)-new Date(b.moved_at)),st=D.stock.filter(x=>x.lot_id===id);
 const rcv=mv.filter(m=>m.type==='receive').reduce((a,m)=>a+Number(m.qty_mt),0),out=mv.filter(m=>['processing','dispatch'].includes(m.type)).reduce((a,m)=>a+Number(m.qty_mt),0),loss=mv.filter(m=>m.type==='loss').reduce((a,m)=>a+Number(m.qty_mt),0),cur=st.reduce((a,x)=>a+Number(x.qty_mt),0);
 return `<p><a href="#/lots">← ${t('Storage Inventory')}</a></p><div class="card"><div class="flex"><h3 style="margin:0">${esc(l.lot_code)} ${demob(l)}</h3>${can('create')?`<button class="btn sm right" onclick="A.movForm('${l.id}')">+ ${t('Record grain movement')}</button>`:''}</div><div class="grid g3" style="margin-top:10px">
 <div><span class="mut">${t('Commodity')}</span><br><b>${esc(LANG==='ar'?c.name_ar:c.name_en)}</b></div><div><span class="mut">${t('Origin')}</span><br>${esc(l.origin_country||'—')}</div><div><span class="mut">${t('Supplier')}</span><br>${esc(l.supplier||'—')}</div>
 <div><span class="mut">${t('Import transaction ID')}</span><br>${esc(l.import_txn_ref||'—')}</div><div><span class="mut">${t('Bill of lading')}</span><br>${esc(l.bill_of_lading||'—')}</div><div><span class="mut">${t('Vessel name')}</span><br>${esc(l.vessel||'—')}</div>
 <div><span class="mut">${t('Arrival date')}</span><br>${dt(l.arrival_date)}</div><div><span class="mut">${t('Discharge date')}</span><br>${dt(l.discharge_date)}</div><div><span class="mut">${t('Initial quality certificate / note')}</span><br>${esc(l.initial_quality_note||'—')}</div></div></div><br>
 <div class="grid g4"><div class="card kpi"><div class="l">${t('Declared (MT)')}</div><div class="v">${n(l.initial_qty_mt,2)}</div></div><div class="card kpi"><div class="l">${t('Received into silos')}</div><div class="v">${n(rcv,2)}</div></div><div class="card kpi"><div class="l">${t('Withdrawn')}</div><div class="v">${n(out,2)}</div></div><div class="card kpi"><div class="l">${t('Recorded loss')}</div><div class="v">${n(loss,2)}</div></div><div class="card kpi"><div class="l">${t('Current (MT)')}</div><div class="v">${n(cur,2)}</div><div class="s">${st.map(x=>esc(D.siloBy[x.silo_id]?.code)+': '+n(x.qty_mt,2)).join(' | ')}</div></div></div><br>
 <div class="card"><h3>${t('Traceability: movement history')}</h3>${mv.length?`<div class="tw"><table><tr><th>${t('Date and time')}</th><th>${t('Movement type')}</th><th>${t('From silo')}</th><th>${t('To silo')}</th><th>${t('Quantity (MT)')}</th><th>${t('Reference')}</th><th>${t('Recorded by')}</th></tr>${mv.map(m=>`<tr><td>${dt(m.moved_at,1)}</td><td>${lb('mov',m.type)}${m.loss_cause?` <span class="badge">${lb('loss',m.loss_cause)}</span>`:''}</td><td>${esc(D.siloBy[m.from_silo]?.code||'—')}</td><td>${esc(D.siloBy[m.to_silo]?.code||'—')}</td><td>${n(m.qty_mt,2)}</td><td>${esc(m.ref||'')}${m.note?`<div class="small">${esc(m.note)}</div>`:''}</td><td>${esc(D.userBy[m.created_by]?.full_name||'—')}</td></tr>`).join('')}</table></div>`:`<div class="empty">${t('No movements yet.')}</div>`}<p class="small">${t('Movements cannot be edited or deleted. Mistakes are fixed with a correcting movement. A weight difference is never treated as damage automatically.')}</p></div>`}
function pgThresholds(){const rows=D.com.map(c=>{const ap=c.approved_at;return `<tr><td><b>${esc(LANG==='ar'?c.name_ar:c.name_en)}</b></td><td>${n(c.moist_warn)}/${n(c.moist_crit)}</td><td>${n(c.temp_warn)}/${n(c.temp_crit)}</td><td>${n(c.rh_warn)}/${n(c.rh_crit)}</td><td>${n(c.rise_warn_24h)}</td><td>${n(c.spread_warn)}</td><td>${c.stale_hours}h</td><td>${c.moist_warn==null&&c.temp_warn==null?badge(t('No thresholds: no alerts'),'b-gray'):ap?badge(t('Approved')+' · '+(D.userBy[c.approved_by]?.full_name||''),'b-green'):badge(t('Starting value, not approved'),'b-yellow')}<div class="small">${c.basis_note==='starting_value'||c.basis_note==='no_thresholds'?'':esc(c.basis_note||'')}</div></td><td class="flex">${can('approve')?`<button class="btn sec sm" onclick="A.thrForm('${c.id}')">${t('Edit')}</button>${!ap&&c.temp_warn!=null?`<button class="btn sm" onclick="A.approve('${c.id}')">${t('Approve')}</button>`:''}`:''}</td></tr>`}).join('');
 return `<div class="banner ban-warn">${t('These are editable starting values from common storage guidance, not an official standard. Have your quality team confirm them against your contract and technical references before relying on the alerts.')}</div><div class="card tw"><table><tr><th>${t('Commodity')}</th><th>${t('Moisture warn/crit %')}</th><th>${t('Temp warn/crit °C')}</th><th>${t('RH warn/crit %')}</th><th>${t('Rise 24h °C')}</th><th>${t('Zone spread °C')}</th><th>${t('No-data window')}</th><th>${t('Status')}</th><th></th></tr>${rows}</table></div>`}
async function pgUsers(){const rows=D.users.map(u=>`<tr><td>${esc(u.full_name)} ${demob(u)}</td><td>${esc(u.email)}</td><td>${lb('role',u.role)}</td><td>${badge(u.active?t('Active'):t('Disabled'),u.active?'b-green':'b-gray')}</td><td>${u.id!==ME.id?`<button class="btn sec sm" onclick="A.setUser('${u.id}')">${t('Edit')}</button>`:''}</td></tr>`).join('');
 return `<div class="card"><div class="flex"><h3 style="margin:0">${t('Users & Roles')}</h3><button class="btn sm right" onclick="A.invite()">+ ${t('Invite a user')}</button></div><div class="tw"><table><tr><th>${t('Name')}</th><th>Email</th><th>${t('Role')}</th><th>${t('Status')}</th><th></th></tr>${rows}</table></div></div><br><div class="card"><h3>${t('Role permissions')}</h3><div class="tw" id="permt"></div></div>`}
async function pgAudit(){const a=await get('gs_audit','select=*&order=at.desc&limit=150');return `<div class="card tw"><table><tr><th>${t('Date and time')}</th><th>${t('User')}</th><th>${t('Table')}</th><th>${t('Action')}</th><th>ID</th></tr>${a.map(r=>`<tr><td>${dt(r.at,1)}</td><td>${esc(D.userBy[r.by_user]?.full_name||'—')}</td><td>${esc(r.tbl.replace('gs_',''))}</td><td>${esc(r.action)}</td><td class="small" style="direction:ltr">${esc((r.row_id||'').slice(0,8))}</td></tr>`).join('')}</table></div>`}
/* ---------- render ---------- */
const TITLES={dashboard:'Storage Dashboard',facilities:'Storage Facilities',facility:'Storage Facilities',silos:'Silos Management',silo:'Silo profile',readings:'Readings & Monitoring',alerts:'Alerts Center',lots:'Storage Inventory',quality:'Grain Quality',pests:'Pest Monitoring',aeration:'Aeration Management',visual:'Visual Monitoring',risk:'AI Risk Prediction',trace:'Grain Traceability',costs:'Costs & Losses',equipment:'Equipment & Maintenance',sensors:'Sensors & API',reports:'Reports & Analytics',assistant:'AI Storage Assistant',fumigation:'Fumigation Management',inspections:'Inspection Scheduler',lot:'Lot traceability',thresholds:'Alert Thresholds',users:'Users & Roles',audit:'Audit Log'};
async function render(){
 const app=$('#app');document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ar'?'rtl':'ltr';
 if(!TOKEN||!ME){const m=location.hash==='#/claim'?'claim':'in';app.innerHTML=loginView(m);bindLogin(m);return}
 if(!D.fac)return;
 const [p,id]=route().p;const pg=p||'dashboard';let body='',act='';
 try{
 if(pg==='dashboard'){body=pgDashboard();act=can('create')?`<button class="btn sec sm" onclick="A.scan()">${t('Check for missing data')}</button>`:''}
 else if(pg==='facilities'){body=pgFacilities();act=can('create')?`<button class="btn" onclick="A.facForm()">+ ${t('Add facility')}</button>`:''}
 else if(pg==='facility'){const f=D.facBy[id];body=f?`<p><a href="#/facilities">← ${t('Storage Facilities')}</a></p><div class="card"><h3>${esc(f.name)} ${demob(f)}</h3><p class="mut">${esc(f.code)} · ${lb('ftype',f.type)} · ${esc([f.city,f.country].filter(Boolean).join(', '))}${f.lat!=null?` · <a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lng}#map=13/${f.lat}/${f.lng}">${f.lat}, ${f.lng}</a>`:''}</p><p>${t('Ventilation system')}: ${esc(f.ventilation_system||'—')} | ${t('Temperature monitoring system')}: ${esc(f.temp_system||'—')} | ${t('Humidity monitoring system')}: ${esc(f.humidity_system||'—')}</p><p>${t('Storage equipment')}: ${esc(f.equipment||'—')}</p></div><br><div class="flex" style="margin-bottom:10px"><h3 style="margin:0">${t('Silos')}</h3>${can('create')?`<button class="btn sm right" onclick="A.siloForm(null,'${f.id}')">+ ${t('Add silo')}</button>`:''}</div>`+pgSilosOf(f.id):`<div class="empty">${t('Not found')}</div>`}
 else if(pg==='silos'){body=pgSilos();act=can('create')?`<button class="btn" onclick="A.siloForm()">+ ${t('Add silo')}</button>`:''}
 else if(pg==='silo'){await ensureMovs();body=pgSilo(id)}
 else if(pg==='readings'){body=pgReadings()}
 else if(pg==='alerts'){body=pgAlerts();act=can('create')?`<button class="btn sec sm" onclick="A.scan()">${t('Check for missing data')}</button>`:''}
 else if(pg==='lots'){body=pgLots()}
 else if(pg==='lot'){await ensureMovs();body=pgLot(id)}
 else if(pg==='quality'){body=pgQuality()}
 else if(pg==='pests'){body=pgPests()}
 else if(pg==='visual'){body=pgVisual()}
 else if(pg==='risk'){body=pgRisk()}
 else if(pg==='trace'){body=pgTrace()}
 else if(pg==='costs'){body=pgCosts()}
 else if(pg==='equipment'){body=pgEquipment()}
 else if(pg==='sensors'){body=pgSensors()}
 else if(pg==='reports'){body=pgReports()}
 else if(pg==='assistant'){body=pgAssistant()}
 else if(pg==='aeration'){body=pgAeration();act=can('create')?`<button class="btn" onclick="A.aerForm()">+ ${t('Plan an aeration')}</button>`:''}
 else if(pg==='fumigation'){body=pgFumigation();act=can('create')?`<button class="btn" onclick="A.fumForm()">+ ${t('Open a fumigation record')}</button>`:''}
 else if(pg==='inspections'){body=pgInspections();act=can('create')?`<button class="btn" onclick="A.inspForm()">+ ${t('Schedule an inspection')}</button>`:''}
 else if(pg==='thresholds'){body=pgThresholds()}
 else if(pg==='users'&&can('admin')){body=await pgUsers()}
 else if(pg==='audit'&&(can('export')||can('admin'))){body=await pgAudit()}
 else body=`<div class="empty">${t('Not found')}</div>`;
 }catch(e){body=`<div class="banner ban-warn">${esc(errText(e))}</div>`}
 app.innerHTML=shell(body,TITLES[pg]||'Storage Dashboard',act);
 if(pg==='users'&&can('admin')){const pr=await get('gs_role_perms','select=*');const acts=['view','create','edit','approve','assign','export','sensors','close_alerts','admin'];$('#permt').innerHTML=`<table><tr><th>${t('Role')}</th>${acts.map(a=>`<th>${a}</th>`).join('')}</tr>${Object.keys(L.role).map(r=>`<tr><td>${lb('role',r)}</td>${acts.map(a=>`<td>${pr.some(x=>x.role===r&&x.action===a)?'✓':''}</td>`).join('')}</tr>`).join('')}</table>`}
}
function pgSilosOf(fid){const S=D.silos.filter(s=>s.facility_id===fid).map(siloState);return `<div class="card tw">${S.length?`<table>${S.map(x=>`<tr><td><a href="#/silo/${x.s.id}">${esc(x.s.code)}</a></td><td>${n(x.q,1)} / ${n(x.s.capacity_mt,0)} MT</td><td>${x.c?esc(LANG==='ar'?x.c.name_ar:x.c.name_en):'—'}</td><td>${hb(x.level)}</td></tr>`).join('')}</table>`:`<div class="empty">${t('No silos yet.')}</div>`}</div>`}
async function ensureMovs(){if(!D.movs||D._movsAt<Date.now()-15000){D.movs=await get('gs_movements','select=*&order=moved_at.desc&limit=2000');D._movsAt=Date.now()}}
async function boot(){try{await load();render()}catch(e){if(TOKEN){toast(errText(e),true)}}}
window.render=render;window.setLang=setLang;window.setDemo=setDemo;window.logout=logout;
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);if(TOKEN&&ME)load().then(render);else render()});
(async()=>{if(TOKEN){try{const r=await rpc('gs_refresh');if(r&&r.token){TOKEN=r.token;localStorage.gs_tok=TOKEN;ME=r.user}else TOKEN=''}catch{TOKEN=''}}
 if(TOKEN&&ME)boot();else render()})();
