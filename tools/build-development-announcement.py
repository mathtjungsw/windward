"""Render the latest predevelopment announcement as ten Korean JPEG pages."""
import importlib.util
import json
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from html import escape
import zipfile
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design-previews/2026-11-09-announcement-jpg'
OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('guide',ROOT/'tools/build-player-guide.py')
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
N=10

class Page(g.Poster):
    def __init__(self,n,title,subtitle):
        super().__init__(n,title,subtitle)
        self.d.rectangle((g.RIGHT-285,90,g.RIGHT+5,158),fill=g.PAPER)
        self.d.text((g.RIGHT-265,104),f'PLAN  {n:02d} / {N:02d}',font=g.font(28),fill=g.MUTED)
        self.d.rounded_rectangle((g.LEFT,390,g.RIGHT,462),radius=12,fill=g.TEAL)
        self.d.text((g.LEFT+25,405),'개발 예정 안내 · 아직 게임에 적용되지 않았습니다',font=g.font(34,True),fill=g.PAPER)
        self.y=510

    def table(self,heads,rows,widths,size=37):
        x=g.LEFT; top=self.y
        self.d.rounded_rectangle((g.LEFT,top,g.RIGHT,top+66),radius=8,fill=g.TEAL)
        for head,width in zip(heads,widths):
            self.text(head,x+15,top+12,width-30,34,g.PAPER,1.25,True);x+=width
        self.y=top+68
        for i,row in enumerate(rows):
            height=max(len(g.lines(self.d,str(t),g.font(size),w-30)) for t,w in zip(row,widths))*round(size*1.35)+32
            if self.y+height>g.H-165:raise ValueError(f'Table overflow {self.n}')
            self.d.rectangle((g.LEFT,self.y,g.RIGHT,self.y+height),fill=g.PALE if i%2==0 else '#FFFDF7')
            x=g.LEFT
            for t,w in zip(row,widths):
                self.text(str(t),x+15,self.y+14,w-30,size,g.INK,1.35);x+=w
            self.y+=height
        self.y+=30

    def banner(self,label,value):
        h=148
        self.d.rounded_rectangle((g.LEFT,self.y,g.RIGHT,self.y+h),radius=18,fill=g.SEA)
        self.text(label,g.LEFT+28,self.y+17,560,37,g.MUTED,1.3)
        self.text(value,g.LEFT+610,self.y+32,g.RIGHT-g.LEFT-640,57,g.TEAL,1.25,True)
        self.y+=h+28

    def save_page(self,slug):
        if self.y>g.H-150:raise ValueError(f'Page overflow {self.n}: {self.y}')
        self.d.line((g.LEFT,g.H-133,g.RIGHT,g.H-133),fill=g.LINE,width=2)
        self.d.text((g.LEFT,g.H-106),'바람의 항로 · 참여자용 개발 예정 안내',font=g.font(27),fill=g.MUTED)
        self.d.text((g.LEFT,g.H-65),'2026.11.09 최신 결정 반영 · 추천 수치는 개발 검증 후 조정',font=g.font(25),fill=g.BRASS)
        name=f'{self.n:02d}-{slug}.jpg'
        self.im.save(OUT/name,'JPEG',quality=95,subsampling=0,optimize=True,dpi=(180,180))
        return {'file':name,'title':self.title,'size':[g.W,g.H],'contentBottom':self.y,'blocks':self.records}

records=[]
def new(n,title,subtitle):
    p=Page(n,title,subtitle);p.title=title;return p

p=new(1,'새로운 항해를 준비합니다','탐험 · 선단 · 교역 · 항구 투자 · 대포 전투')
g.scene(p,g.LEFT,p.y,g.RIGHT-g.LEFT,300);p.y+=335
p.section('더 쉽게 발견하고, 더 멀리 항해','PC·모바일 조사 팝업과 선택형 미니맵을 준비합니다. 항구가 드문 해안과 섬 항로를 보강하고 그림 도감을 늘립니다.',46)
p.section('함께 움직이고, 함께 바꾸는 세계','선단은 꼬리 대형으로 항해하고 가장 느린 배에 속도를 맞춥니다. 거래량이 시세를 바꾸며, 투자 지분으로 항구의 주인이 바뀝니다.',46)
p.section('배에 맞는 대포와 세 가지 전투','다양한 대포와 품질, 강화 결투·자유 공격·해적 토벌을 준비합니다. 해적은 먼저 공격하지 않는 방향을 유지합니다.',46)
p.note('이번 이미지는 개발 예정 내용을 설명하는 공지입니다. 확정된 방향과 추천 수치를 구분하며, 구현·배포 완료 공지가 아닙니다.')
records.append(p.save_page('overview'))

