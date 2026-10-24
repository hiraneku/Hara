/* Integrasi fitur pintar ke aplikasi (palette Ctrl/⌘+K).

   Logika hitungannya ada di pintar.js (murni). Berkas ini yang membaca state,
   membuka catatan, dan menulis catatan baru.

   ATURAN KEAMANAN (catatan terkunci):
   • Tidak ada hasil yang memakai catatan yang tidak terlihat (terlihat(n) = false).
   • Ringkasan TIDAK dibuat dari catatan terkunci, karena hasilnya menjadi catatan baru
     yang tidak terkunci — isi catatan terkunci akan bocor. */

import { state, save } from '../core/store.js?v=20261024040822';
import { makeNote, makeBlock, plainText } from './note-model.js?v=20261024040822';
import { toast } from '../core/toast.js?v=20261024040822';
import { go } from '../core/router.js?v=20261024040822';
import { flush } from '../core/autosave.js?v=20261024040822';
import { esc } from '../core/dom.js?v=20261024040822';
import { t as tr } from '../core/i18n.js?v=20261024040822';
import { terlihat, punyaKunci } from './kunci.js?v=20261024040822';
import { findNote, openNote } from './model.js?v=20261024040822';
import { sinkronTag, semuaTag } from './tags.js?v=20261024040822';
import { catatanSerupa, saranTag, ringkasan, tinjauanMingguan } from './pintar.js?v=20261024040822';
import { uraiTugas } from './pengingat.js?v=20261024040822';

/* Catatan yang boleh dipakai fitur pintar: aktif, tidak diarsip, tidak di sampah,
   dan terlihat (tidak terkunci, atau sudah dibuka di sesi ini). */
const bolehDipakai = n => !n.archived && !n.deletedAt && terlihat(n);

/* Dokumen untuk analisis: judul + isi polos. Tidak ada HTML. */
const dokumen = (daftar) => daftar.map(n => ({
  id: n.id,
  teks: (n.title || '') + '\n' + plainText(n),
}));

/* Buat catatan baru dengan blok-blok yang sudah jadi, lalu buka di editor. */
function buatCatatanBaru({ judul, blocks, pesan }) {
  flush();
  const n = makeNote({ title: judul, blocks });
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
  toast(pesan);
}

const paragraf = teks => makeBlock({ type: 'paragraph', content: esc(teks) });

/* ── aksi ── */

