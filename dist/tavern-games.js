export const TAVERN_GAMES=Object.freeze({
 macau:'홀짝 주사위',venice:'선술집의 21',alexandria:'일곱의 주사위',
 goa:'두 장 사이',malacca:'향신료 주머니',havana:'세 척의 범선 경주'
});
const race=[['순풍호',.5],['상단호',.3],['물결호',.2]];
const draw=(random,max)=>1+Math.floor(random()*max);
const cardTotal=cards=>{
 const low=cards.reduce((n,card)=>n+Math.min(10,card),0);
 return low<=11&&cards.includes(1)?low+10:low;
};
const odds=p=>Math.floor(95/p)/100;
const cardsText=cards=>cards.map(card=>['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][card]).join(' · ');
export function tavernRoundOptions(port,round){
 switch(port){
  case 'macau':return [['odd','홀 · 1.9배'],['even','짝 · 1.9배']];
  case 'alexandria':return [['under','7 미만 · 2.28배'],['seven','정확히 7 · 5.7배'],['over','7 초과 · 2.28배']];
  case 'venice':return round?[['hit','한 장 더 받기'],['stand','멈추기']]:[['deal','카드 받기']];
  case 'goa':{
   if(!round)return [['deal','공개 카드 받기']];
   const p=(round.high-round.low-1)/13;
   return [['inside','사이에 나와요 · '+odds(p)+'배'],['outside','사이 밖이에요 · '+odds(1-p)+'배']];
  }
  case 'malacca':return round?[['take','지금 챙기기 · '+(round.draws===1?1.18:1.40)+'배'],['draw','한 번 더 뽑기']]:[['draw','첫 표식 뽑기']];
  case 'havana':return race.map(([name,p],i)=>[String(i),name+' · '+Math.round(p*100)+'% · '+odds(p)+'배']);
  default:return [];
 }
}
export function tavernResumeStatus(round){
 if(round.port==='venice')return '내 카드 '+cardsText(round.cards)+' · 합 '+cardTotal(round.cards)+' / 주점 주인 '+cardsText([round.dealer[0]])+' · ?';
 if(round.port==='goa')return '공개 카드 '+round.low+' · '+round.high+' / 다음 카드가 두 수 사이에 들어올까요? 같은 숫자는 사이 밖이에요.';
 return '향신료 표식 '+round.draws+'개 · 빈 표식 확률 20%';
}
export function normalizeTavernRound(value){
 if(!value||!['venice','goa','malacca'].includes(value.port)||!Number.isSafeInteger(value.started)||!Number.isSafeInteger(value.bet)||value.bet<10||value.bet>10000||value.bet%10||!Number.isInteger(value.turn)||value.turn<1||value.turn>22)return null;
 const round={port:value.port,started:value.started,bet:value.bet,turn:value.turn};
 if(round.port==='malacca')return [1,2].includes(value.draws)?{...round,draws:value.draws}:null;
 if(round.port==='goa')return Number.isInteger(value.low)&&Number.isInteger(value.high)&&value.low>=1&&value.high<=13&&value.high-value.low>=2?{...round,low:value.low,high:value.high}:null;
 const valid=cards=>Array.isArray(cards)&&cards.length>=2&&cards.length<=21&&cards.every(n=>Number.isInteger(n)&&n>=1&&n<=13);
 return valid(value.cards)&&valid(value.dealer)?{...round,cards:value.cards,dealer:value.dealer}:null;
}
export function playTavernGame(game,port,choice,bet,now,expected,random){
 if(game.port!==port||game.voyage||game.shoreTrip||game.inlandTrip||game.battleId||game.npcBattle||game.raidId||!TAVERN_GAMES[port])throw Error('해당 주점의 항구에 정박하세요.');
 let round=game.tavernRound;
 if(round&&(round.port!==port||!expected||round.started!==expected.started||round.turn!==expected.turn)||!round&&expected)throw Error('현재 판의 진행 상태를 다시 확인해 주세요.');
 const options=tavernRoundOptions(port,round);
 if(!options.some(([id])=>id===choice))throw Error('현재 판에서 고를 수 있는 행동을 확인하세요.');
 const finish=(multiplier,result)=>{
  const payout=Math.min(Math.floor(round.bet*multiplier+1e-8),Math.max(0,1e12-game.money));
  game.money+=payout;
  delete game.tavernRound;
  return {message:result,payout,net:payout-round.bet,bet:round.bet};
 };
 const pending=()=>{
  round.turn++;
  game.tavernRound=round;
  return {message:'판을 이어갑니다.',quiet:true};
 };
 if(!round){
  if(!Number.isSafeInteger(bet)||bet<10||bet>10000||bet%10||game.money<bet)throw Error('보유금 내에서 10~10,000 D를 10 D 단위로 선택하세요.');
  if(now-(game.diceAt||0)<5000)throw Error('판을 시작한 뒤 5초가 지나야 새 판을 열 수 있어요.');
  game.money-=bet;
  game.diceAt=now;
  round={port,bet,started:now,turn:0};
  if(port==='macau'){
   const dice=draw(random,6);
   return finish((dice%2===1)===(choice==='odd')?1.9:0,'주사위 '+dice);
  }
  if(port==='alexandria'){
   const a=draw(random,6),b=draw(random,6),total=a+b;
   return finish(choice===(total<7?'under':total===7?'seven':'over')?(total===7?5.7:2.28):0,'주사위 '+a+' + '+b+' = '+total);
  }
  if(port==='havana'){
   const position=random(),winner=position<.5?0:position<.8?1:2;
   return finish(String(winner)===choice?odds(race[winner][1]):0,race[winner][0]+'이(가) 결승선을 먼저 통과했어요.');
  }
  if(port==='goa'){
   round.low=draw(random,10);
   round.high=round.low+1+draw(random,12-round.low);
   return pending();
  }
  if(port==='venice'){
   round.cards=[draw(random,13),draw(random,13)];
   round.dealer=[draw(random,13),draw(random,13)];
   return pending();
  }
  round.draws=0;
 }
 if(port==='goa'){
  const card=draw(random,13),p=(round.high-round.low-1)/13,inside=card>round.low&&card<round.high;
  return finish(inside===(choice==='inside')?odds(inside?p:1-p):0,'다음 카드 '+card);
 }
 if(port==='venice'){
  if(choice==='hit')round.cards.push(draw(random,13));
  const total=cardTotal(round.cards);
  if(total>21)return finish(0,'내 카드 '+cardsText(round.cards)+' · 합 '+total);
  if(choice==='hit'&&total<21)return pending();
  while(cardTotal(round.dealer)<17)round.dealer.push(draw(random,13));
  const house=cardTotal(round.dealer);
  return finish(house>21||total>house?1.95:total===house?1:0,'내 합 '+total+' · 주점 주인 합 '+house);
 }
 if(choice==='take')return finish(round.draws===1?1.18:1.40,'모은 향신료 표식을 정산했어요.');
 if(random()<.2)return finish(0,'빈 표식이 나왔어요.');
 round.draws++;
 return round.draws===3?finish(1.75,'향신료 표식 3개를 모았어요.'):pending();
}

export function openTavernGame(api,port,result=null){
 const game=api.game(),round=game.tavernRound;
 if(game.port!==port||!TAVERN_GAMES[port])return api.toast('해당 항구의 주점에 입장하세요.');
 if(round&&round.port!==port)return api.toast('먼저 '+api.portName(round.port)+' 주점에서 진행 중인 판을 마쳐 주세요.');
 const fmt=n=>n.toLocaleString('ko-KR');
 const rules={
  macau:'주사위 하나의 홀과 짝을 맞히면 판돈을 포함해 1.9배를 받아요.',
  venice:'21을 넘으면 패배합니다. 주점 주인보다 높은 합이면 1.95배, 동점이면 판돈을 돌려받아요. A는 1 또는 11이고 주점 주인은 17에서 멈춰요.',
  alexandria:'주사위 두 개를 굴려 합이 7 미만, 정확히 7 또는 7 초과인지 맞혀요.',
  goa:'두 공개 수 사이에 다음 카드가 들어올지 골라요. 공개 숫자와 같으면 사이 밖이에요.',
  malacca:'빈 표식 확률은 매번 20%입니다. 한 개면 1.18배, 두 개면 1.40배로 멈출 수 있고 세 개면 1.75배로 정산해요.',
  havana:'세 범선 중 먼저 결승선을 통과할 배를 골라요. 버튼에 우승 확률과 총지급 배율을 표시해요.'
 };
 const resultHtml=result&&result.payout!==undefined?'<p class="help-tip">'+result.message+'<br>총수령 '+fmt(result.payout)+' D · 순손익 '+(result.net>0?'+':'')+fmt(result.net)+' D</p>':'';
 const stake=round?'<p>이번 판돈 '+fmt(round.bet)+' D</p><p>'+tavernResumeStatus(round)+'</p>':'<label>판돈 <input id="tavern-stake" type="number" min="10" max="10000" step="10" inputmode="numeric" value="100"> D</label><p class="modal-meta">10~10,000 D · 새 판 5초 간격</p>';
 const options=tavernRoundOptions(port,round).map(([value,label])=>'<button type="button" data-tavern-play="'+value+'">'+label+'</button>').join('');
 api.modal(TAVERN_GAMES[port],api.portName(port)+' 주점',resultHtml+'<p>'+rules[port]+'</p>'+stake+'<div class="dialog-actions">'+options+'</div><p id="business-result" role="status"></p>','small');
 document.querySelectorAll('[data-tavern-play]').forEach(button=>{
  button.onclick=()=>{
   const bet=Number(document.querySelector('#tavern-stake')?.value);
   void api.play(port,button.dataset.tavernPlay,bet,round,next=>openTavernGame(api,port,next));
  };
 });
}
