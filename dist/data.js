export const GOODS = {
  wine: { name: '와인', icon: '◈', base: 48, color: '#c896a9' },
  wool: { name: '모직물', icon: '▧', base: 62, color: '#c9c3a6' },
  glass: { name: '유리공예', icon: '◇', base: 90, color: '#8fc2c7' },
  spice: { name: '향신료', icon: '✤', base: 110, color: '#dea26c' },
  coffee: { name: '커피', icon: '❖', base: 72, color: '#bda17c' },
  silk: { name: '비단', icon: '≋', base: 128, color: '#d7b888' },
  tea: { name: '차', icon: '❧', base: 76, color: '#a7ba89' },
  sugar: { name: '설탕', icon: '✧', base: 52, color: '#d9d6c3' }
};

// Modern country names help connect the sailing atlas to present-day geography.
export const PORTS = [
  { id:'lisbon', name:'리스본', en:'Lisbon', country:'포르투갈', region:'유럽', lon:-9.14, lat:38.72, specialty:'wine', market:['wine','wool','sugar'], fact:'이베리아반도 서쪽, 테주강 하구에 자리한 대서양의 항구.', sea:'북대서양' },
  { id:'seville', name:'세비야', en:'Seville', country:'스페인', region:'유럽', lon:-6.1, lat:36.8, specialty:'glass', market:['wine','glass','spice'], fact:'과달키비르강을 통해 대서양과 이어지는 스페인 남부의 도시. 게임의 선착장은 강 하구에 있어요.', sea:'북대서양' },
  { id:'london', name:'런던', en:'London', country:'영국', region:'유럽', lon:0.5, lat:51.5, specialty:'wool', market:['wool','glass','tea'], fact:'템스강 하구에서 북해로 이어지는 항구. 영국은 유럽 대륙 북서쪽의 섬나라예요.', sea:'북해' },
  { id:'amsterdam', name:'암스테르담', en:'Amsterdam', country:'네덜란드', region:'유럽', lon:4.5, lat:52.4, specialty:'glass', market:['glass','wool','coffee'], fact:'북해 연안의 네덜란드에 자리한 운하 도시.', sea:'북해' },
  { id:'venice', name:'베네치아', en:'Venice', country:'이탈리아', region:'유럽', lon:12.35, lat:45.3, specialty:'glass', market:['glass','silk','wine'], fact:'장화 모양의 이탈리아반도 북동쪽, 아드리아해 안쪽에 자리한 도시.', sea:'아드리아해' },
  { id:'alexandria', name:'알렉산드리아', en:'Alexandria', country:'이집트', region:'아프리카', lon:29.9, lat:31.2, specialty:'glass', market:['glass','spice','coffee'], fact:'나일강 삼각주 서쪽의 지중해 항구. 지중해와 인도양 사이에는 아프리카 대륙이 놓여 있어요.', sea:'지중해' },
  { id:'accra', name:'아크라', en:'Accra', country:'가나', region:'아프리카', lon:-0.2, lat:5.55, specialty:'coffee', market:['coffee','sugar','wool'], fact:'서아프리카 기니만을 마주한 가나의 해안 도시.', sea:'기니만' },
  { id:'cape', name:'케이프타운', en:'Cape Town', country:'남아프리카공화국', region:'아프리카', lon:18.4, lat:-33.9, specialty:'wine', market:['wine','coffee','spice'], fact:'아프리카 남서쪽의 항구. 남쪽의 희망봉을 돌아가면 인도양으로 향할 수 있어요.', sea:'남대서양' },
  { id:'zanzibar', name:'잔지바르', en:'Zanzibar', country:'탄자니아', region:'아프리카', lon:39.2, lat:-6.15, specialty:'spice', market:['spice','coffee','silk'], fact:'동아프리카 해안 앞, 인도양에 있는 섬의 항구.', sea:'인도양' },
  { id:'muscat', name:'무스카트', en:'Muscat', country:'오만', region:'아시아', lon:58.6, lat:23.6, specialty:'coffee', market:['coffee','spice','glass'], fact:'아라비아반도 남동쪽, 오만만을 마주한 항구.', sea:'오만만' },
  { id:'goa', name:'고아', en:'Goa', country:'인도', region:'아시아', lon:73.8, lat:15.45, specialty:'spice', market:['spice','silk','tea'], fact:'인도반도 서쪽의 아라비아해 연안에 있는 항구.', sea:'아라비아해' },
  { id:'malacca', name:'말라카', en:'Malacca', country:'말레이시아', region:'아시아', lon:102.2, lat:2.2, specialty:'spice', market:['spice','tea','silk'], fact:'말레이반도와 수마트라섬 사이의 말라카해협은 인도양과 동아시아를 잇는 길목이에요.', sea:'말라카해협' },
  { id:'batavia', name:'자카르타', en:'Jakarta', country:'인도네시아', region:'아시아', lon:106.8, lat:-6.1, specialty:'sugar', market:['sugar','spice','coffee'], fact:'자바섬 북서쪽의 항구. 인도네시아는 수많은 섬으로 이루어져 있어요.', sea:'자바해' },
  { id:'macau', name:'마카오', en:'Macau', country:'중국', region:'아시아', lon:113.55, lat:22.15, specialty:'silk', market:['silk','tea','glass'], fact:'중국 남쪽 주강 하구의 항구로, 남중국해를 마주하고 있어요.', sea:'남중국해' },
  { id:'nagasaki', name:'나가사키', en:'Nagasaki', country:'일본', region:'아시아', lon:129.85, lat:32.7, specialty:'tea', market:['tea','silk','glass'], fact:'일본 규슈섬 서쪽에 자리한 항구. 서쪽 바다 건너로 동아시아 대륙이 있어요.', sea:'동중국해' },
  { id:'busan', name:'부산', en:'Busan', country:'대한민국', region:'아시아', lon:129.08, lat:35.1, specialty:'silk', market:['silk','tea','wool'], fact:'한반도 남동쪽의 항구. 대한해협을 사이에 두고 일본의 규슈섬을 마주해요.', sea:'대한해협' },
  { id:'havana', name:'아바나', en:'Havana', country:'쿠바', region:'아메리카', lon:-82.36, lat:23.13, specialty:'sugar', market:['sugar','coffee','wine'], fact:'카리브해의 섬나라 쿠바 북서쪽에 있는 항구.', sea:'멕시코만' },
  { id:'cartagena', name:'카르타헤나', en:'Cartagena', country:'콜롬비아', region:'아메리카', lon:-75.5, lat:10.4, specialty:'coffee', market:['coffee','sugar','glass'], fact:'남아메리카 북쪽, 카리브해를 마주한 콜롬비아의 항구.', sea:'카리브해' },
  { id:'recife', name:'헤시피', en:'Recife', country:'브라질', region:'아메리카', lon:-34.88, lat:-8.05, specialty:'sugar', market:['sugar','coffee','wool'], fact:'남아메리카가 대서양 쪽으로 돌출된 브라질 북동쪽의 항구.', sea:'남대서양' },
  { id:'buenos', name:'부에노스아이레스', en:'Buenos Aires', country:'아르헨티나', region:'아메리카', lon:-58.38, lat:-34.6, specialty:'wool', market:['wool','wine','sugar'], fact:'남아메리카 남동쪽, 라플라타강 하구를 따라 자리한 항구.', sea:'남대서양' },
  { id:'sydney', name:'시드니', en:'Sydney', country:'오스트레일리아', region:'오세아니아', lon:151.2, lat:-33.85, specialty:'wool', market:['wool','wine','tea'], fact:'오스트레일리아 대륙 남동쪽, 태평양을 향한 항구.', sea:'태즈먼해' }
];
export const PORT_BY_ID = Object.fromEntries(PORTS.map(p=>[p.id,p]));
export const MISSIONS = [
  { id:'trader', name:'첫 거래의 설렘', desc:'리스본에서 와인을 사고, 다른 항구에서 판매하세요.', reward:400 },
  { id:'explorer', name:'수평선 너머로', desc:'서로 다른 항구 5곳에 기항하세요.', reward:650 },
  { id:'continents', name:'세 대륙의 항해사', desc:'유럽 · 아프리카 · 아시아 항구를 방문하세요.', reward:1000 },
  { id:'tycoon', name:'바다의 상인', desc:'총 무역 이익 3,000 D를 달성하세요.', reward:1500 }
];
