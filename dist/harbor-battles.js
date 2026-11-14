import {ownership} from './commerce.js?v=2026.11.14-harbor-chart';

const HOUR=3600000, DAY=24*HOUR, WINDOW=2*HOUR;
export const CONTESTED_PORTS=['jamestown','georgetown-ascension','sanjuan-robinson','portvila'];
export const harborNames={jamestown:'제임스타운','georgetown-ascension':'조지타운','sanjuan-robinson':'산후안바우티스타',portvila:'포트빌라'};
const stances=['channel','outer','hold'];
export function battleWindow(now){
 const day=Math.floor((now+9*HOUR)/DAY)*DAY-9*HOUR,start=day+20*HOUR;
 return {start,end:start+WINDOW,open:now>=start&&now<start+WINDOW};
}
export function harborOperator(content,now){
 const grant=content.harborOperator;
 return grant?.until>now?grant.uid:ownership(content).ownerUid;
}
function mustDock(game,port){
 if(!CONTESTED_PORTS.includes(port)||game.port!==port||game.voyage||game.npcBattle||game.battleId||game.raidId)throw Error('해당 경합 항구에 정박한 뒤 이용하세요.');
}
export function harborBattleAction(game,content,uid,port,action,value,now,name){
 const operator=harborOperator(content,now),battle=content.harborMatch,window=battleWindow(now);
 mustDock(game,port);
 if(action==='defense'){
  if(operator!==uid||!stances.includes(value))throw Error('항구 운영 선장의 방어 배치를 확인하세요.');
  content.harborDefense={uid,stance:value};
  return {message:'다음 공방의 포탑 배치를 저장했어요.'};
 }
 if(action==='start'){
  if(!window.open||operator===uid||content.harborOperator?.until>now||content.harborCooldown>now||battle?.end>now&&battle.state==='active')throw Error('도전 가능한 시간과 항구 운영 상태를 확인하세요.');
  const assigned=Math.min(10,game.militia?.escort||0);
  content.harborMatch={attacker:uid,defender:operator||'',begin:now,end:Math.min(window.end,now+300000),state:'active',capture:0,ship:100,fort:100,turn:0,assigned,training:game.crewTraining||0,stance:content.harborDefense?.uid===operator?content.harborDefense.stance:'channel'};
  return {message:'공방을 시작했어요.'};
 }
 if(!battle||battle.state!=='active')throw Error('진행 중인 공방이 없어요.');
 if(now>=battle.end){
  battle.state='defended';content.harborCooldown=now+DAY;
  return {message:'제한 시간 종료 · 방어 승리'};
 }
 if(action==='defend'){
  if(uid!==battle.defender||!stances.includes(value))throw Error('현재 방어 선장만 포탑 방향을 조정할 수 있어요.');
  battle.stance=value;battle.liveDefense=true;
  battle.defenders=Math.min(10,game.militia?.posts?.[port]||0);
  return {message:'포탑 조준 방향을 바꿨어요.'};
 }
 if(action!=='attack'||uid!==battle.attacker||!['channel','outer','fire','hold'].includes(value))throw Error('공격 선장과 공방 행동을 확인하세요.');
 if(battle.lastMove&&now-battle.lastMove<5000)throw Error('다음 조작까지 5초 기다리세요.');
 battle.turn++;battle.lastMove=now;
 if(value==='fire')battle.fort=Math.max(0,battle.fort-25);
 else battle.capture+=value==='hold'?5:8;
 battle.ship=Math.max(0,battle.ship-(battle.fort>0?(value===battle.stance?32:value==='fire'?14:20):3));
 const goal=20-Math.min(2,Math.floor(battle.assigned/5)+(battle.training||0))+Math.min(2,Math.floor((battle.defenders||0)/5));
 if(!battle.ship||battle.capture>=goal){
  battle.state=battle.ship?'won':'defended';
  if(battle.ship){content.harborOperator={uid,name,until:now+7*DAY};delete content.harborDefense;}
  else if(game.militia)game.militia.escort=Math.max(0,game.militia.escort-Math.floor(Math.min(battle.assigned,game.militia.escort)*.2));
  content.harborCooldown=now+DAY;
 }
 return {message:battle.state==='won'?'공방 승리 · 운영권 7일':battle.state==='defended'?'공방 패배':'공방 진행 중'};
}
export function createHarborPractice(port,name,start){
 const uid='practice',game={port,militia:{escort:5}},content={};
 const simTime=battleWindow(start).start;
 harborBattleAction(game,content,uid,port,'start','',simTime,name);
 return {
  open:()=>({...content.harborMatch}),
  act:(value,now)=>harborBattleAction(game,content,uid,port,'attack',value,simTime+Math.max(0,now-start),name)
 };
}
export function militiaAction(game,content,uid,port,action,value,now){
 mustDock(game,port);
 const roster=game.militia??={escort:0,reserve:0,posts:{}};
 if(harborOperator(content,now)!==uid&&roster.posts[port]){roster.reserve+=roster.posts[port];delete roster.posts[port];}
 const day=Math.floor((now+9*HOUR)/DAY);
 if(content.harborMatch?.state==='active'&&content.harborMatch.end>now)throw Error('공방이 끝난 뒤 병력을 변경하세요.');
 if(action==='train'){
  if(roster.trainingDue>now)throw Error('훈련이 아직 끝나지 않았어요.');
  if(roster.trainingDue){game.crewTraining=Math.min(2,(game.crewTraining||0)+1);delete roster.trainingDue;return {message:'훈련 단계가 올랐어요.'};}
  if((game.crewTraining||0)>=2||game.money<2000)throw Error('훈련 단계와 두카트를 확인하세요.');
  game.money-=2000;roster.trainingDue=now+HOUR;return {message:'한 시간 훈련을 시작했어요.'};
 }
 if(!Number.isSafeInteger(value)||value<1||value>10)throw Error('인원을 1~10명으로 정하세요.');
 if(action==='hire'){
  const hired=roster.hireDay===day?roster.hired:0;
  const total=roster.escort+roster.reserve+Object.values(roster.posts).reduce((s,n)=>s+n,0);
  if(hired+value>10||total+value>30||game.money<value*100)throw Error('일일 10명·보유 30명·고용비를 확인하세요.');
  game.money-=value*100;roster.hireDay=day;roster.hired=hired+value;roster.reserve+=value;
 }else if(action==='escort'&&roster.reserve>=value&&roster.escort+value<=10){
  roster.reserve-=value;roster.escort+=value;
 }else if(action==='reserve'&&roster.escort>=value){
  roster.escort-=value;roster.reserve+=value;
 }else if(action==='station'&&harborOperator(content,now)===uid&&roster.reserve>=value&&(roster.posts[port]||0)+value<=10){
  roster.reserve-=value;roster.posts[port]=(roster.posts[port]||0)+value;
 }else if(action==='recall'&&(roster.posts[port]||0)>=value){
  roster.posts[port]-=value;roster.reserve+=value;
 }else throw Error('대기 병력·배치 한도와 운영권을 확인하세요.');
 return {message:'사병 장부를 갱신했어요.'};
}
