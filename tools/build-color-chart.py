"""Bake Natural Earth II shaded land cover into Windward's registered chart tiles.

Run with Pillow and NumPy. Only the finished WebP files and their manifest are
served. The geographic source archive is hash-pinned and cached outside dist.
"""
import hashlib
import io
import json
from pathlib import Path
import urllib.request
from zipfile import ZipFile

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CLASSIC = ROOT / 'dist/assets/chart-tiles'
COLOR = ROOT / 'dist/assets/chart-color'
ARCHIVE = ROOT / 'tools/source-data/NE2_50M_SR_W.zip'
URL = 'https://naturalearth.s3.amazonaws.com/50m_raster/NE2_50M_SR_W.zip'
ARCHIVE_HASH = '7e0e07089b699a3cccad98dd1b2446390d8e3f8c5006359d477a329cebcafaa9'
WORLD_W, WORLD_H = 1600, 800
SCALE = 7
OVERVIEW = (1200, 600)
SHELF = np.array([163, 206, 203], dtype=np.float32)
DEEP = np.array([85, 150, 177], dtype=np.float32)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def text_hash(path):
    return sha(path.read_text(encoding='utf-8').encode('utf-8'))


def load_earth():
    if not ARCHIVE.exists():
        ARCHIVE.parent.mkdir(exist_ok=True, parents=True)
        partial = ARCHIVE.with_suffix('.partial')
        urllib.request.urlretrieve(URL, partial)
        if sha(partial.read_bytes()) != ARCHIVE_HASH:
            raise ValueError('Natural Earth II download differs from the pinned archive')
        partial.replace(ARCHIVE)
    if sha(ARCHIVE.read_bytes()) != ARCHIVE_HASH:
        raise ValueError('Unexpected Natural Earth II source hash')
    with ZipFile(ARCHIVE) as archive:
        with Image.open(io.BytesIO(archive.read('NE2_50M_SR_W/NE2_50M_SR_W.tif'))) as raster:
            # Source is equirectangular, north +90. Windward shows +80 to -60.
            top = round(raster.height * 10 / 180)
            bottom = round(raster.height * 150 / 180)
            return raster.crop((0, top, raster.width, bottom)).convert('RGB')


def water_pixels(rgb):
    return (rgb[..., 2] - rgb[..., 0] > 32) & (rgb[..., 2] - rgb[..., 1] > 9)


def color_ocean(earth):
    # Generate one continuous sea surface for the overview and every tile.
    # The source's blue ramp depicts sea-floor relief; the contrast is muted
    # so routes, ships and port markers remain the primary marks at sea.
    sample = np.asarray(earth.resize(OVERVIEW, Image.Resampling.LANCZOS), dtype=np.float32)
    water = water_pixels(sample)
    light = np.clip((sample[..., 0] - 64) / 78, 0, 1)
    light = np.where(water, light, 1)[..., None]
    result = DEEP + (SHELF - DEEP) * light
    return Image.fromarray(result.astype('uint8')).filter(ImageFilter.GaussianBlur(.55))


def section(image, bounds, pixels):
    x, y, w, h = bounds
    ext = (x * image.width / WORLD_W, y * image.height / WORLD_H,
           (x+w) * image.width / WORLD_W, (y+h) * image.height / WORLD_H)
    # An overview pixel represents many source pixels; area resampling avoids
    # speckled mountains and aliasing in the low-resolution world view.
    if ext[2] - ext[0] > pixels[0] * 2:
        return image.resize(pixels, Image.Resampling.LANCZOS, box=ext)
    return image.transform(pixels, Image.Transform.EXTENT, ext, Image.Resampling.BILINEAR)


def compose(earth, ocean, classic, bounds, size):
    base = classic.resize(size, Image.Resampling.LANCZOS)
    ink = np.asarray(base, dtype=np.float32)
    natural = np.asarray(section(earth, bounds, size), dtype=np.float32)
    sea = np.asarray(section(ocean, bounds, size), dtype=np.float32)
    # Preserve the existing detailed shoreline, islands and river channels.
    # Correct any coastline disagreement between the vector and raster scales.
    land_weight = np.clip((ink[..., 0] - ink[..., 2] + 22) / 52, 0, 1)
    water = water_pixels(natural)
    land = np.where(water[..., None], [188, 197, 158], natural)
    # A warm paper tint, with separate high-frequency ink for chart boundaries.
    land = land * [.87, .89, .85] + [25, 22, 24]
    smooth = np.asarray(base.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32)
    ink_detail = np.clip((ink[..., 0] - smooth[..., 0]) * .75, -24, 9)
    land += ink_detail[..., None]
    # The classic ink's darker river banks also read against the pale shallows.
    sea = sea - np.clip((197-ink[..., 0]) * .70, 0, 26)[..., None]
    weight = land_weight[..., None]
    final = sea * (1-weight) + land * weight
    return Image.fromarray(np.clip(final, 0, 255).astype('uint8'))


def save_image(filename, image, quality):
    path = COLOR / filename
    image.save(path, 'WEBP', quality=quality, method=5)
    binary = path.read_bytes()
    return {'file': filename, 'sha256': sha(binary), 'bytes': len(binary)}


def main():
    COLOR.mkdir(exist_ok=True)
    manifest_path = CLASSIC / 'manifest.json'
    classic = json.loads(manifest_path.read_text(encoding='utf-8'))
    assert (classic['width'], classic['height']) == (WORLD_W, WORLD_H)
    earth = load_earth()
    ocean = color_ocean(earth)
    tile_size = classic['size']
    manifest = {
        'size': tile_size, 'scale': SCALE, 'width': WORLD_W, 'height': WORLD_H,
        'builder': text_hash(Path(__file__)),
        'sources': {'chart-tiles/manifest.json': text_hash(manifest_path)},
        'rasterSource': {'name': 'Natural Earth II, shaded relief and water, 1:50m',
                         'url': URL, 'sha256': ARCHIVE_HASH, 'license': 'Public domain'},
        'tiles': {}
    }
    for key, tile in classic['tiles'].items():
        x, y = (int(part) * tile_size for part in key.split(','))
        w, h = min(tile_size, WORLD_W-x), min(tile_size, WORLD_H-y)
        with Image.open(CLASSIC / tile['file']) as source:
            image = compose(earth, ocean, source, (x, y, w, h), (w*SCALE, h*SCALE))
        manifest['tiles'][key] = save_image(tile['file'], image, 67)

    filename = classic['overview']['file']
    with Image.open(CLASSIC / filename) as source:
        image = compose(earth, ocean, source, (0, 0, WORLD_W, WORLD_H), OVERVIEW)
    manifest['overview'] = save_image(filename, image, 66)
    (COLOR / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Chart WebP bytes:', sum(row['bytes'] for row in manifest['tiles'].values()) + manifest['overview']['bytes'])


if __name__ == '__main__':
    main()
