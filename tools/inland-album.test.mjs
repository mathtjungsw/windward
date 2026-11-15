import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {ARCHIVE_CREDITS} from '../dist/discovery-credits.js';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {LIBRARY_DISCOVERIES} from '../dist/discoveries-library.js';
import {answerQuiz,openQuiz,quizDay,quizReward,quizResetAt,quizCommit} from '../dist/album-quiz.js';
import {INLAND_CITIES,inlandWalk,inlandAccess,inlandHaulQuote,startInlandHaul,settleInlandHaul,inlandTrade,inlandMarketQuote,inlandFree,inlandAvailable,stopInlandHaul} from '../dist/inland.js';
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
