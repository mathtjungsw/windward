import {GOODS,PORT_BY_ID} from './data.js?v=2026.11.14-harbor-chart';

const HOUR=3600000,DAY=24*HOUR,epoch=Date.UTC(2026,10,16,3);
const agenda=[
 {type:'supply',ports:['lisbon','porto'],good:'wine'},
 {type:'demand',ports:['cape','luanda'],good:'timber'},
 {type:'demand',ports:['venice','marseille'],good:'cacao'},
 {type:'supply',ports:['nagasaki','busan'],good:'silk'}
];
export function regionalEvent(now){
 const cycle=Math.floor((now-epoch+8*HOUR)/(3*DAY));
 if(cycle<0)return null;
 const start=epoch+cycle*3*DAY,end=start+DAY;
 if(now<start-8*HOUR||now>=end)return null;
 return {...agenda[cycle%agenda.length],start,end,active:now>=start};
}
export function tradeEvent(portId,goodId,mode,now){
 const event=regionalEvent(now);
 if(!event?.active||event.good!==goodId||!event.ports.includes(portId)||GOODS[goodId]?.premium)return null;
 if(event.type==='supply'&&(mode!=='buy'||!PORT_BY_ID[portId]?.market.includes(goodId))||event.type==='demand'&&mode!=='sell')return null;
 return event;
}
