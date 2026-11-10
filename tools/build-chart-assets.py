"""Build static chart geometry/relief/labels; never rebuild the navigation grid.

Python 3 + Pillow + NumPy. Sources are pinned to Natural Earth v5.1.2;
downloads live in ignored tools/source-data and hashes are shipped in manifest.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools/source-data'
OUT = ROOT / 'dist/assets'
VERSION = '2026.11.10-natural-earth-detail'
BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'
SOURCES = {
    'land': ('world-land-10m-v5.1.2.geojson', BASE + 'ne_10m_land.geojson'),
    'countries': ('ne_10m_admin_0_countries.geojson', BASE + 'ne_10m_admin_0_countries.geojson'),
    'regions': ('ne_10m_geography_regions_polys.geojson', BASE + 'ne_10m_geography_regions_polys.geojson'),
    'points': ('ne_10m_geography_regions_points.geojson', BASE + 'ne_10m_geography_regions_points.geojson'),
    'marine': ('ne_10m_geography_marine_polys.geojson', BASE + 'ne_10m_geography_marine_polys.geojson'),
    'relief': ('SR_50M.zip', 'https://naturalearth.s3.amazonaws.com/50m_raster/SR_50M.zip'),
}


def packed(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source(key):
    filename, url = SOURCES[key]
    path = CACHE / filename
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, path)
    return path


def simplify_open(points, tolerance):
    """Iterative Douglas-Peucker; closed rings are split at their opposite seam."""
    if len(points) < 3:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    limit = tolerance * tolerance
    while stack:
        first, last = stack.pop()
        ax, ay = points[first][:2]
        bx, by = points[last][:2]
        dx, dy = bx - ax, by - ay
        length = dx * dx + dy * dy
        best, index = limit, None
        for i in range(first + 1, last):
            px, py = points[i][:2]
            t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / length)) if length else 0
            distance = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if distance > best:
                best, index = distance, i
        if index is not None:
            keep.add(index)
            stack.extend([(first, index), (index, last)])
    return [points[i] for i in sorted(keep)]


def ring_detail(ring, tolerance):
    half = len(ring) // 2
    reduced = simplify_open(ring[:half + 1], tolerance)[:-1] + simplify_open(ring[half:], tolerance)
    if len(reduced) < 4:
        reduced = ring
    result = [[round(p[0], 5), round(p[1], 5)] for p in reduced]
    if result[-1] != result[0]:
        result.append(result[0])
    # Do not discard small islands/holes that collapse at this tolerance.
    if len({tuple(p) for p in result}) < 3:
        result = [[round(p[0], 6), round(p[1], 6)] for p in ring]
    return result


def geometry(geom, tolerance):
    polygons = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    processed = [[ring_detail(ring, tolerance) for ring in polygon] for polygon in polygons]
    return {'type': geom['type'], 'coordinates': processed[0] if geom['type'] == 'Polygon' else processed}


def build_geometry(key, filename):
    data = json.loads(source(key).read_text(encoding='utf-8'))
    features = []
    for feature in data['features']:
        props = feature['properties']
        # Keep all polygons, holes, straits and existing island supplements.
        # 0.012 degrees is approximately 1.3 km at the equator. Administrative
        # outlines receive a looser tolerance: they are faint background strokes.
        features.append({'type': 'Feature', 'properties': {
            k: props[k] for k in ('scalerank', 'featurecla', 'ADMIN', 'ISO_A3') if k in props
        }, 'geometry': geometry(feature['geometry'], .012 if key == 'land' else .035)})
    (OUT / filename).write_text(packed({'type': 'FeatureCollection', 'source': SOURCES[key][1],
                                       'version': VERSION, 'features': features}), encoding='utf-8')


def build_relief():
    from PIL import Image
    import numpy as np
    archive = zipfile.ZipFile(source('relief'))
    image = Image.open(io.BytesIO(archive.read('SR_50M.tif'))).convert('L')
    # Geo-referenced source is -180..180, +90..-90. Match engine +80..-60.
    width, height = image.size
    image = image.crop((0, round(height * 10 / 180), width, round(height * 150 / 180)))
    image = image.resize((3600, 1400), Image.Resampling.LANCZOS)
    values = np.asarray(image).astype('int16')
    # Sea is the source's flat gray 128; transparency removes this baseline.
    alpha = np.minimum(255, np.abs(values - 128) * 2).astype('uint8')
    rgb = np.where(values[:, :, None] >= 128, 255, 0).astype('uint8')
    rgb = np.repeat(rgb, 3, axis=2)
    rgba = np.concatenate((rgb, alpha[:, :, None]), axis=2)
    Image.fromarray(rgba).save(OUT / 'terrain-shade.webp', 'WEBP', quality=76, method=6)
    return archive.read('SR_50M.VERSION.txt').decode().strip()


def build_labels():
    config = json.loads((ROOT / 'tools/place-names.json').read_text(encoding='utf-8'))
    sources = {key: json.loads(source(key).read_text(encoding='utf-8')) for key in ('marine', 'regions', 'points')}
    labels = []
    regions = {}
    for entry in config['places']:
        feature = next((f for f in sources[entry['sourceLayer']]['features']
                        if f['properties'].get('NAME', f['properties'].get('name')) == entry['sourceName']), None)
        if feature is None:
            raise ValueError('Unknown Natural Earth feature: ' + entry['sourceName'])
        props = feature['properties']
        point = feature['geometry']['coordinates'] if entry['sourceLayer'] == 'points' else entry['point']
        def vertices(value):
            if isinstance(value[0], (int, float)):
                yield value
            else:
                for child in value:
                    yield from vertices(child)
        positions = list(vertices(feature['geometry']['coordinates']))
        assert min(p[0] for p in positions) <= point[0] <= max(p[0] for p in positions), entry['id']
        assert min(p[1] for p in positions) <= point[1] <= max(p[1] for p in positions), entry['id']
        labels.append({'id': entry['id'], 'name': entry['name'], 'lon': round(point[0], 5),
                       'lat': round(point[1], 5), 'kind': entry['kind'], 'priority': entry['priority'],
                       'sourceName': entry['sourceName'], 'sourceLayer': entry['sourceLayer'],
                       'naturalEarthId': props.get('NE_ID', props.get('ne_id'))})
        if entry['sourceLayer'] != 'points':
            # Decorative area coverage only: never used for navigation/discovery.
            geom = geometry(feature['geometry'], .15)
            polygons = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
            regions[entry['id']] = []
            for rings in polygons:
                outer = rings[0]
                regions[entry['id']].append({'bounds': [min(p[0] for p in outer), min(p[1] for p in outer),
                                                       max(p[0] for p in outer), max(p[1] for p in outer)], 'rings': rings})
    assert len(labels) == 60 and len({p['id'] for p in labels}) == 60
    assert all(-180 <= p['lon'] <= 180 and -60 <= p['lat'] <= 80 for p in labels)
    result = '// Generated by tools/build-chart-assets.py; geographical background labels only.\n'
    result += 'export const PLACE_NAMES_VERSION=' + packed(VERSION) + ';\n'
    result += 'export const PLACE_NAMES=' + json.dumps(labels, ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'dist/place-names.js').write_text(result, encoding='utf-8')
    (ROOT / 'dist/place-regions.js').write_text('// Generated from pinned Natural Earth v5.1.2 polygons; display coverage only.\nexport const PLACE_REGIONS='+packed(regions)+';\n',encoding='utf-8')


def main():
    untouched = {name: digest(OUT / name) for name in ('navigation.json', 'rivers.json', 'islands.geojson')}
    build_geometry('land', 'world-land.geojson')
    build_geometry('countries', 'world-countries.geojson')
    relief_version = build_relief()
    build_labels()
    assert all(digest(OUT / name) == sha for name, sha in untouched.items())
    names = ['world-land.geojson', 'world-countries.geojson', 'navigation.json', 'rivers.json',
             'islands.geojson', 'terrain-shade.webp']
    sizes = {name: (OUT / name).stat().st_size for name in names}
    sizes['../place-names.js'] = (ROOT / 'dist/place-names.js').stat().st_size
    sizes['../place-regions.js'] = (ROOT / 'dist/place-regions.js').stat().st_size
    assert sum(sizes.values()) <= 8_000_000, sizes
    manifest = {'version': VERSION, 'license': 'Natural Earth public domain',
                'geometrySourceTag': 'v5.1.2', 'reliefEmbeddedVersion': relief_version,
                'projection': {'west': -180, 'east': 180, 'north': 80, 'south': -60,
                               'svgWidth': 1600, 'svgHeight': 800},
                'simplificationDegrees': {'land': .012, 'countries': .035, 'displayRegions': .15}, 'untouchedNavigationSources': untouched,
                'bytes': sizes, 'totalBytes': sum(sizes.values()),
                'sources': {key: {'url': url, 'sha256': digest(source(key))}
                            for key, (_, url) in SOURCES.items()}}
    (OUT / 'chart-assets-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'bytes': sizes, 'total': sum(sizes.values()), 'labels': 60}, indent=2))


if __name__ == '__main__':
    main()
