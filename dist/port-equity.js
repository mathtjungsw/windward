export const equityEnabled=c=>c?.equityVersion===1;
export const capitalTotal=c=>Object.values(c?.investors||{}).reduce((n,v)=>n+(Number.isSafeInteger(v)&&v>0?v:0),0);
export function majorityOwner(c){const total=capitalTotal(c);return Object.entries(c?.investors||{}).find(([,v])=>Number.isSafeInteger(v)&&v>0&&v>total/2)?.[0]||null;}
export function currentPortOwner(c={}){return equityEnabled(c)?majorityOwner(c):c.developedOwner||(c.registeredCapital?c.registeredOwner:majorityOwner(c))||null;}
export const withdrawableCapital=(c,uid)=>equityEnabled(c)?Math.min(c.investors?.[uid]||0,c.withdrawableCapital?.[uid]||0):c.investors?.[uid]||0;
export function equityExpansionPlan(c,uid){
 const revision=c.equityRevision||1,votes=c.equityExpansionVotes||{},total=capitalTotal(c);
 const support=Object.entries(c.investors||{}).reduce((n,[id,stake])=>n+(votes[id]===revision?stake:0),0);
 return {revision,total,support,voted:votes[uid]===revision,canConfirm:currentPortOwner(c)===uid||!!c.investors?.[uid]&&votes[uid]===revision&&support>total/2};
}
export function preserveSupplyRemainders(c){
 if(!equityEnabled(c)||!c.dividendRemainders)return;
 const total=capitalTotal(c);c.supplyRemainders??={};
 for(const[uid,units]of Object.entries(c.dividendRemainders))if(total&&Number.isFinite(units)&&units>0)c.supplyRemainders[uid]=(c.supplyRemainders[uid]||0)+units/total;
 delete c.dividendRemainders;
}
export function equityRegistry(id,c){
 const owner=currentPortOwner(c),total=capitalTotal(c),depot=id.startsWith('depot-');
 return {id,name:c.development?.name||c.registryName||id,level:depot?1:c.development?.level||2,ownerUid:owner||'',ownerShare:owner&&total?Math.floor(c.investors[owner]*10000/total)/100:0,
  ...(depot?{kind:'depot',opensAt:c.readyAt,promotionLevel:c.promotion?.level||0}:{}),...(owner&&c.investorNames?.[owner]?{ownerName:c.investorNames[owner]}:{})};
}
