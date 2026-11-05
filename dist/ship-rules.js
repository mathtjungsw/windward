export const ACTIVE_SECONDS_PER_DAY=2;
export const SHIPS=Object.freeze([
  {name:'연안 교역선',capacity:40,speed:80,riverSpeed:36,supply:10,reserve:.5,offshore:80,upgrade:9000,supplyPrice:3},
  {name:'항해 캐러벨',capacity:65,speed:120,riverSpeed:36,supply:20,reserve:2,offshore:Infinity,upgrade:36000,supplyPrice:6},
  {name:'원양 교역선',capacity:100,speed:160,riverSpeed:36,supply:65,reserve:5,offshore:Infinity,upgrade:null,supplyPrice:12}
]);
export const ship=s=>SHIPS[s.level]||SHIPS[0];
export const supplySpace=s=>Math.ceil(Math.max(0,s.food-1e-9)/2);
