import { esc } from '../core/dom.js?v=20261105210000';
import { toast } from '../core/toast.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { openPop, closeAll } from './menus/pop.js?v=20261105210000';
import { sheet, shField, shAksi } from './sheet.js?v=20261105210000';
import { buatKlienSinkronisasi } from '../core/sinkronisasi-klien.js?v=20261105210000';

const klien = buatKlienSinkronisasi();
let sibuk = false;

function bukaForm(pesan = '') {
  const isi = `${pesan ? `<p class="note" role="alert">${esc(pesan)}</p>` : ''}
    ${shField({ id: 'n6-url', ikon: 'i-link', label: tr('URL file WebDAV HTTPS'), placeholder: 'https://server.example/hara/sync.json', type: 'url', atribut: 'autocapitalize="off" spellcheck="false"' })}
    ${shField({ id: 'n6-user', ikon: 'i-user', label: tr('Nama pengguna (opsional)'), placeholder: tr('Nama pengguna') })}
    ${shField({ id: 'n6-pass', ikon: 'i-lock', label: tr('Kata sandi WebDAV (tidak disimpan)'), placeholder: tr('Kata sandi'), type: 'password' })}
    ${shField({ id: 'n6-phrase', ikon: 'i-key', label: tr('Frasa enkripsi (sama di semua perangkat)'), placeholder: tr('Minimal 12 karakter'), type: 'password', maxlength: 256 })}
    <p class="note">${tr('Isi note dienkripsi di perangkat sebelum dikirim. Server WebDAV hanya menerima ciphertext. Frasa enkripsi tidak dapat dipulihkan; simpan dengan aman. Sinkronisasi memerlukan WebDAV HTTPS dengan CORS dan dukungan ETag.')}</p>`;
  openPop(sheet({ ikon: 'i-lock', judul: tr('Sinkronisasi E2E'), catatan: esc(tr('Pakai endpoint WebDAV milikmu. Kredensial tidak disimpan.')), isi,
    kaki: shAksi({ batal: tr('Batal'), tutup: true, utama: tr('Sinkronkan'), utamaId: 'n6-sync-run' }) }));
}

function teksBenturan(c) {
  const nama = c.jenis === 'catatan' ? (c.lokal?.title || c.jauh?.title || c.id) : c.id;
  const local = c.lokal ? JSON.stringify(c.lokal).slice(0, 260) : tr('Dihapus di perangkat ini');
  const remote = c.jauh ? JSON.stringify(c.jauh).slice(0, 260) : tr('Dihapus di perangkat lain');
  return `<div class="n6-conflict"><b>${esc(c.jenis)} · ${esc(nama)}</b><div class="n6-sides"><div><small>${tr('Perangkat ini')}</small><code>${esc(local)}</code></div><div><small>${tr('WebDAV')}</small><code>${esc(remote)}</code></div></div>
    <label class="sh-field"><span class="sh-lab">${tr('Pilih cara menyelesaikan')}</span><span class="sh-in"><select class="sh-inp" data-n6-pick="${esc(c.jenis)}:${esc(c.id)}"><option value="">${tr('Pilih…')}</option><option value="lokal">${tr('Pakai versi perangkat ini')}</option><option value="jauh">${tr('Pakai versi WebDAV')}</option>${c.jenis === 'catatan' && c.lokal && c.jauh ? `<option value="gabung">${tr('Gabungkan blok dan properti')}</option>` : ''}</select></span></label></div>`;
}

function bukaKonflik(daftar) {
  const isi = `<p class="note">${tr('Perubahan berikut terjadi pada kedua sisi. Pilih tindakan untuk setiap konflik; tidak ada versi yang ditimpa sampai semua pilihan dibuat.')}</p>
    <div class="n6-conflicts">${daftar.map(teksBenturan).join('')}</div>`;
  openPop(sheet({ ikon: 'i-warning', judul: tr('Selesaikan konflik sinkronisasi'), catatan: esc(tr('{n} konflik perlu ditinjau', { n: daftar.length })), isi,
    kaki: shAksi({ batal: tr('Batal'), tutup: true, utama: tr('Terapkan pilihan'), utamaId: 'n6-sync-resolve' }) }));
}

async function jalankan() {
  if (sibuk) return;
  const el = id => document.getElementById(id);
  const endpoint = el('n6-url')?.value.trim() || '';
  const username = el('n6-user')?.value || '';
  const password = el('n6-pass')?.value || '';
  const frasa = el('n6-phrase')?.value || '';
  sibuk = true;
  try {
    const kredensial = username || password ? { username, password } : null;
    const hasil = await klien.mulai({ endpoint, kredensial, frasa });
    if (hasil.status === 'konflik') { bukaKonflik(hasil.konflik); return; }
    if (hasil.status === 'remote-hilang') {
      const yakin = typeof window !== 'undefined' && window.confirm(tr('Snapshot WebDAV yang pernah disinkronkan kini tidak ditemukan. Buat ulang dari data perangkat ini?'));
      if (!yakin) { toast(tr('Tidak ada data yang diubah.')); return; }
      const ulang = await klien.mulai({ endpoint, kredensial, frasa, paksaBuatUlang: true });
      if (ulang.status === 'remote-berubah') { bukaForm(tr('Data WebDAV berubah saat sinkronisasi. Coba lagi agar perubahan terbaru dibaca dulu.')); return; }
      closeAll(); toast(tr('Snapshot WebDAV dibuat ulang dari perangkat ini.')); return;
    }
    if (hasil.status === 'remote-berubah') { bukaForm(tr('Data WebDAV berubah saat sinkronisasi. Coba lagi agar perubahan terbaru dibaca dulu.')); return; }
    closeAll(); toast(tr('Sinkronisasi selesai; data terenkripsi tersimpan di WebDAV.'));
  } catch (err) {
    bukaForm(err?.message || tr('Sinkronisasi gagal. Data lokal tidak diubah.'));
  } finally { sibuk = false; }
}

async function selesaikan() {
  if (sibuk) return;
  const pilihan = {};
  document.querySelectorAll('[data-n6-pick]').forEach(x => { if (x.value) pilihan[x.dataset.n6Pick] = x.value; });
  sibuk = true;
  try {
    const hasil = await klien.pilihKonflik(pilihan);
    if (hasil.status === 'remote-berubah') { toast(tr('Data WebDAV berubah saat konflik ditinjau. Tidak ada perubahan yang diterapkan; sinkronkan ulang.')); closeAll(); return; }
    closeAll(); toast(tr('Konflik diselesaikan dan sinkronisasi selesai.'));
  } catch (err) { toast(err?.message || tr('Pilih tindakan untuk setiap konflik.')); }
  finally { sibuk = false; }
}

export function bindSinkronisasi() {
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-pop-close]')) klien.batalkanKonflik();
    if (e.target.closest?.('[data-sinkronisasi]')) { bukaForm(); return; }
    if (e.target.closest?.('#n6-sync-run')) { jalankan(); return; }
    if (e.target.closest?.('#n6-sync-resolve')) { selesaikan(); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target?.id === 'n6-phrase') { e.preventDefault(); jalankan(); }
  });
}
