/* Isi catatan sambutan — hanya dipakai sekali, saat catatan bawaan dibuat. */
const B=(cls,inner)=>`<div class="${cls}">${inner}</div>`;
const welcomeBody=`
${B('b-p','Ini satu-satunya catatan di Hara. Hapus saja kalau sudah selesai membaca — aplikasi memang sengaja dimulai kosong.')}
${B('b-h2','Mekanik yang bisa dicoba')}
${B('b-p','Tautan antar catatan ditulis begini: <span class="wl" data-act="Membuka Ide Produk">[[Ide Produk]]</span>. Yang belum ada catatannya tampil putus-putus — <span class="wl dead" data-act="Membuat catatan Belum Dibuat">[[Belum Dibuat]]</span> — ketuk untuk membuatnya.')}
${B('b-p','Tag ditulis <span class="tg" data-act="Membuka tag #hara">#hara</span>, bisa bersarang seperti <span class="tg" data-act="Membuka tag #proyek/hara">#proyek/hara</span>. Teks bisa <b>tebal</b>, <i>miring</i>, <span class="hl">disorot</span>, atau <code class="ic">kode</code>.')}
${B('b-todo','')}
${B('b-h2','Menulis tanpa hafal sintaks')}
${B('b-p','Di HP, bar abu-abu di atas keyboard itu <b>bar mekanik</b>. Ketuk tombolnya, jangan hafal simbolnya. Inilah yang paling menyiksa di Obsidian mobile.')}
${B('b-p','Ketuk tombol <code class="ic">/</code> di bar itu untuk membuka daftar blok — heading, kutipan, kode, tabel, gambar.')}
${B('b-cal','<div class="t"><svg class="ico"><use href="#i-info"/></svg>Callout</div>Blok penekanan seperti ini juga didukung, lewat sintaks <code class="ic">&gt; [!info]</code> atau dari menu <code class="ic">/</code>.')}
${B('b-h2','Blok, bukan berkas')}
${B('b-p','Tiap paragraf adalah blok mandiri dengan id sendiri. Di desktop, arahkan kursor ke kiri paragraf — muncul pegangan untuk menyeretnya.')}
${B('b-p','Karena unit simpannya blok, mengetik satu huruf hanya menulis ulang satu blok. Itu sebabnya <b>tidak ada batas jumlah huruf</b> di satu catatan.')}
${B('b-quote','Yang dirender hanya blok yang terlihat. Catatan satu juta kata pun tetap lancar digulir.')}
${B('b-code','1.000.000 kata  ≈  6 MB\\nKuota IndexedDB  ≈  ratusan MB – beberapa GB')}
${B('b-h2','Menyematkan blok lain')}
${B('b-p','Sematan ditulis <code class="ic">![[Catatan#^blok]]</code> dan isinya tampil langsung:')}
<div class="emb"><div class="emb-h"><svg class="ico"><use href="#i-link"/></svg>Ide Produk › blok ^a12f</div>
<div class="b-p" style="font-size:15px">Menang di HP, bukan menang di jumlah fitur.</div></div>
${B('b-div','')}
${B('b-p','Gulir terus ke bawah untuk melihat <b>backlink</b>, <b>unlinked mention</b>, dan <b>local graph</b>.')}`;

export { welcomeBody };

/* Versi ISI catatan sambutan. Saat aplikasi diperbarui dengan sambutan
   baru, angka ini dinaikkan supaya catatan sambutan (yang terkunci,
   tidak bisa disunting pengguna) ikut diperbarui isinya. */
export const WELCOME_V = 2;
