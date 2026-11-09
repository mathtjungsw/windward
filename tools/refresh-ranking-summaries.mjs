// Explicit release migration: public derived summaries only. Never writes a save.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseSavedGame} from '../dist/engine.js';
import {gameStats} from '../dist/public-stats.js';
import {ownership} from '../dist/commerce.js';
import {ownedPortSummary} from '../dist/port-rankings.js';
const args=new Set(process.argv.slice(2)),emulator=args.has('--emulator'),apply=args.has('--apply');
if(!emulator&&!args.has('--project=windward-voyage'))throw Error('Explicit --project=windward-voyage is required.');
const base=emulator?'http://127.0.0.1:9000/':'https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/',namespace='demo-windward-ranking-bootstrap';
let bearer='owner';
if(!emulator){const require=createRequire(import.meta.url),root=process.env.WINDWARD_FIREBASE_TOOLS;if(!root)throw Error('WINDWARD_FIREBASE_TOOLS is required.');const auth=require(path.join(root,'lib','auth.js')),account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw Error('Firebase CLI login required.');bearer=(await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes)).access_token;}
async function request(key,{method='GET',body,etag}={}){if(method!=='GET'&&!key.startsWith('gameV2/real/rankings/')&&!key.startsWith('gameV2/real/portRankings/')&&!key.startsWith('gameV2/real/ownedPorts/'))throw Error('Only public summary writes are permitted.');const url=new URL(key+'.json',base);if(emulator)url.searchParams.set('ns',namespace);const r=await fetch(url,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',...(method==='GET'?{'X-Firebase-ETag':'true'}:{}),...(etag?{'if-match':etag}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.status===412)return {conflict:true};if(!r.ok)throw Error('Firebase summary request failed: '+r.status);return {value:await r.json(),etag:r.headers.get('etag')};}
const paths=['privateSaves','shared/ports','real/rankings','real/portRankings','accounts','real/ownedPorts'];const loaded=await Promise.all(paths.map(p=>request('gameV2/'+p)));const [saves,ports,ranks,ownerRanks,profiles]=loaded.map(r=>r.value||{});
const backup=new URL('../.qa/ranking-refresh/'+new Date().toISOString().replace(/[:.]/g,'-')+'/',import.meta.url);await mkdir(backup,{recursive:true});await writeFile(new URL('before.json',backup),JSON.stringify(Object.fromEntries(paths.map((p,i)=>[p,loaded[i].value]))));
const counts={};for(const envelope of Object.values(ports)){const c=envelope.content||{},owner=ownership(c).ownerUid;if(owner){if((c.developedOwner||c.ownerUid)!==owner)throw Error('Ownership metadata needs verification; no save was changed.');counts[owner]=(counts[owner]||0)+1;}}
const result={apply,emulator,saveRecords:Object.keys(saves).length,ownerProfilesCreated:0,existingOwnerProfiles:0,summariesEnriched:0,skippedNewerSummary:0,ownedPortsCreated:0};
for(const [id,envelope]of Object.entries(ports)){const owner=ownership(envelope.content||{}).ownerUid;if(!owner)continue;const summary=ownedPortSummary(id,envelope.content,profiles[owner]?.name||ranks[owner]?.name||ownerRanks[owner]?.name);if(!summary.ownerName)throw Error('Owned port has no public captain name.');const key='gameV2/real/ownedPorts/'+id,current=await request(key);if(current.value)continue;const row={...summary,operationId:envelope.lastOperation?.id||'bootstrap',updatedAt:{'.sv':'timestamp'}};if(!apply||!(await request(key,{method:'PUT',body:row,etag:current.etag})).conflict)result.ownedPortsCreated++;}
for(const uid of new Set([...Object.keys(saves),...Object.keys(ranks),...Object.keys(counts)])){if(!/^[\w-]{1,128}$/.test(uid))throw Error('Unexpected UID format.');const name=profiles[uid]?.name||ranks[uid]?.name||ownerRanks[uid]?.name;if(!name)continue;
 const ownerPath='gameV2/real/portRankings/'+uid,current=await request(ownerPath);
 if(current.value){result.existingOwnerProfiles++;}
 else{const row={name,ownedPortCount:counts[uid]||0,revision:1,updatedAt:{'.sv':'timestamp'}};if(apply){const written=await request(ownerPath,{method:'PUT',body:row,etag:current.etag});if(written.conflict){result.existingOwnerProfiles++;}else result.ownerProfilesCreated++;}else result.ownerProfilesCreated++;}
 const save=saves[uid];if(!save)continue;if(save.schemaVersion>5)throw Error('Newer private save schema; original preserved.');const stats=gameStats(parseSavedGame(save.data));
 for(let retry=0;retry<5;retry++){const key='gameV2/real/rankings/'+uid,latest=await request(key);if((latest.value?.saveRevision||0)>save.revision){result.skippedNewerSummary++;break;}const row={...(latest.value||{}),...stats,name,saveRevision:save.revision,updatedAt:{'.sv':'timestamp'}};if(!apply){result.summariesEnriched++;break;}const written=await request(key,{method:'PUT',body:row,etag:latest.etag});if(!written.conflict){result.summariesEnriched++;break;}if(retry===4)throw Error('Public summary kept changing; rerun safely.');}
}
await writeFile(new URL('result.json',backup),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
