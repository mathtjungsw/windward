// Extend the existing rules without replacing market, ranking or community guards.
import fs from 'node:fs';
import {CANNONS,QUALITIES,cannonStats} from '../dist/cannons.js';
import {GOODS} from '../dist/data.js';
const file=new URL('../firebase.database.rules.json',import.meta.url),json=JSON.parse(fs.readFileSync(file)),r=json.rules.gameV2;
const auth="auth != null && auth.token.firebase.sign_in_provider == 'google.com'";
const oldRoot="root.child('gameV2')",child=(n,p)=>`${n}.child('${p}')`,val=(n,p)=>`${child(n,p)}.val()`,exists=(n,p)=>`${child(n,p)}.exists()`;
const eq=(a,b,p)=>`${val(a,p)} == ${val(b,p)}`,all=a=>'('+a.join(' && ')+')',any=a=>'('+a.join(' || ')+')';
const num=(n,p,lo=0,hi=1e12)=>`${child(n,p)}.isNumber() && ${val(n,p)} >= ${lo} && ${val(n,p)} <= ${hi}`;
const immutable=(n,o,keys)=>all(keys.map(p=>eq(n,o,p)));
const priv=r.privateSaves.$uid;
priv['.write']=`${auth} && auth.uid == $uid && newData.exists() && ((newData.child('schemaVersion').val() == 6 && newData.child('defenseSeq').val() == (newData.parent().parent().child('fleetStates').child($uid).child('seq').exists()?newData.parent().parent().child('fleetStates').child($uid).child('seq').val():0)) || (!root.child('gameV2/config/minSchema').exists() && (!data.child('schemaVersion').exists() || data.child('schemaVersion').val() <= 5) && (newData.child('schemaVersion').val() == 5 || (newData.child('schemaVersion').val() == 4 && (!data.child('schemaVersion').exists() || data.child('schemaVersion').val() <= 4)))))`;
priv.schemaVersion['.validate']="newData.val() == 4 || newData.val() == 5 || newData.val() == 6";
priv.enrollment={'.validate':"!newData.exists() || (data.exists() && newData.child('id').val() == data.child('id').val() && newData.child('sourceRevision').val() == data.child('sourceRevision').val() && newData.child('sourceData').val() == data.child('sourceData').val())"};
priv.defenseSeq={'.validate':"newData.isNumber() && newData.val() >= 0 && newData.val()%1 == 0"};
r.config={'.read':auth,'.write':false};

