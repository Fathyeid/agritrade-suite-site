'use strict';
/* Stage 7: design pass: photo banners, commodity strip, icons (Lucide, ISC), photo credits (Pexels) */
const LI={
 box:'M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
 building:'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4',
 silo:'M3 5v14a9 3 0 0 0 18 0V5M3 5a9 3 0 0 0 18 0M3 5a9 3 0 0 1 18 0M3 12a9 3 0 0 0 18 0',
 therm:'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z',
 drops:'M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05zM12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97',
 alert:'m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01',
 bug:'m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4',
 clip:'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM9 14l2 2 4-4',
 wind:'M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2',
 wheat:'M2 22 16 8M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94ZM7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94ZM11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94ZM20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4ZM11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0ZM18.47 13.47 20 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L12 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
 ship:'M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M12 10v4M12 2v3',
 anchor:'M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M9 5a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
 flask:'M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2M8.5 2h7M7 16h10',
 gauge:'m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0',
 shield:'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
 bean:'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
 chart:'M3 3v16a2 2 0 0 0 2 2h16M7 16l4-4 4 4 5-6',
 coin:'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 6v2M12 16v2',
 wrench:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z',
 chat:'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
 radio:'M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
 eye:'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
 route:'M6 19m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M18 5m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12'
};
const lic=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${(LI[k]||LI.gauge).split('M').filter(Boolean).map(d=>`<path d="M${d}"/>`).join('')}</svg>`;
const HERO={
 'Storage Dashboard':['silos','silo','Every silo, lot and risk across your storage network, in one view.'],
 'Storage Facilities':['port','anchor','Ports, warehouses and silo complexes where grain is held.'],
 'Silos Management':['silos','silo','Capacity, contents and condition of each silo.'],
 'Readings & Monitoring':['wheat','therm','Temperature, moisture and humidity readings, labeled by source.'],
 'Alerts Center':['silos','alert','Alerts raised from readings, missing data and overdue work.'],
 'Storage Inventory':['corn','box','Grain lots and every movement in and out of storage.'],
 'Grain Quality':['wheat','flask','Field and laboratory quality results, and certificates.'],
 'Pest Monitoring':['wheat','bug','Insect and pest findings and what was done about them.'],
 'Aeration Management':['silos','wind','Planned and approved aeration, recorded by people.'],
 'Fumigation Management':['silos','shield','Fumigation with specialist sign-off before anyone re-enters.'],
 'Inspection Scheduler':['silos','clip','Scheduled and overdue inspections.'],
 'Visual Monitoring':['silos','eye','Facility map, silo views and heatmaps from recorded readings.'],
 'AI Risk Prediction':['wheat','alert','Rule-based risk estimates with reasons. Missing data is never treated as low.'],
 'Grain Traceability':['ship','route','Follow a lot from vessel and bill of lading to silo and dispatch.'],
 'Costs & Losses':['soy','coin','Recorded storage costs and losses, per currency.'],
 'Equipment & Maintenance':['silos','wrench','Equipment register, service history and calibration.'],
 'Sensors & API':['silos','radio','Keys and endpoint for sensors that send readings over HTTPS.'],
 'Reports & Analytics':['port','chart','CSV exports and a printable storage summary.'],
 'AI Storage Assistant':['corn','chat','Answers from this system\'s own records only.'],
 'Alert Thresholds':['wheat','gauge','Warning limits per commodity.'],
 'Users & Roles':['silos','users','Who can see and do what.'],
 'Audit Log':['port','clip','Every change, with who and when.']
};
const _shell7=shell;shell=function(inner,title,actions){
 const h=HERO[title];let pre='';
 if(h)pre=`<div class="pghero" style="background-image:url(img/${h[0]}.jpg)" role="img" aria-label="${esc(t(title))}"><div class="in"><div class="ico">${lic(h[1])}</div><div><b>${t(title)}</b><span class="s">${t(h[2])}</span></div></div></div>`;
 if(title==='Storage Dashboard')pre+=`<div class="cstrip">${[['wheat','wheat','Wheat','#/lots'],['corn','wheat','Maize (corn)','#/lots'],['soy','bean','Soybeans','#/lots'],['silos','silo','Silos','#/silos'],['ship','ship','Vessels','#/trace'],['port','anchor','Ports','#/facilities']].map(([i,ic,l,hr])=>`<a class="ctile" href="${hr}" style="background-image:url(img/${i}.jpg)"><span>${lic(ic)}${t(l)}</span></a>`).join('')}</div>`;
 let out=_shell7(inner,title,actions);
 const credit=`<div class="credits">${t('Photos')}: <a target="_blank" rel="noopener" href="https://www.pexels.com/photo/golden-wheat-field-close-up-in-sunlight-33059077/">${t('wheat')}</a>, <a target="_blank" rel="noopener" href="https://www.pexels.com/photo/grain-bins-and-a-field-of-wheat-2714630/">${t('silos')}</a>, <a target="_blank" rel="noopener" href="https://www.pexels.com/photo/drone-shot-of-a-combine-harvester-harvesting-corn-10213238/">${t('corn')}</a>, <a target="_blank" rel="noopener" href="https://www.pexels.com/photo/close-up-of-soybeans-in-bountiful-harvest-36063252/">${t('soybeans')}</a>, <a target="_blank" rel="noopener" href="https://www.pexels.com/photo/large-container-ship-in-port-with-cranes-41151140/">${t('vessel')}</a>, <a target="_blank" rel="noopener" href="https://www.pexels.com/photo/cargo-ship-with-containers-in-shipping-port-30115463/">${t('port')}</a> · Pexels (${t('free to use under the Pexels License')}). ${t('Icons')}: <a target="_blank" rel="noopener" href="https://lucide.dev">Lucide</a> (ISC).</div>`;
 const i=out.indexOf('</main>');
 out=out.replace(/(<\/div>\s*(?:<div class="banner ban-demo">[\s\S]*?<\/div>)?)([\s\S]*)$/,(m,a,b)=>m);
 // insert hero right after the top bar and demo banner: find first occurrence of the inner body start
 const marker=inner.slice(0,60);const k=marker?out.indexOf(marker):-1;
 if(k>0&&pre)out=out.slice(0,k)+pre+out.slice(k);
 else if(pre)out=out.replace('</main>',pre+'</main>');
 return out.replace(/<\/main>/,credit+'</main>')};
const KPIIC=[[/quantity|stored|الكمية|مخزن/,'box'],[/facilit|منشآ/,'building'],[/silo|صوامع|صومعة/,'silo'],[/lot|دفع/,'box'],[/temp|حرار/,'therm'],[/moist|humid|رطوب/,'drops'],[/risk|خطر|مخاطر/,'alert'],[/pest|آفات|insect/,'bug'],[/inspect|فحص/,'clip'],[/fumig|تبخير/,'shield'],[/aerat|تهوية/,'wind'],[/alert|تنبيه/,'alert'],[/quality|deteriorat|جودة|تدهور/,'flask'],[/cost|تكلفة|loss|فاقد/,'coin'],[/equip|معدات|service|صيانة/,'wrench'],[/sensor|حساس|reading|قراءات/,'radio']];
function decorate(){document.querySelectorAll('.kpi:not([data-ic])').forEach(k=>{k.dataset.ic=1;const l=(k.querySelector('.l')?.innerText||'').toLowerCase();const m=KPIIC.find(([r])=>r.test(l));const d=document.createElement('div');d.className='kic';d.innerHTML=lic(m?m[1]:'gauge');k.appendChild(d)})}
new MutationObserver(()=>{decorate()}).observe(document.documentElement,{childList:true,subtree:true});
Object.assign(AR,{'Photos':'الصور','wheat':'القمح','silos':'الصوامع','corn':'الذرة','soybeans':'فول الصويا','vessel':'سفينة','port':'ميناء','free to use under the Pexels License':'مجانية الاستخدام بترخيص Pexels','Icons':'الأيقونات','Wheat':'القمح','Maize (corn)':'الذرة','Soybeans':'فول الصويا','Silos':'الصوامع','Vessels':'السفن','Ports':'الموانئ',
'Every silo, lot and risk across your storage network, in one view.':'كل صومعة ودفعة وخطر في شبكة التخزين، في عرض واحد.','Ports, warehouses and silo complexes where grain is held.':'الموانئ والمخازن ومجمعات الصوامع التي تُحفظ فيها الحبوب.','Capacity, contents and condition of each silo.':'سعة كل صومعة ومحتواها وحالتها.','Temperature, moisture and humidity readings, labeled by source.':'قراءات الحرارة والرطوبة، موسومة بمصدرها.','Alerts raised from readings, missing data and overdue work.':'تنبيهات من القراءات والبيانات المفقودة والأعمال المتأخرة.','Grain lots and every movement in and out of storage.':'دفعات الحبوب وكل حركة دخول وخروج من التخزين.','Field and laboratory quality results, and certificates.':'نتائج الجودة الميدانية والمعملية والشهادات.','Insect and pest findings and what was done about them.':'نتائج الحشرات والآفات وما تم بشأنها.','Planned and approved aeration, recorded by people.':'تهوية مخططة ومعتمدة يسجلها الأشخاص.','Fumigation with specialist sign-off before anyone re-enters.':'تبخير باعتماد المختص قبل أن يعود أي شخص.','Scheduled and overdue inspections.':'فحوصات مجدولة ومتأخرة.','Facility map, silo views and heatmaps from recorded readings.':'خريطة المنشآت وعروض الصوامع والخرائط الحرارية من القراءات المسجلة.','Rule-based risk estimates with reasons. Missing data is never treated as low.':'تقديرات مخاطر بقواعد مع الأسباب. البيانات المفقودة لا تُعتبر منخفضة أبداً.','Follow a lot from vessel and bill of lading to silo and dispatch.':'تتبع الدفعة من السفينة وبوليصة الشحن إلى الصومعة والصرف.','Recorded storage costs and losses, per currency.':'تكاليف وفاقد التخزين المسجلة، حسب العملة.','Equipment register, service history and calibration.':'سجل المعدات وتاريخ الصيانة والمعايرة.','Keys and endpoint for sensors that send readings over HTTPS.':'مفاتيح ونقطة اتصال للحساسات التي ترسل القراءات عبر HTTPS.','CSV exports and a printable storage summary.':'تصدير CSV وملخص تخزين قابل للطباعة.',"Answers from this system's own records only.":'إجابات من سجلات هذا النظام فقط.','Warning limits per commodity.':'حدود التحذير لكل سلعة.','Who can see and do what.':'من يرى ماذا ومن يفعل ماذا.','Every change, with who and when.':'كل تغيير، ومن قام به ومتى.'});
