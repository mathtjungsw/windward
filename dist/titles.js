import {TITLES,TITLE_BY_ID,normalizeTitles} from './title-effects.js?v=2026.11.21-inland-discovery-hubs';
import {gameStats} from './public-stats.js?v=2026.11.21-inland-discovery-hubs';
export function titleStats(game,verified={}){return {...gameStats(game),...Object.fromEntries(['ownedPortCount','overallScore'].filter(k=>Number.isFinite(verified[k])).map(k=>[k,verified[k]]))};}
export function reconcileTitles(game,now=Date.now(),verified={}){
 const progress=game.titles=normalizeTitles(game),stats=titleStats(game,verified),added=[];
 for(const t of TITLES)if(!Object.hasOwn(progress.earned,t.id)&&Number.isFinite(stats[t.metric])&&stats[t.metric]>=t.target){progress.earned[t.id]=Math.max(0,Math.floor(now));added.push(t.id);}
 if(game.albumRewards?.titleActive)game.albumRewards.titleActive=false;
 return added;
}
export function chooseTitle(game,id,now=Date.now(),verified={}){
 if(!game.port||game.voyage||game.shoreTrip||game.seaJob||game.battleId||game.npcBattle||game.raidId)throw Error('항구에 정박하고 진행 중인 활동을 마친 뒤 칭호를 바꾸세요.');
 reconcileTitles(game,now,verified);
 if(id&&(!TITLE_BY_ID[id]||!Object.hasOwn(game.titles.earned,id)))throw Error('획득한 칭호를 선택하세요.');
 game.titles.active=id||null;
 return {message:id?TITLE_BY_ID[id].name+' 칭호 사용':'칭호 사용 해제'};
}
export async function refreshTitleContext(account,force=false){
 if(!account.ready||!account.sdk)return {};
 if(!force&&Date.now()-(account.titleContextAt||0)<30000)return account.titleContext||{};
 const uid=account.uid,s=account.sdk;
 const rows=await Promise.allSettled(['portRankings','overallRanking/captains'].map(path=>s.get(s.ref(account.db,'gameV2/real/'+path+'/'+uid))));
 if(account.uid!==uid)return {};
 const result={};
 if(rows[0].status==='fulfilled')result.ownedPortCount=rows[0].value.val()?.ownedPortCount||0;
 if(rows[1].status==='fulfilled')result.overallScore=rows[1].value.val()?.overallScore||0;
 account.titleContext=result;account.titleContextAt=Date.now();return result;
}
