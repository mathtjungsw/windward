"""Game-only coastal distance cache; no latitude-edge shortcut or runtime API."""
import base64,json,heapq,math,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'dist/assets/navigation.json';g=json.loads(p.read_text(encoding='utf-8'))
w,h=g['width'],g['height'];land=base64.b64decode(g['land']);step=g['step']
dist=[4095.0]*len(land);queue=[]
for i,v in enumerate(land):
    if v:dist[i]=0;queue.append((0,i))
# Small real coastal islands can be absent from the coarse land mask.
anchors=[port['city'] for port in json.loads((ROOT/'tools/port-catalog.json').read_text(encoding='utf-8'))['ports']]
world=ROOT/'tools/world-catalog.json'
if world.exists():anchors+=json.loads(world.read_text(encoding='utf-8')).get('islandCoastPoints',[])
for lon,lat in anchors:
    x=round((lon+180)/step)%w;y=round((g['top']-lat)/step)
    if 0<=y<h:
        i=y*w+x
        if dist[i]>0:dist[i]=0;queue.append((0,i))
heapq.heapify(queue)
while queue:
    d,i=heapq.heappop(queue)
    if d>dist[i]+1e-8:continue
    x,y=i%w,i//w
    for dx,dy in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)):
        yy=y+dy
        if yy<0 or yy>=h:continue
        j=yy*w+(x+dx)%w
        lat=g['top']-(y+dy/2)*step
        nd=d+math.hypot(dx*60*step*math.cos(math.radians(lat)),dy*60*step)
        if nd<dist[j] and nd<4095:dist[j]=nd;heapq.heappush(queue,(nd,j))
# Subtract half a latitude cell: coastline lies between land and sea centers.
g['coast16']=base64.b64encode(b''.join(struct.pack('<H',max(0,min(4095,round(d-step*30)))) for d in dist)).decode()
g.pop('coast',None)
p.write_text(json.dumps(g,separators=(',',':')),encoding='utf-8')
print(f'Coastal cache generated for {w}x{h} cells (game approximation).')
