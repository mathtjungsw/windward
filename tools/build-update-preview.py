"""Build shareable predevelopment plan JPEGs from the approved planning text."""
import importlib.util
import json
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design-previews" / "2026-11-06-market-combat"
spec = importlib.util.spec_from_file_location("guide", ROOT / "tools/build-player-guide.py")
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
OUT.mkdir(parents=True, exist_ok=True)

class PlanPoster(g.Poster):
    def __init__(self, number, title, subtitle):
        super().__init__(number, title, subtitle)
        self.d.rectangle((g.RIGHT-270, 85, g.RIGHT+5, 153), fill=g.PAPER)
        self.d.text((g.RIGHT-245, 104), f"PLAN {number:02d} / 06", font=g.font(28), fill=g.MUTED)
        self.note("개선 예정 안내 · 개발 전 계획입니다. 세부 수치는 조정될 수 있습니다.")
        self.y += 15

    def save_plan(self, slug):
        self.d.line((g.LEFT, g.H-133, g.RIGHT, g.H-133), fill=g.LINE, width=2)
        self.d.text((g.LEFT, g.H-105), "바람의 항로 · 참여자용 개선 계획", font=g.font(27), fill=g.MUTED)
        self.d.text((g.LEFT, g.H-63), "2026.11.06 계획 · 아직 게임에 적용되지 않았습니다", font=g.font(24), fill=g.BRASS)
        if self.y > g.H-150:
            raise ValueError(f"Page {self.n} overflows: {self.y}")
        filename=f"plan-{self.n:02d}-{slug}.jpg"
        self.im.save(OUT/filename, "JPEG", quality=95, subsampling=0, optimize=True)
        return {"file":filename,"width":g.W,"height":g.H,"contentBottom":self.y,"blocks":self.records}

records=[]
p=PlanPoster(1,"새로운 항해를 준비합니다","함께 움직이는 시장 · 배에 싣는 대포 · 세 가지 전투")
g.scene(p, g.LEFT, p.y, g.RIGHT-g.LEFT, 360)
p.y += 395
p.section("01  거래할수록 달라지는 시세", "한 항구에서 많이 사면 가격이 오르고, 많이 팔면 내려갑니다. 실제 시간이 지나면 기준 시세로 회복하며 모든 선장의 거래를 함께 반영할 계획입니다.",42)
p.section("02  선박에 맞춰 대포 장착", "대포 5종류와 품질 3등급을 준비합니다. 선박이 성장하면 더 다양한 대포와 더 많은 포대를 실을 수 있습니다.",42)
p.section("03  결투 · 자유 공격 · 해적 토벌", "동의한 선장끼리 강화 결투, 시야 안 선장 자유 공격, 해적 처치와 명성 획득을 계획합니다. 해적의 선제공격은 금지합니다.",42)
p.note("패배에는 수리비·방문 항구 귀환·일부 약탈이 적용될 예정입니다. 상세 추천 수치는 뒤쪽 안내를 확인해 주세요.")
records.append(p.save_plan("overview"))

p=PlanPoster(2,"실제 시간으로 바뀌는 시세","개인 항해 날짜와 관계없이 같은 서버의 시장을 공유")
p.section("사면 오르고, 팔면 내려갑니다", "항구·상품별 거래량에 따라 가격이 움직입니다. 리스본 와인의 거래는 리스본 와인 시세에 반영됩니다. 다른 항구와 다른 상품은 각각 계산합니다.",43)
p.heading("시세 조정의 추천 수치")
for label,value in [("한 상자 구매", "+0.1%p"),("한 상자 판매", "−0.1%p"),("거래 압력의 최대 범위", "기준 시세 대비 ±30%"),("자연 회복", "현실 1분마다 1.5%p"),("최대 변동에서 정상까지", "추가 거래 없이 20분")]:
    p.para(label+"  ·  "+value,42,gap=16)
p.section("100상자 거래했다면", "기준 상태에서 100상자를 사면 약 +10%, 팔면 약 −10%의 압력이 생깁니다. 추가 거래가 없으면 6분 40초 후 압력이 0으로 돌아옵니다.",42)
p.section("총액을 확인하고 확정하세요", "대량 거래 도중에도 상자별 가격이 달라집니다. 확인창에서 총액·평균 단가·거래 뒤 예상 가격을 봅니다. 다른 선장 때문에 견적이 바뀌면 새 금액을 다시 확인합니다.",42)
p.note("로그아웃·정박 중에도 현실 시간은 흐릅니다. 정상 시세 자체도 현실 24시간 주기로 작게 변동하는 추천안입니다.")
records.append(p.save_plan("market"))

