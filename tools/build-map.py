"""Rasterize Natural Earth public-domain land into a compact navigation grid."""
import json, base64, math
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'dist'/'assets'
geo=json.loads((root/'world-land.geojson').read_text(encoding='utf-8'))
step=.5
width=720
height=281
top=80
mask=bytearray(width*height)
# Scanline filling of polygon rings; holes use the even/odd rule.
for feature in geo['features']:
    geom=feature['geometry']
    polygons=[geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates']
    for rings in polygons:
        ys=[p[1] for ring in rings for p in ring]
        y0=max(0,math.ceil((top-max(ys))/step))
        y1=min(height-1,math.floor((top-min(ys))/step))
        for y in range(y0,y1+1):
            lat=top-y*step
            xs=[]
            for ring in rings:
                for a,b in zip(ring,ring[1:]):
                    if (a[1]>lat)!=(b[1]>lat):
                        xs.append(a[0]+(lat-a[1])*(b[0]-a[0])/(b[1]-a[1]))
            xs.sort()
            for a,b in zip(xs[::2],xs[1::2]):
                for x in range(max(0,math.ceil((a+180)/step)),min(width-1,math.floor((b+180)/step))+1):
                    mask[y*width+x]=1
# Navigation-only openings in narrow real-world straits at this coarse resolution.
for lon,lat in [(-5.5,36),(-5,36),(103.5,1),(104,1),(103,1.5),(102.5,2),(9,56),(10,56),(11,56),
                (26,40),(26.5,40),(26.5,40.5),(27,40.5),(27.5,40.5),(28,40.5),(28.5,40.5),(29,40.5),(29,41),(29,41.5),
                (43,12.5),(43.5,12.5),(43.5,13),(43,13)]:
    x=round((lon+180)/step)%width;y=round((top-lat)/step)
    mask[y*width+x]=0
(root/'navigation.json').write_text(json.dumps({'width':width,'height':height,'step':step,'top':top,'land':base64.b64encode(mask).decode()}),encoding='utf-8')
print(f'Navigation grid: {width} x {height}, {sum(mask)} land cells')
