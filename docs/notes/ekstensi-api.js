/* N11 controlled extension-action boundary. Extensions register trusted,
   bundled handlers; no eval/remote script loading. Every action declares exact
   permissions, receives only selected note snapshots, returns allowlisted
   declarative operations, and requires preview + native explicit confirmation
   + staleness checking + one-time apply. */
const ALLOWED = new Set(['notes:read','notes:write']);
const OPS = new Set(['add-tag','set-property','set-pinned','set-archived']);
const registry = new Map(), issuedPreviews = new WeakMap(), confirmations = new WeakMap();
const STORE = 'hara.extensions.permissions.v1';
const copy = x => structuredClone(x);
const validId = x => /^[a-z0-9][a-z0-9._-]{1,63}$/i.test(String(x||''));
function grants(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
export function daftarkanEkstensi(manifest, handlers) {
 if(!manifest||!validId(manifest.id)||typeof manifest.name!=='string'||!Array.isArray(manifest.actions)||!handlers)throw new Error('Invalid extension manifest.');
 if(registry.has(manifest.id))throw new Error('Extension ID already registered.');
 const actions=new Map();
 for(const a of manifest.actions){if(!validId(a.id)||typeof a.label!=='string'||!Array.isArray(a.permissions)||a.permissions.some(p=>!ALLOWED.has(p))||typeof handlers[a.id]!=='function')throw new Error('Invalid or unsafe extension action.');actions.set(a.id,{...copy(a),permissions:[...new Set(a.permissions)]});}
 registry.set(manifest.id,{manifest:copy({...manifest,actions:[...actions.values()]}),actions,handlers});
 return ()=>registry.delete(manifest.id);
}
export function daftarEkstensi(){return [...registry.values()].map(x=>copy(x.manifest));}
export function izinEkstensi(){return copy(grants());}
export function beriIzinEkstensi(extensionId, permissions){
 const ext=registry.get(extensionId); if(!ext)throw new Error('Unknown extension.');
 const requested=new Set(ext.manifest.actions.flatMap(a=>a.permissions));
 if(!Array.isArray(permissions)||permissions.some(p=>!requested.has(p)))throw new Error('Permission was not requested by this extension.');
 const all=grants();all[extensionId]=[...new Set(permissions)];localStorage.setItem(STORE,JSON.stringify(all));return all[extensionId];
}
export function cabutIzinEkstensi(extensionId){const all=grants();delete all[extensionId];localStorage.setItem(STORE,JSON.stringify(all));}
export async function pratinjauAksiEkstensi(extensionId, actionId, notes, noteIds){
 const ext=registry.get(extensionId), action=ext?.actions.get(actionId); if(!action)throw new Error('Unknown action.');
 const allowed=new Set(grants()[extensionId]||[]); if(action.permissions.some(p=>!allowed.has(p)))throw new Error('Permission not granted.');
 if(!action.permissions.includes('notes:read'))throw new Error('Reading notes requires explicit permission.');
 const ids=[...new Set((noteIds||[]).map(String))]; if(!ids.length||ids.length>100)throw new Error('Select between 1 and 100 notes.');
 const selected=(notes||[]).filter(n=>ids.includes(n.id));if(selected.length!==ids.length)throw new Error('One or more selected notes do not exist.');
 const raw=await ext.handlers[actionId](copy(selected)); if(!Array.isArray(raw)||raw.length>500)throw new Error('Action returned invalid operations.');
 for(const op of raw){if(!op||!OPS.has(op.type)||!ids.includes(op.noteId))throw new Error('Action returned a forbidden operation.');if(op.type==='add-tag'&&(!String(op.tag||'').trim()||String(op.tag).length>64))throw new Error('Invalid tag operation.');if(op.type==='set-property'&&(!String(op.key||'').trim()||String(op.key).length>80||String(op.value??'').length>500))throw new Error('Invalid property operation.');if(['set-pinned','set-archived'].includes(op.type)&&typeof op.value!=='boolean')throw new Error('Invalid boolean operation.');}
 if(raw.length&&!action.permissions.includes('notes:write'))throw new Error('Writing notes requires explicit permission.');
 const preview=Object.freeze({extensionId,actionId,createdAt:Date.now()});issuedPreviews.set(preview,{selected:copy(selected),operations:copy(raw)});return preview;
}
export async function konfirmasiAksiEkstensi(preview){
 const payload=preview&&issuedPreviews.get(preview);if(!payload)throw new Error('Preview is invalid or already used.');
 const ext=registry.get(preview.extensionId),name=ext?.manifest.name||preview.extensionId;
 const ok=typeof globalThis.confirm==='function'&&globalThis.confirm(`${name} requests ${payload.operations.length} change(s) to ${payload.selected.length} selected note(s). Apply this preview?`);
 if(!ok)return null;const token=Object.freeze({});confirmations.set(token,preview);return token;
}
export function terapkanAksiEkstensi(preview, notes, confirmation){
 if(!confirmation||confirmations.get(confirmation)!==preview)throw new Error('A fresh explicit confirmation is required.');
 confirmations.delete(confirmation);
 const payload=preview&&issuedPreviews.get(preview); if(!payload)throw new Error('Preview is invalid or already used.');
 const ext=registry.get(preview.extensionId), action=ext?.actions.get(preview.actionId), granted=new Set(grants()[preview.extensionId]||[]);
 if(!action||action.permissions.some(p=>!granted.has(p)))throw new Error('Permission was revoked; preview again.');
 issuedPreviews.delete(preview);
 const map=new Map((notes||[]).map(n=>[n.id,copy(n)]));
 for(const before of payload.selected){const current=map.get(before.id);if(!current||JSON.stringify(current)!==JSON.stringify(before))throw new Error('Selected note changed after preview; preview again.');}
 for(const op of payload.operations){const n=map.get(op.noteId);if(!n)throw new Error('Operation target is missing.');if(op.type==='add-tag'){n.tagsManual=[...new Set([...(n.tagsManual||[]),String(op.tag).trim()])];n.tags=[...new Set([...(n.tags||[]),String(op.tag).trim()])];}else if(op.type==='set-property'){n.props=Array.isArray(n.props)?n.props:[];const i=n.props.findIndex(p=>p.k===op.key);if(i<0)n.props.push({k:op.key,v:String(op.value??'')});else n.props[i]={k:op.key,v:String(op.value??'')};}else if(op.type==='set-pinned')n.pinned=op.value;else if(op.type==='set-archived')n.archived=op.value;}
 return [...map.values()];
}
