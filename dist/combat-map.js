const NS='http://www.w3.org/2000/svg',el=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function createMapCombat(api){
 const chart=document.querySelector('.chart'),deck=document.createElement('section');deck.id='combat-deck';deck.className='combat-deck';deck.hidden=true;deck.setAttribute('aria-label','지도 전투 조작');chart.after(deck);
 const overlay=el('svg',{class:'combat-map-overlay','aria-label':'선박 내구도와 포격 효과'}),labels=el('g'),effects=el('g');overlay.append(labels,effects);chart.append(overlay);let key='',model=null,confirmRetreat=false,labelNodes=new Map();const timers=new Set(),seen=new Set();
 function set(node,name,value){value=String(value);if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
 function later(fn,ms){const t=setTimeout(()=>{timers.delete(t);fn();},ms);timers.add(t);}
 function render(next){if(next?.key!==model?.key||next?.closed)confirmRetreat=false;model=next;if(!next){deck.hidden=true;if(labelNodes.size){labelNodes.clear();labels.replaceChildren();}return;}deck.hidden=false;
  const signature=JSON.stringify([next.key,next.title,next.closed,next.winner,next.guns.map(g=>g.id),next.canRetreat,next.allowClose]);
  if(key!==signature){key=signature;deck.replaceChildren();const header=document.createElement('header'),title=document.createElement('strong');title.textContent=next.title;const fold=document.createElement('button');fold.textContent='− 접기';fold.setAttribute('aria-expanded','true');header.append(title,fold);deck.append(header);const body=document.createElement('div');body.className='combat-deck-body';deck.append(body);fold.onclick=()=>{body.hidden=!body.hidden;fold.textContent=body.hidden?'+ 전투 조작 펼치기':'− 접기';fold.setAttribute('aria-expanded',String(!body.hidden));};const status=document.createElement('p');status.id='combat-map-status';status.setAttribute('role','status');status.textContent=next.message||'대포를 눌러 포격하세요. 명중과 빗나감에도 재장전합니다.';body.append(status);
   const guns=document.createElement('div');guns.className='map-cannons';for(const gun of next.guns){const b=document.createElement('button');b.dataset.mapGun=gun.id;b.onclick=()=>api.fire(gun.id);guns.append(b);}body.append(guns);
   const actions=document.createElement('div');actions.className='map-combat-actions';body.append(actions);
   for(const [label,action]of next.actions||[]){const b=document.createElement('button');b.textContent=label;b.onclick=action;actions.append(b);}
   if(next.canRetreat){const b=document.createElement('button');b.id='map-retreat';b.textContent=confirmRetreat?'정말 후퇴 · 패전 손실 확정':'후퇴·패전 구조';b.onclick=()=>{if(confirmRetreat){confirmRetreat=false;api.retreat();}else{confirmRetreat=true;b.textContent='정말 후퇴 · 패전 손실 확정';status.textContent='후퇴하면 패전 손실과 구조비를 적용합니다. 다시 누르면 확정합니다.';}};actions.append(b);}
   if(next.allowClose){const b=document.createElement('button');b.textContent='표적 해제';b.onclick=()=>{confirmRetreat=false;api.dismiss();};actions.append(b);}
  }
  if(!confirmRetreat){const status=deck.querySelector('#combat-map-status'),text=next.message||'대포를 눌러 포격하세요.';if(status.textContent!==text)status.textContent=text;}refresh();drawLabels();
 }
 function refresh(){if(!model)return;for(const b of deck.querySelectorAll('[data-map-gun]')){const g=model.guns.find(g=>g.id===b.dataset.mapGun);if(!g)continue;const left=Math.max(0,(g.readyAt-api.now())/1000);const text=g.name+(left?' · '+left.toFixed(1)+'초':' · 발사'),disabled=!!(left>0||model.busy||!model.inRange||model.closed);if(b.textContent!==text)b.textContent=text;if(b.disabled!==disabled)b.disabled=disabled;}if(!model.guns.length&&!deck.querySelector('.no-map-guns')){const p=document.createElement('p');p.className='no-map-guns';p.textContent='장착 대포가 없어요. 항구의 대포·수리에서 배에 장착하세요.';deck.querySelector('.combat-deck-body').append(p);}}
 function drawLabels(){
  if(!model)return;
  for(const [unit,side] of [[model.me,'me'],[model.enemy,'enemy']]){
   const point=unit?.point&&api.screenPoint(unit.point);
   let label=labelNodes.get(side);
   if(!point||point.x<0||point.y<0||point.x>point.width||point.y>point.height){
    if(label){label.group.remove();labelNodes.delete(side);}
    continue;
   }
   if(!label){
    const group=el('g',{'data-hp-side':side}),text=el('text',{x:0,y:-4,fill:'#214e56','font-size':11});
    const bar=el('rect',{x:0,y:5,height:6,rx:3,fill:side==='me'?'#318c7a':'#be6654'});
    group.append(el('rect',{x:-5,y:-17,width:122,height:39,rx:5,fill:'#fffbed',stroke:side==='me'?'#286d76':'#a84f47'}),text,el('rect',{x:0,y:5,width:110,height:6,rx:3,fill:'#d6d9c9'}),bar);
    labels.append(group);label={group,text,bar};labelNodes.set(side,label);
   }
   const x=Math.max(5,Math.min(point.width-125,point.x+18)),y=Math.max(20,Math.min(point.height-32,point.y+(side==='me'?35:-42)));
   set(label.group,'transform',`translate(${x},${y})`);
   const content=(side==='me'?'내 배':'상대')+' '+unit.hp+'/'+unit.maxHP;
   if(label.text.textContent!==content)label.text.textContent=content;
   set(label.bar,'width',110*Math.max(0,Math.min(1,unit.hp/unit.maxHP)));
  }
 }
 function shot(id,from,to,{hit=false,damage=0}={}){if(seen.has(id)||!from||!to)return;seen.add(id);if(seen.size>100)seen.delete(seen.values().next().value);const a=api.screenPoint(from),b=api.screenPoint(to);if(!a||!b||[a,b].some(p=>p.x<0||p.y<0||p.x>p.width||p.y>p.height))return;const group=el('g',{'data-shot':id}),x=a.x+10,y=a.y+3,tx=b.x+(hit?0:28),ty=b.y+(hit?0:22),dx=tx-x,dy=ty-y,angle=Math.atan2(dy,dx)*180/Math.PI;effects.append(group);group.append(el('rect',{x:0,y:-3,width:17,height:6,rx:2,fill:'#434c4b',transform:`translate(${x-10},${y}) rotate(${angle})`}),el('circle',{cx:x,cy:y,r:7,fill:'#e9b951',class:'muzzle-flash'}));const ball=el('circle',{r:4,fill:'#3a3732',stroke:'#e9ba57','stroke-width':1});const motion=el('animateMotion',{begin:'indefinite',dur:'.6s',path:`M ${x} ${y} Q ${(x+tx)/2} ${Math.min(y,ty)-28} ${tx} ${ty}`,fill:'freeze'});ball.append(motion);group.append(ball);motion.beginElement?.();const impact=()=>{ball.remove();const burst=el('circle',{cx:tx,cy:ty,r:hit?16:10,fill:hit?'#e5a13e':'#d7efee',stroke:hit?'#be5a35':'#688e9c',class:'combat-impact'}),text=el('text',{x:tx,y:ty-22,'text-anchor':'middle','font-size':14,'font-weight':700,fill:hit?'#a43c27':'#285864',stroke:'#fffbed','paint-order':'stroke','stroke-width':3});text.textContent=hit?'-'+damage:'빗나감';group.append(burst,text);};if(matchMedia('(prefers-reduced-motion:reduce)').matches)impact();else later(impact,600);later(()=>group.remove(),1600);}
 return {render,refresh,shot,dispose:()=>{for(const t of timers)clearTimeout(t);deck.remove();overlay.remove();},deck,overlay};
}