p=PlanPoster(3,"대포마다 다른 선택의 재미","5종류 × 품질 3등급 · 아래 수치는 추천 기본안")
p.heading("일반 I 기준의 대포 성능")
cols=[g.LEFT,g.LEFT+405,g.LEFT+645,g.LEFT+940,g.LEFT+1220]
p.d.rounded_rectangle((g.LEFT,p.y,g.RIGHT,p.y+66),radius=8,fill=g.TEAL)
for x,t in zip(cols,["종류","피해","명중률","재장전","무게"]):p.d.text((x+12,p.y+10),t,font=g.font(36,True),fill=g.PAPER)
p.y+=70
for i,row in enumerate([("선회포","8","82%","6초","1"),("경량포","14","76%","9초","2"),("표준 함포","22","70%","12초","3"),("장포","26","85%","20초","4"),("중포","42","58%","24초","6")]):
    p.d.rectangle((g.LEFT,p.y,g.RIGHT,p.y+86),fill=g.PALE if i%2==0 else g.PAPER)
    for x,t in zip(cols,row):p.d.text((x+12,p.y+18),t,font=g.font(38),fill=g.INK)
    p.y+=86
p.y+=30
p.section("일반 I → 개량 II → 명품 III", "품질을 올리면 피해·명중률·재장전 성능이 좋아집니다. 개량 II는 피해 ×1.20·명중 +4%p·재장전 ×0.90, 명품 III는 ×1.45·+8%p·×0.80을 추천합니다.",42)
p.section("명중은 매 발마다 확률로", "표시 명중률에 따라 명중과 빗나감을 결정합니다. 70% 대포도 연속으로 빗나갈 수 있습니다. 여러 포대의 일제사격은 각각 판정합니다.",42)
p.section("빗나가도 재장전은 필요합니다", "발사한 포대마다 현실 시간 기준 대기시간이 생깁니다. 준비된 포대만 다시 쏠 수 있고, 재접속해도 남은 시간을 이어갑니다.",42)
p.note("선회포는 빠른 연사, 장포는 높은 명중률, 중포는 강한 한 발에 초점을 둡니다. 종류별 장단점을 비교해 장착하세요.")
records.append(p.save_plan("cannons"))

p=PlanPoster(4,"배가 커지면 포대도 늘어납니다","한 척 기준 탑재표 · 포대 수와 무게를 함께 검사")
p.heading("20단계 선박의 추천 탑재 한도")
cols=[g.LEFT,g.LEFT+120,g.LEFT+650,g.LEFT+795,g.LEFT+945,g.LEFT+1420]
headers=["단계","선박","포대","무게","허용 대포","품질"]
p.d.rectangle((g.LEFT,p.y,g.RIGHT,p.y+55),fill=g.TEAL)
for x,t in zip(cols,headers):p.d.text((x+5,p.y+9),t,font=g.font(30,True),fill=g.PAPER)
p.y+=58
shipnames=[r[0] for r in g.SHIP_ROWS]
limits=[(0,0,"없음","—"),(0,0,"없음","—"),(0,0,"없음","—"),(1,1,"선회포","I"),(1,2,"경량포까지","I"),(2,3,"경량포까지","I"),(2,5,"표준 함포까지","I"),(2,6,"표준 함포까지","II"),(3,8,"표준 함포까지","II"),(3,10,"장포까지","II"),(3,12,"장포까지","II"),(4,14,"장포까지","III"),(4,18,"전 종류","III"),(5,22,"전 종류","III"),(5,26,"전 종류","III"),(6,30,"전 종류","III"),(6,34,"전 종류","III"),(7,38,"전 종류","III"),(7,42,"전 종류","III"),(8,48,"전 종류","III")]
for i,(name,limit) in enumerate(zip(shipnames,limits)):
    p.d.rectangle((g.LEFT,p.y,g.RIGHT,p.y+52),fill=g.PALE if i%2==0 else g.PAPER)
    for x,t in zip(cols,[str(i+1),name,str(limit[0]),str(limit[1]),limit[2],limit[3]]):p.d.text((x+5,p.y+8),t,font=g.font(29),fill=g.INK)
    p.y+=52
