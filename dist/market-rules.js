import {PORT_BY_ID,GOODS} from './data.js?v=2026.11.10-community-battle';
export const PRESSURE_SCALE=4000000,PRESSURE_BOX=4000,PRESSURE_LIMIT=1200000;
export function pressureAt(item,now){const old=item?.pressure||0,decay=Math.max(0,Math.floor(now-(item?.at??now)));return Math.sign(old)*Math.max(0,Math.abs(old)-decay);}
export function stockAt(item,good,now){if(!good.premium)return Infinity;const base=item?.stock??10,at=item?.stockAt??now,steps=Math.max(0,Math.floor((now-at)/7200000));return Math.min(10,base+steps);}
export function basePrice(portId,goodId,now){const p=PORT_BY_ID[portId],g=GOODS[goodId];if(!p||!g)throw Error('항구와 상품을 확인하세요.');const role=p.economy?.stock?.[goodId],factor=g.premium?(portId===g.source?1:portId===g.destination?1.4:1.12):role?{producer:.72,local:.9,import:1.12}[role]:p.economy?.demand?.includes(goodId)?1.35:.9;
 const phase=(p.pricePhase||0)*2+Object.keys(GOODS).indexOf(goodId);return g.base*factor*(1+.045*Math.sin(now/86400000*2*Math.PI+phase));}
export function tradeQuote(portId,goodId,qty,mode,item={},now=Date.now(),taxRate=0){if(!Number.isInteger(qty)||qty<1||qty>1000||!['buy','sell'].includes(mode))throw Error('거래 수량을 확인하세요.');const g=GOODS[goodId],base=basePrice(portId,goodId,now),start=pressureAt(item,now),clamp=n=>Math.max(-PRESSURE_LIMIT,Math.min(PRESSURE_LIMIT,n)),unit=p=>mode==='buy'?Math.max(1,Math.ceil(base*(1+p/PRESSURE_SCALE))):Math.max(0,Math.floor(base*(1+p/PRESSURE_SCALE)*.88));
 let gross=0;for(let i=0;i<qty;i++)gross+=unit(mode==='buy'?clamp(start+i*PRESSURE_BOX):start);const end=clamp(start+(mode==='buy'?1:-1)*qty*PRESSURE_BOX),tax=Math.floor(gross*Math.max(0,Math.min(10,taxRate))/100),stock=stockAt(item,g,now);
 if(mode==='buy'&&g.premium&&qty>stock)throw Error('한정 상품 재고가 부족해요.');const stockTime=item.stockAt??now,steps=Math.max(0,Math.floor((now-stockTime)/7200000)),refilledAt=stock>=10?now:stockTime+steps*7200000;
 return {portId,goodId,qty,mode,at:now,revision:item.revision||0,unit:unit(start),gross,tax,total:mode==='buy'?gross+tax:gross-tax,average:gross/qty,afterUnit:unit(end),pressure:start,next:{pressure:end,at:now,...(g.premium?{stock:stock-(mode==='buy'?qty:0),stockAt:refilledAt}:{})}};
}
