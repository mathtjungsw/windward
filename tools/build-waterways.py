"""Build selected river reaches and port records from Natural Earth (public domain).

The blue routes are simplified game waterways, not pilotage charts. Explicit
estuary waypoints bridge broad river mouths absent from the line dataset.
"""
import json, math, heapq, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
CACHE=ROOT/'tools'/'source-data';CACHE.mkdir(exist_ok=True)
BASE='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
SOURCES={'rivers':'ne_10m_rivers_lake_centerlines.geojson','places':'ne_10m_populated_places_simple.geojson'}
def source(key):
    f=CACHE/(key+'.geojson')
    if not f.exists():urllib.request.urlretrieve(BASE+SOURCES[key],f)
    return json.loads(f.read_text(encoding='utf-8'))['features']
RIVER_SOURCE=source('rivers');PLACE_SOURCE=source('places')
def nm(a,b):
    r=math.pi/180;dp=(b[1]-a[1])*r;dl=(b[0]-a[0])*r
    h=math.sin(dp/2)**2+math.cos(a[1]*r)*math.cos(b[1]*r)*math.sin(dl/2)**2
    return 6880.13*math.asin(min(1,math.sqrt(h)))
def river_section(names,start,end):
    points=[];index={};edges={};ends=[]
    def vertex(p):
        k=tuple(round(v,4) for v in p)
        if k not in index:index[k]=len(points);points.append(p);edges[index[k]]=[]
        return index[k]
    def link(a,b):
        if a==b:return
        d=nm(points[a],points[b]);edges[a].append((b,d));edges[b].append((a,d))
    for f in RIVER_SOURCE:
        n=f['properties'].get('name_en') or f['properties'].get('name')
        if n not in names:continue
        g=f['geometry'];lines=[g['coordinates']] if g['type']=='LineString' else g['coordinates']
        for line in lines:
            ids=[vertex(p) for p in line]
            for a,b in zip(ids,ids[1:]):link(a,b)
            ends.extend([ids[0],ids[-1]])
    # Connect short gaps where Natural Earth omits broad water polygons.
    for i,a in enumerate(ends):
        for b in ends[i+1:]:
            if nm(points[a],points[b])<12:link(a,b)
    a=min(range(len(points)),key=lambda i:nm(start,points[i]));b=min(range(len(points)),key=lambda i:nm(end,points[i]))
    costs={a:0};prev={};queue=[(0,a)]
    while queue:
        cost,i=heapq.heappop(queue)
        if cost>costs[i]:continue
        if i==b:break
        for j,d in edges[i]:
            v=cost+d
            if v<costs.get(j,float('inf')):costs[j]=v;prev[j]=i;heapq.heappush(queue,(v,j))
    if b!=a and b not in prev:raise ValueError('Unconnected river '+str(names))
    ids=[b]
    while ids[-1]!=a:ids.append(prev[ids[-1]])
    return [points[i] for i in reversed(ids)]

CONFIGS=[
 ('guadalquivir','과달키비르강',['Guadalquivir'],[[-7.0,36.5],[-6.43,36.72],[-6.35,36.79],[-6.27,36.86]],[-6.194814,36.932156],[-5.98,37.405], '대서양 → 세비야'),
 ('thames','템스강',['Thames'],[[1.5,51.5],[1.0,51.5],[0.7,51.48]], [0.384532,51.453152],[-0.118668,51.501941], '북해 → 런던'),
 ('garonne','가론강·지롱드강 하구',['Garonne'],[[-2,45.7],[-1.2,45.59],[-0.96,45.43],[-0.79,45.24],[-0.6,45.02]],[-0.541697,44.898017],[-0.596959,44.851959], '비스케이만 → 보르도'),
 ('rhine','라인강',['Rhine'],[[3.5,52.0],[4.1,51.98],[4.48,51.92],[4.68,51.82]], [4.985362,51.823676],[6.948059,50.93195], '북해 → 로테르담 → 쾰른'),
 ('danube','다뉴브강',['Danube','Bratul Sulina'],[[30.3,45.1],[29.8,45.15]],[29.68214,45.14879],[20.466045,44.820591], '흑해 → 루세 → 베오그라드'),
 ('nile','나일강',['Nile'],[[31.9,32.0],[31.85,31.48],[31.81,31.41],[31.68,31.27],[31.45,31.08],[31.36,31.04],[31.27,30.78],[31.25,30.5]], [31.236908,30.123847],[32.650038,25.700019], '지중해 → 카이로 → 룩소르'),
 ('amazon','아마존강',['Amazonas'],[[-48.5,1],[-50,0.6],[-50.6,0.4],[-51.05,0.03],[-51.8,-0.6]], [-52.711781,-1.583836],[-60.001963,-3.098086], '대서양 → 마카파 → 산타렝 → 마나우스'),
 ('mississippi','미시시피강',['Mississippi'],[[-89.2,28.3],[-89.4,28.7]], [-89.413564,28.935167],[-90.028777,35.144701], '멕시코만 → 뉴올리언스 → 멤피스'),
 ('yangtze','양쯔강',['Yangtze'],[[123.0,31.3],[121.95,31.4],[121.6,31.4],[121.3,31.8],[120.8,31.95],[120.3,32.0]], [119.606375,32.196885],[114.268071,30.581977], '동중국해 → 상하이 → 난징 → 우한')
]
RIVERS=[]
for rid,name,names,prefix,start,end,reach in CONFIGS:
    line=prefix+river_section(names,start,end)
    RIVERS.append({'id':rid,'name':name,'reach':reach,'widthNM':5,'path':line,'source':BASE+SOURCES['rivers']})

