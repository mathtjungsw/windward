import {PRESENCE_TTL,PRESENCE_COLORS} from './presence-core.js';

// Global membership contains no coordinates, cargo, scores or account secrets.
export function validCaptain(value,now=Date.now()){
  return !!value&&typeof value.uid==='string'&&value.uid.length>0&&value.uid.length<=128&&typeof value.name==='string'&&value.name.length>0&&value.name.length<=16&&Number.isInteger(value.color)&&value.color>=0&&value.color<PRESENCE_COLORS.length&&['정박','항해','멈춤'].includes(value.status)&&Number.isFinite(value.updatedAt)&&value.updatedAt>now-PRESENCE_TTL&&value.updatedAt<now+30000;
}
export function onlineCaptainList(values,now=Date.now()){
  const latest=new Map();for(const value of values)if(validCaptain(value,now)&&(!latest.has(value.uid)||latest.get(value.uid).updatedAt<value.updatedAt))latest.set(value.uid,value);
  return [...latest.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.uid.localeCompare(b.uid));
}
export class CaptainRoster{
  constructor(fleet){this.fleet=fleet;this.records=[];this.generation=0;this.ready=false;this.error=false;this.lastSent=0;this.lastSignature='';}
  connect(){
    const f=this.fleet,s=f.sdk;this.selfRef=s.ref(f.db,`${f.root}/captains/${f.shipKey}`);const generation=++this.generation;
    this.unsubscribe?.();this.ready=false;this.error=false;
    const q=s.query(s.ref(f.db,`${f.root}/captains`),s.orderByChild('updatedAt'),s.startAt(Date.now()-PRESENCE_TTL),s.limitToLast(100));
    this.unsubscribe=s.onValue(q,snapshot=>{if(generation!==this.generation)return;const records=[];snapshot.forEach(child=>records.push(child.val()));this.records=records;this.ready=true;this.error=false;f.onChange();},()=>{if(generation!==this.generation)return;this.ready=false;this.error=true;this.records=[];f.onChange();});
  }
  async prepareDisconnect(){await this.fleet.sdk.onDisconnect(this.selfRef).remove();}
  async publish(ship,force=false){
    const f=this.fleet,signature=JSON.stringify([f.name,f.color,ship.status]);
    if(f.active===false||f.connected===false)return;
    if(!force&&signature===this.lastSignature&&Date.now()-this.lastSent<30000)return;
    await f.sdk.set(this.selfRef,{uid:f.uid,name:f.name,color:f.color,status:ship.status,updatedAt:f.sdk.serverTimestamp()});this.lastSent=Date.now();this.lastSignature=signature;
  }
  list(now=Date.now()){return onlineCaptainList(this.records,now);}
  async stop(){
    ++this.generation;this.unsubscribe?.();this.unsubscribe=null;this.records=[];this.ready=false;this.error=false;
    if(this.selfRef){try{await this.fleet.sdk.onDisconnect(this.selfRef).cancel();}catch{}try{await this.fleet.sdk.remove(this.selfRef);}catch{}}
  }
}
