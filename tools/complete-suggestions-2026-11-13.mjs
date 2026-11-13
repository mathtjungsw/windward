import {createRequire} from 'node:module';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';

const flags=new Set(process.argv.slice(2));
if(!flags.has('--project=windward-voyage'))throw Error('Specify --project=windward-voyage.');
const install=process.env.WINDWARD_FIREBASE_TOOLS;
if(!install)throw Error('Specify the existing Firebase CLI location.');
const auth=createRequire(import.meta.url)(join(install,'lib/auth.js'));
const account=auth.getGlobalDefaultAccount();
if(!account?.tokens?.refresh_token)throw Error('Existing Firebase CLI login required.');
const access=(await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes)).access_token;
const root='https://windward-voyage-default-rtdb.asia-southeast1.firebasedatabase.app/gameV2/real/suggestions/posts';
const targets=[
 {title:'획득 아이템, 부선장 완료 표시 제안',at:Date.parse('2026-11-13T10:27:20+09:00')},
 {title:'내 배 보기 ui 개선',at:Date.parse('2026-11-13T07:28:22+09:00')},
 {title:'운하 사용 확인',at:Date.parse('2026-11-13T00:51:19+09:00')}
];
async function request(url,options={}){
 const result=await fetch(url,{signal:AbortSignal.timeout(20000),...options,
  headers:{Authorization:'Bearer '+access,'Content-Type':'application/json',...options.headers}});
 if(!result.ok)throw Error('Suggestion update failed: HTTP '+result.status);
 return {value:await result.json(),etag:result.headers.get('etag')};
}
const url=new URL(root+'.json');
url.searchParams.set('orderBy',JSON.stringify('$key'));url.searchParams.set('limitToLast','100');
const {value:posts}=await request(url);
const selected=targets.map(target=>{
 const matches=Object.entries(posts||{}).filter(([,post])=>post.title===target.title&&post.name==='김부장'&&Math.abs(post.at-target.at)<60000);
 if(matches.length!==1)throw Error('Expected exactly one matching suggestion: '+target.title+' ('+matches.length+')');
 return {id:matches[0][0],title:target.title};
});
for(const target of selected){
 if(!flags.has('--apply'))continue;
 const url=root+'/'+encodeURIComponent(target.id)+'.json';
 const before=await request(url,{headers:{'X-Firebase-ETag':'true'}});
 if(before.value.status==='completed')continue;
 await request(url,{method:'PUT',headers:{'if-match':before.etag},body:JSON.stringify({...before.value,
  status:'completed',completedAt:{'.sv':'timestamp'},completedVersion:'2026.11.13-stories-harbors-tax'})});
 const after=(await request(url)).value;
 if(after.status!=='completed'||after.title!==before.value.title||after.body!==before.value.body||after.uid!==before.value.uid)throw Error('Completion verification failed.');
 target.verified=true;
}
const report={at:new Date().toISOString(),apply:flags.has('--apply'),posts:selected};
if(flags.has('--apply'))await writeFile(new URL('../.qa/completed-suggestions-2026-11-13.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
