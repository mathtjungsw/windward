import {Exploration} from './voyage-core.js?v=2026.11.09-frontiers';
import {explorationStats} from './exploration-score.js?v=2026.11.09-frontiers';
import {discoveryStats} from './discoveries.js?v=2026.11.09-frontiers';
import {shipTier,fleetCount} from './ship-rules.js?v=2026.11.09-frontiers';
export function gameStats(s,exploration){return {money:Math.round(s.money+(s.battleReserve?.money||0)),profit:Math.round(s.profit),visited:s.visited.length,...explorationStats(exploration||new Exploration(s.explored)),...discoveryStats(s),shipTier:shipTier(s),fleetCount:fleetCount(s),statsVersion:3};}
