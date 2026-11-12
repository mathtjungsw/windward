import {ownership} from './commerce.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {PORT_BY_ID} from './data.js?v=2026.11.12-collections-ranks-historic-ships.2';
export function ownedPortSummary(portId,content,ownerName){const o=ownership(content);if(!o.ownerUid)return null;return {ownerUid:o.ownerUid,ownerName:content.investorNames?.[o.ownerUid]||content.developerName||ownerName,portName:content.development?.name||PORT_BY_ID[portId]?.name||portId,share:content.developedOwner?100:content.investors[o.ownerUid]/o.total*100,defaultRate:content.defaultRate||0,kind:content.developedOwner?'developed':'general'};}
// Counters are independent of personal summaries: another investor may change
// an offline captain's ownership, without ever writing that captain's save.
export async function ownershipRankChanges(account,portId,before,after,operationId){
 const oldOwner=ownership(before).ownerUid,newOwner=ownership(after).ownerUid;
 const sdk=account.sdk,changes={};
 const entries=await Promise.all((oldOwner===newOwner?[]:[oldOwner,newOwner].filter(Boolean)).map(async uid=>{
  const current=(await sdk.get(sdk.ref(account.db,'gameV2/real/portRankings/'+uid))).val();
  let name=current?.name;if(!name){name=uid===account.uid?account.name:(await sdk.get(sdk.ref(account.db,'gameV2/real/rankings/'+uid+'/name'))).val();}
  if(!name)throw Error('소유 선장 이름을 확인하지 못했어요. 다시 시도하세요.');
  const count=(current?.ownedPortCount||0)+(uid===newOwner?1:-1);if(count<0)throw Error('항구 소유 장부 동기화가 필요해요. 기록은 보존됩니다.');
  return [uid,{name,ownedPortCount:count,revision:(current?.revision||0)+1,lastPort:portId,operationId,updatedAt:sdk.serverTimestamp()}];
 }));for(const [uid,node]of entries)changes['real/portRankings/'+uid]=node;
 const knownName=entries.find(([uid])=>uid===newOwner)?.[1].name||(newOwner===account.uid?account.name:null),oldSummary=ownedPortSummary(portId,before,knownName),next=ownedPortSummary(portId,after,knownName);
 if(JSON.stringify(oldSummary)!==JSON.stringify(next)){if(next&&!next.ownerName)next.ownerName=(await sdk.get(sdk.ref(account.db,'gameV2/real/portRankings/'+newOwner+'/name'))).val();if(next&&!next.ownerName)throw Error('소유 선장 이름을 확인하지 못했어요.');changes['real/ownedPorts/'+portId]=next?{...next,operationId,updatedAt:sdk.serverTimestamp()}:null;}
 return changes;
}
