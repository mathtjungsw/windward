import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,parseSavedGame,autoResupply,usedSpace} from '../dist/engine.js';
import {PORTS,PORT_BY_ID,GOODS} from '../dist/data.js';
import {OFFICERS,ITEMS} from '../dist/rumor-catalog.js';
import {activateCoupon,activeCoupon,readContractRumor,performContractAction,recordContractArrival} from '../dist/rumor-progress.js';
import {availableCharters,charterAction,expireCharters,guildObjective,recordGuildObjective} from '../dist/guild-contracts.js';
import {SHORE_SITES,BEACH_SITES,visibleBeaches,shoreAction,shoreTravelProgress,shoreMoves} from '../dist/shore-expeditions.js';
import {captainTradeQuote,executeTrade,invest,withdrawBasicIncome} from '../dist/commerce.js';
import {SHORE_POINTS,shoreMapPosition,shoreDisplayPoint} from '../dist/shore-map.js';
import {SEA_SITES,seaActivityAction,finishSeaRescue} from '../dist/sea-activities.js';
import {estimateBasicIncome} from '../dist/port-income.js';
import {mergeDefense} from '../dist/defense-core.js';
import {inspectDiscovery} from '../dist/discoveries.js';
import {cannonStats} from '../dist/cannons.js';
import {fireAtPirate,PIRATE_ZONES} from '../dist/combat-core.js';

function progressed(){
  const game=initialState();
  game.shipTier=13;game.fleetShips[0].tier=13;
  game.visited=PORTS.slice(0,22).map(p=>p.id);
  return game;
}
const emptyProgress=()=>({read:[],hidden:[],officers:[],items:{},contracts:{},shipGear:{},active:null,tradeGear:null,coupons:{}});

test('every officer has a valid port, cargo and a persistent recruitment path',()=>{
  assert.equal(OFFICERS.filter(row=>!row.scenario).length,24);
  assert.equal(new Set(OFFICERS.map(o=>o.id)).size,26);
  for(const officer of OFFICERS.filter(row=>!row.scenario)){
    const game=progressed();
    game.money=100000;game.port=officer.tavern;
    assert.ok(readContractRumor(game,officer.id),officer.id);
    game.port=officer.port;
    performContractAction(game,officer.id,'start');
    for(const id of officer.challenge.ports)recordContractArrival(game,id);
    game.cargo[officer.challenge.cargo]={qty:officer.challenge.qty,cost:10};
    if(officer.challenge.ships){
      game.fleetShips=Array.from({length:officer.challenge.ships},(_,i)=>({id:'vessel-'+i,tier:game.shipTier}));
      game.fleetCount=game.fleetShips.length;
    }
    const special=officer.challenge.pirates||officer.challenge.discoveries||officer.challenge.investment||officer.challenge.shore||officer.challenge.gunQuality;
    if(special)assert.throws(()=>performContractAction(game,officer.id,'deliver'),/추가 조건/);
    game.rankProgress={pirateKills:3};
    game.investedPorts=['seville'];
    game.shoreProgress={count:3,sites:['porto']};
    game.discoveries={a:{},b:{},c:{}};
    game.cannons=[{quality:2}];
    game.guild={completed:5,proofs:officer.challenge.proof||{}};
    game.projectStats={freight:officer.challenge.cooperative||0};
    game.seaLog={counts:{salvage:3}};
    performContractAction(game,officer.id,'deliver');
    performContractAction(game,officer.id,'claim');
    assert.ok(game.rumorProgress.officers.includes(officer.id));
    assert.equal(game.money,100000-officer.cost);
  }
  assert.equal(new Set(ITEMS.map(x=>x.id)).size,ITEMS.length);
});

test('arrival supply tops up as far as funds allow and consumes a coupon only once',()=>{
  const game=initialState();game.autoSupply=true;game.food=0;game.money=12;
  game.rumorProgress=emptyProgress();game.rumorProgress.items.I012=1;
  activateCoupon(game,'I012');
  const result=autoResupply(game);
  assert.equal(result.ok,true);
  assert.ok(result.amount>4&&result.amount<5.5);
  assert.ok(game.money>=0);
  assert.equal(activeCoupon(game,'supply'),null);
  assert.equal(autoResupply(game),null);
  assert.ok(parseSavedGame(JSON.stringify(game)).autoSupply);
});

