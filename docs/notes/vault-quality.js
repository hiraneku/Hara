/* Pemeriksaan vault non-destruktif dan inventaris lampiran lokal. */
import { state } from '../core/store.js?v=20261105210000';
import { plainText } from './note-model.js?v=20261105210000';
import { terlihat } from './kunci.js?v=20261105210000';
import { semuaId, ambilBlob } from '../core/blobs.js?v=20261105210000';

const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const escEnt = s => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function blobRefs(note) {
  const ids = new Set();
  const jalan = (v, k = '') => {
    if (!v) return;
    if (typeof v === 'string') {
      if (['blobId','blob','dataBlob'].includes(k) && /^[A-Za-z0-9_-]{1,180}$/.test(v)) ids.add(v);
      for (const m of v.matchAll(/data-blob=["']([^"']+)["']/g)) ids.add(m[1]);
      for (const m of v.matchAll(/data:(?:image|application)\/[^)]*?;id=([A-Za-z0-9_-]+)/g)) ids.add(m[1]);
      try { const o = JSON.parse(v); if (o && typeof o === 'object') jalan(o, 'goresan'); } catch {}
    } else if (Array.isArray(v)) v.forEach(x => jalan(x, k));
    else if (typeof v === 'object') Object.entries(v).forEach(([key, x]) => jalan(x, key));
  };
  jalan(note?.blocks || []);
  return ids;
}

export function periksaVault(notes = state.notes) {
  const terbaca = (notes || []).filter(n => n && !n.deletedAt && terlihat(n));
  const judul = new Map();
  const catatanKosong = [];
  const tautanRusak = [];
  const sasaranJudul = new Set((notes || []).filter(n => n && !n.deletedAt).map(n => norm(n.title)).filter(Boolean));
  for (const n of terbaca) {
    const j = norm(n.title);
    if (j) { if (!judul.has(j)) judul.set(j, []); judul.get(j).push(n); }
    const isi = (n.blocks || []).map(b => plainText({ blocks: [b] })).join('').replace(/\s+/g, ' ').trim();
    if (!String(n.title || '').trim() && !isi) catatanKosong.push({ id: n.id, title: n.title || '' });
    for (const b of n.blocks || []) {
      const teks = String(b?.content || '');
      for (const m of teks.matchAll(/\[\[([^\]]+)\]\]/g)) {
        const utuh = escEnt(m[1].split('|')[0]).trim();
        if (sasaranJudul.has(norm(utuh))) continue; /* judul sah boleh mengandung # */
        const tujuan = utuh.split('#')[0].trim();
        if (tujuan && !sasaranJudul.has(norm(tujuan))) tautanRusak.push({ noteId: n.id, noteTitle: n.title || '', target: tujuan });
      }
    }
  }
  return {
    visibleNotes: terbaca.length,
    duplicates: [...judul.values()].filter(xs => xs.length > 1).map(xs => ({ title: xs[0].title || '', notes: xs.map(n => ({ id:n.id, title:n.title || '' })) })),
    emptyNotes: catatanKosong,
    brokenLinks: tautanRusak,
  };
}

export async function inventarisLampiran(notes = state.notes) {
  const refs = new Set();
  for (const n of notes || []) for (const id of blobRefs(n)) refs.add(id);
  const ids = await semuaId();
  const hasil = [];
  for (const id of ids) {
    const blob = await ambilBlob(id).catch(() => null);
    if (!blob) continue;
    const auxiliary = /^(?:anot|susun|ocr)-/.test(String(id));
    hasil.push({ id:String(id), size:Number(blob.size) || 0, type:String(blob.type || 'application/octet-stream'), referenced:refs.has(String(id)), auxiliary, deletable:!refs.has(String(id)) && !auxiliary });
  }
  return hasil.sort((a,b) => Number(a.referenced)-Number(b.referenced) || a.id.localeCompare(b.id));
}
