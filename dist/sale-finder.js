import {PORTS,GOODS} from './data.js?v=2026.11.14-trade-access';
import {taxRate,permitted,captainTradeQuote,NEUTRAL_PORTS} from './commerce.js?v=2026.11.14-trade-access';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SALE_SEARCH_NOTICE='지금 검색한 시점에 조회한 시세 기준 최고가입니다. 시세와 세금은 실제 판매할 때 달라질 수 있어요.';
export function ownedTradeGoods(game){const result={};for(const cargo of [game.cargo,JSON.parse(game.battleReserve?.cargoJSON||'{}')])for(const [id,c]of Object.entries(cargo||{}))if(GOODS[id]&&c.qty>0)result[id]=(result[id]||0)+c.qty;return result;}
export function rankSaleQuotes(rows,{goodId,qty,uid,at,game}){return rows.filter(r=>permitted(r.policy,uid)).map(r=>{const rate=taxRate(r.policy,uid,r.port.id),quote=captainTradeQuote(game,r.port.id,goodId,qty,'sell',r.item||{},at,rate);return {...r,rate,quote};}).sort((a,b)=>b.quote.total-a.quote.total||b.quote.unit-a.quote.unit||a.port.name.localeCompare(b.port.name,'ko'));}
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
 const [ownerUid,developedOwner]=await Promise.all([read('ownerUid'),read('developedOwner')]);
 if([ownerUid,developedOwner].some(value=>value!=null&&(typeof value!=='string'||!value)))throw Error('항구 소유 정보를 확인하지 못했어요.');
 const owner=developedOwner||ownerUid;
 if(!owner)return {};
 const policy=developedOwner?{developedOwner}:{investors:{[owner]:1}};
 const readRates=includeRates&&owner!==uid&&!NEUTRAL_PORTS.includes(portId);
 const [blacklist,defaultRate,personalRate]=await Promise.all([
  read('blacklist'),readRates?read('defaultRate'):null,readRates?read('rates/'+uid):null
 ]);
 if(blacklist!=null&&(!Array.isArray(blacklist)||blacklist.some(value=>typeof value!=='string')))throw Error('거래 제한을 확인하지 못했어요.');
 if([defaultRate,personalRate].some(value=>value!=null&&(!Number.isFinite(value)||value<0||value>10)))throw Error('항구 세율을 확인하지 못했어요.');
 policy.blacklist=blacklist??[];
 policy.defaultRate=defaultRate??0;
 if(personalRate!=null)policy.rates={[uid]:personalRate};
 return policy;
}
export async function readSalePort(account,port,goodId,remoteRead){
 const read=portReader(account,port.id,remoteRead);
 const [item,policy]=await Promise.all([read('markets/'+goodId),readPortPolicy(read,port.id,account.uid,true)]);
 if(item!=null&&(typeof item!=='object'||Array.isArray(item)))throw Error('항구 시세를 확인하지 못했어요.');
 return {port,item,policy};
}
export async function readSaleAccess(account,portId,remoteRead){
 const uid=account.uid;
 const policy=await readPortPolicy(portReader(account,portId,remoteRead),portId,uid,false);
 return permitted(policy,uid);
}
export async function scanSalePorts(ports,read,isCurrent=()=>true){let next=0;const rows=[],failed=[],deadline=Date.now()+20000;await Promise.all(Array.from({length:Math.min(6,ports.length)},async()=>{while(next<ports.length&&isCurrent()&&Date.now()<deadline){const port=ports[next++];try{rows.push(await read(port));}catch{failed.push(port.id);}}}));for(const port of ports.slice(next))failed.push(port.id);return {rows,failed};}

const fmt=n=>Math.round(n).toLocaleString('ko-KR');
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
   target.replaceChildren();
   try{
    const goodId=form.querySelector('#sale-search-good').value,knownOnly=form.querySelector('#sale-search-known').checked;
    const qty=Math.min(1000,ownedTradeGoods(api.getState())[goodId]||0);
    if(!qty)throw Error('보유 수량이 달라졌어요. 창을 다시 열어 주세요.');
    const remote=await freshSaleRead(a);
    await api.syncPorts?.();
    if(!current())return;
    const known=new Set(api.getState().knownPorts||[]);
    const ports=PORTS.filter(p=>!p.depot&&(!p.developable||p.developmentLevel>=2)&&(!knownOnly||known.has(p.id)));
    const {rows,failed}=await scanSalePorts(ports,p=>readSalePort(a,p,goodId,remote),current);
    if(!current())return;
    const at=Date.now()+(a.serverOffset||0);
    const ranked=rankSaleQuotes(rows,{goodId,qty,uid,at,game:api.getState()});
    const blocked=rows.filter(row=>!permitted(row.policy,uid)).map(row=>row.port);
    const failedIds=new Set(failed),uncertain=ports.filter(port=>failedIds.has(port.id)).sort(byPortName);
    const clock=new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(at));
    let checking=false;
    function paint(showBlocked=false){
     const restricted=showBlocked||target.querySelector('.sale-port-restricted')?.open;
     const failedOpen=target.querySelector('.sale-port-uncertain')?.open;
     target.replaceChildren(
      element('p',`검색 기준 ${clock} (한국 시간) · ${GOODS[goodId].name} ${qty}상자 · ${rows.length}/${ports.length}항구 조회`,'sale-search-timestamp'),
      element('h3',failed.length||knownOnly?'확인된 항구 중 예상 실수령액 상위 5곳':'예상 실수령액 상위 5곳')
     );
     if(failed.length)target.append(element('p',`미조회 ${failed.length}곳이 있어 확인에 성공한 항구의 시세만 비교했어요.`,'help-tip'));
     if(!ranked.length)target.append(element('p','판매 가능하다고 확인된 항구가 없어요.'));
     for(const [index,row] of ranked.slice(0,5).entries()){
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
         ranked.splice(ranked.indexOf(row),1);
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
      article.append(
       element('strong',`${index+1}. ${row.port.name}${known.has(row.port.id)?'':' · 미발견'}`),
       element('p',`판매가 ${fmt(row.quote.unit)} D/상자 · 세율 ${row.rate}%${row.quote.bonus?' · 보너스 +'+fmt(row.quote.bonus)+' D':''} · ${qty}상자 수령 ${fmt(row.quote.total)} D`),
       lookButton(row.port),depart
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
    paint();
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
