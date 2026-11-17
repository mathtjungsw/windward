import {requireCombatAllowed} from './blessings.js?v=2026.11.17-promoted-ports-and-content';
import {ownership} from './commerce.js?v=2026.11.17-promoted-ports-and-content';
import {advanceBasicIncome} from './port-income.js?v=2026.11.17-promoted-ports-and-content';
import {noviceActive} from './novice.js?v=2026.11.17-promoted-ports-and-content';

const HOUR=3600000, DAY=24*HOUR, WINDOW=2*HOUR;
export const CONTESTED_PORTS=['jamestown','georgetown-ascension','sanjuan-robinson','portvila'];
export const harborNames={jamestown:'제임스타운','georgetown-ascension':'조지타운','sanjuan-robinson':'산후안바우티스타',portvila:'포트빌라'};
const stances=['channel','outer','hold'];
export const HARBOR_RETURN_MS=60000;
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
export function harborBattleAction(game,content,uid,port,action,value,now,name,practice=false){
 const operator=harborOperator(content,now),battle=content.harborMatch,window=battleWindow(now);
 mustDock(game,port);
 if(action==='defense'){
  if(operator!==uid||!stances.includes(value))throw Error('항구 운영 선장의 방어 배치를 확인하세요.');
  content.harborDefense={uid,stance:value};
  return {message:'다음 공방의 포탑 배치를 저장했어요.'};
 }
 if(action==='start'){
  if(!practice)requireCombatAllowed(now);
  if(noviceActive(game))throw Error('초보 보호를 졸업하면 공개 공방에 도전할 수 있어요. 공방 연습은 이용할 수 있습니다.');
  if(!window.open||operator===uid||content.harborOperator?.until>now||content.harborCooldown>now||battle?.end>now&&battle.state==='active')throw Error('도전 가능한 시간과 항구 운영 상태를 확인하세요.');
  const assigned=Math.min(10,game.militia?.escort||0);
  content.harborMatch={attacker:uid,defender:operator||'',begin:now,end:Math.min(window.end,now+300000),state:'active',capture:0,ship:100,fort:100,turn:0,assigned,training:game.crewTraining||0,stance:content.harborDefense?.uid===operator?content.harborDefense.stance:'channel',attackName:name,connected:now};
  game.harborChallengePort=port;
  return {message:'공방을 시작했어요.'};
 }
 if(!battle||battle.state!=='active')throw Error('진행 중인 공방이 없어요.');
 if(now>=battle.end){
  battle.state='defended';content.harborCooldown=now+DAY;
  return {message:'제한 시간 종료 · 방어 승리'};
 }
 if(action==='defend'){
  if(uid!==battle.defender||!stances.includes(value))throw Error('현재 방어 선장만 포탑 방향을 조정할 수 있어요.');
  const officer=content.harborOfficer;
  const reload=officer?.role==='combat'&&officer.owner===uid&&operator===uid?4750:5000;
  if(battle.lastDefense&&now-battle.lastDefense<reload)throw Error('포탑을 다시 조준할 때까지 기다려 주세요.');
  battle.lastDefense=now;
  battle.stance=value;battle.liveDefense=true;
  battle.defenders=Math.min(10,game.militia?.posts?.[port]||0);
  return {message:'포탑 조준 방향을 바꿨어요.'};
 }
 if(action!=='attack'||uid!==battle.attacker||!['channel','outer','fire','hold'].includes(value))throw Error('공격 선장과 공방 행동을 확인하세요.');
 if(battle.lastMove&&now-battle.lastMove<5000)throw Error('다음 조작까지 5초 기다리세요.');
 attackTurn(battle,value,now);
 const goal=harborGoal(battle);
 if(!battle.ship||battle.capture>=goal){
  battle.state=battle.ship?'won':'defended';
  if(battle.ship){grantOperation(content,port,uid,name,now);}
  else if(game.militia)game.militia.escort=Math.max(0,game.militia.escort-Math.floor(Math.min(battle.assigned,game.militia.escort)*.2));
  content.harborCooldown=now+DAY;
 }
 return {message:battle.state==='won'?'공방 승리 · 운영권 7일':battle.state==='defended'?'공방 패배':'공방 진행 중'};
}
function grantOperation(content,port,uid,name,now){
 const owner=ownership(content).ownerUid;
 advanceBasicIncome(content,port,owner,now);
 content.harborOperator={uid,name,until:now+7*DAY};delete content.harborDefense;
 advanceBasicIncome(content,port,owner,now);
}
export const harborGoal=battle=>20-Math.min(2,Math.floor(battle.assigned/5)+(battle.training||0))+Math.min(2,Math.floor((battle.defenders||0)/5));
function attackTurn(battle,value,now){
 battle.turn++;
 battle.lastMove=now;
 battle.lastAction=value;
 if(value!=='fire')battle.course=value;
 const oldFort=battle.fort,oldShip=battle.ship;
 if(value==='fire')battle.fort=Math.max(0,battle.fort-25);
 else battle.capture=Math.min(harborGoal(battle),battle.capture+(value==='hold'?5:8));
 battle.ship=Math.max(0,battle.ship-(battle.fort>0?(value===battle.stance?32:value==='fire'?14:20):3));
 battle.shot={at:now,fort:oldFort-battle.fort,ship:oldShip-battle.ship};
}
export function harborPresenceOutcome(round,presence,now){
 if(!round||round.state!=='active'||!round.connected)return null;
 const participants=[round.attacker,...(round.liveDefense?[round.defender]:[])];
 const missing=participants.filter(uid=>now-Math.max(round.connected,presence[uid]?.at||0)>=HARBOR_RETURN_MS);
 if(!missing.length)return now>=round.end?{winner:round.defender,reason:'time'}:null;
 if(missing.length===participants.length&&participants.length>1)return {winner:'',reason:'abandoned'};
 if(participants.length>1&&participants.some(uid=>!missing.includes(uid)&&now-Math.max(round.connected,presence[uid]?.at||0)>=25000))return null;
 return {winner:missing.includes(round.attacker)?round.defender:round.attacker,reason:'forfeit'};
}
export function settleHarborConnection(game,content,uid,port,presence,now,name){
 mustDock(game,port);
 const battle=content.harborMatch;
 if(!battle||![battle.attacker,battle.defender].includes(uid))throw Error('공방 참가 선장만 종료를 확인할 수 있어요.');
 const result=harborPresenceOutcome(battle,presence,now);
 if(!result)return {noWrite:true,quiet:true};
 battle.state=result.reason==='abandoned'?'void':result.winner===battle.attacker?'won':'defended';
 battle.reason=result.reason;
 content.harborCooldown=now+DAY;
 if(battle.state==='won'){
  grantOperation(content,port,battle.attacker,battle.attackName||name,now);
 }
 if(result.reason==='forfeit'&&battle.state==='defended'){
  const loss=Math.floor((battle.assigned||0)*.2);
  if(loss&&uid===battle.attacker&&game.militia)game.militia.escort=Math.max(0,(game.militia.escort||0)-loss);
  else if(loss)(content.harborLosses??={})[battle.attacker]=(content.harborLosses[battle.attacker]||0)+loss;
 }
 return {message:result.reason==='abandoned'?'양측 미복귀 · 공방 무효':result.reason==='forfeit'?'미복귀로 공방 종료':'시간 종료 · 방어 승리'};
}
export function reconcileHarborLoss(game,content,uid){
 const loss=content.harborLosses?.[uid];
 if(!loss)return {noWrite:true,quiet:true};
 if(game.militia)game.militia.escort=Math.max(0,(game.militia.escort||0)-loss);
 delete content.harborLosses[uid];
 return {message:'지난 항구 공방의 호위 손실을 반영했어요.'};
}
export function harborPracticeAction(game,content,uid,port,action,value,now,presence={}){
 mustDock(game,port);
 let match=content.harborPractice;
 const participant=match&&[match.attacker,match.defender].includes(uid);
 if(action==='invite'){
  if(typeof value!=='string'||!value||value===uid||match&&(match.state==='active'||['invited','ready'].includes(match.state)&&match.expires>now))throw Error('초대할 선장과 이 항구의 연습 상태를 확인하세요.');
  content.harborPractice={attacker:uid,defender:value,expires:now+120000,state:'invited'};
  return {message:'공방 연습 초대를 보냈어요.'};
 }
 if(!participant)throw Error('이 연습의 초대 선장만 참가할 수 있어요.');
 if(action==='finish'){
  const result=harborPresenceOutcome(match,presence,now);
  if(!result)return {noWrite:true,quiet:true};
  match.state=result.reason==='abandoned'?'void':result.winner===match.attacker?'won':'defended';
  Object.assign(match,result);
  return {message:'연습 결과를 기록했어요.'};
 }
 if(match.state==='invited'||match.state==='ready'){
  if(match.expires<=now)throw Error('초대 시간이 끝났어요.');
  if(action==='cancel'){match.state='cancelled';return {message:'연습을 취소했어요.'};}
  if(match.state==='invited'&&action==='accept'&&match.defender===uid){
   match.state='ready';match.expires=now+120000;
   return {message:'초대를 수락했어요. 두 선장이 준비를 누르면 시작합니다.'};
  }
  if(match.state==='ready'&&action==='ready'){
   match[uid===match.attacker?'attackerReady':'defenderReady']=true;
   if(match.attackerReady&&match.defenderReady)
    Object.assign(match,{state:'active',begin:now,connected:now,end:now+300000,ship:100,fort:100,turn:0,capture:0,assigned:5,defenders:5,stance:'channel',liveDefense:true});
   return {message:match.state==='active'?'항구 공방 연습을 시작했어요.':'준비했어요.'};
  }
 }
 if(match.state!=='active'||now>=match.end)throw Error('현재 진행 중인 연습을 확인하세요.');
 if(action==='defend'&&uid===match.defender&&stances.includes(value)){
  if(match.lastDefense&&now-match.lastDefense<5000)throw Error('포탑을 다시 조준할 때까지 기다려 주세요.');
  match.lastDefense=now;match.stance=value;return {message:'포탑 방향을 바꿨어요.'};
 }
 if(action!=='attack'||uid!==match.attacker||!['channel','outer','fire','hold'].includes(value))throw Error('내가 맡은 쪽의 행동을 골라 주세요.');
 if(match.lastMove&&now-match.lastMove<5000)throw Error('다음 조작까지 5초 기다리세요.');
 attackTurn(match,value,now);
 if(!match.ship||match.capture>=harborGoal(match)){
  match.state=match.ship?'won':'defended';match.winner=match.ship?match.attacker:match.defender;match.reason=match.ship?'capture':'ship';
 }
 return {message:'공방 연습 진행 중'};
}
export function createHarborPractice(port,name,start){
 const uid='practice',game={port,militia:{escort:5}},content={};
 const simTime=battleWindow(start).start;
 harborBattleAction(game,content,uid,port,'start','',simTime,name,true);
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