test('a charter is freight, settles on a single deadline, and restores after reload',()=>{
  let game=initialState();game.pirateFame=10;
  const opts={findRoute:()=>({total:200}),room:15,baseFame:10};
  const at=Date.UTC(2026,10,11,0),id=availableCharters(game,opts.findRoute,opts.room,at)[0].id;
  const oldSpace=usedSpace(game);
  charterAction(game,'accept',id,at,opts);
  assert.equal(usedSpace(game),oldSpace+5);
  const before=game.money;
  game=parseSavedGame(JSON.stringify(game));
  game.port='porto';
  charterAction(game,'deliver',id,at+1800000,opts);
  assert.ok(game.money>before);
  assert.equal(game.guild.completed,1);
  assert.equal(usedSpace(game),oldSpace);
  assert.throws(()=>charterAction(game,'deliver',id,at+1800000,opts));
  game.port='lisbon';
  const next=at+2*86400000;
  charterAction(game,'accept',id,next,opts);
  assert.deepEqual(expireCharters(game,next+1800001,10),{count:1,loss:5});
  assert.deepEqual(expireCharters(game,next+1800001,10),{count:0,loss:0});
});

test('a shore trip resumes timed movement and records survey and cargo on return',()=>{
  let game=initialState();game.port='porto';const at=1000;
  shoreAction(game,'start','',at,15);
  shoreAction(game,'walk','market',at,15);
  assert.throws(()=>shoreAction(game,'buy','',at+1,15),/이동 중/);
  game=parseSavedGame(JSON.stringify(game));
  assert.equal(shoreTravelProgress(game,at+7500),.5);
  const legacy=structuredClone(game);delete legacy.shoreTrip.travel.startedAt;
  assert.equal(shoreTravelProgress(parseSavedGame(JSON.stringify(legacy)),at+7500),.5);
  shoreAction(game,'buy','',at+15000,15);
  shoreAction(game,'walk','site',at+15000,15);
  shoreAction(game,'survey','',at+35000,15);
  shoreAction(game,'walk','market',at+35000,15);
  shoreAction(game,'walk','harbor',at+55000,15);
  assert.throws(()=>shoreAction(game,'finish','',at+70000,0),/공간/);
  shoreAction(game,'finish','',at+70000,15);
  assert.equal(game.shoreProgress.count,1);
  assert.equal(game.cargo.wine.qty,1);
  assert.equal(game.shoreTrip,undefined);
});

test('sales honor after-tax equipment and officer bonus without changing market pressure',()=>{
  const game=initialState(), at=Date.UTC(2026,10,11,0), content={investors:{owner:1},defaultRate:10};
  game.port='london';game.cargo.wool={qty:20,cost:500};
  const before=captainTradeQuote(game,'london','wool',20,'sell',{},at,10);
  game.rumorProgress={...emptyProgress(),officers:['O002'],items:{I019:1},active:'O002',tradeGear:'I019'};
  const after=captainTradeQuote(game,'london','wool',20,'sell',{},at,10);
  assert.deepEqual(after.next,before.next);
  assert.equal(after.tax,before.tax);
  assert.equal(after.total,before.total+Math.floor(before.total*.025));
  const money=game.money;
  executeTrade(game,content,'sailor','london','wool',20,'sell',after,at,0);
  assert.equal(game.money,money+after.total);
  assert.equal(content.treasury.owner,after.tax);
});

test('the NPC officer changes the first accurate shot and preserves subsequent odds across reload',()=>{
  let game=progressed(), zone=PIRATE_ZONES.find(x=>x.tier===0);
  game.port=null;game.position=[...zone.point];
  game.cannons=[{id:'gun',kind:'light',quality:0,shipId:game.flagshipId,readyAt:0}];
  game.rumorProgress={...emptyProgress(),officers:['O024'],active:'O024'};
  const gun=game.cannons[0], stats=cannonStats(gun), now=1000, roll=(stats.accuracy+1)/100;
  const first=fireAtPirate(game,zone.id,gun.id,now,[roll,1]);
  assert.equal(first.hit,true);
  game=parseSavedGame(JSON.stringify(game));
  const second=fireAtPirate(game,zone.id,gun.id,game.cannons[0].readyAt,[roll,1]);
  assert.equal(second.hit,false);
});


test('sea rewards require elapsed time, survive a reload, and finish rescue at a previously visited port',()=>{
  const site=SEA_SITES.find(x=>x.kind==='rescue'), opts={clear:()=>true,room:10};
  let game=initialState();game.port=null;game.position=[...site.point];
  const at=Date.UTC(2026,10,11,0);
  seaActivityAction(game,'start',site.id,at,opts);
  assert.throws(()=>seaActivityAction(game,'finish',site.id,at+19000,opts),/기다리세요/);
  game=parseSavedGame(JSON.stringify(game));
  seaActivityAction(game,'finish',site.id,at+20000,opts);
  assert.equal(finishSeaRescue(game,'porto'),null);
  const before=game.money;
  assert.equal(finishSeaRescue(game,'lisbon').fee,200);
  assert.equal(game.money,before+200);
  assert.equal(finishSeaRescue(game,'lisbon'),null);
  assert.throws(()=>seaActivityAction(game,'start',site.id,at+30000,opts),/아직 다시/);
});


