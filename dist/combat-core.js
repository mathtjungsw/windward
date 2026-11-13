import {shipyardVictory} from './historical-ships.js?v=2026.11.14-supply-storage';
import {recordGuildObjective} from './guild-contracts.js?v=2026.11.14-supply-storage';
import {activeOfficer,gearOnShip,addOfficerExperience} from './rumor-progress.js?v=2026.11.14-supply-storage';
import {officerSnapshot,officerCombatEffect} from './officer-combat.js?v=2026.11.14-supply-storage';
import {PIRATE_ZONES} from './pirate-catalog.js?v=2026.11.14-supply-storage';
import {recordPirateKill,recordBattleWin} from './rank-progress.js?v=2026.11.14-supply-storage';
import {cannonStats,currentHP} from './cannons.js?v=2026.11.14-supply-storage';
import {fleetMaxHP,fleetAppraisal,fleetShips} from './ship-rules.js?v=2026.11.14-supply-storage';
import {mapDistance} from './world-wrap.js?v=2026.11.14-supply-storage';
import {currentCanal} from './canal-reservations.js?v=2026.11.14-supply-storage';
export const COMBAT_RANGE=180,COMBAT_TIMEOUT=180000,PROTECTION_MS=120000;
export function npcSlotChanges(game,uid,currentSlot){currentSlot??=null;const expected='npc:'+uid;if(currentSlot&&currentSlot!==expected)throw Error('선장 간 전투를 먼저 마치세요.');const next=game.npcBattle?expected:null;return currentSlot===next?{}:{['combatSlots/'+uid]:next};}
export {PIRATE_ZONES} from './pirate-catalog.js?v=2026.11.14-supply-storage';
const copy=o=>structuredClone(o||{});
export function splitCargo(cargo,limit){const taken={},rest={};for(const [id,c]of Object.entries(cargo||{}).sort(([a],[b])=>a.localeCompare(b))){const qty=Math.min(c.qty,Math.max(0,limit)),cost=c.qty?c.cost*qty/c.qty:0;if(qty)taken[id]={qty,cost};if(qty<c.qty)rest[id]={qty:c.qty-qty,cost:c.cost-cost};limit-=qty;}return {taken,rest};}
export const cargoCount=c=>Object.values(c||{}).reduce((n,c)=>n+c.qty,0);
export function addCargo(target,source){for(const [id,c]of Object.entries(source||{})){const old=target[id]||{qty:0,cost:0};target[id]={qty:old.qty+c.qty,cost:old.cost+c.cost};}}
const cargoAtRisk=game=>Math.floor(Math.min(5,Math.floor(cargoCount(game.cargo)*.1))*(1-(gearOnShip(game,game.flagshipId)?.cargoDefense||0)));
export function reserveLoss(game,id){if(game.battleReserve)throw Error('이미 보관 중인 전투 정산금이 있어요.');const money=Math.min(2000,Math.floor(game.money*.1)),qty=cargoAtRisk(game),{taken,rest}=splitCargo(game.cargo,qty);game.money-=money;game.cargo=rest;const reserve={id,money,cargoJSON:JSON.stringify(taken)};game.battleReserve=copy(reserve);return reserve;}
export const reserveCargo=r=>typeof r?.cargoJSON==='string'?JSON.parse(r.cargoJSON):r?.cargo||{};
export function returnReserve(game){const r=game.battleReserve;if(!r)return;game.money+=r.money;addCargo(game.cargo,reserveCargo(r));delete game.battleReserve;}
export function combatProfile(game,name,now,nav){const skill=officerSnapshot(game,nav);return {name,point:[...game.position],hp:currentHP(game),maxHP:fleetMaxHP(game),guns:(game.cannons||[]).filter(g=>g.shipId).map(g=>({...g})),...(skill?{skill}:{}),at:now,protected:!!game.port||!!game.depotDock||!!game.voyage?.kind||!!currentCanal(game.voyage)||!!game.npcBattle||!!game.raidId||!game.battleReserve||now<(game.defeatProtectionUntil||0),lootRoom:Math.max(0,50-cargoCount(game.lootClaims)),repair:Math.max(100,Math.min(3000,Math.ceil(fleetAppraisal(game)*.02)))};}
export function combatEligible(a,b,now,clear=()=>true){if(a.protected||b.protected)throw Error('항구·구조·전투 준비·패전 보호 상태에서는 공격할 수 없어요.');if(now-a.at>45000||now-b.at>45000)throw Error('접속 확인이 오래된 선장이에요.');if(mapDistance(a.point,b.point)>COMBAT_RANGE||!clear(a.point,b.point))throw Error('같은 바닷길의 시야 180해리 안에서 접근하세요.');}
export function openBattle(mode,a,b,profiles,reserves,now,clear){if(a===b||!['duel','free'].includes(mode))throw Error('대결 대상을 확인하세요.');combatEligible(profiles[a],profiles[b],now,clear);for(const id of [a,b]){const r=reserves[id];if(!r?.id||!Number.isInteger(r.money)||r.money<0||r.money>2000)throw Error('선장의 전투 정산 준비를 확인하세요.');let cargo;try{cargo=reserveCargo(r);}catch{throw Error('정산 보관 화물을 확인하세요.');}if(!cargo||typeof cargo!=='object'||Array.isArray(cargo)||cargoCount(cargo)>5||Object.values(cargo).some(c=>!Number.isInteger(c.qty)||c.qty<0||!Number.isFinite(c.cost)||c.cost<0))throw Error('정산 보관 화물을 확인하세요.');}const players={};for(const id of [a,b]){const p=copy(profiles[id]);players[id]={...p,hp:mode==='duel'?p.maxHP:p.hp,beforeHP:p.hp};}return {mode,a,b,status:'active',players,reserves:copy(reserves),createdAt:now,lastAt:now,deadline:now+COMBAT_TIMEOUT,sequence:0,claimed:{},event:{text:mode==='duel'?'합의 결투 시작 · 대포 성능 강화':'해상 전투 시작',at:now,sequence:0}};}
export function settleBattle(room,winner,now,reason='승부 결정'){if(room.status!=='active'||![room.a,room.b].includes(winner))throw Error('이미 정산된 전투예요.');const loser=winner===room.a?room.b:room.a,w=room.reserves[winner],l=room.reserves[loser],loot=splitCargo(reserveCargo(l),room.players[winner].lootRoom);room.status='closed';room.winner=winner;room.loser=loser;room.closedAt=now;room.reason=reason;return room;}
export function settlementFor(room,winner=room.winner){const loser=winner===room.a?room.b:room.a,w=room.reserves[winner],l=room.reserves[loser],loot=splitCargo(reserveCargo(l),room.players[winner].lootRoom);return {
 [winner]:{money:w.money+l.money,cargo:copy(reserveCargo(w)),loot:loot.taken,hp:room.mode==='duel'?room.players[winner].beforeHP:room.players[winner].hp,defeated:false},
 [loser]:{money:0,cargo:loot.rest,loot:{},hp:room.players[loser].maxHP,defeated:true}
};}
export function fireCannon(room,uid,gunId,now,roll,positions,clear=()=>true){
  if(room.status!=='active'||![room.a,room.b].includes(uid))throw Error('진행 중인 내 전투가 아니에요.');
  if(now>=room.deadline)throw Error('대결 시간이 끝났어요. 승부를 정산하세요.');
  const other=room.a===uid?room.b:room.a,p=room.players[uid],enemy=room.players[other];
  const gunIndex=(p.guns||[]).findIndex(g=>g.id===gunId),gun=p.guns?.[gunIndex];
  if(!gun)throw Error('장착한 대포를 선택하세요.');
  if(now<(gun.readyAt||0))throw Error('재장전 중이에요.');
  const a=positions[uid],b=positions[other],distance=a&&b?mapDistance(a.point,b.point):Infinity;
  if(!a||!b||now-a.at>45000||now-b.at>45000||distance>COMBAT_RANGE||!clear(a.point,b.point))throw Error('표적이 유효한 시야에서 벗어났어요.');
  const stats=cannonStats(gun,room.mode==='duel'),effect=officerCombatEffect(p.skill,{distance,hp:p.hp/p.maxHP,shots:p.shots,hits:p.hits}),defense=officerCombatEffect(enemy.skill).defense;
  const hit=roll*100<Math.min(95,stats.accuracy+effect.accuracy);
  const damage=hit?Math.min(enemy.hp,Math.round(stats.damage*(1+effect.damage)*(1-defense))):0;
  const reloadMS=Math.round(stats.reload*1000),bonusReload=Math.round(reloadMS*effect.reload);
  if(p.skill){p.shots=(p.shots||0)+1;p.hits=(p.hits||0)+Number(hit);}
  enemy.hp-=damage;gun.readyAt=now+reloadMS-bonusReload;room.sequence++;room.lastAt=now;
  room.event={sequence:room.sequence,actor:uid,kind:'shot',gunId,gunIndex,damagePotential:stats.damage,reloadMS,...(bonusReload?{bonusReload}:{}),hit,damage,at:now,text:hit?'명중 · '+damage+' 피해':'빗나감'};
  if(enemy.hp<=0)settleBattle(room,uid,now);
  return {ok:true,hit,damage,message:room.event.text};
}
export function finishExpired(room,uid,now,positions,surrender=false){if(room.status!=='active')throw Error('이미 종료됐어요.');const other=uid===room.a?room.b:room.a;if(![room.a,room.b].includes(uid))throw Error('참여자가 아니에요.');let winner;if(surrender)winner=other;else if(now-(positions[other]?.at||0)>45000)winner=uid;else if(now>=room.deadline){const a=room.players[room.a],b=room.players[room.b];winner=a.hp/a.maxHP>=b.hp/b.maxHP?room.a:room.b;}else throw Error('180초 경과 또는 상대 접속 종료 45초 뒤 정산할 수 있어요.');room.event={kind:'finish',actor:uid,surrender,at:now,sequence:room.sequence,text:surrender?'항복':'제한 시간·접속 판정'};settleBattle(room,winner,now,surrender?'항복':now>=room.deadline?'제한 시간 판정':'상대 접속 종료');return {ok:true,message:room.reason};}
export function claimBattle(game,room,uid,now){if(room.status!=='closed'||room.claimed?.[uid]||![room.a,room.b].includes(uid))throw Error('받을 전투 정산이 없어요.');if(game.battleReserve?.id!==room.reserves[uid].id)throw Error('보관 정산금이 일치하지 않아요. 원본 기록을 유지합니다.');const result=settlementFor(room)[uid];game.money+=result.money;addCargo(game.cargo,result.cargo);game.lootClaims??={};addCargo(game.lootClaims,result.loot);delete game.battleReserve;delete game.battleId;game.hullHP=result.hp;for(const g of game.cannons||[]){const used=room.players[uid].guns?.find(p=>p.id===g.id);if(used)g.readyAt=Math.max(g.readyAt||0,used.readyAt||0);}room.claimed??={};room.claimed[uid]=true;recordBattleWin(game,room,uid,now);if(result.defeated){const repair=Math.min(game.money,room.players[uid].repair);game.money-=repair;game.defeatProtectionUntil=now+PROTECTION_MS;}return {ok:true,broken:result.defeated,message:result.defeated?'패전 정산 완료 · 방문한 항구로 구조합니다.':'승리 정산 완료 · 획득 화물은 항구에서 수령하세요.'};}
export function defeatNPC(game,now){returnReserve(game);const money=Math.min(2000,Math.floor(game.money*.1)),qty=cargoAtRisk(game);game.money-=money;game.cargo=splitCargo(game.cargo,qty).rest;const repair=Math.min(game.money,Math.max(100,Math.min(3000,Math.ceil(fleetAppraisal(game)*.02))));game.money-=repair;game.hullHP=fleetMaxHP(game);game.defeatProtectionUntil=now+PROTECTION_MS;delete game.npcBattle;return {ok:true,broken:true,message:'패전 · 돈 '+money+' D와 화물 '+qty+'상자 손실 · 구조합니다.'};}
export function fireAtPirate(game,zoneId,gunId,now,rolls,clear=()=>true,coastDistance=()=>Infinity,riverAt=()=>null){
 const zone=PIRATE_ZONES.find(z=>z.id===zoneId);
 if(!zone||game.port||game.depotDock||game.voyage?.kind||currentCanal(game.voyage)||mapDistance(game.position,zone.point)>COMBAT_RANGE||!clear(game.position,zone.point))throw Error('해적선이 같은 바닷길의 시야 안에 있어야 해요.');
 if(now<(game.pirateRespawns?.[zoneId]||0))throw Error('이 해적은 토벌한 뒤 30분 동안 다시 나타나지 않아요.');
 if(game.npcBattle&&game.npcBattle.zoneId!==zoneId)throw Error('진행 중인 해적 전투를 마치세요.');
 const gun=game.cannons?.find(g=>g.id===gunId&&g.shipId);if(!gun||now<gun.readyAt)throw Error('장착 대포와 재장전 시간을 확인하세요.');
 const battle=game.npcBattle??={zoneId,hp:[100,240,500][zone.tier],readyAt:now+8000,shots:0,hits:0,skill:officerSnapshot(game,{coastAt:coastDistance,riverAt})};
 const stats=cannonStats(gun),officer=activeOfficer(game);
 const effect=officerCombatEffect(battle.skill,{npc:true,distance:mapDistance(game.position,zone.point),hp:currentHP(game)/fleetMaxHP(game),shots:battle.shots??1,hits:battle.hits??1});
 const accuracy=Math.min(95,stats.accuracy+effect.accuracy);
 const hit=rolls[0]*100<accuracy,damage=hit?Math.min(battle.hp,Math.round(stats.damage*(1+effect.damage))):0;
 gun.readyAt=now+Math.round(stats.reload*1000*(1-effect.reload));
 battle.hp-=damage;battle.shots=(battle.shots??1)+1;battle.hits=(battle.hits??1)+Number(hit);
 if(battle.hp<=0){const fame=Math.round([50,150,400][zone.tier]*(1+(officer?.pirateFame||0)));recordPirateKill(game,now);shipyardVictory(game,coastDistance(zone.point)<=180,zone);recordGuildObjective(game,'pirate',zoneId,now);addOfficerExperience(game,30+20*zone.tier);game.pirateFame=(game.pirateFame||0)+fame;game.pirateRespawns??={};game.pirateRespawns[zone.id]=now+1800000;delete game.npcBattle;return {ok:true,hit,damage,retaliation:{fired:false,damage:0},message:'해적 토벌! 명성 +'+fame,victory:true};}
 const retaliation={fired:now>=battle.readyAt,damage:0};
 if(retaliation.fired){
 const guard=!battle.turtleGuard&&fleetShips(game).some(v=>v.id===game.flagshipId&&v.kind==='turtle')?.25:0;
 retaliation.damage=rolls[1]<.65?Math.min(currentHP(game),Math.floor([12,24,40][zone.tier]*(1-effect.defense)*(1-guard))):0;if(guard&&retaliation.damage)battle.turtleGuard=true;game.hullHP=Math.max(0,currentHP(game)-retaliation.damage);battle.readyAt=now+8000;}
 if(currentHP(game)<=0)return {...defeatNPC(game,now),hit,damage,retaliation};
 return {ok:true,hit,damage,retaliation,message:(hit?'명중 · '+damage+' 피해':'빗나감')+(retaliation.damage?' / 해적 반격 '+retaliation.damage+' 피해':'')};
}
