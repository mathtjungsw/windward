"""Make unlabeled journal fragments from the shipped relief tiles. Requires Pillow."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
assets = ROOT / 'dist/assets'
source = assets / 'chart-color'
out = assets / 'coast-sketches'
out.mkdir(exist_ok=True)
manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
rows = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {COASTS} from './dist/coast-sketches.js'; console.log(JSON.stringify(COASTS));"
], cwd=ROOT))
with Image.open(source / manifest['overview']['file']) as small:
    for row in rows:
        lon, lat = row['point']
        x, y = (lon + 180) * 1600 / 360, (80 - lat) * 800 / 140
        w = row['width'] * 1600 / 360
        h = w * .68
        # Fit the original chart projection inside the fragment.
        left, top = int(x-w/2), int(y-h/2)
        right, bottom = int(x+w/2)+1, int(y+h/2)+1
        s, tile_size = manifest['scale'], manifest['size']
        area = ((right-left)*s, (bottom-top)*s)
        base = small.transform(area, Image.Transform.EXTENT, (
            left*small.width/1600, top*small.height/800,
            right*small.width/1600, bottom*small.height/800), Image.Resampling.BILINEAR)
        for col in range(left//tile_size, right//tile_size+1):
            for r in range(top//tile_size, bottom//tile_size+1):
                tile = manifest['tiles'].get(f'{col},{r}')
                if tile:
                    with Image.open(source / tile['file']) as detail:
                        base.paste(detail, ((col*tile_size-left)*s, (r*tile_size-top)*s))
        ink = ImageOps.autocontrast(ImageOps.grayscale(base), cutoff=1)
        chart = ImageOps.colorize(ink, '#42666c', '#f6e9c8').resize((330,224), Image.Resampling.LANCZOS)
        chart.save(out / (row['id']+'.webp'), quality=83, method=5)
