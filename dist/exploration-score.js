import {EXPLORATION_MASK as mask} from './exploration-mask.js?v=2026.11.13-stories-harbors-tax.1';
const bits=Uint8Array.from(atob(mask.bits),c=>c.charCodeAt(0));
export const SCORE_VERSION=mask.version;
let total=0;
for(let i=0;i<mask.width*mask.height;i++)if(bits[i>>3]&(1<<(i&7)))total+=mask.rowAreaM2[Math.floor(i/mask.width)];
export const ELIGIBLE_AREA_M2=total;
const cache=new WeakMap();
export function explorationStats(exploration){
 let c=cache.get(exploration);
 if(!c){let area=0;for(let i=0;i<mask.width*mask.height;i++)if((bits[i>>3]&exploration.bits[i>>3])&(1<<(i&7)))area+=mask.rowAreaM2[Math.floor(i/mask.width)];c={area,offset:exploration.newCells?.length||0};cache.set(exploration,c);}
 const added=exploration.newCells||[];
 for(;c.offset<added.length;c.offset++){const i=added[c.offset];if(bits[i>>3]&(1<<(i&7)))c.area+=mask.rowAreaM2[Math.floor(i/mask.width)];}
 const area=Math.min(total,c.area),score=Number(BigInt(Math.round(area))*1000000n/BigInt(total));
 return {explorationScore:score,explorationArea:Math.round(area/1000000),explorationPercent:Math.floor(area/total*10000)/100};
}
