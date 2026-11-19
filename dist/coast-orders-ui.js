import {GOODS,PORT_BY_ID} from './data.js?v=2026.11.20-coastal-commissions';
import {COASTS,ORDERS,nextCoast,takeCoast,abandonCoast,takeOrder,cancelOrder,fillOrder,orderDay} from './coast-orders.js?v=2026.11.20-coastal-commissions';
import {mapDistance} from './world-wrap.js?v=2026.11.20-coastal-commissions';

const quantity=value=>value.toLocaleString('ko-KR');
const fragment=site=>`<img class="coast-fragment" width="330" height="224" src="assets/coast-sketches/${site.id}.webp" alt="북쪽이 위인 해안선 조각. ${site.hint}">`;
const esc=text=>String(text).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export function createCoastOrders({state,now,modal,run}){
 function action(root,button,mutate,refresh){
  button.onclick=async()=>{
   if(button.disabled)return;
   const previous=[...root.querySelectorAll('button,select')].map(el=>[el,el.disabled]);
   previous.forEach(([el])=>el.disabled=true);
   try{
    const result=await run(mutate);
    if(result&&root.isConnected&&root.closest('dialog')?.open)refresh();
   }finally{previous.forEach(([el,disabled])=>el.disabled=disabled);}
  };
 }
 function coast(tavern=false){
  const game=state(),site=nextCoast(game),active=game.coastBook?.active;
  const collected=COASTS.filter(s=>game.coastBook?.found?.[s.id]);
  let current='<p>주점에서 다음 해도 조각을 받을 수 있어요.</p>';
  if(!site)current='<p>모든 해안 스케치를 모았어요.</p>';
  else if(active||tavern){
   const distance=Math.round(mapDistance(game.position,site.point));
   current=`<h3>${active?'찾고 있는 해안':'주점의 해도 조각'}</h3>${fragment(site)}<p>${site.hint}</p><p>그림 속 해안을 찾아 22해리 안으로 항해하면 스케치가 완성돼요.</p>`+
    (active?(tavern?'<button class="service-button" data-return>이 조각 돌려주기</button>':''):
     `<p class="modal-meta">이 항구에서 약 ${Math.max(10,Math.round(distance/10)*10)}해리</p><button class="primary-button" data-take>해도 조각 받기</button>`);
  }
  const gallery=collected.map(s=>`<details><summary>${s.name}</summary>${fragment(s)}<p>${s.hint}</p></details>`).join('');
  modal('해안선 보물찾기','항해일지 · 스케치 '+collected.length+' / '+COASTS.length,
   '<div id="coast-book">'+current+'<h3>모은 스케치</h3>'+(gallery||'<p>첫 해안을 발견하면 여기에 이름과 그림이 남아요.</p>')+'</div>','medium');
  const root=document.querySelector('#coast-book');
  const take=root.querySelector('[data-take]'),giveBack=root.querySelector('[data-return]');
  if(take)action(root,take,g=>takeCoast(g,site.id),()=>coast(true));
  if(giveBack)action(root,giveBack,g=>abandonCoast(g,active),()=>coast(true));
 }
 function orders(){
  const game=state(),ticket=game.customOrders?.active,port=game.port;
  const order=ORDERS.find(row=>row.id===ticket?.type);
  const atIssuer=!!port&&port===ticket?.port&&!game.voyage;
  const completed=game.customOrders?.lastDay===orderDay(now());
  let body;
  if(order){
   body=`<h3>${order.name}</h3><p>${esc(PORT_BY_ID[ticket.port].name)} 조합에 세 종류를 함께 납품하면 ${quantity(order.reward)} D를 받아요.</p>`+
    order.slots.map(slot=>`<label class="order-slot">${slot.name} · ${slot.qty}상자<select>${slot.goods.map(id=>`<option value="${id}">${GOODS[id].name} · 보유 ${game.cargo[id]?.qty||0}상자</option>`).join('')}</select></label>`).join('')+
    '<p data-order-status role="status"></p><button class="primary-button" data-fill>선택한 화물 납품</button>'+
    (atIssuer?'<button class="service-button" data-cancel>주문 돌려주기</button>':'');
  }else if(completed)body='<p>오늘 주문을 완료했어요. 한국 시간 자정부터 다음 주문을 받을 수 있어요.</p>';
  else if(!port||game.voyage)body='<p>항구에 정박한 뒤 받을 주문을 선택하세요.</p>';
  else body=ORDERS.map(row=>`<article class="investigation-row"><h3>${row.name}</h3><p>${row.slots.map(s=>s.name+' '+s.qty+'상자 ('+s.goods.map(id=>GOODS[id].name).join('·')+' 중 하나)').join('<br>')}</p><button type="button" class="service-button" data-order="${row.id}">주문 받기 · ${quantity(row.reward)} D</button></article>`).join('');
  modal('조합 맞춤 주문','기한 없음 · 선장당 하루 한 건 납품','<div id="custom-orders">'+body+'</div>','medium');
  const root=document.querySelector('#custom-orders');
  root.querySelectorAll('[data-order]').forEach(button=>action(root,button,(g,t)=>takeOrder(g,button.dataset.order,port,t),orders));
  if(!order)return;
  const selects=[...root.querySelectorAll('select')],button=root.querySelector('[data-fill]');
  const choices=()=>selects.map(el=>el.value);
  function update(){
   const missing=order.slots.filter((slot,i)=>(game.cargo[selects[i].value]?.qty||0)<slot.qty);
   button.disabled=!atIssuer||!!missing.length;
   root.querySelector('[data-order-status]').textContent=!atIssuer?'주문을 받은 항구에 정박하세요.':missing.length?'부족한 화물 · '+missing.map(s=>s.name).join(', '):'화물 준비 완료';
  }
  order.slots.forEach((slot,i)=>{
   selects[i].value=slot.goods.find(id=>game.cargo[id]?.qty>=slot.qty)||slot.goods[0];
   selects[i].onchange=update;
  });
  update();
  action(root,button,(g,t)=>fillOrder(g,ticket,choices(),t),orders);
  const cancel=root.querySelector('[data-cancel]');
  if(cancel)action(root,cancel,g=>cancelOrder(g,ticket),orders);
 }
 return {coast,orders};
}
