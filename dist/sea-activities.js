import {COASTAL_ACTIVITY_SITES} from './coastal-sites.js?v=2026.11.13-discovery-move';
import {GOODS} from './data.js?v=2026.11.13-discovery-move';
import {mapDistance} from './world-wrap.js?v=2026.11.13-discovery-move';
import {explorationGear,activeOfficer,appendItemRecord,addOfficerExperience} from './rumor-progress.js?v=2026.11.13-discovery-move';

export const SEA_TYPES={
  fishing:{label:'어장',wait:20000,cooldown:1800000,good:'driedfish',qty:2},
  salvage:{label:'표류 화물',wait:10000,cooldown:7200000,good:'timber',qty:2},
  rescue:{label:'구조 요청',wait:20000,cooldown:21600000,fame:5},
  wreck:{label:'침몰선 조사',wait:20000,cooldown:86400000,good:'silver',qty:1,fame:12}
};
const kinds=Object.keys(SEA_TYPES);
const indexById=Object.fromEntries(COASTAL_ACTIVITY_SITES.map((site,i)=>[site.id,{...site,kind:kinds[i%kinds.length]}]));
export const SEA_SITES=Object.values(indexById);
export function normalizeSea(game){
  const old=game.seaLog;
  if(old&&typeof old==='object'){
    const value=(source,key)=>Number.isSafeInteger(source?.[key])?Math.max(0,Math.min(1e9,source[key])):0;
    game.seaLog={counts:Object.fromEntries(kinds.map(k=>[k,value(old.counts,k)])),
      fame:value(old,'fame'),last:{}};
    for(const id of Object.keys(indexById))if(Number.isSafeInteger(old.last?.[id])&&old.last[id]>=0)game.seaLog.last[id]=old.last[id];
  }else delete game.seaLog;
  const job=game.seaJob;
  if(job&&Object.hasOwn(indexById,job.id)&&Number.isSafeInteger(job.until)&&job.until>=0&&!game.port&&!game.voyage&&mapDistance(game.position,indexById[job.id].point)<=20){
    game.seaJob={id:job.id,until:job.until};
  }else delete game.seaJob;
  const rescued=game.seaPassenger;
  if(rescued&&indexById[rescued.id]?.kind==='rescue'&&Number.isSafeInteger(rescued.fee)&&rescued.fee>=100&&rescued.fee<=400){
    game.seaPassenger={id:rescued.id,fee:rescued.fee};
  }else delete game.seaPassenger;
}
export function visibleSeaActivities(game,now){
  if(game.port||game.voyage?.kind||game.explorationLockedUntilSailing)return [];
  const range=180+(explorationGear(game)?.seaVision||0);
  return SEA_SITES.map(site=>({site,distance:mapDistance(game.position,site.point)}))
    .filter(({site,distance})=>distance<=range&&(!game.seaLog?.last[site.id]||now>=game.seaLog.last[site.id]+SEA_TYPES[site.kind].cooldown))
    .sort((a,b)=>a.distance-b.distance);
}
export function seaActivityAction(game,action,id,now,{clear,room}){
  const site=indexById[id], job=game.seaJob;
  if(action==='cancel'&&job){delete game.seaJob;return {message:'해상 활동을 그만뒀어요.'};}
  if(!site||game.port||game.voyage||game.shoreTrip||game.explorationLockedUntilSailing||game.battleId||game.npcBattle||game.raidId)
    throw Error('전투나 구조가 끝난 뒤 항로를 멈추고 해상 활동을 시작하세요.');
  if(mapDistance(game.position,site.point)>20||!clear(game.position,site.point))throw Error('같은 바닷길로 20해리 안까지 접근하세요.');
  const type=SEA_TYPES[site.kind], gear=explorationGear(game),officer=activeOfficer(game);
  if(action==='start'){
    if(job||site.kind==='rescue'&&game.seaPassenger)throw Error('진행 중인 해상 활동이나 구조를 먼저 끝내세요.');
    if(game.seaLog?.last[id]&&now<game.seaLog.last[id]+type.cooldown)throw Error('이 지점은 아직 다시 이용할 수 없어요.');
    if(game.food<=.2)throw Error('활동에 사용할 보급 0.2일분이 필요해요.');
    const speed=(site.kind==='salvage'?(gear?.salvageSpeed||0)+(officer?.salvageSpeed||0):site.kind==='rescue'?gear?.rescueSpeed||0:0);
    game.food-=.2;game.seaJob={id,until:now+Math.ceil(type.wait*(1-Math.min(.5,speed)))};
    return {message:type.label+' 활동을 시작했어요.'};
  }
  if(action!=='finish'||job?.id!==id||now<job.until)throw Error('활동을 완료할 때까지 기다리세요.');
  const base=(type.qty||0)+(site.kind==='fishing'?gear?.fishingYield||0:0);
  if(type.good&&room<base)throw Error('받을 화물을 실을 공간이 부족해요.');
  const extra=Number(site.kind==='salvage'&&!!game.rumorProgress?.items.I037&&room>base),qty=base+extra;
  if(extra)game.rumorProgress.items.I037--;
  const log=game.seaLog??={counts:{},last:{},fame:0};
  if(type.good){
    const old=game.cargo[type.good]||{qty:0,cost:0};
    game.cargo[type.good]={qty:old.qty+qty,cost:old.cost};
  }
  log.last[id]=now;
  delete game.seaJob;
  if(site.kind==='rescue'){
    game.seaPassenger={id,fee:200};
    return {message:'구조 완료 · 선원을 이전에 방문한 항구에 데려다주세요.'};
  }
  log.counts[site.kind]=(log.counts[site.kind]||0)+1;
  log.fame+=(type.fame||0);
  addOfficerExperience(game,12);
  appendItemRecord(game,site.kind,site.id,site.name,now);
  return {message:type.label+' 완료'+(type.good?' · '+GOODS[type.good].name+' '+qty+'상자':'')};
}
export function finishSeaRescue(game,port){
  if(!game.seaPassenger||!game.visited.includes(port))return null;
  const log=game.seaLog??={counts:{},last:{},fame:0}, {fee}=game.seaPassenger;
  game.money+=fee;
  const extra=game.rumorProgress?.items.I046?5:0;
  if(extra)game.rumorProgress.items.I046--;
  const fame=SEA_TYPES.rescue.fame+extra;
  log.fame+=fame;
  addOfficerExperience(game,18);
  log.counts.rescue=(log.counts.rescue||0)+1;
  delete game.seaPassenger;
  return {fee,fame};
}
