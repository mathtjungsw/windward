import {INLAND_RUMORS} from '../dist/inland-rumors.js';
import {rumorNote,rumorsAtTavern} from '../dist/rumor-progress.js';
import {FieldTerrain} from '../dist/overland.js';
import {shortestInlandRoute} from '../dist/inland-route.js';
import {landFog,landExplorationArea,revealLandTile} from '../dist/land-exploration.js';
import {Exploration} from '../dist/voyage-core.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {ARCHIVE_CREDITS} from '../dist/discovery-credits.js';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {LIBRARY_DISCOVERIES} from '../dist/discoveries-library.js';
import {answerQuiz,openQuiz,quizDay,quizReward,quizResetAt,quizCommit} from '../dist/album-quiz.js';
import {INLAND_CITIES,inlandTavernRumors,readInlandRumor,inlandWalk,inlandAccess,inlandHaulQuote,startInlandHaul,settleInlandHaul,inlandTrade,inlandMarketQuote,inlandFree,inlandAvailable,stopInlandHaul} from '../dist/inland.js';
import {harborPracticeAction,harborPresenceOutcome} from '../dist/harbor-battles.js';
import {harborOfficerRole,freeRecalledOfficer} from '../dist/harbor-officers.js';
import {basicIncomeRate} from '../dist/port-income.js';
import {pirateContractAction,pirateContractIncident,pirateContractTask} from '../dist/pirate-contracts.js';

const now=Date.parse('2026-11-15T10:30:00Z');
function gameAt(port,money=100000){return {...initialState(),port,money};}
function found(game,entries){for(const entry of entries)game.discoveries[entry.id]={foundDay:0,foundAt:now};}

