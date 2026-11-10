# 해도 정적 자료 · 2026-11-10

지도 자료는 정적 파일이다. Firebase 읽기·저장, 외부 지도 API, 타일 스트리밍을 추가하지 않는다. `tools/build-chart-assets.py`로 생성하며 Python 3·Pillow·NumPy가 필요하다. 원본 다운로드는 Git에서 제외하는 `tools/source-data/`에 캐시한다.

## 출처와 사용 조건

- [Natural Earth 사용 조건](https://www.naturalearthdata.com/about/terms-of-use/): 사이트의 벡터·래스터 자료는 public domain이며 수정·배포가 허용된다. 자료에 포함된 번역 지명도 같은 자료의 속성이다.
- [10m 육지](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/): 정교한 전 세계 해안과 주요 섬. 제작 원본은 [Natural Earth v5.1.2 태그](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson)의 `ne_10m_land.geojson`이다. 대륙과 섬·구멍을 삭제하지 않고 0.012도 허용 오차로 단순화했다. 소규모 섬이 3개 미만 꼭짓점으로 줄어들면 원래 고리를 보존한다.
- 같은 태그의 `ne_10m_admin_0_countries.geojson`: 국경은 배경 선이므로 0.035도 허용 오차로 별도 경량화했다. 현대 경계 자료를 항해 시대의 정치 지배 기록이라고 소개하지 않는다.
- [Physical Labels](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/): `ne_10m_geography_marine_polys`, `ne_10m_geography_regions_polys`, `ne_10m_geography_regions_points`에서 60개 실제 지명을 대조하고 해당 `NE_ID`를 함께 기록했다. 데이터의 NAME_KO와 통용 한국어 이름을 참고해 지도용 띄어쓰기를 정리했다. 공식 설명도 지역 경계는 대략적이라고 안내한다. 배경 글씨의 기준점은 해당 명칭의 실제 영역 안에서 배치를 위해 고른 편집 좌표이며 항구·발견물·항행 목적지가 아니다. 곶 3개는 원본 점 좌표를 그대로 사용한다.
- [50m Shaded Relief](https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/): SRTM Plus 고도 자료를 축소해 만든 실제 **육상 지형 음영**이다. [공식 배포 ZIP](https://naturalearth.s3.amazonaws.com/50m_raster/SR_50M.zip)을 사용했다. 설명 페이지는 3.2.0으로 안내하지만 실제 ZIP의 `SR_50M.VERSION.txt`는 **2.0.0**이므로 manifest에는 ZIP 내부 버전을 기록했다. 위성사진이나 해저 측량 수심이 아니다.

조회일은 2026-11-10이다. 다운로드 URL·원본 SHA-256·실제 파일 크기·가공 배율·보존한 항행 자료의 해시는 `dist/assets/chart-assets-manifest.json`에 기록한다. 원본 변경을 조용히 받아들이지 않도록 벡터 자료는 태그를 고정했으며, 래스터의 재다운로드 결과는 manifest 해시와 비교할 수 있다.

## 생성물과 연결 방법

- `world-land.geojson`: 기존 FeatureCollection 스키마 유지. 대륙뿐 아니라 원본의 모든 섬·구멍을 유지한다.
- `world-countries.geojson`: 같은 스키마, 경계 배경용.
- `islands.geojson`: 기존 작은 섬 보강 파일을 **그대로 보존**한다. 새 전 세계 육지에 섬이 추가되어도 기존 별도 섬 항행 보강을 제거하지 않는다.
- `terrain-shade.webp`: 3600×1400 투명 음영. 원본은 경도 -180~180, 위도 90~-90이며 게임의 위도 80~-60으로 자른다. SVG에서는 `x=0 y=0 width=1600 height=800 preserveAspectRatio="none"`, `pointer-events="none"`으로 배치한다. 육지 위에만 표시하는 clip을 사용하고 은은한 opacity 약 0.20~0.30으로 시작한다. 강·항구·전투·안개·항로보다 아래에 둔다. 미니맵에서는 생략해도 된다.
- `dist/place-names.js`: `PLACE_NAMES_VERSION`, `PLACE_NAMES`를 내보낸다. 각 항목의 `id`, `name`, `lon`, `lat`, `kind`, `priority`를 사용한다. priority 숫자가 큰 지명을 먼저 배치한다. 출처 검토용 `sourceName`, `sourceLayer`, `naturalEarthId`도 포함한다. 화면 크기 고정 글씨와 충돌 회피는 렌더러가 담당하며, 이 카탈로그가 미발견 항구나 탐험 점수를 만들지 않는다.

## 항행·저장 안전성과 확인 범위

이 생성기는 `navigation.json`, `rivers.json`, `islands.geojson`을 만들거나 수정하지 않는다. 실행 전후 세 파일의 SHA-256이 같은지 검사한다. `tools/build-map.py`를 실행해 정교해진 그림으로 기존 충돌 격자를 덮지 않는다. 원래 `.5도` 항행 격자와 부두 좌표를 보존하므로 이 작업은 기존 저장 위치를 옮기거나 초기화하지 않는다. 육지 그림이 이전보다 정교해졌으므로 해협·부두·강 입구의 실제 항행과 표시 일치는 앱 통합 검증에서 별도로 확인해야 한다. 정적 자료 생성 성공을 해당 화면/항행 검증 완료로 간주하지 않는다.

지도 5종·음영·지명 총량 목표는 압축 전 8,000,000 bytes 이하이며 생성기가 초과 시 실패한다. 실제 gzip 전송량과 브라우저 첫 방문/재방문은 별도로 측정한다. WebP는 압축 파일 크기보다 디코딩 메모리를 많이 쓰므로 모바일에서 한 번만 디코딩·캐시하고 복제 타일마다 새 이미지 객체를 만들지 않는다.