// All cross-account writes must accompany one revision-checked raid and the
// caller's private receipt in the same root update. Never grant private access.
const nr="newData.parent().parent()",state=(uid,root=oldRoot)=>`${root}.child('fleetStates').child(${uid})`;
const receipt=(root,kind,key,shared)=>all([
 `${val(root,"privateSaves")}`.replace(/\.val\(\)$/, '')+`.child(auth.uid).child('revision').val() == ${oldRoot}.child('privateSaves').child(auth.uid).child('revision').val()+1`,
 `${root}.child('privateSaves').child(auth.uid).child('lastOperation/kind').val() == '${kind}'`,
 `${root}.child('privateSaves').child(auth.uid).child('lastOperation/key').val() == ${key}`,
 `${root}.child('privateSaves').child(auth.uid).child('lastOperation/id').val() == ${val(shared,'lastOperation/id')}`,
 `${val(shared,'lastOperation/uid')} == auth.uid`,`${val(shared,'lastOperation/saveRevision')} == ${root}.child('privateSaves').child(auth.uid).child('revision').val()`
]);
const raid=child(nr,'shared/raids')+`.child(${val('newData','lastRaidId')})`,room=child(raid,'content');
const raidWrite=all([exists('newData','lastRaidId'),`${val(raid,'revision')} == (${oldRoot}.child('shared/raids').child(${val('newData','lastRaidId')}).child('revision').exists()?${oldRoot}.child('shared/raids').child(${val('newData','lastRaidId')}).child('revision').val():0)+1`,
 receipt(nr,'raids',val('newData','lastRaidId'),raid),`($uid == ${val(room,'a')} || $uid == ${val(room,'b')})`,`${val('newData','revision')} == ${val('data','revision')}+1`,`${val('newData','seq')} == ${val('data','seq')}+1`,`${val('newData','hp')} == (${val('newData','rescuePending')} == true?0:${room}.child('players').child($uid).child('hp').val())`,
 `${val('newData','activeRaidId')} == (${val(room,'status')} == 'active'?${val(room,'id')}:'')`,`${val('newData','raidUntil')} == (${val(room,'status')} == 'active'?${val(room,'deadline')}:0)`
]);
const sync=all([`auth.uid == $uid`,`${val('newData','revision')} == (${exists('data','revision')}?${val('data','revision')}:0)+1`,`${val('newData','seq')} == (${exists('data','seq')}?${val('data','seq')}:0)`,`${val(nr,"privateSaves").replace(/\.val\(\)$/, '')}.child($uid).child('defenseSeq').val() == ${val('newData','seq')}`,`${val('newData','session')} == ${nr}.child('privateSaves').child($uid).child('session').val()`,`(!${exists('data','activeRaidId')} || ${val('data','activeRaidId')} == '' || ${val('data','raidUntil')} <= now || ${val('newData','activeRaidId')} == ${val('data','activeRaidId')})`]);
const position=all([`auth.uid == $uid`,eq('newData','data','revision'),eq('newData','data','seq'),`${val('newData','positionSeq')} == ${val('data','positionSeq')}+1`,eq('newData','data','session'),`${val('newData','session')} == ${nr}.child('privateSaves').child($uid).child('session').val()`]);
const syncMode=`(${val('newData.parent()','seq')} == ${val('data.parent()','seq')} && ${val('newData.parent()','revision')} != ${val('data.parent()','revision')} && auth.uid == $uid)`;
r.fleetStates={$uid:{'.read':auth,'.write':`${auth} && newData.exists() && (${sync} || ${position} || ${raidWrite})`,'.validate':all([
 "newData.hasChildren(['version','revision','seq','positionSeq','name','session','saveRevision','point','sector','portId','hp','maxHP','gunCount','repair','protected','protectedUntil','lootRoom','pendingLootCount','cashTotal','killsTotal','claimedLootJSON','lostReserveId','rescuePending','lastRaidId','activeRaidId','raidUntil','at'])",
 `${val('newData','version')} == 1`,`${val('newData','at')} == now`,num('newData','seq'),`${val('newData','seq')}%1 == 0`,num('newData','revision',1),num('newData','positionSeq'),num('newData','hp',0,100000),num('newData','maxHP',1,100000),num('newData','gunCount',0,40),`${val('newData','hp')} <= ${val('newData','maxHP')}`,num('newData','lootRoom',0,50),num('newData','pendingLootCount',0,50),num('newData','repair',0,3000),num('newData','cashTotal'),num('newData','killsTotal'),num('newData','protectedUntil',0,9999999999999),num('newData','raidUntil',0,9999999999999),`${child('newData','protected')}.isBoolean()`,`${child('newData','rescuePending')}.isBoolean()`,`${child('newData','portId')}.isString()`,`${child('newData','sector')}.isString()`
 ]),point:{'.validate':"newData.hasChildren(['0','1'])",0:{'.validate':'newData.isNumber() && newData.val() >= -180 && newData.val() <= 180'},1:{'.validate':'newData.isNumber() && newData.val() >= -60 && newData.val() <= 80'},$other:{'.validate':false}}}};
