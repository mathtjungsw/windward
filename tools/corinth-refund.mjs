import {createRequire} from 'node:module';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const args=process.argv.slice(2);
assert.ok(args.includes('--project=windward-voyage'),'Specify the production project explicitly');
const auth=createRequire(import.meta.url)(join(process.env.WINDWARD_FIREBASE_TOOLS,'lib/auth.js'));
const account=auth.getGlobalDefaultAccount();
const bearer=(await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes)).access_token;
const root='https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/';
async function request(path,method='GET',body,etag){
  const response=await fetch(root+path+'.json',{method,signal:AbortSignal.timeout(20000),headers:{
    Authorization:'Bearer '+bearer,'Content-Type':'application/json',
    ...(method==='GET'?{'X-Firebase-ETag':'true'}:{}),...(etag?{'If-Match':etag}:{})
  },...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.ok(response.ok,path+' '+response.status);
  return {value:await response.json(),etag:response.headers.get('etag')};
}

const project=(await request('gameV2/shared/projects/canal-corinth')).value;
const {investors={},dividends={}}=project?.content||{};
const records={};
for(const uid of new Set([...Object.keys(investors),...Object.keys(dividends)])){
  const principal=investors[uid]||0,dividend=dividends[uid]||0;
  assert.match(uid,/^[\w-]{1,128}$/);
  assert.ok(Number.isSafeInteger(principal)&&principal>=0);
  assert.ok(Number.isSafeInteger(dividend)&&dividend>=0);
  const amount=Math.floor(principal*6/5)+dividend;
  if(amount)records[uid]={principal,dividend,amount,projectRevision:project.revision};
}
const payouts=Object.values(records).map(record=>record.amount).sort((a,b)=>b-a);
if(args.includes('--apply')){
  assert.equal((await request('releaseStatus')).value.maintenance,true);
  const rules=(await request('.settings/rules')).value.rules;
  assert.ok(!rules.gameV2,'Close client access before creating refund receipts');
  assert.deepEqual(payouts,[840000,360000,240000],'The live ledger differs from the reviewed payout');
  const path='gameV2/corinthRefunds',current=await request(path);
  if(current.value)assert.deepEqual(current.value,records,'Different receipts already exist');
  else await request(path,'PUT',records,current.etag);
  assert.deepEqual((await request(path)).value,records);
}
console.log({applied:args.includes('--apply'),investors:payouts.length,payouts,total:payouts.reduce((a,b)=>a+b,0)});
