"""Render the Korean Windward player guide as ten standalone JPEG posters.

No game state or network is read. Use --final after checking the deployed rules.
Text is typeset natively for exact Korean wording; original project SVGs are rendered
with MuPDF when present, otherwise the guide's own vector-like drawing is used.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import re
from pathlib import Path
import subprocess
from functools import lru_cache
import zipfile

from PIL import Image, ImageDraw, ImageFont
import qrcode

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "player-guide" / "2026-11-09"
W, H = 1800, 2550
LEFT, RIGHT = 124, 1676
INK = "#214E56"
MUTED = "#526D6D"
TEAL = "#286D76"
PAPER = "#FFF9ED"
PALE = "#ECF4EE"
SEA = "#D3EAE8"
BRASS = "#A27C3C"
LINE = "#D4D9C8"
URL = "https://mathtjungsw.github.io/windward/"
FONT = Path("C:/Windows/Fonts/NotoSansKR-VF.ttf")
SERIF = Path("C:/Windows/Fonts/NotoSerifKR-VF.ttf")
BOLD = Path("C:/Windows/Fonts/malgunbd.ttf")

SHIP_ROWS = [
    ("통나무 뗏목",80,20,10,0),("돛 달린 뗏목",84,24,11,600),
    ("보강 뗏목",88,28,12,900),("소형 노젓는 배",92,32,14,1500),
    ("소형 교역 돛배",96,40,16,2200),("단돛 교역선",100,46,18,3200),
    ("연안 교역선",106,54,20,4500),("개량 연안선",112,62,22,6200),
    ("쌍돛 연안선",118,70,25,8500),("항해 캐러벨",124,78,30,11500),
    ("개량 캐러벨",130,86,34,15000),("대형 캐러벨",136,94,38,19500),
    ("소형 카락",142,102,42,25000),("교역 카락",148,110,48,32000),
    ("대형 카락",154,120,54,41000),("원양 교역선",160,132,65,52000),
    ("교역 갤리온",168,146,70,66000),("대형 갤리온",176,160,75,83000),
    ("원양 대형 범선",184,176,80,104000),("명장의 교역 범선",192,192,90,130000),
]

@lru_cache(maxsize=90)
def font(size, bold=False, serif=False):
    face=ImageFont.truetype(str(SERIF if serif else BOLD if bold else FONT), size)
    if serif or not bold:
        try:face.set_variation_by_axes([500 if serif else 400])
        except (AttributeError,OSError):pass
    return face

def lines(draw, text, f, width):
    """Wrap on spaces first, splitting an overlong word only when unavoidable."""
    result=[]
    for paragraph in text.split("\n"):
        if not paragraph:
            result.append("")
            continue
        current=""
        for word in paragraph.split(" "):
            proposed=(current+" "+word).strip()
            if draw.textlength(proposed,font=f)<=width:
                current=proposed
                continue
            if current:
                result.append(current)
                current=""
            if draw.textlength(word,font=f)<=width:
                current=word
            else:
                for ch in word:
                    if current and draw.textlength(current+ch,font=f)>width:
                        result.append(current)
                        current=ch
                    else:
                        current+=ch
        result.append(current)
    return result

class Poster:
    def __init__(self,n,title,subtitle,final=False):
        self.im=Image.new("RGB",(W,H),PAPER)
        self.d=ImageDraw.Draw(self.im)
        self.n=n;self.final=final;self.records=[]
        for x in range(-500,W+500,300):
            self.d.arc((x,2050,x+1000,2950),185,325,fill="#ECEAD9",width=2)
        self.d.line((LEFT,75,RIGHT,75),fill=BRASS,width=3)
        self.d.text((LEFT,104),"WINDWARD  /  바람의 항로",font=font(29,bold=True),fill=BRASS)
        self.d.text((RIGHT-210,104),f"GUIDE  {n:02d} / 10",font=font(28),fill=MUTED)
        title_face=font(83,serif=True)
        if self.d.textlength(title,font=title_face)>RIGHT-LEFT:
            raise ValueError(f"Page {n} title exceeds content width")
        self.d.text((LEFT,173),title,font=title_face,fill=INK)
        self.text(subtitle,LEFT,304,RIGHT-LEFT,39,MUTED,1.45)
        self.y=404

    def text(self,text,x,y,width,size=46,color=INK,spacing=1.5,bold=False):
        f=font(size,bold=bold)
        out=lines(self.d,text,f,width)
        lh=round(size*spacing)
        for i,line in enumerate(out):
            self.d.text((x,y+i*lh),line,font=f,fill=color)
        bottom=y+len(out)*lh
        if bottom>H-154:
            raise ValueError(f"Page {self.n} text exceeds content area: {text[:35]} bottom={bottom}")
        self.records.append({"text":text,"x":x,"y":y,"width":width,"size":size,"bottom":bottom})
        return bottom

    def heading(self,label):
        self.d.rectangle((LEFT,self.y+13,LEFT+8,self.y+58),fill=TEAL)
        self.y=self.text(label,LEFT+30,self.y,RIGHT-LEFT-30,51,INK,1.35,True)+19

    def para(self,text,size=46,color=INK,gap=27):
        self.y=self.text(text,LEFT,self.y,RIGHT-LEFT,size,color)+gap

    def section(self,label,text,size=45):
        self.heading(label);self.para(text,size)

    def note(self,text):
        f=font(40)
        wrapped=lines(self.d,text,f,RIGHT-LEFT-70)
        height=len(wrapped)*59+52
        self.d.rounded_rectangle((LEFT,self.y,RIGHT,self.y+height),radius=20,fill=PALE)
        self.y=self.text(text,LEFT+35,self.y+22,RIGHT-LEFT-70,40,MUTED,1.47)+35

    def divider(self):
        self.d.line((LEFT,self.y,RIGHT,self.y),fill=LINE,width=2);self.y+=30

    def save(self,slug):
        self.d.line((LEFT,H-133,RIGHT,H-133),fill=LINE,width=2)
        self.d.text((LEFT,H-105),"바람의 항로 · 플레이 안내",font=font(27),fill=MUTED)
        self.d.text((RIGHT-720,H-105),"mathtjungsw.github.io/windward/",font=font(27),fill=MUTED)
        if not self.final:
            self.d.text((LEFT,H-63),"개발 검수용 · 구현 완료 후 최종 규칙과 대조",font=font(24),fill=BRASS)
        else:
            self.d.text((LEFT,H-63),"2026.11.09 업데이트 안내 · 수치는 게임 내 표시를 함께 확인하세요",font=font(24),fill=BRASS)
        path=OUT/f"{self.n:02d}-{slug}.jpg"
        self.im.save(path,"JPEG",quality=95,subsampling=0,optimize=True,dpi=(180,180))
        return {"file":path.name,"size":[W,H],"contentBottom":max([r["bottom"] for r in self.records] or [0]),"blocks":self.records}

def art(p,path,box,scene_overlay=False):
    """Rasterize original repo SVG artwork directly; never a PDF intermediate."""
    file=ROOT/"dist"/path
    if not file.exists():return False
    try:
        import pymupdf
        svg=file.read_text(encoding="utf8")
        # MuPDF does not support the SVG pattern/gradient background fully.
        # Render equivalent flat original-art background, not black fallback.
        svg=re.sub(r'<rect\b[^>]*fill="url\(#[^"]*-dots\)"[^>]*/>', '', svg)
        svg=re.sub(r'fill="url\(#[^"]+\)"', 'fill="#eef8f4"', svg)
        if scene_overlay:
            svg=re.sub(r'<rect x="0" y="0" width="640" height="480"[^>]*/>', '', svg)
            svg=re.sub(r'<path d="M0 315[^\"]+"[^>]*/>', '', svg)
        doc=pymupdf.open(stream=svg.encode("utf8"),filetype="svg")
        page=doc[0]
        scale=min(box[2]/page.rect.width,box[3]/page.rect.height)
        pix=page.get_pixmap(matrix=pymupdf.Matrix(scale,scale),alpha=True)
        image=Image.frombytes("RGBA",[pix.width,pix.height],pix.samples)
        p.im.paste(image,(box[0]+(box[2]-pix.width)//2,box[1]+(box[3]-pix.height)//2),image)
        return True
    except Exception as e:
        print(f"Artwork fallback: {file.name}: {e}")
        return False

def boat(p,x,y,w=420,tier=0,native=False):
    if not native and art(p,f"assets/ships/ship-{tier+1:02d}.svg",(x,y,w,int(w*.75))):return
    d=p.d;h=int(w*.52)
    d.ellipse((x,y+h*.72,x+w,y+h*1.05),fill=SEA)
    if tier<3:
        for i in range(6):
            xx=x+w*(.18+.105*i)
            d.rounded_rectangle((xx,y+h*.28,xx+w*.11,y+h*.87),radius=18,fill="#BA9864",outline="#775F3F",width=3)
        d.line((x+w*.12,y+h*.44,x+w*.87,y+h*.44),fill="#E4CB94",width=7)
        d.line((x+w*.12,y+h*.7,x+w*.87,y+h*.7),fill="#E4CB94",width=7)
        d.line((x+w*.35,y+h*.18,x+w*.85,y+h*.98),fill="#775F3F",width=8)
        if tier>0:
            d.line((x+w*.52,y+10,x+w*.52,y+h*.65),fill=INK,width=5)
            d.polygon([(x+w*.5,y+20),(x+w*.22,y+h*.48),(x+w*.5,y+h*.48)],fill="#FFF6D9",outline=INK)
    else:
        d.polygon([(x+22,y+h*.63),(x+w-15,y+h*.58),(x+w*.75,y+h*.89),(x+w*.22,y+h*.92)],fill="#A87E4E",outline=INK)
        masts=2 if tier<12 else 3
        for i in range(masts):
            xx=x+w*(.3+.25*i)
            d.line((xx,y+5,xx,y+h*.67),fill=INK,width=5)
            d.polygon([(xx-7,y+12),(xx-w*.21,y+h*.52),(xx-7,y+h*.52)],fill="#FFF5D6",outline=INK)

def scene(p,x,y,w,h):
    d=p.d
    d.rounded_rectangle((x,y,x+w,y+h),radius=26,fill=SEA)
    land=[(x+w*.68,y),(x+w,y),(x+w,y+h),(x+w*.6,y+h),(x+w*.64,y+h*.75),(x+w*.58,y+h*.5),(x+w*.66,y+h*.24)]
    d.polygon(land,fill="#E8DFB7")
    for i in range(1,5):
        d.line((x+w*i/5,y+15,x+w*i/5,y+h-15),fill="#BDD8D5",width=2)
    for i in range(1,4):d.line((x+15,y+h*i/4,x+w-15,y+h*i/4),fill="#BDD8D5",width=2)
    for label,xx,yy in [("포르투",.66,.25),("리스본",.61,.73)]:
        d.ellipse((x+w*xx-10,y+h*yy-10,x+w*xx+10,y+h*yy+10),fill=BRASS,outline=PAPER,width=4)
        d.text((x+w*xx+18,y+h*yy-25),label,font=font(32,bold=True),fill=INK)
    for i in range(12):
        yy=y+h*.26+i*h*.035;xx=x+w*.56-i*w*.009
        d.ellipse((xx,yy,xx+6,yy+6),fill=TEAL)
    if not art(p,"assets/ships/ship-01.svg",(x+120,y+15,500,375),scene_overlay=True):
        boat(p,x+int(w*.16),y+int(h*.26),int(w*.25),0,True)

def page1(final):
    p=Poster(1,"당신의 첫 항로를 시작하세요","세계지도에서 항해하고, 교역하고, 발견을 그림으로 모으는 게임",final)
    scene(p,LEFT,p.y,RIGHT-LEFT,420);p.y+=457
    p.section("01  Google로 로그인", "공개 게임 주소를 열고 Google 계정으로 로그인하세요. 처음에는 게임에서 사용할 선장 이름을 정합니다. 현실서버 하나에 자동으로 연결됩니다.")
    p.section("02  리스본의 뗏목에서 출발", "새 선장은 2,400 D, 통나무 뗏목 1척, 보급 10일분으로 시작합니다. 처음 아는 항구는 리스본·포르투·세비야입니다. D는 게임 속 돈인 두카트입니다.")
    p.section("03  첫 교역을 해보세요", "리스본에서 와인을 조금 사고, 포르투를 선택해 출항하세요. 실제 입항을 마친 뒤 화물창에서 판매하면 첫 거래 의뢰를 진행할 수 있습니다. 출항 전 목적지와 보급을 확인하세요.")
    p.note("항구 78곳과 9개 강 수로를 탐험합니다. 여러 시대의 전통 교역을 모은 게임이며, 지도·성능·가격은 플레이를 위해 단순화한 설정입니다.")
    return p

def page2(final):
    p=Poster(2,"원하는 방식으로 항해하세요","자동 항해와 직접 조종 · PC와 모바일 모두 지원",final)
    p.section("자동 항해", "알고 있는 항구를 선택하고 예상 항해 시간·필요 보급·도착 잔량을 확인한 뒤 출항합니다. 배는 육지를 피해 경로를 따라갑니다. 강에서는 연결된 수로를 따라 이동합니다.")
    p.heading("직접 조종")
    keys=[("W / ↑","위"),("A / ←","왼쪽"),("S / ↓","아래"),("D / →","오른쪽")]
    for i,(key,label) in enumerate(keys):
        xx=LEFT+i*388
        p.d.rounded_rectangle((xx,p.y,xx+350,p.y+125),radius=18,fill=PALE)
        p.d.text((xx+30,p.y+19),key,font=font(42,bold=True),fill=TEAL)
        p.d.text((xx+30,p.y+75),label,font=font(29),fill=MUTED)
    p.y+=154
    p.para("PC는 방향키 또는 WASD로 조종하고 바다를 클릭해 이동할 수 있습니다. 모바일은 방향 버튼을 누르거나 바다 터치 후 이동을 확정합니다. ■ 또는 Space로 정지하세요.")
    p.section("지도를 둘러보고 내 배로 돌아오기", "메인 화면은 확대·축소 없는 평면 해도입니다. 드래그로 주변을 살펴보고 ‘내 배 위치’로 돌아옵니다. 세계지도는 지구본과 평면 중 고릅니다. 클릭하면 화면만 이동합니다. ‘내 배 보기’는 선박 상세를 여는 별도 버튼입니다.")
    p.section("화면이 복잡하면 접으세요", "정보창 제목 옆 − 접기를 누르면 줄어들고 + 펼치기로 다시 엽니다. 사용자가 접은 상태를 기억합니다. 모바일 하단 바로가기로 항해·항구·화물·더보기에 접근하세요.")
    p.note("채팅이나 수량을 입력할 때에는 항해 키가 배를 움직이지 않습니다. 설명창을 닫은 뒤에도 이전에 누르던 방향으로 갑자기 출항하지 않도록 조작 상태를 정리합니다.")
    return p

def page3(final):
    p=Poster(3,"잘 사고, 잘 팔고, 보급하세요","화물과 식량이 같은 배를 나누어 씁니다",final)
    p.section("교역은 실제 입항한 항구에서", "항구마다 지역 공급·수입·중계 품목과 가격이 다릅니다. 다른 항구의 시세를 보고 있어도 판매 가격은 실제 정박지 기준입니다. 항해 중에는 교역할 수 없습니다.")
    p.section("수량과 남는 공간을 확인", "1·5·10·최대 수량을 고르고 총액·거래 후 잔액·적재량을 확인하세요. 판매 한 건은 전량 같은 시작 단가입니다. 수량만큼 다음 시세에 반영하고, 현실 시간이 지나면 가격 압력이 회복됩니다.")
    p.heading("처음 배의 적재 예시")
    x=LEFT;y=p.y;unit=(RIGHT-LEFT)/20
    for i in range(20):
        fill=BRASS if i<5 else "#A7CDC4"
        p.d.rounded_rectangle((x+i*unit,y,x+(i+1)*unit-7,y+94),radius=8,fill=fill)
    p.y+=124
    p.para("뗏목 총 20칸 = 보급 10일분에 5칸 + 화물 최대 15칸. 상품을 가득 사면 보급할 공간이 줄어듭니다. 배가 여러 척이면 같은 일수의 보급에도 더 많은 공간과 돈이 필요합니다.")
    p.section("보급의 ‘일’은 게임 속 항해일", "게임 속 항해 1일은 실제 활성 항해 약 2초입니다. 같은 항로라면 자동·직접 조종의 보급 소모는 같습니다. 정박·정지·일시 정지·숨겨진 탭·로그아웃 중에는 보급을 소모하지 않습니다.")
    p.section("항구에서 채우고 예비량 남기기", "선박·보급에서 +1일 또는 가득 채우기를 고릅니다. 자동 출항에는 도착 뒤 쓸 예비 보급도 필요합니다. 부족하다는 안내가 나오면 가까운 중간 항구를 고르세요. 보급을 내려 비현금 크레딧으로 보관할 수도 있습니다.")
    p.note("선박 개량은 최대 보급 한도를 늘립니다. 현재 보급을 공짜로 가득 채우지는 않으므로, 개량 뒤에는 항구에서 필요한 양을 다시 보급하세요.")
    return p

def page4(final):
    p=Poster(4,"뗏목이 거대한 선단이 되기까지","20단계 개량 · 기함을 조종하면 동행 배도 함께 이동",final)
    xs=[LEFT+25,LEFT+400,LEFT+775,LEFT+1150]
    for xx,tier,label in zip(xs,[0,4,9,19],["1 · 뗏목","5 · 교역 돛배","10 · 캐러벨","20 · 명장의 범선"]):
        boat(p,xx,p.y,280,tier)
        p.d.text((xx,p.y+208),label,font=font(29,bold=True),fill=INK)
    p.y+=250
    p.heading("한 척 기준의 단계별 기본 성능")
    columns=[LEFT,LEFT+110,LEFT+700,LEFT+970,LEFT+1235]
    p.d.rounded_rectangle((LEFT,p.y,RIGHT,p.y+65),radius=10,fill=TEAL)
    for xx,label in zip(columns,["단계","선박","속도·해리/일","적재·칸","보급·일"]):p.d.text((xx+12,p.y+10),label,font=font(32,bold=True),fill=PAPER)
    p.y+=65
    for i,(name,speed,cap,food,cost) in enumerate(SHIP_ROWS):
        if i%2==0:p.d.rectangle((LEFT,p.y,RIGHT,p.y+42),fill=PALE)
        vals=[str(i+1),name,str(speed),str(cap),str(food)]
        for xx,value in zip(columns,vals):p.d.text((xx+12,p.y+2),value,font=font(29),fill=INK)
        p.y+=42
    p.y+=27
    p.section("배를 더 추가하면", "6·10·14·18단계에서 각각 2·3·4·5척까지 보유할 수 있습니다. 정박 중 배를 구매해 추가하며, 배마다 개별 개량하며, 같은 단계 선단은 일괄 개량도 됩니다. 가장 느린 배가 속도·외해 허용도·보급 한도를 정합니다. 지도와 ‘내 배 보기’의 외형도 바뀝니다.",40)
    p.section("식량과 자금도 함께 준비", "추가 배는 빈 보급 상태로 합류합니다. 1척·10일분에서 2척이 되면 같은 식량은 선단 5일분이 됩니다. 개량·추가 비용과 바뀌는 성능은 확정 전에 화면에서 확인하세요.",40)
    p.note("과거 뗏목 시작 전환 보상은 한 번만 적용됩니다. 이번 업데이트는 보유한 배와 개량 단계를 배별 목록으로 이어받습니다. 화물·탐험·수집 기록은 보존합니다.")
    return p

def page5(final):
    p=Poster(5,"세상을 밝히고 그림을 모으세요","지도 탐험 점수와 발견 명성은 서로 다른 기록입니다",final)
    p.section("안개를 밝히면 지도 탐험 점수", "정상 항해로 처음 밝힌 해도 영역이 쌓입니다. 같은 곳을 반복해도 점수가 늘지 않습니다. 면적을 반영한 탐험 점수는 최대 1,000,000점이며 지도 개방률도 함께 볼 수 있습니다. 새 항구는 80해리 안으로 접근해 정보를 얻고, 실제 입항하면 방문 기록에 남습니다.")
    p.heading("40개의 발견물, 네 가지 수집")
    samples=[("ruin-rapanui","유적"),("relic-compass","유물"),("animal-hector","희귀 동물"),("treasure-gulf","보물")]
    for i,(fid,label) in enumerate(samples):
        xx=LEFT+i*388
        p.d.rounded_rectangle((xx,p.y,xx+350,p.y+315),radius=20,fill=PALE)
        if not art(p,f"assets/discoveries/{fid}.svg",(xx+8,p.y+4,334,248)):
            p.d.ellipse((xx+95,p.y+45,xx+255,p.y+205),fill=SEA,outline=TEAL,width=4)
            p.d.text((xx+148,p.y+85),"?",font=font(70,serif=True),fill=TEAL)
        p.d.text((xx+55,p.y+258),label,font=font(37,bold=True),fill=INK)
    p.y+=345
    p.para("유적 10종·유물 14종·희귀 동물 8종·보물 8종입니다. 항구뿐 아니라 해변·강변·섬·바다에 흩어져 있습니다. 발견한 그림과 설명은 수집 도감에 남고, 아직 못 찾은 항목은 가려집니다.")
    p.heading("난도가 높을수록 높은 명성")
    for i,(label,value) in enumerate([("쉬움","50"),("보통","150"),("어려움","400"),("매우 어려움","1,000")]):
        xx=LEFT+i*388
        p.d.text((xx+10,p.y),label,font=font(34),fill=MUTED)
        p.d.text((xx+10,p.y+57),value,font=font(62,bold=True),fill=TEAL)
    p.y+=165
    p.section("소문을 읽고 가까이에서 조사", "항구 주점의 무료 ‘탐험 소문’에서 단서를 얻으세요. 어려운 발견에는 단서가 필요합니다. 소문 조건을 갖추고 100해리 안에 들면 큰 팝업이 뜹니다. 같은 바닷길의 60해리 안에서 ‘조사하기’를 누릅니다. 빠르게 지나쳤다면 조사 지점 이동 안내를 이용하세요.")
    p.note("각 발견물은 계정당 한 번만 명성을 줍니다. 40종을 모두 모으면 발견 명성 15,600점입니다. 다른 선장이 먼저 찾아도 나도 수집할 수 있습니다. 유적·동물은 관찰 기록을 모으며 실물 판매나 추가 두카트 보상은 없습니다.")
    return p

def page6(final):
    p=Poster(6,"다른 선장과 기록을 나누세요","오프라인 선장의 기록도 명부와 순위에 남습니다",final)
    p.heading("다섯 가지 랭킹 · 각각 상위 5명")
    rows=[("무역 이익","교역으로 남긴 누적 판매 이익"),("보유금","지금 가진 두카트"),("방문 도시","실제로 입항한 서로 다른 항구 수"),("지도 탐험","밝힌 유효 해도 면적의 점수"),("발견 명성","발견물 점수와 해적 토벌 명성의 합")]
    for i,(title,body) in enumerate(rows):
        p.d.line((LEFT,p.y+9,RIGHT,p.y+9),fill=LINE,width=2)
        p.d.text((LEFT+4,p.y+26),title,font=font(47,bold=True),fill=TEAL)
        p.y=p.text(body,LEFT+410,p.y+28,RIGHT-LEFT-410,43,MUTED)+30
    p.para("점수가 같으면 공동 순위로 표시합니다. 상위 5명 밖의 내 정확한 순위는 ‘내 순위 조회’로 확인하세요. 항구 정보를 얻기만 한 것은 실제 방문과 다릅니다.",43)
    p.section("지금 접속 / 모든 선장", "‘선장 목록’에서 현재 접속 중인 사람과 한 번이라도 정상 입장한 사람을 나눠 봅니다. 전체 명부에는 로그아웃한 선장도 남고 방문 수·개방률·명성·선박 성장과 최종 접속 확인 시각을 한국 시간으로 보여줍니다.")
    p.section("이름은 멀리 있어도, 배는 시야 안에서", "명부에서는 먼 선장의 이름도 확인할 수 있습니다. 지도 위 다른 배는 내 시야 180해리 안에서만 보입니다. 먼 사람의 실시간 좌표나 개인 탐험 지도는 공개되지 않습니다.")
    p.section("최근 대화 50개와 항로 공유", "채팅은 최근 50개를 순환 보관합니다. 항구·완료한 항로 정보를 공유하거나 가까운 선장에게 인사를 보낼 수 있습니다. 정보 공유만으로 상대 항구가 자동 개방되지는 않습니다.")
    p.note("Enter는 전송, Shift+Enter는 줄바꿈입니다. 채팅을 접으면 화면을 넓게 쓸 수 있습니다. 이메일·계정 비밀·개인 화물 전체를 다른 선장에게 보여주는 명부가 아닙니다.")
    return p

def page7(final):
    p=Poster(7,"보급이 떨어져도 기록은 이어집니다","자동 구조와 안전한 이어하기 · 자주 묻는 질문",final)
    p.section("보급 0 → 방문했던 항구로 자동 구조", "이전에 실제 방문한 현역 항구 중 항로가 가까운 곳으로 돌아갑니다. 정보만 알게 된 미방문 항구로는 구조되지 않습니다. 배와 화물은 보존하고, 도착하면 보급 2일분을 지원합니다.")
    p.section("돈이 없어도 구조됩니다", "구조비는 거리 기준 150~1,000 D 범위에서 가진 돈만큼만 냅니다. 가진 돈이 0 D여도 귀환하며 빚을 만들지 않습니다. 구조 중 다시 접속해도 이미 낸 비용을 두 번 내지 않습니다.")
    p.section("구조를 탐험 지름길로 쓸 수는 없어요", "구조 중에는 새 안개 제거·항구 발견·유적/유물/동물/보물 수집·탐험 점수·발견 명성·최초 방문 보상이 진행되지 않습니다. 정상 출항해 다시 움직이면 탐험이 재개됩니다.")
    p.section("저장 상태를 확인하고 종료", "진행은 기기와 서버에 저장됩니다. 종료할 때는 계정의 ‘저장하고 로그아웃’을 이용하세요. 인터넷이 끊겼다면 저장 대기 안내를 확인하고 같은 기기에서 다시 연결하세요. 다른 기기 인계는 한 화면에서만 항해하도록 처리합니다.")
    p.heading("자주 묻는 질문")
    p.para("Q. 개량하면 보급도 자동으로 가득 차나요?\nA. 최대 한도만 늘어납니다. 항구에서 채워야 합니다.\nQ. 화면을 꺼도 배와 식량이 계속 움직이나요?\nA. 숨겨진 탭·로그아웃 중 항해와 소모는 멈춥니다.",41,gap=20)
    p.divider()
    qr=qrcode.make(URL).convert("RGB").resize((244,244),Image.Resampling.NEAREST)
    p.im.paste(qr,(RIGHT-244,p.y))
    p.text("게임 시작",LEFT,p.y+4,1100,54,TEAL,1.4,True)
    p.text("mathtjungsw.github.io/windward/",LEFT,p.y+90,1170,38,INK)
    p.text("처음이라면 1장부터 순서대로 읽어보세요.",LEFT,p.y+167,1170,34,MUTED)
    p.y+=255
    return p

def page8(final):
    p=Poster(8,"항구의 주인, 바다의 상인이 되세요","누적 지분 소유 · 새 항구 개발 · 한정 고가 상품",final)
    p.section("일반 항구는 지분 50% 초과가 소유", "최초 투자 기준은 일반 항구 100만 D, 대형 항구 300만 D입니다. 이후에는 1만 D 단위로 추가 투자합니다. 정확히 50%이거나 아무도 과반을 갖지 못하면 소유자가 없습니다. 투자 원금은 돌려받지 않습니다.",42)
    p.section("세금은 기본 0%, 중립 보장은 두 곳", "소유자는 기본·선장별 세율을 0~10%로 지정합니다. 세금은 거래 총액에 붙고, 발생 당시 소유자의 장부에 적립됩니다. 블랙리스트는 교역·카지노·선박 서비스를 제한하며 필수 보급과 구조는 가능합니다. 리스본·포르투는 중립 항구입니다.",42)
    p.section("새 항구 개발은 후보지에 접근해서", "개발 후보지 12곳에 실제 접근합니다. 개척 200만 D, 교역소 확장 100만 D, 조선 확장 150만 D입니다. 개발한 선장이 소유하며 이름을 지정합니다. 개발 전에는 일반 항구로 계산하지 않습니다.",42)
    p.section("생산지에서만 살 수 있는 한정 상품", "선별 진주·최고급 견직물·정교한 자기·정선 향료 4종입니다. 생산지 공유 재고는 최대 10상자이며 현실 2시간마다 1상자씩 회복합니다. 다른 선장의 구매도 재고에 반영됩니다.",42)
    p.note("항구 투자·활동 메뉴에서 소유권과 내 세율을 확인하세요. 판매는 그 견적의 시작 단가로 전량 정산하고, 거래량은 다음 가격에 반영됩니다. 견적은 5초간 유효하며 다른 거래가 먼저 확정되면 다시 확인합니다.")
    return p

def page9(final):
    p=Poster(9,"대포를 고르고 선박에 장착하세요","8가지 종류 × 5가지 품질 · 선박별 포대와 무게 제한",final)
    p.heading("일반 품질 기준 · 기본 대포 성능")
    cols=[LEFT,LEFT+440,LEFT+760,LEFT+1040,LEFT+1290]
    for x,label in zip(cols,["종류","피해","명중률","재장전","장착 단계"]):p.d.text((x,p.y),label,font=font(32,bold=True),fill=TEAL)
    p.y+=65
    rows=[("선회포",8,82,6,4),("경량포",14,76,9,5),("속사포",10,72,4,7),("표준 함포",22,70,12,7),("장포",26,85,20,10),("정밀 장포",32,90,22,12),("중포",42,58,24,13),("대구경포",60,50,32,16)]
    for i,(name,damage,accuracy,reload,stage) in enumerate(rows):
        if i%2==0:p.d.rectangle((LEFT,p.y,RIGHT,p.y+68),fill=PALE)
        for x,label in zip(cols,[name,str(damage),str(accuracy)+"%",str(reload)+"초",str(stage)+"단계"]):p.d.text((x+6,p.y+10),label,font=font(36),fill=INK)
        p.y+=70
    p.y+=35
    p.section("품질 I → II → III → IV → V", "일반·개량·명품·장인·명장 순입니다. 피해 배율은 1 / 1.2 / 1.45 / 1.7 / 2, 명중 가산은 0 / 4 / 8 / 10 / 12%p, 재장전 배율은 1 / 0.9 / 0.8 / 0.72 / 0.65입니다.",42)
    p.section("단계와 무게를 모두 확인", "대포 종류와 품질에는 필요한 선박 단계가 있습니다. 개별 선박의 포대 수·무게 한도와 선단 화물 공간을 만족해야 장착됩니다. 보유 대포는 최대 100개, 실제 장착은 최대 40문입니다.",42)
    p.section("항구의 대포·수리 메뉴", "구입·장착·품질 개량·60% 매각과 내구도 수리를 이용합니다. 명중률은 확률이며 빗나가도 재장전 시간이 적용됩니다. 대포와 선박 개량 비용을 비교해 성장 방향을 고르세요.",42)
    return p

def page10(final):
    p=Poster(10,"다른 선장과 겨루고 해적을 토벌하세요","세 전투 모드 · 해안 활동 · 게임 두카트 주사위장",final)
    p.section("합의한 선장끼리 강화 결투", "시야 안 선장에게 요청하고 60초 안에 수락합니다. 결투 중에는 항해를 멈추며 피해 ×1.5, 명중률 +10%p, 재장전 ×0.7을 임시 적용합니다. 재장전과 제한 시간은 현실 시간으로 흐릅니다.",42)
    p.section("시야 안 자유 공격과 해적 토벌", "자유 공격은 상대 동의 없이 기본 대포 성능으로 시작합니다. 사거리는 같은 바닷길의 180해리입니다. 해적은 먼저 공격하지 않으며 선장이 쏜 뒤 반격합니다. 토벌 명성은 50·150·400점, 재출현은 현실 30분입니다.",42)
    p.section("패배하면 방문한 항구로 구조", "돈 10%(최대 2,000 D), 화물 10%(최대 5상자)와 수리비·구조비를 정산합니다. 돈이 없어도 구조합니다. 출항 때 손실 한도만 보관하고 남은 정산금은 전투 뒤 또는 입항 시 반환합니다. 전리품은 항구에서 수령하며 보관 한도는 50상자입니다.",42)
    p.section("해안의 보급과 위험한 약탈", "연안 지점 12곳의 10해리 안에서 이용합니다. 보급은 지점당 24시간 간격, 최대 2일, 항구 가격의 1.5배입니다. 약탈은 하루 3회, 보급 0.2일, 성공 70%·200 D입니다. 실패하면 HP 15%, 현금 5%(최대 500 D), 화물 5%(최대 3상자)를 잃습니다.",40)
    p.section("마카오·베네치아의 홀짝 주사위", "게임 두카트 10~500 D를 10 D 단위로 겁니다. 홀짝이 맞으면 베팅액을 포함한 1.9배, 틀리면 베팅금을 잃습니다. 현실 5초 간격이며 실제 돈 결제·환전은 없습니다.",40)
    p.note("항구·구조·패전 직후는 공격에서 보호됩니다. 전투 중 항복하거나 항구로 이탈하면 패전으로 처리합니다. 접속이 끊긴 상대는 45초 뒤, 제한 시간은 180초 뒤 판정할 수 있습니다.")
    return p


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--final",action="store_true")
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    if args.final:
        code="""import {SHIPS,ACTIVE_SECONDS_PER_DAY,fleetLimit} from './dist/ship-rules.js';
