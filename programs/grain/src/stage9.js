'use strict';
/* Stage 9: AI assistant (outside model via server function; key is never in the browser) */
function aiSnap(){
 const S=D.silos.map(siloState);const r1=v=>v==null?null:+(+v).toFixed(1);
 return {generated:new Date().toISOString(),demo_data_included:!!DEMO,
  silos:S.map(x=>({code:x.s.code,demo:!!x.s.is_demo,facility:D.facBy[x.s.facility_id]?.name,status:x.s.status,capacity_mt:+x.s.capacity_mt,stored_mt:+x.q.toFixed(1),commodity:x.c?.name_en||null,lot:x.lot?.lot_code||null,condition:x.level,
   temp_c:x.temp?r1(x.temp.value):null,temp_at:x.temp?.measured_at||null,moisture_pct:x.moist?r1(x.moist.value):null,moisture_at:x.moist?.measured_at||null,rh_pct:x.rh?r1(x.rh.value):null,rh_at:x.rh?.measured_at||null,fresh:x.fresh||null})),
  lots:D.lots.map(l=>({code:l.lot_code,demo:!!l.is_demo,commodity:D.comBy[l.commodity_id]?.name_en,origin:l.origin_country,vessel:l.vessel,initial_mt:+l.initial_qty_mt,status:l.status})),
  active_alerts:activeAlerts().slice(0,40).map(a=>({category:a.category,severity:a.severity,status:a.status,silo:D.siloBy[a.silo_id]?.code,detected_at:a.detected_at,demo:!!a.is_demo,detail:a.triggering||null,recommended:a.recommended_action||null})),
  pest_open:(D.pest||[]).filter(p=>p.status!=='resolved').slice(0,30).map(p=>({silo:D.siloBy[p.silo_id]?.code,type:p.pest_type,severity:p.severity,observed_at:p.observed_at,demo:!!p.is_demo})),
  latest_quality:(D.qual||[]).slice(0,20).map(q=>({silo:D.siloBy[q.silo_id]?.code,sampled_at:q.sampled_at,method:q.method,moisture_pct:q.moisture_pct,foreign_matter_pct:q.foreign_matter_pct,broken_pct:q.broken_pct,insect_damaged_pct:q.insect_damaged_pct,live_insects:q.live_insects,odor:q.odor,grade:q.grade,demo:!!q.is_demo})),
  inspections_overdue:(D.insp||[]).filter(i=>typeof isOverdue==='function'&&isOverdue(i)).length}}
async function aiAsk(){
 const inp=document.getElementById('ai_q'),out=document.getElementById('ai_out'),btn=document.getElementById('ai_go');const q=(inp.value||'').trim();if(!q)return;
 btn.disabled=true;out.innerHTML=`<div class="mut">${t('Thinking...')}</div>`;
 try{
  const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+TOKEN,'x-anon':CFG.anon},body:JSON.stringify({q,snapshot:aiSnap()})});
  const j=await r.json().catch(()=>({}));
  if(r.status===429)out.innerHTML=`<div class="banner ban-warn">${t(j.reason==='day'?'Daily limit for AI questions reached. Try again tomorrow.':j.reason==='global'?'The shared daily AI limit was reached. Try again tomorrow.':'Hourly limit for AI questions reached (12 per hour). Try again later.')}</div>`;
  else if(!r.ok)out.innerHTML=`<div class="banner ban-warn">${t(j.error==='not_configured'?'The AI assistant is not switched on yet.':'The AI assistant could not answer now. The records assistant below still works.')}</div>`;
  else out.innerHTML=`<div style="white-space:pre-wrap;line-height:1.7;background:#f6f9ff;border:1px solid var(--line);border-radius:12px;padding:12px">${esc(j.answer)}</div><div class="small" style="margin-top:6px">${t('AI-generated answer. Verify before relying on it.')} · ${t('Questions left this hour')}: ${j.left_hour}</div>`;
 }catch(e){out.innerHTML=`<div class="banner ban-warn">${t('The AI assistant could not answer now. The records assistant below still works.')}</div>`}
 btn.disabled=false}
