// One-time, authorized ship conversion. Reads only private saves and related
// public profiles, backs up each revision, and uses ETags to preserve live edits.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseSavedGame} from '../dist/engine.js';
import {RAFT_START_ID,applyRaftStart} from '../dist/raft-start.js';
import {gameStats} from '../dist/public-stats.js';
const args=new Set(process.argv.slice(2)),apply=args.has('--apply'),emulator=args.has('--emulator');
if(!emulator&&!args.has('--project=windward-voyage'))throw Error('Explicit --project=windward-voyage is required.');
const base=emulator?'http://127.0.0.1:9000/':'https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=path.join(root,'.qa',RAFT_START_ID,new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(dir,{recursive:true});
let bearer='owner';
if(!emulator){
 const require=createRequire(import.meta.url),auth=require(path.join(process.env.WINDWARD_FIREBASE_TOOLS,'lib','auth.js'));
 const account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw Error('Firebase CLI login is required.');
 const token=await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes);bearer=token.access_token;
}
async function request(p,{method='GET',body,etag,shallow=false}={}){
 const url=new URL(p+'.json',base);if(emulator)url.searchParams.set('ns','demo-windward-chat');if(shallow)url.searchParams.set('shallow','true');
 const r=await fetch(url,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',...(method==='GET'&&!shallow?{'X-Firebase-ETag':'true'}:{}),...(etag?{'if-match':etag}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(r.status===412)return {conflict:true};if(!r.ok)throw Error(`Database ${method} failed (${r.status}) at ${p}.`);
 return {value:await r.json(),etag:r.headers.get('etag')};
}
const summary={apply,emulator,checked:0,converted:0,alreadyApplied:0,downgraded:0,returned:0,totalRefund:0,failures:0},details=[],seen=new Set();
async function syncSummary(uid,game,revision){
 const p='gameV2/real/rankings/'+uid,stats=gameStats(game);
 for(let retry=0;retry<5;retry++){
  const latest=await request(p),row=latest.value;
  if((row?.saveRevision||0)>revision||row&&Object.entries(stats).every(([k,v])=>row[k]===v))return;
  const name=row?.name||(await request('gameV2/accounts/'+uid+'/name')).value;if(!name)return;
  const written=await request(p,{method:'PUT',body:{...stats,name,saveRevision:revision,updatedAt:{'.sv':'timestamp'}},etag:latest.etag});if(!written.conflict)return;
 }
 throw Error('Public summary changed repeatedly; rerun to repair its summary.');
}
async function convert(uid){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(uid))throw Error('Unexpected UID format.');
 const p='gameV2/privateSaves/'+uid;
 for(let attempt=0;attempt<6;attempt++){
  const before=await request(p);if(!before.value)return;
  const record=before.value;if(record.schemaVersion>4)throw Error('Newer save schema; original preserved.');
  const game=parseSavedGame(record.data);if(game.raftStart?.id===RAFT_START_ID&&record.schemaVersion===4){if(apply)await syncSummary(uid,game,record.revision);summary.alreadyApplied++;return;}
  const rankPath='gameV2/real/rankings/'+uid,rankBefore=await request(rankPath);
  await writeFile(path.join(dir,uid+'.r'+record.revision+'.before.json'),JSON.stringify({record,ranking:rankBefore.value},null,2),{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  const result=applyRaftStart(game),revision=record.revision+1;
  const next={...record,schemaVersion:4,revision,data:JSON.stringify(game),session:'admin-'+RAFT_START_ID,leaseUntil:0,updatedAt:{'.sv':'timestamp'}};
  if(!apply){summary.converted++;summary.totalRefund+=result.refund;summary.downgraded+=Number(!!result.downgraded);summary.returned+=Number(!!result.returnedPort);details.push({uid,refund:result.refund,revision,preview:true});return;}
  const committed=await request(p,{method:'PUT',body:next,etag:before.etag});if(committed.conflict)continue;
  const saved=JSON.parse(committed.value.data);if(committed.value.revision!==revision||saved.raftStart?.id!==RAFT_START_ID||saved.shipTier!==0||saved.fleetCount!==1)throw Error('Committed conversion verification failed.');
  await syncSummary(uid,saved,revision);
  summary.converted++;summary.totalRefund+=result.refund;summary.downgraded+=Number(!!result.downgraded);summary.returned+=Number(!!result.returnedPort);details.push({uid,refund:result.refund,revision});return;
 }
 throw Error('Repeated live-save conflicts; no stale overwrite attempted.');
}
for(let round=0;round<3;round++){
 const keys=Object.keys((await request('gameV2/privateSaves',{shallow:true})).value||{}).filter(uid=>!seen.has(uid));if(!keys.length)break;
 for(const uid of keys){seen.add(uid);summary.checked++;try{await convert(uid);}catch(e){summary.failures++;details.push({uid,error:e.message});}}
}
await writeFile(path.join(dir,'receipt.json'),JSON.stringify({summary,details},null,2));
console.log(JSON.stringify(summary));console.log('Private backup and receipt:',path.relative(root,dir));
if(summary.failures)process.exitCode=1;