const node=r.fleetStates.$uid;
// Position-only packets may not change assets. Raid packets may not change
// identity, equipment or escrow, even when authored by the other participant.
const fixed=['version','name','session','saveRevision','maxHP','gunCount','repair','protectedUntil','lootRoom','claimedLootJSON'];
for(const key of fixed)node[key]={'.validate':`${syncMode} || newData.val() == data.val()`};
const pOwner=`auth.uid == $uid && ${syncMode}`;
for(const key of ['point','sector','portId','positionSeq']){
 const guard=`(${val('newData.parent()','seq')} == ${val('data.parent()','seq')} || ${eq('newData','data','')})`.replace(/\.child\(''\)/g,'');
 if(key==='point')node.point['.validate']+=` && (${val('newData.parent()','seq')} == ${val('data.parent()','seq')} || (newData.child('0').val() == data.child('0').val() && newData.child('1').val() == data.child('1').val()))`;
 else node[key]={'.validate':guard};
}
node.name['.validate']+=` && newData.isString() && newData.val().length > 0 && newData.val().length <= 16`;
node.session['.validate']+=` && newData.isString() && newData.val().length <= 80`;
// Equipment maps have stable IDs; slot ties the canonical map to the room array.
node.guns={$gun:{'.validate':"newData.hasChildren(['id','kind','quality','shipId','readyAt','slot']) && newData.child('id').val() == $gun && newData.child('slot').isNumber() && newData.child('slot').val() >= 0 && newData.child('slot').val() < 40",
 ...Object.fromEntries(['id','kind','quality','shipId','slot'].map(k=>[k,{'.validate':`(auth.uid == $uid && newData.parent().parent().parent().child('seq').val() == data.parent().parent().parent().child('seq').val() && newData.parent().parent().parent().child('revision').val() != data.parent().parent().parent().child('revision').val()) || newData.val() == data.val()`}])),
 readyAt:{'.validate':`newData.isNumber() && newData.val() >= 0 && (newData.val() == data.val() || (auth.uid == $uid && newData.parent().parent().parent().child('seq').val() == data.parent().parent().parent().child('seq').val()) || newData.val() == newData.parent().parent().parent().parent().parent().child('shared/raids').child(newData.parent().parent().parent().child('lastRaidId').val()).child('content/players').child($uid).child('guns').child(''+newData.parent().child('slot').val()).child('readyAt').val())`}}};
