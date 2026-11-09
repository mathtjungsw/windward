# 섬 탐험왕 항구 분류 · 2026-11-09

`dist/island-ports.js`는 섬에 있는 항구의 고정 목록이다. API 호출·DB 읽기·저장은 하지 않으며 기존 방문 기록의 항구 ID를 판정하는 데 사용할 수 있다. 판정 대상은 `tools/world-catalog.json`, `dist/data.js`의 호환 항구 112개(현재 공공 항구 78개와 퇴역 항구 34개), `dist/harbors.js`, `dist/coastal-sites.js`의 개발 후보 12개이다. 합계 124개를 대조했다.

## 게임에서 사용하는 기준

- 유럽·아시아·아프리카·남북아메리카·오스트레일리아 대륙 본토를 제외하고 바다로 둘러싸인 자연 섬의 항구 도시를 포함한다. 섬의 크기·소속 국가·행정상 본섬 여부로 제외하지 않는다. 따라서 영국·아일랜드·스리랑카·일본·마다가스카르·뉴기니·뉴질랜드도 포함한다.
- 바다에 직접 면한 자연 해안섬도 포함한다. 본토와 다리로 연결되었다고 섬 판정을 취소하지 않는다. 몸바사·싱가포르가 해당한다.
- 강·삼각주·운하·석호 내부의 도시섬은 해양 섬 탐험 대상에서 제외한다. 이는 지리적으로 섬이라는 사실을 부정하는 뜻이 아니라 이 랭킹에 쓰는 범위를 정한 것이다. 베네치아의 석호 내부 섬, 헤시피의 하구 도시섬, 암스테르담의 운하 구역을 별도의 섬 방문으로 세지 않는다.
- 반도·육계도와 본토 도시는 제외한다. 행정구역에 부속 섬이 있거나 도시 이름이 섬 이름과 같다는 이유로 포함하지 않는다. 카디스·마카오·밴쿠버가 해당한다.
- 게임의 `lon/lat`는 항해 가능한 바다로 옮긴 부두 좌표일 수 있다. **항구가 대표하는 실제 도시와 육지**를 기준으로 한다. 밴쿠버의 부두가 밴쿠버섬 앞에 있어도 밴쿠버시는 북미 본토이므로 제외하며, 호바트·우수아이아의 바깥 부두도 각각 태즈메이니아·티에라델푸에고 큰섬으로 판정한다.
- 집계 단위는 서로 다른 **항구 ID**다. 런던·플리머스·사우샘프턴은 같은 섬에 있지만 서로 다른 항구 방문이다. 이미 퇴역한 항구 ID도 과거 방문 기록과의 호환을 위해 목록에 유지한다. 개발 후보는 방문 기록에 실제 항구 ID인 `developed-*`가 있을 때만 사용할 수 있다. 미개발 후보 발견 ID인 `develop-*`는 포함하지 않는다.

## 경계 사례와 출처

아래 링크는 2026-11-09 조회한 공공기관·관광청·국제기구의 1차 자료다. 게임에서 정의한 포함/제외 판단은 위 기준을 적용한 편집 판단이며 출처 기관이 이 게임의 랭킹 기준을 정한 것은 아니다.

