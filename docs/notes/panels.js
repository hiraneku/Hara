/* Panel nyata di bawah editor — pengganti demo statis catatan sambutan.

   Empat bagian, semuanya dihitung dari data sungguhan (bukan contoh):
     1. Tautan keluar   — wikilink [[…]] yang ada di isi catatan ini
     2. Backlink        — catatan lain yang menaut ke judul catatan ini
     3. Unlinked mention— teks polos di catatan lain yang menyebut judul
                          ini tapi belum berupa tautan (bisa di-Tautkan)
     4. Local graph     — catatan ini + tetangga tautannya, tepi digambar
                          dari wikilink asli antar catatan

   Semua pembacaan isi memakai parse DOM (bukan regex) supaya mentah
   aman: teks di dalam <span class="wl">/…tg…> tidak pernah dianggap
   mention, dan pembungkusan mention memakai simpul teks asli. */

import { state, save } from '../core/store.js?v=20260909100046';
import { cur } from '../core/router.js?v=20260909100046';
import { touch } from './note-model.js?v=20260909100046';
import { terlihat } from './kunci.js?v=20260909100046';
import { t as tr } from '../core/i18n.js?v=20260909100046';

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* D19: backlink/mention/graph tidak boleh membaca isi catatan lain
   yang terkunci & belum dibuka di sesi ini. */
const lainnya = n => state.notes.filter(x => x.id !== n.id && !x.deletedAt && terlihat(x));
const teksJudul = n => String(n && n.title || '').trim();

/* Parse isi blok jadi DOM ringan. */
function wadah(b) {
  const w = document.createElement('div');
  w.innerHTML = (b && b.content) || '';
  return w;
}

/* Daftar wikilink dalam satu blok: [{judul, alias}], tanpa duplikat. */
function wlDariBlok(b) {
  if (!b || b.type === 'code' || b.type === 'divider') return [];
  const w = wadah(b);
  const hasil = [];
  const lihat = s => { if (!hasil.some(x => x.judul === s.judul)) hasil.push(s); };
  w.querySelectorAll('span.wl').forEach(sn => {
    if (sn.parentElement && sn.parentElement.closest('span.wl')) return;   /* bersarang */
    const m = /^\[\[(.+?)\]\]$/.exec((sn.textContent || '').trim());
    if (!m) return;
    const [judul, alias] = m[1].split('|');
    const j = (judul || '').trim();
    if (j) lihat({ judul: j, alias: (alias || '').trim() });
  });
  return hasil;
}

const cariJudul = judul => {
  const j = (judul || '').toLowerCase();
  if (!j) return null;
  return state.notes.find(n => !n.deletedAt && String(n.title || '').trim().toLowerCase() === j) || null;
};

/* ── 1. Tautan keluar ── */
export function panelTautan(n) {
  const kumpul = [];
  const lihat = j => { if (!kumpul.some(x => x.judul === j.judul)) kumpul.push(j); };
  (n.blocks || []).forEach(b => wlDariBlok(b).forEach(lihat));
  const isi = kumpul.length === 0
    ? '<p class="dm-kosong">' + tr('Belum ada wikilink di catatan ini. Ketik [[ lalu pilih judul, atau tulis [[Judul]] sendiri.') + '</p>'
    : kumpul.map(d => {
        const ada = cariJudul(d.judul);
        return `<div class="bl" role="button" tabindex="0" ${ada
          ? `data-dm-buka="${ada.id}"`
          : `data-dm-buat="${esc(d.judul)}"`}>
          <div class="bl-t">${esc(d.alias || d.judul)}${ada ? '' : '<span class="cnt">' + tr('belum ada') + '</span>'}</div>
          <div class="bl-c">${ada ? tr('Buka catatan') : tr('Buat catatannya — satu ketukan')}</div>
        </div>`;
      }).join('');
  return `<section class="panel"><div class="panel-h">
    <svg class="ico"><use href="#i-link"/></svg >${tr('Tautan keluar')}<span class="n">${kumpul.length}</span></div>${isi}</section>`;
}

