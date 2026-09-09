/* Isi catatan sambutan — hanya dipakai sekali, saat catatan bawaan dibuat. */
const B=(cls,inner)=>`<div class="${cls}">${inner}</div>`;
const welcomeBody=`
${B('b-p','<b>Selamat datang di Hara</b> — aplikasi catatan pribadi yang berjalan sepenuhnya di perangkat ini: tanpa akun, tanpa server. Semua tulisan tersimpan lokal, tetap bisa dibuka tanpa koneksi, dan tidak pernah dikirim ke mana pun.')}
${B('b-p','Catatan ini panduan singkat. Baca santai, coba yang menarik, lalu hapus kalau sudah tidak perlu — aplikasi memang sengaja dimulai dari kosong.')}
${B('b-h2','Cukup ketik — sisanya otomatis')}
${B('b-p','Editor mengerti penanda yang kamu ketik: saat penanda ditutup, teks berubah sendiri menjadi format. Di awal baris:')}
${B('b-li','<code class="ic">#</code> lalu spasi → judul utama · <code class="ic">##</code> / <code class="ic">###</code> untuk tingkat 2–3')}
${B('b-li','<code class="ic">-</code> lalu spasi → daftar · <code class="ic">1.</code> → daftar bernomor · <code class="ic">- [ ]</code> → to-do')}
${B('b-li','<code class="ic">&gt;</code> lalu spasi → kutipan · <code class="ic">---</code> lalu Enter → garis pembatas')}
${B('b-p','Di dalam kalimat pun sama: tulis <code class="ic">#halo</code> lalu tekan spasi — langsung menjadi tag <span class="tg">#halo</span>. Penanda lain ikut berubah otomatis: <b>tebal</b>, <i>miring</i>, <span class="hl">sorotan</span>, <s>coretan</s>, dan <code class="ic">kode</code>.')}
${B('b-h2','Bantuan dekat saat menulis')}
${B('b-p','Di bagian bawah layar ada <b>bar mekanik</b>: di HP ia duduk tepat di atas keyboard, di desktop ia tetap di dasar layar. Semua perintah ada di sana — tidak perlu hafal simbol. Ketuk <code class="ic">/</code> untuk membuka daftar blok yang bisa disaring dengan mengetik.')}
${B('b-h2','Tautan antar catatan')}
${B('b-p','Ketik <code class="ic">[[</code> lalu pilih judul — tautannya tampil seperti ini: <span class="wl" data-act="Membuka Ide Produk">[[Ide Produk]]</span>. Tautan ke catatan yang belum ada tampil putus-putus: <span class="wl dead" data-act="Membuat catatan Belum Dibuat">[[Belum Dibuat]]</span>. Ketuk tautan mati untuk langsung membuat catatannya.')}
${B('b-p','Tag <span class="tg" data-act="Membuka tag #hara">#hara</span> diberi warna otomatis dan bisa bersarang, misalnya <span class="tg" data-act="Membuka tag #proyek/hara">#proyek/hara</span>. Ketuk tag untuk melihat semua catatan yang memakainya.')}
${B('b-cal','<div class="t"><svg class="ico"><use href="#i-anchor"/></svg>Rujukan blok</div>Blok penting bisa ditandai (menu sisip → Tandai blok), lalu dirujuk dari catatan lain dengan <code class="ic">![[Judul#^id]]</code> — isinya tampil langsung di tempat rujukan.')}
${B('b-h2','Gambar, jurnal & templat')}
${B('b-p','Gambar bisa disisipkan dari menu atau galeri, lalu diatur dengan menyeret gagangnya; daftar catatan menampilkan gambar mini otomatis. Tersedia pula jurnal harian dan templat bawaan untuk mempercepat menulis rutin.')}
${B('b-h2','Membaca & menemukan kembali')}
${B('b-p','Setiap catatan punya mode baca, kendali ukuran teks, mode fokus, dan pencarian di dalam catatan. Dari kendali baca, daftar isi melompat ke judul mana pun; panel di bawah catatan menampilkan backlink, penyebutan yang belum tertaut, dan grafik lokal.')}
${B('b-h2','Privasi & kenyamanan')}
${B('b-p','Di Pengaturan (ikon roda gigi): bahasa antarmuka (Indonesia, English, 日本語), tema terang–gelap, warna aksen, dan kunci PIN per catatan. Daftar bisa diurut, diarsipkan, dan dicadangkan kapan saja.')}
${B('b-div','')}
${B('b-quote','Tidak ada akun, tidak ada awan: data ini milikmu sepenuhnya dan hanya ada di perangkat ini. Kalau suatu hari aplikasinya berhenti dikembangkan, semua tulisanmu tetap utuh di sini.')}
${B('b-p','<b>Selamat menulis.</b> Ketuk tombol <b>+</b> di bawah untuk membuat catatan pertamamu.')}`;

export { welcomeBody };

/* Versi ISI catatan sambutan. Saat aplikasi diperbarui dengan sambutan
   baru, angka ini dinaikkan supaya catatan sambutan (yang terkunci,
   tidak bisa disunting pengguna) ikut diperbarui isinya. */
export const WELCOME_V = 3;
