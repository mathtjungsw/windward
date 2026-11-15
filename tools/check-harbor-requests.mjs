import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {quizDay,quizReward} from '../dist/album-quiz.js';
const ns='demo-windward-harbor-requests',stamp={'.sv':'timestamp'};
const alpha='alpha-harbor',bravo='bravo-harbor',third='third-harbor',port='macau';
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(uid){
 const t=Math.floor(Date.now()/1000);
 return b64({alg:'none',typ:'JWT'})+'.'+b64({aud:ns,iss:'https://securetoken.google.com/'+ns,sub:uid,user_id:uid,iat:t,exp:t+3600,auth_time:t,firebase:{sign_in_provider:'google.com',identities:{}}})+'.';
}
async function req(path,method='GET',body,uid){
 const url=new URL(path+'.json','http://127.0.0.1:9000/');url.searchParams.set('ns',ns);
 if(uid)url.searchParams.set('auth',token(uid));
 const result=await fetch(url,{method,headers:{'Content-Type':'application/json',...(!uid?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:result.status,value:await result.json()};
}
const rules=JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url),'utf8'));
assert.equal((await req('.settings/rules','PUT',rules)).status,200);
assert.equal((await req('gameV2','DELETE')).status,200);
const savePath=uid=>'gameV2/privateSaves/'+uid;
for(const uid of [alpha,bravo]){
 const game=initialState();game.money=1000;
 assert.equal((await req(savePath(uid),'PUT',{schemaVersion:5,revision:1,operationSequence:0,session:'session-'+uid,leaseUntil:Date.now()+90000,data:JSON.stringify(game),updatedAt:Date.now()})).status,200);
 await req('gameV2/real/rankings/'+uid,'PUT',{name:uid});
}
const sharedPath='shared/ports/'+port;
await req('gameV2/'+sharedPath,'PUT',{revision:1,content:{_version:1,ownerUid:bravo,investors:{[bravo]:300000},blacklist:[alpha]},updatedAt:Date.now()});
async function patch(uid,kind,key,content,difference,extra){
 const prior=(await req(savePath(uid),'GET',undefined,uid)).value,shared=kind==='ports'?sharedPath:'shared/personal/'+uid;
 const old=(await req('gameV2/'+shared)).value,version=(old?.revision||0)+1,seq=prior.operationSequence+1,id='session-'+uid+':'+seq,revision=prior.revision+1;
 const game=JSON.parse(prior.data);game.money+=difference;delete prior.name;
 const record={...prior,revision,operationSequence:seq,updatedAt:stamp,data:JSON.stringify(game),lastOperation:{id,sequence:seq,kind,key,sharedRevision:version}};
 return req('gameV2','PATCH',{['privateSaves/'+uid]:record,[shared]:{revision:version,content:{...content,_version:1},updatedAt:stamp,lastOperation:{id,uid,sequence:seq,saveRevision:revision}},...extra},uid);
}
const trade='tradeRequests/'+bravo+'/'+port+'/'+alpha;
const sent={name:alpha,body:'교역 재개 요청',status:'pending',at:stamp};
const send=await req('gameV2/'+trade,'PUT',sent,alpha);assert.equal(send.status,200,JSON.stringify(send));
assert.ok((await req('gameV2/'+trade,'GET',undefined,third)).status>=400);
assert.ok((await req('gameV2/'+trade,'PUT',sent,alpha)).status>=400);
const request=(await req('gameV2/'+trade)).value;
const approval={...request,answeredAt:stamp,status:'accepted'};
const approved=await patch(bravo,'ports',port,{ownerUid:bravo,investors:{[bravo]:300000}},0,{[trade]:approval});
assert.equal(approved.status,200,JSON.stringify(approved));
const mail='captainMail/'+bravo+'/letter-test';
const unread='mailUnread/'+bravo+'/letter-test';
const draft={from:alpha,name:alpha,body:'보급비',amount:200,at:stamp,state:'pending'};
const sentMail=await patch(alpha,'personal',alpha,{},-200,{[mail]:draft,[unread]:true});
assert.equal(sentMail.status,200,JSON.stringify(sentMail));
assert.equal((await req('gameV2/'+unread,'GET',undefined,bravo)).value,true);
assert.ok((await req('gameV2/'+unread,'GET',undefined,alpha)).status>=400);
assert.ok((await req('gameV2/'+unread,'DELETE',undefined,third)).status>=400);
assert.equal((await req('gameV2/'+unread,'DELETE',undefined,bravo)).status,200);
const block='mailBlocks/'+bravo+'/'+alpha;
assert.equal((await req('gameV2/'+block,'PUT',true,bravo)).status,200);
assert.equal((await req('gameV2/'+block,'GET',undefined,alpha)).value,true);
assert.ok((await req('gameV2/'+block,'GET',undefined,third)).status>=400);
assert.ok((await patch(alpha,'personal',alpha,{},-100,{[mail+'-blocked']:draft,[unread+'-blocked']:true})).status>=400);
assert.equal((await req('gameV2/'+block,'DELETE',undefined,bravo)).status,200);
assert.ok((await req('gameV2/'+mail,'GET',undefined,third)).status>=400);
const letter=(await req('gameV2/'+mail)).value;
const accepted={...letter,state:'accepted',closed:stamp};
const received=await patch(bravo,'personal',bravo,{},200,{[mail]:accepted});
assert.equal(received.status,200,JSON.stringify(received));
assert.ok((await patch(alpha,'personal',alpha,{},200,{[mail]:{...letter,state:'cancelled',closed:stamp}})).status>=400);
assert.ok((await patch(bravo,'personal',bravo,{},200,{[mail]:accepted})).status>=400);
for(const [uid,expected] of [[alpha,800],[bravo,1200]])assert.equal(JSON.parse((await req(savePath(uid))).value.data).money,expected);
const quiz='albumQuizDays/'+alpha+'/book',day=quizDay(Date.now()),count=84,reward=quizReward(count);
const question={day,question:day+'-book-sample',correct:'book-nanjung',count,reward};
assert.ok((await patch(alpha,'personal',alpha,{},0,{[quiz]:{...question,day:day-1}})).status>=400);
assert.ok((await patch(alpha,'personal',alpha,{},0,{[quiz]:{...question,reward:8000}})).status>=400);
assert.equal((await patch(alpha,'personal',alpha,{},0,{[quiz]:question})).status,200);
assert.ok((await req('gameV2/'+quiz,'GET',undefined,bravo)).status>=400);
assert.ok((await patch(alpha,'personal',alpha,{},0,{[quiz]:{...question,choice:'book-florentine',paid:reward}})).status>=400);
assert.equal((await patch(alpha,'personal',alpha,{},reward,{[quiz]:{...question,choice:question.correct,paid:reward}})).status,200);
assert.ok((await patch(alpha,'personal',alpha,{},reward,{[quiz]:{...question,choice:question.correct,paid:reward}})).status>=400);
const harbor='jamestown',presence='gameV2/harborPresence/'+harbor+'/'+alpha;
await req('gameV2/shared/ports/'+harbor,'PUT',{revision:1,content:{harborPractice:{attacker:alpha,defender:bravo,state:'active',end:Date.now()+60000}}});
assert.ok((await req(presence,'PUT',{at:stamp},third)).status>=400);
assert.equal((await req(presence,'PUT',{at:stamp},alpha)).status,200);
console.log('PASS: private mail, daily quiz formula and claims, and harbor presence under Firebase emulator rules');
