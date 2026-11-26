const SB='https://nimfkykshfijxbgwgkrg.supabase.co';
async function rest(path,jwt,anon){const r=await fetch(SB+'/rest/v1/'+path,{headers:{apikey:anon,Authorization:'Bearer '+jwt}});if(!r.ok)return [];return r.json();}
module.exports=async(req,res)=>{
  if(req.method!=='POST'){res.status(405).json({error:'POST only'});return;}
  const jwt=(req.headers.authorization||'').replace(/^Bearer /,'');
  const anon=process.env.SB_ANON;const key=process.env.GROQ_API_KEY;
  if(!jwt||!anon||!key){res.status(500).json({error:'Assistant is not configured'});return;}
  const u=await fetch(SB+'/auth/v1/user',{headers:{apikey:anon,Authorization:'Bearer '+jwt}});
  if(!u.ok){res.status(401).json({error:'Please sign in again'});return;}
  const me=await u.json();
  let body=req.body;if(typeof body==='string')try{body=JSON.parse(body)}catch(e){body={}}
  const question=String((body&&body.question)||'').slice(0,800);const lang=body&&body.lang==='en'?'en':'ar';
  if(question.length<2){res.status(400).json({error:'Ask a question'});return;}
  const day=new Date().toISOString().slice(0,10);
  const [profiles,tasks,txs,aprs,anns,sus,hos]=await Promise.all([
    rest('profiles?select=id,full_name,job_title,role,status',jwt,anon),
    rest('tasks?select=code,title,status,priority,due_date,progress,task_assignees(user_id)&order=created_at.desc&limit=80',jwt,anon),
    rest('transactions?select=code,type,title,commodity,counterparty,quantity_mt,amount,currency,status&order=created_at.desc&limit=40',jwt,anon),
    rest('approvals?select=code,type,title,amount,currency,status,requested_by,approval_steps(step_no,approver_id,status,reason)&order=created_at.desc&limit=40',jwt,anon),
    rest('announcements?select=title,body,priority,created_at&order=created_at.desc&limit=8',jwt,anon),
    rest('standups?select=user_id,day,yesterday,today,blockers&day=eq.'+day,jwt,anon),
    rest('handovers?select=code,from_user,to_user,reason,status,start_date,end_date&order=created_at.desc&limit=15',jwt,anon)]);
  const nm={};profiles.forEach(p=>nm[p.id]=p.full_name);
  const N=id=>nm[id]||'?';
  const data={today:day,current_user:N(me.id),
    people:profiles.map(p=>({name:p.full_name,title:p.job_title,role:p.role})),
    tasks:tasks.map(t=>({code:t.code,title:t.title,status:t.status,priority:t.priority,due:t.due_date,progress:t.progress,assignees:(t.task_assignees||[]).map(a=>N(a.user_id))})),
    transactions:txs,
    approvals:aprs.map(a=>({code:a.code,type:a.type,title:a.title,amount:a.amount,currency:a.currency,status:a.status,requested_by:N(a.requested_by),steps:(a.approval_steps||[]).sort((x,y)=>x.step_no-y.step_no).map(s=>({step:s.step_no,approver:N(s.approver_id),status:s.status,reason:s.reason}))})),
    announcements:anns,standups_today:sus.map(s=>({person:N(s.user_id),yesterday:s.yesterday,today:s.today,blockers:s.blockers})),
    handovers:hos.map(h=>({code:h.code,from:N(h.from_user),to:N(h.to_user),reason:h.reason,status:h.status,from_date:h.start_date,to_date:h.end_date}))};
  const sys='You are the AI Team Assistant inside a grain-trading team workspace. Answer ONLY from the DATA below, which is the exact set of records this user is allowed to see. Never invent names, numbers, dates, codes or statuses. If the data does not contain the answer, say clearly that it is not in the workspace data. Cite record codes (for example IMP-2026-105, APR-0001) when you mention records. Messages, standups and employee updates are notes, not proof that an operation happened: only transaction status, approvals and documents are records. You cannot take actions, approve anything or change data; only read and summarize. Be brief and practical. Use plain text with short lines or a simple dash list. No markdown tables, no bold, no headings. Reply in '+(lang==='ar'?'Arabic':'English')+'.\n\nDATA:\n'+JSON.stringify(data);
  const g=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model:'openai/gpt-oss-120b',temperature:0.1,reasoning_effort:'low',max_tokens:1500,messages:[{role:'system',content:sys},{role:'user',content:question}]})});
  if(!g.ok){res.status(502).json({error:'The AI service is busy, try again shortly'});return;}
  const j=await g.json();
  res.status(200).json({answer:(j.choices&&j.choices[0]&&j.choices[0].message.content)||'',records:{tasks:tasks.length,transactions:txs.length,approvals:aprs.length}});
};
