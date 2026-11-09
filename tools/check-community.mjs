import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const ns='demo-windward-community',stamp={'.sv':'timestamp'},enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function token(uid){const t=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({aud:ns,iss:'https://securetoken.google.com/'+ns,sub:uid,user_id:uid,iat:t,exp:t+3600,firebase:{sign_in_provider:'google.com',identities:{}}})+'.';}
async function req(path,{uid,admin=false,method='GET',body,query={}}={}){const u=new URL(path+'.json','http://127.0.0.1:9000/');u.searchParams.set('ns',ns);if(uid)u.searchParams.set('auth',token(uid));for(const [k,v]of Object.entries(query))u.searchParams.set(k,JSON.stringify(v));const r=await fetch(u,{method,headers:{'content-type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};}
assert.equal((await req('.settings/rules',{admin:true,method:'PUT',body:JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url)))})).status,200);
await req('gameV2',{admin:true,method:'PUT',body:{accounts:{a:{name:'선장 A'},b:{name:'선장 B'}}}});
const board='gameV2/real/suggestions',key=n=>'-T'+String(n).padStart(18,'0'),post=(uid='a',extra={})=>({uid,name:'선장 '+uid.toUpperCase(),title:'바다 개선',body:'모바일에서 찾기 쉽게 해 주세요.',at:stamp,...extra});
async function submit(id,uid='a',extra={}){return req(board,{uid,method:'PATCH',body:{['posts/'+id]:post(uid,extra),['lastSent/'+uid]:{postId:id,at:stamp}}});}
assert.equal((await req(board+'/posts',{query:{orderBy:'$key',limitToLast:20}})).status,401,'login required');
assert.equal((await submit(key(1),'a')).status,200,'atomic suggestion and cooldown');
assert.equal((await submit(key(2),'a')).status,401,'server cooldown');
assert.equal((await submit(key(3),'b',{name:'다른 이름'})).status,401,'author name bound to account');
assert.equal((await submit(key(4),'b',{body:'가'.repeat(1201)})).status,401,'body size cap');
assert.equal((await req(board+'/posts/'+key(5),{uid:'b',method:'PUT',body:post('b')})).status,401,'cooldown receipt required');
assert.equal((await req(board+'/posts/'+key(1),{uid:'a',method:'DELETE'})).status,401,'no silent removal');
assert.equal((await req(board+'/posts/'+key(1),{uid:'a',method:'PATCH',body:{title:'바꾼 글'}})).status,401,'submitted records immutable');
assert.equal((await req(board+'/lastSent/a',{uid:'a',method:'DELETE'})).status,401,'cannot erase cooldown');
await req(board+'/lastSent/a/at',{admin:true,method:'PUT',body:Date.now()-61000});assert.equal((await submit(key(6))).status,200,'after one minute');
assert.equal((await req(board+'/posts',{uid:'a'})).status,401,'no unbounded feed');assert.equal((await req(board+'/posts',{uid:'a',query:{orderBy:'$key',limitToLast:21}})).status,401,'maximum twenty');
for(let i=20;i<45;i++)await req(board+'/posts/'+key(i),{admin:true,method:'PUT',body:post('a',{at:Date.now()})});
const page=(await req(board+'/posts',{uid:'a',query:{orderBy:'$key',limitToLast:20}}));assert.equal(page.status,200);assert.equal(Object.keys(page.value).length,20);const first=Object.keys(page.value).sort()[0];const older=(await req(board+'/posts',{uid:'a',query:{orderBy:'$key',limitToLast:20,endAt:first}})).value;assert.ok(Object.keys(older).every(id=>id<=first));
assert.equal((await req('gameV2/real/ownedPorts/seville',{uid:'a',method:'PUT',body:{ownerUid:'a',ownerName:'선장 A',portName:'세비야',share:100,kind:'general',defaultRate:0,operationId:'fake',updatedAt:stamp}})).status,401,'cannot forge ownership directory');
assert.equal((await req('gameV2/real/ownedPorts',{uid:'a'})).status,401);assert.equal((await req('gameV2/real/ownedPorts',{uid:'a',query:{orderBy:'$key',limitToFirst:124}})).status,200);
console.log('PASS: suggestion author, immutable posts, server cooldown, size caps, bounded pages, and protected ownership directory');