p=new(2,'흔적을 놓치지 않는 탐험','소문은 유지하고, PC·모바일 모두 큰 조사 팝업')
p.table(['항목','새 거리 추천안'],[('항구 정보 발견','40 → 80해리'),('유적·유물 등의 흔적','100해리'),('실제 조사·수집','60해리')],[760,792],44)
p.section('발견하면 화면 위에 조사 팝업','항해를 잠시 멈추고 ‘조사하기’와 ‘조사 지점으로 이동’을 크게 표시합니다. 현재 거리와 더 접근해야 하는 거리를 안내하고, 닫은 팝업은 다시 열 수 있게 합니다.',45)
p.section('소문을 듣고 찾아가는 재미는 그대로','기존 소문과 획득 기록을 유지합니다. 어려운 발견물은 필요한 소문을 들어야 찾을 수 있습니다. 조사 뒤에는 원래 항로로 돌아갈 수 있게 합니다.',45)
p.section('미니맵은 두 보기 중 선택','지구본 / 평면 세계지도를 바꿔 보고 마지막 선택을 기억합니다. 미니맵 클릭은 화면 위치만 옮기며 배를 출항시키지 않습니다.',45)
p.note('항구를 멀리서 발견해도 거래는 실제 입항 뒤 가능합니다. 북쪽 끝→남쪽 연결 규칙은 유지하고 경계의 좌표·항로·보급 오류를 점검합니다.')
records.append(p.save_page('exploration'))

p=new(3,'빈 항로에 새로운 기항지를','항구 70 → 78곳 · 발견물 32 → 40종 목표')
p.table(['권역','항구 추가 후보'],[('북아메리카','밴쿠버 · 수어드'),('남아메리카','벨렝 · 푸에르토아요라 · 이키케'),('호주·태평양','다윈 · 콜로니아(폰페이)'),('아프리카','월비스베이')],[430,1122],42)
p.section('가까운 곳에 촘촘히 늘리지 않습니다','긴 항로의 공백과 섬·발견물 주변을 우선 보강합니다. 최종 부두와 접근 수로를 확인하고, 각 항구에 교역·보급·주점·소문을 준비합니다.',45)
p.heading('유물 6종 + 유산 관찰 2종 보강')
ay=p.y
for i,(asset,label) in enumerate([('relic-chart','해도 조각'),('relic-astrolabe','항해 도구'),('relic-pendant','유물 그림'),('ruin-nanmadol','유산 관찰')]):
    x=g.LEFT+i*388
    g.art(p,f'assets/discoveries/{asset}.svg',(x,ay,350,220))
    p.text(label,x,ay+225,350,36,g.INK,1.25,True)
p.y=ay+295
p.para('창작 표류 유물과 실제 유산 관찰 기록을 그림 도감으로 모읍니다. 새 소재는 북미·남미·호주 북부와 태평양의 공백을 중심으로 보강합니다.',45)
p.note('그림은 기존 수집 카드의 분위기 예시입니다. 최종 항구·관찰 지점은 검증 뒤 확정하며, 기존 방문·탐험·수집 기록은 보존합니다.')
records.append(p.save_page('world'))

p=new(4,'느린 배도 함께 가는 선단','기함을 조종하면 나머지 배가 한 줄로 따라옵니다')
p.banner('선단 속도 예시','106해리 / 일')
p.table(['선박','단계','각 배의 속도'],[('항해 캐러벨','10','124해리/일'),('개량 연안선','8','112해리/일'),('연안 교역선','7','106해리/일')],[710,230,612],42)
p.section('가장 느린 배에 맞춰 움직입니다','세 척 중 가장 느린 연안 교역선에 맞춰 모두 106해리/일로 항해합니다. 예상 도착 시간과 보급 계산에도 같은 선단 속도를 적용합니다.',45)
p.section('배마다 개량하는 재미','배별 단계와 개별 개량을 준비합니다. 속도를 제한하는 배와 개량 후 선단 속도를 보여줍니다. 최대 5척이며, 빠른 배 한 척만 바꿔 모든 배가 무료로 좋아지지는 않습니다.',45)
p.section('항로를 따라 꼬리 대형으로','배들은 기함이 지나온 항로를 따라 일정 간격으로 움직입니다. 강·해안·지도 경계에서도 육지를 가로지르지 않게 합니다.',45)
p.note('뗏목 시작·보급 10일·기존 6배 항해 체감을 기준으로 합니다. 기존 선단은 현재 단계와 대수를 보존해 새 기록으로 옮깁니다.')
records.append(p.save_page('fleet'))