# id, Korean, English place name, source country, displayed country, region,
# specialty, river id (optional), geographic note, sea or waterway.
ROWS=[
 ('porto','포르투','Porto','Portugal','포르투갈','유럽','wine',None,'포르투갈 북서부, 도루강 하구 가까이에 자리한 대서양의 항구.','북대서양'),
 ('bordeaux','보르도','Bordeaux','France','프랑스','유럽','wine','garonne','가론강을 거슬러 올라가 만나는 프랑스 남서부의 내륙 항구.','가론강'),
 ('marseille','마르세유','Marseille','France','프랑스','유럽','glass',None,'프랑스 남쪽, 지중해를 마주하는 오래된 항구.','지중해'),
 ('barcelona','바르셀로나','Barcelona','Spain','스페인','유럽','glass',None,'이베리아반도 북동쪽, 지중해 연안의 항구.','지중해'),
 ('genoa','제노바','Genoa','Italy','이탈리아','유럽','silk',None,'이탈리아 북서쪽, 리구리아해의 만을 따라 자리한 항구.','리구리아해'),
 ('naples','나폴리','Naples','Italy','이탈리아','유럽','wine',None,'이탈리아반도 서쪽 나폴리만에 자리한 항구.','티레니아해'),
 ('athens','아테네·피레아스','Athens','Greece','그리스','유럽','wine',None,'아테네의 바닷길을 잇는 피레아스 항구. 에게해의 섬들로 이어져요.','에게해'),
 ('istanbul','이스탄불','Istanbul','Turkey','튀르키예','유럽','silk',None,'보스포루스해협을 사이에 두고 유럽과 아시아를 잇는 도시.','마르마라해'),
 ('rotterdam','로테르담','Rotterdam','Netherlands','네덜란드','유럽','wool','rhine','라인강 하구 수계를 통해 유럽 내륙과 북해를 잇는 항구.','라인강'),
 ('cologne','쾰른','Cologne','Germany','독일','유럽','glass','rhine','독일 서쪽, 라인강을 따라 들어갈 수 있는 내륙 항구.','라인강'),
 ('ruse','루세','Ruse','Bulgaria','불가리아','유럽','wool','danube','다뉴브강 남쪽 강변에 자리한 불가리아의 내륙 항구.','다뉴브강'),
 ('belgrade','베오그라드','Belgrade','Serbia','세르비아','유럽','wool','danube','사바강과 다뉴브강이 만나는 세르비아의 내륙 도시.','다뉴브강'),
 ('sanlucar','산루카르','Sanlucar','Spain','스페인','유럽','wine','guadalquivir','과달키비르강이 대서양과 만나는 하구. 강을 거슬러 세비야로 향해보세요.','과달키비르강'),
 ('dublin','더블린','Dublin','Ireland','아일랜드','유럽','wool',None,'아일랜드섬 동쪽, 리피강 하구의 항구.','아일랜드해'),
 ('tangier','탕헤르','Tangier','Morocco','모로코','아프리카','glass',None,'아프리카 북서쪽, 지브롤터해협 가까이에 자리한 항구.','지브롤터해협'),
 ('tunis','튀니스','Tunis','Tunisia','튀니지','아프리카','glass',None,'아프리카 북쪽, 지중해를 마주한 튀니지의 항구 도시.','지중해'),
 ('dakar','다카르','Dakar','Senegal','세네갈','아프리카','sugar',None,'서아프리카에서 대서양 쪽으로 뻗은 베르데곶 반도의 항구.','북대서양'),
 ('luanda','루안다','Luanda','Angola','앙골라','아프리카','coffee',None,'아프리카 남서부, 남대서양 연안에 자리한 항구.','남대서양'),
 ('maputo','마푸투','Maputo','Mozambique','모잠비크','아프리카','sugar',None,'모잠비크 남쪽 마푸투만의 항구. 동쪽으로 인도양이 펼쳐져요.','인도양'),
 ('mombasa','몸바사','Mombasa','Kenya','케냐','아프리카','spice',None,'동아프리카 해안의 섬과 본토를 잇는 인도양의 항구.','인도양'),
 ('cairo','카이로','Cairo','Egypt','이집트','아프리카','glass','nile','나일강 삼각주 남쪽의 내륙 도시. 강을 더 거슬러 룩소르로 향할 수 있어요.','나일강'),
 ('luxor','룩소르','Luxor','Egypt','이집트','아프리카','glass','nile','이집트 남부, 나일강 양쪽 강변을 따라 자리한 내륙 항구.','나일강'),
 ('mogadishu','모가디슈','Mogadishu','Somalia','소말리아','아프리카','coffee',None,'아프리카의 뿔 남동쪽, 인도양을 마주하는 항구.','인도양'),
 ('aden','아덴','Aden','Yemen','예멘','아시아','coffee',None,'아라비아반도 남쪽, 홍해 입구 가까운 아덴만의 항구.','아덴만'),
 ('jeddah','제다','Jeddah','Saudi Arabia','사우디아라비아','아시아','coffee',None,'아라비아반도 서쪽, 홍해 동쪽 해안의 항구.','홍해'),
 ('kochi','코치','Kochi','India','인도','아시아','spice',None,'인도 남서쪽 말라바르 해안에 자리한 아라비아해의 항구.','아라비아해'),
 ('colombo','콜롬보','Colombo','Sri Lanka','스리랑카','아시아','tea',None,'인도 남쪽 스리랑카섬의 서쪽 항구.','인도양'),
 ('chennai','첸나이','Chennai','India','인도','아시아','silk',None,'인도반도 동쪽, 벵골만을 향한 코로만델 해안의 항구.','벵골만'),
 ('singapore','싱가포르','Singapore','Singapore','싱가포르','아시아','spice',None,'말레이반도 남쪽 끝의 섬. 인도양과 남중국해를 잇는 바닷길의 길목이에요.','싱가포르해협'),
 ('manila','마닐라','Manila','Philippines','필리핀','아시아','sugar',None,'필리핀 루손섬 서쪽, 마닐라만 안쪽에 자리한 항구.','남중국해'),
 ('shanghai','상하이','Shanghai','China','중국','아시아','silk','yangtze','양쯔강 하구와 황푸강을 통해 바다와 연결되는 중국 동부의 항구.','양쯔강'),
 ('nanjing','난징','Nanjing','China','중국','아시아','silk','yangtze','중국 동부, 양쯔강을 거슬러 올라가 만나는 내륙 항구.','양쯔강'),
 ('wuhan','우한','Wuhan','China','중국','아시아','tea','yangtze','양쯔강과 한수이가 만나는 중국 중부의 내륙 도시.','양쯔강'),
 ('neworleans','뉴올리언스','New Orleans','United States of America','미국','아메리카','sugar','mississippi','미시시피강 하류에 있는 항구. 강을 따라 북미 내륙으로 들어갈 수 있어요.','미시시피강'),
 ('memphis','멤피스','Memphis','United States of America','미국','아메리카','wool','mississippi','미시시피강 동쪽 강변, 미국 테네시주의 내륙 항구.','미시시피강'),
 ('macapa','마카파','Macapá','Brazil','브라질','아메리카','sugar','amazon','적도 가까이, 아마존강 하구 수계에 자리한 브라질의 항구.','아마존강'),
 ('santarem','산타렝','Santarem','Brazil','브라질','아메리카','coffee','amazon','타파조스강이 아마존강과 만나는 부근의 내륙 항구.','아마존강'),
 ('manaus','마나우스','Manaus','Brazil','브라질','아메리카','coffee','amazon','네그루강과 아마존 수계가 만나는 부근의 내륙 항구.','아마존강'),
 ('rio','리우데자네이루','Rio de Janeiro','Brazil','브라질','아메리카','coffee',None,'브라질 남동쪽, 과나바라만을 마주하는 대서양의 항구.','남대서양'),
 ('salvador','사우바도르','Salvador','Brazil','브라질','아메리카','sugar',None,'브라질 동쪽 바이아주의 대서양 항구.','남대서양'),
 ('callao','카야오','Callao','Peru','페루','아메리카','wool',None,'페루의 리마와 이어지는 남아메리카 서쪽 태평양의 항구.','남태평양'),
 ('perth','퍼스·프리맨틀','Perth','Australia','오스트레일리아','오세아니아','wool',None,'오스트레일리아 남서쪽, 퍼스의 바닷길을 잇는 프리맨틀 항구.','인도양'),
 ('auckland','오클랜드','Auckland','New Zealand','뉴질랜드','오세아니아','wool',None,'뉴질랜드 북섬 북쪽, 태평양으로 이어지는 항구.','남태평양')
]
def place(name,country):
    if name=='Sanlucar':return [-6.35,36.78]
    matches=[f for f in PLACE_SOURCE if f['properties']['adm0name']==country and any(name.casefold()==str(f['properties'].get(k,'')).casefold() for k in ['name','nameascii','namealt'])]
    if len(matches)!=1:raise ValueError('Ambiguous place '+name+' '+country)
    return matches[0]['geometry']['coordinates']
