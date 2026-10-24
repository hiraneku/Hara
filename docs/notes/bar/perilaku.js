/* P1 · Kapan bar format (.mech) tampil di layar sempit.

   Aturan (hanya ≤ 640 px; di layar lebar bar selalu tampil seperti biasa):
   - tampil saat ada fokus teks (keyboard terbuka: contenteditable, judul,
     atau kolom isian di dalam menu) atau saat menu/popup sedang terbuka;
   - sembunyi saat keyboard tidak aktif;
   - sembunyi saat halaman digulir ke bawah, dan muncul lagi saat digulir
     ke atas, atau saat fokus teks baru diberikan.

   Gulir yang terjadi tepat setelah mengetik diabaikan: caret yang turun
   otomatis tidak boleh menyembunyikan bar di tengah penulisan. */
/* lebar layar dibaca saat dipakai (bukan saat modul dimuat); jsdom & peramban
   tanpa matchMedia jatuh ke innerWidth */
const sempit = () => (window.matchMedia
  ? window.matchMedia('(max-width:640px)').matches
  : (window.innerWidth || 9999) <= 640);
const JEDA_KETIK_MS = 700;
const AMBANG_GULIR = 6;          /* px — gerak kecil tidak dihitung */

let sembunyiGulir = false;
let ketikTerakhir = 0;
let lastTarget = null;
let lastY = 0;
let terpasang = false;

function adaFokusTeks() {
  const a = document.activeElement;
  if (!a || a === document.body) return false;
  if (a.isContentEditable) return true;
  return a.matches && a.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]), textarea');
}

function menuTerbuka() {
  const p = document.getElementById('pop');
  return !!(p && p.classList.contains('on'));
}

function perbarui() {
  const mech = document.getElementById('mech');
  if (!mech) return;
  const tanpaKeyboard = !adaFokusTeks() && !menuTerbuka();
  const sembunyi = sempit() && (tanpaKeyboard || sembunyiGulir);
  mech.classList.toggle('mech-sembunyi', sembunyi);
}

function posisiGulir(target) {
  if (!target || target === document || target === document.documentElement || target === document.body) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return target.scrollTop || 0;
}

export function pasangPerilakuBar() {
  if (terpasang) return;
  terpasang = true;

  document.addEventListener('focusin', () => {
    sembunyiGulir = false;            /* fokus baru = pengguna mau menulis lagi */
    perbarui();
  });
  document.addEventListener('focusout', () => setTimeout(perbarui, 0));

  document.addEventListener('input', () => { ketikTerakhir = Date.now(); }, true);

  document.addEventListener('scroll', e => {
    const t = e.target;
    if (t !== lastTarget) { lastTarget = t; lastY = posisiGulir(t); return; }
    const y = posisiGulir(t);
    const gerak = y - lastY;
    lastY = y;
    if (Math.abs(gerak) < AMBANG_GULIR) return;
    if (Date.now() - ketikTerakhir < JEDA_KETIK_MS) return;
    if (y <= 0) sembunyiGulir = false;
    else if (gerak > 0) sembunyiGulir = true;
    else sembunyiGulir = false;
    perbarui();
  }, { capture: true, passive: true });

  /* menu ··· / popup dibuka atau ditutup: ikuti keadaannya */
  const pop = document.getElementById('pop');
  if (pop && window.MutationObserver) new window.MutationObserver(perbarui).observe(pop, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', perbarui);
  perbarui();
}

/* untuk tes */
export const _uji = { adaFokusTeks, perbarui, setSembunyiGulir: v => { sembunyiGulir = v; } };

/* P2: setiap kali layar editor digambar, bar format kembali ke ujung kiri.
   Lima tombol paling awal (Undo, Redo, /, B, I) tidak boleh tertinggal di
   luar layar hanya karena bar tergulir ke kanan saat memakai grup di kanan. */
export function kembalikanBarKeAwal() {
  const box = document.querySelector('.mech-in');
  if (box) box.scrollLeft = 0;
}
