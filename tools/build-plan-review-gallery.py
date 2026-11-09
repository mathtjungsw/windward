"""Package the selected development concepts and a readable plan summary.

Copies imagegen outputs without modifying their pixels. Does not change game code.
"""
from pathlib import Path
from html import escape
import json
import os
import re
import shutil
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design-previews/2026-11-09-plan-review'
GEN = Path('C:/Users/codex/.codex/generated_images/01a166b5-0b7b-7753-b33e-02b73303fa82')
IMAGES = [
    ('01-pc-discovery', 'PC 항해·조사 팝업', 'exec-f4e25fd5-fb7f-47d5-9b09-832633b42ccf.png',
     '지도 위에서 바로 조사하거나 조사 지점으로 이동합니다. 평면 미니맵 선택과 한 줄 선단을 함께 보여줍니다.'),
    ('02-mobile', '모바일 항해·흔적 발견', 'exec-45bef2e3-290a-4327-91f8-a61f7db8ddab.png',
     '왼쪽은 정보를 접은 상태의 예시입니다. 기본 펼침과 접기 기능을 유지하고, 오른쪽은 조사 범위 밖일 때의 이동 안내입니다.'),
    ('03-fleet', '배별 개량·느린 배에 맞추는 선단', 'exec-c3af9386-b40d-4433-8dea-db8b32a0ecc2.png',
     '124·112·106해리/일인 세 척은 106해리/일로 함께 항해합니다. 개별 개량으로 병목 선박을 개선하는 예상 화면입니다.'),
    ('04-market', '판매 정산·한정 상품·항구 운영', 'exec-afa1f5c0-c3a6-4751-adfc-12c7984f52d2.png',
     '판매 50상자를 모두 단가 100 D로 정산합니다. 최신 기본 세율은 0%입니다. 이미지의 2%는 소유자가 수동 설정한 예시로만 읽어 주세요. 리스본·포르투만 중립 보장 대상입니다.'),
    ('05-activities', '항구 개발·해안 정박·주사위장', 'exec-cdc63ca9-122d-4a08-84fe-ac2077cbf14f.png',
     '이 이미지는 비용 인상 전 시안입니다. 최신 개척비는 2,000,000 D이며 이미지의 200,000 D는 대체되었습니다. 약탈 실패에는 파손·재산 손실을 추가하는 계획입니다.'),
    ('06-atlas-album', '항구 8곳·발견물 8종 보강', 'exec-2748138a-4506-417a-a82c-9f52c25ae3ec.png',
     '항구 70→78곳, 발견물 32→40종을 목표로 합니다. 지도 그림은 권역 배치 개념이며 최종 부두·수로 좌표는 실제 지도 데이터로 검증합니다.'),
]

OUT.mkdir(parents=True, exist_ok=True)
records = []
for slug, title, source, caption in IMAGES:
    dest = OUT / (slug + '.png')
    shutil.copy2(GEN / source, dest)
    with Image.open(dest) as im:
        im.verify()
    with Image.open(dest) as im:
        size = list(im.size)
    records.append(dict(file=dest.name, title=title, caption=caption,
                        dimensions=size, origin='2026-11-09 신규 시안'))

old = ROOT / 'design-previews/2026-11-06-market-combat/mockup-03-combat.png'
shutil.copy2(old, OUT / '07-existing-combat.png')
records.append(dict(file='07-existing-combat.png', title='기존 계획 참고: 세 가지 전투',
                    caption='2026-11-06에 제작한 전투 시안을 함께 제공합니다. 강화 결투·자유 공격·해적 토벌이며, 대포 표와 손실 규칙은 기존 계획을 참조합니다.',
                    dimensions=[1536, 1024], origin='기존 시안 재수록'))

documents = [
    ('docs/PLAN_REVIEW_2026-11-09.md', 'plan-summary.md'),
    ('docs/DEVELOPMENT_PLAN_2026-11-09_ADDITIONS.md', 'additional-plan.md'),
    ('DEVELOPMENT_PLAN.md', 'market-combat-plan.md'),
    ('docs/SHARED_MARKET_PLAN_2026-11-06.md', 'shared-market-plan.md'),
]
targets = {(ROOT / src).resolve(): OUT / dst for src, dst in documents}
copied = set()

def copy_document(source):
    source = source.resolve()
    dest = targets.setdefault(source, OUT / 'reference-documents' / source.relative_to(ROOT))
    if source in copied:
        return dest
    copied.add(source)
    text = source.read_text(encoding='utf-8')

    def link(match):
        target = match.group(1)
        if target.startswith(('http://', 'https://', '#')):
            return match.group(0)
        name, _, fragment = target.partition('#')
        related = (source.parent / name).resolve()
        if not related.is_file():
            related = (ROOT / name).resolve()
        if related.suffix == '.md' and related.is_file() and related.is_relative_to(ROOT):
            packaged = copy_document(related)
            relative = Path(os.path.relpath(packaged, dest.parent)).as_posix()
            return '](' + relative + ('#' + fragment if fragment else '') + ')'
        return match.group(0)

    text = re.sub(r'\]\(([^)]+)\)', link, text)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding='utf-8')
    return dest

for source, _ in documents:
    copy_document(ROOT / source)

