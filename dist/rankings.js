import {rankFleet} from './social-core.js';

export class CaptainRankings{
  constructor(fleet,onChange){this.fleet=fleet;this.onChange=onChange;this.stops=[];this.rows={};this.myRanks={};}
  connect(){
    if(this.path===this.fleet.root)return;this.disconnect();if(!this.fleet.root)return;this.path=this.fleet.root;
    const s=this.fleet.sdk;
    for(const metric of ['profit','money','visited']){
      const q=s.query(s.ref(this.fleet.db,`${this.path}/rankings`),s.orderByChild(metric),s.limitToLast(5));
      this.stops.push(s.onValue(q,snapshot=>{const list=[];snapshot.forEach(child=>list.push({id:child.key,...child.val()}));this.rows[metric]=rankFleet(list,metric);this.myRanks={};this.onChange();},()=>{this.error=true;this.onChange();}));
    }
  }
  async myRank(metric,score){
    if(!this.path)return null;const s=this.fleet.sdk;let higher=0,before=null;
    for(;;){const filters=[s.orderByChild(metric),s.startAt(score+1),s.limitToLast(1000)];if(before)filters.push(s.endBefore(before.score,before.key));const snapshot=await s.get(s.query(s.ref(this.fleet.db,`${this.path}/rankings`),...filters));let count=0,first=null;snapshot.forEach(child=>{count++;first??={score:child.val()[metric],key:child.key};});higher+=count;if(count<1000)break;before=first;}
    const rank=higher+1;this.myRanks[metric]=rank;return rank;
  }
  disconnect(){for(const stop of this.stops)stop();this.stops=[];this.rows={};this.path=null;}
}
