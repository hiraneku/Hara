/* Command palette (Ronde 11 · K1) — Ctrl/⌘+K untuk melompat ke layar,
   membuka catatan, atau menjalankan aksi lewat satu kotak pencarian.

   Mesin ini generik: ia tidak tahu soal catatan atau renamer. Sumber
   perintah didaftarkan dari app.js lewat `daftarkanSumber(fungsi)`; setiap
   sumber dipanggil saat palette dibuka dan mengembalikan daftar item:
     { id, label, hint?, cari?: 'kata kunci tambahan', jalan: () => void }
   Satu-satunya tombol global di sini adalah Ctrl/⌘+K dan Esc. */

import { t as tr } from './i18n.js?v=20261025074430';

const sumber = [];
let terbuka = false;
let daftar = [];          /* hasil filter yang sedang tampil */
let pilih = 0;            /* indeks item yang disorot */
let elPal, elKotak, elList;

/* Pendaftaran sumber. Dipanggil sekali di app.js. */
export const daftarkanSumber = fn => { sumber.push(fn); };

/* Mengumpulkan semua item dari semua sumber. Sumber yang melempar dilewati,
   supaya satu modul yang rusak tidak mematikan palette. */
const kumpulkan = () => {
  const hasil = [];
  sumber.forEach(fn => {
    try { (fn() || []).forEach(x => x && x.label && x.jalan && hasil.push(x)); } catch (e) { /* lewati */ }
  });
  return hasil;
};

/* Skor sederhana: semua kata kueri harus cocok (label atau kata kunci).
   Yang diawali kueri dan yang kecocokan di label mendapat nilai lebih tinggi. */
export const skorItem = (item, kueri) => {
  const kata = kueri.toLowerCase().split(/\s+/).filter(Boolean);
  if (!kata.length) return 1;
  const label = item.label.toLowerCase();
  const sisa = (item.cari || '').toLowerCase();
  let skor = 0;
  for (const k of kata) {
    if (label.includes(k)) skor += label.startsWith(k) ? 3 : 2;
    else if (sisa.includes(k)) skor += 1;
    else return 0;
  }
  return skor;
};

/* Hasil terurut untuk satu kueri. Diekspor agar bisa diuji tanpa DOM. */
export const cariPerintah = (items, kueri) =>
  items
    .map(it => ({ it, s: skorItem(it, kueri) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.it.label.localeCompare(b.it.label))
    .map(x => x.it);

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const gambarList = () => {
  if (!elList) return;
  if (!daftar.length) {
    elList.innerHTML = `<li class="pal-kosong" role="presentation">${esc(tr('Tidak ada yang cocok'))}</li>`;
    return;
  }
  elList.innerHTML = daftar.map((x, i) => `
    <li class="pal-item${i === pilih ? ' on' : ''}" role="option" id="pal-o-${i}"
        aria-selected="${i === pilih}" data-pal-i="${i}">
      <span class="pal-label">${esc(x.label)}</span>
      ${x.hint ? `<span class="pal-hint">${esc(x.hint)}</span>` : ''}
    </li>`).join('');
  elKotak.setAttribute('aria-activedescendant', daftar.length ? 'pal-o-' + pilih : '');
  const aktifEl = elList.querySelector('.pal-item.on');
  if (aktifEl && aktifEl.scrollIntoView) aktifEl.scrollIntoView({ block: 'nearest' });
};

const perbarui = () => {
  daftar = cariPerintah(kumpulkan(), elKotak.value.trim());
  pilih = 0;
  gambarList();
};

export const bukaPalette = () => {
  if (!elPal || terbuka) return;
  terbuka = true;
  elPal.classList.add('on');
  elKotak.value = '';
  elKotak.focus();
  perbarui();
};

export const tutupPalette = () => {
  if (!elPal || !terbuka) return;
  terbuka = false;
  elPal.classList.remove('on');
  elKotak.blur();
};

export const paletTerbuka = () => terbuka;

const jalankan = i => {
  const item = daftar[i];
  if (!item) return;
  tutupPalette();
  try { item.jalan(); } catch (e) { /* aksi gagal tidak boleh menutup aplikasi */ }
};

/* Dipanggil sekali saat aplikasi dimulai. */
export const initPalette = () => {
  if (elPal) return;
  elPal = document.createElement('div');
  elPal.id = 'palette';
  elPal.className = 'pal';
  elPal.innerHTML = `
    <div class="pal-kartu" role="dialog" aria-modal="true" aria-label="${esc(tr('Cari perintah'))}">
      <input class="pal-kotak" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list"
             aria-autocomplete="list" placeholder="${esc(tr('Ketik perintah, judul catatan…'))}" autocomplete="off" spellcheck="false">
      <ul class="pal-list" id="pal-list" role="listbox"></ul>
      <div class="pal-kaki">↑↓ ${esc(tr('pilih'))} · Enter ${esc(tr('buka'))} · Esc ${esc(tr('tutup'))}</div>
    </div>`;
  document.body.appendChild(elPal);
  elKotak = elPal.querySelector('.pal-kotak');
  elList = elPal.querySelector('.pal-list');

  elPal.addEventListener('mousedown', e => { if (e.target === elPal) tutupPalette(); });
  elKotak.addEventListener('input', perbarui);
  elList.addEventListener('mousedown', e => { e.preventDefault(); });   /* jaga fokus di kotak */
  elList.addEventListener('click', e => {
    const li = e.target.closest('[data-pal-i]');
    if (li) jalankan(Number(li.dataset.palI));
  });
  elList.addEventListener('mousemove', e => {
    const li = e.target.closest('[data-pal-i]');
    if (li && Number(li.dataset.palI) !== pilih) { pilih = Number(li.dataset.palI); gambarList(); }
  });

  elKotak.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!daftar.length) return;
      const n = daftar.length;
      pilih = (pilih + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      gambarList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      jalankan(pilih);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      tutupPalette();
    }
  });

  /* Ctrl/⌘+K membuka atau menutup palette, di mana pun fokus berada. */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      terbuka ? tutupPalette() : bukaPalette();
    }
  });
};
