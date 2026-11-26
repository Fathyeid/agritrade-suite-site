(function(){
if(window.__ds)return;window.__ds=1;
var de=document.documentElement;
function ar(){return (de.dir==='rtl')||/^ar/.test(de.lang||'')}
var S={ar:{q:'بحث في الجدول…',p:'صفحة',of:'من',prev:'السابق',next:'التالي',rows:'صف'},en:{q:'Search table…',p:'Page',of:'of',prev:'Prev',next:'Next',rows:'rows'}};
function T(k){return S[ar()?'ar':'en'][k]}
/* light only */
function light(){try{if(de.getAttribute('data-th')==='dark')de.setAttribute('data-th','light');if(de.getAttribute('data-theme')==='dark')de.setAttribute('data-theme','light');de.classList.remove('dark');if(document.body)document.body.classList.remove('dark');
 Object.keys(localStorage).forEach(function(k){if(/(^|[._])(dark|th|theme)$/i.test(k)&&/dark|1|true/.test(localStorage.getItem(k)||''))localStorage.setItem(k,/dark/.test(localStorage.getItem(k))?'light':'0')})}catch(e){}}
function num(s){var t=String(s).replace(/[,\s$%٬]/g,'').replace(/[٠-٩]/g,function(d){return d.charCodeAt(0)-1632});var n=parseFloat(t);return isNaN(n)||!/^[-+]?[\d.]+[a-zA-Z%]*$/.test(t)?null:n}
var PAGE=25;
function enhance(tb){
 if(tb.dataset.ds||tb.closest('.ds-tw')||tb.closest('.noenh')||tb.querySelector('table'))return;
 var body=tb.tBodies[0];if(!body)return;var rows=[].slice.call(body.rows);
 tb.dataset.ds='1';
 var w=document.createElement('div');w.className='ds-tw';tb.parentNode.insertBefore(w,tb);w.appendChild(tb);
 if(rows.length<8)return;
 var bar=document.createElement('div');bar.className='ds-bar';var inp=document.createElement('input');inp.type='search';inp.placeholder=T('q');bar.appendChild(inp);w.parentNode.insertBefore(bar,w);
 var pg=document.createElement('div');pg.className='ds-pg';w.parentNode.insertBefore(pg,w.nextSibling);
 var page=0,q='',sc=-1,dir=1;
 function all(){return [].slice.call(body.rows)}
 function draw(){var rs=all(),vis=rs.filter(function(r){return !q||r.textContent.toLowerCase().indexOf(q)>-1});
  var pages=Math.max(1,Math.ceil(vis.length/PAGE));if(page>=pages)page=pages-1;
  rs.forEach(function(r){r.style.display='none'});vis.slice(page*PAGE,page*PAGE+PAGE).forEach(function(r){r.style.display=''});
  pg.innerHTML='';if(vis.length<=PAGE&&!q){pg.style.display='none';return}pg.style.display='flex';
  var a=document.createElement('button');a.textContent=T('prev');a.disabled=page===0;a.onclick=function(){page--;draw()};
  var b=document.createElement('button');b.textContent=T('next');b.disabled=page>=pages-1;b.onclick=function(){page++;draw()};
  var s=document.createElement('span');s.textContent=T('p')+' '+(page+1)+' '+T('of')+' '+pages+' · '+vis.length+' '+T('rows');
  pg.appendChild(a);pg.appendChild(s);pg.appendChild(b)}
 inp.oninput=function(){q=inp.value.trim().toLowerCase();page=0;draw()};
 var ths=tb.tHead?[].slice.call(tb.tHead.rows[tb.tHead.rows.length-1].cells):[];
 ths.forEach(function(th,i){th.setAttribute('data-ds-sort','');th.onclick=function(){
  dir=(sc===i)?-dir:1;sc=i;ths.forEach(function(x){x.setAttribute('data-ds-sort','')});th.setAttribute('data-ds-sort',dir>0?'asc':'desc');
  var rs=all();rs.sort(function(x,y){var a=(x.cells[i]||{}).textContent||'',b=(y.cells[i]||{}).textContent||'',na=num(a),nb=num(b);
   if(na!=null&&nb!=null)return (na-nb)*dir;return a.localeCompare(b,undefined,{numeric:true})*dir});
  rs.forEach(function(r){body.appendChild(r)});page=0;draw()}});
 draw();
}
/* hero photos: keep the program's own licensed photo, under a light veil so text stays dark */
function VEIL(){return 'linear-gradient(to '+(ar()?'left':'right')+',rgba(255,255,255,.94) 0%,rgba(245,250,255,.8) 45%,rgba(235,244,255,.28) 100%)'}
function heroUrl(el){var m=/url\((['"]?)([^'")]+)\1\)/;var st=el.getAttribute('style')||'';var x=st.match(m);if(x)return x[2];
 el.classList.add('ds-raw');var u=null;try{[null,'::before','::after'].some(function(p){var b=getComputedStyle(el,p).backgroundImage||'';var y=b.match(m);if(y&&!/^data:image\/svg/.test(y[2])){u=y[2];return true}})}finally{el.classList.remove('ds-raw')}return u}
function heroes(){[].slice.call(document.querySelectorAll('.hero,.banner,.pghero')).forEach(function(el){var sig=(el.getAttribute('style')||'')+'|'+el.className.replace(/\bds-hero\b/,'');if(el.__dsh===sig)return;var u=heroUrl(el);if(u){try{u=new URL(u,document.baseURI).href}catch(e){}el.style.setProperty('--ds-img',VEIL()+',url("'+u+'")');el.classList.add('ds-hero')}else{el.classList.remove('ds-hero')}el.__dsh=(el.getAttribute('style')||'')+'|'+el.className.replace(/\bds-hero\b/,'')})}
function scan(){light();try{heroes()}catch(e){}[].slice.call(document.querySelectorAll('table')).forEach(enhance)}
var t=null;function later(){clearTimeout(t);t=setTimeout(scan,300)}
function start(){scan();new MutationObserver(later).observe(document.body,{childList:true,subtree:true})}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