/* ── 2. Backlink ── */
export function panelBalik(n) {
  const judul = teksJudul(n);
  if (!judul) return `<section class="panel"><div class="panel-h">
    <svg class="ico"><use href="#i-link2"/></svg >${tr('Backlink')}<span class="n">0</span></div>
    <p class="dm-kosong">${tr('Beri judul pada catatan ini — backlink dicocokkan lewat judul.')}</p></section>`;

  const baris = [];               /* satu baris per catatan sumber */
  const peta = new Map();
  lainnya(n).forEach(x => {
    let jumlah = 0, cuplikan = '';
    (x.blocks || []).forEach(b => {
      if (jumlah && cuplikan) return;
      wlDariBlok(b).forEach(w => {
        if (w.judul.toLowerCase() !== judul.toLowerCase()) return;
        jumlah++;
        if (!cuplikan) cuplikan = potongTeks(teksBlok(b), 90);
      });
    });
    if (jumlah) { peta.set(x.id, x); baris.push({ id: x.id, jumlah, cuplikan }); }
  });
  const isi = baris.length === 0
    ? '<p class="dm-kosong">' + tr('Belum ada catatan lain yang menaut ke sini. Tulis [[…]] di catatan lain dengan judul ini, dan tautannya muncul di sini.') + '</p>'
    : baris.map(r => `<div class="bl" role="button" tabindex="0" data-dm-buka="${r.id}">
        <div class="bl-t">${esc(peta.get(r.id).title || tr('(tanpa judul)'))}<span class="cnt">${r.jumlah > 1 ? r.jumlah + ' ' + tr('tautan') : ''}</span></div>
        ${r.cuplikan ? `<div class="bl-c">${esc(r.cuplikan)}</div>` : ''}
      </div>`).join('');
  return `<section class="panel"><div class="panel-h">
    <svg class="ico"><use href="#i-link2"/></svg >${tr('Backlink')}<span class="n">${baris.length}</span></div>${isi}</section>`;
}

/* ── 3. Unlinked mention ──
   Mencari judul catatan ini sebagai teks polos di catatan lain —
   hanya di simpul teks di LUAR span .wl / .tg. */
const BUKAN_KATA = /[^\p{L}\p{N}_]/u;

