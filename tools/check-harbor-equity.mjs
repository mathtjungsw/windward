import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {initializePortEquity} from '../dist/equity-migration.js';
import {equityRegistry} from '../dist/port-equity.js';
import {executeTrade,captainTradeQuote,portMarketItem,marketKind,invest,withdrawInvestment,deliverForGrowth,growthDeliveryInfo} from '../dist/commerce.js';
import {availableCharters,charterAction} from '../dist/guild-contracts.js';
import {RELEASE} from '../dist/release-notes.js';
import {voyageWeek} from '../dist/weekly-chart.js';
import {ownershipRankChanges,ownedPortSummary} from '../dist/port-rankings.js';
const ns='demo-windward-harbor-equity',timestamp={'.sv':'timestamp'},now=Date.now();
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(uid){const t=Math.floor(Date.now()/1000);return encode({alg:'none',typ:'JWT'})+'.'+encode({aud:ns,iss:'https://securetoken.google.com/'+ns,sub:uid,user_id:uid,iat:t,exp:t+3600,firebase:{sign_in_provider:'google.com',identities:{}}})+'.';}
async function req(path,{uid,admin=false,method='GET',body}={}){
 const url=new URL(path+'.json','http://127.0.0.1:9000/');url.searchParams.set('ns',ns);if(uid)url.searchParams.set('auth',token(uid));
 const response=await fetch(url,{method,headers:{'content-type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,value:await response.json()};
}
await req('.settings/rules',{admin:true,method:'PUT',body:JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url),'utf8'))});
await req('',{admin:true,method:'DELETE'});
const actors=['equity-a','equity-b','equity-c'],[a,b,c]=actors;
for(const uid of actors){
 const game={...initialState(),money:5000000,noviceGraduated:true};
 await req('gameV2/accounts/'+uid,{admin:true,method:'PUT',body:{name:uid}});
 await req('gameV2/privateSaves/'+uid,{admin:true,method:'PUT',body:{revision:1,schemaVersion:20,defenseSeq:0,noviceGraduated:true,session:uid,leaseUntil:now+90000,operationSequence:0,updatedAt:now,data:JSON.stringify(game)}});
 await req('gameV2/real/rankings/'+uid,{admin:true,method:'PUT',body:{name:uid,money:5000000,profit:0,visited:1,updatedAt:now}});
 await req('gameV2/real/portRankings/'+uid,{admin:true,method:'PUT',body:{name:uid,ownedPortCount:uid===a?2:0,everOwned:uid===a,revision:1,updatedAt:now}});
}
const harbor='developed-bergen',depot='depot-davao';
for(const id of[harbor,depot]){
 const content=id===harbor?{_version:1,developedOwner:a,developerName:a,development:{name:'베르겐',level:2},foundingPaid:400000}:{_version:1,registeredOwner:a,registeredCapital:300000,investors:{[a]:180000,[b]:120000},readyAt:now-3600000,startedAt:now-25200000,promotion:{level:2,support:0,startedAt:now-1000},stock:400,registryName:'다바오 공동 보급항',dividends:{[b]:17}};
 initializePortEquity(content,id,now);content.investorNames={[a]:a,[b]:b};
 const kind=id===depot?'projects':'ports';
 await req('gameV2/shared/'+kind+'/'+id,{admin:true,method:'PUT',body:{revision:1,content,updatedAt:now}});
 await req('gameV2/harborRegistry/'+id,{admin:true,method:'PUT',body:equityRegistry(id,content)});
 if(kind==='ports')await req('gameV2/real/ownedPorts/'+id,{admin:true,method:'PUT',body:{...ownedPortSummary(id,content,a),operationId:'seed',updatedAt:now}});
}
async function prepare(uid,id,action,amount,kind=id.startsWith('depot-')?'projects':'ports'){
 const old=(await req('gameV2/privateSaves/'+uid,{uid})).value;
 const shared=(await req('gameV2/shared/'+kind+'/'+id,{uid})).value;
 const game=JSON.parse(old.data),content=structuredClone(shared.content);game.port=id;
 const time=Date.now();
 let result;
 if(typeof action==='function')result=action(game,content,time,shared.revision);
 else{
  result=action==='invest'?invest(game,content,uid,id,amount,time):withdrawInvestment(game,content,uid,id,amount,time,shared.revision,shared.revision);
  content.investorNames??={};content.investorNames[uid]=uid;
 }
 const seq=old.operationSequence+1,op=uid+':'+seq;
 const sdk={ref:(_,p)=>p,get:async p=>({val:()=>(undefined)}),serverTimestamp:()=>timestamp};sdk.get=async p=>{const row=await req(p,{uid});return {val:()=>row.value};};
 const ranks=kind==='personal'?{}:await ownershipRankChanges({uid,name:uid,sdk},id,shared.content,content,op,kind);
 return {['privateSaves/'+uid]:{...old,revision:old.revision+1,data:JSON.stringify(game),operationSequence:seq,updatedAt:timestamp,lastOperation:{id:op,sequence:seq,kind,key:id,sharedRevision:shared.revision+1,blessingStart:0,...(Number.isSafeInteger(result.eraWindow)?{marketEra:result.eraWindow}:{})}},
  ['shared/'+kind+'/'+id]:{revision:shared.revision+1,content,updatedAt:timestamp,lastOperation:{id:op,uid,sequence:seq,saveRevision:old.revision+1}},...ranks,...(result.registry?{['harborRegistry/'+id]:result.registry}:{})};
}
async function commit(uid,patch,expected=200){const response=await req('gameV2',{uid,method:'PATCH',body:patch});if(response.status!==expected)await writeFile('.qa/equity-rejected-patch.json',JSON.stringify({uid,patch,ns}));assert.equal(response.status,expected,JSON.stringify(response.value));}
for(const id of[harbor,depot]){
 const amount=id===harbor?400000:60000;
 await commit(b,await prepare(b,id,'invest',amount));
 assert.equal((await req('gameV2/harborRegistry/'+id,{uid:a})).value.ownerUid,'');
 const proposal=await prepare(b,id,'invest',10000),racing=await prepare(c,id,'invest',10000);
 const forged=structuredClone(proposal);forged['harborRegistry/'+id].ownerUid=c;
 await commit(b,forged,401);
 await commit(b,proposal);await commit(c,racing,401);
 assert.equal((await req('gameV2/harborRegistry/'+id,{uid:a})).value.ownerUid,b);
 const available=id===harbor?410000:190000;
 await commit(b,await prepare(b,id,'withdraw',available));
 assert.equal((await req('gameV2/harborRegistry/'+id,{uid:a})).value.ownerUid,a);
}
const after=(await req('gameV2/real/portRankings/'+a,{uid:a})).value;
assert.equal(after.ownedPortCount,2);
assert.equal((await req('gameV2/shared/projects/'+depot+'/content/dividends/'+b,{uid:b})).value,17);
const patch=await prepare(c,harbor,'invest',10000),forged=structuredClone(patch);
forged['shared/ports/'+harbor].content.investors[a]++;
await commit(c,forged,401);
const invalid=structuredClone(patch);invalid['privateSaves/'+c].schemaVersion=19;
await req('gameV2/config/minSchema',{admin:true,method:'PUT',body:20});
await commit(c,invalid,401);await commit(c,patch);
console.log('PASS: direct and promoted harbor investment, strict-majority transfer, 20% withdrawal, rank and registry updates, stale-revision rejection, retained old income, peer-stake protection and minimum schema 20.');

