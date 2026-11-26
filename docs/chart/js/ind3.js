// Candlestick pattern detectors + preset catalogue. Patterns are shape rules on the loaded bars (documented below); presets reuse the same
// tested algorithms with fixed parameters so they are one click away. Nothing here is a placeholder: each entry runs the real calculation.
const CP='Candlestick Patterns';
const bd=b=>Math.abs(b.close-b.open),rg=b=>b.high-b.low,upw=b=>b.high-Math.max(b.open,b.close),low_=b=>Math.min(b.open,b.close)-b.low,grn=b=>b.close>b.open,red=b=>b.close<b.open;
const dtr=(d,i,k)=>i-1-k>=0&&d[i-1].close<d[i-1-k].close,utr=(d,i,k)=>i-1-k>=0&&d[i-1].close>d[i-1-k].close;
const PCOL=(v)=>v>0?'#26a69a':v<0?'#ef5350':'#5d6b7a';
function pat(key,name,lb,test,neutral,note){reg(key,name,CP,false,[P('k','Trend look-back bars',3)],(d,p)=>{const o=d.map((b,i)=>i<lb||!rg(b)?0:(test(d,i,p.k)||0));
 return {lines:[L(name,o,{t:'hist',colorFn:neutral?(i,v)=>v?'#ffeb3b':'#5d6b7a':(i,v)=>PCOL(v)})],levels:[0],note:(neutral?'1 = pattern present (neutral candle).':'+1 bullish, -1 bearish, 0 none.')+' Shape rule on candle geometry, '+(note||'trend context uses the close vs k bars earlier')+'. Not a forecast.'}})}
