import {shipyardReport} from './historical-ships.js?v=2026.11.13-stories-harbors-tax.1';
import {DISCOVERIES,DISCOVERY_BY_ID} from './discoveries-catalog.js?v=2026.11.13-stories-harbors-tax.1';
import {PIRATE_ZONES} from './pirate-catalog.js?v=2026.11.13-stories-harbors-tax.1';
import {mapDistance} from './world-wrap.js?v=2026.11.13-stories-harbors-tax.1';
import {PORT_BY_ID,GOODS} from './data.js?v=2026.11.13-stories-harbors-tax.1';

import {activeOfficer,couponAmount,consumeCoupon,addOfficerExperience} from './rumor-progress.js?v=2026.11.13-stories-harbors-tax.1';

const HOUR=3600000;
export const GUILD_TYPES=[
  {hours:.5,qty:5,fame:5,limit:450,label:'연안 위탁 수송'},
  {hours:6,qty:12,fame:15,limit:1200,label:'지역 위탁 수송'},
  {hours:24,qty:24,fame:30,limit:3500,label:'장거리 위탁 수송'},
  {hours:6,qty:0,fame:15,label:'발견물 조사 보고',kind:'survey',limit:700},
  {hours:24,qty:0,fame:30,label:'해적 토벌 보고',kind:'pirate',limit:950},
  {hours:.5,qty:0,fame:5,label:'일반 상품 납품',kind:'delivery',limit:450}
];
const okPort=id=>Object.hasOwn(PORT_BY_ID,id);
const pirates=Object.fromEntries(PIRATE_ZONES.map(zone=>[zone.id,zone]));
const byId=(origin,target,tier,objective)=>origin+':'+target+':'+tier+(objective?':'+objective:'');
export function guildObjective(row){
  const type=GUILD_TYPES[row.tier];
  if(type?.kind==='survey')return Object.hasOwn(DISCOVERY_BY_ID,row.objective)?DISCOVERY_BY_ID[row.objective]:null;
  if(type?.kind==='pirate')return Object.hasOwn(pirates,row.objective)?pirates[row.objective]:null;
  return null;
}
export const isGuildReport=tier=>['survey','pirate'].includes(GUILD_TYPES[tier]?.kind);
const validGood=id=>Object.hasOwn(GOODS,id)&&!GOODS[id].legacy&&!GOODS[id].premium;
const eligibleProof=row=>Number.isSafeInteger(row.proofAt)&&row.proofAt>=row.acceptedAt&&row.proofAt<=row.deadline;
const freeToWork=s=>!!s.port&&!PORT_BY_ID[s.port]?.depot&&!s.voyage&&!s.shoreTrip&&!s.battleId&&!s.npcBattle&&!s.raidId;
export function normalizeGuild(game){
  const old=game.guild;
  if(!old||typeof old!=='object'){delete game.guild;return;}
  const active=[];
  for(const row of Array.isArray(old.active)?old.active:[]){
    const type=GUILD_TYPES[row?.tier];
    if(!type||!okPort(row.origin)||!okPort(row.target))continue;
    const report=isGuildReport(row.tier), delivery=type.kind==='delivery';
    if(report?(row.origin!==row.target||!guildObjective(row)):row.origin===row.target)continue;
    if(delivery&&(!validGood(row.good)||!Number.isSafeInteger(row.qty)||row.qty<5||row.qty>10))continue;
    if(row.id!==byId(row.origin,row.target,row.tier,report?row.objective:delivery?row.good:null))continue;
    if(!Number.isSafeInteger(row.deadline)||row.deadline<0||row.deadline>8640000000000000||!Number.isSafeInteger(row.reward)||row.reward<100||row.reward>4000)continue;
    if(active.length>=3||active.some(x=>x.id===row.id))continue;
    const clean={id:row.id,origin:row.origin,target:row.target,tier:row.tier,deadline:row.deadline,reward:row.reward,extended:row.extended===true};
    if(Number.isSafeInteger(row.storyBonus)&&row.storyBonus>=0&&row.storyBonus<=200)clean.storyBonus=row.storyBonus;
    if(!type.kind&&['I041','I043','I061'].includes(row.variant))clean.variant=row.variant;
    if(delivery)Object.assign(clean,{good:row.good,qty:row.qty});
    if(report){
      if(!Number.isSafeInteger(row.acceptedAt)||row.acceptedAt<0||row.acceptedAt>row.deadline)continue;
      Object.assign(clean,{objective:row.objective,acceptedAt:row.acceptedAt});
      if(eligibleProof(row))clean.proofAt=row.proofAt;
    }
    active.push(clean);
  }
  const value=key=>Number.isSafeInteger(old[key])?Math.min(1e9,Math.max(0,old[key])):0;
  const history=Array.isArray(old.history)?old.history.filter(x=>typeof x?.id==='string'&&x.id.length<100&&
    Number.isSafeInteger(x.at)&&x.at>=0&&['complete','expired','cancelled'].includes(x.state)).slice(0,40):[];
  const proofs={};
  for(const key of ['freight','multiFleet','survey','pirate','river','europe','indian','mediterranean']){
    const n=old.proofs?.[key];
    if(Number.isSafeInteger(n)&&n>0)proofs[key]=Math.min(n,1e9);
  }
  game.guild={active,history,earned:value('earned'),lost:value('lost'),completed:value('completed'),proofs};
}
const guild=s=>s.guild??={active:[],history:[],earned:0,lost:0,completed:0};
export function charterCargo(game){
  return (game.guild?.active||[]).reduce((sum,row)=>sum+(GUILD_TYPES[row.tier]?.qty||0),0);
}
export function availableCharters(game,findRoute,room,now,findPointRoute=()=>false){
  if(!freeToWork(game))return [];
  const origin=PORT_BY_ID[game.port], seen=game.guild?.history||[];
  const candidates=game.knownPorts.filter(id=>id!==origin.id&&PORT_BY_ID[id]?.active)
    .sort((a,b)=>Math.hypot(PORT_BY_ID[a].lon-origin.lon,PORT_BY_ID[a].lat-origin.lat)-Math.hypot(PORT_BY_ID[b].lon-origin.lon,PORT_BY_ID[b].lat-origin.lat));
  const result=[];
  const available=id=>!game.guild?.active.some(x=>x.id===id)&&!seen.some(x=>x.id===id&&now-x.at<24*HOUR);
  let delivery=null;
  for(const target of candidates.slice(0,10)){
    const route=findRoute(PORT_BY_ID[target]);
    if(!route)continue;
    const good=origin.specialty;
    if(!delivery&&route.total<=GUILD_TYPES[5].limit&&validGood(good)&&room+(game.cargo[good]?.qty||0)>=8){
      const id=byId(origin.id,target,5,good);
      if(available(id))delivery={id,origin:origin.id,target,tier:5,good,qty:8,reward:180};
    }
    for(const [tier,type] of GUILD_TYPES.entries()){
      const previous=GUILD_TYPES[tier-1];
      if(type.kind||route.total>type.limit||previous&&route.total<=previous.limit||room<type.qty)continue;
      const id=byId(origin.id,target,tier);
      if(result.some(x=>x.tier===tier)||!available(id))continue;
      result.push({id,origin:origin.id,target,tier,reward:Math.min(4000,Math.floor(100+route.total*(.45+tier*.2)))});
    }
    if(result.length===3)break;
  }
  const open=(tier,candidates,reward)=>{
    const type=GUILD_TYPES[tier];
    const sorted=candidates.map(entry=>({entry,distance:mapDistance(game.position,entry.point)}))
      .filter(row=>row.distance<=type.limit)
      .sort((a,b)=>a.distance-b.distance);
    const candidate=sorted.slice(0,4).find(({entry})=>available(byId(origin.id,origin.id,tier,entry.id))&&findPointRoute(entry.point));
    if(candidate)result.push({id:byId(origin.id,origin.id,tier,candidate.entry.id),origin:origin.id,target:origin.id,tier,objective:candidate.entry.id,reward:reward(candidate.entry)});
  };
  open(3,DISCOVERIES.filter(d=>!game.discoveries?.[d.id]&&d.rumorIds.every(id=>(game.rumors||[]).includes(id))&&
    !game.guild?.active.some(row=>row.objective===d.id)),d=>300+200*d.tier);
  if(game.cannons?.some(gun=>gun.shipId))open(4,PIRATE_ZONES.filter(zone=>
    zone.tier<=Math.min(2,Math.floor((game.shipTier||0)/6))&&!game.guild?.active.some(row=>row.objective===zone.id)),zone=>500+500*zone.tier);
  if(delivery)result.push(delivery);
  return result.sort((a,b)=>a.tier-b.tier);
}
export function recordGuildObjective(game,kind,objective,now){
  for(const row of game.guild?.active||[]){
    if(GUILD_TYPES[row.tier]?.kind===kind&&row.objective===objective&&now>=row.acceptedAt&&now<=row.deadline&&!eligibleProof(row))row.proofAt=now;
  }
}
function closeCharter(book,row,now,state){
  book.active=book.active.filter(x=>x.id!==row.id);
  book.history=[{id:row.id,at:now,state},...book.history].slice(0,40);
}
function removeFame(game,baseFame,amount){
  const book=guild(game), deduction=Math.min(Math.max(0,baseFame+book.earned-book.lost),amount);
  book.lost=Math.min(1e9,book.lost+deduction);
  return deduction;
}
export function expireCharters(game,now,baseFame){
  const book=game.guild, missed=book?.active.filter(row=>now>row.deadline&&!eligibleProof(row))||[];
  let loss=0;
  for(const row of missed){
    loss+=removeFame(game,baseFame,GUILD_TYPES[row.tier].fame);
    closeCharter(book,row,now,'expired');
  }
  return {count:missed.length,loss};
}
export function charterAction(game,action,id,now,{findRoute,room,baseFame,findPointRoute,trade}){
  const book=guild(game);
  const expired=expireCharters(game,now,baseFame);
  if(!freeToWork(game))throw Error('항구에 입항해 조합을 이용하세요.');
  if(action==='accept'||['I041','I043','I061'].includes(action)){
    if(book.active.length>=3)throw Error('진행할 수 있는 의뢰는 3건까지예요.');
    const offer=availableCharters(game,findRoute,room,now,findPointRoute).find(x=>x.id===id);
    if(!offer)throw Error('이 의뢰를 수락할 수 없어요. 보급과 적재 공간을 확인하세요.');
    const item=action==='accept'?null:action;
    if(item&&(GUILD_TYPES[offer.tier].kind||!game.rumorProgress?.items?.[item]))throw Error('증서와 위탁 수송 의뢰를 확인하세요.');
    const duration=GUILD_TYPES[offer.tier].hours*HOUR*(item==='I043'?.5:1);
    const reward=Math.min(4000,Math.floor(offer.reward*(item==='I043'?1.3:item?1.15:1)));
    if(item)game.rumorProgress.items[item]--;
    const indianPorts=['zanzibar','maputo','muscat','goa','aden','colombo'];
    const storyBonus=indianPorts.includes(offer.target)?Math.floor(reward*Math.min(.05,activeOfficer(game)?.indianGuildBonus||0)):0;
    book.active.push({...offer,reward,storyBonus,deadline:now+duration,...(offer.objective?{acceptedAt:now}:{}),...(item?{variant:item}:{})});
    return {message:item==='I061'?'수집가의 편지 · 항구 사이의 여행 기록을 전하는 수송을 맡았어요.':'조합 의뢰를 수락했어요.'};
  }
  const row=book.active.find(x=>x.id===id);
  if(!row){
    if(expired.count)return {message:'기한을 넘긴 의뢰 '+expired.count+'건 · 명성 −'+expired.loss};
    throw Error('진행 중인 의뢰가 없어요.');
  }
  if(action==='extend'){
    const items=game.rumorProgress?.items;
    if(!items?.I044||row.extended)throw Error('기한 연장권 또는 이미 연장한 의뢰인지 확인하세요.');
    row.deadline+=Math.round(GUILD_TYPES[row.tier].hours*HOUR*(row.variant==='I043'?.125:.25));
    row.extended=true;items.I044--;
    return {message:'의뢰 기한을 25% 연장했어요.'};
  }
  if(action==='cancel'){
    const loss=removeFame(game,baseFame,GUILD_TYPES[row.tier].fame);
    closeCharter(book,row,now,'cancelled');
    return {message:'의뢰 포기 · 명성 −'+loss};
  }
  const type=GUILD_TYPES[row.tier], report=isGuildReport(row.tier);
  if(action!==(report?'report':'deliver')||row.target!==game.port||game.explorationLockedUntilSailing)
    throw Error('지정한 항구의 조합에서 완료하세요.');
  if(report&&!eligibleProof(row))throw Error('의뢰를 수락한 뒤 기한 안에 지정 목표를 완료하세요.');
  const sale=type.kind==='delivery'?(typeof trade==='function'?trade(row):null):null;
  if(type.kind==='delivery'&&!sale?.ok)throw Error('조합 납품의 현재 판매 견적을 확인하세요.');
  const base=row.reward, officerBonus=type.kind?0:Math.floor(base*(activeOfficer(game)?.guildBonus||0));
  const itemBonus=type.kind?0:couponAmount(game,'guild',base), reward=base+officerBonus+itemBonus+(row.storyBonus||0);
  game.money+=reward;
  if(itemBonus>0)consumeCoupon(game,'guild');
  book.completed=Math.min(1e9,(book.completed||0)+1);
  const proofs=book.proofs??={},credit=key=>{proofs[key]=Math.min(1e9,(proofs[key]||0)+1);};
  credit(type.kind||'freight');if(type.kind==='pirate')shipyardReport(game,row.objective);
  if(!type.kind){
    const port=PORT_BY_ID[row.target];
    if(game.fleetCount>=3)credit('multiFleet');
    if(port.river)credit('river');
    if(port.region==='유럽')credit('europe');
    if(['인도양','아라비아해','벵골만','라카디브해'].includes(port.sea))credit('indian');
    if(['marseille','venice','athens','istanbul','alexandria'].includes(port.id))credit('mediterranean');
  }
  addOfficerExperience(game,25+GUILD_TYPES[row.tier].fame);
  book.earned=Math.min(1e9,book.earned+GUILD_TYPES[row.tier].fame);
  closeCharter(book,row,now,'complete');
  return {message:(report?'보고 완료':'납품 완료')+' · '+(sale?'판매 '+sale.total+' D + 조합 보수 ':'')+reward+' D · 명성 +'+type.fame};
}
