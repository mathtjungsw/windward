import {Exploration} from './voyage-core.js';
import {explorationStats} from './exploration-score.js';
import {discoveryStats} from './discoveries.js';
import {shipTier,fleetCount} from './ship-rules.js';
export function gameStats(s,exploration){return {money:Math.round(s.money),profit:Math.round(s.profit),visited:s.visited.length,...explorationStats(exploration||new Exploration(s.explored)),...discoveryStats(s),shipTier:shipTier(s),fleetCount:fleetCount(s),statsVersion:3};}