const expansion='developed-casablanca';
const founder={_version:1,developedOwner:a,developerName:a,development:{name:'카사블랑카',level:1},facilityInvested:400000};
await req('gameV2/shared/ports/'+expansion,{admin:true,method:'PUT',body:{revision:1,content:founder,updatedAt:now}});
await req('gameV2/harborRegistry/'+expansion,{admin:true,method:'PUT',body:{id:expansion,name:'카사블랑카',level:1,ownerUid:a}});
const expansionPatch=await prepare(a,expansion,(game,content,time)=>{
 game.money-=200000;content.development.level=2;content.facilityInvested+=200000;
 assert.equal(initializePortEquity(content,expansion,time),true);
 return {registry:equityRegistry(expansion,content)};
});
await commit(a,expansionPatch);
assert.equal((await req('gameV2/harborRegistry/'+expansion,{uid:a})).value.level,2);
await commit(a,expansionPatch,401);
await commit(a,await prepare(a,expansion,'invest',10000));

const {registerDevelopedPorts}=await import('../dist/data.js?v='+RELEASE);
registerDevelopedPorts({[depot]:{id:depot,kind:'depot',level:1,promotionLevel:2,opensAt:now-3600000,name:'다바오'}});
const arrival=await req('gameV2/shared/projects/'+depot,{uid:a});
assert.equal(arrival.value.content.promotion.level,2);
await req('gameV2/shared/ports/'+depot,{admin:true,method:'PUT',body:{revision:1,content:{_version:1,growthContribution:10},updatedAt:now}});
const delivery=await prepare(a,depot,(game,content,time)=>{
 const order=growthDeliveryInfo(content,depot,time,a);
 game.cargo[order.good]={qty:12,cost:120};
 return deliverForGrowth(game,content,a,depot,time,order.day);
},0,'ports');
await commit(a,delivery);
await commit(a,delivery,401);
const afterDelivery=(await req('gameV2/shared/ports/'+depot,{uid:a})).value;
assert.equal(afterDelivery.content.growthContribution,20);
assert.equal(afterDelivery.content.growthDelivery.captains[a],true);
assert.equal((await req('gameV2/shared/projects/'+depot,{uid:a})).value.revision,arrival.value.revision);

