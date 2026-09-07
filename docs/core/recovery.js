/* ════════ RECOVERY STORAGE ════════

   Menyimpan perubahan yang BELUM sempat masuk ke penyimpanan utama.
   Terpisah dari `store.js` supaya kegagalan menulis catatan utama tidak
   ikut menghapus jaring pengamannya — dan sebaliknya.

   Isinya satu entri saja: catatan yang sedang disunting. Tidak menumpuk,
   jadi storage tidak membengkak.

   Alur:
     ketik → tandai draf  → (autosave berhasil) → draf dibuang
                          → (aplikasi tertutup) → draf tertinggal
                                                → ditawarkan saat dibuka
*/

const KEY = 'hara.recovery.v1';

/* Simpan draf untuk satu catatan. Selalu menimpa draf sebelumnya —
   yang kita butuhkan hanya keadaan terakhir, bukan riwayat. */
export function tulisDraf(noteId, data) {
  if (!noteId) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      noteId,
      title: data.title,
      blocks: data.blocks,
      ts: Date.now(),
    }));
    return true;
  } catch (e) {
    return false;   /* penyimpanan penuh — jangan sampai melempar */
  }
}

/* Baca draf. `noteId` opsional: kalau diisi, draf untuk catatan LAIN
   diabaikan — mencegah draf Catatan A muncul saat membuka Catatan B. */
export function bacaDraf(noteId) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.noteId || !Array.isArray(d.blocks)) return null;
    if (noteId && d.noteId !== noteId) return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function hapusDraf() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

/* Buang draf hanya kalau memang milik catatan ini — supaya menyimpan
   Catatan B tidak menghapus jaring pengaman Catatan A. */
export function hapusDrafMilik(noteId) {
  const d = bacaDraf();
  if (d && d.noteId === noteId) hapusDraf();
}

