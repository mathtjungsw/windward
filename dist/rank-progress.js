export const RANK_PROGRESS_VERSION=1;
export function rankProgress(s,now=Date.now()){
 if(!s.rankProgress)s.rankProgress={version:1,since:now,pirateKills:0,fleetDefeats:0,duelWins:0,tradedGoods:s.boughtLisbonWine?['wine']:[],bestTradeProfit:0};
 return s.rankProgress;
}
export function recordTrade(s,id,mode,realizedProfit=0,now=Date.now()){const p=rankProgress(s,now);if(!p.tradedGoods.includes(id))p.tradedGoods.push(id);if(mode==='sell')p.bestTradeProfit=Math.max(p.bestTradeProfit,Math.floor(realizedProfit+1e-8));}
export function recordPirateKill(s,now){rankProgress(s,now).pirateKills++;}
export function recordBattleWin(s,room,uid,now){if(room.winner!==uid)return;const p=rankProgress(s,now);if(room.mode==='duel')p.duelWins++;else if(room.mode==='free'&&room.players[room.loser]?.hp===0)p.fleetDefeats++;}
