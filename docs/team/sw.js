self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
  let d={};try{d=e.data.json();}catch(x){d={title:'AgriTrade Team',body:e.data?e.data.text():''};}
  e.waitUntil(self.registration.showNotification(d.title||'AgriTrade Team',{body:d.body||'',icon:'/team/assets/icon-192.png',badge:'/team/assets/icon-192.png',tag:d.kind||'tw',data:{link:d.link||''},dir:'auto'}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const link=(e.notification.data&&e.notification.data.link)||'';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const url='/#/open/'+encodeURIComponent(link);
    for(const c of cs){if('focus' in c){c.postMessage({type:'open',link});return c.focus();}}
    return self.clients.openWindow(url);}));
});
