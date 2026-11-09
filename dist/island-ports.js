// Curated geographic classification, independent of simplified game berth coordinates.
// Scope and evidence: docs/ISLAND_PORTS_2026-11-09.md.
export const ISLAND_PORTS_VERSION = '2026.11.09-ocean-islands';

// Values name the actual island hosting the represented port city.
// Legacy and developed-* IDs intentionally share the same static lookup.
export const ISLAND_PORTS = Object.freeze({
  london: '그레이트브리튼섬',
  zanzibar: '웅구자섬',
  batavia: '자바섬',
  nagasaki: '규슈섬',
  havana: '쿠바섬',
  dublin: '아일랜드섬',
  mombasa: '몸바사섬',
  colombo: '스리랑카섬',
  singapore: '싱가포르섬',
  manila: '루손섬',
  auckland: '뉴질랜드 북섬',
  plymouth: '그레이트브리튼섬',
  southampton: '그레이트브리튼섬',
  funchal: '마데이라섬',
  laspalmas: '그란카나리아섬',
  angra: '테르세이라섬',
  ribeiragrande: '산티아구섬',
  hormuz: '호르무즈섬',
  ternate: '테르나테섬',
  bandaneira: '반다네이라섬',
  portlouis: '모리셔스섬',
  toamasina: '마다가스카르섬',
  ushuaia: '티에라델푸에고 큰섬',
  honolulu: '오아후섬',
  suva: '비티레부섬',
  papeete: '타히티섬',
  hangaroa: '라파누이섬',
  portmoresby: '뉴기니섬',
  hobart: '태즈메이니아섬',
  apia: '우폴루섬',
  puertoayora: '산타크루스섬',
  kolonia: '폰페이섬',
  'developed-stjohns': '뉴펀들랜드섬',
  'developed-reykjavik': '아이슬란드섬',
  'developed-davao': '민다나오섬',
  'developed-dunedin': '뉴질랜드 남섬',
});

// Treat this exported Set as read-only; Object.freeze does not freeze Set entries.
export const ISLAND_PORT_IDS = new Set(Object.keys(ISLAND_PORTS));
