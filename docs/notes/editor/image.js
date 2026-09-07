/* Sematkan gambar ke catatan.

   Yang disimpan di catatan hanyalah <img data-blob="b7">, tanpa isi gambar.
   Berkasnya sendiri masuk IndexedDB. Ini menjaga catatan tetap ringan dan
   membuat autosave ke localStorage tidak pernah kepenuhan. */

import { docEl, sel, ensureCaret, caretEnd } from './caret.js?v=20260907130443';
import { refresh } from './cleanup.js?v=20260907130443';
import { simpanBlob, urlUntuk, hapusBlob, semuaId } from '../../core/blobs.js?v=20260907130443';
import { state } from '../../core/store.js?v=20260907130443';
import { cur } from '../../core/router.js?v=20260907130443';
import { toast } from '../../core/toast.js?v=20260907130443';

const MAKS_SISI = 1600;    /* piksel — foto ponsel dikecilkan sampai sini */
const MUTU      = 0.82;

/* Id blob dengan pola waktu+acak+urut (sama seperti id blok/catatan) —
   id model lama (`Date.now() % 100000` + counter sesi) bisa terbit lagi
   setelah ~28 jam atau di sesi lain, lalu blob lama TERTIMPA. Prefiks 'f'
   sekaligus memisahkannya dari id model lama ('b…') yang masih dirujuk
   catatan lama. */
let _urut = 0;
const idBaru = () =>
  'f' + Date.now().toString(36).slice(-6) +
  Math.random().toString(36).slice(2, 6) + (_urut++).toString(36);

