import {shoreSite,shoreName,visibleBeaches,SHORE_RECORDS,shoreMoves,shoreEdges,shoreNode,shorePosition,shoreTravelProgress,canRecordShore,shoreBagLimit} from './shore-expeditions.js?v=2026.11.12-collections-ranks-historic-ships';
import {GOODS} from './data.js?v=2026.11.12-collections-ranks-historic-ships';
import {explorationGear} from './rumor-progress.js?v=2026.11.12-collections-ranks-historic-ships';
import {shipGlyph} from './art.js?v=2026.11.12-collections-ranks-historic-ships';
import {SHORE_POINTS,shoreDisplayPoint,shoreMapPosition,drawShoreMap} from './shore-map.js?v=2026.11.12-collections-ranks-historic-ships';

const button=(title,action,target='')=>`<button type="button" class="service-button" data-shore-action="${action}" data-shore-target="${target}">${title}</button>`;
const nodes=['harbor','market','site','ridge'];
const notes={
  porto:'강이 불어날 때 창고를 비우는 순서를 적어 뒀어요.',
  seville:'강변의 올리브유 상자가 고갯길을 지나던 때의 장부예요.',
  busan:'해안에서 봉화가 보이는 시각과 바람의 방향이 적혀 있어요.',
  macau:'두 가지 글씨가 같은 견직물 꾸러미를 가리켜요.',
  manila:'숲길을 따라 사탕수수를 옮기던 사람의 기록이에요.',
  alexandria:'돌 표식을 세어 내륙 장터까지 가는 방법이 적혀 있어요.',
  cape:'거센 바람이 불기 전 물통을 옮기는 길을 표시했어요.',
  goa:'강물이 차오르는 날 후추 자루를 보관할 장소가 적혀 있어요.',
  havana:'수확을 마친 사탕수수의 무게를 확인하는 표예요.',
  valparaiso:'비탈길을 내려가는 짐수레의 정차 지점이 적혀 있어요.',
  sydney:'수풀길로 양모를 나른 사람들의 인수 표식이에요.',
  auckland:'숲길에서 선창까지 목재가 지나간 구간을 기록했어요.'
};

