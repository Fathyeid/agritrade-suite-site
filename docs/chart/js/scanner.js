// Market scanner: runs a GCT-script condition over every symbol in the catalog on daily bars (free delayed Yahoo data).
const SCAN_PRESETS={
 'RSI oversold (<30)':'rsi(close,14) < 30',
 'Oversold in uptrend (RSI<30, above SMA200)':'rsi(close,14) < 30 and close > sma(close,200)',
 'Above SMA200 + volume 50% over 20d avg':'close > sma(close,200) and volume > 1.5 * sma(volume,20)',
 'Golden cross (SMA50 over SMA200) today':'crossover(sma(close,50), sma(close,200))',
 'EMA 12/26 bullish cross':'crossover(ema(close,12), ema(close,26))',
 'MACD bullish cross':'crossover(macd(12,26), macdsig(12,26,9))',
 'Close above upper Bollinger':'close > bbup(20,2)','Close below lower Bollinger':'close < blo_dummy',
 'New 52-week high':'close >= highest(high,252)','New 52-week low':'close <= lowest(low,252)',
 'High volatility (ATR% > 3)':'atr(14)/close*100 > 3',
 'Unusual volume (2x avg)':'volume > 2 * sma(volume,20)','Strong trend (ADX>25)':'adx(14) > 25',
 'Daily move > 3%':'abs(close/ref(close,1)-1)*100 > 3'};
SCAN_PRESETS['Close below lower Bollinger']='close < bblo(20,2)';delete SCAN_PRESETS['Close below lower Bollinger '];delete SCAN_PRESETS['Close below lower Bollinger'];SCAN_PRESETS['Close below lower Bollinger']='close < bblo(20,2)';
async function scanRun(expr,syms,onRow,onProg,stop){
 const node=BT.parse(expr);let done=0,err=0;const q=[...syms];
 const work=async()=>{while(q.length&&!stop.v){const [s,n]=q.shift();try{const r=await Data.get(s,'1D'),d=r.bars;if(d.length<30)throw new Error('short');const cache=new Map(),res=BT.ev(node,d,cache),L=d.length-1,ok=typeof res==='number'?!!res:!!res[L];
   if(ok){const c=d.map(b=>b.close),rs=M.rsi(c,14)[L],va=M.sma(d.map(b=>b.volume),20)[L];onRow({s,n,last:c[L],chg:L?(c[L]/c[L-1]-1)*100:0,rsi:rs,vr:va?d[L].volume/va:null,date:d[L].time})}}catch(e){err++}
  done++;onProg(done,syms.length,err)}};
 await Promise.all([work(),work(),work(),work()]);return err}
