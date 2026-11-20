"""Build the field map from local land outlines and Natural Earth 5.1.2 hydrography."""
import argparse
import json
import struct
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCALE = 20
WIDTH, HEIGHT = 360 * SCALE, 180 * SCALE

# Simplified crest lines for play, in geographic coordinates (west/east, south/north).
CRESTS = [
 [(5.9,44.0),(6.9,45.2),(7.6,45.98),(9.2,46.55),(11.2,47.05),(13.1,47.05),(14.7,47.6)],
 [(-1.5,43.04),(-.2,42.8),(1,42.65),(2.5,42.46)],
 [(-6.6,31.05),(-7.94,31.06),(-6.1,31.82),(-4.9,32.41)],
 [(73.5,35.1),(76,34.35),(79,31.2),(81.1,30.23),(83.4,28.7),(86.9,27.99),(90,27.9),(94.1,29.6)],
 [(-120.5,53.7),(-118.1,51.9),(-115.7,51.1),(-113.8,48.6),(-112.6,46.1)],
 [(-111,44.1),(-109.7,43),(-107.1,40.4),(-106.3,39.15),(-105.5,37.6)],
 [(-72.1,8.7),(-74.6,5.2),(-77.3,1.2),(-78.6,-1.4),(-78.8,-4.1)],
 [(-77.95,-7.7),(-77.6,-9.1),(-75.8,-11.1),(-75.05,-12.7),(-73.7,-14.2)],
 [(-69.5,-23.4),(-68.6,-27.2),(-70.0,-32.65),(-70.5,-35.0),(-71.5,-38.1),(-71.9,-41.1)],
 [(145.4,-16.4),(145.6,-17.3),(147.7,-21.5)],[(151.7,-30.2),(150.25,-32.9),(150.28,-33.7),(148.35,-36.45)],
 [(172.6,-42.05),(170.1,-43.6),(168.35,-44.7)],
 [(128.5,38.12),(128.62,37.67),(128.92,37.08),(129.02,36.53)],
 [(137.6,36.75),(137.65,36.28),(137.7,35.8)],[(39.1,8.5),(39.4,9.8),(39.5,11.5)],
 [(36.7,-.07),(36.63,-.65),(36.64,-1.16)],[(29,-29.52),(29.46,-29.4),(29.34,-29.0),(28.9,-28.74)],
 [(-99.4,20.4),(-98.6,21.6),(-99.25,23.1),(-99.9,24.4)],[(11.2,44.5),(12.1,43.75),(13.15,42.7),(14.2,41.8)]
]

def pixel(point):
    return tuple([int((point[0]+180)*SCALE), int((90-point[1])*SCALE)])

def polygons(draw, geometry, fill, hole):
    ringsets = geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    for rings in ringsets:
        for i, ring in enumerate(rings):
            draw.polygon([pixel(p) for p in ring],fill=hole if i else fill)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--cache',default='.qa')
    cache=Path(parser.parse_args().cache)
    cache.mkdir(parents=True,exist_ok=True)
    terrain=Image.new('L',(WIDTH,HEIGHT),0)
    painter=ImageDraw.Draw(terrain)
    land=json.loads((ROOT/'dist/assets/world-land.geojson').read_bytes())
    for feature in land['features']:
        polygons(painter,feature['geometry'],1,0)
    barriers=Image.new('L',terrain.size,0)
    pen=ImageDraw.Draw(barriers)
    for crest in CRESTS:
        pen.line([pixel(p) for p in crest],fill=3,width=3)
    for name in ['lakes','rivers_lake_centerlines']:
        source=cache/(name+'.json')
        if not source.exists():
            urlretrieve('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_'+name+'.geojson',source)
        for feature in json.loads(source.read_bytes())['features']:
            g=feature['geometry']
            if name=='lakes':
                polygons(pen,g,4,0)
            else:
                if feature['properties']['featurecla'].lower() in ['canal','lake centerline']:continue
                lines=g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
                for line in lines:pen.line([pixel(p) for p in line],fill=2,width=1)
    a=np.array(terrain);b=np.asarray(barriers)
    a[(a==1)&(b!=0)]=b[(a==1)&(b!=0)]
    ends=[];offsets=[0]
    for row in a:
        pos=np.r_[np.flatnonzero(row[:-1]!=row[1:])+1,WIDTH]
        ends.extend((pos*8+row[pos-1]).tolist())
        offsets.append(len(ends))
    with (ROOT/'dist/assets/overland-terrain.bin').open('wb') as out:
        out.write(struct.pack('<4sHH',b'WWL1',WIDTH,HEIGHT))
        out.write(np.array(offsets,dtype='<u4').tobytes());out.write(np.array(ends,dtype='<u2').tobytes())
if __name__=='__main__':main()
