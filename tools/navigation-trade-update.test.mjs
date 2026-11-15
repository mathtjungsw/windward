import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {GOODS,PORTS} from '../dist/data.js';
import {regionalFactor} from '../dist/regional-economy.js';
import {tradeQuote,stockState,MARKET_V2_AT,STOCK_PERIOD} from '../dist/market-rules.js';
import {investmentBase,invest} from '../dist/commerce.js';
import {buildEnrollment} from './enrollment-data.mjs';
import {recoverEnrollmentCache} from '../dist/enrollment.js';
import {defenseFromGame,navigationCheckpoint,restoreNavigation,routeKey} from '../dist/defense-core.js';
import {layoutChartLabels} from '../dist/chart-labels.js';
import {PLACE_NAMES} from '../dist/place-names.js';
import {watchSectorPages} from '../dist/sector-pages.js';
const byId=Object.fromEntries(PORTS.map(p=>[p.id,p]));
test('supply and local demand multiply even for imported stock; Europe pays for cacao and porcelain',()=>{
 for(const port of PORTS.filter(p=>p.region==='유럽'))for(const id of ['cacao','porcelain']){assert.equal(port.economy.demandTiers[id],1.8);assert.ok(regionalFactor(port,id,GOODS[id])>=2);}
 assert.ok(regionalFactor(byId.lisbon,'cacao',GOODS.cacao)>regionalFactor(byId.havana,'cacao',GOODS.cacao));
 for(const p of PORTS)for(const id of p.market)assert.ok(GOODS[id]);
 for(const p of PORTS)for(const id of p.market)for(let h=0;h<24;h+=3){const time=Date.UTC(2026,10,10,h),buy=tradeQuote(p.id,id,1,'buy',{},time,0),sell=tradeQuote(p.id,id,1,'sell',{},time,0);assert.ok(sell.total<buy.total,'same-port resale cannot mint cash');}
});
test('eight representative two-way routes retain margins through a full real day, including 10% destination tax',()=>{
 const routes=[['lisbon','porto','wine','driedfish'],['london','havana','wool','cacao'],['london','macau','wool','porcelain'],['venice','goa','glass','porcelain'],['goa','zanzibar','cotton','cloves'],['muscat','goa','dates','cotton'],['london','nagasaki','wool','porcelain'],['lisbon','recife','wine','dyewood']];
 for(const [a,b,out,back]of routes)for(const [source,dest,id]of [[a,b,out],[b,a,back]]){assert.ok(byId[source].market.includes(id));for(let h=0;h<24;h++){const t=Date.UTC(2026,10,10,h),cost=tradeQuote(source,id,1,'buy',{},t).total,revenue=tradeQuote(dest,id,1,'sell',{},t,10).total;assert.ok(revenue>cost,`${source}→${dest}/${id}, hour ${h}: ${revenue-cost}`);}}
});
test('old capped stock does not turn past full-stock time into twenty extra boxes; partial interval survives',()=>{
 const at=MARKET_V2_AT;assert.deepEqual(stockState({stock:10,stockAt:at-30*STOCK_PERIOD},at),{stock:10,stockAt:at});assert.equal(stockState({stock:10,stockAt:at-30*STOCK_PERIOD},at+STOCK_PERIOD).stock,11);
 const partial={stock:3,stockAt:at-STOCK_PERIOD*.75};assert.equal(stockState(partial,at+STOCK_PERIOD*.24).stock,3);assert.equal(stockState(partial,at+STOCK_PERIOD*.25).stock,4);assert.equal(stockState({stock:0,stockAt:at,stockVersion:2},at+40*STOCK_PERIOD).stock,30);
});
test('new acquisition thresholds preserve past investment and exact strict majority',()=>{
 assert.equal(investmentBase('seville'),200000);assert.equal(investmentBase('london'),600000);const g=initialState();g.port='seville';g.money=1000000;const c={};assert.throws(()=>invest(g,c,'a','seville',190000));invest(g,c,'a','seville',200000);invest(g,c,'b','seville',200000);assert.equal(c.ownerUid,null);invest(g,c,'b','seville',10000);assert.equal(c.ownerUid,'b');assert.equal(c.investors.a,200000);
});
test('offline enrollment is idempotent, preserves net assets and historical last seen, and safely carries the old boundary cache',()=>{
 const g=initialState();Object.assign(g,{port:null,money:1000,cargo:{wine:{qty:20,cost:123}},position:[-17,34]});const save={schemaVersion:5,revision:9,session:'old',data:JSON.stringify(g),updatedAt:1000},root={privateSaves:{u:save},accounts:{u:{name:'선장'}},real:{rankings:{u:{lastSeenAt:1000}}},shared:{ports:{seville:{content:{investors:{u:300000}}}}}},enrolled=buildEnrollment(root,2000),record=enrolled.root.privateSaves.u,game=parseSavedGame(record.data);
 assert.equal(game.money+game.battleReserve.money,1000);assert.equal(game.cargo.wine.qty+JSON.parse(game.battleReserve.cargoJSON).wine.qty,20);assert.equal(enrolled.root.real.rankings.u.lastSeenAt,1000);assert.deepEqual(enrolled.root.shared,root.shared);
 assert.equal(buildEnrollment(enrolled.root,3000).stats.registered,0);assert.equal(buildEnrollment(enrolled.root,3000).root.privateSaves.u.revision,10);
 const cached={pending:true,revision:9,data:{...g,food:9,day:1,position:[-16.8,34]}},recovered=recoverEnrollmentCache(record,cached);assert.equal(recovered.food,9);assert.equal(recovered.money+recovered.battleReserve.money,1000);assert.deepEqual(recovered.position,cached.data.position);assert.equal(recoverEnrollmentCache({...record,revision:11},cached),null);
});
test('checkpoint cannot resurrect a canceled route or apply new progress to an old destination; asset publish preserves latest point',()=>{
 const g=initialState();g.voyage={path:[[-17,34],[-18,35]],target:null,origin:null,total:100,lengths:[100],travelled:5,foodRemaining:1};const record={revision:4,data:JSON.stringify(g)},manual=structuredClone(g);manual.voyage=null;manual.position=[-17.1,34];const cp=navigationCheckpoint(manual,record,2);assert.notEqual(cp.routeKey,routeKey(g.voyage));assert.deepEqual(restoreNavigation(structuredClone(g),cp,4),g);
 const newRoute=structuredClone(g);newRoute.voyage.path.at(-1)[0]=-20;assert.notEqual(routeKey(g.voyage),routeKey(newRoute.voyage));
 const old=defenseFromGame(manual,{}, {session:'s'},1000);old.positionSeq=2;old.point=[-16,33];old.portId='';const node=defenseFromGame(manual,old,{session:'s'},2000);assert.deepEqual(node.point,old.point);assert.equal(node.positionSeq,2);
});
test('sixty labels declutter in screen space, yield to controls, and never mutate exploration',()=>{
 assert.equal(PLACE_NAMES.length,60);const names=Array.from({length:20},(_,i)=>({id:''+i,name:'해역 '+i,lon:i*30+35,lat:80,priority:i,kind:'sea'})),project=([x,y])=>({x,y}),blocked=[{x:440,y:50,w:200,h:100}];const labels=layoutChartLabels(names,project,{width:1280,height:300,blocked});assert.ok(labels.length<=16);assert.ok(!labels.some(l=>l.lon>420&&l.lon<660));assert.ok(layoutChartLabels(names,project,{width:390,height:300}).length<=8);
});
test('full nearby sector pages include old offline hulls past 100 and retire stale page cursors',()=>{
 const subs=[],s={orderByKey:()=>({kind:'order'}),limitToFirst:n=>({kind:'limit',n}),startAfter:key=>({kind:'after',key}),query:(base,...args)=>({base,args}),onValue:(q,fn)=>{const sub={q,fn,stopped:false};subs.push(sub);return ()=>sub.stopped=true;}};let found;const stop=watchSectorPages(s,'near',rows=>found=rows,()=>{}),snap=rows=>({forEach:fn=>rows.forEach(([key,value])=>fn({key,val:()=>value}))});
 const rows=Array.from({length:100},(_,i)=>[String(i).padStart(3,'0'),{offline:true}]);subs[0].fn(snap(rows));assert.equal(subs.length,2);assert.equal(subs[1].q.args.find(x=>x.kind==='after').key,'099');subs[1].fn(snap([['100',{offline:true}]]));assert.equal(found.length,101);subs[0].fn(snap(rows.slice(0,99)));assert.equal(found.length,99);assert.equal(subs[1].stopped,true);stop();assert.equal(subs[0].stopped,true);
});
