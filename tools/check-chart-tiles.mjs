import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const textHash = bytes => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
// Transfer size of all 237 images and the overview in the previous color chart.
const colorByteBudget = 2_201_280;

// Pillow writes a lossy VP8 image, lossless VP8L or extended VP8X header.
function imageSize(bytes, file) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', file);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', file);
  switch (bytes.toString('ascii', 12, 16)) {
    case 'VP8 ':
      return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
    case 'VP8L': {
      const packed = bytes.readUInt32LE(21);
      return [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
    }
    case 'VP8X':
      return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
    default:
      throw Error('Unsupported WebP header in ' + file);
  }
}

async function verifyImage(directory, entry) {
  const path = 'dist/assets/' + directory + '/' + entry.file;
  const bytes = await read(path);
  assert.equal(hash(bytes), entry.sha256, 'Image checksum mismatch: ' + path);
  if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes, path);
  return {size: imageSize(bytes, path), bytes: bytes.length};
}

async function verifyChart(directory, manifest) {
  const {size, scale, width, height, tiles} = manifest;
  assert.ok(Number.isInteger(scale) && scale > 0, 'Invalid tile resolution');
  const overview = await verifyImage(directory, manifest.overview);
  const [overviewW, overviewH] = overview.size;
  assert.ok(overviewW > 0 && overviewW <= width && overviewW * height === overviewH * width,
    'Overview must fit the world with the same aspect ratio: ' + directory);
  let total = overview.bytes;
  for (const [key, entry] of Object.entries(tiles)) {
    const [col, row] = key.split(',').map(Number);
    const w = Math.min(size, width - col * size);
    const h = Math.min(size, height - row * size);
    const image = await verifyImage(directory, entry);
    assert.deepEqual(image.size, [w * scale, h * scale], 'Tile dimensions mismatch: ' + entry.file);
    total += image.bytes;
  }
  console.log(`${directory}: ${Object.keys(tiles).length} tiles + overview, ${total} bytes`);
  return total;
}

const classic = JSON.parse(await read('dist/assets/chart-tiles/manifest.json'));
for (const [file, expected] of Object.entries(classic.sources)) {
  assert.equal(hash(await read('dist/assets/' + file)), expected, 'Classic source changed: ' + file);
}
assert.equal(hash(await read('tools/build-chart-tiles.py')), classic.builder, 'Rebuild the classic chart');
await verifyChart('chart-tiles', classic);

const color = JSON.parse(await read('dist/assets/chart-color/manifest.json'));
for (const field of ['size', 'width', 'height']) assert.equal(color[field], classic[field], field);
assert.deepEqual(Object.keys(color.tiles).sort(), Object.keys(classic.tiles).sort(), 'Tile coverage changed');
for (const [key, entry] of Object.entries(color.tiles)) {
  assert.equal(entry.file, classic.tiles[key].file, 'Tile registered to the wrong grid cell: ' + key);
}
assert.equal(textHash(await read('tools/build-color-chart.py')), color.builder, 'Rebuild the color chart');
assert.equal(
  textHash(await read('dist/assets/chart-tiles/manifest.json')),
  color.sources?.['chart-tiles/manifest.json'],
  'Rebuild the color chart from the current coastline and rivers',
);
const colorBytes = await verifyChart('chart-color', color);
assert.ok(colorBytes <= colorByteBudget, `Color chart exceeds the previous ${colorByteBudget} byte budget`);
