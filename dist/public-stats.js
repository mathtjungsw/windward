import {ISLAND_PORT_IDS} from './island-ports.js?v=2026.11.13-gear-corinth';
import {GOODS} from './data.js?v=2026.11.13-gear-corinth';
import {Exploration} from './voyage-core.js?v=2026.11.13-gear-corinth';
import {explorationStats} from './exploration-score.js?v=2026.11.13-gear-corinth';
import {discoveryStats} from './discoveries.js?v=2026.11.13-gear-corinth';
import {shipTier,fleetCount,fleetShips} from './ship-rules.js?v=2026.11.13-gear-corinth';
import {DISCOVERIES} from './discoveries-catalog.js?v=2026.11.13-gear-corinth';
import {ITEMS,OFFICERS} from './rumor-catalog.js?v=2026.11.13-gear-corinth';
export function collectionRankStats(game){
 const progress=game.rumorProgress,acquired=new Set(progress?.acquiredItems||[]),officers=new Set(progress?.officers||[]);
 return {shoreCompleted:game.shoreProgress?.count||0,rareFinds:DISCOVERIES.filter(d=>d.tier>=3&&game.discoveries?.[d.id]).length,
   officerCount:OFFICERS.filter(o=>officers.has(o.id)).length,itemCount:ITEMS.filter(i=>acquired.has(i.id)||progress?.items?.[i.id]>0).length,
   guildCompleted:game.guild?.completed||0,freightCompleted:game.projectStats?.freight||0,seaRescues:game.seaLog?.counts?.rescue||0};
}
export function gameStats(s,exploration){return {...collectionRankStats(s),money:Math.round(s.money+(s.battleReserve?.money||0)),profit:Math.round(s.profit),visited:s.visited.length,...explorationStats(exploration||new Exploration(s.explored)),...discoveryStats(s),shipTier:shipTier(s),fleetCount:fleetCount(s),statsVersion:3,...(s.rumorProgress?.flag?{earnedFlag:true}:{}),rankProgressVersion:1,pirateKills:s.rankProgress?.pirateKills||0,fleetDefeats:s.rankProgress?.fleetDefeats||0,duelWins:s.rankProgress?.duelWins||0,tradedGoodCount:new Set((s.rankProgress?.tradedGoods||(s.boughtLisbonWine?['wine']:[])).filter(id=>Object.hasOwn(GOODS,id))).size,bestTradeProfit:s.rankProgress?.bestTradeProfit||0,islandPorts:new Set(s.visited.filter(id=>ISLAND_PORT_IDS.has(id))).size,fleetGrowth:fleetShips(s).reduce((n,p)=>n+p.tier+1,0)};}
