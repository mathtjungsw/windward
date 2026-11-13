import {COASTAL_ACTIVITY_SITES} from './coastal-sites.js?v=2026.11.13-canal-routes';
import {mapDistance} from './world-wrap.js?v=2026.11.13-canal-routes';
import {GOODS,PORT_BY_ID} from './data.js?v=2026.11.13-canal-routes';
import {activeOfficer,explorationGear,equippedGear,addOfficerExperience} from './rumor-progress.js?v=2026.11.13-canal-routes';

export const SHORE_SITES={
  porto:{market:'강가 마을',site:'언덕의 옛 창고',ridge:'소나무 고갯길',good:'wine',theme:'green'},
  seville:{market:'강변 시장',site:'언덕의 석조 터',ridge:'올리브 고개',good:'oliveoil',theme:'dry',mirror:true,pass:true},
  busan:{market:'해안 마을',site:'봉화가 보이는 언덕',ridge:'바람 센 고개',good:'driedfish',theme:'green',mirror:true},
  macau:{market:'언덕 아래 시장',site:'내륙의 옛 보급터',ridge:'대나무 오솔길',good:'silk',theme:'tropical'},
  manila:{market:'강가 장터',site:'숲 가장자리의 옛 창고',ridge:'큰잎나무 길',good:'sugar',theme:'tropical',mirror:true},
  alexandria:{market:'내륙 장터',site:'옛길의 돌 표식',ridge:'모래 언덕길',good:'grain',theme:'dry'},
  cape:{market:'바람막이 장터',site:'옛 물통 보관터',ridge:'바위 능선',good:'wine',theme:'dry',mirror:true},
  goa:{market:'강굽이 시장',site:'언덕의 향신료 창고',ridge:'야자 숲길',good:'pepper',theme:'tropical'},
  havana:{market:'사탕수수 장터',site:'내륙의 석조 보급터',ridge:'붉은 흙 고개',good:'sugar',theme:'tropical',mirror:true},
  valparaiso:{market:'비탈길 장터',site:'언덕의 옛 감시터',ridge:'마른 능선길',good:'copper',theme:'dry',mirror:true},
  sydney:{market:'물가 장터',site:'내륙의 옛 저장터',ridge:'바람 드는 수풀길',good:'rawwool',theme:'dry'},
  auckland:{market:'언덕 아래 장터',site:'숲가의 옛 보급터',ridge:'숲이 깊은 고개',good:'timber',theme:'green',mirror:true}
};
const beaches={
  'coast-algarve':{market:'바람막이 움막',site:'절벽 아래 옛 감시터',ridge:'바위언덕 길',good:'salt',theme:'dry'},
  'coast-capeverde':{market:'물통을 두는 공터',site:'검은 돌 표식',ridge:'마른 바람 고개',good:'driedfish',theme:'dry',mirror:true},
  'coast-sumatra':{market:'강어귀의 임시 장터',site:'향신료를 말리던 터',ridge:'큰잎나무 숲길',good:'pepper',theme:'tropical'},
  'coast-alaska':{market:'해안 오두막',site:'옛 물자 보관터',ridge:'나무가 듬성한 고개',good:'timber',theme:'green',mirror:true},
  'coast-ecuador':{market:'모래언덕의 쉼터',site:'숲 가장자리 석조 터',ridge:'붉은 흙 능선',good:'cacao',theme:'tropical'},
  'coast-australia':{market:'그늘진 임시 장터',site:'붉은 바위 보급터',ridge:'바람 센 모랫길',good:'sandalwood',theme:'dry',mirror:true}
};
export const BEACH_SITES=Object.fromEntries(COASTAL_ACTIVITY_SITES.filter(x=>Object.hasOwn(beaches,x.id)).map(site=>[site.id,{...site,...beaches[site.id],beach:true}]));
export const shoreSite=id=>Object.hasOwn(SHORE_SITES,id)?SHORE_SITES[id]:Object.hasOwn(BEACH_SITES,id)?BEACH_SITES[id]:null;
export const shoreName=id=>BEACH_SITES[id]?.name||PORT_BY_ID[id]?.name||'상륙지';
const LANDING_RADIUS=12;
const freeToLand=game=>!game.port&&!game.voyage?.kind&&!game.battleId&&!game.npcBattle&&!game.raidId&&!game.explorationLockedUntilSailing&&!game.offlineRescuePending;
export function visibleBeaches(game,nav){
  if(!nav||!freeToLand(game))return [];
  const range=explorationGear(game)?.beachChart?180:55;
  return Object.values(BEACH_SITES).map(site=>({site,distance:mapDistance(game.position,site.point)}))
    .filter(({site,distance})=>distance<=range&&!nav.isLand(site.point))
    .map(row=>({...row,canLand:!game.voyage&&!game.seaJob&&row.distance<=LANDING_RADIUS&&nav.clear(game.position,row.site.point)}))
    .sort((a,b)=>a.distance-b.distance);
}
const EDGES=[
  {a:'harbor',b:'market',ms:15000,food:.4},
  {a:'market',b:'site',ms:20000,food:.6},
  {a:'market',b:'ridge',ms:24000,food:.7},
  {a:'ridge',b:'site',ms:16000,food:.3,pass:true},
  {a:'harbor',b:'site',ms:13000,food:1.4,shortcut:true}
];
const NODES=['harbor','market','site','ridge'];
export const SHORE_RECORDS={rubbing:'탁본',translation:'고문서 해석',sample:'자연 표본'};
function records(list){
  return [...new Set((Array.isArray(list)?list:[]).filter(id=>Object.hasOwn(SHORE_RECORDS,id)))];
}
const docked=game=>!!SHORE_SITES[game.port]&&!game.voyage&&!game.battleId&&!game.npcBattle&&!game.raidId&&!game.explorationLockedUntilSailing;
export const shoreNode=(port,node)=>node==='harbor'?(BEACH_SITES[port]?'배가 기다리는 해변':'배가 있는 부두'):shoreSite(port)?.[node]||'내륙';
export function normalizeShore(game){
  const trip=game.shoreTrip;
  const site=shoreSite(trip?.port);
  const validLocation=site?.beach?!game.port&&mapDistance(game.position,site.point)<=LANDING_RADIUS&&!game.offlineRescuePending:trip?.port===game.port;
  if(!trip||!site||!validLocation||game.voyage||!NODES.includes(trip.node))delete game.shoreTrip;
  else{
    const travel=trip.travel, valid=travel&&EDGES.some(e=>(e.a===trip.node&&e.b===travel.to)||(e.b===trip.node&&e.a===travel.to))&&Number.isFinite(travel.until)&&travel.until>=0;
    game.shoreTrip={port:trip.port,beach:site.beach===true,node:trip.node,travel:valid?{to:travel.to,until:travel.until,...(Number.isFinite(travel.startedAt)&&travel.startedAt>=0&&travel.startedAt<travel.until&&travel.until-travel.startedAt<=60000?{startedAt:travel.startedAt}:{})}:null,
      surveyed:trip.surveyed===true,bag:Number.isInteger(trip.bag)?Math.min(7,Math.max(0,trip.bag)):0,
      records:records(trip.records),camp:trip.camp===true};
  }
  const count=game.shoreProgress?.count;
  const sites=game.shoreProgress?.sites;
  if(game.shoreProgress!==undefined)game.shoreProgress={
    count:Number.isSafeInteger(count)?Math.max(0,Math.min(100000,count)):0,
    sites:[...new Set((Array.isArray(sites)?sites:[]).filter(p=>!!shoreSite(p)))],
    records:Object.fromEntries(Object.keys({...SHORE_SITES,...BEACH_SITES}).flatMap(port=>{
      const valid=records(game.shoreProgress?.records?.[port]);
      return valid.length?[[port,valid]]:[];
    }))
  };
}
export function shorePosition(trip,now){
  return trip.travel&&now>=trip.travel.until?trip.travel.to:trip.node;
}
export function shoreTravelProgress(game,now){
  const trip=game.shoreTrip, travel=trip?.travel;
  if(!travel||now>=travel.until)return 1;
  const move=shoreMoves(game,trip.node).find(option=>option.to===travel.to);
  const start=travel.startedAt??travel.until-(move?.ms??20000);
  return Math.max(0,Math.min(1,(now-start)/(travel.until-start)));
}
export function shoreEdges(game){
  const gear=explorationGear(game), pass=SHORE_SITES[game.port]?.pass&&game.rumorProgress?.items?.I029>0;
  return EDGES.filter(e=>(!e.shortcut||gear?.shoreShortcut)&&(!e.pass||pass));
}
export function shoreMoves(game,node){
  const gear=explorationGear(game), officer=activeOfficer(game);
  return shoreEdges(game).filter(e=>e.a===node||e.b===node).map(e=>{
    const to=e.a===node?e.b:e.a;
    const returning=to==='harbor'||to==='market'&&node!=='harbor';
    const food=returning?0:e.food*(1-(officer?.shoreFood||0));
    return {to, ms:Math.ceil(e.ms*(1-(gear?.shoreSpeed||0))), food:game.shoreTrip?.camp?food*.8:food};
  });
}
const atSurvey=(trip,node)=>trip.node===node&&(node!=='site'||trip.surveyed);
const RECORD_ACTIONS={
  rubbing:{node:'site',item:'I030'},
  translation:{node:'site',item:'I031'},
  sample:{node:'ridge',gear:'I032'}
};
export function canRecordShore(game,kind,node=game.shoreTrip?.node){
  const trip=game.shoreTrip, rule=RECORD_ACTIONS[kind];
  if(!trip||!rule||!atSurvey({...trip,node},rule.node))return false;
  if(trip.records?.includes(kind)||game.shoreProgress?.records?.[trip.port]?.includes(kind))return false;
  return rule.item?game.rumorProgress?.items?.[rule.item]>0:equippedGear(game,'explore').some(item=>item.id===rule.gear);
}
export function shoreBagLimit(game){
  return Math.min(7,3+(activeOfficer(game)?.shoreBag||0)+(explorationGear(game)?.shoreBag||0));
}
export function shoreAction(game,action,target,now,capacityLeft,nav){
  const trip=game.shoreTrip, beach=BEACH_SITES[trip?.port||(action==='start'?target:null)];
  if(beach){
    const nearby=visibleBeaches(game,nav).find(row=>row.site.id===beach.id);
    if(!nearby?.canLand||game.food<=.02)throw Error('해변에서 12해리 안에 배를 멈추고 상륙하세요. 전투와 구조 중에는 상륙할 수 없어요.');
  }else if(!docked(game))throw Error('정상 입항한 뒤 탐사할 수 있어요.');
  if(action==='start'){
    if(trip)throw Error('이미 탐사 중이에요.');
    game.shoreTrip={port:beach?.id||game.port,beach:!!beach,node:'harbor',travel:null,surveyed:false,bag:0,records:[],camp:false};
    return {message:beach?'해변에 상륙했어요. 배는 바다에 있어요.':'상륙 탐사를 시작했어요.'};
  }
  if(!trip||!beach&&trip.port!==game.port)throw Error('먼저 상륙 탐사를 시작하세요.');
  if(trip.travel&&now<trip.travel.until)throw Error('아직 이동 중이에요.');
  trip.node=shorePosition(trip,now);trip.travel=null;
  if(action==='walk'){
    const move=shoreMoves(game,trip.node).find(x=>x.to===target);
    if(!move)throw Error('현재 위치에서 갈 수 있는 길을 선택하세요.');
    if(game.food+1e-9<move.food+(beach ? .05 : 0))throw Error('탐사 보급이 부족해요. 부두로 돌아가 보급하세요.');
    game.food=Math.max(0,game.food-move.food);
    if(move.food>0)trip.camp=false;
    trip.travel={to:move.to,startedAt:now,until:now+move.ms};
    return {message:'탐사팀이 이동을 시작했어요.'};
  }
  if(action==='camp'){
    const items=game.rumorProgress?.items;
    if(!items?.I028||trip.camp)throw Error('사용할 야영 꾸러미를 확인하세요.');
    trip.camp=true;items.I028--;
    return {message:'다음 보급을 쓰는 육상 길의 소모가 20% 줄어요.'};
  }
  if(action==='record'){
    if(!canRecordShore(game,target))throw Error('현재 지점과 조사 상태, 도구를 확인하세요.');
    const rule=RECORD_ACTIONS[target];
    if(rule.item)game.rumorProgress.items[rule.item]--;
    (trip.records??=[]).push(target);
    return {message:SHORE_RECORDS[target]+' 기록을 가방에 챙겼어요.'};
  }
  if(action==='survey'){
    if(trip.node!=='site'||trip.surveyed)throw Error('아직 조사하지 않은 지점에서 시도하세요.');
    trip.surveyed=true;return {message:'보급로를 조사해 기록했어요.'};
  }
  if(action==='buy'){
    if(trip.node!=='market')throw Error('내륙 장터에서 구매하세요.');
    const limit=shoreBagLimit(game);
    const good=shoreSite(trip.port).good, cost=GOODS[good].base;
    if(trip.bag>=limit||game.money<cost)throw Error('탐사 가방과 두카트를 확인하세요.');
    game.money-=cost;trip.bag++;
    return {message:GOODS[good].name+' 1상자를 담았어요.'};
  }
  if(action!=='finish'||trip.node!=='harbor')throw Error('배가 기다리는 곳에 돌아와야 탐사를 마칠 수 있어요.');
  if(trip.bag>capacityLeft)throw Error('선단 화물 공간을 비운 뒤 돌아오세요.');
  if(trip.bag){
    const good=shoreSite(trip.port).good, old=game.cargo[good]||{qty:0,cost:0};
    game.cargo[good]={qty:old.qty+trip.bag,cost:old.cost+trip.bag*GOODS[good].base};
  }
  if(trip.surveyed){
    game.shoreProgress??={count:0,sites:[]};
    game.shoreProgress.count=Math.min(100000,game.shoreProgress.count+1);
    addOfficerExperience(game,35);
    if(!game.shoreProgress.sites.includes(trip.port))game.shoreProgress.sites.push(trip.port);
  }
  if(trip.records?.length){
    game.shoreProgress??={count:0,sites:[],records:{}};
    game.shoreProgress.records??={};
    const saved=game.shoreProgress.records[trip.port]||[];
    game.shoreProgress.records[trip.port]=records([...saved,...trip.records]);
  }
  delete game.shoreTrip;
  return {message:trip.records?.length?'귀환 완료 · 조사 기록을 보관했어요.':trip.surveyed?'상륙 조사와 귀환 완료':'탐사팀이 배로 돌아왔어요.'};
}
