const FR=a=>'https://www.federalregister.gov/api/v1/documents.rss?conditions%5Bagencies%5D%5B%5D='+a;
const FEEDS=[
 {org:'wto',name:'WTO Latest news',type:'Official',url:'https://www.wto.org/library/rss/latest_news_e.xml'},
 {org:'icc',name:'ICC (International Chamber of Commerce)',type:'Official',url:'https://iccwbo.org/feed/'},
 {org:'dgagri',name:'European Commission, Agriculture and Rural Development newsroom',type:'Official',url:'https://ec.europa.eu/newsroom/agri/feed'},
 {org:'ec',name:'European Commission press corner',type:'Official',url:'https://ec.europa.eu/commission/presscorner/api/rss?language=en',filter:1},
 {org:'aphis',name:'US Federal Register: USDA APHIS',type:'Official (US Federal Register)',url:FR('animal-and-plant-health-inspection-service'),filter:1},
 {org:'ams',name:'US Federal Register: USDA AMS',type:'Official (US Federal Register)',url:FR('agricultural-marketing-service'),filter:1},
 {org:'fda',name:'US Federal Register: FDA',type:'Official (US Federal Register)',url:FR('food-and-drug-administration'),filter:1},
 {org:'ita',name:'US Federal Register: International Trade Administration',type:'Official (US Federal Register)',url:FR('international-trade-administration'),filter:2}];
const KW=/\b(grain|wheat|corn|maize|soybeans?|rice|barley|oilseeds?|sunflower|agricultur\w*|agri-food|phytosanitary|fumigat\w*|tariffs?|quotas?|sanctions?|customs|food safety|pesticides?|plant pests?|fertili[sz]er|import tolerances?|export controls?|trade defen[cs]e|safeguard|dispute|trade)\b/i;
const KW2=/\b(grain|wheat|corn|soybeans?|rice|barley|agricultur\w*|tariff|quota|export|trade (agreement|barrier|mission))\b/i;
const dec=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const tag=(x,t)=>{const m=x.match(new RegExp('<'+t+'[^>]*>([\\s\\S]*?)</'+t+'>'));return m?dec(m[1]):''};
async function load(f){try{const r=await fetch(f.url,{headers:{'user-agent':'Mozilla/5.0 (compatible; TradeInstitutionsBot/1.0)'},signal:AbortSignal.timeout(9000)});if(!r.ok)return{f,err:r.status,items:[]};const x=await r.text();
 let items=(x.match(/<item[\s>][\s\S]*?<\/item>/g)||[]).map(i=>({title:tag(i,'title'),link:tag(i,'link')||tag(i,'guid'),date:tag(i,'pubDate')||tag(i,'dc:date'),sum:tag(i,'description').slice(0,260)}));
 if(f.filter)items=items.filter(i=>f.filter===2?KW2.test(i.title):KW.test(i.title));
 items=items.filter(i=>i.title&&/^https?:/.test(i.link)).slice(0,f.filter?6:8);
 return{f,items:items.map(i=>({...i,ts:Date.parse(i.date)||0,org:f.org,src:f.name,stype:f.type}))}}catch(e){return{f,err:String(e.message||e),items:[]}}}
module.exports=async(req,res)=>{const out=await Promise.all(FEEDS.map(load));const all=out.flatMap(o=>o.items).sort((a,b)=>b.ts-a.ts).slice(0,60);
 res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=3600');res.setHeader('Access-Control-Allow-Origin','*');
 res.status(200).json({fetched:new Date().toISOString(),feeds:out.map(o=>({name:o.f.name,url:o.f.url,ok:!o.err,count:o.items.length,err:o.err||null})),items:all})};
