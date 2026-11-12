import {PORT_BY_ID,PORTS} from './data.js?v=2026.11.12-collections-ranks-historic-ships.2';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function suggestionDraft(title,body){title=String(title||'').trim();body=String(body||'').trim();if(!title||title.length>50||!body||body.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(title+body))throw Error('제목 1~50자, 내용 1~1,200자로 작성하세요.');return {title,body};}
export function createCommunity(api){
 const a=api.account;let generation=0,cursor=null,history=[null],page=0,draft={title:'',body:''},sending=false,pending=null;
 for(const [id,label,fn]of [['suggestions-tab','✉ 개선 제안',()=>showSuggestions(true)],['owned-ports-tab','⚓ 소유 항구',showOwnedPorts]]){const b=document.createElement('button');b.id=id;b.className='nav-item community-nav';b.textContent=label;b.onclick=fn;$('.main-nav').append(b);}
 const ref=p=>a.sdk.ref(a.db,'gameV2/real/'+p);
 function ready(){if(a.ready&&a.sdk)return true;api.toast('로그인한 뒤 이용하세요.');return false;}
 function header(tab){return `<nav class="expansion-tabs"><button id="community-suggestions" aria-pressed="${tab==='suggestions'}">개선 제안</button><button id="community-owned" aria-pressed="${tab==='owned'}">소유 항구</button></nav>`;}
 function bind(){ $('#community-suggestions').onclick=()=>showSuggestions(true);$('#community-owned').onclick=showOwnedPorts;}
 async function showSuggestions(reset=false){if(!ready())return;if(reset){history=[null];page=0;}const gen=++generation;api.modal('운영자에게 개선 제안','모든 선장에게 공개되는 게시판',header('suggestions')+`<p>불편한 점이나 아이디어를 남겨 주세요. 글은 채팅과 별도로 보관합니다. 개인정보는 적지 마세요.</p><form id="suggestion-form"><label>제목 <input id="suggestion-title" maxlength="50" required value="${esc(draft.title)}"></label><label>내용 <textarea id="suggestion-body" maxlength="1200" required rows="3">${esc(draft.body)}</textarea></label><button id="suggestion-submit" type="submit">제안 등록</button><p id="suggestion-status" role="status">1분에 한 번 등록할 수 있어요.</p></form><div id="suggestion-list">불러오는 중…</div><div class="dialog-actions"><button id="suggestion-prev" ${page?'':'disabled'}>이전 20개</button><button id="suggestion-next" disabled>다음 20개</button><button id="suggestion-refresh">새로고침</button></div>`,'wide');bind();
  const remember=()=>draft={title:$('#suggestion-title').value,body:$('#suggestion-body').value};$('#suggestion-title').oninput=remember;$('#suggestion-body').oninput=remember;
  $('#suggestion-form').onsubmit=async e=>{e.preventDefault();if(sending)return;remember();let value;try{value=suggestionDraft(draft.title,draft.body);}catch(error){$('#suggestion-status').textContent=error.message;return;}sending=true;const button=$('#suggestion-submit'),status=$('#suggestion-status');button.disabled=true;status.textContent='등록 확인 중…';try{if(!pending||JSON.stringify(pending.value)!==JSON.stringify(value))pending={key:a.sdk.push(ref('suggestions/posts')).key,value};const {key}=pending;const existing=(await a.sdk.get(ref('suggestions/posts/'+key))).val();if(!existing)await a.sdk.update(ref('suggestions'),{['posts/'+key]:{...value,uid:a.uid,name:a.name,at:a.sdk.serverTimestamp()},['lastSent/'+a.uid]:{postId:key,at:a.sdk.serverTimestamp()}});pending=null;draft={title:'',body:''};api.toast('제안을 등록했어요.');if(gen===generation&&$('#suggestion-form'))await showSuggestions(true);}catch{status.textContent='등록을 확인하지 못했어요. 같은 글로 다시 누르면 중복 여부를 확인합니다. 1분 간격과 연결 상태도 확인하세요.';}finally{sending=false;button.disabled=false;}};
  $('#suggestion-prev').onclick=()=>{remember();page--;showSuggestions();};$('#suggestion-refresh').onclick=()=>{remember();showSuggestions(true);};
  try{const s=a.sdk,filters=[s.orderByKey(),s.limitToLast(20)];if(history[page])filters.push(s.endBefore(history[page]));const snap=await s.get(s.query(ref('suggestions/posts'),...filters)),rows=[];snap.forEach(c=>{rows.push({id:c.key,...c.val()});});if(gen!==generation||!$('#suggestion-list'))return;cursor=rows[0]?.id;$('#suggestion-list').replaceChildren();for(const p of rows.reverse()){const row=document.createElement('article');row.className='suggestion-row';const h=document.createElement('h3');h.textContent=p.title;const meta=document.createElement('small');meta.textContent=p.name+' · '+new Date(p.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' KST';const body=document.createElement('p');body.textContent=p.body;row.append(h,meta,body);if(p.reply){const reply=document.createElement('p');reply.className='operator-reply';reply.textContent='운영자 답변: '+p.reply;row.append(reply);}$('#suggestion-list').append(row);}if(!rows.length)$('#suggestion-list').textContent='아직 제안이 없어요. 첫 의견을 남겨 주세요.';$('#suggestion-next').disabled=rows.length<20;$('#suggestion-next').onclick=()=>{remember();history[++page]=cursor;showSuggestions();};}catch{if(gen===generation&&$('#suggestion-list'))$('#suggestion-list').textContent='게시판을 불러오지 못했어요. 새로고침해 주세요.';}
 }
 async function depotSummaries(s){
  return Promise.all(PORTS.filter(p=>p.depot&&p.ownerUid).map(async p=>{
   let ownerName=p.ownerUid===a.uid?a.name:null;
   if(!ownerName)try{ownerName=(await s.get(ref('rankings/'+p.ownerUid+'/name'))).val();}catch{}
   return {id:p.id,portName:p.name,ownerUid:p.ownerUid,ownerName:ownerName||'소유 선장',share:p.ownerShare,defaultRate:0,kind:'depot'};
  }));
 }
 let ownershipRows=new Map(),ownershipRead=null,ownershipUid=null,ownershipAt=0;
 async function syncOwnership(force=false){
  if(!a.ready||!a.sdk){ownershipUid=null;ownershipAt=0;ownershipRows.clear();return [];}
  if(ownershipUid!==a.uid){ownershipRows=new Map();ownershipAt=0;ownershipRead=null;ownershipUid=a.uid;}
  if(ownershipRead)return ownershipRead;
  if(!force&&Date.now()-ownershipAt<60000)return [...ownershipRows.values()];
  const uid=a.uid,s=a.sdk;
  ownershipRead=(async()=>{
   const snap=await s.get(s.query(ref('ownedPorts'),s.orderByKey(),s.limitToFirst(124))),rows=[];
   snap.forEach(c=>{const row=c.val();if(row?.ownerName&&row.ownerUid)rows.push({id:c.key,...row});});
   const known=new Set(rows.map(row=>row.id));
   rows.push(...(await depotSummaries(s)).filter(row=>!known.has(row.id)));
   if(a.uid===uid&&a.ready){
    const labels=rows.map(row=>[row.id,row.ownerName]).sort();
    const previous=[...ownershipRows.values()].map(row=>[row.id,row.ownerName]).sort();
    ownershipRows=new Map(rows.map(row=>[row.id,row]));ownershipAt=Date.now();
    if(JSON.stringify(labels)!==JSON.stringify(previous))api.onOwnership?.();
   }
   return rows;
  })();
  const request=ownershipRead;
  try{return await request;}finally{if(ownershipRead===request)ownershipRead=null;}
 }
 async function showOwnedPorts(force=false){
  if(!ready())return;
  const gen=++generation;
  api.modal('현재 소유 항구','과반 지분 소유 · 개발 항구 포함',header('owned')+
    '<div class="dialog-actions"><button id="owned-refresh">새로고침</button><small>현재 소유자가 있는 항구</small></div><div id="owned-port-list">불러오는 중…</div>','wide');
  bind();$('#owned-refresh').onclick=()=>showOwnedPorts(true);
  try{
   const rows=await syncOwnership(force===true),list=$('#owned-port-list');
   if(gen!==generation||!list)return;
   list.replaceChildren();
   for(const p of [...rows].sort((a,b)=>a.portName.localeCompare(b.portName,'ko'))){
    const row=document.createElement('article'),summary=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),button=document.createElement('button');
    row.className='owned-port-row';summary.className='owned-port-summary';name.textContent=p.portName;
    detail.textContent=p.ownerName+(p.ownerUid===a.uid?' (나)':'')+' · '+(p.kind==='developed'?'개발 항구':(p.kind==='depot'?'공동 보급항 · ':'')+'지분 '+Number(p.share).toFixed(2)+'%')+' · 기본 세율 '+p.defaultRate+'%';
    button.textContent='지도에서 보기';button.onclick=()=>{const port=PORT_BY_ID[p.id];if(port)api.look(api.portPoint?.(port)||[port.lon,port.lat]);};
    summary.append(name,detail);row.append(summary,button);list.append(row);
   }
   if(!rows.length)list.textContent='현재 소유자가 있는 항구가 없어요.';
  }catch{if(gen===generation&&$('#owned-port-list'))$('#owned-port-list').textContent='소유 현황을 불러오지 못했어요. 새로고침해 주세요.';}
 }
 return {showSuggestions,showOwnedPorts,syncOwnership,ownerName:id=>a.uid===ownershipUid?ownershipRows.get(id)?.ownerName:null};
}
