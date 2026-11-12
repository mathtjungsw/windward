import test from 'node:test';
import assert from 'node:assert/strict';
import {CaptainRankings,RANK_METRICS} from '../dist/rankings.js';
import {CaptainRoster} from '../dist/captains.js';

// Firebase's ordered tree stops for any truthy callback return, including push's
// numeric length. Array.forEach is not a faithful substitute for this API.
function snapshot(rows){return {forEach(fn){for(const [key,value]of rows)if(fn({key,val:()=>value}))return true;return false;}};}
const profiles=Array.from({length:27},(_,i)=>['qa-'+String(i).padStart(2,'0'),{...Object.fromEntries(RANK_METRICS.map(m=>[m,i])),name:'검증 선장 '+i,money:1000+i,profit:i,visited:[2,16,12,9,4][i]||1,explorationScore:i,explorationPercent:i/10000,fame:i*50}]);
function fixture(){
 const fleet={root:'gameV2/real',db:{},uid:'qa-00'};let receive,stops=0,lastFilters;
 const sdk={ref:(_,p)=>p,orderByChild:x=>({metric:x}),orderByKey:()=>({key:true}),limitToLast:n=>({last:n}),limitToFirst:n=>({first:n}),startAt:n=>({start:n}),startAfter:x=>({after:x}),query:(ref,...filters)=>({ref,filters}),onValue(q,fn){receive=fn;return ()=>stops++;},async get(q){lastFilters=q.filters;const after=q.filters.find(f=>f.after)?.after;return snapshot(profiles.filter(([id])=>!after||id>after).slice(0,20));}};
 fleet.sdk=sdk;const rankings=new CaptainRankings(fleet,()=>{});rankings.connect();return {fleet,rankings,receive:rows=>receive(snapshot(rows)),get stops(){return stops;},get filters(){return lastFilters;}};
}
test('each top-five subscription reads all five rows before sorting, including the highest visited count',()=>{
 const f=fixture();for(const metric of RANK_METRICS.filter(id=>id!=='overallScore')){f.rankings.select(metric);const rows=[...profiles].sort((a,b)=>a[1][metric]-b[1][metric]).slice(-5);f.receive(rows);assert.equal(f.rankings.rows[metric].length,5);assert.equal(f.rankings.rows[metric][0][metric],Math.max(...profiles.map(([,p])=>p[metric])));}
 assert.equal(f.rankings.rows.visited[0].visited,16);f.rankings.setVisible(false);assert.equal(f.rankings.visible,false);assert.ok(f.stops>=5);
});
test('all captains paginate through twenty plus seven persistent profiles without losing offline entries',async()=>{
 const f=fixture(),first=await f.rankings.page();assert.equal(first.length,20);assert.equal(first[0].id,'qa-00');assert.equal(first.at(-1).id,'qa-19');assert.ok(f.filters.some(p=>p.first===20));
 const second=await f.rankings.page(first.at(-1).id);assert.equal(second.length,7);assert.equal(second[0].id,'qa-20');assert.equal(new Set([...first,...second].map(p=>p.id)).size,27);
});
test('online captain snapshot retains every member while duplicate sessions are merged',()=>{
 const now=Date.now(),members=['a','b','c','a'].map((uid,i)=>['session-'+i,{uid,name:uid,color:0,status:'항해',updatedAt:now-i}]);
 const f={root:'gameV2/real',shipKey:'a_session',db:{},onChange:()=>{},sdk:{ref:(_,p)=>p,query:(...p)=>p,orderByChild:x=>x,startAt:x=>x,limitToLast:x=>x,onValue(q,fn){fn(snapshot(members));return ()=>{};}}};
 const roster=new CaptainRoster(f);roster.connect();assert.equal(roster.records.length,4);assert.deepEqual(roster.list(now).map(p=>p.uid),['a','b','c']);
});
