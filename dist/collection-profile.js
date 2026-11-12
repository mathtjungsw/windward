import {DISCOVERIES} from './discoveries-catalog.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {OFFICERS} from './rumor-catalog.js?v=2026.11.12-collections-ranks-historic-ships.2';

export function collectionProfile(game){
  const hires=new Set(game.rumorProgress?.officers||[]);
  return {
    discoveries:Object.fromEntries(DISCOVERIES.filter(d=>game.discoveries?.[d.id]).map(d=>[d.id,true])),
    officers:Object.fromEntries(OFFICERS.filter(o=>hires.has(o.id)).map(o=>[o.id,true]))
  };
}

export function createCollectionPublisher(account){
  let lastKey='',pending=null,wanted=null;
  async function publish(profile,revision){
    if(!account.ready||!account.uid||!account.sdk)return;
    const key=account.uid+JSON.stringify(profile);
    if(key===lastKey)return;
    wanted={profile,revision,key,uid:account.uid};
    if(pending)return pending;
    pending=(async()=>{
      while(wanted){
        const next=wanted;wanted=null;
        if(!account.ready||account.uid!==next.uid||lastKey===next.key)continue;
        const sdk=account.sdk,ref=sdk.ref(account.db,'gameV2/real/collections/'+next.uid);
        try{
          const result=await sdk.runTransaction(ref,current=>{
            if((current?.revision??0)>next.revision)return;
            return {...next.profile,revision:next.revision,updatedAt:sdk.serverTimestamp()};
          },{applyLocally:false});
          if(result.committed)lastKey=next.key;
        }catch{}
      }
    })();
    try{await pending;}finally{pending=null;}
  }
  return publish;
}
