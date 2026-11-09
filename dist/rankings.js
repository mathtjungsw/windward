import {rankFleet} from './social-core.js?v=2026.11.10-community-battle';
import {RANK_METRICS} from './rank-metrics.js?v=2026.11.10-community-battle';
export {RANK_METRICS};
export class CaptainRankings{
 constructor(fleet,onChange){this.fleet=fleet;this.onChange=onChange;this.rows={};this.myRanks={};this.metric='profit';this.visible=true;}
 connect(){if(this.path===this.fleet.root){this.select(this.metric);return;}this.disconnect();if(!this.fleet.root)return;this.path=this.fleet.root;this.select(this.metric);}
 select(metric=this.metric){if(!RANK_METRICS.includes(metric))return;this.metric=metric;this.stop?.();this.stop=null;if(!this.path||!this.visible)return;
  const s=this.fleet.sdk,q=s.query(s.ref(this.fleet.db,`${this.path}/${metric==='ownedPortCount'?'portRankings':'rankings'}`),s.orderByChild(metric),s.startAt(-1000000000000),s.limitToLast(5));
  this.stop=s.onValue(q,snapshot=>{const list=[];snapshot.forEach(child=>{list.push({id:child.key,...child.val()});});this.rows[metric]=rankFleet(list,metric);this.myRanks={};this.onChange();},()=>{this.error=true;this.onChange();});
 }
 setVisible(visible){if(this.visible===visible)return;this.visible=visible;this.select(this.metric);}
 async page(after=null){if(!this.path)throw Error('선장 명부 서버에 연결되지 않았어요.');const s=this.fleet.sdk,filters=[s.orderByKey(),s.limitToFirst(20)];if(after)filters.push(s.startAfter(after));const snapshot=await s.get(s.query(s.ref(this.fleet.db,`${this.path}/rankings`),...filters)),list=[];snapshot.forEach(c=>{list.push({id:c.key,...c.val()});});return list;}
 async captain(uid){const s=this.fleet.sdk,[summary,ports]=await Promise.allSettled([s.get(s.ref(this.fleet.db,`${this.path}/rankings/${uid}`)),s.get(s.ref(this.fleet.db,`${this.path}/portRankings/${uid}`))]);const value=summary.status==='fulfilled'?summary.value.val():null;if(!value)return null;return {id:uid,...value,ownedPortCount:ports.status==='fulfilled'?ports.value.val()?.ownedPortCount||0:0};}
 async myRank(metric,score){if(!this.path||!RANK_METRICS.includes(metric))return null;const s=this.fleet.sdk;if(metric==='ownedPortCount')score=(await s.get(s.ref(this.fleet.db,`${this.path}/portRankings/${this.fleet.uid}`))).val()?.ownedPortCount||0;let higher=0,before=null;
  for(;;){const filters=[s.orderByChild(metric),s.startAt(score+1),s.limitToLast(1000)];if(before)filters.push(s.endBefore(before.score,before.key));const snapshot=await s.get(s.query(s.ref(this.fleet.db,`${this.path}/${metric==='ownedPortCount'?'portRankings':'rankings'}`),...filters));let count=0,first=null;snapshot.forEach(child=>{count++;first??={score:child.val()[metric],key:child.key};});higher+=count;if(count<1000)break;before=first;}
  const rank=higher+1;this.myRanks[metric]=rank;return rank;
 }
 disconnect(){this.stop?.();this.stop=null;this.path=null;}
}