node.bank={'.validate':`auth.uid == $uid && newData.parent().child('seq').val() == data.parent().child('seq').val() || (newData.child('id').val() == data.child('id').val() && newData.child('money').val() == data.child('money').val() && newData.child('cargoJSON').val() == data.child('cargoJSON').val())`,cargo:{$good:{'.validate':"newData.child('qty').val() == data.child('qty').val() && newData.child('cost').val() == data.child('cost').val() || (auth.uid == $uid && newData.parent().parent().parent().child('seq').val() == data.parent().parent().parent().child('seq').val())"}}};
// Validation also covers deletions through the parent: a foreign raid cannot
// remove escrow or guns that were present before the exchange.
node['.validate']+=` && (${sync} || ${position} && ${immutable('newData','data',['hp','pendingLootCount','protected','rescuePending','cashTotal','killsTotal','lostReserveId','lastRaidId','activeRaidId','raidUntil'])} || ${raidWrite} && newData.child('bank/id').val() == data.child('bank/id').val() && newData.child('bank/money').val() == data.child('bank/money').val() && newData.child('bank/cargoJSON').val() == data.child('bank/cargoJSON').val())`;
// Canonical cash and kill totals are cumulative and can rise only once on close.
for(const metric of ['cashTotal','killsTotal']){
 const n='newData.parent()',rr=child(n+'.parent().parent()','shared/raids')+`.child(${val(n,'lastRaidId')})`,cc=child(rr,'content');
 const increment=metric==='cashTotal'?`${cc}.child('reserves').child(${val(cc,'loser')}).child('money').val()`:`(${cc}.child('players').child(${val(cc,'loser')}).child('hp').val() == 0?1:0)`;
 node[metric]={'.validate':`newData.isNumber() && newData.val() >= 0 && newData.val() == (data.exists()?data.val():0)+(${val(n,'seq')} != ${val('data.parent()','seq')} && ${val(cc,'status')} == 'closed' && ${val(cc,'winner')} == $uid?${increment}:0)`};
}
const n='newData',c=room,other=`(${val(c,'a')} == $uid?${val(c,'b')}:${val(c,'a')})`,oldOther=state(other),newOther=state(other,nr);
node['.validate']+=` && (${val(n,'seq')} == (${exists('data','seq')}?${val('data','seq')}:0) || ((${val(c,'status')} == 'closed' && ${val(c,'loser')} == $uid)?(${val(n,'rescuePending')} == true && ${val(n,'protected')} == true && ${val(n,'lostReserveId')} == ${c}.child('reserves').child($uid).child('id').val()):(${eq(n,'data','rescuePending')} && ${eq(n,'data','protected')} && ${eq(n,'data','lostReserveId')})))`;
// Per-good rules retain cumulative totals and conserve the escrow remainder.
const goodsPattern="^("+Object.keys(GOODS).join('|')+")$";
const N='newData.parent().parent()',O='data.parent().parent()',R=N+'.parent().parent()',RC=child(R,'shared/raids')+`.child(${val(N,'lastRaidId')}).child('content')`,OTHER=`(${val(RC,'a')} == $uid?${val(RC,'b')}:${val(RC,'a')})`,OS=state(OTHER),NS=state(OTHER,R);
const zero=(snap,p)=>`(${exists(snap,p)}?${val(snap,p)}:0)`,good='$good';
const winner=`(${val(N,'seq')} != ${val(O,'seq')} && ${val(RC,'status')} == 'closed' && ${val(RC,'winner')} == $uid)`;
const bqty=zero(OS+`.child('bank/cargo').child($good)`,'qty'),bcost=zero(OS+`.child('bank/cargo').child($good)`,'cost');
node.lootTotals={$good:{'.validate':all([`$good.matches(/${goodsPattern}/)`,"newData.hasChildren(['qty','cost'])",num('newData','qty'),`${val('newData','qty')}%1 == 0`,num('newData','cost'),`${val('newData','qty')} >= (${exists('data','qty')}?${val('data','qty')}:0)`,`${val('newData','cost')} >= (${exists('data','cost')}?${val('data','cost')}:0)`,
`${winner}?(${val('newData','qty')}-${zero('data','qty')} <= ${bqty} && (${bqty} == 0?${val('newData','cost')} == ${zero('data','cost')}:(${val('newData','cost')}-${zero('data','cost')})*${bqty} >= ${bcost}*(${val('newData','qty')}-${zero('data','qty')})-0.001 && (${val('newData','cost')}-${zero('data','cost')})*${bqty} <= ${bcost}*(${val('newData','qty')}-${zero('data','qty')})+0.001)):(${val('newData','qty')} == ${zero('data','qty')} && ${val('newData','cost')} == ${zero('data','cost')})`.replace(/^\+ /,'')
])}};
const gain=(snap,p)=>`${zero(NS+`.child('lootTotals').child($good)`,p)}-${zero(OS+`.child('lootTotals').child($good)`,p)}`;
node.returnedCargo={$good:{'.validate':`$good.matches(/${goodsPattern}/) && newData.hasChildren(['qty','cost']) && ((${val(N,'seq')} == ${val(O,'seq')}) || (${val(RC,'status')} == 'closed' && ${val(RC,'loser')} == $uid && ${val('newData','qty')} == ${zero(O+`.child('bank/cargo').child($good)`,'qty')}-(${gain(null,'qty')}) && ${val('newData','cost')} >= ${zero(O+`.child('bank/cargo').child($good)`,'cost')}-(${gain(null,'cost')})-0.001 && ${val('newData','cost')} <= ${zero(O+`.child('bank/cargo').child($good)`,'cost')}-(${gain(null,'cost')})+0.001))`}};
let qtyGain=[];
for(const id of Object.keys(GOODS)){
const q=`lootTotals/${id}/qty`,co=`lootTotals/${id}/cost`;
node['.validate']+=` && ${zero('newData',q)} >= ${zero('data',q)} && ${zero('newData',co)} >= ${zero('data',co)}`;
const returned=`returnedCargo/${id}/qty`,bank=`bank/cargo/${id}/qty`,oq=`lootTotals/${id}/qty`;
node['.validate']+=` && ((${val('newData','seq')} != ${val('data','seq')} && ${val(c,'status')} == 'closed' && ${val(c,'loser')} == $uid)?${zero('newData',returned)} == ${zero('data',bank)}-(${zero(newOther,oq)}-${zero(oldOther,oq)}):true)`;
qtyGain.push(`(${zero('newData',q)}-${zero('data',q)})`);
node['.validate']+=` && (${val('newData','seq')} == ${zero('data','seq')} || (${eq('newData','data',`bank/cargo/${id}/qty`)} && ${eq('newData','data',`bank/cargo/${id}/cost`)}))`;
}
node['.validate']+=` && (${qtyGain.join('+')}) <= (data.child('lootRoom').exists()?data.child('lootRoom').val()-data.child('pendingLootCount').val():50) && (newData.child('seq').val() == (data.child('seq').exists()?data.child('seq').val():0) || newData.child('pendingLootCount').val() == data.child('pendingLootCount').val()+(${qtyGain.join('+')}))`;

