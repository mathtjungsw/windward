const view=(text,...menus)=>({kind:'view',text,menus});
const talk=text=>({kind:'talk',text});
const visit=(port,text)=>({kind:'port',port,text});
const trade=(kind,port,good,qty,text)=>({kind,port,good,qty,text});
const zone=(id,bounds,text)=>({kind:'zone',zone:id,bounds,text});
const chapter=(title,dialogue,steps)=>({title,dialogue,steps});

export const STORIES=[
 {id:'first-route',name:'첫 항로의 선장',level:'초보',stage:1,visits:0,origin:'lisbon',cash:0,
  summary:'리스본에서 첫 화물을 싣고 근처 항구를 오가며 나만의 항해를 시작하세요.',
  history:'항해·교역을 익히는 창작 이야기입니다.',chapters:[
   chapter('리스본의 견습 선장','조합장 알바루는 작은 와인 상자를 내밀었습니다. “큰 배보다 먼저 필요한 것은 준비하는 습관입니다. 배와 식량을 살펴보고 첫 화물을 실어 보세요.”',[
    talk('조합장의 첫 항해 안내 듣기'),view('내 배의 모습과 단계를 확인하세요.','ship'),view('보유금과 화물칸을 확인하세요.','cargo'),view('가까운 목적지와 예상 보급을 확인하세요.','route'),trade('buy','lisbon','wine',1,'리스본에서 와인 1상자를 구매하세요.')]),
   chapter('포르투의 첫 거래','포르투의 상인은 리스본 와인을 기다리고 있습니다. “한 번의 출항에는 도착할 항구와 돌아갈 식량이 함께 있어야 하죠. 서두르지 말고 항로를 골라 보세요.”',[
    view('포르투를 목적지로 선택하세요.','porto-route'),{kind:'depart',port:'porto',text:'포르투로 자동 출항하세요.'},visit('porto','포르투에 실제로 입항하세요.'),trade('sell','porto','wine',1,'포르투에서 와인을 1상자 판매하세요.'),view('돌아갈 식량과 보급 화면을 확인하세요.','supply')]),
   chapter('돌아오는 장부','첫 거래를 마친 선장에게 상인은 말린 생선을 권합니다. “돌아가는 배의 빈 화물칸도 기회입니다. 가격이 늘 같지는 않으니 작은 상자부터 연습하세요.”',[
    view('포르투의 현재 교역 가격을 확인하세요.','trade'),trade('buy','porto','driedfish',1,'포르투에서 말린 생선을 1상자 구매하세요.'),visit('lisbon','리스본으로 돌아오세요.'),trade('sell','lisbon','driedfish',1,'리스본에서 말린 생선을 판매하세요.'),view('내 물품의 최고가 판매처를 확인하세요.','sale')]),
   chapter('내 손으로 고르는 항로','조타수 마르틴이 키를 가리킵니다. “바다가 익숙해졌다면 직접 움직여 보세요. 다시 자동으로 돌아오는 방법과 자주 가는 항구를 기억하는 방법도 알려 드리죠.”',[
    {kind:'manual',optional:true,text:'직접 조종과 정지를 연습하세요. 선택 체험입니다.'},view('항구를 선택해 자동 항해로 돌아오는 방법을 확인하세요.','auto-route'),view('항구를 즐겨찾기에 넣고 목록을 확인하세요.','favorites'),view('지구본과 평면 미니맵을 확인하세요.','minimap'),view('항해일지를 열어 보세요.','journal')]),
   chapter('주점의 이야기','주점 주인은 잔을 내려놓으며 목소리를 낮춥니다. “바다에는 거래 장부에 적히지 않는 이야기도 있어요. 들은 말은 노트에 남기고, 진실은 직접 찾아 보세요.”',[
    {kind:'rumor',text:'지금 정박한 항구의 소문을 읽으세요.'},view('소문노트를 열어 다시 읽어 보세요.','note'),{...view('소문의 숨기기와 복원을 확인하세요.','note-hide','note-restore'),optional:true},view('발견 수집 도감을 열어 보세요.','album'),view('흔적을 발견하고 조사하는 방법을 확인하세요.','investigation')]),
   chapter('나의 다음 항해','알바루는 빈 항해록의 첫 장에 선장의 이름을 적습니다. “이제 갈 곳은 스스로 고르면 됩니다. 새 배와 동료, 조합의 의뢰가 기다립니다. 문을 열어 보는 것부터 시작하세요.”',[
    view('조합 의뢰 화면을 확인하세요.','guild'),view('조선소와 항구에 맡긴 배를 확인하세요.','shipyard','stored'),view('대포·아이템·부선장 메뉴를 둘러보세요.','guns','items','officers'),view('선장 목록·랭킹·채팅을 확인하세요.','captains','ranks','chat'),view('공동 사업·설정·메뉴 찾기를 확인하세요.','projects','settings','finder')])]},
 {id:'kilwa-ledger',name:'킬와의 교역 장부',level:'중급',stage:6,visits:10,origin:'zanzibar',cash:4000,reward:'OS01',
  summary:'흩어진 교역 기록과 도자기, 킬와의 유적을 이어 잃어버린 장부를 완성하세요.',
  history:'13~16세기 킬와의 인도양 교역을 배경으로 합니다. 아미나와 의뢰는 창작입니다.',source:'https://whc.unesco.org/en/list/144/',chapters:[
   chapter('잔지바르의 낡은 장부','아미나는 소금기에 젖은 장부를 펼칩니다. “우리 집안의 배는 이 해안을 따라 오갔어요. 빈 페이지를 다시 잇는 데 선장님의 도움이 필요합니다.”',[
    talk('아미나의 장부 이야기 듣기'),view('잔지바르 주점의 단서를 확인하세요.','tavern'),view('장부에 남길 항해 기록을 확인하세요.','journal')]),
   chapter('남쪽에서 온 소식','남쪽 화물의 표식이 장부의 첫 단서였습니다. 마푸투의 창고 담당자는 면직물 상자를 기억하고 있습니다. 그곳까지 갈 수 있는 보급부터 준비합니다.',[
    view('남쪽 항로와 보급을 점검하세요.','route'),visit('maputo','마푸투에 입항해 창고의 기록을 받으세요.')]),
   chapter('흩어진 물품 기록','창고 담당자가 오래된 표식을 보여 줍니다. “이 무늬의 상자는 북쪽으로 보냈습니다.” 작은 거래를 직접 해 보면 장부 속 길이 현재의 바닷길과 이어집니다.',[
    trade('buy','maputo','cotton',3,'마푸투에서 면직물 3상자를 구매하세요.'),visit('zanzibar','면직물을 싣고 잔지바르로 돌아오세요.'),trade('sell','zanzibar','cotton',3,'잔지바르에서 면직물 3상자를 판매하세요.')]),
   chapter('바다 건너온 도자기','아미나가 도자기의 푸른 무늬를 짚습니다. “장부에는 이처럼 먼 곳의 물건도 적혀 있어요. 동아프리카의 해안은 세상의 끝이 아니라 만나는 자리였군요.”',[
    trade('buy','zanzibar','porcelain',3,'잔지바르에서 도자기 3상자를 확보하세요.'),view('도자기 화물과 거래 기록을 확인하세요.','cargo'),talk('장부의 도자기 기록을 대조하기')]),
   chapter('킬와의 흔적','돌담은 무너졌지만 바다를 향한 자리는 남아 있습니다. 장부의 이야기를 확인할 마지막 단서는 킬와 유적입니다. 소문과 조사 기록을 살펴보세요.',[
    {kind:'discovery',discovery:'ruin-kilwa',text:'킬와 키시와니 유적을 조사하세요. 기존 발견도 인정합니다.'},view('유적의 도감 설명을 읽어 보세요.','album'),visit('zanzibar','잔지바르에 귀항해 조사 기록을 가져오세요.')]),
   chapter('장부를 잇는 사람','아미나는 빈 페이지를 채우고 항해록을 닫습니다. “이제는 옛 항로를 읽는 것만으로 충분하지 않아요. 저도 선장님의 다음 항해를 돕고 싶습니다.”',[
    talk('완성한 장부를 아미나와 읽기'),{kind:'deliver',port:'zanzibar',good:'porcelain',qty:3,text:'도자기 3상자와 기록을 제출하세요.'}])]},
 {id:'malacca-broker',name:'말라카의 중계상',level:'중급',stage:6,visits:10,origin:'malacca',cash:5000,reward:'IS01',
  summary:'서쪽 계피와 동쪽 향신료의 장부를 이어 해협 상인의 신뢰를 얻으세요.',
  history:'말라카 해협의 동서 교역을 배경으로 합니다. 상인과 인장은 창작입니다.',source:'https://whc.unesco.org/en/list/1223/',chapters:[
   chapter('해협의 중개 의뢰','중개상은 두 장의 빈 인수증을 내놓습니다. “말라카에서는 서로 다른 바다의 물건이 만납니다. 서쪽과 동쪽의 약속을 함께 지켜 줄 선장을 찾고 있어요.”',[
    talk('중계상의 요청 듣기'),view('현재 교역 시세 확인하기','trade')]),
   chapter('서쪽의 교역 상대','콜롬보의 계피 상인은 오래 기다리게 하지 않는 거래 상대를 원합니다. 이번 이야기는 기한이 없으니 항로와 식량을 충분히 준비합니다.',[
    view('콜롬보 항로 점검하기','route'),visit('colombo','콜롬보에 입항하세요.'),trade('buy','colombo','cinnamon',3,'계피 3상자를 구매하세요.')]),
   chapter('다시 말라카로','계피를 확인한 중개상은 첫 인수증에 서명합니다. “좋은 교역은 물건만이 아니라 기록과 약속이 함께 움직여야 합니다.”',[
    visit('malacca','계피를 싣고 말라카로 돌아오세요.'),{kind:'deliver',port:'malacca',good:'cinnamon',qty:3,text:'계피 3상자를 납품하세요.'},talk('첫 장부의 인수 확인 듣기')]),
   chapter('동쪽 창고의 표식','두 번째 표식은 자카르타의 창고로 이어집니다. 같은 향신료라도 항구마다 쓰임과 수요가 달라지므로 시장을 직접 살펴봅니다.',[
    visit('batavia','자카르타에 입항하세요.'),trade('buy','batavia','cloves',3,'자카르타에서 정향 3상자를 구매하세요.'),view('확보한 화물 확인하기','cargo')]),
   chapter('두 장의 장부','서쪽과 동쪽의 물건이 말라카에서 다시 만났습니다. 마지막 인수증을 받고 다음 교역에서 어디로 팔지 스스로 비교해 봅니다.',[
    visit('malacca','말라카에 귀항하세요.'),{kind:'deliver',port:'malacca',good:'cloves',qty:3,text:'정향 3상자를 납품하세요.'},view('검색 시점의 최고가 판매처 확인하기','sale')]),
   chapter('해협 상인의 약속','중개상은 작은 인장을 건넵니다. “다음에 이 해협으로 돌아오면 당신의 상자를 먼저 살펴보겠습니다. 이 인장은 우리가 함께 완성한 두 장의 장부를 뜻합니다.”',[
    talk('중계상의 마지막 인사 듣기'),view('인장의 능력과 교역 장비 칸 안내 확인하기','items')])]},
 {id:'manila-galleon',name:'마닐라 갤리온의 항로',level:'고급',stage:12,visits:20,origin:'manila',cash:12000,reward:'OS02',
  summary:'비단과 도자기를 싣고 태평양을 건너, 아메리카의 은과 함께 귀환하세요.',
  history:'마닐라–아카풀코 범선 교역을 배경으로 합니다. 이네스와 계약은 창작이며 보급 기항은 게임의 각색입니다.',source:'https://www.metmuseum.org/essays/the-manila-galleon-trade-1565-1815',chapters:[
   chapter('마닐라의 태평양 계약','기록관 이네스가 태평양의 빈 여백을 가리킵니다. “목적지만 아는 것으로는 건널 수 없는 바다입니다. 갈 때의 화물과 돌아올 식량까지 함께 생각해 주세요.”',[
    talk('태평양 계약 읽기'),view('항해록과 목적지 확인하기','journal')]),
   chapter('원양 선단 준비','길고 먼 항로에서는 가장 느린 배가 선단의 하루를 정합니다. 항구에 맡길 배가 있는지 살피고 남은 배의 원양 능력을 확인합니다.',[
    view('선단과 원양 선박 확인하기','ship'),view('식량·적재·보관 선박 점검하기','supply','stored')]),
   chapter('아시아의 화물','마닐라 창고에는 비단과 도자기가 모입니다. 새 견적은 한 번의 거래 전량에 적용되지만, 거래 후 다음 가격은 달라진다는 점을 확인합니다.',[
    trade('buy','manila','silk',5,'마닐라에서 비단 5상자를 구매하세요.'),trade('buy','manila','porcelain',5,'마닐라에서 도자기 5상자를 구매하세요.'),view('화물 명세 확인하기','cargo')]),
   chapter('태평양의 보급 계획','이네스는 알려진 보급항을 항해록에 표시합니다. “오늘의 게임 항로에는 쉬어 갈 곳이 더 있습니다. 출발 전에 실제로 갈 수 있는 바다인지 확인하세요.”',[
    view('알려진 보급항과 태평양 항로 확인하기','route'),zone('pacific-west',[130,175,0,45],'서태평양 지정 해역을 정상 항해하세요.'),zone('pacific-east',[-155,-105,0,45],'동태평양 지정 해역을 정상 항해하세요.')]),
   chapter('아카풀코의 거래','아카풀코의 상인은 작은 도자기 상자부터 조심스럽게 풉니다. “먼 바다를 건넌 물건에는 물건값 외에도 항해의 기록이 함께 담겨 있군요.”',[
    visit('acapulco','아카풀코에 실제 입항하세요.'),{kind:'deliver',port:'acapulco',good:'silk',qty:5,text:'비단 5상자를 납품하세요.'},{kind:'deliver',port:'acapulco',good:'porcelain',qty:5,text:'도자기 5상자를 납품하세요.'}]),
   chapter('돌아갈 은','돌아갈 화물은 아메리카의 은입니다. 이네스는 새 장부를 준비합니다. “갈 때의 성공이 귀항을 보장하지는 않죠. 돌아갈 배와 식량을 다시 살펴봅시다.”',[
    trade('buy','acapulco','silver',5,'아카풀코에서 은 5상자를 구매하세요.'),view('귀항 보급 점검하기','supply'),zone('return-pacific-east',[-155,-105,0,45],'귀항 항로의 동태평양 해역을 정상 항해하세요.')]),
   chapter('귀환 항로의 기록','태평양의 반대편에서 익숙한 바람이 느껴집니다. 이네스는 마지막 통과 구역에 작은 표시를 남깁니다.',[
    zone('return-pacific-west',[130,175,0,45],'귀항 항로의 서태평양 해역을 정상 항해하세요.'),visit('manila','마닐라로 귀항하세요.')]),
   chapter('두 대륙을 잇는 항해사','장부의 마지막 칸이 채워졌습니다. 이네스가 묻습니다. “다음에는 어느 바다로 가시겠어요? 긴 항해의 준비라면 제가 돕겠습니다.”',[
    {kind:'deliver',port:'manila',good:'silver',qty:5,text:'은 5상자와 항해 기록을 제출하세요.'},talk('이네스의 합류 이야기 듣기')])]},
 {id:'victoria-return',name:'빅토리아호의 귀환',level:'고급',stage:12,visits:20,origin:'seville',cash:16000,reward:'IS02',
  summary:'세 대양과 남쪽 해협을 순서대로 지나 세비야에 돌아오는 장거리 항해입니다.',
  history:'1519~1522년 원정과 빅토리아호 귀환을 배경으로 합니다. 현재 항구·보급 거점을 이용하는 재현 의뢰입니다.',source:'https://www.rmg.co.uk/collections/library/rmgl-30458',chapters:[
   chapter('세비야의 원정 기록','기록관이 오래된 항해록을 펼칩니다. “완전히 같은 배도, 같은 항구도 아니지만 세 대양을 돌아온 길의 뜻은 되새길 수 있겠지요. 출발점을 이곳에 남깁시다.”',[
    talk('세계 일주 재현 의뢰 읽기'),view('원정 기록 확인하기','journal')]),
   chapter('대서양의 준비','라스팔마스에서 마지막 짐을 정리합니다. 무거운 화물보다 중요한 것은 여러 번의 기항을 견디는 준비입니다.',[
    visit('laspalmas','라스팔마스에 기항하세요.'),view('대서양 항해 보급 확인하기','supply')]),
   chapter('남아메리카의 해안','항해록의 해안은 남쪽으로 길게 이어집니다. 현재 게임의 항구에 기항하면서 원정의 방향을 되짚습니다.',[
    zone('atlantic',[-45,-15,-20,20],'대서양 지정 해역을 정상 항해하세요.'),visit('recife','헤시피에 입항하세요.'),zone('south-atlantic',[-65,-30,-50,-20],'남아메리카 남동부 해역을 항해하세요.')]),
   chapter('남쪽 해협','해협의 물길은 곧장 그은 선과 다릅니다. 안전한 수로를 따라 통과한 기록을 남기고 태평양을 준비합니다.',[
    visit('ushuaia','우수아이아 권역에 기항하세요.'),zone('southern-passage',[-78,-62,-58,-50],'남미 남단 지정 해역을 통과하세요.'),view('태평양으로 이어지는 항로 확인하기','route')]),
   chapter('넓은 태평양','여러 번의 보급과 선택 끝에 넓은 바다를 건넙니다. 지도 경계를 넘는 것만으로는 이 항해의 기록을 대신할 수 없습니다.',[
    zone('victoria-east-pacific',[-150,-95,-40,25],'태평양 동부 지정 해역을 항해하세요.'),zone('victoria-west-pacific',[135,178,-25,35],'태평양 서부 지정 해역을 항해하세요.'),visit('manila','마닐라 권역에 입항하세요.')]),
   chapter('향신료의 섬','작은 섬에서 만난 향신료 상인은 긴 항로를 들여다봅니다. “우리에게는 일상의 물건이 다른 바다에서는 큰 기대를 받는군요.”',[
    visit('ternate','테르나테에 입항하세요.'),visit('bandaneira','반다네이라에 입항하세요.'),trade('buy','bandaneira','nutmeg',3,'육두구 3상자를 구매해 교역 기록을 남기세요.')]),
   chapter('희망봉을 돌아','귀항 항로는 인도양을 지나 아프리카 남쪽으로 향합니다. 마지막 바다도 처음 출항할 때와 같은 준비가 필요합니다.',[
    zone('indian-return',[45,90,-35,0],'인도양 지정 해역을 정상 항해하세요.'),visit('cape','케이프타운에서 정비하세요.')]),
   chapter('돌아온 항해록','출발했던 세비야가 다시 보입니다. 기록관이 마지막 장을 넘깁니다. “이 기록은 한 번의 도착보다, 길을 끝까지 이어 온 선장의 선택을 기억할 겁니다.”',[
    visit('seville','세비야에 귀항하세요.'),talk('완성한 항해록 보고하기')])]}
];

for(const story of STORIES){
 story.steps=[];
 story.chapters.forEach((part,chapterIndex)=>part.steps.forEach(step=>{
  story.steps.push({...step,id:story.id+':'+story.steps.length,chapter:chapterIndex});
 }));
}
export const STORY_BY_ID=Object.fromEntries(STORIES.map(story=>[story.id,story]));