const _pgAs9=pgAssistant;pgAssistant=function(){
 let h=_pgAs9().replace(/<div class="banner ban-info">[\s\S]*?<\/div>/,`<div class="banner ban-info">${t('The records assistant answers only from the records in this system, with no outside model. The AI assistant above sends a summary of your visible records to an outside model (Groq) to write its answer.')}</div>`);
 const ai=`<div class="card" style="margin-bottom:14px;border-color:#d4a017"><div class="flex" style="justify-content:space-between"><b>${t('AI assistant')}</b><span class="badge" style="background:#fff4cc;color:#6b4e00;border-radius:8px;padding:2px 8px;font-size:11px">${t('AI')} · ${t('estimates')}</span></div>
 <div class="banner ban-warn" style="margin:10px 0">${t('AI assistant. It can make mistakes. Verify before relying on it, and check the records it names. It never sends commands, and missing data is reported as missing.')}</div>
 <div class="flex"><input id="ai_q" maxlength="600" placeholder="${t('Ask in Arabic or English, e.g. which silo is most at risk and why?')}" style="flex:1;min-width:200px" onkeydown="if(event.key==='Enter')aiAsk()"><button class="btn gold" id="ai_go" onclick="aiAsk()">${t('Ask AI')}</button></div>
 <div id="ai_out" style="margin-top:10px"></div><div class="small" style="margin-top:6px">${t('Limits: 12 questions per hour and 50 per day per person.')}</div></div>`;
 return ai+h};
Object.assign(AR,{'AI assistant':'المساعد الذكي','AI':'ذكاء اصطناعي','estimates':'تقديرات','Ask AI':'اسأل الذكاء الاصطناعي','Thinking...':'جارٍ التفكير...','Ask in Arabic or English, e.g. which silo is most at risk and why?':'اسأل بالعربية أو الإنجليزية، مثلاً: أي صومعة أعلى خطراً ولماذا؟',
'AI assistant. It can make mistakes. Verify before relying on it, and check the records it names. It never sends commands, and missing data is reported as missing.':'المساعد الذكي قد يخطئ. تحقق قبل الاعتماد عليه وراجع السجلات التي يذكرها. لا يرسل أي أوامر، والبيانات الناقصة تُذكر على أنها ناقصة.',
'AI-generated answer. Verify before relying on it.':'إجابة مولّدة بالذكاء الاصطناعي. تحقق قبل الاعتماد عليها.','Questions left this hour':'الأسئلة المتبقية هذه الساعة','Limits: 12 questions per hour and 50 per day per person.':'الحدود: 12 سؤالاً في الساعة و50 في اليوم لكل شخص.',
'Hourly limit for AI questions reached (12 per hour). Try again later.':'تم بلوغ حد الأسئلة في الساعة (12). حاول لاحقاً.','Daily limit for AI questions reached. Try again tomorrow.':'تم بلوغ الحد اليومي لأسئلة الذكاء الاصطناعي. حاول غداً.','The shared daily AI limit was reached. Try again tomorrow.':'تم بلوغ الحد اليومي المشترك. حاول غداً.',
'The AI assistant is not switched on yet.':'المساعد الذكي غير مفعّل بعد.','The AI assistant could not answer now. The records assistant below still works.':'تعذّر على المساعد الذكي الإجابة الآن. مساعد السجلات أدناه ما زال يعمل.',
'The records assistant answers only from the records in this system, with no outside model. The AI assistant above sends a summary of your visible records to an outside model (Groq) to write its answer.':'مساعد السجلات يجيب من سجلات هذا النظام فقط دون نموذج خارجي. أما المساعد الذكي أعلاه فيرسل ملخصاً للسجلات الظاهرة لك إلى نموذج خارجي (Groq) ليكتب إجابته.'});