export function createShoreUI(api){
  const chart=document.querySelector('.chart'), scene=document.createElement('section');
  scene.className='shore-scene';
  scene.id='shore-view';
  scene.hidden=true;
  scene.setAttribute('aria-label','상륙 탐사 지도');
  scene.innerHTML=`<header class="shore-heading"><strong>상륙 탐사</strong><span></span></header>
    <div class="shore-land">
      <canvas width="960" height="480" aria-hidden="true"></canvas>
      <svg class="shore-boat" viewBox="-25 -27 50 52" aria-hidden="true"></svg>
      <div class="shore-pin-layer"></div>
      <span class="shore-person" aria-hidden="true"><i class="shore-head"></i><i class="shore-body"></i><i class="shore-pack"></i><i class="shore-leg"></i><i class="shore-leg"></i></span>
    </div>
    <footer class="shore-footer">
      <div class="shore-actions"></div>
      <details class="shore-status"><summary><span class="shore-status-line"></span></summary><p class="shore-supplies"></p></details>
      <details class="shore-status shore-journal" hidden><summary>조사 기록</summary><ul></ul></details>
    </footer>`;
  chart.append(scene);
  const find=selector=>scene.querySelector(selector);
  const canvas=find('canvas'), pins=find('.shore-pin-layer'), person=find('.shore-person'),
    status=find('.shore-status-line'), actions=find('.shore-actions'), supplies=find('.shore-supplies'),
    boat=find('.shore-boat'), subtitle=find('.shore-heading span'), journal=find('.shore-journal'), journalList=journal.querySelector('ul');
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let showing=null,pending=false,frame=0,drawKey=null,viewKey=null,journalKey=null,embarkAt=null;
  function place(el,[x,y]){
    el.style.setProperty('--shore-x',(x*100)+'%');
    el.style.setProperty('--shore-y',(y*100)+'%');
  }
  function render(){
    const game=api.getState(), trip=game.shoreTrip, location=trip?.port||showing, site=shoreSite(location);
    const visible=!!site&&!game.voyage&&(site.beach?!game.port&&!game.offlineRescuePending:location===game.port);
    if(scene.hidden===visible){
      scene.hidden=!visible;
      chart.classList.toggle('shore-map-open',visible);
    }
    if(!visible){
      if(frame){cancelAnimationFrame(frame);frame=0;}
      viewKey=null;
      return;
    }
    const gear=explorationGear(game), now=api.now(), node=trip?shorePosition(trip,now):'harbor';
    const moving=!!trip?.travel&&now<trip.travel.until;
    const unloading=!!trip&&!moving&&embarkAt!==null&&now-embarkAt<700&&!reduceMotion.matches;
    if(!unloading)embarkAt=null;
    const edges=shoreEdges(game), nextDraw=location+':'+edges.length+':'+edges.map(e=>e.a+'-'+e.b).join(',');
    if(nextDraw!==drawKey){
      drawKey=nextDraw;
      drawShoreMap(canvas,edges,site);
      place(boat,shoreDisplayPoint(SHORE_POINTS.boat,site.mirror));
    }
    if(boat.dataset.tier!==String(game.shipTier)){
      boat.innerHTML=shipGlyph(game.shipTier);
      boat.dataset.tier=String(game.shipTier);
    }
    const point=unloading?shoreMapPosition('boat','harbor',(now-embarkAt)/700):
      moving?shoreMapPosition(trip.node,trip.travel.to,reduceMotion.matches?0:shoreTravelProgress(game,now)):SHORE_POINTS[trip?node:'boat'];
    place(person,shoreDisplayPoint(point,site.mirror));
    person.hidden=!trip;
    person.classList.toggle('walking',moving||unloading);
    const nextStatus=moving?`${shoreNode(location,trip.travel.to)}까지 ${Math.ceil((trip.travel.until-now)/1000)}초`:
      trip?shoreNode(location,node):site.beach?'해변에서 시작':'부두에서 시작';
    if(status.textContent!==nextStatus)status.textContent=nextStatus;
    const supplyText=`보급 ${game.food.toFixed(1)}일분 · 가방 ${trip?.bag||0}/${shoreBagLimit(game)}상자${trip?.camp?' · 야영 준비':''}${gear?' · '+gear.name:''}`;
    if(supplies.textContent!==supplyText)supplies.textContent=supplyText;
    const archive=game.shoreProgress?.records||{}, archiveKey=JSON.stringify(archive);
    if(archiveKey!==journalKey){
      journalKey=archiveKey;
      const entries=Object.entries(archive).flatMap(([port,types])=>types.map(type=>{
        const li=document.createElement('li');
        li.textContent=shoreName(port)+' · '+SHORE_RECORDS[type]+(type==='translation'?' — '+(notes[port]||'해안에서 물자를 옮기던 길과 바람의 기록을 읽었어요.'):'');
        return li;
      }));
      journalList.replaceChildren(...entries);
      journal.hidden=!entries.length;
    }
    const canCamp=game.rumorProgress?.items?.I028>0&&!trip?.camp;
    const findable=Object.keys(SHORE_RECORDS).filter(kind=>canRecordShore(game,kind,node));
    const blocked=!!(game.battleId||game.npcBattle||game.raidId);
    const key=[nextDraw,!!trip,node,moving,blocked,!!trip?.surveyed,gear?.id,pending,canCamp,trip?.camp,findable.join(',')].join(':');
    if(key!==viewKey){
      viewKey=key;
      subtitle.textContent=shoreName(location)+(site.beach?' · 배는 해상에 있어요':'');
      const moves=trip&&!moving&&!blocked?shoreMoves(game,node):[];
      pins.innerHTML=nodes.map(id=>{
        const move=moves.find(x=>x.to===id);
        const label=shoreNode(location,id);
        const name=id==='harbor'?(site.beach?'해변':'부두'):label;
        const content=`<span class="shore-pin-dot"></span><span>${name}</span>`;
        const classes=`shore-pin ${trip&&node===id?'current':''}`;
        return move?`<button type="button" class="${classes}" data-shore-action="walk" data-shore-target="${id}" ${pending?'disabled':''} aria-label="${label}로 걷기 · ${Math.ceil(move.ms/1000)}초 · 보급 ${move.food.toFixed(2)}일분">${content}</button>`:
          `<span class="${classes}" data-shore-node="${id}">${content}</span>`;
      }).join('');
      for(const el of pins.children)place(el,shoreDisplayPoint(SHORE_POINTS[el.dataset.shoreTarget||el.dataset.shoreNode],site.mirror));
      actions.innerHTML=!trip?button('상륙하기','start',site.beach?location:'')+button('닫기','close'):blocked?'<span>배의 전투가 끝나면 탐사를 계속할 수 있어요.</span>':moving?'':
        (node==='site'&&!trip.surveyed?button('보급로 조사','survey'):'')+
        (node==='market'?button(`${GOODS[site.good].name} 구매 · ${GOODS[site.good].base} D`,'buy'):'')+
        (node==='harbor'?button('배로 돌아가기','finish'):'')+
        (canCamp?button('야영 꾸러미 쓰기','camp'):'')+
        findable.map(kind=>button(kind==='rubbing'?'탁본 만들기':kind==='translation'?'고문서 해석':'표본 채집','record',kind)).join('');
      for(const control of actions.children)control.disabled=pending;
    }
    if((moving||unloading)&&!frame)frame=requestAnimationFrame(()=>{frame=0;render();});
  }
  scene.addEventListener('click',async event=>{
    const control=event.target.closest('[data-shore-action]');
    if(!control||pending)return;
    const {shoreAction:action,shoreTarget:target}=control.dataset;
    if(action==='close'){showing=null;render();return;}
    const port=api.getState().port||showing;
    pending=true;render();
    try{
      await api.action(action,target);
      const trip=api.getState().shoreTrip;
      if(action==='start'&&trip?.port===port)embarkAt=api.now();
      if(action==='finish'&&!trip)showing=null;
    }finally{pending=false;render();}
  });
  function showLocation(id){
    api.showMap();
    showing=id;
    render();
    chart.scrollIntoView({block:'start',behavior:'instant'});
    chart.focus({preventScroll:true});
  }
  function beachMenu(game){
    const beaches=visibleBeaches(game,api.getNav());
    const rows=beaches.map(({site,distance,canLand})=>`<article class="investigation-row"><strong>${site.name}</strong><p>${Math.round(distance)}해리 · ${canLand?'상륙 가능':'12해리 안에서 정지해야 상륙할 수 있어요.'}</p><div class="dialog-actions"><button class="service-button" data-beach="${site.id}" ${game.voyage?'disabled':''}>${canLand?'해변 탐사 열기':'해변으로 항해'}</button></div></article>`).join('');
    api.modal('해변 상륙','배는 해상에 남아 공격받을 수 있어요.',`<div id="beach-choices">${rows||'<p>현재 보이는 상륙지가 없어요. 해안에 더 가까이 가 보세요.</p>'}</div>`,'medium');
    document.querySelectorAll('#beach-choices [data-beach]').forEach(el=>el.onclick=()=>{
      const row=visibleBeaches(api.getState(),api.getNav()).find(x=>x.site.id===el.dataset.beach);
      if(row?.canLand)showLocation(row.site.id);
      else if(row)api.goBeach(row.site);
    });
  }
  function open(){
    const game=api.getState();
    if(game.shoreTrip)return showLocation(game.shoreTrip.port);
    if(!game.port)return beachMenu(game);
    if(!shoreSite(game.port)||game.voyage){
      api.toast('상륙 탐사를 지원하는 항구에 정박하세요. 예를 들어 포르투, 부산, 고아, 아바나에서 할 수 있어요.');
      return;
    }
    showLocation(game.port);
  }
  return {open,render};
}
