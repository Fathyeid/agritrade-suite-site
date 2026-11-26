// drawing tools layer (one per chart pane). Points are stored as {t,p} (unix time, price) so they survive timeframe changes.
const TOOLS={
 trend:['Trend Line',2],ray:['Ray',2],ext:['Extended Line',2],hline:['Horizontal Line',1],vline:['Vertical Line',1],channel:['Parallel Channel',3],
 fibret:['Fib Retracement',2],fibext:['Fib Extension',3],fibfan:['Fib Fan',2],fibarc:['Fib Arc',2],gann:['Gann Fan',2],pitch:['Pitchfork',3],
 rect:['Rectangle',2],tri:['Triangle',3],ell:['Ellipse',2],text:['Text',1],prange:['Price Range',2],drange:['Date Range',2],
 long:['Long Position',3],short:['Short Position',3],brush:['Brush',0],arrowup:['Arrow Up',1],arrowdown:['Arrow Down',1]};
const TOOL_HELP={fibext:'Click A, B, then C',channel:'Click 2 points for the line, then a 3rd for the width',pitch:'Click pivot, then two swing points',tri:'Click 3 corners',long:'Click entry, then stop, then target',short:'Click entry, then stop, then target',brush:'Press and drag'};
const FIB=[0,.236,.382,.5,.618,.786,1],FIBC=['#787b86','#f44336','#ff9800','#4caf50','#009688','#2196f3','#787b86'];
const FEXT=[0,.618,1,1.272,1.618,2.618],FEXTC=['#787b86','#ff9800','#4caf50','#2196f3','#9c27b0','#e91e63'];
class DrawLayer{
 constructor(pane){this.p=pane;this.tool=null;this.draft=null;this.sel=null;this.list=[];this.cv=pane.cvs;this.cx=this.cv.getContext('2d');this.color='#2962ff';this.bind()}
 key(){return this.p.sym}
 load(){const all=Store.get('draws',{});this.list=(all[this.key()]||[]);this.sel=null}
 save(){const all=Store.get('draws',{});all[this.key()]=this.list.map(d=>{const c={...d};delete c._segs;delete c._box;return c});Store.set('draws',all)}
 // coordinate transforms (extrapolate beyond data)
 idxOf(t){const v=this.p.view;if(!v.length)return null;const n=v.length;
  if(t<=v[0].time){const st=(v[Math.min(1,n-1)].time-v[0].time)||86400;return (t-v[0].time)/st}
  if(t>=v[n-1].time){const st=n>1?(v[n-1].time-v[n-2].time):86400;return n-1+(t-v[n-1].time)/st}
  let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(v[m].time<=t)lo=m;else hi=m}return lo+(t-v[lo].time)/(v[hi].time-v[lo].time)}
 timeOf(i){const v=this.p.view,n=v.length;if(!n)return null;
  if(i<=0){const st=(v[Math.min(1,n-1)].time-v[0].time)||86400;return v[0].time+i*st}
  if(i>=n-1){const st=n>1?(v[n-1].time-v[n-2].time):86400;return v[n-1].time+(i-(n-1))*st}
  const a=Math.floor(i);return v[a].time+(i-a)*(v[a+1].time-v[a].time)}
 X(t){const i=this.idxOf(t);return i==null?null:this.p.chart.timeScale().logicalToCoordinate(i)}
 T(x){const i=this.p.chart.timeScale().coordinateToLogical(x);return i==null?null:this.timeOf(i)}
 Y(pr){return this.p.main?this.p.main.priceToCoordinate(pr):null}
 Pr(y){return this.p.main?this.p.main.coordinateToPrice(y):null}
 pt(e){const r=this.cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;return {x,y,t:this.T(x),p:this.Pr(y)}}
 size(){const w=this.p.cwrap,r=w.getBoundingClientRect(),dpr=window.devicePixelRatio||1;if(this.cv.width!==Math.round(r.width*dpr)||this.cv.height!==Math.round(r.height*dpr)){this.cv.width=Math.round(r.width*dpr);this.cv.height=Math.round(r.height*dpr);this.cv.style.width=r.width+'px';this.cv.style.height=r.height+'px'}this.cx.setTransform(dpr,0,0,dpr,0,0);this.W=r.width;this.H=r.height}
 setTool(k){this.tool=k;this.draft=null;this.p.cwrap.style.cursor=k?'crosshair':'';this.p.app&&this.p.app.toolChanged();if(k&&TOOL_HELP[k])toast(TOOL_HELP[k])}
 bind(){
  const w=this.p.cwrap;
  w.addEventListener('mousedown',e=>{if(e.button!==0)return;const q=this.pt(e);if(q.t==null||q.p==null)return;
   this.p.app&&this.p.app.activate(this.p);
   if(this.tool){e.stopPropagation();e.preventDefault();const n=TOOLS[this.tool][1];
    if(this.tool==='brush'){this.draft={id:uid(),type:'brush',pts:[{t:q.t,p:q.p}],c:this.color,w:2};this.brushing=true;return}
    if(!this.draft)this.draft={id:uid(),type:this.tool,pts:[{t:q.t,p:q.p}],c:this.color,w:1.5,tmp:{t:q.t,p:q.p}};
    else this.draft.pts.push({t:q.t,p:q.p});
    if(this.draft.pts.length>=n){const d=this.draft;delete d.tmp;this.draft=null;
     if(d.type==='text'){const s=prompt('Text','');if(!s){this.redraw();return}d.text=s}
     this.list.push(d);this.sel=d.id;this.save();this.setTool(null);this.p.app&&this.p.app.selChanged()}
    this.redraw();return}
   // select/drag existing
   const hit=this.hit(q.x,q.y);
   if(hit&&this.multi){e.stopPropagation();e.preventDefault();if(!this.msel.includes(hit.d.id))this.msel.push(hit.d.id);toast(this.msel.length+' selected');return}
   if(hit){e.stopPropagation();e.preventDefault();this.sel=hit.d.id;this.p.app&&this.p.app.selChanged();
    if(!hit.d.lock){const hnd=this.handleAt(hit.d,q.x,q.y);this.drag={d:hit.d,hnd,x0:q.x,y0:q.y,orig:JSON.parse(JSON.stringify(hit.d.pts)),grp:hit.d.group&&hnd==null?this.list.filter(x=>x.group===hit.d.group&&!x.lock).map(x=>[x,JSON.parse(JSON.stringify(x.pts))]):null}}
    this.redraw()}
   else if(this.sel){this.sel=null;this.p.app&&this.p.app.selChanged();this.redraw()}
  },true);
  window.addEventListener('mousemove',e=>{
   if(this.brushing&&this.draft){const q=this.pt(e);if(q.t!=null&&q.p!=null)this.draft.pts.push({t:q.t,p:q.p});this.redraw();return}
   if(this.draft&&this.draft.tmp){const q=this.pt(e);if(q.t!=null&&q.p!=null){this.draft.tmp={t:q.t,p:q.p};this.redraw()}}
   if(this.drag){const q=this.pt(e),d=this.drag.d;
    if(this.drag.hnd!=null){if(q.t!=null&&q.p!=null)d.pts[this.drag.hnd]={t:q.t,p:q.p}}
    else if(this.drag.grp){const dx=q.x-this.drag.x0,dy=q.y-this.drag.y0;this.drag.grp.forEach(([g,o])=>{g.pts=o.map(p=>{const x=this.X(p.t),y=this.Y(p.p);return {t:this.T(x+dx),p:this.Pr(y+dy)}})})}
    else{const dx=q.x-this.drag.x0,dy=q.y-this.drag.y0;d.pts=this.drag.orig.map(o=>{const x=this.X(o.t),y=this.Y(o.p);return {t:this.T(x+dx),p:this.Pr(y+dy)}})}
    this.redraw()}});
  window.addEventListener('mouseup',()=>{if(this.brushing&&this.draft){const d=this.draft;this.draft=null;this.brushing=false;if(d.pts.length>2){this.list.push(d);this.sel=d.id;this.save();this.p.app&&this.p.app.selChanged()}this.setTool(null);this.redraw()}
   if(this.drag){this.drag=null;this.save()}});
  w.addEventListener('dblclick',e=>{const q=this.pt(e),h=this.hit(q.x,q.y);if(h&&h.d.type==='text'&&!h.d.lock){const s=prompt('Text',h.d.text);if(s){h.d.text=s;this.save();this.redraw()}}});
 }
 toggleHide(){const s=this.selected();if(s){s.hide=!s.hide;if(s.hide)this.sel=null}else{const any=this.list.some(x=>!x.hide);this.list.forEach(x=>x.hide=any)}this.save();this.redraw();this.p.app&&this.p.app.selChanged()}
 copySel(){const s=this.selected();if(!s)return toast('Select a drawing first');const c=JSON.parse(JSON.stringify(s));c.id=uid();delete c.lock;delete c.group;c.pts=c.pts.map(q=>{const x=this.X(q.t),y=this.Y(q.p);return {t:this.T(x+20),p:this.Pr(y+20)}});this.list.push(c);this.sel=c.id;this.save();this.redraw()}
 groupToggle(){if(!this.multi){this.multi=true;this.msel=this.sel?[this.sel]:[];toast('Group mode: click drawings to add, then click Grp again');return}this.multi=false;if(this.msel.length>1){const g=uid();this.list.forEach(x=>{if(this.msel.includes(x.id))x.group=g});this.save();toast('Grouped '+this.msel.length+' drawings')}else toast('Group cancelled (need 2+ drawings)');this.msel=[]}
 saveTemplate(){const s=this.selected();if(!s)return toast('Select a drawing first');const t=Store.get('drawTpl',{});t.last={c:s.c,w:s.w};Store.set('drawTpl',t);toast('Style saved as template')}
 applyTemplate(){const s=this.selected(),t=Store.get('drawTpl',{}).last;if(!s||!t)return toast('Select a drawing and save a template first');s.c=t.c;s.w=t.w;this.save();this.redraw()}
 selected(){return this.list.find(d=>d.id===this.sel)}
 delSel(){const d=this.selected();if(!d||d.lock)return false;this.list=this.list.filter(x=>x!==d);this.sel=null;this.save();this.redraw();return true}
 undo(){if(this.draft){this.draft=null;this.redraw();return}const d=this.list.filter(x=>!x.lock).pop();if(d){this.list=this.list.filter(x=>x!==d);this.save();this.redraw()}}
 clear(){this.list=this.list.filter(d=>d.lock);this.sel=null;this.save();this.redraw()}
 handleAt(d,x,y){for(let i=0;i<d.pts.length;i++){const hx=this.X(d.pts[i].t),hy=this.Y(d.pts[i].p);if(hx!=null&&hy!=null&&Math.hypot(hx-x,hy-y)<9)return i}return null}
 hit(x,y){for(let i=this.list.length-1;i>=0;i--){const d=this.list[i];if(d.hide)continue;if(d._box&&x>=d._box[0]&&x<=d._box[2]&&y>=d._box[1]&&y<=d._box[3])return {d};
  for(const s of d._segs||[]){const [a,b,c,e]=s,dx=c-a,dy=e-b,l2=dx*dx+dy*dy;let t=l2?((x-a)*dx+(y-b)*dy)/l2:0;t=Math.max(0,Math.min(1,t));if(Math.hypot(a+t*dx-x,b+t*dy-y)<6)return {d}}}return null}
 // ---- rendering ----
 redraw(){this.size();const cx=this.cx;cx.clearRect(0,0,this.W,this.H);
  this.p.drawStructure&&this.p.drawStructure(cx,this);
  const all=[...this.list,...(this.draft?[{...this.draft,pts:this.draft.tmp?[...this.draft.pts,this.draft.tmp]:this.draft.pts,preview:true}]:[])];
  all.filter(d=>!d.hide).forEach(d=>{try{this.one(d)}catch(e){}});
  const s=this.selected();if(s){cx.fillStyle='#fff';cx.strokeStyle=s.c;cx.lineWidth=1.5;s.pts.forEach(p=>{const x=this.X(p.t),y=this.Y(p.p);if(x==null||y==null)return;cx.beginPath();cx.rect(x-4,y-4,8,8);cx.fill();cx.stroke()})}}
 seg(d,x1,y1,x2,y2){const cx=this.cx;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();d._segs.push([x1,y1,x2,y2])}
 ext(x1,y1,x2,y2,both){if(x1===x2&&y1===y2)return [x1,y1,x2,y2];const dx=x2-x1,dy=y2-y1,k=1e5;return [both?x1-dx*k:x1,both?y1-dy*k:y1,x1+dx*k,y1+dy*k].map(v=>Math.max(-1e6,Math.min(1e6,v)))}
 one(d){
  const cx=this.cx,W=this.W,H=this.H;d._segs=[];d._box=null;cx.save();cx.lineWidth=d.w||1.5;cx.strokeStyle=d.c;cx.fillStyle=d.c;cx.font='11px system-ui';cx.setLineDash(d.lock?[]:[]);
  const pts=d.pts.map(p=>({x:this.X(p.t),y:this.Y(p.p),t:p.t,p:p.p}));if(pts.some(q=>q.x==null||q.y==null)){cx.restore();return}
  const [a,b,c]=pts,rgba=(al)=>d.c+Math.round(al*255).toString(16).padStart(2,'0');const rt=W-62;
  const lbl=(s,x,y,col)=>{cx.fillStyle=col||d.c;cx.fillText(s,x,y)};
  const tag=(s,x,y)=>{const w=cx.measureText(s).width+8;cx.fillStyle=d.c;cx.fillRect(x,y-8,w,16);cx.fillStyle='#fff';cx.fillText(s,x+4,y+4)};
  switch(d.type){
   case 'trend':if(b){this.seg(d,a.x,a.y,b.x,b.y)}break;
   case 'ray':if(b){const e=this.ext(a.x,a.y,b.x,b.y,false);this.seg(d,e[0],e[1],e[2],e[3])}break;
   case 'ext':if(b){const e=this.ext(a.x,a.y,b.x,b.y,true);this.seg(d,e[0],e[1],e[2],e[3])}break;
   case 'hline':this.seg(d,0,a.y,rt,a.y);tag(fmt(a.p,2),rt+2,a.y);break;
   case 'vline':this.seg(d,a.x,0,a.x,H-26);lbl(new Date(a.t*1000).toISOString().slice(0,16).replace('T',' '),a.x+4,14);break;
   case 'channel':if(b){this.seg(d,a.x,a.y,b.x,b.y);if(c){const dy=c.y-(a.y+(b.y-a.y)*((c.x-a.x)/((b.x-a.x)||1)));this.seg(d,a.x,a.y+dy,b.x,b.y+dy);cx.fillStyle=rgba(.12);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.lineTo(b.x,b.y+dy);cx.lineTo(a.x,a.y+dy);cx.fill();cx.setLineDash([4,4]);this.seg(d,a.x,a.y+dy/2,b.x,b.y+dy/2)}}break;
   case 'fibret':if(b){const xl=Math.min(a.x,b.x);FIB.forEach((r,i)=>{const pr=a.p+(b.p-a.p)*r,y=this.Y(pr);if(y==null)return;cx.strokeStyle=FIBC[i];this.seg(d,xl,y,rt,y);lbl((r*100).toFixed(1)+'%  '+fmt(pr,2),xl+4,y-3,FIBC[i])});cx.strokeStyle='#787b86';cx.setLineDash([4,4]);this.seg(d,a.x,a.y,b.x,b.y)}break;
   case 'fibext':if(c){const xl=Math.min(a.x,c.x);FEXT.forEach((r,i)=>{const pr=c.p+(b.p-a.p)*r,y=this.Y(pr);if(y==null)return;cx.strokeStyle=FEXTC[i];this.seg(d,xl,y,rt,y);lbl((r*100).toFixed(1)+'%  '+fmt(pr,2),xl+4,y-3,FEXTC[i])});cx.strokeStyle='#787b86';cx.setLineDash([4,4]);this.seg(d,a.x,a.y,b.x,b.y);this.seg(d,b.x,b.y,c.x,c.y)}else if(b){this.seg(d,a.x,a.y,b.x,b.y)}break;
   case 'fibfan':if(b){[.382,.5,.618,1].forEach((r,i)=>{const ty=a.y+(b.y-a.y)*r,e=this.ext(a.x,a.y,b.x,ty,false);cx.strokeStyle=FIBC[i+2];this.seg(d,e[0],e[1],e[2],e[3]);lbl((r*100).toFixed(1)+'%',b.x+4,ty,FIBC[i+2])});cx.strokeStyle='#787b86';cx.setLineDash([4,4]);this.seg(d,a.x,a.y,b.x,b.y)}break;
   case 'fibarc':if(b){const R=Math.hypot(b.x-a.x,b.y-a.y),a0=Math.atan2(a.y-b.y,a.x-b.x);[.382,.5,.618,1].forEach((r,i)=>{cx.strokeStyle=FIBC[i+2];cx.beginPath();cx.arc(b.x,b.y,R*r,a0-Math.PI/2,a0+Math.PI/2);cx.stroke();const px=b.x+Math.cos(a0)*R*r,py=b.y+Math.sin(a0)*R*r;d._segs.push([px-3,py-3,px+3,py+3]);lbl((r*100).toFixed(1)+'%',px+4,py,FIBC[i+2])});cx.strokeStyle='#787b86';cx.setLineDash([4,4]);this.seg(d,a.x,a.y,b.x,b.y)}break;
   case 'gann':if(b){[[1/8,'1x8'],[1/4,'1x4'],[1/3,'1x3'],[1/2,'1x2'],[1,'1x1'],[2,'2x1'],[3,'3x1'],[4,'4x1'],[8,'8x1']].forEach(([m,n])=>{const e=this.ext(a.x,a.y,a.x+(b.x-a.x),a.y+(b.y-a.y)*m,false);cx.strokeStyle=m===1?d.c:rgba(.6);this.seg(d,e[0],e[1],e[2],e[3]);const lx=a.x+(b.x-a.x),ly=a.y+(b.y-a.y)*m;if(ly>0&&ly<H)lbl(n,lx+3,ly)})}break;
   case 'pitch':if(b&&c){const mx=(b.x+c.x)/2,my=(b.y+c.y)/2,e=this.ext(a.x,a.y,mx,my,false);this.seg(d,e[0],e[1],e[2],e[3]);const dx=mx-a.x,dy=my-a.y,k=1e4;[b,c].forEach(q=>this.seg(d,q.x,q.y,q.x+dx*k,q.y+dy*k));this.seg(d,b.x,b.y,c.x,c.y);cx.fillStyle=rgba(.1);cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(Math.min(b.x+dx*50,1e5),b.y+dy*50);cx.lineTo(Math.min(c.x+dx*50,1e5),c.y+dy*50);cx.lineTo(c.x,c.y);cx.fill()}else if(b)this.seg(d,a.x,a.y,b.x,b.y);break;
   case 'rect':if(b){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);cx.fillStyle=rgba(.15);cx.fillRect(x,y,w,h);cx.strokeRect(x,y,w,h);d._box=[x,y,x+w,y+h]}break;
   case 'tri':if(b){cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);if(c)cx.lineTo(c.x,c.y);cx.closePath();cx.fillStyle=rgba(.15);if(c)cx.fill();cx.stroke();this.seg(d,a.x,a.y,b.x,b.y);if(c){this.seg(d,b.x,b.y,c.x,c.y);this.seg(d,c.x,c.y,a.x,a.y)}}break;
   case 'ell':if(b){const x=(a.x+b.x)/2,y=(a.y+b.y)/2,rx=Math.abs(a.x-b.x)/2,ry=Math.abs(a.y-b.y)/2;cx.beginPath();cx.ellipse(x,y,Math.max(rx,.5),Math.max(ry,.5),0,0,7);cx.fillStyle=rgba(.12);cx.fill();cx.stroke();d._box=[x-rx,y-ry,x+rx,y+ry]}break;
   case 'text':cx.font='14px system-ui';cx.fillStyle=d.c;cx.fillText(d.text||'Text',a.x,a.y);{const w=cx.measureText(d.text||'Text').width;d._box=[a.x,a.y-14,a.x+w,a.y+3]}break;
   case 'arrowup':case 'arrowdown':{const s=d.type==='arrowup'?-1:1;cx.fillStyle=s<0?'#26a69a':'#ef5350';cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(a.x-9,a.y-s*14);cx.lineTo(a.x-3,a.y-s*14);cx.lineTo(a.x-3,a.y-s*30);cx.lineTo(a.x+3,a.y-s*30);cx.lineTo(a.x+3,a.y-s*14);cx.lineTo(a.x+9,a.y-s*14);cx.closePath();cx.fill();d._box=[a.x-9,Math.min(a.y,a.y-s*30),a.x+9,Math.max(a.y,a.y-s*30)]}break;
   case 'prange':if(b){const x=Math.min(a.x,b.x),w=Math.abs(a.x-b.x),up=b.p>=a.p,col=up?'#26a69a':'#ef5350';cx.fillStyle=col+'33';cx.fillRect(x,Math.min(a.y,b.y),w,Math.abs(a.y-b.y));cx.strokeStyle=col;cx.strokeRect(x,Math.min(a.y,b.y),w,Math.abs(a.y-b.y));const dp=b.p-a.p,ia=this.idxOf(a.t),ib=this.idxOf(b.t);const s=`${dp>=0?'+':''}${fmt(dp,2)} (${(dp/a.p*100).toFixed(2)}%)  ${Math.round(Math.abs(ib-ia))} bars`;tag(s,x+4,Math.min(a.y,b.y)-12);d._box=[x,Math.min(a.y,b.y),x+w,Math.max(a.y,b.y)]}break;
   case 'drange':if(b){const x=Math.min(a.x,b.x),w=Math.abs(a.x-b.x);cx.fillStyle=rgba(.12);cx.fillRect(x,0,w,H-26);this.seg(d,a.x,0,a.x,H-26);this.seg(d,b.x,0,b.x,H-26);const ia=this.idxOf(a.t),ib=this.idxOf(b.t),days=Math.abs(b.t-a.t)/86400;tag(`${Math.round(Math.abs(ib-ia))} bars, ${days>=1?days.toFixed(1)+' d':(days*24).toFixed(1)+' h'}`,x+4,20)}break;
   case 'long':case 'short':{const isL=d.type==='long',en=a.p,st=b?b.p:en,tg=c?c.p:en,xr=Math.max(a.x+80,...pts.map(q=>q.x)),yE=a.y,yS=b?b.y:yE,yT=c?c.y:yE;
    cx.fillStyle='rgba(38,166,154,.22)';cx.fillRect(a.x,Math.min(yE,yT),xr-a.x,Math.abs(yT-yE));cx.fillStyle='rgba(239,83,80,.22)';cx.fillRect(a.x,Math.min(yE,yS),xr-a.x,Math.abs(yS-yE));
    cx.strokeStyle='#787b86';this.seg(d,a.x,yE,xr,yE);cx.strokeStyle='#26a69a';this.seg(d,a.x,yT,xr,yT);cx.strokeStyle='#ef5350';this.seg(d,a.x,yS,xr,yS);
    d._box=[a.x,Math.min(yE,yT,yS),xr,Math.max(yE,yT,yS)];
    if(b&&c){const risk=Math.abs(en-st),rew=Math.abs(tg-en),okDir=isL?(tg>en&&st<en):(tg<en&&st>en);tag(`R:R ${risk?(rew/risk).toFixed(2):'-'}  +${(rew/en*100).toFixed(2)}% / -${(risk/en*100).toFixed(2)}%${okDir?'':'  (check stop/target side)'}`,a.x+4,Math.min(yE,yT,yS)-12);
     lbl('Target '+fmt(tg,2),xr-90,yT-3,'#26a69a');lbl('Stop '+fmt(st,2),xr-90,yS+12,'#ef5350');lbl('Entry '+fmt(en,2),xr-90,yE-3,'#9aa4b0')}}break;
   case 'brush':cx.beginPath();pts.forEach((q,i)=>i?cx.lineTo(q.x,q.y):cx.moveTo(q.x,q.y));cx.stroke();for(let i=1;i<pts.length;i++)d._segs.push([pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y]);break;
   default:if(typeof DRAW2!=='undefined'&&DRAW2[d.type])DRAW2[d.type].call(this,d,pts,{rgba,lbl,tag,rt});
  }
  cx.restore()}
}
// price of a line-type drawing at time t (for alerts)
function lineAtTime(d,t){const [a,b]=d.pts;if(!b||a.t===b.t)return null;return a.p+(b.p-a.p)*(t-a.t)/(b.t-a.t)}
