export function officerPortrait(id){
 const number=Number(id.slice(1));
 if(number>=41&&number<=48){
  const slot=number-41;
  return '<div class="officer-portrait" role="img" aria-label="인물 게임 삽화" style="background-image:url(assets/officers-survey.webp);background-size:400% 200%;background-position:'+(slot%4)*100/3+'% '+Math.floor(slot/4)*100+'%"></div>';
 }
 if(number>=1&&number<=24){
  const slot=number-1;
  return '<div class="officer-portrait" role="img" aria-label="인물 게임 삽화" style="background-position:'+(slot%6)*20+'% '+Math.floor(slot/6)*100/3+'%"></div>';
 }
 return '';
}