p=new(5,'팔 때는 전량 같은 단가','판매 물량의 효과는 다음 거래부터 시세에 반영')
p.banner('단가 100 D × 50상자','판매 총액 5,000 D')
p.section('50상자든 100상자든 현재 단가로','한 번에 판매하는 모든 상자는 판매 직전 단가로 정산합니다. 단가 100 D이면 50상자는 5,000 D, 100상자는 10,000 D입니다. 기본 세율은 0%입니다.',45)
p.table(['공동 시세 추천값','적용 방식'],[('구매 / 판매 한 상자','압력 +0.1%p / −0.1%p'),('거래 압력 범위','최대 ±30%'),('자연 회복','현실 1분마다 1.5%p')],[710,842],41)
p.para('같은 초기 상태에서 50상자 판매는 −5%p, 100상자는 −10%p의 압력을 만듭니다. 나눠 팔면 두 번째 판매는 새 시세를 사용합니다. 구매는 상자별 가격 합산 계획을 유지합니다.',44)
p.section('수량이 제한된 고급 상품','선별 진주·최고급 견직물·정교한 자기·정선 향료 4종을 추천합니다. 항구별 최대 10상자, 현실 2시간에 1상자 보충을 기본안으로 둡니다.',45)
p.note('시세 회복은 개인의 게임 날짜가 아닌 현실 절대시간 기준입니다. 소유자가 세율을 설정했다면 상품 총액·세금·받는 금액을 구분해 표시합니다.')
records.append(p.save_page('trade'))

p=new(6,'지분이 항구의 주인을 정합니다','누적 투자금의 50%를 초과해야 소유자가 됩니다')
p.table(['항구 구분','최초 투자 기준'],[('일반 항구','1,000,000 D · 100만'),('대형 항구','3,000,000 D · 300만')],[760,792],45)
p.heading('추가 투자로 소유자가 바뀝니다')
p.table(['투자 상황','지분과 소유권'],[('A가 100만 D 투자','A 100% → A 소유'),('B가 100만 D 추가','각 50% → 소유자 없음'),('B가 10만 D 추가','B 약 52.38% → B 소유')],[760,792],41)
p.section('정확히 50%는 소유가 아닙니다','전체 누적 투자금에서 한 선장의 지분이 50%를 초과할 때만 소유합니다. 지분 1위여도 과반이 없으면 소유자가 아닙니다. 투자금은 지분 기록에 남습니다.',45)
p.section('기본 세율은 0%, 중립은 두 곳만','리스본·포르투만 중립을 보장합니다. 다른 기존·신규 일반 항구는 투자 대상입니다. 소유자는 선장별 세율과 블랙리스트를 관리하는 방향입니다.',45)
p.note('운영 추천: 선장별 세율 0~10%, 무소유 때 세금·이용 제한 해제, 필수 보급·입항·구조 보장. 원금 환급·지분 거래·배당은 별도 결정 사항입니다.')
records.append(p.save_page('ownership'))

p=new(7,'항구를 개발하고 해안에 정박','개발 비용 10배 반영 · 약탈 실패에는 파손과 손실')
p.table(['항구 개발 단계','비용'],[('새 항구 개척','2,000,000 D · 200만'),('교역소 확장','1,000,000 D · 100만'),('조선 서비스 확장','1,500,000 D · 150만')],[760,792],43)
p.section('검증된 후보지에서 내 항구 개발','실제 지명을 추천하고 표시 이름을 정할 수 있게 합니다. 개발 완료 때부터 개발 선장이 소유합니다. 일반 항구의 지분 경쟁을 개발 항구에 자동 적용하지는 않습니다.',44)
p.section('항구 밖에서도 보조 보급','지정된 해안에 정박해 보급하거나 창작 해적의 방치 보급품을 찾습니다. 보급은 지점당 24시간에 한 번, 최대 2일분·항구가의 1.5배를 추천합니다.',44)
p.heading('약탈 실패 손실 · 아래는 추천값')
p.table(['손실 종류','기본안'],[('선박 파손','최대 내구도의 15% 피해'),('현금','5% 손실 · 최대 500 D'),('교역품','수량 5% 내림 · 최대 3상자')],[550,1002],40)
p.note('실패 시 파손·재산 손실 적용은 확정 방향입니다. 내구도 0이면 방문 항구로 구조하고 손실은 중복 적용하지 않습니다. 성공 보상과 수리비 균형도 함께 조정합니다.')
records.append(p.save_page('development-coast'))

