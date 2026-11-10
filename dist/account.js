import {recoverEnrollmentCache} from './enrollment.js?v=2026.11.10-session-fix';
import {mergeDefense,restoreNavigation} from './defense-core.js?v=2026.11.10-session-fix';
import {refreshDefense,publishDefense} from './defense-account.js?v=2026.11.10-session-fix';
import {FIREBASE_CONFIG} from './firebase-config.js?v=2026.11.10-session-fix';
import {initialState,parseSavedGame} from './engine.js?v=2026.11.10-session-fix';
import {applyRaftStart} from './raft-start.js?v=2026.11.10-session-fix';
import {installAtomicAccount} from './atomic-account.js?v=2026.11.10-session-fix';

export const GAME_ROOT = 'gameV2';
export const REAL_WORLD_ROOT = GAME_ROOT + '/real';
export const localSaveKey = uid => 'windward-account-v4:' + uid;

export function accountName(value) {
  const name = String(value || '').normalize('NFKC').trim();
  if (!name || name.length > 16 || !/[\p{L}\p{N}]/u.test(name) || /[<>\u0000-\u001f\u007f]/u.test(name)) {
    throw Error('이름은 글자나 숫자를 포함해 1~16자로 입력해 주세요.');
  }
  return name;
}

export function clearLegacyStorage(storage) {
  const exact = new Set(['windward-save-v1', 'windward-legacy-backup-v2', 'windward-legacy-imported',
    'windward-last-account', 'windward-captain-name', 'windward-fleet-enabled', 'windward-patch-legacy']);
  try {
    const keys = Array.from({length: storage.length || 0}, (_, i) => storage.key(i));
    for (const key of keys) {
      if (exact.has(key) || /^windward-(?:account-v2|before-reset):/.test(key)) storage.removeItem(key);
    }
  } catch { /* Browser storage can be unavailable. */ }
}

export function parseGame(value) {
  return parseSavedGame(value);
}

export function authMessage(error) {
  const code = String(error?.code || error?.message || '');
  if (/popup-closed|cancelled-popup/.test(code)) return '로그인을 취소했어요. 다시 시도할 수 있어요.';
  if (/popup-blocked|operation-not-supported/.test(code)) return '로그인 창을 열 수 없어요. 팝업을 허용하거나 Chrome 또는 Safari에서 열어 주세요.';
  if (/unauthorized-domain|operation-not-allowed/.test(code)) return 'Google 로그인 설정을 확인하는 중이에요. 잠시 후 다시 시도해 주세요.';
  if (/too-many-requests/.test(code)) return '접속 시도가 많아요. 잠시 뒤 다시 시도해 주세요.';
  if (/network|timeout|unavailable|disconnected/.test(code)) return '서버에 연결하지 못했어요. 인터넷을 확인한 뒤 다시 시도해 주세요.';
  if (/permission.denied/.test(code)) return '현실서버 접속을 확인하지 못했어요. 새로고침한 뒤 다시 로그인해 주세요.';
  return error?.message || '접속하지 못했어요. 다시 시도해 주세요.';
}

function entryError(code, message) {
  return Object.assign(Error(message), {code});
}

export class CaptainAccount {
  constructor(storage, session = crypto.randomUUID()) {
    this.storage = storage;
    this.session = session;
    this.revision = 0;
    this.ready = false;
    this.dirty = false;
    this.lost = false;
    this.onStatus = () => {};
    this.onConflict = () => {};
    this.onCommitted = () => {};
    this.readGame = () => null;
  }

  setup() {
    this.setupPromise ??= this.initialize().catch(error => {
      this.setupPromise = null;
      throw error;
    });
    return this.setupPromise;
  }

