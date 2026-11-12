import {refreshDefense,publishDefense} from './defense-account.js?v=2026.11.12-collections-ranks-historic-ships';
import {ownershipRankChanges} from './port-rankings.js?v=2026.11.12-collections-ranks-historic-ships';
async function bounded(task,ms=5000){let timer;try{return await Promise.race([task,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('network-timeout')),ms))]);}finally{clearTimeout(timer);}}
// Economic writes share the same queue as autosave. Acknowledgement precedes UI state.
export function installAtomicAccount(Type){
 Type.prototype.readConfirmedSave=async function(){
  // The SDK cache may contain optimistic writes. Only an uncached server response
  // can acknowledge an operation after its original request lost acknowledgement.
  const token=await bounded(this.auth.currentUser.getIdToken()),url=new URL(`gameV2/privateSaves/${encodeURIComponent(this.uid)}.json`,this.restEndpoint.replace(/\/$/,'')+'/');
  url.searchParams.set('auth',token);if(this.restNamespace)url.searchParams.set('ns',this.restNamespace);
  const response=await bounded(fetch(url,{cache:'no-store'}));if(!response.ok)throw Error('confirm-unavailable');return bounded(response.json());
 };
 Type.prototype.enqueue=function(task){const result=(this.writeQueue||Promise.resolve()).then(task);this.writeQueue=result.catch(()=>{});return result;};
 Type.prototype.atomicAction=function(kind,key,mutate){return this.enqueue(async()=>{
  if(!this.ready||this.lost||this.economicUncertain||!navigator.onLine)throw Error('서버 연결과 저장 상태를 확인하세요.');
  this.busy=true;this.onBusy?.(true);try{
   if(this.defenseEnabled){await refreshDefense(this);if(kind!=='raids'&&this.readGame()?.raidId)throw Error('진행 중인 해상 교전을 먼저 마치세요.');}
   if(this.dirty)await this.writeSave();if(!this.ready||this.lost||this.dirty)throw Error('항해 기록 저장을 먼저 확인하세요.');
   const s=this.sdk,root='gameV2',path=`shared/${kind}/${key}`,ref=s.ref(this.db,`${root}/${path}`),before=(await bounded(s.get(ref))).val()||{revision:0,content:{}},game=structuredClone(this.readGame()),now=Date.now()+(this.serverOffset||0),content=structuredClone(before.content||{}),result=await mutate(game,content,now,before.revision||0);
   if(result?.ok===false)throw Error(result.error||'처리할 수 없어요.');
   if(result?.noWrite)return result;
   const sequence=(this.record.operationSequence||0)+1,id=this.session+':'+sequence,revision=this.revision+1,op={id,sequence,kind,key,sharedRevision:before.revision+1},stamp=s.serverTimestamp();
   const record={...this.record,schemaVersion:this.defenseEnabled?Math.max(6,this.record.schemaVersion):5,...(this.defenseEnabled?{defenseSeq:game.defenseAck?.seq||0}:{}),revision,session:this.session,data:JSON.stringify(game),leaseUntil:now+90000,updatedAt:stamp,operationSequence:sequence,lastOperation:op};
   content._version=1;
   const shared={revision:before.revision+1,content,updatedAt:stamp,lastOperation:{id,uid:this.uid,sequence,saveRevision:revision}};
   const ownerChanges=kind==='ports'?await bounded(ownershipRankChanges(this,key,before.content||{},content,id)):{};
   const journal='windward-economic-pending:'+this.uid;try{this.storage.setItem(journal,JSON.stringify({id,sequence,revision,kind,key}));}catch{throw Error('처리 전 기기 기록을 보관할 수 없어요.');}
   let confirmed=record;
   const changes={...ownerChanges,...(result?.extras||{}),['privateSaves/'+this.uid]:record,[path]:shared};if(result?.registry)changes['harborRegistry/'+result.registry.id]=result.registry;
   let timeout;
   try{await Promise.race([s.update(s.ref(this.db,root),changes),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('ack-timeout')),20000);})]);}
   catch(error){let observed;const uncertain=()=>{this.economicUncertain=true;this.ready=false;this.onUncertain?.();};try{observed=await this.readConfirmedSave();}catch{uncertain();throw Error('결과 확인 중이에요. 새로고침하면 서버 기록으로 이어집니다.');}
    if(observed?.lastOperation?.id!==id){if(!/permission.?denied/i.test(String(error?.code||error?.message))){uncertain();throw Error('처리 결과를 확인 중이에요. 새로고침해 서버 기록으로 이어가세요.');}this.storage.removeItem(journal);if(observed?.session!==this.session||observed?.revision!==this.revision){this.lost=true;this.ready=false;this.onConflict();}throw Error(kind==='personal'?'전투·활동 기록 저장을 서버가 거절했어요. 현재 기록은 유지되며, 다시 시도할 수 있어요.':kind==='battles'?'전투 상태가 갱신됐거나 저장이 거절됐어요. 최신 전투 화면에서 다시 시도하세요.':'시세·항구 상태가 바뀌었거나 요청이 거절됐어요. 새 견적을 확인하세요.');}confirmed=observed;
   }finally{clearTimeout(timeout);}
   this.record=confirmed;this.revision=confirmed.revision;this.lastFlush=Date.now();this.dirty=false;this.applyGame?.(JSON.parse(confirmed.data));this.cache(JSON.parse(confirmed.data),false);this.storage.removeItem(journal);this.onCommitted(JSON.parse(confirmed.data),this.revision);if(this.defenseEnabled)await publishDefense(this);return result;
  }finally{this.busy=false;this.onBusy?.(false);}
 });};
 Type.prototype.readShared=async function(kind,key){if(!this.ready||!navigator.onLine)throw Error('서버 연결 후 이용하세요.');return (await this.sdk.get(this.sdk.ref(this.db,`gameV2/shared/${kind}/${key}`))).val()||{revision:0,content:{}};};
}
