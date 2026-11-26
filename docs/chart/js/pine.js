// Pine Script (v5/v6 subset) interpreter. Runs in the browser on delayed Yahoo bars, bar by bar like TradingView.
// Supported: indicator/strategy header, input.*, var/varip, :=, if/else, for, while, break/continue, user functions (=>), tuples, arrays (basic),
// ta.* (sma ema rma wma vwma rsi atr tr highest lowest change mom roc crossover crossunder cross stdev pivothigh pivotlow barssince valuewhen cum rising falling macd bb),
// math.*, str.tostring, color.*, line.new/set_*/delete/get_price (extend), label.new/set_*/delete, plot, plotshape, plotchar, bgcolor(ignored), hline(ignored), alertcondition/alert, na/nz/na().
// NOT supported (reported as errors, never faked): request.security and other data requests, tables, boxes, maps, matrices, libraries/imports, types/methods, strategy order simulation.
const PINE=(()=>{
const COLORS={red:'#F23645',lime:'#00E676',green:'#089981',blue:'#2962FF',orange:'#FF9800',yellow:'#FDD835',white:'#FFFFFF',black:'#000000',gray:'#787B86',silver:'#B2B5BE',purple:'#9C27B0',aqua:'#00BCD4',fuchsia:'#E040FB',maroon:'#880E4F',navy:'#311B92',olive:'#808000',teal:'#00897B'};
const NS=new Set(['ta','math','color','input','str','array','line','label','box','strategy','request','barstate','syminfo','timeframe','extend','xloc','yloc','location','shape','size','plot','display','hline','alert','format','text','position','session','chart','dayofweek','label_style']);
const tokRe=/\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_]\w*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[0-9A-Fa-f]{6,8})|(:=|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|=>|[-+*\/%<>=?:,()\[\].]))/y;
function lex(s,ln){const t=[];tokRe.lastIndex=0;let m;while(tokRe.lastIndex<s.length){const st=tokRe.lastIndex;if(/^\s*$/.test(s.slice(st)))break;m=tokRe.exec(s);if(!m)throw new Error(`Line ${ln}: unexpected text near "${s.slice(st,st+12).trim()}"`);
 if(m[1]!=null)t.push({k:'n',v:parseFloat(m[1])});else if(m[2]!=null)t.push({k:'i',v:m[2]});else if(m[3]!=null)t.push({k:'s',v:m[3].slice(1,-1).replace(/\\(.)/g,(a,c)=>c==='n'?'\n':c)});else if(m[4]!=null)t.push({k:'c',v:m[4]});else t.push({k:'o',v:m[5]})}return t}
