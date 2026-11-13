import {PORT_BY_ID,GOODS} from './data.js?v=2026.11.13-canal-routes';
import {regionalFactor} from './regional-economy.js?v=2026.11.13-canal-routes';
export const PREMIUM_STOCK_LIMIT=30,STOCK_PERIOD=7200000,MARKET_VERSION=3;
// Version boundary is a fixed release epoch, never reset by a page reload.
export const MARKET_V2_AT=1794293996252;
export const PRESSURE_SCALE=4000000,PRESSURE_BOX=4000,PRESSURE_LIMIT=1200000;
export function pressureAt(item={},now,mode){
 const decay=Math.max(0,Math.floor(now-(item.at??now)));
 const legacy=item.pressure||0;
 const buy=item.pressureVersion===3?item.buyPressure||0:Math.max(0,legacy);
 const sell=item.pressureVersion===3?item.sellPressure||0:Math.min(0,legacy);
 const upward=Math.max(0,buy-decay),downward=Math.min(0,sell+decay);
 return mode==='buy'?upward:mode==='sell'?downward:upward+downward;
}
export function stockState(item={},now){if(item.stock===undefined)return {stock:PREMIUM_STOCK_LIMIT,stockAt:now};let stock=item.stock,at=item.stockAt??now;if(item.stockVersion!==2&&now>=MARKET_V2_AT){const boundary=Math.max(at,MARKET_V2_AT),steps=Math.max(0,Math.floor((boundary-at)/STOCK_PERIOD));stock=Math.min(10,stock+steps);at=stock>=10?boundary:at+steps*STOCK_PERIOD;}const cap=item.stockVersion===2||now>=MARKET_V2_AT?PREMIUM_STOCK_LIMIT:10,steps=Math.max(0,Math.floor((now-at)/STOCK_PERIOD));stock=Math.min(cap,stock+steps);return {stock,stockAt:stock>=cap?now:at+steps*STOCK_PERIOD};}
export function stockAt(item,good,now){return good.premium?stockState(item,now).stock:Infinity;}
export function basePrice(portId,goodId,now){const p=PORT_BY_ID[portId],g=GOODS[goodId];if(!p||!g)throw Error('항구와 상품을 확인하세요.');const factor=regionalFactor(p,goodId,g);
 const phase=(p.pricePhase||0)*2+Object.keys(GOODS).indexOf(goodId);return g.base*factor*(1+.045*Math.sin(now/86400000*2*Math.PI+phase));}
export function tradeQuote(portId,goodId,qty,mode,item={},now=Date.now(),taxRate=0){if(!Number.isInteger(qty)||qty<1||qty>1000||!['buy','sell'].includes(mode))throw Error('거래 수량을 확인하세요.');const g=GOODS[goodId],base=basePrice(portId,goodId,now),start=pressureAt(item,now,mode),clamp=n=>Math.max(-PRESSURE_LIMIT,Math.min(PRESSURE_LIMIT,n)),unit=p=>mode==='buy'?Math.max(1,Math.ceil(base*(1+p/PRESSURE_SCALE))):Math.max(0,Math.floor(base*(1+p/PRESSURE_SCALE)*.88));
 const gross=unit(start)*qty,end=clamp(start+(mode==='buy'?1:-1)*qty*PRESSURE_BOX),tax=Math.floor(gross*Math.max(0,Math.min(10,taxRate))/100),stock=stockAt(item,g,now);
 if(mode==='buy'&&g.premium&&qty>stock)throw Error('한정 상품 재고가 부족해요.');const refilledAt=g.premium?stockState(item,now).stockAt:now;
 return {portId,goodId,qty,mode,at:now,revision:item.revision||0,unit:unit(start),gross,tax,total:mode==='buy'?gross+tax:gross-tax,average:gross/qty,afterUnit:unit(end),pressure:start,next:{pressureVersion:3,buyPressure:mode==='buy'?end:pressureAt(item,now,'buy'),sellPressure:mode==='sell'?end:pressureAt(item,now,'sell'),at:now,...(g.premium?{stock:stock-(mode==='buy'?qty:0),stockAt:refilledAt,stockVersion:2}:{})}};
}
