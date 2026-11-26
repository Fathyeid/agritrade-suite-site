/* Arabic / English UI layer. Language comes from localStorage 'suite_lang' ('ar'|'en'), set by the suite portal.
   The app writes English text; in Arabic mode every text node / title / placeholder is translated through a dictionary (i18n_data.js).
   Numbers, tickers, prices and indicator acronyms (RSI, MACD, EMA...) are standard symbols and are kept as is.
   Originals are remembered, so switching back to English restores the exact text. */
(function(){
const KEYS=['suite_lang','lang','gct_lang'];
const readLang=()=>{try{for(const k of KEYS){const v=localStorage.getItem(k);if(v==='ar'||v==='en')return v}}catch(e){}return 'en'};
let LANG=readLang();
const D=Object.assign({},window.I18N_AR||{}),X=window.I18N_IND||{};
const hasLetters=s=>/[A-Za-z]/.test(s);
// ---- merge indicator vocabulary ----
function mergeInd(){
 if(typeof IND==='undefined')return;
 const nm=X.names||{};
 for(const k in IND){IND[k].p.forEach(p=>{if(X.params&&X.params[p.l]&&!(p.l in D))D[p.l]=X.params[p.l]})}
 for(const k in IND){const x=IND[k];if(!x.pre&&nm[k])D[x.n]=nm[k]}
 Object.assign(D,X.groups||{},X.lines||{});
 if(X.groups)Object.keys(X.groups).forEach(k=>D[k]=X.groups[k]);
 // presets: Arabic base name + the numeric part of the label
 for(const k in IND){const x=IND[k];if(!x.pre)continue;const base=nm[x.base]||x.n;const m=x.n.match(/^(.*?)(?:\s+(?=[\d(])|\s*(?=\d))(.*)$/);const params=m?m[2]:'';let stem=m?m[1]:x.n;
  let b=base;if(/^Distance from (S|E)MA/.test(x.n)){b='البُعد عن المتوسط '+(x.n.includes('SMA')?'البسيط SMA':'الأسي EMA');}
  else if(params.endsWith('(%)'))b=b.replace(/\s*\(%\)\s*$/,'');
  D[x.n]=(b+' '+params).replace(/\(fast\)/,'(سريع)').trim();}
 D['Option opts']='';
 Object.keys(X.opts||{}).forEach(k=>{if(!(k in D))D[k]=X.opts[k]});
}
// ---- translation ----
const PREFIX=[];let prefixBuilt=false;
function buildPrefixes(){PREFIX.length=0;for(const k in D){if(k.length>3&&/[\s:("\[]$/.test(k))PREFIX.push(k)}PREFIX.sort((a,b)=>b.length-a.length);prefixBuilt=true}
const MON={Jan:'يناير',Feb:'فبراير',Mar:'مارس',Apr:'أبريل',May:'مايو',Jun:'يونيو',Jul:'يوليو',Aug:'أغسطس',Sep:'سبتمبر',Oct:'أكتوبر',Nov:'نوفمبر',Dec:'ديسمبر'};
const AP=x=>String(x).replace(/ AM\b/,' ص').replace(/ PM\b/,' م');
const RULES=[
 [/^Could not load (.+?) \(([^)]+)\)\. (Intraday history is limited by the free feed\. )?Try another timeframe\.$/,(m)=>`تعذر تحميل ${m[1]} (${m[2]}). ${m[3]?'الأطر الزمنية اللحظية محدودة في المصدر المجاني. ':''}جرّب إطاراً زمنياً آخر.`],
 [/^Could not load: (.*)$/,(m)=>`تعذر التحميل: ${m[1]==='bad response'?'استجابة غير صالحة':m[1]}`],
 [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) '(\d\d)$/,(m)=>`${MON[m[1]]} '${m[2]}`],
 [/^RVOL ([\d.]+)x$/,(m)=>`حجم نسبي ${m[1]}x`],[/^Gap (down|up) (-?[\d.]+%)$/,(m)=>`فجوة ${m[1]==='up'?'صعودية':'هبوطية'} ${m[2]}`],
 [/^\+(\d+\.\d+)% from low$/,(m)=>`${m[1]}%+ عن القاع`],
 [/^delayed, (.*)$/,(m)=>`متأخر، ${m[1]}`],
 [/^(-?[\d.]+%) from (high|low)$/,(m)=>`${m[1]} عن ${m[2]==='high'?'القمة':'القاع'}`],
 [/^(.*?) (daily returns), last (\d+) days$/,(m)=>`العوائد اليومية لـ${m[1]}، آخر ${m[3]} يوماً`],
 [/^Mean (-?[\d.]+)%\s+Std dev ([\d.]+)%\s+Worst (-?[\d.]+)%\s+Best (-?[\d.]+)%$/,(m)=>`المتوسط ${m[1]}٪  الانحراف المعياري ${m[2]}٪  الأسوأ ${m[3]}٪  الأفضل ${m[4]}٪`],
 [/^Cash \$(.*?)\s+Equity \$(.*)$/,(m)=>`النقد $${m[1]}   حقوق الملكية $${m[2]}`],
 [/^Open P&L \$(.*)$/,(m)=>`الربح/الخسارة المفتوحة $${m[1]}`],
 [/^(-?[\d.]+)% of price$/,(m)=>`${m[1]}% من السعر`],
 [/^Current state score (-?\d+) \(of \+4 bullish \.\.\. -4 bearish: price vs EMA50, EMA20 vs EMA50, RSI vs 50, MACD sign\)\. (\d+) past bars had this exact state\. 20 bars later: (\d+)% were higher, median (-?[\d.]+)%, 10th to 90th percentile (-?[\d.]+)% to (-?[\d.]+)%\.$/,(m)=>`درجة الحالة الحالية ${m[1]} (من +4 صاعدة إلى -4 هابطة: السعر مقابل EMA50 وEMA20 مقابل EMA50 وRSI مقابل 50 وإشارة MACD). ${m[2]} شمعة سابقة كانت في نفس الحالة. بعد 20 شمعة: ${m[3]}% كانت أعلى، الوسيط ${m[4]}%، من المئين 10 إلى 90: ${m[5]}% إلى ${m[6]}%.`],
 [/^(\d{1,2}) (Mon|Tue|Wed|Thu|Fri|Sat|Sun)( •)?$/,(m)=>`${m[1]} ${({Mon:'الاثنين',Tue:'الثلاثاء',Wed:'الأربعاء',Thu:'الخميس',Fri:'الجمعة',Sat:'السبت',Sun:'الأحد'})[m[2]]}${m[3]||''}`],
 [/^(Economic|Earnings|Dividends|IPO) (\d+)$/,(m)=>`${({Economic:'اقتصادية',Earnings:'أرباح',Dividends:'توزيعات',IPO:'طروحات'})[m[1]]} ${m[2]}`],
 [/^([A-Z][a-z]{2}) (\d{1,2}) - ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/,(m)=>`${MON[m[1]]} ${m[2]} - ${MON[m[3]]} ${m[4]}، ${m[5]}`],
 [/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), ([A-Z][a-z]+) (\d{1,2})$/,(m)=>`${D[m[1]]}، ${m[3]} ${D[m[2]]||m[2]}`],
 [/^Signals \(\+1\/-1\/0\): trend score (-?\d+) \((.*)\), RSI (.*), MACD hist (positive|negative), ADX (.*) \((.*)\), vs SMA200\. ATR\(14\) = (.*)\.$/,(m,t)=>`الإشارات (+1/-1/0): درجة الاتجاه ${m[1]} (${t(m[2])}), RSI ${m[3]}، هستوجرام الماكد ${m[4]==='positive'?'موجب':'سالب'}، ADX ${m[5]} (${t(m[6])})، مقابل SMA200. ATR(14) = ${m[7]}.`],
 [/^\(weak trend\)$/,()=>'(اتجاه ضعيف)'],
 [/^Trigger: daily close (above|below) (.*) \(nearest swing (resistance|support), (.*) ATR away\)\.$/,(m)=>`نقطة الانطلاق: إغلاق يومي ${m[1]==='above'?'فوق':'تحت'} ${m[2]} (أقرب ${m[3]==='resistance'?'مقاومة':'دعم'} تأرجحي، على بُعد ${m[4]} ATR).`],
 [/^Price stays between (.*) and (.*); mean-reversion trades only make sense while both hold\. Range width (.*) ATR\.$/,(m)=>`يبقى السعر بين ${m[1]} و${m[2]}؛ صفقات الارتداد للمتوسط منطقية طالما صمد الحدان. عرض النطاق ${m[3]} ATR.`],
 [/^Vol ([\d.,]+[KMB]?)$/,(m)=>`الحجم ${m[1]}`],
 [/^market state: (\w+) · delayed$/,(m)=>`حالة السوق: ${({CLOSED:'مغلق',REGULAR:'مفتوح',PRE:'ما قبل الافتتاح',POST:'ما بعد الإغلاق'})[m[1]]||m[1]} · متأخر`],
 [/^(.+ · .+)$/,(m,t)=>{const p=m[1].split(' · ');const o=p.map(x=>D.hasOwnProperty(x)?D[x]:x);return o.some((x,i)=>x!==p[i])?o.join(' · '):null}],
 [/^(\d+)\/(\d+) checks passed$/,(m)=>`نجح ${m[1]} من ${m[2]} فحصاً`],
 [/^page (\d+)\/(\d+)$/,(m)=>`صفحة ${m[1]}/${m[2]}`],
 [/^(\d+) headlines\. Source: Google News RSS \(unofficial\), fetched (.*)\. Headlines only: no article text, no sentiment, not a licensed news feed\.$/,(m)=>`${m[1]} عنواناً. المصدر: Google News RSS (غير رسمي)، جُلب ${AP(m[2])}. عناوين فقط: بلا نص المقال ولا تحليل مشاعر وليست خدمة أخبار مرخصة. تظهر العناوين بلغة مصدرها الأصلية.`],
 [/^(.+?) \| ([A-Z][a-z]{2}) (\d{1,2}), (\d{1,2}:\d{2} [AP]M) \((\d+) (h|d|min) ago\)(?: \| also mentions (.*))?$/,(m)=>`${m[1]} | ${MON[m[2]]||m[2]} ${m[3]}، ${AP(m[4])} (قبل ${m[5]} ${({h:'س',d:'يوم',min:'د'})[m[6]]})${m[7]?' | يذكر أيضاً '+m[7]:''}`],
 [/^(.+) · (\d+\/\d+\/\d{4}), (\d+:\d+:\d+ [AP]M)$/,(m)=>`${m[1]} · ${m[2]}، ${AP(m[3])}`],
 [/^Source: Yahoo Finance, (.*)$/,(m,t)=>`المصدر: ياهو فاينانس، ${t(m[1])}`],
 [/^(.*): last bar (.*), price (.*), (\d+) bars$/,(m)=>`${m[1]}: آخر شمعة ${m[2]}، السعر ${m[3]}، ${m[4]} شمعة`],
 [/^(.*): (\d+) contracts with data \((\d+) listed months returned nothing from Yahoo and are hidden\)\. (.*)$/,(m,t)=>`${t(m[1])}: ${m[2]} عقداً ببيانات (${m[3]} شهراً مدرجاً لم يرجع منها ياهو شيئاً وهي مخفية). ${t(m[4])}`],
 [/^Yahoo Finance per-contract symbols \(unofficial, delayed ~10-15 min\)\. Open interest, official settlement, cash price: not available from a free source\.$/,()=>'رموز العقود الفردية من ياهو فاينانس (غير رسمية، متأخرة 10-15 دقيقة). الفائدة المفتوحة وسعر التسوية الرسمي والسعر الفوري: غير متاحة من مصدر مجاني.'],
 [/^■ (Worst|Best) Return: (.*) \((.*)\)$/,(m)=>`■ ${m[1]==='Worst'?'أسوأ عائد':'أفضل عائد'}: ${m[2]} (${m[3]})`],
 [/^(\d+) of (\d+) rows\. Source: (.*)\. Updated (.*) \((.*) ago\)\.$/,(m)=>`${m[1]} من ${m[2]} صفاً. المصدر: ${m[3]}. تحديث ${AP(m[4])} (منذ ${m[5]}).`],
 [/^Near 52w high \(<2%\): (\d+), near low: (\d+)$/,(m)=>`قرب أعلى 52 أسبوعاً (<2%): ${m[1]}، قرب الأدنى: ${m[2]}`],
 [/^Read: (BULLISH|BEARISH|NEUTRAL)(.*?)\. Confidence: (.*)\.$/,(m,t)=>`القراءة: ${({BULLISH:'ميل صعودي',BEARISH:'ميل هبوطي',NEUTRAL:'محايدة'})[m[1]]}. الثقة: ${t(m[3])}.`],
 [/^(.*?\.) Shape rule on candle geometry, (.*)\. Not a forecast\.$/,(m,t)=>t(m[1])+' '+(X.notes['Shape rule on candle geometry,'])+' '+t(m[2])+'. '+X.notes['Not a forecast.']],
 [/^Screener alert "(.*)": (\d+) new match\(es\): (.*) \((\d+) total\)$/,(m)=>`تنبيه الماسح "${m[1]}": ${m[2]} مطابقة جديدة: ${m[3]} (الإجمالي ${m[4]})`],
 [/^Implied volatility from your market price (.*): (.*)%$/,(m)=>`التذبذب الضمني من سعر السوق ${m[1]}: ${m[2]}%`],
 [/^Based on (\d+) daily outcomes of real Yahoo closes\. Historical VaR understates tail events that did not occur in the sample\.$/,(m)=>`مبني على ${m[1]} نتيجة يومية من إغلاقات ياهو الحقيقية. القيمة المعرضة للخطر التاريخية تقلل من أحداث الذيل التي لم تقع في العينة.`],
 [/^Uses today's quantities on (\d+) past days\. It is not your actual past performance\.$/,(m)=>`يستخدم كميات اليوم على ${m[1]} يوماً ماضياً. وليس أداءك الفعلي السابق.`],
 [/^Computed from Yahoo daily bars, delayed\. Took (\d+)s\.$/,(m)=>`محسوب من شموع ياهو اليومية المتأخرة. استغرق ${m[1]} ثانية.`],
 [/^Correlation matrix \(daily log returns, (\d+) common days\)$/,(m)=>`مصفوفة الارتباط (العوائد اللوغاريتمية اليومية، ${m[1]} يوماً مشتركاً)`],
 [/^Rolling z-score \((\d+) bars\), bands at \+\/-(.*)$/,(m)=>`Z المتحرك (${m[1]} شمعة)، النطاقات عند ±${m[2]}`],
 [/^Invalidated by a close below (.*)\.$/,(m)=>`يُلغى عند إغلاق تحت ${m[1]}.`],
 [/^Invalidated by a close above (.*)\.$/,(m)=>`يُلغى عند إغلاق فوق ${m[1]}.`],
 [/^Measured targets: (.*) \(\+2 ATR from trigger\), (.*) \(\+4 ATR\)\.$/,(m)=>`الأهداف المقاسة: ${m[1]} (+2 ATR من نقطة الانطلاق)، ${m[2]} (+4 ATR).`],
 [/^Measured targets: (.*) \(-2 ATR\), (.*) \(-4 ATR\)\.$/,(m)=>`الأهداف المقاسة: ${m[1]} (-2 ATR)، ${m[2]} (-4 ATR).`],
 [/^Return correlation (.*)\. Hedge ratio beta \(log-log OLS\) (.*), std error (.*)\.$/,(m)=>`ارتباط العوائد ${m[1]}. نسبة التحوط بيتا (انحدار لوغاريتمي) ${m[2]}، الخطأ المعياري ${m[3]}.`],
 [/^Not enough overlapping history \((\d+) common days; need 60\+\)\. A symbol may have no Yahoo data\.$/,(m)=>`لا يوجد تاريخ متداخل كافٍ (${m[1]} يوماً مشتركاً؛ يلزم 60 أو أكثر). قد لا تتوفر لرمز ما بيانات من ياهو.`],
 [/^Dry run \(no trade\): bar (.*), entry (.*), exit (.*), price (.*)$/,(m)=>`تشغيل تجريبي (بلا صفقة): الشمعة ${m[1]}، الدخول ${m[2]}، الخروج ${m[3]}، السعر ${m[4]}`],
 [/^All markets ([+-]?\d+)%$/,(m)=>`كل الأسواق ${m[1]}%`],
 [/^(\d+) (algorithms|presets)$/,(m)=>m[2]==='presets'?`${m[1]} إعداداً جاهزاً`:`${m[1]} خوارزمية`],
 [/^Indicators \((\d+): (\d+) algorithms \+ (\d+) presets\)$/,(m)=>`المؤشرات (${m[1]}: ${m[2]} خوارزمية + ${m[3]} إعداداً جاهزاً)`],
 [/^(.*) added$/,(m,t)=>`تمت إضافة ${t(m[1])}`],
 [/^(\d+) match(?:es)?(?: \(showing first (\d+), type to narrow\))?( \(search includes presets\))?$/,(m)=>`${m[1]} نتيجة`+(m[2]?` (عرض أول ${m[2]}، اكتب لتضييق البحث)`:'')+(m[3]?' (يشمل البحث الإعدادات الجاهزة)':'')],
 [/^preset · (.*)$/,(m,t)=>`إعداد جاهز · ${t(m[1])}`],
 [/^on price$/,()=>'على السعر'],[/^own pane$/,()=>'في لوحة مستقلة'],
 [/^(\d+) charts?$/,(m)=>m[1]==='1'?'رسم واحد':`${m[1]} رسوم`],
 [/^(.*?) \((.*), (\d+) traded today with data\)$/,(m,t)=>`${t(m[1])} (${t(m[2])}، ${m[3]} متداولاً اليوم ببيانات)`],
 [/^Updated (.*)$/,(m,t)=>`تحديث ${t(m[1])}`],
 [/^(.{8,}?) (\[[^\]]*\])$/,(m,t)=>{const a=t(m[1]);return a!==m[1]?a+' '+m[2]:null}],
];
const NOTE_PREFIX_OK=1;
function trCore(s,depth){
 if(D.hasOwnProperty(s))return D[s];
 for(const [re,f] of RULES){const m=s.match(re);if(m){try{const r=f(m,x=>tr(x,depth+1));if(r)return r}catch(e){}}}
 // trailing parenthesised parameters, e.g. "EMA (20)"
 let m=s.match(/^(.*?)\s+(\([^()]*\))$/);if(m&&hasLetters(m[1])&&D.hasOwnProperty(m[1]))return D[m[1]]+' '+m[2];
 // "<label> <number>" style, e.g. "Volume 24h"
 m=s.match(/^(.*?)\s*[:：]\s*$/);if(m&&D.hasOwnProperty(m[1]))return D[m[1]]+':';
 if(depth<3){
  if(!prefixBuilt)buildPrefixes();
  for(const p of PREFIX){if(s.length>p.length&&s.startsWith(p)){const rest=s.slice(p.length);return D[p]+(hasLetters(rest)?trCore(rest,depth+1):rest)}}
  if(s.length>60||/ \| /.test(s)){const parts=s.split(/((?<=\.) | \| )/);if(parts.length>1){let ch=0;const o=parts.map((x,i)=>{if(i%2)return x;const y=trCore(x,depth+1);if(y!==x)ch++;return y});if(ch)return o.join('')}}
  // "A / B" and "A, B" joins of known words
  if(/ \/ | \+ |, /.test(s)){const sep=s.match(/ \/ | \+ |, /)[0];const parts=s.split(sep);if(parts.length>1&&parts.every(x=>!hasLetters(x)||D.hasOwnProperty(x.trim()))){return parts.map(x=>D.hasOwnProperty(x.trim())?D[x.trim()]:x).join(sep==', '?'، ':sep)}}
 }
 return s;
}
const cache=new Map();
function tr(s,depth=0){
 if(LANG!=='ar'||!s||typeof s!=='string'||!hasLetters(s))return s;
 const t=s.trim();if(!t)return s;
 if(depth===0&&cache.has(t)){const c=cache.get(t);return s.startsWith(' ')||s.endsWith(' ')?(s.match(/^\s*/)[0]+c+s.match(/\s*$/)[0]):c}
 let r=trCore(t,depth);
 if(r===t&&/\s$/.test(s)&&D.hasOwnProperty(s))r=D[s];
 if(depth===0)cache.set(t,r);
 return r===t?s:(s.match(/^\s*/)[0]+r+s.match(/\s*$/)[0]);
}
// ---- DOM ----
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','CODE','PRE','CANVAS','SVG','NOSCRIPT']);
const ATTRS=['title','placeholder','aria-label','alt'];
function skipEl(e){return !e||SKIP.has(e.tagName)||(e.closest&&e.closest('[data-noi18n],.noi18n'))}
function doText(n){const p=n.parentNode;if(skipEl(p))return;const d=n.data;let rec=n.__i18n;
 if(rec&&d===rec.ar){if(LANG==='ar')return;n.data=rec.en;n.__i18n=null;return}
 if(rec&&d!==rec.ar)rec=null;           // app changed the text: new original
 if(LANG!=='ar'){n.__i18n=null;return}
 if(!hasLetters(d))return;const a=tr(d);if(a!==d){n.__i18n={en:d,ar:a};n.data=a}}
function doEl(e){if(skipEl(e))return;for(const a of ATTRS){if(!e.hasAttribute||!e.hasAttribute(a))continue;const v=e.getAttribute(a);const st=e.__i18na||(e.__i18na={});const r=st[a];
  if(r&&v===r.ar){if(LANG!=='ar'){e.setAttribute(a,r.en);st[a]=null}continue}
  if(LANG!=='ar'){st[a]=null;continue}
  const x=tr(v);if(x!==v){st[a]={en:v,ar:x};e.setAttribute(a,x)}}
 if(e.tagName==='INPUT'&&(e.type==='button'||e.type==='submit')){}
}
function walk(root){if(!root)return;if(root.nodeType===3){doText(root);return}if(root.nodeType!==1)return;if(skipEl(root))return;doEl(root);
 const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n=w.nextNode();while(n){if(n.nodeType===3)doText(n);else if(skipEl(n)){/* children still visited by walker; text check handles */}else doEl(n);n=w.nextNode()}}
let obs=null,pending=new Set(),raf=0;
function flush(){raf=0;const items=[...pending];pending.clear();obs&&obs.disconnect();items.forEach(n=>{if(n.isConnected!==false)walk(n)});start()}
function start(){obs&&obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS})}
function init(){obs=new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')m.addedNodes.forEach(n=>pending.add(n));else if(m.type==='characterData')pending.add(m.target);else pending.add(m.target)}if(LANG==='ar'||document.querySelector('[data-i18n-on]')){if(!raf)raf=requestAnimationFrame(flush)}});start()}
function applyDoc(){const h=document.documentElement;h.lang=LANG;h.dir=LANG==='ar'?'rtl':'ltr';h.classList.toggle('ar',LANG==='ar');
 const t=document.querySelector('title');
 cache.clear();obs&&obs.disconnect();walk(document.body);start();
 document.querySelectorAll('[data-langbtn]').forEach(b=>b.textContent=LANG==='ar'?'EN':'عربي');
 window.dispatchEvent(new CustomEvent('gct-lang',{detail:LANG}))}
function setLang(l,persist){if(l!=='ar'&&l!=='en')return;LANG=l;if(persist!==false){try{localStorage.setItem('suite_lang',l)}catch(e){}}applyDoc()}
// native dialogs
const _a=window.alert,_c=window.confirm,_p=window.prompt;
window.alert=m=>_a.call(window,tr(String(m)));window.confirm=m=>_c.call(window,tr(String(m)));window.prompt=(m,d)=>_p.call(window,tr(String(m)),d);
window.addEventListener('storage',e=>{if(KEYS.includes(e.key)&&(e.newValue==='ar'||e.newValue==='en')&&e.newValue!==LANG)setLang(e.newValue,false)});
window.addEventListener('suite-lang',e=>{const l=e.detail&&e.detail.lang||e.detail;if(l==='ar'||l==='en')setLang(l,false)});
window.I18N={tr,get lang(){return LANG},set:setLang,toggle:()=>setLang(LANG==='ar'?'en':'ar'),refresh:()=>applyDoc(),dict:D,missing(){const out=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(skipEl(n.parentNode))continue;const t=n.data.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!/[\u0600-\u06FF]/.test(t)&&!/^[A-Z0-9.=\-^\/:+% ]{1,14}$/.test(t)&&!/^[\d.,+\-%$ ]*[KMBT]?$/.test(t))out.add(t)}return [...out]}};
function boot(){mergeInd();init();if(LANG==='ar')applyDoc();else{document.documentElement.lang='en'}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
