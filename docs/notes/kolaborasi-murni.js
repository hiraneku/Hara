/* N10 collaborative data model. Transport-agnostic, deterministic and
   conflict-safe; cursor presence is ephemeral. A production relay/auth service
   must authenticate member IDs and exchange these revisioned operations. */
const clone = x => structuredClone(x);
const id = () => globalThis.crypto?.randomUUID?.() || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
const role = new Set(['owner','editor','commenter','reader']);
export function buatRuangBersama(note, owner) {
 if (!note?.id || !String(owner||'').trim()) throw new Error('Note and explicit owner identity are required.');
 return { id:id(), noteId:note.id, revision:0, owner:String(owner).slice(0,120), members:[{id:String(owner).slice(0,120),role:'owner'}], blocks:clone(note.blocks||[]), comments:[], changes:[] };
}
export function aturAnggota(room, actor, member, nextRole) {
 if (room?.owner!==actor) throw new Error('Only the owner can manage access.');
 const who=String(member||'').trim().slice(0,120); if(!who||(nextRole!=='remove'&&(!role.has(nextRole)||nextRole==='owner'))) throw new Error('Invalid member or role.');
 const members=clone(room.members||[]), i=members.findIndex(x=>x.id===who);
 if(nextRole==='remove'){if(who===room.owner)throw new Error('Owner access cannot be removed.');if(i>=0)members.splice(i,1);}
 else if(i>=0){if(members[i].role===nextRole)return clone(room);members[i].role=nextRole;}else members.push({id:who,role:nextRole});
 return {...clone(room),members};
}
const member=(r,a)=>r?.members?.find(x=>x.id===a);
export function terapkanPerubahanBersama(room, {actor,baseRevision,ops}) {
 const m=member(room,actor); if(!m||!['owner','editor'].includes(m.role)) return {ok:false,reason:'access-denied'};
 if(!Array.isArray(ops)||!ops.length||ops.length>100) return {ok:false,reason:'invalid-operations'};
 const blocks=clone(room.blocks||[]), changes=room.changes||[];
 for(const op of ops){
  if(!op||!['set-content','replace-block','insert-block','delete-block'].includes(op.type))return {ok:false,reason:'unsupported-operation'};
  if(op.type==='insert-block') { if(blocks.some(b=>b.id===op.block?.id))return {ok:false,reason:'duplicate-block'}; blocks.splice(Math.max(0,Math.min(blocks.length,Number(op.index)||0)),0,clone(op.block)); continue; }
  const i=blocks.findIndex(b=>b.id===op.blockId); if(i<0)return {ok:false,reason:'missing-block'};
  const touched=changes.filter(c=>c.revision>baseRevision).flatMap(c=>c.ops||[]).some(x=>x.blockId===op.blockId || x.block?.id===op.blockId);
  if(baseRevision<room.revision&&touched)return {ok:false,reason:'conflict',blockId:op.blockId,revision:room.revision};
  if(op.type==='set-content'){blocks[i].content=String(op.content??'');}
  else if(op.type==='replace-block'){if(op.block?.id!==op.blockId)return {ok:false,reason:'invalid-block'};blocks[i]=clone(op.block);}
  else if(op.type==='delete-block')blocks.splice(i,1);
 }
 const revision=room.revision+1, event={eventId:id(),revision,actor:String(actor),at:Date.now(),baseRevision:Number(baseRevision)||0,ops:clone(ops)};
 return {ok:true,room:{...clone(room),revision,blocks,changes:[...changes,event]}};
}
export function tambahKomentar(room,{actor,blockId=null,text}) {
 const m=member(room,actor); if(!m||!['owner','editor','commenter'].includes(m.role))throw new Error('Access denied.');
 const body=String(text||'').trim(); if(!body||body.length>4000)throw new Error('Comment must contain 1–4000 characters.');
 if(blockId&&!room.blocks.some(b=>b.id===blockId))throw new Error('Comment anchor block does not exist.');
 const comment={id:id(),actor:String(actor),blockId,text:body,at:Date.now()}; return {...clone(room),comments:[...(room.comments||[]),comment]};
}
export function presenceSementara(room,{actor,blockId,offset}) {
 const m=member(room,actor); if(!m||!['owner','editor'].includes(m.role))return null;
 if(blockId&&!room.blocks.some(b=>b.id===blockId))return null;
 return {actor:String(actor),blockId:blockId||null,offset:Math.max(0,Math.min(100000,Number(offset)||0)),at:Date.now()};
}
export function gabungRuangan(lokal, remote) {
 if(!lokal||!remote||lokal.id!==remote.id)return {ok:false,reason:'different-room'};
 const localEvents=lokal.changes||[], localIds=new Set(localEvents.map(e=>e.eventId).filter(Boolean));
 const incoming=(remote.changes||[]).filter(e=>!e.eventId||!localIds.has(e.eventId)).sort((a,b)=>a.baseRevision-b.baseRevision||a.revision-b.revision||a.at-b.at);
 const blocks=clone(lokal.blocks||[]), collisions=[];
 for(const e of incoming){
  for(const op of e.ops||[]){
   const key=op.type==='insert-block'?op.block?.id:op.blockId;
   const concurrent=localEvents.some(old=>old.revision>e.baseRevision&&(old.ops||[]).some(x=>(x.type==='insert-block'?x.block?.id:x.blockId)===key));
   if(concurrent){collisions.push({event:e,op,blockId:key});continue;}
   if(op.type==='insert-block'){if(blocks.some(b=>b.id===key)){collisions.push({event:e,op,blockId:key});continue;}blocks.push(clone(op.block));}
   else {const i=blocks.findIndex(b=>b.id===key);if(i<0){collisions.push({event:e,op,blockId:key});continue;}if(op.type==='set-content')blocks[i].content=String(op.content??'');else if(op.type==='replace-block')blocks[i]=clone(op.block);else if(op.type==='delete-block')blocks.splice(i,1);}
  }
 }
 if(collisions.length)return {ok:false,reason:'conflict',collisions};
 const changes=[...new Map([...localEvents,...incoming].map(e=>[e.eventId||`${e.revision}:${e.actor}:${e.at}`,e])).values()];
 const comments=[...new Map([...(lokal.comments||[]),...(remote.comments||[])].map(c=>[c.id,c])).values()].sort((a,b)=>a.at-b.at);
 return {ok:true,room:{...clone(lokal),revision:Math.max(lokal.revision,remote.revision)+incoming.length,blocks,changes,comments,members:[...new Map([...lokal.members,...remote.members].map(m=>[m.id,m])).values()]}};
}