// Raid room. Profile and reserve snapshots come only from canonical fleet state.
const root='newData.parent().parent().parent()',C=child('newData','content'),D=child('data','content'),A=val(C,'a'),B=val(C,'b');
const events=child(C,'events'),eventCount=`(${events}.child('1').exists()?2:(${events}.child('0').exists()?1:0))`;
const participants=[A,B];
const available=u=>all([`${val(state(u),'portId')} == ''`,`${val(state(u),'protected')} == false`,`${val(state(u),'rescuePending')} == false`,`${val(state(u),'protectedUntil')} <= now`,`${val(state(u),'hp')} > 0`,exists(state(u),'bank'),`(!${exists(state(u),'activeRaidId')} || ${val(state(u),'activeRaidId')} == '' || ${val(state(u),'raidUntil')} <= now)`,`(!${oldRoot}.child('combatSlots').child(${u}).exists() || (${oldRoot}.child('combatSlots').child(${u}).val() == 'raid:'+${val(state(u),'activeRaidId')} && ${val(state(u),'raidUntil')} <= now))`]);
const offline=`(!${oldRoot}.child('real/fleetConnections').child(${B}).exists() || ${oldRoot}.child('real/fleetConnections').child(${B}).child('online').val() == false || ${oldRoot}.child('real/fleetConnections').child(${B}).child('at').val() < now-45000)`;
const rr={'.read':`${auth} && (!data.exists() || data.child('content/a').val() == auth.uid || data.child('content/b').val() == auth.uid)`,'.write':all([auth,'newData.exists()',`${val('newData','revision')} == (${exists('data','revision')}?${val('data','revision')}:0)+1`,receipt(root,'raids','$raid','newData'),`(auth.uid == ${A} || auth.uid == ${B})`,
 `(!data.exists()?(${A} == auth.uid && ${A} != ${B} && ${available(A)} && ${available(B)} && ${offline} && ${val(C,'createdAt')} >= now-5000 && ${val(C,'createdAt')} <= now+5000):(${val(D,'status')} == 'active' && ${immutable(C,D,['id','offline','a','b','defender','defenderSession','mode','createdAt','deadline'])} && ${val(state(A),'activeRaidId')} == $raid && ${val(state(B),'activeRaidId')} == $raid))`,
 `${val(C,'id')} == $raid`,`${val(C,'offline')} == true`,`${val(C,'mode')} == 'free'`,`${val(C,'defender')} == ${B}`,`${val(C,'defenderSession')} == ${val(state(B),'session')}`,`${val(C,'deadline')} == ${val(C,'createdAt')}+180000`,`${val(C,'sequence')} == (${exists(D,'sequence')}?${val(D,'sequence')}:0)+${eventCount}`,
 `(${eventCount} > 0?now < ${val(C,'deadline')}:(${val(C,'status')} == 'draw' && now >= ${val(C,'deadline')} || ${val(C,'status')} == 'closed' && ${val(C,'reason')} == '후퇴' && ${val(C,'loser')} == auth.uid))`,
 `(${val(C,'status')} == 'active' || ${val(C,'status')} == 'draw' || (${val(C,'status')} == 'closed' && (${val(C,'winner')} == ${A} || ${val(C,'winner')} == ${B}) && (${val(C,'loser')} == ${A} || ${val(C,'loser')} == ${B}) && ${val(C,'winner')} != ${val(C,'loser')} && (${eventCount} == 0 || ${C}.child('players').child(${val(C,'loser')}).child('hp').val() == 0)))`,
 ...participants.map(u=>`${val(state(u,root),'lastRaidId')} == $raid && ${val(state(u,root),'seq')} == ${val(state(u),'seq')}+1 && ${val(state(u,root),'revision')} == ${val(state(u),'revision')}+1`)
 ]),'.validate':`${val('newData','updatedAt')} == now && newData.hasChildren(['revision','content','lastOperation','updatedAt'])`,content:{'.validate':"newData.hasChildren(['id','offline','a','b','defender','defenderSession','mode','status','players','reserves','createdAt','deadline','sequence','event','_version'])"}};