p.y+=30
p.section("기함과 동행 배에 각각 장착", "포대는 각 배에 따로 구입해 장착합니다. 무게 1은 화물 1칸을 사용합니다. 20단계 배 5척이면 최대 40포대가 되는 추천안입니다.",41)
p.note("대포 구매·장착·해제·품질 개량은 항구에서 진행합니다. 표시 한도는 개발 중 조정될 수 있습니다.")
records.append(p.save_plan("ship-limits"))

p=PlanPoster(5,"세 가지 방식으로 포격합니다","결투는 강화 성능 · 자유 공격과 해적전은 장비 기본 성능")
p.section("강화 결투 · 서로 동의한 대결", "상대에게 결투를 신청하고 양쪽이 수락하면 시작합니다. 피해 ×1.5·명중률 +10%p·재장전 ×0.7을 추천합니다. 강화는 해당 결투 동안만 적용합니다.",44)
p.section("자유 공격 · 시야 안의 선장", "시야 안의 공격 가능한 다른 선장을 동의 없이 공격할 수 있습니다. 장착 대포의 기본 명중률을 사용합니다. 정박·구조·접속 종료·전투 직후 보호 중에는 공격을 막는 안입니다.",44)
p.section("해적 토벌 · 내가 먼저 선택", "해적은 먼저 공격하지 않습니다. 선장이 첫 공격을 한 뒤 반격하는 방식을 추천합니다. 연안·교역로·대양 해적을 처치하면 각각 50·150·400 명성을 주는 안입니다.",44)
p.section("공격과 재장전 상태를 한눈에", "상대 HP·내 HP·준비된 포대 수·남은 재장전 시간을 작은 접이식 패널에 표시합니다. 준비된 포대 일제사격과 개별 포대 선택을 계획합니다.",44)
p.note("사용자 확정 방향은 세 모드 모두 제공, 결투 강화, 자유 공격 기본 명중률, 해적 처치 명성과 선제공격 금지입니다. 표의 배율·보상 수치는 추천안입니다.")
records.append(p.save_plan("combat-modes"))

p=PlanPoster(6,"승패와 손실을 알고 출항하세요","패배 시 수리비 · 방문 항구 귀환 · 일부 금품 손실")
p.section("돈과 화물 일부만 약탈 대상", "추천안은 보유 돈의 10%·최대 2,000 D, 교역품 수량의 10%를 내림해 최대 5상자입니다. 결투도 손실 규칙을 확인하고 수락합니다. 해적에게 패배하면 같은 한도의 금품 손실을 기록합니다.",42)
p.section("수리비를 내고 방문 항구로 귀환", "선단 평가액의 2%·최소 100 D·최대 3,000 D를 추천합니다. 가진 돈만큼만 내며, 돈이 없어도 실제 방문한 항구로 돌아옵니다. 도착하면 수리하고 보급을 최소 2일분 지원합니다.",42)
p.section("승리 보상과 명성", "선장 간 전투의 승자는 약탈 금품을 받습니다. 해적 처치에는 명성을 지급합니다. 발견 명성과 전투 명성을 구분해 보여주고 합산 순위를 제공하는 추천안입니다.",42)
p.section("먼저 개발할 순서", "공동 시장과 안전한 저장 → 대포 장착 → 강화 결투 → 자유 공격과 약탈 정산 → 해적 토벌과 명성 → 전체 검증과 배포 순서로 계획했습니다.",42)
p.note("이 안내는 참여자에게 보여드리는 개발 전 계획입니다. 현재 게임 기능·배포 완료 공지가 아닙니다. 손실 비율·배율·시간·가격은 개발 검증 후 조정될 수 있습니다.")
records.append(p.save_plan("defeat-and-roadmap"))

(OUT/"layout-check.json").write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding="utf8")
text=["# 참여자용 개선 계획 JPG 원고", "개발 전 계획 · 수치는 추천안 · 2026-11-06", "기준 문서 DEVELOPMENT_PLAN.md / docs/SHARED_MARKET_PLAN_2026-11-06.md"]
for rec in records:
    text.append("\n## "+rec["file"])
    text.extend(block["text"] for block in rec["blocks"])
(OUT/"PARTICIPANT_PLAN_TEXT.md").write_text("\n\n".join(text),encoding="utf8")
for rec in records:print(rec["file"],rec["contentBottom"])
