/* Seret blok dengan gagang (pegangan) di sisi kiri blok.

   Blok editor hidup langsung di DOM (contenteditable) — memindahkan blok
   cukup memindahkan elemennya, isi ikut terbawa. Pointer Events dipakai
   (bukan HTML5 DnD) supaya aman untuk sentuh dan tidak mengganggu
   seleksi teks. Simpanan memakai urutan DOM, jadi urutan baru otomatis
   ikut tersimpan. */

import { renumber } from './editor/blocks.js?v=20260908054158';
import { saveSoon } from './editor/cleanup.js?v=20260908054158';

let aktif = null;

export function pasangSeret(elEditor) {
  if (!elEditor || elEditor._dragTerpasang) return;
  elEditor._dragTerpasang = true;

  elEditor.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;   /* kiri saja */
    const pegangan = e.target.closest ? e.target.closest('.blk-h') : null;
    if (!pegangan) return;
    const blok = pegangan.parentElement;
    /* gagang harus anak langsung sebuah blok yang merupakan anak editor */
    if (!blok || blok.parentElement !== elEditor) return;
    e.preventDefault();
    e.stopPropagation();
    mulai(e, blok);
  });
}

function blokSaudara(editor) {
  const daftar = [];
  for (const c of editor.children) {
    if (c.classList && c.classList.contains('b-div')) continue;
    daftar.push(c);
  }
  return daftar;
}

function mulai(e, blok) {
  aktif = { blok, y0: e.clientY, bergerak: false };
  document.body.classList.add('drag-blk');
  window.addEventListener('pointermove', gerak);
  window.addEventListener('pointerup', lepas);
  window.addEventListener('pointercancel', lepas);
}

function gerak(e) {
  if (!aktif) return;
  if (!aktif.bergerak) {
    if (Math.abs(e.clientY - aktif.y0) < 4) return;   /* belum seret */
    aktif.bergerak = true;
    aktif.blok.classList.add('drag-src');
  }
  const editor = aktif.blok.parentElement;
  if (!editor) return;
  const er = editor.getBoundingClientRect();
  const y = e.clientY - er.top + (editor.scrollTop || 0);
  pindah(editor, y);
}

/* sisipkan blok yang diseret sebelum/sesudah blok yang pusatnya paling
   dekat dengan garis pointer */
function pindah(editor, y) {
  const blok = aktif.blok;
  const lain = blokSaudara(editor).filter(c => c !== blok);
  if (!lain.length) return;

  let terdekat = lain[0];
  let jarak = Infinity;
  for (const c of lain) {
    const r = c.getBoundingClientRect();
    const er = editor.getBoundingClientRect();
    const pusat = r.top - er.top + r.height / 2 + (editor.scrollTop || 0);
    const d = Math.abs(pusat - y);
    if (d < jarak) { jarak = d; terdekat = c; }
  }

  const rt = terdekat.getBoundingClientRect();
  const er = editor.getBoundingClientRect();
  const pusatT = rt.top - er.top + rt.height / 2 + (editor.scrollTop || 0);
  const sebelum = y < pusatT;

  if (sebelum) {
    if (terdekat.previousElementSibling === blok) return;
    editor.insertBefore(blok, terdekat);
  } else {
    if (terdekat.nextElementSibling === blok) return;
    const sesudah = terdekat.nextElementSibling;
    if (sesudah) editor.insertBefore(blok, sesudah);
    else editor.appendChild(blok);
  }
}

function lepas() {
  if (!aktif) return;
  const blok = aktif.blok;
  const bergerak = aktif.bergerak;
  aktif = null;
  document.body.classList.remove('drag-blk');
  window.removeEventListener('pointermove', gerak);
  window.removeEventListener('pointerup', lepas);
  window.removeEventListener('pointercancel', lepas);
  blok.classList.remove('drag-src');
  if (bergerak) {
    renumber();
    saveSoon();
  }
}
