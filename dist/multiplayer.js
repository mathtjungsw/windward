import {REAL_WORLD_ROOT} from './account.js';
import {validShip,interpolateShip,PRESENCE_COLORS,seaSector,nearbySectors} from './presence-core.js';
import {CaptainRoster} from './captains.js';

// Nearby boat positions and a lightweight world-wide captain directory are separate.
export class FleetPresence{
  constructor({readShip,onChange,onStatus}){
    Object.assign(this,{readShip,onChange,onStatus});
    this.peers=new Map();
    this.sectorWatches=new Map();
    this.active=false;
    this.connected=false;
    this.generation=0;
    this.lastSent=0;
    this.lastSignature='';
    this.name='선장';
    this.color=Math.floor(Math.random()*PRESENCE_COLORS.length);
  }

  useAccount(account){
    this.account=account;
    this.name=account.name;
    this.uid=account.uid;
    this.db=account.db;
    this.sdk=account.sdk;
    this.root=REAL_WORLD_ROOT;
    this.shipKey=this.uid+'_'+account.session;
  }

  start(){
    if(this.active||!this.account?.ready)return;
    this.active=true;
    const generation=++this.generation, sdk=this.sdk;
    this.onStatus('connecting');
    this.sector=seaSector(this.readShip().position);
    this.selfRef=sdk.ref(this.db,`${this.root}/sectors/${this.sector}/${this.shipKey}`);
    this.watchSectors();
    this.roster??=new CaptainRoster(this);
    this.roster.connect();
    this.connectionOff=sdk.onValue(sdk.ref(this.db,'.info/connected'),async snapshot=>{
      if(generation!==this.generation)return;
      if(!snapshot.val()){
        this.connected=false;
        this.onStatus('reconnecting');
        return;
      }
      try{
        await sdk.onDisconnect(this.selfRef).remove();
        await this.roster.prepareDisconnect();
        if(generation!==this.generation)return;
        this.connected=true;
        this.lastSignature='';
        await this.send(true);
        if(generation===this.generation&&this.connected)this.onStatus('online');
      }catch{
        if(generation===this.generation)this.fail('permission');
      }
    });
    this.timer=setInterval(()=>{this.send();this.onChange();},1500);
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
  onlineCaptains(now=Date.now()){
    const players=this.roster?.list(now)||[];
    const others=players.filter(p=>p.uid!==this.uid);return [{uid:this.uid,name:this.name,color:this.color,status:this.readShip().status},...others];
  }
  ships(now=Date.now()){return this.captains(now).slice(0,29);}
  send(force=false){
    if(!this.active||!this.connected||this.sendPromise)return;
    const ship=this.readShip();
    const signature=JSON.stringify([this.name,...ship.position.map(n=>Number(n.toFixed(4))),
      Math.round(ship.angle),ship.status,ship.money,ship.profit,ship.visited]);
    if(!force&&signature===this.lastSignature&&Date.now()-this.lastSent<30000)return;
    this.sendPromise=this.publish(ship,signature,force).finally(()=>{this.sendPromise=null;});
    return this.sendPromise;
  }

  async publish(ship,signature,force){
    const sdk=this.sdk;
    try{
      const sector=seaSector(ship.position);
      if(sector!==this.sector){
        await sdk.remove(this.selfRef);
        await sdk.onDisconnect(this.selfRef).cancel();
        this.sector=sector;
        this.selfRef=sdk.ref(this.db,`${this.root}/sectors/${sector}/${this.shipKey}`);
        await sdk.onDisconnect(this.selfRef).remove();
        if(!this.active)return;
        this.watchSectors();
      }
      const stats={name:this.name,money:Math.round(ship.money),profit:Math.round(ship.profit),visited:ship.visited};
      const updatedAt=sdk.serverTimestamp();
      await sdk.set(this.selfRef,{...stats,uid:this.uid,updatedAt,
        lon:Number(ship.position[0].toFixed(5)),lat:Number(ship.position[1].toFixed(5)),
        angle:Math.round(ship.angle)%360,color:this.color,status:ship.status});
      if(!this.active)return;
      const rank=JSON.stringify(stats);
      if(force||rank!==this.lastRank){
        await sdk.set(sdk.ref(this.db,`${this.root}/rankings/${this.uid}`),{...stats,updatedAt});
        this.lastRank=rank;
      }
      await this.roster.publish(ship,force);
      this.lastSent=Date.now();
      this.lastSignature=signature;
    }catch{
      if(this.active)this.fail('error');
    }
  }
  fail(reason){this.connected=false;this.onStatus(reason);}
  async stop(){
    this.active=false;
    this.connected=false;
    ++this.generation;
    clearInterval(this.timer);
    this.connectionOff?.();
    this.connectionOff=null;
    for(const watch of this.sectorWatches.values())watch.stop();
    this.sectorWatches.clear();
    await this.sendPromise;
    await this.roster?.stop();
    if(this.selfRef){
      try{
        await this.sdk.remove(this.selfRef);
        await this.sdk.onDisconnect(this.selfRef).cancel();
      }catch{}
    }
    this.selfRef=null;
    this.peers.clear();
    this.onChange();
    this.onStatus('offline');
  }
}
