import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_LIMIT,chatText,validChat,recentChat,rankFleet,rankStats} from '../dist/social-core.js';
const message=seq=>({seq,uid:'a',name:'선장',text:'안녕하세요',at:Date.now()});
test('chat keeps the last 50 messages in sequence order and rejects malformed content',()=>{
  const all=Array.from({length:72},(_,i)=>message(i+1)).reverse();
  const recent=recentChat(all);assert.equal(recent.length,CHAT_LIMIT);assert.equal(recent[0].seq,23);assert.equal(recent.at(-1).seq,72);
  assert.equal(validChat({...message(1),text:'가'.repeat(201)}),false);assert.equal(validChat({...message(1),seq:1.5}),false);
  assert.equal(chatText('  안녕\u0000하세요  '),'안녕하세요');assert.equal(chatText('   '),'');
  assert.equal(chatText('<b>반가워요</b>'),'<b>반가워요</b>'); // Rendered as text, never HTML.
});
test('each ranking uses its own metric and shows shared ranks for ties',()=>{
  const players=[{id:'a',name:'가',money:4000,profit:100,visited:3},{id:'b',name:'나',money:2000,profit:800,visited:8},{id:'c',name:'다',money:3000,profit:800,visited:4}];
  assert.deepEqual(rankFleet(players,'money').map(p=>p.id),['a','c','b']);
  assert.deepEqual(rankFleet(players,'profit').map(p=>[p.id,p.rank]),[['b',1],['c',1],['a',3]]);
  assert.deepEqual(rankFleet(players,'visited').map(p=>p.id),['b','c','a']);
  assert.equal(rankFleet([...players,{id:'old',name:'이전 버전'}],'money').length,3);
  assert.equal(rankStats({...players[0],money:Infinity}),false);assert.equal(rankStats({...players[0],profit:-10}),true);
});
