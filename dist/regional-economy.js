// Supply and demand are independent. Imported stock must not hide local demand.
export function regionalFactor(port,goodId,good){
 if(good.premium)return port.id===good.source?1:port.id===good.destination?2.2:(port.region==='유럽'?1.6:1.15);
 const role=port.economy?.stock?.[goodId],tier=port.economy?.demandTiers?.[goodId]??(port.economy?.demand?.includes(goodId)?1.3:1);
 return ({producer:.7,local:.9,import:1.15}[role]??(tier>1?1.15:.8))*tier;
}
