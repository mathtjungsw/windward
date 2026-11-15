import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {markNovice,noviceActive,nextShipEndsProtection} from '../dist/novice.js';
import {captainTradeQuote,executeTrade,taxRate} from '../dist/commerce.js';
import {createRouteLookup,fillSearchRoutes,summarizeSearchRoute} from '../dist/route-search.js';

test('search shows passage, actual sailing estimate, supply and toll separately',()=>{
 const game={...initialState(),money:10,food:2,port:null};
 const port={id:'jeddah'},route={total:620,sections:[{start:0,end:420,river:false},{start:420,end:620,river:true}],passages:[{id:'canal-suez'}],tollTotal:35};
 const result=summarizeSearchRoute(game,port,route,{'canal-suez':'수에즈 운하'});
 assert.equal(result.distance,620);assert.match(result.text,/620해리 · 약 [\d.]+일 · 수에즈 운하 경유 · 통행료 35 D/);
 assert.match(result.text,/직항 보급 부족.*통행료 부족/);
 assert.match(summarizeSearchRoute(game,port,null,{},true).text,/운하 확인 전/);
 assert.equal(summarizeSearchRoute({...game,port:'jeddah'},port,null).distance,0);
});
test('one search prepares canal data once and drops outdated results',async()=>{
 let initialized=0,computed=0,sent=0,active=true;
 const lookup=createRouteLookup(()=>++initialized,port=>({id:port.id,distance:++computed}));
 const a={id:'lisbon'},b={id:'porto'};
 assert.equal(await lookup(a),await lookup(a));
 assert.equal((await lookup(b)).distance,2);
 await fillSearchRoutes([a,b],lookup,()=>sent++,()=>active,async()=>{active=false;});
 assert.deepEqual([initialized,computed,sent],[1,2,0]);
});
test('stored hulls count toward protection graduation and losing assets does not restore it',()=>{
 const g=initialState();assert.equal(markNovice(g),false);assert.equal(noviceActive(g),true);
 g.storedShips=[{tier:4}];assert.equal(noviceActive(g),true);assert.equal(nextShipEndsProtection(g,{added:1}),true);
 g.storedShips.push({tier:4});assert.equal(markNovice(g),true);
 g.storedShips=[];assert.equal(noviceActive(g),false);
 const high=initialState();high.storedShips=[{tier:9}];assert.equal(markNovice(high),true);
 const owner=initialState();markNovice(owner,true);assert.equal(markNovice(owner,false),true);
});
test('novice tax changes the quote and settlement without adding port revenue',()=>{
 const g={...initialState(),port:'seville',food:1,cargo:{wine:{qty:3,cost:30}}};
 const content={investors:{owner:300000},defaultRate:30};
 markNovice(g);const time=Date.now();
 assert.equal(taxRate(content,'a','seville',g),0);
 assert.equal(taxRate(content,'a','seville',{...g,noviceGraduated:true}),30);
 const q=captainTradeQuote(g,'seville','wine',3,'sell',{},time,0),before=g.money;
 const done=executeTrade(g,content,'a','seville','wine',3,'sell',q,time,0);
 assert.equal(done.noviceTax,true);assert.equal(g.money,before+q.gross);assert.equal(content.treasury,undefined);
});
test('web manual index covers new systems and pretty URLs resolve',async()=>{
 const base=new URL('../dist/guide/',import.meta.url);
 const rows=JSON.parse(await readFile(new URL('search-index.json',base),'utf8'));
 assert.ok(rows.find(r=>r.id==='officers').keywords.includes('부선장 어디서 고용'));
 assert.ok(rows.find(r=>r.id==='combat').keywords.includes('대포 있는데 발사 안 됨'));
 assert.equal(rows.length,11);
 for(const row of rows)assert.ok((await readFile(new URL(row.id+'/index.html',base),'utf8')).includes(row.title));
});