test('basic port income is capped and remains claimable by the prior owner after a stake transfer',()=>{
  const game=initialState(), at=Date.UTC(2026,10,11,0), content={};
  game.port='havana';game.money=10000000;
  invest(game,content,'first','havana',600000,at);
  const twoHours=at+2*3600000;
  assert.equal(estimateBasicIncome(content,'havana','first','first',twoHours).accrued,6000);
  invest(game,content,'second','havana',610000,twoHours);
  assert.equal(estimateBasicIncome(content,'havana','first','second',twoHours).accrued,6000);
  assert.equal(estimateBasicIncome(content,'havana','second','second',twoHours+100*3600000).accrued,216000);
  const before=game.money;
  withdrawBasicIncome(game,content,'first','havana',twoHours);
  assert.equal(game.money,before+6000);
  assert.throws(()=>withdrawBasicIncome(game,content,'first','havana',twoHours),/수령할/);
});


test('all twelve shore maps offer a return route and mirror walking over the same drawn trail',()=>{
  assert.equal(Object.keys(SHORE_SITES).length,12);
  for(const [port,site] of Object.entries(SHORE_SITES)){
    assert.ok(PORT_BY_ID[port].active&&GOODS[site.good]);
    const game=initialState();
    game.port=port;
    assert.deepEqual(shoreMoves(game,'ridge').map(x=>[x.to,x.food]),[['market',0]]);
    assert.ok(shoreMoves(game,'market').some(x=>x.to==='harbor'&&x.food===0));
    const start=shoreDisplayPoint(shoreMapPosition('market','ridge',0),site.mirror);
    const end=shoreDisplayPoint(shoreMapPosition('market','ridge',1),site.mirror);
    assert.deepEqual(start,shoreDisplayPoint(SHORE_POINTS.market,site.mirror));
    assert.ok(Math.abs(end[0]-shoreDisplayPoint(SHORE_POINTS.ridge,site.mirror)[0])<1e-8);
    assert.ok(Math.abs(end[1]-SHORE_POINTS.ridge[1])<1e-8);
  }
});

test('shore tools and the local pass change exploration once and keep recovered records across saves',()=>{
  let game=initialState();
  game.port='seville';
  game.rumorProgress={...emptyProgress(),items:{I028:1,I029:1,I030:2,I031:1,I032:1},exploreGear:'I032'};
  const act=(action,target,now)=>shoreAction(game,action,target,now,20);
  act('start','',0);
  act('camp','',0);
  assert.equal(game.rumorProgress.items.I028,0);
  act('walk','market',0);
  assert.ok(Math.abs(game.food-9.68)<1e-8);
  assert.equal(game.shoreTrip.camp,false);
  act('walk','ridge',15000);
  act('record','sample',39000);
  assert.equal(game.shoreProgress,undefined);
  assert.ok(shoreMoves(game,'ridge').some(x=>x.to==='site'));
  act('walk','site',39000);
  act('survey','',55000);
  act('record','rubbing',55000);
  assert.throws(()=>act('record','rubbing',55000),/도구/);
  assert.equal(game.rumorProgress.items.I030,1);
  game=parseSavedGame(JSON.stringify(game));
  act('record','translation',55000);
  act('walk','market',55000);
  act('walk','harbor',75000);
  act('finish','',90000);
  assert.deepEqual(game.shoreProgress.records.seville,['sample','rubbing','translation']);
  assert.deepEqual(parseSavedGame(JSON.stringify(game)).shoreProgress.records,game.shoreProgress.records);
  game.port='porto';
  assert.ok(!shoreMoves(game,'ridge').some(x=>x.to==='site'));
});


