import {OFFICER_BY_ID} from './rumor-catalog.js?v=2026.11.13-gear-corinth';
import {activeOfficer,officerLevel} from './rumor-progress.js?v=2026.11.13-gear-corinth';

const snapshotPattern=/^(O0(?:0[1-9]|1[0-9]|2[0-4])):([1-5]):([01]):([01]):([01]):([01])$/;
export function officerSnapshot(game,nav){
  const officer=activeOfficer(game);
  if(!officer)return '';
  const [lon,lat]=game.position,coast=nav?.coastAt?.(game.position)<=80,river=!!nav?.riverAt?.(game.position);
  const indian=lon>=28&&lon<=120&&lat>=-45&&lat<=31;
  return [officer.id,officerLevel(game,officer.id),+coast,+river,+indian,+(game.fleetCount>1)].join(':');
}
function unpack(snapshot){
  const match=snapshotPattern.exec(snapshot||'');
  if(!match)return {};
  const [,id,level,coast,river,indian,fleet]=match;
  return {officer:OFFICER_BY_ID[id],scale:1+(Number(level)-1)*.1,coast:coast==='1',river:river==='1',indian:indian==='1',fleet:fleet==='1'};
}
export function officerCombatEffect(snapshot,{distance=Infinity,hp=1,shots=0,hits=0,npc=false}={}){
  const {officer,scale,coast,river,indian,fleet}=unpack(snapshot);
  if(!officer)return {accuracy:0,damage:0,reload:0,defense:0};
  const accuracy=(officer.npcAccuracy||0)+(!shots&&(npc||officer.id==='O024')?(officer.npcFirstAccuracy||0):0)+(river&&officer.id==='O023'?4:0);
  const damage=(npc||officer.id!=='O004'?(officer.npcDamage||0):0)+(!hits?(officer.npcFirstHit||0):0)+(distance<=90?(officer.npcCloseDamage||0):0)+(hp<=.3?(officer.npcLowHPDamage||0):0);
  const reload=officer.id!=='O020'||indian?officer.npcReload||0:0;
  const defense=(coast?(officer.npcCoastDefense||0):0)+(fleet&&officer.id!=='O019'?(officer.npcFleetDefense||0):0);
  return {accuracy:Math.min(6,accuracy*scale),damage:Math.min(.12,damage*scale),reload:Math.min(.08,reload*scale),defense:Math.min(.10,defense*scale)};
}
