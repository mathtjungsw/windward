# 바람의 항로 · 2026-11-11 로컬 개발·검증

로컬에서 `npm run dev`를 실행한 뒤 아래 경로를 연다. 기본 포트는 4173이며 `WINDWARD_PREVIEW_PORT`로 바꿀 수 있다. 체험 계정과 공동 사업 기록은 메모리에 저장되며 새로고침하면 다시 시작한다.

| 체험 | 주소 경로 |
| --- | --- |
| 포르투 공동 수송, 운하 운영, 부선장 3단계, 지도첩 | `/__qa/rumors?porto&projects` |
| 정식 공동 보급항 입항 상태, 창고 재고와 보급 구매, 운하 통행권 지정 | `/__qa/rumors?projects&depot` |
| 세비야에서 배를 내려 내륙을 걷는 상륙 탐사 | `/__qa/rumors?shore` |
| 항구 밖 정박, 해변 탐사, 배로 귀환 | `/__qa/rumors?beach` |
| 조합의 상품 납품 견적, 조사 보고, 해적 토벌 | `/__qa/rumors?porto&guild`, `/__qa/rumors?guild` |
| 리스본 주점의 같은 형식 소문, 읽은 소문 숨김·복원 | `/__qa/rumors` |

## 2026-11-12 추가 개발

- 항구의 ‘내 배 보기’에서 선박별 매각 견적과 매각 후 적재량·보급·기함을 확인할 수 있다. 실제 기록한 구입·개량 비용의 60%를 지급한다. 원가 기록이 없던 기존 선박은 단계와 동행선 구입 공식으로 보수적으로 산정한다. 마지막 선박이나 남은 선단에 화물이 들어가지 않는 선박은 매각할 수 없다. 해당 배의 대포와 장비는 보관하고, 남는 보급은 보급 크레딧으로 옮긴다.
- 유적 6곳, 동물 6종, 보물 6곳, 유물 3곳을 추가했다. 도감과 항로에는 총 60종을 표시한다. 유적과 동물의 카드에는 UNESCO·관계 기관 자료를 연결했고, 창작 보물과 유물은 게임 설정으로 표시했다. 실제 유산·서식지와 조사 지점은 구분한다.
- 게임에는 야스쿠니 신사 항목이 없었다. 유일한 신사 항목인 이쓰쿠시마 신사를 활성 지도·소문·도감·이미지에서 제외했다. 이전 저장의 기록을 읽을 때 이미 지급된 명성 400점은 유지한다.
- 장거리 항구 경로는 브라우저의 별도 작업에서 계산하며, 이전 목적지의 계산 결과가 늦게 와도 새 선택을 덮어쓰지 않는다.

## 로컬 적용

- 모바일 상단 메뉴 간격, 자동 보급 토글, 보유품 판매 검색에서 바로 출항, 시간에 따라 쌓이는 기본 세수, 정밀 해안선과 입항 위치를 연결했다.
- 항구 조합에 위탁 수송 3단계, 일반 상품 납품, 발견물 조사, 해적 토벌, 공동 수송을 연결했다. 조사·토벌은 기한 안에 실적을 내면 마감 후에도 돌아와 보고할 수 있다. 일반 납품은 시장 견적을 확인해 판매 수령액과 조합 보수를 함께 저장한다. 공동 수송은 맡은 수량·실제 납품·보수 영수증을 기록하고 마지막 부족분까지만 받는다.
- 항구 12곳과 검증된 해변 6곳에 부두·내륙 장터·조사 지점·고갯길을 구성했다. 탐사팀은 항해 화면의 작은 육지 지도에서 움직이고, 아래 접는 탭에 이동 시간·보급·가방을 표시한다. 항구 밖에 남긴 배가 패배하면 가져오지 못한 탐사 기록을 정리한다. 바다 활동은 어장·표류 화물·구조 요청·침몰선으로 구성했다.
- 6개 공동 보급항은 공사 완료 시 해도·항구 찾기·자동 항해 목적지에 나타난다. 과반 운영자는 소유 항구 화면에 표시한다. 입항 보호와 구조 목적지 지정은 일반 항구와 같은 규칙을 사용한다. 창고의 재고·보급 구매·자동 보급·기여자 배당·시간당 500 D의 기본 세수는 공동 사업 원장에서 확정한다. 보급항의 제공 서비스는 공동 창고다.
- 코린토스·수에즈·파나마 운하는 투자, 현실 공사 시간, 과반 운영자, 통행료, 배당과 별도 배당 잔여 단위를 지원한다. 공동 사업에서 운영 상태를 확인한 운하는 바다·강과 함께 자동 항로에 포함된다. 출항 때 예약한 금액을 실제 입구에서 한 번 정산한다. 통행권은 지정한 운하의 첫 유료 진입에 적용된다. 항로를 바꾸거나 구조되면 미진입 구간의 요금과 예약한 통행권을 반환한다. 입구에 배를 멈춘 뒤 표시 요금을 확인하고 직접 진입할 수도 있다.
- 특수 아이템 64종은 소문, 지정 항구의 담당자, 방문·납품·실적, 구입으로 연결했다. 가방에 사용처·장착 위치·적용 대기·남은 거리를 표시한다. 기록 아이템은 확인한 항로·가격·기본 세수·해상 활동·공유 정보만 저장한다. 부선장 24명은 인물별 원어·시대·행적·자료 링크·창작 합류 이야기와 게임 삽화를 표시한다. 동행 중 항해·의뢰·탐사·해전으로 얻은 경험을 1~5단계 숙련도에 반영하며 전투 개시 시 적용 능력을 기록한다.
- 계정의 기존 저장 봉투와 저장 버전을 유지하고 선택 필드를 추가했다. 기존 재산·화물·투자·대포·명성은 동일한 파서와 저장 경로로 읽는다. 사업은 선택한 프로젝트 한 건을 읽고 운하 목록에서 3개 운영 상태를 조회한다. 시간 경과 처리를 위한 상시 작업과 추가 위치 전송은 없다.