overview = [
    ('탐험', '항구 80해리 · 흔적 100해리 · 조사 60해리 추천. 소문 조건 유지, PC·모바일 팝업.'),
    ('미니맵', '지구본 / 평면지도 선택. 클릭은 카메라만 이동하고 마지막 보기를 기억.'),
    ('선단', '배별 개량, 최대 5척 꼬리 대형. 가장 느린 배 기준으로 속도·도착·보급 계산.'),
    ('교역', '판매 전량은 한 단가로 정산하고 물량 효과는 이후 시세에 반영. 현실 시간으로 회복.'),
    ('세계', '공공 항구 8곳과 발견물 8종 보강. 빈 해안·섬 항로를 메우며 기존 기록 보존.'),
    ('항구·활동', '항구 소유·개발·세율·블랙리스트, 한정 상품, 해안 활동, 주사위장 추천안.'),
    ('전투', '기존 3모드와 대포 계획 유지. 일반 항해 전송은 느리게, 대결 정보는 빠르게.'),
]
rows = ''.join('<tr><th>' + escape(k) + '</th><td>' + escape(v) + '</td></tr>' for k, v in overview)
nav = ''.join('<a href="#s' + str(i) + '">' + escape(r['title']) + '</a>' for i, r in enumerate(records, 1))
figures = ''.join(
    f'<section id="s{i}"><h2>{i:02d} · {escape(r["title"])}</h2>'
    f'<p>{escape(r["caption"])}</p><a href="{r["file"]}" target="_blank">'
    f'<img src="{r["file"]}" alt="{escape(r["title"])}" loading="lazy"></a>'
    f'<p class="small">{escape(r["origin"])} · 이미지를 누르면 원본 크기로 볼 수 있습니다.</p></section>'
    for i, r in enumerate(records, 1))
summary = escape((OUT / 'plan-summary.md').read_text(encoding='utf-8'))
html = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>바람의 항로 · 상세계획과 화면 시안</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f4f0e5;color:#214e56;font-family:Malgun Gothic,system-ui,sans-serif;line-height:1.75}
main{max-width:1280px;margin:auto;padding:32px 24px 80px}h1,h2{line-height:1.35;word-break:keep-all}h1{font-size:clamp(26px,4vw,44px)}h2{font-size:25px}
.tag{display:inline-block;background:#286d76;color:#fff9ed;padding:6px 16px;border-radius:20px;font-weight:700}a{color:#246775}nav{display:flex;flex-wrap:wrap;gap:8px}
nav a,.button{background:#e4eeea;border:1px solid #bdc9bf;padding:8px 14px;border-radius:6px;text-decoration:none;display:inline-block;margin-bottom:4px}
section{background:#fffaf0;border:1px solid #d4d0bd;border-radius:12px;padding:22px;margin:30px 0;scroll-margin-top:15px}img{width:100%;height:auto;display:block;border-radius:7px}
table{border-collapse:collapse;width:100%;background:#fffaf0;margin:24px 0}td,th{border-bottom:1px solid #d4d0bd;text-align:left;padding:14px;vertical-align:top}th{width:100px}
pre{white-space:pre-wrap;word-break:keep-all;font:inherit}.small{font-size:13px;color:#677a73}details{background:#fffaf0;padding:18px;border-radius:8px}footer{border-top:1px solid #d4d0bd;padding-top:24px}
@media(max-width:600px){main{padding:20px 12px}section{padding:12px}th{width:72px}td,th{padding:9px}}
</style><main><span class="tag">개발 전 시안 · 수치는 추천안</span>
<h1>바람의 항로<br>상세계획과 화면 시안</h1><p>2026.11.09 · 신규 시안 6장 + 기존 전투 시안 1장</p>
<p>기존 화면 구성을 검토하는 갤러리입니다. 후속 검토로 기본 세율 0%, 개척비 2,000,000 D, 일반 위치 전송 2초, 항구 투자 지분 과반 소유, 대포 8종×5품질 추천안으로 계획이 바뀌었습니다. 이미지는 수정 전 수치를 포함하므로 최신 계획 원고와 각 이미지 설명을 우선해 주세요.</p>
<p><a class="button" href="windward-plan-review-7-images.zip">전체 이미지·계획 ZIP 받기</a> <a class="button" href="plan-summary.md">쉬운 설명 원고</a> <a class="button" href="additional-plan.md">추가 상세 계획</a></p>
<table>''' + rows + '</table><nav>' + nav + '</nav>' + figures + '''
<details><summary>플레이어 관점 계획 정리 전체 읽기</summary><pre>''' + summary + '''</pre></details>
<footer><p>개발 순서: 전송·지도 → 탐험·팝업 → 항구·발견물 → 선단 → 시장·전투 통합 → 항구 운영·새 활동.</p>
<p>배포 완료 화면이 아닙니다. 이번 작업은 계획 설명과 이미지 제작이며, 운영 데이터·게임 코드를 변경하지 않았습니다.</p></footer></main></html>'''
(OUT / 'index.html').write_text(html, encoding='utf-8')
(OUT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
zipname = OUT / 'windward-plan-review-7-images.zip'
with zipfile.ZipFile(zipname, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file() and p.suffix != '.zip':
            z.write(p, p.relative_to(OUT).as_posix())
with zipfile.ZipFile(zipname) as z:
    assert z.testzip() is None
    assert sum(n.endswith('.png') for n in z.namelist()) == 7
assert all((OUT / r['file']).exists() for r in records)
print(json.dumps({'out':str(OUT), 'images':len(records), 'zipMB':round(zipname.stat().st_size/1e6,2)}, ensure_ascii=False))
