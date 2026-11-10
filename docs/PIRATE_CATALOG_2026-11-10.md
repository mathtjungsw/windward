# 고정 해적 24척 · 배치와 검증 기록

작성일: 2026-11-10. 상세계획 5.2의 정적 카탈로그 구현 자료다. 개별 해적·배 이름·강도·배치는 창작 게임 설정이며 실제 해적 활동의 역사 기록을 재현하지 않는다. 이동 AI·선제공격·위치 DB 동기화는 추가하지 않는다.

`dist/pirate-catalog.js`가 명세 원본이다. `PIRATE_ZONES`는 고정 배열, `PIRATE_BY_ID`는 ID별 객체, `PIRATE_IDS`는 저장 검증용 Set이다. 기존 `atlantic`, `caribbean`, `africa`, `indian`, `asia`, `pacific`의 ID·이름·좌표·강도를 그대로 유지했다. 기존 진행/재출현 시각의 변환이나 초기화는 필요하지 않다. 강도는 기존 0/1/2이며 HP·명성·재출현·반격 규칙을 이 파일에서 바꾸지 않는다.

| region | 해역 묶음 | 정찰 / 중형 / 기함 |
| --- | --- | --- |
| europe | 유럽·북동 대서양/지중해 | 3 / 1 / 0 |
| caribbean | 카리브·중남미 대서양 | 2 / 2 / 0 |
| africa | 아프리카 연안·희망봉 | 2 / 2 / 0 |
| indian | 아라비아해·인도양 | 1 / 2 / 1 |
| asia | 동아시아·동남아시아 | 1 / 2 / 1 |
| pacific | 태평양·오세아니아 | 0 / 1 / 3 |
| 합계 | 24척 | 9 / 10 / 5 |

## 자료와 검사 방법