/* Kecilkan gambar besar supaya hemat ruang & cepat dimuat. */
function kecilkan(file) {
  return new Promise(res => {
    /* GIF dibiarkan apa adanya — mengecilkannya menghilangkan animasi. */
    if (file.type === 'image/gif' || !/^image\//.test(file.type)) return res(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width: w, height: h } = img;
      if (Math.max(w, h) <= MAKS_SISI) return res(file);
      const skala = MAKS_SISI / Math.max(w, h);
      const c = document.createElement('canvas');
      c.width  = Math.round(w * skala);
      c.height = Math.round(h * skala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => res(b || file), 'image/jpeg', MUTU);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}

/* Sisipkan satu berkas gambar sebagai blok tersendiri.
   Prosesnya ASYNC (kecilkan → simpan blob). Selama menunggu itu pengguna
   bisa pindah catatan/keluar editor — jadi setelah setiap `await` dicek
   lagi apakah catatan yang dibuka masih sama dan DOM editor masih yang
   sama. Kalau sudah pindah, blob yang barusan disimpan dibuang dan
   sisipan dibatalkan (kalau diteruskan, gambar bisa mendarat di catatan
   yang SALAH). */
export async function sisipGambar(file) {
  const d = docEl();
  if (!d || !file) return;
  if (!/^image\//.test(file.type)) { toast('Hanya berkas gambar'); return; }
  const idCatatan = state.openId;

  const kecil = await kecilkan(file);
  const id = idBaru();

  /* sasaran sudah bergeser? buang blob yang belum sempat dipakai */
  const masihSama = () =>
    cur === 'editor' && state.openId === idCatatan && docEl() === d && d.isConnected;
  if (!masihSama()) return;

  try {
    await simpanBlob(id, kecil);
  } catch (e) {
    toast('Gagal menyimpan gambar');
    return;
  }
  if (!masihSama()) { try { await hapusBlob(id); } catch (e) {} return; }

  ensureCaret();
  const b = (() => {
    const s = sel();
    if (!s || !s.rangeCount) return d.lastElementChild;
    let n = s.getRangeAt(0).startContainer;
    if (n.nodeType === 3) n = n.parentNode;
    while (n && n.parentNode !== d) n = n.parentNode;
    return n || d.lastElementChild;
  })();

  const fig = document.createElement('div');
  fig.className = 'b-img';
  fig.setAttribute('contenteditable','false');
  const img = document.createElement('img');
  img.setAttribute('data-blob', id);
  img.alt = file.name || 'gambar';
  fig.appendChild(img);

  const hapus = document.createElement('button');
  hapus.className = 'img-x';
  hapus.setAttribute('data-imgx', id);
  hapus.setAttribute('type','button');
  hapus.title = 'Hapus gambar';
  hapus.setAttribute('aria-label', 'Hapus gambar');
  hapus.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  fig.appendChild(hapus);

  if (b) b.after(fig); else d.appendChild(fig);

  /* selalu sediakan blok teks setelah gambar supaya bisa lanjut mengetik */
  let nb = fig.nextElementSibling;
  if (!nb || nb.classList.contains('b-img') || nb.classList.contains('b-div')) {
    nb = document.createElement('div');
    nb.className = 'b-p';
    fig.after(nb);
  }
  caretEnd(nb);

  const u = await urlUntuk(id);
  if (u) img.setAttribute('src', u);
  refresh();
  toast('Gambar disisipkan');
}

/* Buka pemilih berkas. */
export function pilihGambar() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    inp.remove();
    if (f) await sisipGambar(f);
  };
  inp.click();
}

/* Pasang ulang semua gambar setelah catatan dirender.
   HTML tersimpan hanya berisi data-blob, src-nya kosong. */
export async function pasangGambar() {
  const d = docEl();
  if (!d) return;
  const list = Array.from(d.querySelectorAll('img[data-blob]'));
  for (const img of list) {
    const id = img.getAttribute('data-blob');
    if (img.getAttribute('src')) continue;
    const u = await urlUntuk(id);
    if (u) img.setAttribute('src', u);
    else img.replaceWith(Object.assign(document.createElement('div'), {
      className: 'img-hilang', textContent: 'Gambar tidak ditemukan'
    }));
  }
}

/* Apakah blob ini masih dipakai catatan lain / masih tampil di editor?
   Dipakai sebelum menghapus berkas, supaya menghapus gambar di satu
   catatan tidak merusak catatan lain yang berbagi blob yang sama. */
function blobDipakai(id) {
  const d = docEl();
  if (d && d.querySelector(`img[data-blob="${id}"]`)) return true;
  return state.notes.some(n =>
    n.id !== state.openId && (n.blocks || []).some(b =>
      !!(b.meta && b.meta.blobId === id)));
}

/* Hapus satu gambar dari editor.
   Blok dicari lewat gambar ATAU tombol silangnya (data-imgx) — jadi
   blok yang berkasnya sudah hilang ("Gambar tidak ditemukan") tetap
   bisa dihapus. Blob di IndexedDB dihapus hanya kalau tak dipakai lagi. */
export async function hapusGambar(id) {
  const d = docEl();
  if (d) {
    const img = d.querySelector(`img[data-blob="${id}"]`);
    const tombol = d.querySelector(`[data-imgx="${id}"]`);
    const fig = (img || tombol) ? (img || tombol).closest('.b-img') : null;
    if (fig) fig.remove();
  }
  refresh();
  if (!blobDipakai(id)) {
    try { await hapusBlob(id); } catch (e) {}
  }
  toast('Gambar dihapus');
}

/* Bersihkan blob yang tidak lagi dirujuk catatan mana pun.
   Dipanggil saat catatan dibuang permanen (setelah jendela Urungkan
   lewat) — kalau langsung saat hapus, gambar yang bisa di-Urungkan
   sudah keburu hilang.

   Referensi dihitung dari catatan tersimpan DAN dari DOM editor yang
   sedang terbuka: autosave menunggu 700 ms, jadi blob yang baru saja
   disisipkan belum tentu sudah tercatat di state.notes — membaca DOM
   mencegah sapuan ini menghapus gambar yang masih tampil. */
export async function bersihkanBlobYatim() {
  try {
    const dipakai = new Set();
    state.notes.forEach(n =>
      (n.blocks || []).forEach(b => {
        if (b.meta && b.meta.blobId) dipakai.add(b.meta.blobId);
      }));
    const dd = docEl();
    if (dd) {
      Array.from(dd.querySelectorAll('img[data-blob]')).forEach(img => {
        const id = img.getAttribute('data-blob');
        if (id) dipakai.add(id);
      });
    }
    const ids = await semuaId();
    await Promise.all(ids
      .filter(id => !dipakai.has(id))
      .map(id => hapusBlob(id).catch(() => {})));
  } catch (e) { /* pembersihan gagal: biarkan, lain kali tersapu lagi */ }
}
