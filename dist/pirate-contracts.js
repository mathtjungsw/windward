import {SEA_SITES} from './sea-activities.js?v=2026.11.20-survey-voyages';
import {PIRATE_ZONES} from './combat-core.js?v=2026.11.20-survey-voyages';
import {PORT_BY_ID} from './data.js?v=2026.11.20-survey-voyages';
import {mapDistance} from './world-wrap.js?v=2026.11.20-survey-voyages';

const types={smuggler:{name:'밀수선 화물 회수',reward:1200},salvage:{name:'표류 화물 수색',reward:520}};
const incidents={
 smuggler:{take:'흔적을 따라간다',skip:'원래 항로를 유지한다',food:.5,reward:300},
 salvage:{take:'떠다니는 짐을 추가로 확인한다',skip:'지정 화물부터 인도한다',food:.25,reward:180}
};
const siteFor=(port,entries)=>[...entries].sort((a,b)=>mapDistance([port.lon,port.lat],a.point)-mapDistance([port.lon,port.lat],b.point))[0];
export function pirateContractTask(portId,type){
 const port=PORT_BY_ID[portId];
 if(!port||port.depot||!types[type])return null;
 const site=siteFor(port,type==='smuggler'?PIRATE_ZONES:SEA_SITES.filter(row=>row.kind==='salvage'));
 if(!site)return null;
 return {...types[type],type,site};
}
function proof(game,task){
 return task.type==='smuggler'?(game.pirateRespawns?.[task.site.id]||0)-1800000:game.seaLog?.last?.[task.site.id]||0;
}
export function pirateContractIncident(game,now){
 const active=game.pirateContract,task=active&&pirateContractTask(active.port,active.type);
 if(!task||!active.event||active.event.choice||active.deadline<=now||game.explorationLockedUntilSailing||game.voyage?.kind)return null;
 const proved=proof(game,task);
 return proved>=active.at&&proved<=active.deadline?incidents[active.type]:null;
}
export function pirateContractAction(game,action,value,now){
 const active=game.pirateContract;
 if(action==='abandon'){
  if(!active)throw Error('진행 중인 의뢰가 없어요.');
  delete game.pirateContract;
  return {message:'해적 의뢰를 종료했어요.'};
 }
 if(action==='incident'){
  const event=pirateContractIncident(game,now);
  if(!event||!['take','skip'].includes(value))throw Error('진행 중인 의뢰의 현장 확인이 필요해요.');
  if(value==='take'&&(game.food<=event.food||now+15000>=active.deadline))throw Error('추가 조사를 마칠 보급과 시간이 필요해요.');
  active.event.choice=value;
  if(value==='take'){
   game.food-=event.food;active.event.readyAt=now+15000;
  }
  return {message:value==='take'?'추가 조사를 시작했어요. 현실 15초 뒤 보고할 수 있어요.':'기본 의뢰를 계속합니다.'};
 }
 if(!game.port||game.voyage||game.npcBattle||game.battleId||game.raidId)throw Error('항구에 정박한 뒤 이용하세요.');
 if(action==='accept'){
  const task=pirateContractTask(game.port,value);
  if(active||!task)throw Error('진행 중인 의뢰를 확인하세요.');
  game.pirateContract={type:value,port:game.port,at:now,deadline:now+48*3600000,event:{}};
  return {message:task.name+' 의뢰를 받았어요.'};
 }
 if(action!=='report'||!active||game.port!==active.port||active.deadline<=now)throw Error('의뢰를 받은 항구와 마감을 확인하세요.');
 const task=pirateContractTask(active.port,active.type);
 if(!task)throw Error('의뢰 목표가 바뀌었어요.');
 const proved=proof(game,task);
 if(proved<active.at||proved>active.deadline)throw Error('지정된 해역의 작업을 먼저 완료하세요.');
 if(task.type==='salvage'){
  const cargo=game.cargo.timber;
  if(!cargo||cargo.qty<2)throw Error('회수한 목재 2상자가 필요해요.');
  if(cargo.qty===2)delete game.cargo.timber;
  else game.cargo.timber={qty:cargo.qty-2,cost:cargo.cost*(cargo.qty-2)/cargo.qty};
 }
 const bonus=active.event?.choice==='take'&&active.event.readyAt<=now&&!game.explorationLockedUntilSailing?incidents[active.type].reward:0;
 if(active.event?.choice==='take'&&active.event.readyAt>now)throw Error('추가 조사 보고가 준비될 때까지 기다려 주세요.');
 game.money+=task.reward+bonus;
 delete game.pirateContract;
 return {message:'해적 의뢰 완료 · '+(task.reward+bonus)+' D'+(bonus?' (추가 조사 포함)':'')};
}
