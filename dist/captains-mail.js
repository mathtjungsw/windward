const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('ko-KR')+' D';
const expiry=48*3600000;
export function createCaptainsMail(api){
 const a=api.account;
 const path=(recipient,id='')=>'captainMail/'+recipient+(id?'/'+id:'');
 const reference=(recipient,id)=>a.sdk.ref(a.db,'gameV2/'+path(recipient,id));
 function compose(recipient,name){
  api.modal('외교 서신',name,'<label>서신 <textarea id="mail-body" maxlength="300" rows="4"></textarea></label><label>첨부 두카트 <input id="mail-amount" type="number" min="0" max="100000" value="0"></label><p>첨부금은 수락 전까지 보류해요. 거절 또는 48시간 만료 후 보낸 편지함에서 반환받을 수 있어요.</p><button id="mail-send">서신 보내기</button><button id="mail-back">편지함</button>','small');
  $('#mail-back').onclick=open;
  const id=crypto.randomUUID();
  $('#mail-send').onclick=()=>{
   const body=$('#mail-body').value.trim(),amount=Number($('#mail-amount').value);
   api.run('personal',a.uid,(game,_c,now)=>{
    if(!recipient||recipient===a.uid||!body||body.length>300||!Number.isSafeInteger(amount)||amount<0||amount>100000||amount>game.money)throw Error('서신 문구와 첨부 금액을 확인하세요.');
    const out=game.mailSent??={};
    if(out[id])throw Error('이미 보낸 서신이에요.');
    if(Object.values(out).some(item=>item.to===recipient&&now-item.at<60000))throw Error('같은 선장에게는 1분 뒤 다시 보낼 수 있어요.');
    if(Object.keys(out).length>=60)throw Error('보낸 편지함에서 완료된 항목을 정리하세요.');
    out[id]={to:recipient,name,at:now};
    game.money-=amount;
    return {message:'외교 서신을 보냈어요.',extras:{[path(recipient,id)]:{from:a.uid,name:a.name,body,amount,at:a.sdk.serverTimestamp(),state:'pending'}}};
   },()=>open('sent'));
  };
 }
 async function open(mode='received'){
  if(!a.ready)return api.toast('로그인한 뒤 서신을 이용하세요.');
  const uid=a.uid;
  api.modal('외교 서신','선장 편지함','<div class="dialog-actions"><button id="mail-received">받은 서신</button><button id="mail-sent">보낸 서신</button><button id="mail-new">서신 작성</button></div><div id="mail-list">불러오는 중…</div>','medium');
  $('#mail-received').onclick=()=>open();$('#mail-sent').onclick=()=>open('sent');$('#mail-new').onclick=directory;
  const list=$('#mail-list');
  try{
   const sdk=a.sdk,game=api.state();
   let rows;
   if(mode==='received'){
    const result=(await sdk.get(reference(uid))).val()||{};
    rows=Object.entries(result).filter(([,letter])=>letter.at>api.now()-30*86400000||letter.state==='pending').map(([id,letter])=>({id,recipient:uid,letter}));
   }else{
    rows=(await Promise.all(Object.entries(game.mailSent||{}).slice(-60).map(async([id,item])=>{
     const letter=(await sdk.get(reference(item.to,id))).val();
     return letter?{id,recipient:item.to,letter,toName:item.name}:null;
    }))).filter(Boolean);
   }
   if(!list.isConnected||a.uid!==uid)return;
   rows.sort((a,b)=>b.letter.at-a.letter.at);
   const begin=0,limit=20;
   function paint(size){
    list.innerHTML=rows.slice(begin,size).map(({id,letter,toName})=>{
     const isPending=letter.state==='pending',expired=api.now()>=letter.at+expiry;
     const status={pending:expired?'만료':'대기 중',accepted:'수령 완료',declined:'거절됨',cancelled:'취소됨',refunded:'반환 완료'}[letter.state]||'';
     const button=(action,label)=>`<button data-mail-id="${id}" data-mail-action="${action}">${label}</button>`;
     const choices=mode==='received'?isPending&&!expired?button('accepted',letter.amount?money(letter.amount)+' 받기':'확인')+button('declined','거절'):'':
      isPending&&!expired?button('cancelled','취소·반환'):letter.state==='declined'||isPending&&expired?button('refunded','반환받기'):button('remove','보낸 목록에서 지우기');
     return `<article class="sale-search-row"><strong>${esc(toName||letter.name)}</strong><p>${esc(letter.body)}</p><p>${money(letter.amount)} · ${status}</p>${choices}${mode==='received'?button('reply','답장'):''}</article>`;
    }).join('')||'<p>표시할 서신이 없어요.</p>';
    if(rows.length>size){const more=document.createElement('button');more.textContent='20건 더 보기';more.onclick=()=>paint(size+20);list.append(more);}
   }
   paint(limit);
   list.onclick=e=>{
    const button=e.target.closest('[data-mail-id]');if(!button)return;
    const item=rows.find(r=>r.id===button.dataset.mailId),action=button.dataset.mailAction,{letter}=item;
    if(action==='reply')return compose(letter.from,letter.name);
    return api.run('personal',uid,(game,_c,now)=>{
     if(action==='remove'){delete game.mailSent[item.id];return {message:'보낸 목록을 정리했어요.'};}
     const expired=now>=letter.at+expiry;
     if(['accepted','declined'].includes(action)&&expired)throw Error('서신의 유효 시간이 끝났어요.');
     const amount=['accepted','cancelled','refunded'].includes(action)?letter.amount:0;
     if(game.money+amount>1e12)throw Error('두카트 보유 한도를 확인하세요.');
     game.money+=amount;
     return {message:'서신 처리 완료',extras:{[path(item.recipient,item.id)]:{...letter,state:action,closed:sdk.serverTimestamp()}}};
    },()=>open(mode));
   };
  }catch{if(list.isConnected)list.textContent='서신을 불러오지 못했어요.';}
 }
 async function directory(){
  api.modal('서신 작성','받을 선장','<div id="mail-targets">선장 명부 불러오는 중…</div><button id="mail-more" hidden>다음 20명</button><button id="mail-list-back">편지함</button>','medium');
  const targets=$('#mail-targets'),more=$('#mail-more');
  let cursor=null,started=false;
  $('#mail-list-back').onclick=open;
  async function load(){
   more.disabled=true;
   try{
    const rows=await api.directory(cursor);
    if(!targets.isConnected)return;
    if(!started){targets.replaceChildren();started=true;}
    for(const row of rows){
     if(row.id===a.uid)continue;
     const button=document.createElement('button');
     button.textContent=row.name;
     button.onclick=()=>compose(row.id,row.name);
     targets.append(button);
    }
    cursor=rows.at(-1)?.id||cursor;more.hidden=rows.length<20;
    if(!targets.childElementCount&&more.hidden)targets.textContent='받을 선장이 없어요.';
   }catch{if(!started)targets.textContent='선장 명부를 불러오지 못했어요.';more.hidden=false;}
   finally{more.disabled=false;}
  }
  more.onclick=load;
  await load();
 }
 return {open};
}