export function tambahTagManual(id, tag) {
  const n = findNote(id);
  if (!n || !bolehDipakai(n)) return;
  const bersih = String(tag || '').trim().replace(/^#/, '');
  if (!bersih) return;
  const ada = new Set([...(n.tags || []), ...(n.tagsManual || [])].map(x => x.toLowerCase()));
  if (ada.has(bersih.toLowerCase())) { toast(tr('Tag sudah ada')); return; }
  n.tagsManual = [...(n.tagsManual || []), bersih];
  sinkronTag(n);
  save();
  toast(tr('Tag #{t} ditambahkan', { t: bersih }));
}

export function buatRingkasan(id) {
  const n = findNote(id);
  if (!n) return;
  /* Catatan terkunci tidak boleh diringkas ke catatan baru yang tidak terkunci. */
  if (punyaKunci(n)) { toast(tr('Catatan terkunci tidak bisa diringkas ke catatan baru')); return; }
  const teks = ringkasan(plainText(n), { kalimat: 3 });
  if (!teks) { toast(tr('Catatan terlalu pendek untuk diringkas')); return; }
  buatCatatanBaru({
    judul: tr('Ringkasan: {j}', { j: n.title || tr('Tanpa judul') }),
    blocks: [paragraf(teks), paragraf(tr('Sumber: {j}', { j: n.title || tr('Tanpa judul') }))],
    pesan: tr('Ringkasan dibuat'),
  });
}

export function buatTinjauan() {
  const sekarang = Date.now();
  const awal = sekarang - 7 * 86400000;
  const daftar = state.notes.filter(n => !n.deletedAt && terlihat(n));
  const catatan = daftar.map(n => {
    const selesai = (n.blocks || []).filter(b => b.type === 'todo' && b.meta
      && b.meta.checked && typeof b.meta.done === 'number' && b.meta.done >= awal).length;
    return {
      id: n.id, title: n.title || '',
      createdAt: n.createdAt, updatedAt: n.updatedAt,
      tags: n.tags || [], todoSelesai: selesai,
    };
  });
  const t = tinjauanMingguan(catatan, sekarang, { hari: 7 });
  const baris = [
    tr('Dibuat: {n} catatan · Diedit: {m} catatan', { n: t.dibuat, m: t.diedit }),
    tr('Tugas selesai: {n}', { n: t.tugasSelesai }),
  ];
  if (t.tagTeratas.length) {
    baris.push(tr('Tag paling aktif: {t}', { t: t.tagTeratas.map(([x, c]) => `#${x} (${c})`).join(', ') }));
  }
  const blocks = [paragraf(baris.join('\n'))];
  if (t.terbaru.length) {
    blocks.push(makeBlock({ type: 'heading', content: esc(tr('Terakhir diedit')), meta: { level: 2 } }));
    t.terbaru.forEach(x => blocks.push(makeBlock({ type: 'bullet', content: esc(x.title || tr('Tanpa judul')) })));
  }
  const tgl = new Date(sekarang);
  buatCatatanBaru({
    judul: tr('Tinjauan {tgl}', { tgl: `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${String(tgl.getDate()).padStart(2, '0')}` }),
    blocks,
    pesan: tr('Tinjauan minggu ini dibuat'),
  });
}

/* Tangkap cepat: satu kalimat → catatan baru berisi to-do. Tenggat diurai dari
   kalimat yang sama (mis. "besok 15.00 bayar listrik"), jadi muncul di Tugas. */
export function tangkapCepatTugas() {
  const teks = typeof window !== 'undefined' && window.prompt
    ? window.prompt(tr('Tulis tugas, mis. "besok 15.00 bayar listrik"'), '') : null;
  const bersih = String(teks || '').trim();
  if (!bersih) return;
  const urai = uraiTugas(bersih);
  buatCatatanBaru({
    judul: bersih,
    blocks: [makeBlock({ type: 'todo', content: esc(bersih), meta: { checked: false } })],
    pesan: urai ? tr('Tugas dibuat · {t}', { t: urai.teks + (urai.jam ? ' ' + urai.jam : '') })
                : tr('Tugas dibuat (tanpa tenggat)'),
  });
}

/* ── sumber palette ── */

export function itemPintar() {
  const items = [];
  const n = state.openId ? findNote(state.openId) : null;
  const aktif = n && bolehDipakai(n);

  if (aktif) {
    const lain = state.notes.filter(x => x.id !== n.id && bolehDipakai(x));
    const dokLain = dokumen(lain);
    const dokIni = dokumen([n])[0];

    catatanSerupa(n.id, [dokIni, ...dokLain], { maks: 5 }).forEach(r => {
      const o = findNote(r.id);
      if (!o) return;
      items.push({
        id: 'pintar-serupa-' + o.id,
        label: tr('Mirip: {j}', { j: o.title || tr('Tanpa judul') }),
        hint: r.bersama.length ? tr('Catatan serupa') + ' · ' + r.bersama.join(', ') : tr('Catatan serupa'),
        cari: 'serupa mirip terkait',
        jalan: () => openNote(o.id),
      });
    });

    const semua = semuaTag().map(x => x.nama);
    saranTag(dokIni.teks, dokLain, { tagLama: semua, maks: 3 }).forEach(tag => {
      items.push({
        id: 'pintar-tag-' + tag,
        label: tr('Tambah tag #{t}', { t: tag }),
        hint: tr('Saran tag'),
        cari: 'tag saran',
        jalan: () => tambahTagManual(n.id, tag),
      });
    });

    items.push({
      id: 'pintar-ringkas',
      label: tr('Ringkas catatan ini (jadi catatan baru)'),
      hint: tr('Pintar'),
      cari: 'ringkas rangkum summary',
      jalan: () => buatRingkasan(n.id),
    });
  }

  items.push({
    id: 'pintar-tinjauan',
    label: tr('Tinjauan minggu ini'),
    hint: tr('Pintar'),
    cari: 'mingguan review ringkasan pekan',
    jalan: () => buatTinjauan(),
  });
  items.push({
    id: 'pintar-tangkap',
    label: tr('Tangkap cepat: tugas bertenggat'),
    hint: tr('Pintar'),
    cari: 'tugas tenggat besok reminder cepat',
    jalan: () => tangkapCepatTugas(),
  });
  return items;
}