function logical(src){const raw=src.replace(/\r/g,'').split('\n'),out=[];let cur=null,depth=0;
 raw.forEach((r0,i)=>{let r=r0,q=null,cut=-1;for(let j=0;j<r.length;j++){const ch=r[j];if(q){if(ch==='\\')j++;else if(ch===q)q=null}else if(ch==='"'||ch==="'")q=ch;else if(ch==='/'&&r[j+1]==='/'){cut=j;break}}if(cut>=0)r=r.slice(0,cut);if(!r.trim()&&!cur)return;
  if(cur){cur.text+=' '+r.trim();const d=(cur.text.match(/[(\[]/g)||[]).length-(cur.text.match(/[)\]]/g)||[]).length;if(d<=0&&!/[,+\-*\/?:=<>(\[]\s*$|\b(and|or)\s*$/.test(cur.text)){out.push(cur);cur=null}return}
  if(!r.trim())return;const ind=r.match(/^[ \t]*/)[0].replace(/\t/g,'    ').length,text=r.trim(),d=(text.match(/[(\[]/g)||[]).length-(text.match(/[)\]]/g)||[]).length;
  const o={ind,text,line:i+1};if(d>0||/[,+\-*\/?:<>(\[]\s*$|\b(and|or)\s*$/.test(text)&&!/=>\s*$/.test(text))cur=o;else out.push(o)});if(cur)out.push(cur);return out}
// ---- parser
let uid=0;
function P(toks,ln){let p=0;const pk=()=>toks[p],nx=()=>toks[p++],isO=v=>toks[p]&&toks[p].k==='o'&&toks[p].v===v,isI=v=>toks[p]&&toks[p].k==='i'&&toks[p].v===v;
 const err=m=>{throw new Error(`Line ${ln}: ${m}`)};const ex=v=>{if(!isO(v))err(`expected "${v}"`+(toks[p]?` but found "${toks[p].v}"`:' at end of line'));p++};
 function tern(){const c=orx();if(isO('?')){p++;const a=tern();ex(':');const b=tern();return {t:'tern',c,a,b,id:++uid}}return c}
 function orx(){let l=andx();while(isI('or')){p++;l={t:'bin',o:'or',l,r:andx(),id:++uid}}return l}
 function andx(){let l=notx();while(isI('and')){p++;l={t:'bin',o:'and',l,r:notx(),id:++uid}}return l}
 function notx(){if(isI('not')){p++;return {t:'un',o:'not',e:notx(),id:++uid}}return cmp()}
 function cmp(){let l=add();while(pk()&&pk().k==='o'&&['==','!=','<','>','<=','>='].includes(pk().v)){const o=nx().v;l={t:'bin',o,l,r:add(),id:++uid}}return l}
 function add(){let l=mul();while(pk()&&pk().k==='o'&&(pk().v==='+'||pk().v==='-')){const o=nx().v;l={t:'bin',o,l,r:mul(),id:++uid}}return l}
 function mul(){let l=un();while(pk()&&pk().k==='o'&&['*','/','%'].includes(pk().v)){const o=nx().v;l={t:'bin',o,l,r:un(),id:++uid}}return l}
 function un(){if(isO('-')){p++;return {t:'un',o:'-',e:un(),id:++uid}}if(isO('+')){p++;return un()}return post()}
 function args(){const a=[],nm={};if(!isO(')')){do{if(toks[p]&&toks[p].k==='i'&&toks[p+1]&&toks[p+1].k==='o'&&toks[p+1].v==='='){const k=nx().v;p++;nm[k]=tern()}else a.push(tern())}while(isO(',')&&p++)}ex(')');return {a,nm}}
 function post(){let e=prim();for(;;){if(isO('(')){p++;const r=args();e={t:'call',f:e,a:r.a,nm:r.nm,id:++uid,ln}}else if(isO('.')&&toks[p+1]&&toks[p+1].k==='i'){p++;e={t:'mem',o:e,p:nx().v,id:++uid}}else if(isO('[')){p++;const i=tern();ex(']');e.keep=true;e={t:'idx',e,i,id:++uid}}else break}return e}
 function prim(){const k=nx();if(!k)err('unexpected end of line');if(k.k==='n')return {t:'num',v:k.v};if(k.k==='s')return {t:'str',v:k.v};if(k.k==='c')return {t:'str',v:k.v};
  if(k.k==='i'){if(k.v==='true')return {t:'num',v:true};if(k.v==='false')return {t:'num',v:false};return {t:'name',n:k.v,id:++uid,ln}}
  if(k.v==='('){const e=tern();ex(')');return e}if(k.v==='['){const a=[];if(!isO(']')){do{a.push(tern())}while(isO(',')&&p++)}ex(']');return {t:'arr',a}}
  err(`unexpected "${k.v}"`)}
 return {expr(){const e=tern();if(p<toks.length)err(`unexpected "${toks[p].v}"`);return e},tern,toks,pos:()=>p,set:q=>{p=q}}}
const TYPES=new Set(['int','float','bool','string','color','line','label','box','table','series','simple','const','linefill','array','matrix','map','polyline']);
function parseProgram(src){const L=logical(src);let i=0;
 function block(ind){const out=[];while(i<L.length&&L[i].ind>ind){out.push(stmt(L[i].ind))}return out}
 function stmt(ind){const o=L[i++];let tx=o.text,ln=o.line;
  if(/^if\b/.test(tx)){const cond=P(lex(tx.slice(2),ln),ln).expr(),body=block(o.ind),node={t:'if',c:cond,b:body,e:null,ln};let cur=node;
   while(i<L.length&&L[i].ind===o.ind&&/^else\b/.test(L[i].text)){const e=L[i++],rest=e.text.slice(4).trim();if(/^if\b/.test(rest)){const n={t:'if',c:P(lex(rest.slice(2),e.line),e.line).expr(),b:block(o.ind),e:null,ln:e.line};cur.e=[n];cur=n}else{cur.e=block(o.ind);break}}return node}
  let m;if(m=tx.match(/^for\s+(\w+)\s*=\s*(.+?)\s+to\s+(.+?)(?:\s+by\s+(.+))?$/)){const q=s=>P(lex(s,ln),ln).expr();return {t:'for',v:m[1],a:q(m[2]),b:q(m[3]),s:m[4]?q(m[4]):null,body:block(o.ind),ln}}
  if(m=tx.match(/^for\s+(?:\[\s*(\w+)\s*,\s*(\w+)\s*\]|(\w+))\s+in\s+(.+)$/))return {t:'forin',i:m[1]||null,v:m[2]||m[3],a:P(lex(m[4],ln),ln).expr(),body:block(o.ind),ln};
  if(m=tx.match(/^while\s+(.+)$/))return {t:'while',c:P(lex(m[1],ln),ln).expr(),body:block(o.ind),ln};
  if(/^switch\b/.test(tx))throw new Error(`Line ${ln}: "switch" is not supported yet. Rewrite it with if / else if.`);
  if(/^(import|export|type|method|library)\b/.test(tx)&&!/^type\s*=/.test(tx))throw new Error(`Line ${ln}: "${tx.split(/\s/)[0]}" (libraries, user types, methods) is not supported.`);
  if(tx==='break')return {t:'brk'};if(tx==='continue')return {t:'cont'};
  if(m=tx.match(/^(\w+)\s*\(([^()]*)\)\s*=>\s*(.*)$/)&&!/^(if|for|while)$/.test(tx.split('(')[0].trim())){const ps=m[2].split(',').map(s=>s.trim().split(/\s+/).pop().split('=')[0]).filter(Boolean),rest=m[3].trim();
   let body;if(rest){body=[{t:'expr',e:P(lex(rest,ln),ln).expr(),ln}]}else body=block(o.ind);return {t:'fn',n:m[1],ps,body,ln}}
  // declarations / assignments
  let isVar=false;if(/^(var|varip)\s/.test(tx)){isVar=true;tx=tx.replace(/^(var|varip)\s+/,'')}
  let toks=lex(tx,ln);
  if(toks[0]&&toks[0].k==='o'&&toks[0].v==='['){let q=1;const names=[];while(toks[q]&&!(toks[q].k==='o'&&toks[q].v===']')){if(toks[q].k==='i')names.push(toks[q].v);q++}if(toks[q+1]&&toks[q+1].v==='='){const pp=P(toks.slice(q+2),ln);return {t:'tuple',names,e:pp.expr(),ln}}}
  // strip type words: a type then ident then = ; or array<float> ident =
  let s=0;while(toks[s]&&toks[s].k==='i'&&TYPES.has(toks[s].v)&&toks[s+1]&&(toks[s+1].k==='i'||toks[s+1].v==='<')){if(toks[s+1].k==='o'&&toks[s+1].v==='<'){let d=0;do{if(toks[s+1].v==='<')d++;if(toks[s+1].v==='>')d--;toks.splice(s+1,1)}while(d>0&&toks[s+1])}s++;if(toks[s]&&toks[s].k==='i'&&toks[s+1]&&toks[s+1].k==='o'&&['=',':='].includes(toks[s+1].v))break}
  if(s>0)toks=toks.slice(s);
  if(toks[0]&&toks[0].k==='i'&&toks[1]&&toks[1].k==='o'&&['=',':=','+=','-=','*=','/=','%='].includes(toks[1].v)&&!(toks[1].v==='='&&toks[2]&&toks[2].v==='=')){const name=toks[0].v,op=toks[1].v,rest=toks.slice(2);
   let e;if(rest.length&&rest[0].k==='i'&&rest[0].v==='if'&&rest.length===1+0||/^(\w+\s*(:=|=)\s*)if\b/.test(tx)){// block-valued if
    const cond=P(rest.slice(1),ln).expr(),body=block(o.ind),node={t:'if',c:cond,b:body,e:null,ln};let cur=node;while(i<L.length&&L[i].ind===o.ind&&/^else\b/.test(L[i].text)){const ee=L[i++],r2=ee.text.slice(4).trim();if(/^if\b/.test(r2)){const n={t:'if',c:P(lex(r2.slice(2),ee.line),ee.line).expr(),b:block(o.ind),e:null,ln:ee.line};cur.e=[n];cur=n}else{cur.e=block(o.ind);break}}e={t:'ifx',n:node}}else e=P(rest,ln).expr();
   return {t:'asg',n:name,op,e,isVar,decl:op==='=',ln}}
  return {t:'expr',e:P(toks,ln).expr(),ln}}
 const prog=[];while(i<L.length)prog.push(stmt(-1));return prog}
// ---- interpreter
const nz=(x,d)=>(x==null||(typeof x==='number'&&isNaN(x)))?(d==null?0:d):x,isNa=x=>x==null||(typeof x==='number'&&isNaN(x));

const TFMAP={'D':'1D','1D':'1D','W':'1W','1W':'1W','M':'1M','1M':'1M','60':'1H','1H':'1H','240':'4H','4H':'4H','30':'30m','15':'15m','5':'5m','1':'1m'};
function splitArgs(t){const a=[];let d=0,q=null,c='';for(const ch of t){if(q){c+=ch;if(ch===q)q=null;continue}if(ch==='"'||ch==="'"){q=ch;c+=ch;continue}if('([{'.includes(ch))d++;if(')]}'.includes(ch))d--;if(ch===','&&d===0){a.push(c);c=''}else c+=ch}if(c.trim())a.push(c);return a.map(x=>x.trim())}
function preSec(src){const calls=[];let out='',k=0;const re=/request\.security\s*\(/g;let m,last=0;
 while((m=re.exec(src))){let j=re.lastIndex,d=1,q=null;while(j<src.length&&d>0){const ch=src[j];if(q){if(ch===q)q=null}else if(ch==='"'||ch==="'")q=ch;else if(ch==='(')d++;else if(ch===')')d--;j++}
  const args=splitArgs(src.slice(re.lastIndex,j-1)),lit=x=>{const mm=/^["'](.*)["']$/.exec(x||'');return mm?mm[1]:null};
  const ln=src.slice(0,m.index).split('\n').length;
  const sy=/^syminfo\.tickerid$|^syminfo\.ticker$/.test(args[0])?'@chart':lit(args[0]),tf=/^timeframe\.period$/.test(args[1])?'@chart':lit(args[1]);
  if(sy==null||tf==null)throw new Error(`Line ${ln}: request.security needs a quoted symbol (or syminfo.tickerid) and a quoted timeframe (or timeframe.period). Other forms are not supported.`);
  if(tf!=='@chart'&&!TFMAP[tf])throw new Error(`Line ${ln}: timeframe "${tf}" is not supported in request.security (use D, W, M, 60, 240, 30, 15, 5, 1).`);
  const name='__rs'+(k++);calls.push({name,sym:sy,tf:tf==='@chart'?'@chart':TFMAP[tf],expr:args[2],ln,hasExtra:args.slice(3).join(',')});out+=src.slice(last,m.index)+name;last=j}
 out+=src.slice(last);return {src:out,calls}}
function run(src,bars,opts){opts=opts||{};const PRE=preSec(src);src=PRE.src;const n=bars.length,prog=parseProgram(src),O=bars.map(b=>b.open),H=bars.map(b=>b.high),Lw=bars.map(b=>b.low),C=bars.map(b=>b.close),V=bars.map(b=>b.volume||0),T=bars.map(b=>b.time);
 const R={plots:[],shapes:[],lines:[],labels:[],alerts:[],inputs:[],title:'',overlay:true,unsupported:new Set(),logs:[]};const SQ={init:opts.capital||100000,pos:0,avg:0,realized:0,trades:[],pend:[],exits:[],eq:[],cfg:{qtyType:'fixed',qty:1,commission:0,commType:'percent',pyramiding:1},eid:null,ebar:0,peak:0,dd:0};
 let i=0;const G={},HIST={},FN={},ovr=opts.inputs||{};const RS={};PRE.calls.forEach(c=>{const key=(c.sym==='@chart'?'@chart':c.sym)+'|'+c.tf,hb=c.sym==='@chart'&&c.tf==='@chart'?bars:(opts.sec||{})[key];if(!hb)throw new Error(`Line ${c.ln}: data for request.security(${c.sym}, ${c.tf}) was not loaded`);
  const sub=run('//@version=6\nindicator("x")\nplot('+c.expr+')',hb,{sym:opts.sym,tf:opts.tf,inputs:{}}),dat=sub.plots[0]?sub.plots[0].data:[];const ser=new Array(n).fill(NaN),TM=new Map(hb.map((b,x)=>[b.time,x]));
  if(hb===bars){for(let q=0;q<n;q++)ser[q]=dat[q]==null?NaN:dat[q]}else{let j=-1;for(let q=0;q<n;q++){const t=T[q];   while(j+2<hb.length&&hb[j+2].time<=t)j++;
   // same timeframe: value of the bar at the same time; higher timeframe: last COMPLETED bar (no look-ahead)
   if(c.tf===opts.tf){const x=TM.get(t);ser[q]=x!=null&&dat[x]!=null?dat[x]:NaN}else ser[q]=j>=0&&dat[j]!=null?dat[j]:NaN}}
  RS[c.name]=ser;if(c.hasExtra)R.logs.push('request.security extra arguments (gaps/lookahead) are ignored: only completed higher-timeframe bars are used, no look-ahead')});
 if(PRE.calls.length)R.logs.push('request.security: higher-timeframe values use the last completed bar (no repainting); may differ from TradingView on developing bars');
 let inCount=0,brk=false,cont=false;
 const colr=(c,t)=>{if(c==null)return null;let h=String(c);if(t==null||isNaN(t)||t<=0)return h;const a=Math.round(255*(1-Math.min(100,t)/100)).toString(16).padStart(2,'0');return h.slice(0,7)+a};
 const series={open:()=>O[i],high:()=>H[i],low:()=>Lw[i],close:()=>C[i],volume:()=>V[i],time:()=>T[i]*1000,bar_index:()=>i,hl2:()=>(H[i]+Lw[i])/2,hlc3:()=>(H[i]+Lw[i]+C[i])/3,ohlc4:()=>(O[i]+H[i]+Lw[i]+C[i])/4,hlcc4:()=>(H[i]+Lw[i]+2*C[i])/4,last_bar_index:()=>n-1};
 const arrs={open:O,high:H,low:Lw,close:C,volume:V};
 const hs=nm=>nm in arrs?arrs[nm]:(series[nm]?Array.from({length:n},(_,j)=>{const s=i;i=j;const v=series[nm]();i=s;return v}):null);
 const tast=(k,st)=>st||(st={});
 // stateful ta functions: each call site keeps its own series
 function sts(node){const c=(node.cnt=(node.cnt||0)),k=node.id+'#'+c;node.cnt=c+1;return node.S=node.S||{},node.S[c]=node.S[c]||{v:[],v2:[],p:null,i:0}}
 const win=(v,len,f)=>{const a=v.length-len;if(a<0)return NaN;let r=[];for(let j=a;j<v.length;j++)r.push(v[j]);return f(r)};
 const TA={
  sma:(s,a)=>{s.v.push(a[0]);return win(s.v,a[1],r=>r.reduce((x,y)=>x+y,0)/r.length)},
  ema:(s,a)=>{const x=a[0],l=a[1],k=2/(l+1);s.v.push(x);if(s.v.length<l)return NaN;if(s.p==null||isNaN(s.p))s.p=win(s.v,l,r=>r.reduce((p,q)=>p+q,0)/l);else s.p=isNaN(x)?s.p:x*k+s.p*(1-k);return s.p},
  rma:(s,a)=>{const x=a[0],l=a[1];s.v.push(x);if(s.v.length<l)return NaN;if(s.p==null||isNaN(s.p))s.p=win(s.v,l,r=>r.reduce((p,q)=>p+q,0)/l);else s.p=(s.p*(l-1)+x)/l;return s.p},
  wma:(s,a)=>{s.v.push(a[0]);return win(s.v,a[1],r=>{let w=0,t=0;r.forEach((x,j)=>{w+=x*(j+1);t+=j+1});return w/t})},
  vwma:(s,a)=>{s.v.push(a[0]*V[i]);s.v2.push(V[i]);const l=a[1];if(s.v.length<l)return NaN;let x=0,y=0;for(let j=s.v.length-l;j<s.v.length;j++){x+=s.v[j];y+=s.v2[j]}return x/y},
  stdev:(s,a)=>{s.v.push(a[0]);return win(s.v,a[1],r=>{const m=r.reduce((x,y)=>x+y,0)/r.length;return Math.sqrt(r.reduce((x,y)=>x+(y-m)*(y-m),0)/r.length)})},
  highest:(s,a)=>{const one=a.length===1;s.v.push(one?H[i]:a[0]);return win(s.v,one?a[0]:a[1],r=>Math.max(...r))},
  lowest:(s,a)=>{const one=a.length===1;s.v.push(one?Lw[i]:a[0]);return win(s.v,one?a[0]:a[1],r=>Math.min(...r))},
  change:(s,a)=>{s.v.push(a[0]);const l=a[1]==null?1:a[1];return s.v.length>l?a[0]-s.v[s.v.length-1-l]:NaN},
  mom:(s,a)=>{s.v.push(a[0]);const l=a[1];return s.v.length>l?a[0]-s.v[s.v.length-1-l]:NaN},
  roc:(s,a)=>{s.v.push(a[0]);const l=a[1];return s.v.length>l?100*(a[0]-s.v[s.v.length-1-l])/s.v[s.v.length-1-l]:NaN},
  cum:(s,a)=>{s.p=(s.p||0)+nz(a[0]);return s.p},
  tr:(s)=>{const pc=i>0?C[i-1]:NaN;return isNaN(pc)?H[i]-Lw[i]:Math.max(H[i]-Lw[i],Math.abs(H[i]-pc),Math.abs(Lw[i]-pc))},
  atr:(s,a)=>{const pc=i>0?C[i-1]:NaN,tr=isNaN(pc)?H[i]-Lw[i]:Math.max(H[i]-Lw[i],Math.abs(H[i]-pc),Math.abs(Lw[i]-pc));return TA.rma(s,[tr,a[0]])},
  rsi:(s,a)=>{const x=a[0],l=a[1];s.v.push(x);if(s.v.length<2){s.u={v:[],v2:[],p:null};s.d={v:[],v2:[],p:null};return NaN}const ch=x-s.v[s.v.length-2],u=TA.rma(s.u,[Math.max(ch,0),l]),d=TA.rma(s.d,[Math.max(-ch,0),l]);return isNaN(u)?NaN:d===0?100:100-100/(1+u/d)},
  crossover:(s,a)=>{const r=s.p!=null&&a[0]>a[1]&&s.p[0]<=s.p[1];s.p=[a[0],a[1]];return r},
  crossunder:(s,a)=>{const r=s.p!=null&&a[0]<a[1]&&s.p[0]>=s.p[1];s.p=[a[0],a[1]];return r},
  cross:(s,a)=>{const r=s.p!=null&&((a[0]>a[1]&&s.p[0]<=s.p[1])||(a[0]<a[1]&&s.p[0]>=s.p[1]));s.p=[a[0],a[1]];return r},
  rising:(s,a)=>{s.v.push(a[0]);const l=a[1];if(s.v.length<=l)return false;for(let j=1;j<=l;j++)if(!(s.v[s.v.length-j]>s.v[s.v.length-j-1]))return false;return true},
  falling:(s,a)=>{s.v.push(a[0]);const l=a[1];if(s.v.length<=l)return false;for(let j=1;j<=l;j++)if(!(s.v[s.v.length-j]<s.v[s.v.length-j-1]))return false;return true},
  barssince:(s,a)=>{if(a[0])s.p=0;else if(s.p!=null)s.p++;return s.p==null?NaN:s.p},
  valuewhen:(s,a)=>{s.v.push(a[0]?a[1]:null);const occ=a[2]||0;let c=0;for(let j=s.v.length-1;j>=0;j--)if(s.v[j]!=null){if(c===occ)return s.v[j];c++}return NaN},
  pivothigh:(s,a)=>piv(s,a,1),pivotlow:(s,a)=>piv(s,a,-1),
  macd:(s,a)=>{s.a=s.a||{v:[],v2:[],p:null};s.b=s.b||{v:[],v2:[],p:null};s.c=s.c||{v:[],v2:[],p:null};const m=TA.ema(s.a,[a[0],a[1]])-TA.ema(s.b,[a[0],a[2]]),sg=TA.ema(s.c,[m,a[3]]);return [m,sg,m-sg]},
  bb:(s,a)=>{s.v.push(a[0]);const l=a[1];if(s.v.length<l)return [NaN,NaN,NaN];const r=s.v.slice(-l),m=r.reduce((x,y)=>x+y,0)/l,sd=Math.sqrt(r.reduce((x,y)=>x+(y-m)*(y-m),0)/l);return [m,m+a[2]*sd,m-a[2]*sd]}
 };
 function piv(s,a,dir){let src,l,r;if(a.length===2){src=dir>0?H[i]:Lw[i];l=a[0];r=a[1]}else{src=a[0];l=a[1];r=a[2]}s.v.push(src);const k=s.v.length-1;if(k<l+r)return NaN;const c=s.v[k-r];if(isNa(c))return NaN;
  for(let j=k-r-l;j<=k;j++){if(j===k-r)continue;const x=s.v[j];if(isNa(x))return NaN;if(j<k-r){if(dir>0?x>=c:x<=c)return NaN}else{if(dir>0?x>c:x<c)return NaN}}return c}
 const MATH={abs:Math.abs,max:(...a)=>Math.max(...a),min:(...a)=>Math.min(...a),round:(x,p)=>p?Math.round(x*10**p)/10**p:Math.round(x),floor:Math.floor,ceil:Math.ceil,sqrt:Math.sqrt,pow:Math.pow,log:Math.log,log10:Math.log10,exp:Math.exp,sign:Math.sign,sin:Math.sin,cos:Math.cos,tan:Math.tan,avg:(...a)=>a.reduce((x,y)=>x+y,0)/a.length,sum:null,tointeger:Math.trunc,random:()=>Math.random()};
 const lineProps={x1:0,y1:1,x2:2,y2:3};
 function lineAt(l,x){if(!l||l.del)return NaN;const dx=l.x2-l.x1;if(dx===0)return l.y2;const sl=(l.y2-l.y1)/dx;if(x>l.x2&&!(l.ext==='right'||l.ext==='both'))return NaN;if(x<l.x1&&!(l.ext==='left'||l.ext==='both'))return NaN;return l.y1+sl*(x-l.x1)}
 const need=(c,m)=>{R.unsupported.add(m);throw new Error(`Line ${c.ln||'?'}: ${m}`)};
 function callNs(ns,fn,node,args,nm){const key=ns+'.'+fn;
  if(ns==='ta'){if(!TA[fn])need(node,`ta.${fn} is not supported yet`);const s=sts(node),r=TA[fn](s,args);return r}
  if(ns==='math'){if(fn==='sum'){const s=sts(node);s.v.push(args[0]);return win(s.v,args[1],r=>r.reduce((x,y)=>x+y,0))}if(!MATH[fn])need(node,`math.${fn} is not supported`);return MATH[fn](...args)}
  if(ns==='input'){const idx=inCount++,def=fn==='source'?args[0]:(nm.defval!==undefined?nm.defval:args[0]);let v=def;if(ovr[idx]!==undefined)v=ovr[idx];R.inputs.push({idx,type:fn,title:nm.title||args[1]||('Input '+(idx+1)),def,v});return v}
  if(ns==='color'){if(fn==='new')return colr(args[0],args[1]);if(fn==='rgb'){const h=x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0');return '#'+h(args[0])+h(args[1])+h(args[2])+(args[3]!=null&&args[3]>0?h(255*(1-args[3]/100)):'')}need(node,`color.${fn}() is not supported`)}
  if(ns==='str'){if(fn==='tostring')return typeof args[0]==='number'?(Number.isInteger(args[0])?String(args[0]):args[0].toFixed(4).replace(/0+$/,'')):String(args[0]);if(fn==='length')return String(args[0]).length;if(fn==='contains')return String(args[0]).includes(args[1]);need(node,`str.${fn} is not supported`)}
  if(ns==='line'){switch(fn){
   case 'new':{const o={x1:args[0],y1:args[1],x2:args[2],y2:args[3],ext:(nm.extend||'none').replace('extend.',''),color:nm.color||'#2962FF',width:nm.width||1,style:nm.style||'solid',del:false};R.lines.push(o);return o}
   case 'delete':if(args[0])args[0].del=true;return null;
   case 'get_price':return lineAt(args[0],args[1]);
   case 'set_x1':case 'set_y1':case 'set_x2':case 'set_y2':if(args[0])args[0][fn.slice(4)]=args[1];return null;
   case 'set_xy1':if(args[0]){args[0].x1=args[1];args[0].y1=args[2]}return null;case 'set_xy2':if(args[0]){args[0].x2=args[1];args[0].y2=args[2]}return null;
   case 'set_color':if(args[0])args[0].color=args[1];return null;case 'set_width':if(args[0])args[0].width=args[1];return null;case 'set_extend':if(args[0])args[0].ext=String(args[1]).replace('extend.','');return null;
   case 'get_x1':return args[0]?args[0].x1:NaN;case 'get_x2':return args[0]?args[0].x2:NaN;case 'get_y1':return args[0]?args[0].y1:NaN;case 'get_y2':return args[0]?args[0].y2:NaN;
   default:need(node,`line.${fn} is not supported`)}}
  if(ns==='label'){switch(fn){case 'new':{const o={x:args[0],y:args[1],text:args[2]!=null?args[2]:(nm.text||''),style:nm.style||'label_down',color:nm.color||'#2962FF',textcolor:nm.textcolor||'#FFFFFF',del:false};if(args[2]==null&&nm.text==null)o.text='';R.labels.push(o);return o}
   case 'delete':if(args[0])args[0].del=true;return null;case 'set_text':if(args[0])args[0].text=args[1];return null;case 'set_xy':if(args[0]){args[0].x=args[1];args[0].y=args[2]}return null;case 'set_x':if(args[0])args[0].x=args[1];return null;case 'set_y':if(args[0])args[0].y=args[1];return null;case 'set_color':if(args[0])args[0].color=args[1];return null;
   default:need(node,`label.${fn} is not supported`)}}
  if(ns==='array'){switch(fn){case 'new_float':case 'new_int':case 'new_bool':case 'new_string':case 'new_color':case 'new':return Array.from({length:args[0]||0},()=>args[1]!==undefined?args[1]:NaN);case 'from':return args.slice();case 'push':args[0].push(args[1]);return null;case 'get':return args[0][args[1]<0?args[0].length+args[1]:args[1]];case 'set':args[0][args[1]]=args[2];return null;case 'size':return args[0].length;case 'pop':return args[0].pop();case 'shift':return args[0].shift();case 'unshift':args[0].unshift(args[1]);return null;case 'clear':args[0].length=0;return null;case 'sum':return args[0].reduce((x,y)=>x+nz(y),0);case 'max':return Math.max(...args[0]);case 'min':return Math.min(...args[0]);case 'avg':return args[0].reduce((x,y)=>x+nz(y),0)/args[0].length;default:need(node,`array.${fn} is not supported`)}}
  if(ns==='request')need(node,`request.${fn}() is not supported: it needs other symbols or timeframes, which the free feed cannot serve here. Remove it or replace it with the current symbol's own data.`);
  if(ns==='strategy'){if(nm.when!==undefined&&!nm.when)return null;switch(fn){
   case 'entry':case 'order':SQ.pend.push({t:'entry',id:args[0],dir:String(args[1]).replace('strategy.',''),qty:nm.qty!=null?nm.qty:args[2],bar:i});return null;
   case 'close':SQ.pend.push({t:'close',id:args[0],bar:i});return null;case 'close_all':SQ.pend.push({t:'close',id:null,bar:i});return null;
   case 'exit':{const o={id:args[0],from:nm.from_entry||args[1],stop:nm.stop,limit:nm.limit};if(nm.profit!=null||nm.loss!=null||nm.trail_points!=null||nm.trail_offset!=null)R.logs.push('strategy.exit profit/loss/trail in ticks is ignored; only stop= and limit= price levels are applied');SQ.exits=SQ.exits.filter(x=>x.id!==o.id);SQ.exits.push(o);return null}
   case 'cancel':SQ.pend=SQ.pend.filter(p=>p.id!==args[0]);return null;case 'cancel_all':SQ.pend=[];return null;
   default:need(node,`strategy.${fn}() is not supported`)}}
  if(ns==='box'||ns==='table')need(node,`${ns}.${fn}() (${ns}es/tables) is not supported yet`);
  need(node,`${key}() is not supported`)}
 function top(node,name,args,nm){switch(name){
  case 'indicator':R.title=args[0]||nm.title||'';if(nm.overlay===false)R.overlay=false;return null;
  case 'strategy':{R.title=args[0]||nm.title||'';R.isStrategy=true;if(nm.overlay===false)R.overlay=false;const c=SQ.cfg;if(nm.initial_capital)SQ.init=nm.initial_capital;if(nm.default_qty_type)c.qtyType=String(nm.default_qty_type).replace('strategy.','');if(nm.default_qty_value!=null)c.qty=nm.default_qty_value;else if(c.qtyType==='percent_of_equity')c.qty=100;
  if(nm.commission_value){c.commission=nm.commission_value;c.commType=String(nm.commission_type||'strategy.commission.percent').replace('strategy.commission.','');if(c.commType!=='percent')R.logs.push('Only percent commission is applied; other commission types are ignored')}
  if(nm.pyramiding!=null)c.pyramiding=nm.pyramiding;if(nm.slippage)R.logs.push('Slippage is ignored');return null}
  case 'library':need(node,'Libraries are not supported');
  case 'input':{const idx=inCount++;let v=args[0];if(ovr[idx]!==undefined)v=ovr[idx];R.inputs.push({idx,type:'input',title:nm.title||args[1]||('Input '+(idx+1)),def:args[0],v});return v}
  case 'na':return args.length?isNa(args[0]):NaN;case 'nz':return nz(args[0],args[1]);case 'int':return isNa(args[0])?NaN:Math.trunc(args[0]);case 'float':return args[0];case 'bool':return !!args[0];case 'string':return String(args[0]);
  case 'fixnan':{const s=sts(node);if(!isNa(args[0]))s.p=args[0];return s.p==null?NaN:s.p}
  case 'plot':{const s=sts(node);if(!s.o){s.o={title:nm.title||args[1]||('Plot '+(R.plots.length+1)),color:nm.color,colors:[],data:[],width:nm.linewidth||args[3]||1,style:nm.style||'line'};R.plots.push(s.o)}s.o.data[i]=args[0];s.o.colors[i]=(nm.color!==undefined?nm.color:args[2]);if(nm.style)s.o.style=nm.style;return args[0]}
  case 'plotshape':case 'plotchar':case 'plotarrow':{const cond=args[0];if(cond&&!isNa(cond)){R.shapes.push({i,style:nm.style||'shape.xcross',loc:nm.location||'location.abovebar',color:nm.color||'#2962FF',text:nm.text||'',textcolor:nm.textcolor||'#FFFFFF',title:nm.title||''})}return null}
  case 'bgcolor':case 'hline':case 'fill':case 'barcolor':case 'plotcandle':case 'plotbar':R.logs.push(`${name}() is ignored (not drawn)`);return null;
  case 'alertcondition':{if(args[0]&&!isNa(args[0]))R.alerts.push({i,title:nm.title||args[1]||'Alert',msg:nm.message||args[2]||''});return null}
  case 'alert':{R.alerts.push({i,title:'alert()',msg:args[0]||''});return null}
  case 'timeframe':return null;
  case 'log':return null;case 'max':return Math.max(...args);case 'min':return Math.min(...args);case 'abs':return Math.abs(args[0]);
  case 'time':return T[i]*1000;
  default:return undefined}}
 const specials={'syminfo.tickerid':()=>opts.sym||'','syminfo.ticker':()=>opts.sym||'','timeframe.period':()=>opts.tf||'1D','strategy.long':()=>'long','strategy.short':()=>'short','strategy.fixed':()=>'fixed','strategy.percent_of_equity':()=>'percent_of_equity','strategy.cash':()=>'cash','strategy.commission.percent':()=>'percent','strategy.commission.cash_per_order':()=>'cash_per_order','strategy.commission.cash_per_contract':()=>'cash_per_contract','strategy.position_size':()=>SQ.pos,'strategy.position_avg_price':()=>SQ.pos?SQ.avg:NaN,'strategy.equity':()=>SQ.init+SQ.realized+(SQ.pos?(C[i]-SQ.avg)*SQ.pos:0),'strategy.netprofit':()=>SQ.realized,'strategy.opentrades':()=>SQ.pos?1:0,'strategy.closedtrades':()=>SQ.trades.length,'syminfo.mintick':()=>0.01,'syminfo.pointvalue':()=>1,'barstate.islast':()=>i===n-1,'barstate.isfirst':()=>i===0,'barstate.isconfirmed':()=>true,'barstate.ishistory':()=>i<n-1,'barstate.isrealtime':()=>false,'barstate.islastconfirmedhistory':()=>i===n-1,'barstate.isnew':()=>true,'syminfo.tickerid':()=>opts.sym||'','syminfo.ticker':()=>opts.sym||'','timeframe.period':()=>opts.tf||'D','timeframe.isdaily':()=>(opts.tf||'1D')==='1D','timeframe.isintraday':()=>!['1D','1W','1M'].includes(opts.tf||'1D'),'math.pi':()=>Math.PI,'math.e':()=>Math.E};
 function memName(e){if(e.t==='name')return e.n;if(e.t==='mem'){const o=memName(e.o);return o?o+'.'+e.p:null}return null}
 function ev(e,fr){switch(e.t){
  case 'num':case 'str':return e.v;
  case 'name':{const n=e.n;if(fr&&n in fr)return fr[n];if(n in G)return G[n];if(n==='na')return NaN;if(series[n])return series[n]();if(n==='true')return true;if(n==='false')return false;if(n in FN)return {fn:n};if(NS.has(n))return {ns:n};R.unsupported.add(n);throw new Error(`Line ${e.ln}: "${n}" is not defined or not supported`)}
  case 'mem':{const k=memName(e);if(k){if(k in specials)return specials[k]();const [a,b]=k.split('.');if(a==='color'&&COLORS[b])return COLORS[b];if(['extend','xloc','yloc','location','shape','size','line','label','plot','display','text','position','format'].includes(a)&&b&&e.o.t==='name'&&NS.has(a))return a+'.'+b;if(a==='dayofweek'||a==='session')return k}
   const o=ev(e.o,fr);if(o&&o.ns)return {ns:o.ns,p:e.p};if(o&&typeof o==='object'&&e.p in o)return o[e.p];return {m:e.p,obj:o}}
  case 'arr':return e.a.map(x=>ev(x,fr));
  case 'un':{const v=ev(e.e,fr);return e.o==='-'?-v:!v}
  case 'bin':{const l=ev(e.l,fr),r=ev(e.r,fr);switch(e.o){case '+':return typeof l==='string'||typeof r==='string'?String(l)+String(r):l+r;case '-':return l-r;case '*':return l*r;case '/':return l/r;case '%':return l%r;case '==':return l===r||(isNa(l)&&isNa(r)&&false);case '!=':return l!==r;case '<':return l<r;case '>':return l>r;case '<=':return l<=r;case '>=':return l>=r;case 'and':return !!l&&!!r;case 'or':return !!l||!!r}}
  case 'tern':{const c=ev(e.c,fr),a=ev(e.a,fr),b=ev(e.b,fr);return c?a:b}
  case 'idx':{const k=ev(e.i,fr)|0;const b=e.e;if(b.t==='name'){const nm=b.n;if(fr&&nm in fr)return NaN;if(nm in arrs)return i-k>=0?arrs[nm][i-k]:NaN;if(nm in series){const s=i;i=i-k;const v=i>=0?series[nm]():NaN;i=s;return v}if(HIST[nm]){const j=i-k;return j>=0&&HIST[nm][j]!==undefined?HIST[nm][j]:NaN}}
   const base=ev(b,fr);if(Array.isArray(base))return base[k<0?base.length+k:k];const h=(b.hist=b.hist||[]);return i-k>=0&&h[i-k]!==undefined?h[i-k]:NaN}
  case 'ifx':{return execIf(e.n,fr,true)}
  case 'call':{const args=e.a.map(x=>ev(x,fr)),nm={};for(const k in e.nm)nm[k]=ev(e.nm[k],fr);const f=e.f;let r;
   if(f.t==='name'){const u=FN[f.n];if(u&&!(f.n in (fr||{}))){r=callUser(u,args,e)}else{r=top(e,f.n,args,nm);if(r===undefined){need(e,`${f.n}() is not supported yet`)}}}
   else if(f.t==='mem'){const o=f.o;if(o.t==='name'&&NS.has(o.n)&&!(o.n in G)&&!(fr&&o.n in fr)){r=callNs(o.n,f.p,e,args,nm)}else if(o.t==='mem'&&o.o.t==='name'&&NS.has(o.o.n)){r=callNs(o.o.n+'.'+o.p,f.p,e,args,nm)}else{const ob=ev(o,fr);if(Array.isArray(ob))r=callNs('array',f.p,e,[ob,...args],nm);else if(ob&&ob.x1!==undefined)r=callNs('line',f.p,e,[ob,...args],nm);else if(ob&&ob.text!==undefined&&ob.x!==undefined)r=callNs('label',f.p,e,[ob,...args],nm);else need(e,`method .${f.p}() is not supported`)}}
   else need(e,'unsupported call');
   if(e.keep)(e.hist=e.hist||[])[i]=r;return r}
  }}
 function callUser(u,args,e){const fr={};u.ps.forEach((p,j)=>fr[p]=args[j]);let last;for(const s of u.body){last=exec(s,fr);if(s.t==='ret')break}return last}
 function setv(name,v,fr){if(fr&&name in fr)fr[name]=v;else G[name]=v}
 function execIf(s,fr,asVal){let v=NaN;const c=ev(s.c,fr);const body=c?s.b:s.e;if(body)for(const st of body){v=exec(st,fr);if(brk||cont)break}return v}
 function exec(s,fr){switch(s.t){
  case 'expr':{const v=ev(s.e,fr);if(s.e.keep)(s.e.hist=s.e.hist||[])[i]=v;return v}
  case 'asg':{if(s.isVar&&s.decl){if(!s.init){const v=ev(s.e,fr);s.init=true;setv(s.n,v,fr)}else if(!(s.n in G)&&!(fr&&s.n in fr))setv(s.n,NaN,fr);return G[s.n]}
   let v=s.e.t==='ifx'?execIf(s.e.n,fr,true):ev(s.e,fr);if(s.op==='+=')v=(fr&&s.n in fr?fr[s.n]:G[s.n])+v;else if(s.op==='-=')v=(fr&&s.n in fr?fr[s.n]:G[s.n])-v;else if(s.op==='*=')v=(fr&&s.n in fr?fr[s.n]:G[s.n])*v;else if(s.op==='/=')v=(fr&&s.n in fr?fr[s.n]:G[s.n])/v;
   setv(s.n,v,fr);return v}
  case 'tuple':{const v=ev(s.e,fr);s.names.forEach((nm,j)=>setv(nm,Array.isArray(v)?v[j]:NaN,fr));return v}
  case 'if':return execIf(s,fr);
  case 'for':{const a=ev(s.a,fr),b=ev(s.b,fr),st=s.s?ev(s.s,fr):(a<=b?1:-1);let c=0;for(let k=a;st>0?k<=b:k>=b;k+=st){if(++c>100000)throw new Error(`Line ${s.ln}: loop is too long`);setv(s.v,k,fr);for(const x of s.body){exec(x,fr);if(brk||cont)break}if(brk){brk=false;break}cont=false}return NaN}
  case 'forin':{const arr=ev(s.a,fr);for(let k=0;k<arr.length;k++){if(s.i)setv(s.i,k,fr);setv(s.v,arr[k],fr);for(const x of s.body){exec(x,fr);if(brk||cont)break}if(brk){brk=false;break}cont=false}return NaN}
  case 'while':{let c=0;while(ev(s.c,fr)){if(++c>100000)throw new Error(`Line ${s.ln}: loop is too long`);for(const x of s.body){exec(x,fr);if(brk||cont)break}if(brk){brk=false;break}cont=false}return NaN}
  case 'brk':brk=true;return NaN;case 'cont':cont=true;return NaN;
  case 'fn':return NaN}}
 prog.forEach(s=>{if(s.t==='fn')FN[s.n]=s});
 // pre-scan for unsupported calls so every problem is listed at once
 const bad=[];const scan=(e,ln)=>{if(!e||typeof e!=='object')return;if(Array.isArray(e)){e.forEach(x=>scan(x,ln));return}if(e.t==='call'){const k=memName(e.f);if(k){const [a,b,c]=k.split('.');if(a==='request')bad.push(`Line ${e.ln}: ${k}() is not supported (needs other symbols/timeframes)`);else if(a==='strategy'&&b!==undefined&&!['entry','order','close','close_all','exit','cancel','cancel_all'].includes(b))bad.push(`Line ${e.ln}: ${k}() is not supported yet`);else if(a==='ta'&&!TA[b])bad.push(`Line ${e.ln}: ta.${b} is not supported yet`);else if((a==='box'||a==='table'||a==='map'||a==='matrix'))bad.push(`Line ${e.ln}: ${k}() is not supported yet`)}}for(const k in e)if(k!=='hist'&&k!=='S')scan(e[k],ln)};
 const scanS=ss=>ss.forEach(s=>{if(!s)return;for(const k of ['e','c','a','b','s'])if(s[k]&&s[k].t)scan(s[k]);if(s.body)scanS(s.body);if(s.b&&Array.isArray(s.b))scanS(s.b);if(s.e&&Array.isArray(s.e))scanS(s.e);if(s.e&&s.e.n)scanS([s.e.n])});scanS(prog);
 if(bad.length)throw new Error([...new Set(bad)].join('\n'));

 const comm=(price,q)=>SQ.cfg.commission?price*Math.abs(q)*SQ.cfg.commission/100:0;
 function closePos(price,reason){if(!SQ.pos)return;const q=Math.abs(SQ.pos),dir=SQ.pos>0?1:-1,pnl=(price-SQ.avg)*q*dir-comm(SQ.avg,q)-comm(price,q);SQ.realized+=pnl;SQ.trades.push({id:SQ.eid,dir:dir>0?'long':'short',qty:q,entry:SQ.avg,exit:price,eb:SQ.ebar,xb:i,pnl,reason});SQ.pos=0;SQ.avg=0}
 function openPos(dir,qty,price,id){const c=SQ.cfg,eq=SQ.init+SQ.realized;let q=qty;if(q==null||isNaN(q)){q=c.qtyType==='percent_of_equity'?eq*c.qty/100/price:c.qtyType==='cash'?c.qty/price:c.qty}if(!(q>0))return;SQ.pos=dir==='long'?q:-q;SQ.avg=price;SQ.eid=id;SQ.ebar=i}
 function procBar(){const pend=SQ.pend;SQ.pend=[];
  for(const o of pend){if(o.t==='entry'){const want=o.dir==='long'?1:-1,cur=SQ.pos>0?1:SQ.pos<0?-1:0;if(cur===want)continue;if(cur&&cur!==want)closePos(O[i],'reverse');openPos(o.dir,o.qty,O[i],o.id)}else if(o.t==='close'){if(SQ.pos&&(o.id==null||o.id===SQ.eid))closePos(O[i],'close')}}
  if(SQ.pos){for(const x of SQ.exits){if(x.from!=null&&x.from!==SQ.eid)continue;const lg=SQ.pos>0;
    if(x.stop!=null&&!isNaN(x.stop)&&(lg?Lw[i]<=x.stop:H[i]>=x.stop)){closePos(lg?Math.min(x.stop,O[i]):Math.max(x.stop,O[i]),'stop');break}
    if(x.limit!=null&&!isNaN(x.limit)&&(lg?H[i]>=x.limit:Lw[i]<=x.limit)){closePos(lg?Math.max(x.limit,O[i]):Math.min(x.limit,O[i]),'limit');break}}}
  if(!SQ.pos)SQ.exits=SQ.exits.filter(x=>false)}
 const names=new Set();
 for(i=0;i<n;i++){const walk=x=>{if(x&&typeof x==='object'){if(Array.isArray(x))x.forEach(walk);else{if(x.t==='call')x.cnt=0;for(const k in x)if(k!=='hist'&&k!=='S'&&typeof x[k]==='object')walk(x[k])}}};walk(prog);
  for(const k in RS)G[k]=RS[k][i];
  procBar();
  for(const s of prog){if(s.t==='fn')continue;exec(s,null);brk=false;cont=false}
  SQ.eq[i]=SQ.init+SQ.realized+(SQ.pos?(C[i]-SQ.avg)*SQ.pos:0);
  for(const k in G){(HIST[k]=HIST[k]||[])[i]=G[k]}inCount=0;R.inputs.length=R.inputs.length;if(i===0)R.nInputs=R.inputs.length;if(i>0&&R.inputs.length>R.nInputs)R.inputs.length=R.nInputs}
 R.strategy=R.isStrategy?SQ:null;R.lineEnd=n-1;R.lineAt=lineAt;return R}
return {run,parse:parseProgram,secNeeds:src=>{try{return preSec(src).calls.map(c=>({sym:c.sym,tf:c.tf}))}catch(e){return []}},preSec,isPine:s=>/\/\/\s*@version|^\s*(indicator|strategy)\s*\(|\binput\.(int|float|bool|string)\b|\bta\.[a-z]+\(|:=/m.test(s)}})();
