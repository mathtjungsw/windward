import {FIREBASE_CONFIG} from './firebase-config.js';
import {captainName,validShip,interpolateShip,PRESENCE_COLORS} from './presence-core.js';

// Only fictional boat presence is shared. Money, cargo, missions and saves stay local.
export class FleetPresence{
  constructor({readShip,onChange,onStatus,storage}){
    Object.assign(this,{readShip,onChange,onStatus,storage});this.peers=new Map();this.active=false;this.connected=false;this.generation=0;this.lastSent=0;this.lastSignature='';
    this.name=captainName(storage.getItem('windward-captain-name'),`항해사 ${Math.floor(Math.random()*9000+1000)}`);
    this.color=Math.floor(Math.random()*PRESENCE_COLORS.length);
  }
  async start(){
    if(this.active)return;this.active=true;const generation=++this.generation;this.onStatus('connecting');
    try{
      if(!FIREBASE_CONFIG)throw Error('not-configured');
      const base='https://www.gstatic.com/firebasejs/12.4.0/';
      const [appSdk,authSdk,dbSdk]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);
      if(generation!==this.generation)return;
      this.app??=appSdk.initializeApp(FIREBASE_CONFIG,'windward-fleet');this.auth??=authSdk.initializeAuth(this.app,{persistence:authSdk.inMemoryPersistence});this.db??=dbSdk.getDatabase(this.app);this.sdk=dbSdk;
      const user=this.auth.currentUser||(await authSdk.signInAnonymously(this.auth)).user;
      if(generation!==this.generation)return;
      this.uid=user.uid;this.selfRef=dbSdk.ref(this.db,`fleet/v1/${this.uid}`);
      const q=dbSdk.query(dbSdk.ref(this.db,'fleet/v1'),dbSdk.orderByChild('updatedAt'),dbSdk.startAt(Date.now()-90000),dbSdk.limitToLast(30));
      this.unsubscribe=dbSdk.onValue(q,snapshot=>{
        const now=Date.now(),seen=new Set();
        snapshot.forEach(child=>{if(child.key===this.uid||!validShip(child.val(),now))return;const ship=child.val(),old=this.peers.get(child.key);seen.add(child.key);this.peers.set(child.key,{from:old?this.at(old,now):ship,to:ship,received:now});});
        for(const id of this.peers.keys())if(!seen.has(id))this.peers.delete(id);this.onChange();
      },()=>this.fail('permission'));
      this.connectionOff=dbSdk.onValue(dbSdk.ref(this.db,'.info/connected'),async snapshot=>{
        if(generation!==this.generation)return;
        if(!snapshot.val()){this.connected=false;this.onStatus('reconnecting');return;}
        try{await dbSdk.onDisconnect(this.selfRef).remove();if(generation!==this.generation)return;this.connected=true;this.lastSignature='';await this.send(true);this.onStatus('online');}
        catch{this.fail('permission');}
      });
      this.timer=setInterval(()=>{this.send();this.onChange();},1500);
    }catch(error){if(generation===this.generation)this.fail(error.message==='not-configured'?'unconfigured':'error');}
  }
  at(peer,now){return interpolateShip(peer.from,peer.to,(now-peer.received)/1500);}
  ships(now=Date.now()){return [...this.peers.entries()].filter(([,p])=>validShip(p.to,now)).slice(0,29).map(([id,p])=>({id,...this.at(p,now)}));}
  async send(force=false){
    if(!this.active||!this.connected||this.sending)return;
    const ship=this.readShip(),signature=JSON.stringify([this.name,...ship.position.map(n=>Number(n.toFixed(4))),Math.round(ship.angle),ship.status]);
    if(!force&&signature===this.lastSignature&&Date.now()-this.lastSent<30000)return;
    this.sending=true;
    try{await this.sdk.set(this.selfRef,{name:this.name,lon:Number(ship.position[0].toFixed(5)),lat:Number(ship.position[1].toFixed(5)),angle:Math.round(ship.angle)%360,color:this.color,status:ship.status,updatedAt:this.sdk.serverTimestamp()});this.lastSent=Date.now();this.lastSignature=signature;}
    catch{this.fail('error');}finally{this.sending=false;}
  }
  setName(value){this.name=captainName(value);try{this.storage.setItem('windward-captain-name',this.name);}catch{}this.send(true);}
  fail(reason){this.connected=false;this.onStatus(reason);}
  async stop(){
    this.active=false;this.connected=false;++this.generation;clearInterval(this.timer);this.unsubscribe?.();this.connectionOff?.();this.unsubscribe=null;this.connectionOff=null;this.peers.clear();this.onChange();this.onStatus('offline');
    if(this.selfRef)try{await this.sdk.remove(this.selfRef);}catch{}
  }
}