export function cariSebutan(html, judul, banyak = 3) {
  const w = document.createElement('div');
  w.innerHTML = String(html || '');
  const target = judul.toLowerCase();
  const hasil = [];
  const jalan = document.createTreeWalker(w, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('span.wl, span.tg, code, pre')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node;
  while ((node = jalan.nextNode()) && hasil.length < banyak) {
    const data = node.data;
    const teks = data.toLowerCase();
    let dari = 0;
    while (hasil.length < banyak) {
      const idx = teks.indexOf(target, dari);
      if (idx < 0) break;
      const sblm = data[idx - 1] || '';
      const sblmNode = sblm.match(BUKAN_KATA) || idx === 0;
      const sdh = data[idx + target.length] || '';
      const sdhNode = sdh.match(BUKAN_KATA) || idx + target.length === data.length;
      if (sblmNode && sdhNode) {
        hasil.push({ node, dari: idx, sampai: idx + target.length });
        break;
      }
      dari = idx + target.length;
    }
  }
  return { wadah: w, hasil };
}

/* petunjuk satu sebutan pertama di blok tertentu */
export function sebutanPertama(blok, judul) {
  if (!blok || !judul) return null;
  const { wadah: w, hasil } = cariSebutan(blok.content, judul, 1);
  return hasil.length ? { wadah: w, ...hasil[0] } : null;
}

/* Bungkus sebutan pertama menjadi wikilink sungguhan, lalu simpan.
   Catatan sumber TIDAK sedang terbuka di editor, jadi mengubah
   blok.content langsung aman — render berikutnya yang memakainya. */
export function tautkanSebutan(noteSumberId, bid, judul) {
  const cat = state.notes.find(x => x.id === noteSumberId);
  if (!cat || !judul) return false;
  const blok = (cat.blocks || []).find(b => b.id === bid);
  if (!blok) return false;
  const t = sebutanPertama(blok, judul);
  if (!t) return false;

  /* node asli terbelah: [sebelum] [sebutan] [sesudah] — ganti bagian
     tengah dengan <span class="wl">[[judul]]</span> */
  const sisa = t.node.splitText(t.dari);         /* sisa = sebutan + sesudah */
  const sesudah = sisa.splitText(judul.length);  /* sisa = sebutan */
  const span = document.createElement('span');
  span.className = 'wl';
  span.textContent = `[[${judul}]]`;
  sisa.parentNode.replaceChild(span, sisa);

  blok.content = t.wadah.innerHTML;
  touch(cat);
  save();
  return true;
}

export function panelRujukan(n) {
  const judul = teksJudul(n);
  if (!judul) return `<section class="panel"><div class="panel-h">
    <svg class="ico"><use href="#i-bulb"/></svg >${tr('Unlinked mention')}<span class="n">0</span></div>
    <p class="dm-kosong">${tr('Beri judul pada catatan ini — penyebutan judul di catatan lain dideteksi lewat teks polos.')}</p></section>`;

  const baris = [];               /* {dari, bid, cuplikan, bisaTaut} */
  lainnya(n).forEach(x => {
    (x.blocks || []).forEach(b => {
      if (!b || b.type === 'code' || b.type === 'divider') return;
      const { hasil } = cariSebutan(b.content, judul, 1);
      if (!hasil.length) return;
      baris.push({
        id: x.id, bid: b.id,
        cuplikan: teksCuplikan(hasil[0].node.data, hasil[0].dari, judul.length),
        bisaTaut: true,
      });
    });
  });
  const isi = baris.length === 0
    ? '<p class="dm-kosong">' + tr('Tidak ada penyebutan tak terformat: judul ini tidak muncul sebagai teks polos di catatan lain.') + '</p>'
    : baris.slice(0, 30).map(r => `
      <div class="bl-row bl" role="button" tabindex="0" data-dm-buka="${r.id}" data-dm-bid="${r.bid}">
        <div class="bl-b">
          <div class="bl-t">${esc((state.notes.find(x => x.id === r.id) || {}).title || tr('(tanpa judul)'))}</div>
          <div class="bl-c">${r.cuplikan}</div>
        </div>
        <button type="button" class="btn btn-sec bl-taut" data-sebut-taut="${r.id}:${r.bid}">${tr('Tautkan')}</button>
      </div>`).join('');
  return `<section class="panel"><div class="panel-h">
    <svg class="ico"><use href="#i-bulb"/></svg >${tr('Unlinked mention')}<span class="n">${baris.length}</span></div>${isi}</section>`;
}

/* ── 4. Local graph ── */
export function panelGraf(n) {
  const judul = teksJudul(n);
  const nodeCat = [];             /* catatan tetangga */
  const petaId = new Map();
  const tambah = x => { if (!petaId.has(x.id)) { petaId.set(x.id, x); nodeCat.push(x); } };

  /* tetangga: judul yang ditaut catatan ini + yang menaut ke sini */
  const keluar = [];
  const lihatWl = j => { if (!keluar.some(k => k.judul === j.judul)) keluar.push(j); };
  (n.blocks || []).forEach(b => wlDariBlok(b).forEach(lihatWl));
  const targetAda = keluar.map(k => ({ k, t: cariJudul(k.judul) })).filter(x => x.t);
  targetAda.forEach(x => tambah(x.t));
  const mati = keluar.filter(k => !cariJudul(k.judul));
  lainnya(n).forEach(x => {
    let menaut = false;
    (x.blocks || []).forEach(b => {
      if (menaut) return;
      wlDariBlok(b).forEach(w => { if (w.judul.toLowerCase() === judul.toLowerCase()) menaut = true; });
    });
    if (menaut) tambah(x);
  });

  const nodeSemua = nodeCat.slice(0, 12);
  const total = nodeSemua.length + (mati.length ? 1 : 0) + 1;
  if (total === 1) {
    return `<section class="panel"><div class="panel-h">
      <svg class="ico"><use href="#i-graph"/></svg>${tr('Local graph')}<span class="n">1</span></div>
      <p class="dm-kosong">${tr('Belum ada tetangga. Tulis [[Judul Catatan Lain]] — begitu tautannya ada, catatan itu muncul di sini bersama backlinknya.')}</p></section>`;
  }

  /* posisi deterministik: lingkaran dengan urutan stabil */
  const titik = [];
  const pos = (i, jum) => {
    const sudut = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, jum);
    return {
      x: +(50 + 33 * Math.cos(sudut)).toFixed(1),
      y: +(50 + 26 * Math.sin(sudut)).toFixed(1),
    };
  };
  titik.push({ id: n.id, me: true, x: 50, y: 50 });
  const nama = x => String(x.title || tr('(tanpa judul)')).slice(0, 20);
  nodeSemua.forEach((x, i) => { titik.push({ id: x.id, judul: nama(x), ...pos(i, nodeSemua.length) }); });
  let matiPos = null;
  if (mati.length && nodeSemua.length < 12) {
    matiPos = { judul: nama({ title: mati[0].judul }), ...pos(nodeSemua.length, nodeSemua.length + 1) };
    titik.push({ id: 'mati:' + mati[0].judul, judul: matiPos.judul, mati: true, x: matiPos.x, y: matiPos.y });
  }

  /* tepi: antar semua pasangan yang benar-benar bertaut */
  const tepi = [];
  const olehId = new Map(titik.filter(t => !t.mati && !t.me).map(t => [t.id, t]));
  const pilih = (a, b) => a < b ? a + '\u0001' + b : b + '\u0001' + a;
  const cekPasangan = (A, B) => {
    const dari = petaId.get(A), ke = petaId.get(B);
    if (!dari || !ke) return;
    let ada = false;
    (dari.blocks || []).forEach(b => {
      if (ada) return;
      wlDariBlok(b).forEach(w => {
        if (w.judul.toLowerCase() === teksJudul(ke).toLowerCase()) ada = true;
      });
    });
    if (ada) {
      const k = pilih(A, B);
      if (!tepi.includes(k)) tepi.push(k);
    }
  };
  const semuaId = [n.id, ...nodeSemua.map(x => x.id)];
  for (let a = 0; a < semuaId.length; a++)
    for (let b = a + 1; b < semuaId.length; b++) cekPasangan(semuaId[a], semuaId[b]);

  const garis = tepi.map(k => {
    const [a, b] = k.split('\u0001');
    const pa = titik.find(t => t.id === a), pb = titik.find(t => t.id === b);
    if (!pa || !pb) return '';
    return `<line x1="${pa.x}%" y1="${pa.y}%" x2="${pb.x}%" y2="${pb.y}%"/>`;
  }).join('');

  const titikHtml = titik.map(t => {
    const ket = t.mati
      ? ` data-dm-buat="${esc(t.judul)}"`
      : t.me ? '' : ` data-dm-buka="${t.id}"`;
    const cls = (t.me ? 'me' : t.mati ? 'dead' : '');
    return `<div class="gnode ${cls}" style="left:${t.x}%;top:${t.y}%" role="button" tabindex="0"${ket} aria-label="${esc(t.mati ? tr('Buat') + ' ' + t.judul : t.me ? tr('Catatan ini') : tr('Buka') + ' ' + t.judul)}">
      <span class="gdot"></span><span>${esc(t.me ? teksJudul(n) || tr('(tanpa judul)') : t.judul)}</span></div>`;
  }).join('');

  return `<section class="panel"><div class="panel-h">
    <svg class="ico"><use href="#i-graph"/></svg>${tr('Local graph')}<span class="n">${total}</span></div>
    <div class="graph">
      <svg style="position:absolute;inset:0;width:100%;height:100%" stroke="var(--border-strong)" stroke-width="1" aria-hidden="true">${garis}</svg>
      ${titikHtml}
    </div></section>`;
}