r.shared.raids={$raid:rr};
rr.content.players={$uid:{'.validate':`($uid == newData.parent().parent().child('a').val() || $uid == newData.parent().parent().child('b').val()) && newData.hasChildren(['name','hp','maxHP','beforeHP','lootRoom','repair','point'])`}};const pc=rr.content.players.$uid;
const PR='newData.parent().parent()',baseline=state('$uid');
for(const p of ['name','maxHP','repair'])pc[p]={'.validate':`newData.val() == (data.exists()?data.val():${val(baseline,p)})`};
pc.lootRoom={'.validate':`newData.val() == (data.exists()?data.val():${val(baseline,'lootRoom')}-${val(baseline,'pendingLootCount')})`};
pc.beforeHP={'.validate':`newData.val() == (data.exists()?data.val():${val(baseline,'hp')})`};
const damage=i=>`(newData.parent().parent().parent().child('events/${i}/actor').exists() && newData.parent().parent().parent().child('events/${i}/actor').val() != $uid?newData.parent().parent().parent().child('events/${i}/damage').val():0)`;
pc.hp={'.validate':`newData.isNumber() && newData.val() >= 0 && newData.val() <= newData.parent().child('maxHP').val() && newData.val() == ${val(baseline,'hp')}-${damage(0)}-${damage(1)}`};
pc.point={'.validate':`newData.child('0').val() == ${val(baseline,'point/0')} && newData.child('1').val() == ${val(baseline,'point/1')}`};
pc.guns={$index:{'.validate':`$index.matches(/^([0-9]|[1-3][0-9])$/) && newData.hasChildren(['id','kind','quality','shipId','readyAt']) && ${oldRoot}.child('fleetStates').child($uid).child('guns').child(newData.child('id').val()).child('slot').val()+'' == $index`}};
for(const p of ['id','kind','quality','shipId'])pc.guns.$index[p]={'.validate':`newData.val() == ${oldRoot}.child('fleetStates').child($uid).child('guns').child(newData.parent().child('id').val()).child('${p}').val()`};
const gr="newData.parent().parent().parent().parent().parent()";
const ownShot=i=>`${val(gr,`events/${i}/actor`)} == $uid && ${val(gr,`events/${i}/gunId`)} == newData.parent().child('id').val()`;
pc.guns.$index.readyAt={'.validate':`newData.isNumber() && newData.val() == (${ownShot(1)}?${val(gr,'events/1/at')}+${val(gr,'events/1/reloadMS')}:(${ownShot(0)}?${val(gr,'events/0/at')}+${val(gr,'events/0/reloadMS')}:${oldRoot}.child('fleetStates').child($uid).child('guns').child(newData.parent().child('id').val()).child('readyAt').val()))`};
rr.content.reserves={$uid:{'.validate':`newData.child('id').val() == ${val(baseline,'bank/id')} && newData.child('money').val() == ${val(baseline,'bank/money')} && newData.child('cargoJSON').val() == ${val(baseline,'bank/cargoJSON')}`}};
rr.content.events={'.validate':"!newData.exists() || newData.hasChild('0')",$index:{'.validate':"$index == '0' || $index == '1'"}};
const E='newData',er='newData.parent().parent()',actor=val(E,'actor'),gun=state(actor)+`.child('guns').child(${val(E,'gunId')})`;
const knownStats=any(CANNONS.flatMap(k=>QUALITIES.map((_,quality)=>{const s=cannonStats({kind:k.id,quality});return all([`${val(gun,'kind')} == '${k.id}'`,`${val(gun,'quality')} == ${quality}`,`${val(E,'damagePotential')} == ${s.damage}`,`${val(E,'reloadMS')} == ${Math.round(s.reload*1000)}`]);})));
rr.content.events.$index['.validate']+=' && '+all([
 "newData.hasChildren(['sequence','actor','kind','gunId','gunIndex','damagePotential','reloadMS','hit','damage','at'])",`${val(E,'kind')} == 'shot'`,`${val(E,'sequence')} == (${oldRoot}.child('shared/raids').child($raid).child('content/sequence').exists()?${oldRoot}.child('shared/raids').child($raid).child('content/sequence').val():0)+($index == '0'?1:2)`,`${val(E,'at')} >= now-5000`,`${val(E,'at')} <= now+5000`,`${val(gun,'id')} == ${val(E,'gunId')}`,`${val(gun,'slot')} == ${val(E,'gunIndex')}`,`${val(gun,'readyAt')} <= ${val(E,'at')}`,`${val(E,'damage')} >= 0`,`${val(E,'damage')} <= ${val(E,'damagePotential')}`,`${child(E,'hit')}.isBoolean()`,`${val(E,'hit')} == true || ${val(E,'damage')} == 0`,knownStats,
 `(${actor} == auth.uid || (auth.uid == ${val(er,'a')} && ${actor} == ${val(er,'b')} && (!${oldRoot}.child('real/fleetConnections').child(${actor}).exists() || ${oldRoot}.child('real/fleetConnections').child(${actor}).child('online').val() == false || ${oldRoot}.child('real/fleetConnections').child(${actor}).child('at').val() < now-45000)))`,
 `($index == '0' || (${val(E,'actor')} != newData.parent().child('0/actor').val() && newData.parent().child('0/actor').val() == auth.uid && ${val(E,'actor')} == ${val(er,'b')}))`
]);

