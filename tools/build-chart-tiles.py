"""Bake detailed decorative terrain once, never during sailing. Requires Pillow and Shapely.

Navigation retains its original grid. Coordinates match engine.project exactly.
Transparent 64-world-unit tiles retain small islands, holes, borders and rivers.
"""
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
from shapely.geometry import Polygon, LineString, box as clip_box
from shapely import make_valid

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'dist/assets'
OUT = ASSETS / 'chart-tiles'
OUT.mkdir(exist_ok=True)
SIZE, SCALE, PAD = 64, 12, 2
SOURCES = ['world-land.geojson', 'world-countries.geojson', 'islands.geojson', 'rivers.json', 'terrain-shade.webp']
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def project(p): return ((p[0]+180)*1600/360, (80-p[1])*800/140)
def polygons(name):
    result = []
    for f in json.loads((ASSETS/name).read_text(encoding='utf-8'))['features']:
        g = f['geometry']
        for rings in ([g['coordinates']] if g['type']=='Polygon' else g['coordinates']):
            points = [[project(p) for p in ring] for ring in rings]
            xs = [p[0] for r in points for p in r]; ys = [p[1] for r in points for p in r]
            result.append((points, (min(xs), min(ys), max(xs), max(ys)), make_valid(Polygon(points[0],points[1:]))))
    return result
land = polygons('world-land.geojson') + polygons('islands.geojson')
borders = polygons('world-countries.geojson')
rivers = [[project(p) for p in r['path']] for r in json.loads((ASSETS/'rivers.json').read_text(encoding='utf-8'))]
shade = Image.open(ASSETS/'terrain-shade.webp').convert('RGB')
tiles = {}
overview = Image.new('RGB',(1600,800),(197,225,228))
for row in range(math.ceil(800/SIZE)):
    for col in range(math.ceil(1600/SIZE)):
        x, y = col*SIZE, row*SIZE
        w, h = min(SIZE,1600-x), min(SIZE,800-y)
        box = (x-PAD,y-PAD,x+w+PAD,y+h+PAD)
        pixels = ((w+2*PAD)*SCALE,(h+2*PAD)*SCALE)
        relevant = lambda b: b[0]<=box[2] and b[2]>=box[0] and b[1]<=box[3] and b[3]>=box[1]
        local = lambda ring: [((a-box[0])*SCALE,(b-box[1])*SCALE) for a,b in ring]
        mask = Image.new('L',pixels)
        coast = Image.new('RGBA',pixels)
        cd = ImageDraw.Draw(coast)
        rings_here = []
        clip = clip_box(*box)
        def parts(g,kind):
            if g.is_empty: return []
            if g.geom_type==kind: return [g]
            return [p for child in getattr(g,'geoms',[]) for p in parts(child,kind)]
        def lines(ring):
            return [local(list(line.coords)) for line in parts(LineString(ring).intersection(clip),'LineString')]

        for rings, bounds, shape in land:
            if not relevant(bounds): continue
            pm = Image.new('L',pixels); pd = ImageDraw.Draw(pm)
            for polygon in parts(shape.intersection(clip),'Polygon'):
                pd.polygon(local(list(polygon.exterior.coords)),fill=255)
                for hole in polygon.interiors: pd.polygon(local(list(hole.coords)),fill=0)
            for ring in rings:
                for p in lines(ring):
                    cd.line(p,fill=(103,156,162,51),width=10,joint='curve');rings_here.append(p)
            mask = ImageChops.lighter(mask,pm)
        image = coast
        if mask.getbbox():
            fill = Image.new('RGBA',pixels,(233,218,173,255)); image.alpha_composite(Image.composite(fill,Image.new('RGBA',pixels),mask))
            draw = ImageDraw.Draw(image)
            for ring in rings_here: draw.line(ring,fill=(179,165,116,255),width=1,joint='curve')
            crop = shade.transform(pixels,Image.Transform.EXTENT,(box[0]/1600*shade.width,box[1]/800*shade.height,box[2]/1600*shade.width,box[3]/800*shade.height),Image.Resampling.BILINEAR).convert('RGBA')
            crop.putalpha(mask.point(lambda a: a//4)); image.alpha_composite(crop)
        overlay = Image.new('RGBA',pixels); od = ImageDraw.Draw(overlay)
        for rings,bounds,_shape in borders:
            if relevant(bounds):
                for ring in rings:
                    for p in lines(ring): od.line(p,fill=(146,137,97,140),width=1)
        for path in rivers:
            xs=[p[0] for p in path];ys=[p[1] for p in path]
            if relevant((min(xs),min(ys),max(xs),max(ys))):
                for p in lines(path):
                    od.line(p,fill=(135,174,179,191),width=16,joint='curve');od.line(p,fill=(199,228,231,255),width=12,joint='curve')
        image.alpha_composite(overlay)
        image=image.crop((PAD*SCALE,PAD*SCALE,(PAD+w)*SCALE,(PAD+h)*SCALE))
        if not image.getbbox(): continue
        name=f'{col}-{row}.webp'; path=OUT/name
        background=Image.new('RGBA',image.size,(197,225,228,255));background.alpha_composite(image);image=background.convert('RGB')
        overview.paste(image.resize((w,h),Image.Resampling.LANCZOS),(x,y))
        image.save(path,'WEBP',quality=92,method=2)
        tiles[f'{col},{row}']={'file':name,'sha256':digest(path),'bytes':path.stat().st_size}
    print(f'Chart row {row+1}/13 complete',flush=True)
overview.save(OUT/'overview.webp','WEBP',quality=92,method=2)
manifest={'size':SIZE,'scale':SCALE,'width':1600,'height':800,'overview':{'file':'overview.webp','sha256':digest(OUT/'overview.webp')},'sources':{n:digest(ASSETS/n) for n in SOURCES},'builder':digest(Path(__file__)),'tiles':tiles}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Baked {len(tiles)} chart tiles, {sum(t["bytes"] for t in tiles.values()):,} bytes',flush=True)
