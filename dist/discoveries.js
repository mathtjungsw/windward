import {DISCOVERIES,DISCOVERY_BY_ID,RUMOR_BY_ID,DISCOVERY_CATALOG_VERSION} from './discoveries-catalog.js?v=2026.11.10-navigation-trade-offline.2';
import {mapDistance} from './world-wrap.js?v=2026.11.10-navigation-trade-offline.2';
import {segmentDistance} from './voyage-core.js?v=2026.11.10-navigation-trade-offline.2';
export const explorationAllowed=s=>!s.explorationLockedUntilSailing&&!['rescue','transition'].includes(s.voyage?.kind);
export const discoveryStats=s=>{const ids=Object.keys(s.discoveries||{}).filter(id=>Object.hasOwn(DISCOVERY_BY_ID,id));return {foundCount:ids.length,fame:ids.reduce((n,id)=>n+DISCOVERY_BY_ID[id].fame,0)+(s.pirateFame||0)};};
export const hasClues=(s,d)=>(d.rumorIds||[]).every(id=>(s.rumors||[]).includes(id));
export function nearbyDiscoveries(s){if(!explorationAllowed(s))return [];return DISCOVERIES.filter(d=>!s.discoveries?.[d.id]&&hasClues(s,d)&&mapDistance(s.position,d.point||[d.lon,d.lat])<=d.spotRadius+.01).sort((a,b)=>mapDistance(s.position,a.point)-mapDistance(s.position,b.point)||a.id.localeCompare(b.id));}
export function discoveryEntry(s,from,to,allowed=()=>true){if(!explorationAllowed(s))return 1;let earliest=1;for(const d of DISCOVERIES){if(s.discoveries?.[d.id]||!hasClues(s,d)||!allowed(d))continue;const hit=segmentDistance(from,to,d.point);if(hit.distance>d.spotRadius)continue;if(mapDistance(from,d.point)<=d.spotRadius){earliest=0;continue;}let low=0,high=hit.t;for(let i=0;i<26;i++){const t=(low+high)/2,lon=from[0]+(((to[0]-from[0]+540)%360)-180)*t,p=[lon,from[1]+(to[1]-from[1])*t];if(mapDistance(p,d.point)<=d.spotRadius)high=t;else low=t;}earliest=Math.min(earliest,Math.min(1,high+1e-7));}return earliest;}
export function inspectDiscovery(s,nav,id,now=Date.now()){
 const d=DISCOVERY_BY_ID[id];if(!d)return {ok:false,error:'발견물을 확인할 수 없어요.'};
 if(!explorationAllowed(s))return {ok:false,error:'구조가 끝난 뒤 정상 항해를 시작하면 조사할 수 있어요.'};
 if(s.discoveries?.[id])return {ok:false,error:'이미 도감에 수집한 기록이에요.'};
 if(!hasClues(s,d))return {ok:false,error:'주점에서 탐험 소문을 더 확인해 주세요.'};
 const point=d.point||[d.lon,d.lat];
 if(mapDistance(s.position,point)>d.inspectRadius||!nav.clear(s.position,point))return {ok:false,error:'같은 바닷길로 조사 지점에 더 가까이 가 주세요.'};
 s.discoveries??={};s.discoveries[id]={foundDay:s.day,foundAt:now,catalogVersion:DISCOVERY_CATALOG_VERSION};
 return {ok:true,discovery:d,...discoveryStats(s)};
}
export function readRumor(s,id){const r=RUMOR_BY_ID[id];if(!r||s.port!==r.portId||s.voyage||!explorationAllowed(s))return false;s.rumors??=[];if(!s.rumors.includes(id))s.rumors.push(id);return true;}