- 게임의 현재 항행 판정 자료 `dist/assets/navigation.json`, `dist/assets/rivers.json`과 `Navigator`를 사용한다. 좌표가 육지가 아니어도 자동 경로가 끝 좌표를 육지로 연결할 수 있으므로, 경로 존재와 경로의 모든 선분에 대한 실제 `nav.clear()` 검사를 함께 수행했다. 초기 플로레스 후보 `[120,-4]`는 육지로 판정되어 `[121,-6]`으로 옮겼다.
- `tools/build-map.py`는 기존 `world-land.geojson`을 게임용 격자로 바꾸며, `tools/build-coast.py`는 연안 거리 자료를 만든다. `tools/build-waterways.py`와 `tools/build-island-coasts.py`에는 Natural Earth의 강·도시·육지 원본 경로가 기록되어 있다. [Natural Earth 10m 물리 자료](https://www.naturalearthdata.com/downloads/10m-physical-vectors/)는 육지·해안·강 자료를 제공하며, [사용 조건](https://www.naturalearthdata.com/about/terms-of-use/)은 지도 벡터·래스터 자료를 public domain으로 안내한다. 두 공식 페이지를 2026-11-10에 확인했다. 이번 해적 작업은 외부 지형 파일을 추가로 다운로드하거나 현재 항행 격자를 바꾸지 않았다.
- 공공·호환·개발 후보 항구의 `nav.approach()` 부두 중 가장 가까운 곳을 찾았다. 신규 18곳은 부두와 직선 대권 거리부터 60해리 이상이다. 실제 항해 거리는 이보다 짧아질 수 없으므로 계획의 약 60해리 목표를 만족한다. 기존 6개 좌표도 검사하되 향후 거리 목표 때문에 이동시키지 않는다.
- 해적끼리 최소 대권 거리는 비스케만/서지중해 사이 약 **552.6해리**다. 모든 조합이 권장 250해리보다 멀다. 테스트는 대권 거리가 250해리 미만인 조합에 대해서만 실제 우회 항로를 계산하도록 구성했다.
- 정찰선은 9단계 쌍돛 연안선 이하, 중형은 15단계 대형 카락 이하, 기함은 최종 20단계 배 이하로 공공 항구에서 왕복 가능함을 검사한다. 선박의 연안 제한과 `2 × 편도 항해거리 / 속도 + 예비 보급 ≤ 최대 보급`을 적용한다. 유럽 신규 정찰선 두 곳은 6단계 단돛 교역선으로도 접근/귀환을 검사한다. 강도의 선박 단계 제한을 새 규칙으로 만든 것은 아니다.

아래 거리는 반올림한 해리다. 가까운 부두에는 비공개 호환 항구·미개발 후보도 포함되며, 게임 화면에 그 항구를 공개하는 자료로 사용하지 않는다. 오른쪽은 **공공 항구에서 검사에 성공한 접근 예**다. 배 단계는 1/6/9/10/15/20단계 중 표본 검사한 값으로, 최소 필요 단계나 대포 장착·승리 보장을 뜻하지 않는다. 편도 거리는 육지를 피한 실제 게임 항로다.

| ID | 경도, 위도 | 강도 | 최근접 부두 · 거리 | 공공 접근항 · 편도 거리 · 검사 배 |
| --- | --- | ---: | --- | --- |
| atlantic | -17, 34 | 0 | funchal · 90 | funchal · 90 · 1단계 |
| caribbean | -77, 19 | 1 | havana · 409 | havana · 670 · 6단계 |
| africa | 13, -33 | 1 | cape · 257 | cape · 257 · 9단계 |
| indian | 61, 8 | 2 | develop-salalah · 661 | goa · 861 · 10단계 |
| asia | 115, 15 | 1 | manila · 325 | manila · 325 · 9단계 |
| pacific | -154, 18 | 2 | honolulu · 289 | honolulu · 290 · 6단계 |
| biscay-scout | -5, 45 | 0 | bilbao · 124 | bordeaux · 267 · 1단계 |
| western-med-scout | 3, 38 | 0 | algiers · 66 | marseille · 329 · 6단계 |
| ionian-raider | 18, 35 | 1 | athens · 306 | athens · 365 · 9단계 |
| antilles-scout | -66, 17 | 0 | cartagena · 701 | cartagena · 754 · 9단계 |
| guiana-scout | -51, 4 | 0 | macapa · 238 | belem · 346 · 1단계 |
| brazil-raider | -35, -15 | 1 | salvador · 212 | recife · 421 · 9단계 |
| sahara-scout | -19, 20 | 0 | dakar · 329 | dakar · 329 · 9단계 |
| guinea-scout | 0, 2 | 0 | accra · 213 | accra · 213 · 9단계 |
| mozambique-raider | 43, -16 | 1 | toamasina · 390 | toamasina · 864 · 6단계 |
| oman-scout | 61, 21 | 0 | muscat · 187 | muscat · 193 · 6단계 |
| southern-indian-raider | 70, -8 | 1 | portlouis · 1030 | portlouis · 1030 · 10단계 |
| bengal-raider | 87, 9 | 1 | colombo · 462 | colombo · 522 · 10단계 |
| east-china-scout | 123, 28 | 0 | shanghai · 217 | shanghai · 270 · 1단계 |
| flores-raider | 121, -6 | 1 | bandaneira · 539 | bandaneira · 560 · 6단계 |
| mariana-flagship | 144, 20 | 2 | nagasaki · 1075 | nagasaki · 1108 · 10단계 |
| coral-raider | 158, -17 | 1 | develop-cairns · 703 | portmoresby · 841 · 10단계 |
| tuamotu-flagship | -142, -14 | 2 | papeete · 486 | papeete · 486 · 10단계 |
| easter-flagship | -108, -24 | 2 | hangaroa · 204 | hangaroa · 204 · 9단계 |

## 검증 기록과 범위

`node --test tools/pirate-catalog.test.mjs`: **5개 통과, 실패 0개**. ID/기존 6척 보존·해역별 수/강도·24곳의 해상/리스본 연결·근접 부두 경로/신규 60해리·해적 간 250해리·선박 성장에 따른 왕복 보급을 검사했다. 현재 항행 자료의 SHA-256:

- navigation.json: `b3b51011ab62890bd94bc8b5738b802bd0e9e30d6a445044be664a0587b3e12a`
- rivers.json: `912386b9eb06a52b1946fd0ef7aead1472fdac30f48148d85f78fbebc4307e81`

지도/항행 자료 재생성 후에는 같은 테스트를 다시 실행해야 한다. 이 기록은 카탈로그와 지리 검사 결과다. 전투 UI·신규 ID의 저장 파서 연결·실제 포격/토벌·화면 표시 검증은 통합 구현의 별도 검사 대상이다.