| 대상 | 판정과 근거 | 출처 |
| --- | --- | --- |
| 베네치아 `venice` | 제외. 118개 작은 섬의 석호 도시라는 지리 사실은 확인했다. 외해 섬 여행을 세는 목적상 석호 내부 도시섬 제외 기준을 적용한다. | [UNESCO · Venice and its Lagoon](https://whc.unesco.org/en/list/394) |
| 몸바사 `mombasa` | 포함. 도심은 본토와 Tudor·Port Reitz 조수 수로로 나뉘고 인도양에 직접 면한 몸바사섬이다. 석호 내부/강 삼각주의 도시섬과 구분한다. 퇴역 항구이므로 과거 기록 호환용이다. | [케냐 정부 연구기관 KIPPRA · 몸바사 주정부 기후 정책](https://repository.kippra.or.ke/items/ec00224e-38ba-4b72-9d2d-a4fed5859931), [케냐 해안 수자원 공공기관 · Mombasa Island 계획](https://www.cwwda.go.ke/cwsbFiles/publications/WastewaterMasterPlanMombasaIslandAndNorthMainland.pdf) |
| 호르무즈 `hormuz` | 포함. 게임 좌표 56.45, 27.06은 현재 호르무즈섬이며, 본토의 옛 호르무즈와 혼동하지 않는다. | [NASA Earth Observatory · Iran’s Rainbow Island](https://science.nasa.gov/earth/earth-observatory/irans-rainbow-island-147428/), [이란 관광청 · Hormozgan](https://visitiran.ir/en/province/hormozgan-province) |
| 히베이라그란드 `ribeiragrande` | 포함. 게임 좌표 -23.61, 14.92는 카보베르데 산티아구섬의 시다드벨랴(옛 Ribeira Grande)다. 동명 도시가 있는 다른 섬으로 분류하지 않는다. | [UNESCO · Cidade Velha](https://whc.unesco.org/en/list/1310) |
| 마카오 `macau` | 제외. 섬인 타이파·콜로안이 행정구역에 들어 있어도 이 항구 ID는 마카오 도시 전체를 대표하며 주강 하구의 본토 반도와 혼재한다. 별도의 섬 항구 ID가 아니므로 섬 방문을 추정하지 않는다. | [마카오 정부 관광청 · Coloane Pier](https://www.macaotourism.gov.mo/en/step-out-macao/coloane/coloane-pier), [마카오 문화국 · The Islands](https://www.icm.gov.mo/rc/viewer/20038/1339) |
| 밴쿠버 `vancouver` | 제외. 도시와 항만은 본토에 있고 밴쿠버섬과 다르다. 게임 부두 좌표는 단순화된 해도를 위한 위치다. | [기존 항구 자료에 기록된 Vancouver Fraser Port Authority 공식 지도](https://www.portvancouver.com/wp-content/uploads/2018/06/5335_VFPA_Map_Source-Files.pdf) |
| 앙그라 `angra` | 포함. 아조레스의 테르세이라섬에 있는 Angra do Heroísmo다. | [포르투갈 관광청 · Terceira](https://www.visitportugal.com/en/destinos/acores/73817) |
| 푼샬 `funchal` | 포함. 마데이라섬 남해안 도시다. | [마데이라 공식 관광청 · Funchal](https://www.visitmadeira.com/pt/onde-ir/madeira/costa-sul/funchal/) |
| 반다네이라 `bandaneira` | 포함. 반다 군도의 반다네이라섬이다. | [인도네시아 관광청 · Banda Neira](https://www.indonesia.travel/id-en/explore-indonesia/maluku-papua/maluku/banda-neira) |
| 푸에르토아요라 `puertoayora` | 포함. 갈라파고스 산타크루스섬이다. | [갈라파고스 국립공원 · 섬 도착 안내](https://galapagos.gob.ec/informacion-de-interes-para-la-llegada-a-las-islas/) |
| 콜로니아 `kolonia` | 포함. 폰페이섬의 콜로니아를 대표한다. 공항의 작은 부속 섬 위치로 판정하지 않는다. | [폰페이 항만공사](https://www.ppa.fm/en/), 기존 `tools/world-catalog.json`의 도시 좌표·항구 설명 |
| 개발 세인트존스 `developed-stjohns` | 포함. 캐나다 본토의 Saint John과 다른 뉴펀들랜드섬의 St. John’s다. | [뉴펀들랜드·래브라도 공식 관광청 · Travel Around](https://www.newfoundlandlabrador.com/getting-here-and-around/travel-around) |
| 개발 레이캬비크 `developed-reykjavik` | 포함. 아이슬란드 본섬에 있는 수도다. | [아이슬란드 공식 관광청 · Reykjavík](https://www.visiticeland.com/the-regions/reykjavik-the-capital/) |
| 개발 다바오 `developed-davao` | 포함. 민다나오섬이며 마닐라는 루손섬이다. | [필리핀 관광부 · Davao City](https://philippines.travel/destinations/davao-city/index) |
| 오클랜드·개발 더니든 | 포함. 각각 뉴질랜드 북섬·남섬이다. | [뉴질랜드 관광청 공식 지도](https://www.newzealand.com/assets/TNZ-Touring-Map_Web.pdf) |

그 밖의 명확한 섬 항구는 기존 도시 좌표·항구 설명과 자연 섬의 지리적 위치를 대조했다. 기존 개발 후보의 도시 위치 원자료는 [Natural Earth populated places](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson)다. 아래 전수 표는 포함 항구만 나열해서 검토 누락이 생기지 않도록 124개 모두를 기록한다.

## 전수 분류

분류 결과는 호환 항구 중 섬 항구 32개(현재 27개·퇴역 5개), 개발 후보 중 섬 항구 4개, 합계 **36개**다. 나머지 88개는 이 랭킹의 섬 항구 목록에서 제외한다. 같은 섬의 복수 항구를 합친 고유 섬 수는 이 숫자와 다르다.

| 항구 ID | 이름 | 상태 | 판정 | 실제 섬 / 제외 이유 |
| --- | --- | --- | --- | --- |
| `lisbon` | 리스본 | 현재 | 제외 | 대륙 본토·반도 |
| `seville` | 세비야 | 현재 | 제외 | 대륙 본토·반도 |
| `london` | 런던 | 현재 | 포함 | 그레이트브리튼섬 |
| `amsterdam` | 암스테르담 | 현재 | 제외 | 본토·인공 운하 도시 |
| `venice` | 베네치아 | 현재 | 제외 | 석호 내부 도시섬 제외 |
| `alexandria` | 알렉산드리아 | 현재 | 제외 | 대륙 본토·반도 |
| `accra` | 아크라 | 현재 | 제외 | 대륙 본토·반도 |
| `cape` | 케이프타운 | 현재 | 제외 | 대륙 본토·반도 |
| `zanzibar` | 잔지바르 | 현재 | 포함 | 웅구자섬 |
| `muscat` | 무스카트 | 현재 | 제외 | 대륙 본토·반도 |
| `goa` | 고아 | 현재 | 제외 | 인도 본토 연안 지역; 특정 해양 섬 항구 ID 아님 |
| `malacca` | 말라카 | 현재 | 제외 | 대륙 본토·반도 |
| `batavia` | 자카르타 | 현재 | 포함 | 자바섬 |
| `macau` | 마카오 | 현재 | 제외 | 본토 반도와 부속 섬이 혼재하는 도시 ID |
| `nagasaki` | 나가사키 | 현재 | 포함 | 규슈섬 |
| `busan` | 부산 | 현재 | 제외 | 대륙 본토·반도 |
| `havana` | 아바나 | 현재 | 포함 | 쿠바섬 |
| `cartagena` | 카르타헤나 | 현재 | 제외 | 대륙 본토·반도 |
| `recife` | 헤시피 | 현재 | 제외 | 본토와 하구 도시섬에 걸친 도시 |
| `buenos` | 부에노스아이레스 | 현재 | 제외 | 대륙 본토·반도 |
| `sydney` | 시드니 | 현재 | 제외 | 대륙 본토·반도 |
| `porto` | 포르투 | 현재 | 제외 | 대륙 본토·반도 |
| `bordeaux` | 보르도 | 현재 | 제외 | 대륙 본토·반도 |
| `marseille` | 마르세유 | 현재 | 제외 | 대륙 본토·반도 |
| `barcelona` | 바르셀로나 | 퇴역 | 제외 | 대륙 본토·반도 |
| `genoa` | 제노바 | 퇴역 | 제외 | 대륙 본토·반도 |
| `naples` | 나폴리 | 퇴역 | 제외 | 대륙 본토·반도 |
| `athens` | 아테네·피레아스 | 현재 | 제외 | 대륙 본토·반도 |
| `istanbul` | 이스탄불 | 현재 | 제외 | 대륙 본토·반도 |
| `rotterdam` | 로테르담 | 퇴역 | 제외 | 대륙 본토·반도 |
| `cologne` | 쾰른 | 현재 | 제외 | 대륙 본토·반도 |
| `ruse` | 루세 | 퇴역 | 제외 | 대륙 본토·반도 |
| `belgrade` | 베오그라드 | 현재 | 제외 | 대륙 본토·반도 |
| `sanlucar` | 산루카르 | 퇴역 | 제외 | 대륙 본토·반도 |
| `dublin` | 더블린 | 현재 | 포함 | 아일랜드섬 |
| `tangier` | 탕헤르 | 퇴역 | 제외 | 대륙 본토·반도 |
| `tunis` | 튀니스 | 퇴역 | 제외 | 대륙 본토·반도 |
| `dakar` | 다카르 | 현재 | 제외 | 대륙 본토·반도 |
| `luanda` | 루안다 | 현재 | 제외 | 대륙 본토·반도 |
| `maputo` | 마푸투 | 현재 | 제외 | 대륙 본토·반도 |
| `mombasa` | 몸바사 | 퇴역 | 포함 | 몸바사섬 |
| `cairo` | 카이로 | 현재 | 제외 | 대륙 본토·반도 |
| `luxor` | 룩소르 | 현재 | 제외 | 대륙 본토·반도 |
| `mogadishu` | 모가디슈 | 퇴역 | 제외 | 대륙 본토·반도 |
| `aden` | 아덴 | 현재 | 제외 | 대륙 본토·반도 |
| `jeddah` | 제다 | 현재 | 제외 | 대륙 본토·반도 |
| `kochi` | 코치 | 퇴역 | 제외 | 본토·하구권 도시; 특정 해양 섬 항구 ID 아님 |
| `colombo` | 콜롬보 | 현재 | 포함 | 스리랑카섬 |
| `chennai` | 첸나이 | 현재 | 제외 | 대륙 본토·반도 |
| `singapore` | 싱가포르 | 퇴역 | 포함 | 싱가포르섬 |
| `manila` | 마닐라 | 현재 | 포함 | 루손섬 |
| `shanghai` | 상하이 | 현재 | 제외 | 대륙 본토·반도 |
| `nanjing` | 난징 | 퇴역 | 제외 | 대륙 본토·반도 |
| `wuhan` | 우한 | 현재 | 제외 | 대륙 본토·반도 |
| `neworleans` | 뉴올리언스 | 현재 | 제외 | 대륙 본토·반도 |
| `memphis` | 멤피스 | 현재 | 제외 | 대륙 본토·반도 |
| `macapa` | 마카파 | 퇴역 | 제외 | 대륙 본토·반도 |
| `santarem` | 산타렝 | 퇴역 | 제외 | 대륙 본토·반도 |
| `manaus` | 마나우스 | 현재 | 제외 | 대륙 본토·반도 |
| `rio` | 리우데자네이루 | 현재 | 제외 | 대륙 본토·반도 |
| `salvador` | 사우바도르 | 퇴역 | 제외 | 대륙 본토·반도 |
| `callao` | 카야오 | 현재 | 제외 | 대륙 본토·반도 |
| `perth` | 퍼스·프리맨틀 | 현재 | 제외 | 대륙 본토·반도 |
| `auckland` | 오클랜드 | 현재 | 포함 | 뉴질랜드 북섬 |
| `setubal` | 세투발 | 퇴역 | 제외 | 대륙 본토·반도 |
| `sines` | 시네스 | 퇴역 | 제외 | 대륙 본토·반도 |
| `lagos` | 라구스 | 퇴역 | 제외 | 대륙 본토·반도 |
| `faro` | 파루 | 퇴역 | 제외 | 대륙 본토·반도 |
| `cadiz` | 카디스 | 퇴역 | 제외 | 본토와 이어진 반도 |
| `vigo` | 비고 | 퇴역 | 제외 | 대륙 본토·반도 |
| `acoruna` | 아코루냐 | 퇴역 | 제외 | 대륙 본토·반도 |
| `bilbao` | 빌바오 | 퇴역 | 제외 | 대륙 본토·반도 |
| `plymouth` | 플리머스 | 퇴역 | 포함 | 그레이트브리튼섬 |
| `southampton` | 사우샘프턴 | 퇴역 | 포함 | 그레이트브리튼섬 |
| `larochelle` | 라로셸 | 퇴역 | 제외 | 대륙 본토·반도 |
| `funchal` | 푼샬 | 현재 | 포함 | 마데이라섬 |
| `laspalmas` | 라스팔마스 | 현재 | 포함 | 그란카나리아섬 |
| `angra` | 앙그라 | 현재 | 포함 | 테르세이라섬 |
| `ribeiragrande` | 히베이라그란드 | 현재 | 포함 | 산티아구섬 |
| `safi` | 사피 | 퇴역 | 제외 | 대륙 본토·반도 |
| `algiers` | 알제 | 퇴역 | 제외 | 대륙 본토·반도 |
| `dubrovnik` | 두브로브니크 | 퇴역 | 제외 | 대륙 본토·반도 |
| `hormuz` | 호르무즈 | 퇴역 | 포함 | 호르무즈섬 |
| `calicut` | 캘리컷 | 퇴역 | 제외 | 대륙 본토·반도 |
| `mocha` | 모카 | 퇴역 | 제외 | 대륙 본토·반도 |
| `ternate` | 테르나테 | 현재 | 포함 | 테르나테섬 |
| `bandaneira` | 반다네이라 | 현재 | 포함 | 반다네이라섬 |
| `quanzhou` | 취안저우 | 퇴역 | 제외 | 대륙 본토·반도 |
| `portlouis` | 포트루이스 | 현재 | 포함 | 모리셔스섬 |
| `toamasina` | 토아마시나 | 현재 | 포함 | 마다가스카르섬 |
| `boston` | 보스턴 | 현재 | 제외 | 대륙 본토·반도 |
| `halifax` | 핼리팩스 | 현재 | 제외 | 대륙 본토·반도 |
| `veracruz` | 베라크루스 | 현재 | 제외 | 대륙 본토·반도 |
| `acapulco` | 아카풀코 | 현재 | 제외 | 대륙 본토·반도 |
| `sanfrancisco` | 샌프란시스코 | 현재 | 제외 | 대륙 본토·반도 |
| `valparaiso` | 발파라이소 | 현재 | 제외 | 대륙 본토·반도 |
| `ushuaia` | 우수아이아 | 현재 | 포함 | 티에라델푸에고 큰섬 |
| `honolulu` | 호놀룰루 | 현재 | 포함 | 오아후섬 |
| `suva` | 수바 | 현재 | 포함 | 비티레부섬 |
| `papeete` | 파페에테 | 현재 | 포함 | 타히티섬 |
| `hangaroa` | 항가로아 | 현재 | 포함 | 라파누이섬 |
| `portmoresby` | 포트모르즈비 | 현재 | 포함 | 뉴기니섬 |
| `hobart` | 호바트 | 현재 | 포함 | 태즈메이니아섬 |
| `apia` | 아피아 | 현재 | 포함 | 우폴루섬 |
| `vancouver` | 밴쿠버 | 현재 | 제외 | 북미 본토 도시; 동명 섬과 다름 |
| `seward` | 수어드 | 현재 | 제외 | 대륙 본토·반도 |
| `belem` | 벨렝 | 현재 | 제외 | 대륙 본토·반도 |
| `puertoayora` | 푸에르토아요라 | 현재 | 포함 | 산타크루스섬 |
| `iquique` | 이키케 | 현재 | 제외 | 대륙 본토·반도 |
| `darwin` | 다윈 | 현재 | 제외 | 대륙 본토·반도 |
| `kolonia` | 콜로니아·폰페이 | 현재 | 포함 | 폰페이섬 |
| `walvisbay` | 월비스베이 | 현재 | 제외 | 대륙 본토·반도 |
| `developed-stjohns` | 세인트존스 | 개발 후보 | 포함 | 뉴펀들랜드섬 |
| `developed-reykjavik` | 레이캬비크 | 개발 후보 | 포함 | 아이슬란드섬 |
| `developed-bergen` | 베르겐 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-casablanca` | 카사블랑카 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-douala` | 두알라 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-mogadishu` | 모가디슈 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-salalah` | 살랄라 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-chittagong` | 치타공 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-davao` | 다바오 | 개발 후보 | 포함 | 민다나오섬 |
| `developed-cairns` | 케언스 | 개발 후보 | 제외 | 대륙 본토·반도 |
| `developed-dunedin` | 더니든 | 개발 후보 | 포함 | 뉴질랜드 남섬 |
| `developed-comodoro` | 코모도로리바다비아 | 개발 후보 | 제외 | 대륙 본토·반도 |
