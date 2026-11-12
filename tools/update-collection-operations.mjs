// Dry run by default. Use only with a maintenance-window or scheduled operator credential.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {overallRanking} from '../dist/overall-ranking.js';
import {collectionProfile} from '../dist/collection-profile.js';
import {parseSavedGame} from '../dist/engine.js';
import {gameStats} from '../dist/public-stats.js';
import {usageDay} from '../dist/ui-usage.js';
import {UI_USAGE_IDS} from '../dist/ui-usage-ids.js';
import {FIREBASE_CONFIG} from '../dist/firebase-config.js';
const [job,...flags]=process.argv.slice(2), apply=flags.includes('--apply'), local=flags.includes('--emulator'), scheduled=flags.includes('--scheduled');
if(!['ranking','backfill','usage'].includes(job))throw Error('Choose ranking, backfill, or usage.');
if(!local&&!flags.includes('--project=windward-voyage'))throw Error('Explicit --project=windward-voyage is required.');
if(scheduled&&(local||job==='backfill'))throw Error('Scheduled credentials are only used for production aggregation.');
const root=local?'http://127.0.0.1:9000/':'https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/';
let bearer=local?'owner':process.env.WINDWARD_OPERATIONS_TOKEN;
async function scheduledIdToken(accessToken){
 const issuer=process.env.WINDWARD_OPERATIONS_ACCOUNT;
 if(!accessToken||!issuer?.endsWith('@windward-voyage.iam.gserviceaccount.com'))throw Error('Missing scheduled service identity.');
 const issued=Math.floor(Date.now()/1000);
 const payload=JSON.stringify({iss:issuer,sub:issuer,aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
  iat:issued,exp:issued+300,uid:'windward-scheduled-operations',claims:{windwardOperations:true}});
 const signUrl='https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+encodeURIComponent(issuer)+':signJwt';
 const signed=await fetch(signUrl,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({payload})});
 if(!signed.ok)throw Error('Service token signing failed: '+signed.status);
 const {signedJwt}=await signed.json();
 const authUrl=new URL('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken');
 authUrl.searchParams.set('key',FIREBASE_CONFIG.apiKey);
 const signedIn=await fetch(authUrl,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({token:signedJwt,returnSecureToken:true})});
 if(!signedIn.ok)throw Error('Operations sign-in failed: '+signedIn.status);
 const {idToken}=await signedIn.json();
 if(!idToken)throw Error('Operations sign-in did not return a token.');
 return idToken;
}
const scheduledToken=scheduled?await scheduledIdToken(bearer):null;
if(!bearer){
 const install=process.env.WINDWARD_FIREBASE_TOOLS;
 if(!install)throw Error('An operator credential or Firebase CLI path is required.');
 const auth=createRequire(import.meta.url)(join(install,'lib','auth.js')), account=auth.getGlobalDefaultAccount();
 if(!account?.tokens?.refresh_token)throw Error('Sign into the Firebase CLI first.');
 bearer=(await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes)).access_token;
}
async function read(key,method='GET',body,etag,shallow=false){
 const url=new URL('gameV2/'+key+'.json',root);
 if(local)url.searchParams.set('ns',process.env.WINDWARD_EMULATOR_NS||'demo-windward-collections');
 if(scheduledToken)url.searchParams.set('auth',scheduledToken);
 if(shallow)url.searchParams.set('shallow','true');
 const res=await fetch(url,{method,signal:AbortSignal.timeout(25000),headers:{...(scheduledToken?{}:{Authorization:'Bearer '+bearer}),'Content-Type':'application/json',...(method==='GET'&&!shallow?{'X-Firebase-ETag':'true'}:{}),...(etag?{'if-match':etag}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(res.status===412)return {conflict:true};
 if(!res.ok)throw Error('Operations request failed: '+res.status+' '+key);
 return {value:(await res.json())??{},etag:res.headers.get('etag')};
}
const safeUid=id=>/^[\w-]{1,128}$/.test(id);
const now=Date.now(), timestamp={'.sv':'timestamp'}, DAY=86400000;
if(job==='ranking'){
 const [ranks,ports,current]=await Promise.all(['real/rankings','real/portRankings','real/overallRanking'].map(path=>read(path)));
 const result=overallRanking(ranks.value,ports.value);
 if(apply&&(await read('real/overallRanking','PUT',{public:{top:result.top,updatedAt:timestamp},captains:result.captains},current.etag)).conflict)throw Error('Concurrent rank update; rerun.');
 console.log({apply,ranked:Object.keys(result.captains).length,top:Object.keys(result.top).length});
}
if(job==='backfill'){
 const [saves,profiles]=await Promise.all(['privateSaves','accounts'].map(path=>read(path)));
 let updated=0, skipped=0;
 for(const [uid,save] of Object.entries(saves.value)){
  if(!safeUid(uid)||!Number.isInteger(save.revision)||save.schemaVersion>8){skipped++;continue;}
  let game;try{game=parseSavedGame(save.data);}catch{skipped++;continue;}
  const [collection,rank]=await Promise.all(['collections','rankings'].map(path=>read('real/'+path+'/'+uid)));
  if((collection.value.revision||0)>save.revision||(rank.value.saveRevision||0)>save.revision){skipped++;continue;}
  const name=rank.value.name||profiles.value[uid]?.name;
  if(!name){skipped++;continue;}
  if(apply){
   const result=await read('real/collections/'+uid,'PUT',{...collectionProfile(game),revision:save.revision,updatedAt:timestamp},collection.etag);
   const scores=await read('real/rankings/'+uid,'PUT',{...rank.value,...gameStats(game),name,saveRevision:save.revision,updatedAt:timestamp},rank.etag);
   if(result.conflict||scores.conflict){skipped++;continue;}
  }
  updated++;
 }
 console.log({apply,updated,skipped});
}
if(job==='usage'){
 const shallow=key=>read(key,'GET',undefined,undefined,true);
 const [raw,prior]=await Promise.all(['operations/uiUsage','operations/uiUsageDaily'].map(shallow));
 const recent=usageDay(now-30*DAY), rolling=usageDay(now-7*DAY), expires=usageDay(now-90*DAY), changes={};
 const today=usageDay(now), dates=Object.keys(raw.value).filter(date=>/^20\d\d-\d\d-\d\d$/.test(date));
 const active=dates.filter(date=>date>=rolling&&date<=today).sort();
 let deleted=0,retained=0;
 for(const date of dates)if(date<recent){changes['uiUsage/'+date]=null;deleted++;}
 for(const date of active){
  const {value}=await read('operations/uiUsage/'+date),counts={};
  for(const batches of Object.values(value))for(const row of Object.values(batches)){
   if(row?.day!==date)continue;
   retained++;
   for(const event of String(row.events||'').split(';')){
    const match=/^([mp])-([0-9]{3}):(\d{1,5}),(\d{1,5}),(\d{1,5})$/.exec(event);
    if(!match||!UI_USAGE_IDS[Number(match[2])])continue;
    const key=match[1]+'-'+UI_USAGE_IDS[Number(match[2])],total=counts[key]??={shown:0,clicked:0,completed:0};
    total.shown+=Number(match[3]);total.clicked+=Number(match[4]);total.completed+=Number(match[5]);
   }
  }
  changes['uiUsageDaily/'+date]=counts;
 }
 for(const date of Object.keys(prior.value))if(date<expires)changes['uiUsageDaily/'+date]=null;
 if(apply&&Object.keys(changes).length)await read('operations','PATCH',changes);
 console.log({apply,expiredRawDays:deleted,recentBatches:retained,days:active.length});
}