p=new(8,'배에 맞는 대포를 고르세요','대포 8종 × 품질 5등급 · 총 40조합 추천안')
p.heading('일반 I 기준 · 피해 / 명중 / 재장전')
p.table(['대포','피해','명중','재장전','무게'],[
('선회포','8','82%','6초','1'),('경량포','14','76%','9초','2'),('속사포 · 신규','10','72%','4초','2'),('표준 함포','22','70%','12초','3'),('장포','26','85%','20초','4'),('정밀 장포 · 신규','32','90%','22초','5'),('중포','42','58%','24초','6'),('대구경포 · 신규','60','50%','32초','8')],[565,215,265,292,215],37)
p.heading('품질이 오르면 성능과 가격도 상승')
p.table(['품질','피해','명중 보정','재장전'],[
('일반 I','×1.00','+0%p','×1.00'),('개량 II','×1.20','+4%p','×0.90'),('명품 III','×1.45','+8%p','×0.80'),('장인 IV','×1.70','+10%p','×0.72'),('명장 V','×2.00','+12%p','×0.65')],[475,315,415,347],36)
p.note('종류·품질은 선박 단계에 맞춰 해금합니다. 기존 포대 수·무게 한도는 유지하고 최종 명중률은 최대 95%입니다. 대포마다 재장전하며 빗나가도 대기시간이 생깁니다.')
records.append(p.save_page('cannons'))

p=new(9,'세 가지 방식으로 포격합니다','강화 결투 · 자유 공격 · 먼저 공격하지 않는 해적')
p.section('강화 결투 · 양쪽이 동의한 대결','신청과 수락으로 시작하고 결투 중 항해를 잠시 멈춥니다. 피해 ×1.5·명중 +10%p·재장전 ×0.7을 추천합니다. 강화는 해당 결투 동안만 적용합니다.',45)
p.section('자유 공격 · 시야 안 다른 선장','공격 가능한 선장을 동의 없이 공격할 수 있고 장비 기본 성능을 사용합니다. 정박·구조·오프라인 등 보호 상태의 공격은 제한하는 안입니다.',45)
p.section('해적 토벌 · 선장이 먼저 선택','해적은 선제공격하지 않습니다. 선장이 먼저 쏜 뒤 반격하는 방식과 처치 명성 보상을 추천합니다. 연안·교역로·대양 해적을 준비합니다.',45)
p.heading('전투 패배 손실 · 추천 기본안')
p.table(['항목','손실·지원'],[('돈 / 교역품','돈 10%·최대 2,000 D / 교역품 10%·최대 5상자'),('수리비','선단 평가액 2% · 최소 100 D·최대 3,000 D'),('자동 귀환','방문 항구로 구조 · 도착 후 보급 최소 2일')],[410,1142],39)
p.note('결투에도 손실이 있습니다. 시작 전에 확인하고 수락합니다. 돈이 없어도 구조하며 배를 영구 삭제하지 않습니다. 구조 중 발견·안개 개방은 차단합니다.')
records.append(p.save_page('combat'))

p=new(10,'더 편한 항해, 더 빠른 대결','전송 주기 분리 · 주사위장 · 단계별 개발')
p.table(['서버에 보내는 정보','전송 주기'],[('일반 항해 위치','2초'),('정지·접속 유지','30초'),('대결 표시 변경','최대 0.25초'),('발사·명중·승패 결과','행동이 발생하면 즉시')],[850,702],41)
p.para('일반 이동 전송은 기존 1.5초 대비 분당 40→30회로 이론상 약 25% 줄어듭니다. 화면에서는 부드럽게 연결합니다. 전체 다운로드의 25% 감소를 뜻하지는 않습니다.',43)
p.section('두카트로 즐기는 홀짝 주사위장','게임 자금만 사용합니다. 베팅 10~500 D, 맞히면 베팅액 포함 1.9배 지급을 추천합니다. 100 D를 걸면 총 190 D를 받고, 결과 확인 중 중복 실행을 막습니다.',44)
p.heading('개발은 다음 순서로 진행할 계획입니다')
for s in ['전송·지도 점검 → 탐험 거리·조사 팝업','항구·발견물 추가 → 배별 선단 성장','시장·대포 전투 통합 → 항구 운영·새 활동']:
    p.para(s,43,gap=16)
