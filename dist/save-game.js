import {historicalKind,normalizeShipyard} from './historical-ships.js?v=2026.11.13-gear-corinth';
import {PIRATE_IDS} from './pirate-catalog.js?v=2026.11.13-gear-corinth';
import {PORT_BY_ID,ALL_PORTS,ACTIVE_PORT_BY_ID,GOODS} from './data.js?v=2026.11.13-gear-corinth';
import {LEGACY_TIER,SHIPS,syncFleet,fleetShips,STORED_SHIP_LIMIT} from './ship-rules.js?v=2026.11.13-gear-corinth';
import {DISCOVERY_BY_ID,RUMOR_BY_ID,RETIRED_DISCOVERY_FAME} from './discoveries-catalog.js?v=2026.11.13-gear-corinth';

import {normalizeRumorProgress} from './rumor-progress.js?v=2026.11.13-gear-corinth';

import {normalizeSea} from './sea-activities.js?v=2026.11.13-gear-corinth';
import {normalizeGuild} from './guild-contracts.js?v=2026.11.13-gear-corinth';
import {normalizeShore} from './shore-expeditions.js?v=2026.11.13-gear-corinth';
import {normalizeDepotDock} from './projects.js?v=2026.11.13-gear-corinth';
import {normalizeCollector} from './tax-collector.js?v=2026.11.13-gear-corinth';
import {normalizeStories} from './story-core.js?v=2026.11.13-gear-corinth';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite)&&Math.abs(p[0])<=180&&p[1]>=-90&&p[1]<=90;
const bad=()=>{throw Error('항해 기록 형식을 확인할 수 없어요. 원본 기록은 유지됩니다.');};
export function parseState(raw,defaults){
 const s=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);
 if(!s||![1,2,3,4].includes(s.version))throw Error('이 기록은 현재 버전에서 열 수 없어요. 원본을 보존하고 최신 게임으로 접속해 주세요.');
 if(!finite(s.money)||s.money<0||s.money>1e12||!finite(s.day)||s.day<0||!finite(s.food)||s.food<0||s.food>1000||!point(s.position)||!Array.isArray(s.visited)||s.visited.some(id=>!Object.hasOwn(PORT_BY_ID,id))||!s.cargo||typeof s.cargo!=='object'||Array.isArray(s.cargo)||Object.entries(s.cargo).some(([id,c])=>!Object.hasOwn(GOODS,id)||!Number.isInteger(c?.qty)||c.qty<0||c.qty>100000||!finite(c.cost)||c.cost<0))bad();
 if(s.version<3&&(!Number.isInteger(s.level)||s.level<0||s.level>2))bad();
 if(s.version>=3&&(!Number.isInteger(s.shipTier)||s.shipTier<0||s.shipTier>=20||!Number.isInteger(s.fleetCount)||s.fleetCount<1||s.fleetCount>5))bad();
 if(s.port!==null&&!Object.hasOwn(PORT_BY_ID,s.port))bad();
 const v=s.voyage;
 if(v&&(!Array.isArray(v.path)||v.path.length<2||v.path.length>10000||v.path.some(p=>!point(p))||!Array.isArray(v.lengths)||v.lengths.length!==v.path.length-1||v.lengths.some(n=>!finite(n)||n<0)||(v.target!==null&&!Object.hasOwn(PORT_BY_ID,v.target))||!finite(v.total)||v.total<=0||!finite(v.travelled)||v.travelled<0||v.travelled>v.total+.1||!finite(v.foodRemaining)))bad();
 const canalId=id=>['canal-corinth','canal-suez','canal-panama'].includes(id);
 if(v?.canal!==undefined&&!canalId(v.canal))bad();
 if(v?.passages!==undefined&&(!Array.isArray(v.passages)||v.passages.length>3||v.passages.some((p,i)=>!canalId(p?.id)||!finite(p.start)||!finite(p.end)||p.start<0||p.end<=p.start||p.end>v.total+.0001||i&&p.start<v.passages[i-1].end||!Number.isSafeInteger(p.amount)||p.amount<0||p.amount>1000||typeof p.paid!=='boolean'||!p.paid&&v.travelled>p.start+.0001)))bad();
 const ids=(value,max=Object.keys(PORT_BY_ID).length)=>[...new Set((Array.isArray(value)?value:[]).filter(id=>Object.hasOwn(PORT_BY_ID,id)))].slice(0,max);
 const game={...defaults(),...s,version:3,world:'real',speed:1,shipTier:s.version>=3?s.shipTier:LEGACY_TIER[s.level],fleetCount:s.version>=3?s.fleetCount:1,
  visited:ids(s.visited),knownPorts:ids([...(s.knownPorts||defaults().knownPorts),...s.visited,s.port,v?.kind?null:v?.target]),
  controlMode:v?'auto':s.controlMode==='manual'?'manual':'auto',explored:typeof s.explored==='string'&&s.explored.length<40000?s.explored:'',
  missions:Array.isArray(s.missions)?s.missions.slice(0,20):[],quiz:ids(s.quiz),log:Array.isArray(s.log)?s.log.slice(0,50):[],favorites:ids(s.favorites,20),recentPorts:ids(s.recentPorts||[s.port],8),useCanals:s.useCanals!==false,
  recentRoutes:(s.recentRoutes||[]).filter(r=>PORT_BY_ID[r.from]&&PORT_BY_ID[r.to]&&finite(r.nm)&&r.nm>0).slice(0,5),
  discoveries:{},rumors:[...new Set((s.rumors||[]).filter(id=>Object.hasOwn(RUMOR_BY_ID,id)))],
  supplyCreditValue:s.version>=3&&finite(s.supplyCreditValue)&&s.supplyCreditValue>=0?s.supplyCreditValue:Math.max(0,Number(s.supplyCreditDays)||0)*[3,6,12][s.level||0],
  worldCatalogVersion:'2026.11.09-world-78',explorationMaskVersion:1};
 if(s.version>=3&&s.supplyCreditValue!==undefined&&(!finite(s.supplyCreditValue)||s.supplyCreditValue<0))bad();
 if(s.version>=3&&s.discoveries&&(typeof s.discoveries!=='object'||Array.isArray(s.discoveries)))bad();
 for(const [id,d]of Object.entries(s.discoveries||{}))if(Object.hasOwn(DISCOVERY_BY_ID,id)||Object.hasOwn(RETIRED_DISCOVERY_FAME,id)){if(!d||!finite(d.foundDay)||d.foundDay<0||!finite(d.foundAt)||d.foundAt<0)bad();game.discoveries[id]={foundDay:d.foundDay,foundAt:d.foundAt,catalogVersion:String(d.catalogVersion||'2026.11.06')};}
 delete game.supplyCreditDays;
 if(s.version===4){if(!Array.isArray(s.fleetShips)||s.fleetShips.length<1||s.fleetShips.length>5||new Set(s.fleetShips.map(p=>p?.id)).size!==s.fleetShips.length||s.fleetShips.some(p=>typeof p?.id!=='string'||!p.id.length||p.id.length>80||!Number.isInteger(p.tier)||p.tier<0||p.tier>19)||!s.fleetShips.some(p=>p.id===s.flagshipId)||s.fleetCount!==s.fleetShips.length||s.shipTier!==s.fleetShips.find(p=>p.id===s.flagshipId).tier)bad();}
 if(s.version===4)syncFleet(game,s.fleetShips.map(p=>({id:p.id,tier:p.tier,...(historicalKind(p.kind,p.tier)?{kind:p.kind}:{}),...(Number.isSafeInteger(p.costBasis)&&p.costBasis>=0&&p.costBasis<=1e8?{costBasis:p.costBasis}:{})})),s.flagshipId);else syncFleet(game,Array.from({length:game.fleetCount},(_,i)=>({id:'vessel-'+i,tier:game.shipTier})));
 if(s.storedShips!==undefined){
  if(!Array.isArray(s.storedShips)||s.storedShips.length>STORED_SHIP_LIMIT)bad();
  const vesselIds=new Set(game.fleetShips.map(v=>v.id));
  game.storedShips=s.storedShips.map(v=>{
   if(typeof v?.id!=='string'||!v.id.length||v.id.length>80||vesselIds.has(v.id)||
    !Number.isInteger(v.tier)||v.tier<0||v.tier>=SHIPS.length||!Object.hasOwn(PORT_BY_ID,v.port)||PORT_BY_ID[v.port].depot||
    !finite(v.health)||v.health<0||v.health>1||(v.kind!==undefined&&!historicalKind(v.kind,v.tier))||
    (v.costBasis!==undefined&&(!Number.isSafeInteger(v.costBasis)||v.costBasis<0||v.costBasis>1e8)))bad();
   vesselIds.add(v.id);
   return {id:v.id,tier:v.tier,port:v.port,health:v.health,...(v.kind?{kind:v.kind}:{}),...(v.costBasis===undefined?{}:{costBasis:v.costBasis})};
  });
 }
 game.version=4;
 if(s.autoSupply!==undefined)game.autoSupply=s.autoSupply===true;
 if(s.cannons!==undefined){if(!Array.isArray(s.cannons)||s.cannons.length>100||new Set(s.cannons.map(p=>p?.id)).size!==s.cannons.length||s.cannons.some(p=>typeof p?.id!=='string'||p.id.length>100||!['swivel','light','rapid','standard','long','precision','heavy','large'].includes(p.kind)||!Number.isInteger(p.quality)||p.quality<0||p.quality>4||!finite(p.readyAt)||p.readyAt<0||p.shipId!==null&&!game.fleetShips.some(v=>v.id===p.shipId)))bad();}
 if(s.hullHP!==undefined&&(!finite(s.hullHP)||s.hullHP<0||s.hullHP>100000))bad();

 if(s.pirateFame!==undefined&&(!Number.isSafeInteger(s.pirateFame)||s.pirateFame<0||s.pirateFame>1e12))bad();
 for(const key of ['lootClaims'])if(s[key]!==undefined){const c=s[key];if(!c||typeof c!=='object'||Array.isArray(c)||Object.entries(c).some(([id,v])=>!Object.hasOwn(GOODS,id)||!Number.isInteger(v.qty)||v.qty<0||!finite(v.cost)||v.cost<0)||Object.values(c).reduce((n,v)=>n+v.qty,0)>50)bad();}
 if(s.battleReserve!==undefined){const r=s.battleReserve;let c;try{c=JSON.parse(r.cargoJSON);}catch{bad();}if(typeof r.id!=='string'||r.id.length>80||!Number.isInteger(r.money)||r.money<0||r.money>2000||!c||typeof c!=='object'||Array.isArray(c)||Object.entries(c).some(([id,v])=>!Object.hasOwn(GOODS,id)||!Number.isInteger(v.qty)||v.qty<0||!finite(v.cost)||v.cost<0)||Object.values(c).reduce((n,v)=>n+v.qty,0)>5)bad();}
 if(s.npcBattle!==undefined&&(!PIRATE_IDS.has(s.npcBattle?.zoneId)||!finite(s.npcBattle.hp)||s.npcBattle.hp<0||s.npcBattle.hp>500||!finite(s.npcBattle.readyAt)||(s.npcBattle.turtleGuard!==undefined&&typeof s.npcBattle.turtleGuard!=='boolean')||['shots','hits'].some(key=>s.npcBattle[key]!==undefined&&(!Number.isSafeInteger(s.npcBattle[key])||s.npcBattle[key]<0))))bad();
 if(s.rankProgress!==undefined){const p=s.rankProgress;if(!p||p.version!==1||!finite(p.since)||p.since<0||!Array.isArray(p.tradedGoods)||p.tradedGoods.length>128||p.tradedGoods.some(id=>!Object.hasOwn(GOODS,id))||['pirateKills','fleetDefeats','duelWins','bestTradeProfit'].some(k=>!Number.isSafeInteger(p[k])||p[k]<0||p[k]>1e12))bad();game.rankProgress={...p,tradedGoods:[...new Set(p.tradedGoods)]};}
 if(s.defenseAck!==undefined){const a=s.defenseAck;let loot;try{loot=JSON.parse(a.lootJSON);}catch{bad();}if(!a||['seq','cash','kills'].some(k=>!Number.isSafeInteger(a[k])||a[k]<0||a[k]>1e12)||typeof a.lostReserveId!=='string'||a.lostReserveId.length>80||!loot||Object.entries(loot).some(([id,c])=>!Object.hasOwn(GOODS,id)||!Number.isSafeInteger(c.qty)||c.qty<0||!finite(c.cost)||c.cost<0))bad();}
 if(s.raidId!==undefined&&(typeof s.raidId!=='string'||s.raidId.length>80))bad();
 // Defaults describe new captains; an old save must not inherit their grant marker.
 if(!Object.hasOwn(s,'raftStart'))delete game.raftStart;
 if(s.version<3)game.migrationId='world-fleet-2026-11-06';
 if(s.version===1){if(v)game.voyage={...v,legacy:true,legacyShipLevel:s.level};else if(!s.port)game.transitionPending=true;else {const max=SHIPS[game.shipTier].supply,extra=Math.max(0,game.food-max);game.food-=extra;game.supplyCreditValue+=extra*[3,6,12][s.level];}}
 if(game.voyage?.legacy&&game.voyage.legacyShipLevel===undefined)game.voyage.legacyShipLevel=Math.min(2,s.level||0);
 if(game.voyage&&['rescue','transition'].includes(game.voyage.kind)){game.explorationLockedUntilSailing=true;game.voyage.rescueId??='legacy-rescue';if(!game.visited.includes(game.voyage.target)||!ACTIVE_PORT_BY_ID[game.voyage.target])game.rescueReplanPending=true;}
 if(game.port&&!game.voyage){if(game.navigationVersion!==2)game.position=[PORT_BY_ID[game.port].lon,PORT_BY_ID[game.port].lat];game.legacyHarbor=!ACTIVE_PORT_BY_ID[game.port];}
 if(game.voyage?.target&&!ACTIVE_PORT_BY_ID[game.voyage.target]&&!game.voyage.kind)game.voyage.legacyArrival=true;
 if(s.rumorProgress!==undefined)game.rumorProgress=normalizeRumorProgress(game);
 if(s.shipyard!==undefined)normalizeShipyard(game);
 normalizeShore(game);
 normalizeGuild(game);
 normalizeSea(game);
 normalizeDepotDock(game);
 if(s.taxCollector)game.taxCollector=normalizeCollector(s.taxCollector);
 normalizeStories(game);
 return game;
}
