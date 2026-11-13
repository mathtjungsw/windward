import {UI_USAGE_IDS} from './ui-usage-ids.js?v=2026.11.13-canal-routes';
const hour=3600000, day=24*hour, shift=9*hour, week=7*day, slots=6*hour;
const ids=new Set(UI_USAGE_IDS), codes=new Map(UI_USAGE_IDS.map((id,index)=>[id,String(index).padStart(3,'0')])), fields=['shown','clicked','completed'];
export const usageSlot=time=>String(Math.floor((time+shift)/slots));
export const usageDay=time=>new Date(time+shift).toISOString().slice(0,10);
const selector='button, [role="button"], [role="tab"], .port-marker, .fleet-ship, summary';
const ignored='.fleet-ship, .port-marker[aria-hidden="true"]';
export function usageKey(el){
 const fixed=el.getAttribute('data-usage-key');
 if(ids.has(fixed))return fixed;
 if(el.matches('#sail-btn'))return 'action-voyage';
 if(el.matches('#market-confirm')&&el.dataset.tradeMode)return 'action-trade-'+el.dataset.tradeMode;
 if(el.matches('.captain-directory-row'))return 'action-captain-row';
 if(el.matches('.owned-port-row button')&&!el.hasAttribute('data-find-menu'))return 'action-owned-port';
 if(el.matches('#fleet-live-list .chat-card-link'))return 'action-fleet-greet';
 if(el.matches('#combat-deck header button'))return 'action-combat-fold';
 if(el.matches('#combat-deck .map-combat-actions button:not([id])'))return 'action-combat-action';
 if(el.matches('#discovery-panel button:not([id],[data-inspect],[data-approach])'))return 'action-discovery-resume';
 if(el.matches('.port-marker'))return 'action-port-marker';
 if(el.matches('.fleet-ship'))return 'action-fleet-ship';
 if(el.hasAttribute('data-map-gun'))return 'attr-map-gun';
 for(const name of el.getAttributeNames()){
  if(!name.startsWith('data-'))continue;
  const key='attr-'+name.slice(5);
  if(ids.has(key)){
   const exact=key+'-'+String(el.getAttribute(name)).replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
   return ids.has(exact)?exact:key;
  }
 }
 if(ids.has('id-'+el.id))return 'id-'+el.id;
 if(el.matches('summary'))return 'action-disclosure';
 return 'action-other';
}
export function prepareUsage(record,now,randomId){
 const slot=usageSlot(now), cutoff=usageDay(now-week);
 record.batches=(record.batches||[]).filter(b=>b.day>=cutoff).slice(-28);
 for(const date of Object.keys(record.days||{}))if(date<cutoff)delete record.days[date];
 if(record.slot===slot)return null;
 const rows=Object.entries(record.days||{}).sort();
 if(!record.batches.length&&rows.length){
  const [date,bucket]=rows[0];
  const events=Object.entries(bucket).sort().slice(0,85).map(([key,value])=>key.slice(0,2)+codes.get(key.slice(2))+':'+value.join(',')).join(';');
  for(const key of Object.keys(bucket).sort().slice(0,85))delete bucket[key];
  if(!Object.keys(bucket).length)delete record.days[date];
  if(events)record.batches.push({id:slot+'-'+randomId,day:date,events});
 }
 if(!record.batches.length)return null;
 record.slot=slot;
 return record.batches[0];
}
function database(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('windward-ui-usage-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('captains');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
function modify(db,uid,fn,transferAt=null){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('captains','readwrite'),store=tx.objectStore('captains');let result;
  const update=()=>{const read=store.get(uid);read.onsuccess=()=>{
   const value=read.result||{days:{}};result=fn(value);store.put(value,uid);
   if(result&&transferAt!==null)store.put(usageSlot(transferAt),'@browser-transfer');
  };};
  if(transferAt===null)update();else{const gate=store.get('@browser-transfer');gate.onsuccess=()=>{if(gate.result!==usageSlot(transferAt))update();};}
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error);
 });
}
export function createUiUsage({account,enabled}){
 if(typeof indexedDB==='undefined'||typeof IntersectionObserver==='undefined')return {complete(){}};
 let db,flushTimer,scanTimer,scope='',seen=new Set(),buffer=new Map(),observed=new Set();
 const dayNow=()=>usageDay(Date.now()), mobile=()=>matchMedia('(max-width:850px)').matches;
 const allowed=()=>enabled()&&account.ready&&account.uid;
 function push(id,field){
  const uid=allowed();if(!uid||!ids.has(id))return;
  const key=uid+'|'+dayNow()+'|'+(mobile()?'m':'p')+'-'+id;
  const values=buffer.get(key)||[0,0,0];values[field]++;buffer.set(key,values);
  if(!flushTimer)flushTimer=setTimeout(persist,1000);
 }
 async function persist(){
  clearTimeout(flushTimer);flushTimer=null;const pending=buffer;buffer=new Map();
  if(!pending.size)return;
  try{
   const storage=await(db??=database()), captains=new Map();
   for(const [key,value] of pending){const [uid,date,action]=key.split('|');if(!captains.has(uid))captains.set(uid,[]);captains.get(uid).push([date,action,value]);}
   for(const [uid,rows] of captains)await modify(storage,uid,record=>{
    record.days??={};
    for(const [date,action,values] of rows){const bucket=record.days[date]??={};const old=bucket[action]||[0,0,0];bucket[action]=fields.map((_,i)=>Math.min(99999,old[i]+values[i]));}
    for(const date of Object.keys(record.days))if(date<usageDay(Date.now()-week))delete record.days[date];
   });
  }catch{db=null;}
 }
 async function send(){
  const uid=allowed();if(!uid||document.hidden||!navigator.onLine||!account.sdk)return;
  try{
   await persist();const storage=await(db??=database()), now=Date.now();
   const batch=await modify(storage,uid,record=>prepareUsage(record,now,crypto.randomUUID().replaceAll('-','')),now);
   if(!batch||account.uid!==uid||!allowed())return;
   const {id,...payload}=batch,s=account.sdk,ref=s.ref(account.db,'gameV2/operations/uiUsage/'+payload.day+'/'+uid+'/'+id);
   try{await s.set(ref,payload);}catch{
    const prior=(await s.get(ref)).val();if(prior?.day!==payload.day||prior?.events!==payload.events)return;
   }
   await modify(storage,uid,record=>{record.batches=(record.batches||[]).filter(item=>item.id!==id);});
  }catch{}
 }
 const io=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries){
   if(!isIntersecting||target.disabled||target.closest('[hidden], [inert], .hidden')||target.getAttribute('aria-disabled')==='true')continue;
   const id=usageKey(target),key=(target.closest('dialog')?'dialog':'game')+'|'+id;
   if(!seen.has(key)){seen.add(key);push(id,0);}
  }
 });
 function scan(){
  scanTimer=null;
  if(!allowed())return;
  const active=account.uid+'|'+dayNow()+'|'+mobile();
  if(scope!==active){scope=active;seen=new Set();io.disconnect();observed.clear();}
  const elements=new Set([...document.querySelectorAll(selector)].filter(el=>!el.matches(ignored)&&!el.disabled&&!el.closest('[hidden], [inert], .hidden')));
  for(const el of observed)if(!elements.has(el)){io.unobserve(el);observed.delete(el);}
  for(const el of elements)if(!observed.has(el)){io.observe(el);observed.add(el);}
 }
 function schedule(){if(!scanTimer&&allowed())scanTimer=setTimeout(scan,400);}
 const observer=new MutationObserver(records=>{if(records.some(m=>!m.target.closest?.('svg, canvas')&&(m.type==='attributes'?!m.target.matches('path, g, canvas, svg, .chart, .ship-drawing'):[...m.addedNodes,...m.removedNodes].some(node=>node.nodeType===1&&(node.matches(selector)||node.querySelector(selector))))))schedule();});
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','disabled','aria-expanded','class']});
 document.addEventListener('click',event=>{const target=event.target.closest?.(selector);if(target&&!target.disabled&&(!target.hasAttribute('data-direction')||event.detail===0))push(usageKey(target),1);},true);
 document.addEventListener('pointerdown',event=>{const target=event.target.closest?.('button[data-direction]');if(target&&!target.disabled&&event.button===0)push(usageKey(target),1);},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void persist();else{schedule();void send();}});
 window.addEventListener('online',send);
 window.addEventListener('pagehide',persist);
 return {entered(){schedule();void send();},complete:id=>push(id,2),tick(){schedule();void send();}};
}
