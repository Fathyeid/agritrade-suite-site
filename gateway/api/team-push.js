const webpush=require('web-push');
module.exports=async(req,res)=>{
  if(req.method!=='POST'){res.status(405).end();return;}
  if(!process.env.PUSH_SECRET||req.headers['x-push-secret']!==process.env.PUSH_SECRET){res.status(401).json({error:'no'});return;}
  let b=req.body;if(typeof b==='string')try{b=JSON.parse(b)}catch(e){b={}}
  const subs=(b&&b.subs)||[];
  webpush.setVapidDetails('mailto:fathyeid620@gmail.com',process.env.VAPID_PUBLIC,process.env.VAPID_PRIVATE);
  const payload=JSON.stringify({title:String(b.title||'AgriTrade Team').slice(0,120),body:String(b.body||'').slice(0,200),link:b.link||'',kind:b.kind||''});
  const out=await Promise.all(subs.map(s=>webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:3600,urgency:'high'}).then(()=>'ok').catch(e=>String(e.statusCode||e.message))));
  res.status(200).json({sent:out});
};
