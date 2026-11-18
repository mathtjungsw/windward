import {initializePortEquity} from '../dist/equity-migration.js';
import {equityRegistry} from '../dist/port-equity.js';
import {ownedPortSummary} from '../dist/port-rankings.js';
// Pure planner. Production callers must freeze game writes and keep their input
// snapshots. Existing equity is never seeded or refunded for a second time.
export function planEquityBackfill(registry,records,names,now){
 const patch={},changed=[];
 for(const[id,entry]of Object.entries(registry||{})){
  if(!(entry.kind==='depot'?entry.promotionLevel>=2:entry.level>=2))continue;
  const source=records[id];if(!source?.content)throw Error('Missing harbor ledger '+id);
  const content=structuredClone(source.content);content.registryName??=entry.name;
  if(!initializePortEquity(content,id,now))continue;
  content.investorNames??={};
  for(const uid of Object.keys(content.investors||{})){
   content.investorNames[uid]=names[uid]||content.investorNames[uid]||'투자 선장';
   patch['taxDividendPorts/'+uid+'/'+id]=true;
  }
  const kind=entry.kind==='depot'?'projects':'ports';
  patch['shared/'+kind+'/'+id]={...source,revision:source.revision+1,updatedAt:{'.sv':'timestamp'},content};
  patch['harborRegistry/'+id]={...entry,...equityRegistry(id,content),name:entry.name};
  if(kind==='ports'){
   const summary=ownedPortSummary(id,content,names[content.ownerUid]);
   patch['real/ownedPorts/'+id]=summary?{...summary,operationId:'equity-backfill-'+now,updatedAt:{'.sv':'timestamp'}}:null;
  }
  changed.push({id,kind,investors:Object.keys(content.investors||{}).length,foundingValuation:content.foundingValuation||0});
 }
 return {patch,changed};
}
