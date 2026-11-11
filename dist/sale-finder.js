import {PORTS,GOODS} from './data.js?v=2026.11.12-cooperative-fleet-discoveries';
import {taxRate,permitted,captainTradeQuote} from './commerce.js?v=2026.11.12-cooperative-fleet-discoveries';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SALE_SEARCH_NOTICE='지금 검색한 시점에 조회한 시세 기준 최고가입니다. 시세와 세금은 실제 판매할 때 달라질 수 있어요.';
export function ownedTradeGoods(game){const result={};for(const cargo of [game.cargo,JSON.parse(game.battleReserve?.cargoJSON||'{}')])for(const [id,c]of Object.entries(cargo||{}))if(GOODS[id]&&c.qty>0)result[id]=(result[id]||0)+c.qty;return result;}
export function rankSaleQuotes(rows,{goodId,qty,uid,at,game}){return rows.filter(r=>permitted(r.policy,uid)).map(r=>{const rate=taxRate(r.policy,uid,r.port.id),quote=captainTradeQuote(game,r.port.id,goodId,qty,'sell',r.item||{},at,rate);return {...r,rate,quote};}).sort((a,b)=>b.quote.total-a.quote.total||b.quote.unit-a.quote.unit||a.port.name.localeCompare(b.port.name,'ko'));}
export async function freshSaleRead(account){
 if(!navigator.onLine||!account.auth?.currentUser||!account.restEndpoint)throw Error('현재 시세는 서버에 연결한 뒤 검색할 수 있어요.');
 const token=await account.auth.currentUser.getIdToken();
 return async (portId,key)=>{const url=new URL(`gameV2/shared/ports/${encodeURIComponent(portId)}/content/${key}.json`,account.restEndpoint.replace(/\/$/,'')+'/');url.searchParams.set('auth',token);if(account.restNamespace)url.searchParams.set('ns',account.restNamespace);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('시세 조회 연결을 확인하세요.');return await response.json();}finally{clearTimeout(timer);}};
}
export async function readSalePort(account,port,goodId,remoteRead){
 const s=account.sdk,read=remoteRead?key=>remoteRead(port.id,key):async key=>(await s.get(s.ref(account.db,`gameV2/shared/ports/${port.id}/content/${key}`))).val();
 // Read only this commodity and the ownership IDs. Never download all port
 // markets/investors, another captain's cargo or the complete game root.
 const [item,ownerUid,developedOwner]=await Promise.all([read('markets/'+goodId),read('ownerUid'),read('developedOwner')]),owner=developedOwner||ownerUid,policy=owner?{investors:{[owner]:1},...(developedOwner?{developedOwner}:{})}:{};
 if(owner&&owner!==account.uid&&!['lisbon','porto'].includes(port.id)){const [defaultRate,personalRate,blacklist]=await Promise.all([read('defaultRate'),read('rates/'+account.uid),read('blacklist')]);policy.defaultRate=defaultRate||0;policy.rates=personalRate==null?{}:{[account.uid]:personalRate};policy.blacklist=blacklist||[];}
 return {port,item,policy};
}
export async function scanSalePorts(ports,read,isCurrent=()=>true){let next=0;const rows=[],failed=[],deadline=Date.now()+20000;await Promise.all(Array.from({length:Math.min(6,ports.length)},async()=>{while(next<ports.length&&isCurrent()&&Date.now()<deadline){const port=ports[next++];try{rows.push(await read(port));}catch{failed.push(port.id);}}}));for(const port of ports.slice(next))failed.push(port.id);return {rows,failed};}
export function createSaleFinder(api){
 const a=api.account;let generation=0,searching=false;
 const button=document.createElement('button');button.id='cargo-price-search';button.className='service-button sale-search-entry';button.textContent='내 물품 최고가 판매처 찾기';document.querySelector('#cargo-list').before(button);button.onclick=()=>open();
 function open(selected){if(!a.ready||!a.sdk)return api.toast('로그인한 뒤 이용하세요.');const owned=ownedTradeGoods(api.getState()),ids=Object.keys(owned),gen=++generation;
  api.modal('내 물품 최고가 판매처','검색 시점의 예상 실수령액 비교',`<p>${SALE_SEARCH_NOTICE}</p>${ids.length?`<form id="sale-search-form"><label>내가 보유한 물품<select id="sale-search-good">${ids.map(id=>`<option value="${id}" ${selected===id?'selected':''}>${esc(GOODS[id].name)} · ${owned[id]}상자</option>`).join('')}</select></label><label class="settings-row"><input id="sale-search-known" type="checkbox"> 알고 있는 항구만 비교</label><button id="sale-search-run" class="primary-button" type="submit">현재 시세 검색</button></form><p class="modal-meta">기본은 전체 주요 항구와 교역소가 있는 개발 항구예요. 세금과 교역 제한을 반영해 내 보유 수량의 예상 수령액으로 정렬합니다. 이미 정보를 얻은 항구에는 검색 결과에서 출항할 수 있어요.</p><div id="sale-search-results" aria-live="polite">검색 버튼을 누르면 시세를 한 번 조회해요.</div>`:'<p>아직 보유한 교역품이 없어요. 물품을 구매한 뒤 다시 열어 주세요.</p>'}`,'wide');
  const form=document.querySelector('#sale-search-form');if(!form)return;
  form.onsubmit=async e=>{e.preventDefault();if(searching)return api.toast('이전 검색을 마무리하는 중이에요.');searching=true;const current=()=>gen===generation&&form.isConnected&&document.querySelector('#modal')?.open,controls=[...form.querySelectorAll('button,input,select')];controls.forEach(x=>x.disabled=true);const target=document.querySelector('#sale-search-results');target.textContent='각 항구의 현재 시세를 조회하고 있어요…';
   try{const goodId=form.querySelector('#sale-search-good').value,knownOnly=form.querySelector('#sale-search-known').checked,qty=Math.min(1000,ownedTradeGoods(api.getState())[goodId]||0);if(!qty)throw Error('보유 수량이 달라졌어요. 창을 다시 열어 주세요.');const remote=await freshSaleRead(a);await api.syncPorts?.();const known=new Set(api.getState().knownPorts||[]),ports=PORTS.filter(p=>!p.depot&&(!p.developable||p.developmentLevel>=2)&&(!knownOnly||known.has(p.id))),{rows,failed}=await scanSalePorts(ports,p=>readSalePort(a,p,goodId,remote),current);if(!current())return;const at=Date.now()+(a.serverOffset||0),ranked=rankSaleQuotes(rows,{goodId,qty,uid:a.uid,at,game:api.getState()}),clock=new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(at)),fmt=n=>Math.round(n).toLocaleString('ko-KR');
    target.replaceChildren();const summary=document.createElement('p');summary.className='sale-search-timestamp';summary.textContent=`검색 기준 ${clock} (한국 시간) · ${GOODS[goodId].name} ${qty}상자 · ${rows.length}/${ports.length}항구 조회`;target.append(summary);
    const notice=document.createElement('p');notice.className='help-tip';notice.textContent=failed.length?`미조회 ${failed.length}곳이 있어 전체 최고가를 확정할 수 없어요. 조회에 성공한 항구 중의 결과입니다. ${SALE_SEARCH_NOTICE}`:SALE_SEARCH_NOTICE;target.append(notice);
    const heading=document.createElement('h3');heading.textContent='예상 실수령액 상위 5곳';target.append(heading);
    api.record?.(goodId,qty,ranked[0],at);
    for(const [index,row]of ranked.slice(0,5).entries()){const article=document.createElement('article');article.className='sale-search-row';const name=document.createElement('strong');name.textContent=`${index+1}. ${row.port.name}${known.has(row.port.id)?'':' · 미발견'}`;const detail=document.createElement('p');detail.textContent=`판매가 ${fmt(row.quote.unit)} D/상자 · 세율 ${row.rate}%${row.quote.bonus?' · 보너스 +'+fmt(row.quote.bonus)+' D':''} · ${qty}상자 수령 ${fmt(row.quote.total)} D`;const look=document.createElement('button');look.type='button';look.textContent='지도에서 보기';look.onclick=()=>api.look(api.portPoint?.(row.port)||[row.port.lon,row.port.lat]);const depart=document.createElement('button');depart.type='button';depart.textContent='항구로 이동';
     depart.disabled=!known.has(row.port.id)||row.port.id===api.getState().port;
     depart.onclick=async()=>{depart.disabled=true;try{await api.depart(row.port.id);}finally{if(depart.isConnected)depart.disabled=false;}};
     article.append(name,detail,look,depart);target.append(article);}
    if(!ranked.length){const p=document.createElement('p');p.textContent='비교할 수 있는 항구가 없어요. 조회 상태와 교역 제한을 확인하세요.';target.append(p);}const blocked=rows.length-ranked.length;if(blocked){const p=document.createElement('p');p.textContent=`내 교역이 제한된 ${blocked}곳은 순위에서 제외했어요.`;target.append(p);}
   }catch(error){if(current())target.textContent=error.message||'시세를 읽지 못했어요. 다시 검색해 주세요.';}finally{searching=false;if(current())controls.forEach(x=>x.disabled=false);}
  };
 }
 return {open};
}