await req('gameV2/shared/ports/'+depot+'/content/growthContribution',{admin:true,method:'PUT',body:290});
const finalGrowth=await prepare(b,depot,(g,c,t)=>{
 const info=growthDeliveryInfo(c,depot,t,b);
 g.cargo[info.good]={qty:10,cost:80};
 return deliverForGrowth(g,c,b,depot,t,info.day);
},0,'ports');
await commit(b,finalGrowth);
await commit(b,finalGrowth,401);
const fullGrowth=(await req('gameV2/shared/ports/'+depot,{uid:b})).value;
assert.equal(fullGrowth.content.growthContribution,300);
assert.equal(growthDeliveryInfo(fullGrowth.content,depot,Date.now(),c).done,true);
const guildPatch=await prepare(b,depot,(game,c,time,revision)=>{
 const opts={room:200,findRoute:()=>({total:250}),baseFame:100};
 game.port='lisbon';game.knownPorts=['lisbon',depot];
 const row=availableCharters(game,opts.findRoute,opts.room,time).find(r=>r.tier===5);
 charterAction(game,'accept',row.id,time,opts);
 game.port=depot;game.cargo[row.good]={qty:row.qty,cost:40};
 assert.equal(marketKind(depot,row.good),'projects');
 const q=captainTradeQuote(game,depot,row.good,row.qty,'sell',portMarketItem(c,depot,row.good,revision),time,0);
 return charterAction(game,'deliver',row.id,time,{...opts,trade:r=>executeTrade(game,c,b,depot,r.good,r.qty,'sell',q,time,revision)});
});
await commit(b,guildPatch);
const guildSave=JSON.parse((await req('gameV2/privateSaves/'+b,{uid:b})).value.data);
assert.equal(guildSave.guild.completed,1);
assert.ok(!guildSave.cargo.wine);
assert.equal((await req('gameV2/shared/ports/'+depot,{uid:a})).value.revision,fullGrowth.revision);

const {INLAND_CITIES,inlandWalk}=await import('../dist/inland.js');
const {nextCoast,takeCoast,visitCoast}=await import('../dist/coast-orders.js');
const personal='gameV2/shared/personal/'+c;
await req(personal,{admin:true,method:'PUT',body:{revision:1,content:{_version:1},updatedAt:now}});
// These three locations can still have a saved pre-field timed return.
for(const city of [INLAND_CITIES.cordoba,INLAND_CITIES.avignon,INLAND_CITIES.puebla]){
 let target;
 const received=await prepare(c,c,(game,_content,time)=>{
  game.port=city.port;game.voyage=null;
  inlandWalk(game,city,time-600000,false);
  inlandWalk(game,city,game.inland.visit.due,true);
  target=nextCoast(game);
  return takeCoast(game,target.id,time);
 },0,'personal');
 await commit(c,received);
 const readGame=async()=>JSON.parse((await req('gameV2/privateSaves/'+c,{uid:c})).value.data);
 assert.equal((await readGame()).coastBook.active,target.id);
 const passage=await prepare(c,c,(game,_content,time)=>{
  const [x,y]=target.point;game.port=null;
  assert.equal(visitCoast(game,[x-.6,y],[x+.6,y],time).id,target.id);
  return {};
 },0,'personal');
 await commit(c,passage);
 assert.ok((await readGame()).coastBook.found[target.id]);
}
console.log('PASS: promoted guild sale, final shared growth delivery, and three inland returns with fragment receipt and sketch read back from Firebase.');

const week=voyageWeek(Date.now()),route='lisbon|porto',chart='gameV2/real/weeklyVoyages/';
assert.equal((await req(chart+week+'/'+a+'/'+route,{uid:a,method:'PUT',body:true})).status,200);
assert.equal((await req(chart+week+'/'+a+'/'+route,{uid:b,method:'PUT',body:true})).status,401);
assert.equal((await req(chart+(week-2)+'/'+a+'/'+route,{uid:a,method:'PUT',body:true})).status,401);
assert.equal((await req(chart+week,{uid:b})).value[a][route],true);
console.log('PASS: legacy 1→2 expansion and cash follow-up, promoted depot growth delivery, one-time settlement and shared chart week boundaries.');
