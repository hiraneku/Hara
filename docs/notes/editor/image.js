/* Sematkan gambar ke catatan.

   Yang disimpan di catatan hanyalah <img data-blob="b7">, tanpa isi gambar.
   Berkasnya sendiri masuk IndexedDB. Ini menjaga catatan tetap ringan dan
   membuat autosave ke localStorage tidak pernah kepenuhan. */

import { docEl, sel, ensureCaret, caretEnd } from './caret.js?v=20260909112206';
import { refresh } from './cleanup.js?v=20260909112206';
import { pastikanKolomAkhir } from './blocks.js?v=20260909112206';
import { simpanBlob, urlUntuk, hapusBlob, semuaId, usiaBlob, prunUsiaBlob }
  from '../../core/blobs.js?v=20260909112206';
import { state } from '../../core/store.js?v=20260909112206';
import { cur } from '../../core/router.js?v=20260909112206';
import { toast } from '../../core/toast.js?v=20260909112206';
import { t as tr } from '../../core/i18n.js?v=20260909112206';

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
  if (!/^image\//.test(file.type)) { toast(tr('Hanya berkas gambar')); return; }
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
    toast(tr('Gagal menyimpan gambar'));
    return;
  }
  if (!masihSama()) { try { await hapusBlob(id); } catch (e) {} return; }

  await sematkanBlokGambar(id, file.name || 'gambar');
  toast(tr('Gambar disisipkan'));
}

/* Sematkan satu blob gambar sebagai blok baru di posisi kursor.
   Dipakai sisipGambar (setelah blob disimpan) dan galeri (C15, blob
   sudah ada — tidak disalin). Tata letak awal: 100% baris sendiri. */
export async function sematkanBlokGambar(id, alt) {
  const d = docEl();
  if (!d || !id) return;
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
  img.alt = alt || 'gambar';
  fig.appendChild(img);

  const hapus = document.createElement('button');
  hapus.className = 'img-x';
  hapus.setAttribute('data-imgx', id);
  hapus.setAttribute('type','button');
  hapus.title = tr('Hapus gambar');
  hapus.setAttribute('aria-label', tr('Hapus gambar'));
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
  if (u && fig.isConnected) img.setAttribute('src', u);
  refresh();
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
    if (u) {
      img.setAttribute('src', u);
      /* simpan rasio begitu dimensi diketahui — render ulang berikutnya
         (ganti mode) langsung memakai ukuran yang benar tanpa menunggu */
      const ingat = () => {
        if (img.naturalWidth && img.naturalHeight)
          img.style.aspectRatio = img.naturalWidth + '/' + img.naturalHeight;
        /* gambar sudah punya ukuran — ukur ulang slot sisi penutupnya */
        pastikanKolomAkhir(d);
      };
      if (img.complete && img.naturalWidth) ingat();
      else img.addEventListener('load', ingat, { once: true });
      continue;
    }
    /* Berkasnya tidak ada: gambar disembunyikan & placeholder ditampilkan.
       Elemen <img data-blob> SENG AJA dipertahankan (tersembunyi) supaya
       referensi blob tetap terbaca saat menyimpan — menggantinya dengan
       div akan menghilangkan id gambar dari catatan. */
    img.style.display = 'none';
    const fig = img.closest('.b-img');
    if (fig) fig.classList.add('img-rusak');
    if (fig && !fig.querySelector('.img-hilang')) {
      fig.appendChild(Object.assign(document.createElement('div'), {
        className: 'img-hilang',
        textContent: tr('Gambar tidak ditemukan'),
      }));
    }
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
  toast(tr('Gambar dihapus'));
}