test('a survey is credited only after acceptance and may be reported after the action deadline',()=>{
  let game=progressed(), now=Date.UTC(2026,10,11,0);
  const options={findRoute:()=>({total:300}),findPointRoute:()=>true,room:35,baseFame:0};
  const row=availableCharters(game,options.findRoute,options.room,now,options.findPointRoute).find(r=>r.tier===3);
  assert.ok(row);
  const discovery=guildObjective(row);
  charterAction(game,'accept',row.id,now,options);
  assert.throws(()=>charterAction(game,'report',row.id,now+1,options),/지정 목표/);
  recordGuildObjective(game,'survey',row.objective,now-1);
  assert.equal(game.guild.active[0].proofAt,undefined);
  const deadline=game.guild.active[0].deadline;
  game.port=null;game.position=discovery.point;
  assert.equal(inspectDiscovery(game,{clear:()=>true},discovery.id,deadline).ok,true);
  assert.equal(game.guild.active[0].proofAt,deadline);
  game=parseSavedGame(JSON.stringify(game));
  assert.equal(expireCharters(game,deadline+1,0).count,0);
  game.port='lisbon';
  assert.match(charterAction(game,'report',row.id,deadline+86400000,options).message,/보고 완료/);
  assert.throws(()=>charterAction(game,'report',row.id,deadline+86400001,options),/진행 중/);
});

test('a pirate report requires a victory over the designated target and ignores late kills',()=>{
  const game=progressed(), now=Date.UTC(2026,10,11,0),options={findRoute:()=>({total:300}),findPointRoute:()=>true,room:50,baseFame:30};
  game.cannons=[{id:'gun',kind:'light',quality:0,shipId:game.flagshipId,readyAt:0}];
  const row=availableCharters(game,options.findRoute,options.room,now,options.findPointRoute).find(r=>r.tier===4);
  assert.ok(row);
  charterAction(game,'accept',row.id,now,options);
  recordGuildObjective(game,'pirate','unrelated',now+1000);
  recordGuildObjective(game,'pirate',row.objective,game.guild.active[0].deadline+1);
  assert.equal(game.guild.active[0].proofAt,undefined);
  game.port=null;game.position=guildObjective(row).point;
  game.npcBattle={zoneId:row.objective,hp:1,readyAt:now+5000};
  assert.equal(fireAtPirate(game,row.objective,'gun',now+2000,[0,1]).victory,true);
  assert.equal(game.guild.active[0].proofAt,now+2000);
});

test('ordinary goods delivery uses one sale, market pressure and a separate mission reward',()=>{
  let game=initialState(),now=Date.UTC(2026,10,11,0);
  const options={findRoute:()=>({total:250}),room:25,baseFame:0};
  const row=availableCharters(game,options.findRoute,options.room,now).find(r=>r.good);
  assert.ok(row);
  charterAction(game,'accept',row.id,now,options);
  game=parseSavedGame(JSON.stringify(game));
  game.port=row.target;game.cargo[row.good]={qty:row.qty+3,cost:200};
  const book={},quote=captainTradeQuote(game,row.target,row.good,row.qty,'sell',{},now+1000,0), before=game.money;
  assert.throws(()=>charterAction(game,'deliver',row.id,now+1000,options),/견적/);
  charterAction(game,'deliver',row.id,now+1000,{...options,trade:order=>
    executeTrade(game,book,'local',order.target,order.good,order.qty,'sell',quote,now+1000,0)});
  assert.equal(game.cargo[row.good].qty,3);
  assert.equal(game.money,before+quote.total+row.reward);
  assert.ok(book.markets[row.good].sellPressure<0);
  assert.throws(()=>charterAction(game,'deliver',row.id,now+1001,options),/진행 중/);
});

test('a beach trip keeps the boat at sea, restores on reload and loses unclaimed finds after defeat',()=>{
  const site=BEACH_SITES['coast-algarve'],nav={isLand:()=>false,clear:()=>true};
  const now=Date.UTC(2026,10,11,0);let game=initialState();game.port=null;
  game.position=[site.point[0]-1.5,site.point[1]];
  assert.ok(!visibleBeaches(game,nav).some(x=>x.site.id===site.id));
  game.rumorProgress={...emptyProgress(),items:{I039:1},exploreGear:'I039'};
  assert.equal(visibleBeaches(game,nav).find(x=>x.site.id===site.id).canLand,false);
  assert.throws(()=>shoreAction(game,'start',site.id,now,20,nav),/12해리/);
  game.position=[...site.point];
  const original=game.position;
  shoreAction(game,'start',site.id,now,20,nav);
  assert.equal(game.port,null);
  assert.deepEqual(game.position,original);
  game=parseSavedGame(JSON.stringify(game));
  assert.equal(game.shoreTrip.port,site.id);
  game.shoreTrip.records=['sample'];
  mergeDefense(game,{seq:1,cashTotal:0,killsTotal:0,hp:0,lostReserveId:'test-reserve'},now+1);
  assert.equal(game.shoreTrip,undefined);
  assert.equal(game.shoreProgress,undefined);
  assert.equal(game.offlineRescuePending,true);
});