def snap(p,line):
    best=None;d=1e9;c=math.cos(math.radians(p[1]))
    for a,b in zip(line,line[1:]):
        dx=(b[0]-a[0])*c;dy=b[1]-a[1];den=dx*dx+dy*dy
        t=max(0,min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/den)) if den else 0
        q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];n=nm(p,q)
        if n<d:d=n;best=q
    return [round(v,6) for v in best]
DOCKS={'athens':[23.64,37.94],'perth':[115.73,-32.05],'shanghai':[121.6,31.4]}
extra=[]
for rid,ko,en,country,display,region,good,river,fact,sea in ROWS:
    city=place(en,country);dock=DOCKS.get(rid,city)
    if river:dock=snap(dock,next(r['path'] for r in RIVERS if r['id']==river))
    market=[good]+[g for g in {'wine':['wool','glass'],'wool':['wine','tea'],'glass':['wine','spice'],'silk':['tea','glass'],'coffee':['sugar','wool'],'spice':['silk','tea'],'tea':['silk','wool'],'sugar':['coffee','glass']}[good] if g!=good]
    extra.append({'id':rid,'name':ko,'en':en,'country':display,'region':region,'lon':dock[0],'lat':dock[1],'city':city,'specialty':good,'market':market,'fact':fact,'sea':sea,**({'river':river} if river else {})})
updates={}
for rid,en,country,river in [('seville','Seville','Spain','guadalquivir'),('london','London','United Kingdom','thames')]:
    city=place(en,country);dock=snap(city,next(r['path'] for r in RIVERS if r['id']==river))
    updates[rid]={'lon':dock[0],'lat':dock[1],'city':city,'river':river,'sea':'과달키비르강' if rid=='seville' else '템스강','fact':'과달키비르강을 거슬러 올라가 도착하는 스페인 남부의 내륙 항구.' if rid=='seville' else '템스강을 따라 북해와 이어지는 영국의 내륙 항구.'}
(ROOT/'dist'/'assets'/'rivers.json').write_text(json.dumps(RIVERS,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'dist'/'harbors.js').write_text('// Generated by tools/build-waterways.py. Natural Earth source coordinates; game berths follow river centerlines.\nexport const EXTRA_PORTS = '+json.dumps(extra,ensure_ascii=False,indent=2)+';\nexport const UPDATED_PORTS = '+json.dumps(updates,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(f'Generated {len(RIVERS)} waterways, {len(extra)} additional ports and {len(updates)} updated river berths.')
