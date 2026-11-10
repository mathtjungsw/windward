// Stationary fictional encounters; no movement, synchronization or first-attack AI.
// Existing IDs, names, positions and tiers are save-compatible. Placement notes:
// docs/PIRATE_CATALOG_2026-11-10.md
export const PIRATE_ZONES=Object.freeze([
 {id:'atlantic',name:'대서양 해적 정찰선',point:[-17,34],tier:0,region:'europe'},
 {id:'caribbean',name:'카리브 해적 범선',point:[-77,19],tier:1,region:'caribbean'},
 {id:'africa',name:'희망봉 해적선',point:[13,-33],tier:1,region:'africa'},
 {id:'indian',name:'인도양 해적 기함',point:[61,8],tier:2,region:'indian'},
 {id:'asia',name:'남중국해 해적선',point:[115,15],tier:1,region:'asia'},
 {id:'pacific',name:'태평양 해적 기함',point:[-154,18],tier:2,region:'pacific'},
 {id:'biscay-scout',name:'비스케만 해적 정찰선',point:[-5,45],tier:0,region:'europe'},
 {id:'western-med-scout',name:'서지중해 해적 정찰선',point:[3,38],tier:0,region:'europe'},
 {id:'ionian-raider',name:'이오니아해 해적 범선',point:[18,35],tier:1,region:'europe'},
 {id:'antilles-scout',name:'앤틸리스 해적 정찰선',point:[-66,17],tier:0,region:'caribbean'},
 {id:'guiana-scout',name:'기아나 앞바다 해적 정찰선',point:[-51,4],tier:0,region:'caribbean'},
 {id:'brazil-raider',name:'브라질 앞바다 해적 범선',point:[-35,-15],tier:1,region:'caribbean'},
 {id:'sahara-scout',name:'사하라 연안 해적 정찰선',point:[-19,20],tier:0,region:'africa'},
 {id:'guinea-scout',name:'기니만 해적 정찰선',point:[0,2],tier:0,region:'africa'},
 {id:'mozambique-raider',name:'모잠비크 해협 해적 범선',point:[43,-16],tier:1,region:'africa'},
 {id:'oman-scout',name:'오만 앞바다 해적 정찰선',point:[61,21],tier:0,region:'indian'},
 {id:'southern-indian-raider',name:'남인도양 해적 범선',point:[70,-8],tier:1,region:'indian'},
 {id:'bengal-raider',name:'벵골만 해적 범선',point:[87,9],tier:1,region:'indian'},
 {id:'east-china-scout',name:'동중국해 해적 정찰선',point:[123,28],tier:0,region:'asia'},
 {id:'flores-raider',name:'플로레스해 해적 범선',point:[121,-6],tier:1,region:'asia'},
 {id:'mariana-flagship',name:'마리아나 해적 기함',point:[144,20],tier:2,region:'asia'},
 {id:'coral-raider',name:'산호해 해적 범선',point:[158,-17],tier:1,region:'pacific'},
 {id:'tuamotu-flagship',name:'투아모투 해적 기함',point:[-142,-14],tier:2,region:'pacific'},
 {id:'easter-flagship',name:'이스터섬 북쪽 해적 기함',point:[-108,-24],tier:2,region:'pacific'}
].map(zone=>Object.freeze({...zone,point:Object.freeze(zone.point)})));
export const PIRATE_BY_ID=Object.freeze(Object.fromEntries(PIRATE_ZONES.map(zone=>[zone.id,zone])));
export const PIRATE_IDS=new Set(PIRATE_ZONES.map(zone=>zone.id));
