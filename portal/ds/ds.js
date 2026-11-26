(function(){
if(window.__ds)return;window.__ds=1;
var de=document.documentElement;
function ar(){return (de.dir==='rtl')||/^ar/.test(de.lang||'')}
var S={ar:{q:'بحث في الجدول…',p:'صفحة',of:'من',prev:'السابق',next:'التالي',rows:'صف',flt:'فلاتر الأعمدة',cols:'الأعمدة',clr:'مسح الفلاتر',fph:'فلتر… (مثال: >100 أو 10..50)',det:'تفاصيل السجل',close:'إغلاق',dens:'عرض مضغوط',reset:'استعادة الافتراضي',lay:'تخطيط هذه الصفحة يُحفظ على هذا الجهاز'},en:{q:'Search table…',p:'Page',of:'of',prev:'Prev',next:'Next',rows:'rows',flt:'Column filters',cols:'Columns',clr:'Clear filters',fph:'Filter… (e.g. >100 or 10..50)',det:'Record details',close:'Close',dens:'Compact view',reset:'Reset to default',lay:'This page layout is saved on this device'}};
function T(k){return S[ar()?'ar':'en'][k]}
/* light only */
function light(){try{if(de.getAttribute('data-th')==='dark')de.setAttribute('data-th','light');if(de.getAttribute('data-theme')==='dark')de.setAttribute('data-theme','light');de.classList.remove('dark');if(document.body)document.body.classList.remove('dark');
 Object.keys(localStorage).forEach(function(k){if(/(^|[._])(dark|th|theme)$/i.test(k)&&/dark|1|true/.test(localStorage.getItem(k)||''))localStorage.setItem(k,/dark/.test(localStorage.getItem(k))?'light':'0')})}catch(e){}}
function num(s){var t=String(s).replace(/[,\s$%٬]/g,'').replace(/[٠-٩]/g,function(d){return d.charCodeAt(0)-1632});var n=parseFloat(t);return isNaN(n)||!/^[-+]?[\d.]+[a-zA-Z%]*$/.test(t)?null:n}
var PAGE=25;
/* per-module layout key: program path + in-app route + table position + header text */
function lkey(tb,ths){var all=[].slice.call(document.querySelectorAll('table'));return 'ds_lay:'+location.pathname.split('/')[1]+'|'+(location.hash||'').replace(/[?&].*$/,'').slice(0,40)+'|'+all.indexOf(tb)+'|'+ths.map(function(t){return t.textContent.trim()}).join(',').slice(0,120)}
function lget(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return {}}}
function lset(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function cellText(c){if(!c)return '';var i=c.querySelector&&c.querySelector('input,select,textarea');if(i&&!c.textContent.trim())return i.tagName==='SELECT'?(i.options[i.selectedIndex]||{}).text||'':i.value;if(c.querySelector&&c.querySelector('button')){var k=c.cloneNode(true);[].slice.call(k.querySelectorAll('button')).forEach(function(b){b.remove()});return k.textContent.replace(/\s+/g,' ').trim()}return c.textContent.replace(/\s+/g,' ').trim()}
/* column filter: text contains, or numeric >x <x >=x <=x =x a..b */
function fmatch(v,f){f=f.trim();if(!f)return true;var m=f.match(/^(>=|<=|>|<|=)\s*(-?[\d.,٠-٩]+)$/),r=f.match(/^(-?[\d.,٠-٩]+)\s*\.\.\s*(-?[\d.,٠-٩]+)$/),n=num(v);
 if(m&&n!=null){var x=num(m[2]);return m[1]==='>'?n>x:m[1]==='<'?n<x:m[1]==='>='?n>=x:m[1]==='<='?n<=x:n===x}
 if(r&&n!=null){var a=num(r[1]),b=num(r[2]);return n>=Math.min(a,b)&&n<=Math.max(a,b)}
 return v.toLowerCase().indexOf(f.toLowerCase())>-1}
var panel=null;
function showDetail(tb,row,ths){if(!panel){panel=document.createElement('aside');panel.className='ds-panel';document.body.appendChild(panel);document.addEventListener('keydown',function(e){if(e.key==='Escape')panel.classList.remove('on')})}
 var h='<div class="ds-ph"><b>'+T('det')+'</b><button type="button" class="ds-x" aria-label="'+T('close')+'">×</button></div><dl>';
 [].slice.call(row.cells).forEach(function(c,i){if(c.classList.contains('ds-dc'))return;var lab=ths[i]?ths[i].textContent.replace(/[\u2195\u25B2\u25BC]/g,'').trim():'#'+(i+1);var v=cellText(c);if(!lab&&!v)return;h+='<dt>'+esc(lab||'—')+'</dt><dd>'+(esc(v)||'—')+'</dd>'});
 panel.innerHTML=h+'</dl>';panel.dir=ar()?'rtl':'ltr';panel.classList.add('on');panel.querySelector('.ds-x').onclick=function(){panel.classList.remove('on')}}
function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function enhance(tb){
 if(tb.dataset.ds||tb.closest('.ds-tw')||tb.closest('.noenh')||tb.querySelector('table'))return;
 var body=tb.tBodies[0];if(!body)return;
 /* header row written inside the body (all <th>): move it into a <thead> so sort, filters and details work */
 if(!tb.tHead&&body.rows[0]&&body.rows[0].cells.length&&[].every.call(body.rows[0].cells,function(c){return c.tagName==='TH'})){tb.createTHead().appendChild(body.rows[0])}
 var rows=[].slice.call(body.rows);
 tb.dataset.ds='1';
 var w=document.createElement('div');w.className='ds-tw';tb.parentNode.insertBefore(w,tb);w.appendChild(tb);
 var ths0=tb.tHead?[].slice.call(tb.tHead.rows[tb.tHead.rows.length-1].cells):[];
 /* record detail panel: an info button at the end of each row (tables with a header and 3+ columns) */
 if(ths0.length>=3&&!tb.closest('.nodet')){var th=document.createElement('th');th.className='ds-dc';tb.tHead.rows[tb.tHead.rows.length-1].appendChild(th);
  [].slice.call(body.rows).forEach(function(r){if(r.cells.length<2)return;var td=document.createElement('td');td.className='ds-dc';var b=document.createElement('button');b.type='button';b.className='ds-ib';b.title=T('det');b.textContent='ⓘ';b.onclick=function(e){e.stopPropagation();e.preventDefault();showDetail(tb,r,ths0)};td.appendChild(b);r.appendChild(td)})}
 if(rows.length<8)return;
 var bar=document.createElement('div');bar.className='ds-bar';var inp=document.createElement('input');inp.type='search';inp.placeholder=T('q');bar.appendChild(inp);w.parentNode.insertBefore(bar,w);
 /* the program already has its own search for this table: keep only the column tools */
 (function(){var host=w.parentNode;for(var l=0;l<3&&host&&host!==document.body;l++,host=host.parentNode){if(host.querySelectorAll('table').length>1)break;var own=[].slice.call(host.querySelectorAll('input')).filter(function(x){return !bar.contains(x)&&!w.contains(x)&&(x.compareDocumentPosition(w)&Node.DOCUMENT_POSITION_FOLLOWING)&&(x.type==='search'||/filter|search|تصفية|بحث/i.test(x.placeholder||''))});if(own.length){inp.style.display='none';break}}})();
 var pg=document.createElement('div');pg.className='ds-pg';w.parentNode.insertBefore(pg,w.nextSibling);
 var page=0,q='',sc=-1,dir=1,ths=ths0.filter(function(t){return !t.classList.contains('ds-dc')}),K=lkey(tb,ths),L=lget(K);L.hide=L.hide||[];var F=(function(){try{return JSON.parse(sessionStorage.getItem(K)||'{}')}catch(e){return {}}})();
 /* toolbar: column filters, columns (saved layout per module), compact view */
 function btn(txt){var b=document.createElement('button');b.type='button';b.className='ds-tb';b.textContent=txt;bar.appendChild(b);return b}
 var bf=btn('⏷ '+T('flt')),bc=btn('▦ '+T('cols')),bd=btn('↕ '+T('dens'));
 var frow=null;function filterRow(on){if(frow){frow.remove();frow=null}if(!on||!tb.tHead)return;frow=document.createElement('tr');frow.className='ds-frow';
  ths0.forEach(function(t,i){var c=document.createElement('th');if(!t.classList.contains('ds-dc')){var x=document.createElement('input');x.type='search';x.placeholder=T('fph');x.value=F[i]||'';x.oninput=function(){F[i]=x.value;try{sessionStorage.setItem(K,JSON.stringify(F))}catch(e){}page=0;draw()};c.appendChild(x)}frow.appendChild(c)});tb.tHead.appendChild(frow);applyCols()}
 bf.onclick=function(){var on=!frow;filterRow(on);bf.classList.toggle('on',on);if(!on){F={};try{sessionStorage.removeItem(K)}catch(e){}page=0;draw()}};
 if(Object.keys(F).some(function(k){return F[k]})){filterRow(true);bf.classList.add('on')}
 var menu=null;bc.onclick=function(){if(menu){menu.remove();menu=null;return}menu=document.createElement('div');menu.className='ds-cm';
  ths.forEach(function(t,i){var lb=document.createElement('label');var cb=document.createElement('input');cb.type='checkbox';cb.checked=L.hide.indexOf(i)<0;cb.onchange=function(){L.hide=L.hide.filter(function(x){return x!==i});if(!cb.checked)L.hide.push(i);lset(K,L);applyCols()};lb.appendChild(cb);lb.appendChild(document.createTextNode(' '+(t.textContent.replace(/[\u2195\u25B2\u25BC]/g,'').trim()||'#'+(i+1))));menu.appendChild(lb)});
  var rs=document.createElement('button');rs.type='button';rs.className='ds-tb';rs.textContent=T('reset');rs.onclick=function(){L={hide:[]};lset(K,L);applyCols();menu.remove();menu=null};menu.appendChild(rs);
  var nt=document.createElement('small');nt.textContent=T('lay');menu.appendChild(nt);bar.appendChild(menu);
  setTimeout(function(){function off(e){if(menu&&!menu.contains(e.target)&&e.target!==bc){menu.remove();menu=null}if(!menu)document.removeEventListener('click',off,true)}document.addEventListener('click',off,true)},0)};
 bd.onclick=function(){L.compact=!L.compact;lset(K,L);w.classList.toggle('ds-compact',!!L.compact);bd.classList.toggle('on',!!L.compact)};if(L.compact){w.classList.add('ds-compact');bd.classList.add('on')}
 function applyCols(){[].slice.call(tb.rows).forEach(function(r){[].slice.call(r.cells).forEach(function(c,i){c.style.display=(L.hide.indexOf(i)>-1&&!c.classList.contains('ds-dc'))?'none':''})})}
 function all(){return [].slice.call(body.rows)}
 function draw(){var rs=all(),vis=rs.filter(function(r){if(q&&r.textContent.toLowerCase().indexOf(q)<0)return false;for(var k in F){if(F[k]&&!fmatch(cellText(r.cells[k]),F[k]))return false}return true});
  var pages=Math.max(1,Math.ceil(vis.length/PAGE));if(page>=pages)page=pages-1;
  rs.forEach(function(r){r.style.display='none'});vis.slice(page*PAGE,page*PAGE+PAGE).forEach(function(r){r.style.display=''});
  pg.innerHTML='';if(vis.length<=PAGE&&!q){pg.style.display='none';return}pg.style.display='flex';
  var a=document.createElement('button');a.textContent=T('prev');a.disabled=page===0;a.onclick=function(){page--;draw()};
  var b=document.createElement('button');b.textContent=T('next');b.disabled=page>=pages-1;b.onclick=function(){page++;draw()};
  var s=document.createElement('span');s.textContent=T('p')+' '+(page+1)+' '+T('of')+' '+pages+' · '+vis.length+' '+T('rows');
  pg.appendChild(a);pg.appendChild(s);pg.appendChild(b)}
 applyCols();
 inp.oninput=function(){q=inp.value.trim().toLowerCase();page=0;draw()};
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
function heroes(){[].slice.call(document.querySelectorAll('.hero,.hero2,.banner,.pghero')).forEach(function(el){var sig=(el.getAttribute('style')||'')+'|'+el.className.replace(/\bds-hero\b/,'');if(el.__dsh===sig)return;var u=heroUrl(el);if(u){try{u=new URL(u,document.baseURI).href}catch(e){}el.style.setProperty('--ds-img',VEIL()+',url("'+u+'")');el.classList.add('ds-hero')}else{el.classList.remove('ds-hero')}el.__dsh=(el.getAttribute('style')||'')+'|'+el.className.replace(/\bds-hero\b/,'')})}
function scan(){light();try{heroes()}catch(e){}[].slice.call(document.querySelectorAll('table')).forEach(enhance)}
var t=null;function later(){clearTimeout(t);t=setTimeout(scan,300)}
function start(){scan();new MutationObserver(later).observe(document.body,{childList:true,subtree:true})}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
