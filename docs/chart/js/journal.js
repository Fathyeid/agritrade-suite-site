// Trade journal: manual trades stored in this browser. Prices/P&L are what the user enters; nothing here is broker data.
const MULT={'ZS=F':50,'ZC=F':50,'ZW=F':50,'KE=F':50,'ZM=F':100,'ZL=F':600,'CL=F':1000,'BZ=F':1000,'NG=F':10000,'GC=F':100,'SI=F':5000,'HG=F':25000,'SB=F':1120,'KC=F':375,'CC=F':10,'CT=F':500,'ES=F':50,'NQ=F':20,'LE=F':400,'HE=F':400};
const JR={
 all(){return Store.get('journal',[])},save(a){Store.set('journal',a)},
 pnl(t){if(t.exit==null||isNaN(t.exit))return null;return (t.dir==='Short'?-1:1)*(t.exit-t.entry)*t.qty*(t.mult||1)-(t.fees||0)},
 risk(t){return t.sl?Math.abs(t.entry-t.sl)*t.qty*(t.mult||1):null},
 stats(ts){const cl=ts.filter(t=>JR.pnl(t)!=null),p=cl.map(JR.pnl),w=p.filter(x=>x>0),l=p.filter(x=>x<=0),gw=w.reduce((a,x)=>a+x,0),gl=-l.reduce((a,x)=>a+x,0);
  const R=cl.map(t=>{const r=JR.risk(t);return r?JR.pnl(t)/r:null}).filter(x=>x!=null);let pk=0,eq=0,dd=0;cl.slice().sort((a,b)=>(a.d1||'').localeCompare(b.d1||'')).forEach(t=>{eq+=JR.pnl(t);pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq)});
  return {n:cl.length,open:ts.length-cl.length,net:p.reduce((a,x)=>a+x,0),win:cl.length?100*w.length/cl.length:0,pf:gl?gw/gl:(gw?Infinity:0),avg:cl.length?p.reduce((a,x)=>a+x,0)/cl.length:0,avgR:R.length?R.reduce((a,x)=>a+x,0)/R.length:null,dd}},
 parseCsv(txt){const rows=txt.trim().split(/\r?\n/).map(l=>l.split(',').map(x=>x.trim()));const h=rows.shift().map(x=>x.toLowerCase());const ix=k=>h.findIndex(x=>k.some(y=>x.includes(y)));const I={s:ix(['symbol','instrument','contract']),d:ix(['side','dir','type','action']),q:ix(['qty','quantity','size','contracts']),e:ix(['entry','open price','buy price','price in']),x:ix(['exit','close price','sell price','price out']),d0:ix(['entry date','open date','date']),d1:ix(['exit date','close date']),f:ix(['fee','commission'])};
  if(I.s<0||I.q<0||I.e<0)throw new Error('CSV needs columns: symbol, side, qty, entry, exit (optional: entry date, exit date, fees)');
  return rows.filter(r=>r[I.s]).map(r=>({id:uid(),sym:r[I.s].toUpperCase(),dir:/sell|short/i.test(r[I.d]||'')?'Short':'Long',qty:+r[I.q],entry:+r[I.e],exit:I.x>=0&&r[I.x]!==''?+r[I.x]:null,d0:I.d0>=0?r[I.d0]:'',d1:I.d1>=0?r[I.d1]:(I.d0>=0?r[I.d0]:''),fees:I.f>=0?+r[I.f]||0:0,mult:MULT[r[I.s].toUpperCase()]||1,tags:'',strat:'imported',notes:'Imported from CSV'}))}
};
