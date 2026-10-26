// Explicit live integration check; creates and cleans up only its own temporary guests/boats.
import assert from 'node:assert/strict';
import {FIREBASE_CONFIG as config} from '../dist/firebase-config.js';
const guests=[];
async function identity(action,body){
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${config.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)throw Error(`Firebase identity check failed (${response.status})`);
  return response.json();
}
async function request(path,{guest,method='GET',body,query={}}={}){
  const url=new URL(`${config.databaseURL}/${path}.json`);
  if(guest)url.searchParams.set('auth',guest.idToken);
  for(const [key,value]of Object.entries(query))url.searchParams.set(key,JSON.stringify(value));
  return fetch(url,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
try{
  for(let i=0;i<2;i++)guests.push(await identity('signUp',{returnSecureToken:true}));
  const [a,b]=guests,boat={name:'연결검증',lon:-9.14,lat:38.72,angle:0,color:0,status:'정박',updatedAt:{'.sv':'timestamp'}};
  assert.equal((await request(`fleet/v1/${a.localId}`,{guest:a,method:'PUT',body:boat})).status,200,'own boat write');
  assert.equal((await request(`fleet/v1/${a.localId}`,{guest:b,method:'PUT',body:boat})).status,401,'other boat overwrite blocked');
  assert.equal((await request(`fleet/v1/${a.localId}`,{guest:a,method:'PUT',body:{...boat,lat:100}})).status,401,'invalid coordinates blocked');
  const bounded={orderBy:'updatedAt',limitToLast:30,startAt:Date.now()-90000};
  assert.equal((await request('fleet/v1',{query:bounded})).status,401,'unauthenticated read blocked');
  assert.equal((await request('fleet/v1',{guest:a,query:{orderBy:'updatedAt'}})).status,401,'unbounded read blocked');
  const response=await request('fleet/v1',{guest:b,query:bounded});assert.equal(response.status,200,'limited fleet read');
  assert.equal((await response.json())[a.localId].name,boat.name,'second guest sees boat');
  console.log('Firebase live checks passed: own write, peer read, ownership, coordinate validation, anonymous denial, bounded queries.');
}finally{
  for(const guest of guests){
    await request(`fleet/v1/${guest.localId}`,{guest,method:'DELETE'});
    await identity('delete',{idToken:guest.idToken});
  }
}