pat('p_doji','Doji',0,(d,i)=>bd(d[i])<=0.1*rg(d[i])?1:0,true,'body at most 10% of range');
pat('p_ldoji','Long-Legged Doji',0,(d,i)=>{const b=d[i];return bd(b)<=0.1*rg(b)&&upw(b)>=0.3*rg(b)&&low_(b)>=0.3*rg(b)?1:0},true,'tiny body, both wicks at least 30% of range');
pat('p_dragon','Dragonfly Doji',0,(d,i)=>{const b=d[i];return bd(b)<=0.1*rg(b)&&upw(b)<=0.1*rg(b)&&low_(b)>=0.6*rg(b)?1:0},true,'tiny body at the top, long lower wick');
pat('p_grave','Gravestone Doji',0,(d,i)=>{const b=d[i];return bd(b)<=0.1*rg(b)&&low_(b)<=0.1*rg(b)&&upw(b)>=0.6*rg(b)?1:0},true,'tiny body at the bottom, long upper wick');
pat('p_spin','Spinning Top',0,(d,i)=>{const b=d[i];return bd(b)>0.1*rg(b)&&bd(b)<=0.3*rg(b)&&upw(b)>=bd(b)&&low_(b)>=bd(b)?1:0},true,'small body with wicks longer than the body');
pat('p_maru','Marubozu',0,(d,i)=>{const b=d[i];return bd(b)>=0.95*rg(b)?(grn(b)?1:-1):0},false,'body at least 95% of range');
pat('p_hammer','Hammer',1,(d,i,k)=>{const b=d[i];return bd(b)>0&&low_(b)>=2*bd(b)&&upw(b)<=0.1*rg(b)&&dtr(d,i,k)?1:0},false,'after a decline');
pat('p_hang','Hanging Man',1,(d,i,k)=>{const b=d[i];return bd(b)>0&&low_(b)>=2*bd(b)&&upw(b)<=0.1*rg(b)&&utr(d,i,k)?-1:0},false,'after a rise');
pat('p_shoot','Shooting Star',1,(d,i,k)=>{const b=d[i];return bd(b)>0&&upw(b)>=2*bd(b)&&low_(b)<=0.1*rg(b)&&utr(d,i,k)?-1:0},false,'after a rise');
pat('p_invh','Inverted Hammer',1,(d,i,k)=>{const b=d[i];return bd(b)>0&&upw(b)>=2*bd(b)&&low_(b)<=0.1*rg(b)&&dtr(d,i,k)?1:0},false,'after a decline');
pat('p_engulf','Engulfing (bull/bear)',1,(d,i)=>{const a=d[i-1],b=d[i];if(red(a)&&grn(b)&&b.open<=a.close&&b.close>=a.open&&bd(b)>bd(a))return 1;if(grn(a)&&red(b)&&b.open>=a.close&&b.close<=a.open&&bd(b)>bd(a))return -1;return 0},false,'second body covers the first body');
pat('p_harami','Harami (bull/bear)',1,(d,i)=>{const a=d[i-1],b=d[i];if(red(a)&&grn(b)&&b.open>=a.close&&b.close<=a.open&&bd(b)<bd(a))return 1;if(grn(a)&&red(b)&&b.open<=a.close&&b.close>=a.open&&bd(b)<bd(a))return -1;return 0},false,'second body inside the first body');
pat('p_haramic','Harami Cross (bull/bear)',1,(d,i)=>{const a=d[i-1],b=d[i];if(bd(b)>0.1*rg(b))return 0;const t=Math.max(a.open,a.close),l=Math.min(a.open,a.close);if(Math.max(b.open,b.close)<=t&&Math.min(b.open,b.close)>=l&&bd(a)>=0.5*rg(a))return red(a)?1:-1;return 0},false,'doji inside a long body');
pat('p_pierce','Piercing Line',1,(d,i)=>{const a=d[i-1],b=d[i];return red(a)&&grn(b)&&b.open<a.close&&b.close>(a.open+a.close)/2&&b.close<a.open?1:0},false,'closes above the middle of the prior red body');
pat('p_dark','Dark Cloud Cover',1,(d,i)=>{const a=d[i-1],b=d[i];return grn(a)&&red(b)&&b.open>a.close&&b.close<(a.open+a.close)/2&&b.close>a.open?-1:0},false,'closes below the middle of the prior green body');
pat('p_tweez','Tweezer Top/Bottom',1,(d,i,k)=>{const a=d[i-1],b=d[i],tol=0.05*Math.max(rg(a),rg(b));if(grn(a)&&red(b)&&Math.abs(a.high-b.high)<=tol&&utr(d,i,k))return -1;if(red(a)&&grn(b)&&Math.abs(a.low-b.low)<=tol&&dtr(d,i,k))return 1;return 0},false,'equal highs/lows within 5% of range');
pat('p_morn','Morning Star',2,(d,i)=>{const a=d[i-2],m=d[i-1],b=d[i];return red(a)&&bd(a)>=0.5*rg(a)&&bd(m)<=0.3*rg(m)&&grn(b)&&b.close>(a.open+a.close)/2?1:0},false,'3 bars, no gap needed for futures');
pat('p_eve','Evening Star',2,(d,i)=>{const a=d[i-2],m=d[i-1],b=d[i];return grn(a)&&bd(a)>=0.5*rg(a)&&bd(m)<=0.3*rg(m)&&red(b)&&b.close<(a.open+a.close)/2?-1:0},false,'3 bars, no gap needed for futures');
pat('p_3ws','Three White Soldiers',2,(d,i)=>{const a=d[i-2],b=d[i-1],c=d[i];return [a,b,c].every(x=>grn(x)&&bd(x)>=0.5*rg(x))&&b.close>a.close&&c.close>b.close&&b.open>=a.open&&b.open<=a.close&&c.open>=b.open&&c.open<=b.close?1:0},false,'3 strong green bars, each opening inside the last body');
pat('p_3bc','Three Black Crows',2,(d,i)=>{const a=d[i-2],b=d[i-1],c=d[i];return [a,b,c].every(x=>red(x)&&bd(x)>=0.5*rg(x))&&b.close<a.close&&c.close<b.close&&b.open<=a.open&&b.open>=a.close&&c.open<=b.open&&c.open>=b.close?-1:0},false,'3 strong red bars, each opening inside the last body');
pat('p_3in','Three Inside Up/Down',2,(d,i)=>{const a=d[i-2],m=d[i-1],b=d[i];if(red(a)&&grn(m)&&m.open>=a.close&&m.close<=a.open&&grn(b)&&b.close>a.open)return 1;if(grn(a)&&red(m)&&m.open<=a.close&&m.close>=a.open&&red(b)&&b.close<a.open)return -1;return 0},false,'harami confirmed by a third bar');
pat('p_belt','Belt Hold (bull/bear)',1,(d,i,k)=>{const b=d[i];if(grn(b)&&low_(b)<=0.05*rg(b)&&bd(b)>=0.7*rg(b)&&dtr(d,i,k))return 1;if(red(b)&&upw(b)<=0.05*rg(b)&&bd(b)>=0.7*rg(b)&&utr(d,i,k))return -1;return 0},false,'opens at the extreme, body at least 70% of range');
pat('p_kick','Kicker (bull/bear)',1,(d,i)=>{const a=d[i-1],b=d[i];if(red(a)&&grn(b)&&b.open>=a.open&&bd(a)>=0.7*rg(a)&&bd(b)>=0.7*rg(b))return 1;if(grn(a)&&red(b)&&b.open<=a.open&&bd(a)>=0.7*rg(a)&&bd(b)>=0.7*rg(b))return -1;return 0},false,'opens beyond the prior open in the opposite direction');
pat('p_2crow','Two Crows',2,(d,i)=>{const a=d[i-2],m=d[i-1],b=d[i];return grn(a)&&bd(a)>=0.5*rg(a)&&red(m)&&m.close>a.close&&red(b)&&b.open<m.open&&b.open>m.close&&b.close<a.close&&b.close>a.open?-1:0},false,'');
pat('p_riseth','Rising/Falling Three Methods',4,(d,i)=>{const a=d[i-4],m1=d[i-3],m2=d[i-2],m3=d[i-1],b=d[i];const inside=[m1,m2,m3].every(x=>x.high<=a.high&&x.low>=a.low);if(grn(a)&&bd(a)>=0.5*rg(a)&&inside&&[m1,m2,m3].every(red)&&grn(b)&&b.close>a.close)return 1;if(red(a)&&bd(a)>=0.5*rg(a)&&inside&&[m1,m2,m3].every(grn)&&red(b)&&b.close<a.close)return -1;return 0},false,'5 bars');
reg('p_net','Candlestick Pattern Score (net of all bull/bear patterns)',CP,false,[P('k','Trend look-back bars',3)],(d,p)=>{const keys=Object.keys(IND).filter(k=>k.startsWith('p_')&&k!=='p_net'&&!IND[k].pre&&!['p_doji','p_ldoji','p_dragon','p_grave','p_spin'].includes(k));const o=M.fill(d.length).map(()=>0);keys.forEach(k=>{const r=IND[k].calc(d,{k:p.k}).lines[0].v;r.forEach((v,i)=>{if(v)o[i]+=v})});
 return {lines:[L('Net score',o,{t:'hist',colorFn:(i,v)=>PCOL(v)})],levels:[0],note:'Sum of the directional pattern detectors above (neutral doji-type candles excluded). A count of signals, not a prediction.'}});
