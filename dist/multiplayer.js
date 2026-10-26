import {FIREBASE_CONFIG} from './firebase-config.js';
import {captainName,validShip,interpolateShip,PRESENCE_COLORS,seaSector,nearbySectors} from './presence-core.js';

// Only fictional boat presence is shared. Money, cargo, missions and saves stay local.
export class FleetPresence{
  constructor({readShip,onChange,onStatus,storage}){
    Object.assign(this,{readShip,onChange,onStatus,storage});this.peers=new Map();this.active=false;this.connected=false;this.generation=0;this.lastSent=0;this.lastSignature='';
    this.name=captainName(storage.getItem('windward-captain-name'),`항해사 ${Math.floor(Math.random()*9000+1000)}`);
    this.color=Math.floor(Math.random()*PRESENCE_COLORS.length);
  }
  useAccount(account){this.account=account;this.world=account.world;this.name=account.name;this.uid=account.uid;this.app=account.app;this.auth=account.auth;this.db=account.db;this.sdk=account.sdk;this.shipKey=this.uid+'_'+account.session;this.sectorWatches=new Map();}
  async start(){
    if(this.active)return;this.active=true;const generation=++this.generation;this.onStatus('connecting');
    try{
      if(!FIREBASE_CONFIG)throw Error('not-configured');
      const base='https://www.gstatic.com/firebasejs/12.4.0/';
      const [appSdk,authSdk,dbSdk]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);
      if(generation!==this.generation)return;
      const localTest=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('localTest');
      this.app??=appSdk.initializeApp(localTest?{...FIREBASE_CONFIG,projectId:'demo-windward-chat',databaseURL:'https://demo-windward-chat.firebaseio.com'}:FIREBASE_CONFIG,'windward-fleet');this.sdk=dbSdk;
      let user;
      if(localTest){user={uid:this.uid||'qa-'+crypto.randomUUID()};if(!this.db){this.db=dbSdk.getDatabase(this.app);dbSdk.connectDatabaseEmulator(this.db,'127.0.0.1',9000,{mockUserToken:{sub:user.uid,user_id:user.uid}});}}
      else{this.auth??=authSdk.initializeAuth(this.app,{persistence:authSdk.inMemoryPersistence});this.db??=dbSdk.getDatabase(this.app);user=this.account?this.auth.currentUser:this.auth.currentUser||(await authSdk.signInAnonymously(this.auth)).user;if(!user)throw Error('account-required');}
      if(generation!==this.generation)return;
      this.uid=user.uid;this.root=this.account?`worlds/${this.world}`:null;this.selfRef=dbSdk.ref(this.db,this.root?`${this.root}/sectors/${seaSector(this.readShip().position)}/${this.shipKey}`:`fleet/v1/${this.uid}`);this.sector=seaSector(this.readShip().position);
    if(this.root)this.watchSectors();else{
    const q=dbSdk.query(dbSdk.ref(this.db,this.root?`${this.root}/presence`:'fleet/v1'),dbSdk.orderByChild('updatedAt'),dbSdk.startAt(Date.now()-90000),dbSdk.limitToLast(100));
      this.unsubscribe=dbSdk.onValue(q,snapshot=>{
        const now=Date.now(),seen=new Set();
        snapshot.forEach(child=>{if(child.key===this.uid||!validShip(child.val(),now))return;const ship=child.val(),old=this.peers.get(child.key);seen.add(child.key);this.peers.set(child.key,{from:old?this.at(old,now):ship,to:ship,received:now});});
        for(const id of this.peers.keys())if(!seen.has(id))this.peers.delete(id);this.onChange();
      },()=>this.fail('permission'));
    }
      this.connectionOff=dbSdk.onValue(dbSdk.ref(this.db,'.info/connected'),async snapshot=>{
        if(generation!==this.generation)return;
        if(!snapshot.val()){this.connected=false;this.onStatus('reconnecting');return;}
        try{await dbSdk.onDisconnect(this.selfRef).remove();if(generation!==this.generation)return;this.connected=true;this.lastSignature='';await this.send(true);if(this.connected)this.onStatus('online');}
        catch{this.fail('permission');}
      });
      this.timer=setInterval(()=>{this.send();this.onChange();},1500);
    }catch(error){if(generation===this.generation)this.fail(error.message==='not-configured'?'unconfigured':'error');}
  }
  watchSectors(){
    const s=this.sdk,wanted=new Set(nearbySectors(this.readShip().position));
    for(const [key,watch] of this.sectorWatches)if(!wanted.has(key)){watch.stop();this.sectorWatches.delete(key);}
    for(const key of wanted)if(!this.sectorWatches.has(key)){
      const watch={ships:new Map(),stop:()=>{}};this.sectorWatches.set(key,watch);
      const q=s.query(s.ref(this.db,`${this.root}/sectors/${key}`),s.orderByChild('updatedAt'),s.startAt(Date.now()-90000),s.limitToLast(100));
      watch.stop=s.onValue(q,snapshot=>{if(!this.active||!this.sectorWatches.has(key))return;watch.ships.clear();snapshot.forEach(child=>{if(child.key!==this.shipKey&&validShip(child.val()))watch.ships.set(child.key,child.val());});this.mergeSectors();},()=>this.fail('permission'));
    }
    this.mergeSectors();
  }
  mergeSectors(){
    const now=Date.now(),ships=new Map();for(const watch of this.sectorWatches.values())for(const [id,ship]of watch.ships)ships.set(id,ship);
    for(const [id,ship]of ships){const old=this.peers.get(id);if(old?.to.updatedAt===ship.updatedAt)continue;this.peers.set(id,{from:old?this.at(old,now):ship,to:ship,received:now});}
    for(const id of this.peers.keys())if(!ships.has(id))this.peers.delete(id);this.onChange();
  }
  at(peer,now){return interpolateShip(peer.from,peer.to,(now-peer.received)/1500);}
  captains(now=Date.now()){return [...this.peers.entries()].filter(([,p])=>validShip(p.to,now)).map(([id,p])=>({id,...this.at(p,now)}));}
  ships(now=Date.now()){return this.captains(now).slice(0,29);}
  async send(force=false){
    if(!this.active||!this.connected||this.sending)return;
    const ship=this.readShip(),signature=JSON.stringify([this.name,...ship.position.map(n=>Number(n.toFixed(4))),Math.round(ship.angle),ship.status,ship.money,ship.profit,ship.visited]);
    if(!force&&signature===this.lastSignature&&Date.now()-this.lastSent<30000)return;
    this.sending=true;
    try{if(this.root){const sector=seaSector(ship.position);if(sector!==this.sector){await this.sdk.onDisconnect(this.selfRef).cancel();await this.sdk.remove(this.selfRef);this.sector=sector;this.selfRef=this.sdk.ref(this.db,`${this.root}/sectors/${sector}/${this.shipKey}`);await this.sdk.onDisconnect(this.selfRef).remove();}this.watchSectors();}const stats={name:this.name,money:Math.round(ship.money),profit:Math.round(ship.profit),visited:ship.visited,updatedAt:this.sdk.serverTimestamp()};await this.sdk.set(this.selfRef,{...stats,...(this.root?{uid:this.uid}:{}),lon:Number(ship.position[0].toFixed(5)),lat:Number(ship.position[1].toFixed(5)),angle:Math.round(ship.angle)%360,color:this.color,status:ship.status});if(this.root&&(force||JSON.stringify(stats).replace(/updatedAt.*$/,'')!==this.lastRank||Date.now()-(this.lastRankAt||0)>30000)){await this.sdk.set(this.sdk.ref(this.db,`${this.root}/rankings/${this.uid}`),stats);this.lastRank=JSON.stringify(stats).replace(/updatedAt.*$/,'');this.lastRankAt=Date.now();}this.lastSent=Date.now();this.lastSignature=signature;}
    catch{this.fail('error');}finally{this.sending=false;}
  }
  setName(value){this.name=captainName(value);try{this.storage.setItem('windward-captain-name',this.name);}catch{}this.send(true);}
  fail(reason){this.connected=false;this.onStatus(reason);}
  async stop(){
    if(this.sectorWatches){for(const w of this.sectorWatches.values())w.stop();this.sectorWatches.clear();}try{if(this.selfRef)await this.sdk.onDisconnect(this.selfRef).cancel();}catch{}
    this.active=false;this.connected=false;++this.generation;clearInterval(this.timer);this.unsubscribe?.();this.connectionOff?.();this.unsubscribe=null;this.connectionOff=null;this.peers.clear();this.onChange();this.onStatus('offline');
    if(this.selfRef)try{await this.sdk.remove(this.selfRef);}catch{}
  }
}