## 확인 범위

- 규칙·저장·UI 테스트, 격리된 로컬 Firebase 에뮬레이터 및 390px Chrome 창에서 확인했다. 브라우저 체험 데이터는 운영 계정과 연결되지 않는다.
- 기존 소유 항구 세수 이관 도구는 로컬 Firebase에서 미리보기·적용·재실행을 검증했다. 기존 세금·투자·시세·계정은 보존하며, 항구별 원본 백업과 저장 버전을 비교한 뒤 수정한다. 운영 Firebase와 GitHub Pages에는 적용하지 않았다. 실서비스 로그인과 운영 사용량 측정은 배포 단계의 검증이다.
- 아이템 64종과 부선장 24명의 전체 획득·저장 경로는 자동 검사한다. 각 효과의 장시간 운영 균형과 모든 기기 조합은 별도 검증 항목이다.

## 운영 배포 시 세수 이관

`node tools/port-income-backfill.mjs --emulator --activation=<시간대가 포함된 ISO 시각>`으로 로컬 미리보기를 실행한다. `--apply`를 추가하면 격리된 로컬 테스트 프로젝트에만 기록한다. 운영 배포를 승인받은 뒤에는 `--emulator` 대신 `--project=windward-voyage`와 기존 Firebase CLI 인증을 쓰며, 실제 활성화 시각을 입력한다. 운영에서도 먼저 미리보기 건수를 확인하고 그다음 적용한다.

이관은 기존 소유 시작 기록이 있으면 활성화 시각과 비교해 더 늦은 시각부터 계산한다. 소유 시작 시각이 없으면 활성화 시각을 사용한다. 이미 정상 적립 중인 항구와 중립항은 건너뛴다. 각 항구 원본은 `.qa/port-income-backfill/`에 저장되며 다른 쓰기가 먼저 처리되면 최신 항구 기록으로 다시 계산한다.

## 부선장 삽화

내장 ImageGen으로 24칸 초상 이미지를 만들고 단일 WebP 파일로 변환했다. 파일은 `dist/assets/officers-2026-11-11.webp`에 있다. 각 카드에는 생성한 게임 삽화로 표시하고 역사 자료를 따로 연결했다.

<details>
<summary>이미지 생성 요청문</summary>

Create one game asset: a strictly aligned 6-column by 4-row contact sheet of 24 individual chest-up illustrated historic maritime figures, for a Korean Age of Sail browser game. Edge-to-edge rectangular grid, each tile EXACTLY the same dimensions, no gaps, no text, no captions, no numbers, no border, no overlaps. Each head centered in its own tile and modest size with 15% side padding so the sheet can be cropped by CSS. Hand-painted historical game portraits in etched watercolor on light ivory paper, warm muted sea-green and sepia shading, polished and dignified, each silhouette distinct, no modern items. Natural face shape and historically appropriate attire, inspired interpretations rather than documentary portraits. Ordering left to right per row: row 1 Yi Sun-sin (Joseon admiral), Jang Bogo (Silla maritime commander), Choe Mu-seon (Goryeo official), Jeong Ji (Goryeo admiral), Chen Lin (Ming admiral), Zheng Chenggong (Koxinga, Ming loyalist). Row 2 Zheng Yi Sao (Chinese woman maritime leader, Qing era), Horatio Nelson, Francis Drake, Cuthbert Collingwood, Michiel de Ruyter, Maarten Tromp. Row 3 Jean Bart, Pierre André de Suffren, Hayreddin Barbarossa, Turgut Reis, Piri Reis, Don Juan de Austria. Row 4 Álvaro de Bazán, Francisco de Almeida, Afonso de Albuquerque, John Paul Jones, Oliver Hazard Perry, Thomas Cochrane. Aspect ratio landscape, grid occupies the entire canvas. These are the only 24 subjects. No writing or graphic embellishments.

</details>
