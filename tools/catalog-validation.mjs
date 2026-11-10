// Shared build-time checks; runtime market calculations live in dist/market-rules.js.
export function validateGoods(goods){
  const ordinary=Object.entries(goods).filter(([,g])=>!g.legacy);
  if(ordinary.length!==31||Object.keys(goods).length!==32||!goods.spice?.legacy)throw Error('일반 상품 31종과 호환 상품 1종이 필요합니다.');
  const required='wine wool rawwool glass coffee silk tea sugar salt oliveoil driedfish cotton porcelain timber grain leather dates copper cacao pepper cloves cinnamon nutmeg rawsilk rawcotton indigo saffron ginger sandalwood dyewood silver spice'.split(' ');
  for(const id of required)if(!goods[id])throw Error(`기존/신규 상품 ID 누락: ${id}`);
  for(const [id,g] of Object.entries(goods))if(!g.name||!Number.isFinite(g.base)||g.base<=0)throw Error(`잘못된 상품 정의: ${id}`);
}

export function validateEconomy(id,economy,goods,{active=false}={}){
  if(!economy?.stock||!Array.isArray(economy.demand)||!economy.demandTiers||Array.isArray(economy.demandTiers))throw Error(`공급·수요 명세 누락: ${id}`);
  const stock=Object.entries(economy.stock),demand=economy.demand,tiers=Object.entries(economy.demandTiers);
  if(new Set(demand).size!==demand.length)throw Error(`수요 중복: ${id}`);
  if(active&&(stock.length<3||stock.length>6||demand.length<2||demand.length>6))throw Error(`항구 상품/수요 수 불일치: ${id}`);
  const validGood=g=>goods[g]&&!goods[g].legacy;
  for(const [good,role] of stock)if(!validGood(good)||!['producer','local','import'].includes(role))throw Error(`잘못된 공급: ${id}/${good}/${role}`);
  for(const [good,tier] of tiers){
    if(!validGood(good)||![1,1.3,1.8].includes(tier))throw Error(`잘못된 수요 단계: ${id}/${good}/${tier}`);
    if(tier===1.8&&economy.stock[good]==='producer')throw Error(`생산지의 희소 수입 수요 모순: ${id}/${good}`);
    if((tier>1)!==demand.includes(good))throw Error(`수요 배열/단계 불일치: ${id}/${good}`);
  }
  for(const good of demand)if(!validGood(good)||!(economy.demandTiers[good]>1))throw Error(`잘못된 수요: ${id}/${good}`);
}

export function validateResearch(research,portIds){
  if(!research?.checkedAt||!research.roleDefinition||!research.eraNote)throw Error('교역 출처/시대 구분이 필요합니다.');
  for(const [id,s] of Object.entries(research.sources))if(!s.label||!s.kind||!s.supports||!/^https:\/\//.test(s.url))throw Error(`교역 출처 오류: ${id}`);
  for(const [id,n] of Object.entries({...research.goodsNotes,...research.portNotes})){
    if(!n.text||!n.sources?.length||n.sources.some(ref=>!research.sources[ref]))throw Error(`교역 근거 메모 오류: ${id}`);
  }
  for(const id of portIds)if(!research.portNotes[id])throw Error(`항구 교역 메모 누락: ${id}`);
}