// Every equipped canonical gun must survive a foreign update. Room slots are
// exhaustive, not a caller-selected subset of the defender's equipment.
for(let i=0;i<40;i++){
 const player=`${room}.child('players').child($uid)`,rg=`${player}.child('guns/${i}')`,ng=`newData.child('guns').child(${val(rg,'id')})`;
 node['.validate']+=` && (${val('newData','seq')} == ${zero('data','seq')} || (${val('data','gunCount')} > ${i}?(${exists(player,`guns/${i}`)} && ${exists(ng,'id')} && ${val(ng,'slot')} == ${i}):!${exists(player,`guns/${i}`)}))`;
 pc['.validate']+=` && (${val(baseline,'gunCount')} > ${i}?${exists('newData',`guns/${i}`)}:!${exists('newData',`guns/${i}`)})`;
}
// Temporary combat slots interlock existing online/NPC combat with raids.
const slot=r.combatSlots.$uid;
if(!slot['.write'].includes('/*raid-v1*/')){
 const SR='newData.parent().parent()',SS=state('$uid',SR),SID=val(SS,'lastRaidId'),RRAID=child(SR,'shared/raids')+`.child(${SID})`,RR=child(RRAID,'content');
 slot['.write']=`(${slot['.write']}) || (${auth} && ${receipt(SR,'raids',SID,RRAID)} && ${val(SS,'seq')} == ${val(state('$uid'),'seq')}+1 && ($uid == ${val(RR,'a')} || $uid == ${val(RR,'b')}) && ((${val(RR,'status')} == 'active' && newData.val() == 'raid:'+${SID}) || (${val(RR,'status')} != 'active' && !newData.exists()))) /*raid-v1*/`;
}

// A defeated bank must also disappear from the legacy combat entry point.
const vault=r.combatVaults.$uid;
function unwrapFirst(expr){let depth=0,quote=false;for(let i=0;i<expr.length;i++){const ch=expr[i];if(ch==="'"&&expr[i-1]!=="\\")quote=!quote;if(quote)continue;if(ch==='(')depth++;if(ch===')'&&--depth===0)return expr.slice(1,i);}throw Error('Cannot recover original legacy rule.');}
let vaultLegacy=vault['.write'];
if(vaultLegacy.includes('/*raid-bank-v2*/'))vaultLegacy=unwrapFirst(vaultLegacy.slice(vaultLegacy.indexOf('/*legacy-start*/')+'/*legacy-start*/'.length).trim());
else if(vaultLegacy.includes('/*raid-bank-v1*/'))vaultLegacy=unwrapFirst(vaultLegacy);
{
 const VR='newData.parent().parent()',VS=state('$uid',VR),VI=val(VS,'lastRaidId'),VROOM=child(VR,'shared/raids')+`.child(${VI})`;
 vault['.write']=`(${auth} && !newData.exists() && ${VR}.child('privateSaves').child(auth.uid).child('lastOperation/kind').val() == 'raids' && ${VS}.child('lastRaidId').isString() && ${receipt(VR,'raids',VI,VROOM)} && ${val(VS,'seq')} == ${val(state('$uid'),'seq')}+1 && ${val(VROOM,'content/status')} == 'closed' && ${val(VROOM,'content/loser')} == $uid && ${val(VS,'rescuePending')} == true) || /*legacy-start*/ (${vaultLegacy}) /*raid-bank-v2*/`;
}
const legacyBattle=r.shared.battles.$battle;
if(!legacyBattle['.write'].includes('/*canonical-guard-v1*/')){
 const BC=child('newData','content');legacyBattle['.write']=`(${legacyBattle['.write']}) && (data.exists() || `+all(['a','b'].map(role=>{const S=state(val(BC,role));return `(!${S}.exists() || (${val(S,'portId')} == '' && ${val(S,'rescuePending')} == false && ${val(S,'hp')} > 0 && (${val(S,'activeRaidId')} == '' || ${val(S,'raidUntil')} <= now)))`;}))+`) /*canonical-guard-v1*/`;
}
const legacySector=r.real.sectors.$sector.$boat;
if(!legacySector['.write'].includes('config/minSchema'))legacySector['.write']=`(${legacySector['.write']}) && (!newData.exists() || !root.child('gameV2/config/minSchema').exists())`;

