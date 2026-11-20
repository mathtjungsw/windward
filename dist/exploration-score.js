import {landExplorationArea} from './land-exploration.js?v=2026.11.20-inland-overview';
import {LAND_ADDITIONAL_AREA_M2} from './land-exploration-data.js?v=2026.11.20-inland-overview';
import {EXPLORATION_MASK as mask} from './exploration-mask.js?v=2026.11.20-inland-overview';
const bits=Uint8Array.from(atob(mask.bits),c=>c.charCodeAt(0));
export const SCORE_VERSION=mask.version;
let total=0;
for(let i=0;i<mask.width*mask.height;i++)if(bits[i>>3]&(1<<(i&7)))total+=mask.rowAreaM2[Math.floor(i/mask.width)];
export const ELIGIBLE_AREA_M2=total;
const WORLD_CHART_AREA_M2=total+LAND_ADDITIONAL_AREA_M2;
// Keep the legacy score unit so offline and current rows can share the same ordered query.
export const MAX_EXPLORATION_SCORE=Number(BigInt(WORLD_CHART_AREA_M2)*1000000n/BigInt(total));
export const chartPercentFromScore=score=>score>=MAX_EXPLORATION_SCORE?100:Math.round(score*total/WORLD_CHART_AREA_M2)/10000;
const cache=new WeakMap(),landCache=new WeakMap();
export function explorationStats(exploration,inland){
 let c=cache.get(exploration);
 if(!c){let area=0;for(let i=0;i<mask.width*mask.height;i++)if((bits[i>>3]&exploration.bits[i>>3])&(1<<(i&7)))area+=mask.rowAreaM2[Math.floor(i/mask.width)];c={area,offset:exploration.newCells?.length||0};cache.set(exploration,c);}
 const added=exploration.newCells||[];
 for(;c.offset<added.length;c.offset++){const i=added[c.offset];if(bits[i>>3]&(1<<(i&7)))c.area+=mask.rowAreaM2[Math.floor(i/mask.width)];}
 let bonus=0;
 if(inland?.chart){
  let land=landCache.get(exploration);
  if(!land||land.chart!==inland.chart||land.revision!==exploration.revision){
   const seaHas=i=>!!((bits[i>>3]&exploration.bits[i>>3])&(1<<(i&7)));
   land={chart:inland.chart,revision:exploration.revision,area:landExplorationArea(inland,seaHas).additional};
   landCache.set(exploration,land);
  }
  bonus=land.area;
 }
 const area=Math.min(WORLD_CHART_AREA_M2,c.area+bonus);
 const score=Number(BigInt(Math.round(area))*1000000n/BigInt(total));
 return {explorationScore:score,explorationArea:Math.round(area/1000000),explorationPercent:chartPercentFromScore(score)};
}
