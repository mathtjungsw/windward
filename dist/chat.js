import {CHAT_LIMIT,CHAT_MAX_LENGTH,CHAT_INTERVAL,chatText,recentChat,validChat} from './social-core.js';

// Fifty reusable slots overwrite old text in the database, not merely on screen.
export class CaptainChat{
  constructor({fleet,onChange,onStatus}){Object.assign(this,{fleet,onChange,onStatus});this.messages=new Map();this.stops=[];this.sequence=0;this.lastAt=0;this.ready=false;this.connected=false;this.sending=false;this.generation=0;this.expired=[];}
  connect(){
    if(!this.fleet.connected)return;
    if(this.connected&&this.uid===this.fleet.uid)return;
    this.disconnect();this.connected=true;this.uid=this.fleet.uid;const generation=this.generation,s=this.fleet.sdk,db=this.fleet.db;
    this.room=s.ref(db,'chat/v1');
    const q=s.query(s.ref(db,'chat/v1/messages'),s.orderByChild('seq'),s.limitToLast(CHAT_LIMIT));
    const receive=snapshot=>{if(generation!==this.generation)return;const message=snapshot.val();if(!validChat(message))return;this.messages.set(snapshot.key,message);this.sequence=Math.max(this.sequence,message.seq);if(message.uid===this.uid)this.lastAt=Math.max(this.lastAt,message.at);this.onChange(this.list());};
    const error=()=>{if(generation!==this.generation)return;this.ready=false;this.onStatus('채팅에 연결하지 못했어요. 함께 항해에서 다시 연결해 주세요.');};
    this.stops.push(s.onChildAdded(q,receive,error),s.onChildChanged(q,receive,error),s.onChildRemoved(q,snapshot=>{this.messages.delete(snapshot.key);this.onChange(this.list());},error));
    this.stops.push(s.onValue(q,()=>{if(generation!==this.generation||this.ready)return;this.ready=true;this.onStatus('최근 50개 · 200자 · 3초 간격');this.onChange(this.list());},error,{onlyOnce:true}));
    const old=s.query(s.ref(db,'chat/v1/lastSent'),s.orderByValue(),s.endAt(Date.now()-172800000),s.limitToFirst(20));
    s.get(old).then(snapshot=>{if(generation!==this.generation)return;this.expired=[];snapshot.forEach(child=>this.expired.push(child.key));}).catch(()=>{});
  }
  list(){return recentChat(this.messages.values());}
  async send(value){
    const text=chatText(value),s=this.fleet.sdk;
    if(!text)return {ok:false,error:'메시지를 입력해 주세요.'};
    if(text.length>CHAT_MAX_LENGTH)return {ok:false,error:'200자까지 보낼 수 있어요.'};
    if(!this.connected||!this.ready||!this.fleet.connected)return {ok:false,error:'함께 항해에 연결한 뒤 보낼 수 있어요.'};
    if(this.sending)return {ok:false,error:'앞의 메시지를 전송하고 있어요.'};
    const remaining=CHAT_INTERVAL-(Date.now()-this.lastAt);
    if(remaining>0)return {ok:false,error:`${Math.ceil(remaining/1000)}초 뒤에 보낼 수 있어요.`};
    this.sending=true;const generation=this.generation;
    try{
      for(let attempt=0;attempt<3;attempt++){
        if(generation!==this.generation||!this.fleet.connected)return {ok:false,error:'연결이 바뀌었어요. 다시 보내 주세요.'};
        const sequence=Number((await s.get(s.ref(this.fleet.db,'chat/v1/sequence'))).val()||0)+1;
        if(generation!==this.generation)return {ok:false,error:'연결이 바뀌었어요. 다시 보내 주세요.'};
        const changes={sequence,[`messages/${sequence%CHAT_LIMIT}`]:{seq:sequence,uid:this.uid,name:this.fleet.name,text,at:s.serverTimestamp()},[`lastSent/${this.uid}`]:s.serverTimestamp()};
        for(const id of this.expired)if(id!==this.uid)changes[`lastSent/${id}`]=null;
        try{await s.update(this.room,changes);this.expired=[];this.lastAt=Date.now();return {ok:true};}
        catch(error){
          if(!String(error.code||error.message).toLowerCase().includes('permission_denied'))throw error;
          const at=Number((await s.get(s.ref(this.fleet.db,`chat/v1/lastSent/${this.uid}`))).val()||0);this.lastAt=Math.max(this.lastAt,at);
          if(Date.now()-at<CHAT_INTERVAL)return {ok:false,error:'3초에 한 번 보낼 수 있어요. 잠시 뒤 다시 보내 주세요.'};
        }
      }
      return {ok:false,error:'메시지가 몰렸어요. 다시 보내 주세요.'};
    }catch{return {ok:false,error:'연결을 확인하고 다시 보내 주세요.'};}
    finally{this.sending=false;}
  }
  disconnect(){++this.generation;for(const stop of this.stops)stop();this.stops=[];this.connected=false;this.ready=false;this.messages.clear();this.onChange([]);this.onStatus('함께 항해에 연결하면 대화할 수 있어요.');}
}