// Persistent positions and private sparse navigation checkpoints.
r.privateNavigation={$uid:{'.read':`${auth} && auth.uid == $uid`,'.write':`${auth} && auth.uid == $uid && newData.exists() && newData.child('session').val() == newData.parent().parent().child('privateSaves').child($uid).child('session').val()`,'.validate':"newData.hasChildren(['data','baseRevision','seq','session','updatedAt']) && newData.child('data').isString() && newData.child('data').val().length <= 50000 && newData.child('updatedAt').val() == now && newData.child('baseRevision').val() == newData.parent().parent().child('privateSaves').child($uid).child('revision').val() && newData.child('seq').val() == newData.parent().parent().child('fleetStates').child($uid).child('positionSeq').val()"}};
r.real.fleetConnections={$uid:{'.read':auth,'.write':`${auth} && auth.uid == $uid && newData.exists() && newData.child('session').val() == newData.parent().parent().parent().child('privateSaves').child($uid).child('session').val()`,'.validate':"newData.hasChildren(['session','online','at']) && newData.child('online').isBoolean() && newData.child('at').val() == now"}};
const indexRoot='newData.parent().parent().parent().parent()',idxState=state('$uid',indexRoot);
r.real.fleetIndex={$sector:{'.read':`${auth} && query.orderByKey == true && query.limitToFirst != null && query.limitToFirst <= 100`,$uid:{'.write':`${auth} && ((auth.uid == $uid && (!newData.exists() || newData.child('session').val() == ${indexRoot}.child('privateSaves').child($uid).child('session').val())) || (!newData.exists() && ${val(idxState,'rescuePending')} == true && ${val(idxState,'seq')} == ${val(state('$uid'),'seq')}+1 && ${val(idxState,'lastRaidId')} == ${indexRoot}.child('privateSaves').child(auth.uid).child('lastOperation/key').val() && ${indexRoot}.child('privateSaves').child(auth.uid).child('lastOperation/kind').val() == 'raids'))`,'.validate':`newData.hasChildren(['uid','name','session','persistent','offline','lon','lat','angle','color','status','updatedAt','positionSeq']) && newData.child('uid').val() == $uid && newData.child('persistent').val() == true && ${val(idxState,'rescuePending')} == false && newData.child('offline').isBoolean() && newData.child('positionSeq').val() == ${val(idxState,'positionSeq')} && $sector == ${val(idxState,'sector')} && newData.child('lon').val() >= ${val(idxState,'point/0')}-0.00001 && newData.child('lon').val() <= ${val(idxState,'point/0')}+0.00001 && newData.child('lat').val() >= ${val(idxState,'point/1')}-0.00001 && newData.child('lat').val() <= ${val(idxState,'point/1')}+0.00001 && (newData.child('updatedAt').val() == now || (newData.child('offline').val() == true && newData.child('updatedAt').val() == data.child('updatedAt').val()))`}}};
// Mark the generator's deterministic result; re-running only replaces its paths.
function normalize(node){for(const [k,v]of Object.entries(node)){if(v&&typeof v==='object')normalize(v);else if(typeof v==='string')node[k]=v.replace(/data((?:\.parent\(\))+?)\.child\('seq'\)\.val\(\)/g,(m,p)=>`(data${p}.child('seq').exists()?${m}:0)`);}}normalize(r.fleetStates);
fs.writeFileSync(file,JSON.stringify(json,null,2)+'\n');
console.log('Updated schema 6, persistent fleet and paired raid rules.');