  async initialize() {
    const base = 'https://www.gstatic.com/firebasejs/12.4.0/';
    const [appSdk, authSdk, dbSdk] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')
    ]);
    this.app = appSdk.initializeApp(FIREBASE_CONFIG, 'windward-google');
    this.authSdk = authSdk;
    this.sdk = dbSdk;this.defenseEnabled=true;
    this.auth = authSdk.initializeAuth(this.app, {
      persistence: [authSdk.browserLocalPersistence, authSdk.browserSessionPersistence, authSdk.inMemoryPersistence],
      popupRedirectResolver: authSdk.browserPopupRedirectResolver
    });
    this.db = dbSdk.getDatabase(this.app);
    this.restEndpoint=this.app.options.databaseURL;
    this.clockOff?.();this.clockOff=dbSdk.onValue(dbSdk.ref(this.db,".info/serverTimeOffset"),snap=>{this.serverOffset=Number(snap.val())||0;});
    await this.auth.authStateReady();
  }

  async signIn() {
    const provider = new this.authSdk.GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    return (await this.authSdk.signInWithPopup(this.auth, provider)).user;
  }

  async loadProfile(user) {
    const ref = this.sdk.ref(this.db, GAME_ROOT + '/accounts/' + user.uid);
    const profile = (await this.sdk.get(ref)).val();
    return profile?.name ? profile : null;
  }

  async enter(...args){for(let retry=0;retry<3;retry++){try{return await this.enterOnce(...args);}catch(error){if(!this.defenseEnabled||retry===2||!/permission.?denied/i.test(String(error.code||error.message)))throw error;}}}

  async enterOnce(user, profile, {name, takeover = false} = {}) {
    const requestedName = profile?.name || accountName(name);
    const uid = user.uid;
    const ref = this.sdk.ref(this.db, GAME_ROOT + '/privateSaves/' + uid);
    const key = localSaveKey(uid);
    let cached;
    try {
      cached = JSON.parse(this.storage.getItem(key));
      if(!cached){
        const previous=this.storage.getItem('windward-account-v3:'+uid);
        if(previous){cached=JSON.parse(previous);this.storage.setItem('windward-account-v3:'+uid+':before-upgrade',previous);}
      }
    } catch(error) { throw Error('기기 저장을 읽지 못했어요. 원본은 유지됩니다.'); }
    const observed = (await this.sdk.get(ref)).val();
    if(observed?.schemaVersion>6)throw Error('최신 버전으로 새로고침해 주세요. 기록은 유지됩니다.');
    if(observed&&(observed.schemaVersion||0)<5){const backup='windward-before-expansion-v5:'+uid;try{if(!this.storage.getItem(backup))this.storage.setItem(backup,JSON.stringify(observed));}catch{throw Error('업데이트 전 원본 기록을 보관하지 못했어요. 저장 공간을 확인하세요.');}}
    if(observed&&observed.schemaVersion<4){const backup='windward-before-raft-start-v4:'+uid;try{if(!this.storage.getItem(backup))this.storage.setItem(backup,JSON.stringify(observed));}catch{throw Error('전환 전 기록을 기기에 보관하지 못했어요. 저장 공간을 확인해 주세요.');}}
    if(observed&&observed.schemaVersion<3){const backup='windward-before-world-v3:'+uid;try{if(!this.storage.getItem(backup))this.storage.setItem(backup,JSON.stringify(observed));}catch{throw Error('이관 전 기기 백업을 보관하지 못했어요. 저장 공간을 확인해 주세요.');}}
    if(cached?.data?.version<3){const backup=key+':before-world-v3';if(!this.storage.getItem(backup))this.storage.setItem(backup,JSON.stringify(cached));}
    const defense=this.defenseEnabled?(await this.sdk.get(this.sdk.ref(this.db,GAME_ROOT+'/fleetStates/'+uid))).val():null;
    const checkpoint=this.defenseEnabled?(await this.sdk.get(this.sdk.ref(this.db,GAME_ROOT+'/privateNavigation/'+uid))).val():null;
    let block, recovered;
    const result = await this.sdk.runTransaction(ref, current => {
      current ??= observed;
      block = null;
      if (current?.session !== this.session && current?.leaseUntil > Date.now()+(this.serverOffset||0) && !takeover) {
        block = 'session';
        return;
      }
      const boundaryRecovery=recoverEnrollmentCache(current,cached);
      if (cached?.pending && !boundaryRecovery && (!current || cached.revision !== current.revision)) {
        block = 'conflict';
        return;
      }
      recovered = !!cached?.pending;
      const source = boundaryRecovery || (recovered ? cached.data : current ? current.data : initialState());
      const game = parseGame(source);
      applyRaftStart(game);if(this.defenseEnabled){if(!recovered&&checkpoint?.data)restoreNavigation(game,JSON.parse(checkpoint.data),current?.revision);mergeDefense(game,defense,Date.now()+(this.serverOffset||0));if(!game.port){game.offlinePaused=true;}}
      game.world = 'real';
      game.speed = 1;
      return {
        schemaVersion:this.defenseEnabled?6:5,...(this.defenseEnabled?{defenseSeq:game.defenseAck?.seq||0}:{}),
        operationSequence: current?.operationSequence||0,
        ...(current?.lastOperation?{lastOperation:current.lastOperation}:{}),
        revision: (current?.revision || 0) + 1,
        data: JSON.stringify(game),
        session: this.session,
        leaseUntil: Date.now()+(this.serverOffset||0) + 90000,
        updatedAt: this.sdk.serverTimestamp()
      };
    }, {applyLocally: false});
    if (!result.committed) {
      if (block === 'session') throw entryError(block, '다른 화면에서 항해 중이에요. 여기서 이어가면 그 화면은 멈춰요.');
      if (block === 'conflict') throw entryError(block, '이 기기의 미전송 기록과 서버 기록이 달라요. 두 기록을 보존했어요.');
      throw Error('항해 기록을 열지 못했어요. 다시 시도해 주세요.');
    }
    if (!profile) {
      const profileRef = this.sdk.ref(this.db, GAME_ROOT + '/accounts/' + uid);
      const savedProfile = await this.sdk.runTransaction(profileRef, current => current ? undefined : {
        name: requestedName, updatedAt: this.sdk.serverTimestamp()
      }, {applyLocally: false});
      profile = savedProfile.snapshot.val();
      if (!profile?.name) throw Error('선장 이름을 저장하지 못했어요.');
    }
    const record = result.snapshot.val();
    const game = parseGame(record.data);
    Object.assign(this, {
      uid, ref, record, name: profile.name, seenVersion: profile.seenVersion || '',
      revision: record.revision, ready: true, lost: false, dirty: false, economicUncertain:false
    });
    try{this.storage.removeItem?.('windward-economic-pending:'+uid);}catch{}
    this.cache(game, false);if(this.defenseEnabled&&!await publishDefense(this,game)){this.ready=false;throw Object.assign(Error('접속 중 전투 상태가 갱신됐어요. 다시 연결합니다.'),{code:'permission_denied'});}
    this.onCommitted(game,this.revision);
    this.onStatus(recovered ? '이 기기의 기록을 복원했어요.' : '클라우드 저장 연결됨');
    this.stopWatch?.();
    this.stopWatch = this.sdk.onValue(this.sdk.ref(this.db, GAME_ROOT + '/privateSaves/' + uid + '/session'), snapshot => {
      if (snapshot.val() && snapshot.val() !== this.session && this.ready) {
        this.lost = true;
        this.ready = false;
        clearInterval(this.timer);
        this.onConflict();
      }
    });
    clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), 20000);
    return game;
  }

  cache(game, pending) {
    try {
      this.storage.setItem(localSaveKey(this.uid), JSON.stringify({revision: this.revision, pending, data: game}));
    } catch {
      this.onStatus('이 기기의 저장 공간이 부족해요.');
    }
  }

  save(game) {
    if (!this.ready || this.lost) return;
    this.dirty = JSON.stringify(game) !== this.record.data;
    this.cache(game, this.dirty);
    if (this.dirty && Date.now() - (this.lastFlush || 0) > 15000) this.flush();
  }

  flush() {
    if (!this.ready || this.lost) return;
    this.flushPromise ??= this.enqueue(()=>this.writeSave()).finally(() => { this.flushPromise = null; });
    return this.flushPromise;
  }

  async writeSave() {
    if (!navigator.onLine) {
      this.onStatus('이 기기에 저장 · 연결 후 동기화');
      return;
    }
    if(this.defenseEnabled)await refreshDefense(this);
    const game = this.readGame();
    if (!game) return;
    const data = this.dirty ? JSON.stringify(game) : this.record.data;
    const expected = this.revision;
    try {
      const result = await this.sdk.runTransaction(this.ref, current => {
        current ??= this.record;
        if (current?.session !== this.session || current.revision !== expected) return;
        return {...current, schemaVersion:this.defenseEnabled?6:5,...(this.defenseEnabled?{defenseSeq:game.defenseAck?.seq||0}:{}), data, revision: expected + 1, leaseUntil: Date.now()+(this.serverOffset||0) + 90000,
          updatedAt: this.sdk.serverTimestamp()};
      }, {applyLocally: false});
      if (!result.committed) {
        this.lost = true;
        this.ready = false;
        clearInterval(this.timer);
        this.onStatus('저장 충돌 · 이 기기 기록 보존');
        this.onConflict();
        return;
      }
      this.record = result.snapshot.val();
      this.revision = this.record.revision;
      this.lastFlush = Date.now();
      const current = this.readGame();
      this.dirty = JSON.stringify(current) !== data;
      this.cache(current, this.dirty);
      this.onStatus('클라우드 저장 완료');
      this.onCommitted(JSON.parse(data),this.revision);if(this.defenseEnabled)await publishDefense(this);
    } catch {
      this.onStatus('이 기기에 저장 · 서버 연결 확인 필요');
    }
  }

  async acknowledge(version) {
    const ref = this.sdk.ref(this.db, GAME_ROOT + '/accounts/' + this.uid);
    await this.sdk.update(ref, {seenVersion: version, updatedAt: this.sdk.serverTimestamp()});
    this.seenVersion = version;
  }

  async close() {
    clearInterval(this.timer);
    await this.writeQueue;
    await this.flushPromise;
    if (this.dirty) await this.flush();
    this.stopWatch?.();
    if (this.ready && !this.dirty && navigator.onLine) {
      try {
        await this.sdk.runTransaction(this.ref, current => {
          current ??= this.record;
          if (current?.session !== this.session || current.revision !== this.revision) return;
          return {...current, revision: current.revision + 1, leaseUntil: 0, updatedAt: this.sdk.serverTimestamp()};
        }, {applyLocally: false});
      } catch {}
    }
    this.ready = false;
    if (this.auth) await this.authSdk.signOut(this.auth);
  }
}
installAtomicAccount(CaptainAccount);
