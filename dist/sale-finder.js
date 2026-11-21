import {PORTS,PORT_BY_ID,GOODS} from './data.js?v=2026.11.21-inland-discovery-hubs';
import {taxRate,permitted,captainTradeQuote,NEUTRAL_PORTS} from './commerce.js?v=2026.11.21-inland-discovery-hubs';
import {currentPortOwner} from './port-equity.js?v=2026.11.21-inland-discovery-hubs';
import {fillSearchRoutes} from './route-search.js?v=2026.11.21-inland-discovery-hubs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SALE_SEARCH_NOTICE='지금 검색한 시점에 조회한 시세 기준 최고가입니다. 시세와 세금은 실제 판매할 때 달라질 수 있어요.';
export function ownedTradeGoods(game){const result={};for(const cargo of [game.cargo,JSON.parse(game.battleReserve?.cargoJSON||'{}')])for(const [id,c]of Object.entries(cargo||{}))if(GOODS[id]&&c.qty>0)result[id]=(result[id]||0)+c.qty;return result;}
export function rankSaleQuotes(rows,{goodId,qty,uid,at,game}){return rows.filter(r=>permitted(r.policy,uid)).map(r=>{const rate=taxRate(r.policy,uid,r.port.id,game),quote=captainTradeQuote(game,r.port.id,goodId,qty,'sell',r.item||{},at,rate);return {...r,rate,quote};}).sort((a,b)=>b.quote.total-a.quote.total||b.quote.unit-a.quote.unit||a.port.name.localeCompare(b.port.name,'ko'));}
export async function freshSaleRead(account){
 if(!navigator.onLine||!account.auth?.currentUser||!account.restEndpoint)throw Error('현재 시세는 서버에 연결한 뒤 검색할 수 있어요.');
 const token=await account.auth.currentUser.getIdToken();
 return async (portId,key)=>{const url=new URL(`gameV2/shared/ports/${encodeURIComponent(portId)}/content/${key}.json`,account.restEndpoint.replace(/\/$/,'')+'/');url.searchParams.set('auth',token);if(account.restNamespace)url.searchParams.set('ns',account.restNamespace);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('시세 조회 연결을 확인하세요.');return await response.json();}finally{clearTimeout(timer);}};
}
function portReader(account,portId,remoteRead){
 if(remoteRead)return key=>remoteRead(portId,key);
 const s=account.sdk;
 return async key=>(await s.get(s.ref(account.db,`gameV2/shared/ports/${portId}/content/${key}`))).val();
}
async function readPortPolicy(read,portId,uid,includeRates){
 const developed=portId.startsWith('developed-');
 const [ownerUid,developedOwner,equityVersion]=await Promise.all([read('ownerUid'),developed?read('developedOwner'):null,developed?read('equityVersion'):null]);
 if([ownerUid,developedOwner].some(value=>value!=null&&(typeof value!=='string'||!value)))throw Error('항구 소유 정보를 확인하지 못했어요.');
 const owner=equityVersion===1?ownerUid:developedOwner||ownerUid;
 if(!owner)return {};
 const policy={investors:{[owner]:1}};
 const readRates=includeRates&&owner!==uid&&!NEUTRAL_PORTS.includes(portId);
 const [blacklist,defaultRate,personalRate]=await Promise.all([
  read('blacklist'),readRates?read('defaultRate'):null,readRates?read('rates/'+uid):null
 ]);
 if(blacklist!=null&&(!Array.isArray(blacklist)||blacklist.some(value=>typeof value!=='string')))throw Error('거래 제한을 확인하지 못했어요.');
 if([defaultRate,personalRate].some(value=>value!=null&&(!Number.isFinite(value)||value<0||value>30)))throw Error('항구 세율을 확인하지 못했어요.');
 policy.blacklist=blacklist??[];
 policy.defaultRate=defaultRate??0;
 if(personalRate!=null)policy.rates={[uid]:personalRate};
 return policy;
}
export async function readSalePort(account,port,goodId,remoteRead){
 if(port.promotionLevel>=2){
  const {content}=await account.readShared('projects',port.id);
  if(!(content.promotion?.level>=2))throw Error('항구 교역소 상태를 확인하지 못했어요.');
  if(GOODS[goodId]?.source===port.id)return {port,item:await portReader(account,port.id,remoteRead)('markets/'+goodId),policy:{}};
  return {port,item:content.markets?.[goodId],policy:content};
 }
 const read=portReader(account,port.id,remoteRead);
 const [item,policy]=await Promise.all([read('markets/'+goodId),readPortPolicy(read,port.id,account.uid,true)]);
 if(item!=null&&(typeof item!=='object'||Array.isArray(item)))throw Error('항구 시세를 확인하지 못했어요.');
 return {port,item,policy};
}
export async function readSaleAccess(account,portId,remoteRead){
 const uid=account.uid;
 if(PORT_BY_ID[portId]?.promotionLevel>=2){
  const {content}=await account.readShared('projects',portId);
  return permitted(content,uid);
 }
 const policy=await readPortPolicy(portReader(account,portId,remoteRead),portId,uid,false);
 return permitted(policy,uid);
}
export async function scanSalePorts(ports,read,isCurrent=()=>true){let next=0;const rows=[],failed=[],deadline=Date.now()+20000;await Promise.all(Array.from({length:Math.min(6,ports.length)},async()=>{while(next<ports.length&&isCurrent()&&Date.now()<deadline){const port=ports[next++];try{rows.push(await read(port));}catch{failed.push(port.id);}}}));for(const port of ports.slice(next))failed.push(port.id);return {rows,failed};}

