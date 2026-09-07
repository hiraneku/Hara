/* Pesan singkat di bawah layar.
   Opsional membawa SATU tombol aksi (mis. "Urungkan" untuk hapus) —
   lihat `toast(msg, aksi, lama)`. Aksi dipakai sekali lalu dibuang. */
let t = null;
let aksiTerakhir = null;

export function toast(msg, aksi, lama = 2000) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.textContent = '';
  const teks = document.createElement('span');
  teks.textContent = msg;
  box.appendChild(teks);

  aksiTerakhir = aksi ? aksi.cb || null : null;
  if (aksi) {
    const tombol = document.createElement('button');
    tombol.className = 'toast-a';
    tombol.type = 'button';
    tombol.textContent = aksi.label || 'Urungkan';
    box.appendChild(tombol);
  }
  box.classList.toggle('has-a', !!aksi);

  clearTimeout(t);
  box.classList.add('on');
  t = setTimeout(() => {
    box.classList.remove('on');
    aksiTerakhir = null;
  }, lama);
}

/* Tombol aksi dalam toast — dipasang sekali. */
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('.toast-a')) return;
  const fn = aksiTerakhir;
  aksiTerakhir = null;
  if (fn) { try { fn(); } catch (err) {} }
});
