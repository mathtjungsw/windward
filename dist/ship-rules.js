import {HISTORICAL_BY_ID} from './historical-ships.js?v=2026.11.14-supply-storage';
import {activeOfficer,gearOnShip,extraCapacity} from './rumor-progress.js?v=2026.11.14-supply-storage';

export const ACTIVE_SECONDS_PER_DAY=2;
const rows=[
 ['통나무 뗏목',80,20,10,80,0],['돛 달린 뗏목',84,24,11,80,600],['보강 뗏목',88,28,12,80,900],
 ['소형 노젓는 배',92,32,14,80,1500],['소형 교역 돛배',96,40,16,80,2200],['단돛 교역선',100,46,18,120,3200],
 ['연안 교역선',106,54,20,160,4500],['개량 연안선',112,62,22,220,6200],['쌍돛 연안선',118,70,25,300,8500],
 ['항해 캐러벨',124,78,30,Infinity,11500],['개량 캐러벨',130,86,34,Infinity,15000],['대형 캐러벨',136,94,38,Infinity,19500],
 ['소형 카락',142,102,42,Infinity,25000],['교역 카락',148,110,48,Infinity,32000],['대형 카락',154,120,54,Infinity,41000],
 ['원양 교역선',160,132,65,Infinity,52000],['교역 갤리온',168,146,70,Infinity,66000],['대형 갤리온',176,160,75,Infinity,83000],
 ['원양 대형 범선',184,176,80,Infinity,104000],['명장의 교역 범선',192,192,90,Infinity,130000]
];
export const SHIPS=Object.freeze(rows.map(([name,speed,capacity,supply,offshore,cost],i)=>Object.freeze({name,speed,capacity,supply,offshore,cost,tier:i,riverSpeed:36,reserve:i<9?.5:i<15?2:5,supplyPrice:i<9?3:i<15?6:12,upgrade:rows[i+1]?.[5]??null})));
export const LEGACY_TIER=[4,9,15];
export const STORED_SHIP_LIMIT=24;
const legacyTier=s=>Number.isInteger(s.shipTier)?Math.max(0,Math.min(19,s.shipTier)):LEGACY_TIER[s.level]??0;
export function fleetShips(s){
 const rows=Array.isArray(s.fleetShips)?s.fleetShips:null,flag=rows?.find(p=>p.id===s.flagshipId)||rows?.[0];
 if(Array.isArray(rows)&&rows.length>0&&rows.length<=5&&flag?.tier===legacyTier(s)&&rows.length===(s.fleetCount||1))return rows;
 return Array.from({length:Number.isInteger(s.fleetCount)?Math.max(1,Math.min(5,s.fleetCount)):1},(_,i)=>({id:'vessel-'+i,tier:legacyTier(s)}));
}
export function syncFleet(s,rows,flagshipId=s.flagshipId){s.fleetShips=rows;s.flagshipId=rows.some(p=>p.id===flagshipId)?flagshipId:rows[0].id;s.shipTier=rows.find(p=>p.id===s.flagshipId).tier;s.fleetCount=rows.length;return s;}
export function fleetDisplayShips(game){
 const rows=fleetShips(game), flagship=rows.find(v=>v.id===game.flagshipId)||rows[0];
 return [flagship,...rows.filter(v=>v.id!==flagship.id)];
}
export const storedShips=game=>Array.isArray(game.storedShips)?game.storedShips:[];
export const highestOwnedTier=game=>Math.max(...fleetShips(game).map(ship=>ship.tier),...storedShips(game).map(ship=>ship.tier));
export const vesselSpec=v=>{const base=SHIPS[v.tier],row=HISTORICAL_BY_ID[v.kind],p=row?.stats||{};return {...base,name:row?.name||base.name,speed:base.speed*(p.speed||1),riverSpeed:base.riverSpeed*(p.river||1),capacity:Math.floor(base.capacity*(p.capacity||1)),supply:Math.round(base.supply*(p.supply||1)*10)/10,offshore:p.offshore??base.offshore,hp:Math.round((100+30*v.tier)*(p.hp||1)),...{guns:p.guns||1,coastSpeed:p.coastSpeed||1,supplyUse:p.supplyUse||1,openSupply:p.openSupply||1}};};
export function vesselSeaSpeed(game,vessel,coastal=false){
 const bonus=(gearOnShip(game,vessel.id)?.seaSpeed||0)+(activeOfficer(game)?.seaSpeed||0);
 const spec=vesselSpec(vessel);return spec.speed*(1+Math.min(.2,bonus))*(coastal?spec.coastSpeed:1);
}
export const shipTier=s=>legacyTier(s);
export const fleetCount=s=>fleetShips(s).length;
export function ship(s){
 const vessels=fleetShips(s),members=vessels.map(vesselSpec),flag=vesselSpec(vessels.find(v=>v.id===s.flagshipId)||vessels[0]);
 const speed=Math.min(...vessels.map(p=>vesselSeaSpeed(s,p)));
 const riverSpeed=Math.min(...vessels.map(p=>vesselSpec(p).riverSpeed*(1+(gearOnShip(s,p.id)?.riverSpeed||0)+(activeOfficer(s)?.riverSpeed||0))));
 return {...flag,speed,riverSpeed,supply:Math.min(...members.map(p=>p.supply)),offshore:Math.min(...members.map(p=>p.offshore)),reserve:Math.max(...members.map(p=>p.reserve)),supplyPrice:members.reduce((a,p)=>a+p.supplyPrice,0)/members.length};}
export const fleetCapacity=s=>{const caps=fleetShips(s).map(p=>vesselSpec(p).capacity).sort((a,b)=>b-a);return Math.floor(caps[0]+caps.slice(1).reduce((a,n)=>a+n*.6,0)+1e-8)+extraCapacity(s);};
export const supplyUnits=s=>fleetShips(s).reduce((n,p)=>n+1-(gearOnShip(s,p.id)?.supplySpaceDiscount||0),0);
export const supplySpace=s=>Math.ceil(Math.max(0,s.food*supplyUnits(s)-1e-9)/2);
export const fleetLimit=s=>{const tier=highestOwnedTier(s);return tier<5?1:tier<9?2:tier<13?3:tier<17?4:5;};
export const upgradeCost=s=>ship(s).upgrade===null?null:Math.ceil(ship(s).upgrade*(100+35*(fleetCount(s)-1))/100);
export const additionalShipCost=s=>fleetCount(s)>=fleetLimit(s)?null:[0,6000,15000,35000,75000][fleetCount(s)]+Math.floor(SHIPS.slice(0,shipTier(s)+1).reduce((n,p)=>n+p.cost,0)*.25);
export const fleetMaxHP=s=>Math.round(fleetShips(s).reduce((n,p)=>n+vesselSpec(p).hp,0)*(1+(activeOfficer(s)?.hullBonus||0)));
export const fleetAppraisal=s=>fleetShips(s).reduce((n,p)=>n+(p.kind?shipCostBasis(p):SHIPS.slice(0,p.tier+1).reduce((a,q)=>a+q.cost,0)),0);
export function shipCostBasis(vessel){
 const invested=SHIPS.slice(0,vessel.tier+1).reduce((sum,s)=>sum+s.cost,0);
 return vessel.costBasis??Math.min(invested,6000+Math.floor(invested*.25));
}
