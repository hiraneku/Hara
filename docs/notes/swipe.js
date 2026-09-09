/* Sapuan baris daftar catatan (D21).

   Geser baris ke kiri membuka dua aksi: Arsip / Kembalikan dan Hapus
   (soft-delete ke Sampah 30 hari — bisa diurungkan 6 detik). Geser ke
   kanan atau ketuk baris yang terbuka menutupnya kembali.

   Konflik dihindari dengan aturan ketat:
   - geser hanya dihitung kalau gerakan DOMINAN horizontal (|dx| jauh
     lebih besar dari |dy|) dan melewati ambang 10px — kalau tidak,
     klik biasa (buka catatan, pin, tag) berjalan normal;
   - setelah sapuan benar-benar terjadi, klik susulan ditekan supaya
     baris tidak ikut terbuka;
   - tombol aksi memakai delegasi klik global (data-sw-ars / data-sw-del
     di index.js), sama seperti aksi daftar lain;
   - `touch-action:pan-y` pada lapisan baris (CSS) menyerahkan scroll
     vertikal ke peramban, sapuan horizontal ke gesture ini.

   jsdom tidak punya PointerEvent — suite menguji tombol aksi
   (data-sw-*) langsung dan tidak menguji pointer gesture. */

const AMBANG_MULAI = 10;    /* px gerak sebelum dianggap sapuan */
const AMBANG_BUKA = -92;    /* px: lewat ini = terbuka penuh */
const BUKA = -164;          /* px: posisi terbuka (dua tombol × 82px) */
const TAHAN_KLIK = 550;     /* ms setelah sapuan: tekan klik susulan */

let geser = null;           /* state gesture aktif */
let tekanKlikSampai = 0;    /* timestamp: klik ditekan sampai waktu ini */

/* tutup semua baris kecuali `kecuali` */
function tutupLain(kecuali) {
  const buka = document.querySelectorAll('.srow.open');
  for (const s of buka) {
    if (s !== kecuali) {
      s.classList.remove('open');
      s.querySelectorAll('.sa').forEach(b => b.setAttribute('tabindex', '-1'));
    }
  }
}

export function bindSwipe() {
  document.addEventListener('pointerdown', e => {
    const lapis = e.target.closest('.srow-b');
    if (!lapis) return;
    const srow = lapis.closest('.srow');
    if (!srow) return;
    /* sentuhan yang bukan tombol kiri mouse tidak memulai gesture */
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sudahBuka = srow.classList.contains('open');
    if (sudahBuka) {
      /* ketuk baris yang terbuka = tutup (dan jangan buka catatan) */
      geser = { srow, x: e.clientX, y: e.clientY, mulai: false, tutup: true, cur: BUKA };
      return;
    }
    tutupLain(srow);
    geser = { srow, x: e.clientX, y: e.clientY, mulai: false, tutup: false, cur: 0 };
  }, true);

  document.addEventListener('pointermove', e => {
    if (!geser) return;
    const dx = e.clientX - geser.x;
    const dy = e.clientY - geser.y;
    if (!geser.mulai) {
      if (Math.abs(dx) < AMBANG_MULAI && Math.abs(dy) < AMBANG_MULAI) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.4) { geser = null; return; }  /* vertikal: scroll */
      geser.mulai = true;
    }
    let p = geser.cur + (geser.tutup ? dx : dx);
    if (p > 0) p = 0;
    if (p < BUKA) p = BUKA;
    geser.srow.querySelector('.srow-b').style.transform = `translateX(${p}px)`;
  }, true);

  const selesaikan = () => {
    if (!geser) return;
    const g = geser;
    geser = null;
    const lapis = g.srow.querySelector('.srow-b');
    let akhir = 0;
    if (g.mulai) {
      /* posisi akhir mengikuti arah & ambang */
      const t = lapis.style.transform || '';
      const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(t);
      const kini = m ? Number(m[1]) : 0;
      akhir = kini < AMBANG_BUKA ? BUKA : 0;
    }
    /* ketuk tanpa geser bukan urusan gesture — klik normal tetap jalan */
    if (g.tutup || g.mulai) {
      if (akhir === BUKA) {
        g.srow.classList.add('open');
        g.srow.querySelectorAll('.sa').forEach(b => b.setAttribute('tabindex', '0'));
      } else {
        g.srow.classList.remove('open');
        g.srow.querySelectorAll('.sa').forEach(b => b.setAttribute('tabindex', '-1'));
      }
      lapis.style.transform = '';
      /* sapuan (atau ketuk-tutup) menekan klik susulan pada baris ini */
      tekanKlikSampai = Date.now() + TAHAN_KLIK;
    }
  };
  document.addEventListener('pointerup', selesaikan, true);
  document.addEventListener('pointercancel', selesaikan, true);

  /* tekan klik yang menyusul sapuan supaya baris tidak terbuka */
  document.addEventListener('click', e => {
    if (tekanKlikSampai && Date.now() < tekanKlikSampai) {
      tekanKlikSampai = 0;
      if (e.target.closest('.srow-b')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
  }, true);

  /* sapuan lain menutup baris yang terbuka */
  document.addEventListener('scroll', () => { geser = null; }, true);
}

/* Tutup baris yang sedang terbuka (dipanggil saat daftar digambar ulang
   atau berpindah layar). */
export function tutupSwipe() {
  document.querySelectorAll('.srow.open').forEach(s => {
    s.classList.remove('open');
    s.querySelectorAll('.sa').forEach(b => b.setAttribute('tabindex', '-1'));
  });
}
