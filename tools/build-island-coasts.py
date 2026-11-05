"""Supplement the coarse atlas with small islands from Natural Earth (public domain)."""
import json, urllib.request, math
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
CACHE=ROOT/'tools/source-data/islands-land-10m.geojson'
SOURCE='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson'
REGIONS={
 'azores':(-31.5,36.5,-24.5,40.2),'madeira':(-17.5,32.2,-16,33.5),'canaries':(-18.5,27,-13,30),
 'cape-verde':(-25.5,14,-22,18),'zanzibar':(38.9,-6.7,40.1,-4.5),'mauritius':(56.8,-20.8,58.1,-19.8),
 'moluccas':(126.5,-5.5,131.5,2),'hawaii':(-160.6,18.8,-154.5,22.4),'fiji-east':(176.5,-20,180,-15.5),
 'fiji-west':(-180,-20,-178,-15.5),'tahiti':(-150.2,-18.2,-149,-17.2),'rapanui':(-109.6,-27.3,-109.1,-27),
 'samoa':(-173,-14.2,-171,-13.3),'pohnpei':(157.8,6.5,158.6,7.2),'galapagos':(-91.9,-1.8,-89,1),
 'andaman':(92,6,94.7,14.2)
}

def perpendicular(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1]
 if not(dx or dy):return math.hypot(p[0]-a[0],p[1]-a[1])
 t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)))
 return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)

def simplify(points,tolerance=.008):
 if len(points)<=4:return points
 i,d=max(enumerate(perpendicular(p,points[0],points[-1]) for p in points[1:-1]),key=lambda v:v[1]);i+=1
 if d<=tolerance:return [points[0],points[-1]]
 return simplify(points[:i+1],tolerance)[:-1]+simplify(points[i:],tolerance)

if not CACHE.exists():
 CACHE.parent.mkdir(parents=True,exist_ok=True)
 urllib.request.urlretrieve(SOURCE,CACHE)
features=[]
for feature in json.loads(CACHE.read_text(encoding='utf-8'))['features']:
 geom=feature['geometry']
 polygons=[geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates']
 for polygon in polygons:
  ring=polygon[0];xs=[p[0]for p in ring];ys=[p[1]for p in ring]
  for name,(west,south,east,north)in REGIONS.items():
   if min(xs)>=west and max(xs)<=east and min(ys)>=south and max(ys)<=north:
    rings=[]
    for original in polygon:
     # Split a closed ring away from its seam; preserve every hole and at least 3 vertices.
     half=len(original)//2
     small=simplify(original[:half+1])[:-1]+simplify(original[half:])
     if len(small)<4:small=original
     rounded=[[round(p[0],5),round(p[1],5)]for p in small]
     if rounded[-1]!=rounded[0]:rounded.append(rounded[0])
     rings.append(rounded)
    features.append({'type':'Feature','properties':{'islandGroup':name},'geometry':{'type':'Polygon','coordinates':rings}})
    break
target=ROOT/'dist/assets/islands.geojson'
target.write_text(json.dumps({'type':'FeatureCollection','source':SOURCE,'features':features},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'Islands: {len(features)} polygons; {target.stat().st_size} bytes; preserved holes; tolerance .008 degrees')