/* ── pemuat: render ke #dm (dipanggil tiap render & tiap selesai simpan) ── */
export function muatPanels() {
  if (cur !== 'editor') return;
  const dm = document.querySelector('.dm');
  const n = state.notes.find(x => x.id === state.openId);
  if (!dm || !n) return;
  dm.innerHTML = [panelTautan(n), panelBalik(n), panelRujukan(n), panelGraf(n)].join('');
}

/* ── bantu kecil ── */
const teksBlok = b => (wadah(b).textContent || '').replace(/\s+/g, ' ').trim();
const potongTeks = (t, n) => (t.length > n ? t.slice(0, n).trimEnd() + '…' : t);

/* cuplikan sebutan: konteks ±45 karakter di sekitar kata yang cocok,
   kata yang cocok ditebalkan (gaya .bl-c b sudah ada) */
function teksCuplikan(data, dari, panjang) {
  const a = Math.max(0, dari - 45);
  const b = Math.min(data.length, dari + panjang + 45);
  const awal = a > 0 ? '…' : '';
  const akhir = b < data.length ? '…' : '';
  const sebelum = data.slice(a, dari).replace(/\s+/g, ' ');
  const cocok = data.slice(dari, dari + panjang).replace(/\s+/g, ' ');
  const sesudah = data.slice(dari + panjang, b).replace(/\s+/g, ' ');
  return `${awal}${esc(sebelum)}<b>${esc(cocok)}</b>${esc(sesudah)}${akhir}`;
}
