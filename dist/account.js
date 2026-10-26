import {FIREBASE_CONFIG} from './firebase-config.js';
import {captainName} from './presence-core.js';
import {initialState,loadState,SAVE_KEY} from './engine.js';
import {worldId} from './voyage-core.js';

export function accountName(value){
  const name=String(value||'').normalize('NFKC').trim();
  if(!name||name.length>16||!/[\p{L}\p{N}]/u.test(name)||/[<>\u0000-\u001f\u007f]/.test(name))throw Error('이름은 글자나 숫자를 포함해 1~16자로 입력해 주세요.');
  return name;
}
export function validPin(pin){return /^\d{6}$/.test(pin);}
export async function captainAddress(name){
  const bytes=new TextEncoder().encode(accountName(name).toLocaleLowerCase('ko-KR'));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')+'@captain.windward.invalid';
}
export const localSaveKey=(uid,world)=>`windward-account-v2:${uid}:${worldId(world)}`;
export function parseGame(value){
  if(typeof value==='string')try{value=JSON.parse(value);}catch{throw Error('저장 형식을 확인할 수 없어요. 기존 기록은 보존했어요.');}
  if(!value||typeof value!=='object')throw Error('저장 형식을 확인할 수 없어요. 기존 기록은 보존했어요.');
  const s=loadState({getItem:()=>JSON.stringify(value)});
  if(value.version!==1||s.money!==value.money||s.day!==value.day||s.port!==value.port||s.food!==value.food||s.level!==value.level||JSON.stringify(s.cargo)!==JSON.stringify(value.cargo)||JSON.stringify(s.visited)!==JSON.stringify(value.visited))throw Error('손상된 저장을 확인했어요. 기존 기록을 보존했어요.');
  return s;
}
export function authMessage(error){
  const code=String(error?.code||error?.message||'');
  if(code.includes('email-already-in-use'))return '이미 사용 중인 이름이에요. 이어하기를 선택하거나 다른 이름으로 시작해 주세요.';
  if(/invalid-credential|wrong-password|user-not-found|invalid-login-credentials/.test(code))return '이름 또는 숫자 6자리가 맞지 않아요.';
  if(/too-many-requests/.test(code))return '시도가 많아 잠시 쉬어야 해요. 조금 뒤 다시 입력해 주세요.';
  if(/operation-not-allowed|password-does-not-meet/.test(code))return '서버의 테스트 계정 설정을 확인해야 해요. 기존 저장으로 혼자 항해할 수 있어요.';
  if(/network|timeout|unavailable/.test(code))return '서버에 연결하지 못했어요. 인터넷을 확인해 주세요. 기존 저장은 그대로예요.';
  return error?.message||'접속하지 못했어요. 기존 저장은 그대로 보존했어요.';
}

