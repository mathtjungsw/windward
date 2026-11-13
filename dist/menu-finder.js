const entries=[
  ['trade','교역소','항구 → 교역소','항구·보급 → 교역소','정박 중인 항구에서 상품을 구매할 수 있어요.','특산품 거래|물건 사기|구매|시세'],
  ['cargo','내 화물','교역소 → 내 화물','화물','항구에 정박하면 보유 상품을 팔 수 있어요.','특산품 거래|물건 팔기|판매|화물'],
  ['sale','최고가 판매처','내 화물 → 최고가 판매처','화물 → 최고가 판매처','보유 화물을 가장 비싸게 살 항구를 비교해요.','최고가|비싼 곳|판매처'],
  ['supply','선박·보급','항구 → 선박·보급','항구·보급','입항 후 식량을 채울 수 있어요.','식량 채우기|보급|식량'],
  ['note','소문노트','항구 → 소문노트','항구·보급 → 소문노트','읽었던 소문을 다시 볼 수 있어요.','소문|읽은 이야기'],
  ['album','발견 도감','발견 도감','더보기 → 발견 도감','발견한 기록과 그림을 열어요.','도감|보물|유적'],
  ['officers','부선장 명부','부선장 명부','더보기 → 부선장','고용한 인물과 능력을 확인해요.','부선장|고용|인물'],
  ['items','특수 아이템 가방','특수 아이템 가방','더보기 → 특수 아이템','아이템의 효과와 장착 상태를 확인해요.','아이템|장비|가방'],
  ['guild','조합 의뢰','조합 의뢰','더보기 → 조합 의뢰','항구에서 수락 가능한 의뢰를 확인해요.','의뢰|납품|조합'],
  ['ports','현재 소유 항구','소유 항구','더보기 → 소유 항구','소유 선장, 지분과 기본 세율을 확인해요.','내 항구|지분|세금|소유'],
  ['guns','대포·수리','대포·수리','더보기 → 대포·수리','항구에서 선박을 수리하거나 대포를 장착해요.','대포 수리|배 고치기|장착'],
  ['storedShips','항구에 맡긴 배','내 배 보기 → 항구에 맡긴 배','내 배 보기 → 항구에 맡긴 배','정박한 항구에서 배를 맡기고, 맡긴 곳에서 다시 찾을 수 있어요.','선박 보관|배 보관|배 맡기기|배 찾기|회수'],
  ['shipyard','조선소','선박·보급 → 조선소','항구·보급 → 조선소','선박과 건조 조건을 비교해요.','배 구입|선박 건조|거북선|개량'],
  ['stories','항해자의 이야기','항해자의 이야기','더보기 → 항해자의 이야기','초보·중급·고급 이야기를 이어가요.','시나리오|퀘스트|초보|이야기'],
  ['taxCollector','세금 징수선','소유 항구 → 세금 징수선','더보기 → 소유 항구 → 세금 징수선','가상 징수선과 최근 수입을 확인해요.','징수선|자동 징수|세금 걷기'],
  ['canals','운하 이용 설정','공동 사업 → 운하','더보기 → 공동 사업 → 운하','자동 항해 시 운하 이용을 켜고 꺼요.','운하|수에즈|파나마|통행료']
];
const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/[\s·]/g,'');
export function findMenus(query){
  const key=normalize(query);
  return entries.map(entry=>{
    const name=normalize(entry[1]), aliases=entry[5].split('|').map(normalize);
    const score=!key?1:name===key?4:aliases.includes(key)?3:name.includes(key)?2:aliases.some(x=>x.includes(key))?1:0;
    return {entry,score};
  }).filter(row=>row.score).sort((a,b)=>b.score-a.score).map(row=>row.entry);
}
export function showMenuFinder({modal,navigate,mobile}){
  modal('메뉴 찾기','',`<label for="menu-finder-input">하고 싶은 일</label>
    <input id="menu-finder-input" type="search" maxlength="60" placeholder="예: 특산품 거래" autocomplete="off">
    <div id="menu-finder-results" aria-live="polite"></div>`,'medium');
  const input=document.querySelector('#menu-finder-input'),list=document.querySelector('#menu-finder-results');
  function render(){
    const rows=findMenus(input.value);
    list.innerHTML=rows.map(([id,name,pc,phone,hint])=>`<article class="owned-port-row">
      <div><strong>${name}</strong><small>${mobile?phone:pc}</small><p>${hint}</p></div>
      <button type="button" data-find-menu="${id}">메뉴 열기</button></article>`).join('')||'<p>일치하는 메뉴가 없어요.</p>';
    for(const button of list.querySelectorAll('[data-find-menu]'))button.onclick=()=>navigate(button.dataset.findMenu);
  }
  input.oninput=event=>{if(!event.isComposing)render();};
  input.oncompositionend=render;
  render();
  input.focus();
}
