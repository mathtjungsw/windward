const entries=[
 ['felucca','펠루카',6,'alexandria','알렉산드리아','강 탐사','카이로 또는 룩소르 정상 입항',1.10,{river:1.2,capacity:.75,offshore:100}],
 ['galley','몰타식 갤리선',8,'venice','베네치아','연안 항해','지중해 항구 3곳 방문 · 연안 해적 토벌 2회',1.20,{coastSpeed:1.12,supplyUse:.8,offshore:180}],
 ['fluyt','플라위트',10,'amsterdam','암스테르담','대량 수송','공동 수송 보수 2회 수령',1.20,{capacity:1.25,supplyUse:.92,speed:.88,guns:.7}],
 ['fujian','푸젠계 상선',10,'shanghai','상하이','지역 교역','상하이·말라카 방문 · 도자기 교역 2회',1.15,{capacity:1.10,supply:1.10,speed:.95}],
 ['baghlah','바글라',11,'aden','아덴','장거리 수송','아덴·고아 방문 · 인도양 위탁 수송 2회',1.20,{capacity:1.10,supply:1.25,speed:.92}],
 ['waka','와카 호루아',11,'suva','수바','대양 탐험','호놀룰루·수바·파페에테 중 2곳 정상 입항',1.15,{openSupply:.88,capacity:.65,guns:.5}],
 ['panok','판옥선',12,'busan','부산','연안 방어','연안 해적 토벌 보고 2회',1.30,{hp:1.15,guns:1.15,capacity:.85,offshore:240}],
 ['endeavour','인데버호형 탐사선',13,'lisbon','리스본','발견물 탐사','조사 보고 2회 · 서로 다른 상륙지 3곳 조사',1.25,{supply:1.20,trace:10,capacity:.85}],
 ['turtle','거북선',14,'busan','부산','연안 방어','부산 주점 소문을 읽고 조선 의뢰 완료',1.45,{hp:1.20,firstHit:.25,capacity:.70,supply:.85,offshore:200}]
];
const history={
 felucca:'나일강과 같은 하천에서 쓰인 돛배',
 galley:'노와 돛을 함께 쓴 지중해의 길고 낮은 전투선',
 fluyt:'곡물과 목재를 대량으로 나른 네덜란드 화물선',
 fujian:'도자기를 싣고 바다를 건넌 중국의 무역선에서 착안',
 baghlah:'아라비아 해역에서 원양 교역에 쓰인 다우 계열 선박',
 waka:'두 선체를 연결해 태평양의 섬을 오간 항해선',
 panok:'조선 수군이 주력으로 운용한 전선',
 endeavour:'18세기 영국에서 화물선을 개조한 탐사선에서 착안',
 turtle:'조선 수군의 전선. 덮개와 용머리는 1795년 기록의 그림을 참고한 게임 표현'
};
export const HISTORICAL_SHIPS=Object.freeze(entries.map(([id,name,stage,port,portName,role,condition,price,stats])=>Object.freeze({id,name,stage,port,portName,role,condition,price,history:history[id],stats:Object.freeze(stats)})));
export const HISTORICAL_BY_ID=Object.freeze(Object.fromEntries(HISTORICAL_SHIPS.map(row=>[row.id,row])));
export const historicalKind=(id,tier)=>Object.hasOwn(HISTORICAL_BY_ID,id)&&HISTORICAL_BY_ID[id].stage<=tier+1?id:null;
const count=(value,max=1000000)=>Number.isSafeInteger(value)&&value>=0?Math.min(max,value):0;
const mediterranean=['marseille','barcelona','genoa','venice','naples','malta','tunis','athens','istanbul','alexandria'];
const islands=['honolulu','suva','papeete'];
export const TURTLE_RUMOR={id:'shipyard-busan',port:'busan',text:'포구의 장인이 덮개를 씌운 배를 만들고 있대요. 조선소에는 튼튼한 목재와 구리가 필요하고, 연안 길도 안전해져야 한다네요.'};
export function normalizeShipyard(game){
 const old=game.shipyard||{};
 const unlocked=[...new Set((Array.isArray(old.unlocked)?old.unlocked:[]).filter(id=>Object.hasOwn(HISTORICAL_BY_ID,id)))];
 return game.shipyard={unlocked,porcelain:count(old.porcelain),coastal:count(old.coastal),coastalSites:Object.fromEntries(Object.entries(old.coastalSites||{}).filter(([key])=>/^[a-z0-9-]{1,50}$/.test(key)).map(([key,value])=>[key,count(value)])),reported:count(old.reported),turtleRumor:old.turtleRumor===true,
  ...(old.turtleOrder&&typeof old.turtleOrder==='object'?{turtleOrder:{delivered:old.turtleOrder.delivered===true,kills:count(old.turtleOrder.kills,1)}}:{})};
}
export function shipyardRecord(game){return game.shipyard??normalizeShipyard(game);}
export function historicalProgress(game,id){
 const y=game.shipyard||{}, ports=new Set(game.visited||[]),proof=game.guild?.proofs||{};
 const steps={
  felucca:[[Number(ports.has('cairo')||ports.has('luxor')),1,'나일강 입항']],
  galley:[[mediterranean.filter(p=>ports.has(p)).length,3,'지중해 항구'],[y.coastal||0,2,'연안 해적 토벌']],
  fluyt:[[game.projectStats?.freight||0,2,'공동 수송']],
  fujian:[[['shanghai','malacca'].filter(p=>ports.has(p)).length,2,'지정 항구'],[y.porcelain||0,2,'도자기 거래']],
  baghlah:[[['aden','goa'].filter(p=>ports.has(p)).length,2,'지정 항구'],[proof.indian||0,2,'인도양 수송']],
  waka:[[islands.filter(p=>ports.has(p)).length,2,'지정 섬 정상 입항']],
  panok:[[y.reported||0,2,'연안 해적 토벌 보고']],
  endeavour:[[proof.survey||0,2,'조사 보고'],[(game.shoreProgress?.sites||[]).length,3,'서로 다른 상륙지']],
  turtle:[[Number(!!y.turtleRumor),1,'부산 주점 소문'],[Number(!!y.turtleOrder?.delivered),1,'자재 납품'],[y.turtleOrder?.kills||0,1,'조선 의뢰 토벌']]
 }[id]||[];
 return {steps,earned:!!y.unlocked?.includes(id)||steps.every(([n,w])=>n>=w)};
}
export function shipyardTrade(game,good){if(good==='porcelain'){const y=shipyardRecord(game);y.porcelain=Math.min(1000000,y.porcelain+1);}}
export function shipyardVictory(game,nearCoast,zone){
 if(!nearCoast)return;
 const y=shipyardRecord(game);y.coastal=Math.min(1000000,y.coastal+1);
 y.coastalSites??={};
 if(zone?.id)y.coastalSites[zone.id]=Math.min(1000000,(y.coastalSites[zone.id]||0)+1);
 if(y.turtleOrder&&zone?.id==='east-china-scout')y.turtleOrder.kills=1;
}
export function shipyardReport(game,zone){const y=shipyardRecord(game);if(zone&&(y.coastalSites?.[zone]||0)>0){y.coastalSites[zone]--;y.reported=Math.min(1000000,y.reported+1);}}
export function turtleShipyard(game,action){
 if(game.port!=='busan'||game.voyage||game.depotDock)throw Error('부산에 정상 입항한 뒤 이용하세요.');
 const y=shipyardRecord(game);
 if(action==='rumor'){y.turtleRumor=true;return {ok:true};}
 if(action==='accept'&&y.turtleRumor&&!y.turtleOrder){y.turtleOrder={delivered:false,kills:0};return {ok:true};}
 if(action!=='deliver'||!y.turtleOrder||y.turtleOrder.delivered)throw Error('조선 의뢰 진행을 확인하세요.');
 const materials=[['timber',20],['copper',10]];
 if(materials.some(([id,n])=>(game.cargo[id]?.qty||0)<n))throw Error('목재 20상자와 구리 10상자를 준비하세요.');
 for(const [id,n] of materials){
  const cargo=game.cargo[id];if(cargo.qty===n)delete game.cargo[id];else{cargo.cost=cargo.cost*(cargo.qty-n)/cargo.qty;cargo.qty-=n;}
 }
 y.turtleOrder.delivered=true;
 return {ok:true};
}
