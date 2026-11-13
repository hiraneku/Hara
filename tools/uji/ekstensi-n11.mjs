import { daftarkanEkstensi, beriIzinEkstensi, cabutIzinEkstensi, pratinjauAksiEkstensi, konfirmasiAksiEkstensi, terapkanAksiEkstensi } from '../../docs/notes/ekstensi-api.js';
const bag=new Map();globalThis.localStorage={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,v),removeItem:k=>bag.delete(k)};
let fail=0;const cek=(n,x)=>{console.log(`${x?'OK  ':'FAIL'} ${n}`);if(!x)fail++;};
const note={id:'n1',title:'Plan',tags:[],props:[],blocks:[]};
const dispose=daftarkanEkstensi({id:'demo.extension',name:'Demo',version:'1',actions:[{id:'tag',label:'Mark reviewed',permissions:['notes:read','notes:write']}]},{tag:async selected=>selected.map(n=>({type:'add-tag',noteId:n.id,tag:'reviewed'}))});
let denied=false;try{await pratinjauAksiEkstensi('demo.extension','tag',[note],['n1']);}catch{denied=true;}
cek('actions are denied until user grants each requested capability',denied);
let escalation=false;try{beriIzinEkstensi('demo.extension',['notes:read','notes:delete']);}catch{escalation=true;}
cek('extensions cannot escalate beyond declared permission set',escalation);
beriIzinEkstensi('demo.extension',['notes:read','notes:write']);
const preview=await pratinjauAksiEkstensi('demo.extension','tag',[note],['n1']);
cek('preview receives scoped cloned notes and does not mutate originals',note.tags.length===0&&preview.extensionId==='demo.extension');
let missing=false;try{terapkanAksiEkstensi(preview,[note]);}catch{missing=true;}
cek('app requires an explicit confirmation before applying preview',missing);
globalThis.confirm=()=>true;const approval=await konfirmasiAksiEkstensi(preview);const applied=terapkanAksiEkstensi(preview,[note],approval);
cek('only declared safe operations apply to selected notes',applied[0].tags.includes('reviewed')&&!note.tags.length);
let replay=false;try{terapkanAksiEkstensi(preview,[note],true);}catch{replay=true;}
cek('preview capability is one-time and cannot be replayed',replay);
const stale=await pratinjauAksiEkstensi('demo.extension','tag',[note],['n1']);
let staleDenied=false;try{terapkanAksiEkstensi(stale,[{...note,title:'Changed'}],true);}catch{staleDenied=true;}
cek('stale note snapshots are rejected instead of overwritten',staleDenied);
const revoked=await pratinjauAksiEkstensi('demo.extension','tag',[note],['n1']);cabutIzinEkstensi('demo.extension');
let revokedDenied=false;try{terapkanAksiEkstensi(revoked,[note],true);}catch{revokedDenied=true;}
cek('revoking permission invalidates outstanding previews',revokedDenied);
let unsafe=false;try{daftarkanEkstensi({id:'evil.ext',name:'Bad',actions:[{id:'x',label:'x',permissions:['files:read']}]},{x:()=>[]});}catch{unsafe=true;}
cek('unknown and unsafe permission names are rejected at registration',unsafe);
dispose();console.log(fail?`${fail} GAGAL`:'Semua tes N11 lulus');process.exit(fail?1:0);