export class CaptainAccount{
  constructor(storage){this.storage=storage;this.session=crypto.randomUUID();this.revision=0;this.ready=false;this.busy=false;this.dirty=false;this.lost=false;this.onStatus=()=>{};this.onConflict=()=>{};this.readGame=()=>null;}
  async setup(){
    if(this.sdk)return;
    const base='https://www.gstatic.com/firebasejs/12.4.0/';
    const [appSdk,authSdk,dbSdk]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);
    this.app=appSdk.initializeApp(FIREBASE_CONFIG,'windward-accounts');this.authSdk=authSdk;this.sdk=dbSdk;
    this.auth=authSdk.initializeAuth(this.app,{persistence:authSdk.inMemoryPersistence});this.db=dbSdk.getDatabase(this.app);
  }
  async login({name,pin,mode,world,importLegacy=false,takeover=false}){
    name=accountName(name);if(!validPin(pin))throw Error('비밀번호는 숫자 6자리로 입력해 주세요.');
    await this.setup();this.world=worldId(world);
    const address=await captainAddress(name);
    let user;
    const existing=mode!=='new'||this.pendingUser&&this.pendingAddress===address;
    user=(await (existing?this.authSdk.signInWithEmailAndPassword(this.auth,address,pin):this.authSdk.createUserWithEmailAndPassword(this.auth,address,pin))).user;
    this.pendingUser=user;this.pendingAddress=address;this.uid=user.uid;
    this.ref=this.sdk.ref(this.db,`privateSaves/${this.uid}/${this.world}`);
    const cachedText=this.storage.getItem(localSaveKey(this.uid,this.world));
    let cached=null;try{cached=JSON.parse(cachedText);}catch{}
    let legacy=initialState();if(importLegacy&&this.world==='peace'&&this.storage.getItem(SAVE_KEY)){try{legacy=parseGame(JSON.parse(this.storage.getItem(SAVE_KEY)));}catch{throw Error('기존 저장을 확인하지 못했어요. 원본은 그대로 두었어요. 가져오기를 해제하거나 기존 기록을 복구한 뒤 다시 시도해 주세요.');}}legacy.world=this.world;if(this.world==='real')legacy.speed=1;
    let block='',recovered=false;
    const result=await this.sdk.runTransaction(this.ref,current=>{
      if(current?.session!==this.session&&current?.leaseUntil>Date.now()&&!takeover){block='session';return;}
      if(cached?.pending&&current&&(cached.revision!==current.revision)){block='conflict';return;}
      const data=cached?.pending&&(!current||cached.revision===current.revision)?cached.data:current?.data||legacy;
      recovered=!!cached?.pending;
      return {revision:(current?.revision||0)+1,data:typeof data==='string'?data:JSON.stringify(data),session:this.session,leaseUntil:Date.now()+90000,updatedAt:this.sdk.serverTimestamp()};
    },{applyLocally:false});
    if(!result.committed){const error=Error(block==='session'?'다른 창이나 기기에서 이 항해를 진행 중이에요. 여기서 이어가면 다른 화면은 멈춥니다.':'이 기기의 미전송 기록과 서버 기록이 달라요. 두 기록을 보존했어요.');error.code=block;throw error;}
    const record=result.snapshot.val();let game=parseGame(record.data);game.world=this.world;if(this.world==='real')game.speed=1;
    const profileRef=this.sdk.ref(this.db,`accounts/${this.uid}`),profile=(await this.sdk.get(profileRef)).val();
    this.name=captainName(profile?.name||name);this.seenVersion=profile?.seenVersion||'';
    await this.sdk.update(profileRef,{name:this.name,updatedAt:this.sdk.serverTimestamp()});
    this.revision=record.revision;this.ready=true;this.lost=false;this.pendingUser=null;this.cache(game,false);this.onStatus(recovered?'이 기기의 기록을 복원했어요.':'클라우드 저장 연결됨');
    this.stopWatch?.();this.stopWatch=this.sdk.onValue(this.ref,snapshot=>{const r=snapshot.val();if(r&&r.session!==this.session&&this.ready){this.lost=true;this.ready=false;clearInterval(this.timer);this.onConflict();}});
    clearInterval(this.timer);this.timer=setInterval(()=>this.flush(),20000);
    return game;
  }
  cache(game,pending){try{this.storage.setItem(localSaveKey(this.uid,this.world),JSON.stringify({revision:this.revision,pending,data:game}));}catch{this.onStatus('이 기기의 저장 공간이 부족해요.');}}
  save(game){if(!this.uid||this.lost)return;this.cache(game,true);this.dirty=true;if(Date.now()-(this.lastFlush||0)>15000)this.flush();}
  async flush(){
    if(!this.ready||this.busy||this.lost)return;
    if(!navigator.onLine){this.onStatus('이 기기에 저장 · 연결 후 동기화');return;}
    this.busy=true;const game=this.readGame();if(!game){this.busy=false;return;}
    const snapshotGame=JSON.parse(JSON.stringify(game)),expected=this.revision;
    try{
      const observed=(await this.sdk.get(this.ref)).val();
      const result=await this.sdk.runTransaction(this.ref,current=>{
        current??=observed;
        if(!current||current.session!==this.session||current.revision!==expected)return;
        return {...current,data:JSON.stringify(snapshotGame),revision:current.revision+1,leaseUntil:Date.now()+90000,updatedAt:this.sdk.serverTimestamp()};
      },{applyLocally:false});
      if(!result.committed){this.lost=true;this.ready=false;this.onStatus('저장 충돌 · 이 기기 기록 보존');this.onConflict();return;}
      this.revision=result.snapshot.val().revision;this.lastFlush=Date.now();
      const current=this.readGame();this.dirty=JSON.stringify(current)!==JSON.stringify(snapshotGame);this.cache(current,this.dirty);this.onStatus('클라우드 저장 완료');
    }catch{this.onStatus('이 기기에 저장 · 서버 연결 확인 필요');}
    finally{this.busy=false;}
  }
  async acknowledge(version){if(!this.uid)return;await this.sdk.update(this.sdk.ref(this.db,`accounts/${this.uid}`),{seenVersion:version,updatedAt:this.sdk.serverTimestamp()});this.seenVersion=version;}
  async close(){clearInterval(this.timer);await this.flush();this.stopWatch?.();if(this.ready)try{await this.sdk.runTransaction(this.ref,r=>r?.session===this.session?{...r,revision:r.revision+1,leaseUntil:0,updatedAt:this.sdk.serverTimestamp()}:undefined,{applyLocally:false});}catch{}this.ready=false;if(this.auth)await this.authSdk.signOut(this.auth);}
}
