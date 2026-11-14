import {seaSector} from './presence-core.js?v=2026.11.14-harbor-chart';
import {cannonStats,currentHP} from './cannons.js?v=2026.11.14-harbor-chart';
import {fleetMaxHP} from './ship-rules.js?v=2026.11.14-harbor-chart';
import {combatProfile,openBattle,fireCannon,settlementFor,cargoCount,addCargo} from './combat-core.js?v=2026.11.14-harbor-chart';
import {mapDistance} from './world-wrap.js?v=2026.11.14-harbor-chart';
import {refundCanalTolls} from './canal-reservations.js?v=2026.11.14-harbor-chart';
const copy=o=>structuredClone(o||{}),cargo=json=>JSON.parse(json||'{}');
export const emptyDefenseAck=()=>({seq:0,cash:0,kills:0,lootJSON:'{}',lostReserveId:''});
function cargoDifference(total,claimed){const out={};for(const [id,c]of Object.entries(total)){const old=claimed[id]||{qty:0,cost:0},qty=c.qty-old.qty,cost=c.cost-old.cost;if(qty<0||cost<-.0001)throw Error('전투 정산 순서가 맞지 않아요.');if(qty)out[id]={qty,cost:Math.max(0,cost)};}return out;}
export function mergeDefense(game,node,now=Date.now()){
 if(!node)return false;const ack=game.defenseAck||emptyDefenseAck();if(node.seq<ack.seq)throw Error('전투 장부가 이전 기록이에요.');if(node.seq===ack.seq){if(game.raidId&&!node.activeRaidId){delete game.raidId;return true;}return false;}
 const cash=node.cashTotal-ack.cash,kills=node.killsTotal-ack.kills;if(cash<0||kills<0)throw Error('전투 정산 기록이 맞지 않아요.');
 game.money+=cash;const loot=cargoDifference((node.lootTotals||{}),cargo(ack.lootJSON));game.lootClaims??={};addCargo(game.lootClaims,loot);if(cargoCount(game.lootClaims)>50)throw Error('전리품 보관 한도를 확인하세요.');
 game.hullHP=node.hp;for(const g of game.cannons||[]){const used=Object.values(node.guns||{}).find(p=>p.id===g.id);if(used)g.readyAt=Math.max(g.readyAt,used.readyAt);}
 if(kills){game.rankProgress??={version:1,since:now,pirateKills:0,fleetDefeats:0,duelWins:0,tradedGoods:game.boughtLisbonWine?['wine']:[],bestTradeProfit:0};game.rankProgress.fleetDefeats+=kills;}
 if(node.lostReserveId&&node.lostReserveId!==ack.lostReserveId){if(game.battleReserve?.id===node.lostReserveId)delete game.battleReserve;addCargo(game.cargo,copy(node.returnedCargo));const repair=Math.min(game.money,node.repair||0);game.money-=repair;game.hullHP=fleetMaxHP(game);game.offlineRescuePending=true;refundCanalTolls(game);game.voyage=null;game.port=null;if(game.shoreTrip?.beach)delete game.shoreTrip;game.defeatProtectionUntil=now+120000;}
 game.defenseAck={seq:node.seq,cash:node.cashTotal,kills:node.killsTotal,lootJSON:JSON.stringify(node.lootTotals||{}),lostReserveId:node.lostReserveId||''};
 if(node.activeRaidId)game.raidId=node.activeRaidId;else delete game.raidId;
 return true;
}
export function defenseFromGame(game,old={},meta={},now=Date.now()){
 const ack=game.defenseAck||emptyDefenseAck();if((old.seq||0)!==ack.seq)throw Error('새 전투 결과를 먼저 반영하세요.');
 const unbound={...game,port:null,defeatProtectionUntil:0};delete unbound.raidId;const profile=combatProfile(unbound,meta.name||old.name||'선장',now,meta.nav),guns=Object.fromEntries(profile.guns.map((g,slot)=>[g.id,{...g,slot}]));
 return {...(profile.skill?{skill:profile.skill}:{}),version:1,positionSeq:old.positionSeq||0,revision:(old.revision||0)+1,seq:old.seq||0,name:profile.name,session:meta.session||old.session||'',saveRevision:meta.saveRevision||old.saveRevision||0,sector:seaSector(old.positionSeq?old.point:game.position),point:old.positionSeq?[...old.point]:[...game.position],portId:old.positionSeq?old.portId:game.port||'',hp:profile.hp,maxHP:profile.maxHP,gunCount:profile.guns.length,guns,bank:game.battleReserve?{...copy(game.battleReserve),cargo:cargo(game.battleReserve.cargoJSON)}:null,repair:profile.repair,protected:profile.protected||!!game.battleId||!!game.offlineRescuePending,protectedUntil:game.defeatProtectionUntil||0,lootRoom:Math.max(0,50-cargoCount(game.lootClaims)),pendingLootCount:cargoCount(cargoDifference(old.lootTotals||{},cargo(ack.lootJSON))),cashTotal:old.cashTotal||0,killsTotal:old.killsTotal||0,lootTotals:copy(old.lootTotals),claimedLootJSON:ack.lootJSON||'{}',lostReserveId:old.lostReserveId||'',returnedCargo:copy(old.returnedCargo),rescuePending:!!game.offlineRescuePending,lastRaidId:old.lastRaidId||'',activeRaidId:game.raidId||'',raidUntil:game.raidId?old.raidUntil||now+180000:0,at:now};
}
export function targetProfile(node,now){const pending=node.pendingLootCount??cargoCount(cargoDifference((node.lootTotals||{}),cargo(node.claimedLootJSON)));return {...(node.skill?{skill:node.skill}:{}),name:node.name,point:[...node.point],hp:node.hp,maxHP:node.maxHP,guns:Object.values(node.guns||{}).sort((a,b)=>a.slot-b.slot),at:now,protected:node.protected||!!node.portId||node.rescuePending||now<node.protectedUntil||node.hp<=0||!node.bank,lootRoom:Math.max(0,node.lootRoom-pending),repair:node.repair};}
export function openOfflineRaid(game,node,attacker,defender,id,now,clear=()=>true,attackerNode=null){
 if(node.activeRaidId&&node.raidUntil>now)throw Error('이 배는 이미 교전 중이에요.');const a=combatProfile(game,attacker.name,now);if(attackerNode?.skill)a.skill=attackerNode.skill;const b=targetProfile(node,now);if(node.session!==defender.session)throw Error('상대 배의 접속 상태가 바뀌었어요.');
 const room=openBattle('free',attacker.uid,defender.uid,{[attacker.uid]:a,[defender.uid]:b},{[attacker.uid]:copy(game.battleReserve),[defender.uid]:copy(node.bank)},now,clear);Object.assign(room,{id,offline:true,defender:defender.uid,defenderSession:node.session,events:[]});game.raidId=id;
 return {room,node:{...copy(node),activeRaidId:id,raidUntil:room.deadline}};
}
export function advanceOfflineRaid(game,room,node,uid,action,now,rolls=[0,0],clear=()=>true,attackerState=null){
 if(![room.a,room.b].includes(uid)||!room.offline||room.status!=='active')throw Error('진행 중인 내 교전이 아니에요.');
 const defender=room.defender,attacker=room.a,opponent=uid===room.a?room.b:room.a,valid=node.activeRaidId===room.id;
 const states={[attacker]:copy(attackerState||defenseFromGame(game,{seq:game.defenseAck?.seq||0}, {name:room.players[attacker].name,session:'test'},now)),[defender]:copy(node)};room.events=[];
 if(!valid||now>=room.deadline||action.kind==='draw'){if(now<room.deadline&&valid)throw Error('아직 교전 시간이 남았어요.');room.status='draw';room.reason='시간 종료 · 미격파 무승부';}
 else if(action.kind==='retreat'){room.status='closed';room.winner=uid===room.a?room.b:room.a;room.loser=uid;room.reason='후퇴';}
 else{
  const positions={[attacker]:{point:[...states[attacker].point],at:now},[defender]:{point:[...node.point],at:now}};
  const shoot=(actor,id,roll)=>{const result=fireCannon(room,actor,id,now,roll,positions,clear);room.events.push(copy(room.event));room.players[actor===room.a?room.b:room.a].wasAttacked=true;return result;};
  if(action.kind==='fire'){shoot(uid,action.gunId,rolls[0]);if(room.status==='active'&&action.autoDefense){const gun=(room.players[opponent].guns||[]).find(g=>(g.readyAt||0)<=now);if(gun)shoot(opponent,gun.id,rolls[1]);}}
  else if(action.kind==='auto'){if(!action.autoDefense||!room.players[opponent].wasAttacked)throw Error('자동 반격 권한이 없어요.');const gun=(room.players[opponent].guns||[]).find(g=>(g.readyAt||0)<=now);if(!gun)throw Error('상대 대포는 재장전 중이에요.');shoot(opponent,gun.id,rolls[0]);}
  else throw Error('전투 행동을 확인하세요.');
 }
 const changed={};
 for(const who of [attacker,defender]){const n=states[who],belongs=who===defender?valid:(!n.activeRaidId||n.activeRaidId===room.id||n.raidUntil<=now);if(!belongs)continue;changed[who]=true;n.lastRaidId=room.id;n.revision++;n.seq++;n.hp=room.players[who].hp;n.guns=Object.fromEntries((room.players[who].guns||[]).map((g,slot)=>[g.id,{...copy(g),slot}]));n.activeRaidId=room.status==='active'?room.id:'';n.raidUntil=room.status==='active'?room.deadline:0;
  if(room.status==='closed'){const result=settlementFor(room)[who];if(room.winner===who){n.cashTotal+=room.reserves[room.loser].money;const loot=copy(n.lootTotals);addCargo(loot,result.loot);n.lootTotals=loot;n.pendingLootCount=(n.pendingLootCount||0)+cargoCount(result.loot);if(room.players[room.loser].hp===0)n.killsTotal++;}else{n.lostReserveId=room.reserves[who].id;n.returnedCargo=copy(result.cargo);n.rescuePending=true;n.hp=0;n.protected=true;}}
 }
 if(room.status==='closed')room.claimed={[attacker]:true,[defender]:true};
 if(changed[uid])mergeDefense(game,states[uid],now);
 if(room.status!=='active')delete game.raidId;else game.raidId=room.id;
 return {ok:true,room,node:states[defender],actorNode:states[attacker],changedTarget:!!changed[defender],changedActor:!!changed[attacker],broken:!!states[uid].rescuePending,message:room.status==='active'?(room.events.at(-1)?.text||'포격'):room.reason};
}
export function restoreNavigation(game,checkpoint,saveRevision){
 if(!checkpoint||checkpoint.baseRevision!==saveRevision||checkpoint.routeKey!==routeKey(game.voyage))return game;
 if(!Array.isArray(checkpoint.point)||checkpoint.point.length!==2||!checkpoint.point.every(Number.isFinite))throw Error('이동 체크포인트를 확인하세요.');
 game.position=[...checkpoint.point];game.day=checkpoint.day;game.food=checkpoint.food;game.port=checkpoint.portId||null;game.controlMode=checkpoint.controlMode||game.controlMode;
 if(game.voyage&&checkpoint.travelled!==null){
  const travelled=Math.min(game.voyage.total,checkpoint.travelled),delta=Math.max(0,travelled-game.voyage.travelled);
  const gear=game.rumorProgress?.distanceGear;
  if(!game.voyage.kind&&gear)for(const id of Object.keys(gear)){
    if(gear[id]<=delta)delete gear[id];
    else gear[id]-=delta;
  }
  game.voyage.travelled=travelled;game.voyage.foodRemaining=checkpoint.foodRemaining;
 }
 const a=atob(game.explored||''),bytes=Array.from(a,c=>c.charCodeAt(0));for(const [i,b]of checkpoint.exploredDelta||[])bytes[i]=(bytes[i]||0)|b;game.explored=btoa(String.fromCharCode(...bytes));
 return game;
}
export function routeKey(v){if(!v)return '';const text=JSON.stringify([v.kind||'',v.target,v.origin,v.path]);let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(36);}
export function navigationCheckpoint(game,record,seq){const base=JSON.parse(record.data),old=atob(base.explored||''),current=atob(game.explored||''),delta=[];for(let i=0;i<current.length;i++){const bits=current.charCodeAt(i)&~(old.charCodeAt(i)||0);if(bits)delta.push([i,bits]);}return {baseRevision:record.revision,routeKey:routeKey(game.voyage),seq,point:[...game.position],portId:game.port||'',controlMode:game.controlMode,day:game.day,food:game.food,travelled:game.voyage?.travelled??null,foodRemaining:game.voyage?.foodRemaining??0,exploredDelta:delta};}
