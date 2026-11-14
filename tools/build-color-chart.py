"""Create a colored alternative from the existing registered terrain projection."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parents[1]/'dist/assets'
source=root/'chart-tiles'
target=root/'chart-color'
target.mkdir(exist_ok=True)
manifest=json.loads((source/'manifest.json').read_text(encoding='utf-8'))
def palette(name, left, top, width, height):
 im=Image.open(source/name).convert('RGB')
 src=np.asarray(im,dtype=np.float32)
 r,g,b=np.moveaxis(src,-1,0)
 lat=(80-np.linspace(top,top+height,im.height,endpoint=False)*140/800)[:,None]
 lon=(np.linspace(left,left+width,im.width,endpoint=False)*360/1600-180)[None,:]
 dry=np.exp(-((np.abs(lat)-24)/10)**2)
 sahara=np.exp(-((lat-25)/14)**2)*np.exp(-((lon-21)/47)**4)
 interior=np.exp(-((lat+25)/13)**2)*np.exp(-((lon-132)/18)**2)
 warm=np.clip(dry*.28+sahara*.85+interior*.65,0,1)
 land=np.clip((r-b-2)/24,0,1)
 water=np.array([187,220,226])
 base=np.stack([183+48*warm,199-2*warm,161-26*warm],axis=-1)
 shade=np.clip(r/229,.64,1.07)[...,None]
 color=(base*shade)*land[...,None]+water*(1-land[...,None])
 accent=(b-r>20)&(g<215)
 color[accent]=np.clip(src[accent]*np.array([.89,1.01,1.04]),0,255)
 dest=target/name
 Image.fromarray(np.uint8(np.clip(color,0,255))).save(dest,'WEBP',quality=84,method=2)
 return {'file':name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size}
for key,tile in manifest['tiles'].items():
 x,y=(int(i)*64 for i in key.split(','))
 manifest['tiles'][key]=palette(tile['file'],x,y,min(64,1600-x),min(64,800-y))
manifest['overview']=palette('overview.webp',0,0,1600,800)
(target/'manifest.json').write_text(json.dumps({k:v for k,v in manifest.items() if k not in ('builder','sources')},indent=2)+'\n',encoding='utf-8')
