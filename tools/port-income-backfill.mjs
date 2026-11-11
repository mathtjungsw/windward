import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {PORT_BY_ID} from '../dist/data.js';
import {ownership} from '../dist/commerce.js';
import {initializeBasicIncome} from '../dist/port-income.js';

export function planPortIncome(portId,record,activation,now){
  if(!Object.hasOwn(PORT_BY_ID,portId)||PORT_BY_ID[portId].depot||!record?.content||
    !Number.isSafeInteger(record.revision)||record.revision<0||!Number.isSafeInteger(activation)||activation<0||activation>now)return null;
  const content={...record.content},owner=ownership(content).ownerUid;
  const ownedAt=Number.isSafeInteger(content.ownerSince)&&content.ownerSince<=now?content.ownerSince:0;
  if(!initializeBasicIncome(content,portId,owner,Math.max(activation,ownedAt)))return null;
  return {...record,revision:record.revision+1,content};
}

async function main(){
  const args=new Set(process.argv.slice(2)),emulator=args.has('--emulator'),apply=args.has('--apply');
  const activationArg=[...args].find(v=>v.startsWith('--activation='))?.slice(13)||'';
  const activation=/(Z|[+-][0-9]{2}:[0-9]{2})$/i.test(activationArg)?Date.parse(activationArg):NaN;
  const now=Date.now();
  if(!Number.isSafeInteger(activation)||activation<0||activation>now)throw Error('Use --activation=<past ISO timestamp with timezone>.');
  if(!emulator&&!args.has('--project=windward-voyage'))throw Error('Specify --emulator or --project=windward-voyage.');
  let bearer='owner';
  if(!emulator){
    const root=process.env.WINDWARD_FIREBASE_TOOLS;
    if(!root)throw Error('WINDWARD_FIREBASE_TOOLS is required.');
    const auth=createRequire(import.meta.url)(path.join(root,'lib/auth.js'));
    const account=auth.getGlobalDefaultAccount();
    bearer=(await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes)).access_token;
  }
  const base=emulator?'http://127.0.0.1:9000/':'https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/';
  const backup=new URL('../.qa/port-income-backfill/'+new Date().toISOString().replace(/[:.]/g,'-')+'/',import.meta.url);
  if(apply)await mkdir(backup,{recursive:true});
  async function request(key,{shallow=false,body,etag}={}){
    const url=new URL('gameV2/shared/ports'+(key?'/'+encodeURIComponent(key):'')+'.json',base);
    if(emulator)url.searchParams.set('ns','demo-windward-port-income');
    if(shallow)url.searchParams.set('shallow','true');
    const response=await fetch(url,{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',
      ...(etag?{'If-Match':etag}:!shallow?{'X-Firebase-ETag':'true'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(response.status===412)return null;
    if(!response.ok)throw Error('Port income request failed: '+response.status);
    return {record:await response.json(),etag:response.headers.get('etag')};
  }
  const keys=Object.keys((await request('',{shallow:true})).record||{}).filter(id=>Object.hasOwn(PORT_BY_ID,id)&&!PORT_BY_ID[id].depot);
  let eligible=0,changed=0;
  const conflicts=[];
  for(const id of keys){
    for(let attempt=0;attempt<5;attempt++){
      const {record,etag}=await request(id),next=planPortIncome(id,record,activation,Date.now());
      if(!next)break;
      if(!attempt)eligible++;
      if(!apply)break;
      if(!etag)throw Error('Missing ETag for '+id);
      await writeFile(new URL(id+'-'+attempt+'.json',backup),JSON.stringify(record),{flag:'wx'});
      if(await request(id,{body:next,etag})){changed++;break;}
      if(attempt===4)conflicts.push(id);
    }
  }
  console.log(JSON.stringify({apply,activation:new Date(activation).toISOString(),scanned:keys.length,eligible,changed,conflicts,backup:apply?backup.pathname:null}));
  if(conflicts.length)process.exitCode=1;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