// ---------- presets ----------
const BASEKEYS=Object.keys(IND).filter(k=>!IND[k].pre);
function preset(base,key,label,over){const b=IND[base];if(!b||IND[key])return;IND[key]={n:label,g:b.g,ov:b.ov,p:b.p.map(x=>over[x.k]!==undefined?{...x,v:over[x.k]}:x),calc:b.calc,pre:true,base}}
const PER=[5,8,9,10,12,13,14,15,20,21,25,26,30,34,40,50,55,60,75,89,100,120,144,150,200,250];
const MAN={sma:'SMA',ema:'EMA',wma:'WMA',hma:'Hull MA',dema:'DEMA',tema:'TEMA',smma:'SMMA',zlema:'ZLEMA',kama:'KAMA',lsma:'LSMA',vwma:'VWMA',tma:'Triangular MA',alma:'ALMA',vidya:'VIDYA',ehma:'EHMA',gma:'Geometric MA',mmed:'Median'};
Object.keys(MAN).forEach(b=>PER.forEach(n=>{if(['alma','kama','vidya'].includes(b)&&n<5)return;preset(b,b+'_'+n,MAN[b]+' '+n,{n})}));
const SM=[5,7,9,10,14,20,21,30,50];
[['rsi','RSI'],['crsi','Cutler RSI'],['rmi','RMI'],['cci','CCI'],['roc','ROC'],['mom','Momentum'],['wr','Williams %R'],['cmo','CMO'],['atr','ATR'],['natr','NATR %'],['sd','StdDev'],['zsc','Z-Score'],['mfi','MFI'],['cmf','CMF'],['adx','ADX/DMI'],['aroon','Aroon'],['aroonosc','Aroon Osc'],['chop','Choppiness'],['efr','Efficiency Ratio'],['lrs','Regression Slope'],['lrr2','Regression R2'],['prk','Percent Rank'],['dpo','DPO'],['fi','Force Index'],['qstick','Qstick'],['dx','DX'],['ulcer','Ulcer Index'],['retn','Return %'],['ddn','Drawdown %'],['trix','TRIX'],['vhf','VHF'],['bop','Balance of Power'],['lsma','LSMA']].forEach(([b,n])=>{if(!IND[b])return;SM.forEach(x=>{if(x<2)return;if(['cci','chop','vhf','lrr2','lrs','efr','prk','zsc','ulcer','dpo','aroon','aroonosc','adx','dx'].includes(b)&&x<5)return;preset(b,b+'_'+x,n+' '+x,{n:x})})});
// two-parameter presets
[[20,1.5],[20,2],[20,2.5],[20,3],[10,2],[14,2],[30,2],[50,2],[50,3],[100,2]].forEach(([n,m])=>{preset('bb','bb_'+n+'_'+m,'Bollinger '+n+' / '+m+'σ',{n,m});preset('bbpb','bbpb_'+n+'_'+m,'Bollinger %B '+n+' / '+m+'σ',{n,m});preset('bbw','bbw_'+n+'_'+m,'Bollinger Bandwidth '+n+' / '+m+'σ',{n,m})});
[[10,1],[10,2],[20,1.5],[20,2],[20,2.5],[20,3],[34,2],[50,2]].forEach(([n,m])=>preset('kc','kc_'+n+'_'+m,'Keltner '+n+' / ATR×'+m,{n,m}));
[5,10,14,20,34,50,55,100,200].forEach(n=>preset('dc','dc_'+n,'Donchian '+n,{n}));
[[7,3],[10,2],[10,3],[14,3],[20,2],[22,3],[10,1.5],[7,2]].forEach(([n,m])=>preset('st','st_'+n+'_'+m,'Supertrend '+n+' / ×'+m,{n,m}));
[[12,26,9],[5,35,5],[8,17,9],[6,13,5],[19,39,9],[10,30,9],[24,52,18],[3,10,16],[21,55,9]].forEach(([f,s,g])=>{preset('macd','macd_'+f+'_'+s+'_'+g,'MACD '+f+'/'+s+'/'+g,{f,s,g});preset('ppo','ppo_'+f+'_'+s+'_'+g,'PPO '+f+'/'+s+'/'+g,{f,s,g})});
[[5,3,3],[9,3,3],[14,3,3],[14,1,3],[21,5,5],[10,1,1],[5,1,3],[20,5,5],[14,3,5],[8,3,3]].forEach(([n,sk,sd])=>preset('stoch','stoch_'+n+'_'+sk+'_'+sd,'Stochastic '+n+','+sk+','+sd+(sk===1?' (fast)':''),{n,sk,sd}));
[[10,1],[14,3],[20,2]].forEach(([n,k])=>preset('smi','smi_'+n+'_'+k,'SMI '+n+','+k,{n,k}));
[[0.01,0.01,0.1],[0.02,0.02,0.2],[0.025,0.025,0.25],[0.03,0.03,0.3],[0.015,0.015,0.15],[0.02,0.02,0.1]].forEach(([st,inc,mx])=>preset('psar','psar_'+st+'_'+mx,'Parabolic SAR '+st+'/'+inc+'/'+mx,{st,inc,mx}));
[9,13,20,26,34,52,65].forEach(a=>preset('ichi','ichi_'+a,'Ichimoku Tenkan '+a,{a}));
[[20,1],[20,2],[20,3],[20,5],[50,2],[50,5],[10,1],[100,3]].forEach(([n,m])=>preset('env','env_'+n+'_'+m,'MA Envelope '+n+' / '+m+'%',{n,pct:m}));
[5,10,30,60,90,120].forEach(n=>preset('hv','hv_'+n,'Historical Volatility '+n,{n}));
[10,20,30,60].forEach(n=>{preset('park','park_'+n,'Parkinson Vol '+n,{n});preset('gk','gk_'+n,'Garman-Klass Vol '+n,{n});preset('rsv','rsv_'+n,'Rogers-Satchell Vol '+n,{n});preset('skew','skew_'+n,'Skewness '+n,{n});preset('kurt','kurt_'+n,'Kurtosis '+n,{n})});
[20,50,100,200].forEach(n=>{preset('dpo2','dpo2_s'+n,'Distance from SMA '+n+' (%)',{n,t:'sma'});preset('dpo2','dpo2_e'+n,'Distance from EMA '+n+' (%)',{n,t:'ema'})});
[[1],[2],[3],[5],[10]].forEach(([lag])=>preset('acorr','acorr_'+lag,'Autocorrelation lag '+lag,{lag}));
[[14,9],[10,5],[20,10]].forEach(([n,m],i)=>preset('rvi2','rvi2_'+i,'Relative Volatility Index '+n,{n,s:m}));
[[7],[10],[20],[50]].forEach(([n])=>preset('nr','nr_'+n,'Narrow Range NR'+n,{n}));
INDKEYS.length=0;Object.keys(IND).forEach(k=>INDKEYS.push(k));
const IND_STATS=(()=>{const all=INDKEYS.length,pre=INDKEYS.filter(k=>IND[k].pre).length;return {total:all,distinct:all-pre,presets:pre}})();