import {PORTS,ALL_PORTS} from './dist/data.js';
import {DISCOVERIES} from './dist/discoveries-catalog.js';
import {initialState} from './dist/engine.js';
console.log(JSON.stringify({ships:SHIPS.map(s=>[s.name,s.speed,s.capacity,s.supply,s.cost]),seconds:ACTIVE_SECONDS_PER_DAY,ports:PORTS.length,allPorts:ALL_PORTS.length,discoveries:DISCOVERIES.length,fame:DISCOVERIES.reduce((n,d)=>n+d.fame,0),start:initialState(),fleetLimits:[0,5,9,13,17].map(shipTier=>fleetLimit({shipTier}))}));"""
        runtime=json.loads(subprocess.run(["node","--input-type=module","-e",code],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf8").stdout)
        expected={"seconds":2,"ports":78,"allPorts":112,"discoveries":40,"fame":15600,"fleetLimits":[1,2,3,4,5]}
        for key,value in expected.items():
            if runtime[key]!=value:raise ValueError(f"Guide and game differ: {key} = {runtime[key]} != {value}")
        if runtime["ships"]!=[list(row) for row in SHIP_ROWS]:raise ValueError("Guide ship table differs from actual ship-rules.js")
        if any(runtime["start"][k]!=v for k,v in {"money":2400,"food":10,"shipTier":0,"fleetCount":1}.items()):raise ValueError("Guide starting state differs from game")
        (OUT/"runtime-rules-check.json").write_text(json.dumps(runtime,ensure_ascii=False,indent=2),encoding="utf8")
    all_records=[]
    slugs=["start","controls","trade-supplies","ships-fleet","exploration-collection","captains-rankings","rescue-save","port-investment","cannons","combat-activities"]
    for create,slug in zip([page1,page2,page3,page4,page5,page6,page7,page8,page9,page10],slugs):
        p=create(args.final);all_records.append(p.save(slug));print(f"Rendered {all_records[-1]['file']} bottom={all_records[-1]['contentBottom']}")
    (OUT/"layout-check.json").write_text(json.dumps({"status":"final" if args.final else "draft-pending-implementation-review","pages":all_records},ensure_ascii=False,indent=2),encoding="utf8")
    text=["# 바람의 항로 · 플레이 안내 JPG 원고\n", "- 제작일: 2026-11-09", "- 크기: 1800×2550, JPEG, 10장", "- 상태: "+("실제 구현 수치·표시 문구 대조 완료" if args.final else "초안 · 구현 최종 대조 대기"), "- 원본 생성기: ../../tools/build-player-guide.py", "- 게임 주소: "+URL,("\n게임 규칙과 표시 문구를 대조했습니다. 내용 좌표·높이는 layout-check.json, 실제 규칙 검사는 runtime-rules-check.json에 기록했습니다.\n" if args.final else ("\n본문은 실제 게임 설정과 대조했습니다. 아래 좌표·높이는 layout-check.json에 기록했습니다.\n" if args.final else "\n구현 대조 전 초안입니다. 아래 좌표·높이는 layout-check.json에 기록했습니다.\n"))]
    for rec in all_records:
        text.append("## "+rec["file"]+"\n")
        text += [r["text"]+"\n" for r in rec["blocks"]]
    (OUT/"GUIDE_TEXT.md").write_text("\n".join(text),encoding="utf8")
    readme="# 바람의 항로 게임 안내 · JPG 10장\n\n상태: "+("최종 구현 수치 대조 완료" if args.final else "검수용 초안 · 최종 구현 대조 대기")+"\n\n"
    for rec,title in zip(all_records,["게임 시작","조작 방법","교역과 보급","20단계 선박과 선단","탐험과 수집","선장과 랭킹","구조와 저장","항구 투자·개발","대포와 수리","전투와 활동"]):readme+=f"- [{title}]({rec['file']})\n"
    readme+="\n- 크기: 장당 1800×2550 픽셀, JPG.\n- 원고: GUIDE_TEXT.md.\n- 생성기: ../../tools/build-player-guide.py.\n- 게임: "+URL+"\n- 생성 명령: `python tools/build-player-guide.py --final` (현재 실제 규칙 검사를 통과해야 생성).\n- 그림은 자체 제작 원본 SVG와 안내용 도형을 사용했다. 게임 화면을 캡처한 것이 아니다.\n- 본문의 좌표·높이는 생성 검사로 확인한다. 실제 표시 검토 범위는 배포 기록에 따로 기록한다.\n"
    (OUT/"README.md").write_text(readme,encoding="utf8")
    if args.final:
        with zipfile.ZipFile(OUT/"windward-player-guide-10pages.zip","w",compression=zipfile.ZIP_DEFLATED) as z:
            for rec in all_records:z.write(OUT/rec["file"],rec["file"])
            z.write(OUT/"README.md","README.md")
    if args.final:
        import shutil
        published=ROOT/"dist"/"guide";published.mkdir(parents=True,exist_ok=True)
        titles=["게임 시작","조작 방법","교역과 보급","20단계 선박과 선단","탐험과 수집","선장과 랭킹","구조와 저장","항구 투자·개발","대포와 수리","전투와 활동"]
        for rec in all_records:shutil.copy2(OUT/rec["file"],published/rec["file"])
        shutil.copy2(OUT/"windward-player-guide-10pages.zip",published/"windward-player-guide-10pages.zip")
        html='<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>바람의 항로 · 자세한 게임 안내</title><style>*{box-sizing:border-box}body{margin:0;background:#f3efdf;color:#245963;font:16px/1.7 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:24px}h1{font-size:26px}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#245963}figure{margin:30px 0;background:#fffdf4;border-radius:8px;overflow:hidden}figcaption{padding:12px}img{display:block;width:100%;height:auto}nav a{padding:10px 16px;background:#fffdf4;border:1px solid #b8c8b4;border-radius:6px}</style><main><h1>바람의 항로 · 자세한 게임 안내</h1><p>2026.11.09 규칙 기준 · JPG 10장입니다. 각 그림을 저장하거나 ZIP을 내려받으세요.</p><nav><a href="../">게임으로 돌아가기</a><a href="windward-player-guide-10pages.zip" download>JPG 10장 전체 내려받기</a></nav>'
        for i,(rec,title) in enumerate(zip(all_records,titles),1):html+=f'<figure><figcaption>{i}. {title} · <a href="{rec["file"]}" download>JPG 저장</a></figcaption><a href="{rec["file"]}"><img src="{rec["file"]}" alt="{title} 안내" loading="lazy" width="1800" height="2550"></a></figure>'
        (published/"index.html").write_text('<!doctype html>'+html+'</main></html>',encoding="utf8")
    print(f"Output: {OUT}")

if __name__=="__main__":main()
