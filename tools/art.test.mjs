import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHIP_ART_NAMES,DISCOVERY_ART_IDS,shipArt,shipGlyph,discoverySvg,discoveryArt,shipArtPath} from '../dist/art.js';

test('twenty ship forms and thirty-two discovery illustrations are distinct and local',async()=>{
  assert.equal(SHIP_ART_NAMES.length,20);assert.equal(DISCOVERY_ART_IDS.length,32);
  const allShips=SHIP_ART_NAMES.map((_,i)=>shipArt(i));
  const allDiscoveries=DISCOVERY_ART_IDS.map(discoverySvg);
  assert.equal(new Set(allShips).size,20);assert.equal(new Set(allDiscoveries).size,32);
  assert.equal(new Set(SHIP_ART_NAMES.map((_,i)=>shipGlyph(i))).size,20);
  for(const [i,svg] of allShips.entries())assert.equal((await readFile(new URL('../dist/'+shipArtPath(i),import.meta.url),'utf8')).trim(),svg);
  for(const id of DISCOVERY_ART_IDS)assert.equal((await readFile(new URL('../dist/'+discoveryArt(id),import.meta.url),'utf8')).trim(),discoverySvg(id));
  for(const text of [...allShips,...allDiscoveries]){
    assert.ok(text.includes('viewBox="0 0 640 480"'));assert.ok(text.includes('<title'));
    assert.doesNotMatch(text,/<script|foreignObject|onload=|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i);
    assert.doesNotMatch(text,/NaN|undefined/);
    for(const tag of text.matchAll(/<[a-z][^>]*>/gi)){
      const attrs=[...tag[0].matchAll(/\s([\w:-]+)=/g)].map(m=>m[1]);
      assert.equal(new Set(attrs).size,attrs.length,'duplicate XML attribute: '+tag[0]);
    }
  }
});

test('a new log raft has no mast or sail and invalid input cannot inject SVG',()=>{
  assert.notEqual(shipGlyph(0),shipGlyph(1));
  assert.equal(shipArt(-8),shipArt(0));assert.equal(shipArt(100),shipArt(19));
  assert.equal(shipArt(NaN),shipArt(0));
  assert.doesNotMatch(shipGlyph(5,'"><script>oops</script>'),/script|oops/);
  assert.equal(discoveryArt('../../escape'),'assets/discoveries/unknown.svg');
  assert.ok(discoverySvg('unknown').includes('아직 발견하지 않은 항목'));
});
