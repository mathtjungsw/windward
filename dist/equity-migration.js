import {advanceBasicIncome} from './port-income.js?v=2026.11.21-inland-discovery-hubs';
import {capitalTotal,currentPortOwner,preserveSupplyRemainders,equityEnabled} from './port-equity.js?v=2026.11.21-inland-discovery-hubs';
// Idempotent. The operator calls this only on a backed-up harbor during maintenance;
// new harbors enter it in the same atomic action that opens their trading post.
export function initializePortEquity(content,id,now){
 if(equityEnabled(content))return false;
 const depot=id.startsWith('depot-'),level=depot?content.promotion?.level:content.development?.level;
 if(!(level>=2)||(!depot&&!content.developedOwner))return false;
 const founder=content.developedOwner||null,owner=currentPortOwner(content);
 advanceBasicIncome(content,id,owner,now);
 // Finish a legacy sole-owner period before opening the new distribution era.
 if(!depot&&content.basicIncome?.period){
  const p=content.basicIncome.period;
  content.basicIncome.previous??={};
  content.basicIncome.previous[p.owner]=(content.basicIncome.previous[p.owner]||0)+p.units;
  delete content.basicIncome.period;
 }
 const known=Number.isSafeInteger(content.foundingPaid)&&content.foundingPaid>0?content.foundingPaid:0;
 if(!depot){
  content.investors={[founder]:known||400000};
  content.investorNames={...(content.investorNames||{}),[founder]:content.developerName||'창립 선장'};
 }
 content.foundingInvestors={...content.investors};
 content.withdrawableCapital=depot?{...content.investors}:{[founder]:known};
 content.equityVersion=1;content.equitySince=now;content.equityRevision=1;
 content.ownerUid=currentPortOwner(content);content.equityTotal=capitalTotal(content);
 if(!depot&&!known)content.foundingValuation=400000;
 preserveSupplyRemainders(content);
 advanceBasicIncome(content,id,content.ownerUid||null,now);
 return true;
}