test('album credit covers every new image and prior outline-only additions',async()=>{
 assert.equal(Object.keys(ARCHIVE_CREDITS).length,42);
 for(const {id} of LIBRARY_DISCOVERIES){
  assert.match(ARCHIVE_CREDITS[id]?.url,/^https:\/\/commons\.wikimedia\.org\//);
  const data=await readFile(new URL('../dist/assets/archive-discoveries/'+id+'.webp',import.meta.url));
  assert.equal(data.subarray(8,12).toString(),'WEBP');
 }
});
test('quiz reward grows beyond the current catalog and locks at question creation',()=>{
 assert.deepEqual([0,1,11,24,37,60,84,102,200].map(quizReward),[0,1000,1100,2300,3600,5800,8100,9800,19100]);
 assert.equal(openQuiz(initialState(),'all',now).ok,false);
 const game=initialState();found(game,DISCOVERIES.slice(0,37));const original=game.money;
 const opened=quizCommit('sample','all',(g,_c,t)=>openQuiz(g,'all',t,()=>.1))(game,{},now);
 const q=opened.record;
 assert.equal(opened.extras['albumQuizDays/sample/all'].count,37);
 assert.equal(q.reward,3600);assert.equal(new Set(q.options).size,5);assert.ok(game.discoveries[q.correct]);
 found(game,DISCOVERIES);
 assert.deepEqual(openQuiz(parseSavedGame(game),'all',now).record,q);
 assert.equal(answerQuiz(game,'all',q.id,q.correct,now).record.paid,3600);
 assert.equal(game.money,original+3600);
 assert.equal(answerQuiz(game,'all',q.id,q.correct,now).noWrite,true);
 assert.equal(game.money,original+3600);
 const book=openQuiz(game,'book',now,()=>.2).record;
 assert.equal(book.reward,quizReward(DISCOVERIES.length));
 const wrong=book.options.find(option=>option!==book.correct);
 assert.equal(answerQuiz(game,'book',book.id,wrong,now).record.paid,0);
 const reset=quizResetAt(now);
 assert.equal(quizDay(reset),quizDay(now)+1);
 assert.equal(answerQuiz(game,'all',q.id,q.correct,reset).ok,false);
 assert.ok(openQuiz(game,'all',reset).ok);
});
test('warehouse purchase uses one quote and saved automatic hauling settles 10 loaded trips plus 9 returns',()=>{
 const city=INLAND_CITIES.cordoba,game=gameAt(city.port),market={};
 inlandWalk(game,city,now,false);
 assert.equal(inlandAccess(game,city,city.id,now+1000),false);
 const at=now+60000,q=inlandMarketQuote(city,'leather',100,'buy',market,0,at),before=game.money;
 assert.equal(inlandTrade(game,city,'leather',100,'buy',market,0,at,q).total,q.unit*100);
 assert.equal(game.money,before-q.unit*100);
 const haul=inlandHaulQuote(game,city,100);
 assert.deepEqual([haul.loads,haul.legs,haul.cost,haul.elapsed],[10,19,228,1140000]);
 startInlandHaul(game,city,city.id,'leather',100,at);
 assert.equal(inlandAvailable(game,city.id,'leather'),0);
 assert.equal(inlandFree(game,city.port),1900);
 settleInlandHaul(game,at+60000);
 const saved=parseSavedGame(game);
 assert.equal(saved.inland.haul.delivered,10);
 settleInlandHaul(saved,at+haul.elapsed);
 assert.equal(saved.inland.warehouses[city.port].leather.qty,100);
 assert.ok(Math.abs(saved.inland.warehouses[city.port].leather.cost-(q.total+228))<1e-6);
 assert.equal(saved.money,before-q.total-228);
 assert.equal(settleInlandHaul(saved,at+haul.elapsed+1),false);
 assert.equal(inlandHaulQuote({...saved,inland:{...saved.inland,tier:19}},city,1000).legs,1);
});
test('hauling only charges a departed leg, releases reservations, and keeps cargo when funds run out',()=>{
 const city=INLAND_CITIES.cordoba,game=gameAt(city.port,12);
 game.inland={tier:0,warehouses:{[city.id]:{leather:{qty:22,cost:1100}}}};
 startInlandHaul(game,city,city.id,'leather',22,now);
 settleInlandHaul(game,now+60000);
 assert.equal(game.inland.haul.phase,'funds');assert.equal(game.inland.warehouses[city.port].leather.qty,10);
 assert.equal(inlandAvailable(game,city.id,'leather'),12);
 game.money=100;startInlandHaul(game,city,city.id,'leather',12,now+120000);
 stopInlandHaul(game,now+120001);settleInlandHaul(game,now+180000);
 assert.equal(game.inland.haul.phase,'stopped');assert.equal(game.money,88);
 assert.equal(game.inland.warehouses[city.port].leather.qty,20);
 assert.equal(inlandAvailable(game,city.id,'leather'),2);
});
test('mutual harbor practice is separate from the public match and shared economy',()=>{
 const id='jamestown', a=gameAt(id,100),b=gameAt(id,200),content={investors:{b:300000}};
 const act=(player,uid,action,value,t)=>harborPracticeAction(player,content,uid,id,action,value,t);
 act(a,'a','invite','b',now);
 assert.throws(()=>act(a,'x','accept','',now+1),/초대/);
 act(b,'b','accept','',now+2);act(a,'a','ready','',now+3);act(b,'b','ready','',now+4);
 const round=content.harborPractice;
 assert.equal(round.state,'active');
 assert.equal(harborPresenceOutcome(round,{a:{at:now+55000}},now+59000),null);
 assert.equal(harborPresenceOutcome(round,{a:{at:now+60000}},now+61000)?.winner,'a');
 assert.equal(harborPresenceOutcome(round,{},now+61000)?.reason,'abandoned');
 for(const t of [5000,10000,15000])act(a,'a','attack','outer',now+t);
 assert.equal(round.winner,'a');assert.equal(content.harborOperator,undefined);
 assert.deepEqual([a.money,b.money,content.investors.b],[100,200,300000]);
});
test('officer station effects distinguish roles and preserve earned payouts',()=>{
 assert.equal(harborOfficerRole('O002'),'trade');assert.equal(harborOfficerRole('O017'),'explore');assert.equal(harborOfficerRole('O001'),'combat');
 const c={ownerUid:'a',harborOfficer:{owner:'a',id:'O002',role:'trade'},harborOperator:{uid:'b',until:now+10000}};
 assert.equal(basicIncomeRate(c,'busan','a',now),1000);
 assert.equal(basicIncomeRate(c,'busan','a',now+10000),1050);
 const g={harborOfficers:{busan:'O002'},delegateTrade:{origin:'busan'}};
 assert.ok(freeRecalledOfficer(g,'busan'));assert.equal(g.delegateTrade,undefined);
});
test('optional pirate incident can be chosen once and pays only at a qualifying report',()=>{
 const game=gameAt('lisbon',1000);
 pirateContractAction(game,'accept','smuggler',now);
 const target=pirateContractTask('lisbon','smuggler').site.id;
 assert.equal(pirateContractIncident(game,now),null);
 game.pirateRespawns={[target]:now+100+1800000};
 assert.ok(pirateContractIncident(game,now+100));
 pirateContractAction(game,'incident','take',now+100);
 assert.throws(()=>pirateContractAction(game,'incident','take',now+101));
 assert.throws(()=>pirateContractAction(game,'report','',now+102),/기다려/);
 pirateContractAction(game,'report','',now+16000);
 assert.equal(game.money,2500);
 assert.throws(()=>pirateContractAction(game,'report','',now+17000));
});

test('real inland terrain, manual travel, album investigation and safe return survive reload',async()=>{
 const {FieldTerrain,startField,moveField,returnField}=await import('../dist/overland.js');
 const {inspectDiscovery,inspectFieldDiscovery,nearbyDiscoveries}=await import('../dist/discoveries.js');
 const bytes=await readFile(new URL('../dist/assets/overland-terrain.bin',import.meta.url));
 const terrain=new FieldTerrain(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const entries=DISCOVERIES.filter(d=>d.medium==='land');assert.equal(entries.length,40);
 assert.equal(Object.keys(INLAND_CITIES).length,26);
 const game=initialState();game.port='lisbon';const field=startField(game,terrain,[-9.14,38.72],'lisbon');
 for(const kind of [0,2,3,4]){
  let tested=false;
  for(let y=1;y<terrain.height&&!tested;y++){
   let previous=0;
   for(let run=terrain.rows[y];run<terrain.rows[y+1];run++){
    const end=terrain.ends[run]>>>3,type=terrain.ends[run]&7;
    if(previous>0&&type===kind&&terrain.kind(previous-1,y)===1){
     const testField={cell:[previous-1,y]};assert.ok(moveField(testField,terrain,1,0));assert.deepEqual(testField.cell,[previous-1,y]);tested=true;break;
    }
    previous=end;
   }
  }
  assert.ok(tested);
 }
 for(const d of entries){
  const dst=terrain.cell(d.point),town=terrain.landing(INLAND_CITIES[d.fieldCity].point,6);
  assert.equal(terrain.kind(...dst),1);
  let q=[town];const seen=new Set([String(town)]);
  for(let n=0;n<14&&!seen.has(String(dst));n++){
   const next=[];for(const p of q)for(const [dx,dy] of [[1,0],[-1,0],[0,-1],[0,1]]){
    const v=[p[0]+dx,p[1]+dy];
    if(!terrain.barrier(p,dx,dy)&&!seen.has(String(v))){seen.add(String(v));next.push(v);}
   }q=next;
  }
  assert.ok(seen.has(String(dst)),d.id+' walking access');
 }
 const d=entries[0];field.cell=terrain.cell(d.point);
 assert.equal(nearbyDiscoveries(game).length,0);assert.equal(inspectDiscovery(game,{clear:()=>true},d.id,now).ok,false);
 assert.ok(inspectFieldDiscovery(game,terrain,d.id,now));assert.equal(inspectFieldDiscovery(game,terrain,d.id,now),null);
 assert.ok(parseSavedGame(JSON.stringify(game)).discoveries[d.id]);
 assert.throws(()=>returnField(game,terrain));field.cell=[...field.origin];returnField(game,terrain);assert.equal(game.port,'lisbon');
});

test('walking lifts persistent fog and the ranking counts overlapping land and sea once',async()=>{
 const {FieldTerrain,startField,walkField,returnField}=await import('../dist/overland.js');
 const {landTileSeen,landExplorationArea}=await import('../dist/land-exploration.js');
 const {Exploration}=await import('../dist/voyage-core.js');
 const {explorationStats,chartPercentFromScore}=await import('../dist/exploration-score.js');
 const {formatRankScore}=await import('../dist/rank-metrics.js');
 const {gameStats}=await import('../dist/public-stats.js');
 const bytes=await readFile(new URL('../dist/assets/overland-terrain.bin',import.meta.url));
 const terrain=new FieldTerrain(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const game=initialState();
 const field=startField(game,terrain,[-9.14,38.72],'lisbon');
 const original=field.cell,sea=new Exploration();
 const first=explorationStats(sea,game.inland);
 assert.ok(first.explorationArea>0);assert.ok(landTileSeen(game.inland,original));
 assert.equal(gameStats(game).explorationScore,first.explorationScore);
 const moves=[[1,0],[-1,0],[0,-1],[0,1]];
 const todo=[[original,[]]],seen=new Set([String(original)]);let path;
 for(let i=0;i<todo.length;i++){
  const [cell,walk]=todo[i];
  if(cell.some((n,k)=>Math.floor(n/5)!==Math.floor(original[k]/5))){path=walk;break;}
  for(const step of moves){
   const next=cell.map((n,k)=>n+step[k]);
   if(!seen.has(String(next))&&!terrain.barrier(cell,...step)){seen.add(String(next));todo.push([next,[...walk,step]]);}
  }
 }
 assert.ok(path);
 for(const step of path)assert.equal(walkField(game,terrain,...step),'');
 assert.ok(explorationStats(sea,game.inland).explorationScore>first.explorationScore);
 assert.equal(landTileSeen(game.inland,field.cell),true);
 const chart=game.inland.chart;
 for(const step of path.slice().reverse())assert.equal(walkField(game,terrain,...step.map(n=>-n)),'');
 assert.equal(game.inland.chart,chart);
 returnField(game,terrain);
 const restored=parseSavedGame(JSON.stringify(game));
 assert.equal(restored.inland.chart,chart);
 assert.ok(landExplorationArea(restored.inland).walked>0);
 assert.ok(explorationStats(sea,restored.inland).explorationArea>first.explorationArea);
 sea.reveal([-9.14,38.72]);
 const legacy=explorationStats(sea);
 assert.deepEqual(explorationStats(sea,restored.inland),legacy);
 assert.equal(formatRankScore({...legacy,explorationPercent:99},'explorationScore'),chartPercentFromScore(legacy.explorationScore).toFixed(4)+'%');
 assert.throws(()=>parseSavedGame({...restored,inland:{...restored.inland,chart:'broken'}}));
});

test('caravan upgrades improve live pace and cargo capacity, and local transfers preserve cost',async()=>{
 const {FieldTerrain,startField,returnField}=await import('../dist/overland.js');
 const {fieldPace,inlandVehicle,fieldLoad,fieldTransfer,upgradeInlandVehicle,boardFieldCargo}=await import('../dist/inland.js');
 const bytes=await readFile(new URL('../dist/assets/overland-terrain.bin',import.meta.url));
 const terrain=new FieldTerrain(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const game=gameAt('lisbon');
 game.cargo.wine={qty:16,cost:96};
 const field=startField(game,terrain,[-9.14,38.72],'lisbon'),old=inlandVehicle(game);
 assert.throws(()=>fieldTransfer(game,terrain,'wine',11,true),/적재 공간/);
 upgradeInlandVehicle(game);
 assert.ok(fieldPace(inlandVehicle(game))>fieldPace(old));
 assert.equal(inlandVehicle(game).load,15);
 fieldTransfer(game,terrain,'wine',15,true);
 assert.equal(fieldLoad(game),15);
 assert.equal(game.cargo.wine.qty,1);
 assert.equal(field.cargo.wine.cost,90);
 const city=INLAND_CITIES.sintra;
 field.town=city.id;game.inland.towns={sintra:{at:now,port:'lisbon'}};
 const quote=inlandMarketQuote(city,'wine',3,'sell',{},0,now);
 inlandTrade(game,city,'wine',3,'sell',{},0,now,quote);
 assert.equal(fieldLoad(game),12);
 fieldTransfer(game,terrain,'wine',2,false,city.id);
 assert.equal(game.inland.warehouses.sintra.wine.qty,2);
 const restored=parseSavedGame(game);
 assert.equal(restored.inland.field.cargo.wine.qty,10);
 boardFieldCargo(restored,terrain);returnField(restored,terrain);
 assert.deepEqual(restored.cargo.wine,{qty:11,cost:66});
});

test('automatic inland travel finds the shortest legal detour, rejects islands and respects cancellation',async()=>{
 const {FieldTerrain}=await import('../dist/overland.js');
 const {shortestInlandRoute}=await import('../dist/inland-route.js');
 const cells=['11120','11120','11121','11121','11111','11110'];
 const width=cells[0].length,offsets=[0],ends=[];
 for(const row of cells){
  for(let x=1;x<=width;x++)if(row[x]!==row[x-1])ends.push((x<<3)|Number(row[x-1]));
  offsets.push(ends.length);
 }
 const bytes=new ArrayBuffer(8+offsets.length*4+ends.length*2),header=new DataView(bytes);
 header.setUint32(0,0x57574c31);header.setUint16(4,width,true);header.setUint16(6,cells.length,true);
 new Uint32Array(bytes,8,offsets.length).set(offsets);new Uint16Array(bytes,8+offsets.length*4).set(ends);
 const terrain=new FieldTerrain(bytes),start=[2,2],destination=[4,2];
 const detour=await shortestInlandRoute(terrain,start,destination);
 assert.deepEqual(detour,[[2,3],[2,4],[3,4],[4,4],[4,3],[4,2]]);
 assert.equal(await shortestInlandRoute(terrain,start,[3,2]),null);
 assert.deepEqual(await shortestInlandRoute(terrain,start,[0,0]),[[1,1],[0,0]]);
 assert.deepEqual(await shortestInlandRoute(terrain,start,start),[]);
 assert.equal(await shortestInlandRoute(terrain,start,destination,AbortSignal.abort()),null);
 // A water gap at the shoreline makes this second plot unreachable.
 const disconnectedStart=[4,2];
 const cut=new FieldTerrain(bytes.slice(0));
 for(let i=cut.rows[4];i<cut.rows[5];i++)cut.ends[i]=(cut.ends[i]&~7)|0;
 assert.equal(await shortestInlandRoute(cut,start,disconnectedStart),null);
});

test('every inland discovery has a distinct town rumor and a route from its tavern',async()=>{
 const terrain=new FieldTerrain(Uint8Array.from(await readFile(new URL('../dist/assets/overland-terrain.bin',import.meta.url))).buffer);
 const sites=DISCOVERIES.filter(entry=>entry.medium==='land');
 assert.equal(INLAND_RUMORS.length,40);
 assert.equal(new Set(INLAND_RUMORS.map(row=>row.cityId)).size,23);
 assert.equal(new Set(INLAND_RUMORS.map(row=>row.text)).size,sites.length);
 for(const {id,cityId,discoveryId,text} of INLAND_RUMORS){
  const site=sites.find(entry=>entry.id===discoveryId),city=INLAND_CITIES[cityId];
  const start=terrain.landing(city.point,6),end=terrain.cell(site.point);
  assert.equal(city.id,site.fieldCity);
  assert.match(text,/쪽/);
  assert.ok(shortestInlandRoute(terrain,start,end),id);
 }
});
test('inland rumor is recorded once at its town and completion follows existing discoveries',()=>{
 const game=gameAt('lisbon'),city=INLAND_CITIES.sintra,rows=INLAND_RUMORS.filter(row=>row.cityId===city.id);
 game.inland={tier:0,warehouses:{},field:{cell:[3412,1024],origin:[3417,1025],port:'lisbon',town:'sintra'},towns:{sintra:{port:'lisbon',at:now}}};
 assert.deepEqual(inlandTavernRumors(game,city,now),rows);
 assert.throws(()=>readInlandRumor(game,INLAND_RUMORS.find(row=>row.cityId!=='sintra').id,now),/도착/);
 assert.deepEqual(rumorNote(game),[]);
 const [first,second]=rows,before=game.money;
 found(game,[DISCOVERIES.find(entry=>entry.id===second.discoveryId)]);
 assert.deepEqual(readInlandRumor(game,first.id,now),{quiet:true});
 assert.equal(readInlandRumor(game,first.id,now).noWrite,true);
 readInlandRumor(game,second.id,now);
 const saved=parseSavedGame(game),notes=rumorNote(saved);
 assert.equal(notes.find(row=>row.id===first.id).complete,false);
 assert.equal(notes.find(row=>row.id===second.id).complete,true);
 assert.equal(notes.find(row=>row.id===first.id).sourceName,city.name);
 assert.equal(saved.money,before);
 assert.equal(Object.keys(saved.discoveries).length,1);
 assert.equal(saved.rumors.length,2);
 delete game.inland.field;
 assert.throws(()=>readInlandRumor(game,first.id,now),/도착/);
 assert.ok(!rumorsAtTavern(game).some(row=>row.id===first.id));
});
test('land fog follows the saved quarter-degree tile and preserves score and sea bits',()=>{
 const game=gameAt('lisbon'),sea=new Exploration();
 const tile=[3500,1000],point=[-4.975,39.975],sibling=[-4.725,39.975];
 game.inland={};
 assert.equal(landFog(game.inland),null);
 assert.ok(revealLandTile(game.inland,tile));
 const inland=structuredClone(game.inland),fog=landFog(inland),raw=sea.encode();
 const area=landExplorationArea(inland);
 assert.equal(fog,landFog(game.inland));
 assert.deepEqual(fog.chartPixels,[160*1440+700]);
 assert.equal(fog.coverage(50*360+175),1/16);
 assert.equal(fog.seen(...point),true);
 assert.equal(fog.seen(point[0]+360,point[1]),true);
 assert.equal(fog.seen(...sibling),false);
 assert.ok(area.walked>0);
 assert.deepEqual(landExplorationArea(inland,()=>true),{walked:area.walked,additional:0});
 assert.equal(sea.encode(),raw);
 assert.deepEqual(landExplorationArea(inland),area);
});
