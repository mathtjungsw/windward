// Explicit, backed-up, conditional root migration. RTDB PATCH does not support
// ETag preconditions; a one-time root PUT is required to commit all participants
// and protocol activation atomically. No periodic whole-database read is added.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {buildEnrollment} from './enrollment-data.mjs';
const args=new Set(process.argv.slice(2)),emulator=args.has('--emulator'),apply=args.has('--apply');
if(!emulator&&!args.has('--project=windward-voyage'))throw Error('Explicit --project=windward-voyage is required.');
let bearer='owner';if(!emulator){const require=createRequire(import.meta.url),root=process.env.WINDWARD_FIREBASE_TOOLS;if(!root)throw Error('WINDWARD_FIREBASE_TOOLS is required.');const auth=require(path.join(root,'lib/auth.js')),a=auth.getGlobalDefaultAccount();bearer=(await auth.getAccessToken(a.tokens.refresh_token,a.tokens.scopes)).access_token;}
const base=emulator?'http://127.0.0.1:9000/':'https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/',ns='demo-windward-enrollment';
async function request(key,{method='GET',body,etag}={}){const u=new URL(key+'.json',base);if(emulator)u.searchParams.set('ns',ns);const response=await fetch(u,{method,headers:{Authorization:'Bearer '+bearer,'content-type':'application/json',...(method==='GET'?{'X-Firebase-ETag':'true'}:{}),...(etag?{'if-match':etag}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(response.status===412)return {conflict:true};if(!response.ok)throw Error('Migration request failed: '+response.status);return {value:await response.json(),etag:response.headers.get('etag')};}
const backup=new URL('../.qa/offline-enrollment/'+new Date().toISOString().replace(/[:.]/g,'-')+'/',import.meta.url);await mkdir(backup,{recursive:true});
for(let retry=0;retry<8;retry++){
 const observed=await request('gameV2'),{root,stats}=buildEnrollment(observed.value,Date.now());
 await writeFile(new URL('before-'+retry+'.json',backup),JSON.stringify(observed.value));
 if(!apply){console.log(JSON.stringify({apply:false,...stats}));break;}
 const result=await request('gameV2',{method:'PUT',body:root,etag:observed.etag});
 if(result.conflict){if(retry===7)throw Error('World kept changing; no stale snapshot was written. Rerun safely.');continue;}
 const verified=await request('gameV2/config');if(verified.value.minSchema!==6)throw Error('Protocol verification failed.');
 await writeFile(new URL('result.json',backup),JSON.stringify({apply:true,...stats,verified:true},null,2));console.log(JSON.stringify({apply:true,...stats,verified:true}));break;
}
