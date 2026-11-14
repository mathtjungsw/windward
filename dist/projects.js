import {ACTIVE_PORT_BY_ID,DEPOT_SITES} from './data.js?v=2026.11.14-harbor-chart';
import {fleetCount,ship} from './ship-rules.js?v=2026.11.14-harbor-chart';
import {mapDistance} from './world-wrap.js?v=2026.11.14-harbor-chart';
import {autoSupplyShortfall,supplyRoom,tradingPort} from './engine.js?v=2026.11.14-harbor-chart';
import {activeOfficer,addOfficerExperience} from './rumor-progress.js?v=2026.11.14-harbor-chart';
import {pendingCanal,canalPassDiscount} from './canal-reservations.js?v=2026.11.14-harbor-chart';
import {initializeBasicIncome,estimateBasicIncome,claimBasicIncome} from './port-income.js?v=2026.11.14-harbor-chart';

const HOUR=3600000;
const depots=DEPOT_SITES.map(site=>({id:site.id,kind:'depot',name:site.name,site,cost:300000,duration:6*HOUR}));
const freight=[
  ['porto','wine',40,4800],['alexandria','timber',60,8400],['goa','cotton',60,8400],
  ['nagasaki','silk',80,13200],['havana','cacao',80,13200],['sydney','grain',80,11200]
].filter(([port])=>ACTIVE_PORT_BY_ID[port]).map(([port,good,goal,reward])=>({
  id:'freight-'+port,kind:'freight',name:ACTIVE_PORT_BY_ID[port].name+' 공동 수송',port,good,goal,reward
}));
export const CANALS=[
  {id:'canal-suez',kind:'canal',name:'수에즈 운하',cost:6000000,duration:12*HOUR,path:[[32.31,31.32],[32.31,30.85],[32.34,30.57],[32.38,30.28],[32.54,29.9]]},
  {id:'canal-panama',kind:'canal',name:'파나마 운하',cost:10000000,duration:24*HOUR,path:[[-79.914,9.415],[-79.916,9.276],[-79.803,9.152],[-79.677,9.097],[-79.562,8.87]]}
];
export const PROJECTS=[...freight,...depots,...CANALS];
export const PROJECT_BY_ID=Object.fromEntries(PROJECTS.map(p=>[p.id,p]));
const amountOf=(entries,uid)=>entries?.[uid]||0;
const totalOf=entries=>Object.values(entries||{}).reduce((total,n)=>total+n,0);
const status=(content,now)=>content.readyAt?now>=content.readyAt?'open':'building':'funding';
const atSea=(game)=>!game.port&&!game.voyage&&!game.shoreTrip&&!game.seaJob&&!game.raidId&&!game.battleId&&!game.npcBattle;
export const projectOwner=content=>{
  if(content.registeredCapital)return content.registeredOwner||null;
  const total=totalOf(content.investors);
  return Object.entries(content.investors||{}).find(([,n])=>2*n>total)?.[0]||null;
};
export function projectView(project,content,uid,now){
  if(project.kind==='freight'){
    const round=content.round||0,delivered=totalOf(content.deliveries);
    return {round,delivered,mine:amountOf(content.deliveries,uid),pledged:amountOf(content.pledges,uid),deadline:content.deadline||0,claimed:!!content.claimed?.[uid],status:delivered>=project.goal?'complete':content.deadline&&now>=content.deadline?'expired':'active'};
  }
  const owner=projectOwner(content);
  const phase=status(content,now);
  let base=0;
  if(project.kind==='depot'&&phase==='open'&&owner===uid){
    const preview={...content};
    initializeBasicIncome(preview,project.id,owner,Math.max(content.readyAt,content.baseCollectedAt||0));
    base=estimateBasicIncome(preview,project.id,uid,owner,now).accrued;
  }
  return {owner,raised:totalOf(content.investors),mine:amountOf(content.investors,uid),status:phase,readyAt:content.readyAt||0,stock:content.stock||0,toll:owner?content.toll||0:0,balance:amountOf(content.dividends,uid)+amountOf(content.activationDividends,uid)+base,base};
}
function consumeItem(game,id){
  if(!(game.rumorProgress?.items?.[id]>0))throw Error('사용할 증서가 가방에 없어요.');
  game.rumorProgress.items[id]--;
}
function apportion(reward,entries,uid,total){
  const ordered=Object.keys(entries).sort();
  let previous=0;
  for(const id of ordered){
    const next=previous+entries[id];
    if(id===uid)return Math.floor(reward*next/total)-Math.floor(reward*previous/total);
    previous=next;
  }
  return 0;
}
function freightAction(game,content,uid,project,action,requested,now){
  let view=projectView(project,content,uid,now);
  if(action==='renew'||action==='special'){
    if(!tradingPort(game))throw Error('항구 조합에서 의뢰를 여세요.');
    if(view.round&&view.status==='active')throw Error('현재 공동 수송이 진행 중이에요.');
    if(view.status==='complete'){
      const archive=content.history??={};
      if(Object.keys(archive).length>=52)throw Error('기존 보수 수령이 끝나면 새 의뢰를 열 수 있어요.');
      if(Object.keys(content.deliveries).some(id=>!content.claimed?.[id]))archive[view.round]={deliveries:content.deliveries,claimed:content.claimed||{},reward:content.reward||project.reward};
    }
    if(action==='special')consumeItem(game,'I047');
    Object.assign(content,{round:view.round+1,deadline:now+24*HOUR,reward:Math.round(project.reward*(action==='special'?1.25:1)),pledges:{},deliveries:{},claimed:{}});
    return {message:'공동 수송 의뢰를 열었어요.'};
  }
  if(action==='claim'){
    const old=Number(requested);
    const record=old===view.round&&view.status==='complete'?content:content.history?.[old];
    if(!record?.deliveries?.[uid]||record.claimed?.[uid])throw Error('아직 받을 공동 수송 보수가 없어요.');
    const base=apportion(record.reward||project.reward,record.deliveries,uid,project.goal);
    const reward=base+Math.floor(base*(activeOfficer(game)?.cooperativeBonus||0));
    (record.claimed??={})[uid]=true;
    if(record!==content&&Object.keys(record.deliveries).every(id=>record.claimed[id]))delete content.history[old];
    game.money+=reward;
    addOfficerExperience(game,45);
    (game.projectStats??={}).freight=(game.projectStats.freight||0)+1;
    return {message:'공동 수송 보수 '+reward.toLocaleString('ko-KR')+' D를 받았어요.',reward};
  }
  if(action==='join'){
    if(!tradingPort(game)||!view.round||view.status!=='active'||!Number.isSafeInteger(requested)||requested<=0)throw Error('마감 전에 항구 조합에서 맡을 수량을 입력하세요.');
    (content.pledges??={})[uid]=Math.max(view.mine,Math.min(requested,project.goal));
    return {message:content.pledges[uid]+'상자를 맡았어요. 보수는 실제 납품량으로 계산해요.'};
  }
  if(action!=='deliver'||tradingPort(game)?.id!==project.port||!view.round||view.status!=='active')throw Error('마감 전 목적 항구에 정박해 납품하세요.');
  const cargo=game.cargo[project.good],qty=Math.min(requested,project.goal-view.delivered,cargo?.qty||0);
  if(!Number.isSafeInteger(qty)||qty<=0)throw Error('납품할 화물과 수량을 확인하세요.');
  const left=cargo.qty-qty;
  if(left)game.cargo[project.good]={qty:left,cost:cargo.cost-Math.floor(cargo.cost*qty/cargo.qty)};
  else delete game.cargo[project.good];
  (content.deliveries??={})[uid]=view.mine+qty;
  if(view.pledged<view.mine+qty)(content.pledges??={})[uid]=view.mine+qty;
  return {message:qty+'상자를 공동 수송에 납품했어요.',qty};
}
const canalDay=now=>String(Math.floor((now+9*HOUR)/(24*HOUR)));
function recordCanalEntry(content,now,ships,amount){
 const day=canalDay(now),traffic=content.traffic??={};
 content.trafficSince??=now;
 for(const key of Object.keys(traffic))if(Number(key)<Number(day)-6)delete traffic[key];
 const row=traffic[day]??={entries:0,ships:0,paid:0,free:0,fees:0};
 row.entries++;row.ships+=ships;row.fees+=amount;
 if(amount)row.paid++;else row.free++;
}
export function canalLedger(content,uid,now){
 const day=Number(canalDay(now)),stats={entries:0,ships:0,paid:0,free:0,fees:0};
 for(const [key,row] of Object.entries(content.traffic||{}))if(+key>=day-6&&+key<=day)
  for(const field of Object.keys(stats))stats[field]+=row[field]||0;
 const total=totalOf(content.investors),principal=amountOf(content.investors,uid),
  balance=amountOf(content.dividends,uid),received=amountOf(content.collectedDividends,uid),
  remaining=Math.max(0,principal-balance-received),expected=stats.fees*(total?principal/total:0)/7;
 const days=expected>0&&stats.paid>=10&&content.trafficSince&&day-Number(canalDay(content.trafficSince))>=6?Math.ceil(remaining/expected):null;
 return {...stats,principal,balance,received,remaining,days,started:content.trafficSince||null};
}
function addDividend(content,amount){
  const investors=content.investors||{},total=totalOf(investors);
  if(!amount||!total)return;
  const ledger=content.dividends??={},remainder=content.dividendRemainders??={};
  for(const [uid,stake] of Object.entries(investors)){
    const units=amount*stake+amountOf(remainder,uid),whole=Math.floor(units/total);
    if(whole)ledger[uid]=amountOf(ledger,uid)+whole;
    remainder[uid]=units%total;
  }
}
export function depotAccess(game,project,nav){
  if(game.port===project.site.portId)return true;
  return atSea(game)&&mapDistance(game.position,project.site.point)<=10&&!!nav?.clear(game.position,project.site.point);
}
function depotRegistry(project,content){
  const owner=projectOwner(content),total=totalOf(content.investors);
  content.registeredCapital=total;
  content.registeredOwner=owner||'';
  return {id:project.id,kind:'depot',name:project.name,level:1,opensAt:content.readyAt,
    ownerUid:owner||'',ownerShare:owner?Math.floor(content.investors[owner]*10000/total)/100:0};
}
export function normalizeDepotDock(game){
  const depot=PROJECT_BY_ID[game.depotDock];
  if(depot?.kind!=='depot'||game.port||game.voyage||[depot.site.point,depot.site.previousPoint].every(p=>mapDistance(game.position,p)>.01)){
    delete game.depotDock;
    return;
  }
  if(ACTIVE_PORT_BY_ID[depot.id]){
    game.port=depot.id;
    game.position=[...depot.site.point];
    game.visited=[...new Set([...game.visited,depot.id])];
    game.knownPorts=[...new Set([...game.knownPorts,depot.id])];
    delete game.depotDock;
  }
}
export function canalAccess(game,project,nav){
  if(!atSea(game))return -1;
  return [project.path[0],project.path.at(-1)].findIndex(point=>mapDistance(game.position,point)<=6&&!!nav?.clear(game.position,point));
}
export const CANAL_DELIVERY={
 'canal-suez':{origin:'alexandria',target:'jeddah',good:'grain'},
 'canal-panama':{origin:'cartagena',target:'acapulco',good:'timber'}
};
const canalWeek=now=>Math.floor((now+9*HOUR+3*24*HOUR)/(7*24*HOUR));
export function canalDeliveryAction(game,content,uid,id,action,now){
 const offer=CANAL_DELIVERY[id],mission=game.canalMission,week=canalWeek(now);
 if(!offer||!game.port||game.voyage)throw Error('지정된 항구에 정박하세요.');
 if(action==='mission-cancel'){
  if(mission?.id!==id)throw Error('진행 중인 의뢰를 확인하세요.');
  delete game.canalMission;return {message:'운하 납품을 종료했어요.'};
 }
 if(action==='mission-accept'){
  if(mission||game.port!==offer.origin||game.canalMissionWeeks?.[id]===week)throw Error('출발 항구에서 이번 주 의뢰를 확인하세요.');
  game.canalMission={id,deadline:now+48*HOUR,passed:false};
  return {message:'운하 경유 납품을 수락했어요.'};
 }
 if(mission?.id!==id||!mission.passed||now>=mission.deadline||game.port!==offer.target||game.canalMissionWeeks?.[id]===week)throw Error('지정 운하 완주·목적지와 납품 기한을 확인하세요.');
 const cargo=game.cargo[offer.good],quantity=10;
 if(!cargo||cargo.qty<quantity)throw Error('납품 물품 10상자가 필요해요.');
 if(cargo.qty===quantity)delete game.cargo[offer.good];
 else game.cargo[offer.good]={qty:cargo.qty-quantity,cost:cargo.cost*(cargo.qty-quantity)/cargo.qty};
 game.money+=1800;
 (game.canalMissionWeeks??={})[id]=week;delete game.canalMission;
 if(content.activation?.week!==week)content.activation={week,captains:{},awarded:false};
 const log=content.activation;
 log.captains[uid]=true;
 if(!log.awarded&&Object.keys(log.captains).length>=3){
  const funding=totalOf(content.investors);
  if(funding){const payouts=content.activationDividends??={};
   for(const [investor,stake] of Object.entries(content.investors)){
    const amount=Math.floor(3000*stake/funding);if(amount)payouts[investor]=(payouts[investor]||0)+amount;
   }
  }
  log.awarded=true;
 }
 return {message:'운하 경유 납품 완료 · 1,800 D 수령'};
}
export function projectAction(game,content,uid,id,action,requested,now,nav){
  const project=PROJECT_BY_ID[id];
  if(!project)throw Error('등록된 공동 사업을 확인하세요.');
  if(project.kind==='freight')return freightAction(game,content,uid,project,action,requested,now);
  const view=projectView(project,content,uid,now);
  if(project.kind==='canal'&&view.status==='open'&&['mission-accept','mission-report','mission-cancel'].includes(action))return canalDeliveryAction(game,content,uid,id,action,now);
  if(action==='invest'){
    if(!tradingPort(game)||view.status!=='funding'||!Number.isSafeInteger(requested)||requested<=0||requested%10000)throw Error('항구에서 공사 시작 전 10,000 D 단위로 투자하세요.');
    const remaining=project.cost-view.raised-(content.materialCredit||0);
    const assistance=project.kind==='depot'?activeOfficer(game)?.developmentDiscount||0:0;
    const gross=Math.min(requested,remaining),credit=Math.min(Math.floor(gross*assistance),remaining-1);
    const accepted=gross-credit;
    if(accepted<=0||accepted>game.money)throw Error('투자할 두카트나 사업의 남은 금액을 확인하세요.');
    game.money-=accepted;
    (content.investors??={})[uid]=view.mine+accepted;
    if(credit){
      content.materialCredit=(content.materialCredit||0)+credit;
      (content.assistedMaterials??={})[uid]=amountOf(content.assistedMaterials,uid)+credit;
    }
    if(view.raised+accepted+(content.materialCredit||0)>=project.cost){
      content.startedAt=now;
      content.readyAt=now+project.duration;
      if(project.kind==='depot'){
        content.stock=400;
        return {message:accepted.toLocaleString('ko-KR')+' D를 투자해 보급항 공사를 시작했어요.',accepted,registry:depotRegistry(project,content)};
      }
    }
    return {message:accepted.toLocaleString('ko-KR')+' D를 투자했어요.',accepted};
  }
  if(action==='refund'){
    if(view.status!=='funding'||!view.mine)throw Error('공사 시작 전 본인 투자금만 회수할 수 있어요.');
    game.money+=view.mine;
    delete content.investors[uid];
    const credit=amountOf(content.assistedMaterials,uid);
    if(credit){content.materialCredit-=credit;delete content.assistedMaterials[uid];}
    return {message:'투자금을 돌려받았어요.'};
  }
  if(action==='dividend'){
    if(!view.balance)throw Error('받을 수 있는 수입이 없어요.');
    game.money+=view.balance;
    const tollShare=amountOf(content.dividends,uid);
    if(content.dividends)delete content.dividends[uid];
    if(content.activationDividends)delete content.activationDividends[uid];
    if(project.kind==='canal'&&tollShare){const received=content.collectedDividends??={};received[uid]=(received[uid]||0)+tollShare;}
    let registry;
    if(view.base){
      if(project.kind==='depot'&&!content.registeredCapital&&view.raised+(content.materialCredit||0)===project.cost)registry=depotRegistry(project,content);
      initializeBasicIncome(content,id,view.owner,Math.max(content.readyAt,content.baseCollectedAt||0));
      claimBasicIncome(content,id,uid,view.owner,now);
      delete content.baseCollectedAt;
    }
    return {message:view.balance.toLocaleString('ko-KR')+' D를 수령했어요.',...(registry?{registry}:{})};
  }
  if(action==='materials'){
    const credit=Math.min(500,project.cost-view.raised-(content.materialCredit||0)-1);
    if(view.status!=='funding'||credit<=0)throw Error('할인할 공사비가 없어요.');
    consumeItem(game,'I049');
    content.materialCredit=(content.materialCredit||0)+credit;
    return {message:credit+' D 상당의 건설 자재를 보냈어요.'};
  }
  if(action==='dredge'){
    if(project.kind!=='canal'||view.status!=='building'||content.dredged)throw Error('공사 중인 운하에 한 번 사용할 수 있어요.');
    consumeItem(game,'I051');
    content.dredged=true;
    content.readyAt-=Math.floor((content.readyAt-now)*.1);
    return {message:'운하의 남은 공사 시간이 10% 줄었어요.'};
  }
  if(view.status!=='open')throw Error('공사가 완료된 뒤 이용하세요.');
  if(action==='register'){
    if(project.kind!=='depot'||content.registeredCapital)throw Error('항구 등록 상태를 확인하세요.');
    if(view.raised+(content.materialCredit||0)!==project.cost)throw Error('보급항 공사 원장을 확인하세요.');
    return {message:'완공한 보급항을 해도에 등록했어요.',registry:depotRegistry(project,content)};
  }
  if(action==='dock'){
    if(project.kind!=='depot'||!depotAccess(game,project,nav)||game.port&&game.port!==id)throw Error('보급항에서 10해리 안으로 접근해 배를 멈추세요.');
    if(ACTIVE_PORT_BY_ID[id]){
      game.port=id;
      game.visited=[...new Set([...game.visited,id])];
      game.knownPorts=[...new Set([...game.knownPorts,id])];
      delete game.depotDock;
    }else game.depotDock=id;
    game.position=[...project.site.point];
    return {message:project.name+' 정박 · 정박 중 공격받지 않아요.'};
  }
  if(action==='toll'){
    if(project.kind!=='canal'||view.owner!==uid||!Number.isSafeInteger(requested)||requested<0||requested>300)throw Error('운하 운영자가 척당 0~300 D를 설정할 수 있어요.');
    content.toll=requested;
    return {message:'운하 통행료를 변경했어요.'};
  }
  if(action==='passage'){
    const voyage=game.voyage,passage=pendingCanal(voyage);
    if(project.kind!=='canal'||passage?.id!==id||voyage.travelled+1e-6<passage.start||voyage.travelled>=passage.end||!Number.isSafeInteger(passage.amount)||passage.amount<0||passage.amount>1500)throw Error('예약한 운하 입구와 통행료를 확인하세요.');
    passage.paid=true;
    addDividend(content,passage.amount);
    recordCanalEntry(content,now,fleetCount(game),passage.amount);
    return {message:project.name+' 진입 · 예약 요금 '+passage.amount+' D'};
  }
  if(action==='stock'||action==='supply'||action==='auto-supply'){
    if(project.kind!=='depot'||game.depotDock!==id&&game.port!==project.site.portId||!depotAccess(game,project,nav))throw Error('보급소에 정박한 뒤 이용하세요.');
    if(action==='stock'){
      if(view.stock>990)throw Error('창고가 가득 찼어요.');
      consumeItem(game,'I053');
      content.stock=view.stock+10;
      return {message:'창고에 한 척의 보급 10일분을 더했어요.'};
    }
    const ships=fleetCount(game),automatic=action==='auto-supply',affordable=automatic?Math.floor(game.money/(ships*4)):Infinity;
    const days=Math.min(requested,automatic?Math.floor(autoSupplyShortfall(game)):Infinity,affordable,Math.floor(supplyRoom(game)),Math.floor(ship(game).supply-game.food),Math.floor(view.stock/ships)),units=days*ships,cost=units*4;
    if(automatic&&days<=0)return {quiet:true,noWrite:true};
    if(!Number.isSafeInteger(days)||days<=0||game.money<cost)throw Error('보급 공간과 재고, 두카트를 확인하세요.');
    game.money-=cost;
    game.food+=days;
    content.stock=view.stock-units;
    addDividend(content,cost);
    return {message:'선단 보급 '+days+'일분 · '+cost+' D',days,cost};
  }
  if(action==='transit'){
    if(project.kind!=='canal'||!nav)throw Error('운하 입구를 확인하세요.');
    const entrance=canalAccess(game,project,nav);
    if(entrance<0)throw Error('운하 입구 6해리 안에서 배를 멈추세요.');
    const toll=view.toll*fleetCount(game),discount=canalPassDiscount(game,id,toll);
    const result=requested({entrance,toll:toll-discount,listedToll:view.toll});
    if(game.money<toll-discount)throw Error('통행료를 낼 두카트가 부족해요.');
    if(discount)consumeItem(game,'I052');
    game.money-=toll-discount;
    game.voyage=result;
    addDividend(content,toll-discount);
    recordCanalEntry(content,now,fleetCount(game),toll-discount);
    return {message:project.name+' 통행을 시작했어요.',toll:toll-discount};
  }
  throw Error('지원하지 않는 공동 사업 행동이에요.');
}
