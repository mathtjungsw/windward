import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {initializePortEquity} from '../dist/equity-migration.js';
import {equityRegistry} from '../dist/port-equity.js';
import {invest,withdrawInvestment} from '../dist/commerce.js';
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
async function prepare(uid,id,action,amount){
 const kind=id.startsWith('depot-')?'projects':'ports';
 const old=(await req('gameV2/privateSaves/'+uid,{uid})).value;
 const shared=(await req('gameV2/shared/'+kind+'/'+id,{uid})).value;
 const game=JSON.parse(old.data),content=structuredClone(shared.content);game.port=id;
 const time=Date.now();const result=action==='invest'?invest(game,content,uid,id,amount,time):withdrawInvestment(game,content,uid,id,amount,time,shared.revision,shared.revision);
 content.investorNames??={};content.investorNames[uid]=uid;
 const seq=old.operationSequence+1,op=uid+':'+seq;
 const sdk={ref:(_,p)=>p,get:async p=>({val:()=>(undefined)}),serverTimestamp:()=>timestamp};sdk.get=async p=>{const row=await req(p,{uid});return {val:()=>row.value};};
 const ranks=await ownershipRankChanges({uid,name:uid,sdk},id,shared.content,content,op,kind);
 return {['privateSaves/'+uid]:{...old,revision:old.revision+1,data:JSON.stringify(game),operationSequence:seq,updatedAt:timestamp,lastOperation:{id:op,sequence:seq,kind,key:id,sharedRevision:shared.revision+1,blessingStart:0}},
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