p.note('기존 기록을 보존하며 각 단계에서 저장·정산·PC/모바일 조작을 확인합니다. Firebase Spark와 GitHub Pages를 유지하는 방향이며 이번 안내는 구현·배포 전 계획입니다.')
records.append(p.save_page('network-roadmap'))

(OUT/'layout-check.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
manuscript=['# 바람의 항로 개발 예정 안내','2026-11-09 최신 결정 반영 / 아직 게임 적용 전']
for rec in records:
    manuscript.append('\n## '+rec['file']+' · '+rec['title'])
    manuscript.extend(b['text'] for b in rec['blocks'])
(OUT/'announcement-text.md').write_text('\n\n'.join(manuscript),encoding='utf-8')
cards=''.join(f'<section><h2>{i:02d} · {escape(r["title"])}</h2><a href="{r["file"]}" target="_blank"><img src="{r["file"]}" loading="lazy" alt="{escape(r["title"])}"></a><p><a href="{r["file"]}" download>이 JPG 저장</a></p></section>' for i,r in enumerate(records,1))
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>바람의 항로 개발 예정 안내 JPG</title><style>body{margin:0;background:#eeeade;color:#214e56;font:17px/1.7 Malgun Gothic,system-ui,sans-serif}main{max-width:1040px;padding:30px 18px;margin:auto}section{margin:30px 0}img{display:block;width:100%;height:auto;border:1px solid #cec8b4;border-radius:7px}a{color:#286d76}h1{font-size:34px}header{padding:20px;background:#fff9ed;border-radius:10px}.button{display:inline-block;background:#286d76;color:#fff9ed;padding:12px 18px;border-radius:6px;text-decoration:none}h2{font-size:22px}</style><main><header><h1>바람의 항로 · 개발 예정 안내</h1><p>2026.11.09 최신 결정 · JPG 10장 · 아직 게임에 적용되지 않았습니다.</p><p>지분 50% 초과 소유, 항구 비용 10배, 기본 세율 0%, 일반 위치 전송 2초를 반영했습니다. 추천값은 각 장에 따로 표시했습니다.</p><a class="button" href="windward-development-plan-10-jpg.zip">JPG 10장 전체 다운로드</a></header>'''+cards+'</main></html>'
(OUT/'index.html').write_text(page,encoding='utf-8')
with zipfile.ZipFile(OUT/'windward-development-plan-10-jpg.zip','w',zipfile.ZIP_DEFLATED) as z:
    for r in records:z.write(OUT/r['file'],r['file'])
    z.write(OUT/'announcement-text.md','announcement-text.md')
    z.write(OUT/'index.html','index.html')
with zipfile.ZipFile(OUT/'windward-development-plan-10-jpg.zip') as z:
    assert z.testzip() is None
    assert sum(x.endswith('.jpg') for x in z.namelist())==10
for r in records:
    with Image.open(OUT/r['file']) as im:im.verify()
# Separate contact sheet for visual QA only. Deliverables remain full resolution.
sheet=Image.new('RGB',(1500,5*465),'#e9e4d9');d=ImageDraw.Draw(sheet)
for i,r in enumerate(records):
    with Image.open(OUT/r['file']) as src:
        thumb=src.copy();thumb.thumbnail((300,425))
        x=(i%5)*300;y=(i//5)*465
        sheet.paste(thumb,(x,y));d.text((x+8,y+430),r['file'],font=g.font(17),fill=g.INK)
qa=ROOT/'.qa';qa.mkdir(exist_ok=True)
sheet.crop((0,0,1500,930)).save(qa/'development-announcement-contact.jpg',quality=90)
print(json.dumps([{'file':r['file'],'bottom':r['contentBottom']} for r in records],ensure_ascii=False))
