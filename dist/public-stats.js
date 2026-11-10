import {ISLAND_PORT_IDS} from './island-ports.js?v=2026.11.10-navigation-trade-offline';
import {GOODS} from './data.js?v=2026.11.10-navigation-trade-offline';
import {Exploration} from './voyage-core.js?v=2026.11.10-navigation-trade-offline';
import {explorationStats} from './exploration-score.js?v=2026.11.10-navigation-trade-offline';
import {discoveryStats} from './discoveries.js?v=2026.11.10-navigation-trade-offline';
import {shipTier,fleetCount,fleetShips} from './ship-rules.js?v=2026.11.10-navigation-trade-offline';
export function gameStats(s,exploration){return {money:Math.round(s.money+(s.battleReserve?.money||0)),profit:Math.round(s.profit),visited:s.visited.length,...explorationStats(exploration||new Exploration(s.explored)),...discoveryStats(s),shipTier:shipTier(s),fleetCount:fleetCount(s),statsVersion:3,rankProgressVersion:1,pirateKills:s.rankProgress?.pirateKills||0,fleetDefeats:s.rankProgress?.fleetDefeats||0,duelWins:s.rankProgress?.duelWins||0,tradedGoodCount:new Set((s.rankProgress?.tradedGoods||(s.boughtLisbonWine?['wine']:[])).filter(id=>Object.hasOwn(GOODS,id))).size,bestTradeProfit:s.rankProgress?.bestTradeProfit||0,islandPorts:new Set(s.visited.filter(id=>ISLAND_PORT_IDS.has(id))).size,fleetGrowth:fleetShips(s).reduce((n,p)=>n+p.tier+1,0)};}