const fmt=n=>Math.round(n).toLocaleString('ko-KR');
function taxReason(row,uid){
 if(NEUTRAL_PORTS.includes(row.port.id))return '중립항';
 if(row.quote.noviceTax)return '초보 선장 면세';
 const owner=currentPortOwner(row.policy);
 if(owner===uid)return '내 소유 항구';
 if(!owner)return '소유자 없음';
 return Object.hasOwn(row.policy.rates||{},uid)?'내 개별 세율':'기본 세율';
}
export function saleProfit(quote,originCost,route){
 if(!route?.canSail||!(route.days>0))return null;
 const profit=quote.total-originCost-route.supplyCost-route.toll;
 return {profit,perDay:profit/route.days};
}
const byPortName=(a,b)=>a.name.localeCompare(b.name,'ko');
function element(tag,value,className){
 const node=document.createElement(tag);
 if(value)node.textContent=value;
 if(className)node.className=className;
 return node;
}
export function createSaleFinder(api){
 const a=api.account;
 const button=element('button','내 물품 최고가 판매처 찾기','service-button sale-search-entry');
 button.id='cargo-price-search';
 document.querySelector('#cargo-list').before(button);
 button.onclick=()=>open();

 function open(selected){
  if(!a.ready||!a.sdk)return api.toast('로그인한 뒤 이용하세요.');
  const owned=ownedTradeGoods(api.getState()),ids=Object.keys(owned);
  api.modal('내 물품 최고가 판매처','검색 시점의 예상 실수령액 비교',`<p>${SALE_SEARCH_NOTICE}</p>${ids.length?`<form id="sale-search-form"><label>내가 보유한 물품<select id="sale-search-good">${ids.map(id=>`<option value="${id}" ${selected===id?'selected':''}>${esc(GOODS[id].name)} · ${owned[id]}상자</option>`).join('')}</select></label><label class="settings-row"><input id="sale-search-known" type="checkbox"> 알고 있는 항구만 비교</label><button id="sale-search-run" class="primary-button" type="submit">현재 시세 검색</button></form><p class="modal-meta">보유 수량, 세금, 판매 보너스를 반영해 예상 수령액을 비교해요. 기본 범위는 전체 주요 항구와 교역소가 있는 개발 항구예요.</p><p id="sale-search-status" class="sale-search-status" role="status" hidden></p><div id="sale-search-results">검색 버튼을 누르면 시세를 한 번 조회해요.</div>`:'<p>아직 보유한 교역품이 없어요. 물품을 구매한 뒤 다시 열어 주세요.</p>'}`,'wide');
  const form=document.querySelector('#sale-search-form');
  if(!form)return;
  const modal=document.querySelector('#modal'),target=document.querySelector('#sale-search-results'),status=document.querySelector('#sale-search-status');
  const controls=[...form.querySelectorAll('button,input,select')],uid=a.uid;
  const order=element('select');
  order.id='sale-search-order';
  order.setAttribute('aria-label','판매처 정렬');
  for(const [id,label] of [['total','판매 실수령액순'],['per-day','항해 하루당 순이익순']]){
   const option=element('option',label);option.value=id;order.append(option);
  }
  order.value=api.getState().saleSearchOrder==='per-day'?'per-day':'total';
  form.after(order);
  let repaint=null;
  order.onchange=()=>{
   api.getState().saleSearchOrder=order.value;
   api.changed?.();
   repaint?.();
  };
  let search=0,searching=false;
  function say(message){
   status.hidden=!message;
   status.textContent=message;
  }
  function lookButton(port){
   const look=element('button','지도에서 보기');
   look.type='button';
   look.dataset.usageKey='action-sale-look';
   look.onclick=()=>api.look(api.portPoint?.(port)||[port.lon,port.lat]);
   return look;
  }
  function portDetails(title,ports,description,canLook){
   const details=element('details',null,'sale-port-details');
   details.append(element('summary',title));
   for(const port of ports){
    const row=element('div',null,'sale-port-status-row');
    row.append(element('strong',port.name),element('span',description));
    if(canLook)row.append(lookButton(port));
    details.append(row);
   }
   return details;
  }
  form.onsubmit=async event=>{
   event.preventDefault();
   if(searching)return;
   searching=true;
   const request=++search;
   const current=()=>request===search&&form.isConnected&&modal.open&&a.ready&&uid===a.uid;
   controls.forEach(control=>control.disabled=true);
   say('각 항구의 현재 시세를 조회하고 있어요…');
   repaint=null;
   target.replaceChildren();
   try{
    const goodId=form.querySelector('#sale-search-good').value,knownOnly=form.querySelector('#sale-search-known').checked;
    let lookup=api.searchRoutes?.();
    const qty=Math.min(1000,ownedTradeGoods(api.getState())[goodId]||0);
    if(!qty)throw Error('보유 수량이 달라졌어요. 창을 다시 열어 주세요.');
    const remote=await freshSaleRead(a);
    await api.syncPorts?.();
    if(!current())return;
    const known=new Set(api.getState().knownPorts||[]);
    const ports=PORTS.filter(p=>(!p.depot||p.promotionLevel>=2)&&(!p.developable||p.developmentLevel>=2)&&(!knownOnly||known.has(p.id)));
    const {rows,failed}=await scanSalePorts(ports,p=>readSalePort(a,p,goodId,remote),current);
    if(!current())return;
    const at=Date.now()+(a.serverOffset||0);
    const ranked=rankSaleQuotes(rows,{goodId,qty,uid,at,game:api.getState()});
    const blocked=rows.filter(row=>!permitted(row.policy,uid)).map(row=>row.port);
    const failedIds=new Set(failed),uncertain=ports.filter(port=>failedIds.has(port.id)).sort(byPortName);
    const clock=new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(at));
    const game=api.getState();
    const stacks=[game.cargo?.[goodId],JSON.parse(game.battleReserve?.cargoJSON||'{}')[goodId]].filter(row=>row?.qty>0);
    const originCost=stacks.reduce((sum,c)=>sum+c.cost,0)*qty/stacks.reduce((sum,c)=>sum+c.qty,0);
    const routeRows=new Map();
    let checking=false,routeGeneration=0,loading=false;
    async function calculate(){
     if(!lookup||loading||!current())return;
     const generation=routeGeneration,reader=lookup;
     const pending=ranked.filter(row=>known.has(row.port.id)&&row.port.id!==game.port&&!routeRows.has(row.port.id));
     if(!pending.length)return;
     loading=true;
     paint();
     await fillSearchRoutes(pending.map(row=>row.port),reader,(port,result)=>routeRows.set(port.id,result),
      ()=>current()&&generation===routeGeneration&&order.value==='per-day');
     if(generation===routeGeneration){
      loading=false;
      if(current())paint();
     }
    }
    function paint(showBlocked=false){
     const restricted=showBlocked||target.querySelector('.sale-port-restricted')?.open;
     const failedOpen=target.querySelector('.sale-port-uncertain')?.open;
     const perDay=order.value==='per-day';
     const results=perDay?ranked.flatMap(row=>{
      const economics=saleProfit(row.quote,originCost,routeRows.get(row.port.id));
      return economics?[{...row,...economics}]:[];
     }).sort((a,b)=>b.perDay-a.perDay||b.quote.total-a.quote.total):ranked;
     target.replaceChildren(
      element('p',`검색 기준 ${clock} (한국 시간) · ${GOODS[goodId].name} ${qty}상자 · ${rows.length}/${ports.length}항구 조회`,'sale-search-timestamp'),
      element('h3',perDay?'바로 출항 가능한 항구 · 항해 하루당 예상 순이익 상위 5곳':failed.length||knownOnly?'확인된 항구 중 예상 실수령액 상위 5곳':'예상 실수령액 상위 5곳')
     );
     if(failed.length)target.append(element('p',`미조회 ${failed.length}곳이 있어 확인에 성공한 항구의 시세만 비교했어요.`,'help-tip'));
     if(!ranked.length)target.append(element('p','판매 가능하다고 확인된 항구가 없어요.'));
     if(perDay){
      const dock=ranked.find(row=>row.port.id===api.getState().port&&!api.getState().voyage);
      if(dock)target.append(element('p','지금 팔기 · '+dock.port.name+' · 예상 실수령 '+fmt(dock.quote.total)+' D','help-tip'));
      if(loading)target.append(element('p','알고 있는 항구의 직항 가능 여부를 계산 중…','route-search-detail'));
      else if(!results.length)target.append(element('p','현재 조건으로 비교할 수 있는 직항이 없어요.'));
     }
     if(lookup&&ranked.length){
      const refresh=element('button','현재 위치로 항로 다시 계산');
      refresh.type='button';refresh.onclick=()=>{
       routeGeneration++;loading=false;routeRows.clear();lookup=api.searchRoutes();
       paint();if(order.value==='per-day')void calculate();
      };
      target.append(refresh);
     }
     for(const [index,row] of results.slice(0,5).entries()){
      const article=element('article',null,'sale-search-row');
      const depart=element('button','항구로 이동');
      depart.type='button';
      depart.dataset.usageKey='action-sale-depart';
      depart.dataset.portId=row.port.id;
      depart.disabled=!known.has(row.port.id)||row.port.id===api.getState().port;
      depart.onclick=async()=>{
       if(!current()||checking)return;
       checking=true;
       depart.disabled=true;
       depart.textContent='거래 제한 확인 중…';
       say(`${row.port.name}의 거래 가능 여부를 확인하고 있어요.`);
       try{
        const allowed=await readSaleAccess(a,row.port.id,await freshSaleRead(a));
        if(!current())return;
        if(!allowed){
         ranked.splice(ranked.findIndex(candidate=>candidate.port.id===row.port.id),1);
         blocked.push(row.port);
         paint(true);
         target.querySelector('.sale-port-restricted summary')?.focus();
         say(`${row.port.name}에서는 현재 내 화물을 판매할 수 없어요.`);
        }else{
         say('');
         await api.depart(row.port.id,current);
        }
       }catch{
        if(current())say('거래 가능 여부를 확인하지 못했어요. 다시 시도해 주세요.');
       }finally{
        checking=false;
        if(depart.isConnected){
         depart.disabled=row.port.id===api.getState().port;
         depart.textContent='항구로 이동';
        }
       }
      };
       const routeInfo=element('p',lookup?'항로 계산 중…':'','route-search-detail');
       if(lookup)void lookup(row.port).then(result=>{if(current()&&article.isConnected)routeInfo.textContent=result.text+(!known.has(row.port.id)?' · 항구 정보 필요':'');});
       const details=element('details',null,'sale-port-details');
       const route=routeRows.get(row.port.id);
       let breakdown='세전 '+fmt(row.quote.gross)+' D · 세금 '+fmt(row.quote.tax)+' D · 판매 보너스 +'+fmt(row.quote.bonus||0)+' D · 축복 +'+fmt(row.quote.blessing||0)+' D';
       if(perDay)breakdown+=' · 매입 원가 '+fmt(originCost)+' D · 예상 보급비 '+fmt(route.supplyCost)+' D · 통행료 '+fmt(route.toll)+' D';
       details.append(element('summary','계산 자세히'),element('p',breakdown));
       article.append(
       element('strong',`${index+1}. ${row.port.name}${known.has(row.port.id)?'':' · 미발견'}`),
       element('p',`${qty}상자 수령 예상 ${fmt(row.quote.total)} D · 항구세 ${row.rate}% (${taxReason(row,uid)})`),
       ...(perDay?[element('strong',`${fmt(row.perDay)} D / 항해일 · 예상 순이익 ${fmt(row.profit)} D`)]:[]),
       routeInfo,details,lookButton(row.port),depart
      );
      target.append(article);
     }
     if(blocked.length){
      const details=portDetails(`내 거래 제한 항구 ${blocked.length}곳 보기`,blocked.sort(byPortName),'내 거래 제한',true);
      details.classList.add('sale-port-restricted');
      details.open=!!restricted;
      target.append(details);
     }
     if(uncertain.length){
      const details=portDetails(`확인 필요 항구 ${uncertain.length}곳 보기`,uncertain,'확인 필요',false);
      details.classList.add('sale-port-uncertain');
      details.open=!!failedOpen;
      target.append(details);
     }
    }
    repaint=()=>{
     paint();
     if(order.value==='per-day')void calculate();
    };
    repaint();
    say('');
    api.record?.(goodId,qty,ranked[0],at);
   }catch(error){
    if(current())say(error.message||'시세를 읽지 못했어요. 다시 검색해 주세요.');
   }finally{
    searching=false;
    if(form.isConnected)controls.forEach(control=>control.disabled=false);
   }
  };
 }
 return {open};
}
