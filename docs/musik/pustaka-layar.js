/* Pustaka lokal: cari, urut, filter favorit, tandai favorit, dan tinjau duplikat.
   Deteksi duplikat hanya menampilkan kandidat; tidak ada penghapusan otomatis. */
import { cur, go } from '../core/router.js?v=20261023235452';
import { esc } from '../core/dom.js?v=20261023235452';
import { t as tr } from '../core/i18n.js?v=20261023235452';
import * as S from './simpan.js?v=20261023235452';
import * as L from './logika.js?v=20261023235452';
import * as A from './aksi.js?v=20261023235452';
import { ikon } from './ikon.js?v=20261023235452';
let q = '', filter = 'semua', urut = 'nama', tunjukDuplikat = false;
function norm(s) { return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function duplikat(semua) {
  const map = new Map();
  for (const x of semua) { const key = `${norm(x.nama)}|${norm(x.artis)}`; if (!key.replace('|','')) continue; if (!map.has(key)) map.set(key, []); map.get(key).push(x); }
  return [...map.values()].filter(a => a.length > 1);
}
function daftarTampil() {
  let xs = S.daftarLagu().filter(x => (filter !== 'favorit' || x.favorit) && (!q || `${x.nama} ${x.artis || ''} ${x.album || ''} ${x.lokasi || ''}`.toLocaleLowerCase().includes(q)));
  const comp = { nama: (a,b) => a.nama.localeCompare(b.nama), artis: (a,b) => (a.artis || '').localeCompare(b.artis || '') || a.nama.localeCompare(b.nama), baru: (a,b) => b.ditambahkan - a.ditambahkan, sering: (a,b) => (b.terakhirMain || 0) - (a.terakhirMain || 0), durasi: (a,b) => b.durasi - a.durasi }[urut];
  return xs.sort(comp);
}
function baris(x) {
  const sub = [x.artis, x.album].filter(Boolean).join(' · ');
  return `<li class="mus-item" data-pustaka-baris data-cari="${esc(`${x.nama} ${x.artis || ''} ${x.album || ''} ${x.lokasi || ''}`.toLocaleLowerCase())}"><button type="button" class="mus-item-buka" data-pustaka="pilih" data-id="${esc(x.id)}"><span class="mus-thumb-wrap"><span class="mus-thumb" aria-hidden="true">${ikon('nota')}</span></span><span class="mus-item-teks"><span class="mus-item-judul">${esc(x.nama)}</span><span class="mus-item-sub">${L.formatWaktu(x.durasi)}${sub ? ` · ${esc(sub)}` : ''}${x.lokasi ? ` · ${esc(x.lokasi)}` : ''}</span></span></button><button type="button" class="mus-item-antre${A.antreanLagu().includes(x.id) ? ' on' : ''}" data-pustaka="antre" data-id="${esc(x.id)}" aria-pressed="${A.antreanLagu().includes(x.id)}" aria-label="${tr('Tambahkan ke antrean')}">${ikon('plus')}</button><button type="button" class="mus-item-antre${x.favorit ? ' on' : ''}" data-pustaka="favorit" data-id="${esc(x.id)}" aria-pressed="${!!x.favorit}" aria-label="${tr(x.favorit ? 'Hapus favorit' : 'Tambah favorit')}">${ikon('bintang')}</button></li>`;
}
function duplikatHtml() {
  const groups = duplikat(S.daftarLagu());
  return `<section class="mus-kartu mus-set-kartu"><h3 class="mus-set-judul-bagian">${tr('Tinjau kemungkinan duplikat')}</h3><p class="mus-catatan">${tr('Kandidat dicocokkan berdasarkan judul dan artis. Tidak ada berkas yang dihapus; periksa tiap lagu secara manual.')}</p>${groups.length ? groups.map((g,i) => `<div class="mus-duplikat"><strong>${tr('Grup')} ${i+1}</strong><ul class="mus-daftar">${g.map(x => `<li class="mus-item"><button class="mus-item-buka" data-pustaka="pilih" data-id="${esc(x.id)}"><span class="mus-item-teks"><span class="mus-item-judul">${esc(x.nama)}</span><span class="mus-item-sub">${esc(x.artis || tr('Artis tidak diketahui'))} · ${L.formatWaktu(x.durasi)} · ${L.formatUkuran(x.ukuran)}</span></span></button></li>`).join('')}</ul></div>`).join('') : `<p class="mus-kosong-kecil">${tr('Tidak ditemukan kandidat duplikat.')}</p>`}</section>`;
}
export function pustakaView() {
  const semua = S.daftarLagu(), pemindai = A.bisaPindaiPustakaPerangkat(), status = A.statusPindaiPustakaPerangkat();
  const rows = daftarTampil().map(baris).join('');
  return `<section class="mus-pustaka-lengkap" data-pustaka-root><header class="mus-kartu-kepala"><div><h2 class="mus-pustaka-judul">${tr('Pustaka lagu')}</h2><p class="mus-catatan">${semua.length} ${tr('lagu')}</p></div>${pemindai ? `<button type="button" class="mus-tombol" data-pustaka="scan"${status === 'memindai' ? ' disabled' : ''}>${ikon('repeat')}<span>${tr(status === 'memindai' ? 'Memindai…' : 'Pindai ulang')}</span></button>` : ''}</header>
  <p class="mus-pindai-status" role="status" aria-live="polite">${pemindai ? tr(({ belum: 'Pustaka perangkat siap dipindai.', memindai: 'Sedang memindai pustaka perangkat…', izin: 'Izin audio diperlukan untuk membaca pustaka.', siap: `${semua.length} lagu tersedia.`, gagal: 'Pemindaian gagal; coba lagi.' })[status] || 'Status pemindaian tidak diketahui.') : tr('Pustaka lokal di perangkat ini.')}</p>
  <div class="mus-pustaka-alat"><label class="mus-pustaka-cari">${ikon('cari')}<input type="search" data-pustaka-cari value="${esc(q)}" placeholder="${tr('Cari lagu di pustaka')}" aria-label="${tr('Cari lagu di pustaka')}"></label><label>${tr('Tampilkan')} <select data-pustaka-filter><option value="semua"${filter === 'semua' ? ' selected' : ''}>${tr('Semua')}</option><option value="favorit"${filter === 'favorit' ? ' selected' : ''}>${tr('Favorit')}</option></select></label><label>${tr('Urutkan')} <select data-pustaka-sort><option value="nama"${urut === 'nama' ? ' selected' : ''}>${tr('Nama')}</option><option value="artis"${urut === 'artis' ? ' selected' : ''}>${tr('Artis')}</option><option value="baru"${urut === 'baru' ? ' selected' : ''}>${tr('Terbaru ditambahkan')}</option><option value="sering"${urut === 'sering' ? ' selected' : ''}>${tr('Terakhir diputar')}</option><option value="durasi"${urut === 'durasi' ? ' selected' : ''}>${tr('Durasi')}</option></select></label></div>
  <button type="button" class="mus-chip mus-chip-hantu" data-pustaka="duplikat" aria-expanded="${tunjukDuplikat}">${ikon('cari')}<span>${tr(tunjukDuplikat ? 'Tutup tinjauan duplikat' : 'Tinjau kemungkinan duplikat')}</span></button>${tunjukDuplikat ? duplikatHtml() : ''}
  ${rows ? `<ul class="mus-daftar mus-pustaka-daftar">${rows}</ul>` : `<p class="mus-kosong-kecil">${tr(q ? 'Lagu tidak ditemukan' : 'Belum ada lagu')}</p>`}<p class="mus-pustaka-hasil" data-pustaka-hasil${rows || !q ? ' hidden' : ''}>${tr('Lagu tidak ditemukan')}</p></section>`;
}
function render() { go('musik-pustaka', { segar: true }); }
function onClick(e) {
  if (cur !== 'musik-pustaka') return;
  const b = e.target.closest('[data-pustaka]'); if (!b || b.disabled) return;
  if (b.dataset.pustaka === 'scan') { go('musik-pustaka', { segar: true }); A.pindaiPustakaPerangkat({ pesan: true }).then(render); return; }
  if (b.dataset.pustaka === 'duplikat') { tunjukDuplikat = !tunjukDuplikat; render(); return; }
  if (b.dataset.pustaka === 'pilih') { A.aturAntrean(null); A.mainkanLagu(b.dataset.id).then(() => go('musik')); return; }
  if (b.dataset.pustaka === 'antre') { A.toggleAntrean(b.dataset.id); render(); return; }
  if (b.dataset.pustaka === 'favorit') { const x = S.laguById(b.dataset.id); if (x) S.perbaruiLagu(x.id, { favorit: !x.favorit }); render(); }
}
function onInput(e) { if (cur !== 'musik-pustaka' || !e.target.matches('[data-pustaka-cari]')) return; q = e.target.value.trim().toLocaleLowerCase(); let cocok = 0; document.querySelectorAll('[data-pustaka-baris]').forEach(row => { const tampil = !q || row.dataset.cari.includes(q); row.hidden = !tampil; if (tampil) cocok++; }); const hasil = document.querySelector('[data-pustaka-hasil]'); if (hasil) hasil.hidden = cocok > 0; }
function onChange(e) { if (cur !== 'musik-pustaka') return; if (e.target.matches('[data-pustaka-filter]')) filter = e.target.value; else if (e.target.matches('[data-pustaka-sort]')) urut = e.target.value; else return; render(); }
export function pasangPustakaLagu() { document.addEventListener('click', onClick); document.addEventListener('input', onInput); document.addEventListener('change', onChange); }
