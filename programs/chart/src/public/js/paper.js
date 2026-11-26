// Paper trading: SIMULATED account. Fills use the last delayed Yahoo price; nothing is sent to any broker or exchange.
const PAPER={
 get(){return Store.get('paper',null)||PAPER.fresh(100000)},
 fresh(cap){return {start:cap,cash:cap,pos:{},orders:[],fills:[],closed:[],eq:[],fee:2.5,slip:0}},
 save(a){Store.set('paper',a)},
 async price(s){const r=await Data.get(s,'1D');return {px:r.meta.price??r.bars[r.bars.length-1].close,t:r.bars[r.bars.length-1].time}},
 fill(A,sym,side,qty,px,why){const dir=side==='Buy'?1:-1,mult=MULT[sym]||1,slip=px*(A.slip/100)*dir,p=px+slip,fee=A.fee*qty;let pos=A.pos[sym]||{q:0,avg:0,mult};let rem=qty;
  A.cash-=fee;
  if(pos.q!==0&&Math.sign(pos.q)!==dir){const c=Math.min(rem,Math.abs(pos.q)),pnl=Math.sign(pos.q)*(p-pos.avg)*c*mult;A.cash+=pnl;A.closed.push({id:uid(),sym,dir:pos.q>0?'Long':'Short',qty:c,entry:pos.avg,exit:p,mult,fees:fee*c/qty,d1:new Date().toISOString().slice(0,10),strat:'paper',tags:''});pos.q+=dir*c;rem-=c;if(pos.q===0)pos.avg=0}
  if(rem>0){pos.avg=(Math.abs(pos.q)*pos.avg+rem*p)/(Math.abs(pos.q)+rem);pos.q+=dir*rem}
  pos.mult=mult;if(pos.q===0)delete A.pos[sym];else A.pos[sym]=pos;A.fills.push({t:Date.now(),sym,side,qty,px:p,why:why||'',fee});A.fills=A.fills.slice(-200)},
 async tick(){const A=PAPER.get();const syms=[...new Set([...A.orders.filter(o=>o.active!==false).map(o=>o.sym),...Object.keys(A.pos)])];const P={};await Promise.all(syms.map(async s=>{try{P[s]=(await PAPER.price(s)).px}catch(e){}}));
  const now=Date.now();let ch=true,n=0;while(ch&&n++<10){ch=false;for(const o of A.orders.slice()){if(o.active===false||!P[o.sym])continue;if(o.exp&&now>o.exp){A.orders=A.orders.filter(x=>x!==o);ch=true;continue}const px=P[o.sym],b=o.side==='Buy';let trig=false;
    if(o.type==='market')trig=true;else if(o.type==='limit')trig=b?px<=o.limit:px>=o.limit;else if(o.type==='stop')trig=b?px>=o.stop:px<=o.stop;else if(o.type==='stoplimit'){if(!o.hit&&(b?px>=o.stop:px<=o.stop))o.hit=true;trig=o.hit&&(b?px<=o.limit:px>=o.limit)}
    if(trig){const fp=o.type==='limit'||o.type==='stoplimit'?(b?Math.min(px,o.limit):Math.max(px,o.limit)):px;PAPER.fill(A,o.sym,o.side,o.qty,fp,o.type);A.orders=A.orders.filter(x=>x!==o);if(o.oco)A.orders=A.orders.filter(x=>x.oco!==o.oco);(o.kids||[]).forEach(k=>{k.active=true;A.orders.push(k)});ch=true}}}
  const eq=A.cash+Object.entries(A.pos).reduce((a,[s,p])=>a+(P[s]!=null?(P[s]-p.avg)*p.q*p.mult:0),0);const last=A.eq[A.eq.length-1];if(!last||now-last.t>5*60000||Math.abs(last.v-eq)>1)A.eq.push({t:now,v:eq});A.eq=A.eq.slice(-2000);PAPER.save(A);return {A,P,eq}},
 order(A,o){A.orders.push(o)}
};
