import {watchSectorPages} from './sector-pages.js?v=2026.11.10-session-fix';
import {connectPersistent,publishPersistent,disconnectPersistent} from './persistent-fleet.js?v=2026.11.10-session-fix';
import {mapDistance} from './world-wrap.js?v=2026.11.10-session-fix';
import {REAL_WORLD_ROOT} from './account.js?v=2026.11.10-session-fix';
import {validShip,interpolateShip,PRESENCE_COLORS,seaSector,nearbySectors} from './presence-core.js?v=2026.11.10-session-fix';
import {CaptainRoster} from './captains.js?v=2026.11.10-session-fix';

// Nearby boat positions and a lightweight world-wide captain directory are separate.
export class FleetPresence{
  constructor({readShip,readStats,onChange,onStatus}){
    Object.assign(this,{readShip,readStats,onChange,onStatus});
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
    this.account=account;this.positionSeq=account.defenseState?.positionSeq||0;
    this.name=account.name;
    this.uid=account.uid;
    this.db=account.db;
    this.sdk=account.sdk;
    this.root=REAL_WORLD_ROOT;
    this.shipKey=account.defenseEnabled?this.uid:this.uid+'_'+account.session;this.sectorPath=account.defenseEnabled?'fleetIndex':'sectors';
  }

  start(){
    if(this.active||!this.account?.ready)return;
    this.active=true;
    const generation=++this.generation, sdk=this.sdk;
    this.onStatus('connecting');
    this.sector=seaSector(this.readShip().position);
    this.selfRef=sdk.ref(this.db,`${this.root}/${this.sectorPath||'sectors'}/${this.sector}/${this.shipKey}`);
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
        if(this.account.defenseEnabled)await connectPersistent(this);else await sdk.onDisconnect(this.selfRef).remove();
        if(this.readStats?.())await sdk.onDisconnect(sdk.ref(this.db,`${this.root}/rankings/${this.uid}`)).update({lastSeenAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()});
        await this.roster.prepareDisconnect();
        if(generation!==this.generation)return;
        this.connected=true;
        this.lastSignature='';
        await this.preparePortProfile();
        await this.send(true);
        if(generation===this.generation&&this.connected)this.onStatus('online');
      }catch{
        if(generation===this.generation)this.fail('permission');
      }
    });
    this.timer=setInterval(()=>{this.send();this.onChange();},500);
  }
  async preparePortProfile(){const s=this.sdk;await s.runTransaction(s.ref(this.db,`${this.root}/portRankings/${this.uid}`),current=>{if(current?.name===this.name)return;return current?{...current,name:this.name,updatedAt:s.serverTimestamp()}:{name:this.name,ownedPortCount:0,revision:1,updatedAt:s.serverTimestamp()};},{applyLocally:false});}
  async publishSummary(){
    if(!this.connected||!this.active||!this.readStats)return;
    if(this.summaryPromise){await this.summaryPromise;if(this.connected&&this.active)return this.publishSummary();return;}
    const stats=this.readStats();if(!stats)return;
    const signature=JSON.stringify({...stats,saveRevision:0});if(signature===this.lastRank&&Date.now()-(this.lastSeenSent||0)<30000)return;
    const sdk=this.sdk,ref=sdk.ref(this.db,`${this.root}/rankings/${this.uid}`);
    this.summaryPromise=sdk.runTransaction(ref,current=>{if(current?.rankProgressVersion===1&&stats.rankProgressVersion!==1)return;if(current?.statsVersion===3&&(current.saveRevision||0)>stats.saveRevision)return;return {...stats,name:this.name,updatedAt:sdk.serverTimestamp(),lastSeenAt:sdk.serverTimestamp()};},{applyLocally:false}).then(result=>{if(result.committed){this.lastRank=signature;this.lastSeenSent=Date.now();}}).catch(()=>{}).finally(()=>this.summaryPromise=null);
    return this.summaryPromise;
  }
  watchSectors(){
    const s=this.sdk,wanted=new Set(nearbySectors(this.readShip().position));
    for(const [key,watch] of this.sectorWatches)if(!wanted.has(key)){watch.stop();this.sectorWatches.delete(key);}
    for(const key of wanted)if(!this.sectorWatches.has(key)){
      const watch={ships:new Map(),stop:()=>{}};this.sectorWatches.set(key,watch);
      const base=s.ref(this.db,`${this.root}/${this.sectorPath||'sectors'}/${key}`),q=this.account?.defenseEnabled?s.query(base,s.orderByKey(),s.limitToFirst(100)):s.query(base,s.orderByChild('updatedAt'),s.startAt(Date.now()-90000),s.limitToLast(100));
      if(this.account?.defenseEnabled){watch.stop=watchSectorPages(s,base,rows=>{if(!this.active||!this.sectorWatches.has(key))return;watch.ships.clear();for(const [id,ship]of rows)if(id!==this.shipKey&&validShip(ship))watch.ships.set(id,ship);this.mergeSectors();},()=>this.onStatus('permission'));continue;}
      watch.stop=s.onValue(q,snapshot=>{if(!this.active||!this.sectorWatches.has(key))return;watch.ships.clear();snapshot.forEach(child=>{if(child.key!==this.shipKey&&validShip(child.val()))watch.ships.set(child.key,child.val());});this.mergeSectors();},()=>this.fail('permission'));
    }
    this.mergeSectors();
  }
  mergeSectors(){
    const now=Date.now(),ships=new Map();for(const watch of this.sectorWatches.values())for(const [id,ship]of watch.ships){const old=ships.get(id);if(!old||!ship.persistent||(ship.positionSeq||0)>(old.positionSeq||0)||ship.positionSeq===old.positionSeq&&ship.updatedAt>old.updatedAt)ships.set(id,ship);}
    for(const [id,ship]of ships){const old=this.peers.get(id);if(old?.to.updatedAt===ship.updatedAt)continue;const wake=[...(old?.wake||[])],point=[ship.lon,ship.lat];if(!wake.length||mapDistance(wake.at(-1),point)>1)wake.push(point);if(wake.length>80)wake.shift();this.peers.set(id,{from:old?this.at(old,now):ship,to:ship,received:now,wake});}
    for(const id of this.peers.keys())if(!ships.has(id))this.peers.delete(id);this.onChange();
  }
  at(peer,now){return interpolateShip(peer.from,peer.to,(now-peer.received)/2000);}
  captains(now=Date.now()){return [...this.peers.entries()].filter(([,p])=>validShip(p.to,now)).map(([id,p])=>({id,...this.at(p,now),offline:!!p.to.offline||!!p.to.persistent&&p.to.updatedAt<now-45000,wake:p.wake}));}
  onlineCaptains(now=Date.now()){
    const players=this.roster?.list(now)||[];
    const others=players.filter(p=>p.uid!==this.uid);return [{uid:this.uid,name:this.name,color:this.color,status:this.readShip().status},...others];
  }
  ships(now=Date.now()){return this.captains(now).slice(0,29);}
  send(force=false){
    if(!this.active||!this.connected||this.sendPromise)return;
    const ship=this.readShip();
    const signature=JSON.stringify([this.name,...ship.position.map(n=>Number(n.toFixed(4))),
      Math.round(ship.angle),ship.status,ship.shipTier,ship.fleetCount,ship.fleetTiers]);
    if(!force&&(Date.now()-this.lastSent<2000||(signature===this.lastSignature&&Date.now()-this.lastSent<30000)))return;
    this.sendPromise=this.publish(ship,signature,force).finally(()=>{this.sendPromise=null;});
    return this.sendPromise;
  }

  async publish(ship,signature,force){
    if(this.account?.defenseEnabled)return publishPersistent(this,ship,signature,force);
    const sdk=this.sdk;
    try{
      const sector=seaSector(ship.position);
      if(sector!==this.sector){
        await sdk.remove(this.selfRef);
        await sdk.onDisconnect(this.selfRef).cancel();
        this.sector=sector;
        this.selfRef=sdk.ref(this.db,`${this.root}/${this.sectorPath||'sectors'}/${sector}/${this.shipKey}`);
        await sdk.onDisconnect(this.selfRef).remove();
        if(!this.active)return;
        this.watchSectors();
      }
      const updatedAt=sdk.serverTimestamp();
      await sdk.set(this.selfRef,{name:this.name,uid:this.uid,updatedAt,
        lon:Number(ship.position[0].toFixed(5)),lat:Number(ship.position[1].toFixed(5)),
        angle:Math.round(ship.angle)%360,color:this.color,status:ship.status,shipTier:ship.shipTier??0,fleetCount:ship.fleetCount??1,...(ship.fleetTiers?{fleetTiers:ship.fleetTiers}:{})});
      if(!this.active)return;
      await this.publishSummary();
      await this.roster.publish(ship,force);
      this.lastSent=Date.now();
      this.lastSignature=signature;
    }catch{
      if(this.active)this.fail('error');
    }
  }
  fail(reason){this.connected=false;this.onStatus(reason);}
  async stop(){
    if(this.account?.defenseEnabled){await this.sendPromise;if(this.connected)await this.send(true);await this.sendPromise;await disconnectPersistent(this);}
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
    if(this.selfRef&&!this.account?.defenseEnabled){
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
