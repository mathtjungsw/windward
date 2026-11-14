import {visibleSeaActivities,SEA_SITES,SEA_TYPES} from './sea-activities.js?v=2026.11.14-trade-access';

export function createSeaActivityUI(api){
  let pending=false, timer, signature='';
  const badge=document.createElement('button');
  badge.type='button';badge.className='sea-activity-alert';badge.hidden=true;
  badge.onclick=()=>open();
  document.querySelector('.chart').append(badge);
  function render(){
    const s=api.getState(), rows=visibleSeaActivities(s,api.now());
    const next=s.seaJob?'해상 활동 진행 중':rows.length?SEA_TYPES[rows[0].site.kind].label+' · 주변 해역':'';
    if(signature===next)return;
    signature=next;badge.textContent=next;badge.hidden=!next;
  }
  function open(){
    clearTimeout(timer);
    const game=api.getState(), job=game.seaJob, now=api.now();
    const rows=visibleSeaActivities(game,now);
    const button=(text,kind,id,disabled=false)=>`<button type="button" class="service-button" data-sea-action="${kind}" data-site="${id}" ${disabled?'disabled':''}>${text}</button>`;
    const html=job?(()=>{
      const site=SEA_SITES.find(s=>s.id===job.id), remaining=Math.ceil(Math.max(0,job.until-now)/1000);
      return `<h3>${SEA_TYPES[site.kind].label} · ${site.name}</h3><p>${remaining?'남은 시간 '+remaining+'초':'완료할 수 있어요.'}</p><div class="dialog-actions">${button('완료하기','finish',site.id,remaining>0)}${button('활동 중단','cancel',site.id)}</div>`;
    })():rows.map(({site,distance})=>{
      const type=SEA_TYPES[site.kind];
      return `<article class="investigation-row"><h3>${type.label} · ${site.name}</h3><p>${Math.round(distance)}해리 · 기본 ${type.wait/1000}초 · 보급 0.2일분</p><div class="dialog-actions">${button('활동 지점으로 이동','go',site.id,!!game.voyage)}${button('활동 시작','start',site.id,distance>20||!!game.voyage)}</div></article>`;
    }).join('')||'<p>항해 중 시야에 들어온 어장, 표류 화물, 구조 요청, 침몰선 조사 지점이 표시돼요.</p>';
    api.modal('해상 활동','주변 해역',`<div id="sea-activity-view">${html}</div>`,'medium');
    const root=document.querySelector('#sea-activity-view');
    root.querySelectorAll('[data-sea-action]').forEach(el=>el.onclick=async()=>{
      if(pending)return;
      const {seaAction:action,site:id}=el.dataset;
      if(action==='go'){api.go(SEA_SITES.find(site=>site.id===id));return;}
      pending=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await api.action(action,id);}
      finally{pending=false;if(root.isConnected&&document.querySelector('#modal')?.open)open();}
    });
    if(job?.until>now)timer=setTimeout(()=>{if(root.isConnected&&document.querySelector('#modal')?.open&&!pending)open();},Math.min(1000,job.until-now));
  }
  return {render,open};
}