/* Bersihkan blob yang tidak lagi dirujuk catatan mana pun.
   Dipanggil saat catatan dibuang permanen (setelah jendela Urungkan
   lewat) dan sekali tiap sesi — kalau langsung saat hapus, gambar yang
   bisa di-Urungkan sudah keburu hilang.

   Referensi dihitung dari catatan tersimpan DAN dari DOM editor yang
   sedang terbuka: autosave menunggu 700 ms, jadi blob yang baru saja
   disisipkan belum tentu sudah tercatat di state.notes — membaca DOM
   mencegah sapuan ini menghapus gambar yang masih tampil.

   PENGAMAN: blob yang berusia < 24 jam tidak pernah disapu. Gambar bisa
   direferensikan dari tempat yang belum terbaca di sini (mis. draf
   pemulihan yang belum dipulihkan, langkah undo/redo), jadi sapuan hanya
   berani menghapus berkas yang sudah lama tak dirujuk. */
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
    const hidup = new Set(ids);
    prunUsiaBlob(hidup);
    const BATAS = 24 * 60 * 60 * 1000;
    await Promise.all(ids
      .filter(id => !dipakai.has(id))
      .filter(id => {
        const u = usiaBlob(id);
        return u !== null && u > BATAS;
      })
      .map(id => hapusBlob(id).catch(() => {})));
  } catch (e) { /* pembersihan gagal: biarkan, lain kali tersapu lagi */ }
}

/* Pasang gambar mini di daftar catatan (C16).
   Baris daftar memuat <img class="row-th" data-blob=…> TANPA src (baris
   tetap ringan). Begitu daftar digambar, di sini tiap miniatur diberi
   objectURL; blob yang sudah hilang membuat miniatur dibuang. */
export async function pasangThumbDaftar(root) {
  if (!root || !root.querySelectorAll) return;
  const list = Array.from(root.querySelectorAll('img.row-th[data-blob]:not([src])'));
  if (!list.length) return;
  const kerja = list.map(async img => {
    const id = img.getAttribute('data-blob');
    if (!id) return;
    const u = await urlUntuk(id);
    if (!u) { img.remove(); return; }
    if (img.isConnected) img.setAttribute('src', u);
  });
  await Promise.all(kerja);
}

/* Ganti gambar yang sedang dipilih dengan berkas lain (C14).
   Hanya elemen <img> dalam figur yang diganti — kelas tata letak, lebar,
   rotasi, posisi, dan paragraf pengapit di sekitarnya TIDAK disentuh,
   jadi tata letak gambar tetap persis seperti sebelumnya. */
export async function gantiGambar(fig, file) {
  const d = docEl();
  if (!d || !fig || !file) return;
  if (!/^image\//.test(file.type)) { toast(tr('Hanya berkas gambar')); return; }
  const img = fig.querySelector('img[data-blob]');
  if (!img) return;
  const idLama = img.getAttribute('data-blob');
  const idCatatan = state.openId;

  const kecil = await kecilkan(file);
  const id = idBaru();
  const masihSama = () =>
    cur === 'editor' && state.openId === idCatatan && docEl() === d &&
    d.isConnected && fig.isConnected;
  if (!masihSama()) return;
  try { await simpanBlob(id, kecil); }
  catch (e) { toast(tr('Gagal menyimpan gambar')); return; }
  if (!masihSama()) { try { await hapusBlob(id); } catch (e) {} return; }

  img.setAttribute('data-blob', id);
  img.alt = file.name || 'gambar';
  /* rasio lama (style dari gambar sebelumnya) tidak berlaku lagi */
  img.style.aspectRatio = '';
  img.style.display = '';
  fig.classList.remove('img-rusak');
  const hilang = fig.querySelector('.img-hilang');
  if (hilang) hilang.remove();
  img.removeAttribute('src');
  const ingat = () => {
    if (img.naturalWidth && img.naturalHeight) {
      img.style.aspectRatio = img.naturalWidth + '/' + img.naturalHeight;
      pastikanKolomAkhir(d);
    }
  };
  const u = await urlUntuk(id);
  if (!masihSama()) { try { await hapusBlob(id); } catch (e) {} return; }
  if (u) {
    img.setAttribute('src', u);
    if (img.complete && img.naturalWidth) ingat();
    else img.addEventListener('load', ingat, { once: true });
  } else {
    img.style.display = 'none';
  }
  refresh();
  /* blob lama dibuang hanya kalau tak dipakai catatan lain / DOM lain */
  if (idLama && idLama !== id && !blobDipakai(idLama)) {
    try { await hapusBlob(idLama); } catch (e) {}
  }
  toast(tr('Gambar diganti'));
}
