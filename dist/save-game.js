import {PORT_BY_ID,ALL_PORTS,ACTIVE_PORT_BY_ID,GOODS} from './data.js';
import {LEGACY_TIER,SHIPS} from './ship-rules.js';
import {DISCOVERY_BY_ID,RUMOR_BY_ID} from './discoveries-catalog.js';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite)&&Math.abs(p[0])<=180&&p[1]>=-90&&p[1]<=90;
const bad=()=>{throw Error('항해 기록 형식을 확인할 수 없어요. 원본 기록은 유지됩니다.');};
export function parseState(raw,defaults){
 const s=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);
 if(!s||![1,2,3].includes(s.version))throw Error('이 기록은 현재 버전에서 열 수 없어요. 원본을 보존하고 최신 게임으로 접속해 주세요.');
 if(!finite(s.money)||s.money<0||s.money>1e12||!finite(s.day)||s.day<0||!finite(s.food)||s.food<0||s.food>1000||!point(s.position)||!Array.isArray(s.visited)||s.visited.some(id=>!Object.hasOwn(PORT_BY_ID,id))||!s.cargo||typeof s.cargo!=='object'||Array.isArray(s.cargo)||Object.entries(s.cargo).some(([id,c])=>!Object.hasOwn(GOODS,id)||!Number.isInteger(c?.qty)||c.qty<0||c.qty>100000||!finite(c.cost)||c.cost<0))bad();
 if(s.version<3&&(!Number.isInteger(s.level)||s.level<0||s.level>2))bad();
 if(s.version===3&&(!Number.isInteger(s.shipTier)||s.shipTier<0||s.shipTier>=20||!Number.isInteger(s.fleetCount)||s.fleetCount<1||s.fleetCount>5))bad();
 if(s.port!==null&&!Object.hasOwn(PORT_BY_ID,s.port))bad();
 const v=s.voyage;
 if(v&&(!Array.isArray(v.path)||v.path.length<2||v.path.length>10000||v.path.some(p=>!point(p))||!Array.isArray(v.lengths)||v.lengths.length!==v.path.length-1||v.lengths.some(n=>!finite(n)||n<0)||(v.target!==null&&!Object.hasOwn(PORT_BY_ID,v.target))||!finite(v.total)||v.total<=0||!finite(v.travelled)||v.travelled<0||v.travelled>v.total+.1||!finite(v.foodRemaining)))bad();
 const ids=(value,max=ALL_PORTS.length)=>[...new Set((Array.isArray(value)?value:[]).filter(id=>Object.hasOwn(PORT_BY_ID,id)))].slice(0,max);
 const game={...defaults(),...s,version:3,world:'real',speed:1,shipTier:s.version===3?s.shipTier:LEGACY_TIER[s.level],fleetCount:s.version===3?s.fleetCount:1,
  visited:ids(s.visited),knownPorts:ids([...(s.knownPorts||defaults().knownPorts),...s.visited,s.port,v?.kind?null:v?.target]),
  controlMode:v?'auto':s.controlMode==='manual'?'manual':'auto',explored:typeof s.explored==='string'&&s.explored.length<40000?s.explored:'',
  missions:Array.isArray(s.missions)?s.missions.slice(0,20):[],quiz:ids(s.quiz),log:Array.isArray(s.log)?s.log.slice(0,50):[],favorites:ids(s.favorites,20),recentPorts:ids(s.recentPorts||[s.port],8),
  recentRoutes:(s.recentRoutes||[]).filter(r=>PORT_BY_ID[r.from]&&PORT_BY_ID[r.to]&&finite(r.nm)&&r.nm>0).slice(0,5),
  discoveries:{},rumors:[...new Set((s.rumors||[]).filter(id=>Object.hasOwn(RUMOR_BY_ID,id)))],
  supplyCreditValue:s.version===3&&finite(s.supplyCreditValue)&&s.supplyCreditValue>=0?s.supplyCreditValue:Math.max(0,Number(s.supplyCreditDays)||0)*[3,6,12][s.level||0],
  worldCatalogVersion:'2026.11.06',explorationMaskVersion:1};
 if(s.version===3&&s.supplyCreditValue!==undefined&&(!finite(s.supplyCreditValue)||s.supplyCreditValue<0))bad();
 if(s.version===3&&s.discoveries&&(typeof s.discoveries!=='object'||Array.isArray(s.discoveries)))bad();
 for(const [id,d]of Object.entries(s.discoveries||{}))if(Object.hasOwn(DISCOVERY_BY_ID,id)){if(!d||!finite(d.foundDay)||d.foundDay<0||!finite(d.foundAt)||d.foundAt<0)bad();game.discoveries[id]={foundDay:d.foundDay,foundAt:d.foundAt,catalogVersion:String(d.catalogVersion||'2026.11.06')};}
 delete game.supplyCreditDays;
 if(s.version<3)game.migrationId='world-fleet-2026-11-06';
 if(s.version===1){if(v)game.voyage={...v,legacy:true,legacyShipLevel:s.level};else if(!s.port)game.transitionPending=true;else {const max=SHIPS[game.shipTier].supply,extra=Math.max(0,game.food-max);game.food-=extra;game.supplyCreditValue+=extra*[3,6,12][s.level];}}
 if(game.voyage?.legacy&&game.voyage.legacyShipLevel===undefined)game.voyage.legacyShipLevel=Math.min(2,s.level||0);
 if(game.voyage&&['rescue','transition'].includes(game.voyage.kind)){game.explorationLockedUntilSailing=true;game.voyage.rescueId??='legacy-rescue';if(!game.visited.includes(game.voyage.target)||!ACTIVE_PORT_BY_ID[game.voyage.target])game.rescueReplanPending=true;}
 if(game.port&&!game.voyage){game.position=[PORT_BY_ID[game.port].lon,PORT_BY_ID[game.port].lat];game.legacyHarbor=!ACTIVE_PORT_BY_ID[game.port];}
 if(game.voyage?.target&&!ACTIVE_PORT_BY_ID[game.voyage.target]&&!game.voyage.kind)game.voyage.legacyArrival=true;
 return game;
}
